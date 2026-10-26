/**
 * Full half-field play of one tactical situation: a short authored passage, a freeze at the decision trigger,
 * then the user's chosen action and the authored responses play out under ball physics until the authored
 * tactical result or the review point. The only target is the regulation 9v9 goal on the goal line; the only
 * boundaries are the half's touchlines, goal line and halfway line. Framework-free.
 */
import { clamp, distance, type MutableVec2 } from '../../math';
import { GOAL_W, HALF_L, HALF_W, type Fixture, type FixtureOption, type OptionGrade, type OutcomeKind, type P, type Side, type Variant, type VariantSpec } from './types';
import type { RoleId } from '../ref/catalog.mjs';

export const SIM = {
  dt: 1 / 60,
  runSpeed: 5.6,
  npcSpeed: 5.0,
  passSpeed: 13,
  shotSpeed: 19,
  decel: 2.9,
  arrive: 4,
  reach: 1.0,
  keeperReach: 1.7,
  settle: 1.0,
  pressure: 3,
} as const;

export type SituationPhase = 'release' | 'observe' | 'execute' | 'explain';

export interface SitActor {
  readonly slot: string;
  readonly side: Side;
  readonly role: RoleId;
  readonly task: string;
  readonly human: boolean;
  readonly start: P;
  pos: MutableVec2;
  vel: MutableVec2;
  goal: P | null;
  /** Seconds left before a player who was just tackled can play the ball again. */
  stun: number;
}

export interface SitBall {
  pos: MutableVec2;
  vel: MutableVec2;
  owner: string | null;
  target: string | null;
  passer: string | null;
  lastTeam: 'A' | 'B' | null;
  shot: boolean;
  kickT: number;
  /** Distance travelled before a lofted ball can be controlled; 0 for ground balls. */
  airUntil: number;
  travelled: number;
}

export interface SitOutcome { readonly kind: OutcomeKind; readonly text: string; readonly execution: string }

export interface SituationState {
  readonly fixture: Fixture;
  readonly variant: Variant;
  readonly mirrored: boolean;
  readonly spec: VariantSpec;
  readonly options: readonly FixtureOption[];
  readonly actors: SitActor[];
  readonly ball: SitBall;
  phase: SituationPhase;
  t: number;
  execT: number;
  chosen: FixtureOption | null;
  grade: OptionGrade | null;
  outcome: SitOutcome | null;
  settleT: number;
  pending: { kind: OutcomeKind; text: string } | null;
  /** The pending result can still change: an authored follow-up is due or its ball is in flight. */
  pendingSoft: boolean;
  readonly events: string[];
  readonly startOwner: string | null;
  readonly startTeam: 'A' | 'B' | null;
  /** Ball position when the decision was made (baseline for how far they got). */
  decisionBall: P | null;
}

export const teamOf = (side: Side): 'A' | 'B' => (side === 'A' || side === 'GK_A' ? 'A' : 'B');
const mirrorP = (p: P, m: boolean): P => (m ? { x: HALF_W - p.x, y: p.y } : { x: p.x, y: p.y });
const MIRROR_ROLE: Partial<Record<RoleId, RoleId>> = { LB: 'RB', RB: 'LB', LW: 'RW', RW: 'LW' };

export function roleIn(role: RoleId, mirrored: boolean): RoleId {
  return mirrored ? (MIRROR_ROLE[role] ?? role) : role;
}

/** Builds the frozen-start state; `mirrored` reflects the whole moment across the pitch (left/right roles swap). */
export function createSituation(fx: Fixture, variant: Variant, mirrored = false): SituationState {
  const spec = fx[variant];
  const actors: SitActor[] = fx.actors.map((a) => {
    const at = mirrorP(spec.moves?.[a.slot] ?? a.at, mirrored);
    const pass = spec.passage?.[a.slot] ?? a.passage;
    return {
      slot: a.slot, side: a.side, role: roleIn(a.role, mirrored), task: a.task, human: a.slot === fx.human,
      start: at, pos: { x: at.x, y: at.y }, vel: { x: 0, y: 0 }, goal: pass ? mirrorP(pass, mirrored) : null, stun: 0,
    };
  });
  const ballSpec = spec.ball ?? fx.ball;
  const owner = 'owner' in ballSpec ? ballSpec.owner : null;
  const o = owner ? actors.find((a) => a.slot === owner)! : null;
  const bp = o ? o.pos : mirrorP((ballSpec as { at: P }).at, mirrored);
  const options = fx.options.map((op) => ({ ...op, point: mirrorP(op.point, mirrored) }));
  return {
    fixture: fx, variant, mirrored, spec, options, actors,
    ball: { pos: { x: bp.x, y: bp.y }, vel: { x: 0, y: 0 }, owner, target: null, passer: null, lastTeam: o ? teamOf(o.side) : null, shot: false, kickT: 0, airUntil: 0, travelled: 0 },
    phase: fx.passageSeconds > 0 ? 'release' : 'observe', t: 0, execT: 0, chosen: null, grade: null, outcome: null, settleT: 0, pending: null, pendingSoft: false,
    events: [], startOwner: owner, startTeam: o ? teamOf(o.side) : null, decisionBall: null,
  };
}

