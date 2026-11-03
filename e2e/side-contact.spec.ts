import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
type Rect = { x: number; y: number; width: number; height: number };
type Teach = { pose: string; foot: 'right' | 'left'; phase: number; step: number; contact: string; boot: { x: number; y: number }; zoomBall: boolean; t: number; clock: number; ground: number };
type Side = { working: string | null; support: string | null; phase: string; action: string; ballDx: number; poseDx: number; ballTexture: string; ballRadius: number; poseWorking: string | null; poseSurface: string; contact: { x: number; y: number } | null; top?: { gap: Record<'right' | 'left', number>; ballY: number; boots: Record<'right' | 'left', Rect> } };
type Demo = { side?: Side; teach?: Teach; set: string; flip?: boolean; fallback?: boolean; frame: string; contact: string; player: Rect; ball: { x: number; y: number }; rect: Rect; inset?: { foot: string; contact: string; label: string; rect: Rect; ball: Rect; text: Rect }; paused?: boolean; speed?: number };
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



// bmd-055 Sole taps, right foot first: rest, pre, contact, post, rest, then the other foot.
const PHASES = ['rest', 'pre', 'contact', 'post', 'rest', 'pre', 'contact', 'post', 'rest'] as const;
const other = (f: 'right' | 'left') => (f === 'right' ? 'left' : 'right');

