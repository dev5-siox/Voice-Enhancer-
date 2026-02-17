# 🎧 How to Use VoiceEnhancer - Simple Guide

## 🖥️ Desktop App (Windows) — Recommended for real calls

The **desktop app** avoids common browser limitations (autoplay blocking / device routing quirks) and is the recommended way to feed processed audio into **any** call app (RingCentral / Zoom / Teams / Meet / Discord / OBS).

### Download + install

- Download the installer: `VoxFilter-<version>-Windows.exe` (or whatever the current filename is in Releases/Artifacts).
- Run the installer and launch **VoxFilter**.

See `ELECTRON_README.md` for the exact download workflow and tag-based releases.

## ✅ You DON'T Need Virtual Cable for Testing!

Virtual cable (VB-Audio) is ONLY needed if you want to use the processed audio in apps like **RingCentral / Zoom / Teams / Meet**. For just testing the audio effects, you can skip it!

---

## 🎯 Quick Start (No Virtual Cable)

### Step 1: Start the App
```bash
npm run dev
```
Open http://localhost:5000

### Step 2: Register
- Enter your name
- Click "Get Started"

### Step 3: Start Processing
1. Click **"Start Audio Processing"** button
2. Allow microphone access when browser asks
3. You'll see audio levels moving

### Step 4: Enable Audio Output ⭐ CRITICAL!
1. Look for the **"Audio Output Routing"** card
2. Click **"Enable Audio Output"** button
3. **NOW YOU CAN HEAR YOUR PROCESSED VOICE!** 🎉
4. Optional: Click **"Test Processed Audio (3s)"** then **"Play last self-test"** to prove the processed stream is live

### Step 5: Test the Effects
Try these settings and **you'll hear the difference**:

**Noise Reduction**:
- Toggle "Noise Reduction" ON
- Move slider to 75%
- **What you'll hear**: Background noise (fan, AC, keyboard) gets quieter

**Voice Modifier**:
- Toggle "Voice Modifier" ON
- Select "Deeper Voice" preset
- **What you'll hear**: Your voice sounds deeper/more bass

**Clarity Boost**:
- Toggle ON
- Move to 50%
- **What you'll hear**: Voice sounds crisper, more present

---

## 🎤 What Each Setting Does

### Input Gain (50-150%)
- **Lower (50%)**: Quieter input, less sensitive
- **Higher (150%)**: Louder input, picks up more

### Noise Reduction (0-100%)
- **0%**: No noise filtering
- **50%**: Moderate - removes fan noise, AC hum
- **100%**: Aggressive - removes ALL background noise (might affect voice quality)

**What it removes**:
- Low rumble (traffic, AC, footsteps)
- Electrical hum (60Hz from power)
- High hiss (white noise, fan noise)
- Keyboard clicks, mouse clicks

### Voice Modifier Presets
- **Deeper Voice**: Adds warmth, bass (male voice)
- **Brighter Voice**: Adds clarity, treble (female voice)
- **Professional**: Balanced, clear, authoritative
- **Warm**: Smooth, intimate, radio voice
- **Clear**: Crisp articulation, podcast quality

### Clarity Boost (0-100%)
- Enhances **presence frequencies** (3-5kHz)
- Makes voice "cut through" better
- Good for: Podcasts, presentations, calls

### Volume Normalization
- **ON**: Keeps volume consistent (loud and quiet parts similar)
- **OFF**: Natural dynamics (whispers quiet, shouts loud)

### Output Gain (50-150%)
- Final volume control
- **100%** = normal
- Adjust based on your headphones/speakers

---

## 🔊 Audio Output Explained

### WITHOUT Virtual Cable (Testing)
```
Your Mic → Processing → Your Speakers/Headphones
```
**YOU hear the processed audio** ✅

### WITH Virtual Cable (For call apps)
```
Your Mic → Processing → Virtual Cable → Call App (RingCentral/Zoom/Teams/Meet/etc)
                     ↓
              Your Headphones (monitor)
```
**YOU hear it AND the app captures it** ✅

---

## 🚨 Common Issues & Fixes

### "I can't hear anything!"

**Solution**:
1. Check if **"Enable Audio Output"** button shows "Active" (green)
2. If not, **click it**!
3. Check browser console (F12) for errors
4. Make sure your speakers/headphones are plugged in
5. Check system volume isn't muted

### "The audio sounds weird/robotic"

**Try**:
1. Lower Noise Reduction to 50%
2. Turn OFF Voice Modifier
3. Lower Clarity Boost to 25%
4. Make sure Input Gain is around 100%

### "I hear an echo"

**Cause**: Using speakers instead of headphones

**Solution**:
1. **Use headphones** (strongly recommended!)
2. OR click "Disable Audio Output" 
3. OR lower monitor volume in code (already set to 50%)

### "There's a delay/latency"

