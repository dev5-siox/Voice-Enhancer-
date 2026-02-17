# VoicePro User Guide

## Complete Documentation for Audio Processing Companion Application

---

# Table of Contents

1. [Product Overview](#product-overview)
2. [Getting Started](#getting-started)
3. [Agent Dashboard Guide](#agent-dashboard-guide)
4. [Voice Presets Reference](#voice-presets-reference)
5. [Custom Profiles](#custom-profiles)
6. [Admin Panel Guide](#admin-panel-guide)
7. [Technical Setup](#technical-setup)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

# Product Overview

## What is VoicePro?

VoicePro is a browser-based audio processing companion application designed specifically for sales teams making outbound calls. It provides real-time voice enhancement, noise reduction, and accent modification to help agents sound their professional best on every call.

## Key Features

### For Sales Agents
- **Real-time Noise Reduction**: Eliminates background noise like keyboard sounds, AC hum, and ambient noise
- **Voice Modification**: Choose from 21 voice presets including regional accents and professional personas
- **Voice Enhancement**: Clarity boost and volume normalization for consistent, clear audio
- **Custom Profiles**: Save your preferred settings and share them with your team
- **Recording**: Record processed audio sessions and download locally for personal review

### For Administrators
- **Team Monitor**: Real-time visibility into all agents' status and settings
- **Team Presets**: Create and distribute standardized voice profiles across the team
- **Analytics Dashboard**: Track feature adoption, preset usage, and agent status distribution

## How It Works

VoicePro captures your microphone audio, processes it through a sophisticated Web Audio API pipeline, and outputs enhanced audio. The processing chain includes:

1. **High-pass filter** - Removes low-frequency rumble (80-200Hz)
2. **Notch filter** - Eliminates 60Hz electrical hum
3. **Low-pass filter** - Removes high-frequency hiss (5000-10000Hz)
4. **Formant shifting** - Modifies voice characteristics for accent simulation
5. **Dynamics compressor** - Acts as a noise gate and normalizes volume
6. **Clarity enhancement** - Boosts vocal frequencies for intelligibility

---

# Getting Started

## First-Time Setup

1. **Open VoicePro** in your web browser
2. **Enter your name** in the welcome dialog - this registers you in the system
3. **Click "Get Started"** to access your dashboard
4. **Allow microphone access** when your browser requests it

**Returning Users**: If you've registered before, VoicePro remembers you automatically. Your browser stores your agent ID locally, so you'll go straight to your dashboard with your saved settings.

## Quick Start Checklist

- [ ] Register with your name (first time only)
- [ ] Click "Start Audio Processing" to enable your microphone
- [ ] Enable Noise Reduction (recommended for all environments)
- [ ] Choose a Voice Preset that matches your calling style
- [ ] Save your settings as a Custom Profile for easy recall

---

# Agent Dashboard Guide

## Audio Processing Card

The main control center for your audio processing.

### Controls
| Control | Function |
|---------|----------|
| **Start Audio Processing** | Enables microphone capture and processing |
| **Stop** | Disables audio processing |
| **Record** | Starts recording your processed audio session (requires active processing) |

**Recording Note**: The Record button only appears after you've started audio processing. Recordings are saved locally to your computer as downloadable files - they are not uploaded to any server.

### Indicators
- **Audio Visualization**: Real-time waveform display of your audio signal
- **Input Level Meter**: Shows microphone input volume
- **Output Level Meter**: Shows processed audio volume
- **Processing Status**: Shows latency in milliseconds (lower is better)

## Noise Reduction

Reduces unwanted background sounds while preserving voice clarity.

### Settings
| Setting | Range | Recommended |
|---------|-------|-------------|
| **Enable/Disable** | On/Off | On |
| **Intensity** | 0-100% | 50% for normal environments, 75%+ for noisy spaces |

### What It Filters
- Keyboard and mouse clicks
- Air conditioning hum
- Fan noise
- Street and traffic sounds
- Background conversations

**Tip**: Start at 50% intensity and increase if you still hear background noise. Too high may affect voice quality.

## Voice Modifier

Transform your voice with professional presets or fine-tune manually.

### Preset Categories

#### Basic (5 presets)
Quick adjustments to your natural voice:
- **Neutral**: No modification
- **Deeper**: Lower, more authoritative
- **Higher**: Elevated, energetic
- **Warm**: Friendly, approachable
- **Clear**: Articulate, crisp

#### American Accents (8 presets)
Regional American voice characteristics:
- **Midwest US**: Neutral, standard American
- **California**: Bright, relaxed West Coast
- **Pacific Northwest**: Clean, neutral
- **Mid-Atlantic**: Polished, refined
- **Southern US**: Warm drawl
- **Texas**: Bold, distinctive twang
- **New York**: Energetic, direct
- **Boston**: Classic New England

#### International (2 presets)
- **British**: Crisp, articulate
- **Australian**: Friendly, upbeat

#### Voice Character (6 presets)
Professional personas for different call types:
- **Professional**: Business-ready, polished
- **Confident**: Self-assured, steady
- **Authoritative**: Commanding presence
- **Friendly**: Warm, approachable
- **Calm**: Soothing, relaxed
- **Energetic**: Vibrant, enthusiastic

### Manual Adjustments

| Control | Range | Effect |
|---------|-------|--------|
| **Pitch Shift** | -12 to +12 semitones | Raises or lowers voice pitch |
| **Formant Shift** | -50% to +50% | Positive = brighter, Negative = warmer |

## Voice Enhancement

Additional processing for optimal voice quality.

### Clarity Boost
Enhances vocal frequencies for better intelligibility.
- Range: 0-100%
- Start at 25-50% and adjust based on feedback

### Volume Normalization
Maintains consistent volume regardless of how loud or soft you speak.
- Recommended: Enable for all calls
- Helps prevent volume spikes and drops

## Volume Controls

### Input Gain
- Adjusts microphone sensitivity
- Range: 0-200%
- Default: 100%
- Increase if your voice is too quiet

### Output Gain
- Adjusts final output volume
- Range: 0-200%
- Default: 100%
- Adjust based on your headphone/speaker levels

## Audio Device Selection

Choose your microphone from available devices:
- Default Microphone (system default)
- Any connected USB or Bluetooth microphones
- Virtual audio devices (if installed)

---

# Voice Presets Reference

## Complete Preset Specifications

### Basic Presets

| Preset | Pitch | Formant | Best For |
|--------|-------|---------|----------|
| Neutral | 0 | 0% | Natural voice, no changes |
| Deeper | -3 | -15% | Authority, leadership calls |
| Higher | +3 | +15% | Energy, enthusiasm |
| Warm | -1 | -5% | Relationship building |
| Clear | +1 | +5% | Technical explanations |

### American Accent Presets

| Preset | Pitch | Formant | Characteristics |
|--------|-------|---------|-----------------|
| Midwest US | 0 | +3% | Neutral American standard |
| California | +1 | +6% | Bright, relaxed, upbeat |
| Pacific NW | 0 | +4% | Clean, neutral, professional |
| Mid-Atlantic | 0 | +5% | Polished, refined speech |
| Southern US | -2 | -8% | Warm, friendly drawl |
| Texas | -2 | -10% | Bold, distinctive presence |
| New York | +1 | +12% | Direct, energetic |
| Boston | 0 | +8% | Classic, distinctive |

### International Presets

| Preset | Pitch | Formant | Characteristics |
|--------|-------|---------|-----------------|
| British | +1 | +8% | Crisp, articulate diction |
| Australian | +2 | +10% | Friendly, approachable |

### Voice Character Presets

| Preset | Pitch | Formant | Best For |
|--------|-------|---------|----------|
| Professional | 0 | +3% | Business calls, formal meetings |
| Confident | 0 | +2% | Sales pitches, negotiations |
| Authoritative | -2 | -12% | Leadership, decision calls |
| Friendly | +1 | +5% | Customer service, warm outreach |
| Calm | -1 | -3% | Difficult conversations, de-escalation |
| Energetic | +2 | +10% | Cold calls, high-energy pitches |

---

# Custom Profiles

## What Are Custom Profiles?

Custom Profiles let you save your current audio settings (noise reduction, voice preset, pitch, formant, clarity, etc.) under a memorable name. You can quickly switch between different profiles for different call types.

## Creating a Profile

1. Configure all your audio settings exactly how you want them
2. Click the **Save** button (disk icon) in the Custom Profiles card
3. Enter a descriptive name (e.g., "Enterprise Calls", "Cold Outreach")
4. Optionally check "Share with team" to let colleagues use your profile
5. Click **Save Profile**

## Managing Profiles

### My Profiles Tab
Shows profiles you've created:
- Click any profile to apply its settings instantly
- Delete your own profiles with the trash icon
- Shared profiles show a "Team" badge

### Team Presets Tab
Shows presets created by your admin:
- Click to apply team-standard settings
- These are maintained by your administrator
- Cannot be deleted by agents

## Profile Best Practices

- Create separate profiles for different call types
- Name profiles descriptively ("Enterprise - Calm" vs "Startup - Energetic")
- Share profiles that work well so teammates can benefit
- Regularly update profiles as you refine your settings

---

# Admin Panel Guide

Access the Admin Panel by navigating to `/admin` or clicking "Team Monitor" in the sidebar.

## Team Monitor Tab

### Agent Grid
View all agents in a card-based layout showing:
- Agent name and status (Online, Busy, Away, Offline)
- Current processing status
- Active features (Noise Reduction, Accent Modifier)
- Current voice preset

### Filtering & Search
- **Search Bar**: Find agents by name or email
- **Status Filter Dropdown**: Filter by Online, Busy, Away, Offline, or show All
- **Refresh Button**: Manually refresh agent data (auto-refreshes every 5 seconds)

### Statistics Dashboard
Real-time metrics displayed at the top:
- Total agents registered
- Agents currently online
- Agents on calls (Busy status)
- Agents actively processing audio

## Analytics Tab

### Feature Adoption Cards
- **Noise Reduction Usage**: Percentage of agents with NR enabled
- **Accent Modifier Usage**: Percentage using voice modification
- **Clarity Boost Average**: Team-wide clarity boost level
- **Volume Normalization**: Percentage with VN enabled

### Voice Preset Usage
Visual breakdown of which presets are most popular:
- Progress bars showing adoption percentage
- Helps identify training opportunities

### Agent Status Distribution
Pie chart showing:
- Online agents
- Busy agents
- Away agents
- Offline agents

## Team Presets Tab

### Creating Team Presets

1. Click **Create Preset**
2. Enter a name (e.g., "Standard Sales Voice")
3. Add a description explaining when to use it
4. Configure all audio settings:
   - Noise reduction on/off and intensity
   - Voice modifier preset, pitch, formant
   - Clarity boost and volume normalization
   - Input/output gain levels
5. Toggle **Active** to make it visible to agents
6. Click **Create Preset**

### Managing Team Presets

| Action | How |
|--------|-----|
| Toggle Active/Inactive | Click the switch on each preset |
| Edit Preset | Click the edit (pencil) icon |
| Delete Preset | Click the delete (trash) icon |

### Best Practices

- Create presets for different call scenarios (cold calls, demos, support)
- Use descriptive names and descriptions
- Deactivate outdated presets rather than deleting
- Monitor analytics to see which presets agents actually use

---

# Technical Setup

## System Requirements

### Browser Support
- Google Chrome (recommended)
- Microsoft Edge
- Firefox
- Safari (limited Web Audio API support)

### Hardware
- Microphone (built-in, USB, or Bluetooth)
- Headphones recommended to prevent feedback

### Network
- Stable internet connection for real-time sync
- WebSocket support for live updates

## Desktop Call App Integration (RingCentral / Zoom / Teams / Meet)

VoicePro processes audio in your browser but cannot directly create a system microphone device that other desktop apps can see. To use processed audio inside a desktop call app (RingCentral/Zoom/Teams/Meet/etc), you need a **virtual audio cable** (VB-Audio / BlackHole) that acts as a bridge.

**Recommended**: use the **VoicePro Desktop App** (Windows installer) for more reliable routing than the browser. Download instructions live in `ELECTRON_README.md`.

### Step-by-Step Setup (Windows with VB-Audio)

This is the recommended setup for Windows users with the RingCentral desktop app:

**Step 1: Install VB-Audio Virtual Cable**
1. Download from [vb-audio.com/Cable](https://vb-audio.com/Cable/) (free)
2. Run the installer as Administrator
3. Restart your computer after installation
4. You'll now have a new audio device called "CABLE Input" and "CABLE Output"

**Step 2: Configure VoicePro Output Routing** (recommended; no OS default changes)
1. Open VoicePro
2. Click **Start Audio Processing**
3. Scroll to **Audio Output Routing**
4. Select **"CABLE Input (VB-Audio Virtual Cable)"** as the output device
5. Click **Enable Audio Output**
6. Confirm **Virtual: Active** (and “RingCentral ready: YES”)

**Step 3: Configure RingCentral Desktop App**
1. Open the RingCentral desktop application
2. Go to **Settings** → **Audio**
3. Under **Microphone**, select **"CABLE Output (VB-Audio Virtual Cable)"**
4. Keep your headphones or speakers selected as the **Speaker** output so you can hear callers

**Step 4: Validate the processed stream**
1. Click **Test Processed Audio (3s)** in the Output Routing card
2. Confirm the Self-Test shows **OK/WARN** (and shows device list)
3. If playback is blocked, click **Play last self-test**

**Step 5: Test the Complete Flow**
1. In RingCentral, go to Settings → Audio → Test your microphone
2. Speak into your mic - RingCentral should show audio activity
3. If you don't see activity, make sure "Enable Output to Virtual Cable" is clicked in VoicePro

**Audio Flow Diagram**:
```
Your Physical Mic
       ↓
VoicePro (Chrome browser) - processes audio
       ↓
CABLE Input (VB-Audio) - virtual speaker that VoicePro outputs to
       ↓
CABLE Output (VB-Audio) - virtual mic that RingCentral reads from
       ↓
RingCentral Desktop App - uses as microphone input
```

### Step-by-Step Setup (Mac with BlackHole)

**Step 1: Install BlackHole**
1. Download from [existential.audio/blackhole](https://existential.audio/blackhole/) (free)
2. Run the installer package
3. Allow the extension in System Preferences → Security & Privacy if prompted
4. You'll now have a new audio device called "BlackHole 2ch"

**Step 2: Configure VoicePro Output Routing** (recommended; no OS default changes)
1. Open VoicePro
2. Click **Start Audio Processing**
3. Scroll to **Audio Output Routing**
4. Select **BlackHole 2ch** as the output device
5. Click **Enable Audio Output**
6. Confirm **Virtual: Active**

**Step 4: Configure RingCentral Desktop App**
1. Open RingCentral desktop application
2. Go to **Settings** → **Audio**
3. Under **Microphone**, select **"BlackHole 2ch"**
4. Under **Speaker**, select your **headphones** (so you hear callers)

**Step 5: Validate the processed stream**
1. Click **Test Processed Audio (3s)** in the Output Routing card
2. Confirm the Self-Test shows **OK/WARN** and lists BlackHole outputs

**Step 6: Test the Setup**
1. In RingCentral Settings → Audio, test your microphone
2. You should see audio activity when you speak
3. If no audio, make sure "Enable Output to Virtual Cable" is clicked in VoicePro

### Troubleshooting Virtual Audio Cable

**RingCentral shows no audio input:**
- **Most common issue:** Output routing is not active. In VoicePro Output Routing, ensure:
  - **Virtual: Active**
  - **RingCentral ready: YES**
- Restart RingCentral after changing audio settings
- Try speaking louder - check VoicePro's Input Level meter

**I can't hear my own voice or callers:**
- On Windows: You need headphones connected to hear callers (the virtual cable is for routing, not listening)
- On Mac: Make sure you created the Multi-Output Device correctly
- Set RingCentral's Speaker output to your headphones, NOT the virtual cable

**Audio is choppy or has high latency:**
- Close unnecessary browser tabs and applications
- Reduce VoicePro's processing features temporarily
- Use Chrome browser for best performance
- Check your CPU usage - audio processing needs resources

**Virtual cable device not appearing:**
- Windows: Run the VB-Audio installer as Administrator, restart computer
- Mac: Check System Preferences → Security & Privacy for blocked installations
- Try reinstalling the virtual audio cable software

### Why This Setup Works

The virtual audio cable creates a software-based audio pathway:
1. **VoicePro** captures your microphone, processes the audio, and plays it to the system output
2. **Virtual Cable** catches that output and makes it available as a virtual microphone
3. **RingCentral** sees the virtual cable as a regular microphone and uses it for calls

This means your processed voice (with noise reduction, voice modification, etc.) is what RingCentral transmits to callers.

### Alternative: Hardware Loopback

If you have a professional audio interface with loopback capability:
1. Set your audio interface as the system output
2. Enable loopback on your interface
3. Select the loopback channel as microphone in RingCentral

### Standalone Use (Without RingCentral)

Even without RingCentral integration, VoicePro is valuable for:
- Monitoring your audio quality in real-time before calls
- Practicing with different voice presets
- Recording sessions for personal review
- Fine-tuning your optimal voice settings

---

# Troubleshooting

## Common Issues

### "Microphone access denied"
1. Click the lock/info icon in your browser's address bar
2. Find "Microphone" permission
3. Set to "Allow"
4. Refresh the page

### No audio input detected
1. Check your microphone is plugged in
2. Verify microphone works in other apps
3. Select correct device in Audio Device settings
4. Check Input Gain is above 0%

### Audio sounds distorted
1. Reduce Input Gain to 100% or below
2. Lower Noise Reduction intensity
3. Reduce Clarity Boost
4. Disable Volume Normalization temporarily

### High latency
1. Close other browser tabs
2. Disable browser extensions
3. Use Chrome for best performance
4. Check for CPU-intensive applications

### Voice preset sounds unnatural
1. Start with "Neutral" or "Professional"
2. Make gradual adjustments to Pitch and Formant
3. Use presets as starting points, then fine-tune
4. Lower Formant Shift if voice sounds robotic

### Recording not saving
1. Check browser allows file downloads
2. Ensure sufficient disk space
3. Try a different browser
4. Recording stops automatically if you stop processing

## Error Messages

| Error | Solution |
|-------|----------|
| "Failed to initialize audio" | Refresh page, check microphone permissions |
| "Device not found" | Reconnect microphone, select different device |
| "Processing error" | Reduce simultaneous audio features |

---

# FAQ

## General Questions

**Q: Does VoicePro record my calls?**
A: VoicePro only records when you explicitly click the Record button (which appears after starting audio processing). Recordings are downloaded directly to your computer as audio files - they are not stored on any server.

**Q: Can my manager hear my audio?**
A: No. Admins can see your settings and status but cannot listen to your audio.

**Q: Does VoicePro work offline?**
A: Audio processing works offline, but settings won't sync and admin features require internet.

**Q: How much CPU does VoicePro use?**
A: Typically 2-5% CPU. Close other audio applications if you experience issues.

## Voice Modification

**Q: Will I sound like a different person?**
A: No. VoicePro enhances your natural voice; it doesn't replace it. Think of it as professional audio polish.

**Q: Can customers tell I'm using voice modification?**
A: When used moderately (±5 pitch, ±10% formant), modifications sound natural and professional.

**Q: Which preset is best for sales calls?**
A: "Professional" or "Confident" for most B2B calls. "Friendly" or "Energetic" for B2C outreach.

## Technical

**Q: Why can't VoicePro output directly to RingCentral?**
A: Browser security prevents creating virtual audio devices. Use a virtual audio cable for routing.

**Q: What sample rate does VoicePro use?**
A: 48kHz, the standard for high-quality voice processing.

**Q: Is my audio data sent to any servers?**
A: No. All audio processing happens locally in your browser. Only settings and status sync with the server.

## Admin

**Q: Can I force settings on agents?**
A: You can create Team Presets that agents can apply, but agents control their own settings.

**Q: How do I onboard 50 agents quickly?**
A: Create standard Team Presets and share the link. Agents register themselves and apply team presets.

**Q: Can I see usage analytics?**
A: Yes. The Analytics tab shows feature adoption, preset popularity, and agent status distribution.

---

# Support

For additional support:
- Contact your system administrator
- Check for updates to this guide
- Report bugs through your IT helpdesk

---

*VoicePro v2.0 - Audio Processing for Sales Teams*
*Last Updated: December 2025*
