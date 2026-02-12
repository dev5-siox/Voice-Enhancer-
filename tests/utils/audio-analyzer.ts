/**
 * Audio Analysis Utilities
 * 
 * Provides deep audio quality analysis including:
 * - FFT-based frequency analysis
 * - SNR calculation
 * - THD measurement
 * - Spectral comparison
 * - Musical noise detection
 */

import wavDecoder from 'wav-decoder';
import FFT from 'fft.js';
import fs from 'fs';

export interface AudioAnalysisResult {
  // Basic metrics
  snr: number;                    // Signal-to-Noise Ratio (dB)
  thd: number;                    // Total Harmonic Distortion (%)
  peakLevel: number;              // Peak audio level (dBFS)
  rmsLevel: number;               // RMS audio level (dBFS)
  
  // Frequency response
  frequencyResponse: {
    flatness: number;             // Deviation from flat (dB)
    lowCutoff: number;            // -3dB point (Hz)
    highCutoff: number;           // -3dB point (Hz)
    peakFrequency: number;        // Dominant frequency (Hz)
  };
  
  // Noise reduction specific
  noiseReduction?: number;        // Noise floor reduction (dB)
  voicePreservation?: number;     // Voice quality preservation (%)
  musicalNoise?: number;          // Musical noise artifacts (0-10 scale)
  spectralHoles?: number;         // Missing frequency bands (count)
  
  // Voice modification specific
  formantShiftAmount?: number;    // Formant shift in semitones
  bassBoost?: number;             // Low frequency boost (dB)
  clarityImprovement?: number;    // High frequency enhancement (dB)
  naturalness?: number;           // Subjective naturalness (0-100)
  intelligibility?: number;       // Speech intelligibility (0-100)
  
  // Combined metrics
  dynamicRange?: number;          // Dynamic range (dB)
  clarity?: number;               // Overall clarity score (0-100)
  overallQuality?: number;        // Combined quality score (0-100)
}

/**
 * Analyze audio quality from WAV buffer
 */
export async function analyzeAudioQuality(
  audioBuffer: Buffer,
  options: {
    testType: string;
    referenceAudio?: string;
    expectedFrequencyRange?: [number, number];
    targetNoiseReduction?: number;
    checkFormantShift?: boolean;
    checkForDistortion?: boolean;
    checkAllMetrics?: boolean;
  }
): Promise<AudioAnalysisResult> {
  
  // Decode WAV file
  const audioData = await wavDecoder.decode(audioBuffer);
  const sampleRate = audioData.sampleRate;
  const channelData = audioData.channelData[0]; // Use first channel
  
  // Calculate basic metrics
  const peakLevel = calculatePeakLevel(channelData);
  const rmsLevel = calculateRMSLevel(channelData);
  const snr = await calculateSNR(channelData, sampleRate);
  const thd = calculateTHD(channelData, sampleRate);
  
  // Analyze frequency response
  const frequencyResponse = analyzeFrequencyResponse(
    channelData, 
    sampleRate,
    options.expectedFrequencyRange
  );
  
  // Initialize result
  const result: AudioAnalysisResult = {
    snr,
    thd,
    peakLevel,
    rmsLevel,
    frequencyResponse
  };
  
  // Load reference audio if provided
  let referenceData = null;
  if (options.referenceAudio) {
    const refPath = `./test-audio/${options.referenceAudio}`;
    if (fs.existsSync(refPath)) {
      const refBuffer = fs.readFileSync(refPath);
      const refAudio = await wavDecoder.decode(refBuffer);
      referenceData = refAudio.channelData[0];
    }
  }
  
  // Test-specific analysis
  switch (options.testType) {
    case 'noise-reduction-low':
    case 'noise-reduction-high':
      if (referenceData) {
        result.noiseReduction = calculateNoiseReduction(
          referenceData, 
          channelData, 
          sampleRate
        );
        result.voicePreservation = calculateVoicePreservation(
          referenceData, 
          channelData, 
          sampleRate
        );
        result.musicalNoise = detectMusicalNoise(channelData, sampleRate);
        result.spectralHoles = detectSpectralHoles(channelData, sampleRate);
      }
      break;
      
    case 'voice-clear-preset':
    case 'voice-deeper-preset':
      if (options.checkFormantShift && referenceData) {
        result.formantShiftAmount = calculateFormantShift(
          referenceData, 
          channelData, 
          sampleRate
        );
        result.naturalness = assessNaturalness(channelData, sampleRate);
        result.intelligibility = assessIntelligibility(channelData, sampleRate);
      }
      
      const bassAnalysis = analyzeBassContent(channelData, sampleRate);
      result.bassBoost = bassAnalysis.boost;
      
      const clarityAnalysis = analyzeClarityEnhancement(
        referenceData || channelData, 
        channelData, 
        sampleRate
      );
      result.clarityImprovement = clarityAnalysis.improvement;
      break;
      
    case 'combined-real-world':
      if (referenceData) {
        result.noiseReduction = calculateNoiseReduction(
          referenceData, 
          channelData, 
          sampleRate
        );
        result.voicePreservation = calculateVoicePreservation(
          referenceData, 
          channelData, 
          sampleRate
        );
      }
      result.clarity = assessClarity(channelData, sampleRate);
      result.dynamicRange = calculateDynamicRange(channelData);
      result.overallQuality = calculateOverallQuality(result);
      break;
  }
  
  return result;
}

