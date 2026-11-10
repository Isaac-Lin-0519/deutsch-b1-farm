import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CardRecord, Daily, Profile, ReviewLog, Settings } from './types';

interface KV {
  settings: Settings;
  profile: Profile;
  daily: Daily;
}

interface FarmDB extends DBSchema {
  cards: { key: string; value: CardRecord };
  logs: { key: number; value: ReviewLog; indexes: { ts: number } };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<FarmDB>> | null = null;

function db() {
  dbp ??= openDB<FarmDB>('b1-farm', 1, {
    upgrade(d) {
      d.createObjectStore('cards', { keyPath: 'id' });
      const logs = d.createObjectStore('logs', { keyPath: 'n', autoIncrement: true });
      logs.createIndex('ts', 'ts');
      d.createObjectStore('kv');
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

export interface Backup {
  app: 'b1-farm';
  version: 1;
  exportedAt: string;
  cards: CardRecord[];
  logs: ReviewLog[];
  kv: Partial<KV>;
}

export async function exportAll(): Promise<Backup> {
  const d = await db();
  const [cards, logs, settings, profile, daily] = await Promise.all([
    d.getAll('cards'),
    d.getAll('logs'),
    getKV('settings'),
    getKV('profile'),
    getKV('daily'),
  ]);
  return { app: 'b1-farm', version: 1, exportedAt: new Date().toISOString(), cards, logs, kv: { settings, profile, daily } };
}

/** 匯入會整個取代目前的進度 */
export async function importAll(b: Backup): Promise<void> {
  if (b.app !== 'b1-farm' || b.version !== 1) throw new Error('不是單字農場的備份檔');
  const tx = (await db()).transaction(['cards', 'logs', 'kv'], 'readwrite');
  const cards = tx.objectStore('cards');
  const logs = tx.objectStore('logs');
  const kv = tx.objectStore('kv');
  await Promise.all([cards.clear(), logs.clear(), kv.clear()]);
  for (const r of b.cards) {
    r.c.due = new Date(r.c.due);
    if (r.c.last_review) r.c.last_review = new Date(r.c.last_review);
    void cards.put(r);
  }
  for (const l of b.logs) void logs.put(l);
  for (const [k, v] of Object.entries(b.kv)) if (v) void kv.put(v, k);
  await tx.done;
}

/** 申請永久儲存，避免瀏覽器空間不足時清掉進度 */
export async function requestPersist(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
