# Momen Android — Native Kotlin/Compose

Professional timecode marker logging for filmmakers. Native Android sibling of
`../momen-ios`; the React Native app in `../momen` is the frozen parity spec.

## Architecture

```
momen-android/
├── core/                          # Pure-JVM Kotlin module — CLI-testable
│   └── src/main/kotlin/.../core/
│       ├── FrameRate.kt           # 23.976 / 24 / 25 / 29.97DF / 30 + SyncMethod
│       ├── Timecode.kt            # SMPTE math, Davidson drop-frame algorithm
│       └── Exporters.kt           # CSV, FCPXML 1.13, CMX 3600 EDL
│   └── src/test/kotlin/           # 26 JUnit tests ported from the parity spec
│
└── app/                           # Jetpack Compose app (minSdk 26, target 35)
    └── src/main/java/com/ahmadtambaya/momen/
        ├── MainActivity.kt        # Custom Nav (push/replace/pop) + route switch
        ├── data/Db.kt             # SQLiteOpenHelper storage, same schema as RN
        ├── audio/ClapDetector.kt  # AudioRecord two-phase clap detection
        ├── export/ExportManager.kt# Cache-dir exports + FileProvider share
        ├── ui/                    # Theme (glassmorphism), shared components
        └── screens/               # SessionsList, CreateSession, Sync, Roll,
                                   # ClapListen, Logging
```

Key implementation notes:

- **Timing** uses `SystemClock.elapsedRealtime()` — monotonic, ticks through
  deep sleep. Sync moments store both the uptime and wall-clock date, so
  active sessions survive relaunches and reboots.
- **Clap detection** shares the retuned two-phase algorithm with iOS:
  spike ≥ 25 dB above the rolling noise floor AND > −12 dBFS absolute, then a
  ≥ 18 dB decay within ~2 buffers to reject thuds/speech. Manual fallback
  button always available.
- **Exports** are byte-format-compatible with iOS and RN
  (`{Name}_{YYYYMMDD}_{fps}fps_markers.{csv,fcpxml,edl}`), shared via the
  system share sheet (single format or all three at once).
- Storage is offline-first SQLite (`momen.db`), no cloud, no secrets.
- Screen stays awake during an active logging session.

## Develop

```bash
./gradlew :core:test           # engine + exporter parity tests
./gradlew :app:assembleDebug   # build APK → app/build/outputs/apk/debug/
./gradlew :app:assembleRelease # unsigned release build

# Install on a connected device/emulator
adb install app/build/outputs/apk/debug/app-debug.apk
```

Requires JDK 17 and the Android SDK (platform 35). `local.properties` with
`sdk.dir` is created locally and gitignored.

## Play Store

For a signed release: create an upload keystore, add a `signingConfig` to
`app/build.gradle.kts`, then `./gradlew :app:bundleRelease` and upload the
`.aab` from `app/build/outputs/bundle/release/` to the Play Console.
