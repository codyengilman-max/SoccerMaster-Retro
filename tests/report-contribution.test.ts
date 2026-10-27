import { describe, expect, it } from 'vitest';
import { emptySave, reduce } from '../src/game/career/state';
import { exportSave, parseImport } from '../src/game/career/saveio';
import { buildReport, defensePoints, matchContribution } from '../src/game/report/report';
import { contributionLines, seasonTotals } from '../src/game/report/contributionText';

const input = { matchId: 'S1-L3', week: 1, competition: 'League', home: 'Batavia', away: 'Royal Salt', score: { home: 3, away: 1 }, playerName: 'Cody', position: 'MID', minutes: 40 };
const mine = { assists: 3, slideWon: 4, standingWon: 0, interceptions: 4, defenseUnits: 20 };
const contribution = matchContribution(mine, { H8: mine, H9: { assists: 0, slideWon: 0, standingWon: 0, interceptions: 0, defenseUnits: 0 }, A7: { assists: 1, slideWon: 0, standingWon: 0, interceptions: 0, defenseUnits: 0 } });

describe('assists and defensive points in reports', () => {
  it('new reports carry the finalized contribution and drop Assists from not tracked', () => {
    const r = buildReport(input, [], contribution);
    expect(r.contribution).toEqual({ version: 1, mine, assistsBy: { H8: 3, A7: 1 } });
    expect(r.stats.unavailable).not.toContain('Assists');
    expect(contributionLines(r)).toContain('Defensive points: 10');
    expect(contributionLines(r).at(-1)).toBe('All assists - Batavia: H8 3; opponents: A7 1');
    expect(defensePoints(21)).toBe('10.5');
  });
  it('historical reports keep "not tracked" instead of showing zero', () => {
    const r = buildReport(input, []);
    expect(r.contribution).toBeUndefined();
    expect(r.stats.unavailable).toContain('Assists');
    expect(contributionLines(r)[0]).toContain('not tracked');
  });
  it('save round-trips the contribution; tampered points or unknown players are rejected', () => {
    const a = reduce(emptySave(), { type: 'matchReport', report: buildReport(input, [], contribution) });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const back = parseImport(exportSave(a.save));
    expect(back.ok && back.value.reports[0]!.contribution).toEqual(a.save.reports[0]!.contribution);
    const bad = (c: unknown) => {
      const raw = JSON.parse(exportSave(a.save));
      raw.save.reports[0].contribution = c;
      return parseImport(JSON.stringify(raw)).ok;
    };
    expect(bad({ ...contribution, mine: { ...mine, defenseUnits: 22 } })).toBe(false);
    expect(bad({ ...contribution, assistsBy: { Z1: 1 } })).toBe(false);
    expect(bad({ ...contribution, mine: { ...mine, assists: -1 } })).toBe(false);
  });
  it('player statistics total only tracked matches and say when older ones are not tracked', () => {
    const old = buildReport({ ...input, matchId: 'old' }, [{ id: 'goal-1', kind: 'goal', at: 5, outcome: '' }]);
    const s1 = { ...emptySave(), reports: [old] };
    expect(seasonTotals(s1)).toContain('not tracked yet');
    const s2 = { ...emptySave(), reports: [old, buildReport(input, [], contribution)] };
    expect(seasonTotals(s2)).toBe('Goals 1 - Assists 3 - Defensive points 10 (1 of 2 matches tracked)');
  });
});
