# Installing Audio Processing Libraries - Complete Guide

## Overview

This guide helps you install the audio processing libraries needed for full automated testing with real audio analysis (FFT, SNR, THD calculations).

---

## Option 1: Windows Subsystem for Linux (WSL) - RECOMMENDED ✅

WSL allows you to run Linux natively on Windows, avoiding all the native compilation issues.

### Step 1: Install/Setup Ubuntu WSL

**A. Check if Ubuntu is already installed:**
```powershell
wsl --list --verbose
```

**B. If Ubuntu is not listed, install it:**
```powershell
wsl --install Ubuntu
```

Wait for installation to complete (may take 5-10 minutes).

**C. When prompted, create a username and password:**
```bash
# You'll see:
Enter new UNIX username: yourusername
New password: 
Retype new password:
```

**D. Verify installation:**
```powershell
wsl --list --verbose
# Should show Ubuntu in the list
```

### Step 2: Access Your Project in WSL

Your Windows C: drive is accessible at `/mnt/c/` in WSL.

```bash
# Start Ubuntu
wsl -d Ubuntu

# Navigate to your project
cd /mnt/c/Dev/Github/VoiceEnhancer

# Verify you're in the right place
ls
# Should see: client/ server/ tests/ package.json etc.
```

### Step 3: Install Node.js in WSL (if needed)

```bash
# Check if Node is installed
node --version

# If not installed, install Node.js 20 LTS:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 4: Install Build Tools

These are needed for native modules:

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### Step 5: Install Test Dependencies

```bash
# Navigate to tests directory
cd /mnt/c/Dev/Github/VoiceEnhancer/tests

# Install base dependencies (already done)
npm install

# Now install audio processing libraries
npm install wav-decoder audiobuffer-to-wav fft.js

# Install Playwright browsers for WSL
npx playwright install --with-deps chromium
```

### Step 6: Generate Test Audio

```bash
# Still in tests/ directory
npm run test:generate-samples
```

This will create actual WAV files in `test-audio/` directory.

### Step 7: Run Automated Tests

**Important**: The dev server needs to be running on Windows.

**In Windows PowerShell (separate terminal):**
```powershell
cd C:\Dev\Github\VoiceEnhancer
npm run dev
```

**In WSL Ubuntu terminal:**
```bash
cd /mnt/c/Dev/Github/VoiceEnhancer/tests

# Run all tests
npm test

# Or run with UI
npm run test:ui

# Or run specific test
npx playwright test -g "Baseline"
```

### Step 8: View Results

```bash
# View test report
npm run test:report

# View audio analysis results
cat results/test-1-baseline.json

# View HTML report (opens in Windows browser)
explorer.exe results/test-report.html
```

---

## Option 2: GitHub Actions (CI/CD) - NO LOCAL SETUP NEEDED ✅

Run automated tests in the cloud without any local setup.

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/audio-tests.yml`:

```yaml
name: Audio Quality Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:  # Manual trigger

jobs:
  audio-quality:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd tests && npm ci
      
      - name: Install audio processing libraries
        run: cd tests && npm install wav-decoder audiobuffer-to-wav fft.js
      
      - name: Install Playwright browsers
        run: cd tests && npx playwright install --with-deps chromium
      
      - name: Generate test audio
        run: cd tests && npm run test:generate-samples
      
      - name: Start dev server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:5000 --timeout 60000
      
      - name: Run audio quality tests
        run: cd tests && npm test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/results/
          retention-days: 30
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/playwright-report/
          retention-days: 30
      
      - name: Upload test audio
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-audio
          path: tests/test-audio/
          retention-days: 7
```

### Step 2: Push to GitHub

```bash
git add .github/workflows/audio-tests.yml
git commit -m "Add automated audio quality testing"
git push
```

### Step 3: View Results

1. Go to your GitHub repository
2. Click "Actions" tab
3. See test results for each commit/PR
4. Download artifacts (test results, audio files)

---

## Option 3: Docker - ALTERNATIVE ✅

Run tests in a Docker container.

### Step 1: Create Dockerfile

Create `tests/Dockerfile`:

```dockerfile
FROM node:20-bullseye

# Install dependencies for native modules
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Install audio libraries
RUN npm install wav-decoder audiobuffer-to-wav fft.js

# Install Playwright
RUN npx playwright install --with-deps chromium

# Copy test files
COPY . .

CMD ["npm", "test"]
```

### Step 2: Create docker-compose.yml

Create `tests/docker-compose.yml`:

