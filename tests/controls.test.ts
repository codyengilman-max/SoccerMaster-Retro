import { describe, expect, it } from 'vitest';
import { match } from '../src/game';

const { MatchSim, MATCH_TUNING: T, AWAY_IDS, kickSpeed, powerForSpeed } = match;
type Sim = InstanceType<typeof MatchSim>;
const H = T.stepSeconds;

function live(sim: Sim): void {
  for (let i = 0; i < 400 && sim.state.phase !== 'live'; i++) sim.step(H);
}

/** User carrier H8 at `pos`, opponents kept far away so nothing interferes. */
function staged(seed = 3, pos = { x: 30, y: 25 }, clearAway = true): Sim {
  const sim = new MatchSim({ seed });
  live(sim);
  sim.arrange((s) => {
    const p = s.players.H8;
    p.pos = { ...pos };
    p.vel = { x: 0, y: 0 };
    s.ball.owner = 'H8';
    s.ball.pos = { x: pos.x + 0.6, y: pos.y };
    s.ball.vel = { x: 0, y: 0 };
    s.ball.kick = null;
    s.possession = 'home';
    s.controlledId = 'H8';
    s.controlEpoch += 1;
    s.dribbleDir = { x: 1, y: 0 };
    if (clearAway) for (const id of AWAY_IDS) if (id !== 'A1') s.players[id].pos = { x: 72, y: 3 + Number(id.slice(1)) * 5 };
  });
  return sim;
}

const run = (sim: Sim, seconds: number, fps = 120): void => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / fps) sim.step(1 / fps);
};
const speed = (sim: Sim): number => Math.hypot(sim.state.players.H8.vel.x, sim.state.players.H8.vel.y);
const newEvents = (sim: Sim, after: number) => sim.state.events.filter((e) => e.seq > after);
const lastSeq = (sim: Sim): number => sim.state.events.at(-1)?.seq ?? 0;

describe('directional dribbling', () => {
  it('dribbles backward and sideways, staying in that direction until redirected', () => {
    const back = staged();
    back.command({ type: 'dribble', direction: { x: -1, y: 0 } });
    run(back, 2);
    expect(back.state.ball.owner).toBe('H8');
    expect(back.state.players.H8.pos.x).toBeLessThan(28);
    expect(back.state.players.H8.vel.x).toBeLessThan(0);
    expect(speed(back)).toBeLessThanOrEqual(T.carrier.speed * T.carrier.backSpeedFactor + 1e-6);

    const side = staged();
    side.command({ type: 'dribble', direction: { x: 0, y: 1 } });
    run(side, 1.5);
    expect(side.state.players.H8.pos.y).toBeGreaterThan(29);
    expect(Math.abs(side.state.players.H8.vel.x)).toBeLessThan(0.5);
    run(side, 1);
    expect(side.state.players.H8.vel.y).toBeGreaterThan(0);
  });

  it('a reversal never flips velocity instantly; per-tick change stays within the acceleration bound', () => {
    const sim = staged();
    run(sim, 1.5);
    expect(sim.state.players.H8.vel.x).toBeGreaterThan(4);
    sim.command({ type: 'dribble', direction: { x: -1, y: 0 } });
    let prev = { ...sim.state.players.H8.vel };
    for (let i = 0; i < 240; i++) {
      sim.step(H);
      const v = sim.state.players.H8.vel;
      expect(Math.hypot(v.x - prev.x, v.y - prev.y)).toBeLessThanOrEqual(T.carrier.accel * H + 1e-9);
      if (i === 12) expect(v.x).toBeGreaterThan(0);
      prev = { ...v };
    }
    expect(sim.state.players.H8.vel.x).toBeLessThan(0);
  });

  it('swipe length does not change speed, and spamming directions cannot stack speed or teleport', () => {
    const a = staged(5);
    const b = staged(5);
    a.command({ type: 'dribble', direction: { x: 0.3, y: 0.4 } });
    b.command({ type: 'dribble', direction: { x: 300, y: 400 } });
    run(a, 1.2);
    run(b, 1.2);
    expect(b.state.players.H8.pos).toEqual(a.state.players.H8.pos);

    const sim = staged(6);
    const dirs = [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }];
    let max = 0;
    let offMax = 0;
    let accepted = 0;
    for (let i = 0; i < 600; i++) {
      const before = { ...sim.state.players.H8.pos };
      if (sim.command({ type: 'dribble', direction: dirs[i % dirs.length]! })) accepted++;
      sim.step(H);
      const p = sim.state.players.H8.pos;
      expect(Math.hypot(p.x - before.x, p.y - before.y)).toBeLessThanOrEqual(T.carrier.speed * T.feint.exitSpeedFactor * H + 1e-9);
      // The carrier's cap applies while he has the ball; off the ball the swipe steers a defender at the normal AI chase cap.
      if (sim.userHasBall()) max = Math.max(max, speed(sim));
      else offMax = Math.max(offMax, Math.hypot(sim.state.players[sim.state.controlledId].vel.x, sim.state.players[sim.state.controlledId].vel.y));
    }
    expect(max).toBeLessThanOrEqual(T.carrier.speed + 1e-6);
    expect(offMax).toBeLessThanOrEqual(T.movement.chaseSpeed + 1e-6);
    expect(accepted).toBeLessThan(600 * H / T.carrier.redirectSeconds + 2);
  });

  it('carrier movement is the same at 30, 60 and 144 fps', () => {
    const pos = [30, 60, 144].map((fps) => {
      const sim = staged(7);
      sim.command({ type: 'dribble', direction: { x: 0, y: -1 } });
      run(sim, 1, fps);
      sim.command({ type: 'dribble', direction: { x: -1, y: 1 } });
      run(sim, 1, fps);
      return sim.state.players.H8.pos;
    });
    for (const p of pos) {
      expect(Math.abs(p.x - pos[0]!.x)).toBeLessThan(0.2);
      expect(Math.abs(p.y - pos[0]!.y)).toBeLessThan(0.2);
    }
  });
});

