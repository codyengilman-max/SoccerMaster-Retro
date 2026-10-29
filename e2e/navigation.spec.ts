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

/** PlayerArt's drawn-fallback frames (`pa:`): a bounded LRU cache filled as players move, removed on shutdown. */
const DRAWN_FRAME = /^pa:/;
const DRAWN_FRAME_LIMIT = 512; // PLAYER_ART.maxFrames

function stableSnapshot(d: Diagnostics, dom: DomListenerSummary, live = false) {
  return {
    canvases: d.canvases,
    activeScenes: d.activeScenes,
    displayListSize: d.displayListSize,
    // During live play the drawn-frame cache depends on how far players have run, so it is checked by its bound instead.
    textureKeys: live ? d.textureKeys.filter((k) => !DRAWN_FRAME.test(k)) : d.textureKeys,
    listeners: d.listeners,
    dom,
  };
}

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('player start screen offers only Story, and it fits the phone viewport', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  const d = await waitForScene(page, 'start');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');

  expect(d.canvases).toBe(1);
  expect(d.layout?.orientation).toBe(info.project.name.includes('portrait') ? 'portrait' : 'landscape');
  expect(d.layout?.viewport).toEqual(viewport);
  for (const name of ['title', 'subtitle', 'footer', 'story-button']) expectInside(name, d.layout?.elements[name], viewport);
  for (const name of ['sandbox-button', 'career-button', 'jungle-button', 'review-button']) expect(d.layout?.elements[name], name).toBeUndefined();
  expect(d.layout?.elements['story-button']?.height ?? 0).toBeGreaterThanOrEqual(44);
  // The old free-match shortcut does nothing in story mode.
  await page.keyboard.press('t');
  await linger(page);
  expect((await diagnostics(page)).activeScenes).toEqual(['start']);
  await pressElement(page, 'story-button', 'touch');
  await waitForScene(page, 'story');
  expect(errors).toEqual([]);
});

test('?dev start screen keeps the developer and review entries, and they fit', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  const d = await waitForScene(page, 'start');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  for (const name of ['title', 'subtitle', 'footer', 'story-button', 'sandbox-button', 'career-button', 'jungle-button', 'review-button']) expectInside(name, d.layout?.elements[name], viewport);
  expect(d.layout?.elements['sandbox-button']?.height ?? 0).toBeGreaterThanOrEqual(44);
  await linger(page);
  expect(errors).toEqual([]);
});

test('Start -> Jungle Ball -> Leave repeated keeps one canvas and stable listeners', async ({ page }) => {
  // Five round trips through a playable gameplay scene (Jungle Ball).
  test.setTimeout(120_000);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  const initial = await waitForScene(page, 'start');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  expect(initial.canvases).toBe(1);
  await linger(page);

  let startBaseline: ReturnType<typeof stableSnapshot> | undefined;
  let pitchBaseline: ReturnType<typeof stableSnapshot> | undefined;

  for (let i = 0; i < ROUND_TRIPS; i++) {
    const via = i % 2 === 0 ? 'touch' : 'mouse';
    await pressElement(page, 'jungle-button', via);
    await waitForScene(page, 'jungle');
    // Snapshot once the courtyard and sprite sheets have arrived: until then the loader holds a one-shot listener.
    await expect
      .poll(async () => {
        const a = ((await diagnostics(page)).gameplay as { art?: { background: boolean; loaded: boolean } }).art;
        return Boolean(a?.background && a.loaded);
      }, { timeout: 20_000 })
      .toBe(true);
    const pitch = await waitForScene(page, 'jungle');
    expect(pitch.canvases).toBe(1);
    // Package sheets are bound by competitor id: the created player (boy by default here), Blake and Sam; Alex has none.
    expect((pitch.gameplay as { art: { sets: unknown } }).art.sets).toEqual({ player: 'jungle4-boy', alex: 'jungle4-rival', blake: 'jungle4-blake', sam: 'jungle4-sam' });
    for (const name of ['pen', 'back-button']) {
      expectInside(name, pitch.layout?.elements[name], viewport);
    }
    expect(pitch.textureKeys.filter((k) => DRAWN_FRAME.test(k)).length).toBeLessThanOrEqual(DRAWN_FRAME_LIMIT);
    const pitchSnap = stableSnapshot(pitch, await page.evaluate(() => window.__domListeners?.() ?? {}), true);
    if (pitchBaseline) expect(pitchSnap, `jungle visit ${i + 1}`).toEqual(pitchBaseline);
    else pitchBaseline = pitchSnap;
    await linger(page);

    // Jungle Ball: Pause, then confirm Leave.
    await pressElement(page, 'back-button', via);
    await pressElement(page, 'leave-confirm-button', via);
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

test('Jungle Ball re-lays out on orientation change and Leave still works', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'jungle-button', 'touch');
  const before = await waitForScene(page, 'jungle');
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
  for (const name of ['pen', 'back-button']) {
    expectInside(name, after.layout?.elements[name], rotated);
  }
  await linger(page);

  // Jungle Ball: Pause, then confirm Leave.
  await pressElement(page, 'back-button', 'touch');
  await pressElement(page, 'leave-confirm-button', 'touch');
  const start = await waitForScene(page, 'start');
  expect(start.layout?.orientation).toBe(expected);
  for (const name of ['title', 'sandbox-button']) expectInside(name, start.layout?.elements[name], rotated);
  await linger(page);
  expect(errors).toEqual([]);
});

test('canvas recovers when Phaser refreshes with a stale parent size (rotation race)', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'jungle-button', 'touch');
  const before = await waitForScene(page, 'jungle');
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
  for (const name of ['pen', 'back-button']) {
    expectInside(name, after.layout?.elements[name], viewport);
  }
  expect(errors).toEqual([]);
});

test('keyboard shortcuts navigate without stacking scenes', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await page.locator('canvas').focus();
  await page.keyboard.press('t');
  await waitForScene(page, 'formation');
  await page.keyboard.press('Escape');
  const start = await waitForScene(page, 'start');
  expect(start.activeScenes).toEqual(['start']);
  expect(errors).toEqual([]);
});
