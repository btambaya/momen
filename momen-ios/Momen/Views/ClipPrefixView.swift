import SwiftUI
import SwiftData
import MomenKit

/// Set the clip-name prefix for a project. Establishes the prefix once; every
/// clip then auto-numbers from it (PREFIX_001, _002, …). Creates the first
/// clip and moves straight to clap sync.
struct ClipPrefixView: View {
    let projectID: String

    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext

    @State private var prefix = ""
    @FocusState private var focused: Bool

    private var normalized: String { ClipNaming.normalizePrefix(prefix) }
    private var canContinue: Bool { !prefix.trimmingCharacters(in: .whitespaces).isEmpty }

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()
            BackgroundGlow(color: Theme.teal.opacity(0.04), size: 250).offset(x: 140, y: -300)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ScreenHeader(title: "Clip Name") { router.pop() }

                    Text("Set the clip prefix for this project. Every clip you record will be named from it automatically and numbered in sequence.")
                        .font(.momenSans(14)).foregroundStyle(Theme.textSecondary)
                        .lineSpacing(4).padding(.bottom, 8)

                    fieldLabel("CLIP PREFIX")
                    TextField("", text: $prefix,
                        prompt: Text("e.g. MONTACLIP").foregroundStyle(Theme.textTertiary))
                        .font(.momenMono(20, weight: .medium)).foregroundStyle(Theme.textPrimary)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .focused($focused)
                        .padding(20).glassCard()
                        .onChange(of: prefix) { _, v in
                            if v.count > 24 { prefix = String(v.prefix(24)) }
                        }

                    fieldLabel("PREVIEW")
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(1...3, id: \.self) { n in
                            Text(ClipNaming.name(prefix: normalized, number: n))
                                .font(.momenMono(15))
                                .foregroundStyle(n == 1 ? Theme.coralText : Theme.textTertiary)
                        }
                    }
                    .padding(20).frame(maxWidth: .infinity, alignment: .leading).glassCard()
                }
                .padding(.horizontal, 20).padding(.bottom, 120)
            }
            .scrollDismissesKeyboard(.interactively)

            bottomBar
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear { focused = true }
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text).font(.momenMono(10)).kerning(2)
            .foregroundStyle(Theme.textTertiary).padding(.top, 24).padding(.bottom, 12)
    }

    private var bottomBar: some View {
        VStack {
            Spacer()
            Button { createClipAndSync() } label: {
                HStack(spacing: 8) {
                    Text("Start Clip").font(.momenSans(17, weight: .semibold))
                    Image(systemName: "arrow.right").font(.system(size: 15, weight: .semibold)).opacity(0.7)
                }
                .foregroundStyle(canContinue ? .white : Theme.textTertiary)
                .frame(maxWidth: .infinity).padding(.vertical, 16)
                .background(canContinue ? Theme.coral : Theme.bgElevated)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .shadow(color: canContinue ? Theme.coral.opacity(0.4) : .clear, radius: 24, y: 8)
            }
            .disabled(!canContinue)
            .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
            .background(Theme.bgPrimary.opacity(0.85).background(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom))
            .overlay(Rectangle().fill(Theme.glassBorder).frame(height: 1), alignment: .top)
        }
    }

    private func createClipAndSync() {
        guard canContinue else { return }
        let descriptor = FetchDescriptor<Project>(predicate: #Predicate { $0.id == projectID })
        guard let project = try? modelContext.fetch(descriptor).first else { return }
        project.clipPrefix = normalized
        let clip = project.addClip()
        try? modelContext.save()
        router.replace(with: .clapListen(clipID: clip.id))
    }
}
