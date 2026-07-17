import SwiftUI
import MomenKit

/// Frame rate selector — pill row across the five supported rates.
struct FrameRatePickerView: View {
    @Binding var selected: FrameRate

    var body: some View {
        HStack(spacing: 8) {
            ForEach(FrameRate.allCases, id: \.self) { rate in
                Button {
                    selected = rate
                    Haptics.impact(.light)
                } label: {
                    Text(rate.displayName)
                        .font(.momenMono(13, weight: rate == selected ? .semibold : .regular))
                        .foregroundStyle(rate == selected ? Theme.coralText : Theme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(rate == selected ? Theme.coralLight : Theme.glassBg)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(
                                    rate == selected ? Theme.coralBorder : Theme.glassBorder,
                                    lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }
}
