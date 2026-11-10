// 整頁逐行抽出文字（用於版面不規則的「主題詞組」頁）。
// 用法：swift pdf_lines.swift <input.pdf> <output.txt> <firstPage> <lastPage>
import PDFKit

let a = CommandLine.arguments
guard a.count == 5, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else { exit(1) }
var out = ""
for p in (Int(a[3])! - 1)...(Int(a[4])! - 1) {
    guard let page = doc.page(at: p), let sel = page.selection(for: page.bounds(for: .mediaBox)) else { continue }
    out += "=====PAGE \(p + 1)=====\n"
    for line in sel.selectionsByLine() {
        let t = (line.string ?? "").replacingOccurrences(of: "\n", with: " ").trimmingCharacters(in: .whitespaces)
        if !t.isEmpty { out += t + "\n" }
    }
}
try! out.write(toFile: a[2], atomically: true, encoding: .utf8)
