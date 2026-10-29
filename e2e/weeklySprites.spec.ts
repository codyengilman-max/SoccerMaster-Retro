import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { diagnostics, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 240_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

type V2 = readonly [number, number];
interface Ep { id: string; protagonist_id: string; camera_bounds_m: readonly [number, number, number, number]; actors: { id: string; team: 'H' | 'A'; role: string; position_m: V2 }[]; variants: { id: string; ball_owner: string | null; ball_position_m: V2; actor_overrides: Record<string, V2> }[] }
const EPISODES = JSON.parse(readFileSync(new URL('../docs/training/all36/package/episodes.json', import.meta.url), 'utf8')) as Ep[];
interface ArtActor { id: string; team: 'H' | 'A'; role: string; at: V2; sheet: string; frame: number; flip: boolean; action: string; drawn: string; feet: { x: number; y: number }; me: boolean }
interface Art { set: string; look: string; field: { x: number; y: number; width: number; height: number }; camera: readonly [number, number, number, number]; view: { s: number; ox: number; oy: number; head: number }; scale: number; bodyPx: number; actors: ArtActor[]; ball: { at: V2; x: number; y: number; size: number } | null; you: { x: number; y: number; width: number; height: number } | null }
interface Weekly { screen: string; assignment: { week: number; category: string; situationId: string; variant: string } | null; options: { id: string; grade: string }[]; verdict: unknown; bodyText: string; saved: string; progress: { completed: boolean; credited: boolean; best: string | null; runs: number } | null; buttonsTop: number | null; art: Art | null }

async function weekly(page: Page, pred: (w: Weekly) => boolean, what: string): Promise<Weekly> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const w = d.gameplay as Weekly | null;
    if (d.activeScenes.includes('weekly') && w && pred(w)) return w;
    if (Date.now() - start > 30_000) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(w)?.slice(0, 600)}`);
    await page.waitForTimeout(50);
  }
}
const allDrawn = (w: Weekly) => !!w.art && w.art.actors.length > 0 && w.art.actors.every((a) => a.drawn === 'sprite');

async function careerAt(page: Page, mode: 'touch' | 'mouse', pos: 'DEF' | 'MID' | 'FWD', gender: 'boy' | 'girl', week?: number): Promise<void> {
  const career = async (pred: (c: { screen: string; status: string }) => boolean) => {
    await expect.poll(async () => { const d = await diagnostics(page); const c = d.gameplay as { screen: string; status: string } | null; return d.activeScenes.includes('career') && !!c && pred(c); }, { timeout: 20_000 }).toBe(true);
  };
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressAny(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career((c) => c.status !== 'loading');
  await pressAny(page, `pos-${pos}`, mode);
  await career((c) => c.screen === 'setup');
  // The story's Boy/Girl choice is the only writer of gender; set it on the saved career the same way.
  await page.evaluate((g) => new Promise<void>((resolve, reject) => {
    const r = indexedDB.open('smr-career', 1);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const st = r.result.transaction('career', 'readwrite').objectStore('career');
      const q = st.get('main');
      q.onsuccess = () => {
        const raw = q.result as unknown;
        const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
        v.player.gender = g;
        const put = st.put(typeof raw === 'string' ? JSON.stringify(v) : v, 'main');
        put.onsuccess = () => resolve();
        put.onerror = () => reject(put.error);
      };
    };
  }), gender);
  if (week) await openWeek(page, week);
  else await page.goto('/?debug=1&dev');
  await openWeekly(page, mode);
}

/** Point the saved career at a story week (the Weekly screen reads only the week and position) and reload. */
async function openWeek(page: Page, week: number): Promise<void> {
  await page.evaluate((n) => new Promise<void>((resolve, reject) => {
    const r = indexedDB.open('smr-career', 1);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const st = r.result.transaction('career', 'readwrite').objectStore('career');
      const q = st.get('main');
      q.onsuccess = () => {
        const raw = q.result as unknown;
        const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
        v.week = n;
        const put = st.put(typeof raw === 'string' ? JSON.stringify(v) : v, 'main');
        put.onsuccess = () => resolve();
        put.onerror = () => reject(put.error);
      };
    };
  }), week);
  await page.goto('/?debug=1&dev');
}

async function openWeekly(page: Page, mode: 'touch' | 'mouse'): Promise<void> {
  const career = async (pred: (c: { screen: string; status: string }) => boolean) => {
    await expect.poll(async () => { const d = await diagnostics(page); const c = d.gameplay as { screen: string; status: string } | null; return d.activeScenes.includes('career') && !!c && pred(c); }, { timeout: 20_000 }).toBe(true);
  };
  await waitForScene(page, 'start');
  await pressAny(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await career((c) => c.status !== 'loading' && c.screen === 'home');
  await pressAny(page, 'nav-team', mode);
  await career((c) => c.screen === 'team' && c.status !== 'loading');
  await pressAny(page, 'tt-weekly', mode);
  await waitForScene(page, 'weekly');
}

/** Every sprite is the package art for the package actor, feet on that actor's exact approved coordinate. */
function checkArt(w: Weekly, gender: 'boy' | 'girl', buttons: Record<string, { x: number; y: number; width: number; height: number }> = {}): void {
  const art = w.art!;
  const e = EPISODES.find((x) => x.id === w.assignment!.situationId)!;
  const v = e.variants.find((x) => x.id === w.assignment!.variant)!;
  expect(art.set).toBe('team-training-v1');
  expect(art.look).toBe(gender);
  expect(art.actors.map((a) => a.id)).toEqual(e.actors.map((a) => a.id));
  const b = e.camera_bounds_m;
  // One uniform scale for the whole picture (tactical geometry unchanged), never larger than the plain fit; it only
  // shrinks to leave headroom for a body standing on the far edge, and the picture stays centred across the box.
  const { s, ox, oy } = art.view;
  expect(s).toBeLessThanOrEqual(Math.min(art.field.width / (b[2] - b[0]), art.field.height / (b[3] - b[1])) + 1e-9);
  expect(ox).toBeCloseTo(art.field.x + (art.field.width - (b[2] - b[0]) * s) / 2, 6);
  expect(oy).toBeGreaterThanOrEqual(art.field.y - 1e-6);
  expect(oy + (b[3] - b[1]) * s).toBeLessThanOrEqual(art.field.y + art.field.height + 1e-6);
  const screen = (p: V2) => ({ x: ox + (p[0] - b[0]) * s, y: oy + (b[3] - p[1]) * s });
  const sheets = new Set<string>();
  for (const a of art.actors) {
    const pa = e.actors.find((x) => x.id === a.id)!;
    expect(a.team).toBe(pa.team);
    expect(a.at).toEqual(v.actor_overrides[a.id] ?? pa.position_m);
    const want = screen(a.at);
    expect(a.feet.x).toBeCloseTo(want.x, 6);
    expect(a.feet.y).toBeCloseTo(want.y, 6);
    expect(a.feet.x).toBeGreaterThanOrEqual(art.field.x - 0.5);
    expect(a.feet.x).toBeLessThanOrEqual(art.field.x + art.field.width + 0.5);
    expect(a.feet.y).toBeGreaterThanOrEqual(art.field.y - 0.5);
    expect(a.feet.y).toBeLessThanOrEqual(art.field.y + art.field.height + 0.5);
    // The whole standing body is inside the pitch display and its clip (a keeper on the far goal line keeps its head).
    expect(a.feet.y - art.bodyPx, `${a.id} head`).toBeGreaterThanOrEqual(Math.max(art.field.y, oy - art.view.head) - 0.5);
    if (a.me) expect(a.sheet).toBe(gender);
    else if (pa.role === 'GK') expect(a.sheet).toBe(pa.team === 'H' ? 'keeper_home' : 'keeper_away');
    else expect(a.sheet).toMatch(pa.team === 'H' ? /^teammate_0[1-7]$/ : /^opponent_0[1-8]$/);
    expect(a.action).not.toBe('run');
    sheets.add(a.sheet);
  }
  expect(sheets.size).toBe(e.actors.length);
  expect(art.actors.filter((a) => a.me).map((a) => a.id)).toEqual([e.protagonist_id]);
  const ball = screen(v.ball_position_m);
  expect(art.ball!.x).toBeCloseTo(ball.x, 6);
  expect(art.ball!.y).toBeCloseTo(ball.y, 6);
  // The approved 1.2075x body target, applied once on top of the original training body (1.3 x placeholder).
  expect(art.bodyPx / (1.3 * Math.max(22, Math.min(34, s * 2.6)))).toBeCloseTo(1.2075, 6);
  const you = art.you!;
  expect(you.y).toBeGreaterThanOrEqual(art.field.y);
  expect(you.y + you.height).toBeLessThanOrEqual(art.field.y + art.field.height);
  // The label and the pitch never sit under an answer or action button.
  for (const [name, r] of Object.entries(buttons)) {
    if (!/^(opt-|tt-)/.test(name)) continue;
    const apart = (a: typeof r, c: typeof r) => a.x + a.width <= c.x || c.x + c.width <= a.x || a.y + a.height <= c.y || c.y + c.height <= a.y;
    expect(apart(you, r), `YOU vs ${name}`).toBe(true);
    expect(apart(art.field, r), `pitch vs ${name}`).toBe(true);
  }
}

test('Weekly Team Training: Week 1 FWD (D07 left winger) on package sprites; answer, credit and rotation unchanged', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  page.on('dialog', (d) => void d.accept('Robin'));
  await careerAt(page, mode, 'FWD', 'boy');
  let w = await weekly(page, (x) => x.screen === 'observe' && allDrawn(x), 'observe on sprites');
  expect(w.assignment).toMatchObject({ week: 1, category: 'FWD', situationId: 'D07', variant: 'base' });
  checkArt(w, 'boy', (await diagnostics(page)).layout!.elements);
  for (const sheet of ['boy', 'teammate_01', 'opponent_01', 'keeper_away']) expect(urls.some((u) => new RegExp(`/${sheet}[^/]*\\.webp`).test(u)), sheet).toBe(true);
  expect(urls.filter((u) => /jungle/i.test(u))).toEqual([]);
  await page.screenshot({ path: info.outputPath(`weekly-sprites-D07-observe-${info.project.name}.png`) });

  // Rotate mid-scenario: nothing resets; the picture re-lays out on the same approved coordinates.
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  w = await weekly(page, (x) => x.screen === 'observe' && allDrawn(x) && Math.abs(x.art!.field.width - w.art!.field.width) > 1, 'rotated observe');
  checkArt(w, 'boy', (await diagnostics(page)).layout!.elements);
  await page.screenshot({ path: info.outputPath(`weekly-sprites-D07-observe-rotated-${info.project.name}.png`) });
  await page.setViewportSize(vp);
  w = await weekly(page, (x) => x.screen === 'observe' && allDrawn(x) && Math.abs(x.art!.field.width - w.art!.field.width) > 1, 'back');

  const wrong = w.options.find((o) => o.grade === 'misread') ?? w.options.find((o) => o.grade !== 'preferred')!;
  await pressAny(page, `opt-${wrong.id}`, mode);
  w = await weekly(page, (x) => x.screen === 'result' && allDrawn(x), 'result');
  expect(w.bodyText).toMatch(/Coach classification: (wrong read|acceptable)/);
  expect(w.bodyText).toMatch(/Better option: [A-D]\. /);
  expect(w.progress).toMatchObject({ completed: true, credited: true, runs: 1 });
  checkArt(w, 'boy', (await diagnostics(page)).layout!.elements);
  await page.screenshot({ path: info.outputPath(`weekly-sprites-D07-result-${info.project.name}.png`) });
  const verdict = JSON.stringify(w.verdict);
  await page.setViewportSize({ width: vp.height, height: vp.width });
  w = await weekly(page, (x) => x.screen === 'result' && allDrawn(x) && JSON.stringify(x.verdict) === verdict, 'rotated result');
  checkArt(w, 'boy', (await diagnostics(page)).layout!.elements);
  expect(w.progress).toMatchObject({ completed: true, credited: true, runs: 1 });
  await page.screenshot({ path: info.outputPath(`weekly-sprites-D07-result-rotated-${info.project.name}.png`) });
  await page.setViewportSize(vp);
  // Replay: practice only, credit is not paid again.
  await pressAny(page, 'tt-replay', mode);
  w = await weekly(page, (x) => x.screen === 'observe' && allDrawn(x), 'replay');
  await pressAny(page, `opt-${w.options.find((o) => o.grade === 'preferred')!.id}`, mode);
  w = await weekly(page, (x) => x.screen === 'result', 'replay result');
  expect(w.saved).toMatch(/already counted/);
  expect(w.progress).toMatchObject({ credited: true, best: 'Elite', runs: 2 });
  expect(errors).toEqual([]);
});

for (const [pos, gender, id] of [['DEF', 'girl', 'D02'], ['MID', 'boy', 'D08'], ['FWD', 'girl', 'D07']] as const) {
  test(`Weekly Team Training: shared sprite renderer for ${pos} (${id}) with the ${gender}`, async ({ page }, info) => {
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Robin'));
    await careerAt(page, mode, pos, gender);
    const w = await weekly(page, (x) => x.screen === 'observe' && allDrawn(x), 'observe on sprites');
    expect(w.assignment).toMatchObject({ week: 1, category: pos, situationId: id });
    checkArt(w, gender, (await diagnostics(page)).layout!.elements);
    await page.screenshot({ path: info.outputPath(`weekly-sprites-${id}-${gender}-${info.project.name}.png`) });
    expect(errors).toEqual([]);
  });
}

// All 18 weeks per category (54 assignments, all 36 scenarios between them) through the same renderer.
for (const [pos, gender] of [['DEF', 'girl'], ['MID', 'boy'], ['FWD', 'girl']] as const) {
  test(`Weekly Team Training: all 18 ${pos} weeks render on package sprites at their approved coordinates (${gender})`, async ({ page }, info) => {
    test.setTimeout(360_000);
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Robin'));
    await careerAt(page, mode, pos, gender);
    const seen = new Set<string>();
    for (let week = 1; week <= 18; week++) {
      if (week > 1) {
        await openWeek(page, week);
        await openWeekly(page, mode);
      }
      const w = await weekly(page, (x) => x.screen === 'observe' && allDrawn(x), `${pos} week ${week}`);
      expect(w.assignment).toMatchObject({ week, category: pos });
      checkArt(w, gender, (await diagnostics(page)).layout!.elements);
      seen.add(w.assignment!.situationId);
      await page.screenshot({ path: info.outputPath(`weekly-all-${pos}-w${String(week).padStart(2, '0')}-${w.assignment!.situationId}.png`) });
    }
    expect(seen.size).toBe({ DEF: 13, MID: 11, FWD: 12 }[pos]);
    expect(errors).toEqual([]);
  });
}
