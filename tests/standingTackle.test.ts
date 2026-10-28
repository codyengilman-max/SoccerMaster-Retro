import { describe, expect, it } from 'vitest';
import { match } from '../src/game';
import { ContributionTracker, DEFENSE_UNITS } from '../src/game/report/assists';

const { MatchSim, MATCH_TUNING: T, TEAM_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim> & { id: () => number };
type Id = match.MatchPlayerId;
const F = 1 / 60;
const ST = T.pad.standing;

function run(sim: Sim, seconds: number, each?: (s: Sim) => boolean | void): void {
  for (let i = 0; i < Math.round(seconds / F); i++) {
    if (each?.(sim)) return;
    sim.step(F);
  }
}

type V = { x: number; y: number };
/**
 * Hold the carrier still while it owns the ball, at a fixed point of its dribble touch cycle: 0 is the ball
 * at the feet (tight), 0.25 the ball pushed furthest out (loose). The tackle's timing is when in that cycle it lands.
 */
function pin(sim: Sim, touchPhase: number): void {
  if (sim.state.ball.owner !== 'A6') return;
  sim.arrange((s) => {
    s.players.A6.pos = { x: 40, y: 25 };
    // A slow walk toward the home goal keeps the ball on a fixed side (-x) of the carrier.
    s.players.A6.vel = { x: -1, y: 0 };
    s.touchPhase = touchPhase;
  });
}

/**
 * Away carrier A6 held at (40, 25) on the ball; everyone else parked far away so only the tackle decides the outcome.
 * `place` gets the carrier, its ball and the unit vector from carrier to ball, and returns where H7 stands and
 * which way the stick (and so the tackle) points.
 */
function duel(seed: number, place: (c: V, ball: V, b: V) => { at: V; dir: V }, attributes?: match.MatchSimOptions['attributes']): Sim {
  const sim = new MatchSim({ seed, halfSeconds: null, ...(attributes ? { attributes } : {}) }) as Sim;
  let n = 0;
  sim.id = () => ++n;
  run(sim, T.kickoff.countdownSeconds + 2 * F);
  sim.arrange((s) => {
    for (const id of [...TEAM_PLAYER_IDS.home, ...TEAM_PLAYER_IDS.away] as Id[]) {
      s.players[id].pos = { x: id.startsWith('H') ? 80 : 85, y: 3 + Number(id.slice(1)) * 4 };
      s.players[id].vel = { x: 0, y: 0 };
    }
    s.players.H7.pos = { x: 70, y: 45 };
    s.players.A6.pos = { x: 40, y: 25 };
    s.ball.owner = 'A6';
    s.ball.pos = { x: 39.4, y: 25 };
    s.ball.vel = { x: 0, y: 0 };
    s.ball.kick = null;
    s.possession = 'away';
    s.ownedSince = s.simTime;
    s.nextDecisionAt = s.simTime + 5;
    s.protectUntil = s.simTime;
    s.controlledId = 'H7';
    s.controlSince = s.simTime;
    s.controlEpoch += 1;
  });
  const c = { x: 40, y: 25 };
  const b = { x: -1, y: 0 };
  const ball = { x: c.x + b.x * T.dribble.minLead, y: c.y };
  const { at, dir } = place(c, ball, b);
  sim.arrange((s) => {
    s.players.H7.pos = { ...at };
    s.pad.facing = { ...dir };
  });
  sim.command({ type: 'padMove', x: dir.x, y: dir.y });
  return sim;
}

/** Facing the carrier from the ball side, 2.4 yd out: the lunge carries the lead foot onto the ball. */
const FRONT = (c: V, _ball: V, b: V) => ({ at: { x: c.x + b.x * 2.4, y: c.y + b.y * 2.4 }, dir: { x: -b.x, y: -b.y } });
/** Coming through the carrier's back toward the ball. */
const BEHIND = (c: V, _ball: V, b: V) => ({ at: { x: c.x - b.x * 1.4, y: c.y - b.y * 1.4 }, dir: { ...b } });
/** Standing, already pointed at the ball, with the lead foot `gap` yards from it. */
const AT_GAP = (gap: number) => (_c: V, ball: V, b: V) => ({ at: { x: ball.x + b.x * (ST.footAhead + gap), y: ball.y + b.y * (ST.footAhead + gap) }, dir: { x: -b.x, y: -b.y } });

type Outcome = 'won' | 'missed' | 'foul' | 'none';
/** Press TACKLE, play the attempt out, and report the single resolution event. */
function attempt(sim: Sim, touchPhase = 0): { outcome: Outcome; ownerAfterWin: string | null; events: match.MatchEvent[] } {
  const from = sim.state.events.at(-1)?.seq ?? 0;
  expect(sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' })).toBe(true);
  sim.command({ type: 'padRelease', id: sim.id(), action: 'tackle' });
  let ownerAfterWin: string | null = 'unset';
  run(sim, ST.startSeconds + ST.activeSeconds + 2 * F, (s) => {
    pin(s, touchPhase);
    const won = s.state.events.some((e) => e.seq > from && e.type === 'standing' && e.detail.startsWith('won'));
    if (won && ownerAfterWin === 'unset') ownerAfterWin = s.state.ball.owner;
    return s.state.phase === 'stopped';
  });
  const events = sim.state.events.filter((e) => e.seq > from);
  const res = events.filter((e) => (e.type === 'standing' && e.detail !== 'start') || (e.type === 'foul' && e.by === 'H7'));
  expect(res.length).toBeLessThanOrEqual(1);
  const r = res[0];
  const outcome: Outcome = !r ? 'none' : r.type === 'foul' ? 'foul' : r.detail.startsWith('won') ? 'won' : 'missed';
  return { outcome, ownerAfterWin: ownerAfterWin === 'unset' ? null : ownerAfterWin, events };
}

function rates(place: Parameters<typeof duel>[1], attributes?: match.MatchSimOptions['attributes'], touchPhase = 0, seeds = 120) {
  const n: Record<Outcome, number> = { won: 0, missed: 0, foul: 0, none: 0 };
  for (let seed = 1; seed <= seeds; seed++) n[attempt(duel(seed, place, attributes), touchPhase).outcome]++;
  return { won: n.won / seeds, foul: n.foul / seeds, missed: n.missed / seeds, none: n.none };
}


describe('standing tackle (TACKLE button)', () => {
  it('out of reach: the attempt whiffs with no contact, the carrier keeps the ball', () => {
    const sim = duel(3, AT_GAP(4));
    const r = attempt(sim);
    expect(r.outcome).toBe('missed');
    expect(r.events.find((e) => e.type === 'standing' && e.detail !== 'start')?.detail).toBe('missed');
    expect(sim.state.ball.owner).toBe('A6');
  });

  it('reach boundary: just inside the lead-foot reach is contested, just outside it is not', () => {
    // Without a lunge (stick neutral toward the ball, the player stands at the boundary at press time).
    const contested = (gap: number) => {
      const sim = duel(5, AT_GAP(gap));
      const hold = { ...sim.state.players.H7.pos };
      const from = sim.state.events.at(-1)?.seq ?? 0;
      sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' });
      // Freeze the tackler (no lunge) so only the starting gap decides whether the foot reaches the ball.
      run(sim, ST.startSeconds + ST.activeSeconds + 2 * F, (s) => {
        pin(s, 0);
        s.arrange((st) => ((st.players.H7.pos = { ...hold }), (st.players.H7.vel = { x: 0, y: 0 })));
        return s.state.phase === 'stopped';
      });
      const e = sim.state.events.find((x) => x.seq > from && ((x.type === 'standing' && x.detail !== 'start') || (x.type === 'foul' && x.by === 'H7')));
      return e?.type === 'foul' || (e?.type === 'standing' && e.detail !== 'missed');
    };
    expect(contested(ST.reach - 0.05)).toBe(true);
    expect(contested(ST.reach + 0.1)).toBe(false);
  });

  it('never guarantees possession: a won ball is loose the moment it is won, and wins are far from certain', () => {
    const r = rates(FRONT);
    expect(r.won).toBeGreaterThan(0.2);
    expect(r.won).toBeLessThan(ST.maxWin + 0.05);
    expect(r.won + r.missed + r.foul).toBeCloseTo(1, 5);
    for (let seed = 1; seed <= 40; seed++) {
      const a = attempt(duel(seed, FRONT));
      if (a.outcome === 'won') expect(a.ownerAfterWin).toBeNull();
    }
  });

  it('attributes matter: an agile, tidy tackler wins far more often against a weak carrier than the reverse', () => {
    const strong = Object.fromEntries([['H7', { agility: 1.2, control: 1.2 }], ['A6', { agility: 0.8, control: 0.8 }]]);
    const weak = Object.fromEntries([['H7', { agility: 0.8, control: 0.8 }], ['A6', { agility: 1.2, control: 1.2 }]]);
    expect(rates(FRONT, strong).won).toBeGreaterThan(rates(FRONT, weak).won + 0.25);
  });

  it('timing: tackling as the carrier pushes the ball out wins clearly more than when it is at the feet', () => {
    const slow = Object.fromEntries([['H7', { agility: 0.9, control: 0.9 }]]);
    expect(rates(FRONT, slow, 0.25).won).toBeGreaterThan(rates(FRONT, slow, 0).won + 0.1);
  });

  it('positioning: through the carrier from behind wins less and fouls far more than meeting the ball side', () => {
    const front = rates(FRONT);
    const behind = rates(BEHIND);
    expect(behind.won).toBeLessThan(front.won - 0.15);
    expect(behind.foul).toBeGreaterThan(front.foul + 0.15);
  });

  it('a foul stops play with a free kick to the carrier\'s team', () => {
    let seen = false;
    for (let seed = 1; seed <= 60 && !seen; seed++) {
      const sim = duel(seed, BEHIND);
      if (attempt(sim).outcome !== 'foul') continue;
      seen = true;
      expect(sim.state.phase).toBe('stopped');
      expect(sim.state.stoppage?.reason).toBe('foul');
      expect(sim.state.stoppage?.restartTeam).toBe('away');
    }
    expect(seen).toBe(true);
  });

  it('has recovery: no second tackle, slowed movement, then a cooldown before the next press', () => {
    const sim = duel(9, AT_GAP(6));
    expect(sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' })).toBe(true);
    sim.command({ type: 'padRelease', id: sim.id(), action: 'tackle' });
    run(sim, ST.startSeconds + ST.activeSeconds + 2 * F);
    expect(sim.state.pad.phase).toBe('tackleRecovery');
    expect(sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' })).toBe(false);
    run(sim, ST.recoverySeconds * 0.8);
    const v = sim.state.players.H7.vel;
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(T.movement.chaseSpeed * ST.recoverySpeedFactor + 1e-6);
    run(sim, ST.recoverySeconds * 0.2 + 2 * F);
    expect(sim.state.pad.phase).toBe('ready');
    expect(sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' })).toBe(false);
    run(sim, ST.cooldownSeconds + 2 * F);
    expect(sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' })).toBe(true);
  });

  it('a cancelled jockey (rotation, lost touch) keeps the tackle cooldown', () => {
    const sim = duel(9, AT_GAP(6));
    expect(sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' })).toBe(true);
    run(sim, ST.startSeconds + ST.activeSeconds + ST.recoverySeconds + 2 * F);
    expect(sim.state.pad.phase).toBe('jockey');
    expect(sim.state.pad.readyAt).toBeGreaterThan(sim.state.simTime);
    expect(sim.command({ type: 'padCancel', id: sim.id(), reason: 'rotate' })).toBe(true);
    expect(sim.state.pad.phase).toBe('ready');
    expect(sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' })).toBe(false);
    run(sim, ST.cooldownSeconds + 2 * F);
    expect(sim.command({ type: 'padPress', id: sim.id(), action: 'tackle' })).toBe(true);
  });

  it('like contact tackles, it cannot win a new carrier\'s protected first touch', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const sim = duel(seed, FRONT);
      sim.arrange((s) => {
        s.protectUntil = s.simTime + 5;
      });
      // Never contested: the attempt just runs out (a plain whiff), no win, no foul, carrier keeps it.
      const r = attempt(sim);
      expect(r.events.filter((e) => e.type === 'standing' && e.detail !== 'start').map((e) => e.detail)).toEqual(['missed']);
      expect(r.events.some((e) => e.type === 'foul')).toBe(false);
      expect(sim.state.ball.owner).toBe('A6');
    }
  });

  it('like contact tackles, it cannot take a keeper\'s held ball', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const sim = duel(seed, FRONT);
      sim.arrange((s) => {
        (s.players.A6 as { isKeeper: boolean }).isKeeper = true;
      });
      const r = attempt(sim);
      expect(r.events.filter((e) => e.type === 'standing' && e.detail !== 'start').map((e) => e.detail)).toEqual(['missed']);
      expect(r.events.some((e) => e.type === 'foul')).toBe(false);
      expect(sim.state.ball.owner).toBe('A6');
    }
  });

  it('is deterministic: the same seed and inputs give the same outcome', () => {
    for (let seed = 1; seed <= 10; seed++) expect(attempt(duel(seed, FRONT)).outcome).toBe(attempt(duel(seed, FRONT)).outcome);
  });

  it('feeds Ball Winner: a won tackle the home team then controls is 1 standing unit; misses and fouls score nothing', () => {
    let credited = 0;
    let wins = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const sim = duel(seed, FRONT);
      const t = new ContributionTracker();
      const view = () => ({ simTime: sim.state.simTime, players: sim.state.players });
      t.observe(view(), sim.state.events);
      const a = attempt(sim);
      if (a.outcome === 'won') wins++;
      run(sim, 2.5, (s) => (t.observe(view(), s.state.events), s.state.phase === 'stopped'));
      t.observe(view(), sim.state.events);
      const c = t.of('H7');
      expect(c.slideWon).toBe(0);
      expect(c.interceptions).toBe(0);
      expect(c.defenseUnits).toBe(c.standingWon * DEFENSE_UNITS.standing);
      if (a.outcome !== 'won') expect(c.standingWon).toBe(0);
      expect(c.standingWon).toBeLessThanOrEqual(1);
      credited += c.standingWon;
    }
    expect(wins).toBeGreaterThan(0);
    expect(credited).toBeGreaterThan(0);
  });
});
