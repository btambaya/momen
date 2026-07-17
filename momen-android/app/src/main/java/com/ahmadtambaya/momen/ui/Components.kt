package com.ahmadtambaya.momen.ui

import android.os.SystemClock
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.ahmadtambaya.momen.core.FrameRate
import com.ahmadtambaya.momen.core.SyncMethod
import com.ahmadtambaya.momen.core.Timecode

/** Soft radial glow used as a screen background accent. */
@Composable
fun BackgroundGlow(color: Color, size: Int, modifier: Modifier = Modifier) {
    Box(
        modifier
            .size(size.dp)
            .blur(60.dp)
            .clip(CircleShape)
            .background(color))
}

/** Circular glass back button + centred title. */
@Composable
fun ScreenHeader(title: String, onBack: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(top = 8.dp, bottom = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BackButton(onBack)
        Spacer(Modifier.weight(1f))
        Text(title, style = T.sans(20, FontWeight.SemiBold))
        Spacer(Modifier.weight(1f))
        Spacer(Modifier.size(40.dp))
    }
}

@Composable
fun BackButton(onBack: () -> Unit) {
    Box(
        Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(T.GlassBg)
            .border(1.dp, T.GlassBorder, CircleShape)
            .clickable(onClick = onBack),
        contentAlignment = Alignment.Center,
    ) {
        Text("‹", style = T.mono(24, color = T.TextPrimary))
    }
}

// ─── Glass modal ─────────────────────────────────────────────

class ModalAction(
    val text: String,
    val style: Style = Style.NORMAL,
    val action: () -> Unit,
) {
    enum class Style { NORMAL, DESTRUCTIVE, CANCEL }
}

@Composable
fun GlassModal(
    visible: Boolean,
    title: String,
    message: String,
    accent: Color = T.Coral,
    actions: List<ModalAction>,
    onDismiss: () -> Unit,
) {
    if (!visible) return
    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(T.BgTertiary)
                .border(1.dp, accent.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                title, style = T.sans(20, FontWeight.SemiBold),
                modifier = Modifier.padding(top = 12.dp, bottom = 10.dp))
            Text(
                message, style = T.sans(14, color = T.TextSecondary),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
            Spacer(Modifier.height(16.dp))
            actions.forEach { action ->
                val bg = when (action.style) {
                    ModalAction.Style.NORMAL -> T.GlassBgActive
                    ModalAction.Style.DESTRUCTIVE -> T.Coral
                    ModalAction.Style.CANCEL -> T.GlassBg
                }
                val fg = when (action.style) {
                    ModalAction.Style.NORMAL -> T.TextPrimary
                    ModalAction.Style.DESTRUCTIVE -> Color.White
                    ModalAction.Style.CANCEL -> T.TextSecondary
                }
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(bg)
                        .border(
                            1.dp,
                            if (action.style == ModalAction.Style.DESTRUCTIVE) Color.Transparent
                            else T.GlassBorderLight,
                            RoundedCornerShape(12.dp))
                        .clickable { action.action() }
                        .padding(vertical = 13.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        action.text,
                        style = T.sans(
                            15,
                            if (action.style == ModalAction.Style.CANCEL) FontWeight.Normal
                            else FontWeight.SemiBold,
                            fg))
                }
            }
        }
    }
}

// ─── Timecode display ────────────────────────────────────────

@Composable
fun TimecodeDisplay(
    syncReferenceMs: Double,
    cameraTcMs: Double,
    fps: FrameRate,
    syncMethod: SyncMethod,
    isRunning: Boolean,
    frozenTimecode: String? = null,
) {
    var timecode by remember {
        mutableStateOf(frozenTimecode ?: Timecode.msToSmpte(0.0, fps))
    }

    LaunchedEffect(isRunning, syncReferenceMs, cameraTcMs, fps, syncMethod) {
        while (isRunning) {
            withFrameMillis { }
            val elapsed = SystemClock.elapsedRealtime() - syncReferenceMs
            timecode = Timecode.currentTimecode(elapsed, cameraTcMs, fps, syncMethod)
        }
    }

    val shown = if (!isRunning && frozenTimecode != null) frozenTimecode else timecode
    val parts = shown.replace(";", ":").split(":").let {
        if (it.size == 4) it else listOf("00", "00", "00", "00")
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TcDigit(parts[0]); TcSep(":")
            TcDigit(parts[1]); TcSep(":")
            TcDigit(parts[2]); TcSep(fps.frameSeparator, T.CoralText)
            TcDigit(parts[3], T.CoralText)
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Pill("${fps.displayName} fps")
            when {
                !isRunning && frozenTimecode != null ->
                    Pill("ENDED", T.CoralText, T.CoralLight, T.CoralBorder)
                syncMethod == SyncMethod.MANUAL ->
                    Pill("SYNCED", T.TealText, T.TealLight, T.TealBorder)
                else ->
                    Pill("CLAP SYNC", T.AmberText, T.AmberLight, T.AmberBorder)
            }
        }
    }
}

