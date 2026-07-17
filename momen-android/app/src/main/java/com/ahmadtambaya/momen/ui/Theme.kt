package com.ahmadtambaya.momen.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Momen glassmorphism design system — mirrors momen-ios Theme.swift. */
object T {
    // Backgrounds
    val BgPrimary = Color(0xFF0A0A0F)
    val BgTertiary = Color(0xFF1A1A25)
    val BgElevated = Color(0xFF222230)

    // Glass
    val GlassBg = Color.White.copy(alpha = 0.05f)
    val GlassBgHover = Color.White.copy(alpha = 0.08f)
    val GlassBgActive = Color.White.copy(alpha = 0.12f)
    val GlassBorder = Color.White.copy(alpha = 0.10f)
    val GlassBorderLight = Color.White.copy(alpha = 0.15f)

    // Text
    val TextPrimary = Color(0xFFF0EDE6)
    val TextSecondary = Color(0xFF9B97A0)
    val TextTertiary = Color(0xFF5E5A66)

    // Coral
    val Coral = Color(0xFFE8613A)
    val CoralLight = Coral.copy(alpha = 0.15f)
    val CoralText = Color(0xFFFF8A6A)
    val CoralBorder = Coral.copy(alpha = 0.3f)

    // Teal
    val Teal = Color(0xFF22C989)
    val TealLight = Teal.copy(alpha = 0.15f)
    val TealText = Color(0xFF5EEDB5)
    val TealBorder = Teal.copy(alpha = 0.3f)

    // Amber
    val Amber = Color(0xFFD4930B)
    val AmberLight = Amber.copy(alpha = 0.15f)
    val AmberText = Color(0xFFF5C34A)
    val AmberBorder = Amber.copy(alpha = 0.3f)

    // Purple
    val Purple = Color(0xFF7B6FF0)

    fun mono(
        size: Int, weight: FontWeight = FontWeight.Normal,
        color: Color = TextPrimary, letterSpacing: Double = 0.0,
    ) = TextStyle(
        fontFamily = FontFamily.Monospace, fontSize = size.sp,
        fontWeight = weight, color = color, letterSpacing = letterSpacing.sp)

    fun sans(
        size: Int, weight: FontWeight = FontWeight.Normal, color: Color = TextPrimary,
    ) = TextStyle(
        fontFamily = FontFamily.SansSerif, fontSize = size.sp,
        fontWeight = weight, color = color)
}

fun Modifier.glassCard(
    elevated: Boolean = false, accent: Color? = null, cornerRadius: Int = 14,
): Modifier {
    val shape = RoundedCornerShape(cornerRadius.dp)
    return this
        .clip(shape)
        .background(if (elevated) T.GlassBgHover else T.GlassBg)
        .border(
            1.dp,
            accent?.copy(alpha = 0.3f) ?: if (elevated) T.GlassBorderLight else T.GlassBorder,
            shape)
}

fun Modifier.glassPill(
    background: Color = T.GlassBg, border: Color = T.GlassBorder,
): Modifier = this
    .clip(CircleShape)
    .background(background)
    .border(1.dp, border, CircleShape)
