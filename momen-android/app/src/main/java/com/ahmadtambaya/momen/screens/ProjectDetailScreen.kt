package com.ahmadtambaya.momen.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ahmadtambaya.momen.Nav
import com.ahmadtambaya.momen.Route
import com.ahmadtambaya.momen.data.Clip
import com.ahmadtambaya.momen.data.Project
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.ui.BackButton
import com.ahmadtambaya.momen.ui.GlassModal
import com.ahmadtambaya.momen.ui.Haptics
import com.ahmadtambaya.momen.ui.ModalAction
import com.ahmadtambaya.momen.ui.PrimaryButton
import com.ahmadtambaya.momen.ui.T
import com.ahmadtambaya.momen.ui.glassCard
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProjectDetailScreen(repo: Repository, nav: Nav, projectId: String) {
    val context = LocalContext.current
    var project by remember { mutableStateOf<Project?>(null) }
    var clips by remember { mutableStateOf(listOf<Clip>()) }
    var deleteTarget by remember { mutableStateOf<Clip?>(null) }
    var showExportModal by remember { mutableStateOf(false) }
    var showNoMarkers by remember { mutableStateOf(false) }
    // Reload whenever the nav stack returns to this screen (a clip ended, etc.).
    val stackDepth = nav.stack.size

    val projectHasMarkers = clips.any { it.markerCount > 0 }

    fun exportProject(formats: List<com.ahmadtambaya.momen.export.ExportFormat>) {
        showExportModal = false
        val proj = project ?: return
        val zip = com.ahmadtambaya.momen.export.ExportManager
            .generateProjectZip(context, repo, proj, formats)
        if (zip == null) showNoMarkers = true
        else com.ahmadtambaya.momen.export.ExportManager.share(context, listOf(zip))
    }

    LaunchedEffect(stackDepth) {
        project = repo.getProject(projectId)
        clips = repo.clipsForProject(projectId)
    }

    fun reload() {
        project = repo.getProject(projectId)
        clips = repo.clipsForProject(projectId)
    }

    val p = project

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.padding(horizontal = 20.dp)) {
                ScreenHeaderRow(
                    title = p?.name ?: "Project",
                    exportEnabled = projectHasMarkers,
                    onExport = { if (projectHasMarkers) showExportModal = true else showNoMarkers = true },
                    onBack = { nav.pop() })
            }

            if (p != null) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(displayDate(p.dateMs), style = T.mono(10, color = T.TextTertiary, letterSpacing = 1.0))
                    Text("·", style = T.mono(10, color = T.TextTertiary))
                    Text("${p.frameRate.displayName} fps", style = T.mono(10, color = T.TextTertiary))
                    if (p.hasPrefix) {
                        Text("·", style = T.mono(10, color = T.TextTertiary))
                        Text(p.clipPrefix, style = T.mono(10, color = T.TealText))
                    }
                }
            }

            Text("CLIPS", style = T.mono(10, color = T.TextTertiary, letterSpacing = 2.0),
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp).padding(top = 10.dp))

            LazyColumn(
                Modifier.weight(1f),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (clips.isEmpty()) {
                    item {
                        Text("No clips yet. Tap New Clip to record one.",
                            style = T.sans(14, color = T.TextTertiary),
                            modifier = Modifier.padding(top = 40.dp))
                    }
                } else {
                    items(clips, key = { it.id }) { clip ->
                        ClipRow(clip,
                            onOpen = { nav.push(Route.Logging(clip.id)) },
                            onDelete = { deleteTarget = clip })
                    }
                }
            }

            Box(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                PrimaryButton("New Clip  +") {
                    val proj = repo.getProject(projectId) ?: return@PrimaryButton
                    if (!proj.hasPrefix) { nav.push(Route.ClipPrefix(projectId)); return@PrimaryButton }
                    val clip = repo.addClip(projectId)
                    nav.push(Route.ClapListen(clip.id))
                }
            }
        }

        GlassModal(
            visible = deleteTarget != null,
            title = "Delete Clip",
            message = "Delete \"${deleteTarget?.name}\" and its markers? This cannot be undone.",
            actions = listOf(
                ModalAction("Delete", ModalAction.Style.DESTRUCTIVE) {
                    deleteTarget?.let { repo.deleteClip(it.id) }
                    deleteTarget = null; reload()
                },
                ModalAction("Cancel", ModalAction.Style.CANCEL) { deleteTarget = null }),
            onDismiss = { deleteTarget = null })

        GlassModal(
            visible = showExportModal,
            title = "Export Project",
            message = "Export every clip as its own file, bundled in a \"${p?.name ?: ""}\" folder. Choose a format.",
            actions = com.ahmadtambaya.momen.export.ExportFormat.entries.map { fmt ->
                ModalAction(fmt.label) { exportProject(listOf(fmt)) }
            } + listOf(
                ModalAction("All Formats") {
                    exportProject(com.ahmadtambaya.momen.export.ExportFormat.entries.toList())
                },
                ModalAction("Cancel", ModalAction.Style.CANCEL) { showExportModal = false }),
            onDismiss = { showExportModal = false })

        GlassModal(
            visible = showNoMarkers,
            title = "No Markers",
            message = "Log some markers in a clip before exporting the project.",
            accent = T.Amber,
            actions = listOf(ModalAction("OK") { showNoMarkers = false }),
            onDismiss = { showNoMarkers = false })
    }
}

@Composable
private fun ScreenHeaderRow(
    title: String, exportEnabled: Boolean, onExport: () -> Unit, onBack: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BackButton(onBack)
        Spacer(Modifier.weight(1f))
        Text(title, style = T.sans(20, FontWeight.SemiBold))
        Spacer(Modifier.weight(1f))
        Box(
            Modifier.size(40.dp).clip(CircleShape).background(T.GlassBg)
                .border(1.dp, T.GlassBorder, CircleShape).clickable(onClick = onExport),
            contentAlignment = Alignment.Center,
        ) {
            Text("⬆", style = T.mono(15, color = if (exportEnabled) T.CoralText else T.TextTertiary))
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ClipRow(clip: Clip, onOpen: () -> Unit, onDelete: () -> Unit) {
    val context = LocalContext.current
    Row(
        Modifier.fillMaxWidth()
            .glassCard(elevated = !clip.isEnded, accent = if (clip.isEnded) null else T.Teal, cornerRadius = 12)
            .combinedClickable(onClick = onOpen, onLongClick = { Haptics.tick(context); onDelete() })
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(clip.name, style = T.mono(15, FontWeight.Medium))
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (!clip.isEnded) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(6.dp).clip(CircleShape).background(T.Teal))
                        Spacer(Modifier.size(4.dp))
                        Text("ACTIVE", style = T.mono(9, FontWeight.SemiBold, T.TealText))
                    }
                }
                Text("${clip.markerCount} marker${if (clip.markerCount == 1) "" else "s"}",
                    style = T.mono(10, color = T.TextSecondary))
            }
        }
        Text("›", style = T.mono(18, color = T.TextTertiary))
    }
}

private fun displayDate(ms: Long): String =
    SimpleDateFormat("d MMM yyyy", Locale.UK).format(Date(ms)).uppercase()