for (const gender of ['boy', 'girl'] as const) {
  test(`side-view contact (${gender}): Sole taps uses derived poses, the approved ball and one state for body, ball, inset and caption`, async ({ page }, info) => {
    // Slow CI runners draw about one frame a second; every check stays, only the time allowed grows.
    test.setTimeout(600_000);
    // Hold the side-view atlas back so the ordinary training sprite draws first, as on a cold first visit.
    await page.route('**/*-side*.webp', async (r) => {
      await new Promise((res) => setTimeout(res, 2000));
      await r.continue();
    });
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Robin'));
    await openCareer(page, mode);
    await press(page, 'pos-MID', mode);
    await until(page, (x) => x.screen === 'setup', 'setup');
    await press(page, 'career-home', mode);
    const home = await until(page, (x) => x.screen === 'home', 'home');
    if (gender === 'girl') {
      await saveGender(page, 'girl');
      await openCareer(page, mode);
      await until(page, (x) => x.screen === 'home', 'home again');
    }
    await press(page, 'nav-ballmastery', mode);
    await press(page, 'lib-dribbling', mode);
    await press(page, 'act-bmd-055', mode);
    let c = await until(page, (x) => x.screen === 'activity' && !!x.demo?.side, 'side-view page');
    expect(c.demo!.set).toBe(`bmside:${gender}`);
    expect(c.demo!.flip, 'never mirrored').toBe(false);
    expect(c.demo!.fallback, 'fallback training sprite hidden once the side art is drawn (no button or resize yet)').toBe(false);
    expect(c.demo!.side!.ballTexture, 'approved Jungle Ball strip').toMatch(/jungle4-ball:ball-0$/);
    expect(c.text).toContain('COACH CODE: Keep the ball still; alternate light contacts.');
    const e0 = await els(page);
    for (const n of ['demo-pause', 'demo-step', 'demo-half', 'demo-replay', 'foot-right', 'foot-left', 'log-open', 'teach-tips']) expect(e0[n], n).toBeDefined();

    for (const lead of ['right', 'left'] as const) {
      await press(page, `foot-${lead}`, mode);
      await until(page, (x) => x.demo?.teach?.foot === lead, `${lead} first`);
      await press(page, 'demo-replay', mode);
      await until(page, (x) => x.demo?.paused === false && x.demo.teach!.phase === 0, 'replaying');
      await press(page, 'demo-pause', mode);
      c = await until(page, (x) => x.demo?.paused === true, 'paused');
      for (let k = 0; k < PHASES.length && c.demo!.teach!.phase !== 0; k++) {
        const ph = c.demo!.teach!.phase;
        await press(page, 'demo-step', mode);
        c = await until(page, (x) => x.demo!.teach!.phase !== ph, 'step to start');
      }
      const ball0 = c.demo!.ball;
      const ground = c.demo!.teach!.ground;
      for (let i = 0; i < PHASES.length; i++) {
        const d = c.demo!;
        const s = d.side!;
        const t = d.teach!;
        const want = PHASES[i];
        const foot = want === 'rest' ? null : i < 4 ? lead : other(lead);
        expect(t.phase, `${lead} beat`).toBe(i);
        expect(s.phase).toBe(want);
        expect(s.working, `working foot (${lead} beat ${i})`).toBe(foot);
        expect(s.poseWorking, 'pose art agrees with the timeline').toBe(foot);
        expect(s.support).toBe(foot ? other(foot) : null);
        expect(t.contact).toBe(want === 'contact' ? 'sole' : 'none');
        expect(s.poseSurface, 'pose art agrees with the contact surface').toBe(t.contact);
        expect(d.inset!.contact).toBe(t.contact);
        expect(d.inset!.label).toBe(foot ? (want === 'contact' ? `${foot === 'right' ? 'Right' : 'Left'} foot\nsole on top of ball` : `${foot === 'right' ? 'Right' : 'Left'} foot\nno contact`) : 'No contact\nboth feet down');
        expect(c.text.length).toBeGreaterThan(0);
        expect(d.ball.x, 'ball still').toBeCloseTo(ball0.x, 3);
        expect(d.ball.y, 'ball still').toBeCloseTo(ball0.y, 3);
        expect(t.ground).toBeCloseTo(ground, 3);
        expect(within(d.player, d.rect), 'player inside stage').toBe(true);
        expect(within(d.inset!.rect, d.rect), 'inset inside stage').toBe(true);
        expect(within(d.inset!.ball, d.inset!.rect), 'inset ball inside inset').toBe(true);
        expect(d.inset!.ball.y + d.inset!.ball.height <= d.inset!.text.y + 0.5, 'inset ball clear of label').toBe(true);
        if (want === 'contact') {
          // The sole's contact point sits on the ball's edge, on top: not inside the ball, not floating.
          const p = s.contact!;
          const dist = Math.hypot(p.x - d.ball.x, p.y - d.ball.y);
          expect(dist / s.ballRadius, 'contact on the ball edge').toBeGreaterThan(0.9);
          expect(dist / s.ballRadius, 'contact on the ball edge').toBeLessThan(1.1);
          expect(p.y, 'contact on the top half').toBeLessThan(d.ball.y);
        } else expect(s.contact).toBeNull();
        if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/side-${gender}-${lead}-${i}-${want}-${info.project.name}.png` });
        if (i === PHASES.length - 1) break;
        await press(page, 'demo-step', mode);
        c = await until(page, (x) => x.demo!.teach!.phase === i + 1, `step ${i + 1}`);
      }
    }
    // 0.5x halves the clock; Play resumes from a paused hold.
    await press(page, 'demo-replay', mode);
    await press(page, 'demo-half', mode);
    await until(page, (x) => x.demo?.speed === 0.5 && x.demo.paused === false, '0.5x');
    // Demo time over the wall time the demo actually played: a starved CI runner draws about one frame a second
    // (a long gap counts as at most 0.25 s), so real-time sampling can't measure the speed there.
    // A window in which the demo reached its last frame (and stopped) says nothing about speed: replay and re-measure.
    let a = await career(page);
    let b = a;
    for (let k = 0; k < 6; k++) {
      if (k > 0) {
        await press(page, 'demo-replay', mode);
        await until(page, (x) => x.demo?.speed === 0.5 && x.demo.paused === false, '0.5x replay');
      }
      a = await career(page);
      await page.waitForTimeout(800);
      b = await career(page);
      if (a.demo!.paused === false && b.demo!.paused === false && b.demo!.teach!.clock > a.demo!.teach!.clock) break;
    }
    expect(b.demo!.paused, 'demo still playing at the end of the window').toBe(false);
    const played = b.demo!.teach!.clock - a.demo!.teach!.clock;
    expect(played, 'demo kept playing').toBeGreaterThan(0);
    const rate = (b.demo!.teach!.t - a.demo!.teach!.t) / played;
    expect(rate).toBeGreaterThan(0.49);
    expect(rate).toBeLessThan(0.51);
    // Watching changes nothing; logging adds one entry.
    await press(page, 'career-back', mode);
    await press(page, 'career-home', mode);
    c = await until(page, (x) => x.screen === 'home', 'home');
    expect(c.credit).toBe(home.credit);
    expect(c.journal).toBe(home.journal);
    expect(errors).toEqual([]);
  });
}

// Sole rolls (v1.1 BM03 L2, TR01 L1): the ball travels under the sole, each position drawn with its own pose.
for (const gender of ['boy', 'girl'] as const) {
  test(`side-view sole rolls (${gender}): ball and sole travel together, ball turns, inset follows`, async ({ page }, info) => {
    // Slow CI runners draw about one frame a second; every check stays, only the time allowed grows.
    test.setTimeout(600_000);
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Robin'));
    await openCareer(page, mode);
    await press(page, 'pos-MID', mode);
    await until(page, (x) => x.screen === 'setup', 'setup');
    await press(page, 'career-home', mode);
    const home = await until(page, (x) => x.screen === 'home', 'home');
    if (gender === 'girl') {
      await saveGender(page, 'girl');
      await openCareer(page, mode);
      await until(page, (x) => x.screen === 'home', 'home again');
    }
    for (const [id, path] of [['v11-BM03-L2', 'forward-back'], ['v11-TR01-L1', 'back']] as const) {
      await press(page, 'nav-ballmastery', mode);
      await press(page, 'lib-dribbling', mode);
      await press(page, `act-${id}`, mode);
      await until(page, (x) => x.screen === 'activity' && !!x.demo?.side && x.demo.fallback === false, `${id} side view`);
      for (const lead of ['right', 'left'] as const) {
        await press(page, `foot-${lead}`, mode);
        // Sample at 0.5x so the short contact beats and the end of each roll are not missed between reads on a busy runner.
        if ((await career(page)).demo?.speed !== 0.5) await press(page, 'demo-half', mode);
        await press(page, 'demo-replay', mode);
        await until(page, (x) => x.demo?.teach?.foot === lead && x.demo.paused === false && x.demo.speed === 0.5, `${id} ${lead} playing`);
        const seen: Demo[] = [];
        for (;;) {
          const c = await career(page);
          const d = c.demo!;
          seen.push(d);
          const s = d.side!;
          expect(d.flip, 'never mirrored').toBe(false);
          expect(s.poseDx, 'pose drawn for the ball where it is').toBe(s.ballDx);
          expect(s.poseWorking).toBe(s.working);
          expect(s.poseSurface).toBe(d.teach!.contact);
          expect(d.inset!.contact).toBe(d.teach!.contact);
          if (s.working) expect(d.inset!.label.startsWith(s.working === 'right' ? 'Right foot' : 'Left foot')).toBe(true);
          expect(within(d.inset!.ball, d.inset!.rect), 'inset ball inside inset').toBe(true);
          expect(within(d.player, d.rect), 'player inside stage').toBe(true);
          if (d.teach!.contact === 'sole') {
            const p = s.contact!;
            const dist = Math.hypot(p.x - d.ball.x, p.y - d.ball.y);
            expect(dist / s.ballRadius, 'contact on the ball edge').toBeGreaterThan(0.85);
            expect(dist / s.ballRadius, 'contact on the ball edge').toBeLessThan(1.15);
            expect(p.y, 'contact on top').toBeLessThan(d.ball.y);
            expect(s.working, 'working foot on the ball').toBe(lead);
          } else expect(s.contact).toBeNull();
          if (d.paused) break;
          await page.waitForTimeout(30);
        }
        // Ball moved only under the sole, forward then back (or back only), and the strip turned with it.
        const xs = seen.map((d) => d.ball.x);
        for (let i = 1; i < seen.length; i++) if (seen[i]!.side!.ballDx !== seen[i - 1]!.side!.ballDx) expect(seen[i]!.teach!.contact === 'sole' || seen[i - 1]!.teach!.contact === 'sole').toBe(true);
        // The far end of a roll lasts a few frames; check it on the held beat starts (Step), not by live sampling.
        await press(page, 'demo-replay', mode);
        await press(page, 'demo-pause', mode);
        let h = await until(page, (x) => x.demo?.paused === true, 'paused');
        for (let k = 0; k < 20 && h.demo!.teach!.phase !== 0; k++) {
          const ph = h.demo!.teach!.phase;
          await press(page, 'demo-step', mode);
          h = await until(page, (x) => x.demo!.teach!.phase !== ph, 'step to start');
        }
        const held: number[] = [];
        for (let k = 0; k < 20; k++) {
          const s = h.demo!.side!;
          expect(s.poseDx, 'held pose drawn for the ball where it is').toBe(s.ballDx);
          held.push(s.ballDx);
          const ph = h.demo!.teach!.phase;
          await press(page, 'demo-step', mode);
          // Step after the last beat wraps to the start.
          h = await until(page, (x) => x.demo!.teach!.phase !== ph, `step after ${ph}`);
          if (h.demo!.teach!.phase < ph) break;
        }
        expect(Math.max(...held), 'roll reaches its far end').toBe(8);
        expect(Math.max(...seen.map((d) => d.side!.ballDx)), 'live play moves the ball most of the way').toBeGreaterThanOrEqual(6);
        if (path === 'forward-back') expect(xs[0]!).toBeLessThan(Math.max(...xs) - 5);
        else expect(xs[0]!).toBeGreaterThan(xs[xs.length - 1]! + 5);
        expect(seen[seen.length - 1]!.side!.ballDx).toBe(0);
        expect(new Set(seen.map((d) => d.side!.ballTexture)).size, 'ball turns as it rolls').toBeGreaterThan(1);
        for (const d of seen) expect(d.side!.ballTexture).toMatch(/jungle4-ball:ball-\d+$/);
        if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/roll-${id}-${gender}-${lead}-${info.project.name}.png` });
      }
      await press(page, 'career-back', mode);
      await press(page, 'career-home', mode);
      const c = await until(page, (x) => x.screen === 'home', 'home');
      expect(c.credit).toBe(home.credit);
      expect(c.journal).toBe(home.journal);
    }
    expect(errors).toEqual([]);
  });
}

