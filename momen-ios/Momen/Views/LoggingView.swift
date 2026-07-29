import SwiftUI
import SwiftData
import UIKit
import MomenKit

/// Marker logging for one clip — running timecode, MARK, CUT, note editing,
/// and multi-format export.
struct LoggingView: View {
    let clipID: String

    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext

    @State private var clip: Clip?
    @State private var syncReferenceMs: Double = 0
    @State private var isRunning = false
    @State private var frozenTimecode: String?
    @State private var latestMarkerID: String?
    @State private var flashOpacity = 0.0
    @State private var lastMarkMs: Double = 0 // double-tap guard

    @State private var showCutModal = false
    @State private var showLeaveConfirm = false
    @State private var showNoMarkersModal = false
    @State private var showShareModal = false
    @State private var deleteTarget: Marker?
    @State private var showDeleteModal = false
    @State private var editTarget: Marker?
    @State private var editNoteText = ""

    @State private var exportResult: ExportService.Result?
    @State private var shareItem: ShareItem?

    private var projectID: String { clip?.project?.id ?? "" }

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()
            BackgroundGlow(color: Theme.coral.opacity(0.04), size: 300).offset(x: 140, y: -320)
            BackgroundGlow(color: Theme.teal.opacity(0.03), size: 250).offset(x: -130, y: 250)

            if let clip {
                content(clip)
            } else {
                Text("Loading clip...").font(.momenMono(14)).foregroundStyle(Theme.textTertiary)
            }

