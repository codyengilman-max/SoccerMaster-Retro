import { expect, test, type CDPSession, type Page, type TestInfo } from '@playwright/test';
import type { MatchReport } from '../src/scenes/matchReport';
import { diagnostics, expectInside, pressElement, trackConsoleErrors, trackDomListeners, waitForScene, type PointerMode } from './helpers';

// Joystick + four-button controls (default scheme). Two-thumb input goes through CDP multi-touch.
test.describe.configure({ timeout: 60_000 });

const KICKS = new Set(['pass', 'shot']);
const modeFor = (info: TestInfo): PointerMode => (info.project.use.hasTouch ? 'touch' : 'mouse');

async function report(page: Page): Promise<MatchReport> {
  const d = await diagnostics(page);
  if (!d.gameplay || d.activeScenes[0] !== 'match') throw new Error(`no match gameplay in ${d.activeScenes.join(',')}`);
  return d.gameplay as MatchReport;
}

async function waitFor(page: Page, predicate: (r: MatchReport) => boolean, timeout = 8_000): Promise<MatchReport> {
  const start = Date.now();
  for (;;) {
    const r = await report(page);
    if (predicate(r)) return r;
    if (Date.now() - start > timeout) throw new Error(`timed out; pad=${JSON.stringify(r.pad)} input=${r.inputLog.join(',')}`);
    await page.waitForTimeout(30);
  }
}

/** Debug-only: slow the match clock once the setup is staged, so slow runners' frames stay inside sub-second tap windows. */
async function slowSim(page: Page, rate: number): Promise<void> {
  const ok = await page.evaluate((r) => {
    const scene = window.__SMR__?.game.scene.getScene('match') as unknown as { setDebugSimRate?: (x: number) => boolean } | undefined;
    return scene?.setDebugSimRate?.(r) ?? false;
  }, rate);
  if (!ok) throw new Error('could not set the debug sim rate');
}

async function open(page: Page, mode: PointerMode, query = ''): Promise<MatchReport> {
  await page.goto(`/?debug=1&dev${query}`);
  await waitForScene(page, 'start');
  await pressElement(page, 'sandbox-button', mode);
  await waitForScene(page, 'formation');
  await pressElement(page, 'pick-1-3-2-3', mode);
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
  return waitFor(page, (r) => r.phase === 'live');
}

interface Pt {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

/** CDP touch: every call carries the full set of fingers still on the glass. */
async function touch(page: Page, cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', pts: readonly Pt[]): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: box.x + p.x, y: box.y + p.y, id: p.id })) });
}

async function centre(page: Page, name: string): Promise<{ x: number; y: number }> {
  const r = (await diagnostics(page)).layout?.elements[name];
  if (!r) throw new Error(`no ${name}`);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

// Only the user's side: the away AI keeps playing and may pass while the test holds a button.
const kicksAfter = (r: MatchReport, seq: number) => r.events.filter((e) => e.seq > seq && KICKS.has(e.type) && String(e.by ?? '').startsWith('H'));
const lastSeq = (r: MatchReport) => r.events.at(-1)?.seq ?? 0;

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('pad is the default: stick and four labelled buttons fit the viewport without overlapping', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const r = await open(page, modeFor(info));
  expect(r.controlScheme).toBe('pad');
  const d = await diagnostics(page);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  const names = ['pad-stick', 'pad-pass', 'pad-shoot', 'pad-slide', 'pad-tackle'];
  for (const n of names) expectInside(n, d.layout?.elements[n], viewport);
  const rects = names.map((n) => d.layout!.elements[n]!);
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const b = rects[j]!;
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlap, `${names[i]} overlaps ${names[j]}`).toBe(false);
    }
  expect(errors).toEqual([]);
});

