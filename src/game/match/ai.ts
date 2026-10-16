import type { Vec2 } from '../vec';
import { add, clamp, distance, distanceToSegment, lerp, lerpVec, normalize, scale, sub, vec, type MutableVec2 } from '../math';
import { roleDef, type RoleDef } from './formations';
import type { MatchTuning } from './tuning';
import {
  TEAM_PLAYER_IDS,
  otherTeam,
  type Intent,
  type MatchPlayer,
  type MatchPlayerId,
  type MatchState,
  type TeamId,
} from './types';

/**
 * Team AI. Reads only visible state (positions, velocities, the ball and completed kicks — never
 * the user's unreleased aim) and writes each non-carrier player's intent, anchor, target and speed.
 * Everything works in a team frame: own goal at x = 0, attacking toward x = length.
 */
export interface AiContext {
  readonly s: MatchState;
  readonly T: MatchTuning;
  readonly rng: () => number;
}

export function toTeam(team: TeamId, p: Vec2, T: MatchTuning): MutableVec2 {
  return team === 'home' ? vec(p.x, p.y) : vec(T.pitch.length - p.x, T.pitch.width - p.y);
}
/** The mirror is its own inverse. */
export const toWorld = toTeam;
export function velToTeam(team: TeamId, v: Vec2): MutableVec2 {
  return team === 'home' ? vec(v.x, v.y) : vec(-v.x, -v.y);
}

/** Outfield players per team, cached per state object (player objects are mutated in place, never replaced). */
const outfieldCache = new WeakMap<MatchState['players'], Record<TeamId, MatchPlayer[]>>();
const outfield = (s: MatchState, team: TeamId): readonly MatchPlayer[] => {
  let c = outfieldCache.get(s.players);
  if (!c) {
    const pick = (t: TeamId) => TEAM_PLAYER_IDS[t].map((id) => s.players[id]).filter((p) => !p.isKeeper);
    c = { home: pick('home'), away: pick('away') };
    outfieldCache.set(s.players, c);
  }
  return c[team];
};

export function roleOf(s: MatchState, p: MatchPlayer): RoleDef {
  return roleDef(s.formations[p.team], p.slot);
}

/** Point the ball is about to be at (owner's feet, or a short look-ahead on a loose ball). */
export function ballFocus(s: MatchState): MutableVec2 {
  const b = s.ball;
  if (b.owner) return vec(s.players[b.owner].pos.x, s.players[b.owner].pos.y);
  return add(b.pos, scale(b.vel, 0.35));
}

export function computeAnchor(role: RoleDef, ballT: Vec2, inPossession: boolean, T: MatchTuning): MutableVec2 {
  const S = T.shape;
  const sy = inPossession && role.inPossession === 'width' ? S.widthShiftY : S.shiftY;
  let x = role.base.x + (ballT.x - T.pitch.length / 2) * S.shiftX + (inPossession ? S.pushUp : -S.dropOff);
  const y = role.base.y + (ballT.y - T.pitch.width / 2) * sy;
  if (role.line === 'attack') x = Math.min(x, S.maxAttackX);
  const B = role.bounds;
  return vec(clamp(x, B.minX, B.maxX), clamp(y, B.minY, B.maxY));
}

/** Closest blocker to the lane. A presser right on the ball (within 2 yd) and level with or behind the kick is beside it, not in its lane. */
function laneClearance(from: Vec2, to: Vec2, blockers: readonly Vec2[]): number {
  const len = distance(from, to);
  const dx = len > 1e-6 ? (to.x - from.x) * (1 / len) : 1;
  const dy = len > 1e-6 ? (to.y - from.y) * (1 / len) : 0;
  let best = Infinity;
  for (const o of blockers) {
    const rx = o.x - from.x;
    const ry = o.y - from.y;
    if (Math.sqrt(rx * rx + ry * ry) <= 2 && rx * dx + ry * dy < 0.5) continue;
    best = Math.min(best, distanceToSegment(o, from, to));
  }
  return best;
}

function nearestDistance(p: Vec2, others: readonly Vec2[]): number {
  let best = Infinity;
  for (const o of others) best = Math.min(best, distance(p, o));
  return best;
}

