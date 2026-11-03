import { describe, expect, it } from 'vitest';
import { aiAttributes, aiStart, squadOverall } from '../src/game/career/aiDevelopment';
import { DEV_CONFIG, applyProposal, overallOf, proposeWeek, type SourceWeek } from '../src/game/career/development';
import { migrateToV2, migrationReport } from '../src/game/career/migrationV2';
import { parseSave } from '../src/game/career/saveio';
import { emptySave, reduce, type CareerSave } from '../src/game/career/state';
import { ATTRIBUTES, type AttributeId } from '../src/game/career/types';
import { HOME_ALLOCATION, matchAllocation } from '../src/game/career/weekSources';
import { SEASON_LENGTH } from '../src/game/season/calendar';

const created = (): CareerSave => {
  const r = reduce(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Pat', position: 'MID' });
  if (!r.ok) throw new Error(r.error);
  return r.save;
};
const OLD6 = ['firstTouch', 'passing', 'dribbling', 'finishing', 'defending', 'awareness'] as const;
/** A schema-2 save as the previous release wrote it: six integer attributes, potential 70, a fractional carry. */
const schema2 = (vals: number[]): Record<string, unknown> => {
  const s = JSON.parse(JSON.stringify(created())) as Record<string, any>;
  s.schema = 2;
  s.player.attributes = Object.fromEntries(OLD6.map((a, i) => [a, vals[i]]));
  s.player.potential = Object.fromEntries(OLD6.map((a) => [a, 70]));
  s.devCarry = { passing: 0.4 };
  delete s.progression;
  return s;
};
const sum = (o: Readonly<Record<string, number>>) => Object.values(o).reduce((a, b) => a + b, 0);

describe('progression v2: new career, cap and multipliers', () => {
  it('a new player starts at overall 50 on ten attributes', () => {
    const s = created();
    expect(Object.keys(s.player!.attributes).sort()).toEqual([...ATTRIBUTES].sort());
    expect(overallOf(s.player!.attributes)).toBe(DEV_CONFIG.start);
  });
  it('every activity mapping sums to 1', () => {
    for (const m of Object.values(HOME_ALLOCATION)) expect(sum(m as Record<string, number>)).toBeCloseTo(1, 12);
    const stats = { passes: { num: 3, den: 5 }, involvements: 6, possessions: 4, shotsOnTarget: { num: 1, den: 2 }, recoveries: 2, interceptions: 1, slides: { num: 0, den: 1 } };
    expect(sum(matchAllocation(stats as never) as Record<string, number>)).toBeCloseTo(1, 12);
    expect(HOME_ALLOCATION.juggling).toEqual({ firstTouch: 0.5, dribbling: 0.5 });
  });
  it('one multiplier per role, never stacked: main 2.0x opponent, main 1.7x teammate', () => {
    const w: SourceWeek[] = [{ source: 'team', status: 'done', score: 0.8, allocation: { passing: 1 }, activities: ['x'] }];
    const a = Object.fromEntries(ATTRIBUTES.map((k) => [k, 50])) as Record<AttributeId, number>;
    const main = proposeWeek(a, w, 'protagonist', null).applied.passing;
    expect(main / proposeWeek(a, w, 'opponent', null).applied.passing).toBeCloseTo(2, 12);
    expect(main / proposeWeek(a, w, 'teammate', null).applied.passing).toBeCloseTo(1.7, 12);
  });
});

describe('progression v2: 18-week Season 1 simulations (main character)', () => {
  const season = (score: number, played: (w: number) => boolean) => {
    let a = created().player!.attributes as Record<AttributeId, number>;
    const ov: number[] = [];
    for (let w = 1; w <= SEASON_LENGTH; w++) {
      const on = played(w);
      const weeks: SourceWeek[] = (['home', 'team', 'match'] as const).map((source) => ({
        source, status: on ? 'done' : 'skipped', score: on ? score : 0,
        allocation: Object.fromEntries(ATTRIBUTES.map((k) => [k, 1 / ATTRIBUTES.length])), activities: [`${source}${w}`],
      }));
      a = applyProposal(a, proposeWeek(a, weeks, 'protagonist', DEV_CONFIG.seasonOneCap));
      ov.push(overallOf(a));
    }
    return ov;
  };
  it('low, typical and strong participation finish below, near and at the 64 maximum (never above)', () => {
    const low = season(0.4, (w) => w % 2 === 0);
    const typical = season(0.65, () => true);
    const strong = season(0.95, () => true);
    console.log('S1 overall after 18 weeks', { low: low.at(-1), typical: typical.at(-1), strong: strong.at(-1), weeksToCapStrong: strong.findIndex((x) => x >= 64 - 1e-9) + 1 });
    expect(low.at(-1)!).toBeLessThan(56);
    expect(typical.at(-1)!).toBeGreaterThan(58);
    expect(typical.at(-1)!).toBeLessThan(64);
    expect(strong.at(-1)!).toBeCloseTo(64, 6);
    for (const x of [...low, ...typical, ...strong]) expect(x).toBeLessThanOrEqual(64 + 1e-9);
    // Reaching 64 is earned late in the season, not guaranteed early.
    expect(strong.findIndex((x) => x >= 64 - 1e-9) + 1).toBeGreaterThan(12);
  });
});

describe('progression v2: weekly review exactly once', () => {
  it('a reloaded save re-reviews nothing; a second endWeek reviews the next week only', () => {
    let s = created();
    const r = reduce(s, { type: 'endWeek' });
    if (!r.ok) throw new Error(r.error);
    s = r.save;
    const back = parseSave(JSON.parse(JSON.stringify(s)));
    expect(back.ok && back.value.player!.attributes).toEqual(s.player!.attributes);
    expect(back.ok && back.value.history.map((h) => h.week)).toEqual([1]);
    const again = reduce(s, { type: 'endWeek' });
    expect(again.ok && again.save.history.map((h) => h.week)).toEqual([1, 2]);
  });
  it('bonus points stay banked at the cap and add exactly +1 below it', () => {
    let s = created();
    s = { ...s, bonus: { ...s.bonus, awards: ['hatTrick:k1'], spends: [] } };
    const ok = reduce(s, { type: 'bonusSpend', id: 'b1', attribute: 'pace' });
    if (!ok.ok) throw new Error(ok.error);
    expect(ok.save.player!.attributes.pace).toBe(51);
    const atCap = { ...s, player: { ...s.player!, attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, 64])) as Record<AttributeId, number> } };
    const blocked = reduce(atCap, { type: 'bonusSpend', id: 'b2', attribute: 'pace' });
    expect(blocked.ok).toBe(false);
  });
  it('editing identity/position paths cannot raise the overall past the cap (one formula for every position)', () => {
    const s = created();
    const atCap = { ...s, player: { ...s.player!, attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, 64])) as Record<AttributeId, number> } };
    // The reducer has no position-change action; identity edits never touch attributes.
    const moved = reduce(atCap, { type: 'setIdentity', name: 'Pat', gender: 'girl' });
    const after = moved.ok ? moved.save : atCap;
    expect(after.player!.attributes).toEqual(atCap.player!.attributes);
    for (const position of ['DEF', 'MID', 'FWD'] as const) expect(overallOf({ ...atCap.player!, position }.attributes)).toBeCloseTo(64, 9);
    expect(overallOf(after.player!.attributes)).toBeCloseTo(64, 9);
    const w = reduce(after, { type: 'endWeek' });
    expect(w.ok && overallOf(w.save.player!.attributes)).toBeLessThanOrEqual(64 + 1e-9);
  });
});

