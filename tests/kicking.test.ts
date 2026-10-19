import { describe, expect, it } from 'vitest';
import { match } from '../src/game';
import { createRng } from '../src/game/rng';

const { MatchSim, MATCH_TUNING: T } = match;
const K = T.kicking;
type Sim = InstanceType<typeof MatchSim> & { id: () => number };
type Id = match.MatchPlayerId;
const F = 1 / 60;
const BOUNDS = { minX: 0.5, maxX: T.pitch.length - 0.5, minY: 0.5, maxY: T.pitch.width - 0.5 };
const deg = (d: number) => (d * Math.PI) / 180;
const ang = (a: number, b: number) => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
};

function step(sim: Sim, seconds: number, until?: () => boolean, frame = F): void {
  for (let i = 0; i < Math.round(seconds / frame); i++) {
    if (until?.()) return;
    sim.step(frame);
  }
}

/** Live play with the user's H7 on the ball at `at`, everyone else parked out of the way. */
function setup(opts: { kicking?: match.KickingMode; seed?: number; at?: { x: number; y: number }; attributes?: match.MatchSimOptions['attributes'] } = {}): Sim {
  const sim = new MatchSim({
    seed: opts.seed ?? 7,
    halfSeconds: null,
    kicking: opts.kicking ?? 'v11',
    ...(opts.attributes ? { attributes: opts.attributes } : {}),
  }) as Sim;
  let n = 0;
  sim.id = () => ++n;
  step(sim, T.kickoff.countdownSeconds + 2 * F);
  const at = opts.at ?? { x: 30, y: 25 };
  sim.arrange((s) => {
    let i = 0;
    for (const id of match.TEAM_PLAYER_IDS.home) {
      const p = s.players[id];
      if (p.isKeeper) continue;
      p.pos = id === 'H7' ? { ...at } : { x: 4 + i++ * 2, y: 1.5 };
      p.vel = { x: 0, y: 0 };
    }
    i = 0;
    for (const id of match.TEAM_PLAYER_IDS.away) {
      const p = s.players[id];
      if (p.isKeeper) continue;
      p.pos = { x: 4 + i++ * 2, y: 48.5 };
      p.vel = { x: 0, y: 0 };
    }
    s.ball.owner = 'H7';
    s.ball.pos = { x: at.x + 0.6, y: at.y };
    s.ball.vel = { x: 0, y: 0 };
    s.ball.kick = null;
    s.possession = 'home';
    s.ownedSince = s.simTime;
    s.nextDecisionAt = s.simTime + 30;
    s.protectUntil = s.simTime + 30;
    s.controlledId = 'H7';
    s.controlSince = s.simTime;
    s.controlEpoch += 1;
  });
  return sim;
}
const place = (sim: Sim, id: Id, pos: { x: number; y: number }, vel = { x: 0, y: 0 }) =>
  sim.arrange((s) => {
    s.players[id].pos = { ...pos };
    s.players[id].vel = { ...vel };
  });
const press = (sim: Sim, action: match.PadAction) => sim.command({ type: 'padPress', id: sim.id(), action });
const release = (sim: Sim, action: match.PadAction) => sim.command({ type: 'padRelease', id: sim.id(), action });
const stick = (sim: Sim, x: number, y: number) => sim.command({ type: 'padMove', x, y });
const evs = (sim: Sim, type: string) => sim.state.events.filter((e) => e.type === type);

/** Pass from H7 with a fixed stick and hold time; returns the ball speed when a teammate first controls it. */
function passAndReceive(sim: Sim, dir: { x: number; y: number }, hold: number): { receiver: Id | null; arrival: number } {
  stick(sim, dir.x, dir.y);
  press(sim, 'pass');
  step(sim, hold);
  release(sim, 'pass');
  let last = 0;
  for (let i = 0; i < 60 * 6; i++) {
    sim.step(F);
    const b = sim.state.ball;
    if (b.owner && b.owner !== 'H7') return { receiver: b.owner, arrival: last };
    if (!b.owner) last = Math.hypot(b.vel.x, b.vel.y);
  }
  return { receiver: null, arrival: last };
}