describe('body feint', () => {
  it('one feint per cooldown: spam during the move or cooldown never queues another', () => {
    const sim = staged();
    let seq = lastSeq(sim);
    expect(sim.command({ type: 'feint' })).toBe(true);
    let extra = 0;
    let feintEvents = 0;
    // The event log is bounded, so count feint events every tick while spamming.
    for (let i = 0; i < Math.round(T.feint.cooldownSeconds / H) - 2; i++) {
      if (sim.command({ type: 'feint' })) extra++;
      sim.step(H);
      feintEvents += newEvents(sim, seq).filter((e) => e.type === 'feint').length;
      seq = lastSeq(sim);
    }
    expect(extra).toBe(0);
    expect(feintEvents).toBe(1);
    run(sim, 0.1);
    expect(sim.command({ type: 'feint' })).toBe(true);
  });

  it('grants no protection, possession or teleport; a swipe during it picks the exit', () => {
    const sim = staged(4, { x: 30, y: 25 }, false);
    sim.arrange((s) => {
      s.players.A5.pos = { x: 32.5, y: 25 };
    });
    const protect = sim.state.protectUntil;
    const before = { ...sim.state.players.H8.pos };
    sim.command({ type: 'feint' });
    expect(sim.state.protectUntil).toBe(protect);
    expect(sim.state.players.H8.pos).toEqual(before);
    sim.step(H * 10);
    expect(sim.command({ type: 'dribble', direction: { x: 0, y: -1 } })).toBe(true);
    expect(sim.state.feint?.exitDir).toEqual({ x: 0, y: -1 });
    // Whether the defender bites is seeded chance, not a guarantee: both outcomes occur across seeds.
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const s2 = staged(seed, { x: 30, y: 25 }, false);
      s2.arrange((s) => {
        s.players.A5.pos = { x: 32.5, y: 25 };
      });
      const q = lastSeq(s2);
      s2.command({ type: 'feint' });
      outcomes.add(newEvents(s2, q).find((e) => e.type === 'feint')?.detail.split(' ')[0] ?? '');
    }
    expect(outcomes).toEqual(new Set(['bit', 'read']));
  });
});

