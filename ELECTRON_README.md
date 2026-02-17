# VoicePro Desktop App

The VoicePro Desktop App provides guaranteed RingCentral integration with native audio device routing.

## Why Desktop?

Web browsers have fundamental limitations that prevent reliable audio routing to virtual cable software. The desktop app solves this by:

1. **Direct device control** - Can set your system's audio output device programmatically
2. **Auto-detection** - Automatically finds VB-Audio/BlackHole virtual cables
3. **One-click setup** - Configures everything with a single "Auto-Configure" button
4. **Guaranteed routing** - Audio flows directly to RingCentral without browser restrictions

## System Requirements

### Windows
- Windows 10 or later
- VB-Audio Virtual Cable installed ([Download](https://vb-audio.com/Cable/))

### Mac
- macOS 10.14 or later
- BlackHole Virtual Audio Driver installed ([Download](https://existential.audio/blackhole/))

## Running in Development

To run the Electron app in development mode:

1. **Start the web server** (in one terminal):
   ```bash
   npm run dev
   ```

2. **Start Electron** (in another terminal):
   ```bash
   npx tsx script/electron-dev.ts
   ```

This will:
- Compile the Electron TypeScript files
- Wait for the web server to be ready
- Launch the Electron window pointing to localhost:5000

## Building for Distribution

To build installable packages for Windows/Mac:

```bash
npx tsx script/build-electron.ts
```

This creates:
- **Windows**: `release/VoicePro-{version}-Windows.exe` (NSIS installer)
- **Mac**: `release/VoicePro-{version}-Mac-{arch}.dmg` (Disk image)

## Downloading installers (recommended)

Do **not** commit `.exe`/`.dmg` binaries into git. Instead, distribute via:

- **GitHub Actions artifacts** (manual builds), or
- **GitHub Releases** (tagged builds).

### GitHub Actions (artifact download)

1. Go to the Actions tab → run **Desktop App (Windows Installer)** (workflow_dispatch).
2. Download the artifact **VoicePro-Windows-Installer**.

### GitHub Releases (public download link)

Push a tag like `desktop-v1.0.0` and GitHub Actions will build and attach:

- `VoicePro-1.0.0-Windows.exe`
- `VoicePro-1.0.0-Windows.exe.blockmap`

to a Release. Users can download from the Release page.

## How It Works

### Audio Flow (Desktop App)
```
Your Physical Mic
       ↓
VoicePro Desktop App (captures & processes audio)
       ↓
CABLE Input / BlackHole (native device selection)
       ↓
CABLE Output / BlackHole (virtual mic)
       ↓
RingCentral Desktop App
```

### Key Difference from Browser

| Feature | Browser Version | Desktop App |
|---------|----------------|-------------|
| Audio capture | ✅ Works | ✅ Works |
| Noise reduction | ✅ Works | ✅ Works |
| Voice presets | ✅ Works | ✅ Works |
| Virtual cable output | ⚠️ Unreliable | ✅ Guaranteed |
| Auto device setup | ❌ No | ✅ Yes |
| RingCentral integration | ⚠️ Manual config | ✅ One-click |

## Using the Desktop App

1. **Install VB-Audio** (Windows) or **BlackHole** (Mac)
2. Open VoicePro Desktop App
3. Select your physical microphone
4. Click "Start Audio Processing"
5. Click "Auto-Configure" in the Desktop Audio Routing panel
6. Open RingCentral:
   - Go to Settings → Audio
   - Set Microphone to "CABLE Output" (Windows) or "BlackHole" (Mac)
7. Make calls with processed audio!

## Troubleshooting

### "VB-Audio/BlackHole not detected"
- Make sure the virtual audio software is installed
- Restart VoicePro after installing
- Click the refresh button to re-scan devices

### Audio not reaching RingCentral
- Verify "Auto-Configure" shows "Connected" status
- Check RingCentral is using the correct microphone
- Restart RingCentral after changing audio settings

### App won't launch
- Make sure the web server is running (`npm run dev`)
- Check the terminal for error messages
- Try rebuilding: `npx tsc -p electron/tsconfig.json`

## Development Structure

```
electron/
├── main/
│   └── main.ts          # Electron main process
├── preload/
│   └── preload.ts       # Secure IPC bridge
├── audio/
│   └── device-manager.ts # Native audio device handling
└── tsconfig.json        # TypeScript config for Electron

client/src/
├── hooks/
│   └── use-electron.ts  # React hook for Electron APIs
└── components/
    └── electron-audio-panel.tsx  # Desktop-specific UI
```

## Security Notes

- The app uses context isolation for security
- No Node.js APIs are exposed to the renderer
- All native features go through the secure IPC bridge
- Microphone permission is explicitly requested and required
