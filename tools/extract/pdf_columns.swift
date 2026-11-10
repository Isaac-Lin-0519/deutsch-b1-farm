// 用 macOS 內建 PDFKit 依「欄位矩形」抽出每一行文字與座標。
// 單字表是「單字欄＋例句欄」的表格排版，整頁直接抽字會把不同欄混在一起，
// 所以對每一欄各自框選，再逐行輸出。
//
// 用法：swift pdf_columns.swift <input.pdf> <output.tsv> <x0-x1,x0-x1,...> [firstPage]
// 輸出欄位：page  col  x0  x1  y(行底)  text
import PDFKit

let args = CommandLine.arguments
guard args.count >= 4, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("usage: swift pdf_columns.swift <in.pdf> <out.tsv> <x0-x1,...> [firstPage]\n".data(using: .utf8)!)
    exit(1)
}
let cols: [(Double, Double)] = args[3].split(separator: ",").map {
    let p = $0.split(separator: "-").map { Double($0)! }
    return (p[0], p[1])
}
let firstPage = args.count >= 5 ? Int(args[4])! : 1

var out = "page\tcol\tx0\tx1\ty\ttext\n"
for p in (firstPage - 1)..<doc.pageCount {
    guard let page = doc.page(at: p) else { continue }
    let box = page.bounds(for: .mediaBox)
    for (ci, c) in cols.enumerated() {
        let rect = CGRect(x: c.0, y: box.minY, width: c.1 - c.0, height: box.height)
        guard let sel = page.selection(for: rect) else { continue }
        for line in sel.selectionsByLine() {
            let b = line.bounds(for: page)
            let text = (line.string ?? "")
                .replacingOccurrences(of: "\n", with: " ")
                .replacingOccurrences(of: "\t", with: " ")
                .trimmingCharacters(in: .whitespaces)
            if text.isEmpty { continue }
            out += "\(p + 1)\t\(ci)\t\(String(format: "%.1f", b.minX))\t\(String(format: "%.1f", b.maxX))\t\(String(format: "%.1f", b.minY))\t\(text)\n"
        }
    }
}
try! out.write(toFile: args[2], atomically: true, encoding: .utf8)
print("pages: \(doc.pageCount)")
