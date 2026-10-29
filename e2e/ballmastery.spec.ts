import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
type Rect = { x: number; y: number; width: number; height: number };
type Demo = { set: string; frame: string; contact: string; player: Rect; ball: { x: number; y: number }; rect: Rect; inset?: { foot: string; contact: string; label: string; rect: Rect }; paused?: boolean; speed?: number };
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
const rawSave = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const r = indexedDB.open('smr-career', 1);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const q = r.result.transaction('career', 'readonly').objectStore('career').get('main');
          q.onsuccess = () => resolve(typeof q.result === 'string' ? q.result : JSON.stringify(q.result));
        };
      })
  );
const within = (a: Rect, b: Rect) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.width <= b.x + b.width + 0.5 && a.y + a.height <= b.y + b.height + 0.5;

async function logExtra(page: Page, mode: 'touch' | 'mouse'): Promise<void> {
  await press(page, 'log-open', mode);
  await until(page, (x) => x.screen === 'log', 'log form');
  await press(page, 'log-complete', mode);
  await until(page, (x) => x.screen !== 'log', 'logged');
}

for (const gender of ['boy', 'girl'] as const) {
  test(`ball mastery (${gender}): an existing save keeps its history; two sections; viewer controls work; logging is a report`, async ({ page }, info) => {
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Robin'));
    // New player.
    let c = await openCareer(page, mode);
    expect(c.screen).toBe('create');
    await press(page, 'pos-MID', mode);
    await until(page, (x) => x.screen === 'setup', 'setup');
    await press(page, 'career-home', mode);
    c = await until(page, (x) => x.player === 'Robin' && x.screen === 'home', 'new player home');
    for (const n of ['nav-juggling', 'nav-ballmastery', 'nav-team', 'nav-focus', 'nav-practice', 'nav-progress']) expect((await els(page))[n], n).toBeDefined();
    await page.screenshot({ path: `test-results/bm-home-${gender}-${info.project.name}.png` });
    // Build some history the old way (Training Library > Juggling > jg-1 > Log extra practice), then reload it as an existing save.
    await press(page, 'nav-library', mode);
    await until(page, (x) => x.screen === 'library', 'library');
    expect(Object.keys(await els(page))).toEqual(expect.arrayContaining(['lib-juggling', 'lib-ballmastery', 'lib-drafts']));
    await press(page, 'lib-juggling', mode);
    await press(page, 'act-jg-1', mode);
    await until(page, (x) => x.screen === 'activity', 'jg-1');
    await logExtra(page, mode);
    await saveGender(page, gender);
    const before = JSON.parse(await rawSave(page)) as { journal: unknown[]; credit: number };
    expect(before.journal).toHaveLength(1);
    c = await openCareer(page, mode);
    expect({ player: c.player, journal: c.journal, credit: c.credit, week: c.week }).toEqual({ player: 'Robin', journal: 1, credit: before.credit, week: 1 });
    expect(JSON.parse(await rawSave(page))).toEqual(before);
    const attrs = c.attributes;

    // Juggling section opens the existing juggling ladder.
    await press(page, 'nav-juggling', mode);
    c = await until(page, (x) => x.screen === 'library', 'juggling section');
    expect(Object.keys(await els(page)).filter((k) => k.startsWith('act-jg-')).length).toBeGreaterThan(0);
    await press(page, 'career-back', mode);
    // Ball Mastery section: six existing families + the review-only designs.
    await press(page, 'nav-ballmastery', mode);
    await until(page, (x) => x.screen === 'ballMastery', 'ball mastery');
    for (const f of ['firstTouch', 'passing', 'dribbling', 'finishing', 'defending', 'awareness']) expect((await els(page))[`lib-${f}`], f).toBeDefined();
    await page.screenshot({ path: `test-results/bm-section-${gender}-${info.project.name}.png` });
    await press(page, 'lib-dribbling', mode);
    await press(page, 'act-dr-inside-cut', mode);
    c = await until(page, (x) => x.screen === 'activity' && !!x.demo?.inset, 'viewer');
    expect(c.text).toContain('COACH CODE');
    expect(c.demo!.set).toBe(`${gender}-training`);
    expect(within(c.demo!.inset!.rect, c.demo!.rect), 'inset inside stage').toBe(true);
    for (const size of [info.project.use.viewport!, { width: info.project.use.viewport!.height, height: info.project.use.viewport!.width }]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      const d = (await until(page, (x) => !!x.demo?.inset, 'viewer after resize')).demo!;
      expect(within(d.inset!.rect, d.rect), 'inset inside stage').toBe(true);
      await page.screenshot({ path: `test-results/bm-viewer-${gender}-${size.width}x${size.height}.png` });
      const seen: Record<string, Rect> = {};
      for (let i = 0; i < 4; i++) {
        const e = await els(page);
        for (const n of ['demo-pause', 'demo-step', 'demo-half', 'log-open']) if (e[n]) seen[n] = e[n]!;
        if (Object.keys(seen).length === 4 || !e.more) break;
        await pressAny(page, 'more', mode);
        await page.waitForTimeout(80);
      }
      for (const n of ['demo-pause', 'demo-step', 'demo-half', 'log-open']) {
        expect(seen[n], n).toBeDefined();
        expect(within(seen[n]!, { x: 0, y: 0, ...size }), `${n} on screen`).toBe(true);
      }
    }
    await page.setViewportSize(info.project.use.viewport!);
    // Pause freezes the pose; Step moves to the next contact while paused; 0.5x halves the speed.
    await press(page, 'demo-pause', mode);
    c = await until(page, (x) => x.demo?.paused === true, 'paused');
    const frozen = c.demo!.frame + c.demo!.contact;
    await page.waitForTimeout(700);
    expect((await career(page)).demo!.frame + (await career(page)).demo!.contact).toBe(frozen);
    await press(page, 'demo-step', mode);
    c = await until(page, (x) => x.demo!.frame + x.demo!.contact !== frozen, 'stepped');
    expect(c.demo!.paused).toBe(true);
    await press(page, 'demo-half', mode);
    await until(page, (x) => x.demo?.speed === 0.5, '0.5x');
    await press(page, 'demo-pause', mode);
    await until(page, (x) => x.demo?.paused === false, 'playing');
    // Watching changed nothing; logging adds one report (extra practice: no credit, no attributes).
    c = await career(page);
    expect({ journal: c.journal, credit: c.credit }).toEqual({ journal: 1, credit: before.credit });
    await logExtra(page, mode);
    c = await until(page, (x) => x.journal === 2, 'second log');
    expect(c.credit).toBe(before.credit);
    expect(c.attributes).toEqual(attrs);
    // Review-only designs are listed with status and sources, and never offered as assignments.
    await openCareer(page, mode);
    await press(page, 'nav-ballmastery', mode);
    await press(page, 'bm-designs', mode);
    await until(page, (x) => x.screen === 'bmDesigns' && x.text.includes('REVIEW ONLY'), 'designs');
    await press(page, 'bm-design-BM-055', mode);
    c = await until(page, (x) => x.screen === 'bmDesign', 'design');
    expect(c.text).toContain('Not assigned to players');
    expect(c.text).toContain('de Vera');
    await page.screenshot({ path: `test-results/bm-design-${gender}-${info.project.name}.png` });
    // Team Training is still its own, untouched entry.
    await openCareer(page, mode);
    await press(page, 'nav-team', mode);
    await until(page, (x) => x.screen === 'team', 'team training');
    expect(errors).toEqual([]);
  });
}
