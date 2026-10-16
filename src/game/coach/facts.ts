import type { Vec2 } from '../vec';
import { distance, distanceToSegment, length, sub, vec, type MutableVec2 } from '../math';
import { roleOf, toTeam, toWorld } from '../match/ai';
import type { MatchTuning } from '../match/tuning';
import { MATCH_PLAYER_IDS, TEAM_PLAYER_IDS, otherTeam, type MatchPlayer, type MatchPlayerId, type MatchState, type TeamId } from '../match/types';
import type { FormationId, Line, RoleId } from '../match/formations';
import { COACH_TUNING, type CoachTuning } from './tuning';

/**
 * Coach facts: a frozen, serialisable reading of the live match from the coached team's point of view
 * (team frame: own goal at x = 0, attacking toward x = length). Templates only ever see these facts,
 * so every claim a question makes is something the engine actually measured.
 */
export type Situation = 'carrier' | 'keeper' | 'opponent' | 'loose' | 'stopped';
export type Zone = 'defensive' | 'middle' | 'attacking';

export interface MateFact {
  readonly id: MatchPlayerId;
  readonly role: RoleId;
  readonly line: Line;
  /** Team frame. */
  readonly pos: Vec2;
  readonly world: Vec2;
  readonly distance: number;
  /** Yards gained toward the opponent goal if the ball reached him. */
  readonly progress: number;
  readonly laneClearance: number;
  readonly receiverPressure: number;
  /** Lane clear and receiver unmarked, within passing range. */
  readonly open: boolean;
  readonly relation: 'underneath' | 'square' | 'beyond';
  readonly wide: boolean;
  readonly farSide: boolean;
}

export interface CarrierFact {
  readonly id: MatchPlayerId;
  readonly role: RoleId;
  readonly line: Line;
  readonly pos: Vec2;
  readonly world: Vec2;
  readonly pressureDistance: number;
  readonly pressureId: MatchPlayerId | null;
  /** Seconds for the nearest opponent to arrive at pressing speed. */
  readonly pressureArrival: number;
  readonly pressersNear: number;
  readonly spaceAhead: number;
  readonly facingForward: boolean;
  readonly nearTouchline: boolean;
  readonly ownedSeconds: number;
  /** Opponent outfielders within `nearBall` of the carrier. */
  readonly oppNearCarrier: number;
}

export interface ShotFact {
  readonly distance: number;
  readonly angleDeg: number;
  readonly laneClearance: number;
  readonly inRange: boolean;
  readonly clear: boolean;
}

export interface DefendFact {
  readonly carrierId: MatchPlayerId | null;
  readonly ballT: Vec2;
  readonly nearestId: MatchPlayerId;
  readonly nearestDistance: number;
  readonly nearestArrival: number;
  readonly presserId: MatchPlayerId | null;
  readonly presserDistance: number;
  readonly coverId: MatchPlayerId | null;
  /** Distance from the cover player to the point goal-side behind the presser. */
  readonly coverGap: number;
  readonly coverSpotWorld: Vec2;
  readonly protectorsCentral: number;
  readonly caughtUpfield: readonly MatchPlayerId[];
  readonly oppNear: number;
  readonly ownNear: number;
  readonly unmarkedRunner: { readonly id: MatchPlayerId; readonly world: Vec2; readonly nearestOwnId: MatchPlayerId; readonly gap: number } | null;
  readonly goalDistance: number;
  /** Own outfielder on the far side who has drifted wide (team frame y distance from centre). */
  readonly weakSideWide: { readonly id: MatchPlayerId; readonly offset: number } | null;
}

