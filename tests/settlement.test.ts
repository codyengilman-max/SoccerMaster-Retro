import { describe, expect, it } from 'vitest';
import { CAREER_CONFIG } from '../src/game/career/config';
import { createPlayer } from '../src/game/career/player';
import { parseSave } from '../src/game/career/saveio';
import { emptySave, reduce } from '../src/game/career/state';
import { ATTRIBUTES } from '../src/game/career/types';
import { DEV_WEIGHTS, weekBudget } from '../src/game/report/registry';
import { CARRY_MAX, WEEK_CREDITS, settleWeek, zeroFractions, type MatchInput, type SettleInput } from '../src/game/report/settlement';
import { ratio, type MatchStats } from '../src/game/report/stats';

const stats = (n: number): MatchStats => ({
  involvements: n, possessions: n, possessionLosses: 0, passes: ratio(n, n), groundPasses: ratio(n, n), chips: ratio(0, 0),
  shotsOnTarget: ratio(1, 1), goalConversion: ratio(0, 1), goals: 0, recoveries: 1, interceptions: 0, slides: ratio(0, 0), fouls: 0, unavailable: [],
});
const match = (n: number, overall: number | null, confidence: MatchInput['rating']['confidence'] = 'high'): MatchInput =>
  ({ minutes: 16, stats: stats(n), rating: { version: 1, overall, confidence, categories: [] } });
const player = createPlayer('p', 'Pat', 'MID');
const base = (o: Partial<SettleInput> = {}): SettleInput => ({
  week: 1, player, homeSessions: [], teamScore: null, teamAttributes: [], matches: [], recess: null, carry: zeroFractions(), granted: zeroFractions(), ...o,
});
const credits = (s: ReturnType<typeof settleWeek>, src: string) => s.sources.find((x) => x.source === src)?.credits ?? 0;

