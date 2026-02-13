# VoxFilter (Web) — Deterministic Reproduction Checklist (Local Dev)

This checklist is designed to **prove** (with UI state + console evidence) whether:

- **Processing is OFF vs ON** (state gate)
- A **processed stream exists** (track counts, `AudioContext` state + sample rate)
- **Routing works**:
  - **Local monitor playback** (speakers/headphones)
  - **Virtual cable playback** (VB-Audio / BlackHole) suitable for RingCentral Desktop

## Local dev setup

- **Install**: `npm install`
- **Run**: `npm run dev`
- **Open**: Chrome or Edge (recommended) at the dev URL.
- **Open DevTools console**.

## 1) Prove gating: Processing OFF vs ON

### 1A. When processing is OFF

1. Load the page.
2. Confirm the UI shows **Start Audio Processing** button.
3. Confirm the UI shows the banner **“Audio processing is OFF”**.
4. Confirm these controls are **disabled** until processing starts:
   - **Noise Reduction** switch + intensity slider
   - **Voice Modifier** switch + preset + formant slider

Expected UI behavior is implemented in `client/src/components/audio-controls.tsx`:

- Processing-off banner + control disabling: `AudioControls` (`processingActive`) gate.

### 1B. When processing is ON

1. Click **Start Audio Processing**.
2. In DevTools console, find the log:
   - `VoxFilter: initialize() success` (object)
3. Verify the log fields:
   - **`audioContextState`** is `"running"` (or explain if `"suspended"`)
   - **`sampleRate`** is present (expected `48000`)
   - **`rawTracks > 0`**
   - **`processedTracks > 0`**

If initialization fails, you must see:

- `VoxFilter: initialize() failed: ...`
- And the UI must allow retry **without refresh** (failure cleanup is explicit).

## 2) Prove processed stream exists (graph output)

After Start Audio Processing:

1. Confirm waveform visualizer is active.
2. Speak into the mic.
3. Confirm **Input** and **Output** meters move.
4. In console, you should see **setting-change logs** when you adjust controls (below).

## 3) Prove live processing changes actually modify the WebAudio graph

### 3A. Noise Reduction

1. Turn on **Noise Reduction**.
2. Move the **Intensity** slider.
3. In console, verify a single structured log per change:
   - `VoxFilter: noiseReduction applied` with `hpHz`, `lpHz`, `gateThresholdDb`, `gateRatio`

### 3B. Voice Modifier (tone/formant shaping)

1. Enable **Voice Modifier**.
2. Choose an extreme preset (e.g. “deeper” / “higher”).
3. Move **Formant Shift** to an extreme value.
4. In console, verify a single structured log per change:
   - `VoxFilter: accent applied` (includes `formantShift` and filter summaries)

Note: **Pitch Adjustment is disabled** in the web UI because **live pitch shifting is not implemented** in the current browser build.

## 4) Built-in self-test: “Test Processed Audio (3s)”

1. Ensure processing is running.
2. In **Audio Output Routing**, click **Test Processed Audio (3s)**.
3. Confirm:
   - It records from the **processed** stream for ~3 seconds
   - It attempts **local playback** (if blocked, use **Play last self-test**)
   - It attempts **virtual routing** if an output device is selected
4. Confirm the UI shows:
   - Overall status: **OK / WARN / FAIL**
   - Step breakdown (Start processing, tracks, devices, record, playback, virtual routing)

Expected console summary:

- `VoxFilter: self-test complete` (object)

## 5) Output routing: monitor + virtual cable

### 5A. Select a virtual cable output device

1. Open **Audio Output Routing**.
2. In **Route processed audio to:** select:
   - Windows: **`CABLE Input (VB-Audio Virtual Cable)`**
   - macOS: **`BlackHole 2ch`**
3. Confirm the UI status chips update (at minimum, selection is stored).

### 5B. Enable output routing (user gesture)

1. Click **Enable Audio Output**.
2. Confirm UI chips show:
   - **setSinkId: Supported** (or **Unsupported** with next step)
   - **Virtual: Active** (or Blocked/Failed with error)
   - **Monitor: Active** if local playback succeeded
   - **RingCentral ready: YES** only when virtual routing is active **and** the selected device looks like a virtual cable.
3. Confirm console log:
   - `VoxFilter: enableOutput() result` (object)

If browser blocks playback, UI must show **Blocked** with a clear next step.

## 6) Windows manual end-to-end (VB-Audio + RingCentral Desktop)

1. Install VB-Audio Virtual Cable.
2. VoxFilter:
   - Start Audio Processing
   - Select **CABLE Input** as output device
   - Click **Enable Audio Output**
   - Confirm **RingCentral ready: YES**
3. Windows proof (virtual cable path live):
   - Open Windows Sound settings and watch the **level meter** for the VB-Audio cable device while speaking.
4. RingCentral Desktop:
   - Set **Microphone** to **CABLE Output (VB-Audio Virtual Cable)**
   - Run RingCentral mic test; confirm the meter moves and your processed changes are audible to the far end.

## 7) macOS manual end-to-end (BlackHole + RingCentral Desktop)

1. Install BlackHole 2ch.
2. VoxFilter:
   - Start Audio Processing
   - Select **BlackHole 2ch** as output device
   - Click **Enable Audio Output**
   - Confirm **RingCentral ready: YES**
3. RingCentral Desktop:
   - Set **Microphone** to **BlackHole 2ch**
   - Run RingCentral mic test; confirm meter moves and processed changes are audible.

## 8) Minimal decisive console logs (expected)

You should only need these logs to prove correctness:

- `VoxFilter: initialize() success` (AudioContext state + sample rate + raw/processed track counts)
- `VoxFilter: stop()` (stop/reset)
- `VoxFilter: noiseReduction applied` (filter params)
- `VoxFilter: accent applied` (filter params)
- `VoxFilter: enableOutput() result` (+ setSinkId support/result, play blocked/errors)
- `VoxFilter: self-test complete`

## 9) Screenshots to capture (for support/debug)

- **Processing OFF**: banner “Audio processing is OFF” + disabled Noise Reduction / Voice Modifier controls
- **After Start**: DevTools console showing `VoxFilter: initialize() success` object
- **Output Routing**: status chips (Monitor/Virtual/setSinkId/RingCentral ready) and any error text
- **Self-Test**: Self-Test report card with overall status + step list
- **RingCentral**: RingCentral Desktop audio settings showing selected microphone device

