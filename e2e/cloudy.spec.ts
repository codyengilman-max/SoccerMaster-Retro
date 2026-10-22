import { expect, test, type Page } from '@playwright/test';
import { diagnostics, expectInside, pressElement, trackConsoleErrors, trackDomListeners, waitForScene } from './helpers';

type Pt = { x: number; y: number };
type Snap = {
  screen: string; phase: string; paused: boolean; t: number; score: number; caught: number; total: number; saved: boolean; savedMessage: string;
  fish: { x: number; y: number; cooldown: number; dashLeft: number; screen: Pt }; pellets: { screen: Pt }[]; target: Pt | null;
  best: { difficulty: string; bestScore: number; bestStars: number }[]; art: { background: boolean; fish: boolean }; fit: { scale: number; x: number; y: number };
};
const snap = async (page: Page): Promise<Snap> => (await diagnostics(page)).gameplay as Snap;
type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('Cloudy: Start → instructions → round → pause → results → saved best → replay → back, listeners stable', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev&cloudySpeed=4');
  const initial = await waitForScene(page, 'start');
  const viewport = page.viewportSize()!;
  await pressElement(page, 'cloudy-button', 'touch');
  let d = await waitForScene(page, 'cloudy');
  expect(d.canvases).toBe(1);
  await expect.poll(async () => (await snap(page)).art).toEqual({ background: true, fish: true });
  d = await diagnostics(page);
  for (const n of ['painting', 'goal', 'title', 'back-button', 'cloudy-easy-button', 'cloudy-medium-button', 'cloudy-hard-button']) expectInside(n, d.layout?.elements[n], viewport);
  // The painting keeps its 3:2 aspect ratio and the goal box is the painted opening, inside the painting.
  const pr = d.layout!.elements.painting!;
  expect(Math.abs(pr.width / pr.height - 1.5)).toBeLessThan(0.01);
  const goal = d.layout!.elements.goal!;
  expect(goal.x).toBeCloseTo(pr.x + pr.width * (908 / 1536), 0);
  expect(goal.y).toBeCloseTo(pr.y + pr.height * (746 / 1024), 0);

  await pressElement(page, 'cloudy-easy-button', 'touch');
  await expect.poll(async () => (await snap(page)).phase, { timeout: 10_000 }).toBe('playing');
  d = await diagnostics(page);
  for (const n of ['pause-button', 'dash', 'hud']) expectInside(n, d.layout?.elements[n], viewport);
  expect(overlaps(d.layout!.elements.dash!, d.layout!.elements.goal!), 'DASH covers the goal').toBe(false);

  // Drag-to-swim: Cloudy moves toward the finger, not teleporting.
  const canvas = (await page.locator('canvas').boundingBox())!;
  const start = await snap(page);
  const to = { x: pr.x + pr.width * 0.75, y: pr.y + pr.height * 0.35 };
  await page.mouse.move(canvas.x + start.fish.screen.x, canvas.y + start.fish.screen.y);
  await page.mouse.down();
  await page.mouse.move(canvas.x + to.x, canvas.y + to.y, { steps: 5 });
  const s1 = await snap(page);
  expect(s1.target).not.toBeNull();
  await page.waitForTimeout(400);
  const s2 = await snap(page);
  expect(s2.fish.x).toBeGreaterThan(start.fish.x + 20);
  await page.mouse.up();
  expect((await snap(page)).target).toBeNull();

  // DASH: a real tap starts the burst and the cooldown.
  await pressElement(page, 'dash', 'touch');
  await expect.poll(async () => (await snap(page)).fish.cooldown).toBeGreaterThan(0);

  // Pause freezes the clock; Resume continues.
  await pressElement(page, 'pause-button', 'touch');
  await expect.poll(async () => (await snap(page)).paused).toBe(true);
  const tp = (await snap(page)).t;
  await page.waitForTimeout(800);
  expect((await snap(page)).t).toBe(tp);
  d = await diagnostics(page);
  expectInside('resume-button', d.layout?.elements['resume-button'], viewport);
  await pressElement(page, 'resume-button', 'touch');
  await expect.poll(async () => (await snap(page)).t, { timeout: 5000 }).toBeGreaterThan(tp);

  // Play to the end (debug speed x4) chasing the lowest pellet.
  const deadline = Date.now() + 60_000;
  while ((await snap(page)).screen === 'game' && Date.now() < deadline) {
    const s = await snap(page);
    const p = s.pellets.slice().sort((a, b) => b.screen.y - a.screen.y)[0];
    if (p) {
      await page.mouse.move(canvas.x + p.screen.x, canvas.y + p.screen.y);
      await page.mouse.down();
      await page.waitForTimeout(120);
      await page.mouse.up();
    } else await page.waitForTimeout(150);
  }
  const res = await snap(page);
  expect(res.screen).toBe('results');
  await expect.poll(async () => (await snap(page)).savedMessage, { timeout: 10_000 }).not.toBe('');
  const end = await snap(page);
  expect(end.savedMessage).not.toMatch(/Not saved/);
  expect(end.best.find((b) => b.difficulty === 'easy')?.bestScore).toBe(end.score);
  d = await diagnostics(page);
  for (const n of ['replay-button', 'done-button', 'back-button', 'info']) expectInside(n, d.layout?.elements[n], viewport);

  // Reload: the best survives.
  await page.reload();
  await waitForScene(page, 'start');
  await pressElement(page, 'cloudy-button', 'mouse');
  await waitForScene(page, 'cloudy');
  await expect.poll(async () => (await snap(page)).best.find((b) => b.difficulty === 'easy')?.bestScore ?? -1).toBe(end.score);

  // Replay starts a fresh round; leaving mid-round saves nothing.
  await pressElement(page, 'cloudy-easy-button', 'mouse');
  await expect.poll(async () => (await snap(page)).phase, { timeout: 10_000 }).toBe('playing');
  await pressElement(page, 'pause-button', 'mouse');
  await pressElement(page, 'leave-confirm-button', 'mouse');
  await expect.poll(async () => (await snap(page)).screen).toBe('menu');
  await pressElement(page, 'back-button', 'mouse');
  const back = await waitForScene(page, 'start');
  expect(back.canvases).toBe(1);
  expect(back.listeners).toEqual(initial.listeners);
  expect(errors).toEqual([]);
});

test('Cloudy: switching away pauses the round and drops the held finger', async ({ page }) => {
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'cloudy-button', 'touch');
  await waitForScene(page, 'cloudy');
  await pressElement(page, 'cloudy-medium-button', 'touch');
  await expect.poll(async () => (await snap(page)).phase, { timeout: 10_000 }).toBe('playing');
  const canvas = (await page.locator('canvas').boundingBox())!;
  const s = await snap(page);
  await page.mouse.move(canvas.x + s.fish.screen.x + 80, canvas.y + s.fish.screen.y);
  await page.mouse.down();
  await page.evaluate(() => (window as unknown as { __SMR__: { game: { events: { emit(e: string): void } } } }).__SMR__.game.events.emit('hidden'));
  await expect.poll(async () => (await snap(page)).paused).toBe(true);
  expect((await snap(page)).target).toBeNull();
  await page.mouse.up();
  // Rotating while paused keeps the round and relays out the painting.
  const v = page.viewportSize()!;
  await page.setViewportSize({ width: v.height, height: v.width });
  await expect.poll(async () => (await diagnostics(page)).layout?.orientation).toBe(v.height > v.width ? 'landscape' : 'portrait');
  const after = await snap(page);
  expect(after.paused).toBe(true);
  expect(after.screen).toBe('game');
});