describe('aim slow-motion allowance', () => {
  it('drains in real time, never refills from cancel/pause/passing, then aiming runs at normal speed', () => {
    const sim = staged();
    const full = T.aimAllowance.seconds;
    sim.command({ type: 'aimStart' });
    run(sim, 0.5);
    expect(sim.state.timeScale).toBe(T.aim.slowMoScale);
    sim.command({ type: 'aimCancel', reason: 'test' });
    const left = sim.state.aimAllowance.home;
    expect(left).toBeCloseTo(full - 0.5, 1);
    run(sim, 2);
    sim.command({ type: 'pause' });
    run(sim, 5);
    sim.command({ type: 'resume' });
    for (let i = 0; i < 20; i++) {
      sim.command({ type: 'aimStart' });
      sim.command({ type: 'aimCancel', reason: 'spam' });
    }
    expect(sim.state.aimAllowance.home).toBeCloseTo(left, 6);
    const seq = lastSeq(sim);
    sim.command({ type: 'aimStart' });
    run(sim, full);
    expect(sim.state.aimAllowance.home).toBe(0);
    expect(sim.state.timeScale).toBe(1);
    expect(newEvents(sim, seq).filter((e) => e.type === 'slowMoSpent')).toHaveLength(1);
    sim.command({ type: 'aimUpdate', direction: { x: 1, y: 0.2 }, power: 0.4 });
    expect(sim.command({ type: 'aimRelease' })).toBe(true);
    expect(sim.state.ball.owner).toBeNull();
    run(sim, 3);
    expect(sim.state.aimAllowance.home).toBe(0);
    sim.command({ type: 'reset' });
    expect(sim.state.aimAllowance.home).toBe(full);
  });

  it('over long seeded play it refills only when home establishes possession after the opponent established it', () => {
    for (const seed of [1, 2, 3]) {
      const sim = new MatchSim({ seed });
      live(sim);
      let seq = lastSeq(sim);
      let awayHadIt = false;
      let prev = sim.state.aimAllowance.home;
      let refills = 0;
      for (let i = 0; i < 90 * 60; i++) {
        if (i % 30 === 0 && sim.userHasBall()) sim.command({ type: 'aimStart' });
        if (i % 30 === 12 && sim.state.phase === 'aiming') sim.command({ type: 'aimCancel', reason: 'script' });
        sim.step(1 / 60);
        const evs = newEvents(sim, seq);
        seq = lastSeq(sim);
        const est = (team: string) => (e: { type: string; detail: string }) => e.type === 'possession' && e.detail.startsWith(`established ${team} `);
        const homeWon = evs.some(est('home'));
        if (evs.some(est('away'))) awayHadIt = true;
        const now = sim.state.aimAllowance.home;
        if (now > prev + 1e-9) {
          expect(homeWon && awayHadIt).toBe(true);
          awayHadIt = evs.some((e) => est('away')(e) && e.seq > (evs.find(est('home'))?.seq ?? 0));
          refills++;
        }
        prev = now;
      }
      expect(refills).toBeGreaterThan(0);
    }
  });
});

