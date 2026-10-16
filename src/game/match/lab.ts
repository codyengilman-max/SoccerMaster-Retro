/**
 * Gameplay Lab: deterministic, resettable practice situations staged on the real MatchSim (dev and
 * preview builds only; see docs/GAMEPLAY_FEEL.md). A lab sim runs as an untimed sandbox with no Coach
 * and no career evidence, so nothing here can award progression or touch a save.
 */
import type { MatchState, MatchPlayerId } from './types';
import { AWAY_IDS, HOME_IDS } from './types';

export const LAB_SCENARIO_IDS = [
  'pass-unpressured',
  'pass-range',
  'dribble-1v1',
  'combo-2v1',
  'receive-pressure',
  'loose-ball',
  'turnover',
  'finish-centre',
  'finish-angle',
  'touchline',
  'through-ball',
  'receive-turn',
  'quick-shot',
  'cancel-pressure',
] as const;
export type LabScenarioId = (typeof LAB_SCENARIO_IDS)[number];

export interface LabScenario {
  readonly id: LabScenarioId;
  readonly title: string;
  readonly goal: string;
  /** Players named here are placed; every other outfielder is moved clear (home behind, away upfield). */
  readonly place: Partial<Record<MatchPlayerId, readonly [number, number]>>;
  /** Carrier (owns the ball) or, when null, a loose ball at `ball` with velocity `ballVel`. */
  readonly carrier: MatchPlayerId | null;
  readonly ball?: readonly [number, number];
  readonly ballVel?: readonly [number, number];
  /** Initial velocities (yd/s) for placed players, e.g. a teammate already making a run. */
  readonly run?: Partial<Record<MatchPlayerId, readonly [number, number]>>;
}

export const LAB_SCENARIOS: Readonly<Record<LabScenarioId, LabScenario>> = {
  'pass-unpressured': {
    id: 'pass-unpressured',
    title: 'Passing between teammates',
    goal: 'No pressure: pass, receive, keep it moving.',
    place: { H8: [30, 25], H6: [38, 14], H7: [38, 36], H9: [46, 25] },
    carrier: 'H8',
  },
  'pass-range': {
    id: 'pass-range',
    title: 'Short, medium and long passes',
    goal: 'Teammates at about 8, 16 and 28 yards.',
    place: { H5: [20, 25], H6: [28, 21], H7: [35, 31], H9: [47, 17] },
    carrier: 'H5',
  },
  'dribble-1v1': {
    id: 'dribble-1v1',
    title: 'Dribble past one defender',
    goal: 'Swipe forward, back, sideways and diagonally to get round him.',
    place: { H8: [40, 25], A5: [48, 25] },
    carrier: 'H8',
  },
  'combo-2v1': {
    id: 'combo-2v1',
    title: '2 v 1 into a shot',
    goal: 'Draw the defender, pass, and finish.',
    place: { H8: [44, 21], H9: [49, 33], A4: [54, 26] },
    carrier: 'H8',
  },
  'receive-pressure': {
    id: 'receive-pressure',
    title: 'Receiving under pressure',
    goal: 'Your target has a defender close behind him.',
    place: { H5: [28, 25], H7: [40, 30], A6: [42.5, 31] },
    carrier: 'H5',
  },
  'loose-ball': {
    id: 'loose-ball',
    title: 'Loose ball',
    goal: 'Win the race to a rolling ball.',
    place: { H8: [30, 19], A6: [45, 31] },
    carrier: null,
    ball: [37.5, 25],
    ballVel: [0.5, 1.5],
  },
  turnover: {
    id: 'turnover',
    title: 'Turnover and recovery',
    goal: 'They have it: swipe to steer your defender and win it back.',
    place: { A7: [36, 25], H8: [31, 23], H6: [28, 32] },
    carrier: 'A7',
  },
  'finish-centre': {
    id: 'finish-centre',
    title: 'Finishing: central',
    goal: 'Shoot past the keeper from the middle.',
    place: { H9: [58, 25] },
    carrier: 'H9',
  },
  'finish-angle': {
    id: 'finish-angle',
    title: 'Finishing: tight angle',
    goal: 'Shoot from wide of the goal.',
    place: { H9: [62, 10] },
    carrier: 'H9',
  },
  touchline: {
    id: 'touchline',
    title: 'Along the touchline',
    goal: 'Ball near the line and the camera edge.',
    place: { H7: [40, 2.5], A3: [47, 4], H8: [36, 12] },
    carrier: 'H7',
  },
  'through-ball': {
    id: 'through-ball',
    title: 'Through ball to a runner',
    goal: 'Your striker is running: pass into the space ahead of him.',
    place: { H8: [34, 25], H9: [42, 32], A4: [46, 26], A5: [47, 33] },
    run: { H9: [4.5, 0] },
    carrier: 'H8',
  },
  'receive-turn': {
    id: 'receive-turn',
    title: 'Receive, turn and pass',
    goal: 'A pass is coming to you: take it, turn, and find the runner.',
    place: { H5: [26, 25], H7: [38, 25], A6: [43, 27], H9: [50, 14] },
    carrier: null,
    ball: [29, 25],
    ballVel: [9, 0],
  },
  'quick-shot': {
    id: 'quick-shot',
    title: 'Quick shot and rebound',
    goal: 'Double-tap for a quick shot, then chase the rebound.',
    place: { H9: [56, 23], H7: [52, 31], A4: [61, 26] },
    carrier: 'H9',
  },
  'cancel-pressure': {
    id: 'cancel-pressure',
    title: 'Cancel under pressure',
    goal: 'Start aiming, then slide back into the circle and dribble away instead.',
    place: { H8: [40, 25], H6: [33, 15], A5: [44.5, 25], A6: [43.5, 29.5] },
    carrier: 'H8',
  },
};