export const actor = (s: SituationState, slot: string | null | undefined): SitActor | undefined => (slot ? s.actors.find((a) => a.slot === slot) : undefined);
export const human = (s: SituationState): SitActor => s.actors.find((a) => a.human)!;

/** Which way team A attacks on screen: +1 toward the goal line at the top, -1 toward halfway. */
export function attackDir(s: SituationState): 1 | -1 {
  return s.fixture.goal === 'theirs' ? 1 : -1;
}

export function choose(s: SituationState, optionId: string | null): boolean {
  if (s.phase !== 'observe') return false;
  const op = optionId === null ? null : s.options.find((o) => o.id === optionId) ?? null;
  if (optionId !== null && !op) return false;
  s.chosen = op;
  s.grade = op ? s.spec.grades[op.id] ?? null : null;
  s.phase = 'execute';
  s.execT = 0;
  s.decisionBall = { x: s.ball.pos.x, y: s.ball.pos.y };
  if (!op) return true;
  const me = human(s);
  for (const [slot, p] of Object.entries(s.grade?.responses ?? {})) {
    const a = actor(s, slot);
    if (a) a.goal = mirrorP(p, s.mirrored);
  }
  if (op.kind === 'pass' || op.kind === 'shoot' || op.kind === 'clear' || op.kind === 'short') {
    if (s.ball.owner === me.slot) kick(s, me, op);
    else me.goal = op.point;
  } else if (op.kind === 'press' || op.kind === 'track') {
    me.goal = null;
  } else {
    me.goal = op.point;
  }
  return true;
}

function kick(s: SituationState, from: SitActor, op: Pick<FixtureOption, 'kind' | 'toSlot' | 'point' | 'lofted'>): void {
  const b = s.ball;
  const t = actor(s, op.toSlot ?? null);
  // Lead a moving receiver: play it to where they are running.
  const dest = t ? (t.human && s.chosen ? s.chosen.point : t.goal ?? t.pos) : op.point;
  const shot = op.kind === 'shoot';
  const clear = op.kind === 'clear';
  const dx = dest.x - b.pos.x;
  const dy = dest.y - b.pos.y;
  const d = Math.hypot(dx, dy) || 1;
  // Pass pace that arrives at about jogging speed: v0^2 = v1^2 + 2*decel*d.
  const v = shot ? SIM.shotSpeed : clear ? 20 : Math.min(22, Math.sqrt(SIM.arrive * SIM.arrive + 2 * (op.lofted ? SIM.decel * 0.7 : SIM.decel) * d));
  b.vel = { x: (dx / d) * v, y: (dy / d) * v };
  b.owner = null;
  b.target = op.toSlot ?? null;
  b.passer = from.slot;
  b.lastTeam = teamOf(from.side);
  b.shot = shot;
  b.kickT = 0;
  b.travelled = 0;
  b.airUntil = op.lofted ? d * 0.75 : 0;
  s.events.push(`${op.kind}:${from.slot}->${op.toSlot ?? 'space'}`);
  const stop = s.grade?.stoppedBy ? actor(s, s.grade.stoppedBy) : undefined;
  if (stop) stop.goal = interceptPoint(b.pos, dest, stop.pos);
}

function npcActions(s: SituationState): void {
  const acts = s.grade?.then ?? [];
  for (let i = 0; i < acts.length; i++) {
    const n = acts[i]!;
    const key = `npc${i}`;
    if (s.events.includes(key) || s.execT < n.at || s.ball.owner !== n.from) continue;
    s.events.push(key);
    const from = actor(s, n.from)!;
    if (n.kind === 'carry') {
      if (n.point) from.goal = mirrorP(n.point, s.mirrored);
      continue;
    }
    kick(s, from, { kind: n.kind, ...(n.to ? { toSlot: n.to } : {}), ...(n.lofted ? { lofted: true } : {}), point: n.point ? mirrorP(n.point, s.mirrored) : actor(s, n.to)?.pos ?? from.pos });
  }
}

