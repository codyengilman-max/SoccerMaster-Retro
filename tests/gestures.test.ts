import { describe, expect, it } from 'vitest';
import { GESTURE_TUNING, GestureRecognizer, KeyboardAim, KEY_BINDINGS, type Gesture } from '../src/input';

const T = GESTURE_TUNING;
const types = (gs: Gesture[]): string[] => gs.map((g) => g.type);

describe('swipe vs hold-to-aim', () => {
  it('a quick swipe that starts on the player is a swipe, never an aim', () => {
    const r = new GestureRecognizer();
    r.pointerDown(1, 100, 100, 0, true);
    const out = [...r.pointerMove(1, 100, 80, 40), ...r.update(60), ...r.pointerMove(1, 100, 40, 90)];
    expect(types(out)).toEqual(['swipe']);
    expect(out[0]).toMatchObject({ dx: 0, dy: -60 });
    expect(types([...r.update(400), ...r.pointerUp(1, 100, 30, 420)])).toEqual([]);
  });

  it('a short fast flick released early still counts as a swipe', () => {
    const r = new GestureRecognizer();
    r.pointerDown(1, 0, 0, 0, false);
    expect(types(r.pointerUp(1, T.swipeMinPx + 2, 0, 120))).toEqual(['swipe']);
  });

  it('hold near the player then drag aims, and release reports drag and power', () => {
    const r = new GestureRecognizer();
    r.pointerDown(1, 200, 200, 0, true);
    expect(types(r.update(T.holdMs - 1))).toEqual([]);
    expect(types(r.update(T.holdMs))).toEqual(['aimStart']);
    const move = r.pointerMove(1, 200 - T.aimMaxDragPx, 200, T.holdMs + 300);
    expect(move[0]).toMatchObject({ type: 'aimMove', valid: true, power: 1 });
    const up = r.pointerUp(1, 150, 200, T.holdMs + 600);
    expect(up[0]).toMatchObject({ type: 'aimRelease', dragX: -50, valid: true });
    expect(r.state).toBe('idle');
  });

  it('a hold far from the player does not aim', () => {
    const r = new GestureRecognizer();
    r.pointerDown(1, 500, 300, 0, false);
    expect(types(r.update(T.holdMs + 10))).toEqual(['holdTooFar']);
    expect(types(r.pointerMove(1, 400, 300, T.holdMs + 200))).toEqual([]);
    expect(types(r.pointerUp(1, 400, 300, T.holdMs + 250))).toEqual([]);
  });

  it('a slow drag that moved before the hold time is neither an aim nor a swipe', () => {
    const r = new GestureRecognizer();
    r.pointerDown(1, 100, 100, 0, true);
    const out = [
      ...r.pointerMove(1, 100 + T.holdSlopPx + 2, 100, 100),
      ...r.update(T.holdMs + 50),
      ...r.pointerMove(1, 160, 100, T.swipeMaxMs + 200),
      ...r.pointerUp(1, 170, 100, T.swipeMaxMs + 300),
    ];
    expect(types(out)).toEqual([]);
  });

  it('releasing a hold without dragging is an invalid aim (caller cancels)', () => {
    const r = new GestureRecognizer();
    r.pointerDown(1, 0, 0, 0, true);
    const up = r.pointerUp(1, 3, 2, T.holdMs + 100);
    expect(types(up)).toEqual(['aimStart', 'aimRelease']);
    expect(up[1]).toMatchObject({ valid: false, power: 0 });
  });

  it('cancel during an aim emits aimCancel and leaves the recognizer idle', () => {
    const r = new GestureRecognizer();
    r.pointerDown(1, 0, 0, 0, true);
    r.update(T.holdMs);
    expect(types(r.cancel('pointercancel'))).toEqual(['aimCancel']);
    expect(r.state).toBe('idle');
    expect(types(r.pointerUp(1, -80, 0, 500))).toEqual([]);
    expect(types(r.cancel('again'))).toEqual([]);
  });

  it('ignores a second finger while the first is down', () => {
    const r = new GestureRecognizer();
    r.pointerDown(1, 0, 0, 0, true);
    expect(r.pointerDown(2, 300, 300, 10, false)).toEqual([]);
    expect(types(r.pointerMove(2, 300, 200, 40))).toEqual([]);
    expect(types(r.update(T.holdMs))).toEqual(['aimStart']);
  });
});

describe('keyboard', () => {
  it('binds every core action', () => {
    const intents = new Set(Object.values(KEY_BINDINGS));
    for (const intent of ['up', 'down', 'left', 'right', 'aim', 'toggleAction', 'selectPass', 'selectShoot', 'retry', 'back']) {
      expect(intents.has(intent as never), intent).toBe(true);
    }
  });

  it('keyboard aim turns and changes power within bounds', () => {
    const aim = new KeyboardAim(0, 0.5);
    aim.update(1, { left: false, right: true, up: true, down: false });
    expect(aim.angle).toBeGreaterThan(0);
    expect(aim.power).toBe(1);
    aim.update(5, { left: false, right: false, up: false, down: true });
    expect(aim.power).toBe(0);
  });
});
