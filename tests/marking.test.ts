import { describe, expect, it } from 'vitest';
import { FORMATION_IDS } from '../src/game/match/formations';
import { HomeBot } from '../src/game/match/metrics';
import { MatchSim } from '../src/game/match/sim';
import { MATCH_TUNING as T } from '../src/game/match/tuning';
import type { MatchPlayerId, TeamId } from '../src/game/match/types';

const F = 1 / 60;

describe('persistent marking with explicit handoffs, every formation pairing', () => {
  it.each(FORMATION_IDS.flatMap((h) => FORMATION_IDS.map((a) => [h, a] as const)))('%s v %s: one marker per runner, marks held, handoffs recorded', (h, a) => {
    const sim = new MatchSim({ seed: 11, homeFormation: h, awayFormation: a, halfSeconds: 40 });
    const bot = new HomeBot(sim);
    const since: Partial<Record<MatchPlayerId, { opp: MatchPlayerId; since: number }>> = {};
    let dropsEarly = 0;
    const heldSince: Record<TeamId, number> = { home: Infinity, away: Infinity };
    let lastPoss: TeamId | null = null;
    for (let i = 0; i < 40 * 60 && sim.state.phase !== 'halftime'; i++) {
      bot.step();
      sim.step(F);
      const s = sim.state;
      if (s.possession !== lastPoss) {
        lastPoss = s.possession;
        heldSince.home = heldSince.away = Infinity;
        if (s.possession) heldSince[s.possession] = s.simTime;
      }
      for (const team of ['home', 'away'] as TeamId[]) {
        const marks = s.defense[team].marks;
        const opps = Object.values(marks).map((m) => m!.opp);
        expect(new Set(opps).size, 'two defenders on one runner').toBe(opps.length);
        for (const [id, m] of Object.entries(marks) as [MatchPlayerId, { opp: MatchPlayerId; since: number }][]) {
          expect(s.players[id].team).toBe(team);
          expect(s.players[m.opp].team).not.toBe(team);
          expect(s.players[m.opp].isKeeper).toBe(false);
          expect(m.since).toBeLessThanOrEqual(s.simTime);
        }
        // The team plan runs on its own cadence; within a plan interval of winning the ball every mark is gone.
        if (s.possession === team && s.simTime - heldSince[team] > 0.25) expect(opps).toHaveLength(0);
      }
      // A marker who loses his runner within the hold time without the ball changing hands, a press/cover/loose-ball job or a handoff is a flicker.
      for (const team of ['home', 'away'] as TeamId[]) {
        const d = s.defense[team];
        for (const id of Object.keys(since) as MatchPlayerId[]) {
          if (s.players[id].team !== team) continue;
          const prev = since[id]!;
          const now = d.marks[id];
          const tookOver = Object.values(d.marks).some((m) => m!.opp === prev.opp);
          if (!now && !tookOver && s.possession !== team && s.phase === 'live' && id !== d.presserId && id !== d.coverId && s.players[id].intent !== 'recover' && s.players[id].intent !== 'chase' && s.simTime - prev.since < T.defense.markHoldSeconds - 1e-9) dropsEarly++;
        }
      }
      for (const k of Object.keys(since)) delete since[k as MatchPlayerId];
      for (const team of ['home', 'away'] as TeamId[]) Object.assign(since, sim.state.defense[team].marks);
    }
    expect(dropsEarly).toBe(0);
  });
});