/**
 * Calculate peak level in dBFS
 */
function calculatePeakLevel(samples: Float32Array): number {
  const peak = Math.max(...Array.from(samples).map(Math.abs));
  return 20 * Math.log10(peak);
}

/**
 * Calculate RMS level in dBFS
 */
function calculateRMSLevel(samples: Float32Array): number {
  const sumSquares = samples.reduce((sum, sample) => sum + sample * sample, 0);
  const rms = Math.sqrt(sumSquares / samples.length);
  return 20 * Math.log10(rms);
}

/**
 * Calculate Signal-to-Noise Ratio
 */
async function calculateSNR(samples: Float32Array, sampleRate: number): Promise<number> {
  // Find signal regions (where amplitude > threshold)
  const threshold = 0.01;
  const signalSamples: number[] = [];
  const noiseSamples: number[] = [];
  
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > threshold) {
      signalSamples.push(samples[i]);
    } else {
      noiseSamples.push(samples[i]);
    }
  }
  
  if (signalSamples.length === 0 || noiseSamples.length === 0) {
    return 0;
  }
  
  const signalPower = signalSamples.reduce((sum, s) => sum + s * s, 0) / signalSamples.length;
  const noisePower = noiseSamples.reduce((sum, s) => sum + s * s, 0) / noiseSamples.length;
  
  return 10 * Math.log10(signalPower / noisePower);
}

/**
 * Calculate Total Harmonic Distortion
 */
function calculateTHD(samples: Float32Array, sampleRate: number): number {
  // Perform FFT
  const fftSize = 2048;
  const fft = new FFT(fftSize);
  const spectrum = performFFT(samples, fft, fftSize);
  
  // Find fundamental frequency (largest peak)
  let fundamentalBin = 0;
  let fundamentalMag = 0;
  
  for (let i = 10; i < spectrum.length / 2; i++) {
    if (spectrum[i] > fundamentalMag) {
      fundamentalMag = spectrum[i];
      fundamentalBin = i;
    }
  }
  
  // Calculate harmonic power
  let harmonicPower = 0;
  for (let h = 2; h <= 5; h++) {
    const harmonicBin = fundamentalBin * h;
    if (harmonicBin < spectrum.length / 2) {
      harmonicPower += spectrum[harmonicBin] * spectrum[harmonicBin];
    }
  }
  
  const fundamentalPower = fundamentalMag * fundamentalMag;
  const thd = Math.sqrt(harmonicPower / fundamentalPower) * 100;
  
  return thd;
}

/**
 * Analyze frequency response
 */
function analyzeFrequencyResponse(
  samples: Float32Array,
  sampleRate: number,
  expectedRange?: [number, number]
): AudioAnalysisResult['frequencyResponse'] {
  
  const fftSize = 4096;
  const fft = new FFT(fftSize);
  const spectrum = performFFT(samples, fft, fftSize);
  
  // Convert to dB
  const spectrumDB = spectrum.map(mag => 20 * Math.log10(mag + 1e-10));
  
  // Find -3dB cutoff points
  const maxDB = Math.max(...spectrumDB.slice(10, spectrumDB.length / 2));
  const cutoffDB = maxDB - 3;
  
  let lowCutoff = 20;
  let highCutoff = sampleRate / 2;
  
  // Find low cutoff
  for (let i = 10; i < spectrumDB.length / 2; i++) {
    if (spectrumDB[i] > cutoffDB) {
      lowCutoff = (i * sampleRate) / fftSize;
      break;
    }
  }
  
  // Find high cutoff
  for (let i = Math.floor(spectrumDB.length / 2) - 1; i > 10; i--) {
    if (spectrumDB[i] > cutoffDB) {
      highCutoff = (i * sampleRate) / fftSize;
      break;
    }
  }
  
  // Calculate flatness
  let flatness = 0;
  if (expectedRange) {
    const [startFreq, endFreq] = expectedRange;
    const startBin = Math.floor((startFreq * fftSize) / sampleRate);
    const endBin = Math.floor((endFreq * fftSize) / sampleRate);
    
    const rangeMagnitudes = spectrumDB.slice(startBin, endBin);
    const avgDB = rangeMagnitudes.reduce((a, b) => a + b, 0) / rangeMagnitudes.length;
    flatness = Math.max(...rangeMagnitudes.map(db => Math.abs(db - avgDB)));
  }
  
  // Find peak frequency
  const peakBin = spectrum.indexOf(Math.max(...spectrum.slice(10, spectrum.length / 2)));
  const peakFrequency = (peakBin * sampleRate) / fftSize;
  
  return {
    flatness,
    lowCutoff,
    highCutoff,
    peakFrequency
  };
}

