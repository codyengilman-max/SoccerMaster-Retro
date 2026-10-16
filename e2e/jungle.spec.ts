import { expect, test } from '@playwright/test';
import { diagnostics, expectInside, linger, pressElement, trackConsoleErrors, trackDomListeners, waitForScene } from './helpers';

type JungleSnap = { phase: string; t: number; player: { x: number; y: number }; scores: Record<string, number> };
const snap = async (page: import('@playwright/test').Page): Promise<JungleSnap> => (await diagnostics(page)).gameplay as JungleSnap;

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('Jungle Ball opens from Start, fits the screen, runs, and Leave returns with stable listeners', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  const initial = await waitForScene(page, 'start');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  let baseline: unknown;
  for (let i = 0; i < 3; i++) {
    await pressElement(page, 'jungle-button', i % 2 === 0 ? 'touch' : 'mouse');
    const d = await waitForScene(page, 'jungle');
    expect(d.canvases).toBe(1);
    for (const name of ['pen', 'back-button', 'stick', 'shoot']) expectInside(name, d.layout?.elements[name], viewport);
    await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { phase?: string } | null)?.phase === 'live');
    const t0 = (await snap(page)).t;
    await page.waitForFunction((t) => ((window.__SMR__?.diagnostics().gameplay as { t?: number } | null)?.t ?? 0) > t + 0.5, t0, { timeout: 8000 });
    await pressElement(page, 'back-button', 'touch');
    const start = await waitForScene(page, 'start');
    expect(start.canvases).toBe(1);
    expect(start.listeners).toEqual(initial.listeners);
    const dom = await page.evaluate(() => window.__domListeners?.() ?? {});
    if (baseline) expect(dom).toEqual(baseline);
    else baseline = dom;
    await linger(page);
  }
  expect(errors).toEqual([]);
});

test('keyboard moves the Jungle Ball player and rotation keeps the pen on screen', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await pressElement(page, 'jungle-button', 'touch');
  await waitForScene(page, 'jungle');
  await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { phase?: string } | null)?.phase === 'live');
  await page.locator('canvas').focus();
  const before = (await snap(page)).player.y;
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowDown');
  expect((await snap(page)).player.y).toBeGreaterThan(before + 0.5);
  const viewport = page.viewportSize()!;
  const rotated = { width: viewport.height, height: viewport.width };
  await page.setViewportSize(rotated);
  await page.waitForFunction((v) => window.__SMR__?.diagnostics().layout?.viewport.width === v.width, rotated);
  const after = await diagnostics(page);
  for (const name of ['pen', 'back-button', 'stick', 'shoot']) expectInside(name, after.layout?.elements[name], rotated);
  await page.keyboard.press('Escape');
  await waitForScene(page, 'start');
  expect(errors).toEqual([]);
});
