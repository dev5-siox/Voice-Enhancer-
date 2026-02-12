# VoicePro Audio Testing Setup Helper

Write-Host "VoicePro Audio Testing Setup Helper" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor DarkGray
Write-Host ""

# Check WSL installation
Write-Host "Checking WSL installation..." -ForegroundColor Yellow
$wslOutput = wsl --list --verbose 2>&1 | Out-String

if ($wslOutput -like "*Ubuntu*") {
    Write-Host "Ubuntu WSL is installed!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Ready to setup automated testing!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Follow these steps:" -ForegroundColor White
    Write-Host ""
    Write-Host "Step 1: Open Ubuntu WSL" -ForegroundColor White
    Write-Host "  wsl -d Ubuntu" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Step 2: Navigate to project" -ForegroundColor White
    Write-Host "  cd /mnt/c/Dev/Github/VoiceEnhancer/tests" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Step 3: Run setup script" -ForegroundColor White
    Write-Host "  bash setup-wsl.sh" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Step 4: Wait for installation (5-10 minutes)" -ForegroundColor White
    Write-Host ""
    Write-Host "Step 5: Start dev server (Windows PowerShell)" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Step 6: Run tests (in WSL)" -ForegroundColor White
    Write-Host "  npm test" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "Open Ubuntu WSL now? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host ""
        Write-Host "Opening Ubuntu WSL..." -ForegroundColor Green
        Write-Host "Run these commands:" -ForegroundColor Yellow
        Write-Host "  cd /mnt/c/Dev/Github/VoiceEnhancer/tests" -ForegroundColor Yellow
        Write-Host "  bash setup-wsl.sh" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        wsl -d Ubuntu
    }
} else {
    Write-Host "Ubuntu WSL is not yet ready" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If installing, wait 5-10 minutes" -ForegroundColor White
    Write-Host "Check status: wsl --list --verbose" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If not installed, run: wsl --install Ubuntu" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor DarkGray
Write-Host "Documentation: AUDIO_LIBRARIES_SETUP.md" -ForegroundColor Cyan
Write-Host ""
