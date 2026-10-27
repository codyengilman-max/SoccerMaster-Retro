import { describe, expect, it } from 'vitest';
import manifest from '../docs/training/all36/MANIFEST.json';
import { emptySave, reduce, type Action, type CareerSave } from '../src/game/career/state';
import { exportSave, parseImport } from '../src/game/career/saveio';
import { POSITIONS, type Position } from '../src/game/career/types';
import { teamTrainingHandoff, weeklyProgress } from '../src/game/career/weeklyTraining';
import { contentSha256 } from '../src/game/training12/library/sha256';
import { ALL36_EPISODES, CATEGORY_ROLES, PACKAGE_ROLE, protagonistRole } from '../src/game/training12/all36/package';
import { MODES } from '../src/game/training12/all36/schedule';
import { ROLE_GROUP, WEEKLY_ASSIGNMENTS, WEEKLY_WEEKS, gradeWeekly, weeklyAssignment } from '../src/game/training12/all36/weekly';
import type { ChoiceId } from '../src/game/training12/all36/types';
import { weeklyMarkdown } from '../src/game/training12/all36/report';
import { readFileSync } from 'node:fs';

const act = (s: CareerSave, a: Action): CareerSave => {
  const r = reduce(s, a);
  if (!r.ok) throw new Error(r.error);
  return r.save;
};
const player = (position: Position, id = 'p1'): CareerSave => act(emptySave(), { type: 'createPlayer', id, name: 'Kid', position });
const choiceWith = (week: number, c: Position, grade: 'preferred' | 'acceptable' | 'misread'): ChoiceId => {
  const a = weeklyAssignment(week, c)!;
  const v = ALL36_EPISODES.find((e) => e.id === a.situationId)!.variants.find((x) => x.id === 'base')!;
  return (Object.keys(v.grades) as ChoiceId[]).find((k) => v.grades[k] === grade)!;
};
const run = (s: CareerSave, runId: string, choice: ChoiceId | null, situationId = weeklyAssignment(s.week, s.player!.position)!.situationId): Action => ({ type: 'all36Weekly', week: s.week, situationId, runId, at: 1_800_000_000_000, choice });

describe('weekly All36 assignment table', () => {
  it('1. gives DEF, MID and FWD exactly one compatible scenario in every one of the 18 weeks', () => {
    expect(WEEKLY_WEEKS).toBe(18);
    for (const c of POSITIONS) {
      const list = WEEKLY_ASSIGNMENTS[c];
      expect(list.map((a) => a.week), c).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
      for (const a of list) {
        expect(a.category).toBe(c);
        expect(a.variant).toBe('base');
        expect(CATEGORY_ROLES[c], `${c} week ${a.week}`).toContain(a.role);
      }
    }
    expect(POSITIONS.flatMap((c) => WEEKLY_ASSIGNMENTS[c])).toHaveLength(54);
  });

  it('2. assigns only coach-approved All36 scenarios, unchanged from the fingerprinted package', () => {
    for (const a of POSITIONS.flatMap((c) => WEEKLY_ASSIGNMENTS[c])) {
      const e = ALL36_EPISODES.find((x) => x.id === a.situationId);
      expect(e?.status, a.situationId).toBe('coach_approved');
      const { status: _s, approval: _a, ...tactical } = e!;
      expect(contentSha256(tactical)).toBe(manifest.scenarios.find((m) => m.id === a.situationId)!.semanticSha256);
    }
  });

  it('uses every eligible scenario before a repeat, spaces repeats apart and rotates narrow roles', () => {
    for (const c of POSITIONS) {
      const list = WEEKLY_ASSIGNMENTS[c];
      const pool = ALL36_EPISODES.filter((e) => CATEGORY_ROLES[c].includes(PACKAGE_ROLE[protagonistRole(e) as keyof typeof PACKAGE_ROLE])).map((e) => e.id);
      const firstRepeat = list.findIndex((a) => a.reinforces !== null);
      expect(new Set(list.slice(0, firstRepeat).map((a) => a.situationId)).size, c).toBe(firstRepeat);
      expect(firstRepeat, c).toBe(pool.length);
      for (const a of list.filter((x) => x.reinforces !== null)) expect(a.week - a.reinforces!, `${c} ${a.situationId}`).toBeGreaterThanOrEqual(8);
      for (let i = 2; i < list.length; i++) expect([list[i - 2]!.roleGroup, list[i - 1]!.roleGroup, list[i]!.roleGroup].every((g) => g === list[i]!.roleGroup), `${c} weeks ${i - 1}-${i + 1}`).toBe(false);
      expect(new Set(list.map((a) => a.roleGroup)), c).toEqual(new Set(CATEGORY_ROLES[c].map((r) => ROLE_GROUP[r as keyof typeof ROLE_GROUP])));
      for (const g of new Set(list.map((a) => a.roleGroup))) {
        const ranks = list.slice(0, firstRepeat).filter((a) => a.roleGroup === g).map((a) => MODES.indexOf(a.mode));
        expect(ranks, `${c} ${g} first pass difficulty`).toEqual([...ranks].sort((x, y) => x - y));
      }
    }
  });

  it('keeps WEEKLY.md in step with the table', () => {
    expect(readFileSync('docs/training/all36/WEEKLY.md', 'utf8')).toBe(weeklyMarkdown());
  });

  it('7. is deterministic: the same week and position always get the same scenario (the approved table)', () => {
    const ids = (c: Position) => WEEKLY_ASSIGNMENTS[c].map((a) => a.situationId).join(' ');
    expect(ids('DEF')).toBe('D02 D01 D04 D05 D26 D25 D29 D27 D33 D31 D34 D32 D36 D01 D02 D26 D04 D29');
    expect(ids('MID')).toBe('D08 D03 D10 D06 D14 D21 D18 D28 D20 D35 D30 D03 D08 D06 D10 D21 D14 D28');
    expect(ids('FWD')).toBe('D07 D13 D09 D17 D12 D11 D19 D15 D16 D24 D22 D23 D13 D07 D17 D09 D19 D12');
    for (const c of POSITIONS) for (let w = 1; w <= 18; w++) {
      expect(weeklyAssignment(w, c)).toBe(weeklyAssignment(w, c));
      const a = weeklyProgress({ ...player(c, 'career-a'), week: w }).assignment;
      const b = weeklyProgress({ ...player(c, 'career-b'), week: w }).assignment;
      expect(a).toEqual(b);
      expect(a).toEqual(WEEKLY_ASSIGNMENTS[c][w - 1]);
    }
  });
});

