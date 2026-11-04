import { expect, test, type Page } from '@playwright/test';
import { diagnostics, expectInside, pressElement, trackConsoleErrors, waitForScene } from './helpers';

type Dd = {
  view: string;
  paused: boolean;
  art: Record<string, boolean>;
  outcome: string;
  sim: { phase: string; t: number; chances: number; canShoot: boolean; stats: { shots: number; score: number }; ball: { state: string } } | null;
};
const dd = async (page: Page): Promise<Dd> => (await diagnostics(page)).gameplay as Dd;

/** Opens the scene with a staged in-memory player (no career store writes), as Home Training would. */
async function open(page: Page): Promise<void> {
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await page.evaluate(() => window.__SMR__!.game.scene.getScenes(true).forEach((s) => s.scene.start('driveway', { returnTo: 'career' })));
  await waitForScene(page, 'driveway');
  await page.waitForFunction(() => {
    const s = window.__SMR__!.game.scene.getScene('driveway') as unknown as { store: unknown; save: unknown };
    return s.store !== null || s.save !== null;
  }, undefined, { timeout: 20_000 }).catch(() => undefined);
  await page.evaluate(() => {
    const s = window.__SMR__!.game.scene.getScene('driveway') as unknown as { save: unknown; store: unknown; showSelect(): void };
    s.store = null;
    s.save = { week: 1, player: { gender: 'boy' }, driveway: { unlocked: 1, best: [], weeks: [], runs: [], activeFrom: 1 } };
    s.showSelect();
  });
}

test('Driveway Dribbling: select screen, league pad, quick shot, recovery, pause on hide, fits the screen', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackConsoleErrors(page);
  const viewport = page.viewportSize()!;
  await open(page);
  let d = await diagnostics(page);
  for (const n of ['panel', 'dd-start', 'dd-return', 'dd-diff-beginner', 'dd-diff-expert']) expectInside(n, d.layout?.elements[n], viewport);
  expect((await dd(page)).view).toBe('select');
  await pressElement(page, 'dd-start', 'touch');
  await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { sim?: { phase?: string } } | null)?.sim?.phase === 'playing', undefined, { timeout: 10_000 });
  d = await diagnostics(page);
  for (const n of ['hud', 'hudRight', 'dd-pause', 'pad-shoot', 'pad-stick']) expectInside(n, d.layout?.elements[n], viewport);
  const g = await dd(page);
  expect(g.art).toEqual({ background: true, objects: true, player: true, ball: true });
  expect(g.sim?.canShoot).toBe(true);
  // League quick shot: a double tap on SHOOT fires from the ball, then the ball recovers and shooting waits.
  // Two real taps back to back on SHOOT: a diagnostics read between them could outlast the 0.25 s double-tap window on a busy runner.
  const shoot = d.layout!.elements['pad-shoot']!;
  await page.touchscreen.tap(shoot.x + shoot.width / 2, shoot.y + shoot.height / 2);
  await page.touchscreen.tap(shoot.x + shoot.width / 2, shoot.y + shoot.height / 2);
  await expect.poll(async () => (await dd(page)).sim?.stats.shots ?? 0, { timeout: 3000 }).toBe(1);
  expect((await dd(page)).sim?.canShoot).toBe(false);
  await expect.poll(async () => (await dd(page)).sim?.canShoot, { timeout: 3000 }).toBe(true);
  // Backgrounding pauses: the round clock stops while hidden.
  await page.evaluate(() => window.__SMR__!.game.events.emit('hidden'));
  const t0 = (await dd(page)).sim!.t;
  await page.waitForTimeout(600);
  expect((await dd(page)).paused).toBe(true);
  expect((await dd(page)).sim!.t).toBe(t0);
  d = await diagnostics(page);
  for (const n of ['dd-resume', 'dd-leave']) expectInside(n, d.layout?.elements[n], viewport);
  await pressElement(page, 'dd-resume', 'touch');
  await expect.poll(async () => (await dd(page)).sim!.t, { timeout: 3000 }).toBeGreaterThan(t0);
  // A finished round shows the result panel with Replay and Return on screen.
  await page.evaluate(() => {
    const s = window.__SMR__!.game.scene.getScene('driveway') as unknown as { sim: { phase: string; update(dt: number): unknown[] }; onEvent(e: unknown): void };
    for (let i = 0; i < 4000 && s.sim.phase !== 'results'; i++) for (const e of s.sim.update(1 / 30)) s.onEvent(e);
  });
  await expect.poll(async () => (await dd(page)).view, { timeout: 5000 }).toBe('results');
  const out = (await dd(page)).outcome;
  for (const s of ['Score', 'Clean dodges', 'Targets', 'Accuracy', 'development points', 'Added this week', 'Weekly Driveway Dribbling']) expect(out).toContain(s);
  d = await diagnostics(page);
  for (const n of ['panel', 'dd-replay', 'dd-return']) expectInside(n, d.layout?.elements[n], viewport);
  await pressElement(page, 'dd-replay', 'touch');
  await expect.poll(async () => (await dd(page)).view).toBe('select');
  await pressElement(page, 'dd-return', 'touch');
  await waitForScene(page, 'career');
  expect(errors).toEqual([]);
});
