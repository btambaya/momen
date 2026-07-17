package com.ahmadtambaya.momen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.ahmadtambaya.momen.core.FrameRate
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.screens.ClapListenScreen
import com.ahmadtambaya.momen.screens.CreateSessionScreen
import com.ahmadtambaya.momen.screens.LoggingScreen
import com.ahmadtambaya.momen.screens.RollScreen
import com.ahmadtambaya.momen.screens.SessionsListScreen
import com.ahmadtambaya.momen.screens.SyncScreen
import com.ahmadtambaya.momen.ui.T

/** Navigation routes — mirrors the iOS Router / RN RootStackParamList. */
sealed interface Route {
    data object CreateSession : Route
    data class Sync(val sessionId: String, val frameRate: FrameRate) : Route
    data class Roll(
        val sessionId: String, val frameRate: FrameRate,
        val cameraTc: String, val cameraTcMs: Double,
    ) : Route
    data class ClapListen(val sessionId: String, val frameRate: FrameRate) : Route
    data class Logging(val sessionId: String) : Route
}

class Nav {
    val stack = mutableStateListOf<Route>()

    fun push(route: Route) = stack.add(route)

    /** Swap the top of the stack — equivalent of RN navigation.replace(). */
    fun replace(route: Route) {
        if (stack.isEmpty()) stack.add(route) else stack[stack.lastIndex] = route
    }

    fun pop() {
        if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex)
    }

    fun popToRoot() = stack.clear()
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val nav = remember { Nav() }
            val repo = remember { Repository(applicationContext) }

            Box(
                Modifier
                    .fillMaxSize()
                    .background(T.BgPrimary)
                    .safeDrawingPadding(),
            ) {
                // System back pops the stack; LoggingScreen registers its own
                // (inner wins) to show the leave-session confirmation.
                BackHandler(enabled = nav.stack.isNotEmpty()) { nav.pop() }

                when (val route = nav.stack.lastOrNull()) {
                    null -> SessionsListScreen(repo, nav)
                    is Route.CreateSession -> CreateSessionScreen(repo, nav)
                    is Route.Sync -> SyncScreen(nav, route.sessionId, route.frameRate)
                    is Route.Roll -> RollScreen(repo, nav, route)
                    is Route.ClapListen -> ClapListenScreen(repo, nav, route)
                    is Route.Logging -> LoggingScreen(repo, nav, route.sessionId)
                }
            }
        }
    }
}
