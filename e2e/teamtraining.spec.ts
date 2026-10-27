import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, playTacticalSession, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 600_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

type Career = { screen: string; week: number; attributes: Record<string, number> | null; status: string; toast: string; text: string };

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
interface Weekly { screen: string; assignment: { week: number; category: string; variant: string } | null; options: { id: string; grade: string }[]; bodyText: string; saved: string; progress: { completed: boolean; credited: boolean; best: string | null; runs: number } | null }
async function weekly(page: Page, pred: (w: Weekly) => boolean, what: string): Promise<Weekly> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const w = d.gameplay as Weekly | null;
    if (d.activeScenes.includes('weekly') && w && pred(w)) return w;
    if (Date.now() - start > 20_000) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(w)}`);
    await page.waitForTimeout(50);
  }
}
const total = (a: Record<string, number> | null) => Object.values(a ?? {}).reduce((x, y) => x + y, 0);

test('team training: one approved All36 scenario a week counts once (any answer), replays are practice; proposals never count', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Robin'));
  await page.goto('/?debug=1&dev&ttSpeed=8');
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
  // Current release: one coach-approved All36 scenario this week; no Sessions A-C, no empty slots, no legacy match route.
  expect(c.text).toMatch(/Scenario: .+ \(D\d\d\)/);
  expect(c.text).toMatch(/Tactical topic: .+/);
  expect(c.text).toMatch(/Your role: (Left winger|Right winger|Striker)/);
  expect(c.text).toContain('Status: Not started');
  expect(c.text).toContain('Earned credit: none yet');
  expect(c.text).not.toMatch(/Session [ABC]|Not Applicable|normal controls|30 seconds|Play Team Training/i);
  let d = await diagnostics(page);
  const names = Object.keys(d.layout!.elements);
  expect(names.filter((n) => n.startsWith('tt12-'))).toEqual([]);
  expect(names).toContain('tt-weekly');
  expect(names).not.toContain('team-play');
  for (const [name, rect] of Object.entries(d.layout!.elements)) if (name !== 'body') expectInside(name, rect, d.layout!.viewport);
  await page.screenshot({ path: info.outputPath(`team-week-${info.project.name}.png`) });

  // Play it with the wrong read: the week still completes and counts once; the result explains the better option.
  await press(page, 'tt-weekly', mode);
  await waitForScene(page, 'weekly');
  let wv = await weekly(page, (x) => x.screen === 'observe' && x.options.length === 4, 'observe');
  expect(wv.assignment).toMatchObject({ week: 1, category: 'FWD', variant: 'base' });
  for (const [name, rect] of Object.entries((await diagnostics(page)).layout!.elements)) if (name !== 'body') expectInside(name, rect, (await diagnostics(page)).layout!.viewport);
  // The cues are fully readable above the answer buttons.
  const ob = (await diagnostics(page)).gameplay as { bodyBottom: number; buttonsTop: number };
  expect(ob.bodyBottom).toBeLessThanOrEqual(ob.buttonsTop);
  await page.screenshot({ path: info.outputPath(`team-weekly-observe-${info.project.name}.png`) });
  const wrong = wv.options.find((o) => o.grade === 'misread') ?? wv.options.find((o) => o.grade !== 'preferred')!;
  await pressAny(page, `opt-${wrong.id}`, mode);
  wv = await weekly(page, (x) => x.screen === 'result', 'result');
  expect(wv.bodyText).toMatch(/Coach classification: (wrong read|acceptable)/);
  expect(wv.bodyText).toMatch(/Better option: [A-D]\. /);
  expect(wv.progress).toMatchObject({ completed: true, credited: true });
  await page.screenshot({ path: info.outputPath(`team-weekly-result-${info.project.name}.png`) });
  // Replay with the best answer: practice only, the best mastery rises, credit is not paid again.
  await pressAny(page, 'tt-replay', mode);
  wv = await weekly(page, (x) => x.screen === 'observe' && x.options.length === 4, 'replay observe');
  await pressAny(page, `opt-${wv.options.find((o) => o.grade === 'preferred')!.id}`, mode);
  wv = await weekly(page, (x) => x.screen === 'result', 'replay result');
  expect(wv.saved).toMatch(/already counted/);
  expect(wv.progress).toMatchObject({ credited: true, best: 'Elite', runs: 2 });
  await pressAny(page, 'tt-done', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'team after weekly');
  expect(c.text).toContain('Status: Complete');
  expect(c.text).toContain('Best mastery: Elite');
  const counted = total(c.attributes);
  // Reload: still complete, counted once.
  await page.reload();
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career(page, (x) => x.status !== 'loading' && x.screen === 'home', 'reloaded');
  await press(page, 'nav-team', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'team after reload');
  expect(c.text).toContain('Status: Complete');
  expect(total(c.attributes)).toBe(counted);

  // Review build: the unapproved proposals can be played for review, and they are never counted. This week was
  // already counted by the weekly scenario above, so every proposal session is practice only.
  await page.goto('/?debug=1&dev&ttSpeed=8&ttProposals');
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career(page, (x) => x.status !== 'loading' && x.screen === 'home', 'proposal review');
  await press(page, 'nav-team', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'team screen (proposals)');
  for (const slot of ['A', 'B', 'C']) expect(c.text).toMatch(new RegExp(`Session ${slot} · .+ · Week already counted · practice only`));

  // Leave during the first session: two taps, nothing recorded.
  await press(page, 'tt12-A', mode);
  await waitForScene(page, 'tactical');
  await expect.poll(async () => Object.keys((await diagnostics(page)).layout?.elements ?? {}).some((k) => k.startsWith('role-')), { timeout: 30_000 }).toBe(true);
  const role = Object.keys((await diagnostics(page)).layout!.elements).find((k) => k.startsWith('role-') && !k.endsWith('GK'))!;
  await pressAny(page, role, mode);
  await pressAny(page, 'tt-start', mode);
  await expect.poll(async () => ((await diagnostics(page)).gameplay as { screen?: string } | null)?.screen, { timeout: 30_000 }).toBe('play');
  // Mid-session, the first tap only arms Leave; the second leaves and nothing is recorded.
  await pressAny(page, 'tt-leave', mode);
  expect((await diagnostics(page)).activeScenes).toContain('tactical');
  await pressAny(page, 'tt-leave', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'back on team screen');
  expect(c.text).toMatch(/Session A · .+ · Week already counted · practice only/);
  expect(total(c.attributes)).toBe(counted);
  d = await diagnostics(page);
  expect(d.activeScenes).not.toContain('match');

  // A finished proposal session is saved as practice only: no completion, no attribute change, and a reload agrees.
  expect(await playTacticalSession(page, 'A', mode)).toMatch(/never counted/);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'not counted');
  expect(c.text).toMatch(/Session A · .+ · Week already counted · practice only/);
  expect(total(c.attributes)).toBe(counted);
  await page.reload();
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career(page, (x) => x.status !== 'loading' && x.screen === 'home', 'reloaded');
  await press(page, 'nav-team', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'team after reload');
  expect(c.text).toMatch(/Session A · .+ · Week already counted · practice only/);
  expect(total(c.attributes)).toBe(counted);
  expect(errors).toEqual([]);
});
