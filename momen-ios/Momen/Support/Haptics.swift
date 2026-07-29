import UIKit

enum Haptics {
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }

    static func notify(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        UINotificationFeedbackGenerator().notificationOccurred(type)
    }

    /// A definite, crisp double-pulse for logging a mark — you feel it clearly
    /// on set without looking. A rigid hit at full intensity, then a heavy
    /// confirm ~55ms later reads as one deliberate "logged" tap.
    static func mark() {
        let rigid = UIImpactFeedbackGenerator(style: .rigid)
        rigid.prepare()
        rigid.impactOccurred(intensity: 1.0)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.055) {
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred(intensity: 0.9)
        }
    }
}
