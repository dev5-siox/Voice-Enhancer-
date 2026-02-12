# ✅ Audio Libraries Setup - Quick Summary

## Current Status

🔄 **Ubuntu WSL is currently installing** (started ~4 minutes ago)

This typically takes **5-10 minutes total**.

---

## What Happens Next

### When Ubuntu Finishes Installing:

1. **You'll see a terminal window** asking you to create a username and password
2. **Create your credentials**:
   ```
   Enter new UNIX username: yourusername
   New password: ********
   Retype new password: ********
   ```
3. **Run the setup script** (detailed steps below)

---

## Quick Setup (After Ubuntu Is Ready)

### Option A: Automatic Setup (Easiest!) ✅

```powershell
# Run the helper script
.\start-wsl-setup.ps1

# Answer 'Y' when prompted
# It will open Ubuntu WSL and show you the commands
```

### Option B: Manual Setup

**Step 1: Open Ubuntu**
```powershell
wsl -d Ubuntu
```

**Step 2: Navigate to project**
```bash
cd /mnt/c/Dev/Github/VoiceEnhancer/tests
```

**Step 3: Run setup script**
```bash
bash setup-wsl.sh
```

This will automatically:
- ✅ Install Node.js (if needed)
- ✅ Install build tools
- ✅ Install npm dependencies
- ✅ Install audio processing libraries (wav-decoder, fft.js, etc.)
- ✅ Install Playwright browsers
- ✅ Generate test audio files

**Time: ~5-10 minutes**

---

## Running Tests (After Setup)

### Start Dev Server (Windows PowerShell)
```powershell
cd C:\Dev\Github\VoiceEnhancer
npm run dev
```

Keep this running!

### Run Tests (WSL Ubuntu Terminal)
```bash
# In WSL
cd /mnt/c/Dev/Github/VoiceEnhancer/tests

# Run all tests (~2 minutes)
npm test

# Or run specific test
npx playwright test -g "Baseline"

# Or run with UI
npm run test:ui
```

### View Results
```bash
# Open Playwright report
npm run test:report

# View JSON analysis
cat results/test-1-baseline.json

# View HTML report in Windows browser
explorer.exe results/test-report.html
```

---

## Checking Installation Status

```powershell
# Check if Ubuntu is ready
wsl --list --verbose

# You'll see:
#   NAME           STATE      VERSION
# * Ubuntu         Running    2        <- Ready!
#   Ubuntu         Stopped    2        <- Ready, just start it
#   docker-desktop Stopped    2
```

---

## What You'll Get

### Generated Test Audio Files
```
tests/test-audio/
├── sine-sweep-100-8000hz.wav       # Frequency response test
├── white-noise.wav                  # Noise floor test
├── pink-noise.wav                   # Realistic noise spectrum
├── voice-synthesis-male.wav         # Synthetic voice
├── clean-voice-sample.wav           # Clean reference
├── voice-with-office-noise.wav      # Office + voice
├── voice-with-keyboard-noise.wav    # Typing + voice
└── impulse.wav                      # Latency test
```

### Test Results (after running tests)
```
tests/results/
├── test-1-baseline.json             # Raw audio metrics
├── test-2-nr-low.json              # 25% noise reduction
├── test-3-nr-high.json             # 75% noise reduction
├── test-4-voice-clear.json         # Clear preset
├── test-5-voice-deeper.json        # Deeper preset
├── test-6-combined.json            # Real-world scenario
├── test-7-latency.json             # Performance
├── test-8-regression.json          # Regression tests
└── test-report.html                # Visual report
```

### Metrics You'll See
```json
{
  "snr": 42.3,                    // Signal-to-Noise Ratio (dB)
  "thd": 2.1,                     // Distortion (%)
  "peakLevel": -3.2,              // Peak level (dBFS)
  "rmsLevel": -18.5,              // RMS level (dBFS)
  "frequencyResponse": {
    "flatness": 2.8,              // ±2.8 dB deviation
    "lowCutoff": 105,             // Bass cutoff (Hz)
    "highCutoff": 7850            // Treble cutoff (Hz)
  },
  "noiseReduction": 12.5,         // Noise reduced (dB)
  "voicePreservation": 96.3,      // Voice quality (%)
  "musicalNoise": 1.2,            // Artifacts (0-10)
  "overallQuality": 92            // Quality score (0-100)
}
```

---

## Troubleshooting

### Ubuntu installation stuck?
```powershell
# Check Windows Task Manager
# Look for "wsl.exe" process
# If stuck for >15 minutes, restart computer and try again
```

### Can't find project in WSL?
```bash
# Windows C: drive is at /mnt/c/
cd /mnt/c/Dev/Github/VoiceEnhancer/tests
```

### Permission denied?
```bash
sudo chown -R $USER:$USER /mnt/c/Dev/Github/VoiceEnhancer/tests
```

### Tests fail with "Cannot connect"?
```bash
# Make sure dev server is running in Windows
# In Windows PowerShell: npm run dev
```

---

## Alternative: GitHub Actions (No Local Setup)

Don't want to wait for WSL? Use GitHub Actions instead!

### Create `.github/workflows/audio-tests.yml`:
```yaml
name: Audio Quality Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci && cd tests && npm ci
      - run: cd tests && npm install wav-decoder audiobuffer-to-wav fft.js
      - run: cd tests && npx playwright install --with-deps chromium
      - run: cd tests && npm run test:generate-samples
      - run: npm run dev &
      - run: npx wait-on http://localhost:5000
      - run: cd tests && npm test
      - uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/results/
```

Push to GitHub and tests run automatically!

---

## Timeline

| Event | Status | Time |
|-------|--------|------|
| Ubuntu installation started | ✅ Done | ~4 min ago |
| Ubuntu ready | 🔄 In Progress | ~1-6 min remaining |
| Run setup script | ⏳ Waiting | ~5-10 min |
| Ready to test | ⏳ Waiting | ~10-20 min total |

---

## Quick Commands Reference

```bash
# Check Ubuntu status
wsl --list --verbose

# Start Ubuntu
wsl -d Ubuntu

# Navigate to project (in WSL)
cd /mnt/c/Dev/Github/VoiceEnhancer/tests

# Run setup (in WSL)
bash setup-wsl.sh

# Run tests (in WSL, after setup)
npm test

# View report (in WSL)
npm run test:report
```

---

## Files Created for You

✅ **AUDIO_LIBRARIES_SETUP.md** - Comprehensive setup guide  
✅ **tests/setup-wsl.sh** - Automated setup script  
✅ **start-wsl-setup.ps1** - Windows helper script  
✅ **This file** - Quick reference  

---

## Next Step

**Wait for Ubuntu to finish installing**, then run:

```powershell
.\start-wsl-setup.ps1
```

Or manually check:
```powershell
wsl --list --verbose
```

When you see Ubuntu is "Running" or "Stopped" (not "Installing"), you're ready to go!

---

**Questions? Check:**
- Full guide: `AUDIO_LIBRARIES_SETUP.md`
- Setup summary: `SETUP_COMPLETE.md`
- Test docs: `tests/README.md`

🎙️ **Almost there!**
