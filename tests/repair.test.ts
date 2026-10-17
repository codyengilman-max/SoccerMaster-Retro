import { describe, expect, it } from 'vitest';
import { MatchSim, MATCH_TUNING as T, HOME_IDS, kickRoll, kickSpeed, powerForSpeed, predictGroundKick, type MatchPlayerId } from '../src/game/match';
import { stageLabScenario } from '../src/game/match/lab';

type V = { x: number; y: number };
const F = 1 / 60;
const run = (sim: MatchSim, seconds: number, stop?: () => boolean): void => {
  for (let i = 0; i < Math.round(seconds / F); i++) {
    sim.step(F);
    if (stop?.()) return;
  }
};
const staged = (id: Parameters<typeof stageLabScenario>[1], seed = 1): MatchSim => {
  const sim = new MatchSim({ seed });
  run(sim, T.kickoff.countdownSeconds + 2 * F);
  sim.arrange((s) => stageLabScenario(s, id, T.pitch));
  return sim;
};
const angleDeg = (a: V, b: V): number => (Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) * 180) / Math.PI;
let padId = 0;
/** Joystick pass: stick along `dir`, hold PASS for `hold` sim seconds, release, centre the stick. */
const padPass = (sim: MatchSim, dir: V, hold: number): boolean => {
  const carrier = sim.state.ball.owner;
  if (!sim.command({ type: 'padPress', id: ++padId, action: 'pass' })) return false;
  run(sim, hold);
  sim.command({ type: 'padMove', x: dir.x, y: dir.y });
  const ok = sim.command({ type: 'padRelease', id: ++padId, action: 'pass' });
  run(sim, 0.5, () => sim.state.ball.owner !== carrier);
  sim.command({ type: 'padMove', x: 0, y: 0 });
  return ok;
};
/** Scripted stick directions at sim times; returns true if H8 still has the ball and is past A5 after 4 s. */
function oneVsOne(plan: readonly (readonly [number, V])[]): boolean {
  const sim = staged('dribble-1v1');
  let t = 0;
  let k = 0;
  for (let i = 0; i < 240; i++) {
    while (k < plan.length && t >= plan[k]![0]) { const d = plan[k++]![1]; const m = Math.hypot(d.x, d.y); sim.command({ type: 'padMove', x: d.x / m, y: d.y / m }); }
    sim.step(F);
    t += F;
    if (sim.state.ball.owner !== 'H8') return false;
  }
  return sim.state.players.H8.pos.x > sim.state.players.A5.pos.x + 1;
}

