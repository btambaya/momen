package com.ahmadtambaya.momen.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.unit.dp
import com.ahmadtambaya.momen.Nav
import com.ahmadtambaya.momen.Route
import com.ahmadtambaya.momen.core.FrameRate
import com.ahmadtambaya.momen.core.MomenConstants
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.ui.FrameRatePicker
import com.ahmadtambaya.momen.ui.PrimaryButton
import com.ahmadtambaya.momen.ui.ScreenHeader
import com.ahmadtambaya.momen.ui.T
import com.ahmadtambaya.momen.ui.glassCard
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun CreateSessionScreen(repo: Repository, nav: Nav) {
    var name by remember { mutableStateOf("") }
    var frameRate by remember { mutableStateOf(FrameRate.FPS_24) }

    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
    ) {
        ScreenHeader("New Session") { nav.pop() }

        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
        ) {
            Text(
                "Set up the session details before syncing to your camera's timecode.",
                style = T.sans(14, color = T.TextSecondary))

            FieldLabel("SESSION NAME")
            Box(
                Modifier
                    .fillMaxWidth()
                    .glassCard()
                    .padding(20.dp),
            ) {
                BasicTextField(
                    value = name,
                    onValueChange = {
                        name = it.take(MomenConstants.MAX_SESSION_NAME_LENGTH)
                    },
                    textStyle = T.sans(17, color = T.TextPrimary),
                    singleLine = true,
                    cursorBrush = SolidColor(T.CoralText),
                    modifier = Modifier.fillMaxWidth(),
                    decorationBox = { inner ->
                        if (name.isEmpty()) {
                            Text(
                                "e.g. Documentary Shoot Day 1",
                                style = T.sans(17, color = T.TextTertiary))
                        }
                        inner()
                    })
            }

            FieldLabel("DATE")
            Row(
                Modifier
                    .fillMaxWidth()
                    .glassCard()
                    .padding(20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    SimpleDateFormat("EEEE d MMMM yyyy", Locale.UK).format(Date()),
                    style = T.sans(15), modifier = Modifier.weight(1f))
                Text("Today", style = T.mono(10, color = T.TealText, letterSpacing = 1.0))
            }

            FieldLabel("FRAME RATE")
            Column(
                Modifier
                    .fillMaxWidth()
                    .glassCard()
                    .padding(20.dp),
            ) {
                FrameRatePicker(frameRate) { frameRate = it }
                Spacer(Modifier.height(16.dp))
                Text(
                    "⚠ Must match your camera's recording frame rate. An incorrect setting will cause markers to land on the wrong frame in the editor.",
                    style = T.sans(12, color = T.AmberText.copy(alpha = 0.8f)))
            }
        }

        Box(Modifier.padding(vertical = 12.dp)) {
            PrimaryButton("Continue to Sync  →", enabled = name.isNotBlank()) {
                val session = repo.createSession(name.trim(), frameRate)
                nav.replace(Route.Sync(session.id, frameRate))
            }
        }
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(
        text, style = T.mono(10, color = T.TextTertiary, letterSpacing = 2.0),
        modifier = Modifier.padding(top = 24.dp, bottom = 12.dp))
}
