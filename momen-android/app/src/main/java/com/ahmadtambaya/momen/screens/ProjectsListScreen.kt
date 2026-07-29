package com.ahmadtambaya.momen.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ahmadtambaya.momen.Nav
import com.ahmadtambaya.momen.Route
import com.ahmadtambaya.momen.data.Project
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.ui.BackgroundGlow
import com.ahmadtambaya.momen.ui.GlassModal
import com.ahmadtambaya.momen.ui.Haptics
import com.ahmadtambaya.momen.ui.ModalAction
import com.ahmadtambaya.momen.ui.Pill
import com.ahmadtambaya.momen.ui.PrimaryButton
import com.ahmadtambaya.momen.ui.T
import com.ahmadtambaya.momen.ui.glassCard
import com.ahmadtambaya.momen.ui.glassPill
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProjectsListScreen(repo: Repository, nav: Nav) {
    val context = LocalContext.current
    var projects by remember { mutableStateOf(listOf<Project>()) }
    var searchQuery by remember { mutableStateOf("") }
    var deleteTarget by remember { mutableStateOf<Project?>(null) }

    fun reload() { projects = repo.allProjects() }
    LaunchedEffect(Unit) { reload() }

    val filtered = remember(projects, searchQuery) {
        val q = searchQuery.trim().lowercase()
        if (q.isEmpty()) projects
        else projects.filter {
            it.name.lowercase().contains(q) || it.frameRate.displayName.contains(q) ||
                it.clipPrefix.lowercase().contains(q) || displayDate(it.dateMs).lowercase().contains(q)
        }
    }

    Box(Modifier.fillMaxSize()) {
        BackgroundGlow(T.Coral.copy(alpha = 0.05f), 300, Modifier.padding(top = 0.dp))

        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Column {
                    Text("MONTA", style = T.mono(17, FontWeight.SemiBold, letterSpacing = 4.0))
                    Spacer(Modifier.height(4.dp))
                    Text("Clap-synced marker logging",
                        style = T.mono(10, color = T.TextTertiary, letterSpacing = 1.0))
                }
                Spacer(Modifier.weight(1f))
                if (projects.isNotEmpty()) {
                    Text("${projects.size}",
                        style = T.mono(12, FontWeight.SemiBold, T.TextSecondary),
                        modifier = Modifier.glassPill(T.GlassBgActive, T.GlassBorderLight)
                            .padding(horizontal = 12.dp, vertical = 4.dp))
                }
            }

            if (projects.isNotEmpty()) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 20.dp)
                        .glassCard().padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("⌕", style = T.mono(15, color = T.TextTertiary))
                    Spacer(Modifier.size(8.dp))
                    BasicTextField(
                        value = searchQuery, onValueChange = { searchQuery = it },
                        textStyle = T.sans(15, color = T.TextPrimary), singleLine = true,
                        cursorBrush = SolidColor(T.CoralText), modifier = Modifier.weight(1f),
                        decorationBox = { inner ->
                            if (searchQuery.isEmpty())
                                Text("Search projects...", style = T.sans(15, color = T.TextTertiary))
                            inner()
                        })
                }
            }

            Text(
                if (searchQuery.isBlank()) "YOUR PROJECTS"
                else "${filtered.size} RESULT${if (filtered.size == 1) "" else "S"}",
                style = T.mono(10, color = T.TextTertiary, letterSpacing = 2.0),
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp))

            LazyColumn(
                Modifier.weight(1f),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (filtered.isEmpty()) {
                    item { EmptyProjects(searchQuery) }
                } else {
                    items(filtered, key = { it.id }) { project ->
                        ProjectCard(project,
                            onOpen = { nav.push(Route.ProjectDetail(project.id)) },
                            onDelete = { deleteTarget = project })
                    }
                }
            }

            Box(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                PrimaryButton("New Project  +") { nav.push(Route.CreateProject) }
            }
        }

        GlassModal(
            visible = deleteTarget != null,
            title = "Delete Project",
            message = "Delete \"${deleteTarget?.name}\" and all its clips and markers? This cannot be undone.",
            actions = listOf(
                ModalAction("Delete", ModalAction.Style.DESTRUCTIVE) {
                    deleteTarget?.let { repo.deleteProject(it.id) }
                    deleteTarget = null; reload()
                },
                ModalAction("Cancel", ModalAction.Style.CANCEL) { deleteTarget = null }),
            onDismiss = { deleteTarget = null })
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ProjectCard(project: Project, onOpen: () -> Unit, onDelete: () -> Unit) {
    val context = LocalContext.current
    Column(
        Modifier.fillMaxWidth().glassCard(elevated = true)
            .combinedClickable(onClick = onOpen, onLongClick = { Haptics.tick(context); onDelete() })
            .padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(project.name, style = T.sans(17, FontWeight.SemiBold), modifier = Modifier.weight(1f))
            Text("›", style = T.mono(18, color = T.TextTertiary))
        }
        Spacer(Modifier.height(4.dp))
        Text(displayDate(project.dateMs), style = T.mono(10, color = T.TextTertiary, letterSpacing = 1.0))
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Pill("${project.clipCount} clip${if (project.clipCount == 1) "" else "s"}")
            Pill("${project.frameRate.displayName} fps")
            if (project.hasPrefix) Pill(project.clipPrefix, T.TealText, T.TealLight, T.TealBorder)
        }
    }
}

@Composable
private fun EmptyProjects(searchQuery: String) {
    Column(
        Modifier.fillMaxWidth().padding(top = 60.dp, start = 32.dp, end = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (searchQuery.isBlank()) {
            Box(Modifier.size(80.dp).clip(CircleShape).background(T.GlassBg),
                contentAlignment = Alignment.Center) {
                Text("▦", style = T.mono(30, color = T.TextTertiary))
            }
            Spacer(Modifier.height(20.dp))
            Text("No projects yet", style = T.sans(20, FontWeight.SemiBold))
            Spacer(Modifier.height(8.dp))
            Text("Create your first project to start logging clap-synced markers on set.",
                style = T.sans(14, color = T.TextSecondary))
        } else {
            Text("No results", style = T.sans(20, FontWeight.SemiBold))
            Spacer(Modifier.height(8.dp))
            Text("No projects match \"$searchQuery\"", style = T.sans(14, color = T.TextSecondary))
        }
    }
}

private fun displayDate(ms: Long): String =
    SimpleDateFormat("d MMM yyyy", Locale.UK).format(Date(ms)).uppercase()
