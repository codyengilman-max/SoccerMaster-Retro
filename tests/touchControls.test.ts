import { describe, expect, it } from 'vitest';
import { inGestureArea, pullFor, thresholdsFor, TOUCH_TUNING, TouchControls, type ControlAction } from '../src/input/touchControls';

const SHORT = 390;
const K = 'H7#1';
const th = thresholdsFor(SHORT);
const AIM = TOUCH_TUNING.aimDelayMs;
const types = (a: readonly ControlAction[]): string[] => a.map((x) => x.type);
const KICKS = ['kick', 'quickShot'];

function press(c: TouchControls, x: number, y: number, t: number, key: string | null = K, id = 1): ControlAction[] {
  return c.pointerDown(id, x, y, t, key);
}

describe('TouchControls thresholds', () => {
  it('scale with the viewport short side and stay within min/max', () => {
    const tiny = thresholdsFor(100);
    const huge = thresholdsFor(5000);
    expect(tiny.swipeCommit).toBe(TOUCH_TUNING.swipeCommit.min);
    expect(huge.swipeCommit).toBe(TOUCH_TUNING.swipeCommit.max);
    expect(thresholdsFor(Number.NaN).maxPull).toBe(TOUCH_TUNING.maxPull.min);
    expect(th.swipeCommit).toBeGreaterThan(th.holdSlop);
    expect(th.maxPull).toBeGreaterThan(th.cancelRadius);
    // A quick still tap must be able to finish after the aim delay without becoming a cancel.
    expect(TOUCH_TUNING.tapMaxMs).toBeGreaterThan(AIM);
  });

  it('edge margins and non-finite presses are not gameplay', () => {
    const m = th.edgeMargin;
    expect(inGestureArea(m + 1, m + 1, 800, 400, th)).toBe(true);
    expect(inGestureArea(m - 1, 200, 800, 400, th)).toBe(false);
    expect(inGestureArea(400, 400 - m + 1, 800, 400, th)).toBe(false);
    expect(inGestureArea(Number.NaN, 200, 800, 400, th)).toBe(false);
    expect(inGestureArea(200, 200, Number.POSITIVE_INFINITY, 400, th)).toBe(false);
  });
});

describe('TouchControls: movement', () => {
  it('a quick swipe with the ball, from anywhere, is exactly one dribble and never an aim or kick', () => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, -0.7], [-0.7, 0.7]] as const) {
      const c = new TouchControls(SHORT);
      press(c, 300, 200, 0);
      const d = th.swipeCommit + 2;
      const out = [...c.pointerMove(1, 300 + dx * d, 200 + dy * d, 40), ...c.update(1000), ...c.pointerMove(1, 300 - dx * 400, 200, 1100), ...c.pointerUp(1, 300 - dx * 400, 200, 1200)];
      expect(types(out)).toEqual(['dribble']);
      const a = out[0] as Extract<ControlAction, { type: 'dribble' }>;
      expect(Math.sign(a.dx)).toBe(Math.sign(Math.round(dx * 10)));
      expect(Math.sign(a.dy)).toBe(Math.sign(Math.round(dy * 10)));
    }
  });

  it('the dribble fires the moment the swipe crosses the commit distance (no wait for release)', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    expect(c.pointerMove(1, th.swipeCommit - 1, 0, 10)).toEqual([]);
    expect(types(c.pointerMove(1, th.swipeCommit, 0, 20))).toEqual(['dribble']);
  });

  it('without the ball every press is movement: a slow drag steers, a hold never aims', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0, null);
    expect(c.update(5000)).toEqual([]);
    expect(types(c.pointerMove(1, 0, th.swipeMin, 6000))).toEqual(['dribble']);
    expect(c.pointerUp(1, 0, th.swipeMin, 6010)).toEqual([]);
    press(c, 0, 0, 7000, null);
    c.pointerMove(1, th.holdSlop + 1, 0, 7050);
    expect(types(c.pointerUp(1, th.swipeMin + 1, 0, 7100))).toEqual(['dribble']);
    press(c, 0, 0, 8000, null);
    expect(c.pointerUp(1, 3, 0, 8040)).toEqual([]);
    // Off-ball taps never pair into a shot.
    press(c, 0, 0, 8100, null);
    expect(c.pointerUp(1, 0, 0, 8140)).toEqual([]);
  });
});

