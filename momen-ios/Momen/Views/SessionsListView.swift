import SwiftUI
import SwiftData
import MomenKit

/// Home screen — all sessions with search, active ones floated to the top.
struct SessionsListView: View {
    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Session.createdAt, order: .reverse) private var sessions: [Session]

    @State private var searchQuery = ""
    @State private var deleteTarget: Session?
    @State private var showDeleteModal = false

    private var sortedSessions: [Session] {
        // Active sessions float to the top so users can resume without
        // being force-navigated; created_at DESC otherwise (stable sort).
        sessions.sorted { a, b in
            if a.isEnded != b.isEnded { return !a.isEnded }
            return a.createdAt > b.createdAt
        }
    }

    private var filteredSessions: [Session] {
        let q = searchQuery.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return sortedSessions }
        return sortedSessions.filter { s in
            s.name.lowercased().contains(q)
                || displayDate(s).lowercased().contains(q)
                || s.syncMethod.rawValue.contains(q)
                || s.frameRate.displayName.contains(q)
        }
    }

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()

            BackgroundGlow(color: Theme.coral.opacity(0.05), size: 300)
                .offset(x: 140, y: -320)

            VStack(spacing: 0) {
                header

                if !sessions.isEmpty {
                    searchBar
                }

                Text(sectionLabel)
                    .font(.momenMono(10))
                    .kerning(2)
                    .foregroundStyle(Theme.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 12)

                ScrollView {
                    LazyVStack(spacing: 12) {
                        if filteredSessions.isEmpty {
                            emptyState
                        } else {
                            ForEach(filteredSessions) { session in
                                sessionCard(session)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 120)
                }
                .scrollDismissesKeyboard(.immediately)
            }

            bottomBar
        }
        .glassModal(
            isPresented: $showDeleteModal,
            title: "Delete Session",
            message: "Delete \"\(deleteTarget?.name ?? "")\" and all its markers? This cannot be undone.",
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

    // ─── Pieces ─────────────────────────────────────────────

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("MOMEN")
                    .font(.momenMono(17, weight: .semibold))
                    .kerning(4)
                    .foregroundStyle(Theme.textPrimary)
                Text("Timecoded marker logging")
                    .font(.momenMono(10))
                    .kerning(1)
                    .foregroundStyle(Theme.textTertiary)
            }
            Spacer()
            if !sessions.isEmpty {
                Text("\(sessions.count)")
                    .font(.momenMono(12, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)
                    .glassPill(background: Theme.glassBgActive, border: Theme.glassBorderLight)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 12)
    }

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundStyle(Theme.textTertiary)

            TextField(
                "", text: $searchQuery,
                prompt: Text("Search sessions...").foregroundStyle(Theme.textTertiary)
            )
            .font(.momenSans(15))
            .foregroundStyle(Theme.textPrimary)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)

            if !searchQuery.isEmpty {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { searchQuery = "" }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.textTertiary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .glassCard()
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }

    private var sectionLabel: String {
        let q = searchQuery.trimmingCharacters(in: .whitespaces)
        if q.isEmpty { return "YOUR SESSIONS" }
        return "\(filteredSessions.count) RESULT\(filteredSessions.count == 1 ? "" : "S")"
    }

    private func sessionCard(_ session: Session) -> some View {
        Button {
            router.push(.logging(sessionID: session.id))
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(session.name)
                        .font(.momenSans(17, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.textTertiary)
                        .frame(width: 28, height: 28)
                        .background(Theme.glassBg)
                        .clipShape(Circle())
                        .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
                }

                Text(displayDate(session))
                    .font(.momenMono(10))
                    .kerning(1)
                    .foregroundStyle(Theme.textTertiary)
                    .padding(.top, 4)

                HStack(spacing: 8) {
                    if !session.isEnded {
                        HStack(spacing: 4) {
                            Circle().fill(Theme.teal).frame(width: 6, height: 6)
                            Text("ACTIVE")
                                .font(.momenMono(10, weight: .semibold))
                                .foregroundStyle(Theme.tealText)
                        }
                        .glassPill(background: Theme.tealLight, border: Theme.tealBorder)
                    }

                    Text("\(session.markers.count) marker\(session.markers.count == 1 ? "" : "s")")
                        .font(.momenMono(10))
                        .foregroundStyle(Theme.textSecondary)
                        .glassPill()

                    Text("\(session.frameRate.displayName) fps")
                        .font(.momenMono(10))
                        .foregroundStyle(Theme.textSecondary)
                        .glassPill()

                    Text(session.syncMethod == .manual ? "Manual" : "Clap")
                        .font(.momenMono(10, weight: .medium))
                        .foregroundStyle(session.syncMethod == .manual ? Theme.coralText : Theme.tealText)
                        .glassPill(
                            background: session.syncMethod == .manual ? Theme.coralLight : Theme.tealLight,
                            border: session.syncMethod == .manual ? Theme.coralBorder : Theme.tealBorder)
                }
                .padding(.top, 16)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassCard(elevated: true)
        }
        .buttonStyle(.plain)
        .onLongPressGesture {
            Haptics.impact(.medium)
            deleteTarget = session
            showDeleteModal = true
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            if searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
                Circle()
                    .fill(Theme.glassBg)
                    .frame(width: 80, height: 80)
                    .overlay(Circle().strokeBorder(Theme.glassBorder, lineWidth: 1))
                    .overlay(
                        Image(systemName: "circle.dotted.circle")
                            .font(.system(size: 32))
                            .foregroundStyle(Theme.textTertiary))
                    .padding(.bottom, 12)
                Text("No sessions yet")
                    .font(.momenSans(20, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                Text("Create your first session to start logging timecoded markers on set.")
                    .font(.momenSans(14))
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            } else {
                Text("No results")
                    .font(.momenSans(20, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                Text("No sessions match \"\(searchQuery)\"")
                    .font(.momenSans(14))
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(.top, 60)
        .padding(.horizontal, 32)
    }

    private var bottomBar: some View {
        VStack {
            Spacer()
            Button {
                router.push(.createSession)
            } label: {
                HStack(spacing: 8) {
                    Text("New Session")
                        .font(.momenSans(17, weight: .semibold))
                        .foregroundStyle(.white)
                    Text("+")
                        .font(.momenMono(20))
                        .foregroundStyle(.white.opacity(0.7))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Theme.coral)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .shadow(color: Theme.coral.opacity(0.4), radius: 24, y: 8)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 8)
            .background(
                Theme.bgPrimary.opacity(0.85)
                    .background(.ultraThinMaterial)
                    .ignoresSafeArea(edges: .bottom))
            .overlay(Rectangle().fill(Theme.glassBorder).frame(height: 1), alignment: .top)
        }
    }

    private func displayDate(_ session: Session) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMM yyyy"
        return formatter.string(from: session.date).uppercased()
    }
}
