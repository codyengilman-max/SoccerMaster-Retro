import { describe, expect, it } from 'vitest';
import { U11_9V9_PITCH, pitchMarkings } from '../src/game';
import { arcPoints, fitPitch, orientationOf, rectToScreen, rectWithin, toScreen } from '../src/render/layout';
import { BACKDROP_FOCUS } from '../src/render/art/catalog';
import { coverWithFocus, fitRegion, fromScreen, pitchVectorToScreen, screenVectorToPitch } from '../src/render/layout';

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

describe('fitRegion (attack drill view)', () => {
  const region = { x: 33, y: 0, width: 44, height: 50 };
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 568, height: 320 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 1280, height: 720 },
  ]) {
    it(`fits and round-trips in ${viewport.width}x${viewport.height}`, () => {
      const layout = fitRegion(viewport, region, { top: 10, right: 10, bottom: 10, left: 10 }, 2, 0.55);
      const r = rectToScreen(layout, region);
      expect(r.x).toBeGreaterThanOrEqual(9.5);
      expect(r.y).toBeGreaterThanOrEqual(9.5);
      expect(r.x + r.width).toBeLessThanOrEqual(viewport.width - 9.5);
      expect(r.y + r.height).toBeLessThanOrEqual(viewport.height - 9.5);
      const p = { x: 61.5, y: 12.25 };
      const back = fromScreen(layout, toScreen(layout, p));
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
      const v = { x: 3, y: -2 };
      const vBack = screenVectorToPitch(layout, pitchVectorToScreen(layout, v));
      expect(vBack.x).toBeCloseTo(v.x, 6);
      expect(vBack.y).toBeCloseTo(v.y, 6);
      if (layout.orientation === 'landscape') {
        expect(layout.crossScale).toBeLessThan(layout.scale);
        expect(toScreen(layout, { x: 75, y: 25 }).x).toBeGreaterThan(toScreen(layout, { x: 40, y: 25 }).x);
      } else {
        expect(toScreen(layout, { x: 75, y: 25 }).y).toBeLessThan(toScreen(layout, { x: 40, y: 25 }).y);
      }
    });
  }
});

describe('coverWithFocus (painted story backdrops)', () => {
  const cases = [
    { name: 'iPhone 13 portrait', width: 390, height: 383, top: 50 },
    { name: 'iPhone 13 landscape', width: 844, height: 201, top: 50 },
    { name: 'iPhone SE landscape', width: 667, height: 190, top: 50 },
    { name: 'iPhone 15 Pro Max portrait', width: 430, height: 420, top: 50 },
  ];
  for (const [assetId, focus] of Object.entries(BACKDROP_FOCUS)) for (const c of cases) {
    it(`${assetId} ${c.name}: covers the band with no gaps and keeps the focus box in view`, () => {
      const r = coverWithFocus(1536, 1024, c.width, c.height, c.top, focus);
      const w = 1536 * r.scale;
      const h = 1024 * r.scale;
      const left = r.x - w / 2;
      const top = r.y - h / 2;
      expect(r.scale).toBeCloseTo(Math.max(c.width / 1536, c.height / 1024), 9);
      expect(left).toBeLessThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(0);
      expect(left + w).toBeGreaterThanOrEqual(c.width - 1e-9);
      expect(top + h).toBeGreaterThanOrEqual(c.height - 1e-9);
      // The whole focus box (faces and Cloudy) is on screen, below the top bar and above the panel.
      expect(left + focus.x0 * w).toBeGreaterThanOrEqual(-1e-9);
      expect(left + focus.x1 * w).toBeLessThanOrEqual(c.width + 1e-9);
      expect(top + focus.y0 * h).toBeGreaterThanOrEqual(c.top - 1e-9);
      expect(top + focus.y1 * h).toBeLessThanOrEqual(c.height + 1e-9);
    });
  }

  it('the old centred cover crops the portrait fish and the landscape face (regression)', () => {
    const p = Math.max(390 / 1536, 383 / 1024);
    const focus = BACKDROP_FOCUS['s1-tank-boy']!;
    expect(390 / 2 + (focus.x1 - 0.5) * 1536 * p).toBeGreaterThan(390);
    const l = Math.max(844 / 1536, 201 / 1024);
    expect(201 / 2 + (focus.y0 - 0.5) * 1024 * l).toBeLessThan(50);
  });
});