describe('TouchControls: aimed kick', () => {
  it('press anywhere with the ball, aim after aimDelayMs, exactly one kick opposite the drag, power capped', () => {
    const c = new TouchControls(SHORT);
    press(c, 200, 200, 0);
    expect(c.update(AIM - 1)).toEqual([]);
    expect(types(c.update(AIM))).toEqual(['aimStart']);
    expect(c.state).toBe('aiming');
    expect(types(c.pointerMove(1, 200 - 5000, 200, 300))).toEqual(['aimMove']);
    const up = c.pointerUp(1, 200 - 5000, 200, 400);
    expect(types(up)).toEqual(['kick']);
    const kick = up[0] as Extract<ControlAction, { type: 'kick' }>;
    expect(kick.power).toBe(1);
    expect(kick.dirX).toBeCloseTo(1);
    expect(kick.dirY).toBeCloseTo(0);
    expect(types(c.pointerUp(1, 0, 0, 500))).toEqual([]);
  });

  it('a slow drag with the ball is an aim, never a dribble, and a late frame does not change that', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    c.pointerMove(1, 4, 0, 50);
    // No update() for 400 ms (dropped frames): the move event's own time decides.
    const out = c.pointerMove(1, th.swipeCommit + 40, 0, 450);
    expect(types(out)).toEqual(['aimStart', 'aimMove']);
    expect(types(c.pointerUp(1, th.swipeCommit + 40, 0, 500))).toEqual(['kick']);
  });

  it('short pull is a soft kick; returning inside the cancel circle cancels and launches nothing', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    c.update(AIM);
    const soft = c.pointerUp(1, 0, th.cancelRadius + 10, 300)[0] as Extract<ControlAction, { type: 'kick' }>;
    expect(soft.type).toBe('kick');
    expect(soft.power).toBeGreaterThan(0);
    expect(soft.power).toBeLessThan(0.2);
    press(c, 0, 0, 1000);
    c.update(1000 + AIM);
    c.pointerMove(1, 0, th.maxPull, 1100);
    const cancel = c.pointerUp(1, 1, 1, 1150);
    expect(types(cancel)).toEqual(['aimCancel']);
    expect((cancel[0] as Extract<ControlAction, { type: 'aimCancel' }>).reason).toBe('released in cancel circle');
  });

  it('a cancel never becomes a quick shot, even when it is quick and followed by a tap', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    c.pointerMove(1, 0, th.cancelRadius + 20, AIM + 10);
    expect(types(c.pointerUp(1, 0, 0, AIM + 40))).toEqual(['aimCancel']);
    press(c, 0, 0, AIM + 100);
    expect(types(c.pointerUp(1, 0, 0, AIM + 140))).toEqual([]);
  });

  it('pull strength depends only on the screen drag, so camera movement mid-aim cannot change it', () => {
    const a = pullFor(-80, 30, th);
    const b = pullFor(-80, 30, th);
    expect(a).toEqual(b);
    const c = new TouchControls(SHORT);
    press(c, 100, 100, 0);
    c.update(AIM);
    const up = c.pointerUp(1, 20, 130, 400)[0] as Extract<ControlAction, { type: 'kick' }>;
    expect(up.power).toBeCloseTo(a.power);
    expect(up.dirX).toBeCloseTo(a.dirX);
  });
});

