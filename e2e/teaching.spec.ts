import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
type Rect = { x: number; y: number; width: number; height: number };
type Teach = { pose: string; foot: 'right' | 'left'; phase: number; step: number; contact: string; boot: { x: number; y: number }; zoomBall: boolean; t: number; ground: number };
type Demo = { teach?: Teach; set: string; frame: string; contact: string; player: Rect; ball: { x: number; y: number }; rect: Rect; inset?: { foot: string; contact: string; label: string; rect: Rect; ball: Rect; text: Rect }; paused?: boolean; speed?: number };
type Career = { demoGate?: string | null; screen: string; week: number; credit: number; journal: number; player: string | null; status: string; text: string; plan: string[]; attributes: Record<string, number> | null; demo: Demo | null };

const career = async (page: Page) => (await diagnostics(page)).gameplay as Career;
const els = async (page: Page) => (await diagnostics(page)).layout?.elements ?? {};
async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const e = await els(page);
    if (e[name] || !e.more) return pressAny(page, name, mode);
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
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await pressAny(page, 'career-button', mode);
  await waitForScene(page, 'career');
  return until(page, (c) => c.status !== 'loading', 'store');
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
    gender
  );
}


async function logExtra(page: Page, mode: 'touch' | 'mouse'): Promise<void> {
  await press(page, 'log-open', mode);
  await until(page, (x) => x.screen === 'log', 'log form');
  await press(page, 'log-complete', mode);
  await until(page, (x) => x.screen !== 'log', 'logged');
}

for (const gender of ['boy', 'girl'] as const) {
  test(`teaching page (${gender}): Inside-Cut Escape keeps its lesson and logging; its unchecked demo stays hidden`, async ({ page }, info) => {
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Robin'));
    await openCareer(page, mode);
    await press(page, 'pos-MID', mode);
    await until(page, (x) => x.screen === 'setup', 'setup');
    await press(page, 'career-home', mode);
    await until(page, (x) => x.screen === 'home', 'home');
    if (gender === 'girl') {
      await saveGender(page, 'girl');
      await openCareer(page, mode);
      await until(page, (x) => x.screen === 'home', 'home again');
    }
    await press(page, 'nav-ballmastery', mode);
    await press(page, 'lib-dribbling', mode);
    await press(page, 'act-dr-inside-cut', mode);
    // Its front-view draft art has an open contact defect (INTAKE.md), so the page teaches without the animation
    // until a side-view sequence passes its contact checks (D69 gate). Lesson, steps and logging stay.
    let c = await until(page, (x) => x.screen === 'activity' && x.demoGate === 'checking', 'gated teaching page');
    expect(c.demo, 'no demonstration drawn').toBeNull();
    expect(c.text).toContain('COACH CODE: Cut, then go.');
    expect(c.text).toContain('still being checked');
    expect(c.text).toContain('Common mistake: Slowing down after the cut.');
    const e0 = await els(page);
    for (const n of ['demo-pause', 'demo-step', 'demo-half', 'demo-replay', 'foot-right', 'foot-left']) expect(e0[n], `${n} hidden`).toBeUndefined();
    expect(e0['log-open']).toBeDefined();
    const vp = page.viewportSize()!;
    await page.setViewportSize({ width: vp.height, height: vp.width });
    await page.waitForTimeout(300);
    expect((await career(page)).demo, 'still hidden after rotation').toBeNull();
    await page.setViewportSize(vp);
    await page.screenshot({ path: `test-results/teach-gated-${gender}-${info.project.name}.png` });
    // Watching changed nothing; each log adds exactly one journal entry and never touches attributes.
    const before = await career(page);
    await logExtra(page, mode);
    c = await until(page, (x) => x.journal === before.journal + 1, 'logged once');
    expect(c.attributes).toEqual(before.attributes);
    expect(errors).toEqual([]);
  });
}
