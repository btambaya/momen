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
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.screens.ClapListenScreen
import com.ahmadtambaya.momen.screens.ClipPrefixScreen
import com.ahmadtambaya.momen.screens.CreateProjectScreen
import com.ahmadtambaya.momen.screens.LoggingScreen
import com.ahmadtambaya.momen.screens.ProjectDetailScreen
import com.ahmadtambaya.momen.screens.ProjectsListScreen
import com.ahmadtambaya.momen.ui.T

/** Navigation routes. Flow: Projects → New Project → Clip prefix →
 *  Clap sync → Logging; and Project detail → New Clip → Clap → Logging. */
sealed interface Route {
    data object CreateProject : Route
    data class ClipPrefix(val projectId: String) : Route
    data class ProjectDetail(val projectId: String) : Route
    data class ClapListen(val clipId: String) : Route
    data class Logging(val clipId: String) : Route
}

class Nav {
    val stack = mutableStateListOf<Route>()

    fun push(route: Route) = stack.add(route)

    fun replace(route: Route) {
        if (stack.isEmpty()) stack.add(route) else stack[stack.lastIndex] = route
    }

    fun pop() {
        if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex)
    }

    fun popToRoot() = stack.clear()

    /** Pop back to a project's detail screen (used after CUT / leave). */
    fun popToProject(projectId: String) {
        val idx = stack.indexOfLast { it is Route.ProjectDetail && it.projectId == projectId }
        if (idx >= 0) {
            while (stack.lastIndex > idx) stack.removeAt(stack.lastIndex)
        } else {
            stack.clear()
            stack.add(Route.ProjectDetail(projectId))
        }
    }
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val nav = remember { Nav() }
            val repo = remember { Repository(applicationContext) }

            Box(
                Modifier.fillMaxSize().background(T.BgPrimary).safeDrawingPadding(),
            ) {
                BackHandler(enabled = nav.stack.isNotEmpty()) { nav.pop() }

                when (val route = nav.stack.lastOrNull()) {
                    null -> ProjectsListScreen(repo, nav)
                    is Route.CreateProject -> CreateProjectScreen(repo, nav)
                    is Route.ClipPrefix -> ClipPrefixScreen(repo, nav, route.projectId)
                    is Route.ProjectDetail -> ProjectDetailScreen(repo, nav, route.projectId)
                    is Route.ClapListen -> ClapListenScreen(repo, nav, route.clipId)
                    is Route.Logging -> LoggingScreen(repo, nav, route.clipId)
                }
            }
        }
    }
}