describe('TouchControls: quick shot (double-tap)', () => {
  it('single tap does nothing; a double tap anywhere gives one quick shot; a third tap starts a new pair', () => {
    const c = new TouchControls(SHORT);
    press(c, 50, 50, 0);
    expect(c.pointerUp(1, 50, 50, 60)).toEqual([]);
    press(c, 52, 51, 200);
    expect(types(c.pointerUp(1, 52, 51, 260))).toEqual(['quickShot']);
    press(c, 52, 51, 330);
    expect(c.pointerUp(1, 52, 51, 380)).toEqual([]);
  });

  it('a tap that outlasts aimDelayMs quietly cancels the aim it opened and still counts as a tap', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    expect(types([...c.update(AIM + 10), ...c.pointerUp(1, 0, 0, AIM + 30)])).toEqual(['aimStart', 'aimCancel']);
    press(c, 0, 0, AIM + 150);
    const out = [...c.update(AIM * 2 + 160), ...c.pointerUp(1, 0, 0, AIM * 2 + 170)];
    expect(types(out)).toEqual(['aimStart', 'aimCancel', 'quickShot']);
    expect((out[1] as Extract<ControlAction, { type: 'aimCancel' }>).reason).toBe('tap');
  });

  it('rejected when too slow, too far, across a possession change, or without the ball', () => {
    const cases: [number, number, string | null][] = [
      [TOUCH_TUNING.doubleTapGapMs + 200, 0, K],
      [100, th.doubleTapDistance + 5, K],
      [100, 0, 'H8#2'],
      [100, 0, 'H7#2'],
      [100, 0, null],
    ];
    for (const [gap, dist, key] of cases) {
      const c = new TouchControls(SHORT);
      press(c, 0, 0, 0);
      c.pointerUp(1, 0, 0, 50);
      press(c, dist, 0, 50 + gap, key);
      expect(types(c.pointerUp(1, dist, 0, 80 + gap)).filter((t) => KICKS.includes(t))).toEqual([]);
    }
  });

  it('a second press held long or dragged into an aim does not also quick-shoot', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    c.pointerUp(1, 0, 0, 50);
    press(c, 0, 0, 150);
    expect(types([...c.update(150 + AIM), ...c.pointerUp(1, 0, 0, 600)])).toEqual(['aimStart', 'aimCancel']);
    press(c, 0, 0, 700);
    c.pointerUp(1, 0, 0, 740);
    press(c, 0, 0, 800);
    expect(types(c.pointerMove(1, th.swipeCommit + 1, 0, 820))).toEqual(['dribble']);
    expect(types(c.pointerUp(1, th.swipeCommit + 1, 0, 830))).toEqual([]);
  });

  it('rapid tapping yields at most one quick shot per pair', () => {
    const c = new TouchControls(SHORT);
    const out: ControlAction[] = [];
    for (let i = 0; i < 20; i++) {
      press(c, 10, 10, i * 60);
      out.push(...c.pointerUp(1, 10, 10, i * 60 + 20));
    }
    expect(types(out).filter((t) => t === 'quickShot')).toHaveLength(10);
    expect(types(out).filter((t) => t !== 'quickShot')).toEqual([]);
  });
});

describe('TouchControls: ownership and interruptions', () => {
  it('extra fingers cannot alter the active gesture or add actions', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0, K, 1);
    expect(press(c, 300, 300, 10, K, 2)).toEqual([]);
    c.update(AIM);
    expect(c.pointerMove(2, -900, 0, 300)).toEqual([]);
    expect(c.pointerUp(2, -900, 0, 310)).toEqual([]);
    const up = c.pointerUp(1, -60, 0, 400);
    expect(types(up)).toEqual(['kick']);
    expect((up[0] as Extract<ControlAction, { type: 'kick' }>).dirX).toBeCloseTo(1);
    // Duplicate up (e.g. touch + compatibility mouse event) after release does nothing.
    expect(c.pointerUp(1, -60, 0, 410)).toEqual([]);
  });

  it('cancel clears everything; an old aim or tap never fires afterwards', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    c.update(AIM);
    expect(types(c.cancel('possession lost'))).toEqual(['aimCancel']);
    expect(c.state).toBe('idle');
    expect(c.pointerUp(1, -100, 0, 500)).toEqual([]);
    expect(c.cancel('again')).toEqual([]);
    press(c, 0, 0, 1000);
    c.pointerUp(1, 0, 0, 1050);
    c.cancel('blur');
    press(c, 0, 0, 1100);
    expect(c.pointerUp(1, 0, 0, 1150)).toEqual([]);
    press(c, 0, 0, 2000);
    c.update(2000 + AIM);
    expect(types(c.resize(800))).toEqual(['aimCancel']);
    expect(c.state).toBe('idle');
  });

  it('invalid coordinates never produce NaN actions', () => {
    const c = new TouchControls(SHORT);
    expect(press(c, Number.NaN, 0, 0)).toEqual([]);
    expect(c.state).toBe('idle');
    press(c, 0, 0, 0);
    c.update(AIM);
    expect(c.pointerMove(1, Number.POSITIVE_INFINITY, 0, 300)).toEqual([]);
    const up = c.pointerUp(1, Number.NaN, Number.NaN, 400);
    expect(types(up)).toEqual(['aimCancel']);
    const p = pullFor(Number.NaN, Number.POSITIVE_INFINITY, th);
    expect(p.inCancel).toBe(true);
    expect(Number.isFinite(p.dirX) && Number.isFinite(p.power)).toBe(true);
  });
});
