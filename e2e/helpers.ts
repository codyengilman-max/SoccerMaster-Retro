import { expect, type CDPSession, type Page } from '@playwright/test';
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

/** Waits until `key`'s loader is idle: while files are in flight Phaser's loader holds an extra scene `update` listener. */
export async function waitForLoaderIdle(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => {
    const scene = window.__SMR__?.game.scene.getScene(k) as unknown as { load?: { isLoading(): boolean } } | undefined;
    return scene?.load !== undefined && !scene.load.isLoading();
  }, key, { timeout: 20_000 });
}

export async function waitForScene(page: Page, key: string): Promise<Diagnostics> {
  await page.waitForFunction((k) => {
    const d = window.__SMR__?.diagnostics();
    return d !== undefined && d.activeScenes.length === 1 && d.activeScenes[0] === k && d.layout !== null;
  }, key);
  return diagnostics(page);
}

/** My Training groups these under Home Practice and Progress; a test asking for one from the hub opens its group first. */
const HUB_GROUP: Readonly<Record<string, string>> = { 'nav-sessions': 'nav-practice', 'nav-library': 'nav-practice', 'nav-journal': 'nav-practice', 'nav-review': 'nav-progress', 'nav-player': 'nav-progress', 'nav-play': 'nav-progress' };

/** Wheel a scrolling screen (My Player) until the named element is fully inside the viewport. */
export async function revealElement(page: Page, name: string): Promise<void> {
  for (let k = 0; k < 25; k++) {
    const l = (await diagnostics(page)).layout;
    const r = l?.elements[name];
    if (!l || !r || (r.y >= 0 && r.y + r.height <= l.viewport.height)) return;
    await page.mouse.move(l.viewport.width / 2, l.viewport.height / 2);
    await page.mouse.wheel(0, r.y < 0 ? -240 : 240);
    await page.waitForTimeout(60);
  }
}

