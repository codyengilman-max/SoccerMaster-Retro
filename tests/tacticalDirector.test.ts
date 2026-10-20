import { describe, expect, it } from 'vitest';
import { match } from '../src/game';
import { REFEREE_TUNING } from '../src/game/match/referee';
import { YARD_METRES, type TacticalDirector } from '../src/game/match/tacticalDirector';
import type { TacticalObservation, TacticalResult } from '../src/game/match/tactical';

const { MatchSim, TEAM_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim>;
type Team = match.TeamId;
interface Internals {
  teams: Record<Team, { engine: { step: (o: TacticalObservation) => TacticalResult } }>;
}
const F = 1 / 60;
const directorOf = (sim: Sim): TacticalDirector => (sim as unknown as { tactics: TacticalDirector }).tactics;
const inner = (d: TacticalDirector): Internals => d as unknown as Internals;

/** Wraps each team's engine step so a test sees every observation and result at the moment of the call. */
function spy(sim: Sim, on: (team: Team, obs: TacticalObservation, r: TacticalResult) => void): void {
  const teams = inner(directorOf(sim)).teams;
  for (const team of ['home', 'away'] as const) {
    const e = teams[team].engine;
    const step = e.step.bind(e);
    e.step = (obs) => {
      const seen = { ...obs, completedCommands: [...(obs.completedCommands ?? [])] };
      const r = step(obs);
      on(team, seen, r);
      return r;
    };
  }
}

describe('v0.5 tactical director (PR #25 review)', () => {
  it('acknowledged kick commands reach the engine, so the carrier gets new kick decisions', () => {
    const sim = new MatchSim({ seed: 3, halfSeconds: 30, tactics: 'v05' });
    const issued = new Set<string>();
    const acked: string[] = [];
    spy(sim, (team, obs, r) => {
      for (const id of obs.completedCommands ?? []) acked.push(`${team}:${id}`);
      for (const o of r.orders) if (o.action) issued.add(`${team}:${o.action.id}`);
    });
    for (let i = 0; i < 6000; i++) sim.step(F);
    expect(issued.size).toBeGreaterThan(0);
    expect(acked.length).toBeGreaterThan(0);
    for (const a of acked) expect(issued.has(a)).toBe(true);
  });

  it("held orders give the engine's own target, in world yards, for both teams", () => {
    const sim = new MatchSim({ seed: 5, halfSeconds: 30, tactics: 'v05' });
    const d = directorOf(sim);
    const L = sim.tuning.pitch.length;
    const issued: { team: Team; id: string; x: number; y: number }[] = [];
    spy(sim, (team, _obs, r) => { for (const o of r.orders) issued.push({ team, id: o.actorId, x: o.target.x, y: o.target.y }); });
    const checked = { home: 0, away: 0 };
    const out = { x: 0, y: 0 };
    for (let i = 0; i < 6000 && (checked.home < 20 || checked.away < 20); i++) {
      issued.length = 0;
      sim.step(F);
      for (const o of issued) {
        const p = sim.state.players[o.id as match.MatchPlayerId];
        if (!d.heldTarget(sim.state, p, out)) continue;
        const wx = o.x / YARD_METRES;
        const wy = o.y / YARD_METRES;
        expect(out.x).toBeCloseTo(o.team === 'home' ? wx : L - wx, 6);
        expect(out.y).toBeCloseTo(o.team === 'home' ? wy : sim.tuning.pitch.width - wy, 6);
        checked[o.team] += 1;
      }
    }
    expect(checked.home).toBeGreaterThan(0);
    expect(checked.away).toBeGreaterThan(0);
  });

  it("observations carry the referee's offside line: runs stop at it and offside teammates are not pass targets", () => {
    const sim = new MatchSim({ seed: 7, halfSeconds: 30, tactics: 'v05' });
    const L = sim.tuning.pitch.length;
    let checked = 0;
    let excluded = 0;
    spy(sim, (team, obs) => {
      const s = sim.state;
      const adv = (x: number): number => (team === 'home' ? x : L - x);
      const opp = TEAM_PLAYER_IDS[team === 'home' ? 'away' : 'home'].map((id) => adv(s.players[id].pos.x)).sort((a, b) => b - a);
      const line = Math.max(opp[1]!, adv(s.ball.pos.x), L / 2);
      expect(obs.runLimit).toBeCloseTo(line * YARD_METRES, 6);
      for (const m of obs.teammates) {
        const p = s.players[m.id as match.MatchPlayerId];
        const offside = adv(p.pos.x) > line + REFEREE_TUNING.levelTolerance;
        expect(m.passEligible).toBe(!p.isKeeper && !offside);
        if (offside) excluded += 1;
      }
      checked += 1;
    });
    for (let i = 0; i < 4000; i++) sim.step(F);
    expect(checked).toBeGreaterThan(100);
    expect(excluded).toBeGreaterThan(0);
  });
});
