import { describe, expect, it } from 'vitest';
import report from '../docs/art/ball-mastery-side/contact-report.json';
import { SIDE_CONTACT } from '../src/render/art/sideContactFrames';
import { sideFrame, sideLength, sideLessonFor, sideStarts } from '../src/game/career/sideContact';
import { activityById } from '../src/game/career/catalog';

type Pose = { working: string | null; support: string | null; surface: string; pixelCheck: { nearestBootPixel: number; bootPixelsInsideBall: number } | null; rotation: Record<string, number>; plantedBootNearestPixel: Record<string, number> };
const R = 7;

describe('Sole taps side-view contact (D69)', () => {
  const lesson = sideLessonFor('bmd-055')!;
  it('targets an existing lesson', () => {
    expect(activityById('bmd-055')?.title).toMatch(/sole taps/i);
  });
  for (const sex of ['boy', 'girl'] as const) {
    const poses = (report as unknown as Record<string, { poses: Record<string, Pose> }>)[sex]!.poses;
    it(`${sex}: drawn boot pixels touch the ball edge at contact, clear it otherwise, never enter it`, () => {
      for (const [id, p] of Object.entries(poses)) {
        if (!p.pixelCheck) continue;
        expect(p.pixelCheck.bootPixelsInsideBall, id).toBe(0);
        if (p.surface === 'sole') {
          expect(p.pixelCheck.nearestBootPixel, id).toBeGreaterThanOrEqual(R);
          expect(p.pixelCheck.nearestBootPixel, id).toBeLessThanOrEqual(R + 1);
        } else expect(p.pixelCheck.nearestBootPixel, id).toBeGreaterThanOrEqual(R + 2);
      }
    });
    it(`${sex}: a planted boot never touches or overlaps the ball`, () => {
      for (const [id, p] of Object.entries(poses)) {
        const feet = Object.entries(p.plantedBootNearestPixel);
        expect(feet.length, id).toBe(p.working ? 1 : 2);
        for (const [foot, d] of feet) expect(d, `${id} ${foot}`).toBeGreaterThanOrEqual(R + 2);
      }
    });
    it(`${sex}: each foot has its own pose (left is the far leg, not a mirror)`, () => {
      expect(poses['right-tap']!.rotation.right).toBeGreaterThan(10);
      expect(poses['right-tap']!.rotation.left).toBe(0);
      expect(poses['left-tap']!.rotation.left).toBeGreaterThan(10);
      expect(poses['left-tap']!.rotation.right).toBe(0);
      const c = SIDE_CONTACT[sex].poses;
      expect(c['right-tap'].working).toBe('right');
      expect(c['left-tap'].working).toBe('left');
      expect(c['right-tap'].support).toBe('left');
      expect(c['left-tap'].support).toBe('right');
    });
    it(`${sex}: contact anchors sit on the ball's top edge`, () => {
      const b = SIDE_CONTACT[sex].ball;
      for (const id of ['right-tap', 'left-tap'] as const) {
        const p = SIDE_CONTACT[sex].poses[id].contact!;
        expect(Math.hypot(p[0]! - b.x, p[1]! - b.y)).toBeCloseTo(b.r, 1);
        expect(p[1]!).toBeLessThan(b.y);
      }
    });
  }
  for (const lead of ['right', 'left'] as const) {
    it(`${lead} first: one state per beat; contact only on the contact beats; the other foot alternates`, () => {
      const starts = sideStarts(lesson);
      const frames = starts.map((t) => sideFrame(lesson, t + 0.01, lead));
      expect(frames.map((f) => f.phase)).toEqual(['rest', 'pre', 'contact', 'post', 'rest', 'pre', 'contact', 'post', 'rest']);
      const other = lead === 'right' ? 'left' : 'right';
      expect(frames.map((f) => f.working)).toEqual([null, lead, lead, lead, null, other, other, other, null]);
      for (const f of frames) {
        expect(f.surface).toBe(f.phase === 'contact' ? 'sole' : 'none');
        expect(f.pose === 'stand').toBe(f.working === null);
        if (f.working) expect(f.pose.startsWith(f.working)).toBe(true);
        expect(f.inset.includes('sole on top')).toBe(f.surface === 'sole');
      }
      expect(sideFrame(lesson, sideLength(lesson) + 5, lead).beat).toBe(lesson.beats.length - 1);
    });
  }
});
