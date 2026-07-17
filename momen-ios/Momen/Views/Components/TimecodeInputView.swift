import SwiftUI
import MomenKit

/// Four-segment SMPTE timecode input (HH:MM:SS:FF) with auto-advance.
struct TimecodeInputView: View {
    let fps: FrameRate
    let onTimecodeChange: (String) -> Void

    @State private var hh = ""
    @State private var mm = ""
    @State private var ss = ""
    @State private var ff = ""

    private enum Segment: Hashable { case hh, mm, ss, ff }
    @FocusState private var focus: Segment?

    var body: some View {
        HStack(spacing: 6) {
            segment("HH", text: $hh, maxValue: 23, focusTarget: .hh, next: .mm)
            colon
            segment("MM", text: $mm, maxValue: 59, focusTarget: .mm, next: .ss)
            colon
            segment("SS", text: $ss, maxValue: 59, focusTarget: .ss, next: .ff)
            colon
            segment("FF", text: $ff, maxValue: fps.nominalFps - 1, focusTarget: .ff, next: nil)
        }
        .frame(maxWidth: .infinity)
    }

    private var colon: some View {
        Text(":")
            .font(.momenMono(24))
            .foregroundStyle(Theme.textTertiary)
            .padding(.top, 16)
    }

    private func segment(
        _ label: String, text: Binding<String>, maxValue: Int,
        focusTarget: Segment, next: Segment?
    ) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.momenMono(9))
                .foregroundStyle(Theme.textTertiary)
                .kerning(1)

            TextField("00", text: text)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.momenMono(24, weight: .medium))
                .foregroundStyle(Theme.textPrimary)
                .focused($focus, equals: focusTarget)
                .frame(width: 56, height: 56)
                .background(Theme.glassBgActive)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(
                            focus == focusTarget ? Theme.glassBorderLight : Theme.glassBorder,
                            lineWidth: 1))
                .onChange(of: text.wrappedValue) { _, newValue in
                    var clean = String(newValue.filter(\.isNumber).prefix(2))
                    if let value = Int(clean), value > maxValue {
                        clean = String(format: "%02d", maxValue)
                    }
                    if clean != newValue { text.wrappedValue = clean }

                    emitTimecode()

                    if clean.count == 2, let next {
                        focus = next
                    }
                }
        }
    }

    private func emitTimecode() {
        let smpte = [hh, mm, ss, ff]
            .map { $0.isEmpty ? "00" : String(repeating: "0", count: max(0, 2 - $0.count)) + $0 }
            .joined(separator: ":")
        onTimecodeChange(smpte)
    }
}
