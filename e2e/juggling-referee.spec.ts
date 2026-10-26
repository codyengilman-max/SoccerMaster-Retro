import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement, trackConsoleErrors, waitForScene, type PointerMode } from './helpers';
import type { MatchReport } from '../src/scenes/matchReport';

test.describe.configure({ timeout: 240_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as PointerMode;
type Rect = { x: number; y: number; width: number; height: number };
type Sheet = { sex: string; index: number; dx: number; ballR: number; miss: boolean; speed: number };
type Demo = { set: string; frame: string; contact: string; scale: { x: number; y: number }; player: Rect; ball: { x: number; y: number }; rect: Rect; sheet?: Sheet };
type Career = { screen: string; credit: number; journal: number; player: string | null; status: string; demo: Demo | null };

const career = async (page: Page) => (await diagnostics(page)).gameplay as Career;
const inside = (p: { x: number; y: number }, r: Rect, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.width + pad && p.y >= r.y - pad && p.y <= r.y + r.height + pad;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
async function until<T>(read: () => Promise<T | null>, pred: (c: T) => boolean, what: string, ms = 15_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const c = await read().catch(() => null);
    if (c && pred(c)) return c;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(c)?.slice(0, 600)}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}
async function press(page: Page, name: string, mode: PointerMode): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const els = (await diagnostics(page)).layout?.elements ?? {};
    if (els[name] || !els.more) return pressElement(page, name, mode);
    await pressElement(page, 'more', mode);
    await page.waitForTimeout(60);
  }
  return pressElement(page, name, mode);
}
async function openCareer(page: Page, mode: PointerMode): Promise<Career> {
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressElement(page, 'career-button', mode);
  await waitForScene(page, 'career');
  return until(() => career(page), (c) => c.status !== 'loading', 'store');
}
/** Same write as homedemo.spec: the story's Boy/Girl choice is the only gender writer in the game. */
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
    gender
  );
}

for (const gender of ['boy', 'girl'] as const)
  test(`juggling pack: the saved ${gender} juggles on the prepared sheet, touch/catch aligned, slow and miss/reset, portrait and landscape`, async ({ page }, info) => {
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Alex'));
    await openCareer(page, mode);
    await press(page, 'pos-MID', mode);
    await until(() => career(page), (x) => x.player === 'Alex', 'player');
    await saveGender(page, gender);
    const c0 = await openCareer(page, mode);
    const before = { credit: c0.credit, journal: c0.journal };
    await press(page, 'nav-library', mode);
    await until(() => career(page), (x) => x.screen === 'library', 'library');
    await press(page, 'lib-juggling', mode);
    await page.waitForTimeout(80);
    await press(page, 'act-jg-3', mode);
    const d = (await until(() => career(page), (x) => x.screen === 'activity' && !!x.demo?.sheet, 'sheet demo')).demo!;
    expect(d.set).toBe(`jug1:${gender}`);
    expect(d.sheet!.sex).toBe(gender);
    const vp = info.project.use.viewport!;
    for (const size of [vp, { width: vp.height, height: vp.width }]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      const seen = { laces: 0, bounce: 0, catch: 0 };
      const frames = new Set<number>();
      let scale: number | null = null;
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        const x = (await career(page)).demo!;
        frames.add(x.sheet!.index);
        expect(x.set).toBe(`jug1:${gender}`);
        expect(x.scale.x, 'not stretched').toBeCloseTo(x.scale.y, 5);
        scale ??= x.scale.x;
        expect(x.scale.x, 'stable scale').toBeCloseTo(scale, 5);
        expect(inside({ x: x.player.x + x.player.width / 2, y: x.player.y + x.player.height }, x.rect), 'feet in frame').toBe(true);
        expect(inside(x.ball, x.rect), 'ball in frame').toBe(true);
        if (x.contact === 'laces' || x.contact === 'catch') {
          // The separate ball sits on the body art at contact (boot or hands), not floating beside it.
          expect(inside(x.ball, x.player, x.sheet!.ballR), `${x.contact} ball on the body (frame ${x.sheet!.index})`).toBe(true);
          seen[x.contact]++;
        }
        if (x.contact === 'bounce') {
          expect(x.ball.y, 'bounce at the boots').toBeGreaterThan(x.player.y + x.player.height * 0.8);
          seen.bounce++;
        }
        await page.waitForTimeout(15);
      }
      expect(seen.catch, 'catch seen').toBeGreaterThan(0);
      expect(frames.has(12), 'bounce wait frame seen').toBe(true);
      expect(frames.size, 'action frames, not the whole sheet').toBeLessThan(24);
      await page.screenshot({ path: `test-results/juggle-${gender}-jg3-${size.width}x${size.height}.png` });
    }
    await page.setViewportSize(vp);
    await press(page, 'demo-slow', mode);
    await until(() => career(page), (x) => x.demo?.sheet?.speed === 0.4, 'slow');
    let touches = 0;
    const t1 = Date.now();
    while (Date.now() - t1 < 14_000 && touches < 2) {
      const x = (await career(page)).demo!;
      if (x.contact === 'laces') {
        expect(inside(x.ball, x.player, x.sheet!.ballR)).toBe(true);
        touches++;
        await page.screenshot({ path: `test-results/juggle-${gender}-touch-slow.png` });
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(10);
    }
    expect(touches, 'touch seen at slow speed').toBeGreaterThan(0);
    await press(page, 'demo-slow', mode);
    await press(page, 'demo-miss', mode);
    const miss = await until(() => career(page), (x) => !!x.demo?.sheet?.miss && x.demo.sheet.index >= 18 && x.demo.sheet.index <= 22, 'miss/retrieve frames', 12_000);
    expect(inside(miss.demo!.ball, miss.demo!.rect)).toBe(true);
    await page.screenshot({ path: `test-results/juggle-${gender}-miss.png` });
    await until(() => career(page), (x) => x.demo?.sheet?.index === 22, 'reset (stand)', 12_000);
    const c1 = await career(page);
    expect({ credit: c1.credit, journal: c1.journal }, 'watching awards nothing').toEqual(before);
    expect(errors).toEqual([]);
  });

