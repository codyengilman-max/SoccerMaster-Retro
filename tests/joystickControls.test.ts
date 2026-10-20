import { describe, expect, it } from 'vitest';
import {
  ACTION_BUTTONS,
  DEFAULT_PREFS,
  JoystickControls,
  NONE_AVAILABLE,
  padLayout,
  stickVector,
  validatePrefs,
  type Availability,
  type PadEvent,
} from '../src/input/joystickControls';

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const L = padLayout(844, 390, NO_INSETS, DEFAULT_PREFS);
const ALL: Availability = { pass: true, shoot: true, slide: true, block: true };
const ATTACK: Availability = { pass: true, shoot: true, slide: false, block: false };
const kinds = (e: PadEvent[]) => e.map((x) => (x.type === 'move' ? 'move' : `${x.type}:${x.action}`));
const at = (b: keyof typeof L.buttons) => L.buttons[b];

function pad(a: Availability = ATTACK): JoystickControls {
  const c = new JoystickControls(L);
  c.setAvailable(a);
  return c;
}

describe('stick vector (A01)', () => {
  it('diagonal full deflection is never longer than straight full deflection', () => {
    const straight = stickVector(200, 0, 80, 0.12);
    const diag = stickVector(200, 200, 80, 0.12);
    expect(Math.hypot(straight.x, straight.y)).toBeCloseTo(1);
    expect(Math.hypot(diag.x, diag.y)).toBeCloseTo(1);
  });
  it('the radial dead zone gives zero and the remaining range scales smoothly from zero', () => {
    expect(stickVector(80 * 0.11, 0, 80, 0.12)).toEqual({ x: 0, y: 0 });
    const just = stickVector(80 * 0.13, 0, 80, 0.12);
    expect(just.x).toBeGreaterThan(0);
    expect(just.x).toBeLessThan(0.02);
    expect(stickVector(80 * 0.56, 0, 80, 0.12).x).toBeCloseTo(0.5);
  });
  it('rejects non-finite input', () => {
    expect(stickVector(NaN, 1, 80, 0.12)).toEqual({ x: 0, y: 0 });
    expect(stickVector(1, Infinity, 80, 0.12)).toEqual({ x: 0, y: 0 });
  });
});

describe('ownership (A05, A06, A08, A09)', () => {
  it('A05: dragging from Pass across Shoot and releasing there still releases Pass', () => {
    const c = pad();
    expect(kinds(c.pointerDown(1, at('pass').x, at('pass').y))).toEqual(['press:pass']);
    c.pointerMove(1, at('shoot').x, at('shoot').y);
    expect(kinds(c.pointerUp(1))).toEqual(['release:pass']);
  });
  it('A06: a cancelled touch produces a cancel, never a release, and a later lift does nothing', () => {
    const c = pad();
    c.pointerDown(1, at('shoot').x, at('shoot').y);
    expect(kinds(c.pointerCancel(1))).toEqual(['cancel:shoot']);
    expect(c.pointerUp(1)).toEqual([]);
    c.pointerDown(2, at('pass').x, at('pass').y);
    expect(kinds(c.cancelAll('hidden'))).toEqual(['cancel:pass']);
    expect(c.pointerUp(2)).toEqual([]);
  });
  it('A08: a touch that began on a disabled button stays inert when the button becomes available', () => {
    const c = pad({ ...NONE_AVAILABLE });
    expect(c.pointerDown(1, at('pass').x, at('pass').y)).toEqual([]);
    expect(c.setAvailable(ATTACK)).toEqual([]);
    expect(c.pressed).toBeNull();
    expect(c.pointerUp(1)).toEqual([]);
  });
  it('A08: a held action that becomes unavailable is cancelled, and lifting it then does nothing', () => {
    const c = pad();
    c.pointerDown(1, at('pass').x, at('pass').y);
    expect(kinds(c.setAvailable({ ...ATTACK, pass: false }))).toEqual(['cancel:pass']);
    c.setAvailable(ATTACK);
    expect(c.pointerUp(1)).toEqual([]);
  });
  it('A09: a second action finger is ignored, not queued, and repeated downs on one id add nothing', () => {
    const c = pad(ALL);
    expect(kinds(c.pointerDown(1, at('pass').x, at('pass').y))).toEqual(['press:pass']);
    expect(c.pointerDown(1, at('pass').x, at('pass').y)).toEqual([]);
    expect(c.pointerDown(2, at('shoot').x, at('shoot').y)).toEqual([]);
    expect(kinds(c.pointerUp(1))).toEqual(['release:pass']);
    expect(c.pointerUp(2)).toEqual([]);
    expect(c.pointerUp(1)).toEqual([]);
  });
  it('two thumbs: the stick keeps moving while an action is held, and a second stick finger is ignored', () => {
    const c = pad();
    const z = L.stickZone;
    c.pointerDown(5, z.x + 60, z.y + z.height - 60);
    c.pointerDown(1, at('pass').x, at('pass').y);
    expect(kinds(c.pointerMove(5, z.x + 60 + L.stick.r, z.y + z.height - 60))).toEqual(['move']);
    expect(c.stick.x).toBeCloseTo(1);
    expect(c.pointerDown(6, z.x + 30, z.y + z.height - 30)).toEqual([]);
    expect(c.pointerMove(6, z.x + 300, z.y)).toEqual([]);
    expect(kinds(c.pointerUp(1))).toEqual(['release:pass']);
    expect(c.stick.x).toBeCloseTo(1);
    expect(kinds(c.pointerUp(5))).toEqual(['move']);
    expect(c.stick).toEqual({ x: 0, y: 0 });
  });
  it('rebuilding the layout cancels everything with no release', () => {
    const c = pad();
    c.pointerDown(1, at('shoot').x, at('shoot').y);
    expect(kinds(c.setLayout(padLayout(390, 844, NO_INSETS, DEFAULT_PREFS)))).toEqual(['cancel:shoot']);
    expect(c.pointerUp(1)).toEqual([]);
  });
});

