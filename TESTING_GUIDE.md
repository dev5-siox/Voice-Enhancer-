# VoicePro Audio Quality Testing Guide

## User Complaint: "Voice is not clear and clean"

This guide will help you systematically test and diagnose audio quality issues reported by users.

---

## 🔍 Quick Diagnostic Checklist

### 1. **Environment Setup Issues**
- [ ] Microphone quality and positioning
- [ ] Background noise level
- [ ] Audio device routing (especially with virtual cables)
- [ ] Browser permissions and settings

### 2. **Processing Settings Issues**
- [ ] Noise reduction too aggressive
- [ ] Voice modification interfering
- [ ] Input/output gain levels
- [ ] Clarity boost settings

### 3. **Technical Issues**
- [ ] High latency causing artifacts
- [ ] Browser audio context limitations
- [ ] Virtual cable configuration
- [ ] Audio buffer issues

---

## 🧪 Testing Procedures

### Test 1: Baseline Audio Quality Test

**Purpose**: Verify raw microphone input quality before processing

**Steps**:
1. Open the app at `http://localhost:5000`
2. Click "Start Audio Processing"
3. **DO NOT enable** any processing features yet
4. Speak normally and check the input level meter
5. Click "Record" and speak for 30 seconds
6. Download and listen to the recording

**What to check**:
- ✅ Clear voice with minimal background noise = Good mic/environment
- ❌ Muffled/distorted even without processing = Hardware/environment issue
- ❌ Very low volume = Gain settings needed

---

### Test 2: Noise Reduction Impact Test

**Purpose**: Determine if noise reduction is degrading voice quality

**Test Cases**:

#### A. Test with Noise Reduction DISABLED
```
Settings:
- Noise Reduction: OFF
- All other features: OFF
```
Record 30 seconds, listen for clarity

#### B. Test with Low Noise Reduction (25%)
```
Settings:
- Noise Reduction: ON
- Intensity: 25%
- All other features: OFF
```
Record 30 seconds, listen for clarity

#### C. Test with Medium Noise Reduction (50%)
```
Settings:
- Noise Reduction: ON
- Intensity: 50% (default)
- All other features: OFF
```
Record 30 seconds, listen for clarity

#### D. Test with High Noise Reduction (75-100%)
```
Settings:
- Noise Reduction: ON
- Intensity: 75% or 100%
- All other features: OFF
```
Record 30 seconds, listen for clarity

**Expected Results**:
- **Too aggressive noise reduction** can cause:
  - Muffled/underwater sound
  - Cut-off word endings
  - Robotic/unnatural tone
  - Loss of voice "warmth"

**Current Implementation Details**:
```javascript
// At 100% intensity:
- High-pass filter: 200 Hz (cuts bass/warmth)
- Low-pass filter: 5000 Hz (cuts clarity/brightness)
- Noise gate threshold: -25 dB (very aggressive)
- Ratio: 20:1 (extreme compression)
```

