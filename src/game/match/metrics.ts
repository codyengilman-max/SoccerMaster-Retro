/**
 * Headless tactics measurements (PR B): runs one seeded timed match and measures shape, pressing, transitions,
 * chances and referee events for both teams. Pure observation: reads sim.state and the event list only, never
 * changes the sim. Framework-free.
 */
import { MatchSim, checkInvariants } from './sim';
import type { TacticsMode } from './tacticalDirector';
import { FORMATIONS } from './formations';
import { MATCH_TUNING } from './tuning';
import { HOME_IDS, AWAY_IDS, type MatchPlayerId, type MatchState, type TeamId } from './types';

const F = 1 / 60;
/** Shape metrics are sampled every this many 1/60 s ticks (10 samples per sim second). */
const SAMPLE_EVERY = 6;
/** A defender moving slower than this (yd/s) while the ball is live is standing still. */
const PARKED_SPEED = 0.3;
/** Standing still for longer than this (s) counts as parked. */
const PARKED_SECONDS = 3;
/** A defender within this many yards of the carrier is applying pressure. */
const PRESSURE_YARDS = 3;
/** Recovered: at least this many outfielders goal-side of the ball. */
const RECOVERED_GOAL_SIDE = 6;
/** Live play with the ball inside a 2-yard circle for longer than this (s) is stuck. */
const STUCK_SECONDS = 8;
/** A stoppage not restarted within this many sim seconds is a failed restart. */
const RESTART_LIMIT = 12;

export interface TeamMetrics {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  /** Mean shot distance to the goal centre (yd). */
  shotDistance: number;
  /** Mean goal-mouth angle at the shot (degrees); bigger is a better look. */
  shotAngle: number;
  /** Shots from inside 18 yd with at least a 20 degree goal mouth. */
  bigChances: number;
  passes: number;
  passesReceived: number;
  interceptionsWon: number;
  tacklesWon: number;
  possessionShare: number;
  /** In possession: mean spread of outfielder y (yd), and back-to-front depth in the team frame (yd). */
  width: number;
  depth: number;
  /** In possession: mean midfield-minus-defence and attack-minus-midfield line heights (yd). */
  defToMid: number;
  midToAtt: number;
  /** Correlation of back-line height changes with ball x changes (team frame), all live samples. */
  backLineFollowsBall: number;
  /** Total seconds defenders spent parked (defence line, ball live). */
  parkedDefenderSeconds: number;
  /** Defending: mean distance from the nearest outfielder to the opposing carrier (yd). */
  pressDistance: number;
  /** Mean seconds from losing the ball until an outfielder is within 3 yd of the new carrier (lost spells only). */
  timeToPressure: number;
  pressureNeverArrived: number;
  /** Share of sampled opponent-carrier moments with one of this team's outfielders within PRESSURE_YARDS. */
  underPressureShare: number;
  /** Defending: mean outfielders goal-side of the ball. */
  goalSide: number;
  /** Mean seconds after losing the ball until 6 outfielders are goal-side again. */
  recoverySeconds: number;
  offsideAgainst: number;
  foulsCommitted: number;
  outOfPlay: number;
}

export interface MatchMetrics {
  seed: number;
  mode: TacticsMode;
  input: InputProfile;
  score: string;
  home: TeamMetrics;
  away: TeamMetrics;
  stoppages: number;
  failedRestarts: number;
  stuckSpells: number;
  invariantViolations: number;
  tacticsFailure: string | null;
  msPerTick: number;
  /** FNV-1a hash of positions every second and every event: equal for equal seed and mode. */
  traceHash: string;
  /** Fingerprint of the final positions, ball and score (finalFingerprint). */
  finalState: string;
}

const teamOf = (id: MatchPlayerId | null): TeamId | null => (id === null ? null : id[0] === 'H' ? 'home' : 'away');
const other = (t: TeamId): TeamId => (t === 'home' ? 'away' : 'home');
const IDS: Record<TeamId, readonly MatchPlayerId[]> = { home: HOME_IDS, away: AWAY_IDS };

