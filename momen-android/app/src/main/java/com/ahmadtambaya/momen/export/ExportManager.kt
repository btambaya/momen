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
import com.ahmadtambaya.momen.data.Marker
import com.ahmadtambaya.momen.data.Project
import java.io.File
import java.util.Calendar

/** Generates the four export formats per clip into the cache dir and shares them. */
object ExportManager {

    data class Result(val premiereXml: File, val fcpxml: File, val edl: File, val csv: File) {
        val all: List<File> get() = listOf(premiereXml, fcpxml, edl, csv)
    }

    fun generateFiles(context: Context, clip: Clip, project: Project, markers: List<Marker>): Result {
        val cal = Calendar.getInstance().apply { timeInMillis = project.dateMs }
        val info = ExportSessionInfo(
            name = clip.name,
            year = cal.get(Calendar.YEAR),
            month = cal.get(Calendar.MONTH) + 1,
            day = cal.get(Calendar.DAY_OF_MONTH),
            frameRate = clip.frameRate)
        val exportMarkers = markers.map {
            ExportMarker(it.markerNumber, it.timecodeMs, it.timecodeSmpte, it.note, it.isSyncPoint)
        }

        val dir = File(context.cacheDir, "monta_exports")
        dir.deleteRecursively()
        dir.mkdirs()

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

    fun share(context: Context, files: List<File>) {
        val uris = files.map {
            FileProvider.getUriForFile(context, "com.ahmadtambaya.momen.fileprovider", it)
        }
        val intent = if (uris.size == 1) {
            Intent(Intent.ACTION_SEND).apply {
                type = "*/*"; putExtra(Intent.EXTRA_STREAM, uris.single())
            }
        } else {
            Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                type = "*/*"; putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
            }
        }
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(Intent.createChooser(intent, "Share markers"))
    }
}
