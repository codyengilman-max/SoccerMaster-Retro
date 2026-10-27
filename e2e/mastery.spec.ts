import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, revealElement, trackConsoleErrors, waitForScene } from './helpers';

const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
async function pressElement(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  const d = await diagnostics(page);
  if (d.activeScenes.includes('myPlayer')) await revealElement(page, name);
  return pressAny(page, name, mode);
}

type Note = { id: string; kind: string; text: string } | null;
type MP = { status: string; view: string; homeNote: Note; homeLogs: number; bonus: { points: number } | null; mastery: { skill: string; phase: number; qualifying: number; best: number | null }[] };

async function mp(page: Page, pred: (g: MP) => boolean, what: string): Promise<MP> {
  const end = Date.now() + 20_000;
  for (;;) {
    const g = (await diagnostics(page)).gameplay as MP;
    if (g && pred(g)) return g;
    if (Date.now() > end) throw new Error(`timed out: ${what} ${JSON.stringify(g)}`);
    await page.waitForTimeout(150);
  }
}

test('Home Training mastery: log, Coach Code feedback, score check with correct and confirm, advance a phase', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  const answers: string[] = ['Kid'];
  page.on('dialog', (d) => void d.accept(answers.shift() ?? ''));
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await pressElement(page, 'pos-MID', mode);
  await page.waitForTimeout(400);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'my-player-button', mode);
  await waitForScene(page, 'myPlayer');
  await mp(page, (g) => g.status === 'ready', 'my player');
  await pressElement(page, 'my-player-mastery', mode);
  let g = await mp(page, (x) => x.view === 'mastery', 'mastery view');
  expect(g.mastery.map((m) => m.phase)).toEqual([1, 1, 1]);
  expect(g.bonus?.points).toBe(0);

  answers.push('3 4 2');
  await pressElement(page, 'home-log-juggling', mode);
  g = await mp(page, (x) => x.homeLogs === 1, 'first log');
  expect(g.homeNote?.kind).toBe('first');
  expect(g.mastery[0]).toMatchObject({ phase: 1, qualifying: 1, best: 4 });

  answers.push('1.5 2 3');
  await pressElement(page, 'home-log-juggling', mode);
  g = await mp(page, (x) => x.homeNote?.kind === 'error', 'malformed rejected');
  expect(g.homeLogs).toBe(1);

  answers.push('90 95 99');
  await pressElement(page, 'home-log-juggling', mode);
  g = await mp(page, (x) => x.homeLogs === 2 && x.homeNote?.kind === 'check', 'score check');
  answers.push('3 3 1');
  await pressElement(page, 'home-correct', mode);
  g = await mp(page, (x) => x.homeLogs === 2 && x.homeNote?.kind !== 'check' && x.homeNote?.kind !== 'error', 'corrected');
  expect(g.mastery[0]).toMatchObject({ phase: 2, qualifying: 0 });

  answers.push('10 10 10');
  await pressElement(page, 'home-log-passing', mode);
  g = await mp(page, (x) => x.homeLogs === 3, 'passing entry');
  if (g.homeNote?.kind === 'check') {
    await pressElement(page, 'home-confirm', mode);
    g = await mp(page, (x) => x.homeNote?.kind !== 'check', 'confirmed');
  }
  expect(g.homeLogs).toBe(3);

  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(400);
  await mp(page, (x) => x.view === 'mastery', 'rotated');
  await page.setViewportSize(vp);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'my-player-button', mode);
  await waitForScene(page, 'myPlayer');
  g = await mp(page, (x) => x.status === 'ready', 'reloaded');
  expect(g.homeLogs).toBe(3);
  expect(errors).toEqual([]);
});