function set(p: MatchPlayer, intent: Intent, target: Vec2, speed: number, T: MatchTuning, team: TeamId): void {
  p.intent = intent;
  // Written in place: p.target is the player's own object and is never shared.
  const wx = team === 'home' ? target.x : T.pitch.length - target.x;
  const wy = team === 'home' ? target.y : T.pitch.width - target.y;
  p.target.x = clamp(wx, 0.5, T.pitch.length - 0.5);
  p.target.y = clamp(wy, 0.5, T.pitch.width - 0.5);
  p.speed = speed;
}

/** Plans both teams. The sim calls this every fixed step before moving players. */
export function planTeams(ctx: AiContext): void {
  for (const team of ['home', 'away'] as const) planTeam(ctx, team);
}

function planTeam(ctx: AiContext, team: TeamId): void {
  const { s, T } = ctx;
  const M = T.movement;
  const ball = s.ball;
  const focusT = toTeam(team, ballFocus(s), T);
  const inPossession = s.possession === team;
  const opp = otherTeam(team);
  const oppPos = TEAM_PLAYER_IDS[opp].map((id) => toTeam(team, s.players[id].pos, T));
  const oppOutfield = outfield(s, opp).map((p) => toTeam(team, p.pos, T));
  const ownKick = !ball.owner && ball.kick?.team === team ? ball.kick : null;
  const receiverId = ownKick?.kind === 'pass' ? ownKick.receiver : null;

  for (const p of outfield(s, team)) {
    p.anchor = toWorld(team, computeAnchor(roleOf(s, p), focusT, inPossession, T), T);
  }

  // Loose ball: each team sends the player who can reach it first (committed for a short spell).
  updateChaser(ctx, team, receiverId);

  if (inPossession) planAttack(ctx, team, focusT, oppPos, oppOutfield, receiverId);
  else planDefence(ctx, team, focusT, oppOutfield);

  const chaser = s.chaser[team].id;
  if (!ball.owner && chaser && chaser !== receiverId) {
    const p = s.players[chaser];
    set(p, 'chase', toTeam(team, chasePoint(s, T), T), M.chaseSpeed, T, team);
  }
  applyCoachIntent(ctx, team, receiverId);
  if (receiverId) {
    const p = s.players[receiverId];
    const target = ownKick?.target ?? ball.pos;
    const meet = distance(p.pos, target) < T.receive.meetDistance || distance(p.pos, ball.pos) < 4;
    set(p, 'receive', toTeam(team, meet ? ball.pos : target, T), meet ? M.supportSpeed : M.runSpeed, T, team);
  }
}

/** A Coach Moment intention steers one player with normal speed caps; the ball owner and the pass receiver are never overridden. */
function applyCoachIntent(ctx: AiContext, team: TeamId, receiverId: MatchPlayerId | null): void {
  const { s, T } = ctx;
  const ci = s.coachIntent;
  if (!ci || s.players[ci.playerId].team !== team || ci.playerId === s.ball.owner || ci.playerId === receiverId) return;
  const M = T.movement;
  const speed = { support: M.supportSpeed, run: M.runSpeed, width: M.supportSpeed, press: M.pressSpeed, cover: M.coverSpeed, protect: M.shapeSpeed }[ci.kind];
  const intent: Intent = ci.kind === 'width' ? 'width' : ci.kind === 'protect' ? 'protect' : ci.kind;
  set(s.players[ci.playerId], intent, toTeam(team, ci.target, T), speed, T, team);
}

export function chasePoint(s: MatchState, T: MatchTuning): MutableVec2 {
  const b = s.ball;
  const speed = Math.hypot(b.vel.x, b.vel.y);
  const stopDist = (speed * speed) / (2 * T.ball.friction);
  const ahead = Math.min(stopDist, 6);
  return speed > 0.05 ? add(b.pos, scale(normalize(b.vel), ahead)) : vec(b.pos.x, b.pos.y);
}

