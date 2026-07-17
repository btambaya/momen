import SwiftUI
import MomenKit

/// Large running timecode counter. TimelineView drives per-frame updates from
/// the monotonic clock; frame digits render in coral like the RN design.
struct TimecodeDisplayView: View {
    let syncReferenceMs: Double
    let cameraTcMs: Double
    let fps: FrameRate
    let syncMethod: SyncMethod
    let isRunning: Bool
    var frozenTimecode: String? = nil

    var body: some View {
        VStack(spacing: 12) {
            TimelineView(.animation(minimumInterval: 1.0 / 60.0, paused: !isRunning)) { _ in
                timecodeRow(currentTimecode())
            }

            HStack(spacing: 8) {
                Text("\(fps.displayName) fps")
                    .font(.momenMono(10))
                    .foregroundStyle(Theme.textSecondary)
                    .textCase(.uppercase)
                    .glassPill()

                if !isRunning, frozenTimecode != nil {
                    Text("ENDED")
                        .font(.momenMono(10))
                        .foregroundStyle(Theme.coralText)
                        .glassPill(background: Theme.coralLight, border: Theme.coralBorder)
                } else if syncMethod == .manual {
                    HStack(spacing: 4) {
                        Circle().fill(Theme.teal).frame(width: 6, height: 6)
                        Text("SYNCED")
                            .font(.momenMono(10))
                            .foregroundStyle(Theme.tealText)
                    }
                    .glassPill(background: Theme.tealLight, border: Theme.tealBorder)
                } else {
                    Text("CLAP SYNC")
                        .font(.momenMono(10))
                        .foregroundStyle(Theme.amberText)
                        .glassPill(background: Theme.amberLight, border: Theme.amberBorder)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(
            Capsule()
                .fill(Theme.coral.opacity(0.06))
                .frame(height: 60)
                .blur(radius: 40)
        )
    }

    private func currentTimecode() -> String {
        if let frozenTimecode, !isRunning { return frozenTimecode }
        guard isRunning else { return Timecode.msToSmpte(0, fps: fps) }
        let elapsed = TimeSource.nowMs - syncReferenceMs
        return Timecode.currentTimecode(
            elapsedMs: elapsed, cameraTcMs: cameraTcMs, fps: fps, syncMethod: syncMethod)
    }

    private func timecodeRow(_ timecode: String) -> some View {
        let parts = timecode.replacingOccurrences(of: ";", with: ":").split(separator: ":").map(String.init)
        let digits = parts.count == 4 ? parts : ["00", "00", "00", "00"]

        return HStack(alignment: .lastTextBaseline, spacing: 2) {
            digit(digits[0])
            separator(":")
            digit(digits[1])
            separator(":")
            digit(digits[2])
            separator(fps.frameSeparator, color: Theme.coralText)
            digit(digits[3], color: Theme.coralText)
        }
        .monospacedDigit()
    }

    private func digit(_ text: String, color: Color = Theme.textPrimary) -> some View {
        Text(text)
            .font(.momenMono(46, weight: .light))
            .foregroundStyle(color)
            .frame(minWidth: 62)
    }

    private func separator(_ text: String, color: Color = Theme.textTertiary) -> some View {
        Text(text)
            .font(.momenMono(46, weight: .ultraLight))
            .foregroundStyle(color)
    }
}
