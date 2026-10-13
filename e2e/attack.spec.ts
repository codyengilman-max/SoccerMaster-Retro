import { expect, test, type CDPSession, type Page, type TestInfo } from '@playwright/test';
import { pitchVectorToScreen } from '../src/render/layout';
import type { AttackReport } from '../src/scenes/attackReport';
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

type Mode = 'touch' | 'mouse';
type Point = { x: number; y: number };

declare global {
  interface Window {
    __domListeners?: () => DomListenerSummary;
  }
}

async function report(page: Page): Promise<AttackReport> {
  const d = await diagnostics(page);
  if (!d.gameplay) throw new Error(`no gameplay in ${d.activeScenes.join(',')}`);
  return d.gameplay as AttackReport;
}

async function waitFor(page: Page, predicate: (r: AttackReport) => boolean, timeout = 8000): Promise<AttackReport> {
  const start = Date.now();
  for (;;) {
    const r = await report(page);
    if (predicate(r)) return r;
    if (Date.now() - start > timeout) throw new Error(`timed out; phase=${r.phase} events=${r.events.map((e) => e.type).join(',')}`);
    await page.waitForTimeout(30);
  }
}

/** One pointer, driven either as a real touch (CDP) or a mouse. */
class Finger {
  private cdp: CDPSession | null = null;
  private cachedOrigin: Point | null = null;
  constructor(
    private readonly page: Page,
    readonly mode: Mode,
  ) {}
  private async origin(): Promise<Point> {
    if (this.cachedOrigin) return this.cachedOrigin;
    const box = await this.page.locator('canvas').boundingBox();
    if (!box) throw new Error('canvas not visible');
    this.cachedOrigin = { x: box.x, y: box.y };
    return this.cachedOrigin;
  }
  private async touch(type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', p?: Point): Promise<void> {
    this.cdp ??= await this.page.context().newCDPSession(this.page);
    const o = await this.origin();
    const touchPoints = p ? [{ x: o.x + p.x, y: o.y + p.y, id: 1 }] : [];
    await this.cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
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
  async cancel(): Promise<void> {
    await this.touch('touchCancel');
  }
}

const modeFor = (info: TestInfo): Mode => (info.project.use.hasTouch ? 'touch' : 'mouse');

async function openDrill(page: Page, mode: Mode): Promise<AttackReport> {
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await pressElement(page, 'play-button', mode);
  await waitForScene(page, 'attack');
  return waitFor(page, (r) => r.phase === 'live');
}

function carrierPoint(r: AttackReport): Point {
  const p = r.players[r.controlledId];
  return { x: p.sx, y: p.sy - 8 };
}

/** Hold on the controlled player, then drag back (slingshot) so the kick goes toward `target`. */
async function aimAndKick(page: Page, finger: Finger, target: (r: AttackReport) => { target: Point; power: number }): Promise<AttackReport> {
  const start = carrierPoint(await report(page));
  await finger.down(start);
  const aiming = await waitFor(page, (r) => r.phase === 'aiming' || r.phase === 'ended', 5000);
  if (aiming.phase !== 'aiming') throw new Error(`attempt ended before aiming: ${aiming.outcome}`);
  const { target: t, power } = target(aiming);
  const dir = pitchVectorToScreen(aiming.layout, { x: t.x - aiming.ball.x, y: t.y - aiming.ball.y });
  const len = Math.hypot(dir.x, dir.y);
  const drag = aiming.gesture.aimMinDragPx + power * (aiming.gesture.aimMaxDragPx - aiming.gesture.aimMinDragPx);
  const end = { x: start.x - (dir.x / len) * drag, y: start.y - (dir.y / len) * drag };
  for (let i = 1; i <= 5; i++) await finger.move({ x: start.x + ((end.x - start.x) * i) / 5, y: start.y + ((end.y - start.y) * i) / 5 });
  await finger.up(end);
  return waitFor(page, (r) => r.phase !== 'aiming');
}

const passPower = (r: AttackReport, target: Point): number =>
  Math.min(1, Math.max(0, (Math.hypot(target.x - r.ball.x, target.y - r.ball.y) - r.pass.minDistance) / (r.pass.maxDistance - r.pass.minDistance)));

function segmentDistance(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby || 1)));
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

/** Pass to the runner (leading them) if that lane is clear of defenders, else to the clearest teammate. */
async function passToRunner(page: Page, finger: Finger): Promise<string> {
  let receiver = '';
  await aimAndKick(page, finger, (r) => {
    const mates = (['A1', 'A2', 'A3'] as const).filter((id) => id !== r.controlledId);
    const ordered = [...mates].sort((a, b) => (a === r.runnerId ? -1 : b === r.runnerId ? 1 : 0));
    let best = { id: ordered[0] ?? 'A2', target: { x: 0, y: 0 }, clearance: -1 };
    for (const id of ordered) {
      const p = r.players[id];
      const target = { x: p.x + p.vx * 0.7, y: p.y + p.vy * 0.7 };
      const clearance = Math.min(...(['D1', 'D2'] as const).map((d) => segmentDistance(r.players[d], r.ball, target)));
      if (clearance > best.clearance + (best.clearance >= 2.5 ? 100 : 0)) best = { id, target, clearance };
    }
    receiver = best.id;
    return { target: best.target, power: passPower(r, best.target) };
  });
  return receiver;
}

