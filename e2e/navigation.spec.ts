import { expect, test } from '@playwright/test';
import type { Diagnostics } from '../src/debug/diagnostics';
import {
  diagnostics,
  expectInside,
  linger,
  pressElement,
  trackConsoleErrors,
  trackDomListeners,
  waitForScene,
  type DomListenerSummary,
} from './helpers';

const ROUND_TRIPS = 5;

function stableSnapshot(d: Diagnostics, dom: DomListenerSummary) {
  return {
    canvases: d.canvases,
    activeScenes: d.activeScenes,
    displayListSize: d.displayListSize,
    textureKeys: d.textureKeys,
    listeners: d.listeners,
    dom,
  };
}

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('start screen fits the phone viewport', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  const d = await waitForScene(page, 'start');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');

  expect(d.canvases).toBe(1);
  expect(d.layout?.orientation).toBe(info.project.name.includes('portrait') ? 'portrait' : 'landscape');
  expect(d.layout?.viewport).toEqual(viewport);
  for (const name of ['title', 'subtitle', 'footer', 'play-button', 'sandbox-button', 'review-button']) expectInside(name, d.layout?.elements[name], viewport);
  expect(d.layout?.elements['play-button']?.height ?? 0).toBeGreaterThanOrEqual(44);
  await linger(page);
  expect(errors).toEqual([]);
});

test('Start -> attack drill -> Back repeated keeps one canvas and stable listeners', async ({ page }) => {
  // Five round trips through the playable attack drill (the old static pitch was near-instant to boot).
  test.setTimeout(120_000);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  const initial = await waitForScene(page, 'start');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  expect(initial.canvases).toBe(1);
  await linger(page);

  let startBaseline: ReturnType<typeof stableSnapshot> | undefined;
  let pitchBaseline: ReturnType<typeof stableSnapshot> | undefined;

  for (let i = 0; i < ROUND_TRIPS; i++) {
    const via = i % 2 === 0 ? 'touch' : 'mouse';
    await pressElement(page, 'play-button', via);
    const pitch = await waitForScene(page, 'attack');
    expect(pitch.canvases).toBe(1);
    for (const name of ['pitch', 'goal', 'back-button']) {
      expectInside(name, pitch.layout?.elements[name], viewport);
    }
    const pitchSnap = stableSnapshot(pitch, await page.evaluate(() => window.__domListeners?.() ?? {}));
    if (pitchBaseline) expect(pitchSnap, `attack drill visit ${i + 1}`).toEqual(pitchBaseline);
    else pitchBaseline = pitchSnap;
    await linger(page);

    await pressElement(page, 'back-button', via);
    const start = await waitForScene(page, 'start');
    expect(start.canvases).toBe(1);
    const startSnap = stableSnapshot(start, await page.evaluate(() => window.__domListeners?.() ?? {}));
    if (startBaseline) expect(startSnap, `start return ${i + 1}`).toEqual(startBaseline);
    else startBaseline = startSnap;
    // Phaser listener totals on return equal the first boot (textures are the only allowed one-time growth).
    expect(start.listeners).toEqual(initial.listeners);
    await linger(page);
  }

  expect(await page.locator('canvas').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('attack drill re-lays out on orientation change and Back still works', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await pressElement(page, 'play-button', 'touch');
  const before = await waitForScene(page, 'attack');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  await linger(page);

  const rotated = { width: viewport.height, height: viewport.width };
  await page.setViewportSize(rotated);
  const expected = rotated.height > rotated.width ? 'portrait' : 'landscape';
  await page.waitForFunction((o) => window.__SMR__?.diagnostics().layout?.orientation === o, expected);
  const after = await diagnostics(page);
  expect(after.layout?.orientation).not.toBe(before.layout?.orientation);
  expect(after.layout?.viewport).toEqual(rotated);
  expect(after.canvases).toBe(1);
  expect(after.listeners).toEqual(before.listeners);
  for (const name of ['pitch', 'goal', 'back-button']) {
    expectInside(name, after.layout?.elements[name], rotated);
  }
  await linger(page);

  await pressElement(page, 'back-button', 'touch');
  const start = await waitForScene(page, 'start');
  expect(start.layout?.orientation).toBe(expected);
  for (const name of ['title', 'play-button']) expectInside(name, start.layout?.elements[name], rotated);
  await linger(page);
  expect(errors).toEqual([]);
});

test('canvas recovers when Phaser refreshes with a stale parent size (rotation race)', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await pressElement(page, 'play-button', 'touch');
  const before = await waitForScene(page, 'attack');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');

  // Replays what Phaser's orientation handler does when it runs before a game step:
  // refresh() with the previous orientation's parentSize, after which the cached size is current again.
  await page.evaluate(({ width, height }) => {
    const scale = window.__SMR__?.game.scale;
    if (!scale) throw new Error('debug handle missing');
    scale.parentSize.setSize(height, width);
    scale.refresh();
  }, viewport);

  await page.waitForFunction(
    ({ width, height }) => {
      const rect = document.querySelector('canvas')?.getBoundingClientRect();
      return rect !== undefined && rect.width === width && rect.height === height;
    },
    viewport,
    { timeout: 3000 },
  );
  const after = await diagnostics(page);
  expect(after.layout?.viewport).toEqual(viewport);
  expect(after.layout?.orientation).toBe(before.layout?.orientation);
  for (const name of ['pitch', 'goal', 'back-button']) {
    expectInside(name, after.layout?.elements[name], viewport);
  }
  expect(errors).toEqual([]);
});

test('keyboard shortcuts navigate without stacking scenes', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await page.locator('canvas').focus();
  await page.keyboard.press('p');
  await waitForScene(page, 'attack');
  await page.keyboard.press('Escape');
  const start = await waitForScene(page, 'start');
  expect(start.activeScenes).toEqual(['start']);
  expect(errors).toEqual([]);
});
