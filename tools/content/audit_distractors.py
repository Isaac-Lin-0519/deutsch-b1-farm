"""干擾選項機械篩查（不判斷語意，只抓可疑的）。
用法：python3 -I tools/content/audit_distractors.py [輸出檔]
"""
import json, re, sys, glob, collections
from pathlib import Path

root = Path("data")
words = json.loads((root / "wordlist.json").read_text(encoding="utf-8"))
byid = {w["id"]: w for w in words}
noun_gender = collections.defaultdict(set)   # 單複數形 -> {der,die,das}
for w in words:
    if w.get("pos") == "noun" and w.get("articles"):
        for f in {w["lemma"], w.get("plural") or ""}:
            if f:
                noun_gender[f.lower()] |= set(w["articles"])
# 只用「性別明確」的限定詞（der/dem/den/des 可能是陰性與格或複數，不用）
DET = {"das": {"das"}, "eine": {"die"}, "einen": {"der"}, "meine": {"die"}, "meinen": {"der"},
       "dieses": {"das"}, "diesen": {"der"}, "ein": {"der", "das"}, "mein": {"der", "das"}, "kein": {"der", "das"},
       "unsere": {"die"}, "seine": {"die"}, "ihre": {"die"}, "keine": {"die"}}

items = []  # (file, id, sense, de, target, distractors)
for f in sorted(glob.glob("data/content/*.json")):
    for wid, e in json.loads(Path(f).read_text(encoding="utf-8")).items():
        for i, s in enumerate(e["senses"]):
            de = s["ex"]["de"]
            m = re.search(r"\{([^}]*)\}", de)
            items.append((Path(f).stem, wid, i, de, m.group(1) if m else "", s["ex"]["distractors"]))

freq = collections.Counter(d for *_, ds in items for d in ds)
flags = collections.defaultdict(list)
PERSON = re.compile(r"(er|erin|mann|frau|ist|istin|ent|entin|ant|arin|ärztin|arzt|lehrer|kunde|kunden)$")

for fname, wid, i, de, tgt, ds in items:
    w = byid.get(wid, {})
    # 1 重複 / 等於答案 / 句中已出現
    sent = {t.lower() for t in re.findall(r"[A-Za-zÄÖÜäöüß]+", de.replace("{", " ").replace("}", " "))}
    for d in ds:
        if d.lower() == tgt.lower():
            flags["等於答案"].append((fname, wid, de, ds))
        if d.lower() in sent:
            flags["干擾選項已出現在句中"].append((fname, wid, de, ds))
    if len(set(ds)) < 3:
        flags["干擾選項互相重複"].append((fname, wid, de, ds))
    # 2 冠詞洩漏：句中答案前有性別明確的限定詞，但干擾名詞性別不同
    pre = de.split("{")[0].split()
    det = DET.get(pre[-1].lower().strip(",.;:!?"), None) if pre else None
    if det and w.get("pos") == "noun" and not (w.get("articles") and set(w["articles"]) - det):
        bad = [d for d in ds if noun_gender.get(d.lower()) and not (noun_gender[d.lower()] & det)]
        if bad:
            flags["冠詞洩漏（干擾名詞性別不同）"].append((fname, wid, de, bad))
    # 3 大小寫不一致（句首除外）
    if tgt and not de.startswith("{"):
        if tgt[0].isupper() and not all(d[:1].isupper() for d in ds):
            flags["名詞答案但干擾選項小寫"].append((fname, wid, de, ds))
    # 4 人物／職業名詞配人物干擾（語意容易也通）
    if w.get("pos") == "noun" and PERSON.search(tgt.lower()) and sum(bool(PERSON.search(d.lower())) for d in ds) >= 2 and len(tgt) > 4:
        flags["人物類名詞配人物干擾（語意可能也通）"].append((fname, wid, de, ds))
    # 5 太常用的干擾詞
    hot = [d for d in ds if freq[d] >= 40]
    if hot:
        flags["高頻干擾詞（出現 ≥40 次）"].append((fname, wid, de, hot))
    # 6 干擾選項和答案共用同詞幹（可能是同字不同變化）
    for d in ds:
        a, b = d.lower(), tgt.lower()
        if len(a) > 5 and len(b) > 5 and (a[:6] == b[:6] or a[-6:] == b[-6:]) and a != b:
            flags["干擾選項和答案詞形太像"].append((fname, wid, de, [d])); break

out = []
out.append(f"共 {len(items)} 題")
out.append("\n高頻干擾詞前 20：" + ", ".join(f"{k}×{v}" for k, v in freq.most_common(20)))
per_file = collections.Counter()
for k, v in flags.items():
    for x in v:
        per_file[x[0]] += 1
out.append("\n各檔被標記題數（高者先）：" + ", ".join(f"{k}:{v}" for k, v in per_file.most_common(15)))
for k, v in sorted(flags.items(), key=lambda kv: -len(kv[1])):
    out.append(f"\n## {k}：{len(v)} 題")
    for fname, wid, de, ds in v:
        out.append(f"{fname} {wid} | {de} | {ds}")
text = "\n".join(out)
dest = sys.argv[1] if len(sys.argv) > 1 else "-"
if dest == "-":
    print(text)
else:
    Path(dest).write_text(text, encoding="utf-8")
    print("\n".join(out[:3]))
    for k, v in sorted(flags.items(), key=lambda kv: -len(kv[1])):
        print(f"{k}: {len(v)}")
