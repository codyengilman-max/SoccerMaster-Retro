import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 600_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

type TT = {
  screen: string; sessionId: string; role: string; look: string | null; status: string | null; round: number | null; phase: string | null;
  options: { id: string; good: boolean; quality: number }[]; attempts: number; activeSeconds: number; rejected: number;
  completion: { creditEligible: boolean; masteryGranted: boolean } | null; saved: string; pxPerMetre: number; sprite: string | null; squadSprites: string[]; bodyBottom: number; buttonsTop: number; titleBottom: number;
};
/** The panel rebuilds its buttons on the next frame after the phase changes; on a slow runner wait for the button to exist. */
async function pressReady(page: Page, name: string, mode: 'mouse' | 'touch'): Promise<void> {
  await expect.poll(async () => !!(await diagnostics(page)).layout?.elements[name], { timeout: 10_000 }).toBe(true);
  await pressElement(page, name, mode);
}
type Career = { screen: string; status: string; text: string };

async function tt(page: Page, pred: (t: TT) => boolean, what: string, ms = 60_000): Promise<TT> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const t = d.gameplay as TT | null;
    if (d.activeScenes.includes('tactical') && t && pred(t)) return t;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(t)}`);
    await page.waitForTimeout(50);
  }
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
async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const els = (await diagnostics(page)).layout?.elements ?? {};
    if (els[name] || !els.more) return pressElement(page, name, mode);
    await pressElement(page, 'more', mode);
    await page.waitForTimeout(50);
  }
  return pressElement(page, name, mode);
}

async function saveGender(page: Page, gender: 'boy' | 'girl'): Promise<void> {
  await page.evaluate(
    (g) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('smr-career', 1);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const st = r.result.transaction('career', 'readwrite').objectStore('career');
          const q = st.get('main');
          q.onsuccess = () => {
            const raw = q.result as unknown;
            const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
            v.player.gender = g;
            const w = st.put(typeof raw === 'string' ? JSON.stringify(v) : v, 'main');
            w.onsuccess = () => resolve();
            w.onerror = () => reject(w.error);
          };
        };
      }),
    gender,
  );
}

/** New career (girl, MID) through Career setup, then open the Team Training page. */
async function toTeamPage(page: Page, mode: 'touch' | 'mouse'): Promise<void> {
  page.on('dialog', (d) => void d.accept('Robin'));
  await page.goto('/?debug=1&dev&ttSpeed=8');
  await waitForScene(page, 'start');
  await press(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career(page, (c) => c.status !== 'loading', 'store');
  await press(page, 'pos-MID', mode);
  await career(page, (c) => c.screen === 'setup', 'setup');
  await press(page, 'career-home', mode);
  await career(page, (c) => c.screen === 'home', 'home');
  await press(page, 'nav-team', mode);
  await career(page, (c) => c.screen === 'team', 'team screen');
  await saveGender(page, 'girl');
}

test('team training v1.2: whole session on the overhead half, counted once, idle earns nothing', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  await toTeamPage(page, mode);
  await press(page, 'tt12-A', mode);
  await waitForScene(page, 'tactical');
  let t = await tt(page, (x) => x.screen === 'role', 'role choice');
  expect(t.sessionId).toBe('S1-W01-A');
  expect(t.look).toBe('girl');
  await pressElement(page, 'role-8', mode);
  t = await tt(page, (x) => x.screen === 'brief', 'brief');

  // Fixed framing: the whole half is on screen and nothing in the panel overlaps it.
  const d = await diagnostics(page);
  const els = d.layout!.elements;
  expectInside('half', els.half, d.layout!.viewport);
  for (const [name, rect] of Object.entries(els)) expectInside(name, rect, d.layout!.viewport);
  await page.screenshot({ path: info.outputPath(`tt12-brief-${info.project.name}.png`) });

  let shot = false;
  for (let round = 0; round < 3; round++) {
    await pressElement(page, 'tt-start', mode);
    for (;;) {
      t = await tt(page, (x) => x.screen === 'reflection' || (x.screen === 'play' && (x.phase === 'observe' || x.phase === 'explain')), `round ${round + 1} play`, 90_000);
      if (t.screen === 'reflection') break;
      if (t.phase === 'observe') {
        if (!t.options.length) continue;
        if (!shot) {
          expect(t.sprite).toBe('girl-training');
          console.log('squad sprites', [...new Set(t.squadSprites)].join(','));
          expect(t.squadSprites.length).toBeGreaterThan(0);
          expect(t.squadSprites.every((k) => k.startsWith('spr2:club-'))).toBe(true);
          expect(t.squadSprites, 'teammates in the Batavia training kit').toContain('spr2:club-batavia-training');
          expect(t.squadSprites.some((k) => k !== 'spr2:club-batavia-training'), 'opponents or keepers in another kit').toBe(true);
          expect(t.bodyBottom, 'coaching text stays above the buttons').toBeLessThanOrEqual(t.buttonsTop);
          expect(t.buttonsTop, 'buttons leave the title and a line of prompt visible').toBeGreaterThanOrEqual(t.titleBottom + 14);
          await page.screenshot({ path: info.outputPath(`tt12-decide-${info.project.name}.png`) });
          shot = true;
        }
        const best = [...t.options].sort((a, b) => b.quality - a.quality)[0]!;
        await pressReady(page, `opt-${best.id}`, mode);
        await tt(page, (x) => x.phase !== 'observe' || x.attempts > t.attempts, 'decision taken');
      } else {
        await pressReady(page, 'tt-next', mode);
        await tt(page, (x) => x.phase !== 'explain' || x.screen === 'reflection', 'next attempt');
      }
    }
    await pressElement(page, 'tt-continue', mode);
  }
  t = await tt(page, (x) => x.screen === 'done', 'session saved', 30_000);
  await page.screenshot({ path: info.outputPath(`tt12-done-${info.project.name}.png`) });
  expect(t.completion?.creditEligible).toBe(true);
  expect(t.completion?.masteryGranted).toBe(false);
  expect(t.rejected).toBe(0);
  expect(t.saved).toContain('Session A counted');
  await pressElement(page, 'tt-back', mode);
  const c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'team page');
  expect(c.text).toBeTruthy();
  expect((await diagnostics(page)).layout!.elements['tt12-A']).toBeTruthy();
  expect(errors).toEqual([]);
});

test('team training v1.2: rounds 1-2 wait for the player; pause blocks decisions; leaving needs two taps and counts nothing', async ({ page }, info) => {
  const mode = modeFor(info);
  await toTeamPage(page, mode);
  await press(page, 'tt12-B', mode);
  await waitForScene(page, 'tactical');
  await tt(page, (x) => x.screen === 'role', 'role');
  await pressElement(page, 'role-6', mode);
  await tt(page, (x) => x.screen === 'brief', 'brief');
  await pressElement(page, 'tt-start', mode);
  let t = await tt(page, (x) => x.phase === 'observe' && x.options.length > 0, 'decision moment');
  await page.waitForTimeout(3000);
  const idle = await tt(page, () => true, 'still waiting');
  expect(idle.phase).toBe('observe');
  expect(idle.attempts).toBe(t.attempts);
  await pressElement(page, 'tt-pause', mode);
  t = await tt(page, (x) => x.status === 'paused', 'paused');
  expect((await diagnostics(page)).layout!.elements[`opt-${idle.options[0]!.id}`]).toBeUndefined();
  // Rotate while paused: the run survives and the half stays fully visible.
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(400);
  const d = await diagnostics(page);
  expectInside('half', d.layout!.elements.half, d.layout!.viewport);
  expect((await tt(page, () => true, 'after rotate')).status).toBe('paused');
  await page.screenshot({ path: info.outputPath(`tt12-rotated-paused-${info.project.name}.png`) });
  await pressElement(page, 'tt-resume', mode);
  await tt(page, (x) => x.status === 'playing', 'resumed');
  await pressElement(page, 'tt-leave', mode);
  await tt(page, () => true, 'armed');
  await pressElement(page, 'tt-leave', mode);
  const c = await career(page, (x) => x.screen === 'team' && x.status !== 'loading', 'team page');
  expect(c.text).not.toContain('All three sessions counted');
  await page.setViewportSize(vp);
});

type Loop = Omit<TT, 'options'> & {
  stage: string | null; hinted: boolean; hintAvailable: boolean; replaying: boolean; choiceTagsVisible: number; coachPortrait: boolean;
  options: { id: string; letter: string; label: string; good: boolean; quality: number }[];
  header: { title: string; sub: string; objective: string | null }; decisions: { independent: number; assisted: number } | null;
  lastAttempt: { optionId: string | null; hinted: boolean; replay: boolean; good: boolean | null; goodIds: string[] } | null;
  textBottoms: { header: number; headerBottom: number };
};

test('team training: OBSERVE > DECIDE > PLAY > LEARN, hint is recorded as help, replay counts nothing', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  await toTeamPage(page, mode);
  await press(page, 'tt12-C', mode);
  await waitForScene(page, 'tactical');
  await tt(page, (x) => x.screen === 'role', 'role');
  await pressElement(page, 'role-8', mode);
  await tt(page, (x) => x.screen === 'brief', 'brief');
  await pressElement(page, 'tt-start', mode);
  const L = (p: (t: Loop) => boolean, what: string) => tt(page, (x) => p(x as unknown as Loop), what) as unknown as Promise<Loop>;
  let t = await L((x) => x.stage === 'OBSERVE', 'observe');
  expect(t.header.title).toBe('TEAM TRAINING');
  expect(t.header.sub).toContain('Week 1');
  expect(t.header.objective).toBeTruthy();
  expect(t.textBottoms.header).toBeLessThanOrEqual(t.textBottoms.headerBottom);
  await page.screenshot({ path: info.outputPath(`loop-1-observe-${info.project.name}.png`) });

  t = await L((x) => x.stage === 'DECIDE' && x.options.length > 0, 'decide');
  expect(t.options.length).toBeGreaterThanOrEqual(2);
  expect(t.options.length).toBeLessThanOrEqual(4);
  expect(t.options.map((o) => o.letter)).toEqual(['A', 'B', 'C', 'D'].slice(0, t.options.length));
  expect(t.choiceTagsVisible, 'one same-style tag per choice, nothing extra').toBe(t.options.length);
  expect(t.hinted).toBe(false);
  expect(t.coachPortrait).toBe(true);
  // Frozen: nothing moves while the player decides.
  const frozenAt = JSON.stringify((await diagnostics(page)).gameplay);
  await page.waitForTimeout(1200);
  const later = await L(() => true, 'still frozen');
  expect(later.activeSeconds).toBe(t.activeSeconds);
  expect(later.phase).toBe('observe');
  expect(frozenAt.length).toBeGreaterThan(0);
  const d = await diagnostics(page);
  const els = d.layout!.elements;
  for (const [name, rect] of Object.entries(els)) expectInside(name, rect, d.layout!.viewport);
  const half = els.half!;
  const panel = els.panel!;
  const overlap = half.x < panel.x + panel.width && panel.x < half.x + half.width && half.y < panel.y + panel.height && panel.y < half.y + half.height;
  expect(overlap, 'panel never covers the half').toBe(false);
  await page.screenshot({ path: info.outputPath(`loop-2-decide-${info.project.name}.png`) });

  await pressReady(page, 'tt-hint', mode);
  t = await L((x) => x.hinted, 'hint shown');
  await page.screenshot({ path: info.outputPath(`loop-2b-hint-${info.project.name}.png`) });
  const pick = [...t.options].sort((a, b) => b.quality - a.quality)[0]!;
  await pressReady(page, `opt-${pick.id}`, mode);
  t = await L((x) => x.stage === 'PLAY' || x.stage === 'LEARN', 'play');
  if (t.stage === 'PLAY') await page.screenshot({ path: info.outputPath(`loop-3-play-${info.project.name}.png`) });
  t = await L((x) => x.stage === 'LEARN', 'learn', );
  expect(t.lastAttempt?.optionId).toBe(pick.id);
  expect(t.lastAttempt?.hinted).toBe(true);
  expect(t.decisions).toEqual({ independent: 0, assisted: 1 });
  await page.screenshot({ path: info.outputPath(`loop-4-learn-${info.project.name}.png`) });

  const before = t.attempts;
  await pressReady(page, 'tt-replay', mode);
  t = await L((x) => x.replaying && x.stage === 'DECIDE' && x.options.length > 0, 'replay decision');
  await pressReady(page, `opt-${t.options[0]!.id}`, mode);
  t = await L((x) => x.stage === 'LEARN' && x.attempts > before, 'replay learn');
  expect(t.lastAttempt?.replay).toBe(true);
  expect(t.decisions, 'a replay is never evidence').toEqual({ independent: 0, assisted: 1 });
  await pressReady(page, 'tt-next', mode);
  t = await L((x) => x.stage === 'DECIDE' && x.options.length > 0, 'varied next attempt');
  expect(t.hinted).toBe(false);
  expect(t.replaying).toBe(false);
  expect(errors).toEqual([]);
});