**Recommended Fix if voice is too muffled**:
- Reduce noise reduction to 30-40%
- OR adjust the filter ranges (see Fix #1 below)

---

### Test 3: Voice Modification Test

**Purpose**: Check if accent/voice presets are degrading quality

**Test Cases**:

#### Test Each Preset Individually
```
For each preset (neutral, deeper, higher, warm, clear, etc.):
1. Enable Accent Modifier
2. Select preset
3. Record 30 seconds
4. Listen for artifacts
```

**Common Issues**:

**"Deeper" Preset Problems**:
- Too much bass boost (+15dB at 200Hz) can cause muddiness
- Excessive high-frequency cut can make voice muffled
- Solution: Reduce formantShift to -25 instead of -50

**"Higher" Preset Problems**:
- Too much bass cut can make voice tinny
- Excessive treble boost can cause sibilance
- Solution: Reduce formantShift to +25 instead of +50

**"Warm" Preset**:
- May reduce clarity by boosting lows too much
- Solution: Reduce low-shelf gain

---

### Test 4: Combined Settings Test

**Purpose**: Test real-world usage with multiple features enabled

**Test Case: Typical Sales Call Setup**
```
Settings:
- Noise Reduction: ON (50%)
- Accent Modifier: ON
- Preset: "professional" or "clear"
- Clarity Boost: 30%
- Volume Normalization: ON
- Input Gain: 100%
- Output Gain: 100%
```

Record and analyze for:
- Overall voice quality
- Artifacts or distortion
- Background noise suppression
- Voice naturalness

---

### Test 5: Latency and Performance Test

**Purpose**: Check if high latency is causing audio artifacts

**Open Browser Console** (F12) and monitor:
```javascript
// Look for these values:
- Latency: Should be < 50ms
- Sample Rate: Should be 48000 Hz
- Input Level: Should spike when speaking
- Output Level: Should match input * output gain
```

**Check for console warnings**:
- "A PostCSS plugin..." - Safe to ignore
- Any Web Audio API errors - Needs attention
- Buffer underrun warnings - May cause crackles

---

### Test 6: Device Routing Test (Most Common Issue)

**Purpose**: Verify audio is routed correctly

**Check Output Configuration**:
1. Open browser console (F12)
2. Look for these messages:
   ```
   VoicePro: MONITOR ENABLED - You can now hear your processed voice!
   VoicePro: Virtual cable output set to: [device name]
   VoicePro: DUAL OUTPUT ENABLED - Monitor (speakers) + Virtual Cable
   ```

3. If you see "Could not auto-enable output", manually:
   - Click the output device selector
   - Choose your virtual cable (VB-Audio Cable Input / BlackHole)
   - Verify the user can hear their processed voice

**Common Routing Issues**:
- ❌ Output going to wrong device
- ❌ Virtual cable not installed
- ❌ Volume muted on virtual cable
- ❌ RingCentral not listening to virtual cable

---

### Test 7: Browser Comparison Test

**Purpose**: Rule out browser-specific issues

Test the same setup in:
- ✅ Google Chrome (recommended)
- ⚠️ Microsoft Edge (should work)
- ❌ Firefox (may have Web Audio API differences)
- ❌ Safari (limited Web Audio support)

---

## 🔧 Common Fixes

### Fix #1: Reduce Noise Reduction Aggressiveness

**Problem**: Voice sounds muffled or underwater

**Solution**: Modify `use-audio-processor.ts` lines 376-383:

```typescript
// BEFORE (too aggressive):
highPassRef.current.frequency.value = 80 + intensity * 120; // 80-200 Hz
lowPassRef.current.frequency.value = 8000 - intensity * 3000; // 8000-5000 Hz

// AFTER (more gentle):
highPassRef.current.frequency.value = 80 + intensity * 70; // 80-150 Hz
lowPassRef.current.frequency.value = 8000 - intensity * 1500; // 8000-6500 Hz
```

This preserves more of the voice's natural frequency range.

---

### Fix #2: Reduce Voice Modification Intensity

**Problem**: Accent presets sound too artificial

**Solution**: Modify `use-audio-processor.ts` lines 420-450:

```typescript
// For DEEPER voice, reduce the bass boost:
// BEFORE:
f1.gain.value = intensity * 15; // +15dB

// AFTER:
f1.gain.value = intensity * 8; // +8dB (more subtle)

// For HIGHER voice, reduce the bass cut:
// BEFORE:
f1.gain.value = -intensity * 15; // -15dB

// AFTER:
f1.gain.value = -intensity * 8; // -8dB (more subtle)
```

---

### Fix #3: Add Pre-emphasis/De-emphasis for Natural Sound

**Problem**: Voice lacks natural warmth despite processing

**Solution**: Add a subtle presence boost to all presets in `use-audio-processor.ts`:

```typescript
// Add after line 206:
const presenceFilter = audioContext.createBiquadFilter();
presenceFilter.type = "peaking";
presenceFilter.frequency.value = 3000; // Speech clarity range
presenceFilter.Q.value = 1.0;
presenceFilter.gain.value = 2; // Subtle +2dB boost
presenceFilterRef.current = presenceFilter;

// Add to audio chain after line 242:
formantFilter2.connect(presenceFilter);
presenceFilter.connect(formantFilter3);
```

---

### Fix #4: Adjust Noise Gate for Better Voice Preservation

**Problem**: Word endings are getting cut off

**Solution**: Modify `use-audio-processor.ts` lines 157-163:

```typescript
// BEFORE:
noiseGate.threshold.value = -50;
noiseGate.attack.value = 0.003;
noiseGate.release.value = 0.25;

// AFTER (faster attack, slower release):
noiseGate.threshold.value = -50;
noiseGate.attack.value = 0.001; // Faster attack
noiseGate.release.value = 0.5;  // Slower release to avoid cutting words
```

---

### Fix #5: Add Limiter to Prevent Distortion

**Problem**: Loud sounds cause distortion

**Solution**: Add a limiter after the normalizer in `use-audio-processor.ts`:

```typescript
// Add after line 215:
const limiter = audioContext.createDynamicsCompressor();
limiter.threshold.value = -1;
limiter.knee.value = 0;
limiter.ratio.value = 20;
limiter.attack.value = 0.001;
limiter.release.value = 0.01;
limiterRef.current = limiter;

// Update audio chain (line 247):
normalizer.connect(limiter);
limiter.connect(outputGain);
```

---

## 📊 Debugging Tools

### Browser Console Commands

Open the browser console and paste these for live diagnostics:

```javascript
// 1. Check current audio context state
console.log("Audio Context State:", audioContext?.state);
console.log("Sample Rate:", audioContext?.sampleRate);
console.log("Base Latency:", audioContext?.baseLatency * 1000 + "ms");

// 2. Monitor real-time audio levels
setInterval(() => {
  const analyser = analyserNodeRef.current;
  if (analyser) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b) / data.length;
    console.log("Audio Level:", Math.round(avg), "/255");
  }
}, 1000);

// 3. Check filter settings
console.log("High-pass freq:", highPassRef.current?.frequency.value);
console.log("Low-pass freq:", lowPassRef.current?.frequency.value);
console.log("Noise gate threshold:", noiseGateRef.current?.threshold.value);
```

---

## 🎯 Recommended Default Settings for Best Quality

Based on testing, these settings provide the best balance:

```javascript
{
  noiseReductionEnabled: true,
  noiseReductionLevel: 40, // Lower than default 50
  accentModifierEnabled: false, // Only enable if truly needed
  accentPreset: "neutral",
  clarityBoost: 20, // Subtle presence boost
  volumeNormalization: true,
  inputGain: 100,
  outputGain: 100
}
```

---

## 📝 User Feedback Questions

When users report clarity issues, ask:

1. **"Can you describe what 'not clear' means?"**
   - Muffled/underwater?
   - Tinny/robotic?
   - Background noise too loud?
   - Voice too quiet?

2. **"What settings are you using?"**
   - Get screenshot of their settings
   - Check noise reduction level
   - Check which preset they're using

3. **"Does it sound bad to YOU or to the LISTENER?"**
   - Monitor output vs. final output issue
   - Helps identify routing problems

4. **"Does it happen in all apps or just RingCentral?"**
   - Narrows down to integration issue
   - Virtual cable configuration

5. **"What microphone and headset are you using?"**
   - USB headset vs. built-in mic
   - Quality of hardware matters

---

## 🚀 Quick Test Script

Run this automated test sequence:

```bash
# 1. Open the app
Start-Process "http://localhost:5000"

# 2. Manual testing checklist (perform in browser):
# ✓ Start processing
# ✓ Check input levels (should be 30-70 when speaking)
# ✓ Test with noise reduction OFF
# ✓ Test with noise reduction 25%
# ✓ Test with "clear" preset
# ✓ Test with "professional" preset
# ✓ Record a sample and download
# ✓ Check console for errors
```

---

## 📞 Real-World Integration Test with RingCentral

### Setup:
1. Install VB-Audio Virtual Cable (Windows) or BlackHole (Mac)
2. Start VoicePro and begin processing
3. Configure RingCentral:
   - Settings → Audio → Microphone: "VB-Audio Cable Input" or "BlackHole"
4. Make a test call (use RingCentral test service)
5. Ask the listener about quality

### What to check:
- Does RingCentral show correct input device?
- Can the other person hear you clearly?
- Is there echo or feedback?
- Any dropouts or artifacts?

---

## 🆘 Escalation Criteria

Contact the development team if:
- Multiple users report the same issue
- Issue persists with all settings at minimum
- Quality is worse WITH processing than without
- Browser console shows Web Audio errors
- Recordings sound good but live calls don't

---

## 📈 Quality Metrics to Track

Create a testing log:

```csv
Date,Tester,Settings,Quality Rating (1-10),Issues,Notes
2025-12-01,John,NR:50% Clear,7,Slightly muffled,Try 40%
2025-12-01,Sarah,NR:30% Neutral,9,Great quality,Recommended
```

This helps identify patterns and optimal settings.