function updateChaser(ctx: AiContext, team: TeamId, receiverId: MatchPlayerId | null): void {
  const { s, T } = ctx;
  const c = s.chaser[team];
  if (s.ball.owner || s.phase === 'stopped') {
    c.id = null;
    return;
  }
  // The intended receiver handles our own pass; nobody else chases it.
  if (receiverId) {
    c.id = null;
    return;
  }
  const point = chasePoint(s, T);
  const time = (p: MatchPlayer): number => distance(p.pos, point) / T.movement.chaseSpeed;
  let best: MatchPlayer | null = null;
  for (const p of outfield(s, team)) if (!best || time(p) < time(best)) best = p;
  if (!best) return;
  const current = c.id ? s.players[c.id] : null;
  if (current && s.simTime < c.until && time(best) > time(current) - T.defense.switchMarginSeconds) return;
  if (!current || current.id !== best.id) c.until = s.simTime + T.defense.commitSeconds;
  c.id = best.id;
}

// ---- in possession ----------------------------------------------------------------------------

function planAttack(
  ctx: AiContext,
  team: TeamId,
  B: Vec2,
  oppPos: readonly Vec2[],
  oppOutfield: readonly Vec2[],
  receiverId: MatchPlayerId | null,
): void {
  const { s, T } = ctx;
  const M = T.movement;
  const L = T.pitch.length;
  const W = T.pitch.width;
  const ownerId = s.ball.owner;
  const carrierT = ownerId ? toTeam(team, s.players[ownerId].pos, T) : B;
  const deepestOpp = oppOutfield.reduce((m, o) => Math.max(m, o.x), 0);
  const run = s.runs[team];
  if (run.runnerId && (s.simTime >= run.until || run.runnerId === ownerId)) {
    run.runnerId = null;
    run.cooldownUntil = s.simTime + T.run.cooldownSeconds;
  }
  const taken: Vec2[] = [carrierT];
  const ballSide = B.y < W / 2 ? -1 : 1;

  for (const p of outfield(s, team)) {
    if (p.id === ownerId || p.id === receiverId) continue;
    const role = roleOf(s, p);
    const pT = toTeam(team, p.pos, T);
    const anchor = toTeam(team, p.anchor, T);
    const own = role.base.y < W / 2 ? -1 : 1;

    if (run.runnerId === p.id) {
      set(p, 'run', toTeam(team, p.target, T), M.runSpeed, T, team);
      taken.push(toTeam(team, p.target, T));
      continue;
    }
    if (p.intent === 'giveAndGo' && s.simTime < p.intentUntil) {
      p.speed = M.runSpeed;
      taken.push(toTeam(team, p.target, T));
      continue;
    }

    let intent: Intent = 'support';
    let target: MutableVec2 = anchor;
    let speed = M.shapeSpeed;
    switch (role.inPossession) {
      case 'distribute':
        continue;
      case 'balance': {
        intent = 'balance';
        const x = Math.min(anchor.x, B.x - T.balance.behindBall);
        target = vec(Math.max(4, x), anchor.y);
        break;
      }
      case 'width': {
        const sameSide = own === ballSide || Math.abs(B.y - W / 2) < 6;
        const touchY = own < 0 ? 3.5 : W - 3.5;
        if (role.line === 'defence') {
          // Full-backs give width but stay behind the ball as part of the rest defence.
          intent = sameSide ? 'width' : 'balance';
          target = vec(Math.min(anchor.x, B.x - (sameSide ? 3 : T.balance.behindBall)), sameSide ? touchY + -own * 2 : anchor.y);
        } else if (!sameSide) {
          intent = 'weakSide';
          const finishing = B.x > T.weakSide.finalThirdX && role.line === 'attack';
          target = finishing
            ? vec(Math.min(B.x + 6, T.shape.maxAttackX), W / 2 + own * T.weakSide.narrowY)
            : vec(clamp(B.x - 1, anchor.x - 8, anchor.x + 8), touchY);
        } else if (Math.abs(carrierT.y - touchY) < T.support.crowdDistance) {
          // Carrier is on our touchline: come inside rather than crowd him.
          intent = 'support';
          target = supportSpot(carrierT, pT, -own, taken, oppPos, T);
        } else {
          intent = 'width';
          target = vec(clamp(B.x + 5, anchor.x - 6, T.shape.maxAttackX), touchY);
        }
        break;
      }
      case 'support':
        intent = 'support';
        target = supportSpot(carrierT, pT, own, taken, oppPos, T);
        speed = M.supportSpeed;
        break;
      case 'depth': {
        intent = 'depth';
        const roomForCarrier = nearestDistance(carrierT, oppOutfield) >= T.run.carrierRoom;
        const spaceBehind = L - 3 - deepestOpp >= T.run.spaceBehind;
        if (ownerId && !run.runnerId && s.simTime >= run.cooldownUntil && roomForCarrier && spaceBehind && pT.x < deepestOpp + 2) {
          run.runnerId = p.id;
          run.until = s.simTime + T.run.seconds;
          const t = vec(Math.min(deepestOpp + T.run.beyondLine, T.shape.maxAttackX), clamp(pT.y, 8, W - 8));
          set(p, 'run', t, M.runSpeed, T, team);
          taken.push(t);
          continue;
        }
        target = vec(Math.min(anchor.x, deepestOpp - 0.5), anchor.y);
        break;
      }
    }
    const spaced = spread(target, taken, T.shape.minSpacing);
    const B2 = role.bounds;
    const clamped = intent === 'weakSide' || intent === 'width' ? spaced : vec(clamp(spaced.x, B2.minX, B2.maxX), clamp(spaced.y, B2.minY, B2.maxY));
    taken.push(clamped);
    set(p, intent, clamped, speed, T, team);
  }
}

