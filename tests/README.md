# VoicePro Automated Audio Testing

## Overview

This automated testing suite performs **real audio processing and analysis** to verify VoicePro's audio quality. Unlike simple unit tests, these tests:

- ✅ Process actual audio through the complete pipeline
- ✅ Measure frequency response, SNR, THD, and other metrics
- ✅ Detect artifacts like musical noise and spectral holes
- ✅ Compare to baseline recordings for regression testing
- ✅ Generate comprehensive reports with pass/fail criteria

---

## Quick Start

### 1. Install Dependencies

```bash
cd tests
npm install
```

### 2. Generate Test Audio Samples

```bash
npm run test:generate-samples
```

This creates synthetic test signals (sine sweeps, noise, voice-like signals) and sample recordings.

### 3. Run Tests

```bash
# Run all tests
npm test

# Run with UI (see tests in browser)
npm run test:ui

# Run specific test
npx playwright test audio-quality.spec.ts -g "Baseline"

# Run all tests and generate report
npm run test:full
```

### 4. View Results

```bash
npm run test:report
```

Opens the Playwright HTML report showing:
- Test pass/fail status
- Screenshots on failure
- Execution time
- Detailed logs

Audio analysis results are saved in `tests/results/` as JSON files.

---

## Test Suite

### 8 Comprehensive Tests:

1. **Baseline Audio Quality** (10s)
   - Raw microphone input without processing
   - Verifies: SNR > 40dB, THD < 3%, Flat response ±3dB

2. **Noise Reduction - Low (25%)** (10s)
   - Gentle noise reduction
   - Verifies: 8+dB noise reduction, 95%+ voice preservation

3. **Noise Reduction - High (75%)** (10s)
   - Aggressive noise reduction
   - Verifies: 15+dB noise reduction, 85%+ voice preservation, minimal artifacts

4. **Voice Modification - Clear Preset** (10s)
   - Voice enhancement without major changes
   - Verifies: Clarity improvement, minimal formant shift, <5% distortion

5. **Voice Modification - Deeper Preset** (10s)
   - Dramatic voice lowering
   - Verifies: Noticeable pitch shift, bass boost, maintained intelligibility

6. **Combined Settings - Real-world** (10s)
   - Multiple features enabled (typical sales call scenario)
   - Verifies: Balanced noise reduction, clarity, and quality

7. **Performance - Latency** (5s)
   - Measures processing delay
   - Verifies: <50ms latency

8. **Regression Test** (60s)
   - Compares to baseline recordings
   - Verifies: 95%+ similarity to known-good output

**Total Runtime**: ~2 minutes for all tests

---

## Audio Metrics Explained

### Signal-to-Noise Ratio (SNR)
- **What**: Ratio of signal power to noise power
- **Target**: >40 dB (excellent), 30-40 dB (good), <30 dB (poor)
- **Why it matters**: Higher SNR = clearer audio with less background noise

### Total Harmonic Distortion (THD)
- **What**: Percentage of harmonics added by processing
- **Target**: <1% (excellent), 1-3% (good), >5% (poor)
- **Why it matters**: Lower THD = more natural, less distorted sound

### Frequency Response Flatness
- **What**: Deviation from flat response across voice range (100-8000 Hz)
- **Target**: ±3 dB
- **Why it matters**: Flat response = natural voice, no frequency coloration

### Noise Reduction Effectiveness
- **What**: How much noise floor is reduced (dB)
- **Target**: 15-20 dB for high setting, 8-12 dB for low
- **Why it matters**: More reduction = quieter background

### Voice Preservation
- **What**: Percentage of voice quality maintained after processing
- **Target**: >95% for low NR, >85% for high NR
- **Why it matters**: High preservation = voice sounds natural, not affected by NR

### Musical Noise
- **What**: Tonal artifacts introduced by noise reduction
- **Target**: <2 (minimal), 2-5 (acceptable), >5 (problematic)
- **Why it matters**: Musical noise sounds artificial and distracting

