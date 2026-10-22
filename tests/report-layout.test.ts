import { describe, expect, it } from 'vitest';
import { ART_SIZE, MATCH_REPORT, MY_PLAYER, contains, fitArt, toScreen, type NBox } from '../src/render/devreport';

const all = (o: Record<string, unknown>): NBox[] =>
  Object.values(o).flatMap((v) => (Array.isArray(v) ? (v.filter((x) => typeof x === 'object') as NBox[]) : typeof v === 'object' ? [v as NBox] : []));

describe('report art layout', () => {
  it('every overlay box lies inside the painting', () => {
    for (const box of [...all(MY_PLAYER), ...all(MATCH_REPORT)]) {
      expect(box.x0).toBeGreaterThanOrEqual(0);
      expect(box.y0).toBeGreaterThanOrEqual(0);
      expect(box.x1).toBeLessThanOrEqual(1);
      expect(box.y1).toBeLessThanOrEqual(1);
      expect(box.x1).toBeGreaterThan(box.x0);
      expect(box.y1).toBeGreaterThan(box.y0);
    }
  });
  it('scales uniformly and keeps hit areas on the art in portrait and landscape', () => {
    for (const view of [{ x: 0, y: 0, width: 390, height: 844 }, { x: 0, y: 0, width: 844, height: 390 }, { x: 0, y: 47, width: 375, height: 600 }]) {
      const f = fitArt(view);
      const art = { x: f.x, y: f.y, width: ART_SIZE.w * f.scale, height: ART_SIZE.h * f.scale };
      expect(art.width / art.height).toBeCloseTo(ART_SIZE.w / ART_SIZE.h);
      expect(art.width).toBeLessThanOrEqual(view.width + 1e-6);
      expect(art.height).toBeLessThanOrEqual(view.height + 1e-6);
      const btn = toScreen(f, MATCH_REPORT.cont);
      expect(contains(art, btn.x, btn.y)).toBe(true);
      expect(contains(art, btn.x + btn.width, btn.y + btn.height)).toBe(true);
    }
  });
  it('My Player has six attribute rows in painted order without overlap', () => {
    expect(MY_PLAYER.attrRows).toHaveLength(6);
    for (let i = 1; i < 6; i++) expect(MY_PLAYER.attrRows[i]!.y0).toBeGreaterThanOrEqual(MY_PLAYER.attrRows[i - 1]!.y1 - 1e-9);
  });
});