export async function pressElement(page: Page, name: string, via: 'mouse' | 'touch'): Promise<void> {
  let d = await diagnostics(page);
  const group = HUB_GROUP[name];
  if (group && !d.layout?.elements[name] && d.layout?.elements[group]) {
    await pressElement(page, group, via);
    await expect.poll(async () => !!(await diagnostics(page)).layout?.elements[name], { timeout: 5000 }).toBe(true);
    d = await diagnostics(page);
  }
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


export type PointerMode = 'touch' | 'mouse';
export type Point = { x: number; y: number };

/** One pointer, driven either as a real touch (CDP) or a mouse. */
interface TouchStep {
  readonly type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel';
  readonly p?: Point | undefined;
}

export class Finger {
  private cdp: CDPSession | null = null;
  private cachedOrigin: Point | null = null;
  constructor(
    private readonly page: Page,
    readonly mode: PointerMode,
  ) {}
  private async origin(): Promise<Point> {
    if (this.cachedOrigin) return this.cachedOrigin;
    const box = await this.page.locator('canvas').boundingBox();
    if (!box) throw new Error('canvas not visible');
    this.cachedOrigin = { x: box.x, y: box.y };
    return this.cachedOrigin;
  }
  /**
   * Sends touch steps back-to-back. Chromium uses CDP (real input pipeline); other engines (WebKit)
   * get synthetic TouchEvents on the canvas dispatched in one evaluate, so they also arrive together.
   */
  private async sendTouches(steps: readonly TouchStep[]): Promise<void> {
    const o = await this.origin();
    if (this.page.context().browser()?.browserType().name() === 'chromium') {
      this.cdp ??= await this.page.context().newCDPSession(this.page);
      const cdp = this.cdp;
      const at = (p?: Point) => (p ? [{ x: o.x + p.x, y: o.y + p.y, id: 1 }] : []);
      await Promise.all(
        steps.map((st) =>
          cdp.send('Input.dispatchTouchEvent', {
            type: st.type,
            touchPoints: at(st.p),
          }),
        ),
      );
      return;
    }
    const list = steps.map((st) => ({
      type: st.type,
      x: st.p ? o.x + st.p.x : null,
      y: st.p ? o.y + st.p.y : null,
    }));
    await this.page.evaluate((items) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('canvas not found');
      const names = {
        touchStart: 'touchstart',
        touchMove: 'touchmove',
        touchEnd: 'touchend',
        touchCancel: 'touchcancel',
      } as const;
      const w = window as unknown as { __smrTouch?: Touch | null };
      let last = w.__smrTouch ?? null;
      for (const it of items) {
        // WebKit has no Touch constructor; its legacy document.createTouch/createTouchList still work.
        const legacy = document as unknown as {
          createTouch(view: Window, target: EventTarget, id: number, pageX: number, pageY: number, screenX: number, screenY: number): Touch;
          createTouchList(...touches: Touch[]): TouchList;
        };
        const make = (x: number, y: number): Touch =>
          typeof legacy.createTouch === 'function'
            ? legacy.createTouch(window, canvas, 1, x, y, x, y)
            : new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
                pageX: x,
                pageY: y,
                screenX: x,
                screenY: y,
              });
        const list = (ts: Touch[]): TouchList | Touch[] => (typeof legacy.createTouchList === 'function' ? legacy.createTouchList(...ts) : ts);
        const t = it.x === null || it.y === null ? last : make(it.x, it.y);
        const ending = it.type === 'touchEnd' || it.type === 'touchCancel';
        const changed = t ? [t] : [];
        const live = list(ending ? [] : changed) as Touch[];
        canvas.dispatchEvent(
          new TouchEvent(names[it.type], {
            bubbles: true,
            cancelable: true,
            touches: live,
            targetTouches: live,
            changedTouches: list(changed) as Touch[],
          }),
        );
        last = ending ? null : t;
      }
      w.__smrTouch = last;
    }, list);
  }
  private touch(type: TouchStep['type'], p?: Point): Promise<void> {
    return this.sendTouches([{ type, p }]);
  }
  async down(p: Point): Promise<void> {
    if (this.mode === 'touch') return this.touch('touchStart', p);
    const o = await this.origin();
    await this.page.mouse.move(o.x + p.x, o.y + p.y);
    await this.page.mouse.down();
  }
  async move(p: Point): Promise<void> {
    if (this.mode === 'touch') return this.touch('touchMove', p);
    const o = await this.origin();
    await this.page.mouse.move(o.x + p.x, o.y + p.y);
  }
  async up(p: Point): Promise<void> {
    if (this.mode === 'touch') {
      await this.touch('touchMove', p);
      return this.touch('touchEnd');
    }
    const o = await this.origin();
    await this.page.mouse.move(o.x + p.x, o.y + p.y);
    await this.page.mouse.up();
  }
  /** A quick tap: touch start and end are sent back-to-back so CDP latency cannot turn it into a hold. */
  async tap(p: Point): Promise<void> {
    if (this.mode === 'touch') {
      await this.sendTouches([{ type: 'touchStart', p }, { type: 'touchEnd' }]);
      return;
    }
    const o = await this.origin();
    await this.page.mouse.click(o.x + p.x, o.y + p.y);
  }
  /**
   * Two taps sent back-to-back: headless rendering can delay each awaited input by 100+ ms, which
   * would push a scripted double tap past the double-tap window. Timing limits are unit tested.
   */
  async doubleTap(p: Point): Promise<void> {
    const o = await this.origin();
    if (this.mode === 'touch') {
      await this.sendTouches([{ type: 'touchStart', p }, { type: 'touchEnd' }, { type: 'touchStart', p }, { type: 'touchEnd' }]);
      return;
    }
    await this.page.mouse.move(o.x + p.x, o.y + p.y);
    await Promise.all([this.page.mouse.down(), this.page.mouse.up(), this.page.mouse.down(), this.page.mouse.up()]);
  }
  /** A quick swipe: down, move and up sent back-to-back so headless frame delays cannot turn it into a slow (aim) drag. */
  async swipe(from: Point, mid: Point, to: Point): Promise<void> {
    if (this.mode === 'touch') {
      await this.sendTouches([{ type: 'touchStart', p: from }, { type: 'touchMove', p: mid }, { type: 'touchMove', p: to }, { type: 'touchEnd' }]);
      return;
    }
    const o = await this.origin();
    await this.page.mouse.move(o.x + from.x, o.y + from.y);
    await Promise.all([this.page.mouse.down(), this.page.mouse.move(o.x + mid.x, o.y + mid.y), this.page.mouse.move(o.x + to.x, o.y + to.y), this.page.mouse.up()]);
  }
  async cancel(): Promise<void> {
    await this.touch('touchCancel');
  }
}


