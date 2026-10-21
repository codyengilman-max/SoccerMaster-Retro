import { expect, test } from '@playwright/test';
import { diagnostics, expectInside, linger, pressElement, trackConsoleErrors, trackDomListeners, waitForScene } from './helpers';

type JungleSnap = { phase: string; t: number; player: { x: number; y: number }; scores: Record<string, number> };
const snap = async (page: import('@playwright/test').Page): Promise<JungleSnap> => (await diagnostics(page)).gameplay as JungleSnap;

/** Press a move button until the sim starts that move. A press while the player is stunned (e.g. by an AI turbo hit) is rejected by the sim, as in real play. */
async function pressMove(page: import('@playwright/test').Page, kind: 'push' | 'slide'): Promise<void> {
  type Hits = { gameplay: { hits?: { kind: string; t: number } | null } | null };
  const last = async (): Promise<{ kind: string; t: number } | null> => ((await diagnostics(page)) as unknown as Hits).gameplay?.hits ?? null;
  const before = (await last())?.t ?? -1;
  for (let attempt = 0; attempt < 8; attempt++) {
    await pressElement(page, kind, 'touch');
    try {
      await expect.poll(async () => { const h = await last(); return !!h && h.kind === kind && h.t > before; }, { timeout: 2500 }).toBe(true);
      return;
    } catch {
      // Stunned or knocked down: wait for recovery and press again.
    }
  }
  throw new Error(`${kind} never started after 8 presses`);
}

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('Jungle Ball opens from Start, fits the screen, runs, and Leave returns with stable listeners', async ({ page }) => {
  // Three round trips into a sprite-rendered scene plus PUSH/SLIDE; slow CI runners need more than the 30 s default.
  test.setTimeout(120_000);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  const initial = await waitForScene(page, 'start');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  let baseline: unknown;
  for (let i = 0; i < 3; i++) {
    await pressElement(page, 'jungle-button', i % 2 === 0 ? 'touch' : 'mouse');
    const d = await waitForScene(page, 'jungle');
    expect(d.canvases).toBe(1);
    for (const name of ['pen', 'title', 'back-button', 'stick', 'turbo', 'shoot', 'slide', 'push']) expectInside(name, d.layout?.elements[name], viewport);
    await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { phase?: string } | null)?.phase === 'live');
    const t0 = (await snap(page)).t;
    await page.waitForFunction((t) => ((window.__SMR__?.diagnostics().gameplay as { t?: number } | null)?.t ?? 0) > t + 0.5, t0, { timeout: 8000 });
    if (i === 0) {
      // PUSH and SLIDE are real buttons that start an arcade move.
      await pressMove(page, 'push');
      await page.waitForTimeout(700);
      await pressMove(page, 'slide');
      // TURBO is held: the sim sees it while the finger is down and drops it on release.
      const box = d.layout!.elements.turbo!;
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { turbo?: { held: boolean } } | null)?.turbo?.held === true);
      await page.mouse.up();
      await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { turbo?: { held: boolean } } | null)?.turbo?.held === false);
      await page.screenshot({ path: `test-results/jungle-${viewport.width}x${viewport.height}.png` });
    }
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
  test.setTimeout(90_000);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
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
  for (const name of ['pen', 'title', 'back-button', 'stick', 'turbo', 'shoot', 'slide', 'push']) expectInside(name, after.layout?.elements[name], rotated);
  await page.keyboard.press('Escape');
  await waitForScene(page, 'start');
  expect(errors).toEqual([]);
});
