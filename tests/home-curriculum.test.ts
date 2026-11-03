import { describe, expect, it } from 'vitest';
import { HOME_ACTIVITIES } from '../src/game/career/catalog';
import { sectionOf } from '../src/game/career/ballMastery';
import { HOME_CURRICULUM, HOME_CURRICULUM_STATUS, HOME_CURRICULUM_VERSION, trackStatus } from '../src/game/career/homeCurriculum';
import type { HomeLog } from '../src/game/career/homeMastery';

const none = { journal: [], homeLogs: [] as HomeLog[] };
const done = (activityId: string) => ({ activityId, completion: 'done' as const });

describe('home curriculum v1 (proposed)', () => {
  it('is versioned and still a proposal', () => {
    expect(HOME_CURRICULUM.version).toBe(HOME_CURRICULUM_VERSION);
    expect(HOME_CURRICULUM_STATUS).toBe('proposed');
  });
  it('places every home lesson exactly once, in its own section, with no invented IDs', () => {
    const ids = HOME_CURRICULUM.lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(HOME_ACTIVITIES.map((a) => a.id).sort());
    for (const l of HOME_CURRICULUM.lessons) expect(l.track).toBe(sectionOf(HOME_ACTIVITIES.find((a) => a.id === l.id)!));
  });
  it('orders each track from Phase 1 to 5, each lesson requiring the one before', () => {
    for (const t of ['juggling', 'ballMastery'] as const) {
      const list = HOME_CURRICULUM.lessons.filter((l) => l.track === t);
      list.forEach((l, i) => {
        expect(l.order).toBe(i + 1);
        expect(l.prerequisite).toBe(i ? list[i - 1]!.id : null);
        if (i) expect(l.phase).toBeGreaterThanOrEqual(list[i - 1]!.phase);
      });
      expect(HOME_CURRICULUM.tracks[t].flatMap((p) => p.lessons)).toEqual(list.map((l) => l.id));
    }
  });
  it('flags every criterion the owner has not set', () => {
    for (const l of HOME_CURRICULUM.lessons) if (l.advance.kind === 'practice') expect(l.advance.proposed).toBe(true);
    expect(HOME_CURRICULUM.lessons.find((l) => l.id === 'bmd-012')!.flags.join(' ')).toMatch(/Possible duplicate of dr-cruyff/);
  });
  it('a new player starts both tracks at Phase 1 lesson 1', () => {
    for (const t of ['juggling', 'ballMastery'] as const) {
      const s = trackStatus(t, none);
      expect(s.phase).toBe(1);
      expect(s.completed).toBe(0);
      expect(s.current!.lesson.order).toBe(1);
    }
    expect(trackStatus('juggling', none).current!.lesson.id).toBe('jg-1');
  });
  it('tracks are independent; reported practice advances only a practice lesson', () => {
    const bm1 = HOME_CURRICULUM.tracks.ballMastery[0]!.lessons[0]!;
    const bm2 = HOME_CURRICULUM.tracks.ballMastery[0]!.lessons[1]!;
    const r = { journal: [done(bm1)], homeLogs: [] };
    expect(trackStatus('juggling', r).current!.lesson.id).toBe('jg-1');
    const first = HOME_CURRICULUM.lessons.find((l) => l.id === bm1)!;
    expect(trackStatus('ballMastery', r).current!.lesson.id).toBe(first.advance.kind === 'practice' ? bm2 : bm1);
  });
  it('a later lesson practised out of order never skips an earlier one; skipped logs never count', () => {
    const bm = HOME_CURRICULUM.tracks.ballMastery[0]!.lessons;
    expect(trackStatus('ballMastery', { journal: [done(bm[5]!), { activityId: bm[0]!, completion: 'skipped' as const }], homeLogs: [] }).current!.lesson.id).toBe(bm[0]);
  });
  it('juggling lesson 1 needs its performance target, not just a reported practice', () => {
    const s = trackStatus('juggling', { journal: [done('jg-1'), done('jg-1')], homeLogs: [] });
    expect(s.current!.lesson.id).toBe('jg-1');
    expect(s.current!.targetMet).toBe(false);
  });
});