test.describe('two-thumb touch', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'multi-touch needs a touch device');

  test('A03: run with the stick while charging PASS; release gives exactly one kick', async ({ page }, info) => {
    const errors = trackConsoleErrors(page);
    await open(page, modeFor(info), '&setup=space');
    const cdp = await page.context().newCDPSession(page);
    const stick = await centre(page, 'pad-stick');
    const pass = await centre(page, 'pad-pass');
    const thumb = { id: 1, x: stick.x, y: stick.y };
    await touch(page, cdp, 'touchStart', [thumb]);
    const run = { id: 1, x: stick.x + 45, y: stick.y };
    await touch(page, cdp, 'touchMove', [run]);
    await waitFor(page, (r) => Math.hypot(r.pad.stick.x, r.pad.stick.y) > 0.5 && r.pad.available?.pass === true);
    const r0 = await report(page);
    const seq = lastSeq(r0);
    const passFinger = { id: 2, x: pass.x, y: pass.y };
    await touch(page, cdp, 'touchStart', [run, passFinger]);
    const charging = await waitFor(page, (r) => r.pad.phase === 'chargingPass');
    expect(Math.hypot(charging.pad.stick.x, charging.pad.stick.y)).toBeGreaterThan(0.5);
    await page.waitForTimeout(250);
    // Lift only the PASS finger (Chromium's CDP touchEnd ends the listed points).
    await touch(page, cdp, 'touchEnd', [passFinger]);
    // Default 8 s wall budget: a slow CI renderer lags sim time; exactly-one-kick is still asserted below.
    await waitFor(page, (r) => kicksAfter(r, seq).length > 0);
    await page.waitForTimeout(600);
    const r1 = await report(page);
    expect(kicksAfter(r1, seq).length).toBe(1);
    expect(Math.hypot(r1.pad.stick.x, r1.pad.stick.y)).toBeGreaterThan(0.5);
    await touch(page, cdp, 'touchEnd', [run]);
    await waitFor(page, (r) => r.pad.stick.x === 0 && r.pad.stick.y === 0);
    expect(errors).toEqual([]);
  });

  test('A05/A06: dragging PASS across SHOOT keeps PASS; a cancelled touch never kicks', async ({ page }, info) => {
    const errors = trackConsoleErrors(page);
    await open(page, modeFor(info), '&setup=space');
    const cdp = await page.context().newCDPSession(page);
    await waitFor(page, (r) => r.pad.available?.pass === true);
    const pass = await centre(page, 'pad-pass');
    const shoot = await centre(page, 'pad-shoot');
    const seq = lastSeq(await report(page));
    await touch(page, cdp, 'touchStart', [{ id: 3, x: pass.x, y: pass.y }]);
    await waitFor(page, (r) => r.pad.phase === 'chargingPass');
    await touch(page, cdp, 'touchMove', [{ id: 3, x: shoot.x, y: shoot.y }]);
    await page.waitForTimeout(200);
    const mid = await report(page);
    expect(mid.pad.phase).toBe('chargingPass');
    expect(mid.pad.pressed).toBe('pass');
    await touch(page, cdp, 'touchCancel', []);
    await waitFor(page, (r) => r.pad.phase !== 'chargingPass');
    await page.waitForTimeout(800);
    expect(kicksAfter(await report(page), seq)).toEqual([]);
    // Chrome's intervention notice: Phaser's touch manager calls preventDefault on every touchcancel,
    // and a system cancel is never cancelable. Any other console error still fails the test.
    expect(errors.filter((e) => !e.startsWith('Ignored attempt to cancel a touchcancel event with cancelable=false'))).toEqual([]);
  });

  test('A20: rotating mid-charge cancels without a kick and rebuilds hit areas inside the new viewport', async ({ page }, info) => {
    const errors = trackConsoleErrors(page);
    await open(page, modeFor(info), '&setup=space');
    const cdp = await page.context().newCDPSession(page);
    await waitFor(page, (r) => r.pad.available?.pass === true);
    const pass = await centre(page, 'pad-pass');
    const seq = lastSeq(await report(page));
    await touch(page, cdp, 'touchStart', [{ id: 4, x: pass.x, y: pass.y }]);
    await waitFor(page, (r) => r.pad.phase === 'chargingPass');
    const vp = page.viewportSize()!;
    await page.setViewportSize({ width: vp.height, height: vp.width });
    await waitFor(page, (r) => r.pad.phase !== 'chargingPass' && r.pad.pressed === null);
    await touch(page, cdp, 'touchEnd', []);
    await page.waitForTimeout(800);
    expect(kicksAfter(await report(page), seq)).toEqual([]);
    const d = await diagnostics(page);
    for (const n of ['pad-stick', 'pad-pass', 'pad-shoot', 'pad-slide', 'pad-tackle']) expectInside(n, d.layout?.elements[n], { width: vp.height, height: vp.width });
    expect(errors).toEqual([]);
  });
});

test.describe('mixed inputs', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'needs a touch device');

  test('a keyboard key-up never releases a PASS held by a finger', async ({ page }, info) => {
    await open(page, modeFor(info), '&setup=space');
    const cdp = await page.context().newCDPSession(page);
    await waitFor(page, (r) => r.pad.available?.pass === true);
    const pass = await centre(page, 'pad-pass');
    const seq = lastSeq(await report(page));
    await touch(page, cdp, 'touchStart', [{ id: 4, x: pass.x, y: pass.y }]);
    await waitFor(page, (r) => r.pad.phase === 'chargingPass');
    for (const key of ['Space', 'KeyJ', 'KeyI']) {
      await page.keyboard.down(key === 'Space' ? ' ' : key.slice(3).toLowerCase());
      await page.keyboard.up(key === 'Space' ? ' ' : key.slice(3).toLowerCase());
    }
    await page.waitForTimeout(300);
    const mid = await report(page);
    expect(mid.pad.phase).toBe('chargingPass');
    expect(kicksAfter(mid, seq)).toEqual([]);
    await touch(page, cdp, 'touchEnd', []);
    const done = await waitFor(page, (r) => kicksAfter(r, seq).length > 0);
    expect(kicksAfter(done, seq).length).toBe(1);
  });
});