```yaml
version: '3.8'

services:
  tests:
    build: .
    volumes:
      - ./results:/app/results
      - ./test-audio:/app/test-audio
    environment:
      - CI=true
    depends_on:
      - app
    
  app:
    image: node:20-bullseye
    working_dir: /app
    volumes:
      - ..:/app
    command: npm run dev
    ports:
      - "5000:5000"
```

### Step 3: Run Tests

```bash
cd tests
docker-compose up --build
```

---

## Troubleshooting

### Issue: "Cannot find module 'wav-decoder'"

**Solution:**
```bash
cd tests
npm install wav-decoder audiobuffer-to-wav fft.js
```

### Issue: "gyp ERR! find VS" (Windows native)

**Solution:** Use WSL instead of Windows native compilation. Native Windows compilation requires Visual Studio Build Tools (large download, complex setup).

### Issue: WSL can't access Windows files

**Solution:**
```bash
# Windows C: drive is at /mnt/c/
cd /mnt/c/Dev/Github/VoiceEnhancer/tests
```

### Issue: Tests fail with "Cannot connect to browser"

**Solution:**
```bash
# Reinstall Playwright browsers in WSL
cd /mnt/c/Dev/Github/VoiceEnhancer/tests
npx playwright install --with-deps chromium
```

### Issue: Port 5000 already in use

**Solution:**
```bash
# Find and kill process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /F /PID <PID>

# WSL/Linux:
lsof -ti:5000 | xargs kill -9
```

### Issue: Permission denied in WSL

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:$USER /mnt/c/Dev/Github/VoiceEnhancer/tests
```

---

## Verification Checklist

After installation, verify everything works:

```bash
cd /mnt/c/Dev/Github/VoiceEnhancer/tests

# 1. Check audio libraries installed
npm list wav-decoder audiobuffer-to-wav fft.js

# 2. Generate test audio
npm run test:generate-samples
ls test-audio/  # Should see .wav files

# 3. Check Playwright
npx playwright --version

# 4. Run single test
npx playwright test -g "Baseline" --reporter=list

# 5. View results
cat results/test-1-baseline.json
```

Expected output:
```json
{
  "snr": 42.3,
  "thd": 2.1,
  "peakLevel": -3.2,
  "rmsLevel": -18.5,
  "frequencyResponse": {
    "flatness": 2.8,
    "lowCutoff": 105,
    "highCutoff": 7850
  }
}
```

---

## Performance Comparison

| Method | Setup Time | Run Time | Maintenance |
|--------|------------|----------|-------------|
| **WSL** | 15 min | ~2 min | Easy |
| **GitHub Actions** | 5 min | ~3 min | None |
| **Docker** | 10 min | ~2 min | Medium |
| **Windows Native** | 1-2 hours | ~2 min | Hard |

**Recommendation**: Use **WSL** for local development, **GitHub Actions** for CI/CD.

---

## Next Steps After Installation

1. **Run full test suite:**
   ```bash
   npm test
   ```

2. **View results:**
   ```bash
   npm run test:report
   ```

3. **Create baselines for regression testing:**
   ```bash
   # Process reference recordings and save as baselines
   mkdir -p baselines
   # Copy your processed recordings to baselines/
   ```

4. **Add to CI/CD:**
   - Copy GitHub Actions workflow
   - Push to repository
   - Tests run automatically

5. **Customize tests:**
   - Add your own test scenarios
   - Adjust quality thresholds
   - Create custom test audio

---

## Quick Reference

### WSL Commands
```bash
# Start WSL
wsl -d Ubuntu

# Navigate to project
cd /mnt/c/Dev/Github/VoiceEnhancer/tests

# Run tests
npm test

# Exit WSL
exit
```

### Running Tests
```bash
# All tests
npm test

# With UI
npm run test:ui

# Specific test
npx playwright test -g "Noise Reduction"

# View report
npm run test:report
```

### File Locations
```
Windows:   C:\Dev\Github\VoiceEnhancer\tests\
WSL:       /mnt/c/Dev/Github/VoiceEnhancer/tests/
Results:   tests/results/
Audio:     tests/test-audio/
Report:    tests/playwright-report/
```

---

## Support

- **WSL Issues**: https://docs.microsoft.com/en-us/windows/wsl/
- **Playwright Docs**: https://playwright.dev/
- **Audio Testing**: See `AUTOMATED_TESTING_COMPLETE.md`

---

**Ready to test!** 🎙️

Start with: `wsl -d Ubuntu` then `cd /mnt/c/Dev/Github/VoiceEnhancer/tests`
