import { describe, expect, it } from 'vitest';
import { match, U11_9V9_PITCH } from '../src/game';
import { MATCH_TUNING } from '../src/game/match/tuning';
import { TouchControls, type ControlAction } from '../src/input';
import {
  BASELINE_VIEW,
  CameraController,
  DEFAULT_ZOOM,
  ZOOM_CHOICES,
  clampFocus,
  clipToRect,
  nextZoom,
  parseZoom,
  viewSpan,
  type CameraInput,
} from '../src/render/camera';
import { fitRegion, screenVectorToPitch, type PitchLayout } from '../src/render/layout';

const { MatchSim } = match;
const VIEW = { width: 844, height: 390 };
const SQUASH = 0.55;

/** Same framing math as MatchScene (landscape): span from the baseline / zoom, centred on a focus. */
function layoutAt(zoom: number, focus: { x: number; y: number }, viewport = VIEW): PitchLayout {
  const portrait = viewport.height > viewport.width;
  if (portrait) {
    const cross = viewSpan('portrait', zoom);
    const len = (cross * viewport.height) / viewport.width;
    return fitRegion(
      viewport,
      {
        x: focus.x - len / 2,
        y: focus.y - cross / 2,
        width: len,
        height: cross,
      },
      undefined,
      0,
      1,
    );
  }
  const len = viewSpan('landscape', zoom);
  const hv = (len * viewport.height) / (viewport.width * SQUASH);
  return fitRegion(viewport, { x: focus.x - len / 2, y: focus.y - hv / 2, width: len, height: hv }, undefined, 0, SQUASH);
}

const unit = (v: { x: number; y: number }) => {
  const n = Math.hypot(v.x, v.y);
  return { x: v.x / n, y: v.y / n };
};

describe('zoom choice', () => {
  it('derives every span from the fixed baseline, never from a previous zoom', () => {
    expect(DEFAULT_ZOOM).toBe(1.5);
    expect(viewSpan('landscape', 1.5)).toBeCloseTo(BASELINE_VIEW.landscapeLength / 1.5, 9);
    expect(viewSpan('portrait', 1.6)).toBeCloseTo(BASELINE_VIEW.portraitCross / 1.6, 9);
    // 50 "restarts/resizes": identical every time.
    const first = viewSpan('landscape', 1.4);
    for (let i = 0; i < 50; i++) expect(viewSpan('landscape', parseZoom(String(1.4)))).toBe(first);
  });

  it('rejects invalid stored or URL values to the default', () => {
    for (const bad of [null, undefined, '', 'abc', 'NaN', 'Infinity', '9', '0', '-1.5', '1.45', 1e9, Number.NaN, {}, '1.5x'])
      expect(parseZoom(bad)).toBe(DEFAULT_ZOOM);
    expect(parseZoom('1.4')).toBe(1.4);
    expect(parseZoom(1.6)).toBe(1.6);
    expect(ZOOM_CHOICES.map((z) => nextZoom(z))).toEqual([1.5, 1.6, 1.4]);
  });
});

