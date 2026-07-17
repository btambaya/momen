// Renders the Momen app icon (1024×1024 PNG) in the app's design language:
// deep black-blue field, coral radial glow, timecode tick ring, coral mark
// button with the SMPTE colon at its centre.
//
// Usage: swift scripts/make_icon.swift <output.png>

import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(
    data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
    space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!

func rgba(_ r: Double, _ g: Double, _ b: Double, _ a: Double) -> CGColor {
    CGColor(colorSpace: space, components: [r / 255, g / 255, b / 255, a])!
}

let center = CGPoint(x: 512, y: 512)
let coral = (r: 232.0, g: 97.0, b: 58.0)

// Background
ctx.setFillColor(rgba(10, 10, 15, 1))
ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))

// Soft coral glow behind the mark button
let glow = CGGradient(
    colorsSpace: space,
    colors: [rgba(coral.r, coral.g, coral.b, 0.30), rgba(coral.r, coral.g, coral.b, 0.0)] as CFArray,
    locations: [0, 1])!
ctx.drawRadialGradient(
    glow, startCenter: center, startRadius: 0, endCenter: center, endRadius: 560, options: [])

// Timecode tick ring — 60 ticks, every 5th emphasised
for i in 0..<60 {
    let angle = Double(i) / 60.0 * 2 * .pi
    let major = i % 5 == 0
    let inner = 396.0
    let outer = major ? 452.0 : 432.0
    let from = CGPoint(x: 512 + cos(angle) * inner, y: 512 + sin(angle) * inner)
    let to = CGPoint(x: 512 + cos(angle) * outer, y: 512 + sin(angle) * outer)
    ctx.setStrokeColor(rgba(240, 237, 230, major ? 0.42 : 0.16))
    ctx.setLineWidth(major ? 10 : 6)
    ctx.setLineCap(.round)
    ctx.move(to: from)
    ctx.addLine(to: to)
    ctx.strokePath()
}

// Mark button — layered circles fake a soft outer glow
for (radius, alpha) in [(300.0, 0.10), (280.0, 0.18), (262.0, 0.30)] {
    ctx.setFillColor(rgba(coral.r, coral.g, coral.b, alpha))
    ctx.fillEllipse(in: CGRect(
        x: 512 - radius, y: 512 - radius, width: radius * 2, height: radius * 2))
}
ctx.setFillColor(rgba(coral.r, coral.g, coral.b, 1))
ctx.fillEllipse(in: CGRect(x: 512 - 244, y: 512 - 244, width: 488, height: 488))

// Rim highlight
ctx.setStrokeColor(rgba(255, 138, 106, 0.5))
ctx.setLineWidth(6)
ctx.strokeEllipse(in: CGRect(x: 512 - 241, y: 512 - 241, width: 482, height: 482))

// SMPTE colon — the timecode separator as the identity mark
ctx.setFillColor(rgba(255, 255, 255, 0.96))
for dy in [-92.0, 92.0] {
    ctx.fillEllipse(in: CGRect(x: 512 - 46, y: 512 + dy - 46, width: 92, height: 92))
}

let image = ctx.makeImage()!
let outPath = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "icon-1024.png"
let dest = CGImageDestinationCreateWithURL(
    URL(fileURLWithPath: outPath) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, image, nil)
CGImageDestinationFinalize(dest)
print("Wrote \(outPath)")
