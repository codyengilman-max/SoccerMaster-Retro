import { expect, test, type Page } from '@playwright/test';
import type { Diagnostics } from '../src/debug/diagnostics';
import type { Rect } from '../src/game';

const ROUND_TRIPS = 5;
const recording = Boolean(process.env.RECORD_VIDEO);

interface DomListenerSummary {
  readonly [target: string]: number;
}

declare global {
  interface Window {
    __domListeners?: () => DomListenerSummary;
  }
}

/** Counts live DOM listeners (add minus matching remove) before the game boots. */
async function trackDomListeners(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Entry = { target: EventTarget; type: string; listener: unknown; capture: boolean };
    const live: Entry[] = [];
    const captureOf = (o: unknown): boolean => (typeof o === 'boolean' ? o : Boolean((o as { capture?: boolean } | undefined)?.capture));
    const find = (e: Omit<Entry, never>): number =>
      live.findIndex((x) => x.target === e.target && x.type === e.type && x.listener === e.listener && x.capture === e.capture);
    const proto = EventTarget.prototype;
    const add = proto.addEventListener;
    const remove = proto.removeEventListener;
    proto.addEventListener = function (this: EventTarget, type: string, listener: unknown, options?: unknown) {
      const entry = { target: this, type, listener, capture: captureOf(options) };
      if (listener && find(entry) === -1) live.push(entry);
      return add.call(this, type, listener as EventListener, options as AddEventListenerOptions);
    };
    proto.removeEventListener = function (this: EventTarget, type: string, listener: unknown, options?: unknown) {
      const i = find({ target: this, type, listener, capture: captureOf(options) });
      if (i !== -1) live.splice(i, 1);
      return remove.call(this, type, listener as EventListener, options as EventListenerOptions);
    };
    const label = (t: EventTarget): string =>
      t === window ? 'window' : t === document ? 'document' : t instanceof HTMLCanvasElement ? 'canvas' : t instanceof Node ? 'node' : 'other';
    window.__domListeners = () => {
      const out: Record<string, number> = {};
      for (const e of live) out[label(e.target)] = (out[label(e.target)] ?? 0) + 1;
      return out;
    };
  });
}

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function diagnostics(page: Page): Promise<Diagnostics> {
  return page.evaluate(() => {
    if (!window.__SMR__) throw new Error('debug handle missing');
    return window.__SMR__.diagnostics();
  });
}

async function waitForScene(page: Page, key: string): Promise<Diagnostics> {
  await page.waitForFunction((k) => {
    const d = window.__SMR__?.diagnostics();
    return d !== undefined && d.activeScenes.length === 1 && d.activeScenes[0] === k && d.layout !== null;
  }, key);
  return diagnostics(page);
}

async function pressElement(page: Page, name: string, via: 'mouse' | 'touch'): Promise<void> {
  const d = await diagnostics(page);
  const rect = d.layout?.elements[name];
  if (!rect) throw new Error(`no element ${name} in ${d.activeScenes.join(',')}`);
  const canvas = await page.locator('canvas').boundingBox();
  if (!canvas) throw new Error('canvas not visible');
  const x = canvas.x + rect.x + rect.width / 2;
  const y = canvas.y + rect.y + rect.height / 2;
  if (via === 'touch') await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function linger(page: Page): Promise<void> {
  if (recording) await page.waitForTimeout(900);
}

function expectInside(name: string, rect: Rect | undefined, viewport: { width: number; height: number }): void {
  expect(rect, name).toBeDefined();
  if (!rect) return;
  expect(rect.width, `${name} width`).toBeGreaterThan(0);
  expect(rect.x, `${name} left`).toBeGreaterThanOrEqual(-0.5);
  expect(rect.y, `${name} top`).toBeGreaterThanOrEqual(-0.5);
  expect(rect.x + rect.width, `${name} right`).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(rect.y + rect.height, `${name} bottom`).toBeLessThanOrEqual(viewport.height + 0.5);
}

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
  for (const name of ['title', 'subtitle', 'footer', 'enter-button']) expectInside(name, d.layout?.elements[name], viewport);
  expect(d.layout?.elements['enter-button']?.height ?? 0).toBeGreaterThanOrEqual(44);
  await linger(page);
  expect(errors).toEqual([]);
});

test('Start -> pitch -> Back repeated keeps one canvas and stable listeners', async ({ page }) => {
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
    await pressElement(page, 'enter-button', via);
    const pitch = await waitForScene(page, 'pitch');
    expect(pitch.canvases).toBe(1);
    for (const name of ['pitch', 'goalA', 'goalB', 'player', 'ball', 'back-button']) {
      expectInside(name, pitch.layout?.elements[name], viewport);
    }
    const pitchSnap = stableSnapshot(pitch, await page.evaluate(() => window.__domListeners?.() ?? {}));
    if (pitchBaseline) expect(pitchSnap, `pitch visit ${i + 1}`).toEqual(pitchBaseline);
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

test('pitch re-lays out on orientation change and Back still works', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await pressElement(page, 'enter-button', 'touch');
  const before = await waitForScene(page, 'pitch');
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
  for (const name of ['pitch', 'goalA', 'goalB', 'player', 'ball', 'back-button']) {
    expectInside(name, after.layout?.elements[name], rotated);
  }
  await linger(page);

  await pressElement(page, 'back-button', 'touch');
  const start = await waitForScene(page, 'start');
  expect(start.layout?.orientation).toBe(expected);
  for (const name of ['title', 'enter-button']) expectInside(name, start.layout?.elements[name], rotated);
  await linger(page);
  expect(errors).toEqual([]);
});

test('keyboard shortcuts navigate without stacking scenes', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await page.locator('canvas').focus();
  await page.keyboard.press('Enter');
  await waitForScene(page, 'pitch');
  await page.keyboard.press('Escape');
  const start = await waitForScene(page, 'start');
  expect(start.activeScenes).toEqual(['start']);
  expect(errors).toEqual([]);
});
