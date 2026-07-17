# Momen iOS — Native Swift/SwiftUI

Professional timecode marker logging for filmmakers. This is the **native iOS
rebuild** of the React Native MVP in `../momen`, which remains the reference
implementation and parity spec.

## Why native

The post-MVP roadmap (LTC timecode reading, Bluetooth timecode hardware,
Apple Watch mark button, Live Activities, microsecond clocks) lives in
territory where React Native needs native modules anyway. Going native now
removes the bridge tax before those features land.

## Architecture

```
momen-ios/
├── MomenKit/                  # Swift package — pure logic, CLI-testable
│   ├── Sources/MomenKit/
│   │   ├── FrameRate.swift    # 23.976 / 24 / 25 / 29.97DF / 30
│   │   ├── Timecode.swift     # SMPTE math, Davidson drop-frame algorithm
│   │   ├── CSVExporter.swift
│   │   ├── FCPXMLExporter.swift   # FCPXML 1.13 chapter markers
│   │   ├── EDLExporter.swift      # CMX 3600
│   │   └── ExportModels.swift # Storage-agnostic exporter inputs
│   └── Tests/MomenKitTests/   # 35 tests ported from the RN Jest suite
│
├── Momen/                     # SwiftUI app
│   ├── MomenApp.swift         # Entry — SwiftData container, NavigationStack
│   ├── Models/Models.swift    # @Model Session + Marker (cascade delete)
│   ├── Support/               # Theme (glassmorphism), Router, TimeSource, Haptics
│   ├── Audio/ClapDetector.swift   # AVAudioEngine two-phase clap detection
│   ├── Export/ExportService.swift # Generates CSV+FCPXML+EDL, share sheet
│   └── Views/                 # SessionsList, CreateSession, Sync, Roll,
│                              # ClapListen, Logging + components
└── project.yml                # XcodeGen spec
```

Key implementation notes:

- **Timing** uses `CACurrentMediaTime()` (mach_absolute_time) — monotonic and
  immune to wall-clock jumps. Sync moments store both the monotonic uptime and
  wall-clock date, so active sessions survive app relaunches and reboots
  (an improvement over the RN app, whose `performance.now()` reference broke
  across restarts).
- **Clap detection** ports the RN two-phase algorithm with retuned thresholds
  (the RN constants — 80 dB over floor AND > −3 dBFS — were mathematically
  unreachable): spike ≥ 25 dB above the rolling noise floor AND > −12 dBFS
  absolute, then a ≥ 18 dB decay within ~2 buffers to reject sustained
  sounds. Manual fallback button always available.
- **Storage** is SwiftData (`momen.store`), offline-first, no cloud, no secrets.
- **Exports** are byte-format-compatible with the RN app
  (`{Name}_{YYYYMMDD}_{fps}fps_markers.{csv,fcpxml,edl}`).

## Develop

```bash
brew install xcodegen          # once
xcodegen generate              # regenerate Momen.xcodeproj after adding files
open Momen.xcodeproj           # run in Xcode (needs iOS 17+)

cd MomenKit && swift test      # core engine + exporter tests, no Xcode needed
```

Build from CLI:

```bash
xcodebuild -project Momen.xcodeproj -scheme Momen \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```
