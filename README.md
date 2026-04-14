<div align="center">
  <img src="frontend/public/lmu_logo.png" width="100" alt="LMU Telemetry Lab Logo"/>
  <h1>LMU Telemetry Lab</h1>
  <p>A professional race telemetry analysis tool for <strong>Le Mans Ultimate</strong></p>
  <p>
    <img src="https://img.shields.io/badge/version-1.2.0-blue" />
    <img src="https://img.shields.io/badge/platform-Windows-lightgrey" />
    <img src="https://img.shields.io/badge/license-MIT-green" />
  </p>
</div>

---

## ✨ Features

- 📊 **Telemetry Charts** — Multi-channel overlay with zoom, cursor sync, and lap comparison
- 🗺️ **2D / 3D Track Map** — GPS-based racing line with heatmap (throttle / brake / coast)
- 👻 **Ghost Car** — Visualize two laps simultaneously in 3D with position sync
- 🔄 **Cross-Session Reference Lap** — Compare laps across different sessions or stints
- 🎡 **Steering Wheel View** — Real-time steering angle with customizable wheel skins
- 📺 **Compact Telemetry HUD** — Draggable, resizable live delta overlay on the 3D map
- 💾 **Session Management** — Upload, rename, delete DuckDB sessions with multi-profile support
- 🧑‍💻 **Multi-Profile** — Individual accounts with separate data access and avatar
- ⚡ **Self-Healing Playback** — Auto-detects and corrects non-zero-start telemetry data

---

## 📸 Screenshots

> *(Add screenshots here after first release)*

---

## 📥 Installation

### Option A: Download the Installer (Recommended)

1. Go to the [**Releases**](../../releases) page
2. Download the latest `LMU Telemetry Lab Setup x.x.x.exe`
3. Run the installer and follow the on-screen steps
4. Launch **LMU Telemetry Lab** from the Start Menu or Desktop shortcut

> ⚠️ **Windows only.** If Windows SmartScreen shows a warning, click "More info" → "Run anyway".

### Option B: Run from Source (Dev Mode)

**Prerequisites:**
- Python 3.11+
- Node.js 18+
- Git

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/lmu-telemetry-lab.git
cd lmu-telemetry-lab

# 2. Set up Python backend
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt

# 3. Start the backend
cd backend
uvicorn main:app --reload

# 4. In another terminal, start the frontend
cd frontend
npm install
npm run dev
```

---

## 🛠️ Build the Installer

```bash
.\build_app.bat
```

The installer will be generated at `dist-electron/LMU Telemetry Lab Setup x.x.x.exe`.

---

## 🗂️ Project Structure

```
├── backend/              # FastAPI backend (Python)
│   ├── app/
│   │   ├── api/          # REST endpoints
│   │   └── services/     # Telemetry, Profiles, Car Lookup
│   └── main.py
├── frontend/             # React + Vite frontend (TypeScript)
│   └── src/
│       ├── components/   # UI components
│       └── store/        # Zustand state management
├── desktop/              # Electron shell
│   └── main.js
├── backend.spec          # PyInstaller spec
└── build_app.bat         # One-click build script
```

---

## 📋 Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Windows 10 / 11 (x64) |
| Game | Le Mans Ultimate |
| Storage | ~500MB |
| RAM | 4GB+ recommended |

---

## 📝 Changelog

See [PROJECT_MILESTONES.md](PROJECT_MILESTONES.md) for the full version history.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