describe('aiming is independent of the camera', () => {
  it('the same screen gesture gives the same world direction at every zoom and camera position', () => {
    for (const viewport of [VIEW, { width: 390, height: 844 }, { width: 568, height: 320 }]) {
      const ref = unit(
        screenVectorToPitch(layoutAt(1.5, { x: 30, y: 25 }, viewport), {
          x: 0.6,
          y: -0.8,
        }),
      );
      for (const z of ZOOM_CHOICES)
        for (const focus of [
          { x: 20, y: 10 },
          { x: 60, y: 40 },
        ]) {
          const d = unit(
            screenVectorToPitch(layoutAt(z, focus, viewport), {
              x: 0.6,
              y: -0.8,
            }),
          );
          expect(d.x).toBeCloseTo(ref.x, 9);
          expect(d.y).toBeCloseTo(ref.y, 9);
        }
    }
  });

  it('identical gestures across zooms produce the same kick and the same simulation result', () => {
    const run = (zoom: number) => {
      const sim = new MatchSim({ seed: 7 });
      sim.arrange((s) => match.stageLabScenario(s, 'through-ball', MATCH_TUNING.pitch));
      const tc = new TouchControls(Math.min(VIEW.width, VIEW.height));
      const L = layoutAt(zoom, { x: 40, y: 25 });
      const kicks: { x: number; y: number; power: number }[] = [];
      const apply = (acts: readonly ControlAction[]) => {
        for (const a of acts) {
          if (a.type === 'aimStart') sim.command({ type: 'aimStart' });
          if (a.type === 'aimMove' || a.type === 'kick') {
            const direction = a.inCancel ? null : screenVectorToPitch(L, { x: a.dirX, y: a.dirY });
            sim.command({ type: 'aimUpdate', direction, power: a.power });
            if (a.type === 'kick') {
              kicks.push({ ...unit(direction!), power: a.power });
              sim.command({ type: 'aimRelease' });
            }
          }
        }
      };
      const key = sim.state.ball.owner;
      apply(tc.pointerDown(1, 500, 200, 0, key));
      apply(tc.update(200));
      apply(tc.pointerMove(1, 440, 230, 260));
      apply(tc.pointerUp(1, 380, 250, 320));
      for (let i = 0; i < 120; i++) sim.step(1 / 60);
      const s = sim.state;
      return {
        kicks,
        ball: { ...s.ball.pos },
        owner: s.ball.owner,
        events: s.events.map((e) => `${e.type}:${e.by}`),
      };
    };
    const ref = run(1.5);
    expect(ref.kicks).toHaveLength(1);
    for (const z of [1.4, 1.6]) {
      const r = run(z);
      expect(r.kicks).toHaveLength(1);
      expect(r.kicks[0]!.x).toBeCloseTo(ref.kicks[0]!.x, 9);
      expect(r.kicks[0]!.y).toBeCloseTo(ref.kicks[0]!.y, 9);
      expect(r.kicks[0]!.power).toBe(ref.kicks[0]!.power);
      expect(r.ball.x).toBeCloseTo(ref.ball.x, 6);
      expect(r.ball.y).toBeCloseTo(ref.ball.y, 6);
      expect(r.owner).toBe(ref.owner);
      expect(r.events).toEqual(ref.events);
    }
  });
});

const input = (over: Partial<CameraInput> = {}): CameraInput => ({
  mode: 'possession',
  ball: { x: 30, y: 25 },
  ballVel: { x: 0, y: 0 },
  carrier: { x: 30, y: 25 },
  attackDir: 1,
  ...over,
});
const BOUNDS = { minX: 10, maxX: 65, minY: 8, maxY: 42 };

