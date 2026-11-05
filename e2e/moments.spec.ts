import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

interface Drawn { id: string; sheet: string; frame: number; action: string; since: number; me: boolean; sprite: boolean }
interface Tm { mode: string; message: string; sceneId: string | null; status: string | null; look: string; stage: string | null; stageLabel: string; speedLabel: string; paused: boolean; t: number; choice: string | null; attempts: { kind: string; choice: string }[]; replays: { what: string }[]; choices: string[]; coach: string; actors: Drawn[]; ball: { texture: string; frame: string; state: string; size: number } | null; coachArt: boolean }

async function tm(page: Page, pred: (g: Tm) => boolean, what: string, ms = 30_000): Promise<Tm> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const g = d.gameplay as Tm | null;
    if (d.activeScenes.includes('moments') && g && pred(g)) return g;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(g)?.slice(0, 500)}`);
    await page.waitForTimeout(50);
  }
}

async function inViewport(page: Page): Promise<void> {
  const d = await diagnostics(page);
  for (const [name, r] of Object.entries(d.layout?.elements ?? {})) expectInside(name, r, d.layout!.viewport);
}

async function openReview(page: Page, mode: 'touch' | 'mouse', id: string): Promise<void> {
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'moments-button', mode);
  await waitForScene(page, 'momentsReview');
  await expect.poll(async () => !!(await diagnostics(page)).layout?.elements[`tmr-${id}`], { timeout: 10_000 }).toBe(true);
  await pressElement(page, `tmr-${id}`, mode);
  await tm(page, (g) => g.stage === 'brief' && g.actors.length > 0 && g.actors.every((a) => a.sprite) && g.coachArt, 'brief with art');
}

test('Tactical Moments review: every stage, pause/resume, every branch, replay and retry, both protagonists', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  await openReview(page, mode, 'D01');
  let g = await tm(page, (x) => x.stage === 'brief', 'brief');
  expect(g.mode).toBe('review');
  expect(g.stageLabel).toBe('BRIEF');
  expect(g.status).toBe('READY_FOR_REVIEW');
  await inViewport(page);
  for (const look of ['boy', 'girl'] as const) {
    if (look === 'girl') {
      await pressElement(page, 'tm-look', mode);
      await tm(page, (x) => x.look === 'girl' && x.stage === 'brief' && x.actors.every((a) => a.sprite), 'girl');
    }
    g = await tm(page, (x) => x.stage === 'brief', 'brief');
    // One protagonist slot: the saved look, never also a teammate; the patterned ball, never a plain circle.
    expect(g.actors.filter((a) => a.sheet === look)).toHaveLength(1);
    expect(g.actors.find((a) => a.me)?.sheet).toBe(look);
    expect(g.actors.filter((a) => a.sheet === (look === 'boy' ? 'girl' : 'boy'))).toHaveLength(0);
    expect(new Set(g.actors.map((a) => a.sheet)).size).toBe(g.actors.length);
    expect(g.ball?.texture).toBe('jb4:jungle4-ball');
    await pressElement(page, 'tm-start', mode);
    g = await tm(page, (x) => x.stage === 'watch', 'watch');
    expect(g.stageLabel).toBe('WATCH');
    expect(g.speedLabel).toBe('1×');
    await pressElement(page, 'tm-pause', mode);
    const p = await tm(page, (x) => x.paused, 'paused');
    expect(p.speedLabel).toBe('PAUSED');
    await page.waitForTimeout(600);
    expect((await tm(page, () => true, 'still paused')).t).toBe(p.t);
    await pressElement(page, 'tm-pause', mode);
    await tm(page, (x) => !x.paused && x.t > p.t, 'resumed');
    g = await tm(page, (x) => x.stage === 'slow', 'slow');
    expect(g.stageLabel).toBe('SLOW');
    expect(g.speedLabel).toBe('0.35×');
    g = await tm(page, (x) => x.stage === 'decide', 'decide', 20_000);
    expect(g.stageLabel).toBe('DECIDE');
    expect(g.choices).toEqual(['A', 'B', 'C', 'D']);
    await inViewport(page);
    for (const k of g.choices) {
      await pressElement(page, `tm-choice-${k}`, mode);
      g = await tm(page, (x) => x.stage === 'result' && x.choice === k, `result ${k}`);
      // The Result stage label says RESULT; the playback speed is shown separately.
      expect(g.stageLabel).toBe('RESULT');
      expect(g.speedLabel).toBe('0.5×');
      g = await tm(page, (x) => x.stage === 'learn', `learn ${k}`, 30_000);
      expect(g.stageLabel).toBe('LEARN');
      expect(g.coach).toContain('Coach Code:');
      await inViewport(page);
      await pressElement(page, 'tm-replay', mode);
      await tm(page, (x) => x.replays.length > 0 && x.stage === 'learn' && x.t < 0.5, `replay ${k}`);
      await pressElement(page, 'tm-retry', mode);
      await tm(page, (x) => x.stage === 'watch' || x.stage === 'slow', `retry ${k}`);
      await tm(page, (x) => x.stage === 'decide', `decide again after ${k}`, 20_000);
    }
    g = await tm(page, () => true, 'attempts');
    expect(g.attempts.map((a) => a.kind)).toEqual(['first', 'retry', 'retry', 'retry']);
  }
  expect(errors).toEqual([]);
});

test('Tactical Moments: a pass is struck on the contact frame and the ball is its own patterned sprite', async ({ page }, info) => {
  const mode = modeFor(info);
  // D04 base A is a pass (reset through the keeper).
  await openReview(page, mode, 'D04');
  await pressElement(page, 'tm-start', mode);
  await tm(page, (x) => x.stage === 'decide', 'decide', 30_000);
  await pressElement(page, 'tm-choice-A', mode);
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const g = await tm(page, () => true, 'result frames');
    const passer = g.actors.find((a) => a.action === 'pass');
    if (passer) seen.add(`${passer.frame}:${g.ball?.state}`);
    if (g.stage === 'learn') break;
    await page.waitForTimeout(20);
  }
  // Plant (7/8) while the ball is still held, contact (9) as it leaves.
  expect([...seen].some((s) => /^(7|8):held/.test(s))).toBe(true);
  expect([...seen].some((s) => /^9:/.test(s))).toBe(true);
});

test('Tactical Moments are not player-facing until approved', async ({ page }) => {
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await page.evaluate(() => (window as unknown as { __SMR__: { game: { scene: { getScene(k: string): { scene: { start(k: string, d: object): void } } } } } }).__SMR__.game.scene.getScene('start').scene.start('moments', { situationId: 'D01', variant: 'base', review: true }));
  const g = await tm(page, (x) => !!x.message || !!x.stage, 'player mode');
  // `review` is ignored without ?dev: player mode finds no approved scene and records nothing.
  expect(g.mode).toBe('player');
  expect(g.stage).toBeNull();
  expect(g.message).toContain('not approved');
  await inViewport(page);
});
