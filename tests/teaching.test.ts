import { describe, expect, it } from 'vitest';
import { activityById } from '../src/game/career/catalog';
import { TEACHING, WORKING_BOOT, lessonLength, phaseStarts, teachingFor, teachingFrame } from '../src/game/career/teaching';
import { BM_SHEET } from '../src/render/art/bmSheet';
import { ASSIGNABLE_DESIGNS } from '../src/game/career/ballMastery';

const lesson = teachingFor('dr-inside-cut')!;

describe('Ball Mastery teaching pages (art v1 slice)', () => {
  it('only the one reviewed slice lesson has a teaching page, and it is an existing catalog lesson', () => {
    expect(TEACHING.map((l) => l.activityId)).toEqual(['dr-inside-cut']);
    const a = activityById('dr-inside-cut')!;
    expect(a.title).toBe('Inside-Cut Escape');
    expect(lesson.phases.map((p) => p.step)).toEqual([0, 1, 2]);
    expect(ASSIGNABLE_DESIGNS).toEqual([]);
  });

  it('captions are the catalog steps, so mechanics come from the reviewed library', () => {
    const a = activityById('dr-inside-cut')!;
    for (const [i, t0] of phaseStarts(lesson).entries()) expect(teachingFrame(lesson, t0 + 0.01, 'right').caption).toBe(`${i + 1}. ${a.steps[i]}`);
  });

  it('the ball only moves while the inside of the foot is on it or after it, never before contact', () => {
    for (const foot of ['right', 'left'] as const) {
      const [, cStart] = phaseStarts(lesson);
      const rest = teachingFrame(lesson, 0, foot).ballX;
      for (let t = 0; t < cStart!; t += 0.05) expect(teachingFrame(lesson, t, foot).ballX).toBeCloseTo(rest, 6);
      const c = teachingFrame(lesson, cStart! + 0.01, foot);
      expect(c.contact).toBe('inside');
      expect(teachingFrame(lesson, cStart! + lesson.phases[1]!.seconds - 0.01, foot).ballX * (foot === 'right' ? 1 : -1)).toBeGreaterThan(rest * (foot === 'right' ? 1 : -1));
    }
  });

  it('at contact the ball is on the inside of the working boot and leaves the way the inside faces', () => {
    const [, cStart] = phaseStarts(lesson);
    for (const sex of ['boy', 'girl'] as const)
      for (const foot of ['right', 'left'] as const) {
        const side = foot === 'right' ? 1 : -1;
        const f0 = teachingFrame(lesson, cStart! + 0.01, foot);
        const boot = BM_SHEET[sex].frames[f0.pose].boots[WORKING_BOOT[f0.pose]]!;
        const bootX = boot[0] / BM_SHEET[sex].visibleHeight;
        expect((f0.ballX - bootX) * side, `${sex} ${foot}`).toBeGreaterThan(0);
        expect((f0.ballX - bootX) * side).toBeLessThan(0.15);
        const f1 = teachingFrame(lesson, cStart! + 0.7, foot);
        expect((f1.ballX - f0.ballX) * side).toBeGreaterThan(0);
      }
  });

  it('left foot is the drawn mirror pose set with the ball path mirrored, never a flipped image', () => {
    for (let t = 0; t < lessonLength(lesson); t += 0.1) {
      const r = teachingFrame(lesson, t, 'right');
      const l = teachingFrame(lesson, t, 'left');
      expect(l.ballX).toBeCloseTo(-r.ballX, 6);
      expect(l.bodyX).toBeCloseTo(-r.bodyX, 6);
      expect(l.pose).not.toBe(r.pose);
      expect(l.contact).toBe(r.contact);
      expect(l.step).toBe(r.step);
      expect(WORKING_BOOT[l.pose]).toBe(1 - WORKING_BOOT[r.pose]);
    }
  });

  it('slow motion changes time only: the same t gives the same frame', () => {
    const a = teachingFrame(lesson, 1.7, 'right');
    expect(teachingFrame(lesson, 1.7, 'right')).toEqual(a);
    expect(teachingFrame(lesson, 1.7 + lessonLength(lesson), 'right')).toEqual(a);
  });

  it('every pose a lesson uses exists on both runtime sheets with both boots measured', () => {
    for (const sex of ['boy', 'girl'] as const)
      for (const p of lesson.phases)
        for (const id of Object.values(p.pose)) {
          const f = BM_SHEET[sex].frames[id];
          expect(f, `${sex} ${id}`).toBeDefined();
          expect(f.boots).toHaveLength(2);
          expect(f.boots[0]![0]).toBeLessThan(f.boots[1]![0]);
          expect(Math.max(...f.boots.map((b) => b[1]))).toBe(0);
        }
  });
});
