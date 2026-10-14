import { describe, expect, it } from 'vitest';
import { MatchSim, MATCH_TUNING as T, HOME_IDS, AWAY_IDS, kickSpeed, planUserPass, predictGroundKick, type MatchPlayerId } from '../src/game/match';

type Sim = MatchSim;
const F = 1 / 60;
const run = (sim: Sim, seconds: number, stop?: (s: Sim) => boolean): void => {
  for (let i = 0; i < Math.round(seconds / F); i++) {
    sim.step(F);
    if (stop?.(sim)) return;
  }
};
const live = (sim: Sim): void => run(sim, T.kickoff.countdownSeconds + 2 * F);
function giveBall(sim: Sim, id: MatchPlayerId, pos: { x: number; y: number }): void {
  sim.arrange((s) => {
    const p = s.players[id];
    p.pos = { ...pos };
    p.vel = { x: 0, y: 0 };
    s.ball.owner = id;
    s.ball.pos = { x: pos.x + (p.team === 'home' ? 0.6 : -0.6), y: pos.y };
    s.ball.vel = { x: 0, y: 0 };
    s.ball.kick = null;
    s.possession = p.team;
    s.ownedSince = s.simTime;
    s.protectUntil = s.simTime + T.tackle.protectSeconds;
    if (p.team === 'home' && !p.isKeeper) {
      s.controlledId = id;
      s.controlEpoch += 1;
    }
  });
}
const kick = (sim: Sim, dir: { x: number; y: number }, power: number): boolean => {
  sim.command({ type: 'aimStart' });
  sim.command({ type: 'aimUpdate', direction: dir, power });
  return sim.command({ type: 'aimRelease' });
};

describe('shared ground-kick prediction (displayed = executed)', () => {
  it('an untouched kick comes to rest where the guide says', () => {
    for (const [dx, dy, power] of [
      [0, 1, 0.1],
      [0.6, -0.8, 0.2],
      [-1, 0, 0.15],
    ] as const) {
      const sim = new MatchSim({ seed: 3 });
      live(sim);
      giveBall(sim, 'H5', { x: 37, y: 25 });
      sim.arrange((s) => {
        for (const id of [...HOME_IDS, ...AWAY_IDS]) if (id !== 'H5' && !s.players[id].isKeeper) s.players[id].pos = { x: 70, y: 2 };
      });
      const len = Math.hypot(dx, dy);
      const dir = { x: dx / len, y: dy / len };
      const from = { ...sim.state.ball.pos };
      const want = predictGroundKick(from, dir, kickSpeed(power, T), T);
      expect(kick(sim, dir, power)).toBe(true);
      // Nobody may touch it: this checks the ball physics alone.
      sim.arrange((s) => {
        for (const id of [...HOME_IDS, ...AWAY_IDS]) s.beatenUntil[id] = s.simTime + 60;
      });
      run(sim, want.stopSeconds + 0.5);
      const b = sim.state.ball;
      expect(b.owner).toBeNull();
      expect(Math.hypot(b.pos.x - want.stop.x, b.pos.y - want.stop.y)).toBeLessThan(0.01);
    }
  });

  it('the highlighted receiver is exactly the one the kick is played to', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const sim = new MatchSim({ seed });
      live(sim);
      giveBall(sim, 'H5', { x: 30, y: 20 + seed });
      const dir = { x: Math.cos(seed), y: Math.sin(seed) };
      const power = 0.15 + 0.1 * (seed % 4);
      const plan = planUserPass(sim.state, 'H5', sim.state.ball.pos, dir, kickSpeed(power, T), T);
      expect(kick(sim, dir, power)).toBe(true);
      const k = sim.state.ball.kick!;
      if (k.kind === 'pass') {
        expect(k.receiver).toBe(plan.receiver);
        expect(k.target!.x).toBeCloseTo(plan.target.x, 9);
        expect(k.target!.y).toBeCloseTo(plan.target.y, 9);
      }
    }
  });
});

