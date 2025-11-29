# VoicePro - Audio Processing for Sales Teams

## Overview
VoicePro is a browser-based companion application that provides real-time voice accent modification and background noise reduction for sales teams using RingCentral's web app for outbound calling. Designed to support up to 50 concurrent agents.

## Current State
- **Phase 2 In Progress**: Database persistence, advanced presets, and voice enhancement features added
- **Date**: November 29, 2025

## Recent Changes
- Added PostgreSQL database persistence (Drizzle ORM) replacing in-memory storage
- Added advanced accent presets (British, Australian, Southern US, Midwest US, New York)
- Added voice enhancement features (clarity boost, volume normalization)
- Added formant shift control for accent modification
- Added recording functionality to save processed audio sessions
- Added custom profiles and team presets database tables for future features

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
- **Browser Audio Routing**: Web browsers cannot create virtual audio devices that appear in the system device list. For full RingCentral integration, users would need:
  - A virtual audio cable application (e.g., VB-Audio, Blackhole for Mac)
  - Route VoicePro output to the virtual device
  - Select the virtual device as mic input in RingCentral
- **Voice Modification**: Current implementation uses pitch shifting via filter adjustments. Advanced formant-based accent modification would require additional DSP libraries.

## Integration Options
1. **Standalone Mode**: Use VoicePro to monitor and visualize audio processing
2. **Virtual Cable Mode**: Combine with VB-Audio or similar to route processed audio to other apps
3. **Programmatic Mode**: Access `processedStream` via the hook for custom integrations

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
