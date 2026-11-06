/**
 * One clock for every actor, the ball, possession and events (owner brief §6). Sampling is a pure function of scene
 * time, so slow motion only changes how fast the clock advances: relative movement, arrival order, contacts and
 * any offside moment are identical at every rate, and a replay from any time restores the exact same state.
 */
import type { Metres } from '../all36/types';
import type { BallEvent, MoveAction, Timeline } from './schema';

export interface ActorSample {
  readonly id: string;
  readonly at: Metres;
  readonly action: MoveAction;
  /** Run-cycle phase from distance travelled (1 cycle per stride), so frames advance with movement, not wall time. */
  readonly phase: number;
  /** Seconds from the nearest pass/receive contact (negative while planting); 0 when none applies. */
  readonly since: number;
  readonly look: Metres;
  readonly moving: boolean;
}
export type BallState = { readonly mode: 'held'; readonly by: string } | { readonly mode: 'flight'; readonly kind: 'pass' | 'roll' } | { readonly mode: 'loose' };
export interface BallSample {
  readonly at: Metres;
  readonly state: BallState;
  /** Whole-number index that advances with distance rolled, for the patterned ball's spin frames. */
  readonly roll: number;
}
export interface Frame {
  readonly t: number;
  readonly actors: readonly ActorSample[];
  readonly ball: BallSample;
}

export const STRIDE_M = 1.6;
export const PLANT_S = 0.35;
export const FOLLOW_S = 0.3;
export const SETTLE_S = 0.35;
/** Dribble: the most a touch pushes the ball ahead of the carrier's held offset before the carrier catches up. */
export const TOUCH_PUSH_M = 0.6;

const lerp = (a: Metres, b: Metres, u: number): Metres => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
const dist = (a: Metres, b: Metres): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function actorAt(tl: Timeline, id: string, t: number): ActorSample {
  const tr = tl.actors.find((a) => a.id === id);
  if (!tr || tr.keys.length === 0) throw new Error(`no track for ${id}`);
  const k = tr.keys;
  let travelled = 0;
  let at: Metres = k[0]!.at;
  let action: MoveAction = k[0]!.action;
  let look: Metres = k[0]!.look;
  let moving = false;
  if (t > k[0]!.t) {
    for (let i = 1; i < k.length; i++) {
      const a = k[i - 1]!;
      const b = k[i]!;
      const seg = dist(a.at, b.at);
      if (t < b.t) {
        const u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
        at = lerp(a.at, b.at, u);
        travelled += seg * u;
        moving = seg > 1e-6;
        action = moving ? b.action : a.action === 'pass' || a.action === 'receive' ? 'stand' : a.action;
        look = moving ? b.look : a.look;
        break;
      }
      travelled += seg;
      at = b.at;
      look = b.look;
      action = b.action === 'run' || b.action === 'pass' || b.action === 'receive' ? 'stand' : b.action;
    }
  }
  let since = 0;
  if (!moving) {
    for (const key of k) {
      if (key.action === 'pass' && t >= key.t - PLANT_S && t < key.t + FOLLOW_S) ((action = 'pass'), (since = t - key.t), (look = key.look));
      if (key.action === 'receive' && t >= key.t && t < key.t + SETTLE_S) ((action = 'receive'), (since = t - key.t));
    }
  }
  return { id, at, action, phase: travelled / STRIDE_M, since, look, moving };
}

const startOf = (e: BallEvent): number => (e.kind === 'carry' || e.kind === 'roll' ? e.t0 : e.t);

