import { describe, expect, it } from 'vitest';
import { CROSSBAR, describeShot, idealPower, simulateShot } from '../src/game/story/crossbar';
import { CROSSBAR_BACKDROP, crossbarView, goalGeometry } from '../src/render/crossbarView';

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
