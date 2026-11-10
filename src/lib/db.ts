import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GDaily, GLog, GRecord } from './grammar';
import type { CardRecord, Daily, Profile, ReviewLog, Settings } from './types';

interface KV {
  settings: Settings;
  profile: Profile;
  daily: Daily;
  /** 文法練習今天的新項目額度 */
  gdaily: GDaily;
}

interface FarmDB extends DBSchema {
  cards: { key: string; value: CardRecord };
  logs: { key: number; value: ReviewLog; indexes: { ts: number } };
  kv: { key: string; value: unknown };
  /** 連接詞與文法練習：自己一套排程，不進農場 */
  grammar: { key: string; value: GRecord };
  glogs: { key: number; value: GLog; indexes: { ts: number } };
}

let dbp: Promise<IDBPDatabase<FarmDB>> | null = null;

function db() {
  dbp ??= openDB<FarmDB>('b1-farm', 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('cards', { keyPath: 'id' });
        const logs = d.createObjectStore('logs', { keyPath: 'n', autoIncrement: true });
        logs.createIndex('ts', 'ts');
        d.createObjectStore('kv');
      }
      if (oldVersion < 2) {
        d.createObjectStore('grammar', { keyPath: 'id' });
        const glogs = d.createObjectStore('glogs', { keyPath: 'n', autoIncrement: true });
        glogs.createIndex('ts', 'ts');
      }
    },
  });
  return dbp;
}

export async function getAllCards(): Promise<CardRecord[]> {
  return (await db()).getAll('cards');
}

export async function getKV<K extends keyof KV>(key: K): Promise<KV[K] | undefined> {
  return (await db()).get('kv', key) as Promise<KV[K] | undefined>;
}

export async function setKV<K extends keyof KV>(key: K, value: KV[K]): Promise<void> {
  await (await db()).put('kv', value, key);
}

export async function putCard(card: CardRecord): Promise<void> {
  await (await db()).put('cards', card);
}

export async function putCards(cards: CardRecord[]): Promise<void> {
  const tx = (await db()).transaction('cards', 'readwrite');
  await Promise.all([...cards.map((c) => tx.store.put(c)), tx.done]);
}

/** 一次評分要寫的東西放在同一個交易裡，避免只存了一半 */
export async function saveReview(card: CardRecord, log: ReviewLog | null, daily: Daily, profile: Profile) {
  const tx = (await db()).transaction(['cards', 'logs', 'kv'], 'readwrite');
  await Promise.all([
    tx.objectStore('cards').put(card),
    log ? tx.objectStore('logs').add(log) : Promise.resolve(),
    tx.objectStore('kv').put(daily, 'daily'),
    tx.objectStore('kv').put(profile, 'profile'),
    tx.done,
  ]);
}

export async function logsSince(ts: number): Promise<ReviewLog[]> {
  return (await db()).getAllFromIndex('logs', 'ts', IDBKeyRange.lowerBound(ts));
}

// ---- 連接詞與文法練習 ----
export async function getAllGrammar(): Promise<GRecord[]> {
  return (await db()).getAll('grammar');
}

export async function saveGrammarReview(rec: GRecord, log: GLog, gdaily: GDaily) {
  const tx = (await db()).transaction(['grammar', 'glogs', 'kv'], 'readwrite');
  await Promise.all([
    tx.objectStore('grammar').put(rec),
    tx.objectStore('glogs').add(log),
    tx.objectStore('kv').put(gdaily, 'gdaily'),
    tx.done,
  ]);
}

export async function grammarLogsSince(ts: number): Promise<GLog[]> {
  return (await db()).getAllFromIndex('glogs', 'ts', IDBKeyRange.lowerBound(ts));
}

export interface Backup {
  app: 'b1-farm';
  version: 1;
  exportedAt: string;
  cards: CardRecord[];
  logs: ReviewLog[];
  kv: Partial<KV>;
  /** 文法練習是後來加的，舊的備份檔沒有這兩欄 */
  grammar?: GRecord[];
  glogs?: GLog[];
}

export async function exportAll(): Promise<Backup> {
  const d = await db();
  const [cards, logs, grammar, glogs, settings, profile, daily, gdaily] = await Promise.all([
    d.getAll('cards'),
    d.getAll('logs'),
    d.getAll('grammar'),
    d.getAll('glogs'),
    getKV('settings'),
    getKV('profile'),
    getKV('daily'),
    getKV('gdaily'),
  ]);
  return {
    app: 'b1-farm',
    version: 1,
    exportedAt: new Date().toISOString(),
    cards,
    logs,
    kv: { settings, profile, daily, gdaily },
    grammar,
    glogs,
  };
}

/**
 * 匯入會整個取代目前的單字進度。
 * 文法進度：備份檔裡有才取代；上一版匯出的備份沒有這兩欄，匯入時目前的文法進度原封不動。
 */
export async function importAll(b: Backup): Promise<void> {
  if (b.app !== 'b1-farm' || b.version !== 1) throw new Error('不是單字農場的備份檔');
  const tx = (await db()).transaction(['cards', 'logs', 'kv', 'grammar', 'glogs'], 'readwrite');
  const cards = tx.objectStore('cards');
  const logs = tx.objectStore('logs');
  const kv = tx.objectStore('kv');
  const grammar = tx.objectStore('grammar');
  const glogs = tx.objectStore('glogs');
  const hasGrammar = Array.isArray(b.grammar);
  // kv 會整個清掉，沒有文法進度的備份要把今天的文法額度留下來
  const gdaily = hasGrammar ? undefined : await kv.get('gdaily');
  await Promise.all([cards.clear(), logs.clear(), kv.clear()]);
  if (hasGrammar) await Promise.all([grammar.clear(), glogs.clear()]);
  // JSON 裡的日期是字串，要轉回 Date
  const revive = <T extends { c: CardRecord['c'] }>(r: T): T => {
    r.c.due = new Date(r.c.due);
    if (r.c.last_review) r.c.last_review = new Date(r.c.last_review);
    return r;
  };
  for (const r of b.cards) void cards.put(revive(r));
  for (const l of b.logs) void logs.put(l);
  if (hasGrammar) {
    for (const r of b.grammar ?? []) void grammar.put(revive(r));
    for (const l of b.glogs ?? []) void glogs.put(l);
  }
  for (const [k, v] of Object.entries(b.kv ?? {})) if (v) void kv.put(v, k);
  if (gdaily) void kv.put(gdaily, 'gdaily');
  await tx.done;
}

/** 申請永久儲存，避免瀏覽器空間不足時清掉進度 */
export async function requestPersist(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
