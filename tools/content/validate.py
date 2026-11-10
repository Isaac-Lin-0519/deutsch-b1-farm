"""檢查 data/content/*.json 的三語內容格式（規則見 docs/content-guide.md）。

用法：python3 -I tools/content/validate.py [data_dir]
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BLANK = re.compile(r"\{([^{}]+)\}")


def check_sense(wid: str, i: int, s: dict) -> list[str]:
    errs = []
    where = f"{wid}#{i}"
    for k in ("zh", "en"):
        if not isinstance(s.get(k), str) or not s[k].strip():
            errs.append(f"{where}: 缺少 {k}")
    ex = s.get("ex")
    if not isinstance(ex, dict):
        return errs + [f"{where}: 缺少 ex"]
    for k in ("de", "zh", "en"):
        if not isinstance(ex.get(k), str) or not ex[k].strip():
            errs.append(f"{where}: ex 缺少 {k}")
    de = ex.get("de", "")
    blanks = BLANK.findall(de)
    if len(blanks) != 1:
        errs.append(f"{where}: 例句必須剛好一組 {{}}，目前 {len(blanks)} 組：{de}")
        return errs
    answer = blanks[0]
    ds = ex.get("distractors")
    if not isinstance(ds, list) or len(ds) != 3 or len(set(ds)) != 3:
        errs.append(f"{where}: distractors 必須是 3 個不重複的字串")
    else:
        if answer in ds:
            errs.append(f"{where}: 干擾選項包含答案 {answer}")
        if answer[:1].isupper() and de.index("{") == 0:
            bad = [d for d in ds if not d[:1].isupper()]
            if bad:
                errs.append(f"{where}: 句首答案大寫，干擾選項也要大寫：{bad}")
    if "{" in ex.get("zh", "") or "{" in ex.get("en", ""):
        errs.append(f"{where}: 翻譯裡不應有 {{}}")
    return errs


def _tokens(s: str) -> set[str]:
    return {t.lower() for t in re.findall(r"[A-Za-zÄÖÜäöüß]+", s.replace("{", "").replace("}", ""))}


def originality_check(root: Path, words: dict) -> list[str]:
    """本機有原文（data/raw）時，確認自己寫的例句和原表例句不會太像。"""
    raw = root / "raw" / "B1.entries.json"
    if not raw.exists():
        return []
    originals = json.loads(raw.read_text(encoding="utf-8"))
    ids = list(words)
    if len(ids) != len(originals):
        return ["原文詞條數和 wordlist.json 對不上，請重新執行解析"]
    by_id = dict(zip(ids, originals))
    errs = []
    for f in sorted((root / "content").glob("*.json")):
        for wid, entry in json.loads(f.read_text(encoding="utf-8")).items():
            for i, s in enumerate(entry.get("senses", [])):
                mine = _tokens(s.get("ex", {}).get("de", ""))
                for orig in by_id.get(wid, {}).get("examples", []):
                    theirs = _tokens(orig)
                    if mine and theirs and len(mine & theirs) / len(mine | theirs) >= 0.5:
                        errs.append(f"{wid}#{i}: 例句和原表太像，請改寫：{s['ex']['de']}")
    return errs


def main(data_dir: str = "data") -> int:
    root = Path(data_dir)
    words = {w["id"]: w for w in json.loads((root / "wordlist.json").read_text(encoding="utf-8"))}
    errs: list[str] = []
    covered: set[str] = set()
    senses = 0
    for f in sorted((root / "content").glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for wid, entry in data.items():
            if wid not in words:
                errs.append(f"{f.name}: 未知的 id {wid}")
                continue
            if wid in covered:
                errs.append(f"{f.name}: id {wid} 重複出現在多個檔案")
            covered.add(wid)
            ss = entry.get("senses")
            if not isinstance(ss, list) or not ss:
                errs.append(f"{wid}: 缺少 senses")
                continue
            for i, s in enumerate(ss):
                senses += 1
                errs.extend(check_sense(wid, i, s))
    errs.extend(originality_check(root, words))
    for e in errs:
        print("✗", e)
    print(f"已完成 {len(covered)}/{len(words)} 個詞條，{senses} 個意思／例句；{len(errs)} 個問題")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