describe('layout (A20)', () => {
  const sizes: [number, number][] = [[844, 390], [667, 375], [932, 430], [568, 320], [1280, 720], [390, 844]];
  const insets = [NO_INSETS, { top: 0, right: 47, bottom: 21, left: 47 }];
  for (const [w, h] of sizes)
    for (const ins of insets)
      for (const size of [0.8, 1, 1.3])
        it(`${w}x${h} insets ${ins.left}/${ins.bottom} size ${size}: on screen, clear of insets, no overlaps`, () => {
          const l = padLayout(w, h, ins, { ...DEFAULT_PREFS, size });
          const circles = [l.stick, ...ACTION_BUTTONS.map((b) => l.buttons[b])];
          for (const c of circles) {
            expect(c.x - c.r).toBeGreaterThanOrEqual(ins.left);
            expect(c.x + c.r).toBeLessThanOrEqual(w - ins.right);
            expect(c.y - c.r).toBeGreaterThanOrEqual(ins.top);
            expect(c.y + c.r).toBeLessThanOrEqual(h - ins.bottom);
          }
          for (let i = 0; i < circles.length; i++)
            for (let j = i + 1; j < circles.length; j++) {
              const a = circles[i]!;
              const b = circles[j]!;
              expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
            }
          expect(l.buttons.block.x).toBeLessThan(l.buttons.shoot.x);
          expect(l.buttons.slide.x).toBeLessThan(l.buttons.pass.x);
          expect(l.buttons.shoot.y).toBeLessThan(l.buttons.pass.y);
        });
});

describe('preferences (A22)', () => {
  it('invalid, missing or out-of-range values reset to safe defaults; valid ones are kept', () => {
    expect(validatePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(validatePrefs('x')).toEqual(DEFAULT_PREFS);
    expect(validatePrefs({ size: NaN, opacity: 5, deadZone: -1 })).toEqual(DEFAULT_PREFS);
    expect(validatePrefs({ size: 1.2, opacity: 0.4, deadZone: 0.2 })).toEqual({ size: 1.2, opacity: 0.4, deadZone: 0.2 });
    expect(validatePrefs({ size: '1.2' })).toEqual(DEFAULT_PREFS);
  });
});

describe('hold modifier (Jungle Ball TURBO)', () => {
  const ALL: Availability = { pass: true, shoot: true, slide: true, block: true };
  const at = (b: 'pass' | 'block' | 'slide' | 'shoot'): [number, number] => [L.buttons[b].x, L.buttons[b].y];
  it('a held modifier does not block a second action finger, and each lifts independently', () => {
    const c = new JoystickControls(L);
    c.setModifier('pass');
    c.setAvailable(ALL);
    expect(c.pointerDown(1, ...at('pass'))).toEqual([{ type: 'press', action: 'pass' }]);
    expect(c.pointerDown(2, ...at('block'))).toEqual([{ type: 'press', action: 'block' }]);
    expect(c.modifierHeld).toBe(true);
    expect(c.pointerUp(2)).toEqual([{ type: 'release', action: 'block' }]);
    expect(c.pointerDown(3, ...at('slide'))).toEqual([{ type: 'press', action: 'slide' }]);
    expect(c.pointerUp(1)).toEqual([{ type: 'release', action: 'pass' }]);
    expect(c.pressed).toBe('slide');
  });
  it('a second finger on the modifier is ignored; cancelAll and unavailability cancel it', () => {
    const c = new JoystickControls(L);
    c.setModifier('pass');
    c.setAvailable(ALL);
    c.pointerDown(1, ...at('pass'));
    expect(c.pointerDown(2, ...at('pass'))).toEqual([]);
    expect(c.cancelAll('blur')).toEqual([{ type: 'cancel', action: 'pass', reason: 'blur' }]);
    expect(c.pointerDown(1, ...at('pass'))).toEqual([]);
    c.pointerUp(1);
    c.pointerUp(2);
    c.pointerDown(4, ...at('pass'));
    expect(c.setAvailable({ ...ALL, pass: false })).toEqual([{ type: 'cancel', action: 'pass', reason: 'unavailable' }]);
    expect(c.pointerUp(4)).toEqual([]);
  });
  it('without a modifier the single action slot is unchanged', () => {
    const c = new JoystickControls(L);
    c.setAvailable(ALL);
    c.pointerDown(1, ...at('pass'));
    expect(c.pointerDown(2, ...at('block'))).toEqual([]);
  });
});
