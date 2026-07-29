package com.ahmadtambaya.momen.export

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.ahmadtambaya.momen.core.CsvExporter
import com.ahmadtambaya.momen.core.EdlExporter
import com.ahmadtambaya.momen.core.ExportMarker
import com.ahmadtambaya.momen.core.ExportSessionInfo
import com.ahmadtambaya.momen.core.FcpxmlExporter
import com.ahmadtambaya.momen.core.PremiereXmlExporter
import com.ahmadtambaya.momen.data.Clip
import com.ahmadtambaya.momen.data.Project
import com.ahmadtambaya.momen.data.Marker
import com.ahmadtambaya.momen.data.Repository
import java.io.File
import java.util.Calendar
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/** A single export format — shared by the per-clip share and the project zip. */
enum class ExportFormat(val label: String) {
    PREMIERE_XML("Premiere XML  —  notes on V2"),
    FCPXML("FCPXML  —  Final Cut / Resolve"),
    EDL("EDL  —  Premiere / Resolve"),
    CSV("CSV  —  Universal");

    fun fileName(clipName: String) = when (this) {
        PREMIERE_XML -> "${clipName}_premiere.xml"
        FCPXML -> "$clipName.fcpxml"
        EDL -> "$clipName.edl"
        CSV -> "$clipName.csv"
    }

    fun content(info: ExportSessionInfo, markers: List<ExportMarker>) = when (this) {
        PREMIERE_XML -> PremiereXmlExporter.generate(info, markers)
        FCPXML -> FcpxmlExporter.generate(info, markers)
        EDL -> EdlExporter.generate(info, markers)
        CSV -> CsvExporter.generate(markers, info.frameRate)
    }
}

object ExportManager {

    // ─── Per-clip export (Logging screen) ───────────────────

    data class Result(val premiereXml: File, val fcpxml: File, val edl: File, val csv: File) {
        val all: List<File> get() = listOf(premiereXml, fcpxml, edl, csv)
    }

    fun generateFiles(context: Context, clip: Clip, project: Project, markers: List<Marker>): Result {
        val info = infoFor(clip, project)
        val exportMarkers = markers.map { it.toExport() }

        val dir = File(context.cacheDir, "monta_exports")
        dir.deleteRecursively(); dir.mkdirs()

        val base = info.exportBaseName
        val premiere = File(dir, "${base}_premiere.xml")
        val fcpxml = File(dir, "$base.fcpxml")
        val edl = File(dir, "$base.edl")
        val csv = File(dir, "$base.csv")

        premiere.writeText(PremiereXmlExporter.generate(info, exportMarkers))
        fcpxml.writeText(FcpxmlExporter.generate(info, exportMarkers))
        edl.writeText(EdlExporter.generate(info, exportMarkers))
        csv.writeText(CsvExporter.generate(exportMarkers, info.frameRate))

        return Result(premiere, fcpxml, edl, csv)
    }

    // ─── Whole-project export (Project screen) ──────────────

    /** Zip every clip's export file(s) into a folder named after the project.
     *  Clips with no markers are skipped. Returns null if the project has no
     *  markers at all. */
    fun generateProjectZip(
        context: Context, repo: Repository, project: Project, formats: List<ExportFormat>,
    ): File? {
        val safeProject = sanitize(project.name)
        val dir = File(context.cacheDir, "monta_project_export")
        dir.deleteRecursively(); dir.mkdirs()
        val zipFile = File(dir, "$safeProject.zip")

        var wroteAny = false
        ZipOutputStream(zipFile.outputStream().buffered()).use { zos ->
            for (clip in repo.clipsForProject(project.id)) {
                val markers = repo.markers(clip.id)
                if (markers.isEmpty()) continue
                val info = infoFor(clip, project)
                val exportMarkers = markers.map { it.toExport() }
                val clipName = sanitize(clip.name)
                for (fmt in formats) {
                    zos.putNextEntry(ZipEntry("$safeProject/${fmt.fileName(clipName)}"))
                    zos.write(fmt.content(info, exportMarkers).toByteArray(Charsets.UTF_8))
                    zos.closeEntry()
                }
                wroteAny = true
            }
        }
        if (!wroteAny) { zipFile.delete(); return null }
        return zipFile
    }

    fun share(context: Context, files: List<File>) {
        val uris = files.map {
            FileProvider.getUriForFile(context, "com.ahmadtambaya.momen.fileprovider", it)
        }
        val intent = if (uris.size == 1) {
            Intent(Intent.ACTION_SEND).apply { type = "*/*"; putExtra(Intent.EXTRA_STREAM, uris.single()) }
        } else {
            Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                type = "*/*"; putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
            }
        }
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(Intent.createChooser(intent, "Share markers"))
    }

    // ─── Helpers ────────────────────────────────────────────

    private fun infoFor(clip: Clip, project: Project): ExportSessionInfo {
        val cal = Calendar.getInstance().apply { timeInMillis = project.dateMs }
        return ExportSessionInfo(
            name = clip.name,
            year = cal.get(Calendar.YEAR),
            month = cal.get(Calendar.MONTH) + 1,
            day = cal.get(Calendar.DAY_OF_MONTH),
            frameRate = clip.frameRate)
    }

    private fun Marker.toExport() =
        ExportMarker(markerNumber, timecodeMs, timecodeSmpte, note, isSyncPoint)

    private fun sanitize(name: String): String {
        val s = name.map { ch ->
            if (ch.isLetterOrDigit() && ch.code < 128 || ch == '_' || ch == '-') ch else '_'
        }.joinToString("").trim('_')
        return s.ifEmpty { "Project" }
    }
}
