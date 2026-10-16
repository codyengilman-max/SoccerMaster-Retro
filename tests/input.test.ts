import { describe, expect, it } from 'vitest';
import { KEY_BINDINGS, pullFor, thresholdsFor, TOUCH_TUNING } from '../src/input';

const th = thresholdsFor(390);

describe('keyboard', () => {
  it('binds every menu/pause action; movement and actions belong to the joystick keys', () => {
    const intents = new Set(Object.values(KEY_BINDINGS));
    for (const intent of ['selectPass', 'selectShoot', 'retry', 'back']) expect(intents.has(intent as never), intent).toBe(true);
    for (const code of ['ArrowUp', 'KeyW', 'Space', 'KeyF']) expect(KEY_BINDINGS[code], code).toBeUndefined();
  });
});

describe('crossbar pull thresholds', () => {
  it('scale with the viewport short side and stay within min/max', () => {
    expect(thresholdsFor(100).maxPull).toBe(TOUCH_TUNING.maxPull.min);
    expect(thresholdsFor(5000).maxPull).toBe(TOUCH_TUNING.maxPull.max);
    expect(thresholdsFor(Number.NaN).maxPull).toBe(TOUCH_TUNING.maxPull.min);
    expect(th.maxPull).toBeGreaterThan(th.cancelRadius);
  });

  it('pull power grows from the cancel circle to maxPull and points opposite the drag', () => {
    expect(pullFor(0, th.cancelRadius - 1, th)).toMatchObject({ inCancel: true, power: 0 });
    const full = pullFor(0, th.maxPull * 2, th);
    expect(full.power).toBe(1);
    expect(full.dirY).toBeCloseTo(-1);
    expect(pullFor(Number.NaN, 5, th).power).toBe(0);
  });
});
