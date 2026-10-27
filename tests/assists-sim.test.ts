import { describe, expect, it } from 'vitest';
import { ContributionTracker, DEFENSE_UNITS } from '../src/game/report/assists';
import { MatchSim } from '../src/game/match/sim';
import { MATCH_PLAYER_IDS } from '../src/game/match/types';

describe('contribution tracker on the real sim', () => {
  it('stays consistent with the match: assists never exceed a team\'s goals, units match the counts, nothing missed', () => {
    let assists = 0;
    let goals = 0;
    let units = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const sim = new MatchSim({ seed });
      const t = new ContributionTracker();
      for (let i = 0; i < 60 * 240; i++) {
        sim.step(1 / 60);
        t.observe(sim.state, sim.state.events);
      }
      t.observe(sim.state, sim.state.events);
      expect(t.missed).toBe(0);
      const table = t.table(MATCH_PLAYER_IDS);
      expect(Object.keys(table)).toHaveLength(18);
      for (const team of ['home', 'away'] as const) {
        const a = MATCH_PLAYER_IDS.filter((id) => sim.state.players[id].team === team).reduce((n, id) => n + table[id]!.assists, 0);
        expect(a).toBeLessThanOrEqual(sim.state.score[team]);
        assists += a;
        goals += sim.state.score[team];
      }
      for (const c of Object.values(table)) {
        expect(c.defenseUnits).toBe(c.slideWon * DEFENSE_UNITS.slide + c.standingWon * DEFENSE_UNITS.standing + c.interceptions * DEFENSE_UNITS.interception);
        expect(c.standingWon).toBe(0);
        units += c.defenseUnits;
      }
      const again = new ContributionTracker();
      again.observe(sim.state, sim.state.events);
      again.observe(sim.state, sim.state.events);
      expect(again.missed).toBe(0);
    }
    process.stderr.write(`sim sweep: goals ${goals}, assists ${assists}, defensive units ${units}\n`);
    expect(goals).toBeGreaterThan(0);
    expect(units).toBeGreaterThan(0);
  });
});
