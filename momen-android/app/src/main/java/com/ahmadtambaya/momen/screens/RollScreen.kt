package com.ahmadtambaya.momen.screens

import android.os.SystemClock
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ahmadtambaya.momen.Nav
import com.ahmadtambaya.momen.Route
import com.ahmadtambaya.momen.core.SyncMethod
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.ui.BackButton
import com.ahmadtambaya.momen.ui.Pill
import com.ahmadtambaya.momen.ui.T

/**
 * "Stand by" gate between sync setup and logging. The ROLL tap is the
 * precise sync moment — the monotonic reference is captured here.
 */
@Composable
fun RollScreen(repo: Repository, nav: Nav, route: Route.Roll) {
    val haptics = LocalHapticFeedback.current

    val pulse = rememberInfiniteTransition(label = "pulse")
    val pulseProgress by pulse.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1600, easing = LinearEasing), RepeatMode.Restart),
        label = "pulseProgress")

    Box(Modifier.fillMaxSize()) {
        Box(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
            BackButton { nav.pop() }
        }

        Column(
            Modifier.align(Alignment.Center),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("STAND BY", style = T.mono(10, color = T.TextTertiary, letterSpacing = 4.0))
            Spacer(Modifier.height(32.dp))

            Box(contentAlignment = Alignment.Center) {
                // Pulsing ring
                Box(
                    Modifier
                        .size(240.dp)
                        .scale(1f + pulseProgress * 0.65f)
                        .alpha(1f - pulseProgress)
                        .border(1.5.dp, T.Coral.copy(alpha = 0.35f), CircleShape))

                Box(
                    Modifier
                        .size(220.dp)
                        .clip(CircleShape)
                        .background(T.Coral)
                        .border(1.dp, Color(0xFFFF8A6A).copy(alpha = 0.4f), CircleShape)
                        .clickable {
                            // Fire haptic immediately — this is the critical sync moment.
                            haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                            val syncUptimeMs = SystemClock.elapsedRealtime().toDouble()
                            repo.recordSync(
                                route.sessionId, SyncMethod.MANUAL,
                                route.cameraTc, route.cameraTcMs, syncUptimeMs)
                            nav.replace(Route.Logging(route.sessionId))
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "ROLL",
                        style = T.mono(30, FontWeight.Light, Color.White, letterSpacing = 10.0))
                }
            }

            Spacer(Modifier.height(32.dp))
            Text(
                "Tap the moment your\ncamera starts rolling",
                style = T.sans(14, color = T.TextTertiary),
                textAlign = TextAlign.Center)
        }

        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp),
        ) {
            Pill("${route.frameRate.displayName} fps")
        }
    }
}
