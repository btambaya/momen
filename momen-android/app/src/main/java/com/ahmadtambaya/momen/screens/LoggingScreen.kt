package com.ahmadtambaya.momen.screens

import android.os.SystemClock
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.ahmadtambaya.momen.Nav
import com.ahmadtambaya.momen.core.SyncMethod
import com.ahmadtambaya.momen.core.Timecode
import com.ahmadtambaya.momen.data.Clip
import com.ahmadtambaya.momen.data.Marker
import com.ahmadtambaya.momen.data.Project
import com.ahmadtambaya.momen.data.Repository
import com.ahmadtambaya.momen.export.ExportManager
import com.ahmadtambaya.momen.ui.GlassModal
import com.ahmadtambaya.momen.ui.Haptics
import com.ahmadtambaya.momen.ui.MarkButton
import com.ahmadtambaya.momen.ui.ModalAction
import com.ahmadtambaya.momen.ui.T
import com.ahmadtambaya.momen.ui.TimecodeDisplay
import com.ahmadtambaya.momen.ui.glassCard
import com.ahmadtambaya.momen.ui.glassPill

@Composable
fun LoggingScreen(repo: Repository, nav: Nav, clipId: String) {
    val context = LocalContext.current
    val view = LocalView.current

    var clip by remember { mutableStateOf<Clip?>(null) }
    var project by remember { mutableStateOf<Project?>(null) }
    var markers by remember { mutableStateOf(listOf<Marker>()) }
    var syncReferenceMs by remember { mutableStateOf(0.0) }
    var isRunning by remember { mutableStateOf(false) }
    var frozenTimecode by remember { mutableStateOf<String?>(null) }
    var lastMarkMs by remember { mutableStateOf(0L) }

    var showCutModal by remember { mutableStateOf(false) }
    var showLeaveConfirm by remember { mutableStateOf(false) }
    var showNoMarkers by remember { mutableStateOf(false) }
    var showShareModal by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<Marker?>(null) }
    var editTarget by remember { mutableStateOf<Marker?>(null) }
    var exportResult by remember { mutableStateOf<ExportManager.Result?>(null) }

    val listState = rememberLazyListState()

    LaunchedEffect(Unit) {
        val loaded = repo.getClip(clipId) ?: return@LaunchedEffect
        clip = loaded
        project = repo.getProject(loaded.projectId)
        markers = repo.markers(clipId)
        if (loaded.isEnded) {
            isRunning = false
            if (loaded.finalTcMs > 0)
                frozenTimecode = Timecode.msToSmpte(loaded.finalTcMs, loaded.frameRate)
        } else {
            loaded.syncReferenceMs()?.let { syncReferenceMs = it; isRunning = true }
        }
    }

    LaunchedEffect(isRunning) { view.keepScreenOn = isRunning }

    val current = clip
    if (current == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Loading clip...", style = T.mono(14, color = T.TextTertiary))
        }
        return
    }
    val projectId = current.projectId

    BackHandler(enabled = !current.isEnded) { showLeaveConfirm = true }

    LaunchedEffect(markers.size) {
        if (markers.isNotEmpty()) listState.animateScrollToItem(markers.size - 1)
    }

    fun handleMark() {
        val now = SystemClock.elapsedRealtime()
        if (now - lastMarkMs < 150) return
        lastMarkMs = now
        val elapsed = now - syncReferenceMs
        repo.addMarker(clipId, elapsed, Timecode.msToSmpte(elapsed, current.frameRate))
        markers = repo.markers(clipId)
        Haptics.mark(context)
    }

    Column(Modifier.fillMaxSize()) {
        // Header
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(36.dp).clip(CircleShape).background(T.GlassBg)
                    .border(1.dp, T.GlassBorder, CircleShape)
                    .clickable { if (current.isEnded) nav.pop() else showLeaveConfirm = true },
                contentAlignment = Alignment.Center,
            ) { Text("‹", style = T.mono(20, color = T.TextPrimary)) }
            Text(current.name, style = T.mono(15, FontWeight.SemiBold),
                textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f))
            if (current.isEnded) {
                Text("Ended", style = T.mono(10, color = T.TextTertiary))
            } else {
                Spacer(Modifier.size(36.dp))
            }
        }

        TimecodeDisplay(
            syncReferenceMs = syncReferenceMs, cameraTcMs = 0.0,
            fps = current.frameRate, syncMethod = SyncMethod.CLAP,
            isRunning = isRunning, frozenTimecode = frozenTimecode)

        Spacer(Modifier.height(12.dp))

        Row(
            Modifier.padding(horizontal = 20.dp).fillMaxWidth()
                .glassCard(cornerRadius = 10).padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            SyncInfo("PROJECT", project?.name ?: "—")
            Spacer(Modifier.width(24.dp))
            SyncInfo("SYNC", "Clap")
            Spacer(Modifier.width(24.dp))
            SyncInfo("MARKERS", "${markers.size}")
        }

        if (!current.isEnded) {
            Text("⚠ Editor must align SYNC marker to clap frame",
                style = T.mono(10, color = T.AmberText), textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 20.dp).padding(top = 8.dp).fillMaxWidth()
                    .clip(RoundedCornerShape(6.dp)).background(T.AmberLight)
                    .border(1.dp, T.AmberBorder, RoundedCornerShape(6.dp)).padding(vertical = 6.dp))
        }

        Text("MARKER LOG", style = T.mono(10, color = T.TextTertiary, letterSpacing = 2.0),
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp))

        if (markers.isEmpty()) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text("Tap MARK to log your first marker", style = T.sans(14, color = T.TextTertiary))
            }
        } else {
            LazyColumn(
                Modifier.weight(1f), state = listState,
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(markers, key = { it.id }) { marker ->
                    MarkerRow(marker,
                        isLatest = marker.id == markers.lastOrNull()?.id && !marker.isSyncPoint,
                        onEdit = { if (!marker.isSyncPoint) editTarget = marker },
                        onDelete = { deleteTarget = marker })
                }
            }
        }

        // Bottom bar
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Export", style = T.mono(12, color = T.TextSecondary),
                modifier = Modifier.glassPill().clickable {
                    if (markers.isEmpty()) { showNoMarkers = true } else {
                        val proj = project
                        if (proj != null) runCatching {
                            ExportManager.generateFiles(context, current, proj, markers)
                        }.onSuccess { exportResult = it; showShareModal = true }
                    }
                }.padding(horizontal = 20.dp, vertical = 12.dp))

            Spacer(Modifier.weight(1f))
            MarkButton(markerCount = markers.size, disabled = !isRunning) { handleMark() }
            Spacer(Modifier.weight(1f))

            if (!current.isEnded) {
                Text("CUT", style = T.mono(12, FontWeight.SemiBold, T.CoralText),
                    modifier = Modifier.glassPill(T.CoralLight, T.CoralBorder)
                        .clickable { showCutModal = true }.padding(horizontal = 24.dp, vertical = 12.dp))
            } else {
                Text("CUT", style = T.mono(12, color = T.TextTertiary),
                    modifier = Modifier.glassPill().padding(horizontal = 24.dp, vertical = 12.dp))
            }
        }
    }

    // ─── Modals ─────────────────────────────────────────────

    GlassModal(
        visible = showCutModal, title = "Cut Clip",
        message = "Cut \"${current.name}\" and stop the timecode? You'll return to the project to start the next clip.",
        actions = listOf(
            ModalAction("Cut", ModalAction.Style.DESTRUCTIVE) {
                showCutModal = false
                val elapsed = SystemClock.elapsedRealtime() - syncReferenceMs
                repo.endClip(clipId, elapsed)
                isRunning = false
                Haptics.tick(context)
                nav.popToProject(projectId)
            },
            ModalAction("Cancel", ModalAction.Style.CANCEL) { showCutModal = false }),
        onDismiss = { showCutModal = false })

    GlassModal(
        visible = deleteTarget != null, title = "Delete Marker",
        message = "This marker will be permanently removed and remaining markers will be renumbered.",
        actions = listOf(
            ModalAction("Delete", ModalAction.Style.DESTRUCTIVE) {
                deleteTarget?.let { repo.deleteMarker(it.id) }
                deleteTarget = null; markers = repo.markers(clipId); Haptics.tick(context)
            },
            ModalAction("Cancel", ModalAction.Style.CANCEL) { deleteTarget = null }),
        onDismiss = { deleteTarget = null })

    GlassModal(
        visible = showNoMarkers, title = "No Markers",
        message = "Log some markers before exporting.", accent = T.Amber,
        actions = listOf(ModalAction("OK") { showNoMarkers = false }),
        onDismiss = { showNoMarkers = false })

    GlassModal(
        visible = showLeaveConfirm, title = "Leave Clip?",
        message = "This clip is still running. You can resume it later from the project — or tap CUT to end it now.",
        accent = T.Amber,
        actions = listOf(
            ModalAction("Leave") { showLeaveConfirm = false; nav.popToProject(projectId) },
            ModalAction("Stay", ModalAction.Style.CANCEL) { showLeaveConfirm = false }),
        onDismiss = { showLeaveConfirm = false })

    GlassModal(
        visible = showShareModal, title = "Share Export",
        message = "Choose a format to share with your editor.",
        actions = listOf(
            ModalAction("Premiere XML  —  notes on V2") {
                showShareModal = false
                exportResult?.let { ExportManager.share(context, listOf(it.premiereXml)) }
            },
            ModalAction("FCPXML  —  Final Cut / Resolve") {
                showShareModal = false
                exportResult?.let { ExportManager.share(context, listOf(it.fcpxml)) }
            },
            ModalAction("EDL  —  Premiere / Resolve") {
                showShareModal = false
                exportResult?.let { ExportManager.share(context, listOf(it.edl)) }
            },
            ModalAction("CSV  —  Universal") {
                showShareModal = false
                exportResult?.let { ExportManager.share(context, listOf(it.csv)) }
            },
            ModalAction("All Formats") {
                showShareModal = false
                exportResult?.let { ExportManager.share(context, it.all) }
            },
            ModalAction("Cancel", ModalAction.Style.CANCEL) { showShareModal = false }),
        onDismiss = { showShareModal = false })

    editTarget?.let { marker ->
        NoteEditorDialog(marker,
            onSave = { note ->
                repo.updateMarkerNote(marker.id, note)
                markers = repo.markers(clipId); editTarget = null
            },
            onCancel = { editTarget = null })
    }
}

