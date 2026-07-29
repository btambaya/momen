import SwiftUI
import SwiftData
import MomenKit

/// A project's clips. Add auto-numbered clips, open one to log or review.
struct ProjectDetailView: View {
    let projectID: String

    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext

    @State private var project: Project?
    @State private var deleteTarget: Clip?
    @State private var showDeleteModal = false
    @State private var showExportModal = false
    @State private var showNoMarkersModal = false
    @State private var shareItem: ShareItem?
    @State private var refreshToken = 0

    private var projectHasMarkers: Bool {
        project?.clips.contains { !$0.markers.isEmpty } ?? false
    }

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()
            BackgroundGlow(color: Theme.coral.opacity(0.04), size: 280).offset(x: 140, y: -320)

            if let project {
                content(project)
            } else {
                Text("Loading…").font(.momenMono(14)).foregroundStyle(Theme.textTertiary)
            }

            bottomBar
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task(id: refreshToken) { load() }
        .onChange(of: router.path) { _, _ in load() } // refresh when returning
        .glassModal(
            isPresented: $showDeleteModal,
            title: "Delete Clip",
            message: "Delete \"\(deleteTarget?.name ?? "")\" and its markers? This cannot be undone.",
            actions: [
                GlassModalAction(text: "Delete", style: .destructive) {
                    if let target = deleteTarget {
                        modelContext.delete(target)
                        try? modelContext.save()
                    }
                    deleteTarget = nil
                    showDeleteModal = false
                    refreshToken += 1
                },
                GlassModalAction(text: "Cancel", style: .cancel) {
                    deleteTarget = nil
                    showDeleteModal = false
                },
            ])
        .glassModal(
            isPresented: $showExportModal,
            title: "Export Project",
            message: "Export every clip as its own file, bundled in a \"\(project?.name ?? "")\" folder. Choose a format.",
            actions: ExportFormat.allCases.map { fmt in
                GlassModalAction(text: fmt.label) { exportProject([fmt]) }
            } + [
                GlassModalAction(text: "All Formats") { exportProject(ExportFormat.allCases) },
                GlassModalAction(text: "Cancel", style: .cancel) { showExportModal = false },
            ])
        .glassModal(
            isPresented: $showNoMarkersModal,
            title: "No Markers",
            message: "Log some markers in a clip before exporting the project.",
            accent: Theme.amber,
            actions: [GlassModalAction(text: "OK") { showNoMarkersModal = false }])
        .sheet(item: $shareItem) { item in
            ShareSheet(urls: item.urls).presentationDetents([.medium, .large])
        }
    }

    private func content(_ project: Project) -> some View {
        VStack(spacing: 0) {
            header(project)

            HStack(spacing: 8) {
                Text(displayDate(project.date)).font(.momenMono(10)).kerning(1)
                    .foregroundStyle(Theme.textTertiary)
                Text("·").foregroundStyle(Theme.textTertiary)
                Text("\(project.frameRate.displayName) fps").font(.momenMono(10))
                    .foregroundStyle(Theme.textTertiary)
                if project.hasPrefix {
                    Text("·").foregroundStyle(Theme.textTertiary)
                    Text(project.clipPrefix).font(.momenMono(10)).foregroundStyle(Theme.tealText)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)

            Text("CLIPS")
                .font(.momenMono(10)).kerning(2).foregroundStyle(Theme.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20).padding(.top, 24).padding(.bottom, 12)

            ScrollView {
                LazyVStack(spacing: 10) {
                    if project.clips.isEmpty {
                        Text("No clips yet. Tap New Clip to record one.")
                            .font(.momenSans(14)).foregroundStyle(Theme.textTertiary)
                            .padding(.top, 40)
                    } else {
                        ForEach(project.sortedClips) { clip in
                            clipRow(clip)
                        }
                    }
                }
                .padding(.horizontal, 20).padding(.bottom, 120)
            }
        }
    }

    /// Back button + title + an Export action (enabled once any clip has markers).
    private func header(_ project: Project) -> some View {
        HStack {
            Button { router.pop() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .medium)).foregroundStyle(Theme.textPrimary)
                    .frame(width: 40, height: 40).background(Theme.glassBg).clipShape(Circle())
                    .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
            }
            Spacer()
            Text(project.name).font(.momenSans(20, weight: .semibold))
                .foregroundStyle(Theme.textPrimary).lineLimit(1)
            Spacer()
            Button {
                if projectHasMarkers { showExportModal = true } else { showNoMarkersModal = true }
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(projectHasMarkers ? Theme.coralText : Theme.textTertiary)
                    .frame(width: 40, height: 40).background(Theme.glassBg).clipShape(Circle())
                    .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
            }
            .accessibilityLabel("Export project")
        }
        .padding(.horizontal, 20).padding(.top, 8).padding(.bottom, 20)
    }

    private func exportProject(_ formats: [ExportFormat]) {
        showExportModal = false
        guard let project else { return }
        do {
            let zip = try ExportService.generateProjectZip(for: project, formats: formats)
            shareItem = ShareItem(urls: [zip])
        } catch ExportService.ExportError.noMarkers {
            showNoMarkersModal = true
        } catch {
            // Zip/write failure — share sheet simply won't open.
        }
    }

    private func clipRow(_ clip: Clip) -> some View {
        Button {
            router.push(.logging(clipID: clip.id))
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(clip.name).font(.momenMono(15, weight: .medium))
                        .foregroundStyle(Theme.textPrimary)
                    HStack(spacing: 8) {
                        if !clip.isEnded {
                            HStack(spacing: 4) {
                                Circle().fill(Theme.teal).frame(width: 6, height: 6)
                                Text("ACTIVE").font(.momenMono(9, weight: .semibold))
                                    .foregroundStyle(Theme.tealText)
                            }
                        }
                        let n = clip.markers.count
                        Text("\(n) marker\(n == 1 ? "" : "s")")
                            .font(.momenMono(10)).foregroundStyle(Theme.textSecondary)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.textTertiary)
            }
            .padding(16).frame(maxWidth: .infinity, alignment: .leading)
            .glassCard(elevated: !clip.isEnded, accent: clip.isEnded ? nil : Theme.teal, cornerRadius: 12)
        }
        .buttonStyle(.plain)
        .onLongPressGesture {
            Haptics.impact(.medium)
            deleteTarget = clip
            showDeleteModal = true
        }
    }

    private var bottomBar: some View {
        VStack {
            Spacer()
            Button { newClip() } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill").font(.system(size: 18))
                    Text("New Clip").font(.momenSans(17, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity).padding(.vertical, 16)
                .background(Theme.coral)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .shadow(color: Theme.coral.opacity(0.4), radius: 24, y: 8)
            }
            .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
            .background(Theme.bgPrimary.opacity(0.85).background(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom))
            .overlay(Rectangle().fill(Theme.glassBorder).frame(height: 1), alignment: .top)
        }
    }

    private func load() {
        let descriptor = FetchDescriptor<Project>(predicate: #Predicate { $0.id == projectID })
        project = try? modelContext.fetch(descriptor).first
    }

    private func newClip() {
        guard let project else { return }
        // Prefix is set on the first clip; if somehow missing, ask for it.
        guard project.hasPrefix else {
            router.push(.clipPrefix(projectID: project.id))
            return
        }
        let clip = project.addClip()
        try? modelContext.save()
        router.push(.clapListen(clipID: clip.id))
    }

    private func displayDate(_ date: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "d MMM yyyy"
        return f.string(from: date).uppercased()
    }
}