const events = (r: AttackReport): string[] => r.events.map((e) => e.type);

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('drill layout fits the viewport', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await openDrill(page, modeFor(info));
  const d = await diagnostics(page);
  const viewport = page.viewportSize();
  if (!viewport || !d.layout) throw new Error('no layout');
  const hud = ['back-button', 'status', 'meters', 'pass-toggle', 'shoot-toggle'];
  for (const name of [...hud, 'pitch', 'goal', 'help', 'A1', 'A2', 'A3', 'D1', 'D2', 'GK', 'ball']) {
    expectInside(name, d.layout.elements[name], viewport);
  }
  for (let i = 0; i < hud.length; i++) {
    for (let j = i + 1; j < hud.length; j++) {
      const a = d.layout.elements[hud[i] ?? ''];
      const b = d.layout.elements[hud[j] ?? ''];
      if (!a || !b) continue;
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlap, `${hud[i]} overlaps ${hud[j]}`).toBe(false);
    }
  }
  expect(Boolean(d.layout.elements['rotate-hint'])).toBe(viewport.height > viewport.width);
  await linger(page);
  expect(errors).toEqual([]);
});

test('quick swipe on the player cuts instead of aiming; hold-and-drag aims', async ({ page }, info) => {
  const mode = modeFor(info);
  const finger = new Finger(page, mode);
  await openDrill(page, mode);
  const r = await report(page);
  const p = carrierPoint(r);
  await finger.move(p).catch(() => undefined);
  await finger.down(p);
  await finger.move({ x: p.x, y: p.y - 60 });
  await finger.up({ x: p.x, y: p.y - 70 });
  const after = await waitFor(page, (x) => events(x).includes('swipe'));
  expect(events(after)).not.toContain('aimStart');
  expect(after.events.find((e) => e.type === 'swipe')?.detail).toBe('cut');
});

test('pass to a moving teammate transfers control without resetting play', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  const finger = new Finger(page, mode);
  await openDrill(page, mode);
  const runner = await passToRunner(page, finger);
  const r = await waitFor(page, (x) => x.owner !== null || x.phase === 'ended');
  expect(r.owner).toBe(runner);
  expect(r.controlledId).toBe(runner);
  const received = r.events.find((e) => e.type === 'received');
  expect(Number(received?.detail)).toBeGreaterThan(1);
  expect(r.players.A1.x).toBeGreaterThan(40);
  await linger(page);
  expect(errors).toEqual([]);
});

test('a pass into a defender is intercepted and Retry resets the attempt', async ({ page }, info) => {
  const mode = modeFor(info);
  const finger = new Finger(page, mode);
  await openDrill(page, mode);
  await page.waitForTimeout(300);
  await aimAndKick(page, finger, (r) => ({ target: r.players.D1, power: passPower(r, r.players.D1) }));
  const ended = await waitFor(page, (r) => r.phase === 'ended');
  expect(ended.outcome).toBe('intercepted');
  expect(ended.resolutions).toBe(1);
  await linger(page);
  await pressElement(page, 'retry-button', mode);
  const fresh = await waitFor(page, (r) => r.attempt === 2);
  expect(fresh.outcome).toBeNull();
  expect(fresh.owner).toBe('A1');
  expect(fresh.action).toBe('pass');
});

test('receive -> dribble -> shoot scores a goal', async ({ page }, info) => {
  test.skip(info.project.name.includes('portrait'), 'scenario covered in landscape and desktop');
  test.setTimeout(90_000);
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  const finger = new Finger(page, mode);
  await openDrill(page, mode);
  const outcomes: string[] = [];
  // Real play: the shooter dribbles until close or pressured, so allow up to three attempts.
  for (let attempt = 1; attempt <= 3 && !outcomes.includes('goal'); attempt++) {
    if (attempt > 1) {
      await pressElement(page, 'retry-button', mode);
      await waitFor(page, (r) => r.attempt === attempt && r.phase === 'live');
    }
    await passToRunner(page, finger);
    const got = await waitFor(page, (r) => r.controlledId !== 'A1' || r.phase === 'ended');
    if (got.phase === 'ended') {
      outcomes.push(got.outcome ?? '');
      continue;
    }
    await waitFor(
      page,
      (r) => {
        const me = r.players[r.controlledId];
        const pressure = Math.min(...(['D1', 'D2'] as const).map((d) => Math.hypot(r.players[d].x - me.x, r.players[d].y - me.y)));
        return me.x >= 57 || pressure < 3.5 || r.phase === 'ended';
      },
      4000,
    ).catch(() => undefined);
    if ((await report(page)).phase === 'ended') {
      outcomes.push((await report(page)).outcome ?? '');
      continue;
    }
    await pressElement(page, 'shoot-toggle', mode);
    expect((await report(page)).action).toBe('shoot');
    await aimAndKick(page, finger, (r) => {
      const y = r.players[r.controlledId].y < 25 ? 27.6 : 22.4;
      return { target: { x: 75, y }, power: 1 };
    }).catch(() => undefined);
    const ended = await waitFor(page, (r) => r.phase === 'ended');
    expect(ended.action).toBe('pass');
    outcomes.push(ended.outcome ?? '');
    await linger(page);
  }
  expect(outcomes).toContain('goal');
  expect(errors).toEqual([]);
});