export interface CoachFacts {
  readonly team: TeamId;
  readonly pitch: { readonly length: number; readonly width: number };
  readonly simTime: number;
  readonly scoreFor: number;
  readonly scoreAgainst: number;
  readonly scoreDiff: number;
  /** Seconds left in the coached session, when the host has a session clock. */
  readonly timeLeft: number | null;
  readonly formation: FormationId;
  readonly situation: Situation;
  readonly ballT: Vec2;
  readonly ballWorld: Vec2;
  readonly zone: Zone;
  readonly ballSide: 'left' | 'centre' | 'right';
  readonly carrier: CarrierFact | null;
  readonly mates: readonly MateFact[];
  readonly bestOpenMate: MateFact | null;
  readonly openSwitch: MateFact | null;
  readonly shot: ShotFact | null;
  readonly support: { readonly underneath: number; readonly beyond: number; readonly wide: number; readonly open: number };
  readonly defend: DefendFact | null;
  readonly stopped: { readonly reason: 'goal' | 'out' | 'foul'; readonly restartOurs: boolean } | null;
  readonly spaceBehindDefence: number;
}

/** Structural problems that make the state unusable for coaching (missing players, NaNs, unknown owner). */
export function stateProblems(s: Readonly<MatchState> | null | undefined): string[] {
  if (!s || typeof s !== 'object') return ['no state'];
  const out: string[] = [];
  if (!s.players || !s.ball) return ['missing players or ball'];
  for (const id of MATCH_PLAYER_IDS) {
    const p = s.players[id];
    if (!p) out.push(`missing ${id}`);
    else if (!Number.isFinite(p.pos?.x) || !Number.isFinite(p.pos?.y)) out.push(`${id} position not finite`);
  }
  if (!Number.isFinite(s.ball.pos?.x) || !Number.isFinite(s.ball.pos?.y)) out.push('ball position not finite');
  if (s.ball.owner && !s.players[s.ball.owner]) out.push('unknown ball owner');
  if (!Number.isFinite(s.simTime)) out.push('sim time not finite');
  return out;
}

function laneClearance(from: Vec2, to: Vec2, blockers: readonly Vec2[]): number {
  let best = Infinity;
  for (const o of blockers) best = Math.min(best, distanceToSegment(o, from, to));
  return best;
}

function nearest(p: Vec2, others: readonly { pos: Vec2; id: MatchPlayerId }[]): { id: MatchPlayerId | null; d: number } {
  let id: MatchPlayerId | null = null;
  let d = Infinity;
  for (const o of others) {
    const dd = distance(p, o.pos);
    if (dd < d) {
      d = dd;
      id = o.id;
    }
  }
  return { id, d };
}