describe('pass weight: one bounded power curve in roll distance', () => {
  it('softest kick rolls about 4 yd, the passing range is linear, full power keeps the shot speed', () => {
    expect(kickRoll(0)).toBeGreaterThan(3.5);
    expect(kickRoll(0)).toBeLessThan(4.5);
    expect(kickSpeed(1)).toBe(T.kick.maxSpeed);
    const step = kickRoll(0.1) - kickRoll(0);
    for (let p = 0.1; p <= T.kick.passPower + 1e-9; p += 0.1) expect(kickRoll(p) - kickRoll(p - 0.1)).toBeCloseTo(step, 6);
    expect(kickRoll(T.kick.passPower)).toBeCloseTo(T.kick.passRoll, 6);
    // No kink at the join; monotone to the end.
    const e = 1e-4;
    const left = (kickRoll(T.kick.passPower) - kickRoll(T.kick.passPower - e)) / e;
    const right = (kickRoll(T.kick.passPower + e) - kickRoll(T.kick.passPower)) / e;
    expect(right / left).toBeCloseTo(1, 2);
    let prev = -1;
    for (let p = 0; p <= 1; p += 0.01) {
      const d = kickRoll(p);
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
  });

  it('in the passing band one percent of pull changes the roll by under half a yard (no hair-trigger)', () => {
    for (let p = 0; p < T.kick.passPower; p += 0.01) expect(kickRoll(p + 0.01) - kickRoll(p)).toBeLessThan(0.5);
  });

  it('powerForSpeed inverts kickSpeed and rejects junk', () => {
    for (const p of [0, 0.05, 0.3, 0.69, 0.7, 0.71, 0.9, 1]) expect(powerForSpeed(kickSpeed(p))).toBeCloseTo(p, 9);
    for (const bad of [Number.NaN, Infinity, -Infinity, -5]) {
      expect(Number.isFinite(kickSpeed(bad))).toBe(true);
      expect(Number.isFinite(powerForSpeed(bad))).toBe(true);
    }
  });

  it('the guide stop point for a soft pass is where an untouched ball stops (4-34 yd band)', () => {
    for (const p of [0, 0.2, 0.5, 0.7]) {
      const pred = predictGroundKick({ x: 0, y: 0 }, { x: 1, y: 0 }, kickSpeed(p), T);
      expect(Math.abs(pred.stopDistance - kickRoll(p))).toBeLessThan(0.15);
    }
  });
});

describe('ball-carrier movement after receiving', () => {
  const receive = (seed: number): { sim: MatchSim; id: MatchPlayerId } => {
    const sim = staged('pass-range', seed);
    const from = sim.state.ball.pos;
    const to = sim.state.players.H6.pos;
    const L = Math.hypot(to.x - from.x, to.y - from.y);
    padPass(sim, { x: (to.x - from.x) / L, y: (to.y - from.y) / L }, 0.4 * T.pad.passChargeSeconds);
    run(sim, 6, () => sim.state.ball.owner !== null);
    expect(sim.state.ball.owner).toBe('H6');
    return { sim, id: 'H6' };
  };

  for (const [name, dir] of [
    ['forward', { x: 1, y: 0 }],
    ['left', { x: 0, y: -1 }],
    ['right', { x: 0, y: 1 }],
    ['back', { x: -1, y: 0 }],
    ['diagonal', { x: Math.SQRT1_2, y: -Math.SQRT1_2 }],
  ] as const) {
    // FIFA locomotion: a turn of up to 90 deg is obeyed within 0.45 s; a reversal brakes first (agility-scaled), within 0.7 s.
    it(`a stick push ${name} right after the first touch is obeyed promptly and keeps the ball`, () => {
      const { sim, id } = receive(1);
      const v0 = sim.state.players[id].vel;
      const limit = angleDeg(v0, dir) > 90 ? 0.7 : 0.45;
      expect(sim.command({ type: 'padMove', x: dir.x, y: dir.y })).toBe(true);
      let turned = -1;
      for (let i = 1; i <= 90; i++) {
        sim.step(F);
        const v = sim.state.players[id].vel;
        if (turned < 0 && Math.hypot(v.x, v.y) > 2 && angleDeg(v, dir) < 20) turned = i * F;
      }
      expect(turned).toBeGreaterThan(0);
      expect(turned).toBeLessThanOrEqual(limit);
      expect(sim.state.ball.owner).toBe(id);
    });
  }

  it("a receiver's dribble direction keeps his momentum instead of snapping upfield", () => {
    const sim = staged('pass-range', 2);
    sim.arrange((s) => {
      s.players.H6.vel = { x: -4, y: 0 };
    });
    padPass(sim, { x: 0.894, y: -0.447 }, 0);
    run(sim, 4, () => sim.state.ball.owner !== null);
    const s = sim.state;
    expect(s.ball.owner).toBe('H6');
    expect(s.dribbleDir.x).toBeLessThan(0);
    expect(angleDeg(s.dribbleDir, s.players.H6.vel)).toBeLessThan(1);
  });
});

describe('beating a presser 1v1 is possible but not free', () => {
  it('running straight at him loses the ball', () => {
    expect(oneVsOne([[0, { x: 1, y: 0 }]])).toBe(false);
  });
  it('a timely cut either way gets past him', () => {
    for (const side of [-1, 1]) for (const at of [0.25, 0.4, 0.5]) {
      expect(oneVsOne([[0, { x: 1, y: 0 }], [at, { x: 0.2, y: side }], [at + 0.45, { x: 1, y: 0 }]])).toBe(true);
    }
  });
  it('a cut left until he is on top of you is too late', () => {
    expect(oneVsOne([[0, { x: 1, y: 0 }], [0.7, { x: 0.2, y: -1 }], [1.15, { x: 1, y: 0 }]])).toBe(false);
  });
});

describe('automatic selection is stable', () => {
  it('control never bounces back to the previous player within returnHoldSeconds, and never leaves a home carrier', () => {
    for (const seed of [1, 2, 3]) {
      const sim = new MatchSim({ seed });
      let last = sim.state.controlledId;
      let prev: string | null = null;
      let at = 0;
      for (let i = 0; i < Math.round(60 / F); i++) {
        sim.step(F);
        const s = sim.state;
        if (s.controlledId === last) continue;
        const own = s.ball.owner;
        if (own && (HOME_IDS as readonly string[]).includes(own) && !s.players[own].isKeeper) expect(s.controlledId).toBe(own);
        // Winning the ball always hands control to the new carrier; only automatic off-ball switches are held.
        if (s.controlledId === prev && own !== s.controlledId) expect(s.simTime - at).toBeGreaterThanOrEqual(T.offBall.returnHoldSeconds - 1e-9);
        prev = last;
        last = s.controlledId;
        at = s.simTime;
      }
    }
  });
});
