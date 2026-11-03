import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

// D68: the v1.1 library and the Ball Mastery designs are regular lessons inside the two Home Training sections.
test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
type Career = { demoGate?: string | null; screen: string; credit: number; journal: number; status: string; text: string; attributes: Record<string, number> | null };
const career = async (page: Page) => (await diagnostics(page)).gameplay as Career;
const els = async (page: Page) => (await diagnostics(page)).layout?.elements ?? {};
async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const e = await els(page);
    if (e[name] || !e.more) return pressAny(page, name, mode);
    await pressAny(page, 'more', mode);
    await page.waitForTimeout(60);
  }
  return pressAny(page, name, mode);
}
async function until(page: Page, pred: (c: Career) => boolean, what: string): Promise<Career> {
  const start = Date.now();
  for (;;) {
    const c = await career(page).catch(() => null);
    if (c && pred(c)) return c;
    if (Date.now() - start > 15_000) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(c)}`);
    await page.waitForTimeout(50);
  }
}
const shot = async (page: Page, info: TestInfo, name: string) => {
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${info.project.name}-${name}.png` });
};

test('approved v1.1 options and Ball Mastery designs open as regular lessons, never as drafts', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Sam'));
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressAny(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await until(page, (c) => c.status === 'ok' && c.screen === 'create', 'create');
  await press(page, 'pos-MID', mode);
  await until(page, (c) => c.screen === 'setup', 'setup');
  await press(page, 'career-home', mode);
  const home = await until(page, (c) => c.screen === 'home', 'home');

  await press(page, 'nav-ballmastery', mode);
  await until(page, (x) => x.screen === 'ballMastery', 'ball mastery');
  let c: Career;
  await press(page, 'lib-dribbling', mode);
  c = await until(page, (x) => x.screen === 'library', 'dribbling');
  expect(Object.keys(await els(page)).some((k) => k.startsWith('draft-'))).toBe(false);
  await shot(page, info, 'dribbling');

  // A design lesson: package cue as Coach Code, step demo, Replay, Log practice.
  await press(page, 'act-bmd-055', mode);
  c = await until(page, (x) => x.screen === 'activity', 'design lesson');
  expect(c.text).toContain('COACH CODE: Keep the ball still; alternate light contacts.');
  expect(c.text).not.toMatch(/draft|review only/i);
  expect(Object.keys(await els(page))).toEqual(expect.arrayContaining(['log-open', 'demo-pause', 'demo-step', 'demo-half', 'demo-replay']));
  await shot(page, info, 'design-lesson');
  await press(page, 'career-back', mode);
  await until(page, (x) => x.screen === 'library', 'dribbling again');

  // A v1.1 option opens the regular lesson page; its demo is not contact-checked yet, so none is shown (D69 gate).
  await press(page, 'act-v11-BM02-L1', mode);
  c = await until(page, (x) => x.screen === 'activity' && x.demoGate === 'checking', 'v1.1 lesson');
  expect(c.text).not.toMatch(/draft/i);
  expect(c.text).toContain('still being checked');
  expect(Object.keys(await els(page))).toEqual(expect.arrayContaining(['log-open']));
  expect(Object.keys(await els(page))).not.toContain('demo-pause');
  await shot(page, info, 'v11-lesson');
  await press(page, 'career-back', mode);
  await until(page, (x) => x.screen === 'library', 'dribbling again');

  // A Ball Mastery v1.1 option with a top-down prototype opens the regular lesson page too: the prototype's foot and
  // ball contact is not checked, so it stays in Review & Lab only.
  await press(page, 'act-v11-BM01-L1', mode);
  c = await until(page, (x) => x.screen === 'activity' && x.demoGate === 'checking', 'prototype lesson gated');
  expect(c.text).toContain('COACH CODE');
  expect(c.text).not.toContain('DRAFT');
  await shot(page, info, 'v11-prototype');

  // Juggling lists its v1.1 options too.
  await press(page, 'career-home', mode);
  await until(page, (x) => x.screen === 'home', 'home');
  await press(page, 'nav-juggling', mode);
  await until(page, (x) => x.screen === 'library', 'juggling');
  await press(page, 'act-v11-JU01-L2', mode);
  c = await until(page, (x) => x.screen === 'activity' || x.screen === 'draftLevel', 'juggling option');
  expect(c.text).not.toMatch(/draft/i);

  // Opening lessons changes nothing.
  await press(page, 'career-home', mode);
  c = await until(page, (x) => x.screen === 'home', 'home');
  expect(c.credit).toBe(home.credit);
  expect(c.journal).toBe(home.journal);
  expect(c.attributes).toEqual(home.attributes);
  expect(errors).toEqual([]);
});

test('reduced motion: promoted step demos start paused and stay still', async ({ page }, info) => {
  const mode = modeFor(info);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('dialog', (d) => void d.accept('Sam'));
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressAny(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await until(page, (c) => c.status === 'ok' && c.screen === 'create', 'create');
  await press(page, 'pos-MID', mode);
  await until(page, (c) => c.screen === 'setup', 'setup');
  await press(page, 'career-home', mode);
  await until(page, (c) => c.screen === 'home', 'home');
  await press(page, 'nav-ballmastery', mode);
  await until(page, (x) => x.screen === 'ballMastery', 'ball mastery');
  await press(page, 'lib-dribbling', mode);
  await until(page, (x) => x.screen === 'library', 'dribbling');
  await press(page, 'act-bmd-055', mode);
  await until(page, (x) => x.screen === 'activity', 'design lesson');
  await page.waitForTimeout(300);
  const canvas = page.locator('canvas');
  const a = await canvas.screenshot();
  await page.waitForTimeout(1500);
  expect((await canvas.screenshot()).equals(a)).toBe(true);
  // Play starts it; the picture then changes.
  await press(page, 'demo-pause', mode);
  await page.waitForTimeout(1500);
  expect((await canvas.screenshot()).equals(a)).toBe(false);
});
