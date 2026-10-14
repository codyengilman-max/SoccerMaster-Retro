import type { Vec2 } from '../vec';
import type { MatchTuning } from './tuning';
import { TEAM_PLAYER_IDS, type MatchPlayerId, type MatchState } from './types';

/**
 * Shared ground-ball prediction. The aim guide draws exactly what userKick() executes, from the
 * same functions; neither snaps the ball or guarantees a completion (opponents still intercept).
 */

/** Seconds a teammate needs to react before he starts moving to meet a pass. */
export const RECEIVER_REACTION_SECONDS = 0.2;
const SAMPLE_SECONDS = 0.05;
const MAX_LOOKAHEAD_SECONDS = 4;

/** Distance a ground ball rolls while slowing from `speed` to `endSpeed` under constant friction. */
export function rollDistance(speed: number, endSpeed: number, friction: number): number {
  return Math.max(0, (speed * speed - endSpeed * endSpeed) / (2 * friction));
}

/** Distance travelled after `t` seconds (stops at rest). */
export function rolledAfter(speed: number, friction: number, t: number): number {
  const stopT = speed / friction;
  const tt = Math.min(Math.max(0, t), stopT);
  return speed * tt - 0.5 * friction * tt * tt;
}

export interface GroundKickPrediction {
  /** Where the ball comes to rest if nobody touches it (may lie beyond the touchline). */
  readonly stop: Vec2;
  readonly stopDistance: number;
  readonly stopSeconds: number;
}

export function predictGroundKick(from: Vec2, dir: Vec2, speed: number, T: MatchTuning): GroundKickPrediction {
  const f = T.ball.friction;
  const d = rollDistance(speed, 0, f);
  return { stop: { x: from.x + dir.x * d, y: from.y + dir.y * d }, stopDistance: d, stopSeconds: speed / f };
}

export interface ReachableReceiver {
  readonly id: MatchPlayerId;
  /** Point on the ball's path where he can first meet it. */
  readonly point: Vec2;
  readonly seconds: number;
}

/**
 * The teammate who can first reach the ball's path, running at the normal run speed after a short
 * reaction. Purely physical: no attraction, no speed boost. Points off the pitch are ignored.
 */
export function reachableReceiver(
  s: MatchState,
  kickerId: MatchPlayerId,
  from: Vec2,
  dir: Vec2,
  speed: number,
  T: MatchTuning,
): ReachableReceiver | null {
  const team = s.players[kickerId].team;
  const f = T.ball.friction;
  const end = Math.min(speed / f, MAX_LOOKAHEAD_SECONDS);
  const run = T.movement.runSpeed;
  const accel = T.movement.accel;
  const reach = T.receive.radius;
  // From standing: accelerate at the normal rate up to run speed (the receive intent gets no sprint boost).
  const runTime = (d: number): number => {
    const ramp = (run * run) / (2 * accel);
    return d <= ramp ? Math.sqrt((2 * d) / accel) : run / accel + (d - ramp) / run;
  };
  for (let t = SAMPLE_SECONDS; t <= end + 1e-9; t += SAMPLE_SECONDS) {
    const d = rolledAfter(speed, f, t);
    const pt = { x: from.x + dir.x * d, y: from.y + dir.y * d };
    if (pt.x < 0 || pt.x > T.pitch.length || pt.y < 0 || pt.y > T.pitch.width) return null;
    let best: { id: MatchPlayerId; gap: number } | null = null;
    for (const id of TEAM_PLAYER_IDS[team]) {
      const p = s.players[id];
      if (id === kickerId || p.isKeeper) continue;
      const gap = Math.max(0, Math.hypot(p.pos.x - pt.x, p.pos.y - pt.y) - reach);
      if (RECEIVER_REACTION_SECONDS + runTime(gap) <= t && (!best || gap < best.gap)) best = { id, gap };
    }
    if (best) return { id: best.id, point: pt, seconds: t };
  }
  return null;
}

export interface UserPassPlan {
  readonly receiver: MatchPlayerId | null;
  /** Where the receiver runs to meet the ball (or the arrive-speed point when nobody can reach it). */
  readonly target: Vec2;
  readonly reachable: boolean;
  readonly prediction: GroundKickPrediction;
}

export function planUserPass(s: MatchState, kickerId: MatchPlayerId, from: Vec2, dir: Vec2, speed: number, T: MatchTuning): UserPassPlan {
  const prediction = predictGroundKick(from, dir, speed, T);
  const hit = reachableReceiver(s, kickerId, from, dir, speed, T);
  if (hit) return { receiver: hit.id, target: hit.point, reachable: true, prediction };
  const roll = Math.min(Math.max(rollDistance(speed, T.pass.arriveSpeed, T.ball.friction), T.pass.minDistance), 45);
  const target = { x: from.x + dir.x * roll, y: from.y + dir.y * roll };
  const team = s.players[kickerId].team;
  let receiver: MatchPlayerId | null = null;
  let bestD = Infinity;
  for (const id of TEAM_PLAYER_IDS[team]) {
    const p = s.players[id];
    if (id === kickerId || p.isKeeper) continue;
    const d = Math.hypot(p.pos.x - target.x, p.pos.y - target.y);
    if (d < bestD) {
      bestD = d;
      receiver = id;
    }
  }
  return { receiver, target, reachable: false, prediction };
}