const report = async (page: Page) => (await diagnostics(page)).gameplay as MatchReport;
async function openSandbox(page: Page, mode: PointerMode, setup: string): Promise<void> {
  await page.goto(`/?debug=1&dev&setup=${setup}`);
  await waitForScene(page, 'start');
  await pressElement(page, 'sandbox-button', mode);
  await waitForScene(page, 'formation');
  await pressElement(page, 'pick-1-3-2-3', mode);
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
}
async function checkPlacement(page: Page): Promise<void> {
  const d = await diagnostics(page);
  const r = d.gameplay as MatchReport;
  const pop = r.offsidePopup!;
  const vp = page.viewportSize()!;
  expect(pop.visible).toBe(true);
  for (const [n, b] of [['referee', pop.bounds!], ['caption', pop.caption!]] as const) {
    expect(b.x >= 0 && b.y >= 0 && b.x + b.width <= vp.width && b.y + b.height <= vp.height, `${n} on screen ${JSON.stringify(b)} in ${vp.width}x${vp.height}`).toBe(true);
    for (const [k, e] of Object.entries(d.layout?.elements ?? {})) if (k !== 'offside-referee' && k !== 'pitch' && e) expect(overlaps(b, e), `${n} clear of ${k}`).toBe(false);
  }
}

test('offside referee: a confirmed call shows the popup once, above play and clear of every control; the restart and score are unchanged', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  await openSandbox(page, mode, 'offside&deadBall=4');
  const r = await until(() => report(page), (x) => !!x.offsidePopup?.visible && (x.offsidePopup.alpha ?? 0) >= 1, 'offside popup');
  expect(r.stoppage).toMatchObject({ reason: 'offside', restart: 'indirectFreeKick', restartTeam: 'away' });
  expect(r.offsidePopup!.shown).toBe(1);
  const score = { ...r.score };
  await checkPlacement(page);
  // The call stands for the 1.2 s dead-ball pause, so rotate straight away: it re-lays out for the new size.
  const vp = info.project.use.viewport!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await until(
    async () => ({ r: await report(page), w: await page.evaluate(() => innerWidth) }),
    ({ r: x, w }) => w === vp.height && !!x.offsidePopup?.bounds && x.offsidePopup.bounds.x + x.offsidePopup.bounds.width <= vp.height && x.offsidePopup.bounds.y + x.offsidePopup.bounds.height <= vp.width,
    'popup re-laid out after rotate',
    1500,
  );
  await checkPlacement(page);
  await page.screenshot({ path: `test-results/offside-referee-${info.project.name}-rotated.png` });
  const after = await until(() => report(page), (x) => x.phase === 'live', 'free kick restart', 40_000);
  expect(after.offsidePopup).toMatchObject({ visible: false, shown: 1 });
  expect(after.owner?.startsWith('A')).toBe(true);
  expect(after.score).toEqual(score);
  await page.waitForTimeout(500);
  expect((await report(page)).offsidePopup).toMatchObject({ visible: false, shown: 1 });
  expect(errors).toEqual([]);
});

test('offside referee: tap dismisses; reduced motion fades in place; reload clears it', async ({ page }, info) => {
  const mode = modeFor(info);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSandbox(page, mode, 'offside&deadBall=4');
  const xs: number[] = [];
  await until(
    async () => {
      const x = await report(page);
      if (x.offsidePopup?.visible) xs.push(x.offsidePopup.bounds!.x);
      return x;
    },
    (x) => (x.offsidePopup?.alpha ?? 0) >= 1,
    'popup'
  );
  expect(Math.max(...xs) - Math.min(...xs), 'reduced motion: no slide').toBeLessThanOrEqual(1);
  await pressElement(page, 'offside-referee', mode);
  const r = await until(() => report(page), (x) => !x.offsidePopup?.visible, 'dismissed', 3000);
  expect(r.phase).toBe('stopped');
  expect(r.offsidePopup!.shown).toBe(1);
  await page.waitForTimeout(400);
  expect((await report(page)).offsidePopup?.visible).toBe(false);
  await until(() => report(page), (x) => x.phase === 'live', 'restart still happens', 40_000);
  await page.reload();
  await waitForScene(page, 'start');
  const d = await diagnostics(page);
  expect(d.activeScenes).toEqual(['start']);
});

test('offside referee: a player merely standing offside never shows it', async ({ page }, info) => {
  const mode = modeFor(info);
  await openSandbox(page, mode, 'offside-position');
  await until(() => report(page), (x) => x.phase === 'live' && x.owner === 'H8', 'staged position');
  const t0 = Date.now();
  while (Date.now() - t0 < 2000) {
    const x = await report(page);
    expect(x.offsidePopup?.visible ?? false).toBe(false);
    expect(x.stoppage?.reason).not.toBe('offside');
    await page.waitForTimeout(40);
  }
  const x = await report(page);
  expect(x.offsidePopup!.shown).toBe(0);
  expect(x.events.some((e) => e.type === 'offside')).toBe(false);
});
