import SwiftUI
import SwiftData
import MomenKit

/// Clap sync — listens for a sharp transient, then captures the sync moment,
/// auto-creates the SYNC marker at t=0, and continues to logging.
struct ClapListenView: View {
    let sessionID: String
    let frameRate: FrameRate

    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext

    @StateObject private var detector = ClapDetector()
    @State private var detected = false
    @State private var flashOpacity = 0.0
    @State private var pulsing = false

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            BackgroundGlow(color: Theme.coral.opacity(0.05), size: 320)
                .offset(x: 140, y: -320)
            BackgroundGlow(color: Theme.teal.opacity(0.04), size: 280)
                .offset(x: -140, y: 340)

            if detector.permissionDenied {
                permissionDeniedContent
            } else {
                listeningContent
            }

            // Flash overlay on detection
            Color.white
                .opacity(flashOpacity)
                .ignoresSafeArea()
                .allowsHitTesting(false)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear { pulsing = true }
        .task {
            detector.onClap = { clapUptimeMs in
                handleClap(atUptimeMs: clapUptimeMs)
            }
            await detector.start()
        }
        .onDisappear { detector.stop() }
    }

    // ─── States ─────────────────────────────────────────────

    private var permissionDeniedContent: some View {
        VStack(spacing: 16) {
            Text("MICROPHONE ACCESS DENIED")
                .font(.momenMono(10))
                .kerning(4)
                .foregroundStyle(Theme.textTertiary)
            Text("Grant microphone access in Settings,\nor use Manual sync instead.")
                .font(.momenSans(14))
                .foregroundStyle(Theme.textTertiary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
            Button { router.pop() } label: {
                Text("Go Back")
                    .font(.momenMono(12))
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 14)
                    .glassPill()
            }
            .padding(.top, 8)
        }
    }

    private var listeningContent: some View {
        ZStack {
            VStack(spacing: 0) {
                Text(detected ? "CLAP DETECTED" : "LISTENING")
                    .font(.momenMono(10))
                    .kerning(4)
                    .foregroundStyle(Theme.textTertiary)
                    .padding(.bottom, 32)

                ZStack {
                    if !detected {
                        Circle()
                            .strokeBorder(Theme.coral.opacity(0.2), lineWidth: 1)
                            .frame(width: 220, height: 220)
                            .scaleEffect(pulsing ? 1.5 : 1)
                            .opacity(pulsing ? 0 : 0.3)
                            .animation(
                                .easeOut(duration: 1.6).repeatForever(autoreverses: false),
                                value: pulsing)
                    }

                    // Reactive meter ring — scales with mic level
                    Circle()
                        .strokeBorder(detected ? Theme.teal : Theme.coral, lineWidth: 2)
                        .frame(width: 180, height: 180)
                        .scaleEffect(detected ? 1.8 : meterScale)
                        .opacity(detected ? 1 : meterOpacity)
                        .animation(.spring(duration: 0.25, bounce: 0), value: meterScale)
                        .animation(.spring(duration: 0.4, bounce: 0.2), value: detected)

                    Circle()
                        .fill(detected ? Theme.tealLight : Theme.glassBg)
                        .frame(width: 100, height: 100)
                        .overlay(
                            Circle().strokeBorder(
                                detected ? Theme.tealBorder : Theme.glassBorder, lineWidth: 1))
                        .overlay(
                            Group {
                                if detected {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 36, weight: .semibold))
                                        .foregroundStyle(Theme.teal)
                                } else {
                                    Image(systemName: "mic.fill")
                                        .font(.system(size: 32))
                                        .foregroundStyle(Theme.textSecondary)
                                }
                            })
                }
                .frame(width: 240, height: 240)

                Text(detected ? "Sync captured — starting session…" : "Clap near the microphone")
                    .font(.momenSans(14))
                    .foregroundStyle(Theme.textTertiary)
                    .padding(.top, 32)

                if !detected && detector.isListening {
                    HStack(spacing: 12) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Theme.glassBg)
                                Capsule()
                                    .fill(Theme.coral)
                                    .frame(width: geo.size.width * meterFraction)
                            }
                        }
                        .frame(width: 120, height: 4)

                        Text("\(Int(detector.meterDb)) dB")
                            .font(.momenMono(10))
                            .foregroundStyle(Theme.textTertiary)
                            .frame(minWidth: 50, alignment: .leading)
                    }
                    .padding(.top, 20)
                }
            }

            VStack {
                if !detected {
                    HStack {
                        Button {
                            detector.stop()
                            router.pop()
                        } label: {
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
                }

                Spacer()

                if !detected {
                    Button {
                        detector.triggerManually()
                    } label: {
                        Text("Tap to sync manually")
                            .font(.momenMono(12))
                            .foregroundStyle(Theme.textSecondary)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 14)
                            .glassPill()
                    }
                    .padding(.bottom, 12)
                }

                Text("\(frameRate.displayName) fps")
                    .font(.momenMono(10))
                    .kerning(1)
                    .foregroundStyle(Theme.textTertiary)
                    .glassPill()
                    .padding(.bottom, 16)
            }
        }
    }

    // Map dBFS (-60..0) to ring scale / opacity like the RN screen.
    private var meterFraction: CGFloat {
        CGFloat(max(0, min(1, (detector.meterDb + 60) / 60)))
    }
    private var meterScale: CGFloat { 1 + meterFraction * 0.8 }
    private var meterOpacity: Double { 0.2 + Double(meterFraction) * 0.6 }

    // ─── Detection handler ──────────────────────────────────

    private func handleClap(atUptimeMs clapUptimeMs: Double) {
        detected = true
        Haptics.impact(.heavy)

        withAnimation(.easeOut(duration: 0.05)) { flashOpacity = 0.2 }
        withAnimation(.easeOut(duration: 0.4).delay(0.05)) { flashOpacity = 0 }

        detector.stop()

        let descriptor = FetchDescriptor<Session>(predicate: #Predicate { $0.id == sessionID })
        guard let session = try? modelContext.fetch(descriptor).first else { return }

        session.recordSync(
            method: .clap, cameraTc: nil, cameraTcMs: 0, syncUptimeMs: clapUptimeMs)
        // Auto-create the SYNC marker at t=0.
        session.addMarker(
            timecodeMs: 0, timecodeSmpte: "00:00:00:00",
            note: MomenConstants.syncNote, isSyncPoint: true)
        try? modelContext.save()

        Task {
            try? await Task.sleep(for: .milliseconds(700))
            router.replace(with: .logging(sessionID: sessionID))
        }
    }
}
