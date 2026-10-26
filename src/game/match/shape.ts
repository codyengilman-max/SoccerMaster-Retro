import type { MutableVec2 } from '../math';
import { clamp, lerp } from '../math';
import { FORMATIONS, type FormationId, type Line, type RoleDef } from './formations';
import type { MatchTuning } from './tuning';
import { TEAM_PLAYER_IDS, otherTeam, type MatchState, type ShapePhase, type TeamId, type TeamShape } from './types';

/**
 * Shared team shape: one controller per team that reads the ball, possession, pressure and threats and sets the
 * heights of the back line, midfield and front unit plus width and lateral shift. Every role's anchor is placed
 * relative to these units (formation coordinates are only the relative layout), so the back three move with the
 * team instead of sliding from fixed spots. Team frame: own goal at x = 0. Framework-free; nothing allocates per step.
 */

export function newTeamShape(): TeamShape {
  return {
    phase: 'midBlock',
    phaseSince: 0,
    possessionSince: 0,
    hadPossession: false,
    confidence: 0,
    pressure: 0,
    effectivePressure: false,
    carrierForward: false,
    lineDesired: 16,
    lineX: 16,
    lineActual: 16,
    midX: 28,
    frontX: 44,
    shiftY: 0,
    width: 1,
    threatX: 75,
    offsideX: 37.5,
    stepUntil: 0,
    recoverUntil: 0,
    lastTime: -1,
    reason: 'kickoff',
    why: {},
  };
}

const LINE_MEAN = new Map<string, number>();
/** Mean formation x of one line: a role's offset from it is its stagger within the unit. */
export function lineMean(formation: FormationId, line: Line): number {
  const key = `${formation}:${line}`;
  let m = LINE_MEAN.get(key);
  if (m === undefined) {
    const rs = FORMATIONS[formation].roles.filter((r) => r.line === line);
    m = rs.length ? rs.reduce((a, r) => a + r.base.x, 0) / rs.length : 0;
    LINE_MEAN.set(key, m);
  }
  return m;
}

const fx = (team: TeamId, x: number, L: number): number => (team === 'home' ? x : L - x);
const fy = (team: TeamId, y: number, W: number): number => (team === 'home' ? y : W - y);

