"""把 pdf_columns.swift 抽出的欄位文字組成詞條，並拆出文法資訊。

輸入：data/raw/{A1,A2,B1}.lines.tsv
輸出：data/raw/{A1,A2,B1}.entries.json（含原文例句，僅供內部參考，不可公開）

用法：python3 -I tools/extract/parse_wortliste.py data/raw
"""
from __future__ import annotations

import csv
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path

# 每份表的版面設定：欄位成對（單字欄, 例句欄），以及詞條之間的最小垂直間距
LAYOUTS = {
    # B1：雙半頁，每半頁「單字欄＋例句欄」；行距 11pt，詞條之間空一行（22pt）
    "B1": {"pairs": [(0, 1), (2, 3)], "block_gap": 15.0, "last_page": 102},
    # A2：同樣雙半頁；行距 11pt，詞條之間約 14pt
    "A2": {"pairs": [(0, 1), (2, 3)], "block_gap": 12.5, "last_page": 32},
    # A1：單一表格；每行 13pt，詞條之間沒有額外間距
    "A1": {"pairs": [(0, 1)], "block_gap": 12.0, "last_page": 27},
}

NOISE = re.compile(
    r"^(\d+\s+)?(Alphabetische(r)?( Wortschatz| Wortliste)?|ALPHABETISCHE(R)?( WORTSCHATZ)?|WORTSCHATZ|Wortliste|"
    r"WORTLISTE|r Wortschatz|\d+\s+WORTLISTE|ZERTIFIKAT B1|GOETHE-ZERTIFIKAT A[12]|VS_\d+.*|A2_Wortliste.*|INVeNTAre|"
    r"Seite \d+|\d+)$"
)
SECTION_LETTER = re.compile(r"^[A-ZÄÖÜ]$")
ARTICLE_START = re.compile(r"^(der|die|das)(\s*\([^)]*\))?(\s*/\s*(der|die|das)(\s*\([^)]*\))?)?\s+[A-ZÄÖÜ0-9]")


@dataclass
class TLine:
    page: int
    col: int
    x0: float
    y: float
    text: str


@dataclass
class Block:
    page: int
    half: int
    top: float
    head_lines: list[str] = field(default_factory=list)
    head_x: list[float] = field(default_factory=list)
    ex_lines: list[str] = field(default_factory=list)


def read_lines(path: Path) -> list[TLine]:
    out = []
    with path.open(encoding="utf-8", newline="") as f:
        r = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
        next(r)
        for page, col, x0, _x1, y, text in r:
            out.append(TLine(int(page), int(col), float(x0), float(y), text.strip()))
    return out


def is_noise(t: TLine) -> bool:
    return t.y < 45 or t.y > 790 or bool(NOISE.match(t.text)) or bool(SECTION_LETTER.match(t.text))


def merge_same_y(lines: list[TLine], tol: float = 2.5) -> list[TLine]:
    """例句欄裡編號「1.」和句子是分開的兩段，同一高度的合併成一行。"""
    lines = sorted(lines, key=lambda t: (-t.y, t.x0))
    out: list[TLine] = []
    for t in lines:
        if out and abs(out[-1].y - t.y) <= tol:
            out[-1].text = (out[-1].text + " " + t.text).strip()
        else:
            out.append(TLine(t.page, t.col, t.x0, t.y, t.text))
    return out


def build_blocks(level: str, lines: list[TLine]) -> list[Block]:
    cfg = LAYOUTS[level]
    by_page: dict[int, list[TLine]] = {}
    for t in lines:
        if t.page <= cfg["last_page"] and not is_noise(t):
            by_page.setdefault(t.page, []).append(t)

    blocks: list[Block] = []
    for page in sorted(by_page):
        for half, (hc, ec) in enumerate(cfg["pairs"]):
            heads = merge_same_y([t for t in by_page[page] if t.col == hc])
            exs = merge_same_y([t for t in by_page[page] if t.col == ec])
            page_blocks: list[Block] = []
            prev_y = None
            # 換欄／換頁時，上一個詞條的動詞變化可能還沒寫完（以逗號結尾）
            carry = blocks[-1] if blocks and blocks[-1].head_lines[-1].endswith(",") else None
            if blocks and heads and (heads[0].text.startswith("→") or re.fullmatch(r"\((D|A|CH)(,\s*(D|A|CH))*\)", heads[0].text)):
                carry = blocks[-1]
            if carry and heads and re.match(r"^(hat|ist)\b|^[a-zäöüß→(]", heads[0].text):
                carry.head_lines.append(heads[0].text)
                carry.head_x.append(heads[0].x0)
                heads = heads[1:]
            for h in heads:
                prev_text = page_blocks[-1].head_lines[-1] if page_blocks else ""
                # 上一行以逗號／箭頭結尾 → 動詞變化或地區對照還沒寫完，不論間距都視為同一詞條
                cont = (prev_text.endswith((",", "→", ":")) and not prev_text.endswith((", -", ",-"))) or h.text.startswith("→")
                if prev_y is None or (prev_y - h.y > cfg["block_gap"] and not cont):
                    page_blocks.append(Block(page, half, h.y))
                page_blocks[-1].head_lines.append(h.text)
                page_blocks[-1].head_x.append(h.x0)
                prev_y = h.y
            for e in exs:
                # 例句第一行的基線比單字略高（字級不同），容許 4pt 誤差
                # 歸屬於「頂端在這行例句上方（或同高）」的最後一個詞條
                owner = None
                for b in page_blocks:
                    if b.top >= e.y - 4:
                        owner = b
                if owner is None:
                    # 例句在本欄第一個單字之上 → 承接上一欄／上一頁最後一個詞條
                    owner = blocks[-1] if blocks else None
                if owner is not None:
                    owner.ex_lines.append(e.text)
            blocks.extend(page_blocks)
    return blocks


