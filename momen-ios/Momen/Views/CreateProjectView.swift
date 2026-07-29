import SwiftUI
import SwiftData
import MomenKit

/// New project setup — name, date, frame rate; then on to the clip prefix.
struct CreateProjectView: View {
    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var modelContext

    @State private var name = ""
    @State private var frameRate: FrameRate = .fps24
    @FocusState private var nameFocused: Bool

    private var trimmedName: String { name.trimmingCharacters(in: .whitespaces) }

    var body: some View {
        ZStack {
            Theme.bgPrimary.ignoresSafeArea()
            BackgroundGlow(color: Theme.purple.opacity(0.04), size: 250).offset(x: -140, y: -300)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ScreenHeader(title: "New Project") { router.pop() }

                    Text("Set up the shoot before you add clips. The frame rate applies to every clip in this project.")
                        .font(.momenSans(14)).foregroundStyle(Theme.textSecondary)
                        .lineSpacing(4).padding(.bottom, 8)

                    fieldLabel("PROJECT NAME")
                    TextField("", text: $name,
                        prompt: Text("e.g. Documentary — Day 1").foregroundStyle(Theme.textTertiary))
                        .font(.momenSans(17)).foregroundStyle(Theme.textPrimary)
                        .focused($nameFocused)
                        .padding(20).glassCard()
                        .onChange(of: name) { _, v in
                            if v.count > MomenConstants.maxSessionNameLength {
                                name = String(v.prefix(MomenConstants.maxSessionNameLength))
                            }
                        }

                    fieldLabel("DATE")
                    HStack {
                        Text(Date(), format: .dateTime.weekday(.wide).day().month(.wide).year())
                            .font(.momenSans(15)).foregroundStyle(Theme.textPrimary)
                        Spacer()
                        Text("Today").font(.momenMono(10)).kerning(1)
                            .foregroundStyle(Theme.tealText)
                    }
                    .padding(20).glassCard()

                    fieldLabel("FRAME RATE")
                    VStack(alignment: .leading, spacing: 16) {
                        FrameRatePickerView(selected: $frameRate)
                        Text("⚠ Must match your camera's recording frame rate. An incorrect setting will land markers on the wrong frame in the editor.")
                            .font(.momenSans(12)).foregroundStyle(Theme.amberText.opacity(0.8))
                            .lineSpacing(3)
                    }
                    .padding(20).glassCard()
                }
                .padding(.horizontal, 20).padding(.bottom, 120)
            }
            .scrollDismissesKeyboard(.interactively)

            bottomBar
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear { nameFocused = true }
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text).font(.momenMono(10)).kerning(2)
            .foregroundStyle(Theme.textTertiary).padding(.top, 24).padding(.bottom, 12)
    }

    private var bottomBar: some View {
        VStack {
            Spacer()
            Button { createAndContinue() } label: {
                HStack(spacing: 8) {
                    Text("Continue").font(.momenSans(17, weight: .semibold))
                    Image(systemName: "arrow.right").font(.system(size: 15, weight: .semibold)).opacity(0.7)
                }
                .foregroundStyle(trimmedName.isEmpty ? Theme.textTertiary : .white)
                .frame(maxWidth: .infinity).padding(.vertical, 16)
                .background(trimmedName.isEmpty ? Theme.bgElevated : Theme.coral)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .shadow(color: trimmedName.isEmpty ? .clear : Theme.coral.opacity(0.4), radius: 24, y: 8)
            }
            .disabled(trimmedName.isEmpty)
            .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
            .background(Theme.bgPrimary.opacity(0.85).background(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom))
            .overlay(Rectangle().fill(Theme.glassBorder).frame(height: 1), alignment: .top)
        }
    }

    private func createAndContinue() {
        guard !trimmedName.isEmpty else { return }
        let project = Project(name: trimmedName, frameRate: frameRate)
        modelContext.insert(project)
        try? modelContext.save()
        router.replace(with: .clipPrefix(projectID: project.id))
    }
}
