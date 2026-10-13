import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { pitchVectorToScreen } from '../src/render/layout';
import { GESTURE_TUNING } from '../src/input';
import type { MatchReport } from '../src/scenes/matchReport';
import {
  diagnostics,
  expectInside,
  Finger,
  linger,
  pressElement,
  trackConsoleErrors,
  trackDomListeners,
  waitForScene,
  type Point,
  type PointerMode,
} from './helpers';

test.describe.configure({ timeout: 60_000 });

const modeFor = (info: TestInfo): PointerMode => (info.project.use.hasTouch ? 'touch' : 'mouse');

async function report(page: Page): Promise<MatchReport> {
  const d = await diagnostics(page);
  if (!d.gameplay || d.activeScenes[0] !== 'match') throw new Error(`no match gameplay in ${d.activeScenes.join(',')}`);
  return d.gameplay as MatchReport;
}

async function waitFor(page: Page, predicate: (r: MatchReport) => boolean, timeout = 10_000): Promise<MatchReport> {
  const start = Date.now();
  for (;;) {
    const r = await report(page);
    if (predicate(r)) return r;
    if (Date.now() - start > timeout) throw new Error(`timed out; phase=${r.phase} owner=${r.owner} events=${r.events.map((e) => e.type).join(',')}`);
    await page.waitForTimeout(30);
  }
}

async function openSandbox(page: Page, mode: PointerMode, formation = '1-3-2-3', query = ''): Promise<MatchReport> {
  await page.goto(`/?debug=1${query}`);
  await waitForScene(page, 'start');
  await pressElement(page, 'sandbox-button', mode);
  await waitForScene(page, 'formation');
  await pressElement(page, `pick-${formation}`, mode);
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
  return waitFor(page, (r) => r.phase === 'live');
}

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('formation picker -> 9v9 sandbox: 18 players, chosen formation, HUD fits, overlay hidden', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const r = await openSandbox(page, modeFor(info), '1-3-3-2');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  const ids = Object.keys(r.players);
  expect(ids).toHaveLength(18);
  expect(new Set(ids).size).toBe(18);
  expect(Object.values(r.players).filter((p) => p.keeper).map((p) => p.team).sort()).toEqual(['away', 'home']);
  expect(r.formations.home).toBe('1-3-3-2');
  expect(r.overlay).toBe(false);
  const d = await diagnostics(page);
  expect(d.canvases).toBe(1);
  for (const name of ['menu-button', 'pause-button', 'pass-toggle', 'shoot-toggle', 'score', 'pitch']) expectInside(name, d.layout?.elements[name], viewport);
  for (const name of ['menu-button', 'pause-button', 'pass-toggle', 'shoot-toggle']) expect(d.layout?.elements[name]?.height ?? 0).toBeGreaterThanOrEqual(40);
  // Play keeps running and stays legal while nobody touches it.
  await page.waitForTimeout(3000);
  const later = await report(page);
  expect(later.simTime).toBeGreaterThan(r.simTime + 1);
  await linger(page);
  expect(errors).toEqual([]);
});

test('pause -> change formation keeps identities, ball and positions; resume reorganizes without teleporting', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  await openSandbox(page, mode);
  await page.waitForTimeout(1200);
  await pressElement(page, 'pause-button', mode);
  const paused = await waitFor(page, (r) => r.paused);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  const d = await diagnostics(page);
  for (const name of ['pause-panel', 'resume-button', 'reset-button', 'panel-menu-button', 'overlay-button', 'formation-1-3-2-3', 'formation-1-3-3-2', 'formation-1-2-4-2']) {
    expectInside(name, d.layout?.elements[name], viewport);
  }
  await page.waitForTimeout(500);
  const still = await report(page);
  expect(still.simTime).toBe(paused.simTime);

  await pressElement(page, 'formation-1-2-4-2', mode);
  const changed = await waitFor(page, (r) => r.formations.home === '1-2-4-2');
  expect(changed.owner).toBe(paused.owner);
  expect(changed.possession).toBe(paused.possession);
  expect(changed.ball.x).toBe(paused.ball.x);
  expect(changed.ball.y).toBe(paused.ball.y);
  expect(changed.score).toEqual(paused.score);
  for (const [id, p] of Object.entries(paused.players)) {
    const q = changed.players[id as keyof typeof changed.players];
    expect([q.x, q.y], `${id} stays put`).toEqual([p.x, p.y]);
  }
  await linger(page);

  await pressElement(page, 'resume-button', mode);
  let prev = await waitFor(page, (r) => !r.paused);
  let maxStep = 0;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(60);
    const r = await report(page);
    if (r.phase !== 'live' || prev.phase !== 'live') {
      prev = r;
      continue;
    }
    const dt = Math.max(1e-3, r.simTime - prev.simTime);
    for (const id of Object.keys(r.players) as (keyof MatchReport['players'])[]) {
      const step = Math.hypot(r.players[id].x - prev.players[id].x, r.players[id].y - prev.players[id].y) / dt;
      maxStep = Math.max(maxStep, step);
    }
    prev = r;
  }
  // Fastest sprint is under 9 yd/s; a teleport would show as a huge apparent speed.
  expect(maxStep).toBeLessThan(12);
  expect(prev.formations.home).toBe('1-2-4-2');
  expect(errors).toEqual([]);
});

