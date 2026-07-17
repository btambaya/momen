import SwiftUI

/// Momen glassmorphism design system — dark theme with frosted glass and
/// vibrant accents, matching the design language of the reference app.
enum Theme {
    // Backgrounds
    static let bgPrimary = Color(hex: 0x0A0A0F)
    static let bgSecondary = Color(hex: 0x12121A)
    static let bgTertiary = Color(hex: 0x1A1A25)
    static let bgElevated = Color(hex: 0x222230)

    // Glass
    static let glassBg = Color.white.opacity(0.05)
    static let glassBgHover = Color.white.opacity(0.08)
    static let glassBgActive = Color.white.opacity(0.12)
    static let glassBorder = Color.white.opacity(0.10)
    static let glassBorderLight = Color.white.opacity(0.15)

    // Text
    static let textPrimary = Color(hex: 0xF0EDE6)
    static let textSecondary = Color(hex: 0x9B97A0)
    static let textTertiary = Color(hex: 0x5E5A66)

    // Coral — primary actions
    static let coral = Color(hex: 0xE8613A)
    static let coralLight = coral.opacity(0.15)
    static let coralGlow = coral.opacity(0.25)
    static let coralText = Color(hex: 0xFF8A6A)
    static let coralBorder = coral.opacity(0.3)

    // Teal — status, success
    static let teal = Color(hex: 0x22C989)
    static let tealLight = teal.opacity(0.15)
    static let tealText = Color(hex: 0x5EEDB5)
    static let tealBorder = teal.opacity(0.3)

    // Amber — warnings
    static let amber = Color(hex: 0xD4930B)
    static let amberLight = amber.opacity(0.15)
    static let amberText = Color(hex: 0xF5C34A)
    static let amberBorder = amber.opacity(0.3)

    // Purple — info, sync
    static let purple = Color(hex: 0x7B6FF0)
    static let purpleLight = purple.opacity(0.15)
    static let purpleText = Color(hex: 0xA79BF5)

    static let danger = Color(hex: 0xEF4444)
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255)
    }
}

extension Font {
    /// Menlo — same mono face the RN app used on iOS.
    static func momenMono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Menlo", size: size).weight(weight)
    }

    static func momenSans(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }
}

// ─── Glass building blocks ───────────────────────────────────

struct GlassCardStyle: ViewModifier {
    var elevated = false
    var accent: Color? = nil
    var cornerRadius: CGFloat = 14

    func body(content: Content) -> some View {
        content
            .background(elevated ? Theme.glassBgHover : Theme.glassBg)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        accent?.opacity(0.3) ?? (elevated ? Theme.glassBorderLight : Theme.glassBorder),
                        lineWidth: 1)
            )
            .shadow(
                color: elevated ? .black.opacity(0.3) : .clear,
                radius: elevated ? 12 : 0, y: elevated ? 4 : 0)
    }
}

struct GlassPillStyle: ViewModifier {
    var background: Color = Theme.glassBg
    var border: Color = Theme.glassBorder

    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(background)
            .clipShape(Capsule())
            .overlay(Capsule().strokeBorder(border, lineWidth: 1))
    }
}

extension View {
    func glassCard(elevated: Bool = false, accent: Color? = nil, cornerRadius: CGFloat = 14) -> some View {
        modifier(GlassCardStyle(elevated: elevated, accent: accent, cornerRadius: cornerRadius))
    }

    func glassPill(background: Color = Theme.glassBg, border: Color = Theme.glassBorder) -> some View {
        modifier(GlassPillStyle(background: background, border: border))
    }
}

/// Soft radial glow used as a screen background accent.
struct BackgroundGlow: View {
    var color: Color
    var size: CGFloat

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
            .blur(radius: 60)
            .allowsHitTesting(false)
    }
}