describe('passing (brief v1.1)', () => {
  it('P01: short, medium and long passes all arrive at a controllable speed', () => {
    const arrivals: number[] = [];
    for (const d of [8, 16, 24]) {
      const plan = match.solvePassDelivery({ x: 0, y: 0 }, { x: d, y: 0 }, { x: 0, y: 0 }, 0, 1, T.ball.friction, BOUNDS, K);
      expect(plan.arrivalSpeed).toBeCloseTo(K.arrivalSpeed, 6);
      const sim = setup();
      place(sim, 'H8', { x: 30.6 + d, y: 25 });
      const r = passAndReceive(sim, { x: 1, y: 0 }, 0.05);
      expect(r.receiver).toBe('H8');
      arrivals.push(r.arrival);
    }
    for (const a of arrivals) {
      expect(a).toBeGreaterThan(K.arrivalSpeed - 2);
      expect(a).toBeLessThan(K.arrivalSpeed + 3);
    }
    expect(Math.max(...arrivals) - Math.min(...arrivals)).toBeLessThan(2.5);
  });

  it('P02: more charge is monotonically firmer to the same receiving point', () => {
    let prev = 0;
    for (let q = 0; q <= 1.0001; q += 0.1) {
      const p = match.solvePassDelivery({ x: 0, y: 0 }, { x: 15, y: 3 }, { x: 0, y: 0 }, q, 1, T.ball.friction, BOUNDS, K);
      expect(p.launchSpeed).toBeGreaterThanOrEqual(prev);
      expect(p.target).toEqual({ x: 15, y: 3 });
      prev = p.launchSpeed;
    }
    const tap = match.solvePassDelivery({ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 0, y: 0 }, 0, 1, T.ball.friction, BOUNDS, K);
    const full = match.solvePassDelivery({ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 0, y: 0 }, 1, 1, T.ball.friction, BOUNDS, K);
    expect(full.launchSpeed / tap.launchSpeed).toBeCloseTo(K.firmnessFull / K.firmnessTap, 6);
  });

  it('P03: angular alignment ranks first; of near-collinear teammates the nearer is chosen', () => {
    const o = { x: 0, y: 0 };
    const aim = { x: 1, y: 0 };
    const at = (d: number, a: number) => ({ x: d * Math.cos(deg(a)), y: d * Math.sin(deg(a)) });
    expect(match.selectReceiver(o, aim, [{ id: 'H8', pos: at(8, 15) }, { id: 'H9', pos: at(20, 4) }], null, 40, K)).toBe('H9');
    expect(match.selectReceiver(o, aim, [{ id: 'H9', pos: at(20, 1) }, { id: 'H8', pos: at(9, 2) }], null, 40, K)).toBe('H8');
    // Exact ties resolve by stable id, whatever the candidate order.
    const tie = [{ id: 'H9', pos: at(10, 5) }, { id: 'H6', pos: at(10, -5) }];
    expect(match.selectReceiver(o, aim, tie, null, 40, K)).toBe('H6');
    expect(match.selectReceiver(o, aim, [...tie].reverse(), null, 40, K)).toBe('H6');
  });

  it('P04: the held target is kept unless another is materially better aligned, and charge alone never cycles it', () => {
    const o = { x: 0, y: 0 };
    const at = (d: number, a: number) => ({ x: d * Math.cos(deg(a)), y: d * Math.sin(deg(a)) });
    const c = [{ id: 'H8', pos: at(12, 6) }, { id: 'H9', pos: at(18, 3) }];
    expect(match.selectReceiver(o, { x: 1, y: 0 }, c, 'H8', 40, K)).toBe('H8');
    const far = [{ id: 'H8', pos: at(12, 15) }, { id: 'H9', pos: at(18, 1) }];
    expect(match.selectReceiver(o, { x: 1, y: 0 }, far, 'H8', 40, K)).toBe('H9');
    const sim = setup();
    place(sim, 'H8', { x: 44, y: 27 });
    place(sim, 'H9', { x: 50, y: 24 });
    stick(sim, 1, 0);
    press(sim, 'pass');
    const first = sim.state.pad.receiver;
    const seen = new Set<string | null>();
    for (let i = 0; i < 40; i++) {
      sim.step(F);
      seen.add(sim.state.pad.receiver);
    }
    expect(first).not.toBeNull();
    expect([...seen]).toEqual([first]);
    expect(sim.targetSwitches).toBe(0);
  });

  it('P05: with nobody in the cone the pass goes along the aim for a finite roll, never snapping backward', () => {
    expect(match.selectReceiver({ x: 0, y: 0 }, { x: 1, y: 0 }, [{ id: 'H8', pos: { x: -10, y: 0 } }, { id: 'H9', pos: { x: 5, y: 9 } }], null, 40, K)).toBeNull();
    for (const q of [0, 0.5, 1]) {
      const p = match.directionalPass({ x: 10, y: 10 }, { x: 0, y: 2 }, q, 1, T.ball.friction, K);
      expect(p.dir.x).toBeCloseTo(0, 9);
      expect(p.dir.y).toBeCloseTo(1, 9);
      expect(p.distance).toBeGreaterThanOrEqual(K.directionalMin - 1e-9);
      expect(p.distance).toBeLessThanOrEqual(K.directionalMax + 1e-9);
      expect(Number.isFinite(p.launchSpeed)).toBe(true);
    }
    const sim = setup();
    place(sim, 'H8', { x: 20, y: 25 });
    stick(sim, 1, 0);
    press(sim, 'pass');
    expect(sim.state.pad.receiver).toBeNull();
    release(sim, 'pass');
    step(sim, 0.3);
    const k = sim.kickLog.at(-1)!;
    expect(k.receiver).toBeNull();
    expect(Math.cos(k.actualAngle)).toBeGreaterThan(0.99);
  });

  it('P06: the lead is bounded by horizon, distance and pitch, and falls back safely on bad input', () => {
    const o = { x: 10, y: 25 };
    const run = match.solvePassDelivery(o, { x: 30, y: 25 }, { x: 0, y: 20 }, 0, 1, T.ball.friction, BOUNDS, K);
    expect(run.leadDistance).toBeLessThanOrEqual(K.leadMaxDistance + 1e-9);
    expect(run.fallback).toBe(false);
    const slow = match.solvePassDelivery(o, { x: 30, y: 25 }, { x: 0, y: 4 }, 0, 1, T.ball.friction, BOUNDS, K);
    expect(slow.leadDistance).toBeLessThanOrEqual(4 * K.leadHorizon + 1e-9);
    const edge = match.solvePassDelivery(o, { x: 30, y: 49 }, { x: 0, y: 8 }, 0, 1, T.ball.friction, BOUNDS, K);
    expect(edge.target.y).toBeLessThanOrEqual(BOUNDS.maxY);
    const bad = match.solvePassDelivery(o, { x: 30, y: 25 }, { x: Number.NaN, y: 0 }, 0, 1, T.ball.friction, BOUNDS, K);
    expect(bad.fallback).toBe(true);
    expect(bad.target).toEqual({ x: 30, y: 25 });
    expect(Number.isFinite(bad.launchSpeed)).toBe(true);
  });

  it('P07: after release the target cannot be replaced and the launch stays within the bounded correction', () => {
    const sim = setup();
    place(sim, 'H8', { x: 45, y: 25 }, { x: 0, y: 3 });
    stick(sim, 1, 0);
    press(sim, 'pass');
    step(sim, 0.1);
    expect(release(sim, 'pass')).toBe(true);
    const locked = sim.state.pad.locked!;
    expect(locked.receiver).toBe('H8');
    // Stick swings to another teammate, who also runs into the old line.
    stick(sim, 0, 1);
    place(sim, 'H9', { x: 36, y: 31 });
    step(sim, 0.2, () => evs(sim, 'pass').length > 0);
    step(sim, 2 * F);
    const k = sim.kickLog.at(-1)!;
    expect(k.receiver).toBe('H8');
    expect(sim.state.ball.kick?.receiver).toBe('H8');
    expect(ang(k.actualAngle, k.intendedAngle)).toBeLessThanOrEqual(K.contactMaxCorrection + 1e-9);
    // No homing: the ball keeps its launch direction while it rolls.
    const v0 = Math.atan2(sim.state.ball.vel.y, sim.state.ball.vel.x);
    step(sim, 0.3, () => sim.state.ball.owner !== null);
    if (!sim.state.ball.owner) expect(ang(Math.atan2(sim.state.ball.vel.y, sim.state.ball.vel.x), v0)).toBeLessThan(1e-9);
  });

  it('P08: passing ability caps the launch speed; a far target is not guaranteed', () => {
    const weak = match.solvePassDelivery({ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 0, y: 0 }, 1, 0.8, T.ball.friction, BOUNDS, K);
    expect(weak.launchSpeed).toBeLessThanOrEqual(K.passMaxSpeed * 0.8 + 1e-9);
    expect(weak.capped).toBe(true);
    expect(weak.reachesTarget).toBe(false);
    const strong = match.solvePassDelivery({ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 0 }, 0, 1.2, T.ball.friction, BOUNDS, K);
    const avg = match.solvePassDelivery({ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 0 }, 0, 0.8, T.ball.friction, BOUNDS, K);
    expect(strong.launchSpeed).toBeGreaterThan(avg.launchSpeed);
  });

  it('P09: faster balls, balls from behind and pressure make the first touch harder; nothing else rolls dice', () => {
    const touch = (bx: number, fx = -1, pr = 0, ctl = 1) => match.resolveReceivingContact({ x: bx, y: 0 }, { x: 0, y: 0 }, { x: fx, y: 0 }, ctl, pr, K);
    let prev = 2;
    for (const v of [6, 9, 12, 15, 18, 21, 24, 27]) {
      const r = touch(v);
      expect(r.quality).toBeLessThanOrEqual(prev);
      prev = r.quality;
    }
    expect(touch(8).outcome).toBe('secure');
    expect(touch(26).outcome).not.toBe('secure');
    expect(touch(16, 1).quality).toBeLessThan(touch(16, -1).quality);
    expect(touch(16, -1, 1).quality).toBeLessThan(touch(16, -1, 0).quality);
    expect(touch(18, -1, 0, 1.2).quality).toBeGreaterThan(touch(18, -1, 0, 0.8).quality);
    expect(touch(16)).toEqual(touch(16));
    // In the sim: a 25 yd/s ball onto a standing teammate is touched but not secured.
    const sim = setup();
    place(sim, 'H8', { x: 45, y: 25 });
    sim.arrange((s) => {
      s.ball.owner = null;
      s.ball.pos = { x: 41, y: 25 };
      s.ball.vel = { x: 25, y: 0 };
      s.ball.kick = { by: 'H7', team: 'home', kind: 'pass', at: s.simTime, target: { x: 45, y: 25 }, receiver: 'H8' };
      s.ball.ignore = [];
    });
    step(sim, 0.5, () => sim.lastTouch !== null);
    expect(sim.lastTouch!.id).toBe('H8');
    expect(sim.lastTouch!.outcome).not.toBe('secure');
    expect(sim.state.ball.owner).toBeNull();
  });

  it('P10: an opponent in the lane intercepts before the receiver gets it', () => {
    const sim = setup();
    place(sim, 'H8', { x: 50, y: 25 });
    place(sim, 'A5', { x: 40, y: 25 });
    const r = passAndReceive(sim, { x: 1, y: 0 }, 0.05);
    expect(r.receiver).not.toBe('H8');
    expect(sim.state.players[r.receiver ?? 'H7'].team).toBe('away');
  });
});

