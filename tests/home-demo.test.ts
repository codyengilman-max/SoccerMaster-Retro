import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALL_ACTIVITIES, activityById } from '../src/game/career/catalog';
import { BEAT_SECONDS, JUGGLE_FRAMES, JUGGLE_PATTERNS, demoLength, demoPose, demoSet, strikeTimes } from '../src/render/art/homeDemo';

const frames = (set: string) => Object.keys((JSON.parse(readFileSync(`src/assets/art/sprites-v2/${set}.json`, 'utf8')) as { frames: object }).frames);

describe('home training demos use the created player', () => {
  it('picks the saved boy/girl training sheet (keeper sheet for keeper exercises)', () => {
    expect(demoSet('boy')).toBe('boy-training');
    expect(demoSet('girl')).toBe('girl-training');
    expect(demoSet('girl', true)).toBe('girl-goalkeeper');
    expect(demoSet(undefined)).toBe('boy-training');
  });
  it('every exercise demo frame exists on both protagonist sheets, at every sampled time', () => {
    const boy = new Set(frames('boy-training')), girl = new Set(frames('girl-training'));
    for (const a of ALL_ACTIVITIES) for (let t = 0; t < demoLength(a); t += 0.05) {
      const p = demoPose(a, t);
      expect(boy.has(p.frame) && girl.has(p.frame), `${a.id} @${t.toFixed(2)} ${p.frame}`).toBe(true);
    }
  });
  it('juggling: the ball is at contact height on the contact frame, and the pattern follows the ladder step', () => {
    for (const [id, beats] of Object.entries(JUGGLE_PATTERNS)) {
      const a = activityById(id)!;
      beats.forEach((b, i) => {
        const p = demoPose(a, i * BEAT_SECONDS);
        if (b.s === 'laces' || b.s === 'thigh') {
          expect(JUGGLE_FRAMES[b.s]).toContain(p.frame);
          expect(p.contact).toBe(b.s);
          expect(p.flip).toBe(b.foot === 'left');
          expect(p.ball.h).toBeCloseTo(b.s === 'laces' ? 0.45 : 1.05, 1);
        }
      });
      const mid = demoPose(a, 0.4 * BEAT_SECONDS);
      expect(mid.ball.h).toBeGreaterThan(1.2);
    }
    expect(JUGGLE_PATTERNS['jg-5']!.filter((b) => b.s === 'laces').map((b) => b.foot)).toEqual(['right', 'left', 'right', 'left']);
    expect(JUGGLE_PATTERNS['jg-6']!.some((b) => b.s === 'thigh')).toBe(true);
    expect(JUGGLE_PATTERNS['jg-3']!.some((b) => b.s === 'bounce')).toBe(true);
  });
  it('path demos kick exactly when the ball leaves the foot, never a generic loop', () => {
    const a = activityById('fn-ground-placement')!;
    const d = a.demo as Extract<typeof a.demo, { kind: 'path' }>;
    const [s] = strikeTimes(d);
    expect(s).toBeDefined();
    expect(demoPose(a, s!).frame).toBe('kick-4');
    expect(demoPose(a, s!).contact).toBe('strike');
    const course = activityById('aw-eyes-up')!;
    expect(strikeTimes(course.demo as Extract<typeof a.demo, { kind: 'path' }>)).toEqual([]);
    expect(demoPose(course, 1).frame).toMatch(/^(dribble|run)-/);
  });
  it('defending demos use jockey/block poses, and playback is pure (same time, same pose)', () => {
    const a = activityById('df-side-step')!;
    expect(demoPose(a, 0).frame).toMatch(/^jockey-/);
    expect(demoPose(a, 2.3)).toEqual(demoPose(a, 2.3));
  });
});