test('aimed pass from the user carrier is released, slows time while aiming, and resolves in continuous play (staged: ?setup=pass)', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const finger = new Finger(page, modeFor(info));
  const r0 = await openSandbox(page, finger.mode, '1-3-2-3', '&setup=pass');
  expect(r0.userHasBall).toBe(true);
  const r = await waitFor(page, (x) => x.phase === 'live' && x.userHasBall);
  const carrier = r.players[r.controlledId];
  const start: Point = { x: carrier.sx, y: carrier.sy - 8 };
  // Target: the most forward teammate in range.
  const mates = Object.entries(r.players).filter(([id, p]) => id.startsWith('H') && !p.keeper && id !== r.controlledId);
  const [, mate] = mates
    .map(([id, p]) => [id, p, Math.hypot(p.x - r.ball.x, p.y - r.ball.y)] as const)
    .filter(([, , dist]) => dist > 7 && dist < 22)
    .sort((a, b) => b[1].x - a[1].x)[0] ?? mates.map(([id, p]) => [id, p, 0] as const)[0]!;
  await finger.down(start);
  await waitFor(page, (x) => x.phase === 'aiming', 5000);
  const dir = pitchVectorToScreen(r.layout, { x: mate.x - r.ball.x, y: mate.y - r.ball.y });
  const len = Math.hypot(dir.x, dir.y);
  const power = Math.min(1, Math.max(0, (Math.hypot(mate.x - r.ball.x, mate.y - r.ball.y) - r.pass.minDistance) / (r.pass.maxDistance - r.pass.minDistance)));
  const drag = GESTURE_TUNING.aimMinDragPx + power * (GESTURE_TUNING.aimMaxDragPx - GESTURE_TUNING.aimMinDragPx);
  const end = { x: start.x - (dir.x / len) * drag, y: start.y - (dir.y / len) * drag };
  await finger.move({ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
  const aiming = await report(page);
  expect(aiming.timeScale).toBeLessThan(1);
  await finger.up(end);
  const passed = await waitFor(page, (x) => x.events.some((e) => e.type === 'pass' && e.by?.startsWith('H')));
  expect(passed.stats.passes.home).toBeGreaterThanOrEqual(1);
  // The pass resolves (received, intercepted, or loose) and play continues without any reset.
  const after = await waitFor(page, (x) => x.events.some((e) => ['received', 'intercepted', 'loose'].includes(e.type) && e.at >= (passed.events.find((p) => p.type === 'pass')?.at ?? 0)), 8000);
  expect(['live', 'stopped', 'aiming']).toContain(after.phase);
  await linger(page);
  expect(errors).toEqual([]);
});

test('keyboard: P pauses, R resets, O toggles overlay, Space aims a pass, M returns to menu', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'desktop keyboard controls');
  const errors = trackConsoleErrors(page);
  await openSandbox(page, 'mouse', '1-3-2-3', '&setup=pass');
  await waitFor(page, (r) => r.phase === 'live' && r.userHasBall);
  await page.keyboard.down('Space');
  await waitFor(page, (r) => r.phase === 'aiming' && r.aimSource === 'keyboard');
  await page.keyboard.up('Space');
  await waitFor(page, (r) => r.events.some((e) => e.type === 'pass' && e.by?.startsWith('H')));
  await page.keyboard.press('KeyO');
  await waitFor(page, (r) => r.overlay);
  await page.keyboard.press('KeyP');
  const paused = await waitFor(page, (r) => r.paused);
  await page.keyboard.press('Digit2');
  await waitFor(page, (r) => r.formations.home === '1-3-3-2');
  await page.keyboard.press('KeyP');
  await waitFor(page, (r) => !r.paused && r.simTime > paused.simTime);
  await page.keyboard.press('KeyR');
  await waitFor(page, (r) => r.phase === 'kickoff' || (r.simTime < 2 && r.score.home === 0));
  await page.keyboard.press('KeyM');
  await waitForScene(page, 'start');
  expect(errors).toEqual([]);
});

test('Start -> sandbox -> Menu repeated keeps one canvas and stable listeners', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  await page.goto('/?debug=1');
  const initial = await waitForScene(page, 'start');
  let baseline: unknown;
  for (let i = 0; i < 3; i++) {
    await pressElement(page, 'sandbox-button', mode);
    await waitForScene(page, 'formation');
    await pressElement(page, 'kickoff-button', mode);
    await waitForScene(page, 'match');
    await page.waitForTimeout(300);
    if (i % 2 === 0) await pressElement(page, 'menu-button', mode);
    else {
      await pressElement(page, 'pause-button', mode);
      await waitFor(page, (r) => r.paused);
      await pressElement(page, 'panel-menu-button', mode);
    }
    const start = await waitForScene(page, 'start');
    expect(start.canvases).toBe(1);
    expect(start.listeners).toEqual(initial.listeners);
    const snap = { listeners: start.listeners, dom: await page.evaluate(() => window.__domListeners?.() ?? {}), displayListSize: start.displayListSize };
    if (baseline) expect(snap, `return ${i + 1}`).toEqual(baseline);
    else baseline = snap;
  }
  expect(errors).toEqual([]);
});