/** Reads coach facts for `team`. Returns null when the state is unusable. */
export function extractFacts(
  s: Readonly<MatchState> | null | undefined,
  T: MatchTuning,
  team: TeamId = 'home',
  opts: { timeLeft?: number | null; C?: CoachTuning } = {},
): CoachFacts | null {
  if (stateProblems(s).length > 0 || !s) return null;
  const C = opts.C ?? COACH_TUNING;
  const L = T.pitch.length;
  const W = T.pitch.width;
  const opp = otherTeam(team);
  const tf = (p: Vec2): MutableVec2 => toTeam(team, p, T);
  const own = TEAM_PLAYER_IDS[team].map((id) => s.players[id]);
  const ownOut = own.filter((p) => !p.isKeeper);
  const oppAll = TEAM_PLAYER_IDS[opp].map((id) => s.players[id]);
  const oppOut = oppAll.filter((p) => !p.isKeeper);
  const oppT = oppAll.map((p) => ({ id: p.id, pos: tf(p.pos) }));
  const oppOutT = oppOut.map((p) => ({ id: p.id, pos: tf(p.pos) }));
  const ownerP: MatchPlayer | null = s.ball.owner ? s.players[s.ball.owner] : null;
  const ballT = ownerP ? tf(ownerP.pos) : tf(s.ball.pos);
  const ballWorld = vec(s.ball.pos.x, s.ball.pos.y);
  const situation: Situation =
    s.phase === 'stopped' ? 'stopped' : !ownerP ? 'loose' : ownerP.team !== team ? 'opponent' : ownerP.isKeeper ? 'keeper' : 'carrier';
  const zone: Zone = ballT.x < L / 3 ? 'defensive' : ballT.x > (2 * L) / 3 ? 'attacking' : 'middle';
  const ballSide = Math.abs(ballT.y - W / 2) < 6 ? 'centre' : ballT.y < W / 2 ? 'left' : 'right';
  const deepestOpp = oppOutT.reduce((m, o) => Math.max(m, o.pos.x), 0);
  const spaceBehindDefence = Math.max(0, L - 3 - deepestOpp);

  let carrier: CarrierFact | null = null;
  const mates: MateFact[] = [];
  let shot: ShotFact | null = null;
  if (situation === 'carrier' && ownerP) {
    const cT = tf(ownerP.pos);
    const near = nearest(cT, oppOutT);
    const coneCos = Math.cos((C.forwardConeDeg * Math.PI) / 180);
    let spaceAhead = L - cT.x;
    for (const o of oppT) {
      const rel = sub(o.pos, cT);
      const d = length(rel);
      if (d > 1e-6 && rel.x / d >= coneCos) spaceAhead = Math.min(spaceAhead, d);
    }
    const vT = team === 'home' ? ownerP.vel : vec(-ownerP.vel.x, -ownerP.vel.y);
    const dirT = team === 'home' ? s.dribbleDir : vec(-s.dribbleDir.x, -s.dribbleDir.y);
    const heading = length(vT) > 0.5 ? vT : dirT;
    carrier = {
      id: ownerP.id,
      role: roleOf(s as MatchState, ownerP).id,
      line: roleOf(s as MatchState, ownerP).line,
      pos: cT,
      world: vec(ownerP.pos.x, ownerP.pos.y),
      pressureDistance: near.d,
      pressureId: near.id,
      pressureArrival: near.d / T.movement.pressSpeed,
      pressersNear: oppOutT.filter((o) => distance(o.pos, cT) <= 6).length,
      spaceAhead,
      facingForward: heading.x > 0.2,
      nearTouchline: cT.y < C.touchlineBand || cT.y > W - C.touchlineBand,
      ownedSeconds: s.simTime - s.ownedSince,
      oppNearCarrier: oppOutT.filter((o) => distance(o.pos, cT) <= C.nearBall).length,
    };
    const blockers = oppT.map((o) => o.pos);
    for (const p of ownOut) {
      if (p.id === ownerP.id) continue;
      const pT = tf(p.pos);
      const d = distance(pT, cT);
      const lane = laneClearance(cT, pT, blockers);
      const rp = nearest(pT, oppOutT).d;
      const dx = pT.x - cT.x;
      mates.push({
        id: p.id,
        role: roleOf(s as MatchState, p).id,
        line: roleOf(s as MatchState, p).line,
        pos: pT,
        world: vec(p.pos.x, p.pos.y),
        distance: d,
        progress: dx,
        laneClearance: lane,
        receiverPressure: rp,
        open: lane >= C.laneOpen && rp >= C.receiverOpen && d <= C.maxPassDistance && d >= 4,
        relation: dx < -3 ? 'underneath' : dx > 3 ? 'beyond' : 'square',
        wide: pT.y < C.touchlineBand + 3 || pT.y > W - C.touchlineBand - 3,
        farSide: (pT.y - W / 2) * (cT.y - W / 2) < 0 && Math.abs(pT.y - cT.y) >= 15,
      });
    }
    const goal = vec(L, T.pitch.goalCenterY);
    const gd = distance(cT, goal);
    const a1 = Math.atan2(T.pitch.goalCenterY - T.pitch.goalHalfWidth - cT.y, L - cT.x);
    const a2 = Math.atan2(T.pitch.goalCenterY + T.pitch.goalHalfWidth - cT.y, L - cT.x);
    const shotLane = laneClearance(cT, goal, oppOutT.map((o) => o.pos));
    const angleDeg = (Math.abs(a2 - a1) * 180) / Math.PI;
    shot = { distance: gd, angleDeg, laneClearance: shotLane, inRange: gd <= C.shotRange, clear: shotLane >= C.laneOpen && angleDeg >= C.shotAngleMinDeg };
  }
  const openMates = mates.filter((m) => m.open);
  const bestOpenMate = openMates.slice().sort((a, b) => b.progress - a.progress)[0] ?? null;
  const openSwitch = openMates.filter((m) => m.farSide && m.distance >= C.switchMinDistance).sort((a, b) => b.distance - a.distance)[0] ?? null;

  let defend: DefendFact | null = null;
  if (situation === 'opponent' && ownerP) {
    const ownOutT = ownOut.map((p) => ({ id: p.id, pos: tf(p.pos) }));
    const near = nearest(ballT, ownOutT);
    const a = s.defense[team];
    const presser = a.presserId ? s.players[a.presserId] : null;
    const presserDistance = presser ? distance(tf(presser.pos), ballT) : Infinity;
    const goal = vec(0, W / 2);
    const toGoal = sub(goal, ballT);
    const tg = length(toGoal) > 1e-6 ? vec(toGoal.x / length(toGoal), toGoal.y / length(toGoal)) : vec(-1, 0);
    const coverSpot = vec(ballT.x + tg.x * 6, ballT.y + tg.y * 6);
    const cover = a.coverId ? s.players[a.coverId] : null;
    const coverGap = cover ? distance(tf(cover.pos), coverSpot) : Infinity;
    const protectorsCentral = ownOutT.filter((p) => p.pos.x < ballT.x && Math.abs(p.pos.y - W / 2) <= C.centralBand).length;
    const caughtUpfield = ownOutT.filter((p) => p.pos.x > ballT.x + C.caughtUpfield).map((p) => p.id);
    let unmarkedRunner: DefendFact['unmarkedRunner'] = null;
    for (const o of oppOutT) {
      if (o.id === ownerP.id || o.pos.x > L / 2) continue;
      const n = nearest(o.pos, ownOutT);
      if (n.id && n.d >= 5 && (!unmarkedRunner || o.pos.x < tf(unmarkedRunner.world).x)) {
        unmarkedRunner = { id: o.id, world: s.players[o.id].pos, nearestOwnId: n.id, gap: n.d };
      }
    }
    const sideSign = ballT.y < W / 2 ? -1 : 1;
    let weakSideWide: DefendFact['weakSideWide'] = null;
    if (Math.abs(ballT.y - W / 2) >= 8) {
      for (const p of ownOutT) {
        const off = (p.pos.y - W / 2) * -sideSign;
        if (off > 14 && p.pos.x < ballT.x + 10 && (!weakSideWide || off > weakSideWide.offset)) weakSideWide = { id: p.id, offset: off };
      }
    }
    defend = {
      carrierId: ownerP.id,
      ballT,
      nearestId: near.id ?? ownOut[0]!.id,
      nearestDistance: near.d,
      nearestArrival: near.d / T.movement.pressSpeed,
      presserId: a.presserId,
      presserDistance,
      coverId: a.coverId,
      coverGap,
      coverSpotWorld: toWorld(team, coverSpot, T),
      protectorsCentral,
      caughtUpfield,
      oppNear: oppOutT.filter((o) => distance(o.pos, ballT) <= C.nearBall).length,
      ownNear: ownOutT.filter((p) => distance(p.pos, ballT) <= C.nearBall).length,
      unmarkedRunner,
      goalDistance: distance(ballT, goal),
      weakSideWide,
    };
  }
  const st = s.stoppage;
  return {
    team,
    pitch: { length: L, width: W },
    simTime: s.simTime,
    scoreFor: s.score[team],
    scoreAgainst: s.score[opp],
    scoreDiff: s.score[team] - s.score[opp],
    timeLeft: opts.timeLeft ?? null,
    formation: s.formations[team],
    situation,
    ballT,
    ballWorld,
    zone,
    ballSide,
    carrier,
    mates,
    bestOpenMate,
    openSwitch,
    shot,
    support: {
      underneath: mates.filter((m) => m.relation === 'underneath' && m.open).length,
      beyond: mates.filter((m) => m.relation === 'beyond' && m.open).length,
      wide: mates.filter((m) => m.wide).length,
      open: openMates.length,
    },
    defend,
    stopped: s.phase === 'stopped' && st ? { reason: st.reason, restartOurs: st.restartTeam === team } : null,
    spaceBehindDefence,
  };
}

/** World position for a team-frame point (for highlights and intention targets). */
export function teamToWorld(team: TeamId, p: Vec2, T: MatchTuning): MutableVec2 {
  return toWorld(team, p, T);
}
