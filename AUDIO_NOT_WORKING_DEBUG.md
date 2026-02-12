# 🔧 Noise Reduction & Voice Modifier Not Working - Debug Guide

## Quick Diagnosis Steps

### Step 1: Open Browser Console
Press `F12` to open Developer Tools and go to the **Console** tab.

### Step 2: Start Audio Processing
1. Click the "Start Processing" button
2. Look for these console messages:
   ```
   VoicePro: Audio processing initialized. Processed stream ID: ...
   VoicePro: DUAL OUTPUT ENABLED - Monitor (speakers) + Virtual Cable (RingCentral)
   ```

### Step 3: Enable Noise Reduction
1. Turn on the "Noise Reduction" switch
2. Look for console messages (should see filter frequency changes)
3. If you see "VoicePro: Formant filters not ready yet" - that's the problem!

### Step 4: Enable Voice Modifier
1. Turn on the "Voice Modifier" switch  
2. Look for:
   ```
   %cVoicePro: APPLYING VOICE MOD
   Preset: deeper, FormantShift: -30, PitchShift: 0
   %cVoicePro: FILTERS ACTIVE
   F1: lowshelf @ 200Hz, gain: +9.0dB
   ```

---

## Common Issues & Fixes

### Issue 1: "Audio processing not started"

**Symptom**: Toggles don't do anything, no console logs

**Fix**:
1. Click "Start Processing" button first
2. Allow microphone permission when browser asks
3. Wait for "Processing" badge to show green

---

### Issue 2: "Formant filters not ready yet"

**Symptom**: Voice modifier doesn't work, console shows warning

**Root Cause**: The `applyAccentSettings()` is being called BEFORE audio nodes are created

**Fix Option A** - Quick Test:
1. Start processing
2. Wait 2 seconds
3. THEN turn on voice modifier

**Fix Option B** - Code Fix (I'll apply this):

```typescript
// The issue is that settings are applied too early
// Need to ensure filters exist before applying settings
```

---

### Issue 3: "Settings reset when toggled"

**Symptom**: Turn on toggle, but nothing happens

**Root Cause**: Race condition between local state and server updates

**Fix**: Already implemented debouncing, but let me check if it's working

---

### Issue 4: "Audio is muted"

**Symptom**: Processing is on, but can't hear anything

**Check**:
1. Look for "MONITOR ENABLED" in console
2. Check your system volume
3. Check if browser tab is muted (look for speaker icon in tab)

---

## Manual Testing in Console

Open browser console and run these commands:

### Check if audio context exists:
```javascript
// Paste this in console:
console.log("Audio initialized:", window.audioContextRef ? "YES" : "NO");
```

### Force apply noise reduction:
```javascript
// If you have access to the component, try:
const settings = { 
  noiseReductionEnabled: true, 
  noiseReductionLevel: 75 
};
// Then toggle in UI
```

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

## Quick Test

Run this in your browser console when on the page:

```javascript
// Test if audio nodes are created
console.log("Testing audio nodes...");

// This will tell you if the problem is with initialization
setTimeout(() => {
  console.log("If you see this but no audio changes, the nodes exist but settings aren't applying correctly");
}, 5000);
```

---

## Most Likely Issue

Based on the code, I suspect **Issue #2**: The settings are being applied BEFORE the audio context and filters are fully initialized.

The fix is to ensure `applyNoiseReductionSettings()` and `applyAccentSettings()` are only called AFTER:
1. `audioContextRef.current` exists
2. All filter refs are populated
3. Processing has started

Let me create the fix now...
