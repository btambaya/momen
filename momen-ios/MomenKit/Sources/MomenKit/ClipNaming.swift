import Foundation

/// Clip naming — a project sets a prefix once, and clips auto-number from it:
/// "MONTACLIP" → MONTACLIP_001, MONTACLIP_002, … (3-digit zero-padded).
public enum ClipNaming {

    public static let separator = "_"

    /// Normalise a user-entered prefix: keep letters/digits/_/-, drop
    /// everything else (spaces included), strip a trailing separator.
    /// Empty result falls back to "CLIP".
    public static func normalizePrefix(_ raw: String) -> String {
        var prefix = String(raw.filter { ch in
            ch.isLetter || ch.isNumber || ch == "_" || ch == "-"
        })
        while prefix.hasSuffix(separator) { prefix.removeLast() }
        return prefix.isEmpty ? "CLIP" : prefix
    }

    /// Build a clip name from a normalized prefix and a 1-based number.
    public static func name(prefix: String, number: Int) -> String {
        "\(prefix)\(separator)\(String(format: "%03d", number))"
    }
}