def split_headwords(block: Block) -> list[tuple[str, bool]]:
    """一個區塊可能有多個詞（例如 der Absender / die Absenderin），依冠詞與續行規則拆開。
    回傳 (詞條文字, 是否縮排的衍生詞)。"""
    items: list[list] = []
    base_x = min(block.head_x) if block.head_x else 0
    for text, x in zip(block.head_lines, block.head_x):
        prev = items[-1][0] if items else ""
        continuation = bool(items) and (
            prev.endswith((",", "→", ":", "/", "-")) and not prev.endswith((", -", ",-"))
            or re.match(r"^(hat|ist|hat/ist|ist/hat)\s", text) is not None
            or re.match(r"^(ab|an|auf|aus|ein|mit|nach|vor|zu|zurück|weg|fest|fern|her|hin|los|statt|teil|um|vorbei|weiter|zusammen),", text) is not None
            or re.match(r"^\(?(D|A|CH)(,\s*(D|A|CH))*\)?\s*[:→]", text) is not None
            or text.startswith("→")
            or re.fullmatch(r"\((D|A|CH)(,\s*(D|A|CH))*\)", text) is not None
            or (re.match(r"^[a-zäöüß]", text) is not None and not ARTICLE_START.match(text) and prev.count(",") >= 1
                and _looks_like_verb_head(prev) and not re.search(r",\s*(hat|ist)(/(hat|ist))?\s+\S+", prev))
        )
        if items and prev.endswith("-") and re.fullmatch(r"[a-zäöü]{1,4}", text):
            # 複數字尾被換行切開：「der Zeitpunkt, -」+「e」
            items[-1][0] = prev + text
        elif continuation:
            items[-1][0] = _join(prev, text)
        else:
            items.append([text, x > base_x + 3 and len(items) > 0])
    return [(t, sub) for t, sub in items]


def _looks_like_verb_head(s: str) -> bool:
    first = s.split(",")[0].strip()
    return bool(re.match(r"^(sich\s+)?[a-zäöüß]+(n|rn|ln)$", first))


def _join(a: str, b: str) -> str:
    if a.endswith("-") and not a.endswith(" -") and re.match(r"^[a-zäöüß]", b):
        return a[:-1] + b
    if a.endswith("/"):
        return a + b
    return a + " " + b


def join_examples(lines: list[str]) -> list[str]:
    """把例句行接回完整句子。B1 有「1. 2. 3.」編號；A1/A2 每句換行開始。"""
    out: list[str] = []
    for ln in lines:
        m = re.match(r"^(\d+)\.\s+(.*)$", ln)
        if m:
            out.append(m.group(2))
            continue
        if not out:
            out.append(ln)
            continue
        prev = out[-1]
        new_sentence = re.search(r"[.!?…)\"“]$", prev) and re.match(r"^[A-ZÄÖÜ\"„0-9–-]", ln)
        if new_sentence:
            out.append(ln)
        else:
            out[-1] = _join(prev, ln)
    return [re.sub(r"\s+", " ", s).strip() for s in out if s.strip()]


# ---------- 文法資訊解析 ----------

REGION_RE = re.compile(r"\((D|A|CH)(,\s*(D|A|CH))*\)")
XREF_RE = re.compile(r"→\s*((?:D|A|CH)(?:\s*,\s*(?:D|A|CH))*)\s*:\s*(.+)$")


