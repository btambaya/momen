import QuartzCore
import Foundation

/// Monotonic clock for sync-critical timing. CACurrentMediaTime is backed by
/// mach_absolute_time — immune to wall-clock adjustments while running.
enum TimeSource {
    static var nowMs: Double { CACurrentMediaTime() * 1000.0 }
}