test('a soft shot at the keeper is saved', async ({ page }, info) => {
  test.skip(info.project.name.includes('portrait'), 'scenario covered in landscape and desktop');
  const mode = modeFor(info);
  const finger = new Finger(page, mode);
  await openDrill(page, mode);
  await passToRunner(page, finger);
  await waitFor(page, (r) => r.controlledId !== 'A1');
  await pressElement(page, 'shoot-toggle', mode);
  await aimAndKick(page, finger, () => ({ target: { x: 75, y: 25 }, power: 0.25 }));
  const ended = await waitFor(page, (r) => r.phase === 'ended');
  expect(ended.outcome).toBe('saved');
  expect(ended.owner).toBe('GK');
  await linger(page);
});

test('pointer cancel and rotation drop an active aim safely', async ({ page }, info) => {
  test.skip(modeFor(info) !== 'touch', 'touch cancellation');
  const finger = new Finger(page, 'touch');
  await openDrill(page, 'touch');
  await finger.down(carrierPoint(await report(page)));
  await waitFor(page, (r) => r.phase === 'aiming');
  await finger.cancel();
  let r = await waitFor(page, (x) => x.phase !== 'aiming');
  expect(r.input).toBe('idle');
  expect(r.owner).toBe('A1');
  expect(events(r)).toContain('aimCancel');

  await finger.down(carrierPoint(r));
  await waitFor(page, (x) => x.phase === 'aiming');
  const vp = page.viewportSize();
  if (!vp) throw new Error('no viewport');
  await page.setViewportSize({ width: vp.height, height: vp.width });
  r = await waitFor(page, (x) => x.phase !== 'aiming');
  expect(r.input).toBe('idle');
  expect(events(r).filter((e) => e === 'aimCancel').length).toBe(2);
  await finger.cancel();
});

test('keyboard controls drive the same commands', async ({ page }, info) => {
  test.skip(modeFor(info) !== 'mouse', 'desktop keyboard');
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await page.keyboard.press('KeyP');
  await waitForScene(page, 'attack');
  await waitFor(page, (r) => r.phase === 'live');
  await page.keyboard.press('ArrowUp');
  await waitFor(page, (r) => r.events.some((e) => e.type === 'swipe' && e.detail === 'cut'));
  await page.keyboard.press('Tab');
  expect((await report(page)).action).toBe('shoot');
  await page.keyboard.press('Digit1');
  expect((await report(page)).action).toBe('pass');
  await page.keyboard.down('Space');
  const aiming = await waitFor(page, (r) => r.phase === 'aiming');
  expect(aiming.aimSource).toBe('keyboard');
  expect(aiming.aim?.direction).not.toBeNull();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(150);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('Space');
  await waitFor(page, (r) => events(r).includes('pass'));
  await waitFor(page, (r) => r.phase === 'ended' || r.owner !== null, 8000);
  await page.keyboard.press('Escape');
  await waitForScene(page, 'start');
  expect(errors).toEqual([]);
});

test('repeated retries and navigation keep one canvas and stable listeners', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  const finger = new Finger(page, mode);
  await openDrill(page, mode);
  const listeners = async () => ({ phaser: (await diagnostics(page)).listeners, dom: await page.evaluate(() => window.__domListeners?.()) });
  const baseline = await listeners();
  for (let attempt = 1; attempt <= 4; attempt++) {
    await aimAndKick(page, finger, (r) => ({ target: r.players.D1, power: passPower(r, r.players.D1) }));
    await waitFor(page, (r) => r.phase === 'ended');
    await pressElement(page, 'retry-button', mode);
    await waitFor(page, (r) => r.attempt === attempt + 1 && r.phase === 'live');
    expect(await listeners()).toEqual(baseline);
    expect(await page.locator('canvas').count()).toBe(1);
  }
  for (let i = 0; i < 3; i++) {
    await pressElement(page, 'back-button', mode);
    await waitForScene(page, 'start');
    await pressElement(page, 'play-button', mode);
    await waitForScene(page, 'attack');
    await waitFor(page, (r) => r.phase === 'live' && r.attempt === 1);
    expect(await listeners()).toEqual(baseline);
  }
  expect(await page.locator('canvas').count()).toBe(1);
  expect(errors).toEqual([]);
});