def parse_head(raw: str) -> dict:
    s = re.sub(r"\s+", " ", raw).strip()
    info: dict = {"raw": s}

    # 地區對照：→ D, A: Hausmeister
    m = XREF_RE.search(s)
    if m:
        info["variant_of"] = {"regions": [r.strip() for r in m.group(1).split(",")], "word": m.group(2).strip()}
        s = s[: m.start()].strip()
    # 地區標記 (D)、(A, CH)：緊跟在冠詞後面的屬於冠詞（die (D, A)/ das (CH) SMS），其餘屬於整個詞
    for region_m in REGION_RE.finditer(s):
        if re.search(r"\b(der|die|das)\s*$", s[: region_m.start()]):
            continue
        info["regions"] = [r.strip() for r in region_m.group(0).strip("()").split(",")]
        s = (s[: region_m.start()] + s[region_m.end():]).strip()
        break

    # 介系詞搭配：(von) (auf + Akk.)
    prep = re.search(r"\(((?:mit|von|auf|an|für|über|zu|nach|bei|aus|um|vor|gegen|in|unter|zwischen)(?:[^)]*))\)\s*$", s)
    if prep:
        info["prep"] = prep.group(1).strip()
        s = s[: prep.start()].strip()

    number = None
    if re.search(r"\((Pl|Plural)\.?\)", s):
        number = "pl"
        s = re.sub(r"\s*\((Pl|Plural)\.?\)", "", s).strip()
    if re.search(r"\((Sg|Singular)\.?\)", s):
        number = "sg"
        s = re.sub(r"\s*\((Sg|Singular)\.?\)", "", s).strip()

    parts = [p.strip() for p in s.split(",")]
    first = parts[0]

    art = re.match(r"^((?:der|die|das)(?:\s*\([^)]*\))?(?:\s*/\s*(?:der|die|das)(?:\s*\([^)]*\))?)*)\s+(.+)$", first)
    if art and re.match(r"^[A-ZÄÖÜ0-9]", art.group(2)):
        info["pos"] = "noun"
        arts = re.findall(r"\b(der|die|das)\b", art.group(1))
        info["articles"] = arts
        info["lemma"] = art.group(2).strip()
        if len(parts) > 1 and parts[1]:
            # 原表偶爾把變音符號 ¨ 印成引號（die Angst, “-e）
            info["plural_suffix"] = parts[1].replace(" ", "").replace("“", "¨").replace("\"", "¨")
            info["plural"] = make_plural(info["lemma"], info["plural_suffix"])
        if number:
            info["number"] = number
        return info

    if number == "pl" and re.match(r"^[A-ZÄÖÜ]", first):
        info.update(pos="noun", articles=["die"], lemma=first, number="pl")
        return info

    last = parts[-1] if len(parts) > 1 else ""
    if len(parts) >= 2 and re.match(r"^(hat|ist)(/(hat|ist))?\s", last):
        info["pos"] = "verb"
        info["lemma"] = first
        forms = parts[1:]
        info["perfekt"] = last
        info["aux"] = "sein" if last.startswith("ist") and not last.startswith("ist/hat") else ("haben/sein" if "/" in last.split()[0] else "haben")
        if len(forms) >= 2:
            info["present3"] = forms[0]
        if len(forms) >= 3:
            info["praeteritum"] = forms[1]
        return info

    info["lemma"] = first
    if number:
        info["number"] = number
    if len(parts) > 1:
        info["extra"] = ", ".join(parts[1:])
    return info


UMLAUT = {"a": "ä", "o": "ö", "u": "ü", "A": "Ä", "O": "Ö", "U": "Ü"}


def make_plural(lemma: str, suffix: str) -> str | None:
    """「¨-e」「-n」「-」「-s/-e」→ 實際複數形。只處理第一個選項。"""
    suf = suffix.split("/")[0]
    if not suf.startswith(("-", "¨", "̈")):
        return None
    umlaut = "¨" in suf or "̈" in suf
    ending = suf.replace("¨", "").replace("̈", "").lstrip("-")
    word = lemma
    if umlaut:
        # 變音放在最後一個 a/o/u（au → äu）
        m = list(re.finditer(r"au|[aouAOU]", word))
        if m:
            k = m[-1]
            seg = k.group(0)
            rep = ("äu" if seg == "au" else UMLAUT[seg])
            word = word[: k.start()] + rep + word[k.end():]
    return word + ending


def norm_key(lemma: str) -> str:
    s = re.sub(r"\([^)]*\)", "", lemma)
    s = re.sub(r"^\s*sich\s+", "", s)
    s = s.replace("…", "").replace("...", "").replace("!", "")
    return re.sub(r"\s+", " ", s).strip().rstrip("-").strip()


def main(raw_dir: str) -> None:
    raw = Path(raw_dir)
    for level in ("A1", "A2", "B1"):
        lines = read_lines(raw / f"{level}.lines.tsv")
        blocks = build_blocks(level, lines)
        entries = []
        for bi, b in enumerate(blocks):
            heads = split_headwords(b)
            examples = join_examples(b.ex_lines)
            for raw_head, sub in heads:
                info = parse_head(raw_head)
                info.update(
                    level_list=level,
                    page=b.page,
                    sub_entry=sub,
                    block=bi,
                    key=norm_key(info.get("lemma", raw_head)),
                    examples=examples,
                )
                entries.append(info)
        out = raw / f"{level}.entries.json"
        out.write_text(json.dumps(entries, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"{level}: {len(blocks)} blocks, {len(entries)} entries -> {out}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/raw")
