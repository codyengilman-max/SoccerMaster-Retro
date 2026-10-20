/**
 * SoccerMaster v0.5 tactical decision engine, ported line for line from
 * research/logic/v0.5/engine/decision-engine.mjs. Tactical intentions only: the host owns all physics,
 * kicking and rules. Units are metres and seconds; x spans pitch length, y spans width. One instance per
 * team; the input is a delivered team observation, never world state.
 */

export type TacticalRole = 'GK' | 'LB' | 'CB' | 'RB' | '6' | '8' | 'LW' | '9' | 'RW';

const ROLES: Readonly<Record<TacticalRole, readonly [number, number]>> = {
  GK: [0.06, 0.5], LB: [0.28, 0.18], CB: [0.23, 0.5], RB: [0.28, 0.82],
  '6': [0.42, 0.40], '8': [0.52, 0.60], LW: [0.68, 0.12], '9': [0.73, 0.5], RW: [0.68, 0.88],
};

export interface TacticalPoint {
  readonly x: number;
  readonly y: number;
}

export interface TacticalTeammate {
  readonly id: string;
  readonly role: TacticalRole;
  readonly pos: TacticalPoint;
  readonly human: boolean;
  /** Positive movement capability (m/s) used for arrival estimates. */
  readonly speed: number;
  /** From the host's action state machine; never fabricated. */
  readonly ready?: boolean;
  /** From the host's configured rules; absent/false disables selection as a receiver. */
  readonly passEligible?: boolean;
}

export interface TacticalOpponent {
  readonly id?: string;
  readonly pos: TacticalPoint;
  readonly seenAt: number;
}

export type TacticalBallState = 'controlled' | 'traveling' | 'contested' | 'dead';

export interface TacticalBall {
  readonly pos: TacticalPoint;
  readonly state: TacticalBallState;
  readonly seenAt: number;
  readonly ownerId?: string | null;
  readonly fromId?: string | null;
  readonly receiverId?: string | null;
  readonly receivePoint?: TacticalPoint | null;
}

export type TacticalPhase = 'live' | 'paused' | 'stoppage';

export interface TacticalObservation {
  readonly tick: number;
  readonly time: number;
  readonly direction: 1 | -1;
  readonly phase: TacticalPhase;
  readonly possessionGeneration: number;
  readonly controlGeneration: number;
  readonly teammates: readonly TacticalTeammate[];
  readonly opponents?: readonly TacticalOpponent[];
  readonly ball?: TacticalBall | null;
  /** Team-relative x ceiling for supporting runs, from the host's rules. */
  readonly runLimit?: number;
  readonly completedCommands?: readonly string[];
}

export type TacticalMode = 'attack' | 'defend' | 'loose';

export type TacticalTask =
  | 'hold-shape' | 'recover-shape'
  | 'goalkeeper-set' | 'goalkeeper-sweep' | 'goalkeeper-distribute'
  | 'carry' | 'secure-ball'
  | 'support' | 'rest-defense' | 'provide-width' | 'offer-depth' | 'support-triangle' | 'support-behind-wing'
  | 'receive-pass'
  | 'contest-ball' | 'pressure' | 'block-lane' | 'cover' | 'protect-center' | 'balance';

export interface TacticalAction {
  readonly type: 'PASS' | 'SHOOT';
  readonly aim: TacticalPoint;
  /** Normalized provisional charge intent, not a ball-speed override. */
  readonly power: number;
  readonly targetId?: string;
  readonly id: string;
  readonly actorId: string;
  readonly tick: number;
  readonly possessionGeneration: number;
  readonly controlGeneration: number;
  readonly expiresAt: number;
}

export interface TacticalOrder {
  readonly actorId: string;
  task: TacticalTask;
  target: TacticalPoint;
  readonly stance: 'BLOCK' | 'NORMAL';
  readonly action: TacticalAction | null;
  readonly phase: TacticalMode | 'loss' | 'gain';
  readonly epoch: number;
  readonly expiresAt: number;
}

export interface TacticalResult {
  readonly orders: TacticalOrder[];
  readonly cancel: string[];
  readonly epoch?: number;
  readonly duplicate?: true;
}

export interface TacticalOptions {
  readonly length?: number;
  readonly width?: number;
  readonly interval?: number;
  readonly maxAge?: number;
  readonly expiry?: number;
}

