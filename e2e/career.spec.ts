import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

/** Presses a career button, paging with "More" if the screen splits its buttons over pages (as a user would). */
async function pressElement(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const d = await diagnostics(page);
    const els = d.layout?.elements ?? {};
    if (els[name] || !d.activeScenes.includes('career') || !els.more) return pressAny(page, name, mode);
    await pressAny(page, 'more', mode);
    await page.waitForTimeout(50);
  }
  return pressAny(page, name, mode);
}

type Career = { screen: string; week: number; credit: number; journal: number; player: string | null; attributes: Record<string, number> | null; plan: string[]; status: string; toast: string; text: string; textPage: string };

test.describe.configure({ timeout: 90_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

async function career(page: Page): Promise<Career> {
  return (await diagnostics(page)).gameplay as Career;
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
}
async function openCareer(page: Page, mode: 'touch' | 'mouse'): Promise<Career> {
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await pressElement(page, 'career-button', mode);
  await waitForScene(page, 'career');
  return until(page, (c) => c.status !== 'loading', 'store');
}

test('home training: create player, plan a ball-only indoor week, log once, persist, review', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('<b>Sam</b>'));
  let c = await openCareer(page, mode);
  expect(c.status).toBe('ok');
  expect(c.screen).toBe('create');
  await fits(page);
  await pressElement(page, 'pos-MID', mode);
  c = await until(page, (x) => x.screen === 'setup', 'setup');
  expect(c.player).toBe('<b>Sam</b>');
  await fits(page);
  for (const name of ['eq-ball', 'sp-small', 'st-indoor']) {
    const before = (await career(page)).toast;
    await pressElement(page, name, mode);
    await until(page, (x) => x.toast !== before || x.toast === 'Setup saved.', name);
  }
  await pressElement(page, 'career-home', mode);
  await until(page, (x) => x.screen === 'home', 'home');
  await fits(page);
  await pressElement(page, 'nav-focus', mode);
  await until(page, (x) => x.screen === 'focus', 'focus');
  await fits(page);
  await pressElement(page, 'focus-ft-cushion', mode);
  c = await until(page, (x) => x.screen === 'sessions', 'sessions');
  expect(c.plan).toEqual(['w1-s1', 'w1-s2', 'w1-s3']);
  await fits(page);
  await pressElement(page, 'open-w1-s1-0', mode);
  await until(page, (x) => x.screen === 'activity', 'activity');
  await fits(page);
  // Every guidance field must be reachable, paging the text if it doesn't fit.
  const seen: string[] = [(await career(page)).text];
  for (let i = 0; i < 10 && (await career(page)).textPage.split('/')[0] !== (await career(page)).textPage.split('/')[1]; i++) {
    const before = (await career(page)).textPage;
    await pressElement(page, 'text-more', mode);
    seen.push((await until(page, (x) => x.textPage !== before, 'text page')).text);
  }
  const all = seen.join('\n');
  for (const field of ['Easier:', 'Harder:', 'Limits', 'Source', 'Review: coaching pending']) expect(all, all).toContain(field);
  await page.waitForTimeout(400);
  expect(Object.keys((await diagnostics(page)).layout!.elements)).toContain('demo-caption');
  await pressElement(page, 'career-home', mode);
  await until(page, (x) => x.screen === 'home', 'home');
  await pressElement(page, 'nav-journal', mode);
  await until(page, (x) => x.screen === 'journal', 'journal');
  await page.waitForTimeout(400);
  // The activity demo's caption must not linger on other screens.
  expect(Object.keys((await diagnostics(page)).layout!.elements)).not.toContain('demo-caption');
  await pressElement(page, 'career-home', mode);
  await until(page, (x) => x.screen === 'home', 'home');
  await pressElement(page, 'nav-sessions', mode);
  await until(page, (x) => x.screen === 'sessions', 'sessions again');
  await pressElement(page, 'open-w1-s1-0', mode);
  await until(page, (x) => x.screen === 'activity', 'activity again');
  await pressElement(page, 'log-open', mode);
  await until(page, (x) => x.screen === 'log', 'log');
  await fits(page);
  await pressElement(page, 'r-comfortable', mode);
  await pressElement(page, 'log-complete', mode);
  await pressElement(page, 'log-complete', mode).catch(() => undefined);
  c = await until(page, (x) => x.screen === 'sessions' && x.credit === 1, 'credit');
  await page.waitForTimeout(300);
  c = await career(page);
  expect(c.credit).toBe(1);
  expect(c.journal).toBe(1);

  // Reload: the save is in IndexedDB.
  c = await openCareer(page, mode);
  expect(c).toMatchObject({ screen: 'home', credit: 1, journal: 1, week: 1, player: '<b>Sam</b>' });
  await pressElement(page, 'nav-review', mode);
  await until(page, (x) => x.screen === 'review', 'review');
  await fits(page);
  const attrs = c.attributes;
  await pressElement(page, 'end-week', mode);
  c = await until(page, (x) => x.week === 2, 'week 2');
  // Home practice alone never changes game attributes.
  expect(c.attributes).toEqual(attrs);
  expect(c.credit).toBe(0);
  await pressElement(page, 'career-home', mode);
  await until(page, (x) => x.screen === 'home', 'home');
  await pressElement(page, 'nav-player', mode);
  await until(page, (x) => x.screen === 'player', 'player');
  await fits(page);
  expect(errors).toEqual([]);
});

test('career sandbox play records evidence for the career slot and returns cleanly', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Kai'));
  await openCareer(page, mode);
  await pressElement(page, 'pos-FWD', mode);
  await until(page, (x) => x.screen === 'setup', 'setup');
  await pressElement(page, 'career-home', mode);
  await until(page, (x) => x.screen === 'home', 'home');
  await pressElement(page, 'nav-play', mode);
  await waitForScene(page, 'formation');
  const d = await diagnostics(page);
  expect(Object.keys(d.layout!.elements)).toContain('kickoff-button');
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
  const start = Date.now();
  let slot: string | null = null;
  while (Date.now() - start < 15_000) {
    const g = (await diagnostics(page)).gameplay as { career?: { slot: string } | null };
    if (g?.career) {
      slot = g.career.slot;
      break;
    }
    await page.waitForTimeout(100);
  }
  expect(slot).toBe('H8');
  expect(errors).toEqual([]);
});