---

## Test Audio Files

Generated test audio includes:

### Synthetic Signals
```
test-audio/
├── sine-sweep-100-8000hz.wav       # Frequency response test
├── white-noise.wav                  # Noise floor measurement
├── pink-noise.wav                   # More realistic noise spectrum
├── impulse.wav                      # Latency and transient response
└── voice-synthesis-*.wav            # Generated speech-like signals
```

### Real Recordings
```
test-audio/
├── clean-voice-sample.wav           # Clean male voice
├── voice-with-office-noise.wav      # Office ambient noise + voice
├── voice-with-keyboard-noise.wav    # Typing noise + voice
└── voice-with-traffic-noise.wav     # Traffic noise + voice
```

### Baseline Recordings (for regression)
```
baselines/
├── male-voice-processed.wav
├── female-voice-processed.wav
├── quiet-voice-processed.wav
└── loud-environment-processed.wav
```

---

## How It Works

### 1. Test Setup
```typescript
// Grant permissions and navigate
await context.grantPermissions(['microphone']);
await page.goto('http://localhost:5000');
```

### 2. Configure Settings
```typescript
// Apply test-specific settings
await page.click('[data-testid="switch-noise-reduction"]');
await page.locator('[data-testid="slider-noise-reduction"]').fill('40');
```

### 3. Process Audio
```typescript
// Start recording
await page.click('[data-testid="button-start-recording"]');

// Play test audio (routes through virtual cable or Web Audio API)
await playTestAudio(page, 'voice-with-office-noise.wav');

// Wait for test duration
await page.waitForTimeout(10000);

// Stop and capture
await page.click('[data-testid="button-stop-recording"]');
const recording = await captureRecording(page);
```

### 4. Analyze Results
```typescript
// Deep analysis with FFT, SNR, THD, etc.
const analysis = await analyzeAudioQuality(recording, {
  testType: 'noise-reduction-low',
  referenceAudio: 'voice-with-office-noise.wav',
  targetNoiseReduction: 10
});
```

### 5. Verify Metrics
```typescript
// Assert against thresholds
expect(analysis.snr).toBeGreaterThan(40);
expect(analysis.noiseReduction).toBeGreaterThan(8);
expect(analysis.voicePreservation).toBeGreaterThan(95);
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Audio Quality Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd tests && npm install
      
      - name: Install Playwright browsers
        run: cd tests && npx playwright install --with-deps
      
      - name: Start dev server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:5000
      
      - name: Generate test audio
        run: cd tests && npm run test:generate-samples
      
      - name: Run audio quality tests
        run: cd tests && npm test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/results/
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/playwright-report/
```

---

## Viewing Test Results

### 1. Playwright HTML Report
```bash
npm run test:report
```

Shows:
- ✅ Pass/fail status for each test
- ⏱️ Execution time
- 📸 Screenshots on failure
- 📊 Timeline view
- 🔍 Detailed traces

### 2. Audio Analysis JSON
```bash
cat tests/results/test-2-nr-low.json
```

Shows detailed metrics:
```json
{
  "snr": 42.3,
  "thd": 2.1,
  "peakLevel": -3.2,
  "rmsLevel": -18.5,
  "frequencyResponse": {
    "flatness": 2.8,
    "lowCutoff": 105,
    "highCutoff": 7850,
    "peakFrequency": 850
  },
  "noiseReduction": 12.5,
  "voicePreservation": 96.3,
  "musicalNoise": 1.2,
  "spectralHoles": 0
}
```

### 3. HTML Summary Report
```bash
open tests/results/test-report.html
```

Visual dashboard showing:
- Summary table with all tests
- Color-coded pass/fail/warn status
- Full JSON results

---

## Troubleshooting

### Tests Fail with "Microphone permission denied"
**Solution**: Run in headed mode first to grant permissions:
```bash
npx playwright test --headed
```