@Composable
private fun TcDigit(text: String, color: Color = T.TextPrimary) {
    Text(
        text, style = T.mono(44, FontWeight.Light, color, letterSpacing = 2.0),
        modifier = Modifier.width(64.dp), textAlign = TextAlign.Center)
}

@Composable
private fun TcSep(text: String, color: Color = T.TextTertiary) {
    Text(text, style = T.mono(44, FontWeight.ExtraLight, color))
}

@Composable
fun Pill(
    text: String,
    color: Color = T.TextSecondary,
    background: Color = T.GlassBg,
    border: Color = T.GlassBorder,
) {
    Text(
        text, style = T.mono(10, color = color, letterSpacing = 1.0),
        modifier = Modifier
            .glassPill(background, border)
            .padding(horizontal = 12.dp, vertical = 4.dp))
}

// ─── Timecode input ──────────────────────────────────────────

@Composable
fun TimecodeInput(fps: FrameRate, onTimecodeChange: (String) -> Unit) {
    var hh by remember { mutableStateOf("") }
    var mm by remember { mutableStateOf("") }
    var ss by remember { mutableStateOf("") }
    var ff by remember { mutableStateOf("") }

    fun emit() {
        val smpte = listOf(hh, mm, ss, ff).joinToString(":") { it.padStart(2, '0').ifEmpty { "00" } }
        onTimecodeChange(smpte)
    }

    @Composable
    fun segment(label: String, value: String, maxValue: Int, onChange: (String) -> Unit) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, style = T.mono(9, color = T.TextTertiary, letterSpacing = 1.0))
            Spacer(Modifier.height(4.dp))
            BasicTextField(
                value = value,
                onValueChange = { raw ->
                    var clean = raw.filter { it.isDigit() }.take(2)
                    clean.toIntOrNull()?.let { if (it > maxValue) clean = "%02d".format(maxValue) }
                    onChange(clean)
                },
                textStyle = T.mono(22, FontWeight.Medium, T.TextPrimary)
                    .copy(textAlign = TextAlign.Center),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                cursorBrush = SolidColor(T.CoralText),
                decorationBox = { inner ->
                    Box(
                        Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(T.GlassBgActive)
                            .border(1.dp, T.GlassBorder, RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center,
                    ) { inner() }
                })
        }
    }

    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.Bottom,
    ) {
        segment("HH", hh, 23) { hh = it; emit() }
        Colon()
        segment("MM", mm, 59) { mm = it; emit() }
        Colon()
        segment("SS", ss, 59) { ss = it; emit() }
        Colon()
        segment("FF", ff, fps.nominalFps - 1) { ff = it; emit() }
    }
}

@Composable
private fun Colon() {
    Text(
        ":", style = T.mono(24, color = T.TextTertiary),
        modifier = Modifier.padding(horizontal = 6.dp, vertical = 12.dp))
}

// ─── Mark button ─────────────────────────────────────────────

@Composable
fun MarkButton(markerCount: Int, disabled: Boolean, onMark: () -> Unit) {
    Box(
        Modifier
            .size(96.dp)
            .clip(CircleShape)
            .background(if (disabled) T.BgElevated else T.Coral)
            .border(
                1.dp,
                if (disabled) T.GlassBorder else Color(0xFFFF8A6A).copy(alpha = 0.4f),
                CircleShape)
            .clickable(enabled = !disabled, onClick = onMark),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "MARK",
                style = T.mono(
                    15, FontWeight.SemiBold,
                    if (disabled) T.TextTertiary else Color.White, letterSpacing = 2.0))
            if (markerCount > 0) {
                Text(
                    "$markerCount",
                    style = T.mono(
                        11,
                        color = if (disabled) T.TextTertiary else Color.White.copy(alpha = 0.7f)))
            }
        }
    }
}

// ─── Frame rate picker ───────────────────────────────────────

@Composable
fun FrameRatePicker(selected: FrameRate, onSelect: (FrameRate) -> Unit) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FrameRate.entries.forEach { rate ->
            val isSelected = rate == selected
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (isSelected) T.CoralLight else T.GlassBg)
                    .border(
                        1.dp,
                        if (isSelected) T.CoralBorder else T.GlassBorder,
                        RoundedCornerShape(10.dp))
                    .clickable { onSelect(rate) }
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    rate.displayName,
                    style = T.mono(
                        12,
                        if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        if (isSelected) T.CoralText else T.TextSecondary))
            }
        }
    }
}

/** Full-width coral (or accent-coloured) primary action button. */
@Composable
fun PrimaryButton(
    text: String,
    enabled: Boolean = true,
    color: Color = T.Coral,
    onClick: () -> Unit,
) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (enabled) color else T.BgElevated)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            style = T.sans(
                17, FontWeight.SemiBold,
                if (enabled) Color.White else T.TextTertiary))
    }
}