            Theme.coral.opacity(flashOpacity).ignoresSafeArea().allowsHitTesting(false)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .interactiveDismissDisabled(clip.map { !$0.isEnded } ?? false)
        .task { loadClip() }
        .onChange(of: isRunning) { _, running in
            UIApplication.shared.isIdleTimerDisabled = running
        }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
        .sheet(item: $shareItem) { item in
            ShareSheet(urls: item.urls).presentationDetents([.medium, .large])
        }
        .sheet(item: $editTarget) { marker in noteEditor(marker) }
        .glassModal(
            isPresented: $showCutModal, title: "Cut Clip",
            message: "Cut \"\(clip?.name ?? "")\" and stop the timecode? You'll return to the project to start the next clip.",
            actions: [
                GlassModalAction(text: "Cut", style: .destructive) { handleConfirmCut() },
                GlassModalAction(text: "Cancel", style: .cancel) { showCutModal = false },
            ])
        .glassModal(
            isPresented: $showDeleteModal, title: "Delete Marker",
            message: "This marker will be permanently removed and remaining markers will be renumbered.",
            actions: [
                GlassModalAction(text: "Delete", style: .destructive) { handleConfirmDelete() },
                GlassModalAction(text: "Cancel", style: .cancel) {
                    showDeleteModal = false; deleteTarget = nil
                },
            ])
        .glassModal(
            isPresented: $showNoMarkersModal, title: "No Markers",
            message: "Log some markers before exporting.", accent: Theme.amber,
            actions: [GlassModalAction(text: "OK") { showNoMarkersModal = false }])
        .glassModal(
            isPresented: $showLeaveConfirm, title: "Leave Clip?",
            message: "This clip is still running. You can resume it later from the project — or tap CUT to end it now.",
            accent: Theme.amber,
            actions: [
                GlassModalAction(text: "Leave") {
                    showLeaveConfirm = false
                    router.popTo(projectID: projectID)
                },
                GlassModalAction(text: "Stay", style: .cancel) { showLeaveConfirm = false },
            ])
        .glassModal(
            isPresented: $showShareModal, title: "Share Export",
            message: "Choose a format to share with your editor.",
            actions: [
                GlassModalAction(text: "Premiere XML  —  notes on V2") { share(\.premiereXML) },
                GlassModalAction(text: "FCPXML  —  Final Cut / Resolve") { share(\.fcpxml) },
                GlassModalAction(text: "EDL  —  Premiere / Resolve") { share(\.edl) },
                GlassModalAction(text: "CSV  —  Universal") { share(\.csv) },
                GlassModalAction(text: "All Formats") { shareAll() },
                GlassModalAction(text: "Cancel", style: .cancel) { showShareModal = false },
            ])
    }

    // ─── Layout ─────────────────────────────────────────────

    private func content(_ clip: Clip) -> some View {
        VStack(spacing: 0) {
            header(clip)

            TimecodeDisplayView(
                syncReferenceMs: syncReferenceMs, cameraTcMs: 0,
                fps: clip.frameRate, syncMethod: .clap,
                isRunning: isRunning, frozenTimecode: frozenTimecode)

            infoBar(clip)

            if !clip.isEnded {
                Text("⚠ Editor must align SYNC marker to clap frame")
                    .font(.momenMono(10)).kerning(0.5).foregroundStyle(Theme.amberText)
                    .frame(maxWidth: .infinity).padding(.vertical, 6)
                    .background(Theme.amberLight)
                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .strokeBorder(Theme.amberBorder, lineWidth: 1))
                    .padding(.horizontal, 20).padding(.top, 8)
            }

            markerList(clip)
            bottomBar(clip)
        }
    }

    private func header(_ clip: Clip) -> some View {
        HStack {
            Button {
                if clip.isEnded { router.pop() } else { showLeaveConfirm = true }
            } label: {
                Image(systemName: "chevron.left").font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.textPrimary).frame(width: 36, height: 36)
                    .background(Theme.glassBg).clipShape(Circle())
                    .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
            }
            Spacer()
            Text(clip.name).font(.momenMono(15, weight: .semibold))
                .foregroundStyle(Theme.textPrimary).lineLimit(1)
            Spacer()
            if clip.isEnded {
                Text("Ended").font(.momenMono(10)).kerning(0.5)
                    .foregroundStyle(Theme.textTertiary).frame(width: 36, alignment: .trailing)
            } else {
                Color.clear.frame(width: 36, height: 36)
            }
        }
        .padding(.horizontal, 20).padding(.top, 4).padding(.bottom, 8)
    }

    private func infoBar(_ clip: Clip) -> some View {
        HStack(spacing: 16) {
            infoItem("PROJECT", clip.project?.name ?? "—")
            infoItem("SYNC", "Clap")
            infoItem("MARKERS", "\(clip.markers.count)")
        }
        .frame(maxWidth: .infinity).padding(.vertical, 8)
        .glassCard(cornerRadius: 10).padding(.horizontal, 20)
    }

    private func infoItem(_ label: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(label).font(.momenMono(8)).kerning(1.5).foregroundStyle(Theme.textTertiary)
            Text(value).font(.momenMono(10)).foregroundStyle(Theme.textSecondary).lineLimit(1)
        }
    }

    private func markerList(_ clip: Clip) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("MARKER LOG").font(.momenMono(10)).kerning(2)
                .foregroundStyle(Theme.textTertiary).padding(.bottom, 12)

            if clip.markers.isEmpty {
                VStack {
                    Spacer()
                    Text("Tap MARK to log your first marker")
                        .font(.momenSans(14)).foregroundStyle(Theme.textTertiary)
                        .frame(maxWidth: 260).multilineTextAlignment(.center)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(clip.sortedMarkers) { marker in
                                markerRow(marker).id(marker.id)
                            }
                        }
                        .padding(.bottom, 20)
                    }
                    .onChange(of: latestMarkerID) { _, v in
                        if let v { withAnimation { proxy.scrollTo(v, anchor: .bottom) } }
                    }
                }
            }
        }
        .padding(.horizontal, 20).padding(.top, 16).frame(maxHeight: .infinity)
    }

    private func markerRow(_ marker: Marker) -> some View {
        let isLatest = marker.id == latestMarkerID
        let isSync = marker.isSyncPoint
        return HStack(spacing: 12) {
            Text(isSync ? "SYNC" : String(format: "%02d", marker.markerNumber))
                .font(.momenMono(11, weight: .semibold))
                .foregroundStyle(isSync ? Theme.coralText : Theme.textTertiary)
                .frame(width: 40, alignment: .leading)
            Text(marker.timecodeSmpte).font(.momenMono(15)).foregroundStyle(Theme.textPrimary)
            Spacer()
            Text(marker.note.isEmpty ? (isSync ? "Sync point" : "Add note") : marker.note)
                .font(.momenSans(12))
                .foregroundStyle(marker.note.isEmpty ? Theme.textTertiary : Theme.textSecondary)
                .lineLimit(1).frame(maxWidth: 120, alignment: .trailing)
            if !isSync {
                Button {
                    deleteTarget = marker; showDeleteModal = true
                } label: {
                    Image(systemName: "trash").font(.system(size: 12))
                        .foregroundStyle(Theme.textTertiary).frame(width: 28, height: 28)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .glassCard(elevated: isLatest, accent: isLatest ? Theme.coral : nil, cornerRadius: 10)
        .contentShape(Rectangle())
        .onTapGesture {
            guard !marker.isSyncPoint else { return }
            editNoteText = marker.note
            editTarget = marker
        }
    }

    private func bottomBar(_ clip: Clip) -> some View {
        HStack {
            sideButton("Export") { handleExport(clip) }
            Spacer()
            MarkButtonView(markerCount: clip.markers.count, disabled: !isRunning) {
                handleMark(clip)
            }
            Spacer()
            if !clip.isEnded {
                Button { showCutModal = true } label: {
                    Text("CUT").font(.momenMono(12, weight: .semibold)).kerning(0.5)
                        .foregroundStyle(Theme.coralText).frame(minWidth: 80).padding(.vertical, 12)
                        .background(Theme.coralLight).clipShape(Capsule())
                        .overlay(Capsule().strokeBorder(Theme.coralBorder, lineWidth: 1))
                }
                .buttonStyle(.plain).accessibilityLabel("Cut clip")
            } else {
                Text("CUT").font(.momenMono(12)).foregroundStyle(Theme.textTertiary)
                    .frame(minWidth: 80).padding(.vertical, 12).glassPill().opacity(0.4)
            }
        }
        .padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 8)
        .background(Theme.bgPrimary.opacity(0.9).background(.ultraThinMaterial)
            .ignoresSafeArea(edges: .bottom))
        .overlay(Rectangle().fill(Theme.glassBorder).frame(height: 1), alignment: .top)
    }

    private func sideButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.momenMono(12)).kerning(0.5).foregroundStyle(Theme.textSecondary)
                .frame(minWidth: 80).padding(.vertical, 12).glassPill()
        }
        .buttonStyle(.plain).accessibilityLabel("Export markers")
    }

    private func noteEditor(_ marker: Marker) -> some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.ignoresSafeArea()
                VStack(alignment: .leading, spacing: 16) {
                    Text("Marker \(marker.markerNumber) — \(marker.timecodeSmpte)")
                        .font(.momenMono(13)).foregroundStyle(Theme.textSecondary)
                    TextField("", text: $editNoteText,
                        prompt: Text("Speak or type — lands in the editor's Description")
                            .foregroundStyle(Theme.textTertiary), axis: .vertical)
                        .font(.momenSans(16)).foregroundStyle(Theme.textPrimary)
                        .lineLimit(3...6).padding(16).glassCard()
                    Spacer()
                }
                .padding(20)
            }
            .navigationTitle("Marker Note").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { editTarget = nil }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        marker.note = editNoteText
                        try? modelContext.save()
                        editTarget = nil
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium]).preferredColorScheme(.dark)
    }

    // ─── Actions ────────────────────────────────────────────

    private func loadClip() {
        let descriptor = FetchDescriptor<Clip>(predicate: #Predicate { $0.id == clipID })
        guard let loaded = try? modelContext.fetch(descriptor).first else { return }
        clip = loaded
        if loaded.isEnded {
            isRunning = false
            if loaded.finalTcMs > 0 {
                frozenTimecode = Timecode.msToSmpte(loaded.finalTcMs, fps: loaded.frameRate)
            }
        } else if let reference = loaded.syncReferenceMs {
            syncReferenceMs = reference
            isRunning = true
        }
    }

    func handleMark(_ clip: Clip) {
        let now = TimeSource.nowMs
        guard now - lastMarkMs >= 150 else { return } // double-tap guard
        lastMarkMs = now

        let elapsed = now - syncReferenceMs
        let smpte = Timecode.msToSmpte(elapsed, fps: clip.frameRate)
        let marker = clip.addMarker(timecodeMs: elapsed, timecodeSmpte: smpte)
        try? modelContext.save()

        Haptics.mark()
        latestMarkerID = marker.id
        withAnimation(.easeOut(duration: 0.05)) { flashOpacity = 0.15 }
        withAnimation(.easeOut(duration: 0.3).delay(0.05)) { flashOpacity = 0 }
    }

    func handleConfirmCut() {
        showCutModal = false
        Haptics.notify(.warning)
        guard let clip else { return }
        let elapsed = TimeSource.nowMs - syncReferenceMs
        clip.end(finalTcMs: elapsed)
        try? modelContext.save()
        isRunning = false
        router.popTo(projectID: projectID) // land on the project to start the next clip
    }

    func handleConfirmDelete() {
        showDeleteModal = false
        guard let target = deleteTarget, let clip else { return }
        Haptics.impact(.medium)
        clip.deleteMarker(target, context: modelContext)
        try? modelContext.save()
        deleteTarget = nil
    }

    func handleExport(_ clip: Clip) {
        guard !clip.markers.isEmpty else { showNoMarkersModal = true; return }
        do {
            exportResult = try ExportService.generateFiles(for: clip)
            showShareModal = true
        } catch {
            // Export failure surfaces as the share modal simply not opening.
        }
    }

    func share(_ keyPath: KeyPath<ExportService.Result, URL>) {
        showShareModal = false
        guard let exportResult else { return }
        shareItem = ShareItem(urls: [exportResult[keyPath: keyPath]])
    }

    func shareAll() {
        showShareModal = false
        guard let exportResult else { return }
        shareItem = ShareItem(urls: exportResult.all)
    }
}