type TacticalView = { screen: string; phase: string | null; options: { id: string; quality: number }[]; attempts: number; saved: string };

async function tacticalView(page: Page, pred: (t: TacticalView) => boolean, what: string, ms: number): Promise<TacticalView> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const t = d.gameplay as TacticalView | null;
    if (d.activeScenes.includes('tactical') && t && pred(t)) return t;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(t)}`);
    await page.waitForTimeout(50);
  }
}

async function pressWhenShown(page: Page, name: string, via: 'mouse' | 'touch', ms = 15_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const els = (await diagnostics(page)).layout?.elements ?? {};
    if (els[name]) return pressElement(page, name, via);
    if (els.more) await pressElement(page, 'more', via);
    if (Date.now() - start > ms) throw new Error(`no ${name} button`);
    await page.waitForTimeout(80);
  }
}

/**
 * Weekly Team Training: from the Team Training page, play one tactical session (A, B or C) to its saved screen with the
 * best-graded answer each time, then return to the Team Training page. Returns the saved message.
 */
export async function playTacticalSession(page: Page, slot: 'A' | 'B' | 'C', via: 'mouse' | 'touch', ms = 420_000): Promise<string> {
  const start = Date.now();
  const left = () => Math.max(5_000, ms - (Date.now() - start));
  await pressWhenShown(page, `tt12-${slot}`, via);
  await waitForScene(page, 'tactical');
  await tacticalView(page, (t) => t.screen === 'role', 'role choice', 30_000);
  const role = Object.keys((await diagnostics(page)).layout?.elements ?? {}).find((k) => k.startsWith('role-') && !k.endsWith('GK'));
  if (!role) throw new Error('no role button');
  await pressElement(page, role, via);
  for (let round = 0; round < 3; round++) {
    await tacticalView(page, (t) => t.screen === 'brief', `round ${round + 1} brief`, left());
    await pressWhenShown(page, 'tt-start', via);
    for (;;) {
      const t = await tacticalView(page, (x) => x.screen === 'reflection' || (x.screen === 'play' && ((x.phase === 'observe' && x.options.length > 0) || x.phase === 'explain')), `round ${round + 1} play`, left());
      if (t.screen === 'reflection') break;
      if (t.phase === 'observe') {
        const best = [...t.options].sort((a, b) => b.quality - a.quality)[0]!;
        await pressWhenShown(page, `opt-${best.id}`, via);
        await tacticalView(page, (x) => x.phase !== 'observe' || x.attempts > t.attempts, 'decision taken', left());
      } else {
        // CRITIQUE first, then RETRY OR CONTINUE.
        await pressWhenShown(page, 'tt-critique-done', via);
        await pressWhenShown(page, 'tt-next', via);
        await tacticalView(page, (x) => x.phase !== 'explain' || x.screen === 'reflection', 'next moment', left());
      }
    }
    await pressWhenShown(page, 'tt-continue', via);
  }
  const done = await tacticalView(page, (t) => t.screen === 'done', 'session saved', 60_000);
  await pressWhenShown(page, 'tt-back', via);
  await waitForScene(page, 'career');
  return done.saved;
}