// Inside-foot transfers (owner option A): planted side stance, foot detail from above (BM-056, v1.1 BM01 L2).
for (const gender of ['boy', 'girl'] as const) {
  test(`inside-foot transfers (${gender}): foot detail from above shows the touching boot, ball and caption from one state`, async ({ page }, info) => {
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    page.on('dialog', (d) => void d.accept('Robin'));
    await openCareer(page, mode);
    await press(page, 'pos-MID', mode);
    await until(page, (x) => x.screen === 'setup', 'setup');
    await press(page, 'career-home', mode);
    const home = await until(page, (x) => x.screen === 'home', 'home');
    if (gender === 'girl') {
      await saveGender(page, 'girl');
      await openCareer(page, mode);
      await until(page, (x) => x.screen === 'home', 'home again');
    }
    for (const id of ['bmd-056', 'v11-BM01-L2']) {
      await press(page, 'nav-ballmastery', mode);
      await press(page, 'lib-dribbling', mode);
      await press(page, `act-${id}`, mode);
      await until(page, (x) => x.screen === 'activity' && !!x.demo?.side?.top && x.demo.fallback === false, `${id} inside lesson`);
      for (const lead of ['right', 'left'] as const) {
        await press(page, `foot-${lead}`, mode);
        // Sample at 0.5x so the short contact beats and the end of each roll are not missed between reads on a busy runner.
        if ((await career(page)).demo?.speed !== 0.5) await press(page, 'demo-half', mode);
        await press(page, 'demo-replay', mode);
        await until(page, (x) => x.demo?.teach?.foot === lead && x.demo.paused === false && x.demo.speed === 0.5, `${id} ${lead} playing`);
        const seen: Demo[] = [];
        // Same checks for live samples and for the held beat starts walked with Step below.
        const check = (d: Demo): void => {
          const s = d.side!;
          const top = s.top!;
          expect(d.flip, 'never mirrored').toBe(false);
          expect(d.frame).toBe('stand');
          // Right boot below (near side), left above, whichever foot goes first.
          expect(top.boots.right.y).toBeGreaterThan(top.boots.left.y);
          for (const f of ['right', 'left'] as const) {
            expect(top.gap[f], `${f} boot never overlaps the ball`).toBeGreaterThanOrEqual(-0.01);
            expect(within(top.boots[f], d.inset!.rect), `${f} boot inside foot detail`).toBe(true);
          }
          expect(within(d.inset!.ball, d.inset!.rect), 'ball inside foot detail').toBe(true);
          expect(d.inset!.contact).toBe(d.teach!.contact);
          if (d.teach!.contact === 'inside') {
            const f = s.working as 'right' | 'left';
            expect(top.gap[f], 'inside edge on the ball').toBeLessThanOrEqual(0.01);
            // On screen: the ball's edge meets the working boot's inside edge.
            const b = d.inset!.ball;
            const boot = top.boots[f];
            const edgeGap = f === 'right' ? boot.y - (b.y + b.height) : b.y - (boot.y + boot.height);
            expect(Math.abs(edgeGap), 'screen edge contact').toBeLessThan(1.5);
            expect(d.inset!.label).toContain('inside on ball');
          } else expect(d.inset!.label).not.toContain('on ball');
          expect(d.inset!.label.startsWith('From above')).toBe(true);
        };
        for (;;) {
          const d = (await career(page)).demo!;
          seen.push(d);
          check(d);
          if (d.paused) break;
          await page.waitForTimeout(30);
        }
        const ys = seen.map((d) => d.side!.top!.ballY);
        expect(Math.max(...ys) - Math.min(...ys), 'ball crosses between the feet').toBeGreaterThan(10);
        // A contact beat can fall between two reads on a ~1 fps runner; also visit every held beat start (Step).
        await press(page, 'demo-replay', mode);
        await press(page, 'demo-pause', mode);
        let h = await until(page, (x) => x.demo?.paused === true, 'paused');
        for (let k = 0; k < 40 && h.demo!.teach!.phase !== 0; k++) {
          const ph = h.demo!.teach!.phase;
          await press(page, 'demo-step', mode);
          h = await until(page, (x) => x.demo!.teach!.phase !== ph, `${id} ${lead} step to start`);
        }
        for (let k = 0; k < 40; k++) {
          check(h.demo!);
          seen.push(h.demo!);
          const ph = h.demo!.teach!.phase;
          await press(page, 'demo-step', mode);
          // Step after the last beat wraps to the start.
          h = await until(page, (x) => x.demo!.teach!.phase !== ph, `${id} ${lead} step after ${ph}`);
          if (h.demo!.teach!.phase < ph) break;
        }
        expect(seen.some((d) => d.teach!.contact === 'inside' && d.side!.working === lead), 'lead foot touches').toBe(true);
        expect(seen.some((d) => d.teach!.contact === 'inside' && d.side!.working !== lead), 'other foot touches').toBe(true);
        expect(new Set(seen.map((d) => d.side!.ballTexture)).size, 'ball turns as it rolls').toBeGreaterThan(1);
        if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/inside-${id}-${gender}-${lead}-${info.project.name}.png` });
      }
      await press(page, 'career-back', mode);
      await press(page, 'career-home', mode);
      const c = await until(page, (x) => x.screen === 'home', 'home');
      expect(c.credit).toBe(home.credit);
      expect(c.journal).toBe(home.journal);
    }
    expect(errors).toEqual([]);
  });
}
