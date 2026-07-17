import AVFoundation
import QuartzCore

/// Microphone clap detection via AVAudioEngine peak metering.
///
/// Two-phase algorithm ported from the RN ClapListenScreen:
///  Phase 1 — a spike far above the rolling noise floor AND near clipping
///            in absolute terms becomes a candidate.
///  Phase 2 — after ~2 buffers, the level must have dropped sharply
///            (claps decay instantly; thuds and speech sustain → rejected).
@MainActor
final class ClapDetector: ObservableObject {

    // Detection tuning. The RN app's constants (80 dB over floor AND > −3 dBFS)
    // were unreachable in practice — a −50 dB room floor would demand a
    // +30 dBFS spike, which can't exist. These values trigger on a real clap
    // at arm's length while the decay check still rejects thuds and speech.
    private static let historySize = 10
    private static let spikeThresholdDb = 25.0   // dB above noise floor
    private static let absoluteMinDb = -12.0     // loud in absolute terms
    private static let cooldownMs = 1500.0
    private static let decayCheckCount = 2       // buffers before confirming decay
    private static let decayDropDb = 18.0        // level must fall sharply after spike

    @Published private(set) var meterDb: Double = -60
    @Published private(set) var isListening = false
    @Published private(set) var permissionDenied = false

    /// Called once with the compensated monotonic timestamp (ms) of the clap.
    var onClap: ((Double) -> Void)?

    private let engine = AVAudioEngine()
    private var history: [Double] = []
    private var candidate: (peakDb: Double, peakTimeMs: Double, buffersSincePeak: Int)?
    private var lastDetectionMs: Double = 0
    private var detected = false
    private var bufferIntervalMs: Double = 46

    func start() async {
        let granted = await AVAudioApplication.requestRecordPermission()
        guard granted else {
            permissionDenied = true
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker])
            try session.setActive(true)

            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            let bufferSize: AVAudioFrameCount = 2048
            bufferIntervalMs = Double(bufferSize) / format.sampleRate * 1000.0

            input.installTap(onBus: 0, bufferSize: bufferSize, format: format) { [weak self] buffer, _ in
                let db = Self.peakDb(buffer)
                let timestampMs = CACurrentMediaTime() * 1000.0
                Task { @MainActor in
                    self?.process(db: db, atMs: timestampMs)
                }
            }

            try engine.start()
            isListening = true
        } catch {
            permissionDenied = false
            isListening = false
        }
    }

    func stop() {
        guard isListening || engine.isRunning else { return }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        isListening = false
    }

    /// Manual fallback — treat "now" as the sync moment.
    func triggerManually() {
        guard !detected else { return }
        detected = true
        onClap?(TimeSource.nowMs)
    }

    // ─── Detection ──────────────────────────────────────────

    private func process(db: Double, atMs now: Double) {
        guard !detected else { return }

        meterDb = db

        if now - lastDetectionMs < Self.cooldownMs { return }

        // Phase 2 — confirm decay of an existing candidate.
        if var current = candidate {
            current.buffersSincePeak += 1
            candidate = current

            if current.buffersSincePeak >= Self.decayCheckCount {
                let drop = current.peakDb - db
                candidate = nil

                if drop >= Self.decayDropDb {
                    // Confirmed clap — sharp transient with fast decay.
                    lastDetectionMs = now
                    detected = true
                    // The spike landed somewhere within the peak buffer;
                    // compensate by half the buffer interval.
                    let compensated = current.peakTimeMs - bufferIntervalMs / 2
                    onClap?(compensated)
                }
                // else: sustained sound (thud/voice) — candidate rejected.
            }
            return
        }

        // Phase 1 — look for a spike above the rolling noise floor.
        let noiseFloor = history.isEmpty ? -60.0 : history.reduce(0, +) / Double(history.count)
        let spikeAboveNoise = db - noiseFloor

        if spikeAboveNoise > Self.spikeThresholdDb && db > Self.absoluteMinDb {
            candidate = (peakDb: db, peakTimeMs: now, buffersSincePeak: 0)
            return
        }

        history.append(db)
        if history.count > Self.historySize {
            history.removeFirst()
        }
    }

    private nonisolated static func peakDb(_ buffer: AVAudioPCMBuffer) -> Double {
        guard let channelData = buffer.floatChannelData?[0] else { return -160 }
        let frames = Int(buffer.frameLength)
        var peak: Float = 0
        for i in 0..<frames {
            let sample = abs(channelData[i])
            if sample > peak { peak = sample }
        }
        guard peak > 0 else { return -160 }
        return max(-160, Double(20 * log10(peak)))
    }
}
