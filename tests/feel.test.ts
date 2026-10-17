import { describe, expect, it } from 'vitest';
import { MatchSim, MATCH_TUNING as T, isShotOnGoal, kickSpeed, reachableReceiver, type MatchPlayerId } from '../src/game/match';

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
describe('possession versus control', () => {
  it('control is always one home outfielder, never flickers, and stays put while our pass is in flight', () => {
    for (const seed of [1, 2, 3]) {
      const sim = new MatchSim({ seed, halfSeconds: 120 });
      live(sim);
      let lastSwitch = -Infinity;
      let lastId = sim.state.controlledId;
      let flightId: MatchPlayerId | null = null;
      let flightKick: object | null = null;
      let id = 0;
      let charging = -1;
      for (let i = 0; i < 90 * 60; i++) {
        if (i % 40 === 0) sim.command({ type: 'padMove', x: Math.cos(i), y: Math.sin(i) });
        if (charging < 0 && i % 97 === 0 && sim.userHasBall() && sim.command({ type: 'padPress', id: ++id, action: 'pass' })) charging = i;
        else if (charging >= 0 && i - charging >= 12) {
          sim.command({ type: 'padRelease', id: ++id, action: 'pass' });
          charging = -1;
        }
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

  it('off the ball the stick steers only the controlled player', () => {
    const sim = new MatchSim({ seed: 4 });
    live(sim);
    giveBall(sim, 'A6', { x: 45, y: 25 });
    run(sim, 0.7);
    const id = sim.state.controlledId;
    expect(sim.command({ type: 'padMove', x: 0, y: 1 })).toBe(true);
    let max = 0;
    run(sim, 0.8, (s) => {
      if (s.state.controlledId !== id) return true;
      max = Math.max(max, s.state.players[id].vel.y);
      return false;
    });
    expect(max).toBeGreaterThan(1);
  });
});

describe('guide and kick agree on receivability', () => {
  it('never names a receiver where the ball is still too fast to receive', () => {
    const sim = new MatchSim({ seed: 2, halfSeconds: null });
    const T = sim.tuning;
    sim.arrange((s) => {
      s.players.H8.pos = { x: 30, y: 25 };
      s.players.H7.pos = { x: 33, y: 26.3 };
    });
    const s = sim.state;
    const fast = kickSpeed(1, T);
    const r = reachableReceiver(s, 'H8', { x: 30.6, y: 25 }, { x: 1, y: 0 }, fast, T);
    if (r) expect(fast - T.ball.friction * r.seconds).toBeLessThanOrEqual(T.receive.maxSpeed + 1e-9);
  });

  it('isShotOnGoal: a kick on goal is a shot, one away from it is not', () => {
    const T = new MatchSim({ seed: 1 }).tuning;
    const P = T.pitch;
    expect(isShotOnGoal({ x: P.length - 12, y: P.goalCenterY }, { x: 1, y: 0 }, kickSpeed(1, T), T)).toBe(true);
    expect(isShotOnGoal({ x: P.length - 12, y: P.goalCenterY }, { x: -1, y: 0 }, kickSpeed(1, T), T)).toBe(false);
  });
});