export function isLabScenarioId(id: string | null | undefined): id is LabScenarioId {
  return typeof id === 'string' && (LAB_SCENARIO_IDS as readonly string[]).includes(id);
}

/** Stage `id` on a freshly created state (call through MatchSim.arrange). Deterministic. */
export function stageLabScenario(s: MatchState, id: LabScenarioId, pitch: { length: number; width: number }): void {
  const sc = LAB_SCENARIOS[id];
  const ids = [...HOME_IDS, ...AWAY_IDS];
  ids.forEach((pid, i) => {
    const p = s.players[pid];
    const v = sc.run?.[pid];
    p.vel = v ? { x: v[0], y: v[1] } : { x: 0, y: 0 };
    const at = sc.place[pid];
    if (at) p.pos = { x: at[0], y: at[1] };
    else if (p.isKeeper) p.pos = p.team === 'home' ? { x: 2, y: pitch.width / 2 } : { x: pitch.length - 2, y: pitch.width / 2 };
    else {
      // Clear of the exercise and spread down the far touchline, so the AI rejoins naturally.
      const k = i % HOME_IDS.length;
      p.pos = p.team === 'home' ? { x: 6 + k, y: 4 + k * 5 } : { x: pitch.length - 8 - k, y: 4 + k * 5 };
    }
    p.target = { ...p.pos };
  });
  s.ball.kick = null;
  if (sc.carrier) {
    const c = s.players[sc.carrier];
    s.ball.owner = sc.carrier;
    s.ball.pos = { x: c.pos.x + (c.team === 'home' ? 0.6 : -0.6), y: c.pos.y };
    s.ball.vel = { x: 0, y: 0 };
    s.possession = c.team;
    s.ownedSince = s.simTime;
    if (c.team === 'home') s.controlledId = sc.carrier;
  } else {
    s.ball.owner = null;
    s.ball.pos = { x: sc.ball![0], y: sc.ball![1] };
    s.ball.vel = { x: sc.ballVel![0], y: sc.ballVel![1] };
  }
  if (!sc.carrier || s.players[sc.carrier].team !== 'home') {
    const nearest = HOME_IDS.filter((h) => !s.players[h].isKeeper && sc.place[h]).sort(
      (a, b) => dist(s.players[a].pos, s.ball.pos) - dist(s.players[b].pos, s.ball.pos),
    )[0];
    if (nearest) s.controlledId = nearest;
  }
  s.controlSince = s.simTime;
  s.controlEpoch += 1;
  s.prevControlledId = null;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
