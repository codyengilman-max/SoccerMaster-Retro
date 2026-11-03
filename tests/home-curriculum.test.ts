import { describe, expect, it } from 'vitest';
import { HOME_ACTIVITIES, activityById } from '../src/game/career/catalog';
import { sectionOf } from '../src/game/career/ballMastery';
import { CORE_PATHWAY, DUPLICATE_REVIEW, HELD_OUT, HOME_CURRICULUM, HOME_CURRICULUM_STATUS, HOME_CURRICULUM_VERSION, setupFits, trackStatus } from '../src/game/career/homeCurriculum';
import type { HomeLog } from '../src/game/career/homeMastery';

const none = { journal: [], homeLogs: [] as HomeLog[] };
const done = (activityId: string) => ({ activityId, completion: 'done' as const });
const big = { equipment: 'optional' as const, space: 'medium' as const, setting: 'outdoor' as const, striking: true, minutes: 10 };

describe('home curriculum v2 (proposed)', () => {
  it('is versioned and still a proposal', () => {
    expect(HOME_CURRICULUM.version).toBe(HOME_CURRICULUM_VERSION);
    expect(HOME_CURRICULUM_VERSION).toBe(2);
    expect(HOME_CURRICULUM_STATUS).toBe('proposed');
  });
  it('keeps every home lesson exactly once, in its own section, with no invented IDs', () => {
    const ids = HOME_CURRICULUM.lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(HOME_ACTIVITIES.map((a) => a.id).sort());
    for (const l of HOME_CURRICULUM.lessons) expect(l.track).toBe(sectionOf(activityById(l.id)!));
  });
  it('the 18-week core comes first: one Ball Mastery lesson per week, Phase 1–2, all fitting the minimum setup', () => {
    expect(CORE_PATHWAY.map((c) => c.week)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    const bm = HOME_CURRICULUM.lessons.filter((l) => l.track === 'ballMastery');
    expect(bm.slice(0, 18).map((l) => l.id)).toEqual(CORE_PATHWAY.map((c) => c.lesson));
    for (const c of CORE_PATHWAY) {
      const a = activityById(c.lesson)!;
      expect(sectionOf(a)).toBe('ballMastery');
      expect(a.entryLevel).toBeLessThanOrEqual(2);
      expect(setupFits(a, undefined)).toBe(true);
      expect(HELD_OUT.has(c.lesson)).toBe(false);
    }
  });
  it('no lesson can be passed until its checkpoint is coach-approved; practice and viewing never pass', () => {
    for (const l of HOME_CURRICULUM.lessons) expect(l.checkpoint.status).toBe('awaiting-review');
    const first = CORE_PATHWAY[0]!.lesson;
    const s = trackStatus('ballMastery', { journal: [done(first), done(first), done(first)], homeLogs: [] });
    expect(s.current!.lesson.id).toBe(first);
    expect(s.current!.practices).toBe(3);
    expect(s.current!.passed).toBe(false);
    expect(s.passed).toBe(0);
  });
  it('a new story week never advances the assignment', () => {
    for (const week of [1, 5, 18]) expect(trackStatus('ballMastery', { ...none, week }).current!.lesson.id).toBe(CORE_PATHWAY[0]!.lesson);
  });
  it('a new player starts both tracks at Phase 1 lesson 1, independently', () => {
    expect(trackStatus('juggling', none).current!.lesson.id).toBe('jg-1');
    expect(trackStatus('ballMastery', none).core).toEqual({ index: 1, of: 18 });
    expect(trackStatus('juggling', { journal: [done(CORE_PATHWAY[0]!.lesson)], homeLogs: [] }).current!.lesson.id).toBe('jg-1');
  });
  it('unresolved duplicates and proposed aliases stay out of the assigned sequence, with IDs kept', () => {
    expect([...HELD_OUT].sort()).toEqual(['bmd-003', 'bmd-012', 'bmd-029', 'bmd-056', 'bmd-071']);
    expect(DUPLICATE_REVIEW).toHaveLength(13);
    expect(DUPLICATE_REVIEW.find((d) => d.design === 'bmd-012' && d.other === 'dr-cruyff')!.decision).toBe('unresolved');
    for (const id of HELD_OUT) expect(HOME_CURRICULUM.lessons.find((l) => l.id === id)!.heldOut).toBe(true);
    for (const d of DUPLICATE_REVIEW) if (d.entry) expect(activityById(d.entry)).toBeDefined();
  });
  it('lessons the setup cannot support are deferred with later ladder levels, never passed; a full setup defers nothing', () => {
    const fi = (n: number) => activityById(`v11-FI01-L${n}`)!;
    expect(setupFits(fi(1), undefined)).toBe(false);
    expect(setupFits(fi(1), big)).toBe(true);
    const small = trackStatus('ballMastery', none);
    expect(small.deferred).toEqual(expect.arrayContaining(['v11-FI01-L1', 'v11-FI01-L2', 'fn-roll-strike', 'ps-near-far', 'v11-PA02-L1']));
    expect(trackStatus('ballMastery', { ...none, input: big }).deferred).toEqual([]);
  });
  it('juggling ladder targets show as progress, not a pass', () => {
    const s = trackStatus('juggling', { journal: [done('jg-1'), done('jg-1')], homeLogs: [] });
    expect(s.current!.lesson.id).toBe('jg-1');
    expect(s.current!.targetMet).toBe(false);
  });
});
