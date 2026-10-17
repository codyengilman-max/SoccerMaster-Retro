import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 180_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

type Career = { screen: string; week: number; attributes: Record<string, number> | null; status: string; toast: string; text: string };
type Team = { phase: string; week: number; index: number; ids: string[]; scores: number[]; message: string };

async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const d = await diagnostics(page);
    const els = d.layout?.elements ?? {};
    if (els[name] || !d.activeScenes.includes('career') || !els.more) return pressAny(page, name, mode);
    await pressAny(page, 'more', mode);
    await page.waitForTimeout(50);
  }
  return pressAny(page, name, mode);
}
async function career(page: Page, pred: (c: Career) => boolean, what: string): Promise<Career> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const c = d.gameplay as Career | null;
    if (d.activeScenes.includes('career') && c && pred(c)) return c;
    if (Date.now() - start > 20_000) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(c)}`);
    await page.waitForTimeout(50);
  }
}
async function team(page: Page, pred: (t: Team) => boolean, what: string, ms = 60_000): Promise<Team> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const t = (d.gameplay as { teamTraining?: Team | null } | null)?.teamTraining ?? null;
    if (d.activeScenes.includes('match') && t && pred(t)) return t;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(t)}`);
    await page.waitForTimeout(100);
  }
}
const total = (a: Record<string, number> | null) => Object.values(a ?? {}).reduce((x, y) => x + y, 0);

test('team training: three catalog situations, counted once, leaving early counts nothing', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Robin'));
  await page.goto('/?debug=1&ttSeconds=2');
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career(page, (c) => c.status !== 'loading', 'store');
  await press(page, 'pos-FWD', mode);
  await career(page, (c) => c.screen === 'setup', 'setup');
  await press(page, 'career-home', mode);
  await career(page, (c) => c.screen === 'home', 'home');
  await press(page, 'nav-team', mode);
  let c = await career(page, (x) => x.screen === 'team', 'team screen');
  expect(c.text).toContain('WING01');
  expect(c.text).toContain('Leaving early counts nothing');
  const before = total(c.attributes);
  const d = await diagnostics(page);
  for (const [name, rect] of Object.entries(d.layout!.elements)) if (name !== 'body') expectInside(name, rect, d.layout!.viewport);

  // Leave during the first situation: nothing is recorded.
  await press(page, 'team-play', mode);
  await waitForScene(page, 'match');
  await team(page, (t) => t.phase === 'playing', 'first situation');
  await pressAny(page, 'menu-button', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'back on team screen');
  expect(c.text).toContain('Leaving early counts nothing');
  expect(total(c.attributes)).toBe(before);

  // Play all three: one result for the week.
  await press(page, 'team-play', mode);
  await waitForScene(page, 'match');
  const done = await team(page, (t) => t.phase === 'done', 'three situations');
  expect(done.ids).toEqual(['DEF01', 'WING01', 'NINE02']);
  expect(done.scores).toHaveLength(3);
  expect(done.message, JSON.stringify(done)).toMatch(/Team Training week 1/);
  await pressAny(page, 'menu-button', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'counted');
  expect(c.text, JSON.stringify({ toast: c.toast, status: c.status, attrs: c.attributes, done })).toContain('Counted for week 1');
  const after = total(c.attributes);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
  for (const v of Object.values(c.attributes ?? {})) expect(v).toBeGreaterThanOrEqual(40);

  // Playing again is practice only, and a reload keeps the result.
  await press(page, 'team-play', mode);
  await waitForScene(page, 'match');
  const again = await team(page, (t) => t.phase === 'done', 'practice run');
  expect(again.message).toMatch(/already counted/);
  await page.reload();
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career(page, (x) => x.status !== 'loading' && x.screen === 'home', 'reloaded');
  await press(page, 'nav-team', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'team after reload');
  expect(c.text).toContain('Counted for week 1');
  expect(total(c.attributes)).toBe(after);
  expect(errors).toEqual([]);
});