describe('camera controller', () => {
  it('is frame-rate independent', () => {
    const at = (fps: number) => {
      const c = new CameraController({ x: 20, y: 20 });
      for (let i = 0; i < fps; i++) c.update(input(), 1 / fps, BOUNDS);
      return c;
    };
    const a = at(60);
    const b = at(20);
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.15);
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.05);
  });

  it('a long frame hitch cannot jump, overshoot or produce NaN', () => {
    const c = new CameraController({ x: 20, y: 20 });
    c.update(input(), 5, BOUNDS);
    expect(c.x).toBeGreaterThan(20);
    expect(c.x).toBeLessThan(36);
    c.update(
      input({
        ball: { x: Number.NaN, y: 1 },
        carrier: { x: Number.POSITIVE_INFINITY, y: 0 },
      }),
      Number.NaN,
      BOUNDS,
    );
    c.update(input({ mode: 'loose', ball: { x: Number.NaN, y: 1 } }), 1 / 60, BOUNDS);
    expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
  });

  it('holds focus and look-ahead while aiming even if the carrier input moves', () => {
    const c = new CameraController({ x: 30, y: 25 });
    c.snap({ x: 30, y: 25 }, 1, BOUNDS);
    for (let i = 0; i < 30; i++) c.update(input(), 1 / 60, BOUNDS);
    const look = c.look;
    const first = c.update(input({ mode: 'aiming' }), 1 / 60, BOUNDS);
    let last = first;
    for (let i = 0; i < 120; i++)
      last = c.update(
        input({
          mode: 'aiming',
          carrier: { x: 30 + i * 0.1, y: 25 - i * 0.05 },
          attackDir: -1,
        }),
        1 / 60,
        BOUNDS,
      );
    expect(c.look).toBe(look);
    expect(Math.abs(last.x - first.x)).toBeLessThan(0.3);
    expect(Math.abs(last.y - first.y)).toBeLessThan(0.3);
  });

  it('does not move while held (paused / tactical moment)', () => {
    const c = new CameraController({ x: 30, y: 25 });
    for (let i = 0; i < 60; i++) c.update(input({ mode: 'hold', carrier: { x: 60, y: 5 } }), 1 / 60, BOUNDS);
    expect(c.x).toBe(30);
    expect(c.y).toBe(25);
  });

  it('a brief backward dribble keeps the attacking look-ahead', () => {
    const c = new CameraController({ x: 30, y: 25 });
    c.snap({ x: 30, y: 25 }, 1, BOUNDS);
    for (let i = 0; i < 60; i++) c.update(input({ carrier: { x: 30 - i * 0.08, y: 25 } }), 1 / 60, BOUNDS);
    expect(c.look).toBeCloseTo(6, 5);
  });

  it('rapid contested possession does not make the camera oscillate', () => {
    const c = new CameraController({ x: 35, y: 25 });
    c.snap({ x: 35, y: 25 }, 1, BOUNDS);
    const xs: number[] = [];
    for (let i = 0; i < 180; i++) {
      const dir = Math.floor(i / 6) % 2 === 0 ? 1 : -1;
      xs.push(c.update(input({ carrier: { x: 35, y: 25 }, attackDir: dir }), 1 / 60, BOUNDS).x);
    }
    const tail = xs.slice(60);
    expect(Math.max(...tail) - Math.min(...tail)).toBeLessThan(1.5);
  });

  it('follows the travelling ball with a capped lead, not a predicted receiver, and blends to an interceptor', () => {
    const c = new CameraController({ x: 30, y: 25 });
    const t = c.target(
      input({
        mode: 'travel',
        ball: { x: 32, y: 25 },
        ballVel: { x: 60, y: 0 },
      }),
    );
    expect(t.x).toBeCloseTo(32 + 7, 9);
    for (let i = 0; i < 30; i++)
      c.update(
        input({
          mode: 'travel',
          ball: { x: 32 + i * 0.3, y: 25 },
          ballVel: { x: 18, y: 0 },
        }),
        1 / 60,
        BOUNDS,
      );
    const before = c.x;
    // Interception: the opponent now carries the ball back the other way. No teleport.
    const after = c.update(input({ carrier: { x: 40, y: 30 }, attackDir: -1 }), 1 / 60, BOUNDS);
    expect(Math.abs(after.x - before)).toBeLessThan(1);
  });

  it('keeps the focus inside the framing limits at corners and goal lines', () => {
    const c = new CameraController({ x: 30, y: 25 });
    for (const corner of [
      { x: 0, y: 0 },
      { x: U11_9V9_PITCH.length, y: 0 },
      { x: 0, y: U11_9V9_PITCH.width },
      { x: U11_9V9_PITCH.length, y: U11_9V9_PITCH.width },
    ]) {
      for (let i = 0; i < 300; i++) c.update(input({ carrier: corner, attackDir: corner.x > 30 ? 1 : -1 }), 1 / 60, BOUNDS);
      expect(c.x).toBeGreaterThanOrEqual(BOUNDS.minX);
      expect(c.x).toBeLessThanOrEqual(BOUNDS.maxX);
      expect(c.y).toBeGreaterThanOrEqual(BOUNDS.minY);
      expect(c.y).toBeLessThanOrEqual(BOUNDS.maxY);
    }
    expect(clampFocus({ x: 5, y: 50 }, { minX: 30, maxX: 20, minY: 0, maxY: 10 })).toEqual({ x: 25, y: 10 });
  });
});

describe('off-screen aim guide', () => {
  const rect = { x: 8, y: 8, width: 828, height: 374 };
  it('keeps an on-screen endpoint and clips an off-screen one to the edge', () => {
    expect(clipToRect({ x: 100, y: 100 }, { x: 300, y: 200 }, rect)).toEqual({
      end: { x: 300, y: 200 },
      clipped: false,
    });
    const c = clipToRect({ x: 400, y: 200 }, { x: 1400, y: 200 }, rect);
    expect(c.clipped).toBe(true);
    expect(c.end.x).toBeCloseTo(836, 9);
    expect(c.end.y).toBeCloseTo(200, 9);
    const d = clipToRect({ x: 400, y: 200 }, { x: 400 - 1000, y: 200 - 1000 }, rect);
    expect(d.end.y).toBeCloseTo(8, 9);
    expect(d.end.x).toBeCloseTo(208, 9);
  });
});