**Expected**: 40-100ms delay is normal

**To reduce**:
1. Use wired headphones (not Bluetooth)
2. Close other audio apps
3. Check latency display (should be 20-80ms)

### "Settings don't seem to change anything"

1. Make sure **"Start Processing"** is clicked (button shows "Stop")
2. Make sure **"Enable Audio Output"** is active (green badge)
3. Try **extreme settings** to test:
   - Noise Reduction: 100%
   - Voice Modifier: "Deeper Voice"
   - You should hear OBVIOUS difference

---

## 🎯 Testing Checklist

### Test 1: Basic Audio
- [ ] Click "Start Processing"
- [ ] Click "Enable Audio Output"
- [ ] **Can you hear yourself?**

### Test 2: Noise Reduction
- [ ] Make background noise (shuffle paper, tap desk)
- [ ] Toggle Noise Reduction OFF
- [ ] **Hear the noise?**
- [ ] Toggle Noise Reduction ON (75%)
- [ ] **Noise should be much quieter!**

### Test 3: Voice Modifier
- [ ] Say "Hello, this is a test"
- [ ] Toggle Voice Modifier OFF
- [ ] Say it again - **note your normal voice**
- [ ] Toggle Voice Modifier ON, select "Deeper Voice"
- [ ] Say it again - **voice should sound NOTICEABLY deeper**

### Test 4: Clarity Boost
- [ ] Set Clarity to 0%
- [ ] Say "The quick brown fox"
- [ ] Set Clarity to 100%
- [ ] Say it again - **should sound crisper, more "present"**

---

## 🎧 Using with a Call App (RingCentral/Zoom/Teams/Meet) — Advanced

### Step 1: Install Virtual Cable
**Windows**: Download VB-Audio Cable from https://vb-audio.com/Cable/
**Mac**: Download BlackHole from https://github.com/ExistentialAudio/BlackHole

### Step 2: In VoiceEnhancer App
1. Start Processing
2. Click "Enable Audio Output"
3. In **Audio Output Routing**, select your virtual cable output device:
   - Windows: **CABLE Input (VB-Audio Virtual Cable)**
   - Mac: **BlackHole 2ch**
4. Confirm the UI shows:
   - **Virtual: Active**
   - **Call app ready: YES** (this just means “virtual cable output is active”)

### Step 3: In your Call App (RingCentral/Zoom/Teams/Meet)
1. Open Settings → Audio
2. Set **Microphone** to: **CABLE Output** (VB-Audio) or **BlackHole 2ch**
3. Set **Speakers** to: Your real speakers/headphones

### Step 4: Monitor Yourself
- VoiceEnhancer automatically routes audio to your speakers
- You'll hear your processed voice
- Your call app will receive the same processed audio

---

## 📊 What Success Looks Like

### You'll see:
- ✅ Green "Processing" badge
- ✅ Audio level meters moving (green bars)
- ✅ Green "Active" badge on "Audio Output Routing"
- ✅ Latency showing 20-80ms

### You'll hear:
- ✅ Your own voice coming through speakers/headphones
- ✅ Background noise reduced when Noise Reduction is ON
- ✅ Voice character change when Voice Modifier is ON
- ✅ Clearer sound when Clarity Boost is ON

### In console (F12):
```
VoxFilter: initialize() success { ... }
VoxFilter: enableOutput() result { ... }
VoxFilter: self-test complete { ... }
```

---

## 🆘 Still Not Working?

### Check Console (F12)
Look for these messages:
- ✅ Good: "MONITOR ENABLED"
- ❌ Bad: "Auto-play blocked"
- ❌ Bad: "No processed stream available"

### Browser Permissions
1. Click the 🔒 lock icon in address bar
2. Check microphone is "Allow"
3. Refresh page if needed

### Try Different Browser
- Chrome (best support)
- Edge (good support)
- Firefox (okay support)
- Safari (might have issues)

---

## 💡 Pro Tips

1. **Always use headphones** to prevent feedback
2. **Start with moderate settings** (50-75%) then adjust
3. **Test with different voices** - what works for one person might not work for another
4. **Background noise?** Try Noise Reduction at 60-80%
5. **Voice too thin?** Try "Deeper Voice" or "Warm" preset
6. **Need authority?** Try "Professional" preset + Clarity 50%
7. **Recording?** Enable Volume Normalization for consistent levels

---

## ✅ Summary

**For Testing** (You):
1. npm run dev
2. Register
3. Start Processing
4. **Click "Enable Audio Output"** ⭐
5. Adjust settings and hear the difference!

**For Real Use** (RingCentral):
1. Install virtual cable
2. Do steps 1-4 above
3. Set RingCentral mic to virtual cable
4. Make calls with processed audio!

**No virtual cable needed for testing!** Just click "Enable Audio Output" and you'll hear everything! 🎉