### "Cannot find test audio files"
**Solution**: Generate test audio first:
```bash
npm run test:generate-samples
```

### Tests timeout waiting for elements
**Solution**: Ensure dev server is running:
```bash
# In separate terminal
npm run dev

# Then run tests
cd tests && npm test
```

### Audio analysis shows poor results
**Solution**: This might be legitimate! Check:
1. Are the thresholds too strict for your use case?
2. Is the processing actually degrading quality? (run manual tests)
3. Adjust expected values in test file if needed

### Flaky tests (pass sometimes, fail others)
**Solution**: Increase timeouts or add stability waits:
```typescript
await page.waitForTimeout(3000); // Wait for audio stabilization
```

---

## Customizing Tests

### Add New Test
```typescript
test('My custom test', async ({ page }) => {
  // Setup
  await page.click('[data-testid="button-start-processing"]');
  
  // Configure settings
  await page.click('[data-testid="switch-noise-reduction"]');
  
  // Process audio
  await page.click('[data-testid="button-start-recording"]');
  await playTestAudio(page, 'my-test-audio.wav');
  await page.waitForTimeout(10000);
  await page.click('[data-testid="button-stop-recording"]');
  
  // Analyze
  const recording = await captureRecording(page);
  const analysis = await analyzeAudioQuality(recording, {
    testType: 'my-custom-test'
  });
  
  // Assert
  expect(analysis.snr).toBeGreaterThan(35);
});
```

### Adjust Thresholds
Edit `audio-quality.spec.ts`:
```typescript
// Change from:
expect(analysis.snr).toBeGreaterThan(40);

// To:
expect(analysis.snr).toBeGreaterThan(35); // More lenient
```

### Add New Metric
Edit `utils/audio-analyzer.ts`:
```typescript
export interface AudioAnalysisResult {
  // ... existing metrics ...
  myNewMetric?: number;
}

// Add calculation function
function calculateMyNewMetric(samples: Float32Array): number {
  // Your analysis logic
  return 42;
}
```

---

## Performance Benchmarks

Expected test performance on modern hardware:

| Test | Duration | CPU Usage | Memory |
|------|----------|-----------|--------|
| Baseline | 10s | 15% | 150MB |
| NR Low | 10s | 25% | 180MB |
| NR High | 10s | 35% | 200MB |
| Voice Mod | 10s | 30% | 190MB |
| Combined | 10s | 40% | 220MB |
| Latency | 5s | 10% | 100MB |
| Regression | 60s | 30% | 250MB |
| **Total** | **~2min** | **25% avg** | **~200MB avg** |

---

## Best Practices

### ✅ DO:
- Run tests after every audio processing change
- Update baselines when intentionally changing quality
- Review failed tests carefully (might indicate real issues)
- Keep test audio files in version control
- Run full suite before releases

### ❌ DON'T:
- Skip tests because they're slow (they're thorough for a reason)
- Adjust thresholds without understanding why tests fail
- Ignore warnings (warn status often indicates subtle issues)
- Run tests without generating samples first
- Modify baselines without documenting why

---

## Next Steps

1. **Set up CI/CD**: Add to GitHub Actions or your CI system
2. **Expand test audio**: Add more diverse voice samples and noise types
3. **Add perceptual tests**: Use PESQ or POLQA for objective quality scores
4. **Profile performance**: Add benchmarking tests for CPU/memory usage
5. **Visual regression**: Add spectrogram comparisons

---

## Support

- **Test failures**: Check `tests/results/` for detailed metrics
- **Playwright issues**: See [Playwright docs](https://playwright.dev)
- **Audio analysis**: Review `utils/audio-analyzer.ts` implementation
- **Questions**: See main `TESTING_GUIDE.md`

---

**Ready to test!** 🎙️

Run `npm run test:full` to execute the complete automated test suite.