describe('weekly development settlement (35/30/30/5)', () => {
  it('unscheduled recess goes to home and team in proportion; match stays 30%', () => {
    const b = weekBudget(false);
    expect(b.match).toBe(DEV_WEIGHTS.match);
    expect(b.recess).toBe(0);
    expect(b.home + b.team + b.match).toBeCloseTo(1, 10);
    expect(b.home / b.team).toBeCloseTo(DEV_WEIGHTS.home / DEV_WEIGHTS.team, 10);
    expect(weekBudget(true)).toEqual(DEV_WEIGHTS);
  });

  it('a skipped activity is not redistributed and a no-match week leaves match unearned', () => {
    const team = settleWeek(base({ teamScore: 1, teamAttributes: ['defending'] }));
    expect(credits(team, 'team')).toBeCloseTo(WEEK_CREDITS * weekBudget(false).team, 4);
    expect(credits(team, 'home')).toBe(0);
    expect(credits(team, 'match')).toBe(0);
    expect(team.sources.find((x) => x.source === 'match')!.note).toMatch(/unearned/);
    // Team credits only go to attributes the week's situations practised; none means nothing is invented.
    const none = settleWeek(base({ teamScore: 1 }));
    expect(credits(none, 'team')).toBe(0);
    expect(none.earned.awareness).toBe(0);
  });

  it('several matches share one match share: more or repeated matches never add more', () => {
    const one = settleWeek(base({ matches: [match(6, 80)] }));
    const four = settleWeek(base({ matches: [match(6, 80), match(6, 80), match(6, 80), match(6, 80)] }));
    expect(credits(four, 'match')).toBeCloseTo(credits(one, 'match'), 6);
    expect(credits(one, 'match')).toBeLessThanOrEqual(WEEK_CREDITS * DEV_WEIGHTS.match);
    const lowConf = settleWeek(base({ matches: [match(6, 80, 'low')] }));
    expect(credits(lowConf, 'match')).toBeCloseTo(credits(one, 'match') / 2, 6);
    expect(credits(settleWeek(base({ matches: [match(6, null, 'none')] })), 'match')).toBe(0);
  });

  it('a perfect week earns at most WEEK_CREDITS in total, fractions carry and are capped', () => {
    const s = settleWeek(base({ homeSessions: ['x', 'y', 'z'], teamScore: 1, matches: [match(8, 100)], recess: { played: true } }));
    const total = s.sources.reduce((a, x) => a + x.credits, 0);
    expect(total).toBeLessThanOrEqual(WEEK_CREDITS + 1e-9);
    for (const a of ATTRIBUTES) expect(s.carry[a]).toBeLessThanOrEqual(CARRY_MAX);
    const banked = settleWeek(base({ teamScore: 1, teamAttributes: ['awareness'], carry: { ...zeroFractions(), awareness: 0.9 } }));
    expect(banked.applied.awareness).toBe(1);
    expect(banked.carry.awareness).toBeLessThan(1);
  });

  it('respects potential and the weekly caps already used by evidence growth', () => {
    const capped = createPlayer('q', 'Q', 'DEF');
    const atCeiling = { ...capped, attributes: { ...capped.attributes, awareness: capped.potential.awareness } };
    const s = settleWeek(base({ player: atCeiling, teamScore: 1, teamAttributes: ['awareness'], carry: { ...zeroFractions(), awareness: 1 } }));
    expect(s.applied.awareness).toBe(0);
    expect(s.carry.awareness).toBe(0);
    const full = zeroFractions();
    full.passing = CAREER_CONFIG.growth.weeklyCapTotal;
    const t = settleWeek(base({ teamScore: 1, teamAttributes: ['awareness'], carry: { ...zeroFractions(), awareness: 1 }, granted: full }));
    expect(t.applied.awareness).toBe(0);
  });

  it('endWeek stores the settlement once, carries fractions and the save round-trips; old saves load', () => {
    let s = emptySave();
    const r = reduce(s, { type: 'createPlayer', id: 'p1', name: 'Pat', position: 'MID' });
    expect(r.ok).toBe(true);
    s = (r as { save: typeof s }).save;
    const e = reduce(s, { type: 'endWeek' });
    expect(e.ok).toBe(true);
    const next = (e as { save: typeof s }).save;
    const h = next.history.at(-1)!;
    expect(h.settlement?.week).toBe(1);
    expect(next.devCarry).toEqual(h.settlement!.carry);
    const back = parseSave(JSON.parse(JSON.stringify(next)));
    expect(back.ok).toBe(true);
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete old.devCarry;
    const parsed = parseSave(old);
    expect(parsed.ok && parsed.value.devCarry).toEqual(zeroFractions());
  });
  it('graded Team Training points count against the weekly caps before settlement adds more', async () => {
    const { selectSituations } = await import('../src/game/career/teamTraining');
    let s = emptySave();
    s = (reduce(s, { type: 'createPlayer', id: 'p1', name: 'Pat', position: 'MID' }) as { save: typeof s }).save;
    const ids = selectSituations('MID', 1).map((x) => x.id);
    const attrs = [...new Set(selectSituations('MID', 1).flatMap((x) => x.attributes))];
    const changes = attrs.map((a) => ({ attribute: a, from: s.player!.attributes[a], to: s.player!.attributes[a] + CAREER_CONFIG.growth.weeklyCapTotal }));
    const full = { ...s, teamTraining: [{ week: 1, situations: ids, scores: ids.map(() => 1), delta: 2, changes }], devCarry: Object.fromEntries(ATTRIBUTES.map((a) => [a, 1])) as typeof s.devCarry };
    const e = reduce(full, { type: 'endWeek' });
    expect(e.ok).toBe(true);
    const st = (e as { save: typeof s }).save.history.at(-1)!.settlement!;
    expect(Object.values(st.applied).reduce((a, b) => a + b, 0)).toBe(0);
    expect(Object.keys(st.sources.find((x) => x.source === 'team')!.attributes).sort()).toEqual([...attrs].sort());
  });
});