function blank(): TeamMetrics {
  return {
    goals: 0, shots: 0, shotsOnTarget: 0, shotDistance: 0, shotAngle: 0, bigChances: 0, passes: 0, passesReceived: 0,
    interceptionsWon: 0, tacklesWon: 0, possessionShare: 0, width: 0, depth: 0, defToMid: 0, midToAtt: 0,
    backLineFollowsBall: 0, parkedDefenderSeconds: 0, pressDistance: 0, timeToPressure: 0, pressureNeverArrived: 0, underPressureShare: 0,
    goalSide: 0, recoverySeconds: 0, offsideAgainst: 0, foulsCommitted: 0, outOfPlay: 0,
  };
}

class Mean {
  sum = 0;
  n = 0;
  add(v: number): void { this.sum += v; this.n += 1; }
  get value(): number { return this.n ? this.sum / this.n : NaN; }
}

function corr(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]!; my += ys[i]!; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx, b = ys[i]! - my;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

function fnv(h: number, s: string): number {
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

export interface RunOptions {
  readonly seed: number;
  readonly mode: TacticsMode;
  readonly halfSeconds?: number;
  /** Scripted home input: 'chaser' (HomeBot, default) or 'sweep' (SweepBot, the tacticalMatch.test.ts user). */
  readonly input?: InputProfile;
}

/**
 * Identical scripted input for the home controlled outfielder in both modes (the sim has no home autopilot):
 * off the ball it runs at the ball; on the ball it carries toward goal, shoots inside 20 yd and otherwise
 * taps PASS after 0.6 s. Deterministic: decisions depend only on sim state.
 */
export type InputProfile = 'chaser' | 'sweep';

/**
 * The scripted user from tests/tacticalMatch.test.ts: stick sweeps every 50 ticks and a PASS (on the ball) or
 * TACKLE (off it; BLOCK before PR D) press every 2 s. Mostly passive, so the computer team's attack is measured with little pressure.
 */
export class SweepBot {
  private id = 0;
  private lastK = -1;
  constructor(private readonly sim: MatchSim) {}
  step(): void {
    const s = this.sim.state;
    const k = Math.floor(s.simTime * 60 + 1e-6);
    if (k === this.lastK) return;
    this.lastK = k;
    if (k % 50 === 0) this.sim.command({ type: 'padMove', x: Math.cos(k * 0.37), y: Math.sin(k * 0.37) * 0.6 });
    const action = this.sim.userHasBall() ? 'pass' : 'tackle';
    if (k % 120 === 0) this.sim.command({ type: 'padPress', id: ++this.id, action });
    if (k % 120 === 20) this.sim.command({ type: 'padRelease', id: ++this.id, action });
  }
}

export class HomeBot {
  private seq = 1;
  private pressAt: number | null = null;
  private action: 'pass' | 'shoot' = 'pass';
  constructor(private readonly sim: MatchSim) {}
  step(): void {
    const s = this.sim.state;
    if (s.phase !== 'live') { this.pressAt = null; return; }
    const me = s.players[s.controlledId];
    const goal = this.sim.attackingGoal('home');
    const towards = (x: number, y: number): void => {
      const dx = x - me.pos.x, dy = y - me.pos.y, d = Math.hypot(dx, dy);
      this.sim.command({ type: 'padMove', x: d > 0.5 ? dx / d : 0, y: d > 0.5 ? dy / d : 0 });
    };
    if (s.ball.owner !== me.id) {
      if (this.pressAt !== null) { this.sim.command({ type: 'padRelease', id: ++this.seq, action: this.action }); this.pressAt = null; }
      towards(s.ball.pos.x, s.ball.pos.y);
      return;
    }
    towards(goal.x, goal.y);
    if (this.pressAt !== null) {
      if (s.simTime - this.pressAt >= (this.action === 'shoot' ? 0.25 : 0.05)) {
        this.sim.command({ type: 'padRelease', id: ++this.seq, action: this.action });
        this.pressAt = null;
      }
      return;
    }
    if (s.simTime - s.ownedSince < 0.6) return;
    this.action = Math.hypot(goal.x - me.pos.x, goal.y - me.pos.y) < 20 ? 'shoot' : 'pass';
    this.seq += 1;
    if (this.sim.command({ type: 'padPress', id: this.seq, action: this.action })) this.pressAt = s.simTime;
  }
}

/** Hash of every player position, the ball and the score: lets a test prove measuring did not change the match. */
export function finalFingerprint(s: Readonly<MatchState>): string {
  let h = 2166136261;
  for (const id of [...HOME_IDS, ...AWAY_IDS]) h = fnv(h, `${s.players[id].pos.x.toFixed(4)},${s.players[id].pos.y.toFixed(4)}`);
  h = fnv(h, `${s.ball.pos.x.toFixed(4)},${s.ball.pos.y.toFixed(4)}|${s.score.home}-${s.score.away}|${s.simTime.toFixed(4)}`);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Plays one full timed match headless; the home controlled outfielder is driven by HomeBot in both modes. */
export function measureMatch(o: RunOptions): MatchMetrics {
  const sim = new MatchSim({ seed: o.seed, tactics: o.mode, halfSeconds: o.halfSeconds ?? MATCH_TUNING.match.halfSeconds });
  const L = sim.tuning.pitch.length;
  const W = sim.tuning.pitch.width;
  const goalY = sim.tuning.pitch.goalCenterY;
  const goalHalf = sim.tuning.pitch.goalHalfWidth;
  const adv = (t: TeamId, x: number): number => (t === 'home' ? x : L - x);
  const lineOf = (s: Readonly<MatchState>, id: MatchPlayerId): string => {
    const p = s.players[id];
    return FORMATIONS[s.formations[p.team]].roles[p.slot]!.line;
  };
  const m: Record<TeamId, TeamMetrics> = { home: blank(), away: blank() };
  const acc = {
    home: { shotD: new Mean(), shotA: new Mean(), width: new Mean(), depth: new Mean(), dm: new Mean(), ma: new Mean(), press: new Mean(), under: new Mean(), ttp: new Mean(), side: new Mean(), rec: new Mean(), poss: 0, bl: [] as number[], bx: [] as number[] },
    away: { shotD: new Mean(), shotA: new Mean(), width: new Mean(), depth: new Mean(), dm: new Mean(), ma: new Mean(), press: new Mean(), under: new Mean(), ttp: new Mean(), side: new Mean(), rec: new Mean(), poss: 0, bl: [] as number[], bx: [] as number[] },
  };
  const parked: Partial<Record<MatchPlayerId, number>> = {};
  let liveSamples = 0;
  let lastSeq = 0;
  let hash = 2166136261;
  let invariantViolations = 0;
  let stoppages = 0, failedRestarts = 0, stuckSpells = 0;
  let stoppedSince: number | null = null;
  let stuckAnchor = { x: 0, y: 0, t: 0, flagged: false };
  let prevLine: Record<TeamId, number> | null = null;
  let prevBall = 0;
  // Open spells after a team loses the ball: when it happened and whether pressure / recovery has arrived.
  const lost: Record<TeamId, { at: number; pressed: boolean; recovered: boolean } | null> = { home: null, away: null };
  let lastOwnerTeam: TeamId | null = null;
  const bot = o.input === 'sweep' ? new SweepBot(sim) : new HomeBot(sim);
  let steps = 0;
  const t0 = performance.now();

  for (let guard = 0; guard < 400_000; guard++) {
    const s = sim.state;
    if (s.phase === 'fulltime') break;
    if (s.phase === 'halftime') { sim.command({ type: 'startSecondHalf' }); continue; }
    bot.step();
    sim.step(F);
    steps += 1;
    const st = sim.state;

    for (const e of st.events) {
      if (e.seq <= lastSeq) continue;
      lastSeq = e.seq;
      hash = fnv(hash, `${e.type}|${e.by}|${e.at.toFixed(3)}|${e.detail}`);
      const t = teamOf(e.by);
      if (e.type === 'shot' && t) {
        m[t].shots += 1;
        const gx = t === 'home' ? L : 0;
        const dx = gx - st.ball.pos.x, dy = goalY - st.ball.pos.y;
        const d = Math.hypot(dx, dy);
        const a1 = Math.atan2(goalY - goalHalf - st.ball.pos.y, Math.abs(dx));
        const a2 = Math.atan2(goalY + goalHalf - st.ball.pos.y, Math.abs(dx));
        const ang = Math.abs(a2 - a1) * 180 / Math.PI;
        acc[t].shotD.add(d); acc[t].shotA.add(ang);
        if (d <= 18 && ang >= 20) m[t].bigChances += 1;
      } else if ((e.type === 'parried' || (e.type === 'saved' && !e.detail.includes('smothered'))) && t) {
        m[other(t)].shotsOnTarget += 1;
      } else if (e.type === 'pass' && t) m[t].passes += 1;
      else if (e.type === 'received' && t) m[t].passesReceived += 1;
      else if (e.type === 'intercepted' && t) m[t].interceptionsWon += 1;
      else if (e.type === 'tackle' && t) m[t].tacklesWon += 1;
      else if (e.type === 'offside' && t) m[t].offsideAgainst += 1;
      else if (e.type === 'foul' && t) m[t].foulsCommitted += 1;
      else if (e.type === 'out') {
        const lt = teamOf(e.by);
        if (lt) m[lt].outOfPlay += 1;
      }
    }

    if (checkInvariants(st, sim.tuning).length) invariantViolations += 1;

    if (st.phase === 'stopped') {
      if (stoppedSince === null) { stoppedSince = st.simTime; stoppages += 1; }
      else if (st.simTime - stoppedSince > RESTART_LIMIT && stoppedSince >= 0) { failedRestarts += 1; stoppedSince = -1e9; }
    } else if (st.phase === 'live') stoppedSince = null;

    if (st.phase !== 'live') continue;
    // Stuck play: ball stays inside a 2-yard circle.
    if (Math.hypot(st.ball.pos.x - stuckAnchor.x, st.ball.pos.y - stuckAnchor.y) > 2) stuckAnchor = { x: st.ball.pos.x, y: st.ball.pos.y, t: st.simTime, flagged: false };
    else if (!stuckAnchor.flagged && st.simTime - stuckAnchor.t > STUCK_SECONDS) { stuckSpells += 1; stuckAnchor.flagged = true; }

    const ownerTeam = teamOf(st.ball.owner);
    if (ownerTeam && lastOwnerTeam && ownerTeam !== lastOwnerTeam) lost[lastOwnerTeam] = { at: st.simTime, pressed: false, recovered: false };
    if (ownerTeam) {
      // A spell ends when the team that lost the ball wins it back; count spells where no pressure ever arrived.
      if (lost[ownerTeam] && !lost[ownerTeam]!.pressed) m[ownerTeam].pressureNeverArrived += 1;
      lost[ownerTeam] = null;
      lastOwnerTeam = ownerTeam;
    }

    for (const team of ['home', 'away'] as const) {
      const spell = lost[team];
      if (!spell || !ownerTeam) continue;
      const c = st.players[st.ball.owner!];
      let near = Infinity, side = 0;
      for (const id of IDS[team]) {
        const p = st.players[id];
        if (p.isKeeper) continue;
        near = Math.min(near, Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y));
        if (adv(team, p.pos.x) < adv(team, st.ball.pos.x)) side += 1;
      }
      if (!spell.pressed && near <= PRESSURE_YARDS) { spell.pressed = true; acc[team].ttp.add(st.simTime - spell.at); }
      if (!spell.recovered && side >= RECOVERED_GOAL_SIDE) { spell.recovered = true; acc[team].rec.add(st.simTime - spell.at); }
    }

    for (const team of ['home', 'away'] as const) {
      for (const id of IDS[team]) {
        if (lineOf(st, id) !== 'defence') continue;
        const p = st.players[id];
        if (Math.hypot(p.vel.x, p.vel.y) < PARKED_SPEED) {
          const was = parked[id] ?? 0;
          parked[id] = was + F;
          if (was + F > PARKED_SECONDS) m[team].parkedDefenderSeconds += was + F - PARKED_SECONDS > F ? F : was + F - PARKED_SECONDS;
        } else parked[id] = 0;
      }
    }

    if (steps % SAMPLE_EVERY !== 0) continue;
    liveSamples += 1;
    const lines: Record<TeamId, number> = { home: 0, away: 0 };
    for (const team of ['home', 'away'] as const) {
      const a = acc[team];
      const byLine: Record<string, Mean> = { defence: new Mean(), midfield: new Mean(), attack: new Mean() };
      let minY = W, maxY = 0, minX = L, maxX = 0;
      for (const id of IDS[team]) {
        const p = st.players[id];
        if (p.isKeeper) continue;
        const x = adv(team, p.pos.x);
        byLine[lineOf(st, id)]?.add(x);
        minY = Math.min(minY, p.pos.y); maxY = Math.max(maxY, p.pos.y);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      }
      lines[team] = byLine.defence!.value;
      if (st.possession === team) {
        a.poss += 1;
        a.width.add(maxY - minY); a.depth.add(maxX - minX);
        a.dm.add(byLine.midfield!.value - byLine.defence!.value);
        a.ma.add(byLine.attack!.value - byLine.midfield!.value);
      } else if (ownerTeam === other(team)) {
        const c = st.players[st.ball.owner!];
        let near = Infinity, side = 0;
        for (const id of IDS[team]) {
          const p = st.players[id];
          if (p.isKeeper) continue;
          near = Math.min(near, Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y));
          if (adv(team, p.pos.x) < adv(team, st.ball.pos.x)) side += 1;
        }
        a.press.add(near); a.under.add(near <= PRESSURE_YARDS ? 1 : 0); a.side.add(side);
      }
    }
    if (prevLine) {
      for (const team of ['home', 'away'] as const) {
        acc[team].bl.push(lines[team] - prevLine[team]);
        acc[team].bx.push(adv(team, st.ball.pos.x) - adv(team, prevBall));
      }
    }
    prevLine = lines; prevBall = st.ball.pos.x;
    if (Math.round(st.simTime * 60) % 60 === 0) {
      for (const id of [...HOME_IDS, ...AWAY_IDS]) { const p = st.players[id]; hash = fnv(hash, `${p.pos.x.toFixed(4)},${p.pos.y.toFixed(4)}`); }
    }
  }
  const ms = (performance.now() - t0) / Math.max(1, steps);
  const st = sim.state;
  if (st.phase !== 'fulltime') throw new Error(`seed ${o.seed} ${o.mode}: match did not reach full time`);
  for (const team of ['home', 'away'] as const) {
    const a = acc[team], t = m[team];
    t.goals = st.score[team];
    t.shotDistance = a.shotD.value; t.shotAngle = a.shotA.value;
    t.possessionShare = liveSamples ? a.poss / liveSamples : 0;
    t.width = a.width.value; t.depth = a.depth.value; t.defToMid = a.dm.value; t.midToAtt = a.ma.value;
    t.backLineFollowsBall = corr(a.bx, a.bl);
    t.pressDistance = a.press.value; t.underPressureShare = a.under.value; t.goalSide = a.side.value;
    t.timeToPressure = a.ttp.value; t.recoverySeconds = a.rec.value;
  }
  // Goals count as shots on target.
  m.home.shotsOnTarget += m.home.goals; m.away.shotsOnTarget += m.away.goals;
  const director = (sim as unknown as { tactics: { failure: string | null } }).tactics;
  return {
    seed: o.seed, mode: o.mode, input: o.input ?? 'chaser', score: `${st.score.home}-${st.score.away}`, home: m.home, away: m.away,
    stoppages, failedRestarts, stuckSpells, invariantViolations, tacticsFailure: director.failure, msPerTick: ms,
    traceHash: (hash >>> 0).toString(16).padStart(8, '0'),
    finalState: finalFingerprint(st),
  };
}
