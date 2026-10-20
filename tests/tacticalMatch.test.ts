import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { match } from '../src/game';

const { MatchSim, checkInvariants, MATCH_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim>;
type Mode = match.TacticsMode;
const F = 1 / 60;

interface Tally { passes: number; completed: number; shots: number; goals: number; turnovers: number; v05Kicks: number }

/** Plays a seeded timed match with a scripted user (stick sweeps, periodic pass/block presses), counting team play. */
function play(seed: number, tactics: Mode, halfSeconds = 45, frame = F): { sim: Sim; away: Tally; home: Tally } {
  const sim = new MatchSim({ seed, halfSeconds, tactics });
  const t = (): Tally => ({ passes: 0, completed: 0, shots: 0, goals: 0, turnovers: 0, v05Kicks: 0 });
  const tally = { home: t(), away: t() };
  pendingPass = null;
  let seq = 0;
  let id = 0;
  let lastK = -1;
  const steps = Math.round((2 * halfSeconds + 20) / frame);
  for (let i = 0; i < steps; i++) {
    const s = sim.state;
    if (s.phase === 'halftime') sim.command({ type: 'startSecondHalf' });
    if (s.phase === 'fulltime') break;
    // Commands land on the same sim times at any frame rate: only on a new 1/60 s boundary.
    const k = Math.floor(s.simTime * 60 + 1e-6);
    if (k === lastK) {
      sim.step(frame);
      seq = count(sim, seq, tally);
      continue;
    }
    lastK = k;
    if (k % 50 === 0) sim.command({ type: 'padMove', x: Math.cos(k * 0.37), y: Math.sin(k * 0.37) * 0.6 });
    const action = sim.userHasBall() ? 'pass' : 'block';
    if (k % 120 === 0) sim.command({ type: 'padPress', id: ++id, action });
    if (k % 120 === 20) sim.command({ type: 'padRelease', id: ++id, action });
    sim.step(frame);
    seq = count(sim, seq, tally);
  }
  tally.home.goals = sim.state.score.home;
  tally.away.goals = sim.state.score.away;
  return { sim, ...tally };
}

let pendingPass: match.TeamId | null = null;
function count(sim: Sim, after: number, tally: Record<match.TeamId, Tally>): number {
  let seq = after;
  for (const e of sim.state.events) {
    if (e.seq <= seq) continue;
    seq = e.seq;
    const team = e.by ? sim.state.players[e.by].team : null;
    if (!team) continue;
    if (e.type === 'pass') {
      tally[team].passes++;
      pendingPass = team;
    } else if (e.type === 'received' && pendingPass === team) {
      tally[team].completed++;
      pendingPass = null;
    } else if (e.type === 'intercepted' || e.type === 'tackle') {
      pendingPass = null;
    } else if (e.type === 'shot') tally[team].shots++;
    else if (e.type === 'possession' && e.detail === team) tally[team].turnovers++;
    if ((e.type === 'pass' || e.type === 'shot') && e.detail.endsWith('v05')) tally[team].v05Kicks++;
  }
  return seq;
}

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);

describe('v0.5 tactics in the 9v9 match', () => {
  it('drives the computer attack through the shared kick path, keeps 18 players and never fails', () => {
    const { sim, away, home } = play(5, 'v05');
    expect(sim.tactics.failure).toBeNull();
    expect(away.v05Kicks).toBeGreaterThan(0);
    // The user's carrier is never driven by the engine.
    expect(home.v05Kicks).toBe(0);
    expect(MATCH_PLAYER_IDS.length).toBe(18);
    expect(checkInvariants(sim.state)).toEqual([]);
  });

  it('classic tactics never touch the engine', () => {
    const { sim, away } = play(5, 'classic');
    expect(away.v05Kicks).toBe(0);
    expect(sim.tactics.enabled).toBe(false);
  });

  it('60 Hz and 120 Hz frames give the identical v0.5 match', () => {
    const a = play(7, 'v05', 20, 1 / 60);
    const b = play(7, 'v05', 20, 1 / 120);
    expect(b.sim.state.score).toEqual(a.sim.state.score);
    expect(b.away).toEqual(a.away);
    for (const id of MATCH_PLAYER_IDS) expect(b.sim.state.players[id].pos).toEqual(a.sim.state.players[id].pos);
    expect(b.sim.state.ball.pos).toEqual(a.sim.state.ball.pos);
  });

  it('prints seeded classic vs v0.5 measurements', () => {
    const sum = (mode: Mode) => {
      const r = { passes: 0, completed: 0, shots: 0, goals: 0, conceded: 0, turnovers: 0, failures: 0 };
      for (const seed of SEEDS) {
        const m = play(seed, mode);
        r.passes += m.away.passes;
        r.completed += m.away.completed;
        r.shots += m.away.shots;
        r.goals += m.away.goals;
        r.conceded += m.home.goals;
        r.turnovers += m.home.turnovers;
        if (m.sim.tactics.failure) r.failures++;
      }
      return r;
    };
    const rows = { classic: sum('classic'), v05: sum('v05') };
    const line = `computer team over ${SEEDS.length} seeded matches (2 x 45 s): ${JSON.stringify(rows)}`;
    console.log(line);
    if (process.env.TACTICS_SWEEP_OUT) writeFileSync(process.env.TACTICS_SWEEP_OUT, line + '\n');
    expect(rows.v05.failures).toBe(0);
  }, 120_000);
});
