# 🔧 Noise Reduction & Voice Modifier Not Working - Debug Guide

## Quick Diagnosis Steps

### Step 1: Open Browser Console
Press `F12` to open Developer Tools and go to the **Console** tab.

### Step 2: Start Audio Processing
1. Click **Start Audio Processing**
2. Look for this console message:
   ```
   VoxFilter: initialize() success
   ```
3. If initialization fails, you should see:
   ```
   VoxFilter: initialize() failed:
   ```
   And you should be able to retry without refreshing.

### Step 3: Enable Noise Reduction
1. Turn on the "Noise Reduction" switch
2. Look for console messages (should see filter frequency changes)
3. Expected log:
   ```
   VoxFilter: noiseReduction applied
   ```

### Step 4: Enable Voice Modifier
1. Turn on the "Voice Modifier" switch  
2. Look for:
   ```
   VoxFilter: accent applied
   ```

---

## Common Issues & Fixes

### Issue 1: "Audio processing not started"

**Symptom**: Toggles don't do anything, no console logs

**Fix**:
1. Click **Start Audio Processing** first
2. Allow microphone permission when browser asks
3. Wait for "Processing" badge to show green

---

### Issue 2: You can’t hear any difference (monitor/output routing)

**Symptom**: Processing is running, but you can’t hear the processed audio.

**Fix**:
1. Scroll to **Audio Output Routing**
2. Click **Enable Audio Output**
3. If you want routing into a call app:
   - Select **CABLE Input (VB-Audio)** / **BlackHole 2ch** in the output dropdown
   - Click **Enable Audio Output** again
4. If the UI shows **Blocked**, click Enable again (or allow autoplay/audio output when prompted).

---

### Issue 3: "Settings reset when toggled"

**Symptom**: Turn on toggle, but nothing happens

**Root Cause**: Race condition between local state and server updates

**Fix**: Already implemented debouncing, but let me check if it's working

---

### Issue 4: "Audio is muted"

**Symptom**: Processing is on, but can't hear anything

**Check**:
1. Look at the **Audio Output Routing** status chips (Monitor/Virtual/Blocked/Failed)
2. Check your system volume
3. Check if browser tab is muted (look for speaker icon in tab)

---

## Manual Testing in Console

Open browser console and run these commands:

### Use the built-in self-test (preferred)
1. Scroll to **Audio Output Routing**
2. Click **Test Processed Audio (3s)**
3. Review the per-step report (including the routing method and any errors)

---

## Expected Behavior

### Noise Reduction ON:
```
High-pass filter: 80Hz → 200Hz (cuts low rumble)
Low-pass filter: 8000Hz → 5000Hz (cuts high hiss)  
Noise gate threshold: -50dB → -25dB (more aggressive)
Ratio: 12:1 → 20:1
```

### Voice Modifier ON (Deeper voice):
```
F1 (bass): +15dB boost at 200Hz
F2 (mids): -8dB cut at 1200Hz
F3 (highs): -12dB cut at 3000Hz
Voice body: +12dB boost below 300Hz
```

---

## Most Common Root Cause (in the wild)

If users report “no difference” it’s usually one of:
- **Processing is OFF** (UI shows the OFF banner, controls are disabled)
- **Output routing isn’t enabled** (Monitor/Virtual is inactive/blocked/failed)
- **Call app mic is not set to the virtual mic input** (CABLE Output / BlackHole)