/** Short option beside/behind/ahead of the carrier on `side`, moving off any blocked lane. */
function supportSpot(carrier: Vec2, self: Vec2, side: number, taken: readonly Vec2[], blockers: readonly Vec2[], T: MatchTuning): MutableVec2 {
  const S = T.support;
  const W = T.pitch.width;
  let best: { p: MutableVec2; score: number } | null = null;
  for (const dx of [S.depth * 1.5, 0, -S.depth]) {
    for (const lat of [S.lateral, S.lateral - 3, S.lateral + 3]) {
      for (const sgn of [side, -side]) {
        const p = vec(clamp(carrier.x + dx, 4, T.shape.maxAttackX), clamp(carrier.y + sgn * lat, T.pitch.laneMargin, W - T.pitch.laneMargin));
        const clear = Math.min(laneClearance(carrier, p, blockers), 5);
        const crowd = taken.reduce((m, t) => Math.min(m, distance(t, p)), Infinity);
        const score =
          clear * 1.0 + (clear >= S.laneClearance ? 2 : 0) + Math.min(crowd, T.shape.minSpacing) * 0.4 + dx * 0.08 - distance(self, p) * 0.05 - (sgn === side ? 0 : 1.2);
        if (!best || score > best.score) best = { p, score };
      }
    }
  }
  return best ? best.p : vec(carrier.x, carrier.y + side * S.lateral);
}

function spread(target: Vec2, taken: readonly Vec2[], minSpacing: number): MutableVec2 {
  const out = vec(target.x, target.y);
  for (const t of taken) {
    const d = distance(out, t);
    if (d >= minSpacing) continue;
    const away = d > 1e-3 ? normalize(sub(out, t)) : vec(0, out.y < 25 ? -1 : 1);
    out.x += away.x * (minSpacing - d);
    out.y += away.y * (minSpacing - d);
  }
  return out;
}

// ---- out of possession ------------------------------------------------------------------------