export interface TacticalEngine {
  step(s: TacticalObservation): TacticalResult;
  reset(): void;
}

type ActionDraft = { type: 'PASS' | 'SHOOT'; aim: TacticalPoint; power: number; targetId?: string };

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const dist = (a: TacticalPoint, b: TacticalPoint): number => Math.hypot(a.x - b.x, a.y - b.y);
const point = (p: TacticalPoint | null | undefined): p is TacticalPoint => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const order = (a: { readonly id: string }, b: { readonly id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const BALL_STATES: readonly string[] = ['controlled', 'traveling', 'contested', 'dead'];
const PHASES: readonly string[] = ['live', 'paused', 'stoppage'];

function laneDistance(p: TacticalPoint, a: TacticalPoint, b: TacticalPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function createDecisionEngine(options: TacticalOptions = {}): TacticalEngine {
  const cfg = { length: 80, width: 55, interval: 0.15, maxAge: 0.6, expiry: 0.35, ...options };
  for (const k of ['length', 'width', 'interval', 'maxAge', 'expiry'] as const)
    if (!Number.isFinite(cfg[k]) || cfg[k] <= 0) throw new Error(`Invalid ${k}`);
  let lastTick = -1;
  let lastTime = -1;
  let lastDecision = -Infinity;
  let epoch = 0;
  let lastKey = '';
  let lastMode: TacticalMode | null = null;
  let leader: string | null | undefined = null;
  let sequence = 0;
  const pending = new Map<string, string>();
  const bounded = (p: TacticalPoint): TacticalPoint => ({ x: clamp(p.x, 0, cfg.length), y: clamp(p.y, 0, cfg.width) });

  function reset(): void {
    lastTick = -1;
    lastTime = -1;
    lastDecision = -Infinity;
    lastKey = '';
    lastMode = null;
    leader = null;
    pending.clear();
    epoch++;
  }

  function step(s: TacticalObservation): TacticalResult {
    if (!Number.isInteger(s.tick) || s.tick < 0 || !Number.isFinite(s.time) || s.time < 0) throw new Error('Invalid simulation clock');
    if (s.tick < lastTick || s.time < lastTime) throw new Error('Clock rewind requires reset');
    if (s.tick === lastTick) return { orders: [], cancel: [], duplicate: true };
    if (s.direction !== 1 && s.direction !== -1) throw new Error('direction must be 1 or -1');
    if (!PHASES.includes(s.phase)) throw new Error('Invalid phase');
    if (!Number.isInteger(s.possessionGeneration) || !Number.isInteger(s.controlGeneration)) throw new Error('Generation counters required');
    const team = [...(s.teammates ?? [])].sort(order);
    const ids = new Set<string>();
    if (team.length !== 9) throw new Error('Exactly nine teammates required');
    for (const p of team) {
      if (typeof p.id !== 'string' || ids.has(p.id) || !ROLES[p.role] || !point(p.pos) || !Number.isFinite(p.speed) || p.speed <= 0 || typeof p.human !== 'boolean')
        throw new Error('Invalid teammate');
      ids.add(p.id);
    }
    if (team.filter((p) => p.role === 'GK').length !== 1) throw new Error('One goalkeeper required');
    const fresh = (t: number): boolean => Number.isFinite(t) && s.time >= t && s.time - t <= cfg.maxAge;
    const opponents = (s.opponents ?? []).filter((p) => point(p.pos) && fresh(p.seenAt));
    const ball = s.ball && point(s.ball.pos) && fresh(s.ball.seenAt) ? s.ball : null;
    if (ball && !BALL_STATES.includes(ball.state)) throw new Error('Invalid ball state');
    const owner = ball?.state === 'controlled' ? (ball.ownerId ?? null) : null;
    const carrier = team.find((p) => p.id === owner);
    const ownFlight = ball?.state === 'traveling' && team.some((p) => p.id === ball.fromId);
    const mode: TacticalMode = carrier || ownFlight ? 'attack' : owner ? 'defend' : 'loose';
    const key = `${s.phase}|${s.direction}|${s.possessionGeneration}|${s.controlGeneration}|${mode}|${owner ?? ''}`;
    const changed = key !== lastKey;
    const cancel: string[] = [];
    if (changed) {
      for (const id of pending.values()) cancel.push(id);
      pending.clear();
      leader = null;
      epoch++;
    }
    for (const id of s.completedCommands ?? []) for (const [actor, cmd] of pending) if (cmd === id) pending.delete(actor);
    lastTick = s.tick;
    lastTime = s.time;
    const previousMode = lastMode;
    lastKey = key;
    lastMode = mode;
    if (s.phase !== 'live') return { orders: [], cancel, epoch };
    if (!changed && s.time - lastDecision < cfg.interval) return { orders: [], cancel, epoch };
    lastDecision = s.time;
    const dir = s.direction;
    const forward = (x: number): number => (dir === 1 ? x : cfg.length - x);
    const world = (x: number, y: number): TacticalPoint => bounded({ x: forward(x), y });
    const ownGoal = world(0, cfg.width / 2);
    const goal = world(cfg.length, cfg.width / 2);
    const bx = ball ? forward(ball.pos.x) : cfg.length / 2;
    const by = ball?.pos.y ?? cfg.width / 2;
    const phase: TacticalOrder['phase'] =
      previousMode === 'attack' && mode !== 'attack' ? 'loss' : previousMode && previousMode !== 'attack' && mode === 'attack' ? 'gain' : mode;
    const npc = team.filter((p) => !p.human);
    const home = (p: TacticalTeammate): TacticalPoint => {
      const [x, y] = ROLES[p.role];
      const shift = ball ? clamp((bx / cfg.length - 0.5) * 0.24, -0.12, 0.12) : 0;
      return world((x + (mode === 'attack' ? 0.06 : -0.08) + shift) * cfg.length, y * cfg.width + (by - cfg.width / 2) * 0.12);
    };
    const nearest = (p: TacticalPoint): number => {
      let m = Infinity;
      for (const o of opponents) m = Math.min(m, dist(o.pos, p));
      return m;
    };
    let presser: TacticalTeammate | undefined;
    let cover: TacticalTeammate | undefined;
    if (ball && mode !== 'attack' && ball.state !== 'dead') {
      const arrival = (p: TacticalTeammate): number =>
        dist(p.pos, ball.pos) / p.speed + (forward(p.pos.x) > bx ? 0.5 : 0) + (p.role === 'CB' ? 0.65 : 0) + (p.role === '6' ? 0.3 : 0);
      const candidates = npc.filter((p) => p.role !== 'GK').sort((a, b) => arrival(a) - arrival(b) || order(a, b));
      presser = candidates[0];
      const incumbent = candidates.find((p) => p.id === leader);
      if (incumbent && presser && arrival(incumbent) <= arrival(presser) + 0.25) presser = incumbent;
      leader = presser?.id;
      cover = candidates.filter((p) => p.id !== leader).sort((a, b) => dist(a.pos, ownGoal) - dist(b.pos, ownGoal) || order(a, b))[0];
    }
    const orders: TacticalOrder[] = [];
    const reserve: TacticalPoint[] = [];
    for (const p of npc) {
      let target = home(p);
      let task: TacticalTask = 'recover-shape';
      let action: ActionDraft | null = null;
      if (!ball || ball.state === 'dead') {
        task = 'hold-shape';
      } else if (p.role === 'GK' && p.id !== owner) {
        task = 'goalkeeper-set';
        target = world(clamp(bx * 0.1, 2, 8), cfg.width / 2 + (by - cfg.width / 2) * 0.2);
        const nearestOpponent = nearest(ball.pos);
        if (mode === 'loose' && bx < 12 && Math.abs(by - cfg.width / 2) < 12 && dist(p.pos, ball.pos) + 3 < nearestOpponent) {
          task = 'goalkeeper-sweep';
          target = ball.pos;
        }
      } else if (p.id === owner) {
        task = p.role === 'GK' ? 'goalkeeper-distribute' : 'carry';
        target = world(bx + 5, by);
        const pressure = nearest(p.pos);
        const candidates = team
          .filter((t) => t.id !== p.id && t.passEligible === true)
          .map((t) => {
            let gap = 10;
            for (const o of opponents) gap = Math.min(gap, laneDistance(o.pos, p.pos, t.pos));
            const progress = forward(t.pos.x) - bx;
            return { t, score: progress * 0.1 + gap * 0.6 - dist(p.pos, t.pos) * 0.035, gap, d: dist(p.pos, t.pos) };
          })
          .filter((c) => c.d > 2 && c.d < 30 && c.gap > 1.5)
          .sort((a, b) => b.score - a.score || order(a.t, b.t));
        const shooting = p.role !== 'GK' && dist(p.pos, goal) < 20 && Math.abs(p.pos.y - cfg.width / 2) < 12 && pressure > 1.2;
        if (p.ready === true && !pending.has(p.id)) {
          const best = candidates[0];
          if (shooting) action = { type: 'SHOOT', aim: goal, power: 0.7 };
          else if (best && (pressure < 5 || best.score > 2 || p.role === 'GK')) {
            action = { type: 'PASS', targetId: best.t.id, aim: { ...best.t.pos }, power: 0.25 };
          }
        }
        if (pressure < 2 && !action) {
          task = 'secure-ball';
          target = world(bx - 2, by);
        }
      } else if (mode === 'attack') {
        task = 'support';
        if (p.role === 'CB' || p.role === '6') {
          task = 'rest-defense';
          target = world(Math.min(bx - 9, p.role === 'CB' ? 24 : 34), p.role === 'CB' ? cfg.width / 2 : cfg.width * 0.42);
        } else if (p.role === 'LW' || p.role === 'RW') {
          task = 'provide-width';
          target = world(Math.max(bx + 7, cfg.length * 0.64), cfg.width * (p.role === 'LW' ? 0.12 : 0.88));
        } else if (p.role === '9') {
          task = 'offer-depth';
          target = world(bx + 12, cfg.width / 2);
        } else if (p.role === '8') {
          task = 'support-triangle';
          target = world(bx - 3, by < cfg.width / 2 ? by + 10 : by - 10);
        } else {
          task = 'support-behind-wing';
          target = world(bx - 8, cfg.width * (p.role === 'LB' ? 0.23 : 0.77));
        }
        // Host supplies legal run limit from configured rules, including no-offside profiles.
        if (s.runLimit !== undefined && Number.isFinite(s.runLimit)) target = world(Math.min(forward(target.x), s.runLimit), target.y);
        if (ownFlight && ball.receiverId === p.id && point(ball.receivePoint)) {
          task = 'receive-pass';
          target = ball.receivePoint;
        }
      } else if (p.id === presser?.id) {
        task = mode === 'loose' ? 'contest-ball' : 'pressure';
        target = world(bx - 1.5, by);
        if (mode === 'defend' && dist(p.pos, ball.pos) < 2.5) task = 'block-lane';
      } else if (p.id === cover?.id) {
        task = 'cover';
        target = world(bx - 6, by + (cfg.width / 2 - by) * 0.35);
      } else {
        task = p.role === '6' || p.role === 'CB' ? 'protect-center' : 'balance';
        if (p.role === '6' || p.role === 'CB') target = world(Math.min(bx - 7, p.role === 'CB' ? 24 : 34), cfg.width * (p.role === 'CB' ? 0.5 : 0.42));
      }
      target = bounded(target);
      // Destinations are separated; physical avoidance remains the movement adapter's job.
      if (p.id !== owner && p.role !== 'GK') {
        for (let n = 0; n < 8 && reserve.some((t) => dist(t, target) < 2); n++)
          target = bounded({ x: target.x - dir * 2, y: target.y + (target.y < cfg.width / 2 ? 2 : -2) });
      }
      reserve.push(target);
      let issued: TacticalAction | null = null;
      if (action) {
        issued = {
          ...action,
          id: `${epoch}:${++sequence}:${p.id}`,
          actorId: p.id,
          tick: s.tick,
          possessionGeneration: s.possessionGeneration,
          controlGeneration: s.controlGeneration,
          expiresAt: s.time + cfg.expiry,
        };
        pending.set(p.id, issued.id);
      }
      orders.push({ actorId: p.id, task, target, stance: task === 'block-lane' ? 'BLOCK' : 'NORMAL', action: issued, phase, epoch, expiresAt: s.time + cfg.expiry });
    }
    for (const o of orders)
      if (o.action?.type === 'PASS') {
        const receiver = orders.find((r) => r.actorId === o.action!.targetId);
        if (receiver) {
          receiver.task = 'receive-pass';
          receiver.target = bounded(o.action.aim);
        }
      }
    return { orders, cancel, epoch };
  }

  return { step, reset };
}
