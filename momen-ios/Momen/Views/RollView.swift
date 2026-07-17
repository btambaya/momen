import SwiftUI
import SwiftData
import MomenKit

/// "Stand by" gate between sync setup and logging. The ROLL tap is the
/// precise sync moment — the monotonic reference is captured here.
struct RollView: View {
    let sessionID: String
    let frameRate: FrameRate
    let cameraTc: String
    let cameraTcMs: Double

    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext

    @State private var pulsing = false

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            BackgroundGlow(color: Theme.coral.opacity(0.05), size: 320)
                .offset(x: 140, y: -320)
            BackgroundGlow(color: Theme.teal.opacity(0.04), size: 280)
                .offset(x: -140, y: 340)

            VStack(spacing: 0) {
                Text("STAND BY")
                    .font(.momenMono(10))
                    .kerning(4)
                    .foregroundStyle(Theme.textTertiary)
                    .padding(.bottom, 32)

                ZStack {
                    // Pulsing ring
                    Circle()
                        .strokeBorder(Theme.coral.opacity(0.35), lineWidth: 1.5)
                        .frame(width: 260, height: 260)
                        .scaleEffect(pulsing ? 1.65 : 1)
                        .opacity(pulsing ? 0 : 1)
                        .animation(
                            .easeOut(duration: 1.6).repeatForever(autoreverses: false),
                            value: pulsing)

                    Button {
                        handleRoll()
                    } label: {
                        Text("ROLL")
                            .font(.momenMono(32, weight: .light))
                            .kerning(10)
                            .foregroundStyle(.white)
                            .offset(x: 5) // visually recentre kerned text
                            .frame(width: 220, height: 220)
                            .background(Theme.coral)
                            .clipShape(Circle())
                            .overlay(
                                Circle().strokeBorder(
                                    Color(hex: 0xFF8A6A).opacity(0.4), lineWidth: 1))
                            .shadow(color: Theme.coral.opacity(0.5), radius: 40)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Roll — start sync")
                }

                Text("Tap the moment your\ncamera starts rolling")
                    .font(.momenSans(14))
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.top, 32)
            }

            VStack {
                HStack {
                    Button { router.pop() } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 17, weight: .medium))
                            .foregroundStyle(Theme.textPrimary)
                            .frame(width: 40, height: 40)
                            .background(Theme.glassBg)
                            .clipShape(Circle())
                            .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
                    }
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                Spacer()
                Text("\(frameRate.displayName) fps")
                    .font(.momenMono(10))
                    .kerning(1)
                    .foregroundStyle(Theme.textTertiary)
                    .glassPill()
                    .padding(.bottom, 16)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear { pulsing = true }
    }

    private func handleRoll() {
        // Fire haptic immediately — this is the critical sync moment.
        Haptics.impact(.heavy)
        let syncUptimeMs = TimeSource.nowMs

        let descriptor = FetchDescriptor<Session>(predicate: #Predicate { $0.id == sessionID })
        guard let session = try? modelContext.fetch(descriptor).first else { return }

        session.recordSync(
            method: .manual, cameraTc: cameraTc,
            cameraTcMs: cameraTcMs, syncUptimeMs: syncUptimeMs)
        try? modelContext.save()

        router.replace(with: .logging(sessionID: sessionID))
    }
}
