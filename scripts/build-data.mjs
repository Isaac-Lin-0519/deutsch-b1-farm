// 把公開的單字表和原創三語內容合併成 App 用的 public/data/words.json
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const words = JSON.parse(readFileSync('data/wordlist.json', 'utf8'));
const content = {};
for (const f of readdirSync('data/content').filter((f) => /^b\d+\.json$/.test(f)).sort()) {
  Object.assign(content, JSON.parse(readFileSync(`data/content/${f}`, 'utf8')));
}

const ids = new Set(words.map((w) => w.id));
const unknown = Object.keys(content).filter((id) => !ids.has(id));
if (unknown.length) {
  console.error(`內容裡有單字表沒有的 id：${unknown.join(', ')}`);
  process.exit(1);
}

const DROP = new Set(['raw', 'plural_suffix', 'sub_entry']);
const out = words.map((w) => {
  const o = { pos: 'other' };
  for (const [k, v] of Object.entries(w)) if (!DROP.has(k) && v != null && v !== '') o[k] = v;
  if (content[w.id]) o.senses = content[w.id].senses;
  return o;
});

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/words.json', JSON.stringify(out));
console.log(`words.json：${out.length} 個詞條，其中 ${Object.keys(content).length} 個有三語內容`);