function planDefence(ctx: AiContext, team: TeamId, B: Vec2, oppOutfield: readonly Vec2[]): void {
  const { s, T } = ctx;
  const M = T.movement;
  const D = T.defense;
  const goal = vec(0, T.pitch.width / 2);
  const toGoal = normalize(sub(goal, B));
  const read = toTeam(team, s.pressRead, T);
  const pressSpot = add(read, scale(normalize(sub(goal, read)), D.goalSideOffset));
  const players = outfield(s, team);

  const pressTime = (p: MatchPlayer): number => {
    const role = roleOf(s, p);
    const pT = toTeam(team, p.pos, T);
    let t = distance(pT, pressSpot) / M.pressSpeed;
    if (role.line === 'defence' && B.x > 40) t += D.defenderHighPenalty;
    if (role.line === 'attack' && B.x < 25) t += D.forwardDeepPenalty;
    if (pT.x > B.x + 2) t += 0.3; // chasing from behind arrives late
    return t;
  };
  const a = s.defense[team];
  a.presserId = pickCommitted(s, players, a.presserId, pressTime, a.until, D);
  // Cover: second player between the ball and goal, toward the most dangerous nearby opponent.
  const danger = oppOutfield
    .filter((o) => distance(o, B) > 2 && distance(o, B) < 18)
    .sort((m, n) => m.x - n.x)[0];
  const coverBase = add(B, scale(toGoal, D.coverDepth));
  const coverSpot = danger ? lerpVec(coverBase, danger, D.coverFraction) : coverBase;
  const coverTime = (p: MatchPlayer): number => distance(toTeam(team, p.pos, T), coverSpot) / M.coverSpeed;
  const prevCover = a.coverId;
  a.coverId = pickCommitted(s, players.filter((p) => p.id !== a.presserId), a.coverId, coverTime, a.until, D);
  if (s.simTime >= a.until || prevCover !== a.coverId) a.until = s.simTime + D.commitSeconds;

  const marked = new Set<number>();
  for (const p of players) {
    const role = roleOf(s, p);
    const pT = toTeam(team, p.pos, T);
    const anchor = toTeam(team, p.anchor, T);
    if (p.id === a.presserId) {
      set(p, 'press', s.ball.owner ? pressSpot : B, M.pressSpeed, T, team);
      continue;
    }
    if (p.id === a.coverId) {
      set(p, 'cover', coverSpot, M.coverSpeed, T, team);
      continue;
    }
    if (pT.x > B.x + D.recoverBeyond && role.line !== 'attack') {
      set(p, 'recover', vec(Math.min(anchor.x, B.x - 2), anchor.y), M.recoverSpeed, T, team);
      continue;
    }
    const markIndex = (): number => {
      let best = -1;
      let bestD = D.trackRadius;
      oppOutfield.forEach((o, i) => {
        if (marked.has(i)) return;
        const d = distance(o, anchor);
        if (d < bestD && o.x < anchor.x + 4) {
          best = i;
          bestD = d;
        }
      });
      return best;
    };
    switch (role.outOfPossession) {
      case 'holdLine':
      case 'trackRunner': {
        const i = markIndex();
        const o = oppOutfield[i];
        if (o) {
          marked.add(i);
          const gs = add(o, scale(normalize(sub(goal, o)), 1.5));
          set(p, 'track', gs, M.trackSpeed, T, team);
        } else set(p, 'hold', anchor, M.shapeSpeed, T, team);
        break;
      }
      case 'protectCentre': {
        const screen = lerpVec(B, goal, D.protectFraction);
        set(p, 'protect', lerpVec(anchor, screen, 0.5), M.shapeSpeed, T, team);
        break;
      }
      case 'pressHigh':
      case 'goal':
        set(p, 'hold', vec(anchor.x, lerp(anchor.y, B.y, 0.25)), M.shapeSpeed, T, team);
        break;
    }
  }
}

function pickCommitted(
  s: MatchState,
  candidates: readonly MatchPlayer[],
  current: MatchPlayerId | null,
  time: (p: MatchPlayer) => number,
  until: number,
  D: MatchTuning['defense'],
): MatchPlayerId | null {
  let best: MatchPlayer | null = null;
  for (const p of candidates) if (!best || time(p) < time(best)) best = p;
  if (!best) return null;
  const cur = current ? candidates.find((p) => p.id === current) : undefined;
  if (cur && s.simTime < until && time(best) > time(cur) - D.switchMarginSeconds) return cur.id;
  if (cur && time(best) > time(cur) - D.switchMarginSeconds * 0.5) return cur.id;
  return best.id;
}

// ---- AI carrier decisions ---------------------------------------------------------------------

export type CarrierDecision =
  | { readonly type: 'carry'; readonly target: MutableVec2 }
  | { readonly type: 'pass'; readonly target: MutableVec2; readonly receiver: MatchPlayerId; readonly why: string }
  | { readonly type: 'shoot'; readonly target: MutableVec2; readonly power: number };

