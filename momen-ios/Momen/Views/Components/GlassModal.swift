import SwiftUI

struct GlassModalAction: Identifiable {
    enum Style { case normal, destructive, cancel }

    let id = UUID()
    let text: String
    var style: Style = .normal
    let action: () -> Void
}

/// Frosted-glass confirmation dialog matching the RN GlassModal.
struct GlassModalModifier: ViewModifier {
    @Binding var isPresented: Bool
    let title: String
    let message: String
    var accent: Color = Theme.coral
    let actions: [GlassModalAction]

    func body(content: Content) -> some View {
        content.overlay {
            if isPresented {
                ZStack {
                    Color.black.opacity(0.65)
                        .ignoresSafeArea()
                        .onTapGesture { isPresented = false }

                    VStack(spacing: 0) {
                        VStack(spacing: 10) {
                            Text(title)
                                .font(.momenSans(20, weight: .semibold))
                                .foregroundStyle(Theme.textPrimary)
                            Text(message)
                                .font(.momenSans(14))
                                .foregroundStyle(Theme.textSecondary)
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 28)
                        .padding(.bottom, 24)

                        VStack(spacing: 8) {
                            ForEach(actions) { action in
                                Button {
                                    action.action()
                                } label: {
                                    Text(action.text)
                                        .font(.momenSans(15, weight: action.style == .cancel ? .regular : .semibold))
                                        .foregroundStyle(buttonForeground(action.style))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 13)
                                        .background(buttonBackground(action.style))
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .strokeBorder(buttonBorder(action.style), lineWidth: 1))
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 16)
                    }
                    .frame(maxWidth: 320)
                    .background(Theme.bgTertiary)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .strokeBorder(accent.opacity(0.3), lineWidth: 1))
                    .shadow(color: .black.opacity(0.5), radius: 30, y: 10)
                    .padding(.horizontal, 32)
                }
                .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.18), value: isPresented)
    }

    private func buttonForeground(_ style: GlassModalAction.Style) -> Color {
        switch style {
        case .normal: return Theme.textPrimary
        case .destructive: return .white
        case .cancel: return Theme.textSecondary
        }
    }

    private func buttonBackground(_ style: GlassModalAction.Style) -> Color {
        switch style {
        case .normal: return Theme.glassBgActive
        case .destructive: return Theme.coral
        case .cancel: return Theme.glassBg
        }
    }

    private func buttonBorder(_ style: GlassModalAction.Style) -> Color {
        switch style {
        case .normal: return Theme.glassBorderLight
        case .destructive: return .clear
        case .cancel: return Theme.glassBorder
        }
    }
}

extension View {
    func glassModal(
        isPresented: Binding<Bool>, title: String, message: String,
        accent: Color = Theme.coral, actions: [GlassModalAction]
    ) -> some View {
        modifier(GlassModalModifier(
            isPresented: isPresented, title: title, message: message,
            accent: accent, actions: actions))
    }
}