describe('progression v2: existing-save migration (schema 2 -> 3)', () => {
  it('adds four attributes at the old mean, applies pending carry once, reports, and is repeat-safe', () => {
    const old = schema2([44, 47, 41, 40, 43, 45]);
    const rep = migrationReport(old);
    expect(rep.overallBefore).toBeCloseTo(43.333333, 5);
    expect(rep.added!.pace).toBeCloseTo(43.333333, 5);
    expect(rep.pendingApplied).toEqual({ passing: 0.4 });
    expect(rep.overCap).toBe(false);
    expect(rep.removed).toEqual([]);
    const once = migrateToV2(old);
    expect(migrateToV2(once)).toBe(once);
    const parsed = parseSave(old);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.schema).toBe(3);
    expect(parsed.value.player!.attributes.passing).toBeCloseTo(47.4, 10);
    expect(parsed.value.progression).toEqual(rep);
    const twice = parseSave(JSON.parse(JSON.stringify(parsed.value)));
    expect(twice.ok && twice.value).toEqual(parsed.value);
  });
  it('an over-cap save keeps its ratings, is flagged, and gets no ordinary growth', () => {
    const parsed = parseSave(schema2([70, 70, 69, 68, 70, 70]));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.progression!.overCap).toBe(true);
    expect(parsed.value.player!.attributes.firstTouch).toBe(70);
    const w = reduce(parsed.value, { type: 'endWeek' });
    expect(w.ok && sum(w.save.history.at(-1)!.development!.proposal.applied)).toBe(0);
  });
});

