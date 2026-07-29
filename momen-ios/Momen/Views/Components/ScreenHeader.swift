import SwiftUI

/// Shared screen header — circular glass back button + centred title.
struct ScreenHeader: View {
    let title: String
    let onBack: () -> Void

    var body: some View {
        HStack {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                    .frame(width: 40, height: 40)
                    .background(Theme.glassBg)
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
            }
            Spacer()
            Text(title)
                .font(.momenSans(20, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
            Spacer()
            Color.clear.frame(width: 40, height: 40)
        }
        .padding(.top, 8)
        .padding(.bottom, 20)
    }
}
