import { describe, expect, it } from 'vitest';
import { attack } from '../src/game';

const { AttackSim, ATTACK_TUNING, checkInvariants, classifySwipe, distance, normalize, sub } = attack;
type Sim = InstanceType<typeof AttackSim>;
type PlayerId = attack.PlayerId;

const FRAME = 1 / 60;

/** Steps real frames; checks invariants and "no teleport" on every frame. */
function run(sim: Sim, seconds: number, until?: (sim: Sim) => boolean): void {
  const frames = Math.round(seconds / FRAME);
  for (let i = 0; i < frames; i++) {
    if (until?.(sim)) return;
    const before = Object.fromEntries(Object.values(sim.state.players).map((p) => [p.id, { ...p.pos }]));
    const attempt = sim.state.attempt;
    sim.step(FRAME);
    expect(checkInvariants(sim.state)).toEqual([]);
    if (sim.state.attempt !== attempt) continue;
    for (const p of Object.values(sim.state.players)) {
      const prev = before[p.id];
      if (prev) expect(distance(prev, p.pos), `${p.id} moved too far in one frame`).toBeLessThan(0.25);
    }
  }
}

function goLive(sim: Sim): void {
  run(sim, ATTACK_TUNING.reset.countdownSeconds + FRAME * 2);
  expect(sim.state.phase).toBe('live');
}

function aimAndRelease(sim: Sim, target: { x: number; y: number }, power: number): void {
  expect(sim.command({ type: 'aimStart' })).toBe(true);
  run(sim, 0.2);
  sim.command({ type: 'aimUpdate', direction: normalize(sub(target, sim.state.ball.pos)), power });
  expect(sim.command({ type: 'aimRelease' })).toBe(true);
}

function passPower(sim: Sim, target: { x: number; y: number }): number {
  const T = sim.tuning.pass;
  return (distance(target, sim.state.ball.pos) - T.minDistance) / (T.maxDistance - T.minDistance);
}

function passToRunner(sim: Sim): PlayerId {
  run(sim, 3, (s) => s.state.runnerId !== null);
  run(sim, 0.3);
  const runner = sim.state.runnerId;
  expect(runner).not.toBeNull();
  if (!runner) throw new Error('no run');
  expect(sim.command({ type: 'aimStart' })).toBe(true);
  run(sim, 0.2);
  const p = sim.player(runner);
  const target = { x: p.pos.x + p.vel.x * 0.7, y: p.pos.y + p.vel.y * 0.7 };
  sim.command({ type: 'aimUpdate', direction: normalize(sub(target, sim.state.ball.pos)), power: passPower(sim, target) });
  expect(sim.command({ type: 'aimRelease' })).toBe(true);
  return runner;
}

const eventTypes = (sim: Sim): string[] => sim.state.events.map((e) => e.type);

describe('swipe classification', () => {
  it('maps pitch directions to dribble moves', () => {
    expect(classifySwipe({ x: 1, y: 0.2 })).toEqual({ kind: 'burst', sign: 0 });
    expect(classifySwipe({ x: -1, y: 0.3 })).toEqual({ kind: 'check', sign: 0 });
    expect(classifySwipe({ x: 0.2, y: -1 })).toEqual({ kind: 'cut', sign: -1 });
    expect(classifySwipe({ x: 0.1, y: 1 })).toEqual({ kind: 'cut', sign: 1 });
    expect(classifySwipe({ x: 0, y: 0 })).toBeNull();
  });
});