@Composable
private fun SyncInfo(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = T.mono(8, color = T.TextTertiary, letterSpacing = 1.5))
        Spacer(Modifier.height(2.dp))
        Text(value, style = T.mono(10, color = T.TextSecondary), maxLines = 1)
    }
}

@Composable
private fun MarkerRow(marker: Marker, isLatest: Boolean, onEdit: () -> Unit, onDelete: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .glassCard(elevated = isLatest, accent = if (isLatest) T.Coral else null, cornerRadius = 10)
            .clickable(onClick = onEdit).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            if (marker.isSyncPoint) "SYNC" else "%02d".format(java.util.Locale.ROOT, marker.markerNumber),
            style = T.mono(11, FontWeight.SemiBold, if (marker.isSyncPoint) T.CoralText else T.TextTertiary),
            modifier = Modifier.width(40.dp))
        Text(marker.timecodeSmpte, style = T.mono(15))
        Spacer(Modifier.weight(1f))
        Text(
            marker.note.ifEmpty { if (marker.isSyncPoint) "Sync point" else "Add note" },
            style = T.sans(12, color = if (marker.note.isEmpty()) T.TextTertiary else T.TextSecondary),
            maxLines = 1, overflow = TextOverflow.Ellipsis,
            modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
        if (!marker.isSyncPoint) {
            Spacer(Modifier.width(10.dp))
            Text("✕", style = T.mono(12, color = T.TextTertiary),
                modifier = Modifier.clip(CircleShape).clickable(onClick = onDelete).padding(8.dp))
        }
    }
}

