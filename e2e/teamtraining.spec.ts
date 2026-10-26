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
const total = (a: Record<string, number> | null) => Object.values(a ?? {}).reduce((x, y) => x + y, 0);

test('team training: the week is Sessions A-C only, no match route; leaving counts nothing; a session counts once', async ({ page }, info) => {
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
  const before = total(c.attributes);
  // Topic, short description and status for each session; no legacy match button or "normal controls" text.
  for (const slot of ['A', 'B', 'C']) expect(c.text).toMatch(new RegExp(`Session ${slot} · .+ · Not started`));
  expect(c.text).not.toMatch(/normal controls|30 seconds|Play Team Training/i);
  expect(c.text).toContain('Leaving early counts nothing');
  let d = await diagnostics(page);
  const names = Object.keys(d.layout!.elements);
  expect(names.filter((n) => n.startsWith('tt12-')).sort()).toEqual(['tt12-A', 'tt12-B', 'tt12-C']);
  expect(names).not.toContain('team-play');
  for (const [name, rect] of Object.entries(d.layout!.elements)) if (name !== 'body') expectInside(name, rect, d.layout!.viewport);
  await page.screenshot({ path: info.outputPath(`team-week-${info.project.name}.png`) });

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
  expect(c.text).toMatch(/Session A · .+ · Not started/);
  expect(total(c.attributes)).toBe(before);
  d = await diagnostics(page);
  expect(d.activeScenes).not.toContain('match');

  // Session A counts once; playing it again is practice only, and a reload keeps the result.
  expect(await playTacticalSession(page, 'A', mode)).toContain('Session A counted');
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'counted');
  expect(c.text).toMatch(/Session A · .+ · Completed/);
  expect(await playTacticalSession(page, 'A', mode)).toMatch(/already counted/);
  await page.reload();
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career(page, (x) => x.status !== 'loading' && x.screen === 'home', 'reloaded');
  await press(page, 'nav-team', mode);
  c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'team after reload');
  expect(c.text).toMatch(/Session A · .+ · Completed/);
  expect(c.text).toMatch(/Session B · .+ · Not started/);
  expect(errors).toEqual([]);
});