describe('weekly All36 credit and saves', () => {
  it('3. refuses unknown, unapproved, other-category and other-week scenarios and unknown answers', () => {
    const s = player('DEF');
    for (const id of ['D99', 'D01', 'D03', 'D36', 'GK01', '']) expect(reduce(s, run(s, `bad-${id}`, 'A', id)).ok, id).toBe(false);
    expect(reduce(s, { type: 'all36Weekly', week: 1, situationId: 'D02', runId: 'x', at: 0, choice: 'E' as ChoiceId }).ok).toBe(false);
    expect(reduce(s, { type: 'all36Weekly', week: 2, situationId: 'D02', runId: 'x', at: 0, choice: 'A' }).ok).toBe(false);
    expect(reduce({ ...s, week: 19 }, { type: 'all36Weekly', week: 19, situationId: 'D02', runId: 'x', at: 0, choice: 'A' }).ok).toBe(false);
    expect(reduce(emptySave(), { type: 'all36Weekly', week: 1, situationId: 'D01', runId: 'x', at: 0, choice: 'A' }).ok).toBe(false);
    expect(gradeWeekly({ ...weeklyAssignment(1, 'DEF')!, situationId: 'D99' }, 'A')).toBeNull();
  });

  it('4. the first completion awards the existing weekly credit once, whatever the answer', () => {
    for (const grade of ['preferred', 'acceptable', 'misread'] as const) {
      const s = player('MID');
      const r = reduce(s, run(s, `first-${grade}`, choiceWith(1, 'MID', grade)));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.save.all36).toHaveLength(1);
      expect(r.save.all36[0]).toMatchObject({ week: 1, category: 'MID', situationId: 'D08', grade, credited: true });
      expect(r.save.teamTraining).toHaveLength(1);
      expect(r.save.teamTraining[0]!.scores.every((x) => x === { preferred: 1, acceptable: 0.5, misread: 0 }[grade])).toBe(true);
      expect(weeklyProgress(r.save)).toMatchObject({ completed: true, credited: true });
    }
    // A timeout is a no-decision run: it completes the week and is never shown as a band.
    const s = player('FWD');
    const t = act(s, run(s, 'timeout', null));
    expect(t.all36[0]).toMatchObject({ choice: null, grade: null, band: 'no-decision', credited: true });
  });

  it('stores the answer, grade, band, rationale, time and credit status', () => {
    const s = player('DEF');
    const choice = choiceWith(1, 'DEF', 'misread');
    const r = act(s, run(s, 'stored', choice)).all36[0]!;
    const v = gradeWeekly(weeklyAssignment(1, 'DEF')!, choice)!;
    expect(r).toEqual({ week: 1, category: 'DEF', situationId: 'D02', runId: 'stored', at: 1_800_000_000_000, choice, grade: 'misread', band: 'Low-value', score: 0, rationale: v.rationale, credited: true });
    expect(v.better).toMatch(/^[A-D]\. /);
    expect(v.rationale.length).toBeGreaterThan(10);
  });

  it('5. reloading and replaying never repay credit; a replay can raise the best mastery', () => {
    const s0 = player('DEF');
    const first = act(s0, run(s0, 'w1-a', choiceWith(1, 'DEF', 'misread')));
    const reloaded = parseImport(exportSave(first));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(reloaded.value).toEqual(first);
    // The same run again (a replayed callback after reload) changes nothing.
    const same = reduce(reloaded.value, run(reloaded.value, 'w1-a', choiceWith(1, 'DEF', 'misread')));
    expect(same.ok && same.save).toEqual(first);
    // A new run is practice: best improves, credit and attributes do not move.
    const again = act(reloaded.value, run(reloaded.value, 'w1-b', choiceWith(1, 'DEF', 'preferred')));
    expect(again.all36.at(-1)).toMatchObject({ credited: false, band: 'Elite' });
    expect(again.teamTraining).toEqual(first.teamTraining);
    expect(again.player!.attributes).toEqual(first.player!.attributes);
    expect(weeklyProgress(again)).toMatchObject({ completed: true, credited: true, runs: 2 });
    expect(weeklyProgress(again).best?.band).toBe('Elite');
    // A save edited to credit the week twice, or to change a grade, does not load.
    const twice = { ...again, all36: again.all36.map((r) => ({ ...r, credited: true })) };
    expect(parseImport(exportSave(twice)).ok).toBe(false);
    const regraded = { ...first, all36: [{ ...first.all36[0]!, grade: 'preferred' as const, band: 'Elite' as const, score: 1 }] };
    expect(parseImport(exportSave(regraded)).ok).toBe(false);
  });

  it('a week already counted by an older Team Training route stays practice only', () => {
    const s = player('MID');
    const legacy = { ...s, teamTraining: [{ week: 1, situations: [], scores: [1], delta: 0, changes: [], choiceMissed: 0 }] } as CareerSave;
    const r = act(legacy, run(legacy, 'late', choiceWith(1, 'MID', 'preferred')));
    expect(r.all36[0]!.credited).toBe(false);
    expect(r.teamTraining).toHaveLength(1);
    expect(weeklyProgress(r)).toMatchObject({ credited: false, countedElsewhere: true });
  });

  it('6. the story never needs Team Training: every week offers a way on', () => {
    expect(teamTrainingHandoff(null).skipLabel).toBeTruthy();
    for (const c of POSITIONS) for (let w = 1; w <= 20; w++) {
      const h = teamTrainingHandoff({ ...player(c), week: w });
      expect(h.skipLabel.length, `${c} week ${w}`).toBeGreaterThan(0);
      expect(h.playable, `${c} week ${w}`).toBe(w <= 18);
    }
  });

  it('8. a position change or a corrupted save cannot produce an incompatible assignment', () => {
    for (const bad of [0, 19, 1.5, Number.NaN, '1', null, undefined]) expect(weeklyAssignment(bad, 'DEF'), String(bad)).toBeNull();
    for (const bad of ['GK', 'def', '', null, 7]) expect(weeklyAssignment(1, bad), String(bad)).toBeNull();
    // Week 1 as DEF, then the saved position becomes FWD: FWD gets FWD's scenario and the DEF run is not borrowed.
    const def = player('DEF');
    const done = act(def, run(def, 'def-run', 'A'));
    const moved = { ...done, player: { ...done.player!, position: 'FWD' as const } };
    expect(weeklyProgress(moved).assignment?.situationId).toBe(WEEKLY_ASSIGNMENTS.FWD[0]!.situationId);
    expect(weeklyProgress(moved)).toMatchObject({ completed: false, runs: 0 });
    expect(reduce(moved, run(moved, 'def-again', 'A', 'D02')).ok).toBe(false);
    // A stored run edited to another category or scenario does not load.
    const swapped = { ...done, all36: [{ ...done.all36[0]!, category: 'FWD' as const }] };
    expect(parseImport(exportSave(swapped)).ok).toBe(false);
    const other = { ...done, all36: [{ ...done.all36[0]!, situationId: 'D36' }] };
    expect(parseImport(exportSave(other)).ok).toBe(false);
  });
});
