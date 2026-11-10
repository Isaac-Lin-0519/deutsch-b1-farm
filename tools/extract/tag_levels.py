"""比對 A1、A2 官方單字表，替 B1 表的每個詞標上「最早出現的等級」，
並輸出可以公開的單字資料（不含原文例句）。

用法：python3 -I tools/extract/tag_levels.py data/raw data/wordlist.json
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

DEUMLAUT = str.maketrans({"ä": "a", "ö": "o", "ü": "u", "Ä": "A", "Ö": "O", "Ü": "U"})


def variants(key: str) -> set[str]:
    """同一個詞可能的寫法：斜線替代形、去掉「sein/haben」片語尾巴、去掉結尾的連字號。"""
    out = set()
    for part in re.split(r"\s*/\s*", key):
        part = part.strip().strip("-").strip()
        if not part:
            continue
        out.add(part)
        m = re.match(r"^(.+?)\s+(sein|haben|werden|machen|gehen)$", part)
        if m:
            out.add(m.group(1))
    if "/" not in key:
        out.add(key.strip("-").strip())
    for o in list(out):
        # 「ein bisschen」↔「bisschen」
        m = re.match(r"^(ein|eine)\s+(.+)$", o)
        if m:
            out.add(m.group(2))
    if key.rstrip().endswith("-"):
        # 字幹寫法「beid-」「jed-」「eigen-」↔「beide」「jeder」「eigene」
        stem = key.rstrip().rstrip("-").strip()
        out |= {stem + "e", stem + "er", stem + "es"}
    return {o for o in out if o}


def wortgruppen_bag(path: Path) -> set[str]:
    bag = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("=====") or re.fullmatch(r"[\d\s=.,:%/€+-]+", line):
            continue
        line = re.sub(r"\([^)]*\)", " ", line)
        for chunk in re.split(r"[;=]", line):
            chunk = re.sub(r",.*$", "", chunk).strip()
            chunk = re.sub(r"^(der|die|das|ein|eine)\s+", "", chunk)
            if chunk:
                bag |= variants(chunk)
            for tok in re.findall(r"[A-Za-zÄÖÜäöüß]{3,}", chunk):
                bag.add(tok)
    return bag


def keyset(entries: list[dict], bag: set[str]) -> set[str]:
    ks = set(bag)
    for e in entries:
        ks |= variants(e["key"])
    return ks


def slugify(s: str) -> str:
    s = s.replace("ß", "ss").translate({ord("ä"): "ae", ord("ö"): "oe", ord("ü"): "ue", ord("Ä"): "Ae", ord("Ö"): "Oe", ord("Ü"): "Ue"})
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower() or "x"


def find_level(e: dict, a1: set[str], a2: set[str]) -> str:
    # key 已去掉結尾連字號，字幹寫法（beid-）要用原本的 lemma 才比對得到
    cands = variants(e["key"]) | variants(e.get("lemma", e["key"]))
    lemma = e["key"]
    # 陰性職稱等：Lehrerin → Lehrer、Ärztin → Arzt
    if e.get("pos") == "noun" and lemma.endswith("in") and len(lemma) > 4:
        base = lemma[:-2]
        cands |= {base, base.translate(DEUMLAUT)}
    if cands & a1:
        return "A1"
    if cands & a2:
        return "A2"
    return "B1"


PUBLIC_FIELDS = [
    "lemma", "pos", "articles", "plural_suffix", "plural", "number",
    "present3", "praeteritum", "perfekt", "aux", "prep",
    "regions", "variant_of", "extra", "sub_entry", "raw",
]


def main(raw_dir: str, out_path: str) -> None:
    raw = Path(raw_dir)
    load = lambda L: json.loads((raw / f"{L}.entries.json").read_text(encoding="utf-8"))
    a1e, a2e, b1e = load("A1"), load("A2"), load("B1")
    a1 = keyset(a1e, wortgruppen_bag(raw / "A1.wortgruppen.txt"))
    a2 = keyset(a2e, wortgruppen_bag(raw / "A2.wortgruppen.txt"))

    levels = [find_level(e, a1, a2) for e in b1e]
    # 同一區塊的陰性形（der Absender / die Absenderin）沿用陽性的等級
    order = {"A1": 0, "A2": 1, "B1": 2}
    for i, e in enumerate(b1e):
        if i and b1e[i - 1]["block"] == e["block"] and e.get("pos") == "noun" and e["key"].endswith("in"):
            if order[levels[i - 1]] < order[levels[i]]:
                levels[i] = levels[i - 1]

    words, seen = [], Counter()
    for e, lv in zip(b1e, levels):
        base = slugify(e["key"]) + ("" if e.get("pos") != "noun" else "")
        seen[base] += 1
        wid = base if seen[base] == 1 else f"{base}-{seen[base]}"
        w = {"id": wid, "level": lv}
        for k in PUBLIC_FIELDS:
            if k in e and e[k] not in (None, False, "", []):
                w[k] = e[k]
        w.setdefault("lemma", e["key"])
        words.append(w)

    Path(out_path).write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    c = Counter(w["level"] for w in words)
    print(f"{len(words)} words -> {out_path}")
    print("levels:", dict(sorted(c.items())))
    print("pos:", dict(Counter(w.get("pos", "other") for w in words)))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