/**
 * Calculate noise reduction effectiveness
 */
function calculateNoiseReduction(
  original: Float32Array,
  processed: Float32Array,
  sampleRate: number
): number {
  // Find noise floor in both signals
  const origNoiseFloor = estimateNoiseFloor(original);
  const procNoiseFloor = estimateNoiseFloor(processed);
  
  return 20 * Math.log10(origNoiseFloor / (procNoiseFloor + 1e-10));
}

/**
 * Calculate voice preservation percentage
 */
function calculateVoicePreservation(
  original: Float32Array,
  processed: Float32Array,
  sampleRate: number
): number {
  // Focus on voice frequency range (300-3400 Hz)
  const fftSize = 2048;
  const fft = new FFT(fftSize);
  
  const origSpectrum = performFFT(original, fft, fftSize);
  const procSpectrum = performFFT(processed, fft, fftSize);
  
  const voiceStartBin = Math.floor((300 * fftSize) / sampleRate);
  const voiceEndBin = Math.floor((3400 * fftSize) / sampleRate);
  
  let origVoiceEnergy = 0;
  let procVoiceEnergy = 0;
  
  for (let i = voiceStartBin; i <= voiceEndBin; i++) {
    origVoiceEnergy += origSpectrum[i] * origSpectrum[i];
    procVoiceEnergy += procSpectrum[i] * procSpectrum[i];
  }
  
  return (procVoiceEnergy / origVoiceEnergy) * 100;
}

/**
 * Detect musical noise artifacts (tonal artifacts in noise reduction)
 */
function detectMusicalNoise(samples: Float32Array, sampleRate: number): number {
  // Musical noise appears as rapid tonal variations
  // Analyze spectral flux over time
  
  const fftSize = 1024;
  const hopSize = 512;
  const fft = new FFT(fftSize);
  
  const frames: number[][] = [];
  
  for (let i = 0; i < samples.length - fftSize; i += hopSize) {
    const frame = samples.slice(i, i + fftSize);
    const spectrum = performFFT(frame, fft, fftSize);
    frames.push(Array.from(spectrum));
  }
  
  // Calculate spectral flux between frames
  let totalFlux = 0;
  
  for (let i = 1; i < frames.length; i++) {
    let frameFlux = 0;
    for (let bin = 0; bin < frames[i].length; bin++) {
      const diff = frames[i][bin] - frames[i - 1][bin];
      frameFlux += diff * diff;
    }
    totalFlux += Math.sqrt(frameFlux);
  }
  
  const avgFlux = totalFlux / frames.length;
  
  // Normalize to 0-10 scale (higher = more musical noise)
  return Math.min(10, avgFlux * 100);
}

/**
 * Detect spectral holes (missing frequency bands)
 */
function detectSpectralHoles(samples: Float32Array, sampleRate: number): number {
  const fftSize = 4096;
  const fft = new FFT(fftSize);
  const spectrum = performFFT(samples, fft, fftSize);
  
  const spectrumDB = spectrum.map(mag => 20 * Math.log10(mag + 1e-10));
  
  // Look for significant dips in the spectrum
  const threshold = -40; // dB
  let holeCount = 0;
  let inHole = false;
  
  for (let i = 10; i < spectrumDB.length / 2; i++) {
    if (spectrumDB[i] < threshold && !inHole) {
      holeCount++;
      inHole = true;
    } else if (spectrumDB[i] >= threshold) {
      inHole = false;
    }
  }
  
  return holeCount;
}

/**
 * Helper: Perform FFT on audio samples
 */