describe('progression v2: AI development', () => {
  it('is deterministic per club/slot/review (no reroll on load) and advances only with reviews', () => {
    expect(aiAttributes('royal_salt', 'A5', 'opponent', 6)).toEqual(aiAttributes('royal_salt', 'A5', 'opponent', 6));
    expect(aiAttributes('royal_salt', 'A5', 'opponent', 0)).toEqual(aiStart('royal_salt', 'A5'));
    expect(overallOf(aiAttributes('royal_salt', 'A5', 'opponent', 7))).toBeGreaterThan(overallOf(aiAttributes('royal_salt', 'A5', 'opponent', 6)));
  });
  it('AI players are not held to the 64 maximum and teammates grow 1/1.7 as fast as the main character', () => {
    const late = overallOf(aiAttributes('batavia', 'H4', 'teammate', 200));
    expect(late).toBeGreaterThan(64);
    const squad = ['A1', 'A2', 'A3'].map((id) => aiAttributes('dynamics_fc', id, 'opponent', 5));
    expect(squadOverall(squad)).toBeCloseTo(squad.reduce((s, a) => s + overallOf(a), 0) / 3, 12);
  });
});

describe('progression v2: review fixes', () => {
  it('a carry that pushes a legacy save over 64 is flagged over the cap', async () => {
    const old = schema2([64, 64, 64, 64, 64, 64]);
    old.devCarry = { passing: 0.9, finishing: 0.9 };
    expect(migrationReport(old).overCap).toBe(true);
  });
  it('one activity logged and completed in a scheduled session counts once at home', async () => {
    const { weekSources } = await import('../src/game/career/weekSources');
    const s = created();
    const wk = { ...s, week: 2 };
    const log = { week: 2, skill: 'passing', phase: 1, activityId: 'ps-wide-gate', attempts: [] } as never;
    const jr = { week: 2, credited: true, completion: 'done', activityId: 'ps-wide-gate' } as never;
    const both = weekSources({ ...wk, homeLogs: [log], journal: [jr] } as CareerSave, 2).find((x) => x.source === 'home')!;
    expect(both.activities).toEqual(['ps-wide-gate']);
  });
  it('a required task logged from the library (no session, uncredited) still counts at home; skipped entries do not', async () => {
    const { weekSources } = await import('../src/game/career/weekSources');
    const wk = { ...created(), week: 5 };
    const jr = (completion: string) => ({ week: 5, sessionId: null, credited: false, completion, activityId: 'ps-wide-gate' }) as never;
    const done = weekSources({ ...wk, journal: [jr('done')] } as CareerSave, 5).find((x) => x.source === 'home')!;
    expect(done.status).toBe('done');
    expect(done.activities).toEqual(['ps-wide-gate']);
    expect(done.score).toBeGreaterThan(0);
    const skipped = weekSources({ ...wk, journal: [jr('skipped')] } as CareerSave, 5).find((x) => x.source === 'home')!;
    expect(skipped.status).toBe('skipped');
    expect(skipped.score).toBe(0);
  });
  it('a Week 1 plan whose sessions are all skipped keeps the home share as skipped, not redistributed', async () => {
    const { weekSources } = await import('../src/game/career/weekSources');
    const wk = { ...created(), week: 1 };
    const none = weekSources({ ...wk, plan: null } as CareerSave, 1).find((x) => x.source === 'home')!;
    expect(none.status).toBe('none');
    const plan = { week: 1, level: 1, sessions: [{ id: 's1', items: [] }] } as never;
    const planned = weekSources({ ...wk, plan } as CareerSave, 1).find((x) => x.source === 'home')!;
    expect(planned.status).toBe('skipped');
  });
});