describe('command validation', () => {
  it('rejects non-finite and zero inputs and caps power; state stays finite', () => {
    const sim = staged();
    expect(sim.command({ type: 'dribble', direction: { x: Number.NaN, y: 0 } })).toBe(false);
    expect(sim.command({ type: 'dribble', direction: { x: Number.POSITIVE_INFINITY, y: 1 } })).toBe(false);
    expect(sim.command({ type: 'dribble', direction: { x: 0, y: 0 } })).toBe(false);
    expect(sim.command({ type: 'aimStart' })).toBe(true);
    expect(sim.command({ type: 'aimUpdate', direction: { x: 1, y: 0 }, power: Number.NaN })).toBe(false);
    expect(sim.command({ type: 'aimUpdate', direction: { x: Number.NaN, y: 0 }, power: 1 })).toBe(false);
    expect(sim.command({ type: 'aimUpdate', direction: { x: 1, y: 0.1 }, power: 1e9 })).toBe(true);
    expect(sim.state.aim?.power).toBe(1);
    sim.command({ type: 'aimRelease' });
    expect(Math.hypot(sim.state.ball.vel.x, sim.state.ball.vel.y)).toBeLessThanOrEqual(T.kick.maxSpeed + 1e-9);
    run(sim, 2);
    const s = sim.state;
    for (const v of [s.ball.pos.x, s.ball.pos.y, s.ball.vel.x, s.ball.vel.y, s.players.H8.pos.x, s.players.H8.vel.y]) expect(Number.isFinite(v)).toBe(true);
  });

  it('a release with no direction (inside the cancel circle) never kicks', () => {
    const sim = staged();
    sim.command({ type: 'aimStart' });
    sim.command({ type: 'aimUpdate', direction: null, power: 0 });
    expect(sim.command({ type: 'aimRelease' })).toBe(false);
    expect(sim.state.ball.owner).toBe('H8');
  });

  it('feint needs the ball; off the ball a swipe only steers the controlled home outfielder, never in a pause', () => {
    const sim = staged();
    sim.command({ type: 'pause' });
    expect(sim.command({ type: 'feint' })).toBe(false);
    expect(sim.command({ type: 'dribble', direction: { x: 0, y: 1 } })).toBe(false);
    sim.command({ type: 'resume' });
    sim.arrange((s) => {
      s.ball.owner = 'A5';
      s.possession = 'away';
    });
    expect(sim.command({ type: 'feint' })).toBe(false);
    expect(sim.command({ type: 'aimStart' })).toBe(false);
    const id = sim.state.controlledId;
    expect(sim.command({ type: 'dribble', direction: { x: 0, y: 1 } })).toBe(true);
    expect(sim.state.userSteer?.dir).toEqual({ x: 0, y: 1 });
    expect(sim.state.players[id].team).toBe('home');
    expect(sim.state.players[id].isKeeper).toBe(false);
    expect(sim.state.ball.owner).toBe('A5');
    sim.command({ type: 'pause' });
    expect(sim.command({ type: 'dribble', direction: { x: 1, y: 0 } })).toBe(false);
  });
});

describe('unified kick', () => {
  it('one speed mapping for user and AI kicks; short pull softer, long pull capped', () => {
    expect(kickSpeed(0)).toBe(T.kick.minSpeed);
    expect(kickSpeed(1)).toBe(T.kick.maxSpeed);
    expect(kickSpeed(5)).toBe(T.kick.maxSpeed);
    expect(kickSpeed(Number.NaN)).toBe(T.kick.minSpeed);
    for (const v of [9, 14, 18, 27]) expect(kickSpeed(powerForSpeed(v))).toBeCloseTo(v, 9);
  });

  it('the kick goes exactly where aimed from the current ball position (no redirection)', () => {
    const sim = staged();
    run(sim, 0.4);
    sim.command({ type: 'aimStart' });
    run(sim, 0.3);
    const ball = { ...sim.state.ball.pos };
    sim.command({ type: 'aimUpdate', direction: { x: 0.2, y: 1 }, power: 0.3 });
    sim.command({ type: 'aimRelease' });
    const v = sim.state.ball.vel;
    expect(sim.state.ball.pos).toEqual(ball);
    expect(Math.atan2(v.y, v.x)).toBeCloseTo(Math.atan2(1, 0.2), 9);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(kickSpeed(0.3), 9);
  });
  it('a long-range kick on target is a shot the keeper plays, never a free goal', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const sim = staged(seed, { x: 33, y: 25 });
      sim.arrange((s) => {
        for (const id of ['H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H9'] as const) s.players[id].pos = { x: 3, y: 3 + Number(id.slice(1)) * 5 };
        s.players.A1.pos = { x: 73.5, y: 25 };
      });
      run(sim, 0.25);
      const seq = lastSeq(sim);
      const b = sim.state.ball.pos;
      sim.command({ type: 'aimStart' });
      sim.command({ type: 'aimUpdate', direction: { x: T.pitch.length - b.x, y: T.pitch.goalCenterY + 2 - b.y }, power: 1 });
      sim.command({ type: 'aimRelease' });
      for (let i = 0; i < 600 && sim.state.phase !== 'stopped' && !sim.state.ball.owner; i++) sim.step(H);
      const evs = newEvents(sim, seq);
      expect(evs.some((e) => e.type === 'shot')).toBe(true);
      expect(sim.state.stoppage?.reason === 'goal').toBe(false);
    }
  });
});

