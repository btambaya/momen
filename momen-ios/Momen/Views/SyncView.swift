import SwiftUI
import MomenKit

/// Timecode sync setup — Manual Offset or Clap Sync.
struct SyncView: View {
    let sessionID: String
    let frameRate: FrameRate

    @Environment(Router.self) private var router

    @State private var selectedMethod: SyncMethod?
    @State private var cameraTc = "00:00:00:00"
    @State private var showParseError = false

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            BackgroundGlow(color: Theme.coral.opacity(0.04), size: 250)
                .offset(x: 130, y: -300)
            BackgroundGlow(color: Theme.teal.opacity(0.03), size: 300)
                .offset(x: -140, y: 350)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ScreenHeader(title: "Timecode Sync") { router.pop() }

                    // Critical warning callout
                    VStack(alignment: .leading, spacing: 8) {
                        Text("CRITICAL")
                            .font(.momenMono(10, weight: .semibold))
                            .kerning(2)
                            .foregroundStyle(Theme.coralText)
                        Text("Without a reliable timecode reference, exported markers will not align to footage in the NLE. Choose a sync method below.")
                            .font(.momenSans(14))
                            .foregroundStyle(Theme.textSecondary)
                            .lineSpacing(4)
                    }
                    .padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .glassCard(accent: Theme.coral)
                    .padding(.bottom, 20)

                    methodCard(
                        method: .manual, letter: "A", accent: Theme.coral,
                        title: "Manual Offset Sync",
                        subtitle: "Enter the timecode shown on your camera"
                    ) {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Read the timecode from your camera's display and enter it below. The moment you tap Sync, the offset will be calculated.")
                                .font(.momenSans(14))
                                .foregroundStyle(Theme.textSecondary)
                                .lineSpacing(4)

                            TimecodeInputView(fps: frameRate) { cameraTc = $0 }
                                .padding(.vertical, 12)

                            actionButton("Sync Now", color: Theme.coral) {
                                handleManualSync()
                            }
                        }
                    }

                    methodCard(
                        method: .clap, letter: "B", accent: Theme.teal,
                        title: "Clap Sync",
                        subtitle: "Clap in front of camera while tapping mark"
                    ) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("When you start the session, your first marker will be labelled SYNC. Clap in front of the camera at the same moment you tap the button.")
                                .font(.momenSans(14))
                                .foregroundStyle(Theme.textSecondary)
                                .lineSpacing(4)
                            Text("Your editor will align the SYNC marker to the frame of the clap in your footage to synchronise all subsequent markers.")
                                .font(.momenSans(14))
                                .foregroundStyle(Theme.textSecondary)
                                .lineSpacing(4)

                            actionButton("Start Session", color: Theme.teal) {
                                router.push(.clapListen(sessionID: sessionID, frameRate: frameRate))
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .glassModal(
            isPresented: $showParseError,
            title: "Sync Error",
            message: "Failed to parse timecode. Check the values and try again.",
            accent: Theme.amber,
            actions: [GlassModalAction(text: "OK") { showParseError = false }])
    }

    private func handleManualSync() {
        do {
            let cameraTcMs = try Timecode.smpteToMs(cameraTc, fps: frameRate)
            router.push(.roll(
                sessionID: sessionID, frameRate: frameRate,
                cameraTc: cameraTc, cameraTcMs: cameraTcMs))
        } catch {
            showParseError = true
        }
    }

    private func methodCard<Content: View>(
        method: SyncMethod, letter: String, accent: Color,
        title: String, subtitle: String,
        @ViewBuilder expanded: () -> Content
    ) -> some View {
        let isSelected = selectedMethod == method

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) { selectedMethod = method }
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 12) {
                    Text(letter)
                        .font(.momenMono(14, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                        .frame(width: 36, height: 36)
                        .background(accent.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(accent.opacity(0.3), lineWidth: 1))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.momenSans(17, weight: .semibold))
                            .foregroundStyle(Theme.textPrimary)
                        Text(subtitle)
                            .font(.momenSans(12))
                            .foregroundStyle(Theme.textTertiary)
                    }

                    Spacer()

                    ZStack {
                        Circle()
                            .strokeBorder(
                                isSelected ? accent : Theme.glassBorderLight, lineWidth: 2)
                            .frame(width: 22, height: 22)
                        if isSelected {
                            Circle().fill(accent).frame(width: 10, height: 10)
                        }
                    }
                }

                if isSelected {
                    Rectangle()
                        .fill(Theme.glassBorder)
                        .frame(height: 1)
                        .padding(.vertical, 16)
                    expanded()
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassCard(elevated: isSelected, accent: isSelected ? accent : nil)
        }
        .buttonStyle(.plain)
        .padding(.bottom, 16)
    }

    private func actionButton(_ title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.momenSans(17, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .shadow(color: color.opacity(0.4), radius: 24, y: 8)
        }
        .buttonStyle(.plain)
    }
}
