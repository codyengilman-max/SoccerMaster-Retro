import { describe, expect, it } from 'vitest';
import { U11_9V9_PITCH, pitchMarkings } from '../src/game';
import { arcPoints, fitPitch, orientationOf, rectToScreen, rectWithin, toScreen } from '../src/render/layout';

const PHONES = [
  { name: 'iPhone SE portrait', width: 375, height: 667 },
  { name: 'iPhone 13 portrait', width: 390, height: 844 },
  { name: 'iPhone 15 Pro Max portrait', width: 430, height: 932 },
  { name: 'iPhone SE landscape', width: 667, height: 375 },
  { name: 'iPhone 13 landscape', width: 844, height: 390 },
  { name: 'iPhone 15 Pro Max landscape', width: 932, height: 430 },
];

describe('pitch layout', () => {
  it('detects orientation', () => {
    expect(orientationOf({ width: 390, height: 844 })).toBe('portrait');
    expect(orientationOf({ width: 844, height: 390 })).toBe('landscape');
    expect(orientationOf({ width: 500, height: 500 })).toBe('landscape');
  });

  it.each(PHONES)('fits pitch and goals inside $name', (viewport) => {
    const insets = { top: 72, right: 12, bottom: 12, left: 12 };
    const layout = fitPitch(viewport, U11_9V9_PITCH.length, U11_9V9_PITCH.width, insets);
    const region = {
      x: insets.left,
      y: insets.top,
      width: viewport.width - insets.left - insets.right,
      height: viewport.height - insets.top - insets.bottom,
    };
    const m = pitchMarkings(U11_9V9_PITCH);
    expect(rectWithin(rectToScreen(layout, m.boundary), region)).toBe(true);
    for (const goal of m.goals) expect(rectWithin(rectToScreen(layout, goal), region)).toBe(true);
    expect(layout.scale).toBeGreaterThan(3);
  });

  it('runs the pitch length along the long screen axis', () => {
    const portrait = fitPitch({ width: 390, height: 844 }, 75, 50);
    const landscape = fitPitch({ width: 844, height: 390 }, 75, 50);
    const p = rectToScreen(portrait, { x: 0, y: 0, width: 75, height: 50 });
    const l = rectToScreen(landscape, { x: 0, y: 0, width: 75, height: 50 });
    expect(p.height).toBeGreaterThan(p.width);
    expect(l.width).toBeGreaterThan(l.height);
    expect(p.height / p.width).toBeCloseTo(75 / 50);
  });

  it('maps the centre spot to the centre of the fitted region', () => {
    const layout = fitPitch({ width: 844, height: 390 }, 75, 50);
    const c = toScreen(layout, { x: 37.5, y: 25 });
    expect(c.x).toBeCloseTo(422);
    expect(c.y).toBeCloseTo(195);
  });

  it('produces arc points on the circle', () => {
    const points = arcPoints({ x: 0, y: 0 }, 2, 0, Math.PI / 2, 4);
    expect(points).toHaveLength(5);
    for (const p of points) expect(Math.hypot(p.x, p.y)).toBeCloseTo(2);
  });
});