test('?debug&passlog logs the assisted-pass target search while PASS is held', async ({ page }, info) => {
  const logs: string[] = [];
  page.on('console', (m) => {
    if (m.text().startsWith('[passlog]')) logs.push(m.text());
  });
  await open(page, modeFor(info), '&passlog&setup=space');
  await waitFor(page, (r) => r.pad.available?.pass === true);
  const seq = lastSeq(await report(page));
  await page.keyboard.down('j');
  await waitFor(page, (r) => r.pad.phase === 'chargingPass');
  await page.waitForTimeout(200);
  await page.keyboard.up('j');
  const done = await waitFor(page, (r) => kicksAfter(r, seq).length > 0);
  expect(kicksAfter(done, seq).length).toBe(1);
  expect(logs.length).toBeGreaterThan(0);
  expect(logs[0]).toMatch(/^\[passlog\] t=\d+\.\d\d aim=\(-?\d\.\d\d,-?\d\.\d\d\) chosen=(H\d|none)/);
});

test.describe('TACKLE and quick shot (PR D)', () => {
  const mine = (r: MatchReport, seq: number, type: string) => r.events.filter((e) => e.seq > seq && e.type === type && String(e.by ?? '').startsWith('H'));

  test('TACKLE commits one standing tackle on the feet, then recovers to ready', async ({ page }, info) => {
    const errors = trackConsoleErrors(page);
    await open(page, modeFor(info), '&setup=tackle');
    await waitFor(page, (r) => r.pad.available?.tackle === true);
    await slowSim(page, 0.2);
    const ready = await waitFor(page, (r) => r.pad.available?.tackle === true);
    const seq = lastSeq(ready);
    await pressElement(page, 'pad-tackle', modeFor(info));
    const started = await waitFor(page, (r) => mine(r, seq, 'standing').some((e) => e.detail === 'start'));
    // The setup hands H8 control, but A7 keeps dribbling until the press lands, so on a slow runner
    // automatic switching may already have moved control to a nearer teammate: the tackle is by whoever the user controls.
    expect(ready.controlledId).toMatch(/^H/);
    expect(started.pad.actor).toBe(ready.controlledId);
    // It resolves exactly once: won, missed (whiff or close miss) or a foul.
    const done = await waitFor(page, (r) => mine(r, seq, 'standing').some((e) => e.detail !== 'start') && r.pad.phase === 'ready');
    expect(mine(done, seq, 'standing').filter((e) => e.detail !== 'start')).toHaveLength(1);
    expect(mine(done, seq, 'standing').filter((e) => e.detail === 'start')).toHaveLength(1);
    // A standing tackle never counts as a slide.
    expect(mine(done, seq, 'slide')).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('a single SHOOT tap shoots the ordinary shot; a double tap shoots one quick shot', async ({ page }, info) => {
    const errors = trackConsoleErrors(page);
    await open(page, modeFor(info), '&setup=space');
    await waitFor(page, (x) => x.pad.available?.shoot === true);
    await slowSim(page, 0.2);
    let r = await waitFor(page, (x) => x.pad.available?.shoot === true);
    let seq = lastSeq(r);
    await pressElement(page, 'pad-shoot', modeFor(info));
    await waitFor(page, (x) => mine(x, seq, 'shot').length > 0);
    await page.waitForTimeout(400);
    r = await report(page);
    expect(mine(r, seq, 'shot').map((e) => e.detail.startsWith('quick'))).toEqual([false]);

    await page.goto('about:blank');
    await open(page, modeFor(info), '&setup=space');
    await waitFor(page, (x) => x.pad.available?.shoot === true);
    await slowSim(page, 0.2);
    r = await waitFor(page, (x) => x.pad.available?.shoot === true);
    seq = lastSeq(r);
    // Two taps back to back at the same spot. Headless frames are slow (CI runners far more), so nothing waits
    // between them and the sim clock runs at 0.2x: the sim's gap is 0.25 s and a real double tap is well inside it.
    const at = await centre(page, 'pad-shoot');
    const canvas = (await page.locator('canvas').boundingBox())!;
    const x = canvas.x + at.x;
    const y = canvas.y + at.y;
    if (modeFor(info) === 'touch') {
      const cdp = await page.context().newCDPSession(page);
      for (let i = 0; i < 2; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 7 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
    } else {
      await page.mouse.move(x, y);
      for (let i = 0; i < 2; i++) {
        await page.mouse.down();
        await page.mouse.up();
      }
    }
    await waitFor(page, (x) => mine(x, seq, 'shot').length > 0);
    await page.waitForTimeout(400);
    r = await report(page);
    const log = `${r.inputLog.join(',')} ${JSON.stringify(r.events.filter((e) => e.seq > seq).map((e) => [e.type, e.detail, e.at.toFixed(3)]))}`;
    expect(mine(r, seq, 'shot').map((e) => e.detail.startsWith('quick')), log).toEqual([true]);
    expect(errors).toEqual([]);
  });
});
