import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

// Cross-feature flow on one isolated (per-test browser context) save:
// create player -> home training credit -> career match with Coach Moments -> evidence -> reload -> week review -> reload.
// Story/cutscene, identity and story consequences are covered by e2e/story.spec.ts on the same flow.

type Career = { screen: string; week: number; credit: number; journal: number; player: string | null; attributes: Record<string, number> | null; status: string; evidence: number; coachEvidence: number };
type Match = { career: { slot: string } | null; coach: { overlay: string; entries: { selectedOptionId: string | null }[] } | null };

test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

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
async function until<T>(page: Page, scene: string, pred: (g: T) => boolean, what: string, ms = 15_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const g = d.gameplay as T | null;
    if (d.activeScenes[0] === scene && g && pred(g)) return g;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${d.activeScenes.join(',')} ${JSON.stringify(g)}`);
    await page.waitForTimeout(50);
  }
}
const URL = '/?debug=1&coach&coachSeconds=40';
async function openCareer(page: Page, mode: 'touch' | 'mouse'): Promise<Career> {
  await page.goto(URL);
  await waitForScene(page, 'start');
  await pressElement(page, 'career-button', mode);
  await waitForScene(page, 'career');
  return until<Career>(page, 'career', (c) => c.status !== 'loading', 'store');
}

test('connected flow: create player, training credit, career match with Coach Moments, evidence, reload, week review', async ({ page }, info) => {
  test.info().annotations.push({ type: 'not covered', description: 'story/cutscene and story consequences: covered by e2e/story.spec.ts' });
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Ana'));

  // Create player.
  let c = await openCareer(page, mode);
  expect(c.screen).toBe('create');
  await pressElement(page, 'pos-MID', mode);
  c = await until<Career>(page, 'career', (x) => x.screen === 'setup', 'setup');
  expect(c.player).toBe('Ana');
  const startAttrs = c.attributes;

  // Training: one scheduled session gives exactly one credit.
  await pressElement(page, 'career-home', mode);
  await until<Career>(page, 'career', (x) => x.screen === 'home', 'home');
  await pressElement(page, 'nav-focus', mode);
  await until<Career>(page, 'career', (x) => x.screen === 'focus', 'focus');
  await pressElement(page, 'focus-ft-cushion', mode);
  await until<Career>(page, 'career', (x) => x.screen === 'sessions', 'sessions');
  await pressElement(page, 'open-w1-s1-0', mode);
  await until<Career>(page, 'career', (x) => x.screen === 'activity', 'activity');
  await pressElement(page, 'log-open', mode);
  await until<Career>(page, 'career', (x) => x.screen === 'log', 'log');
  await pressElement(page, 'r-comfortable', mode);
  await pressElement(page, 'log-complete', mode);
  await pressElement(page, 'log-complete', mode).catch(() => undefined);
  c = await until<Career>(page, 'career', (x) => x.screen === 'sessions' && x.credit === 1, 'credit');
  await page.waitForTimeout(300);
  c = (await diagnostics(page)).gameplay as Career;
  expect(c).toMatchObject({ credit: 1, journal: 1, evidence: 0 });

  // Career match with Coach Moments.
  await pressElement(page, 'career-home', mode);
  await until<Career>(page, 'career', (x) => x.screen === 'home', 'home');
  await pressElement(page, 'nav-play', mode);
  await waitForScene(page, 'formation');
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
  await until<Match>(page, 'match', (m) => m.career?.slot === 'H5' && m.coach !== null, 'career slot and coach');
  let answered = 0;
  for (;;) {
    const m = await until<Match>(page, 'match', (x) => x.coach!.overlay === 'question' || x.coach!.overlay === 'summary', 'moment or summary', 90_000);
    if (m.coach!.overlay === 'summary') break;
    await page.waitForTimeout(400);
    await pressAny(page, 'coach-option-0', mode);
    await until<Match>(page, 'match', (x) => x.coach!.overlay !== 'question', 'feedback');
    answered++;
    const fb = (await diagnostics(page)).gameplay as Match;
    if (fb.coach!.overlay === 'feedback') {
      await page.waitForTimeout(400);
      await pressAny(page, 'coach-continue', mode);
      await until<Match>(page, 'match', (x) => x.coach!.overlay !== 'feedback', 'resume');
    }
  }
  const end = (await diagnostics(page)).gameplay as Match;
  expect(end.coach!.entries.filter((e) => e.selectedOptionId !== null).length).toBe(answered);
  expect(answered).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(1100);
  await pressAny(page, 'coach-menu', mode);
  await waitForScene(page, 'start');
  await page.waitForTimeout(1000);

  // Reload: training credit, journal, match evidence and Coach answers persist; no extra credit.
  c = await openCareer(page, mode);
  expect(c).toMatchObject({ screen: 'home', player: 'Ana', credit: 1, journal: 1, week: 1, coachEvidence: answered });
  expect(c.evidence).toBeGreaterThan(answered);

  // Week review turns evidence into growth; home practice alone never raises attributes.
  await pressElement(page, 'nav-review', mode);
  await until<Career>(page, 'career', (x) => x.screen === 'review', 'review');
  await pressElement(page, 'end-week', mode);
  c = await until<Career>(page, 'career', (x) => x.week === 2, 'week 2');
  expect(c).toMatchObject({ credit: 0, evidence: 0, journal: 1 });
  const grown = c.attributes;
  expect(Object.keys(grown!)).toEqual(Object.keys(startAttrs!));

  // Reload again: the reviewed week persists.
  c = await openCareer(page, mode);
  expect(c).toMatchObject({ week: 2, credit: 0, journal: 1, player: 'Ana', evidence: 0 });
  expect(c.attributes).toEqual(grown);
  expect(errors).toEqual([]);
});