function nearestPresser(s: SituationState): SitActor | undefined {
  const o = actor(s, s.ball.owner);
  if (!o) return undefined;
  let best: SitActor | undefined;
  for (const a of s.actors) {
    if (teamOf(a.side) === teamOf(o.side) || a.side.startsWith('GK') || a.human || a.goal) continue;
    if (!best || distance(a.pos, o.pos) < distance(best.pos, o.pos)) best = a;
  }
  return best;
}

function tackles(s: SituationState): void {
  const o = actor(s, s.ball.owner);
  if (!o || (s.pending && s.pending.kind !== 'kept' && s.pending.kind !== 'progressed')) return;
  const allowed = new Set(s.grade?.tackle ?? []);
  if (s.grade?.stoppedBy) allowed.add(s.grade.stoppedBy);
  if ((s.chosen?.kind === 'press' || s.chosen?.kind === 'track') && !s.grade?.noTackle) allowed.add(human(s).slot);
  for (const a of s.actors) {
    if (!allowed.has(a.slot) || teamOf(a.side) === teamOf(o.side)) continue;
    if (distance(a.pos, s.ball.pos) <= 0.7) {
      s.ball.lastTeam = teamOf(o.side);
      o.stun = 0.8;
      take(s, a);
      return;
    }
  }
}

function interceptPoint(a: P, b: P, p: P): P {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0.1, 0.95);
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function moveTo(a: SitActor, goal: P, speed: number, dt: number): void {
  const dx = goal.x - a.pos.x;
  const dy = goal.y - a.pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) {
    a.vel = { x: 0, y: 0 };
    return;
  }
  const v = Math.min(speed, d / dt);
  a.vel = { x: (dx / d) * v, y: (dy / d) * v };
  a.pos.x += a.vel.x * dt;
  a.pos.y += a.vel.y * dt;
}

/** An authored NPC follow-up is still due from the current ball owner. */
function sequenceOpen(s: SituationState): boolean {
  return (s.grade?.then ?? []).some((n, i) => !s.events.includes(`npc${i}`) && s.ball.owner === n.from);
}

function end(s: SituationState, kind: OutcomeKind, text: string): void {
  // While an authored follow-up is still to play, the result is provisional.
  if (s.pending && s.pendingSoft) {
    s.pending = { kind, text };
    s.pendingSoft = sequenceOpen(s);
    s.settleT = 0;
    return;
  }
  // A reception can still be undone during the settle period (the marker wins it straight back).
  if (s.pending && !(s.pending.kind === 'kept' || s.pending.kind === 'progressed') ) return;
  if (s.pending && kind !== 'lost') return;
  s.pending = { kind, text };
  s.pendingSoft = sequenceOpen(s);
  s.settleT = 0;
}

function execution(s: SituationState): string {
  const op = s.chosen;
  if (!op) return 'No decision was made in time.';
  const me = human(s);
  const ev = s.events.find((e) => e.startsWith('received:') || e.startsWith('intercepted:') || e.startsWith('saved:') || e === 'goal' || e === 'out');
  if (op.kind === 'pass' || op.kind === 'short' || op.kind === 'clear') {
    if (!ev) return 'The ball was still travelling at the review point.';
    if (ev.startsWith('received:')) return `Execution: the ball reached ${actor(s, ev.slice(9))?.role ?? 'a teammate'}.`;
    if (ev.startsWith('intercepted:')) return `Execution: the ball was cut out by their ${actor(s, ev.slice(12))?.role ?? 'player'}.`;
    return 'Execution: the ball went out of play.';
  }
  if (op.kind === 'shoot') return ev === 'goal' ? 'Execution: the shot was on target and went in.' : ev?.startsWith('saved:') ? 'Execution: on target, the keeper saved it.' : 'Execution: the shot missed the target.';
  const target = op.kind === 'press' || op.kind === 'track' ? actor(s, op.toSlot)?.pos ?? op.point : op.point;
  const gap = distance(me.pos, target);
  return gap <= 1.6 ? 'Execution: you got there in time.' : `Execution: you were still ${gap.toFixed(0)} m short at the review point.`;
}

