// Library build helper (macOS PDFKit). Compiled by scripts/library/build.ts.
//
//   pdftool render <pdf> <outdir> <widthPx>  PNG per page, and one JSON line per
//                                            page: {page, file, width, height, text}
//   pdftool raster <pdf> <out.png> <scale>   the first page as a transparent PNG
//                                            (Quick Look stores slide pictures as PDFs)
import Foundation
import PDFKit
import ImageIO
import UniformTypeIdentifiers

func writePNG(_ img: CGImage, _ path: String) {
  let url = URL(fileURLWithPath: path) as CFURL
  let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, img, nil)
  CGImageDestinationFinalize(dest)
}

func render(_ page: PDFPage, scale: CGFloat, opaque: Bool) -> CGImage {
  let box = page.bounds(for: .mediaBox)
  let w = Int((box.width * scale).rounded()), h = Int((box.height * scale).rounded())
  let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                      bitmapInfo: opaque ? CGImageAlphaInfo.noneSkipLast.rawValue : CGImageAlphaInfo.premultipliedLast.rawValue)!
  if opaque { ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h)) }
  ctx.interpolationQuality = .high
  ctx.scaleBy(x: scale, y: scale)
  ctx.translateBy(x: -box.origin.x, y: -box.origin.y)
  page.draw(with: .mediaBox, to: ctx)
  return ctx.makeImage()!
}

let a = CommandLine.arguments
guard a.count >= 5, let doc = PDFDocument(url: URL(fileURLWithPath: a[2])) else {
  FileHandle.standardError.write("usage: pdftool render|raster <pdf> <out> <width|scale>\n".data(using: .utf8)!); exit(2)
}
if a[1] == "raster" {
  writePNG(render(doc.page(at: 0)!, scale: CGFloat(Double(a[4])!), opaque: false), a[3]); exit(0)
}
let width = CGFloat(Double(a[4])!)
for i in 0..<doc.pageCount {
  let page = doc.page(at: i)!
  let box = page.bounds(for: .mediaBox)
  let img = render(page, scale: width / box.width, opaque: true)
  let name = String(format: "page-%03d.png", i + 1)
  writePNG(img, "\(a[3])/\(name)")
  let obj: [String: Any] = ["page": i + 1, "file": name, "width": img.width, "height": img.height, "text": page.string ?? ""]
  let data = try! JSONSerialization.data(withJSONObject: obj)
  print(String(data: data, encoding: .utf8)!)
}
