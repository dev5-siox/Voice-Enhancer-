import { test, expect } from '@playwright/test';

/**
 * VoicePro Simple Smoke Tests
 * 
 * Basic tests to verify the app is working
 */

test.describe('VoicePro Smoke Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000');
  });

  test('Homepage loads successfully', async ({ page }) => {
    // Wait for any content to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check page is not blank
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(10);
    
    console.log('✓ Page loaded with content');
  });

  test('App contains audio controls', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check for any button (start processing or other controls)
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
    
    console.log(`✓ Found ${buttons} interactive buttons`);
  });

  test('Can take screenshot of app', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-screenshots/app-homepage.png',
      fullPage: true 
    });
    
    console.log('✓ Screenshot captured');
  });
});