describe('attempt phases', () => {
  it('starts in reset, ignores input, then goes live', () => {
    const sim = new AttackSim();
    expect(sim.state.phase).toBe('reset');
    expect(sim.command({ type: 'swipe', direction: { x: 0, y: 1 } })).toBe(false);
    expect(sim.command({ type: 'aimStart' })).toBe(false);
    goLive(sim);
  });

  it('is deterministic for the same seed and inputs', () => {
    const a = new AttackSim({ seed: 7 });
    const b = new AttackSim({ seed: 7 });
    for (const sim of [a, b]) {
      goLive(sim);
      run(sim, 0.5);
      sim.command({ type: 'swipe', direction: { x: 0, y: -1 } });
      run(sim, 1.5);
    }
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it('defenders take different jobs and win the ball if the carrier does nothing', () => {
    const sim = new AttackSim();
    goLive(sim);
    run(sim, 0.5);
    expect(sim.player('D1').role).not.toBe(sim.player('D2').role);
    expect(new Set([sim.player('D1').role, sim.player('D2').role])).toEqual(new Set(['presser', 'cover']));
    run(sim, 6);
    expect(sim.state.outcome).toBe('tackled');
  });
});

describe('ball ownership and control transfer', () => {
  it('pass to a running teammate moves possession and control without resetting anyone', () => {
    const sim = new AttackSim({ seed: 3 });
    goLive(sim);
    const runner = passToRunner(sim);
    const passerX = sim.player('A1').pos.x;
    expect(sim.state.ball.owner).toBeNull();
    expect(sim.state.controlledId).toBe('A1');
    run(sim, 4, (s) => s.state.ball.owner !== null || s.state.phase === 'ended');
    expect(sim.state.ball.owner).toBe(runner);
    expect(sim.state.controlledId).toBe(runner);
    const received = sim.state.events.find((e) => e.type === 'received');
    expect(received?.by).toBe(runner);
    expect(Number(received?.detail)).toBeGreaterThan(1);
    // Nobody went back to their kick-off spot (A1 starts at x = 38).
    expect(passerX).toBeGreaterThan(38.5);
    expect(sim.player('A1').pos.x).toBeGreaterThanOrEqual(passerX - 0.5);
  });

  it('a pass straight at a defender is intercepted and ends the attempt once', () => {
    const sim = new AttackSim();
    goLive(sim);
    run(sim, 0.3);
    const d1 = sim.player('D1').pos;
    aimAndRelease(sim, d1, passPower(sim, d1));
    run(sim, 4, (s) => s.state.phase === 'ended');
    expect(sim.state.outcome).toBe('intercepted');
    expect(sim.state.ball.owner).toBe('D1');
    expect(sim.state.controlledId).toBe('A1');
    expect(sim.state.resolutions).toBe(1);
  });

  it('a pass that nobody reaches rolls out of the training area', () => {
    const sim = new AttackSim();
    goLive(sim);
    aimAndRelease(sim, { x: 10, y: 25 }, 1);
    run(sim, 6, (s) => s.state.phase === 'ended');
    expect(sim.state.outcome).toBe('out');
  });
});

describe('opening pass window', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('a lead pass to the runner up to 0.9 s after the run starts is received (seed %i)', (seed) => {
    const sim = new AttackSim({ seed });
    goLive(sim);
    run(sim, 3, (s) => s.state.runnerId !== null);
    run(sim, 0.9);
    expect(sim.state.phase).toBe('live');
    passToRunner(sim);
    run(sim, 4, (s) => s.state.controlledId !== 'A1' || s.state.phase === 'ended');
    expect(sim.state.phase, sim.state.outcomeDetail).not.toBe('ended');
    expect(sim.state.controlledId).not.toBe('A1');
  });
});

describe('shooting', () => {
  it.each([1, 2, 3, 4])('receive -> dribble -> hard far-post shot scores (seed %i)', (seed) => {
    const sim = new AttackSim({ seed });
    goLive(sim);
    passToRunner(sim);
    run(sim, 4, (s) => s.state.controlledId !== 'A1' || s.state.phase === 'ended');
    const shooter = sim.player(sim.state.controlledId);
    run(sim, 1.5, () => shooter.pos.x >= 58);
    expect(sim.command({ type: 'setAction', action: 'shoot' })).toBe(true);
    aimAndRelease(sim, { x: 75, y: shooter.pos.y < 25 ? 27.6 : 22.4 }, 1);
    expect(sim.state.action).toBe('pass');
    run(sim, 3, (s) => s.state.phase === 'ended');
    expect(sim.state.outcome).toBe('goal');
    expect(sim.state.outcomeBy).toBe(shooter.id);
  });

  it('a soft shot at the keeper is caught (save)', () => {
    const sim = new AttackSim({ seed: 2 });
    goLive(sim);
    passToRunner(sim);
    run(sim, 4, (s) => s.state.controlledId !== 'A1');
    const shooter = sim.player(sim.state.controlledId);
    run(sim, 1.5, () => shooter.pos.x >= 58);
    sim.command({ type: 'setAction', action: 'shoot' });
    aimAndRelease(sim, { x: 75, y: 25 }, 0.25);
    run(sim, 4, (s) => s.state.phase === 'ended');
    expect(sim.state.outcome).toBe('saved');
    expect(sim.state.ball.owner).toBe('GK');
  });

  it('a hard shot at the keeper is parried, which does not end the attempt by itself', () => {
    const sim = new AttackSim({ seed: 2 });
    goLive(sim);
    passToRunner(sim);
    run(sim, 4, (s) => s.state.controlledId !== 'A1');
    sim.command({ type: 'setAction', action: 'shoot' });
    aimAndRelease(sim, sim.player('GK').pos, 1);
    run(sim, 3, (s) => eventTypes(s).includes('parried'));
    expect(eventTypes(sim)).toContain('parried');
    expect(sim.state.phase).not.toBe('ended');
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('placement matters: hard shots 2 yd off centre score, central ones do not (seed %i)', (seed) => {
    const shootAt = (offset: number): string | null => {
      const sim = new AttackSim({ seed });
      goLive(sim);
      passToRunner(sim);
      run(sim, 4, (s) => s.state.controlledId !== 'A1' || s.state.phase === 'ended');
      const shooter = sim.player(sim.state.controlledId);
      run(sim, 1.5, () => shooter.pos.x >= 58);
      sim.command({ type: 'setAction', action: 'shoot' });
      const far = shooter.pos.y < 25 ? 1 : -1;
      aimAndRelease(sim, { x: 75, y: 25 + far * offset }, 0.85);
      run(sim, 3, (s) => s.state.phase === 'ended' || eventTypes(s).includes('parried'));
      return sim.state.outcome;
    };
    expect(shootAt(2)).toBe('goal');
    expect(shootAt(0)).not.toBe('goal');
  });

  it('a shot wide of the post goes out', () => {
    const sim = new AttackSim();
    goLive(sim);
    sim.command({ type: 'setAction', action: 'shoot' });
    aimAndRelease(sim, { x: 75, y: 2 }, 1);
    run(sim, 4, (s) => s.state.phase === 'ended');
    expect(sim.state.outcome).toBe('out');
  });
});

describe('goal / out resolution happens exactly once', () => {
  it('a ball crossing the goal line and touchline together resolves once and freezes', () => {
    const sim = new AttackSim();
    goLive(sim);
    sim.arrange((s) => {
      s.ball.owner = null;
      s.ball.pos = { x: 74.5, y: 25 };
      s.ball.vel = { x: 30, y: 0 };
      s.ball.kick = { by: 'A1', kind: 'shot', at: s.simTime, target: null, receiver: null };
      s.ball.ignore = [{ id: 'GK', until: s.simTime + 10 }];
    });
    run(sim, 1);
    expect(sim.state.outcome).toBe('goal');
    const ballAtEnd = { ...sim.state.ball.pos };
    sim.arrange((s) => {
      s.ball.pos = { x: 80, y: -5 };
    });
    run(sim, 2);
    expect(sim.state.outcome).toBe('goal');
    expect(sim.state.resolutions).toBe(1);
    expect(eventTypes(sim).filter((t) => t === 'ended')).toHaveLength(1);
    expect(sim.command({ type: 'swipe', direction: { x: 0, y: 1 } })).toBe(false);
    expect(sim.command({ type: 'aimStart' })).toBe(false);
    expect(ballAtEnd.x).toBeGreaterThanOrEqual(75);
  });
});

describe('swipe cooldown and control cost', () => {
  it('rejects swipes during the cooldown and when control is too low', () => {
    const sim = new AttackSim();
    goLive(sim);
    expect(sim.command({ type: 'swipe', direction: { x: 0, y: -1 } })).toBe(true);
    expect(sim.command({ type: 'swipe', direction: { x: 0, y: 1 } })).toBe(false);
    expect(sim.state.events.at(-1)?.detail).toBe('cooldown');

    const T = sim.tuning;
    let accepted = 1;
    for (let i = 0; i < 12; i++) {
      // Keep defenders away so only the control budget can stop the swipes.
      sim.arrange((s) => {
        s.players.D1.pos = { x: 70, y: 5 };
        s.players.D2.pos = { x: 70, y: 45 };
      });
      run(sim, T.swipe.cooldownSeconds + FRAME);
      if (sim.command({ type: 'swipe', direction: { x: 0, y: i % 2 === 0 ? 1 : -1 } })) accepted++;
    }
    expect(sim.state.events.some((e) => e.type === 'swipeRejected' && e.detail === 'control')).toBe(true);
    expect(accepted).toBeLessThan(13);
  });

  it('cooldowns run on sim time, so they tick slower while aiming', () => {
    const sim = new AttackSim();
    goLive(sim);
    sim.command({ type: 'swipe', direction: { x: 0, y: -1 } });
    sim.command({ type: 'aimStart' });
    run(sim, 0.5);
    const T = sim.tuning;
    expect(sim.state.swipeCooldown).toBeCloseTo(T.swipe.cooldownSeconds - 0.5 * T.aim.slowMoScale, 1);
    sim.command({ type: 'aimCancel', reason: 'test' });
    run(sim, 0.5);
    expect(sim.state.swipeCooldown).toBe(0);
  });

  it('a burst touch can be intercepted while the ball is loose', () => {
    const sim = new AttackSim();
    goLive(sim);
    run(sim, 1.2);
    expect(sim.command({ type: 'swipe', direction: { x: 1, y: 0 } })).toBe(true);
    expect(sim.state.ball.owner).toBeNull();
  });
});

describe('aiming slow motion is bounded', () => {
  it('slows everything only for the slow-motion budget, then runs at full speed', () => {
    const sim = new AttackSim();
    goLive(sim);
    const T = sim.tuning;
    sim.command({ type: 'aimStart' });
    const t0 = sim.state.simTime;
    run(sim, 1);
    expect(sim.state.simTime - t0).toBeCloseTo(T.aim.slowMoScale, 1);
    run(sim, T.aim.slowMoBudgetSeconds);
    expect(sim.state.timeScale).toBe(1);
    expect(eventTypes(sim)).toContain('slowMoSpent');
  });

  it('repeated aim/cancel cannot farm more slow motion than the budget allows', () => {
    const sim = new AttackSim();
    goLive(sim);
    const T = sim.tuning;
    let slowReal = 0;
    for (let i = 0; i < 30; i++) {
      sim.command({ type: 'aimStart' });
      for (let f = 0; f < 6; f++) {
        sim.step(FRAME);
        if (sim.state.timeScale < 1) slowReal += FRAME;
      }
      sim.command({ type: 'aimCancel', reason: 'test' });
      sim.step(FRAME);
      if (sim.state.phase === 'ended') break;
    }
    const elapsedReal = sim.state.realTime;
    expect(slowReal).toBeLessThanOrEqual(T.aim.slowMoBudgetSeconds + T.aim.budgetRegenPerSecond * elapsedReal + FRAME);
  });

  it('release without an aim direction cancels instead of kicking', () => {
    const sim = new AttackSim();
    goLive(sim);
    sim.command({ type: 'aimStart' });
    expect(sim.command({ type: 'aimRelease' })).toBe(false);
    expect(sim.state.phase).toBe('live');
    expect(sim.state.ball.owner).toBe('A1');
  });
});

describe('retry', () => {
  it('fully resets the attempt, the selector, and possession', () => {
    const sim = new AttackSim();
    goLive(sim);
    sim.command({ type: 'setAction', action: 'shoot' });
    run(sim, 8, (s) => s.state.phase === 'ended');
    expect(sim.state.phase).toBe('ended');
    expect(sim.command({ type: 'setAction', action: 'pass' })).toBe(false);
    expect(sim.command({ type: 'retry' })).toBe(true);
    const s = sim.state;
    expect(s.attempt).toBe(2);
    expect(s.phase).toBe('reset');
    expect(s.outcome).toBeNull();
    expect(s.resolutions).toBe(0);
    expect(s.action).toBe('pass');
    expect(s.aim).toBeNull();
    expect(s.ball.owner).toBe('A1');
    expect(s.controlledId).toBe('A1');
    expect(s.events.map((e) => e.type)).toEqual(['attemptStart']);
    expect(sim.command({ type: 'retry' })).toBe(false);
    goLive(sim);
  });
});

describe('through-ball shooting fixture (matches the browser ?setup=shooting fixture)', () => {
  it('a hard far-post shot after the keeper shades to the near post scores', () => {
    const sim = new AttackSim();
    sim.arrange((s) => {
      s.players.A2.pos = { x: 66, y: 25 };
      s.players.A2.vel = { x: 4, y: 0 };
      s.players.D1.pos = { x: 40, y: 18 };
      s.players.D2.pos = { x: 40, y: 30 };
      s.ball.owner = 'A2';
      s.ball.pos = { x: 66.8, y: 25 };
      s.controlledId = 'A2';
      s.laneY = 25;
    });
    goLive(sim);
    run(sim, 2, (x) => x.player('GK').pos.y < 26);
    sim.command({ type: 'setAction', action: 'shoot' });
    aimAndRelease(sim, { x: 75, y: 28.2 }, 1);
    run(sim, 3, (x) => x.state.phase === 'ended');
    const log = sim.state.events.map((e) => `${e.type}:${e.detail}`).join(' ');
    expect(sim.state.outcome, `${log} gk=${JSON.stringify(sim.player('GK').pos)} ball=${JSON.stringify(sim.state.ball.pos)}`).toBe('goal');
  });
});
