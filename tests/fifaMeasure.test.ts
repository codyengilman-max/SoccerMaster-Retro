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

describe('FIFA locomotion targets (set before tuning)', () => {
  const m = measure();
  it('close control: slow, tight turns, quick reversals', () => {
    expect(m['speed@0.3']).toBeGreaterThanOrEqual(1.2);
    expect(m['speed@0.3']).toBeLessThanOrEqual(2.4);
    expect(m['turn90s@0.3']).toBeLessThanOrEqual(0.12);
    expect(m['reverse@0.3']).toBeLessThanOrEqual(0.25);
  });
  it('running: same top speed, momentum-limited turns and a braking reversal', () => {
    expect(Math.abs(m['speed@1']! - 5.2)).toBeLessThanOrEqual(0.1);
    expect(m['turn90s@1']).toBeGreaterThanOrEqual(0.38 - 1e-9);
    expect(m['turn90s@1']).toBeLessThanOrEqual(0.6);
    expect(m['reverse@1']).toBeGreaterThanOrEqual(0.7);
    expect(m['reverse@1']).toBeLessThanOrEqual(1.0);
  });
});

describe('FIFA locomotion determinism', () => {
  it('60 Hz and 120 Hz give the same path through a run, a reversal and a turn', () => {
    const path = (f: number) => {
      const sim = setup();
      sim.command({ type: 'padMove', x: 1, y: 0 });
      run(sim, 1.5, f);
      sim.command({ type: 'padMove', x: -1, y: 0 });
      run(sim, 1, f);
      sim.command({ type: 'padMove', x: 0, y: 0.4 });
      run(sim, 0.5, f);
      return sim.state.players.H7.pos;
    };
    const a = path(1 / 60);
    const b = path(1 / 120);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThanOrEqual(0.05);
  });
});

describe('FIFA locomotion agility', () => {
  it('a more agile player brakes and reverses faster', () => {
    const reverse = (agility: number) => {
      const sim = setup();
      sim.setPlayerAttrs('H7', { agility });
      sim.command({ type: 'padMove', x: 1, y: 0 });
      run(sim, 1.5);
      const top = Math.hypot(sim.state.players.H7.vel.x, sim.state.players.H7.vel.y);
      sim.command({ type: 'padMove', x: -1, y: 0 });
      let t = 0;
      for (; t < 3 && sim.state.players.H7.vel.x >= -top * 0.5; t += F) sim.step(F);
      return t;
    };
    expect(reverse(1.2)).toBeLessThanOrEqual(reverse(0.8) * 0.85);
  });
});
