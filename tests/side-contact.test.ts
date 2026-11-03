import { describe, expect, it } from 'vitest';
import report from '../docs/art/ball-mastery-side/contact-report.json';
import { SIDE_CONTACT } from '../src/render/art/sideContactFrames';
import { SIDE_LESSONS, sideFrame, sideLength, sideLessonFor, sidePoses, sideStarts } from '../src/game/career/sideContact';
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

describe('Sole rolls and draws, side view (D69 expansion)', () => {
  const ROLLS = ['v11-BM03-L1', 'v11-BM03-L2', 'v11-BM03-L3', 'v11-BM03-L4', 'v11-TR01-L1'];
  for (const id of ROLLS) {
    const lesson = sideLessonFor(id)!;
    it(`${id}: targets an existing sole lesson; one title per reviewed step`, () => {
      const a = activityById(id)!;
      expect(a).toBeDefined();
      expect(a.steps.join(' ').toLowerCase()).toContain('sole');
      expect(lesson.titles.length).toBe(a.steps.length);
    });
    for (const sex of ['boy', 'girl'] as const) {
      const poses = (report as unknown as Record<string, { poses: Record<string, Pose & { frame: string; dx: number; ball: number[] }> }>)[sex]!.poses;
      const art = SIDE_CONTACT[sex].poses as unknown as Record<string, { frame: string; dx: number; ball: number[]; working: string | null; surface: string }>;
      for (const lead of ['right', 'left'] as const) {
        it(`${id} ${sex} ${lead} first: every frame has a checked pose whose ball and contact agree with the timeline`, () => {
          let prev: number | null = null;
          for (let t = 0; t <= sideLength(lesson) + 1e-9; t += 0.01) {
            const f = sideFrame(lesson, t, lead);
            const p = art[f.pose];
            const r = poses[f.pose];
            expect(p, `${f.pose} exists`).toBeDefined();
            expect(p!.dx, `${f.pose} drawn for the ball where it is`).toBe(f.ball);
            expect(p!.working).toBe(f.working);
            expect(p!.surface).toBe(f.surface);
            if (f.surface === 'sole') {
              expect(r!.pixelCheck!.nearestBootPixel, f.pose).toBeGreaterThanOrEqual(R);
              expect(r!.pixelCheck!.nearestBootPixel, f.pose).toBeLessThanOrEqual(R + 1);
            }
            if (r!.pixelCheck) expect(r!.pixelCheck.bootPixelsInsideBall, f.pose).toBe(0);
            if (f.working && f.surface === 'none') expect(r!.pixelCheck!.nearestBootPixel, f.pose).toBeGreaterThanOrEqual(R + 2);
            for (const [foot, d] of Object.entries(r!.plantedBootNearestPixel)) expect(d, `${f.pose} planted ${foot}`).toBeGreaterThanOrEqual(R + 2);
            // The ball only moves under the sole, at most one pixel per 10 ms sample (no jumps), and turns as it rolls.
            if (prev !== null) {
              expect(Math.abs(f.ball - prev)).toBeLessThanOrEqual(1);
              if (f.ball !== prev) expect(f.surface).toBe('sole');
            }
            prev = f.ball;
          }
        });
      }
    }
    it(`${id}: rolls turn the ball strip, the inset names the roll, and the other foot works only where authored`, () => {
      const starts = sideStarts(lesson);
      for (const lead of ['right', 'left'] as const) {
        const frames = starts.map((t) => sideFrame(lesson, t + 0.01, lead));
        for (const [i, f] of frames.entries()) {
          const b = lesson.beats[i]!;
          expect(f.working).toBe(b.foot === null ? null : b.foot === 'lead' ? lead : lead === 'right' ? 'left' : 'right');
          expect(f.surface === 'sole').toBe(b.phase === 'contact');
          expect(f.inset.includes('sole on top')).toBe(f.surface === 'sole');
        }
        const mid = lesson.beats.findIndex((b) => b.action === 'roll' || b.action === 'draw');
        const end = sideFrame(lesson, starts[mid]! + lesson.beats[mid]!.seconds - 0.001, lead);
        expect(end.ball).toBe(lesson.beats[mid]!.ball[1]);
        expect(end.ballTurn).not.toBe(sideFrame(lesson, starts[mid]! + 0.001, lead).ballTurn);
      }
    });
  }
  it('every pose a side lesson can show exists in both atlases', () => {
    for (const l of SIDE_LESSONS) for (const id of sidePoses(l)) for (const sex of ['boy', 'girl'] as const) expect((SIDE_CONTACT[sex].poses as Record<string, unknown>)[id], `${l.activityId} ${sex} ${id}`).toBeDefined();
  });
});
