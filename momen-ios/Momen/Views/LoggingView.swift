import SwiftUI
import SwiftData
import UIKit
import MomenKit

/// Main marker logging interface — running timecode, MARK button, CUT,
/// marker list with note editing, and multi-format export.
struct LoggingView: View {
    let sessionID: String

    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext

    @State private var session: Session?
    @State private var syncReferenceMs: Double = 0
    @State private var isRunning = false
    @State private var frozenTimecode: String?
    @State private var latestMarkerID: String?
    @State private var flashOpacity = 0.0
    @State private var lastMarkMs: Double = 0 // double-tap guard

    // Modals
    @State private var showCutModal = false
    @State private var showLeaveConfirm = false
    @State private var showNoMarkersModal = false
    @State private var showShareModal = false
    @State private var deleteTarget: Marker?
    @State private var showDeleteModal = false
    @State private var editTarget: Marker?
    @State private var editNoteText = ""

    // Export
    @State private var exportResult: ExportService.Result?
    @State private var shareItem: ShareItem?

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            BackgroundGlow(color: Theme.coral.opacity(0.04), size: 300)
                .offset(x: 140, y: -320)
            BackgroundGlow(color: Theme.teal.opacity(0.03), size: 250)
                .offset(x: -130, y: 250)

            if let session {
                content(session)
            } else {
                Text("Loading session...")
                    .font(.momenMono(14))
                    .foregroundStyle(Theme.textTertiary)
            }

