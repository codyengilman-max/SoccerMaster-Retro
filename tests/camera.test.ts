import { describe, expect, it } from 'vitest';
import { match, U11_9V9_PITCH } from '../src/game';
import { MATCH_TUNING } from '../src/game/match/tuning';
import {
  CAMERA_TUNING,
  CAMERA_VIEW,
  CameraController,
  clampFocus,
  clipToRect,
  viewSpan,
  type CameraInput,
} from '../src/render/camera';
import { depthScaleAt, fitRegion, fromScreen, screenVectorToPitch, toScreen, withPerspective, type PitchLayout } from '../src/render/layout';

const { MatchSim } = match;
const VIEW = { width: 844, height: 390 };
const SQUASH = CAMERA_VIEW.landscapeTilt;

/** Same framing math as MatchScene: the fixed close span, centred on a focus. */
function layoutAt(focus: { x: number; y: number }, viewport = VIEW): PitchLayout {
  const portrait = viewport.height > viewport.width;
  if (portrait) {
    const cross = viewSpan('portrait');
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
  const len = viewSpan('landscape');
  const hv = (len * viewport.height) / (viewport.width * SQUASH);
  return fitRegion(viewport, { x: focus.x - len / 2, y: focus.y - hv / 2, width: len, height: hv }, undefined, 0, SQUASH);
}

const unit = (v: { x: number; y: number }) => {
  const n = Math.hypot(v.x, v.y);
  return { x: v.x / n, y: v.y / n };
};

describe('close ball camera framing', () => {
  it('is one fixed, short-range span with a low (foreshortened, perspective) angle; nothing compounds', () => {
    // Shorter range than the old 40-yard baseline, with real perspective.
    expect(viewSpan('landscape')).toBe(CAMERA_VIEW.landscapeLength);
    expect(viewSpan('landscape')).toBeLessThan(40);
    expect(viewSpan('portrait')).toBeLessThan(28);
    expect(CAMERA_VIEW.landscapeTilt).toBeLessThan(1);
    expect(CAMERA_VIEW.perspective).toBeGreaterThan(0);
    const first = viewSpan('landscape');
    for (let i = 0; i < 50; i++) expect(viewSpan('landscape')).toBe(first);
  });

  it('frames the ball, not the carrier, led a little along its motion', () => {
    const c = new CameraController({ x: 30, y: 25 });
    const t = c.target(input({ ball: { x: 31, y: 24 }, carrier: { x: 30, y: 24 }, ballVel: { x: 4, y: 2 } }));
    expect(t.x).toBeGreaterThan(31);
    expect(t.x - 31).toBeLessThanOrEqual(CAMERA_TUNING.ballLeadMax);
    expect(t.y).toBeCloseTo(24 + 2 * CAMERA_TUNING.ballLead, 9);
    for (let i = 0; i < 120; i++) c.update(input({ ball: { x: 40, y: 20 }, carrier: { x: 39, y: 20 } }), 1 / 60, BOUNDS);
    expect(Math.hypot(c.x - 40, c.y - 20)).toBeLessThan(CAMERA_TUNING.lookAhead + 0.3);
  });
});

describe('aiming is independent of the camera', () => {
  it('the same screen gesture gives the same world direction at every camera position', () => {
    for (const viewport of [VIEW, { width: 390, height: 844 }, { width: 568, height: 320 }]) {
      const ref = unit(
        screenVectorToPitch(layoutAt({ x: 30, y: 25 }, viewport), {
          x: 0.6,
          y: -0.8,
        }),
      );
      for (const focus of [
          { x: 20, y: 10 },
          { x: 60, y: 40 },
        ]) {
          const d = unit(
            screenVectorToPitch(layoutAt(focus, viewport), {
              x: 0.6,
              y: -0.8,
            }),
          );
          expect(d.x).toBeCloseTo(ref.x, 9);
          expect(d.y).toBeCloseTo(ref.y, 9);
        }
    }
  });

  it('the same screen stick at different camera positions produces the same kick and the same simulation result', () => {
    const run = (focus: { x: number; y: number }) => {
      const sim = new MatchSim({ seed: 7 });
      sim.arrange((s) => match.stageLabScenario(s, 'through-ball', MATCH_TUNING.pitch));
      const L = layoutAt(focus);
      const kicks: { x: number; y: number; power: number }[] = [];
      for (let i = 0; i < Math.round((MATCH_TUNING.kickoff.countdownSeconds + 0.1) * 60); i++) sim.step(1 / 60);
      const direction = screenVectorToPitch(L, { x: 120 / 130, y: -50 / 130 });
      sim.command({ type: 'padMove', x: unit(direction).x, y: unit(direction).y });
      sim.command({ type: 'padPress', id: 1, action: 'pass' });
      for (let i = 0; i < 18; i++) sim.step(1 / 60);
      if (sim.command({ type: 'padRelease', id: 2, action: 'pass' })) kicks.push({ ...unit(direction), power: 0 });
      for (let i = 0; i < 120; i++) sim.step(1 / 60);
      const s = sim.state;
      return {
        kicks,
        ball: { ...s.ball.pos },
        owner: s.ball.owner,
        events: s.events.map((e) => `${e.type}:${e.by}`),
      };
    };
    const ref = run({ x: 40, y: 25 });
    expect(ref.kicks).toHaveLength(1);
    for (const f of [{ x: 20, y: 10 }, { x: 60, y: 40 }]) {
      const r = run(f);
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
    expect(c.look).toBeCloseTo(CAMERA_TUNING.lookAhead, 5);
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
    expect(t.x).toBeCloseTo(32 + CAMERA_TUNING.ballLeadMax, 9);
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

describe('low-camera perspective projection', () => {
  const flat = layoutAt({ x: 40, y: 25 });
  const anchor = toScreen(flat, { x: 40, y: 25 });
  const L = withPerspective(flat, anchor, CAMERA_VIEW.perspective / (VIEW.height / 2));

  it('is the identity at the anchor and round-trips through fromScreen', () => {
    const a = toScreen(L, { x: 40, y: 25 });
    expect(a.x).toBeCloseTo(anchor.x, 9);
    expect(a.y).toBeCloseTo(anchor.y, 9);
    expect(depthScaleAt(L, anchor.y)).toBe(1);
    for (const p of [{ x: 30, y: 15 }, { x: 52, y: 33 }, { x: 41, y: 20 }]) {
      const back = fromScreen(L, toScreen(L, p));
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it('draws the far side narrower and smaller than the near side, and keeps pitch lines straight', () => {
    const far = [toScreen(L, { x: 30, y: 15 }), toScreen(L, { x: 50, y: 15 })];
    const near = [toScreen(L, { x: 30, y: 35 }), toScreen(L, { x: 50, y: 35 })];
    expect(far[1]!.x - far[0]!.x).toBeLessThan(near[1]!.x - near[0]!.x);
    expect(depthScaleAt(L, far[0]!.y)).toBeLessThan(1);
    expect(depthScaleAt(L, near[0]!.y)).toBeGreaterThan(1);
    // A touchline-to-touchline line stays straight: its midpoint lies on the projected segment.
    const a = toScreen(L, { x: 35, y: 15 });
    const b = toScreen(L, { x: 45, y: 35 });
    const m = toScreen(L, { x: 40, y: 25 });
    const cross = (b.x - a.x) * (m.y - a.y) - (b.y - a.y) * (m.x - a.x);
    expect(Math.abs(cross)).toBeLessThan(1e-6 * Math.hypot(b.x - a.x, b.y - a.y) ** 2 + 1e-6);
  });

  it('the joystick direction at the ball is unchanged by perspective', () => {
    for (const v of [{ x: 1, y: 0 }, { x: 0.6, y: -0.8 }, { x: -0.3, y: 0.95 }]) {
      const a = unit(screenVectorToPitch(flat, v));
      const b = unit(screenVectorToPitch(L, v));
      expect(b.x).toBeCloseTo(a.x, 9);
      expect(b.y).toBeCloseTo(a.y, 9);
    }
  });
});

describe('regular-match sideline camera tuning', () => {
  it('a small ball offset inside the dead zone leaves the camera still; beyond it the camera follows smoothly', async () => {
    const { CameraController, SIDELINE_TUNING } = await import('../src/render/camera');
    const c = new CameraController({ x: 30, y: 25 }, { ...SIDELINE_TUNING, lookAhead: 0 });
    const still = { mode: 'loose' as const, ball: { x: 31, y: 25.5 }, ballVel: { x: 0, y: 0 }, carrier: null, attackDir: 1 as const };
    for (let i = 0; i < 30; i++) c.update(still, 1 / 60);
    expect(c.x).toBeCloseTo(30, 6);
    expect(c.y).toBeCloseTo(25, 6);
    const far = { ...still, ball: { x: 40, y: 25 } };
    let prev = c.x;
    for (let i = 0; i < 60; i++) {
      c.update(far, 1 / 60);
      expect(c.x - prev).toBeLessThan(0.5);
      prev = c.x;
    }
    expect(c.x).toBeGreaterThan(33);
    expect(c.x).toBeLessThan(40 - SIDELINE_TUNING.deadZoneX + 1e-6);
  });

  it('still settles exactly on a length limit, so a goal at the end is fully framed despite the dead zone', async () => {
    const { CameraController, SIDELINE_TUNING } = await import('../src/render/camera');
    const bounds = { minX: 18, maxX: 57, minY: 25, maxY: 25 };
    const c = new CameraController({ x: 40, y: 25 }, { ...SIDELINE_TUNING, lookAhead: 0 });
    const goal = { mode: 'loose' as const, ball: { x: 74, y: 25 }, ballVel: { x: 0, y: 0 }, carrier: null, attackDir: 1 as const };
    for (let i = 0; i < 600; i++) c.update(goal, 1 / 60, bounds);
    expect(c.x).toBeCloseTo(57, 3);
    for (let i = 0; i < 600; i++) c.update({ ...goal, ball: { x: 1, y: 25 } }, 1 / 60, bounds);
    expect(c.x).toBeCloseTo(18, 3);
  });

  it('portrait regular matches keep the close camera tuning; only the landscape sideline view uses the dead zone', async () => {
    const { cameraTuningFor, CAMERA_TUNING, SIDELINE_TUNING } = await import('../src/render/camera');
    expect(cameraTuningFor(true, false)).toBe(SIDELINE_TUNING);
    expect(cameraTuningFor(true, true)).toBe(CAMERA_TUNING);
    expect(cameraTuningFor(false, false)).toBe(CAMERA_TUNING);
    expect(cameraTuningFor(false, true)).toBe(CAMERA_TUNING);
  });

  it('keeps the same sideline: tuning never changes zoom or rotation, only the focus', async () => {
    const { SIDELINE_VIEW, CAMERA_VIEW } = await import('../src/render/camera');
    expect(SIDELINE_VIEW.landscapeLength).toBeGreaterThan(CAMERA_VIEW.landscapeLength);
    expect(SIDELINE_VIEW.landscapeTilt).toBeGreaterThan(CAMERA_VIEW.landscapeTilt);
    expect(SIDELINE_VIEW.perspective).toBeLessThan(CAMERA_VIEW.perspective);
  });
});