describe('quick shot (double-tap)', () => {
  it('one quick shot at goal per possession: spam, pause, aiming and no-ball are rejected', () => {
    const sim = staged(3, { x: 55, y: 25 });
    const seq = lastSeq(sim);
    expect(sim.command({ type: 'quickShot' })).toBe(true);
    expect(sim.state.ball.owner).toBeNull();
    for (let i = 0; i < 10; i++) expect(sim.command({ type: 'quickShot' })).toBe(false);
    const ev = newEvents(sim, seq);
    expect(ev.filter((e) => e.type === 'quickShot')).toHaveLength(1);
    expect(ev.filter((e) => (e.type === 'shot' || e.type === 'pass') && e.by === 'H8')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'feint')).toEqual([]);

    const paused = staged(3, { x: 55, y: 25 });
    paused.command({ type: 'pause' });
    expect(paused.command({ type: 'quickShot' })).toBe(false);
    expect(paused.state.ball.owner).toBe('H8');

    const aiming = staged(3, { x: 55, y: 25 });
    expect(aiming.command({ type: 'aimStart' })).toBe(true);
    expect(aiming.command({ type: 'quickShot' })).toBe(false);
    expect(aiming.state.ball.owner).toBe('H8');

    const lost = staged(3, { x: 55, y: 25 });
    lost.arrange((s) => {
      s.ball.owner = 'A5';
      s.possession = 'away';
    });
    expect(lost.command({ type: 'quickShot' })).toBe(false);
  });

  it('heads for the goal mouth with seeded spread (speed over placement) and is deterministic', () => {
    const P = T.pitch;
    const ys: number[] = [];
    for (let seed = 1; seed <= 25; seed++) {
      const sim = staged(seed, { x: 50, y: 18 });
      const from = { ...sim.state.ball.pos };
      expect(sim.command({ type: 'quickShot' })).toBe(true);
      const v = sim.state.ball.vel;
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(kickSpeed(T.quickShot.power, T), 6);
      const y = from.y + (v.y / v.x) * (P.length - from.x);
      expect(Math.abs(y - P.goalCenterY)).toBeLessThanOrEqual(T.quickShot.spread * P.goalHalfWidth + 1e-6);
      ys.push(y);
      const again = staged(seed, { x: 50, y: 18 });
      again.command({ type: 'quickShot' });
      expect(again.state.ball.vel).toEqual(v);
    }
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1);
  });
});

describe('aim slow motion', () => {
  it('slows while aiming, restores on release or cancel, and aim/cancel spam never refills the allowance', () => {
    const sim = staged(3);
    let prev = sim.state.aimAllowance.home;
    for (let i = 0; i < 30; i++) {
      expect(sim.command({ type: 'aimStart' })).toBe(true);
      sim.step(1 / 60);
      if (sim.state.aimAllowance.home > 0 || i === 0) expect(sim.state.timeScale).toBeLessThanOrEqual(1);
      expect(sim.state.aimAllowance.home).toBeLessThanOrEqual(prev);
      prev = sim.state.aimAllowance.home;
      expect(sim.command({ type: 'aimCancel', reason: 'spam' })).toBe(true);
      sim.step(1 / 60);
      expect(sim.state.timeScale).toBe(1);
    }
    expect(sim.state.aimAllowance.home).toBeLessThan(T.aimAllowance.seconds);
  });

  it('a pause during aiming keeps time frozen; ending the aim never unpauses', () => {
    const sim = staged(3);
    sim.command({ type: 'aimStart' });
    sim.command({ type: 'pause' });
    sim.step(1 / 60);
    expect(sim.state.timeScale).toBe(0);
    sim.command({ type: 'aimCancel', reason: 'paused' });
    sim.step(1 / 60);
    expect(sim.state.paused).toBe(true);
    expect(sim.state.timeScale).toBe(0);
  });
});