/** Bounded decision for an AI-controlled carrier (opponent outfielder or either keeper). */
export function decideCarrier(ctx: AiContext, carrier: MatchPlayer): CarrierDecision {
  const { s, T, rng } = ctx;
  const A = T.ai;
  const team = carrier.team;
  const W = T.pitch.width;
  const L = T.pitch.length;
  const C = toTeam(team, carrier.pos, T);
  const opp = otherTeam(team);
  const oppIds = TEAM_PLAYER_IDS[opp];
  const oppPos = oppIds.map((id) => toTeam(team, s.players[id].pos, T));
  const oppOut = oppIds.filter((id) => !s.players[id].isKeeper).map((id) => toTeam(team, s.players[id].pos, T));
  const pressure = nearestDistance(C, oppOut);
  const pressured = pressure < A.pressureRadius;

  if (!carrier.isKeeper) {
    const goal = vec(L, W / 2);
    const keeper = oppIds.map((id) => s.players[id]).find((p) => p.isKeeper);
    const keeperY = keeper ? toTeam(team, keeper.pos, T).y : W / 2;
    const post = W / 2 + (keeperY <= W / 2 ? 1 : -1) * (T.pitch.goalHalfWidth - 1.2);
    const shotTarget = vec(L, post);
    if (distance(C, goal) <= A.shootRange && C.x > L - 24 && laneClearance(C, shotTarget, oppOut) >= A.shotLaneClearance) {
      return { type: 'shoot', target: toWorld(team, shotTarget, T), power: 0.8 + rng() * 0.2 };
    }
  }

  let best: { target: MutableVec2; id: MatchPlayerId; score: number; why: string } | null = null;
  for (const id of TEAM_PLAYER_IDS[team]) {
    const p = s.players[id];
    if (id === carrier.id || p.isKeeper) continue;
    const pT = toTeam(team, p.pos, T);
    const vT = velToTeam(team, p.vel);
    const lead = vec(clamp(pT.x + vT.x * A.leadSeconds, 1, L - 2), clamp(pT.y + vT.y * A.leadSeconds, 1, W - 1));
    const d = distance(C, lead);
    if (d < A.passMin || d > (carrier.isKeeper ? T.pass.maxDistance : A.passMax)) continue;
    const clear = laneClearance(C, lead, oppPos);
    if (clear < A.passLaneClearance) continue;
    const space = Math.min(nearestDistance(lead, oppOut), 10);
    const forward = lead.x - C.x;
    const isSwitch = Math.abs(lead.y - C.y) > 18 && space > 6;
    const score = forward * 0.12 + space * 0.3 + Math.min(clear, 5) * 0.2 + (isSwitch ? A.switchBonus : 0) - (d > 20 ? 0.5 : 0);
    if (!best || score > best.score) {
      best = { target: lead, id, score, why: isSwitch ? 'switch' : forward < -2 ? 'recycle' : forward > 4 ? 'forward' : 'support' };
    }
  }

  if (carrier.isKeeper) {
    if (best) return { type: 'pass', target: toWorld(team, best.target, T), receiver: best.id, why: 'distribution' };
    // Nothing open: kick it long toward the furthest-forward teammate.
    const far = TEAM_PLAYER_IDS[team].map((id) => s.players[id]).filter((p) => !p.isKeeper)
      .sort((m, n) => toTeam(team, n.pos, T).x - toTeam(team, m.pos, T).x)[0];
    const t = far ? toTeam(team, far.pos, T) : vec(C.x + 25, W / 2);
    const dir = normalize(sub(t, C));
    return { type: 'pass', target: toWorld(team, add(C, scale(dir, T.pass.maxDistance)), T), receiver: far?.id ?? carrier.id, why: 'long' };
  }

  const room = Math.min(nearestDistance(vec(C.x + 4, C.y), oppOut), 8);
  const carryScore = pressured ? -1 : 1.2 + room * 0.25;
  if (best && (pressured || best.score > carryScore + A.passThreshold)) {
    return { type: 'pass', target: toWorld(team, best.target, T), receiver: best.id, why: best.why };
  }
  const near = oppOut.reduce<Vec2 | null>((m, o) => (!m || distance(o, C) < distance(m, C) ? o : m), null);
  const away = near && distance(near, C) < 7 ? (near.y > C.y ? -1 : 1) : 0;
  const t = vec(clamp(C.x + A.carryAhead, 2, L - 4), clamp(C.y + away * 4, T.pitch.laneMargin, W - T.pitch.laneMargin));
  return { type: 'carry', target: toWorld(team, t, T) };
}