/** Advances the passage or the play-out by one fixed step. */
export function step(s: SituationState, dt = SIM.dt): void {
  if (s.phase === 'observe' || s.phase === 'explain') return;
  s.t += dt;
  const b = s.ball;
  if (s.phase === 'release') {
    for (const a of s.actors) if (a.goal) moveTo(a, a.goal, SIM.npcSpeed * 0.8, dt);
    const pb = s.spec.passageBall;
    if (pb && s.t >= pb.at && !s.events.includes('passage-ball') && b.owner === pb.from) {
      s.events.push('passage-ball');
      const from = actor(s, pb.from)!;
      kick(s, from, { kind: pb.kind, ...(pb.to ? { toSlot: pb.to } : {}), ...(pb.lofted ? { lofted: true } : {}), point: pb.point ? mirrorP(pb.point, s.mirrored) : actor(s, pb.to)?.pos ?? from.pos });
    }
    carry(s);
    if (b.owner === null) ballFlight(s, dt, false);
    if (s.t >= s.fixture.passageSeconds - 1e-9) {
      for (const a of s.actors) {
        a.vel = { x: 0, y: 0 };
        a.goal = null;
      }
      s.phase = 'observe';
    }
    return;
  }
  for (const a of s.actors) if (a.stun > 0) a.stun = Math.max(0, a.stun - dt);
  s.execT += dt;
  const op = s.chosen;
  npcActions(s);
  const ballPos = { x: b.pos.x, y: b.pos.y };
  for (const a of s.actors) {
    if (a.human) {
      if (op && (op.kind === 'press' || op.kind === 'track')) {
        const t = actor(s, op.toSlot);
        const p = t ? t.pos : op.point;
        moveTo(a, op.kind === 'press' ? approach(p, ballPos, 0.4) : goalSide(s, p), SIM.runSpeed, dt);
      } else if (a.goal) moveTo(a, a.goal, SIM.runSpeed, dt);
      else a.vel = { x: 0, y: 0 };
      continue;
    }
    if (b.owner === null && b.target === a.slot && !b.shot && Math.hypot(b.vel.x, b.vel.y) < 2) {
      moveTo(a, b.pos, SIM.npcSpeed * 0.5, dt);
      continue;
    }
    if (!a.goal && b.owner && teamOf(a.side) !== teamOf(actor(s, b.owner)!.side) && !a.side.startsWith('GK') && nearestPresser(s) === a) {
      moveTo(a, approach(b.pos, a.pos, 1.6), SIM.npcSpeed * 0.6, dt);
      continue;
    }
    const owner = actor(s, b.owner);
    if (s.grade?.stoppedBy === a.slot && owner && teamOf(owner.side) !== teamOf(a.side)) {
      moveTo(a, approach(owner.pos, a.pos, 0.3), SIM.npcSpeed, dt);
      continue;
    }
    if (a.goal) moveTo(a, a.goal, a.side.startsWith('GK') ? SIM.npcSpeed * 0.9 : SIM.npcSpeed, dt);
    else a.vel = { x: 0, y: 0 };
  }
  carry(s);
  tackles(s);
  if (b.owner === null) ballFlight(s, dt);
  if (s.pending) {
    if (s.pendingSoft && !sequenceOpen(s) && b.owner !== null) s.pendingSoft = false;
    if (!s.pendingSoft) s.settleT += dt;
    if (s.settleT >= SIM.settle || s.pending.kind === 'goal' || s.pending.kind === 'conceded' || s.pending.kind === 'out') finish(s);
    return;
  }
  if (s.execT >= s.fixture.playSeconds - 1e-9) {
    review(s);
    finish(s);
  }
}

function approach(target: P, from: P, gap: number): P {
  const dx = from.x - target.x;
  const dy = from.y - target.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: target.x + (dx / d) * gap, y: target.y + (dy / d) * gap };
}

/** Goal-side of a runner: between them and the goal the user's team defends. */
function goalSide(s: SituationState, p: P): P {
  const ours = s.fixture.goal === 'ours' ? HALF_L : -6;
  const gx = HALF_W / 2;
  const dx = gx - p.x;
  const dy = ours - p.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / d) * 1.5, y: p.y + (dy / d) * 1.5 };
}

function carry(s: SituationState): void {
  const o = actor(s, s.ball.owner);
  if (!o) return;
  const lead = Math.hypot(o.vel.x, o.vel.y) > 0.3 ? 0.5 : 0.35;
  const v = Math.hypot(o.vel.x, o.vel.y) || 1;
  s.ball.pos = { x: o.pos.x + (o.vel.x / v) * lead * (v > 0.3 ? 1 : 0), y: o.pos.y + (o.vel.y / v) * lead * (v > 0.3 ? 1 : 0) + (v > 0.3 ? 0 : 0.35) };
  s.ball.vel = { x: 0, y: 0 };
  s.ball.lastTeam = teamOf(o.side);
}

