#!/bin/bash

# VoicePro Audio Testing Setup Script for WSL/Ubuntu
# This script installs all necessary dependencies and sets up automated audio testing

set -e  # Exit on error

echo "🎙️ VoicePro Audio Testing Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running in WSL
if ! grep -q Microsoft /proc/version; then
    echo -e "${RED}⚠️  This script should be run in WSL (Windows Subsystem for Linux)${NC}"
    echo "Start WSL with: wsl -d Ubuntu"
    exit 1
fi

echo -e "${GREEN}✓${NC} Running in WSL"
echo ""

# Navigate to project directory
PROJECT_DIR="/mnt/c/Dev/Github/VoiceEnhancer"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}✗ Project directory not found: $PROJECT_DIR${NC}"
    echo "Please update PROJECT_DIR in this script to match your path"
    exit 1
fi

cd "$PROJECT_DIR/tests"
echo -e "${GREEN}✓${NC} Found project directory"
echo ""

# Step 1: Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}→${NC} Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}✓${NC} Node.js $(node --version) installed"
fi
echo ""

# Step 2: Install build tools
echo "🔧 Installing build tools..."
sudo apt-get update -qq
sudo apt-get install -y \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev
echo -e "${GREEN}✓${NC} Build tools installed"
echo ""

# Step 3: Install npm dependencies
echo "📚 Installing test dependencies..."
npm install
echo -e "${GREEN}✓${NC} Base dependencies installed"
echo ""

# Step 4: Install audio processing libraries
echo "🎵 Installing audio processing libraries..."
npm install wav-decoder audiobuffer-to-wav fft.js
echo -e "${GREEN}✓${NC} Audio libraries installed"
echo ""

# Step 5: Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install --with-deps chromium
echo -e "${GREEN}✓${NC} Playwright browsers installed"
echo ""

# Step 6: Generate test audio
echo "🎼 Generating test audio files..."
npm run test:generate-samples
echo -e "${GREEN}✓${NC} Test audio generated"
echo ""

# Verification
echo "✅ Setup complete!"
echo ""
echo "📊 Verification:"
echo "  - Audio libraries: $(npm list wav-decoder --depth=0 2>/dev/null | grep wav-decoder || echo 'checking...')"
echo "  - Test audio files: $(ls test-audio/*.wav 2>/dev/null | wc -l || echo '0') WAV files"
echo "  - Playwright: $(npx playwright --version)"
echo ""

echo "🚀 Next Steps:"
echo ""
echo "  1. Start the dev server (in Windows PowerShell):"
echo "     cd C:\\Dev\\Github\\VoiceEnhancer"
echo "     npm run dev"
echo ""
echo "  2. Run tests (in this WSL terminal):"
echo "     npm test"
echo ""
echo "  3. View results:"
echo "     npm run test:report"
echo "     cat results/test-1-baseline.json"
echo ""

echo "📚 Documentation:"
echo "  - Setup Guide: AUDIO_LIBRARIES_SETUP.md"
echo "  - Test Guide: tests/README.md"
echo "  - Quick Reference: SETUP_COMPLETE.md"
echo ""

echo -e "${GREEN}Happy testing! 🎙️${NC}"
