#+#+#+#+  Purpose

This document summarizes the **current** VoxFilter audio I/O behavior (web + Electron) and the most common failure modes, in a way that matches what the app actually does today.

If you’re debugging a user report, prefer:
- `docs/debug/repro-checklist.md`
- `docs/debug/evidence-ledger.md`

---

## Current audio pipeline (conceptual)

### Input chain (Web Audio)
Mic → WebAudio processing chain → `MediaStreamDestination` (processed stream)

### Output routing (explicit user action)
Routing happens only after the user clicks **Enable Audio Output** in **Audio Output Routing**.

- **Web (browser)**:
  - **Monitor** uses `HTMLAudioElement.play()` (may be blocked by autoplay policy).
  - **Virtual** uses `HTMLMediaElement.setSinkId()` + `play()` (requires Chrome/Edge and https/localhost).

- **Desktop (Electron)**:
  - **Virtual** uses **native app output routing** (`webContents.setAudioOutputDevice`) + `play()`.
  - Autoplay policy is relaxed for the app, but we still keep explicit UX and status chips.

### What the “Virtual cable” actually means
The app routes audio to the **virtual cable output device** (e.g. **CABLE Input** / **BlackHole**). Your call app must then use the corresponding **virtual mic input** (e.g. **CABLE Output** / **BlackHole**) as its microphone.

---

## Common failure modes (and how they surface now)

### 1) “No difference” / “noise reduction doesn’t work”
Usually one of:
- Processing is **OFF** (UI shows OFF banner and effect controls are gated)
- Output routing is **Inactive/Blocked/Failed**
- Call app mic isn’t set to the virtual mic input (CABLE Output / BlackHole)

### 2) Autoplay blocked (web)
Monitor/Virtual shows **Blocked** and the UI provides next-step text. Retrying **Enable Audio Output** from a user gesture usually resolves it.

### 3) `setSinkId` unsupported (web)
Virtual shows **Unsupported** with next-step guidance (use Chrome/Edge, https/localhost).

### 4) Feedback/echo
Monitor output on speakers can create feedback. Recommend headphones or disabling monitor while using virtual routing.

---

## Recommended proof points (support-ready)
- Run **Test Processed Audio (3s)** and export the report:
  - Confirms raw + processed track counts
  - Lists audio output devices
  - Attempts playback + routing
  - Shows routing method (**Electron native** vs **browser setSinkId**) in the step list

Users might hear a noticeable delay.

---

## 🎯 RECOMMENDED FIXES

### Fix 1: Add Monitor Control (User Choice)
```typescript
// Don't auto-enable monitor - let user choose
setState((prev) => ({
  ...prev,
  isMonitorEnabled: false  // Default to OFF
}));

// Add toggle function
const toggleMonitor = useCallback((enabled: boolean) => {
  if (enabled && monitorOutputRef.current && processedStreamRef.current) {
    monitorOutputRef.current.srcObject = processedStreamRef.current;
    monitorOutputRef.current.play();
  } else if (monitorOutputRef.current) {
    monitorOutputRef.current.pause();
    monitorOutputRef.current.srcObject = null;
  }
}, []);
```

### Fix 2: Warn About Feedback
```typescript
// Detect if speakers are being used
const warnAboutFeedback = () => {
  const usingVirtualCable = outputDevices.some(d => 
    d.label.toLowerCase().includes('cable')
  );
  
  if (!usingVirtualCable) {
    // Warn user: "Use headphones to avoid feedback!"
    setState(prev => ({
      ...prev,
      warning: "⚠️ Use headphones to prevent echo/feedback when monitoring is enabled"
    }));
  }
};
```

### Fix 3: Mute Original Microphone
```typescript
// After creating processed stream, mute the original
streamRef.current.getAudioTracks().forEach(track => {
  track.enabled = false; // Don't send raw mic to output
});

// Only use the processed stream for output
```

### Fix 4: Add Side-tone Control
Instead of full monitor, add adjustable "side-tone":
```typescript
const sidetoneGainNode = audioContext.createGain();
sidetoneGainNode.gain.value = 0.3; // 30% volume for self-monitoring

// Connect to monitor with reduced volume
outputGain.connect(sidetoneGainNode);
sidetoneGainNode.connect(monitorDestination);
```

### Fix 5: Better Virtual Cable Detection
```typescript
// More reliable virtual cable detection
const virtualCableKeywords = [
  'cable input', 'vb-audio', 'blackhole', 
  'virtual', 'loopback', 'voicemeeter'
];

const isVirtualCable = (device: MediaDeviceInfo) => {
  const label = device.label.toLowerCase();
  return virtualCableKeywords.some(keyword => label.includes(keyword));
};
```

---

## 🔍 DIAGNOSIS QUESTIONS

To understand what's actually wrong, please answer:

1. **What symptoms are you experiencing?**
   - [ ] Echo (hearing your voice repeated)
   - [ ] Feedback (high-pitched squealing)
   - [ ] Delayed sound (latency > 100ms)
   - [ ] Robotic/choppy voice
   - [ ] No output at all
   - [ ] Volume too low/high
   - [ ] Other: _________________

2. **Audio Setup:**
   - Using: [ ] Headphones  [ ] Speakers
   - Virtual Cable: [ ] Yes (VB-Audio/BlackHole)  [ ] No
   - App using processed audio: [ ] RingCentral  [ ] Zoom  [ ] Other: _______

3. **When does the problem occur?**
   - [ ] As soon as "Start Processing" is clicked
   - [ ] After a few seconds
   - [ ] Only during calls
   - [ ] Only when certain settings are enabled

4. **Does it work in these scenarios?**
   - Monitor OFF, Virtual Cable ON: [ ] Yes  [ ] No  [ ] Untested
   - Monitor ON, Headphones: [ ] Yes  [ ] No  [ ] Untested
   - Monitor ON, Speakers: [ ] Yes  [ ] No  [ ] Untested

---

## 🛠️ QUICK FIXES TO TRY NOW

### Option A: Disable Auto-Monitor (Safest)
Comment out lines 324-350 in `use-audio-processor.ts`:
```typescript
// // 1. MONITOR OUTPUT - Always route to speakers
// if (!monitorOutputRef.current) {
//   monitorOutputRef.current = new Audio();
//   monitorOutputRef.current.autoplay = true;
// }
// monitorOutputRef.current.srcObject = destination.stream;
```

**Result**: No monitor output, only virtual cable. Use RingCentral's own monitoring.

### Option B: Add Monitor Volume Control
In line 329, add volume control:
```typescript
monitorOutputRef.current.volume = 0.3; // 30% volume (prevent feedback)
```

### Option C: Use Headphones (Immediate)
If using speakers, switch to headphones. This eliminates feedback risk.

---

## 📊 COMPARISON: Before vs Should Be

### Current (Problematic)
```
Input Mic → Processing → [Virtual Cable + Speakers]
                              ↓           ↓
                        RingCentral   User Hears
                        
Problem: Speakers → Mic (FEEDBACK LOOP!)
```

### Should Be
```
Input Mic → Processing → Virtual Cable → RingCentral
                    ↓
                Optional Monitor (Headphones ONLY) → User Hears
```

---

## 🎯 ACTION ITEMS

1. **Answer diagnosis questions above**
2. **Try Quick Fix A (disable auto-monitor)**
3. **Test with headphones**
4. **Check browser console for errors**
5. **Verify virtual cable is detected**

Once I know the specific symptoms, I can apply the exact fix needed!
