# VoxFilter - Audio Processing for Sales Teams

## Overview
VoxFilter is an audio processing companion app for sales teams making outbound calls in **any** call platform (RingCentral / Zoom / Teams / Meet / etc). Available as both a web app and an Electron desktop app.

## Current State
- **Phase 3**: Desktop app foundations in place (native app output routing path is implemented; “auto-configure” UI is not)
- **Date**: December 1, 2025

## Recent Changes
- **Technical Debt Fixes** (Feb 12, 2026):
  - Race condition fix: Database transactions with FOR UPDATE row locking in DatabaseStorage, version tracking in MemoryStorage
  - MemoryStorage persistence: Auto-saves to disk every 5 minutes and on SIGINT/SIGTERM (file: data/memory-storage.json)
  - Database migration runner: server/migrate.ts for drizzle-orm migrations
  - Schema versioning: schema_versions table with startup validation, SCHEMA_VERSION constant in shared/schema.ts
- **FIXED Voice Modification** (Dec 1, 2025): Complete overhaul of audio processing pipeline
  - Added 4 formant filters (F1, F2, F3, voice body) for dramatic voice character changes
  - Voice presets now produce audible differences (deeper, warmer, brighter, etc.)
  - Auto-enables audio output when processing starts
  - Auto-detects VB-Audio/BlackHole and routes to it automatically
  - Improved UI with clearer output routing instructions
- **Electron Desktop App**:
  - Added IPC to support Electron-native output routing (`webContents.setAudioOutputDevice`)
  - Desktop uses the same Output Routing UI; when in Electron it routes via native APIs instead of browser `setSinkId`
  - Updated Setup Wizard and user guides to be call-app agnostic

## Project Architecture

### Frontend (React + TypeScript)
- **Agent Dashboard** (`/`): Individual agent view with audio processing controls
  - Real-time noise reduction toggle with intensity slider
  - Voice modifier with preset profiles (neutral, deeper, higher, warm, clear)
  - Pitch adjustment slider
  - Volume/gain controls
  - Waveform visualization
  - Audio level meters
  - Device selection

- **Admin Panel** (`/admin`): Team-wide monitoring for managers
  - Grid view of all 50 agents
  - Status filtering (online, busy, away, offline)
  - Search functionality
  - Real-time statistics dashboard
  - Agent cards showing processing status and features

### Backend (Express.js)
- **API Endpoints**:
  - `GET /api/agents` - List all agents
  - `GET /api/agents/:id` - Get single agent
  - `POST /api/agents` - Create new agent
  - `PATCH /api/agents/:id` - Update agent settings
  - `DELETE /api/agents/:id` - Remove agent
  - `GET /api/stats` - Get team statistics

- **In-Memory Storage**: Stores agent data, settings, and status

### Key Technologies
- Web Audio API for real-time audio processing
- Noise reduction via BiquadFilter (highpass/lowpass) and DynamicsCompressor
- React Query for data fetching and caching
- Shadcn UI components
- Tailwind CSS for styling
- Wouter for routing

## How It Works
1. Agents register their name on first visit (stored in localStorage + backend)
2. They click "Start Audio Processing" to enable microphone capture
3. Audio is processed through the Web Audio API pipeline:
   - Highpass filter removes low rumble (80-200Hz based on settings)
   - Notch filter removes 60Hz electrical hum
   - Lowpass filter removes high hiss (5000-8000Hz based on settings)
   - Dynamics compressor acts as noise gate
   - Adjustable input/output gain controls
4. The processed audio stream is exposed via `getProcessedStream()` for programmatic use
5. Agent settings sync with the backend via API mutations
6. Admins can monitor all agents in real-time from the Team Monitor view

## Technical Limitations
- **Browser Audio Routing**: Web browsers cannot create virtual audio devices that appear in the system device list. The desktop app solves this with native device control.
- **Voice Modification**: Real pitch shifting implemented via AudioWorklet granular synthesis processor (`client/public/pitch-shifter-processor.js`). Formant shaping uses peaking/shelf EQ filters. Pitch range: -12 to +12 semitones.

## Integration Options
1. **Desktop App (Recommended)**: Use VoxFilter Desktop for the most reliable call-app routing
2. **Browser + Virtual Cable**: Use browser version with manual VB-Audio/BlackHole setup (more browser-dependent)
3. **Standalone Mode**: Use VoxFilter to monitor and visualize audio processing

## Electron Desktop App
The desktop app provides native audio device control:
- Auto-detects VB-Audio (Windows) and BlackHole (Mac)
- Routes app output to selected device without browser limitations
- See `ELECTRON_README.md` for development and build instructions

## File Structure
```
client/
├── src/
│   ├── components/
│   │   ├── app-sidebar.tsx       # Navigation sidebar
│   │   ├── audio-controls.tsx    # Main audio settings panel
│   │   ├── audio-level-meter.tsx # Visual level indicator
│   │   ├── agent-card.tsx        # Agent display in admin grid
│   │   ├── call-timer.tsx        # Call duration display
│   │   ├── processing-badge.tsx  # Processing status indicator
│   │   ├── status-badge.tsx      # Agent status indicator
│   │   ├── theme-toggle.tsx      # Dark/light mode toggle
│   │   └── waveform-visualizer.tsx # Audio visualization
│   ├── hooks/
│   │   ├── use-audio-processor.ts # Web Audio API logic
│   │   └── use-theme.ts          # Theme management
│   ├── pages/
│   │   ├── agent-dashboard.tsx   # Individual agent view
│   │   └── admin-panel.tsx       # Team monitoring view
│   └── App.tsx                   # Main app with routing
server/
├── routes.ts                     # API endpoints
└── storage.ts                    # In-memory data storage
shared/
└── schema.ts                     # TypeScript types and Zod schemas
```

## User Preferences
- Clean, utility-focused design (Linear/Slack inspired)
- Professional appearance suitable for sales environments
- Dark/light mode support
- Non-intrusive controls that don't distract during calls

## Recent Changes
- Initial MVP implementation (Nov 29, 2025)
- Created agent dashboard with full audio controls
- Built admin monitoring panel for 50 agents
- Implemented Web Audio API noise reduction
- Added voice modifier with presets
