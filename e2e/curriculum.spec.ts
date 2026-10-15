import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

type Career = { screen: string; credit: number; journal: number; plan: string[]; status: string; toast: string; text: string; overflow: string[] };
test.describe.configure({ timeout: 240_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const els = (await diagnostics(page)).layout?.elements ?? {};
    if (els[name] || !els.more) return pressAny(page, name, mode);
    await pressAny(page, 'more', mode);
    await page.waitForTimeout(50);
  }
  return pressAny(page, name, mode);
}
async function until(page: Page, pred: (c: Career) => boolean, what: string): Promise<Career> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const c = d.gameplay as Career | null;
    if (d.activeScenes.includes('career') && c && pred(c)) return c;
    if (Date.now() - start > 15_000) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(c)}`);
    await page.waitForTimeout(50);
  }
}
async function fits(page: Page): Promise<void> {
  const d = await diagnostics(page);
  for (const [name, rect] of Object.entries(d.layout!.elements)) if (name !== 'body') expectInside(name, rect, d.layout!.viewport);
  expect((d.gameplay as Career).overflow).toEqual([]);
}
async function caption(page: Page): Promise<string> {
  return page.evaluate(() => {
    const s = (window as unknown as { __SMR__: { game: { scene: { getScene(k: string): { demoCaption?: { text: string } } } } } }).__SMR__.game.scene.getScene('career');
    return s.demoCaption?.text ?? '';
  });
}

async function demoTime(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __SMR__: { game: { scene: { getScene(k: string): { demoT: number } } } } }).__SMR__.game.scene.getScene('career').demoT);
}

test('draft library is review-only: cards and demo prototypes, never in the plan or credit', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol !== 'data:' && u.protocol !== 'blob:') external.push(r.url());
  });
  page.on('dialog', (d) => void d.accept('Sam'));
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await until(page, (c) => c.status === 'ok' && c.screen === 'create', 'create');
  await press(page, 'pos-MID', mode);
  await until(page, (c) => c.screen === 'setup', 'setup');
  await press(page, 'career-home', mode);
  await until(page, (c) => c.screen === 'home', 'home');
  await press(page, 'nav-focus', mode);
  await until(page, (c) => c.screen === 'focus', 'focus');
  await press(page, 'focus-ft-cushion', mode);
  const planned = await until(page, (c) => c.screen === 'sessions', 'sessions');
  expect(planned.plan).toEqual(['w1-s1', 'w1-s2', 'w1-s3']);
  await press(page, 'career-home', mode);
  await until(page, (c) => c.screen === 'home', 'home');
  await press(page, 'nav-library', mode);
  await until(page, (c) => c.screen === 'library', 'library');
  await press(page, 'lib-drafts', mode);
  let c = await until(page, (x) => x.screen === 'drafts', 'drafts');
  expect(c.text).toContain('REVIEW ONLY');
  expect(c.text).toContain('published: 0');
  expect(c.text).toContain('No eligible reviewed activity');
  await fits(page);
  await press(page, 'draft-JU01', mode);
  c = await until(page, (x) => x.screen === 'draftFamily', 'family');
  expect(c.text).toContain('Coaching review');
  expect(c.text).toContain('not a difficulty ladder');
  await fits(page);
  await press(page, 'draft-level-JU01-L1', mode);
  c = await until(page, (x) => x.screen === 'draftLevel', 'level');
  expect(c.text).toContain('DRAFT');
  await fits(page);
  await expect.poll(() => caption(page)).toContain('PROTOTYPE');
  await press(page, 'demo-pause', mode);
  const a = await caption(page);
  await page.waitForTimeout(1500);
  expect(await caption(page)).toBe(a);
  await press(page, 'demo-step', mode);
  await expect.poll(() => caption(page)).not.toBe(a);
  await press(page, 'demo-side', mode);
  await expect.poll(() => caption(page)).toContain('1/6 setup');
  await fits(page);
  // Pausing a prototype must not freeze regular activity demonstrations.
  await press(page, 'demo-pause', mode);
  await press(page, 'career-home', mode);
  await until(page, (x) => x.screen === 'home', 'home');
  await press(page, 'nav-sessions', mode);
  await until(page, (x) => x.screen === 'sessions', 'sessions');
  await press(page, 'open-w1-s1-0', mode);
  await until(page, (x) => x.screen === 'activity', 'activity');
  const t0 = await demoTime(page);
  await page.waitForTimeout(800);
  expect(await demoTime(page)).toBeGreaterThan(t0);
  // Nothing about the draft library touched the plan, credit or journal.
  await press(page, 'career-home', mode);
  c = await until(page, (x) => x.screen === 'home', 'home');
  expect(c.credit).toBe(0);
  expect(c.journal).toBe(0);
  expect(c.plan).toEqual(['w1-s1', 'w1-s2', 'w1-s3']);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('reduced motion starts the demo paused', async ({ page }, info) => {
  const mode = modeFor(info);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('dialog', (d) => void d.accept('Sam'));
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await until(page, (c) => c.status === 'ok' && c.screen === 'create', 'create');
  await press(page, 'pos-MID', mode);
  await until(page, (c) => c.screen === 'setup', 'setup');
  await press(page, 'career-home', mode);
  await press(page, 'nav-library', mode);
  await press(page, 'lib-drafts', mode);
  await press(page, 'draft-BM01', mode);
  await press(page, 'draft-level-BM01-L1', mode);
  await until(page, (x) => x.screen === 'draftLevel', 'level');
  await expect.poll(() => caption(page)).toContain('1/6 setup');
  await page.waitForTimeout(2000);
  expect(await caption(page)).toContain('1/6 setup');
});