describe('shooting (brief v1.1)', () => {
  const g = (sim = setup()) => sim.goalPlane('home');

  it('S01: an aim sweep gets at most the bounded assist, continuously, and never chooses a corner', () => {
    const goal = g();
    const o = { x: 55, y: 25 };
    let prevY = -Infinity;
    for (let a = -40; a <= 40; a += 0.5) {
      const r = match.computeShotAim(o, { x: Math.cos(deg(a)), y: Math.sin(deg(a)) }, goal, K);
      expect(Math.abs(r.correction)).toBeLessThanOrEqual(K.shotAssistMax + 1e-12);
      expect(r.hit!.y).toBeGreaterThan(prevY);
      prevY = r.hit!.y;
    }
    const wide = match.computeShotAim(o, { x: Math.cos(deg(35)), y: Math.sin(deg(35)) }, goal, K);
    expect(Math.abs(wide.correction)).toBe(0);
    expect(wide.onTarget).toBe(false);
  });

  it('S02: near-post and far-post aims stay distinguishable on the goal line', () => {
    const goal = g();
    const o = { x: 60, y: 18 };
    const toY = (y: number) => match.computeShotAim(o, { x: goal.x - o.x, y: y - o.y }, goal, K);
    const near = toY(goal.centerY - goal.halfWidth + 0.6);
    const far = toY(goal.centerY + goal.halfWidth - 0.6);
    expect(near.correction).toBe(0);
    expect(far.correction).toBe(0);
    expect(far.hit!.y - near.hit!.y).toBeGreaterThan(2 * goal.halfWidth - 2);
  });

  it('S03: a neutral stick keeps the last meaningful aim; a fresh neutral shot aims at the goal centre; drift is ignored', () => {
    const sim = setup({ at: { x: 55, y: 25 } });
    stick(sim, 0.6, 0.8);
    press(sim, 'shoot');
    step(sim, 0.1);
    stick(sim, 0, 0);
    step(sim, 0.1);
    release(sim, 'shoot');
    expect(sim.state.pad.locked!.aim.x).toBeCloseTo(0.6, 6);
    expect(sim.state.pad.locked!.aim.y).toBeCloseTo(0.8, 6);
    const fresh = setup({ at: { x: 55, y: 20 } });
    stick(fresh, 0.01, 0.01);
    press(fresh, 'shoot');
    step(fresh, 0.1);
    expect(fresh.state.pad.aimSet).toBe(false);
    release(fresh, 'shoot');
    const goal = fresh.goalPlane('home');
    const b = fresh.state.ball.pos;
    const expected = Math.atan2(goal.centerY - b.y, goal.x - b.x);
    const L = fresh.state.pad.locked!;
    expect(ang(Math.atan2(L.aim.y, L.aim.x), expected)).toBeLessThan(1e-6);
  });

  it('S04: the goal plane comes from the attacking direction, not the screen', () => {
    const sim = setup();
    const home = sim.goalPlane('home');
    const away = sim.goalPlane('away');
    expect(home.sign).toBe(1);
    expect(away.sign).toBe(-1);
    expect(home.x).toBeGreaterThan(away.x);
    expect(match.computeShotAim({ x: 60, y: 25 }, { x: 1, y: 0 }, home, K).onTarget).toBe(true);
    expect(match.computeShotAim({ x: 15, y: 25 }, { x: -1, y: 0 }, away, K).onTarget).toBe(true);
  });

  it('S05: hold time maps monotonically to power, and holding never fires by itself', () => {
    const sim = setup({ at: { x: 50, y: 25 } });
    stick(sim, 1, 0);
    press(sim, 'shoot');
    step(sim, 3);
    expect(evs(sim, 'shot')).toHaveLength(0);
    expect(sim.aimPreview()!.charge).toBe(1);
    release(sim, 'shoot');
    expect(sim.state.pad.locked!.speed).toBeCloseTo(T.shot.maxSpeed, 9);
    const speeds = [0.05, 0.3, 0.6, 0.85].map((h) => {
      const s2 = setup({ at: { x: 50, y: 25 } });
      stick(s2, 1, 0);
      press(s2, 'shoot');
      step(s2, h);
      release(s2, 'shoot');
      return s2.state.pad.locked!.speed;
    });
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]!).toBeGreaterThan(speeds[i - 1]!);
  });

  it('S06: over 100 paired seeds, awkward pressured shots scatter more than balanced ones; full power alone adds nothing', () => {
    const balanced = { pressure: 0, misalign: 0, charge: 1, finishing: 1 };
    expect(match.shotErrorSpread(balanced, K)).toBe(match.shotErrorSpread({ ...balanced, charge: 0 }, K));
    const awkward = { pressure: 0.8, misalign: 0.6, charge: 1, finishing: 1 };
    const sb = match.shotErrorSpread(balanced, K);
    const sa = match.shotErrorSpread(awkward, K);
    expect(sa).toBeLessThanOrEqual(K.shotErrorMax);
    const rng = createRng(2026);
    let eb = 0;
    let ea = 0;
    let worse = 0;
    for (let i = 0; i < 100; i++) {
      const r1 = rng();
      const r2 = rng();
      const b = Math.abs(match.shotError(sb, r1, r2));
      const a = Math.abs(match.shotError(sa, r1, r2));
      eb += b;
      ea += a;
      if (a >= b) worse++;
    }
    expect(ea / 100).toBeGreaterThan(2 * (eb / 100));
    expect(worse).toBe(100);
    expect(match.shotErrorSpread({ ...awkward, finishing: 1.2 }, K)).toBeLessThan(match.shotErrorSpread({ ...awkward, finishing: 0.8 }, K));
  });

  it('S07: parallel, backward, beyond-the-line and non-finite geometry is safe', () => {
    const goal = g();
    expect(match.goalHit({ x: 50, y: 25 }, { x: 0, y: 1 }, goal)).toBeNull();
    expect(match.goalHit({ x: 50, y: 25 }, { x: -1, y: 0 }, goal)).toBeNull();
    expect(match.goalHit({ x: goal.x + 1, y: 25 }, { x: 1, y: 0 }, goal)).toBeNull();
    expect(match.goalHit({ x: Number.NaN, y: 25 }, { x: 1, y: 0 }, goal)).toBeNull();
    for (const aim of [{ x: 0, y: 0 }, { x: Number.NaN, y: 1 }, { x: -1, y: 0 }, { x: 0, y: 1 }]) {
      const r = match.computeShotAim({ x: 50, y: 25 }, aim, goal, K);
      expect(Number.isFinite(r.dir.x) && Number.isFinite(r.dir.y)).toBe(true);
      expect(Math.abs(r.correction)).toBeLessThanOrEqual(K.shotAssistMax);
    }
    expect(match.computeShotAim({ x: 50, y: 25 }, { x: -1, y: 0 }, goal, K).correction).toBe(0);
  });
});

