<div align="center">
  <img src="momen/assets/icon.png" width="128" style="border-radius: 20%; margin-bottom: 20px" alt="Momen App Icon">
  
  # Momen
  **Professional Timecode Marker Logging for Filmmakers**
</div>

<br />

**Momen** is an offline-first iOS/Android mobile application that allows filmmakers to log timestamped markers during a shoot. With an intuitive and robust glassmorphism UI, markers can be instantly synced and exported natively into formats seamlessly readable by professional Non-Linear Editors (NLEs), completely eradicating manual alignment overhead.

## ✨ Core Features

- ⏱ **High-Precision Logging**: Instant tap-to-mark logic utilizing system-level hardware clocks (`performance.now()`) for microsecond precision.
- 🎬 **Multi-Method Sync**:
  - **Manual Offset**: Direct camera timecode entry for perfect sync.
  - **Clap Sync**: Traditional clapboard method generating a master `SYNC` marker.
- 🗂 **Local Session Management**: Offline-first architecture using local SQLite. No cloud accounts, no network needed on set.
- 🎞 **Broadcast Framerates**: True SMPTE timecode generation supporting `23.976`, `24`, `25`, `29.97 (Drop-Frame)`, and `30` fps.
- 📤 **Instant Editor Export**:
  - **CSV**: Universal tabular data.
  - **FCPXML 1.9**: Direct import to Apple Final Cut Pro (as chapter markers).
  - **EDL (CMX 3600)**: Direct import to Adobe Premiere Pro & DaVinci Resolve.

## 🛠 Tech Stack

Built for maximum cross-platform efficiency and aesthetic quality:
- **Framework:** React Native / Expo (SDK 52)
- **Language:** TypeScript
- **Storage:** Local SQLite (`expo-sqlite`)
- **Styling:** Custom Glassmorphism System
- **Haptics:** `expo-haptics` integration

## 📱 Installation (Android)

A fully compiled, release-ready APK is available in this repository under the `apps/` directory.

1. Download [`apps/Momen_App.apk`](./apps/Momen_App.apk) to your Android device.
2. Open the file and follow the system prompts to install. *(You may need to allow installations from unknown sources in your Android settings).*

## 💻 Local Development

Before running the project locally, ensure you have Node.js and the Expo CLI installed.

```bash
# 1. Clone the repository
git clone https://github.com/btambaya/momen.git
cd momen/momen

# 2. Install dependencies
npm install

# 3. Start the Expo development server
npx expo start
```
From the Expo menu, you can open the app on an iOS Simulator, Android Emulator, or directly on your physical device using the Expo Go app.

## 📐 Project Structure

```text
├── Momen_MVP_Technical_Brief.html  # Comprehensive product specifications
├── implementation_plan.md          # Architecture & step-by-step logic
├── apps/
│   └── Momen_App.apk               # Compiled Android app
└── momen/                          # Main React Native Source
    ├── App.tsx                     # Entry point
    ├── src/
    │   ├── components/             # Reusable UI (GlassCard, Modals)
    │   ├── database/               # SQLite schemas & repositories
    │   ├── engine/                 # SMPTE timecode maths & calculation
    │   ├── export/                 # CMX3600, FCPXML, CSV generators
    │   ├── navigation/             # App routing 
    │   ├── screens/                # Core views (Sessions, Logging, Sync)
    │   └── theme/                  # Global design tokens
    └── assets/                     # Icons and branding
```

## 🔒 Offline Guarantee

Momen is designed to run in environments with zero connectivity. It requires no network requests, tracking, or cloud infrastructure to perform core duties, ensuring rock-solid reliability on remote sets.
