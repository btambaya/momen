import SwiftUI
import SwiftData
import MomenKit

/// Home screen — all projects with search.
struct ProjectsListView: View {
    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Project.createdAt, order: .reverse) private var projects: [Project]

    @State private var searchQuery = ""
    @State private var deleteTarget: Project?
    @State private var showDeleteModal = false

    private var filtered: [Project] {
        let q = searchQuery.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return projects }
        return projects.filter { p in
            p.name.lowercased().contains(q)
                || displayDate(p.date).lowercased().contains(q)
                || p.frameRate.displayName.contains(q)
                || p.clipPrefix.lowercased().contains(q)
        }
    }

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()
            BackgroundGlow(color: Theme.coral.opacity(0.05), size: 300).offset(x: 140, y: -320)

            VStack(spacing: 0) {
                header
                if !projects.isEmpty { searchBar }

                Text(sectionLabel)
                    .font(.momenMono(10)).kerning(2)
                    .foregroundStyle(Theme.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 12)

                ScrollView {
                    LazyVStack(spacing: 12) {
                        if filtered.isEmpty {
                            emptyState
                        } else {
                            ForEach(filtered) { project in
                                projectCard(project)
                            }
                        }
                    }
                    .padding(.horizontal, 20).padding(.bottom, 120)
                }
                .scrollDismissesKeyboard(.immediately)
            }

            bottomBar
        }
        .glassModal(
            isPresented: $showDeleteModal,
            title: "Delete Project",
            message: "Delete \"\(deleteTarget?.name ?? "")\" and all its clips and markers? This cannot be undone.",
            actions: [
                GlassModalAction(text: "Delete", style: .destructive) {
                    if let target = deleteTarget {
                        modelContext.delete(target)
                        try? modelContext.save()
                    }
                    deleteTarget = nil
                    showDeleteModal = false
                },
                GlassModalAction(text: "Cancel", style: .cancel) {
                    deleteTarget = nil
                    showDeleteModal = false
                },
            ])
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("MONTA")
                    .font(.momenMono(17, weight: .semibold)).kerning(4)
                    .foregroundStyle(Theme.textPrimary)
                Text("Clap-synced marker logging")
                    .font(.momenMono(10)).kerning(1)
                    .foregroundStyle(Theme.textTertiary)
            }
            Spacer()
            if !projects.isEmpty {
                Text("\(projects.count)")
                    .font(.momenMono(12, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)
                    .glassPill(background: Theme.glassBgActive, border: Theme.glassBorderLight)
            }
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 12)
    }

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14)).foregroundStyle(Theme.textTertiary)
            TextField("", text: $searchQuery,
                prompt: Text("Search projects...").foregroundStyle(Theme.textTertiary))
                .font(.momenSans(15)).foregroundStyle(Theme.textPrimary)
                .autocorrectionDisabled().textInputAutocapitalization(.never)
            if !searchQuery.isEmpty {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { searchQuery = "" }
                } label: {
                    Image(systemName: "xmark").font(.system(size: 12))
                        .foregroundStyle(Theme.textTertiary)
                }
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .glassCard().padding(.horizontal, 20).padding(.top, 8)
    }

    private var sectionLabel: String {
        let q = searchQuery.trimmingCharacters(in: .whitespaces)
        if q.isEmpty { return "YOUR PROJECTS" }
        return "\(filtered.count) RESULT\(filtered.count == 1 ? "" : "S")"
    }

    private func projectCard(_ project: Project) -> some View {
        Button {
            router.push(.projectDetail(projectID: project.id))
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(project.name)
                        .font(.momenSans(17, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary).lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.textTertiary)
                        .frame(width: 28, height: 28)
                        .background(Theme.glassBg).clipShape(Circle())
                        .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
                }
                Text(displayDate(project.date))
                    .font(.momenMono(10)).kerning(1)
                    .foregroundStyle(Theme.textTertiary).padding(.top, 4)

                HStack(spacing: 8) {
                    let clipCount = project.clips.count
                    Text("\(clipCount) clip\(clipCount == 1 ? "" : "s")")
                        .font(.momenMono(10)).foregroundStyle(Theme.textSecondary).glassPill()
                    Text("\(project.frameRate.displayName) fps")
                        .font(.momenMono(10)).foregroundStyle(Theme.textSecondary).glassPill()
                    if project.hasPrefix {
                        Text(project.clipPrefix)
                            .font(.momenMono(10)).foregroundStyle(Theme.tealText)
                            .glassPill(background: Theme.tealLight, border: Theme.tealBorder)
                    }
                }
                .padding(.top, 16)
            }
            .padding(20).frame(maxWidth: .infinity, alignment: .leading)
            .glassCard(elevated: true)
        }
        .buttonStyle(.plain)
        .onLongPressGesture {
            Haptics.impact(.medium)
            deleteTarget = project
            showDeleteModal = true
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            if searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
                Circle().fill(Theme.glassBg).frame(width: 80, height: 80)
                    .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
                    .overlay(Image(systemName: "film.stack")
                        .font(.system(size: 30)).foregroundStyle(Theme.textTertiary))
                    .padding(.bottom, 12)
                Text("No projects yet").font(.momenSans(20, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                Text("Create your first project to start logging clap-synced markers on set.")
                    .font(.momenSans(14)).foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center).lineSpacing(4)
            } else {
                Text("No results").font(.momenSans(20, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                Text("No projects match \"\(searchQuery)\"")
                    .font(.momenSans(14)).foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(.top, 60).padding(.horizontal, 32)
    }

    private var bottomBar: some View {
        VStack {
            Spacer()
            Button {
                router.push(.createProject)
            } label: {
                HStack(spacing: 8) {
                    Text("New Project").font(.momenSans(17, weight: .semibold))
                        .foregroundStyle(.white)
                    Text("+").font(.momenMono(20)).foregroundStyle(.white.opacity(0.7))
                }
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

    private func displayDate(_ date: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "d MMM yyyy"
        return f.string(from: date).uppercased()
    }
}
