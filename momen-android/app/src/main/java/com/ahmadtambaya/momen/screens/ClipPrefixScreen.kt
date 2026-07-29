package com.ahmadtambaya.momen.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.capitalize
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import com.ahmadtambaya.momen.Nav
import com.ahmadtambaya.momen.Route
import com.ahmadtambaya.momen.core.ClipNaming
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.ui.PrimaryButton
import com.ahmadtambaya.momen.ui.ScreenHeader
import com.ahmadtambaya.momen.ui.T
import com.ahmadtambaya.momen.ui.glassCard

/** Set the clip prefix once; clips auto-number from it. Creates the first
 *  clip and moves straight to clap sync. */
@Composable
fun ClipPrefixScreen(repo: Repository, nav: Nav, projectId: String) {
    var prefix by remember { mutableStateOf("") }
    val normalized = ClipNaming.normalizePrefix(prefix)
    val canContinue = prefix.isNotBlank()

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        ScreenHeader("Clip Name") { nav.pop() }

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Text("Set the clip prefix for this project. Every clip you record will be named from it automatically and numbered in sequence.",
                style = T.sans(14, color = T.TextSecondary))

            Text("CLIP PREFIX", style = T.mono(10, color = T.TextTertiary, letterSpacing = 2.0),
                modifier = Modifier.padding(top = 24.dp, bottom = 12.dp))
            Box(Modifier.fillMaxWidth().glassCard().padding(20.dp)) {
                BasicTextField(
                    value = prefix,
                    onValueChange = { prefix = it.take(24) },
                    textStyle = T.mono(20, androidx.compose.ui.text.font.FontWeight.Medium, T.TextPrimary),
                    singleLine = true, cursorBrush = SolidColor(T.CoralText),
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                    modifier = Modifier.fillMaxWidth(),
                    decorationBox = { inner ->
                        if (prefix.isEmpty())
                            Text("e.g. MONTACLIP", style = T.mono(20, color = T.TextTertiary))
                        inner()
                    })
            }

            Text("PREVIEW", style = T.mono(10, color = T.TextTertiary, letterSpacing = 2.0),
                modifier = Modifier.padding(top = 24.dp, bottom = 12.dp))
            Column(Modifier.fillMaxWidth().glassCard().padding(20.dp)) {
                (1..3).forEach { n ->
                    Text(ClipNaming.name(normalized, n),
                        style = T.mono(15, color = if (n == 1) T.CoralText else T.TextTertiary))
                    if (n < 3) Spacer(Modifier.height(8.dp))
                }
            }
        }

        Box(Modifier.padding(vertical = 12.dp)) {
            PrimaryButton("Start Clip  →", enabled = canContinue) {
                repo.setClipPrefix(projectId, normalized)
                val clip = repo.addClip(projectId)
                nav.replace(Route.ClapListen(clip.id))
            }
        }
    }
}
