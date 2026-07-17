import SwiftUI

/// The primary MARK button — large tap target with a coral glow.
struct MarkButtonView: View {
    let markerCount: Int
    let disabled: Bool
    let onMark: () -> Void

    @State private var pressed = false

    var body: some View {
        Button {
            onMark()
        } label: {
            ZStack {
                Circle()
                    .fill(disabled ? Theme.bgElevated : Theme.coral)
                    .frame(width: 96, height: 96)
                    .overlay(
                        Circle().strokeBorder(
                            disabled ? Theme.glassBorder : Color(hex: 0xFF8A6A).opacity(0.4),
                            lineWidth: 1))
                    .shadow(
                        color: disabled ? .clear : Theme.coral.opacity(0.5),
                        radius: 24)

                VStack(spacing: 2) {
                    Text("MARK")
                        .font(.momenMono(15, weight: .semibold))
                        .kerning(2)
                        .foregroundStyle(disabled ? Theme.textTertiary : .white)
                    if markerCount > 0 {
                        Text("\(markerCount)")
                            .font(.momenMono(11))
                            .foregroundStyle(disabled ? Theme.textTertiary : .white.opacity(0.7))
                    }
                }
            }
            .scaleEffect(pressed ? 0.93 : 1)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in withAnimation(.easeOut(duration: 0.08)) { pressed = true } }
                .onEnded { _ in withAnimation(.easeOut(duration: 0.15)) { pressed = false } }
        )
        .accessibilityLabel("Log marker")
    }
}
