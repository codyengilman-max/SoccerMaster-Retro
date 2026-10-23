import { describe, expect, it } from 'vitest';
import { CROSSBAR, describeShot, idealPower, simulateShot } from '../src/game/story/crossbar';
import { ballSprite, CROSSBAR_BACKDROP, crossbarView, goalGeometry } from '../src/render/crossbarView';

const STAGES = [
  { x: 0, y: 56, width: 390, height: 650 }, // phone portrait
  { x: 0, y: 56, width: 844, height: 250 }, // phone landscape
  { x: 0, y: 56, width: 1280, height: 560 }, // desktop
];

describe('crossbar view (shared render/collision geometry)', () => {
  for (const st of STAGES) {
    it(`${st.width}x${st.height}: one grounded goal on the grass, under the roofline, ball spot on stage`, () => {
      const v = crossbarView(st);
      const g = goalGeometry(v);
      const b = v.backdrop;
      const grass = b.y + CROSSBAR_BACKDROP.grassLine * CROSSBAR_BACKDROP.height * b.scale;
      const roof = b.y + CROSSBAR_BACKDROP.roofLine * CROSSBAR_BACKDROP.height * b.scale;
      expect(grass).toBeCloseTo(v.horizon, 6);
      // Both post bases stand on the grass; the bar joins the post tops and stays below the school roof.
      expect(g.leftBase.y).toBeGreaterThan(grass);
      expect(g.rightBase.y).toBeCloseTo(g.leftBase.y, 6);
      expect(g.leftTop.y).toBeCloseTo(g.rightTop.y, 6);
      expect(g.leftTop.y).toBeGreaterThan(roof);
      expect(g.leftTop.x).toBeCloseTo(g.leftBase.x, 6);
      // The whole goal and the spot fit inside the stage; the backdrop covers it.
      expect(g.leftBase.x).toBeGreaterThanOrEqual(st.x);
      expect(g.rightBase.x).toBeLessThanOrEqual(st.x + st.width);
      expect(g.spot.y).toBeLessThan(st.y + st.height);
      expect(g.spot.y).toBeGreaterThan(g.leftBase.y);
      expect(b.x).toBeLessThanOrEqual(st.x + 1e-6);
      expect(b.y).toBeLessThanOrEqual(st.y + 1e-6);
      expect(b.x + CROSSBAR_BACKDROP.width * b.scale).toBeGreaterThanOrEqual(st.x + st.width - 1e-6);
      expect(b.y + CROSSBAR_BACKDROP.height * b.scale).toBeGreaterThanOrEqual(st.y + st.height - 1e-6);
      // The diagnostic band is the simulation's bar test, projected: the drawn bar line is inside it.
      expect(g.barBand.top).toBeLessThan(g.leftTop.y);
      expect(g.barBand.bottom).toBeGreaterThan(g.leftTop.y);
    });
  }

  it('a scoring shot meets the drawn bar: its contact point projects inside the bar band, between the posts', () => {
    const r = simulateShot({ dirX: 0, dirY: 1, power: idealPower() });
    expect(r.contact).toBe('bar');
    const at = r.path[r.path.length - 1]!;
    for (const st of STAGES) {
      const v = crossbarView(st);
      const g = goalGeometry(v);
      const p = v.proj(at[0], CROSSBAR.spotDistance, at[2]);
      expect(p.y).toBeGreaterThanOrEqual(g.barBand.top - 1e-6);
      expect(p.y).toBeLessThanOrEqual(g.barBand.bottom + 1e-6);
      expect(p.x).toBeGreaterThan(g.leftTop.x);
      expect(p.x).toBeLessThan(g.rightTop.x);
    }
  });
});

