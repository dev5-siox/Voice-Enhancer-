import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Playwright configuration for VoicePro audio quality tests
 * 
 * See https://playwright.dev/docs/test-configuration
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureFakeMicWav(): string {
  const tmpDir = path.join(__dirname, '.tmp');
  const wavPath = path.join(tmpDir, 'fake-mic-30s.wav');

  if (fs.existsSync(wavPath)) return wavPath;

  fs.mkdirSync(tmpDir, { recursive: true });

  const sampleRate = 48_000;
  const seconds = 30;
  const numSamples = sampleRate * seconds;

  // Mix: two tones + broadband noise (so filters/gates have something to change)
  const tone1Hz = 220;
  const tone2Hz = 440;
  const toneAmp = 0.18;
  const noiseAmp = 0.02;

  const pcm16 = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const tone =
      toneAmp * Math.sin(2 * Math.PI * tone1Hz * t) +
      (toneAmp * 0.6) * Math.sin(2 * Math.PI * tone2Hz * t);
    const noise = (Math.random() * 2 - 1) * noiseAmp;
    const sample = Math.max(-1, Math.min(1, tone + noise));
    pcm16[i] = Math.round(sample * 0x7fff);
  }

  // Write a minimal PCM16 mono WAV
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm16.byteLength;
  const riffSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(riffSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format: PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const body = Buffer.from(pcm16.buffer);
  fs.writeFileSync(wavPath, Buffer.concat([header, body]));

  return wavPath;
}

const fakeMicWavPath = ensureFakeMicWav();
const fakeMicWavPathForChromium = fakeMicWavPath.replace(/\\/g, '/');

export default defineConfig({
  testDir: './',
  
  // Maximum time one test can run (2 minutes per test)
  timeout: 120 * 1000,
  
  // Fail fast - stop after first failure for quick feedback during development
  // Set to undefined or remove to run all tests even after failures
  // fullyParallel: false,
  
  // Retry failed tests once (helps with flaky tests)
  retries: process.env.CI ? 2 : 1,
  
  // Only run tests on one worker to avoid audio device conflicts
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'results/test-results.json' }],
    ['list']
  ],
  
  use: {
    // Base URL for the app
    baseURL: 'http://localhost:5000',
    
    // Collect trace on failure for debugging
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',

    // Needed for recording download verification
    acceptDownloads: true,
    
    // Browser context options
    permissions: ['microphone', 'camera'],
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors (for local development)
    ignoreHTTPSErrors: true,
  },

  // Configure projects for different browsers (audio testing works best in Chrome)
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            `--use-file-for-fake-audio-capture=${fakeMicWavPathForChromium}`,
            '--autoplay-policy=no-user-gesture-required',
          ]
        }
      },
    },
    
    // Uncomment to test in other browsers (may have limited audio support)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting the tests
  // Comment out if server is already running manually
  // webServer: {
  //   command: 'cd .. && $env:NODE_ENV="development"; npx tsx server/index.ts',
  //   url: 'http://localhost:5000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  //   stdout: 'pipe',
  //   stderr: 'pipe',
  // },
});