/** Ball position and possession at `t`; `ball0` is the ball's position at the timeline's start. */
export function ballAt(tl: Timeline, ball0: Metres, t: number): BallSample {
  type S = { mode: 'held'; by: string; off: Metres; carry?: { t0: number; t1: number; touches: readonly number[] } } | { mode: 'flight'; kind: 'pass' | 'roll'; from: Metres; to: Metres; t0: number; t1: number } | { mode: 'loose'; at: Metres };
  const pos = (s: S, tt: number): Metres => {
    if (s.mode === 'held') {
      const a = actorAt(tl, s.by, tt);
      const c = s.carry;
      if (c && a.moving && tt >= c.t0 && tt <= c.t1) {
        // Dribble: each touch pushes the ball up to TOUCH_PUSH_M further ahead; the runner catches up before the next touch.
        const prev = [c.t0, ...c.touches].filter((x) => x <= tt).pop()!;
        const next = [...c.touches, c.t1].find((x) => x > tt) ?? c.t1;
        const u = Math.min(1, (tt - prev) / Math.max(1e-6, next - prev));
        const push = Math.min(TOUCH_PUSH_M, (next - prev) * 0.6) * Math.sin(Math.PI * u);
        // Push along the carrier's travel, not their gaze (a carrier can look back while running on).
        const ahead = actorAt(tl, s.by, Math.min(c.t1, tt + 0.02)).at;
        const behind = actorAt(tl, s.by, Math.max(c.t0, tt - 0.02)).at;
        const dx = ahead[0] - behind[0];
        const dy = ahead[1] - behind[1];
        const n = Math.hypot(dx, dy) || 1;
        return [a.at[0] + s.off[0] + (dx / n) * push, a.at[1] + s.off[1] + (dy / n) * push];
      }
      return [a.at[0] + s.off[0], a.at[1] + s.off[1]];
    }
    if (s.mode === 'loose') return s.at;
    const u = Math.min(1, Math.max(0, (tt - s.t0) / Math.max(1e-6, s.t1 - s.t0)));
    return lerp(s.from, s.to, s.kind === 'roll' ? 1 - (1 - u) * (1 - u) : u);
  };
  let s: S = { mode: 'loose', at: ball0 };
  let rolled = 0;
  let last: Metres = ball0;
  const events = [...tl.ball].sort((a, b) => startOf(a) - startOf(b));
  for (const e of events) {
    const te = startOf(e);
    if (te > t) break;
    const here = pos(s, te);
    rolled += dist(last, here);
    last = here;
    if (e.kind === 'held' || e.kind === 'carry' || e.kind === 'receive') {
      const p = actorAt(tl, e.by, te).at;
      s = { mode: 'held', by: e.by, off: [here[0] - p[0], here[1] - p[1]], ...(e.kind === 'carry' && e.touches.length ? { carry: { t0: e.t0, t1: e.t1, touches: e.touches.map((x) => x.t) } } : {}) };
    } else if (e.kind === 'pass') s = { mode: 'flight', kind: 'pass', from: here, to: e.to, t0: e.t, t1: e.arrive };
    else if (e.kind === 'roll') s = { mode: 'flight', kind: 'roll', from: e.from, to: e.to, t0: e.t0, t1: e.t1 };
    else s = { mode: 'loose', at: e.at };
  }
  const at = pos(s, t);
  rolled += dist(last, at);
  const state: BallState = s.mode === 'held' ? { mode: 'held', by: s.by } : s.mode === 'flight' ? { mode: 'flight', kind: s.kind } : { mode: 'loose' };
  if (s.mode === 'flight' && t >= s.t1) return { at, state: { mode: 'loose' }, roll: Math.floor(rolled / 0.22) };
  return { at, state, roll: Math.floor(rolled / 0.22) };
}

export function frameAt(tl: Timeline, ball0: Metres, t: number): Frame {
  const tt = Math.min(Math.max(0, t), tl.duration);
  return { t: tt, actors: tl.actors.map((a) => actorAt(tl, a.id, tt)), ball: ballAt(tl, ball0, tt) };
}

/** Pass/receive/touch contact times on a timeline, for frame-sync checks and the review page. */
export function contacts(tl: Timeline): { t: number; by: string; kind: 'pass' | 'receive' | 'touch'; foot: 'right' | 'left' | 'unverified' }[] {
  const out: { t: number; by: string; kind: 'pass' | 'receive' | 'touch'; foot: 'right' | 'left' | 'unverified' }[] = [];
  for (const e of tl.ball) {
    if (e.kind === 'pass') out.push({ t: e.t, by: e.by, kind: 'pass', foot: e.foot });
    if (e.kind === 'receive') out.push({ t: e.t, by: e.by, kind: 'receive', foot: e.foot });
    if (e.kind === 'carry') for (const x of e.touches) out.push({ t: x.t, by: e.by, kind: 'touch', foot: x.foot });
  }
  return out.sort((a, b) => a.t - b.t);
}