function ballFlight(s: SituationState, dt: number, live = true): void {
  const b = s.ball;
  b.kickT += dt;
  b.pos.x += b.vel.x * dt;
  b.pos.y += b.vel.y * dt;
  const sp = Math.hypot(b.vel.x, b.vel.y);
  b.travelled += sp * dt;
  if (!live) {
    const k = Math.max(0, sp - SIM.decel * (b.airUntil > b.travelled ? 0.6 : 1) * dt) / (sp || 1);
    b.vel.x *= k;
    b.vel.y *= k;
    return;
  }
  if (sp > 0) {
    const k = Math.max(0, sp - SIM.decel * (b.airUntil > b.travelled ? 0.6 : 1) * dt) / sp;
    b.vel.x *= k;
    b.vel.y *= k;
  }
  const top = s.fixture.goal;
  if (b.pos.y >= HALF_L) {
    const inGoal = Math.abs(b.pos.x - HALF_W / 2) <= GOAL_W / 2;
    if (inGoal) {
      if (!s.events.includes('goal')) s.events.push('goal');
      const scorer = b.lastTeam;
      b.vel = { x: 0, y: 0 };
      if (top === 'theirs' && scorer === 'A') return end(s, 'goal', 'Goal: the shot beat the keeper.');
      if (top === 'ours' && scorer === 'B') return end(s, 'conceded', 'They scored.');
      return end(s, top === 'ours' ? 'conceded' : 'goal', 'The ball ended in the net.');
    }
    if (!s.events.includes('out')) s.events.push('out');
    b.vel = { x: 0, y: 0 };
    return end(s, b.lastTeam === 'A' && top === 'ours' ? 'cleared' : 'out', b.lastTeam === 'A' && top === 'ours' ? 'Cleared over the goal line: danger gone, corner to them.' : 'The ball went over the goal line.');
  }
  if (b.pos.x < 0 || b.pos.x > HALF_W) {
    s.events.push('out');
    b.vel = { x: 0, y: 0 };
    const ours = b.lastTeam === 'A';
    return end(s, ours && top === 'ours' && s.chosen?.kind === 'clear' ? 'cleared' : 'out', ours ? 'The ball went out off us: their throw-in.' : 'The ball went out off them: our throw-in.');
  }
  if (b.pos.y < 0) {
    // Past halfway toward the other half: for build-out this is progress; the moment's review point.
    const a = s.actors.find((x) => x.slot === b.target);
    if (a && teamOf(a.side) === 'A') { b.owner = a.slot; s.events.push(`received:${a.slot}`); return end(s, 'progressed', 'The ball went forward over halfway to a teammate.'); }
    b.vel = { x: 0, y: 0 };
    return end(s, b.lastTeam === 'A' ? (top === 'ours' ? 'cleared' : 'lost') : 'held', 'The ball left this half.');
  }
  // Control: the keeper first, then the intended receiver, then anyone close enough (interceptions).
  if (b.kickT < 0.12 || b.travelled < b.airUntil) return;
  const candidates = s.actors
    .filter((a) => a.slot !== b.passer || b.kickT > 0.6)
    .filter((a) => !(a.human && s.grade?.noTackle))
    .filter((a) => a.stun <= 0)
    .map((a) => ({ a, d: distance(a.pos, b.pos), r: a.side.startsWith('GK') ? SIM.keeperReach : a.slot === b.target ? SIM.reach * 1.4 : SIM.reach }))
    .filter((c) => c.d <= c.r)
    .sort((p, q) => p.d - q.d);
  const c = candidates[0];
  if (c) take(s, c.a);
  else if (sp < 0.4) {
    b.vel = { x: 0, y: 0 };
    const near = s.actors.filter((a) => !a.human).sort((p, q) => distance(p.pos, b.pos) - distance(q.pos, b.pos))[0];
    if (near) near.goal = { x: b.pos.x, y: b.pos.y };
  }
}

