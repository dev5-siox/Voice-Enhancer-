# VoicePro Testing Launcher
# Quick launcher for all testing tools

Write-Host "🎙️ VoicePro Audio Quality Testing Launcher" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor DarkGray
Write-Host ""

# Check if server is running
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    $serverRunning = $true
} catch {
    $serverRunning = $false
}

if ($serverRunning) {
    Write-Host "✅ VoicePro server is running at http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "⚠️  VoicePro server is NOT running!" -ForegroundColor Yellow
    Write-Host "   Please start it first with: npm run dev" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Available Testing Tools:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Open Main VoicePro App" -ForegroundColor White
Write-Host "     → http://localhost:5000" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  2. Open Interactive Test Suite" -ForegroundColor White
Write-Host "     → test-audio-quality.html" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  3. View Testing Guide" -ForegroundColor White
Write-Host "     → TESTING_GUIDE.md (comprehensive procedures)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  4. View Quick Fix Reference" -ForegroundColor White
Write-Host "     → QUICK_FIX_REFERENCE.md (emergency fixes)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  5. View Testing Summary" -ForegroundColor White
Write-Host "     → TESTING_SUMMARY.md (overview)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  6. Copy Diagnostics Script" -ForegroundColor White
Write-Host "     → diagnostics.js (for browser console)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  7. Open All Tools" -ForegroundColor White
Write-Host "     → Opens main app + test suite + guides" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Q. Quit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select option (1-7, Q)"

switch ($choice.ToUpper()) {
    "1" {
        Write-Host "Opening VoicePro App..." -ForegroundColor Green
        Start-Process "http://localhost:5000"
    }
    "2" {
        Write-Host "Opening Interactive Test Suite..." -ForegroundColor Green
        Start-Process "test-audio-quality.html"
    }
    "3" {
        Write-Host "Opening Testing Guide..." -ForegroundColor Green
        Start-Process "TESTING_GUIDE.md"
    }
    "4" {
        Write-Host "Opening Quick Fix Reference..." -ForegroundColor Green
        Start-Process "QUICK_FIX_REFERENCE.md"
    }
    "5" {
        Write-Host "Opening Testing Summary..." -ForegroundColor Green
        Start-Process "TESTING_SUMMARY.md"
    }
    "6" {
        Write-Host "Copying diagnostics script to clipboard..." -ForegroundColor Green
        Get-Content "diagnostics.js" | Set-Clipboard
        Write-Host "✅ Diagnostics script copied!" -ForegroundColor Green
        Write-Host "   Paste in browser console (F12) and run: VoiceProDiagnostics.runFullDiagnostic()" -ForegroundColor Yellow
        Read-Host "Press Enter to continue"
    }
    "7" {
        Write-Host "Opening all tools..." -ForegroundColor Green
        Start-Sleep -Milliseconds 500
        Start-Process "http://localhost:5000"
        Start-Sleep -Milliseconds 500
        Start-Process "test-audio-quality.html"
        Start-Sleep -Milliseconds 500
        Start-Process "TESTING_SUMMARY.md"
    }
    "Q" {
        Write-Host "Exiting..." -ForegroundColor Gray
        return
    }
    default {
        Write-Host "Invalid option. Please try again." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor DarkGray
Write-Host ""
Write-Host "💡 Quick Testing Steps:" -ForegroundColor Cyan
Write-Host "  1. Open main app (option 1)" -ForegroundColor White
Write-Host "  2. Start audio processing" -ForegroundColor White
Write-Host "  3. Open test suite (option 2)" -ForegroundColor White
Write-Host "  4. Run tests and compare settings" -ForegroundColor White
Write-Host "  5. Use Quick Fix Reference for solutions" -ForegroundColor White
Write-Host ""
Write-Host "📋 For browser diagnostics:" -ForegroundColor Cyan
Write-Host "  1. Open main app" -ForegroundColor White
Write-Host "  2. Press F12" -ForegroundColor White
Write-Host "  3. Paste diagnostics.js (option 6 to copy)" -ForegroundColor White
Write-Host "  4. Run: VoiceProDiagnostics.runFullDiagnostic()" -ForegroundColor White
Write-Host ""