describe('crossbar shot outcome words', () => {
  it('bar, under, over, wide and post come from the actual first contact / goal-plane crossing', () => {
    const ip = idealPower();
    expect(describeShot(simulateShot({ dirX: 0, dirY: 1, power: ip }))).toBe('bar');
    expect(describeShot(simulateShot({ dirX: 0, dirY: 1, power: Math.max(0, ip - 0.2) }))).toMatch(/under|short/);
    expect(describeShot(simulateShot({ dirX: 0, dirY: 1, power: Math.min(1, ip + 0.25) }))).toBe('over');
    expect(describeShot(simulateShot({ dirX: 0.45, dirY: 1, power: ip }))).toBe('wide');
    // Sweep the aim across the left post at the ideal power: some aim hits the post, which never scores.
    const post = Array.from({ length: 400 }, (_, i) => simulateShot({ dirX: -0.2 - i * 0.0005, dirY: 1, power: ip })).find((r) => r.contact === 'post');
    expect(post && describeShot(post)).toBe('post');
    expect(post?.scored).toBe(false);
  });
});

describe('what the player sees matches the score (owner report: "crossbar challenge not recognizing our players made shots")', () => {
  // StoryScene's crossbar stage: the area above the dialogue panel, below the top bar.
  const scene = (w: number, h: number) => {
    const stageH = h - Math.round(h >= w ? h * 0.5 : h * 0.46) - 10;
    return crossbarView({ x: 0, y: 58, width: w, height: Math.max(80, stageH - 64) }, { x: 0, y: 0, width: w, height: stageH });
  };
  const VIEWS = [[393, 660], [390, 844], [844, 390], [1280, 720]] as const;
  const shots = Array.from({ length: 801 }, (_, i) => i / 800).flatMap((power) => [-0.15, 0, 0.1].map((dirX) => ({ dirX, dirY: 1, power })));
  /** Ball position where the flight meets the goal line (the net contact itself, or the crossing for an over/wide shot). */
  const atGoalLine = (path: readonly (readonly [number, number, number])[]): readonly [number, number, number] | null => {
    const gy = CROSSBAR.spotDistance;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      if (a[1] <= gy && b[1] >= gy) {
        const f = b[1] === a[1] ? 1 : (gy - a[1]) / (b[1] - a[1]);
        return [a[0] + (b[0] - a[0]) * f, gy, a[2] + (b[2] - a[2]) * f];
      }
    }
    return null;
  };

  for (const [w, h] of VIEWS) {
    it(`${w}x${h}: a ball drawn touching the bar is a point, and a miss is never drawn touching it`, () => {
      const v = scene(w, h);
      const g = goalGeometry(v);
      const barHalf = g.barWidth / 2;
      // Half a pixel either way: the drawn ball and bar are flat discs/lines approximating a sphere and a cylinder.
      const SUBPIXEL = 0.5;
      const touches = (at: readonly [number, number, number]) => {
        const b = ballSprite(v, at);
        return b.x >= g.leftTop.x && b.x <= g.rightTop.x && Math.abs(b.y - g.leftTop.y) <= b.r + barHalf + SUBPIXEL;
      };
      let scored = 0;
      let missed = 0;
      for (const k of shots) {
        const r = simulateShot(k);
        if (r.scored) {
          scored++;
          expect(touches(r.path[r.path.length - 1]!), `scored ${JSON.stringify(k)}`).toBe(true);
          continue;
        }
        missed++;
        const at = atGoalLine(r.path);
        if (!at) continue;
        const b = ballSprite(v, at);
        const inside = b.x >= g.leftTop.x && b.x <= g.rightTop.x;
        if (inside) expect(Math.abs(b.y - g.leftTop.y), `miss ${r.contact} ${JSON.stringify(k)}`).toBeGreaterThan(b.r + barHalf - SUBPIXEL);
      }
      expect(scored).toBeGreaterThan(50);
      expect(missed).toBeGreaterThan(1000);
    });

    it(`${w}x${h}: a shot that clears the bar passes behind it, never drawn over it`, () => {
      const v = scene(w, h);
      let behind = 0;
      for (const k of shots) {
        const r = simulateShot(k);
        if (r.scored) continue;
        for (const at of r.path) {
          if (at[1] <= CROSSBAR.spotDistance) continue;
          behind++;
          expect(ballSprite(v, at).behindFrame, `${JSON.stringify(k)} at ${at.join(',')}`).toBe(true);
        }
      }
      expect(behind).toBeGreaterThan(100);
    });
  }
});