@Composable
private fun NoteEditorDialog(marker: Marker, onSave: (String) -> Unit, onCancel: () -> Unit) {
    var text by remember { mutableStateOf(marker.note) }
    Dialog(onDismissRequest = onCancel) {
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(T.BgTertiary)
                .border(1.dp, T.GlassBorderLight, RoundedCornerShape(20.dp)).padding(20.dp),
        ) {
            Text("Marker ${marker.markerNumber} — ${marker.timecodeSmpte}",
                style = T.mono(13, color = T.TextSecondary))
            Spacer(Modifier.height(16.dp))
            Box(Modifier.fillMaxWidth().glassCard(cornerRadius = 12).padding(16.dp)) {
                BasicTextField(
                    value = text, onValueChange = { text = it },
                    textStyle = T.sans(16, color = T.TextPrimary), cursorBrush = SolidColor(T.CoralText),
                    modifier = Modifier.fillMaxWidth(),
                    decorationBox = { inner ->
                        if (text.isEmpty())
                            Text("Speak or type — lands in the editor's Description",
                                style = T.sans(16, color = T.TextTertiary))
                        inner()
                    })
            }
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                Text("Cancel", style = T.sans(15, color = T.TextSecondary),
                    modifier = Modifier.clickable(onClick = onCancel).padding(12.dp))
                Text("Save", style = T.sans(15, FontWeight.SemiBold, T.CoralText),
                    modifier = Modifier.clickable { onSave(text) }.padding(12.dp))
            }
        }
    }
}