            // Coral flash on mark
            Theme.coral
                .opacity(flashOpacity)
                .ignoresSafeArea()
                .allowsHitTesting(false)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .interactiveDismissDisabled(session.map { !$0.isEnded } ?? false)
        .task { loadSession() }
        // Keep the screen awake while a session is running — the phone
        // sleeping mid-shoot would be a real on-set failure.
        .onChange(of: isRunning) { _, running in
            UIApplication.shared.isIdleTimerDisabled = running
        }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
        .sheet(item: $shareItem) { item in
            ShareSheet(urls: item.urls)
                .presentationDetents([.medium, .large])
        }
        .sheet(item: $editTarget) { marker in
            noteEditor(marker)
        }
        .glassModal(
            isPresented: $showCutModal,
            title: "Cut Session",
            message: "Cut \"\(session?.name ?? "")\" and return to the sessions list? The timecode counter will stop and the session will be marked as complete.",
            actions: [
                GlassModalAction(text: "Cut", style: .destructive) { handleConfirmCut() },
                GlassModalAction(text: "Cancel", style: .cancel) { showCutModal = false },
            ])
        .glassModal(
            isPresented: $showDeleteModal,
            title: "Delete Marker",
            message: "This marker will be permanently removed and remaining markers will be renumbered.",
            actions: [
                GlassModalAction(text: "Delete", style: .destructive) { handleConfirmDelete() },
                GlassModalAction(text: "Cancel", style: .cancel) {
                    showDeleteModal = false
                    deleteTarget = nil
                },
            ])
        .glassModal(
            isPresented: $showNoMarkersModal,
            title: "No Markers",
            message: "Log some markers before exporting.",
            accent: Theme.amber,
            actions: [GlassModalAction(text: "OK") { showNoMarkersModal = false }])
        .glassModal(
            isPresented: $showLeaveConfirm,
            title: "Leave Session?",
            message: "The session is still running. You can resume it later from the sessions list — or tap CUT to end it now.",
            accent: Theme.amber,
            actions: [
                GlassModalAction(text: "Leave") {
                    showLeaveConfirm = false
                    router.popToRoot()
                },
                GlassModalAction(text: "Stay", style: .cancel) { showLeaveConfirm = false },
            ])
        .glassModal(
            isPresented: $showShareModal,
            title: "Share Export",
            message: "Choose a format to share with your editor.",
            actions: [
                GlassModalAction(text: "All Formats  —  CSV + FCPXML + EDL") { shareAll() },
                GlassModalAction(text: "CSV  —  Universal") { share(\.csv) },
                GlassModalAction(text: "FCPXML  —  Final Cut Pro") { share(\.fcpxml) },
                GlassModalAction(text: "EDL  —  Premiere / Resolve") { share(\.edl) },
                GlassModalAction(text: "Cancel", style: .cancel) { showShareModal = false },
            ])
    }

    // ─── Layout ─────────────────────────────────────────────

    private func content(_ session: Session) -> some View {
        VStack(spacing: 0) {
            header(session)

            TimecodeDisplayView(
                syncReferenceMs: syncReferenceMs,
                cameraTcMs: session.cameraTcMs,
                fps: session.frameRate,
                syncMethod: session.syncMethod,
                isRunning: isRunning,
                frozenTimecode: frozenTimecode)

            syncInfoBar(session)

            if session.syncMethod == .clap && !session.isEnded {
                Text("⚠ Editor must align SYNC marker to clap frame")
                    .font(.momenMono(10))
                    .kerning(0.5)
                    .foregroundStyle(Theme.amberText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(Theme.amberLight)
                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .strokeBorder(Theme.amberBorder, lineWidth: 1))
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
            }

            markerList(session)

            bottomBar(session)
        }
    }

    private func header(_ session: Session) -> some View {
        HStack {
            Button {
                if session.isEnded {
                    router.pop()
                } else {
                    showLeaveConfirm = true
                }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                    .frame(width: 36, height: 36)
                    .background(Theme.glassBg)
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
            }

            Spacer()
            Text(session.name)
                .font(.momenSans(17, weight: .semibold))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)
            Spacer()

            if session.isEnded {
                Text("Ended")
                    .font(.momenMono(10))
                    .kerning(0.5)
                    .foregroundStyle(Theme.textTertiary)
                    .frame(width: 36, alignment: .trailing)
            } else {
                Color.clear.frame(width: 36, height: 36)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 4)
        .padding(.bottom, 8)
    }

    private func syncInfoBar(_ session: Session) -> some View {
        HStack(spacing: 16) {
            syncInfoItem("METHOD", session.syncMethod == .manual ? "Manual" : "Clap")
            if session.syncMethod == .manual, let syncTime = session.syncTime {
                syncInfoItem("SYNCED AT", syncTime.formatted(date: .omitted, time: .shortened))
            }
            syncInfoItem("MARKERS", "\(session.markers.count)")
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .glassCard(cornerRadius: 10)
        .padding(.horizontal, 20)
    }

    private func syncInfoItem(_ label: String, _ value: String) -> some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.momenMono(8))
                .kerning(1.5)
                .foregroundStyle(Theme.textTertiary)
            Text(value)
                .font(.momenMono(10))
                .foregroundStyle(Theme.textSecondary)
        }
    }

    private func markerList(_ session: Session) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("MARKER LOG")
                .font(.momenMono(10))
                .kerning(2)
                .foregroundStyle(Theme.textTertiary)
                .padding(.bottom, 12)

            if session.markers.isEmpty {
                VStack {
                    Spacer()
                    Text("Tap MARK to log your first marker")
                        .font(.momenSans(14))
                        .foregroundStyle(Theme.textTertiary)
                        .frame(maxWidth: 260)
                        .multilineTextAlignment(.center)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(session.sortedMarkers) { marker in
                                markerRow(marker)
                                    .id(marker.id)
                            }
                        }
                        .padding(.bottom, 20)
                    }
                    .onChange(of: latestMarkerID) { _, newValue in
                        if let newValue {
                            withAnimation { proxy.scrollTo(newValue, anchor: .bottom) }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
        .frame(maxHeight: .infinity)
    }

    private func markerRow(_ marker: Marker) -> some View {
        let isLatest = marker.id == latestMarkerID
        let isSync = marker.isSyncPoint

        return HStack(spacing: 12) {
            Text(isSync ? "SYNC" : String(format: "%02d", marker.markerNumber))
                .font(.momenMono(11, weight: .semibold))
                .foregroundStyle(isSync ? Theme.coralText : Theme.textTertiary)
                .frame(width: 40, alignment: .leading)

            Text(marker.timecodeSmpte)
                .font(.momenMono(15))
                .foregroundStyle(Theme.textPrimary)

            Spacer()

            Text(marker.note.isEmpty ? (isSync ? "Sync point" : "Add note") : marker.note)
                .font(.momenSans(12))
                .foregroundStyle(marker.note.isEmpty ? Theme.textTertiary : Theme.textSecondary)
                .lineLimit(1)
                .frame(maxWidth: 120, alignment: .trailing)

            if !isSync {
                Button {
                    deleteTarget = marker
                    showDeleteModal = true
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.textTertiary)
                        .frame(width: 28, height: 28)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .glassCard(elevated: isLatest, accent: isLatest ? Theme.coral : nil, cornerRadius: 10)
        .contentShape(Rectangle())
        .onTapGesture {
            guard !marker.isSyncPoint else { return }
            editNoteText = marker.note
            editTarget = marker
        }
    }

    private func bottomBar(_ session: Session) -> some View {
        HStack {
            sideButton("Export") { handleExport(session) }

            Spacer()

            MarkButtonView(
                markerCount: session.markers.count,
                disabled: !isRunning
            ) {
                handleMark(session)
            }

            Spacer()

            if !session.isEnded {
                Button {
                    showCutModal = true
                } label: {
                    Text("CUT")
                        .font(.momenMono(12, weight: .semibold))
                        .kerning(0.5)
                        .foregroundStyle(Theme.coralText)
                        .frame(minWidth: 80)
                        .padding(.vertical, 12)
                        .background(Theme.coralLight)
                        .clipShape(Capsule())
                        .overlay(Capsule().strokeBorder(Theme.coralBorder, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Cut session")
            } else {
                Text("CUT")
                    .font(.momenMono(12))
                    .foregroundStyle(Theme.textTertiary)
                    .frame(minWidth: 80)
                    .padding(.vertical, 12)
                    .glassPill()
                    .opacity(0.4)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .background(
            Theme.bgPrimary.opacity(0.9)
                .background(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom))
        .overlay(Rectangle().fill(Theme.glassBorder).frame(height: 1), alignment: .top)
    }

    private func sideButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.momenMono(12))
                .kerning(0.5)
                .foregroundStyle(Theme.textSecondary)
                .frame(minWidth: 80)
                .padding(.vertical, 12)
                .glassPill()
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Export markers")
    }

    private func noteEditor(_ marker: Marker) -> some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.ignoresSafeArea()
                VStack(alignment: .leading, spacing: 16) {
                    Text("Marker \(marker.markerNumber) — \(marker.timecodeSmpte)")
                        .font(.momenMono(13))
                        .foregroundStyle(Theme.textSecondary)

                    TextField(
                        "", text: $editNoteText,
                        prompt: Text("e.g. Great take, dog barked, retake needed")
                            .foregroundStyle(Theme.textTertiary),
                        axis: .vertical)
                    .font(.momenSans(16))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(3...6)
                    .padding(16)
                    .glassCard()

                    Spacer()
                }
                .padding(20)
            }
            .navigationTitle("Marker Note")
            .navigationBarTitleDisplayMode(.inline)
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
        .presentationDetents([.medium])
        .preferredColorScheme(.dark)
    }

    // ─── Actions ────────────────────────────────────────────

    private func loadSession() {
        let descriptor = FetchDescriptor<Session>(predicate: #Predicate { $0.id == sessionID })
        guard let loaded = try? modelContext.fetch(descriptor).first else { return }
        session = loaded

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

    func handleMark(_ session: Session) {
        // Double-tap guard — ignore taps within 150ms.
        let now = TimeSource.nowMs
        guard now - lastMarkMs >= 150 else { return }
        lastMarkMs = now

        let elapsed = now - syncReferenceMs
        let timecodeMs = session.syncMethod == .manual
            ? session.cameraTcMs + elapsed
            : elapsed
        let timecodeSmpte = Timecode.msToSmpte(timecodeMs, fps: session.frameRate)

        let marker = session.addMarker(timecodeMs: timecodeMs, timecodeSmpte: timecodeSmpte)
        try? modelContext.save()

        Haptics.impact(.medium)
        latestMarkerID = marker.id

        withAnimation(.easeOut(duration: 0.05)) { flashOpacity = 0.15 }
        withAnimation(.easeOut(duration: 0.3).delay(0.05)) { flashOpacity = 0 }
    }

    func handleConfirmCut() {
        showCutModal = false
        Haptics.notify(.warning)
        guard let session else { return }

        let elapsed = TimeSource.nowMs - syncReferenceMs
        let finalMs = session.syncMethod == .manual
            ? session.cameraTcMs + elapsed
            : elapsed
        session.end(finalTcMs: finalMs)
        try? modelContext.save()

        isRunning = false
        router.popToRoot()
    }

    func handleConfirmDelete() {
        showDeleteModal = false
        guard let target = deleteTarget, let session else { return }
        Haptics.impact(.medium)
        session.deleteMarker(target, context: modelContext)
        try? modelContext.save()
        deleteTarget = nil
    }

    func handleExport(_ session: Session) {
        guard !session.markers.isEmpty else {
            showNoMarkersModal = true
            return
        }
        do {
            exportResult = try ExportService.generateFiles(for: session)
            showShareModal = true
        } catch {
            // Export failures surface as an empty share modal being skipped.
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
        shareItem = ShareItem(urls: [exportResult.csv, exportResult.fcpxml, exportResult.edl])
    }
}
