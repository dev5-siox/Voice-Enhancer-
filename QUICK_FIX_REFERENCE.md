# VoicePro Quick Fix Reference Card

## 🚨 Emergency Quick Fixes

### Problem: Voice sounds MUFFLED or UNDERWATER
**Likely Cause**: Noise reduction too aggressive
```
✅ QUICK FIX:
1. Reduce Noise Reduction to 30-40%
2. Disable Voice Modifier temporarily
3. Test with recording
```

### Problem: Voice sounds TINNY or ROBOTIC
**Likely Cause**: Too much high-frequency boost
```
✅ QUICK FIX:
1. Disable Voice Modifier
2. Reduce Clarity Boost to 0-20%
3. Check accent preset (use "neutral")
```

### Problem: Words GETTING CUT OFF
**Likely Cause**: Noise gate too aggressive
```
✅ QUICK FIX:
1. Reduce Noise Reduction to 25-35%
2. Speak slightly louder
3. Increase Input Gain to 110-120%
```

### Problem: BACKGROUND NOISE still audible
**Likely Cause**: Noise reduction too low OR bad mic position
```
✅ QUICK FIX:
1. Increase Noise Reduction to 60-70%
2. Move closer to microphone (6-12 inches)
3. Check for environmental noise sources
```

### Problem: Voice TOO QUIET for listeners
**Likely Cause**: Low output gain
```
✅ QUICK FIX:
1. Increase Output Gain to 120-150%
2. Enable Volume Normalization
3. Check output device volume in Windows/Mac
```

### Problem: Voice sounds DISTORTED or CLIPPING
**Likely Cause**: Input too loud
```
✅ QUICK FIX:
1. Reduce Input Gain to 70-80%
2. Move slightly back from microphone
3. Reduce Output Gain if needed
```

---

## 🎯 Optimal Settings by Environment

### 🏢 Quiet Office
```
Noise Reduction: 30%
Voice Modifier: OFF or "professional"
Clarity Boost: 20%
Volume Normalization: ON
Input Gain: 100%
Output Gain: 100%
```

### 🏠 Home Office (Moderate Noise)
```
Noise Reduction: 50%
Voice Modifier: "clear" or "professional"
Clarity Boost: 30%
Volume Normalization: ON
Input Gain: 110%
Output Gain: 100%
```

### ☕ Coffee Shop / High Noise
```
Noise Reduction: 70%
Voice Modifier: OFF (focus on noise reduction)
Clarity Boost: 40%
Volume Normalization: ON
Input Gain: 120%
Output Gain: 100%
```

### 🎙️ Studio / Professional
```
Noise Reduction: 40%
Voice Modifier: "professional" or "authoritative"
Clarity Boost: 20%
Volume Normalization: ON
Input Gain: 100%
Output Gain: 100%
```

---

## 🔧 5-Minute Troubleshooting Checklist

1. **[ ] Check microphone input level**
   - Should be 40-70% when speaking normally
   - If too low: increase Input Gain
   - If too high: decrease Input Gain or move back

2. **[ ] Test without ANY processing**
   - Turn OFF Noise Reduction
   - Turn OFF Voice Modifier
   - If still bad → hardware/environment issue

3. **[ ] Record a 30-second sample**
   - Speak clearly at normal volume
   - Listen to playback
   - Compare with/without processing

4. **[ ] Check output routing**
   - Verify virtual cable is selected (for RingCentral)
   - Check Windows/Mac audio settings
   - Test in RingCentral test call

5. **[ ] Restart if needed**
   - Stop audio processing
   - Close and reopen browser tab
   - Re-enable and test

---

## 🎤 Microphone Best Practices

### ✅ DO:
- Position mic 6-12 inches from mouth
- Use a pop filter or foam windscreen
- Speak at consistent volume
- Face the microphone directly
- Use a quality USB headset ($30+)

