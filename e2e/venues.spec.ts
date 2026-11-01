import { expect, test } from '@playwright/test';
import { pressElement, waitForScene } from './helpers';

// Regular-match venues: the projected grass actually draws (faces in view; the old per-frame rebuild drew 0), every asset loads, and the far-side people stay on screen.
test('each venue draws its grass mesh, loads every asset and keeps sideline heads on screen (landscape)', async ({ page }, info) => {
  test.skip(!info.project.name.includes('landscape'), 'the sideline view is the landscape presentation');
  test.setTimeout(240_000);
  for (const id of ['pinnacle', 'bell94', 'scottsdale', 'westside']) {
    await page.goto(`/?debug=1&dev&venue=${id}`);
    await waitForScene(page, 'start');
    await pressElement(page, 'sandbox-button', 'mouse');
    await waitForScene(page, 'formation');
    await pressElement(page, 'pick-1-3-2-3', 'mouse');
    await pressElement(page, 'kickoff-button', 'mouse');
    await waitForScene(page, 'match');
    await expect
      .poll(() => page.evaluate(() => (window as any).__SMR__.diagnostics().gameplay.venue?.layer?.grassFaces ?? 0), { timeout: 20_000 })
      .toBeGreaterThan(100);
    const v = await page.evaluate(() => (window as any).__SMR__.diagnostics().gameplay.venue);
    expect(v.id).toBe(id);
    expect(v.layer.missing).toEqual([]);
    expect(v.layer.actors).toBeGreaterThan(0);
    expect(v.layer.headTop).toBeGreaterThanOrEqual(0);
  }
});
