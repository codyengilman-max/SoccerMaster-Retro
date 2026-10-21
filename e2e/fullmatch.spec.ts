import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { MatchReport } from '../src/scenes/matchReport';
import { diagnostics, expectInside, pressElement, trackConsoleErrors, trackDomListeners, waitForScene, type PointerMode } from './helpers';

test.describe.configure({ timeout: 180_000 });

const modeFor = (info: TestInfo): PointerMode => (info.project.use.hasTouch ? 'touch' : 'mouse');

async function report(page: Page): Promise<MatchReport> {
  const d = await diagnostics(page);
  if (!d.gameplay || d.activeScenes[0] !== 'match') throw new Error(`no match gameplay in ${d.activeScenes.join(',')}`);
  return d.gameplay as MatchReport;
}

/** Polls the match; answers any Coach Moment with its first option so the clock can keep running. */
async function playUntil(page: Page, mode: PointerMode, predicate: (r: MatchReport) => boolean, timeout = 90_000): Promise<MatchReport> {
  const start = Date.now();
  for (;;) {
    const r = await report(page);
    if (predicate(r)) return r;
    if (r.coach?.overlay === 'question') await pressElement(page, 'coach-option-0', mode);
    else if (r.coach?.overlay === 'feedback') await pressElement(page, 'coach-continue', mode);
    if (Date.now() - start > timeout) throw new Error(`timed out; phase=${r.phase} clock=${r.clock?.label} coach=${r.coach?.overlay}`);
    await page.waitForTimeout(100);
  }
}

async function openMatch(page: Page, mode: PointerMode, query: string): Promise<MatchReport> {
  await page.goto(`/?debug=1&dev${query}`);
  await waitForScene(page, 'start');
  await pressElement(page, 'sandbox-button', mode);
  await waitForScene(page, 'formation');
  await pressElement(page, 'pick-1-3-2-3', mode);
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
  return playUntil(page, mode, (r) => r.phase === 'live');
}

async function expectBreakFits(page: Page, button: string): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  const d = await diagnostics(page);
  for (const name of ['break-panel', 'break-menu-button', button]) expectInside(name, d.layout?.elements[name], viewport);
}

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('timed match: clock, pause, half-time, second half, full-time result, play again', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  const r0 = await openMatch(page, mode, '&halfSeconds=12');
  expect(r0.clock).toMatchObject({ half: 1, halfSeconds: 12 });
  expect(r0.clock?.label).toMatch(/^1st \d+:\d\d$/);

  await pressElement(page, 'pause-button', mode);
  const paused = await report(page);
  await page.waitForTimeout(1200);
  expect((await report(page)).clock?.elapsed).toBe(paused.clock?.elapsed);
  await pressElement(page, 'resume-button', mode);

  const ht = await playUntil(page, mode, (r) => r.breakPanel === 'halftime');
  expect(ht.phase).toBe('halftime');
  expect(ht.clock).toMatchObject({ half: 1, elapsed: 12 });
  await expectBreakFits(page, 'second-half-button');
  const htSim = ht.simTime;
  await page.waitForTimeout(800);
  expect((await report(page)).simTime).toBe(htSim);

  await pressElement(page, 'second-half-button', mode);
  const second = await playUntil(page, mode, (r) => r.clock?.half === 2 && r.breakPanel === null);
  expect(second.score).toEqual(ht.score);
  expect(second.events.some((e) => e.type === 'secondHalf')).toBe(true);

  const ft = await playUntil(page, mode, (r) => r.breakPanel === 'fulltime');
  expect(ft.phase).toBe('fulltime');
  expect(ft.result).toBe(ft.score.home > ft.score.away ? 'win' : ft.score.home < ft.score.away ? 'loss' : 'draw');
  await expectBreakFits(page, 'play-again-button');

  await pressElement(page, 'play-again-button', mode);
  const again = await playUntil(page, mode, (r) => r.breakPanel === null && r.clock?.half === 1);
  expect(again.score).toEqual({ home: 0, away: 0 });
  expect(again.clock!.elapsed).toBeLessThan(3);
  expect(errors).toEqual([]);
});

test('backgrounding at half-time keeps the card and never starts the second half', async ({ page }, info) => {
  const mode = modeFor(info);
  await openMatch(page, mode, '&halfSeconds=10');
  await playUntil(page, mode, (r) => r.breakPanel === 'halftime');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await report(page);
  expect(hidden.pauseReasons.user).toBe(true);
  expect(hidden.phase).toBe('halftime');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await pressElement(page, 'resume-button', mode);
  const back = await playUntil(page, mode, (r) => r.breakPanel === 'halftime');
  expect(back.clock).toMatchObject({ half: 1 });
  await pressElement(page, 'second-half-button', mode);
  await playUntil(page, mode, (r) => r.clock?.half === 2 && r.phase !== 'halftime');
});

test('Coach Moments span the whole match and the Coach summary is the full-time screen', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  const r0 = await openMatch(page, mode, '&coach&halfSeconds=30');
  expect(r0.coach?.sessionSeconds).toBe(60);
  await playUntil(page, mode, (r) => r.breakPanel === 'halftime');
  await pressElement(page, 'second-half-button', mode);
  const end = await playUntil(page, mode, (r) => r.phase === 'fulltime' && r.coach?.overlay === 'summary', 150_000);
  expect(end.breakPanel).toBeNull();
  expect(end.coach?.entries.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
