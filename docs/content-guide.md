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

## 連接詞與文法練習

`data/grammar/gNNN.json` 是文法點的陣列，新文法點照檔名和檔案裡的順序帶出來，成對比的要排在一起。

```json
{
  "id": "weil",
  "group": "sub",
  "de": "weil",
  "pattern": "weil ＋ …動詞",
  "zh": "因為",
  "en": "because",
  "rule": "weil 帶出子句，變位動詞放到子句最後。",
  "ex": { "de": "Ich bleibe heute zu Hause, {weil} ich krank [bin].", "zh": "…", "en": "…" },
  "items": [
    {
      "type": "choice",
      "de": "Wir nehmen den Bus, {weil} unser Auto kaputt [ist].",
      "zh": "…",
      "en": "…",
      "options": ["deshalb", "wegen", "denn"],
      "why": "動詞 ist 在句尾，所以是從屬連接詞 weil。…"
    },
    {
      "type": "order",
      "lead": "Lena geht früh ins Bett, {weil}",
      "tokens": ["sie", "morgen eine Prüfung", "[hat]"],
      "zh": "…",
      "en": "…",
      "why": "weil 子句：主詞 sie 在前，變位動詞 hat 放最後。"
    }
  ]
}
```

- **group**：`sub` 動詞放最後的連接詞、`adv` 連接副詞、`pair` 雙連接詞、`zu` zu＋不定式、`rel` 關係代名詞、`gen` 屬格介系詞。
- **標記**：`{}` 是這題的重點，每句剛好一組；`[]` 標出動詞，可以有好幾組。
- **看規則的卡片**（關代、屬格介系詞）多兩欄：`ask`（正面的提問）和 `forms`（背面的表，每列兩格）。
- **四選一 `choice`**：`{}` 就是空格，`options` 剛好 3 個。干擾選項故意放意思相近、語法不同的
  （weil／denn／deshalb／wegen），但填進去**文法上一定要錯**；只是意思怪、文法卻通的不能用
  （例如 wegen 的題目不能放 trotz）。句首的選項要大寫開頭。
- **排語序 `order`**：`lead` 是固定的前半句（連接詞放在這裡），`tokens` 是正確順序的字塊，至少 3 塊。
  正確順序要只有一種：容易有兩種排法的字（heute、gern 這類副詞）跟旁邊的字併成一塊；真的有兩種就用 `alt` 列出來。
  句尾不是句點時用 `tail`。
- **`why`**：一兩句話講這題為什麼，要提到句子裡實際的字（哪個動詞、在哪裡）。
- 每個文法點至少各有一題四選一和排語序，題目照「四選一、排語序交錯」排，複習時會照順序輪流出。

寫完後執行 `npm test` 檢查格式。
