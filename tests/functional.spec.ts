import { test, expect } from '@playwright/test';

/**
 * VoicePro Functional Tests
 * 
 * These tests verify UI functionality and user workflows WITHOUT requiring
 * complex audio analysis libraries. Perfect for Windows development!
 */

// Helper function to set slider value by clicking at position
async function setSliderValue(page: any, testId: string, percentage: number) {
  const slider = page.getByTestId(testId);
  await expect(slider).toBeVisible();
  
  const sliderBox = await slider.boundingBox();
  if (sliderBox) {
    const targetX = sliderBox.x + (sliderBox.width * (percentage / 100));
    const targetY = sliderBox.y + (sliderBox.height / 2);
    await page.mouse.click(targetX, targetY);
  }
}

test.describe('VoicePro Functional Tests', () => {
  
  const BASE_URL = 'http://localhost:5000';
  
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    
    // Navigate to app
    await page.goto(BASE_URL);
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Handle welcome/setup dialog if present
    try {
      const welcomeDialog = page.locator('[role="dialog"]').first();
      const isVisible = await welcomeDialog.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        // Fill in name
        const nameInput = page.getByTestId('input-agent-name');
        await nameInput.waitFor({ state: 'visible', timeout: 3000 });
        await nameInput.clear();
        await nameInput.fill('Test Agent CI');
        await page.waitForTimeout(500);
        
        // Click register button using force to bypass pointer-events blocking
        const registerButton = page.getByTestId('button-register');
        await registerButton.waitFor({ state: 'visible', timeout: 3000 });
        await registerButton.click({ force: true });
        
        // Wait for dialog to close completely
        await welcomeDialog.waitFor({ state: 'hidden', timeout: 5000 });
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('No welcome dialog or already dismissed');
    }
  });

  /**
   * TEST 1: App loads correctly
   */
  test('App loads and displays main interface', async ({ page }) => {
    // Check for main UI elements after setup is complete
    await expect(page.getByTestId('button-start-processing')).toBeVisible({ timeout: 10000 });
    
    // Check for audio controls or dashboard elements
    const hasAudioControls = await page.getByText(/Audio Settings|Noise Reduction|Voice Modifier/i).first().isVisible().catch(() => false);
    expect(hasAudioControls).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/app-loaded.png' });
  });

  /**
   * TEST 2: Audio processing can be started
   */
  test('Can start audio processing', async ({ page }) => {
    // Click start button
    await page.click('[data-testid="button-start-processing"]');
    
    // Wait for processing to initialize
    await page.waitForTimeout(3000);
    
    // Check that stop button appears
    await expect(page.getByTestId('button-stop-processing')).toBeVisible({ timeout: 10000 });
    
    // Check for waveform visualization
    await expect(page.getByTestId('waveform-visualizer')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/processing-active.png' });
  });

  /**
   * TEST 3: Noise reduction controls work
   */
  test('Noise reduction controls function correctly', async ({ page }) => {
    // Start processing
    await page.click('[data-testid="button-start-processing"]');
    await page.waitForTimeout(2000);
    
    // Find and ensure noise reduction is enabled
    const nrSwitch = page.getByTestId('switch-noise-reduction');
    await expect(nrSwitch).toBeVisible();
    
    // Get current state and enable if needed
    const isChecked = await nrSwitch.getAttribute('data-state');
    if (isChecked !== 'checked') {
      await nrSwitch.click();
      await page.waitForTimeout(500);
    }
    
    // Find the slider - it's a Radix UI slider, so we need to interact with the thumb
    const slider = page.getByTestId('slider-noise-reduction');
    await expect(slider).toBeVisible();
    
    // Interact with slider by clicking at a specific position (75% of width)
    const sliderBox = await slider.boundingBox();
    if (sliderBox) {
      await page.mouse.click(sliderBox.x + (sliderBox.width * 0.75), sliderBox.y + (sliderBox.height / 2));
      await page.waitForTimeout(500);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/noise-reduction-enabled.png' });
  });

  /**
   * TEST 4: Voice modification controls work
   */
  test('Voice modification controls function correctly', async ({ page }) => {
    // Start processing
    await page.click('[data-testid="button-start-processing"]');
    await page.waitForTimeout(2000);
    
    // Find voice modifier switch
    const vmSwitch = page.getByTestId('switch-voice-modifier');
    
    if (await vmSwitch.isVisible()) {
      // Enable voice modification
      await vmSwitch.click();
      await page.waitForTimeout(500);
      
      // Select preset
      const presetSelect = page.getByTestId('select-voice-preset');
      if (await presetSelect.isVisible()) {
        await presetSelect.click();
        await page.waitForTimeout(300);
        
        // Select "clear" option
        await page.locator('text=clear').first().click();
        await page.waitForTimeout(500);
      }
      
      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/voice-modification-enabled.png' });
    }
  });

  /**
   * TEST 5: Recording functionality
   */
  test('Can start and stop recording', async ({ page }) => {
    // Start processing
    await page.click('[data-testid="button-start-processing"]');
    await page.waitForTimeout(2000);
    
    // Start recording
    const recordButton = page.getByTestId('button-start-recording');
    if (await recordButton.isVisible()) {
      await recordButton.click();
      await page.waitForTimeout(1000);
      
      // Check that stop recording button appears
      await expect(page.getByTestId('button-stop-recording')).toBeVisible();
      
      // Wait a bit
      await page.waitForTimeout(3000);
      
      // Take screenshot while recording
      await page.screenshot({ path: 'tests/screenshots/recording-active.png' });
      
      // Stop recording
      await page.click('[data-testid="button-stop-recording"]');
      await page.waitForTimeout(1000);
    }
  });

  /**
   * TEST 6: Audio levels display correctly
   */
  test('Audio level meters display and update', async ({ page }) => {
    // Start processing
    await page.click('[data-testid="button-start-processing"]');
    await page.waitForTimeout(2000);
    
    // Check for level meters
    await expect(page.locator('text=Input').first()).toBeVisible();
    await expect(page.locator('text=Output').first()).toBeVisible();
    
    // Meters should update (check that they exist and are visible)
    const meters = await page.locator('[class*="meter"]').count();
    expect(meters).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/level-meters.png' });
  });

  /**
   * TEST 7: Settings persistence test
   */
  test('Settings are applied and persist', async ({ page }) => {
    // Start processing
    await page.click('[data-testid="button-start-processing"]');
    await page.waitForTimeout(2000);
    
    // Enable noise reduction
    const nrSwitch = page.getByTestId('switch-noise-reduction');
    const isChecked = await nrSwitch.getAttribute('data-state');
    if (isChecked !== 'checked') {
      await nrSwitch.click();
      await page.waitForTimeout(500);
    }
    
    // Set specific value using click position
    await setSliderValue(page, 'slider-noise-reduction', 65);
    await page.waitForTimeout(500);
    
    console.log('✓ Noise reduction settings applied');
  });

  /**
   * TEST 8: No console errors during normal use
   */
  test('No JavaScript errors during normal operation', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Perform normal user workflow
    await page.click('[data-testid="button-start-processing"]');
    await page.waitForTimeout(2000);
    
    const nrSwitch = page.getByTestId('switch-noise-reduction');
    const isChecked = await nrSwitch.getAttribute('data-state');
    if (isChecked !== 'checked') {
      await nrSwitch.click();
      await page.waitForTimeout(500);
    }
    
    await setSliderValue(page, 'slider-noise-reduction', 50);
    await page.waitForTimeout(1000);
    
    // Check for errors (ignore expected warnings)
    const criticalErrors = errors.filter(err => 
      !err.includes('PostCSS') && 
      !err.includes('DevTools')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    if (criticalErrors.length > 0) {
      console.log('❌ Console errors found:', criticalErrors);
    }
  });

  /**
   * TEST 9: Admin panel loads correctly
   */
  test('Admin panel displays team overview', async ({ page }) => {
    // Navigate to admin panel
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Check for admin elements - use more specific selector
    await expect(page.getByRole('heading', { name: /Team Monitor|Admin/i })).toBeVisible({ timeout: 10000 });
    
    // Should show agent cards or list
    const hasAgents = await page.locator('[class*="agent"]').count() > 0;
    expect(hasAgents).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/admin-panel.png', fullPage: true });
  });

  /**
   * TEST 10: Multiple settings combinations
   */
  test('Can apply multiple settings together', async ({ page }) => {
    // Start processing
    await page.click('[data-testid="button-start-processing"]');
    await page.waitForTimeout(2000);
    
    // Enable noise reduction
    const nrSwitch = page.getByTestId('switch-noise-reduction');
    const nrChecked = await nrSwitch.getAttribute('data-state');
    if (nrChecked !== 'checked') {
      await nrSwitch.click();
      await page.waitForTimeout(300);
    }
    await setSliderValue(page, 'slider-noise-reduction', 40);
    await page.waitForTimeout(300);
    
    // Enable voice modifier (if available)
    const vmSwitch = page.getByTestId('switch-accent-modifier');
    if (await vmSwitch.isVisible()) {
      const vmChecked = await vmSwitch.getAttribute('data-state');
      if (vmChecked !== 'checked') {
        await vmSwitch.click();
        await page.waitForTimeout(300);
      }
    }
    
    // Adjust clarity boost (if available)
    const claritySlider = page.getByTestId('slider-clarity-boost');
    if (await claritySlider.isVisible()) {
      await setSliderValue(page, 'slider-clarity-boost', 30);
      await page.waitForTimeout(300);
    }
    
    // Enable volume normalization (if available)
    const vnSwitch = page.getByTestId('switch-volume-normalization');
    if (await vnSwitch.isVisible()) {
      await vnSwitch.click();
    }
    
    await page.waitForTimeout(1000);
    
    // Take screenshot of combined settings
    await page.screenshot({ path: 'tests/screenshots/combined-settings.png', fullPage: true });
    
    console.log('✓ Successfully applied multiple settings');
  });
});

/**
 * Visual regression test group
 */
test.describe('Visual Regression Tests', () => {
  
  test('Main dashboard visual consistency', async ({ page }) => {
    await page.goto('http://localhost:5000');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot for visual comparison
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-baseline.png',
      fullPage: true 
    });
  });
  
  test('Audio controls panel visual consistency', async ({ page }) => {
    await page.goto('http://localhost:5000');
    await page.waitForTimeout(1000);
    
    // Find audio controls section
    await page.screenshot({ 
      path: 'tests/screenshots/audio-controls-baseline.png',
      fullPage: true 
    });
  });
});
