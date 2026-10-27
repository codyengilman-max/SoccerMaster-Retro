import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement as pressAny, revealElement, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 240_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
type Ratio = { num: number; den: number; pct: number | null };
type Report = { status: string; matchId: string; next: string; fullOpen: boolean; report: { matchId: string; week: number; score: { home: number; away: number }; stats: { passes: Ratio; shotsOnTarget: Ratio; groundPasses: Ratio; chips: Ratio } } | null };
type MyPlayer = { status: string; view: string; page: number; pages: number; rows: string[]; values: string[]; week: string[]; header: string; expanded?: boolean };

async function pressElement(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const d = await diagnostics(page);
    const els = d.layout?.elements ?? {};
    if (els[name] && d.activeScenes.includes('myPlayer')) {
      await revealElement(page, name);
      return pressAny(page, name, mode);
    }
    if (els[name] || !d.activeScenes.includes('career') || !els.more) return pressAny(page, name, mode);
    await pressAny(page, 'more', mode);
    await page.waitForTimeout(50);
  }
  return pressAny(page, name, mode);
}
async function gameplay<T>(page: Page, scene: string, pred: (g: T) => boolean, what: string, ms = 20_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const g = d.gameplay as T | null;
    if (d.activeScenes.includes(scene) && g && pred(g)) return g;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(g)}`);
    await page.waitForTimeout(100);
  }
}
async function sceneOrDump(page: Page, key: string, ms = 20_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    if (d.activeScenes.length === 1 && d.activeScenes[0] === key && d.layout !== null) return;
    if (Date.now() - start > ms) throw new Error(`scene ${key} not reached: ${JSON.stringify({ scenes: d.activeScenes, gameplay: d.gameplay, hits: Object.keys(d.layout?.elements ?? {}) }).slice(0, 1500)}`);
    await page.waitForTimeout(100);
  }
}
async function onScreen(page: Page, names: string[]): Promise<void> {
  const d = await diagnostics(page);
  for (const n of names) {
    const r = d.layout!.elements[n];
    expect(r, n).toBeTruthy();
    expect(r!.width >= 44 && r!.height >= 44, `${n} is a readable touch target`).toBe(true);
  }
}
async function onArt(page: Page, names: string[]): Promise<void> {
  const d = await diagnostics(page);
  const art = d.layout!.elements.painting!;
  expect(Math.abs(art.width / art.height - 853 / 1844)).toBeLessThan(0.01);
  for (const n of names) {
    const r = d.layout!.elements[n];
    expectInside(n, r, d.layout!.viewport);
    expect(r!.x >= art.x - 1 && r!.y >= art.y - 1 && r!.x + r!.width <= art.x + art.width + 1 && r!.y + r!.height <= art.y + art.height + 1, `${n} is on the painting`).toBe(true);
  }
}

test('full-time Match Report, My Player, Match History reopen without changing the save', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message, e.stack?.slice(0, 600)));
  page.on('dialog', (d) => void d.accept('Alexandria-Rose Montgomery'));
  await page.goto('/?debug=1&dev&halfSeconds=8');
  await waitForScene(page, 'start');
  await pressElement(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await pressElement(page, 'pos-MID', mode);
  await gameplay<{ screen: string }>(page, 'career', (c) => c.screen === 'setup', 'setup');
  await pressElement(page, 'career-home', mode);
  await gameplay<{ screen: string }>(page, 'career', (c) => c.screen === 'home', 'home');
  await pressElement(page, 'nav-play', mode);
  await waitForScene(page, 'formation');
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
  const start = Date.now();
  for (;;) {
    const g = (await diagnostics(page)).gameplay as { breakPanel?: string | null };
    if (g?.breakPanel === 'fulltime') break;
    if (g?.breakPanel === 'halftime') await pressAny(page, 'second-half-button', mode).catch(() => undefined);
    if (Date.now() - start > 120_000) throw new Error('no full time');
    await page.waitForTimeout(200);
  }
  await pressAny(page, 'break-menu-button', mode);

  // The report opens after the match, from the saved record.
  await sceneOrDump(page, 'report');
  const r = await gameplay<Report>(page, 'report', (g) => g.status !== 'loading', 'report load');
  expect(r.status).toBe('ready');
  expect(r.next).toBe('start');
  const s = r.report!.stats;
  for (const x of [s.passes, s.shotsOnTarget, s.groundPasses]) {
    expect(x.num).toBeLessThanOrEqual(x.den);
    expect(x.pct).toBe(x.den === 0 ? null : Math.round((100 * x.num) / x.den));
  }
  expect(s.chips).toEqual({ num: 0, den: 0, pct: null });
  await onArt(page, ['report-continue', 'report-full-stats']);
  await pressAny(page, 'report-full-stats', mode);
  await gameplay<Report>(page, 'report', (g) => g.fullOpen, 'full stats open');
  await pressAny(page, 'report-continue', mode); // outside the panel: closes it, does not leave
  await gameplay<Report>(page, 'report', (g) => !g.fullOpen, 'full stats closed');
  await pressAny(page, 'report-continue', mode);
  await sceneOrDump(page, 'start');

  // My Player shows the saved player and the match in Match History.
  await pressElement(page, 'my-player-button', mode);
  await sceneOrDump(page, 'myPlayer');
  let p = await gameplay<MyPlayer>(page, 'myPlayer', (g) => g.status === 'ready', 'my player');
  expect(p.rows).toContain('Passing');
  expect(p.pages).toBeGreaterThan(1);
  await onScreen(page, ['my-player-back', 'my-player-attrs', 'my-player-history', 'my-player-rankings', 'my-player-review', 'my-player-team']);
  const week = p.week;
  await pressElement(page, 'my-player-attrs', mode);
  p = await gameplay<MyPlayer>(page, 'myPlayer', (g) => g.expanded === true, 'attributes expanded');
  await pressElement(page, 'my-player-page', mode);
  p = await gameplay<MyPlayer>(page, 'myPlayer', (g) => g.page === 1, 'page 2');
  expect(p.values).toContain('-');
  await pressElement(page, 'my-player-history', mode);
  p = await gameplay<MyPlayer>(page, 'myPlayer', (g) => g.view === 'history', 'history');
  expect(p.rows[0]).toMatch(/^Wk \d+ v /);
  await pressElement(page, 'my-player-row-0', mode);
  await sceneOrDump(page, 'report');
  const again = await gameplay<Report>(page, 'report', (g) => g.status === 'ready', 'reopened report');
  expect(again.next).toBe('history');
  expect(again.report).toEqual(r.report);
  await pressAny(page, 'report-continue', mode);
  await sceneOrDump(page, 'myPlayer');
  p = await gameplay<MyPlayer>(page, 'myPlayer', (g) => g.status === 'ready' && g.view === 'history', 'back in history');
  expect(p.rows.filter((x) => x.startsWith('Wk'))).toHaveLength(1);
  expect(p.week).toEqual(week);

  // Rotating keeps the hit areas on the painting.
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(400);
  await onScreen(page, ['my-player-back', 'my-player-row-0']);
  await page.setViewportSize(vp);
  await page.waitForTimeout(400);
  await pressElement(page, 'my-player-back', mode);
  await gameplay<MyPlayer>(page, 'myPlayer', (g) => g.view === 'player', 'player view');
  // Rankings returns to My Player (no story here, so Rankings shows its own no-career state).
  await pressElement(page, 'my-player-rankings', mode);
  await gameplay<{ status: string }>(page, 'rankings', (g) => g.status === 'no-career', 'rankings without a story');
  await pressAny(page, 'rank-back', mode);
  await gameplay<MyPlayer>(page, 'myPlayer', (g) => g.status === 'ready' && g.view === 'player', 'back from rankings');
  await pressElement(page, 'my-player-back', mode);
  await sceneOrDump(page, 'start');
  // Weekly review opens the saved weekly review, not Review & Lab.
  await pressAny(page, 'my-player-button', mode);
  await gameplay<MyPlayer>(page, 'myPlayer', (g) => g.status === 'ready', 'my player again');
  await pressElement(page, 'my-player-review', mode);
  await gameplay<{ screen: string; status: string }>(page, 'career', (g) => g.status !== 'loading' && g.screen === 'review', 'weekly review');
  expect(errors).toEqual([]);
});
