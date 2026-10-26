/**
 * Completes every tactical situation to the full 9v9 picture: exactly 9 per team (18 players). The authored actors
 * carry the decision; the added players hold the team shape that the coach describes for their role, shifted toward
 * the ball, and keep clear of every authored player, the ball and each option's lane so they never change the read.
 * Pitch frame: x across (0..HALF_W), y from halfway (0) to the goal line in this half (HALF_L). Framework-free.
 */
import { HALF_L, HALF_W, type Fixture, type P, type Side } from './types';
import type { RoleId } from '../ref/catalog.mjs';

export const SQUAD_ROLES: readonly RoleId[] = ['GK', 'CB', 'LB', 'RB', '6', '8', 'LW', 'RW', '9'];

/** Depth from the team's own goal line (m) and share of the width from the team's left touchline, 1-3-2-3. */
const SHAPE: Record<RoleId, { depth: number; left: number }> = {
  GK: { depth: 4, left: 0.5 },
  CB: { depth: 15, left: 0.5 },
  LB: { depth: 18, left: 0.84 },
  RB: { depth: 18, left: 0.16 },
  '6': { depth: 25, left: 0.5 },
  '8': { depth: 32, left: 0.42 },
  LW: { depth: 42, left: 0.86 },
  RW: { depth: 42, left: 0.14 },
  '9': { depth: 47, left: 0.5 },
};

const TASK: Record<'with' | 'without', Record<RoleId, string>> = {
  with: {
    GK: 'Stays behind the play as the safe pass back',
    CB: 'Balances behind the ball',
    LB: 'Holds width on the left',
    RB: 'Holds width on the right',
    '6': 'Screens behind the ball as the safety pass',
    '8': 'Supports between their lines',
    LW: 'Holds width high on the left',
    RW: 'Holds width high on the right',
    '9': 'Pins their back line',
  },
  without: {
    GK: 'Guards the goal and talks to the line',
    CB: 'Covers the middle behind the ball',
    LB: 'Tucks in to cover the far side',
    RB: 'Tucks in to cover the far side',
    '6': 'Screens the middle',
    '8': 'Tracks the nearest runner',
    LW: 'Tracks back on the left',
    RW: 'Tracks back on the right',
    '9': 'Blocks the pass back to their keeper',
  },
};

/** How far the team block follows the ball: across and up/down the pitch. */
export const SHIFT = { x: 0.35, y: 0.45 } as const;
/** Minimum clearance from authored players (m), between added players, and from the ball's option lanes. */
export const CLEAR = { player: 4, filler: 3, lane: 2.5, ball: 5 } as const;

export interface SquadActor {
  readonly slot: string;
  readonly side: Side;
  readonly role: RoleId;
  readonly at: P;
  readonly task: string;
  /** Beyond halfway in the other half (only the far keeper): drawn as an edge marker by the renderer. */
  readonly offHalf: boolean;
}

const team = (side: Side): 'A' | 'B' => (side === 'A' || side === 'GK_A' ? 'A' : 'B');

/** Whether `t` defends the goal in this half. */
export const defendsHere = (fx: Pick<Fixture, 'goal'>, t: 'A' | 'B'): boolean => (t === 'A') === (fx.goal === 'ours');

/** The role's shape point for team `t`, before spacing; `ball` shifts the block. */
export function shapePoint(fx: Pick<Fixture, 'goal'>, t: 'A' | 'B', role: RoleId, ball: P): { at: P; offHalf: boolean } {
  const s = SHAPE[role];
  const here = defendsHere(fx, t);
  const ballDepth = here ? HALF_L - ball.y : HALF_L + ball.y;
  const shift = role === 'GK' ? 0 : (ballDepth - HALF_L) * SHIFT.y;
  const depth = role === 'GK' ? s.depth : Math.max(8, s.depth + shift);
  const across = (here ? s.left : 1 - s.left) * HALF_W + (role === 'GK' ? 0 : (ball.x - HALF_W / 2) * SHIFT.x);
  const x = Math.min(HALF_W - 2, Math.max(2, across));
  const rawY = here ? HALF_L - depth : depth - HALF_L;
  if (role === 'GK' && !here) return { at: { x: HALF_W / 2, y: rawY }, offHalf: true };
  return { at: { x, y: Math.min(HALF_L - 1.5, Math.max(1, rawY)) }, offHalf: false };
}

function segDist(a: P, b: P, p: P): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l));
  return Math.hypot(a.x + u * dx - p.x, a.y + u * dy - p.y);
}

/**
 * Added players for one variant (unmirrored frame). `authored` are the variant's start positions, `ball` the ball's
 * start, `lanes` the end points of every option (each lane runs from the ball), `avoid` where authored players run in
 * the passage. A team authored with a duplicate role (e.g. two centre-backs) drops the first outfield role it lacks.
 * Throws if a team already has more than 9.
 */
export function completeSquad(
  fx: Pick<Fixture, 'id' | 'goal'>,
  authored: readonly { slot: string; side: Side; role: RoleId; at: P }[],
  ball: P,
  lanes: readonly P[],
  owner: 'A' | 'B' | null,
  avoid: readonly P[] = [],
): SquadActor[] {
  const out: SquadActor[] = [];
  for (const t of ['A', 'B'] as const) {
    const mine = authored.filter((a) => team(a.side) === t);
    if (mine.length > 9) throw new Error(`${fx.id}: team ${t} has ${mine.length} authored players`);
    const missing = [...SQUAD_ROLES];
    for (const a of mine) {
      const i = missing.indexOf(a.role);
      if (i >= 0) missing.splice(i, 1);
      else missing.splice(missing.findIndex((r) => r !== 'GK'), 1);
    }
    for (const role of missing) {
      const { at: want, offHalf } = shapePoint(fx, t, role, ball);
      const at = offHalf ? want : place(want, [...authored, ...avoid.map((at) => ({ at }))], out, ball, lanes);
      out.push({
        slot: `sq-${t}-${role}`,
        side: role === 'GK' ? (t === 'A' ? 'GK_A' : 'GK_B') : t,
        role,
        at,
        task: TASK[owner === t ? 'with' : 'without'][role],
        offHalf,
      });
    }
  }
  return out;
}

/** Nearest point to the shape point (spiral search, 1 m rings up to 14 m) that clears everyone and every lane. */
function place(want: P, authored: readonly { at: P }[], added: readonly SquadActor[], ball: P, lanes: readonly P[]): P {
  const score = (p: P): number => Math.min(
    ...authored.map((a) => Math.hypot(a.at.x - p.x, a.at.y - p.y) - CLEAR.player),
    ...added.map((a) => Math.hypot(a.at.x - p.x, a.at.y - p.y) - CLEAR.filler),
    ...lanes.map((l) => segDist(ball, l, p) - CLEAR.lane),
    Math.hypot(ball.x - p.x, ball.y - p.y) - CLEAR.ball,
  );
  let best = want, bestScore = score(want);
  if (bestScore >= 0) return want;
  for (let r = 1; r <= 14; r++) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const p = { x: want.x + Math.cos(a) * r, y: want.y + Math.sin(a) * r };
      if (p.x < 1.5 || p.x > HALF_W - 1.5 || p.y < 1 || p.y > HALF_L - 1.5) continue;
      const sc = score(p);
      if (sc >= 0) return p;
      if (sc > bestScore) { best = p; bestScore = sc; }
    }
  }
  return best;
}
