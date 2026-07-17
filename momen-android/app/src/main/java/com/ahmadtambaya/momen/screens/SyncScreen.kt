package com.ahmadtambaya.momen.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ahmadtambaya.momen.Nav
import com.ahmadtambaya.momen.Route
import com.ahmadtambaya.momen.core.FrameRate
import com.ahmadtambaya.momen.core.SyncMethod
import com.ahmadtambaya.momen.core.Timecode
import com.ahmadtambaya.momen.ui.GlassModal
import com.ahmadtambaya.momen.ui.ModalAction
import com.ahmadtambaya.momen.ui.PrimaryButton
import com.ahmadtambaya.momen.ui.ScreenHeader
import com.ahmadtambaya.momen.ui.T
import com.ahmadtambaya.momen.ui.TimecodeInput
import com.ahmadtambaya.momen.ui.glassCard

@Composable
fun SyncScreen(nav: Nav, sessionId: String, frameRate: FrameRate) {
    var selectedMethod by remember { mutableStateOf<SyncMethod?>(null) }
    var cameraTc by remember { mutableStateOf("00:00:00:00") }
    var showParseError by remember { mutableStateOf(false) }

    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        ScreenHeader("Timecode Sync") { nav.pop() }

        // Critical warning callout
        Column(
            Modifier
                .fillMaxWidth()
                .glassCard(accent = T.Coral)
                .padding(20.dp),
        ) {
            Text(
                "CRITICAL",
                style = T.mono(10, FontWeight.SemiBold, T.CoralText, letterSpacing = 2.0))
            Spacer(Modifier.height(8.dp))
            Text(
                "Without a reliable timecode reference, exported markers will not align to footage in the NLE. Choose a sync method below.",
                style = T.sans(14, color = T.TextSecondary))
        }
        Spacer(Modifier.height(20.dp))

        MethodCard(
            letter = "A", accent = T.Coral,
            title = "Manual Offset Sync",
            subtitle = "Enter the timecode shown on your camera",
            selected = selectedMethod == SyncMethod.MANUAL,
            onSelect = { selectedMethod = SyncMethod.MANUAL },
        ) {
            Text(
                "Read the timecode from your camera's display and enter it below. The moment you tap Sync, the offset will be calculated.",
                style = T.sans(14, color = T.TextSecondary))
            Spacer(Modifier.height(16.dp))
            TimecodeInput(frameRate) { cameraTc = it }
            Spacer(Modifier.height(16.dp))
            PrimaryButton("Sync Now") {
                runCatching { Timecode.smpteToMs(cameraTc, frameRate) }
                    .onSuccess { cameraTcMs ->
                        nav.push(Route.Roll(sessionId, frameRate, cameraTc, cameraTcMs))
                    }
                    .onFailure { showParseError = true }
            }
        }

        MethodCard(
            letter = "B", accent = T.Teal,
            title = "Clap Sync",
            subtitle = "Clap in front of camera while tapping mark",
            selected = selectedMethod == SyncMethod.CLAP,
            onSelect = { selectedMethod = SyncMethod.CLAP },
        ) {
            Text(
                "When you start the session, your first marker will be labelled SYNC. Clap in front of the camera at the same moment you tap the button.",
                style = T.sans(14, color = T.TextSecondary))
            Spacer(Modifier.height(12.dp))
            Text(
                "Your editor will align the SYNC marker to the frame of the clap in your footage to synchronise all subsequent markers.",
                style = T.sans(14, color = T.TextSecondary))
            Spacer(Modifier.height(16.dp))
            PrimaryButton("Start Session", color = T.Teal) {
                nav.push(Route.ClapListen(sessionId, frameRate))
            }
        }
    }

    GlassModal(
        visible = showParseError,
        title = "Sync Error",
        message = "Failed to parse timecode. Check the values and try again.",
        accent = T.Amber,
        actions = listOf(ModalAction("OK") { showParseError = false }),
        onDismiss = { showParseError = false })
}

@Composable
private fun MethodCard(
    letter: String,
    accent: Color,
    title: String,
    subtitle: String,
    selected: Boolean,
    onSelect: () -> Unit,
    expanded: @Composable () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
            .glassCard(elevated = selected, accent = if (selected) accent else null)
            .clickable(onClick = onSelect)
            .padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(accent.copy(alpha = 0.15f))
                    .border(1.dp, accent.copy(alpha = 0.3f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(letter, style = T.mono(14, FontWeight.Bold))
            }
            Spacer(Modifier.size(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = T.sans(17, FontWeight.SemiBold))
                Text(subtitle, style = T.sans(12, color = T.TextTertiary))
            }
            Box(
                Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .border(2.dp, if (selected) accent else T.GlassBorderLight, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                if (selected) {
                    Box(
                        Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(accent))
                }
            }
        }

        if (selected) {
            Spacer(Modifier.height(16.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(T.GlassBorder))
            Spacer(Modifier.height(16.dp))
            expanded()
        }
    }
}
