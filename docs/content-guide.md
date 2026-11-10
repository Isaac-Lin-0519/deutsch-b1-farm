# 三語內容撰寫規則

每個詞條的中英解釋與例句都是重新撰寫的原創內容，**不可**照抄或改寫 Goethe 單字表的原文例句
（原文只放在 `data/raw/`，僅用來判斷一個字要涵蓋哪些意思）。

## 檔案格式

`data/content/bNNN.json`，鍵為 `data/wordlist.json` 裡的 `id`：

```json
{
  "abholen": {
    "senses": [
      {
        "zh": "接（人）；領取",
        "en": "to pick up, collect",
        "ex": {
          "de": "Kannst du mich um sechs vom Flughafen {abholen}?",
          "zh": "你可以六點來機場接我嗎？",
          "en": "Can you pick me up from the airport at six?",
          "distractors": ["abgeben", "abbiegen", "ablehnen"]
        }
      }
    ]
  }
}
```

## 規則

- **意思（senses）**：通常 1 個，常用的多義字最多 3 個。`zh` 用台灣繁體中文用語（腳踏車、垃圾桶、計程車），`en` 用簡短英文釋義。
- **例句 `de`**：B1 以下程度、6～15 個字、生活化。目標字用 `{}` 標出，整句只能有一組 `{}`。
  - 目標字必須連在一起出現：可分動詞用不定式（搭配情態動詞）或第二分詞，避免「fängt … an」這種被拆開的寫法。
  - 標出的是句子裡實際出現的形式（變格、變位後），可以只標字的一部分，例如 `{aller}beste`。
- **干擾選項 `distractors`**：剛好 3 個，和答案同詞性、同變化形式，填進句子後必須明顯錯誤。
  - 名詞：同冠詞性別、同單複數，避免冠詞洩漏答案。
  - 動詞：同人稱時態；完成式要同助動詞（haben／sein）。
  - 句首答案的干擾選項也要大寫開頭。
  - 不可使用「也說得通」的近義詞（例如 ab／seit、als／wie）。
- **翻譯**：`zh`、`en` 翻譯整句意思，自然通順即可，不必逐字對應。

寫完後執行 `python3 -I tools/content/validate.py` 檢查格式。