/** Updates and returns `team`'s shape for this step. Called once per team per plan, before any anchor is read. */
export function updateShape(s: MatchState, team: TeamId, T: MatchTuning): TeamShape {
  const sh = s.shape[team];
  const S = T.teamShape;
  const L = T.pitch.length;
  const W = T.pitch.width;
  const snap = sh.lastTime < 0 || s.simTime < sh.lastTime || s.phase !== 'live';
  const dt = snap ? 0 : Math.min(s.simTime - sh.lastTime, 0.1);
  sh.lastTime = s.simTime;
  const ball = s.ball;
  const owner = ball.owner ? s.players[ball.owner] : null;
  const opp = otherTeam(team);
  const bx = fx(team, owner ? owner.pos.x : ball.pos.x, L);
  const by = fy(team, owner ? owner.pos.y : ball.pos.y, W);
  const bvx = team === 'home' ? ball.vel.x : -ball.vel.x;
  const inPoss = s.possession === team;
  if (inPoss !== sh.hadPossession) {
    sh.hadPossession = inPoss;
    sh.possessionSince = s.simTime;
    sh.confidence = 0;
  }
  const controlled = !!owner && owner.team === team;

  // Actual positions: our deepest back-line player, offside boundary, their most advanced outfielder.
  let lineActual = L;
  let first = L;
  let second = L;
  for (const id of TEAM_PLAYER_IDS[team]) {
    const p = s.players[id];
    const x = fx(team, p.pos.x, L);
    if (x < first) {
      second = first;
      first = x;
    } else if (x < second) second = x;
    if (!p.isKeeper && FORMATIONS[s.formations[team]].roles[p.slot]?.line === 'defence') lineActual = Math.min(lineActual, x);
  }
  sh.lineActual = lineActual;
  sh.offsideX = Math.min(second, bx, L / 2);
  let threatX = L;
  for (const id of TEAM_PLAYER_IDS[opp]) {
    const p = s.players[id];
    if (!p.isKeeper) threatX = Math.min(threatX, fx(team, p.pos.x, L));
  }
  sh.threatX = threatX;

  // Pressure on the carrier from the side without the ball: distance, approach side and closing speed.
  let pressD = Infinity;
  let closing = 0;
  let goalSide = false;
  if (owner) {
    const attacksX = owner.team === 'home' ? L : 0;
    for (const id of TEAM_PLAYER_IDS[otherTeam(owner.team)]) {
      const p = s.players[id];
      if (p.isKeeper) continue;
      const dx = owner.pos.x - p.pos.x;
      const dy = owner.pos.y - p.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < pressD) {
        pressD = d;
        const ux = d > 1e-6 ? dx / d : 0;
        const uy = d > 1e-6 ? dy / d : 0;
        closing = (p.vel.x - owner.vel.x) * ux + (p.vel.y - owner.vel.y) * uy;
        goalSide = Math.abs(p.pos.x - attacksX) < Math.abs(owner.pos.x - attacksX);
      }
    }
  }
  const effective = !!owner && (pressD < S.pressTight || (pressD < S.pressReach && closing > S.pressClosing && goalSide));
  sh.effectivePressure = effective;
  sh.pressure = !owner ? 0 : effective ? 1 : clamp((S.pressReach - pressD) / S.pressReach, 0, 1) * 0.5;

  let line: number;
  let phase: ShapePhase;
  let reason: string;
  const recent = s.simTime - sh.possessionSince < S.transitionSeconds;
  if (inPoss) {
    sh.carrierForward = false;
    if (controlled) sh.confidence = Math.min(1, sh.confidence + (dt / S.confidenceSeconds) * (effective ? 0.35 : 1));
    else sh.confidence = Math.max(0, Math.min(sh.confidence, S.looseConfidence) - dt * 0.5);
    const keeperBall = controlled && owner.isKeeper;
    line = keeperBall ? S.gkLine : clamp(bx - behindBallAt(bx, T), S.minLineIn, S.maxLineIn);
    reason = keeperBall ? 'keeper has it: back line splits for the outlet' : 'behind the ball, in support';
    const cap = Math.max(S.minLineIn, threatX + S.restAhead);
    if (line > cap) {
      line = cap;
      reason = 'held back: their forward stayed high';
    }
    if (!keeperBall && line > sh.lineX && sh.confidence < 1) {
      line = lerp(sh.lineX, line, sh.confidence);
      reason = controlled ? 'securing the ball before pushing up' : 'loose ball: not ours yet, line holds';
    }
    phase = keeperBall ? 'gkBuild' : recent && sh.confidence < 0.6 ? 'transitionWon' : bx < L / 3 ? 'build' : bx < (2 * L) / 3 ? 'advance' : 'attack';
  } else {
    sh.confidence = 0;
    const k = ball.kick;
    const theirPass = !owner && k?.team === opp && k.kind === 'pass';
    if (theirPass && bvx > S.backPassSpeed) sh.stepUntil = s.simTime + S.stepHoldSeconds;
    let forward = false;
    let backward = false;
    if (owner && owner.team === opp) {
      const vx = team === 'home' ? owner.vel.x : -owner.vel.x;
      forward = vx < -S.facingSpeed || (Math.abs(vx) <= S.facingSpeed && !effective);
      backward = vx > S.facingSpeed;
    }
    sh.carrierForward = forward && !effective;
    let runnerX = Infinity;
    for (const id of TEAM_PLAYER_IDS[opp]) {
      const p = s.players[id];
      if (p.isKeeper || p.id === ball.owner) continue;
      // A runner is onside in behind, or running at the line. A forward standing in an offside position is left to
      // offside: dropping to him would play him onside.
      const x = fx(team, p.pos.x, L);
      const vx = team === 'home' ? p.vel.x : -p.vel.x;
      const onside = x >= sh.offsideX - S.levelTolerance;
      if ((onside && x < lineActual - 0.5) || (x < lineActual + S.runnerNear && vx < -S.runSpeed)) runnerX = Math.min(runnerX, x);
    }
    const spaceBehind = lineActual - S.keeperSweep > S.spaceBehind;
    const danger = !!owner && sh.carrierForward && spaceBehind && runnerX < Infinity;
    const presser = s.defense[team].presserId ? s.players[s.defense[team].presserId!] : null;
    if (owner && presser && owner.team === opp) {
      const pd = Math.hypot(presser.pos.x - owner.pos.x, presser.pos.y - owner.pos.y);
      if (pd > 2 && pd < S.pressReach + 1 && fx(team, owner.pos.x, L) < fx(team, presser.pos.x, L) - 1) sh.recoverUntil = s.simTime + S.recoverHoldSeconds;
    }
    const throughX = theirPass && k?.target ? fx(team, k.target.x, L) : Infinity;
    let gap = S.blockGap;
    reason = 'organised block';
    if (throughX < lineActual) {
      gap = S.dangerGap;
      reason = 'through ball: recover toward the runner';
    } else if (danger) {
      gap = S.dangerGap;
      reason = 'their carrier faces forward with time: protect depth';
    } else if (s.simTime < sh.recoverUntil) {
      gap = S.dangerGap;
      reason = 'press beaten: recover centrally';
    } else if (effective || backward || s.simTime < sh.stepUntil) {
      gap = S.stepGap;
      reason = effective ? 'ball under pressure: step up together' : 'ball went backward: step up together';
    }
    line = clamp(bx - gap, S.minLineOut, S.maxLineOut);
    if (throughX < line) line = Math.max(S.minLineOut, throughX - 2);
    if (danger && runnerX - 1 < line) line = Math.max(S.minLineOut, runnerX - 1);
    line = Math.max(S.minLineOut, Math.min(line, bx - S.minBehindBall));
    if (recent && !effective && line > sh.lineX) {
      line = sh.lineX;
      reason = 'just lost it: hold the line until the next pass is read';
    }
    phase = recent ? 'transitionLost' : gap === S.dangerGap && reason !== 'organised block' && !danger ? 'recover' : bx > (2 * L) / 3 ? 'press' : bx < L / 3 ? 'lowBlock' : 'midBlock';
  }
  sh.lineDesired = line;
  if (snap) sh.lineX = line;
  else {
    const rate = line > sh.lineX ? S.lineUpSpeed : S.lineDropSpeed;
    sh.lineX += clamp(line - sh.lineX, -rate * dt, rate * dt);
  }
  const lx = sh.lineX;
  if (phase === 'gkBuild') {
    sh.midX = lx + S.unitGapMax;
    sh.frontX = lx + S.unitGapMax * 2;
  } else if (inPoss) {
    sh.midX = clamp(lerp(lx, bx, 0.5), lx + S.unitGapMin, lx + S.unitGapMaxIn);
    sh.frontX = clamp(Math.max(sh.midX + S.unitGapMin + 3, bx + 8), sh.midX + S.unitGapMin, Math.min(lx + S.maxSpanIn, T.shape.maxAttackX));
  } else {
    sh.midX = clamp(bx - 3, lx + S.unitGapMin, lx + S.unitGapMax);
    sh.frontX = clamp(bx + 1, sh.midX + S.unitGapMin, Math.min(lx + S.maxSpan, T.shape.maxAttackX));
  }
  sh.width = inPoss ? (phase === 'gkBuild' ? S.widthGk : lerp(S.widthOut, S.widthIn, Math.max(0.35, sh.confidence))) : S.widthOut;
  sh.shiftY = (by - W / 2) * (inPoss ? S.shiftIn : S.shiftOut);
  if (phase !== sh.phase) {
    sh.phase = phase;
    sh.phaseSince = s.simTime;
  }
  sh.reason = reason;
  return sh;
}