### ❌ DON'T:
- Use built-in laptop mic (if possible)
- Eat/drink while on calls
- Have fan blowing directly at mic
- Sit too far from microphone (>18 inches)
- Use damaged or low-quality mic

---

## 🆘 When to Escalate

Contact support if:
- ❌ ALL settings produce poor quality
- ❌ Quality worse WITH processing than without
- ❌ Browser console shows errors
- ❌ Multiple users report same issue
- ❌ Virtual cable not working

---

## 📊 Testing Protocol (2 minutes)

```
1. Start processing → Listen to monitor output
   ↓
2. Is YOUR voice clear to YOU?
   NO → Adjust input/noise reduction
   YES → Continue
   ↓
3. Record 30-second sample → Download and listen
   ↓
4. Is RECORDING clear?
   NO → Adjust settings and re-test
   YES → Continue
   ↓
5. Test in actual call (RingCentral)
   ↓
6. Can OTHER PERSON hear you clearly?
   NO → Check output routing/virtual cable
   YES → ✅ Success!
```

---

## 💻 Browser Console Quick Checks

Press F12, then paste:

```javascript
// Check if audio is processing
console.log("Processing active:", document.querySelector('[data-testid="button-stop-processing"]') !== null);

// Check audio levels
// (Look for "Input Level" and "Output Level" on page)

// Check for errors
console.error.length ? "❌ Errors found" : "✅ No errors";
```

---

## 📞 RingCentral Integration Checklist

1. **[ ] Virtual cable installed**
   - Windows: VB-Audio Virtual Cable
   - Mac: BlackHole 2ch

2. **[ ] VoicePro output = Virtual Cable**
   - Check output device selector
   - Should say "Cable Input" or "BlackHole"

3. **[ ] RingCentral input = Virtual Cable**
   - RingCentral Settings → Audio
   - Microphone: "VB-Audio Cable Output" or "BlackHole"

4. **[ ] Test call**
   - Use RingCentral test service
   - Ask colleague to verify audio quality

---

## 🎓 Understanding the Settings

### Noise Reduction (0-100%)
- **0-25%**: Minimal filtering, natural sound
- **25-50%**: Balanced (recommended for most)
- **50-75%**: Aggressive filtering (noisy environments)
- **75-100%**: Very aggressive (may affect voice quality)

### Input Gain (0-200%)
- **50-80%**: Speak very close to mic
- **90-110%**: Normal speaking distance
- **120-150%**: Quiet mic or far from source
- **150+**: Last resort for very quiet mics

### Clarity Boost (0-100%)
- **0%**: No enhancement
- **10-30%**: Subtle presence boost
- **30-50%**: Noticeable clarity improvement
- **50+**: Risk of sibilance (harsh 's' sounds)

### Voice Modifiers
- **neutral**: No change
- **clear**: +2dB @ 3-5kHz (recommended)
- **professional**: Balanced warmth + clarity
- **deeper/higher**: Dramatic changes (use sparingly)

---

## 📝 Quick Decision Tree

```
Voice issue?
├── Muffled? → Reduce noise reduction
├── Tinny? → Disable voice modifier
├── Cut off? → Reduce noise gate (lower NR %)
├── Noisy? → Increase noise reduction
├── Quiet? → Increase output gain
└── Distorted? → Reduce input gain
```

---

## 🔗 Resources

- **Full Testing Guide**: `TESTING_GUIDE.md`
- **Interactive Tester**: `test-audio-quality.html`
- **Diagnostics Script**: `diagnostics.js` (run in browser console)
- **User Guide**: `USER_GUIDE.md`

---

## ⚡ Ultra-Quick Reset to Defaults

If everything is broken:
1. Stop audio processing
2. Set all to these values:
   - Noise Reduction: ON, 40%
   - Voice Modifier: OFF
   - Clarity Boost: 20%
   - Volume Normalization: ON
   - Input Gain: 100%
   - Output Gain: 100%
3. Start processing and test

---

**Last Updated**: 2025-12-01
**Version**: 1.0