describe('input and determinism (brief v1.1)', () => {
  it('I01: losing the ball while charging cancels; no kick follows', () => {
    const sim = setup();
    place(sim, 'H8', { x: 45, y: 25 });
    stick(sim, 1, 0);
    press(sim, 'pass');
    step(sim, 0.1);
    sim.arrange((s) => {
      s.ball.owner = 'A5';
      s.possession = 'away';
      s.ownedSince = s.simTime;
    });
    step(sim, 0.1);
    expect(evs(sim, 'padCancel').length).toBeGreaterThan(0);
    release(sim, 'pass');
    step(sim, 0.3);
    expect(evs(sim, 'pass').filter((e) => e.by === 'H7')).toHaveLength(0);
    expect(sim.kickLog).toHaveLength(0);
  });

  it('I02: a second button during a charge, a cancel, or a pause never produces an extra kick', () => {
    const sim = setup();
    place(sim, 'H8', { x: 45, y: 25 });
    stick(sim, 1, 0);
    press(sim, 'pass');
    press(sim, 'shoot');
    expect(sim.state.pad.phase).toBe('chargingPass');
    sim.command({ type: 'padCancel', id: sim.id(), reason: 'test' });
    release(sim, 'pass');
    step(sim, 0.3);
    expect(sim.kickLog).toHaveLength(0);
    press(sim, 'pass');
    step(sim, 0.05);
    release(sim, 'pass');
    release(sim, 'pass');
    step(sim, 0.5);
    expect(sim.kickLog).toHaveLength(1);
  });

  const scripted = (frame: number) => {
    const sim = setup({ seed: 11 });
    place(sim, 'H8', { x: 44, y: 28 }, { x: 0, y: 2 });
    place(sim, 'H9', { x: 50, y: 21 });
    // Commands land on 1/30 s boundaries so every frame rate sees them at the same sim time.
    const plan: [number, () => void][] = [
      [0, () => stick(sim, 1, 0.1)],
      [2 / 30, () => press(sim, 'pass')],
      [8 / 30, () => stick(sim, 0, 0)],
      [12 / 30, () => release(sim, 'pass')],
    ];
    const t0 = sim.state.simTime;
    for (let i = 0; i < Math.round(3 / frame); i++) {
      while (plan.length && sim.state.simTime - t0 >= plan[0]![0] - 1e-9) plan.shift()![1]();
      sim.step(frame);
    }
    return { log: JSON.stringify(sim.kickLog), ball: { ...sim.state.ball.pos }, owner: sim.state.ball.owner, touch: JSON.stringify(sim.lastTouch) };
  };

  it('I03: 30, 60 and 120 Hz frames give the identical kick, flight and first touch', () => {
    const a = scripted(1 / 30);
    expect(JSON.parse(a.log)).toHaveLength(1);
    expect(scripted(1 / 60)).toEqual(a);
    expect(scripted(1 / 120)).toEqual(a);
  });

  it('I04: a full-power shot is swept against the goal line at every frame rate, and the goal follows the shot', () => {
    const goalAt = (frame: number) => {
      const sim = setup({ at: { x: 60, y: 25 } });
      sim.arrange((s) => {
        for (const id of match.TEAM_PLAYER_IDS.away) if (s.players[id].isKeeper) s.players[id].pos = { x: 72, y: 3 };
      });
      stick(sim, 1, 0);
      press(sim, 'shoot');
      step(sim, 26 / 30, undefined, frame);
      release(sim, 'shoot');
      step(sim, 2, () => evs(sim, 'goal').length > 0, frame);
      const shot = evs(sim, 'shot')[0]!;
      const goal = evs(sim, 'goal')[0]!;
      expect(goal.seq).toBeGreaterThan(shot.seq);
      return goal.at;
    };
    const t = goalAt(1 / 60);
    expect(goalAt(1 / 30)).toBe(t);
    expect(goalAt(1 / 120)).toBe(t);
  });

  it('I05: the same seed and inputs reproduce the same match exactly', () => {
    const play = () => {
      const sim = new MatchSim({ seed: 21, halfSeconds: null }) as Sim;
      let n = 0;
      for (let i = 0; i < 60 * 40; i++) {
        if (i % 45 === 0) sim.command({ type: 'padMove', x: Math.cos(i), y: Math.sin(i) });
        const action = sim.userHasBall() ? (i % 360 < 180 ? 'pass' : 'shoot') : 'block';
        if (i % 90 === 0) sim.command({ type: 'padPress', id: ++n, action });
        if (i % 90 === 25) sim.command({ type: 'padRelease', id: ++n, action });
        sim.step(F);
      }
      return { ev: JSON.stringify(sim.state.events), log: JSON.stringify(sim.kickLog) };
    };
    expect(play()).toEqual(play());
  });

  it('I06: seeded full matches stay valid: 18 players, finite state, shots and goals still happen', () => {
    let shots = 0;
    for (const seed of [1, 2, 3]) {
      const sim = new MatchSim({ seed, halfSeconds: 45 });
      for (let i = 0; i < 60 * 240 && sim.state.phase !== 'fulltime'; i++) {
        if (sim.state.phase === 'halftime') sim.command({ type: 'startSecondHalf' });
        sim.step(F);
      }
      const s = sim.state;
      expect(s.phase).toBe('fulltime');
      expect(Object.keys(s.players)).toHaveLength(18);
      for (const p of Object.values(s.players)) expect(Number.isFinite(p.pos.x + p.pos.y + p.vel.x + p.vel.y)).toBe(true);
      expect(Number.isFinite(s.ball.pos.x + s.ball.pos.y)).toBe(true);
      shots += s.stats.shots.home + s.stats.shots.away;
    }
    expect(shots).toBeGreaterThan(0);
  });
});
