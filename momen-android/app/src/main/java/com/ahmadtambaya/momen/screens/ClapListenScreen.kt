package com.ahmadtambaya.momen.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.ahmadtambaya.momen.Nav
import com.ahmadtambaya.momen.Route
import com.ahmadtambaya.momen.audio.ClapDetector
import com.ahmadtambaya.momen.core.FrameRate
import com.ahmadtambaya.momen.core.MomenConstants
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.ui.BackButton
import com.ahmadtambaya.momen.ui.Haptics
import com.ahmadtambaya.momen.ui.Pill
import com.ahmadtambaya.momen.ui.T
import com.ahmadtambaya.momen.ui.glassPill
import kotlinx.coroutines.delay

/**
 * Clap sync — listens for a sharp transient, then captures the sync moment,
 * auto-creates the SYNC marker at t=0, and continues to logging.
 */
@Composable
fun ClapListenScreen(repo: Repository, nav: Nav, clipId: String) {
    val context = LocalContext.current

    var permissionState by remember {
        mutableStateOf(
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED
            ) PermissionState.GRANTED else PermissionState.PENDING)
    }
    var detected by remember { mutableStateOf(false) }
    var meterDb by remember { mutableStateOf(-60.0) }
    var frameRate by remember { mutableStateOf(FrameRate.FPS_24) }

    LaunchedEffect(Unit) { repo.getClip(clipId)?.let { frameRate = it.frameRate } }

    val currentDetected by rememberUpdatedState(detected)

    val detector = remember {
        ClapDetector(
            onLevel = { meterDb = it },
            onClap = { clapUptimeMs ->
                if (currentDetected) return@ClapDetector
                detected = true
                repo.recordClipSync(clipId, clapUptimeMs)
                // Auto-create the SYNC marker at t=0.
                repo.addMarker(
                    clipId, 0.0, "00:00:00:00",
                    MomenConstants.SYNC_NOTE, isSyncPoint = true)
            })
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        permissionState = if (granted) PermissionState.GRANTED else PermissionState.DENIED
    }

    LaunchedEffect(Unit) {
        if (permissionState == PermissionState.PENDING) {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    LaunchedEffect(permissionState) {
        if (permissionState == PermissionState.GRANTED) detector.start()
    }

    LaunchedEffect(detected) {
        if (detected) {
            Haptics.tick(context)
            detector.stop()
            delay(700)
            nav.replace(Route.Logging(clipId))
        }
    }

    DisposableEffect(Unit) {
        onDispose { detector.stop() }
    }

    val pulse = rememberInfiniteTransition(label = "pulse")
    val pulseProgress by pulse.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1600, easing = LinearEasing), RepeatMode.Restart),
        label = "pulseProgress")

    val meterFraction = ((meterDb + 60) / 60).coerceIn(0.0, 1.0).toFloat()
    val meterScale by animateFloatAsState(
        targetValue = if (detected) 1.8f else 1f + meterFraction * 0.8f, label = "meterScale")

    Box(Modifier.fillMaxSize()) {
        if (permissionState == PermissionState.DENIED) {
            Column(
                Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "MICROPHONE ACCESS DENIED",
                    style = T.mono(10, color = T.TextTertiary, letterSpacing = 4.0))
                Spacer(Modifier.height(16.dp))
                Text(
                    "Grant microphone access in Settings,\nor tap below to sync by hand.",
                    style = T.sans(14, color = T.TextTertiary), textAlign = TextAlign.Center)
                Spacer(Modifier.height(24.dp))
                Text(
                    "Sync manually", style = T.mono(12, color = T.TextSecondary),
                    modifier = Modifier
                        .glassPill()
                        .clickable { detector.triggerManually() }
                        .padding(horizontal = 24.dp, vertical = 14.dp))
                Spacer(Modifier.height(8.dp))
                Text(
                    "Go Back", style = T.mono(12, color = T.TextTertiary),
                    modifier = Modifier
                        .clickable { nav.pop() }
                        .padding(horizontal = 24.dp, vertical = 10.dp))
            }
        } else {
            if (!detected) {
                Box(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                    BackButton {
                        detector.stop()
                        nav.pop()
                    }
                }
            }

            Column(
                Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    if (detected) "CLAP DETECTED" else "LISTENING",
                    style = T.mono(10, color = T.TextTertiary, letterSpacing = 4.0))
                Spacer(Modifier.height(32.dp))

                Box(Modifier.size(240.dp), contentAlignment = Alignment.Center) {
                    if (!detected) {
                        Box(
                            Modifier
                                .size(220.dp)
                                .scale(1f + pulseProgress * 0.5f)
                                .alpha((1f - pulseProgress) * 0.3f)
                                .border(1.dp, T.Coral.copy(alpha = 0.5f), CircleShape))
                    }

                    // Reactive meter ring — scales with mic level
                    Box(
                        Modifier
                            .size(180.dp)
                            .scale(meterScale)
                            .alpha(if (detected) 1f else 0.2f + meterFraction * 0.6f)
                            .border(2.dp, if (detected) T.Teal else T.Coral, CircleShape))

                    Box(
                        Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(if (detected) T.TealLight else T.GlassBg)
                            .border(
                                1.dp,
                                if (detected) T.TealBorder else T.GlassBorder,
                                CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (detected) "✓" else "🎤",
                            style = T.mono(32, color = if (detected) T.Teal else T.TextSecondary))
                    }
                }

                Spacer(Modifier.height(32.dp))
                Text(
                    if (detected) "Sync captured — starting clip…"
                    else "Clap near the microphone",
                    style = T.sans(14, color = T.TextTertiary))

                if (!detected && permissionState == PermissionState.GRANTED) {
                    Spacer(Modifier.height(20.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .width(120.dp)
                                .height(4.dp)
                                .clip(CircleShape)
                                .background(T.GlassBg),
                        ) {
                            Box(
                                Modifier
                                    .fillMaxSize()
                                    .width((120 * meterFraction).dp)
                                    .background(T.Coral))
                        }
                        Spacer(Modifier.width(12.dp))
                        Text(
                            "${meterDb.toInt()} dB",
                            style = T.mono(10, color = T.TextTertiary))
                    }
                }
            }

            if (!detected) {
                Text(
                    "Tap to sync manually",
                    style = T.mono(12, color = T.TextSecondary),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 90.dp)
                        .glassPill()
                        .clickable { detector.triggerManually() }
                        .padding(horizontal = 24.dp, vertical = 14.dp))
            }

            Box(
                Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 24.dp),
            ) {
                Pill("${frameRate.displayName} fps")
            }
        }
    }
}

private enum class PermissionState { PENDING, GRANTED, DENIED }
