import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
type Rect = { x: number; y: number; width: number; height: number };
type Teach = { pose: string; foot: 'right' | 'left'; phase: number; step: number; contact: string; boot: { x: number; y: number }; zoomBall: boolean; t: number };
type Demo = { teach?: Teach; set: string; frame: string; contact: string; player: Rect; ball: { x: number; y: number }; rect: Rect; inset?: { foot: string; contact: string; label: string; rect: Rect; ball: Rect; text: Rect }; paused?: boolean; speed?: number };
type Career = { screen: string; week: number; credit: number; journal: number; player: string | null; status: string; text: string; plan: string[]; attributes: Record<string, number> | null; demo: Demo | null };

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
const within = (a: Rect, b: Rect) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.width <= b.x + b.width + 0.5 && a.y + a.height <= b.y + b.height + 0.5;


async function logExtra(page: Page, mode: 'touch' | 'mouse'): Promise<void> {
  await press(page, 'log-open', mode);
  await until(page, (x) => x.screen === 'log', 'log form');
  await press(page, 'log-complete', mode);
  await until(page, (x) => x.screen !== 'log', 'logged');
}
const POSES = { right: ['P4', 'P9', 'P9', 'P1'], left: ['P3', 'P10', 'P10', 'P2'] } as const;

for (const gender of ['boy', 'girl'] as const) {
  test(`teaching page (${gender}): Inside-Cut Escape opens straight to the demo; one timeline drives body, foot detail, ball and caption`, async ({ page }, info) => {
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
    let c = await until(page, (x) => x.screen === 'activity' && !!x.demo?.teach, 'teaching page');
    expect(c.demo!.set).toBe(`bm1:${gender}`);
    expect(c.text).toContain('COACH CODE: Cut, then go.');
    expect(c.text).toContain('Common mistake: Slowing down after the cut.');
    expect(c.text).not.toContain('Looks right when');
    const e0 = await els(page);
    for (const n of ['demo-pause', 'demo-step', 'demo-half', 'demo-replay', 'foot-right', 'foot-left', 'log-open', 'teach-tips']) expect(e0[n], n).toBeDefined();
    await page.screenshot({ path: `test-results/teach-${gender}-${info.project.name}-playing.png` });

    for (const foot of ['right', 'left'] as const) {
      await press(page, `foot-${foot}`, mode);
      await until(page, (x) => x.demo?.teach?.foot === foot, `${foot} foot`);
      if (!(await career(page)).demo!.paused) await press(page, 'demo-pause', mode);
      await press(page, 'demo-replay', mode);
      c = await until(page, (x) => x.demo?.paused === true && x.demo.teach!.t === 0, 'paused at start');
      for (let i = 0; i < 4; i++) {
        const d = c.demo!;
        const t = d.teach!;
        expect(t.phase, `${foot} phase`).toBe(i);
        expect(t.pose).toBe(POSES[foot][i]);
        expect(d.inset!.label.startsWith(foot === 'right' ? 'Right foot' : 'Left foot')).toBe(true);
        expect(d.inset!.contact).toBe(t.contact);
        expect(t.contact).toBe(i === 1 ? 'inside' : 'none');
        if (i === 1) expect(t.zoomBall, 'foot detail shows the ball while in contact').toBe(true);
        expect(within(d.player, d.rect), 'player inside stage').toBe(true);
        expect(within(d.inset!.rect, d.rect), 'inset inside stage').toBe(true);
        if (t.zoomBall) expect(d.inset!.ball.y + d.inset!.ball.height <= d.inset!.text.y + 0.5, 'inset ball clear of label').toBe(true);
        if (i === 1) {
          // At contact the ball sits at the working boot, on its inside (towards the body's other side).
          const side = foot === 'right' ? 1 : -1;
          expect((d.ball.x - t.boot.x) * side, 'ball on the inside of the working boot').toBeGreaterThan(0);
          expect((d.ball.x - t.boot.x) * side, 'ball at the working boot').toBeLessThan(d.player.height * 0.25);
          await page.screenshot({ path: `test-results/teach-${gender}-${foot}-contact-${info.project.name}.png` });
        }
        await press(page, 'demo-step', mode);
        c = await until(page, (x) => x.demo!.teach!.phase === (i + 1) % 4, `step ${i + 1}`);
      }
    }
    // 0.5x halves the rate of time; pose order is unchanged.
    await press(page, 'demo-half', mode);
    await until(page, (x) => x.demo?.speed === 0.5, '0.5x');
    await press(page, 'demo-pause', mode);
    const t0 = (await until(page, (x) => x.demo?.paused === false, 'playing')).demo!.teach!.t;
    const w0 = Date.now();
    await page.waitForTimeout(1200);
    const t1 = (await career(page)).demo!.teach!.t;
    const wall = (Date.now() - w0) / 1000;
    const dt = t1 - t0;
    // Demo time runs at about half the wall clock (frame pacing on a busy runner only slows it).
    expect(dt / wall).toBeGreaterThan(0.2);
    expect(dt / wall).toBeLessThan(0.62);
    // Turning the phone keeps the selected foot and timeline.
    const vp = page.viewportSize()!;
    await page.setViewportSize({ width: vp.height, height: vp.width });
    c = await until(page, (x) => !!x.demo?.teach && x.demo.rect.width > 0, 'after resize');
    expect(c.demo!.teach!.foot).toBe('left');
    expect(within(c.demo!.player, c.demo!.rect)).toBe(true);
    await page.setViewportSize(vp);
    await press(page, 'teach-tips', mode);
    c = await until(page, (x) => x.text.includes('Looks right when'), 'tips expanded');
    expect(c.screen).toBe('activity');
    // Long tips page through "More text" on short screens; the page never changes.
    let all = c.text;
    for (let i = 0; i < 6 && !all.replace(/\s+/g, ' ').includes('coach-approved animation'); i++) {
      await press(page, 'text-more', mode);
      await page.waitForTimeout(80);
      all += (await career(page)).text;
    }
    expect(all.replace(/\s+/g, ' ')).toContain('coach-approved animation');
    expect((await career(page)).screen).toBe('activity');
    // Watching changed nothing; each log adds exactly one journal entry and never touches attributes.
    const before = await career(page);
    await logExtra(page, mode);
    c = await until(page, (x) => x.journal === before.journal + 1, 'logged once');
    expect(c.attributes).toEqual(before.attributes);
    expect(errors).toEqual([]);
  });
}
