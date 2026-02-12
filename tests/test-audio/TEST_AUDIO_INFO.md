# Test Audio Files

This directory contains test audio files for automated quality testing.

## Generated Test Signals

### 1. sine-sweep-100-8000hz.wav
- **Description**: Frequency sweep from 100 Hz to 8000 Hz over 10 seconds
- **Purpose**: Tests frequency response and filter behavior
- **Duration**: 10 seconds
- **Sample Rate**: 48000 Hz

### 2. white-noise.wav
- **Description**: White noise at -20 dBFS
- **Purpose**: Tests noise floor and background noise handling
- **Duration**: 10 seconds
- **Sample Rate**: 48000 Hz

### 3. voice-synthesis-male.wav
- **Description**: Synthetic male voice with formants at 120, 650, 1080, 2650 Hz
- **Purpose**: Tests voice processing pipeline
- **Duration**: 10 seconds
- **Sample Rate**: 48000 Hz

### 4. voice-with-office-noise.wav
- **Description**: Voice + HVAC hum + ambient noise
- **Purpose**: Tests noise reduction effectiveness
- **Duration**: 10 seconds
- **Sample Rate**: 48000 Hz

### 5. impulse.wav
- **Description**: Single impulse at 0.5 seconds
- **Purpose**: Tests latency and transient response
- **Duration**: 1 seconds
- **Sample Rate**: 48000 Hz

## How to Generate Full Audio Files

To generate actual WAV files, install the full dependencies:

```bash
npm install wav-encoder audiobuffer-to-wav
```

Then update `generate-samples.js` with the full WAV encoding logic.

## Using Test Audio

These test files are used by the Playwright tests in `audio-quality.spec.ts`:

1. Tests load these audio files
2. Play them through VoicePro
3. Capture the processed output
4. Analyze with FFT, SNR, THD calculations
5. Compare to expected quality metrics

## Expected Quality Metrics

| Test Signal | Expected SNR | Expected THD | Notes |
|-------------|--------------|--------------|-------|
| Sine Sweep | >50 dB | <1% | Clean reference signal |
| White Noise | N/A | N/A | Used for noise floor measurement |
| Voice Synthesis | >40 dB | <3% | Baseline voice quality |
| Voice + Office Noise | >35 dB | <5% | After noise reduction |
| Impulse | N/A | N/A | Latency should be <50ms |

