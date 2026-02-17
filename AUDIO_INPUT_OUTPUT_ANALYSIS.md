# Audio Input/Output Analysis & Issues

**Date**: February 12, 2026  
**Analysis**: Voice processing pipeline audit

---

## Current Audio Routing

### Input Chain
```
Microphone Input
  ↓ (constraints: echo cancellation ON, auto gain OFF, noise suppression OFF)
AudioContext Source Node
  ↓
Input Gain (user adjustable)
  ↓
High-Pass Filter (80Hz) - removes rumble
  ↓
Notch Filter (60Hz) - removes electrical hum
  ↓
Low-Pass Filter (8kHz) - removes hiss
  ↓
Noise Gate (dynamics compressor)
  ↓
Voice Body Filter - warmth adjustment
  ↓
Formant Filter 1 (500Hz) - voice character
  ↓
Formant Filter 2 (1500Hz) - brightness
  ↓
Formant Filter 3 (2800Hz) - clarity
  ↓
Clarity Filter (4kHz boost)
  ↓
Normalizer (dynamics compressor)
  ↓
Output Gain (user adjustable)
  ↓
Analyser (for visualization)
  ↓
MediaStreamDestination (processed output)
```

### Output Routing (Auto-enabled on start)
The processed audio is routed to **TWO destinations**:

1. **Monitor Output** (`monitorOutputRef`) → **Speakers/Headphones**
   - So user can hear their processed voice
   - Uses real speaker device (avoids virtual cable)

2. **Virtual Cable Output** (`audioOutputRef`) → **VB-Audio/BlackHole**
   - For apps like RingCentral to capture
   - Looks for "cable input", "vb-audio", "blackhole" devices

---

## 🚨 POTENTIAL ISSUES

### 1. **Echo/Feedback Loop** 🔴 CRITICAL
**Problem**: The monitor output plays processed audio through speakers while microphone is active.

**Result**:
```
Microphone picks up sound
  ↓
Processed and played through speakers
  ↓
Microphone picks up the speaker output again (FEEDBACK!)
  ↓
Processed again...
  ↓
ECHO LOOP!
```

**Evidence in code**:
```typescript
// Line 329: Monitor always active!
monitorOutputRef.current.srcObject = destination.stream;
monitorOutputRef.current.autoplay = true;
```

### 2. **Double Audio Routing** 🟠 HIGH
Both `audioOutputRef` AND `monitorOutputRef` are playing the same stream:
- Line 329: `monitorOutputRef` → speakers
- Line 359: `audioOutputRef` → virtual cable
- Both set to `autoplay = true`

**Problem**: User hears BOTH direct and processed audio if using headphones incorrectly.

### 3. **No Echo Cancellation on Processed Output** 🟡 MEDIUM
```typescript
// Line 124: Native echo cancellation is ON for input
echoCancellation: true,

// But processed output goes back to speakers WITHOUT echo cancellation
// This can cause feedback if using speakers instead of headphones
```

### 4. **Missing Headphone Detection** 🟡 MEDIUM
The app doesn't check if user has **headphones** vs **speakers**:
- **Headphones**: Safe - no feedback
- **Speakers**: Dangerous - high chance of feedback loop

### 5. **Latency Issues** 🟡 MEDIUM
Current latency calculation (line 290):
```typescript
const latency = (audioContext.baseLatency || 0) * 1000 + 
                (audioContext.outputLatency || 0) * 1000;
```

**Typical values**:
- Base latency: 10-20ms
- Output latency: 10-30ms
- **Total**: 20-50ms minimum

**Plus**:
- Processing chain delay: ~10-20ms (11 audio nodes)
- Virtual cable routing: +10-30ms
- **Real-world latency**: 40-100ms

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
