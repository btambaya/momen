package com.ahmadtambaya.momen.core

/**
 * Clip naming — a project sets a prefix once, and clips auto-number from it:
 * "MONTACLIP" → MONTACLIP_001, MONTACLIP_002, … (3-digit zero-padded).
 * Kept in lockstep with momen-ios/MomenKit/.../ClipNaming.swift.
 */
object ClipNaming {

    const val SEPARATOR = "_"

    /** Keep letters/digits/_/-, drop everything else, strip a trailing sep. */
    fun normalizePrefix(raw: String): String {
        var prefix = raw.filter { it.isLetterOrDigit() || it == '_' || it == '-' }
        while (prefix.endsWith(SEPARATOR)) prefix = prefix.dropLast(1)
        return prefix.ifEmpty { "CLIP" }
    }

    /** Build a clip name from a normalized prefix and a 1-based number. */
    fun name(prefix: String, number: Int): String =
        "%s%s%03d".format(java.util.Locale.ROOT, prefix, SEPARATOR, number)
}