describe('possession versus control', () => {
  it('control is always one home outfielder, never flickers, and stays put while our pass is in flight', () => {
    for (const seed of [1, 2, 3]) {
      const sim = new MatchSim({ seed, halfSeconds: 120 });
      live(sim);
      let lastSwitch = -Infinity;
      let lastId = sim.state.controlledId;
      let flightId: MatchPlayerId | null = null;
      let flightKick: object | null = null;
      for (let i = 0; i < 90 * 60; i++) {
        if (i % 40 === 0) sim.command({ type: 'dribble', direction: { x: Math.cos(i), y: Math.sin(i) } });
        if (i % 97 === 0 && sim.userHasBall()) kick(sim, { x: Math.cos(i * 0.3), y: Math.sin(i * 0.3) }, 0.3);
        sim.step(F);
        const s = sim.state;
        const c = s.players[s.controlledId];
        expect(c.team).toBe('home');
        expect(c.isKeeper).toBe(false);
        const owner = s.ball.owner;
        const ourPass = !owner && s.ball.kick && s.ball.kick.team === 'home' && s.ball.kick.kind !== 'touch' ? s.ball.kick : null;
        if (ourPass && ourPass !== flightKick) {
          flightKick = ourPass;
          flightId = s.controlledId;
        } else if (ourPass) expect(s.controlledId).toBe(flightId);
        if (!ourPass) flightKick = null;
        if (s.controlledId !== lastId) {
          const viaPossession = owner === s.controlledId;
          if (!viaPossession) expect(s.simTime - lastSwitch).toBeGreaterThanOrEqual(T.offBall.minHoldSeconds - 1e-6);
          lastSwitch = s.simTime;
          lastId = s.controlledId;
        }
      }
    }
  });

  it('off the ball a swipe steers only the controlled player, at the normal chase cap', () => {
    const sim = new MatchSim({ seed: 4 });
    live(sim);
    giveBall(sim, 'A6', { x: 45, y: 25 });
    run(sim, 0.7);
    const id = sim.state.controlledId;
    expect(sim.command({ type: 'dribble', direction: { x: 0, y: 1 } })).toBe(true);
    let max = 0;
    run(sim, 0.8, (s) => {
      if (s.state.controlledId !== id) return true;
      max = Math.max(max, Math.hypot(s.state.players[id].vel.x, s.state.players[id].vel.y));
      return false;
    });
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThanOrEqual(T.movement.chaseSpeed + 1e-6);
  });
});

describe('aim assistance', () => {
  const spend = (sim: Sim, seconds: number): void => {
    sim.command({ type: 'aimStart' });
    for (let i = 0; i < Math.round(seconds / F); i++) sim.step(F);
    sim.command({ type: 'aimCancel', reason: 'test' });
  };

  it('a momentary opponent touch never refills; an established opponent spell does', () => {
    const sim = new MatchSim({ seed: 2 });
    live(sim);
    giveBall(sim, 'H8', { x: 30, y: 25 });
    spend(sim, 1);
    const left = sim.state.aimAllowance.home;
    expect(left).toBeLessThan(T.aimAllowance.seconds - 0.5);
    giveBall(sim, 'A6', { x: 52, y: 40 });
    sim.arrange((st) => {
      st.nextDecisionAt = st.simTime + 5;
    });
    run(sim, T.aimAllowance.establishSeconds * 0.5);
    giveBall(sim, 'H8', { x: 30, y: 25 });
    run(sim, T.aimAllowance.establishSeconds + 0.2);
    expect(sim.state.aimAllowance.home).toBeCloseTo(left, 6);
    giveBall(sim, 'A6', { x: 52, y: 40 });
    sim.arrange((st) => {
      st.nextDecisionAt = st.simTime + 5;
    });
    run(sim, T.aimAllowance.establishSeconds + 0.1, (s) => s.state.ball.owner !== 'A6');
    expect(sim.state.establishedTeam).toBe('away');
    giveBall(sim, 'H8', { x: 30, y: 25 });
    expect(sim.state.aimAllowance.home).toBeCloseTo(left, 6);
    run(sim, T.aimAllowance.establishSeconds + 0.1);
    expect(sim.state.aimAllowance.home).toBe(T.aimAllowance.seconds);
  });

  it("'normal' mode never slows play or spends the allowance", () => {
    const sim = new MatchSim({ seed: 2, aimAssist: 'normal' });
    live(sim);
    giveBall(sim, 'H8', { x: 30, y: 25 });
    sim.command({ type: 'aimStart' });
    for (let i = 0; i < 60; i++) {
      sim.step(F);
      expect(sim.state.timeScale).toBe(1);
    }
    expect(sim.state.aimAllowance.home).toBe(T.aimAllowance.seconds);
    expect(sim.aimAssist).toBe('normal');
  });

  it('a long frame after backgrounding cannot drain more than one capped frame', () => {
    const sim = new MatchSim({ seed: 2 });
    live(sim);
    giveBall(sim, 'H8', { x: 30, y: 25 });
    sim.command({ type: 'aimStart' });
    const before = sim.state.aimAllowance.home;
    sim.step(30);
    expect(before - sim.state.aimAllowance.home).toBeLessThanOrEqual(T.maxFrameSeconds + 1e-9);
  });
});
