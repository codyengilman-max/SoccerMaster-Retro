import { describe, expect, it } from 'vitest';
import { pullFor, thresholdsFor, TOUCH_TUNING, TouchControls, type ControlAction } from '../src/input/touchControls';

const SHORT = 390;
const K = 'H7#1';
const th = thresholdsFor(SHORT);
const types = (a: readonly ControlAction[]): string[] => a.map((x) => x.type);

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
  });
});

describe('TouchControls arbitration', () => {
  it('swipe then hold stays a dribble: exactly one dribble, never an aim', () => {
    const c = new TouchControls(SHORT);
    press(c, 100, 100, 0);
    const out = [...c.pointerMove(1, 100 + th.swipeCommit + 2, 100, 60), ...c.update(1000), ...c.pointerMove(1, 100, 100, 1100), ...c.pointerUp(1, 100, 100, 1200)];
    expect(types(out)).toEqual(['dribble']);
  });

  it('a slow short drag below the commit distance dribbles on release, a tiny wobble does nothing', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0, null);
    c.pointerMove(1, th.holdSlop + 1, 0, 50);
    expect(types(c.pointerUp(1, th.swipeMin + 1, 0, 120))).toEqual(['dribble']);
    press(c, 0, 0, 500, null);
    expect(types(c.pointerUp(1, th.holdSlop + 1, 0, 600))).toEqual([]);
  });

  it('hold then drag produces exactly one kick on release, opposite the drag, power capped', () => {
    const c = new TouchControls(SHORT);
    press(c, 200, 200, 0);
    expect(types(c.update(TOUCH_TUNING.holdMs))).toEqual(['aimStart']);
    expect(c.state).toBe('aiming');
    const moves = c.pointerMove(1, 200 - 5000, 200, 300);
    expect(types(moves)).toEqual(['aimMove']);
    const up = c.pointerUp(1, 200 - 5000, 200, 400);
    expect(types(up)).toEqual(['kick']);
    const kick = up[0] as Extract<ControlAction, { type: 'kick' }>;
    expect(kick.power).toBe(1);
    expect(kick.dirX).toBeCloseTo(1);
    expect(kick.dirY).toBeCloseTo(0);
    expect(types(c.pointerUp(1, 0, 0, 500))).toEqual([]);
  });

  it('short pull is a soft kick, returning inside the cancel circle cancels', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    c.update(TOUCH_TUNING.holdMs);
    const soft = c.pointerUp(1, 0, th.cancelRadius + 10, 300)[0] as Extract<ControlAction, { type: 'kick' }>;
    expect(soft.type).toBe('kick');
    expect(soft.power).toBeGreaterThan(0);
    expect(soft.power).toBeLessThan(0.2);
    press(c, 0, 0, 1000);
    c.update(1000 + TOUCH_TUNING.holdMs);
    c.pointerMove(1, 0, th.maxPull, 1100);
    expect(types(c.pointerUp(1, 1, 1, 1200))).toEqual(['aimCancel']);
  });

  it('hold away from the carrier does nothing', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0, null);
    expect(c.update(TOUCH_TUNING.holdMs)).toEqual([]);
    expect(types(c.pointerUp(1, -200, 0, 500))).toEqual([]);
  });

  it('single tap does nothing; double tap on the same carrier gives one feint', () => {
    const c = new TouchControls(SHORT);
    press(c, 50, 50, 0);
    expect(c.pointerUp(1, 50, 50, 80)).toEqual([]);
    press(c, 52, 51, 200);
    expect(types(c.pointerUp(1, 52, 51, 260))).toEqual(['feint']);
    // A third tap starts a fresh pair; it does not chain into another feint.
    press(c, 52, 51, 330);
    expect(c.pointerUp(1, 52, 51, 380)).toEqual([]);
  });

  it('double tap rejected when too slow, too far, on another carrier, or away from the carrier', () => {
    const cases: [number, number, string | null][] = [
      [TOUCH_TUNING.doubleTapGapMs + 200, 0, K],
      [100, th.doubleTapDistance + 5, K],
      [100, 0, 'H8#2'],
      [100, 0, null],
    ];
    for (const [gap, dist, key] of cases) {
      const c = new TouchControls(SHORT);
      press(c, 0, 0, 0);
      c.pointerUp(1, 0, 0, 50);
      press(c, dist, 0, 50 + gap, key);
      expect(c.pointerUp(1, dist, 0, 80 + gap)).toEqual([]);
    }
  });

  it('second press held long enough to aim does not also feint', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    c.pointerUp(1, 0, 0, 50);
    press(c, 0, 0, 150);
    const out = [...c.update(150 + TOUCH_TUNING.holdMs), ...c.pointerUp(1, 0, 0, 600)];
    expect(types(out)).toEqual(['aimStart', 'aimCancel']);
  });

  it('extra fingers cannot alter the active gesture or add actions', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0, K, 1);
    expect(press(c, 300, 300, 10, K, 2)).toEqual([]);
    c.update(TOUCH_TUNING.holdMs);
    expect(c.pointerMove(2, -900, 0, 300)).toEqual([]);
    expect(c.pointerUp(2, -900, 0, 310)).toEqual([]);
    const up = c.pointerUp(1, -60, 0, 400);
    expect(types(up)).toEqual(['kick']);
    expect((up[0] as Extract<ControlAction, { type: 'kick' }>).dirX).toBeCloseTo(1);
  });

  it('cancel clears everything; an old aim never fires afterwards', () => {
    const c = new TouchControls(SHORT);
    press(c, 0, 0, 0);
    c.update(TOUCH_TUNING.holdMs);
    expect(types(c.cancel('possession lost'))).toEqual(['aimCancel']);
    expect(c.state).toBe('idle');
    expect(c.pointerUp(1, -100, 0, 500)).toEqual([]);
    expect(c.cancel('again')).toEqual([]);
    // A tap before an interruption does not pair with one after it.
    press(c, 0, 0, 1000);
    c.pointerUp(1, 0, 0, 1050);
    c.cancel('blur');
    press(c, 0, 0, 1100);
    expect(c.pointerUp(1, 0, 0, 1150)).toEqual([]);
  });

  it('invalid coordinates never produce NaN actions', () => {
    const c = new TouchControls(SHORT);
    expect(press(c, Number.NaN, 0, 0)).toEqual([]);
    expect(c.state).toBe('idle');
    press(c, 0, 0, 0);
    c.update(TOUCH_TUNING.holdMs);
    expect(c.pointerMove(1, Number.POSITIVE_INFINITY, 0, 300)).toEqual([]);
    const up = c.pointerUp(1, Number.NaN, Number.NaN, 400);
    expect(types(up)).toEqual(['aimCancel']);
    const p = pullFor(Number.NaN, Number.POSITIVE_INFINITY, th);
    expect(p.inCancel).toBe(true);
    expect(Number.isFinite(p.dirX) && Number.isFinite(p.power)).toBe(true);
  });
});
