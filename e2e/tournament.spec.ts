import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

type Rect = { x: number; y: number; width: number; height: number };
type Gameplay = { tournament: string; review: boolean; sample: string; prize: string | null; board: { outcome: string; headline: string; groups: { rows: { name: string; points: number }[] }[] }; texts: Record<string, string> };
test.describe.configure({ timeout: 180_000 });
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

async function board(page: Page, sample: string, tournament = 'az_showcase'): Promise<Gameplay> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const g = d.gameplay as Gameplay | null;
    if (d.activeScenes.includes('tournament') && g?.sample === sample && g.tournament === tournament && d.layout?.elements.continue) return g;
    if (Date.now() - start > 15_000) throw new Error(`tournament ${tournament}/${sample} not shown: ${JSON.stringify(d.activeScenes)}`);
    await page.waitForTimeout(50);
  }
}

async function fits(page: Page): Promise<void> {
  const d = await diagnostics(page);
  const vp = d.layout!.viewport;
  const els = d.layout!.elements as Record<string, Rect>;
  for (const n of ['title', 'group-a', 'group-b', 'match-result', 'outcome', 'continue', 'text-group-a', 'text-group-b', 'text-match-result', 'text-outcome', 'text-outcome-head', 'text-title', 'text-continue', 'text-result-home', 'text-result-away']) expectInside(n, els[n], vp);
  const inside = (t: Rect, p: Rect) => t.x >= p.x - 1 && t.y >= p.y - 1 && t.x + t.width <= p.x + p.width + 1 && t.y + t.height <= p.y + p.height + 1;
  for (const t of ['match-result', 'result-home', 'result-hg', 'result-ag', 'result-away']) expect(inside(els[`text-${t}`]!, els['match-result']!), `${t} inside the result card`).toBe(true);
  for (const p of ['group-a', 'group-b', 'outcome']) expect(inside(els[`text-${p}`]!, els[p]!), `${p} text inside its panel`).toBe(true);
  expect(els.continue!.height).toBeGreaterThanOrEqual(36);
}

test('tournament results: real tournament state, every outcome, both orientations, rotation keeps the board', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await press(page, 'review-button', mode);
  await waitForScene(page, 'career');
  await press(page, 'hub-tournament', mode);

  let g = await board(page, 'pending');
  expect(g.review).toBe(true);
  expect(g.texts['match-result']).toBe('Group game 1');
  const bat = g.texts['result-home']!.includes('Batavia') ? ['result-hg', 'result-ag'] : ['result-ag', 'result-hg'];
  expect([g.texts[bat[0]!], g.texts[bat[1]!]]).toEqual(['2', '1']);
  expect(`${g.texts['result-home']} ${g.texts['result-away']}`).toContain('Batavia');
  expect(g.board.outcome).toBe('pending');
  expect(g.texts['outcome-head']).toBe('Group stage in progress');
  expect(g.texts.outcome).toContain('Next: Group game 2 vs ');
  expect(g.prize).toBeNull();
  expect(g.board.groups.flatMap((x) => x.rows).reduce((n, r) => n + r.points, 0)).toBeGreaterThan(0);
  await fits(page);
  await page.screenshot({ path: info.outputPath('pending.png') });

  const expectations: [string, string, string | null][] = [['champion', 'Champions', 'trophy'], ['runner_up', 'Runners-up', 'medal'], ['eliminated', 'Out at the group stage', null], ['in_final', 'Through to the final', null]];
  for (const [s, headline, prize] of expectations) {
    await press(page, `sample-${s}`, mode);
    g = await board(page, s);
    expect(g.texts['outcome-head']).toBe(headline);
    expect(g.prize).toBe(prize);
    await fits(page);
    await page.screenshot({ path: info.outputPath(`${s}.png`) });
  }
  expect(g.texts.outcome).toContain('Next: Final vs ');

  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(300);
  const turned = await board(page, 'in_final');
  expect(turned.texts).toEqual(g.texts);
  expect((await diagnostics(page)).layout!.orientation).toBe(vp.width > vp.height ? 'portrait' : 'landscape');
  await fits(page);
  await page.screenshot({ path: info.outputPath('rotated.png') });
  await page.setViewportSize(vp);
  await page.waitForTimeout(300);

  await press(page, 'sample-switch', mode);
  g = await board(page, 'in_final', 'holiday_classic');
  expect(g.texts.title).toBe('Holiday Classic');
  await fits(page);

  await press(page, 'continue', mode);
  await waitForScene(page, 'career');
  expect(errors).toEqual([]);
});
