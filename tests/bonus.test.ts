import { describe, expect, it } from 'vitest';
import { ALL36_EPISODES } from '../src/game/training12/all36/package';
import { weeklyAssignment } from '../src/game/training12/all36/weekly';
import type { ChoiceId } from '../src/game/training12/all36/types';
import { emptySave, reduce, type Action, type CareerSave } from '../src/game/career/state';
import { exportSave, parseImport } from '../src/game/career/saveio';
import { balance, emptyBank, grant, matchAwardKeys, teamTrainingResult } from '../src/game/career/bonus';
import { buildReport, matchContribution } from '../src/game/report/report';
import type { Position } from '../src/game/career/types';

const act = (s: CareerSave, a: Action): CareerSave => {
  const r = reduce(s, a);
  if (!r.ok) throw new Error(r.error);
  return r.save;
};
const player = (position: Position = 'MID'): CareerSave => act(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Kid', position });
const choice = (s: CareerSave, grade: 'preferred' | 'misread'): ChoiceId => {
  const a = weeklyAssignment(s.week, s.player!.position)!;
  const v = ALL36_EPISODES.find((e) => e.id === a.situationId)!.variants.find((x) => x.id === 'base')!;
  return (Object.keys(v.grades) as ChoiceId[]).find((k) => v.grades[k] === grade)!;
};
const tt = (s: CareerSave, runId: string, c: ChoiceId | null): CareerSave =>
  act(s, { type: 'all36Weekly', week: s.week, situationId: weeklyAssignment(s.week, s.player!.position)!.situationId, runId, at: 1, choice: c });
const zero = { assists: 0, slideWon: 0, standingWon: 0, interceptions: 0, defenseUnits: 0 };
const report = (matchId: string, goals: number, mine = zero, competition = 'League') =>
  buildReport({ matchId, week: 1, competition, home: 'Batavia', away: 'X', score: { home: goals, away: 0 }, playerName: 'Kid', position: 'MID', minutes: 40 },
    Array.from({ length: goals }, (_, i) => ({ id: `goal-${i}`, kind: 'goal' as const, at: i, outcome: '' })), matchContribution(mine, { H8: mine }));

describe('match achievements', () => {
  it('stack Hat Trick, Playmaker and Ball Winner from one official report, once per match', () => {
    const r = report('S1-L1', 3, { ...zero, assists: 3, interceptions: 4, slideWon: 4, defenseUnits: 20 });
    expect(matchAwardKeys(r)).toEqual(['hatTrick:S1-L1', 'playmaker:S1-L1', 'ballWinner:S1-L1']);
    let s = act(player(), { type: 'matchReport', report: r });
    expect(balance(s.bonus)).toBe(3);
    s = act(s, { type: 'matchReport', report: r });
    expect(balance(s.bonus)).toBe(3);
  });
  it('pays nothing below the thresholds, for friendlies, or beyond the threshold twice', () => {
    expect(matchAwardKeys(report('a', 2, { ...zero, assists: 2, defenseUnits: 19, interceptions: 1, slideWon: 8 }))).toEqual([]);
    expect(matchAwardKeys(report('b', 5, { ...zero, assists: 6 }, 'Friendly'))).toEqual([]);
    expect(matchAwardKeys(report('c', 0, { ...zero, interceptions: 7, defenseUnits: 21 }))).toEqual(['ballWinner:c']);
    expect(grant(grant(emptyBank(), ['x:1']).bank, ['x:1', 'x:1']).paid).toEqual([]);
  });
  it('historical reports without contribution never pay Playmaker or Ball Winner', () => {
    const r = buildReport({ matchId: 'old', week: 1, competition: 'League', home: 'B', away: 'X', score: { home: 0, away: 0 }, playerName: 'K', position: 'MID', minutes: 40 }, []);
    expect(matchAwardKeys(r)).toEqual([]);
  });
});

describe('Cloudy Champion', () => {
  it('pays once per story week for 3 stars', () => {
    let s = player();
    s = act(s, { type: 'cloudyResult', runId: 'c1', difficulty: 'easy' as never, score: 10, stars: 2 });
    expect(balance(s.bonus)).toBe(0);
    s = act(s, { type: 'cloudyResult', runId: 'c2', difficulty: 'easy' as never, score: 50, stars: 3 });
    s = act(s, { type: 'cloudyResult', runId: 'c3', difficulty: 'easy' as never, score: 60, stars: 3 });
    expect(s.bonus.awards).toEqual(['cloudyChampion:w1']);
  });
});

describe('Training Perfection', () => {
  it('pairs never overlap: 2 in a row pay 1, 3 pay 1, 4 pay 2; a gap breaks the run', () => {
    let b = emptyBank();
    for (const w of [1, 2, 3, 4]) b = teamTrainingResult(b, w, true).bank;
    expect(b.awards).toEqual(['trainingPerfection:w1-w2', 'trainingPerfection:w3-w4']);
    let c = emptyBank();
    for (const w of [1, 2, 3]) c = teamTrainingResult(c, w, true).bank;
    expect(c.awards).toHaveLength(1);
    let d = emptyBank();
    for (const [w, p] of [[1, true], [2, false], [3, true]] as const) d = teamTrainingResult(d, w, p).bank;
    expect(d.awards).toEqual([]);
  });
  it('uses only the first graded answer: a later perfect replay cannot replace a wrong first answer', () => {
    let s = player();
    s = tt(s, 'r1', choice(s, 'preferred'));
    expect(s.bonus.perfectWeeks).toEqual([1]);
    s = act(s, { type: 'endWeek' });
    s = tt(s, 'r2', choice(s, 'misread'));
    s = tt(s, 'r3', choice(s, 'preferred'));
    expect(s.bonus.perfectWeeks).toEqual([1]);
    expect(balance(s.bonus)).toBe(0);
    s = tt(s, 'r2', choice(s, 'misread'));
    expect(balance(s.bonus)).toBe(0);
  });
});

describe('spending', () => {
  const funded = () => act(player(), { type: 'matchReport', report: report('S1-L1', 3) });
  it('applies exactly +1, keeps fractional development carry, and is idempotent by id', () => {
    let s = funded();
    const before = s.player!.attributes.passing;
    s = { ...s, devCarry: { ...s.devCarry, passing: 0.4 } };
    s = act(s, { type: 'bonusSpend', id: 'sp1', attribute: 'passing' });
    expect(s.player!.attributes.passing).toBe(before + 1);
    expect(s.devCarry.passing).toBe(0.4);
    expect(balance(s.bonus)).toBe(0);
    const again = reduce(s, { type: 'bonusSpend', id: 'sp1', attribute: 'passing' });
    expect(again.ok && again.changed).toBe(false);
    expect(reduce(s, { type: 'bonusSpend', id: 'sp2', attribute: 'passing' }).ok).toBe(false);
  });
  it('never consumes a point past the potential cap or on a non-attribute', () => {
    const s0 = funded();
    const capped = { ...s0, player: { ...s0.player!, attributes: { ...s0.player!.attributes, finishing: s0.player!.potential.finishing } } };
    const r = reduce(capped, { type: 'bonusSpend', id: 'sp1', attribute: 'finishing' });
    expect(r.ok).toBe(false);
    expect(balance(capped.bonus)).toBe(1);
    expect(reduce(s0, { type: 'bonusSpend', id: 'sp1', attribute: 'energy' as never }).ok).toBe(false);
  });
  it('survives save/reload; tampered banks are rejected; old saves start empty', () => {
    const s = act(funded(), { type: 'bonusSpend', id: 'sp1', attribute: 'passing' });
    const back = parseImport(exportSave(s));
    expect(back.ok && back.value.bonus).toEqual(s.bonus);
    const raw = JSON.parse(exportSave(s));
    raw.save.bonus.spends.push({ id: 'sp2', attribute: 'passing', week: 1 });
    expect(parseImport(JSON.stringify(raw)).ok).toBe(false);
    const dup = JSON.parse(exportSave(s));
    dup.save.bonus.awards.push(dup.save.bonus.awards[0]);
    expect(parseImport(JSON.stringify(dup)).ok).toBe(false);
    const legacy = JSON.parse(exportSave(s));
    delete legacy.save.bonus;
    const l = parseImport(JSON.stringify(legacy));
    expect(l.ok && l.value.bonus).toEqual(emptyBank());
  });
});