/** In possession, how far the back line sits behind a ball at team-frame x (closer as the attack goes deeper). */
export function behindBallAt(bx: number, T: MatchTuning): number {
  const S = T.teamShape;
  return lerp(S.behindBall, S.behindBallHigh, clamp((bx - S.rampFromX) / (S.rampToX - S.rampFromX), 0, 1));
}

/** A role's place in the shared shape: its unit's height plus its formation stagger, width scaled and shifted. */
export function shapeAnchor(out: MutableVec2, s: MatchState, team: TeamId, role: RoleDef, T: MatchTuning): MutableVec2 {
  const sh = s.shape[team];
  const W = T.pitch.width;
  const unit = role.line === 'defence' ? sh.lineX : role.line === 'midfield' ? sh.midX : role.line === 'attack' ? sh.frontX : 3;
  const stagger = role.base.x - lineMean(s.formations[team], role.line);
  const x = unit + stagger * (sh.phase === 'gkBuild' ? 2 : 1);
  const y = W / 2 + (role.base.y - W / 2) * sh.width + sh.shiftY;
  out.x = clamp(x, 2, T.shape.maxAttackX);
  out.y = clamp(y, Math.max(role.bounds.minY, 1.5), Math.min(role.bounds.maxY, W - 1.5));
  return out;
}
