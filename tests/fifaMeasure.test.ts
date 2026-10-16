import { describe, expect, it } from 'vitest';
import { match } from '../src/game';

// Seeded feel measurements for the FIFA-style locomotion/passing work (printed; thresholds asserted in padSim tests).
const { MatchSim, MATCH_TUNING: T } = match;
type Sim = InstanceType<typeof MatchSim>;
const F = 1 / 60;
const run = (sim: Sim, s: number, f = F) => { for (let i = 0; i < Math.round(s / f); i++) sim.step(f); };
function setup(): Sim {
  const sim = new MatchSim({ seed: 7, controls: 'pad' });
  run(sim, T.kickoff.countdownSeconds + 2 * F);
  sim.arrange((s) => {
    const p = s.players.H7;
    p.pos = { x: 40, y: 25 };
    p.vel = { x: 0, y: 0 };
    s.ball.owner = 'H7';
    s.ball.pos = { x: 40.6, y: 25 };
    s.ball.vel = { x: 0, y: 0 };
    s.possession = 'home';
    s.ownedSince = s.simTime;
    s.nextDecisionAt = s.simTime + 9;
    s.protectUntil = s.simTime + 9;
    s.controlledId = 'H7';
    s.controlSince = s.simTime;
    s.controlEpoch += 1;
  });
  return sim;
}
export function measure(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of [0.3, 1]) {
    const sim = setup();
    sim.command({ type: 'padMove', x: m, y: 0 });
    run(sim, 1.5);
    out[`speed@${m}`] = Math.hypot(sim.state.players.H7.vel.x, sim.state.players.H7.vel.y);
    // 90° turn: time until heading within 15° of +y.
    sim.command({ type: 'padMove', x: 0, y: m });
    let t = 0;
    for (; t < 3; t += F) {
      sim.step(F);
      const v = sim.state.players.H7.vel;
      if (Math.atan2(Math.abs(v.x), v.y) < (15 * Math.PI) / 180 && Math.hypot(v.x, v.y) > 0.3) break;
    }
    out[`turn90s@${m}`] = t;
    // Reversal: time from full run to moving the other way at half speed.
    const r = setup();
    r.command({ type: 'padMove', x: m, y: 0 });
    run(r, 1.5);
    const top = Math.hypot(r.state.players.H7.vel.x, r.state.players.H7.vel.y);
    r.command({ type: 'padMove', x: -m, y: 0 });
    let u = 0;
    for (; u < 3; u += F) {
      r.step(F);
      if (r.state.players.H7.vel.x < -top * 0.5) break;
    }
    out[`reverse@${m}`] = u;
  }
  return out;
}
describe('FIFA feel measurements', () => {
  it('prints seeded locomotion measurements', () => {
    const m = measure();
    console.log(JSON.stringify(m));
    expect(Object.values(m).every(Number.isFinite)).toBe(true);
  });
});
