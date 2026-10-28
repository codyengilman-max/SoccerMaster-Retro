import { describe, expect, it } from 'vitest';
import { match } from '../src/game';

const { MatchSim, MATCH_TUNING: T } = match;
type Sim = InstanceType<typeof MatchSim> & { id: () => number };
const F = 1 / 60;
const Q = T.pad.quickShot;

function run(sim: Sim, seconds: number, until?: (s: Sim) => boolean): void {
  for (let i = 0; i < Math.round(seconds / F); i++) {
    if (until?.(sim)) return;
    sim.step(F);
  }
}

/** Live play with the user's H7 on the ball 18 yd out, centrally; outfield players parked far away. */
function setup(seed = 7, kicking: match.KickingMode = 'v11'): Sim {
  const sim = new MatchSim({ seed, halfSeconds: null, kicking }) as Sim;
  let n = 0;
  sim.id = () => ++n;
  run(sim, T.kickoff.countdownSeconds + 2 * F);
  const at = { x: T.pitch.length - 18, y: T.pitch.width / 2 };
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
      p.pos = { x: T.pitch.length - 4 - i++ * 2, y: 48.5 };
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
const press = (sim: Sim) => sim.command({ type: 'padPress', id: sim.id(), action: 'shoot' });
const release = (sim: Sim) => sim.command({ type: 'padRelease', id: sim.id(), action: 'shoot' });
const shots = (sim: Sim, after = 0) => sim.state.events.filter((e) => e.seq > after && e.type === 'shot');
const lastSeq = (sim: Sim) => sim.state.events.at(-1)?.seq ?? 0;

type Shot = { at: number; detail: string; charge: number; error: number; lockedAt: number };
/** Play until the shot leaves the foot; report when, with what locked charge, and the execution error (radians). */
function untilShot(sim: Sim, from: number, seconds = 1): Shot | null {
  let dir: { x: number; y: number } | null = null;
  let charge = NaN;
  let lockedAt = NaN;
  run(sim, seconds, (s) => {
    const L = s.state.pad.locked;
    if (L) ((dir = L.dir), (charge = L.charge), (lockedAt = L.at));
    return shots(s, from).length > 0;
  });
  const e = shots(sim, from)[0];
  if (!e || !dir) return null;
  const v = sim.state.ball.vel;
  const d = dir as { x: number; y: number };
  const error = Math.atan2(d.x * v.y - d.y * v.x, d.x * v.x + d.y * v.y);
  return { at: e.at, detail: e.detail, charge, error, lockedAt };
}

/** A single SHOOT tap: down for `hold` seconds, then up. */
function tap(sim: Sim, hold = 0.05): number {
  expect(press(sim)).toBe(true);
  run(sim, hold);
  expect(release(sim)).toBe(true);
  return sim.state.simTime;
}

describe('double-tap quick shot (default pad)', () => {
  it('a single tap still shoots the ordinary tap shot, once the double-tap window passes', () => {
    const sim = setup();
    const from = lastSeq(sim);
    const up = tap(sim);
    expect(sim.state.pad.phase).toBe('shotTapWait');
    expect(sim.state.pad.locked?.quick).toBe(false);
    const charge = sim.state.pad.locked!.charge;
    run(sim, Q.gapSeconds - 2 * F);
    expect(shots(sim, from)).toHaveLength(0);
    const shot = untilShot(sim, from)!;
    expect(shot.detail.startsWith('quick')).toBe(false);
    expect(shot.charge).toBe(charge);
    expect(shot.at - up).toBeCloseTo(Q.gapSeconds + T.pad.prepSeconds, 1);
    expect(shots(sim, from)).toHaveLength(1);
  });

  it('a held shot never waits: it leaves the foot after the normal preparation, unchanged', () => {
    const sim = setup();
    const from = lastSeq(sim);
    const up = tap(sim, 0.4);
    expect(sim.state.pad.phase).toBe('kickPrep');
    const shot = untilShot(sim, from)!;
    expect(shot.detail.startsWith('quick')).toBe(false);
    expect(shot.at - up).toBeGreaterThanOrEqual(T.pad.prepSeconds - 1e-9);
    expect(shot.at - up).toBeLessThanOrEqual(T.pad.prepSeconds + 2 * F);
    expect(shot.charge).toBeCloseTo(0.4 / T.pad.shotChargeSeconds, 1);
  });

  it('a second press inside the window fires one quick shot, sooner than any other shot', () => {
    const sim = setup();
    const from = lastSeq(sim);
    const up = tap(sim);
    run(sim, 0.1);
    expect(press(sim)).toBe(true);
    const second = sim.state.simTime;
    expect(sim.state.pad.locked?.quick).toBe(true);
    // The finger is still down on a real phone: the button stays live (so the pad never cancels it),
    // and lifting it changes nothing; exactly one shot.
    expect(sim.padAvailability().shoot).toBe(true);
    expect(release(sim)).toBe(true);
    expect(sim.state.pad.locked?.quick).toBe(true);
    expect(sim.state.events.some((e) => e.seq > from && e.type === 'padPress' && e.detail === 'shoot quick')).toBe(true);
    const shot = untilShot(sim, from)!;
    expect(shot.detail.startsWith('quick')).toBe(true);
    expect(shot.charge).toBe(Q.charge);
    expect(shot.at - second).toBeLessThanOrEqual(Q.prepSeconds + 2 * F);
    expect(shot.at - second).toBeLessThan(T.pad.prepSeconds);
    // Quicker than the same tap left alone (window + normal preparation after the first release).
    expect(shot.at - up).toBeLessThan(Q.gapSeconds + T.pad.prepSeconds);
    run(sim, 1);
    expect(shots(sim, from)).toHaveLength(1);
  });

  it('a second press after the window is not a quick shot', () => {
    const sim = setup();
    const from = lastSeq(sim);
    tap(sim);
    run(sim, Q.gapSeconds + F);
    expect(press(sim)).toBe(false);
    run(sim, 1);
    expect(shots(sim, from).map((e) => e.detail.startsWith('quick'))).toEqual([false]);
  });

  it('stale input: losing the ball or pausing during the window cancels it; no shot', () => {
    const lost = setup();
    let from = lastSeq(lost);
    tap(lost);
    lost.arrange((s) => {
      s.ball.owner = 'A6';
      s.players.A6.pos = { x: s.ball.pos.x + 0.6, y: s.ball.pos.y };
      s.possession = 'away';
    });
    run(lost, 2 * F);
    expect(lost.state.pad.phase).not.toBe('shotTapWait');
    expect(press(lost)).toBe(false);
    run(lost, 0.5);
    expect(shots(lost, from).filter((e) => e.by === 'H7')).toHaveLength(0);

    const paused = setup();
    from = lastSeq(paused);
    tap(paused);
    expect(paused.command({ type: 'pause' })).toBe(true);
    run(paused, 1);
    expect(paused.command({ type: 'resume' })).toBe(true);
    expect(press(paused)).toBe(true);
    // The fresh press is a new charge, not a stale double tap.
    expect(paused.state.pad.phase).toBe('chargingShoot');
    run(paused, 0.5);
    expect(shots(paused, from)).toHaveLength(0);
  });

  it('keeps the shot execution error: quick shots scatter like a normal shot of the same charge, never perfectly', () => {
    const holdFrames = Math.round((Q.charge * T.pad.shotChargeSeconds) / F);
    const quick: number[] = [];
    const normal: number[] = [];
    for (let seed = 1; seed <= 60; seed++) {
      const a = setup(seed);
      let from = lastSeq(a);
      tap(a);
      run(a, 0.1);
      press(a);
      quick.push(Math.abs(untilShot(a, from)!.error));
      const b = setup(seed);
      from = lastSeq(b);
      press(b);
      run(b, holdFrames * F);
      release(b);
      const s = untilShot(b, from)!;
      expect(s.charge).toBeCloseTo(Q.charge, 1);
      normal.push(Math.abs(s.error));
    }
    const mean = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
    expect(Math.min(...quick)).toBeGreaterThanOrEqual(0);
    expect(mean(quick)).toBeGreaterThan(0.005);
    expect(mean(quick) / mean(normal)).toBeGreaterThan(0.7);
    expect(mean(quick) / mean(normal)).toBeLessThan(1.4);
  });

  it('never guarantees a goal: the keeper and the goal frame resolve quick shots as usual', () => {
    let goals = 0;
    let other = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const sim = setup(seed);
      const from = lastSeq(sim);
      tap(sim);
      run(sim, 0.1);
      press(sim);
      run(sim, 3, (s) => s.state.events.some((e) => e.seq > from && (e.type === 'goal' || e.type === 'saved' || (e.type === 'possession' && e.detail === 'away') || e.type === 'out')));
      const ev = sim.state.events.filter((e) => e.seq > from);
      if (ev.some((e) => e.type === 'goal')) goals++;
      else other++;
    }
    expect(goals + other).toBe(30);
    expect(other).toBeGreaterThan(0);
  });

  it('is deterministic and also works on the classic kicking model', () => {
    const once = (kicking: match.KickingMode) => {
      const sim = setup(11, kicking);
      const from = lastSeq(sim);
      tap(sim);
      run(sim, 0.1);
      expect(press(sim)).toBe(true);
      const s = untilShot(sim, from)!;
      return [s.detail, s.at, s.error];
    };
    expect(once('v11')).toEqual(once('v11'));
    expect(String(once('classic')[0]).startsWith('quick')).toBe(true);
  });
});
