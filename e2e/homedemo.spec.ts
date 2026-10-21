import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
type Rect = { x: number; y: number; width: number; height: number };
type Demo = { set: string; frame: string; flip: boolean; contact: string; scale: { x: number; y: number }; player: Rect; ball: { x: number; y: number }; rect: Rect };
type Career = { screen: string; credit: number; journal: number; player: string | null; status: string; demo: Demo | null };

async function career(page: Page): Promise<Career> {
  return (await diagnostics(page)).gameplay as Career;
}
async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const els = (await diagnostics(page)).layout?.elements ?? {};
    if (els[name] || !els.more) return pressAny(page, name, mode);
    await pressAny(page, 'more', mode);
    await page.waitForTimeout(60);
  }
  return pressAny(page, name, mode);
}
async function until(page: Page, pred: (c: Career) => boolean, what: string): Promise<Career> {
  const start = Date.now();
  for (;;) {
    const c = await career(page).catch(() => null);
    if (c && pred(c)) return c;
    if (Date.now() - start > 15_000) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(c)}`);
    await page.waitForTimeout(50);
  }
}
async function openCareer(page: Page, mode: 'touch' | 'mouse'): Promise<Career> {
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await pressAny(page, 'career-button', mode);
  await waitForScene(page, 'career');
  return until(page, (c) => c.status !== 'loading', 'store');
}
/** The story's Boy/Girl choice is the only writer of gender; set it on the saved career the same way (setIdentity shape). */
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
const inside = (p: { x: number; y: number }, r: Rect) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

const EXERCISES: readonly [string, string][] = [
  ['lib-juggling', 'act-jg-6'],
  ['lib-finishing', 'act-fn-ground-placement'],
  ['lib-passing', 'act-ps-wide-gate'],
  ['lib-dribbling', 'act-dr-inside'],
  ['lib-firstTouch', 'act-ft-soft-landing'],
  ['lib-defending', 'act-df-side-step'],
  ['lib-awareness', 'act-aw-eyes-up'],
];

// Split in two so each test fits CI's slower runners; together they cover every family above.
const HALVES: readonly (readonly [string, string][])[] = [EXERCISES.slice(0, 4), EXERCISES.slice(4)];

for (const gender of ['boy', 'girl'] as const) for (const [h, exercises] of HALVES.entries()) {
  test(`home demos ${h + 1}/2: the saved ${gender} demonstrates in the training kit, after reload and rotation; watching awards nothing`, async ({ page }, info) => {
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Alex'));
    let c = await openCareer(page, mode);
    await press(page, 'pos-MID', mode);
    await until(page, (x) => x.player === 'Alex', 'player');
    await saveGender(page, gender);
    c = await openCareer(page, mode); // loading a save
    expect(c.player).toBe('Alex');
    const before = { credit: c.credit, journal: c.journal };
    for (const [lib, act] of exercises) {
      if ((await career(page)).screen !== 'home') await openCareer(page, mode);
      await press(page, 'nav-library', mode);
      await until(page, (x) => x.screen === 'library', 'library');
      await press(page, lib, mode);
      await page.waitForTimeout(80);
      await press(page, act, mode);
      const d = (await until(page, (x) => x.screen === 'activity' && !!x.demo, `${act} sprite demo`)).demo!;
      expect(d.set).toBe(`${gender}-training`);
      for (const size of [info.project.use.viewport!, { width: info.project.use.viewport!.height, height: info.project.use.viewport!.width }]) {
        await page.setViewportSize(size);
        let scale: number | null = null;
        for (let i = 0; i < 6; i++) {
          await page.waitForTimeout(450);
          const x = (await career(page)).demo!;
          expect(x.set).toBe(`${gender}-training`);
          expect(inside({ x: x.player.x + x.player.width / 2, y: x.player.y + x.player.height }, x.rect), `${act} feet in frame`).toBe(true);
          expect(inside(x.ball, x.rect), `${act} ball in frame`).toBe(true);
          const art = { x: x.player.x + x.player.width * 0.1, y: x.player.y + x.player.height * 0.08 };
          expect(inside(art, x.rect) && inside({ x: x.player.x + x.player.width * 0.9, y: art.y }, x.rect), `${act} whole player in frame`).toBe(true);
          expect(x.scale.x, 'not stretched').toBeCloseTo(x.scale.y, 5);
          scale ??= x.scale.x;
          expect(x.scale.x, 'stable character scale across poses').toBeCloseTo(scale, 5);
        }
        await page.screenshot({ path: `test-results/homedemo-${gender}-${act.slice(4)}-${size.width}x${size.height}.png` });
      }
      await page.setViewportSize(info.project.use.viewport!);
    }
    c = await career(page);
    expect({ credit: c.credit, journal: c.journal }).toEqual(before);
    expect(errors).toEqual([]);
  });
}
