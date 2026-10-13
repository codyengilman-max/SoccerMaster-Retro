import { expect, type Page } from '@playwright/test';
import type { Diagnostics } from '../src/debug/diagnostics';
import type { Rect } from '../src/game';

export const recording = Boolean(process.env.RECORD_VIDEO);

export interface DomListenerSummary {
  readonly [target: string]: number;
}

declare global {
  interface Window {
    __domListeners?: () => DomListenerSummary;
  }
}

/** Counts live DOM listeners (add minus matching remove) before the game boots. */
export async function trackDomListeners(page: Page): Promise<void> {
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

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

export async function diagnostics(page: Page): Promise<Diagnostics> {
  return page.evaluate(() => {
    if (!window.__SMR__) throw new Error('debug handle missing');
    return window.__SMR__.diagnostics();
  });
}

export async function waitForScene(page: Page, key: string): Promise<Diagnostics> {
  await page.waitForFunction((k) => {
    const d = window.__SMR__?.diagnostics();
    return d !== undefined && d.activeScenes.length === 1 && d.activeScenes[0] === k && d.layout !== null;
  }, key);
  return diagnostics(page);
}

export async function pressElement(page: Page, name: string, via: 'mouse' | 'touch'): Promise<void> {
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

export async function linger(page: Page): Promise<void> {
  if (recording) await page.waitForTimeout(900);
}

export function expectInside(name: string, rect: Rect | undefined, viewport: { width: number; height: number }): void {
  expect(rect, name).toBeDefined();
  if (!rect) return;
  expect(rect.width, `${name} width`).toBeGreaterThan(0);
  expect(rect.x, `${name} left`).toBeGreaterThanOrEqual(-0.5);
  expect(rect.y, `${name} top`).toBeGreaterThanOrEqual(-0.5);
  expect(rect.x + rect.width, `${name} right`).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(rect.y + rect.height, `${name} bottom`).toBeLessThanOrEqual(viewport.height + 0.5);
}