function take(s: SituationState, a: SitActor): void {
  const b = s.ball;
  const team = teamOf(a.side);
  const was = b.lastTeam;
  const shot = b.shot;
  b.owner = a.slot;
  b.vel = { x: 0, y: 0 };
  b.shot = false;
  a.goal = null;
  const keeper = a.side.startsWith('GK');
  if (was === null && team === 'B') {
    s.events.push(`recovered:${a.slot}`);
    return;
  }
  if (team === was) {
    s.events.push(`received:${a.slot}`);
    if (team === 'B') return;
    const from = actor(s, b.passer);
    const gain = from ? (a.pos.y - from.start.y) * attackDir(s) : 0;
    return end(s, gain >= 8 ? 'progressed' : 'kept', gain >= 8 ? `${a.role} received it further forward.` : `${a.role} received it: we kept the ball.`);
  }
  if (shot && keeper) {
    s.events.push(`saved:${a.slot}`);
    return end(s, team === 'A' ? 'held' : 'saved', team === 'A' ? 'Our keeper gathered the shot.' : 'Their keeper saved it.');
  }
  s.events.push(`intercepted:${a.slot}`);
  if (team === 'A') return end(s, keeper ? 'held' : 'regained', keeper ? 'Our keeper collected it.' : `We won it back: ${a.role} intercepted.`);
  return end(s, 'lost', `Their ${a.role} cut it out.`);
}

/** Review point reached without a ball event: read the state. */
function review(s: SituationState): void {
  if (s.pending) return;
  const b = s.ball;
  const o = actor(s, b.owner);
  const dir = attackDir(s);
  if (!s.chosen) return end(s, 'held', 'No decision: the moment passed.');
  if (!o) return end(s, b.lastTeam === 'A' ? 'kept' : 'held', 'The ball was loose at the review point.');
  const team = teamOf(o.side);
  const start = actor(s, s.startOwner)?.start ?? o.start;
  if (team === 'A') {
    const gain = (b.pos.y - start.y) * dir;
    if (s.startTeam === 'B') return end(s, 'regained', 'We have the ball back.');
    return end(s, gain >= 8 ? 'progressed' : 'kept', gain >= 8 ? 'We moved the ball forward and kept it.' : 'We kept the ball.');
  }
  if (s.startTeam === 'A') return end(s, 'lost', 'They have the ball.');
  const their = (b.pos.y - (s.decisionBall ?? start).y) * -dir;
  // A defender right beside him on the goal side still has him: that is delay, not beaten.
  const marked = s.actors.some((a) => teamOf(a.side) === 'A' && !a.side.startsWith('GK') && !(a.human && s.grade?.noTackle) && (a.pos.y - b.pos.y) * -dir > 0 && distance(a.pos, b.pos) < 2);
  const danger = !marked && (s.fixture.goal === 'ours' ? b.pos.y > HALF_L - 16 : b.pos.y < 6);
  const broke = their >= 12 && !marked;
  return end(s, (their > 5 && danger) || broke ? 'beaten' : 'delayed', (their > 5 && danger) || broke ? 'They got forward past our cover.' : 'They kept it but could not go forward: delayed.');
}

function finish(s: SituationState): void {
  const p = s.pending ?? { kind: 'held' as OutcomeKind, text: 'Review point.' };
  s.outcome = { kind: p.kind, text: p.text, execution: execution(s) };
  s.phase = 'explain';
  for (const a of s.actors) a.vel = { x: 0, y: 0 };
}

/** Runs the passage to the freeze. */
export function toDecision(s: SituationState): SituationState {
  let guard = 0;
  while (s.phase === 'release' && guard++ < 6000) step(s);
  return s;
}

/** Plays the chosen option to the review point (headless). */
export function playOut(s: SituationState, optionId: string | null): SituationState {
  toDecision(s);
  choose(s, optionId);
  let guard = 0;
  while (s.phase === 'execute' && guard++ < 60 * 20) step(s);
  return s;
}

// ---- reads used by cues, hints and the geometry checks in tests -----------------------------------

const segDist = (a: P, b: P, p: P): number => distance(interceptPoint(a, b, p), p);

/** Closest opponent of `from`'s team to the straight lane from a to b (metres). */
export function laneGap(s: SituationState, a: P, b: P, team: 'A' | 'B'): number {
  let best = Infinity;
  for (const o of s.actors) if (teamOf(o.side) !== team && !o.side.startsWith('GK')) best = Math.min(best, segDist(a, b, o.pos));
  return best;
}

export function pressureOn(s: SituationState, slot: string): SitActor[] {
  const a = actor(s, slot);
  if (!a) return [];
  return s.actors.filter((o) => teamOf(o.side) !== teamOf(a.side) && distance(o.pos, a.pos) <= SIM.pressure);
}
