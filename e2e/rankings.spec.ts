import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement, trackConsoleErrors, waitForScene } from './helpers';

type Rk = { status: string; sample: boolean; view: string; scope: string; stateFilter: string; statePicker: boolean; query: string; team: string; visible: { team: string; rank: number }[]; published: number | null; provisional: boolean | null };
test.describe.configure({ timeout: 120_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

async function rk(page: Page, pred: (r: Rk) => boolean, what: string): Promise<Rk> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const r = d.gameplay as Rk | null;
    if (d.activeScenes.includes('rankings') && r && pred(r)) return r;
    if (Date.now() - start > 15_000) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(r)}`);
    await page.waitForTimeout(50);
  }
}
async function fits(page: Page): Promise<void> {
  const d = await diagnostics(page);
  for (const [name, rect] of Object.entries(d.layout!.elements)) expectInside(name, rect, d.layout!.viewport);
  for (const n of ['rank-back', 'tab-national', 'tab-state', 'tab-league']) if (d.layout!.elements[n]) expect(d.layout!.elements[n]!.height, n).toBeGreaterThanOrEqual(44);
}

test('rankings: national/state/search/profile/league on the review sample, upright and sideways', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'review-button', mode);
  await waitForScene(page, 'career');
  for (let i = 0; i < 8 && !(await diagnostics(page)).layout?.elements['hub-rankings']; i++) {
    if (!(await diagnostics(page)).layout?.elements.more) break;
    await pressElement(page, 'more', mode);
    await page.waitForTimeout(50);
  }
  await pressElement(page, 'hub-rankings', mode);
  let r = await rk(page, (x) => x.status === 'ready', 'ready');
  expect(r.sample).toBe(true);
  expect(r.published).toBe(7);
  expect(r.visible.some((v) => v.team === 'batavia')).toBe(true);
  await fits(page);
  await page.screenshot({ path: `test-results/rankings-national-${info.project.name}.png` });

  await pressElement(page, 'rank-top25', mode);
  r = await rk(page, (x) => x.visible[0]?.rank === 1, 'top');
  const ranks = r.visible.map((v) => v.rank);
  expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);

  await pressElement(page, 'tab-state', mode);
  r = await rk(page, (x) => x.scope === 'AZ' && x.visible.some((v) => v.team === 'batavia'), 'state around me');
  await pressElement(page, 'rank-top25', mode);
  r = await rk(page, (x) => x.scope === 'AZ' && x.visible[0]?.rank === 1, 'state top');
  await fits(page);
  await page.screenshot({ path: `test-results/rankings-state-${info.project.name}.png` });

  // State filter: a second tap on the state tab opens the picker; any of the 50 states can be chosen.
  await pressElement(page, 'tab-state', mode);
  r = await rk(page, (x) => x.statePicker, 'state picker');
  expect(await page.locator('[data-testid="rank-state"] option').count()).toBe(50);
  await page.locator('[data-testid="rank-state"]').selectOption('CA');
  r = await rk(page, (x) => x.scope === 'CA' && !x.statePicker && x.visible.length > 0, 'California list');
  await fits(page);
  // Find My Team from another state's list goes back to Batavia's own state, centred on Batavia.
  await pressElement(page, 'rank-around', mode);
  await rk(page, (x) => x.scope === 'AZ' && x.stateFilter === 'AZ' && x.visible.some((v) => v.team === 'batavia'), 'find my team from California');

  await pressElement(page, 'tab-national', mode);
  await pressElement(page, 'rank-top25', mode);
  r = await rk(page, (x) => x.scope === 'national' && x.visible[0]?.rank === 1, 'national top');
  const per = r.visible.length;
  await pressElement(page, 'rank-next', mode);
  r = await rk(page, (x) => x.visible[0]?.rank === per + 1 || (x.visible[0]?.rank ?? 0) > 1, 'page 2');
  await pressElement(page, 'rank-around', mode);
  r = await rk(page, (x) => x.visible.some((v) => v.team === 'batavia'), 'find my team');
  await pressElement(page, 'rank-search-btn', mode);
  await page.locator('[data-testid="rank-search"]').fill('Batavia FC');
  r = await rk(page, (x) => x.query === 'Batavia FC' && x.visible.length > 0, 'alias search');
  expect(r.visible.map((v) => v.team)).toEqual(['batavia']);
  await page.locator('[data-testid="rank-search"]').fill('');
  await pressElement(page, 'rank-search-btn', mode);
  await pressElement(page, 'rank-search-btn', mode);
  await page.locator('[data-testid="rank-search"]').fill('Royal');
  r = await rk(page, (x) => x.query === 'Royal' && x.visible.length > 0, 'search');
  const before = r.visible.find((v) => v.team === 'royal_salt')!;
  await page.locator('[data-testid="rank-search"]').fill('');
  await pressElement(page, 'rank-search-btn', mode);
  await pressElement(page, 'rank-top25', mode);
  for (let i = 0; i < 20; i++) {
    r = await rk(page, () => true, 'page');
    const hit = r.visible.find((v) => v.team === 'royal_salt');
    if (hit) {
      expect(hit.rank).toBe(before.rank);
      break;
    }
    await pressElement(page, 'rank-next', mode);
  }

  await pressElement(page, 'rank-my-team', mode);
  r = await rk(page, (x) => x.view === 'profile' && x.team === 'batavia', 'profile');
  await fits(page);
  await page.screenshot({ path: `test-results/rankings-profile-${info.project.name}.png` });
  await pressElement(page, 'rank-back', mode);
  await rk(page, (x) => x.view === 'rankings', 'back to list');

  await pressElement(page, 'tab-league', mode);
  await rk(page, (x) => x.view === 'standings', 'standings');
  await fits(page);
  await page.screenshot({ path: `test-results/rankings-league-${info.project.name}.png` });
  await pressElement(page, 'rank-back', mode);
  await waitForScene(page, 'career');
  expect(errors).toEqual([]);
});

test('rankings: a new career starts Batavia 67th in Arizona on seeded ratings, upright and sideways', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Kai'));
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'story-button', mode);
  await waitForScene(page, 'story');
  await pressElement(page, 'story-menu', mode);
  await waitForScene(page, 'start');
  await pressElement(page, 'my-player-button', mode);
  await waitForScene(page, 'myPlayer');
  for (let i = 0; i < 10 && !(await diagnostics(page)).layout?.elements['my-player-rankings']; i++) await page.waitForTimeout(100);
  await pressElement(page, 'my-player-rankings', mode);
  let r = await rk(page, (x) => x.status === 'ready', 'ready');
  expect(r.sample).toBe(false);
  expect(r.published).toBe(0);
  const nat = r.visible.find((v) => v.team === 'batavia')!;
  expect(nat.rank).toBeGreaterThan(67);
  await fits(page);
  await page.screenshot({ path: `test-results/rankings-new-career-national-${info.project.name}.png` });
  await pressElement(page, 'tab-state', mode);
  r = await rk(page, (x) => x.scope === 'AZ' && x.visible.some((v) => v.team === 'batavia'), 'Arizona');
  expect(r.visible.find((v) => v.team === 'batavia')!.rank).toBe(67);
  await fits(page);
  await page.screenshot({ path: `test-results/rankings-new-career-arizona-${info.project.name}.png` });
  await pressElement(page, 'rank-my-team', mode);
  r = await rk(page, (x) => x.view === 'profile' && x.team === 'batavia', 'profile');
  await fits(page);
  await page.screenshot({ path: `test-results/rankings-new-career-profile-${info.project.name}.png` });
  expect(errors).toEqual([]);
});