function performFFT(samples: Float32Array, fft: any, fftSize: number): Float32Array {
  const input = new Array(fftSize * 2).fill(0);
  
  for (let i = 0; i < Math.min(samples.length, fftSize); i++) {
    input[i * 2] = samples[i];     // Real part
    input[i * 2 + 1] = 0;           // Imaginary part
  }
  
  const output = fft.createComplexArray();
  fft.transform(output, input);
  
  // Calculate magnitude
  const magnitude = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    const real = output[i * 2];
    const imag = output[i * 2 + 1];
    magnitude[i] = Math.sqrt(real * real + imag * imag);
  }
  
  return magnitude;
}

/**
 * Estimate noise floor
 */
function estimateNoiseFloor(samples: Float32Array): number {
  // Find the quietest 10% of samples
  const sorted = Array.from(samples).map(Math.abs).sort((a, b) => a - b);
  const noiseCount = Math.floor(sorted.length * 0.1);
  const noiseSamples = sorted.slice(0, noiseCount);
  
  const noiseRMS = Math.sqrt(
    noiseSamples.reduce((sum, s) => sum + s * s, 0) / noiseSamples.length
  );
  
  return noiseRMS;
}

// Placeholder implementations for remaining functions
function calculateFormantShift(orig: Float32Array, proc: Float32Array, sr: number): number {
  return 0; // Simplified - would require formant analysis
}

function assessNaturalness(samples: Float32Array, sr: number): number {
  return 90; // Simplified - would require perceptual modeling
}

function assessIntelligibility(samples: Float32Array, sr: number): number {
  return 95; // Simplified - would require speech recognition
}

function analyzeBassContent(samples: Float32Array, sr: number) {
  return { boost: 3 }; // Simplified
}

function analyzeClarityEnhancement(orig: Float32Array, proc: Float32Array, sr: number) {
  return { improvement: 2 }; // Simplified
}

function assessClarity(samples: Float32Array, sr: number): number {
  return 85; // Simplified
}

function calculateDynamicRange(samples: Float32Array): number {
  const peak = calculatePeakLevel(samples);
  const rms = calculateRMSLevel(samples);
  return peak - rms;
}

function calculateOverallQuality(result: AudioAnalysisResult): number {
  // Weighted average of various metrics
  let score = 100;
  
  if (result.snr < 40) score -= (40 - result.snr);
  if (result.thd > 5) score -= (result.thd - 5) * 2;
  if (result.voicePreservation && result.voicePreservation < 90) {
    score -= (90 - result.voicePreservation) * 0.5;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate comprehensive test report
 */
export async function generateTestReport(resultsDir: string): Promise<void> {
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));
  
  const allResults = files.map(file => {
    const content = fs.readFileSync(`${resultsDir}/${file}`, 'utf-8');
    return { file, data: JSON.parse(content) };
  });
  
  // Generate HTML report
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>VoicePro Audio Quality Test Report</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #0f172a; color: #e2e8f0; }
    h1 { color: #60a5fa; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #1e293b; color: #60a5fa; }
    .pass { color: #10b981; font-weight: bold; }
    .fail { color: #ef4444; font-weight: bold; }
    .warn { color: #f59e0b; font-weight: bold; }
  </style>
</head>
<body>
  <h1>🎙️ VoicePro Audio Quality Test Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Test Results Summary</h2>
  <table>
    <tr>
      <th>Test</th>
      <th>SNR (dB)</th>
      <th>THD (%)</th>
      <th>Quality Score</th>
      <th>Status</th>
    </tr>
    ${allResults.map(r => `
      <tr>
        <td>${r.file.replace('.json', '')}</td>
        <td>${r.data.snr?.toFixed(1) || 'N/A'}</td>
        <td>${r.data.thd?.toFixed(2) || 'N/A'}</td>
        <td>${r.data.overallQuality?.toFixed(0) || 'N/A'}</td>
        <td class="${r.data.overallQuality > 85 ? 'pass' : r.data.overallQuality > 70 ? 'warn' : 'fail'}">
          ${r.data.overallQuality > 85 ? '✅ PASS' : r.data.overallQuality > 70 ? '⚠️ WARN' : '❌ FAIL'}
        </td>
      </tr>
    `).join('')}
  </table>
  
  <h2>Detailed Results</h2>
  <pre>${JSON.stringify(allResults, null, 2)}</pre>
</body>
</html>
  `;
  
  fs.writeFileSync(`${resultsDir}/test-report.html`, html);
  console.log(`📊 Test report generated: ${resultsDir}/test-report.html`);
}
