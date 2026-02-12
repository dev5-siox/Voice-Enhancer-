import { test, expect } from '@playwright/test';

async function dismissSetupIfPresent(page: any) {
  // Mirrors the robust setup dismissal in functional.spec.ts
  try {
    const welcomeDialog = page.locator('[role="dialog"]').first();
    const isVisible = await welcomeDialog.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) return;

    const nameInput = page.getByTestId('input-agent-name');
    await nameInput.waitFor({ state: 'visible', timeout: 3000 });
    await nameInput.clear();
    await nameInput.fill('Test Agent Audio');
    await page.waitForTimeout(300);

    const registerButton = page.getByTestId('button-register');
    await registerButton.waitFor({ state: 'visible', timeout: 3000 });
    await registerButton.click({ force: true });

    await welcomeDialog.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(500);
  } catch {
    // Best-effort; tests should proceed.
  }
}

async function waitForE2EHarness(page: any) {
  await page.waitForFunction(() => !!(window as any).__voxfilterE2E, null, { timeout: 20_000 });
}

async function e2eSetSettings(page: any, partial: Record<string, any>) {
  await page.evaluate((p) => (window as any).__voxfilterE2E.setSettings(p), partial);
}

async function e2eStartProcessing(page: any) {
  await page.evaluate(() => (window as any).__voxfilterE2E.startProcessing());
}

async function e2eRecordHash(page: any, ms: number) {
  await page.evaluate(() => (window as any).__voxfilterE2E.startRecording());
  await page.waitForTimeout(ms);
  return await page.evaluate(() => (window as any).__voxfilterE2E.stopRecording());
}

test.describe('Audio processing E2E (real pipeline)', () => {
  test('records different outputs when toggling processing features', async ({ page, context }) => {
    test.setTimeout(240_000);
    await context.grantPermissions(['microphone']);

    const consoleErrors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[console.error] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err: any) => {
      consoleErrors.push(`pageerror: ${String(err?.message || err)}`);
    });

    await page.goto('http://localhost:5000');
    await page.waitForSelector('[data-testid="button-start-processing"]', { timeout: 20_000 });
    await dismissSetupIfPresent(page);
    await waitForE2EHarness(page);

    await e2eStartProcessing(page);
    await expect(page.getByTestId('button-stop-processing')).toBeVisible({ timeout: 20_000 });

    // ---- Baseline: processing running, but features minimized ----
    await e2eSetSettings(page, {
      noiseReductionEnabled: false,
      accentModifierEnabled: false,
      clarityBoost: 0,
      volumeNormalization: false,
      // Ensure preset-related fields don't accidentally apply a preset.
      accentPreset: 'neutral',
      pitchShift: 0,
      formantShift: 0,
    });
    const baseline = await e2eRecordHash(page, 8_000);
    expect(baseline.size).toBeGreaterThan(1_000);

    // ---- Noise reduction HIGH ----
    await e2eSetSettings(page, { noiseReductionEnabled: true, noiseReductionLevel: 85 });
    const nrHigh = await e2eRecordHash(page, 8_000);
    expect(nrHigh.size).toBeGreaterThan(1_000);

    // ---- Voice modifier: "deeper" (explicitly set formant/pitch so preset actually applies) ----
    await e2eSetSettings(page, { accentModifierEnabled: true, accentPreset: 'deeper', pitchShift: -3, formantShift: -15 });
    const deeper = await e2eRecordHash(page, 8_000);
    expect(deeper.size).toBeGreaterThan(1_000);

    // ---- Clarity boost HIGH ----
    await e2eSetSettings(page, { clarityBoost: 80 });
    const clarity = await e2eRecordHash(page, 8_000);
    expect(clarity.size).toBeGreaterThan(1_000);

    // Sanity: outputs should not be identical hashes
    expect(nrHigh.sha256).not.toEqual(baseline.sha256);
    expect(deeper.sha256).not.toEqual(baseline.sha256);
    expect(clarity.sha256).not.toEqual(baseline.sha256);

    // Keep the test actionable when something goes wrong.
    const critical = consoleErrors.filter(e => !e.includes('PostCSS'));
    expect(critical).toEqual([]);
  });
});

