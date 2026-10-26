/**
 * Small-sided tactical drill: a framework-free, fixed-step simulation of one v1.2 scenario definition.
 * Positions are metres in the practice frame: side A attacks toward x = length, B toward x = 0.
 * The human makes every assessed decision; NPCs only react to what they can see.
 */
import { clamp, distance, distanceToSegment, type MutableVec2 } from '../math';
import type { Vec2 } from '../vec';
import { createRng } from '../rng';
import type { ScenarioDefinition, Target } from './ref/seasons.mjs';
import type { Slot } from './ref/engine.mjs';

export const DRILL = {
  dt: 1 / 60,
  runSpeed: 5.6,
  npcSpeed: 5.2,
  passSpeed: 13,
  shotSpeed: 18,
  friction: 0.6,
  reach: 1.1,
  control: 0.9,
  carryMetres: 6,
  executeSeconds: 3.2,
  /** After a change of possession, play continues this long so the regaining side can counter. */
  counterSeconds: 3,
  /** A gate counts when its team controls the ball within this distance of the gate line. */
  gateReach: 1.5,
  /** Host goal width in metres (U11 9v9: 6.4 m / 7 yd). */
  goalWidth: 6.4,
  pressure: 3,
} as const;

export interface DrillActor {
  readonly slot: string;
  readonly side: Slot;
  readonly human: boolean;
  task: string;
  readonly start: Vec2;
  pos: MutableVec2;
  vel: MutableVec2;
  goal: MutableVec2 | null;
}

export type Team = 'A' | 'B';
export const teamOf = (side: Slot): Team | 'N' => (side === 'A' || side === 'GK_A' ? 'A' : side === 'B' || side === 'GK_B' ? 'B' : 'N');

export type OptionKind = 'pass' | 'carry' | 'shoot' | 'support' | 'width' | 'run' | 'short' | 'press' | 'delay' | 'cover' | 'recover' | 'set' | 'sweep';
export interface DrillOption {
  readonly id: string;
  readonly kind: OptionKind;
  readonly label: string;
  /** Receiver slot (pass) or where the human goes (movement options). */
  readonly toSlot?: string;
  readonly point: Vec2;
}
export interface Assessment {
  readonly quality: number;
  readonly good: boolean;
  /** Plain observed reasons, cited back in the explanation. */
  readonly reasons: readonly string[];
}

export type DrillPhase = 'release' | 'observe' | 'execute' | 'explain';
export interface DrillOutcome {
  readonly kind: 'kept' | 'lost' | 'scored' | 'conceded' | 'regained' | 'out' | 'held';
  readonly text: string;
}

export interface DrillState {
  readonly def: ScenarioDefinition;
  readonly L: number;
  readonly W: number;
  readonly actors: DrillActor[];
  readonly ball: {
    pos: MutableVec2; vel: MutableVec2; owner: string | null; lastTeam: Team | 'N' | null; target: string | null;
    /** Where the ball was last struck from (shot-origin rules), and by whom (it cannot re-trap its own pass at once). */
    origin: Vec2 | null;
    passer: string | null;
    /** The team a neutral on the ball is playing for (the side that passed to it). */
    neutralFor: Team | null;
  };
  readonly targets: readonly (Target & { cx: number; cy: number; half: number })[];
  phase: DrillPhase;
  t: number;
  execT: number;
  chosen: DrillOption | null;
  outcome: DrillOutcome | null;
  /** Who the first defender presses during the release: the holder or an outlet (seeded per attempt). */
  pressSlot: string | null;
  /** Seconds since the ball last changed owner (a fresh receiver is protected briefly). */
  holdT: number;
  /** Seconds of NPC movement left before play freezes for the decision. */
  releaseLeft: number;
  /** Possession team when the decision was made, for outcome classification. */
  startTeam: Team | 'N' | null;
  /** Seconds this attempt plays for; extended once when possession changes. */
  execLimit: number;
  /** Possession changed during this attempt: play continues as a transition. */
  turnover: boolean;
}

const v = (x: number, y: number): MutableVec2 => ({ x, y });

/** Stage a scenario. `variation` > 0 moves opponents and teammates within a few metres (seeded) to test transfer. */
export function createDrill(def: ScenarioDefinition, seed: number, variation = 0): DrillState {
  const L = def.pitch.length;
  const W = def.pitch.width;
  const rng = createRng(seed);
  const jitter = (m: number): number => (rng() * 2 - 1) * m * variation;
  const actors: DrillActor[] = def.actors.map((a) => {
    const keeper = a.side.startsWith('GK');
    const x = clamp(a.x * L + (a.human || keeper ? 0 : jitter(2.5)), 0.5, L - 0.5);
    const y = clamp(a.y * W + (a.human || keeper ? 0 : jitter(3)), 0.5, W - 0.5);
    return { slot: a.slot, side: a.side, human: a.human === true, task: a.task, start: { x, y }, pos: v(x, y), vel: v(0, 0), goal: null };
  });
  const owner = actors.find((a) => a.slot === def.ball.ownerSlot) ?? actors[0]!;
  const targets = def.targets.map((t) => {
    const width = t.width === 'host-goal-width' ? DRILL.goalWidth : t.widthMeters ?? W;
    return { ...t, cx: t.x * L, cy: t.type === 'end-zone' ? W / 2 : (t.y ?? 0.5) * W, half: t.type === 'end-zone' ? W / 2 : width / 2 };
  });
  const outlets = actors.filter((a) => a !== owner && teamOf(a.side) === teamOf(owner.side) && !a.side.startsWith('GK'));
  const press = actors.filter((a) => teamOf(a.side) !== teamOf(owner.side) && teamOf(a.side) !== 'N' && !a.side.startsWith('GK'))
    .sort((a, b) => distance(a.pos, owner.pos) - distance(b.pos, owner.pos))[0];
  const nearOutlet = press ? outlets.sort((a, b) => distance(a.pos, press.pos) - distance(b.pos, press.pos))[0] : undefined;
  const pressSlot = nearOutlet && (owner.side.startsWith('GK') || rng() < 0.5) ? nearOutlet.slot : owner.slot;
  return {
    def, L, W, actors, targets, pressSlot, holdT: 0, releaseLeft: 1.4 + rng() * 0.8,
    ball: { pos: v(owner.pos.x, owner.pos.y), vel: v(0, 0), owner: owner.slot, lastTeam: teamOf(owner.side), target: null, origin: null, passer: null, neutralFor: null },
    phase: 'release', t: 0, execT: 0, chosen: null, outcome: null, startTeam: teamOf(owner.side), execLimit: DRILL.executeSeconds, turnover: false,
  };
}

export const human = (s: DrillState): DrillActor => s.actors.find((a) => a.human)!;
export const actor = (s: DrillState, slot: string | null): DrillActor | undefined => s.actors.find((a) => a.slot === slot);
const opponents = (s: DrillState, team: Team | 'N'): DrillActor[] => s.actors.filter((a) => { const t = teamOf(a.side); return t !== team && t !== 'N'; });
/** The team an actor plays for right now: a neutral on the ball supports the side that gave it the ball. */
const playsFor = (s: DrillState, a: DrillActor): Team | 'N' => (teamOf(a.side) === 'N' ? (s.ball.owner === a.slot && s.ball.neutralFor) || 'N' : teamOf(a.side));
const mates = (s: DrillState, a: DrillActor): DrillActor[] => { const t = playsFor(s, a); return s.actors.filter((b) => b !== a && (teamOf(b.side) === t || teamOf(b.side) === 'N')); };
/** A finish counts only if struck from inside the target's allowed end distance (S1: last 5 m). */
const originOk = (t: Target & { cx: number }, from: Vec2 | null): boolean => t.shotOriginWithinEndMeters === undefined || (from !== null && Math.abs(from.x - t.cx) <= t.shotOriginWithinEndMeters);
/** Distance from p to the closest opponent of `team`. */
export const pressureOn = (s: DrillState, p: Vec2, team: Team | 'N'): number => Math.min(99, ...opponents(s, team).map((o) => distance(o.pos, p)));
/** The targets a team scores in. */
const ownTargets = (s: DrillState, team: Team | 'N') => s.targets.filter((t) => t.scoresFor === team);
const forward = (team: Team | 'N'): number => (team === 'B' ? -1 : 1);

/** Clearance of a pass lane: how far the nearest opponent stands from the line, less how far it can close while the ball travels. */
export function laneClearance(s: DrillState, from: Vec2, to: Vec2, team: Team | 'N'): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  let worst = 99;
  for (const o of opponents(s, team)) {
    if (o.side.startsWith('GK') && distance(o.pos, to) > 6) continue;
    // Where the opponent meets the line, and how long the ball takes to get there.
    const along = clamp(((o.pos.x - from.x) * dx + (o.pos.y - from.y) * dy) / d, 0, d);
    if (along < 1) continue; // already behind the ball as it is struck
    const time = along / DRILL.passSpeed;
    worst = Math.min(worst, distanceToSegment(o.pos, from, to) - (DRILL.reach + time * DRILL.npcSpeed * 0.6));
  }
  return worst;
}

/** The tactical choices available to the human right now. Every option is a real, executable action. */
export function options(s: DrillState): DrillOption[] {
  const me = human(s);
  const team = teamOf(me.side);
  const f = forward(team);
  const keeper = me.side.startsWith('GK');
  const holder = actor(s, s.ball.owner);
  const out: DrillOption[] = [];
  const clampP = (x: number, y: number): Vec2 => ({ x: clamp(x, 1, s.L - 1), y: clamp(y, 1, s.W - 1) });
  if (s.ball.owner === me.slot) {
    for (const m of mates(s, me)) out.push({ id: `pass-${m.slot}`, kind: 'pass', label: `Pass to ${label(m)}`, toSlot: m.slot, point: { x: m.pos.x, y: m.pos.y } });
    if (!keeper) {
      const lanes = [-0.35, 0, 0.35].map((dy) => clampP(me.pos.x + f * DRILL.carryMetres, me.pos.y + dy * DRILL.carryMetres * 1.4));
      const best = lanes.reduce((a, b) => (pressureOn(s, b, team) > pressureOn(s, a, team) ? b : a));
      out.push({ id: 'carry', kind: 'carry', label: 'Carry forward', point: best });
      for (const t of ownTargets(s, team)) {
        const d = Math.abs(t.cx - me.pos.x);
        if (t.type === 'gate') out.push({ id: `gate-${Math.round(t.cy)}`, kind: 'carry', label: `Dribble out through the ${t.cy < s.W / 2 ? 'left' : 'right'} gate`, point: clampP(t.cx, t.cy) });
        else if (d <= (t.shotOriginWithinEndMeters ?? 22) && t.type !== 'end-zone') out.push({ id: `shoot-${Math.round(t.cy)}`, kind: 'shoot', label: t.type === 'goal' ? 'Shoot' : `Finish ${t.cy < s.W / 2 ? 'left' : 'right'} ${t.type}`, point: { x: t.cx, y: t.cy } });
      }
    }
    return out;
  }
  const ourBall = holder !== undefined && (teamOf(holder.side) === team || teamOf(holder.side) === 'N');
  const ball = s.ball.pos;
  if (keeper) {
    const goal = ownTargets(s, team === 'A' ? 'B' : 'A').find((t) => t.type === 'goal');
    const gx = goal?.cx ?? (team === 'A' ? 0 : s.L);
    const gy = goal?.cy ?? s.W / 2;
    const dx = ball.x - gx;
    const dy = ball.y - gy;
    const dd = Math.hypot(dx, dy) || 1;
    out.push({ id: 'set', kind: 'set', label: 'Set your position', point: clampP(gx + (dx / dd) * 2, gy + (dy / dd) * 2) });
    if (ourBall) out.push({ id: 'support', kind: 'support', label: 'Offer an angle behind', point: clampP(gx + f * 4, ball.y + (ball.y < gy ? 5 : -5)) });
    else out.push({ id: 'sweep', kind: 'sweep', label: 'Step out to meet it', point: clampP(gx + (dx / dd) * Math.min(9, dd - 1), gy + (dy / dd) * Math.min(9, dd - 1)) });
    out.push({ id: 'hold', kind: 'set', label: 'Stay on the goal line', point: clampP(gx + f * 0.5, gy) });
    return out;
  }
  if (ourBall && holder) {
    const side = me.pos.y < holder.pos.y ? -1 : 1;
    out.push({ id: 'support', kind: 'support', label: 'Show for the ball', point: angleSpot(s, me, holder) });
    out.push({ id: 'width', kind: 'width', label: 'Hold width', point: clampP(me.pos.x + f * 2, side < 0 ? 2 : s.W - 2) });
    out.push({ id: 'run', kind: 'run', label: 'Run beyond', point: clampP(me.pos.x + f * 9, me.pos.y) });
    out.push({ id: 'short', kind: 'short', label: 'Come short to the ball', point: clampP(holder.pos.x + f * 2.5, holder.pos.y + side * 2.5) });
    return out;
  }
  const danger = ownTargets(s, team === 'A' ? 'B' : 'A');
  const goalP = danger.length ? danger.reduce((a, b) => (Math.hypot(b.cx - ball.x, b.cy - ball.y) < Math.hypot(a.cx - ball.x, a.cy - ball.y) ? b : a)) : { cx: team === 'A' ? 0 : s.L, cy: s.W / 2 };
  const toGoal = { x: goalP.cx - ball.x, y: goalP.cy - ball.y };
  const dg = Math.hypot(toGoal.x, toGoal.y) || 1;
  out.push({ id: 'press', kind: 'press', label: 'Press the ball', point: clampP(ball.x + (toGoal.x / dg) * 0.9, ball.y + (toGoal.y / dg) * 0.9) });
  out.push({ id: 'delay', kind: 'delay', label: 'Stay goal-side', point: clampP(ball.x + (toGoal.x / dg) * 3.5, ball.y + (toGoal.y / dg) * 3.5) });
  const threat = opponents(s, team).filter((o) => o.slot !== s.ball.owner && !o.side.startsWith('GK')).sort((a, b) => distance(a.pos, { x: goalP.cx, y: goalP.cy }) - distance(b.pos, { x: goalP.cx, y: goalP.cy }))[0];
  // Name the runner for what it is: only "inside" when it is nearer the goal than the ball.
  const inside = threat && distance(threat.pos, { x: goalP.cx, y: goalP.cy }) < distance(ball, { x: goalP.cx, y: goalP.cy });
  if (threat) out.push({ id: 'cover', kind: 'cover', label: inside ? 'Mark the inside runner' : 'Mark the other attacker', point: clampP((threat.pos.x + goalP.cx) / 2 * 0.4 + threat.pos.x * 0.6, (threat.pos.y + goalP.cy) / 2) });
  out.push({ id: 'recover', kind: 'recover', label: 'Drop toward goal', point: clampP(goalP.cx + Math.sign(ball.x - goalP.cx || f) * 5, goalP.cy) });
  return out;
}

const label = (a: DrillActor): string => (a.side.startsWith('GK') ? 'keeper' : a.side === 'N' ? 'neutral' : `teammate ${a.slot}`);

/** A spot out of the nearest defender's cover shadow, 6-9 m from the holder. */
function angleSpot(s: DrillState, me: DrillActor, holder: DrillActor): Vec2 {
  const team = teamOf(me.side);
  let best: Vec2 = me.pos;
  let bestScore = -99;
  for (let a = -1.2; a <= 1.2; a += 0.3) {
    for (const r of [6, 8]) {
      const f = forward(team);
      const p = { x: clamp(holder.pos.x + Math.cos(a) * r * f, 1, s.L - 1), y: clamp(holder.pos.y + Math.sin(a) * r, 1, s.W - 1) };
      const score = Math.min(4, laneClearance(s, holder.pos, p, team)) + Math.min(4, pressureOn(s, p, team)) * 0.5 - distance(me.pos, p) * 0.15;
      if (score > bestScore) { bestScore = score; best = p; }
    }
  }
  return best;
}

/**
 * Judge an option from the snapshot at the moment of choice. Outcome never enters this score.
 * Several options can be good: any option within 0.15 of the best is accepted.
 */
export function assessAll(s: DrillState): Map<string, Assessment> {
  const raw = options(s).map((o) => [o, rate(s, o)] as const);
  const best = Math.max(...raw.map(([, r]) => r.quality));
  return new Map(raw.map(([o, r]) => [o.id, { ...r, good: r.quality >= 0.5 && r.quality >= best - 0.15 }]));
}

function rate(s: DrillState, o: DrillOption): { quality: number; reasons: string[] } {
  const me = human(s);
  const team = teamOf(me.side);
  const f = forward(team);
  const reasons: string[] = [];
  const ball = s.ball.pos;
  const myPressure = pressureOn(s, me.pos, team);
  switch (o.kind) {
    case 'pass': {
      const lane = laneClearance(s, me.pos, o.point, team);
      const recv = pressureOn(s, o.point, team);
      const gain = (o.point.x - me.pos.x) * f;
      const central = Math.abs(o.point.y - s.W / 2) < s.W * 0.18 && gain < 0 && lane < 1.5;
      let q = 0.3 + clamp(lane, -2, 2) * 0.12 + clamp(recv - DRILL.pressure, -2, 3) * 0.05 + clamp(gain / 10, -0.3, 0.15);
      if (myPressure < DRILL.pressure) q += 0.08;
      reasons.push(lane > 0.8 ? 'the passing lane was open' : lane > 0 ? 'the lane was tight' : 'a defender was in the passing lane');
      reasons.push(recv > DRILL.pressure + 1 ? 'the receiver had time on the ball' : recv < DRILL.pressure ? 'the receiver was already under pressure' : 'the receiver had a defender close');
      if (gain > 4) reasons.push('it moved the ball forward');
      if (central) { q -= 0.25; reasons.push('a loose pass there gives the ball away in front of your goal'); }
      return { quality: clamp(q, 0, 1), reasons };
    }
    case 'carry': {
      const space = pressureOn(s, o.point, team);
      const q = 0.25 + clamp(space - 2, -1, 4) * 0.12 + (myPressure > DRILL.pressure ? 0.1 : -0.1);
      reasons.push(space > 5 ? 'there was open space ahead to carry into' : 'a defender was close to the space ahead');
      if (myPressure < DRILL.pressure) reasons.push('you were already under pressure');
      return { quality: clamp(q, 0, 1), reasons };
    }
    case 'shoot': {
      const d = distance(me.pos, o.point);
      const lane = laneClearance(s, me.pos, o.point, team);
      const q = 0.2 + clamp((14 - d) / 14, 0, 1) * 0.45 + clamp(lane, -1.5, 1.5) * 0.15;
      reasons.push(d < 9 ? 'you were close enough to score' : 'it was a long way out');
      reasons.push(lane > 0.5 ? 'nobody was blocking the shot' : 'a defender was blocking the shot');
      return { quality: clamp(q, 0, 1), reasons };
    }
    case 'support': case 'width': case 'run': case 'short': {
      const holder = actor(s, s.ball.owner);
      if (!holder) return { quality: 0.3, reasons: ['nobody had the ball'] };
      if (me.side.startsWith('GK')) {
        const lane = laneClearance(s, holder.pos, o.point, team);
        reasons.push(lane > 0.8 ? 'it gave the holder a safe way back' : 'the way back to you was blocked');
        return { quality: clamp(0.5 + clamp(lane, -2, 2) * 0.18, 0, 1), reasons };
      }
      const lane = laneClearance(s, holder.pos, o.point, team);
      const free = pressureOn(s, o.point, team);
      const crowd = Math.min(99, ...mates(s, me).filter((m) => m !== holder).map((m) => distance(m.pos, o.point)));
      let q = 0.35 + clamp(lane, -2, 2) * 0.12 + clamp(free - 2, -1, 4) * 0.06 + (crowd < 4 ? -0.2 : 0.05);
      if (o.kind === 'run') {
        const holderFree = pressureOn(s, holder.pos, team) > DRILL.pressure;
        q += holderFree ? 0.1 : -0.15;
        reasons.push(holderFree ? 'the holder had time to play it in behind' : 'the holder was under pressure and needed a closer option');
      }
      if (o.kind === 'short') q += pressureOn(s, holder.pos, team) < DRILL.pressure ? 0.1 : -0.05;
      reasons.push(lane > 0.8 ? 'the holder could pass to you' : 'a defender blocked the pass to you');
      if (crowd < 4) reasons.push('a teammate was already in that space');
      return { quality: clamp(q, 0, 1), reasons };
    }
    case 'press': case 'delay': case 'cover': case 'recover': {
      const holder = actor(s, s.ball.owner);
      const cover = mates(s, me).filter((m) => !m.side.startsWith('GK') && teamOf(m.side) === team);
      const covered = cover.some((m) => (m.pos.x - ball.x) * f < 0 && distance(m.pos, ball) < 10);
      const iAmNearest = cover.every((m) => distance(m.pos, ball) >= distance(me.pos, ball));
      const runners = opponents(s, team).filter((x) => x.slot !== s.ball.owner && !x.side.startsWith('GK'));
      const dist = distance(me.pos, ball);
      let q = 0.4;
      if (o.kind === 'press') {
        q += (covered ? 0.2 : -0.15) + (dist < 6 ? 0.15 : -0.15) + (iAmNearest ? 0.05 : -0.2);
        reasons.push(covered ? 'a teammate was covering behind you' : 'nobody was covering behind you');
        reasons.push(dist < 6 ? 'you were close enough to get there in time' : 'you were too far away to arrive in time');
      } else if (o.kind === 'delay') {
        q += (iAmNearest ? 0.2 : -0.1) + (covered ? 0 : 0.15) + (runners.length > 0 ? 0.05 : 0);
        reasons.push(iAmNearest ? 'you were the nearest defender' : 'a teammate was nearer the ball');
        if (!covered) reasons.push('slowing the attack gave your teammates time to recover');
      } else if (o.kind === 'cover') {
        q += (!iAmNearest ? 0.25 : -0.2) + (runners.length > 0 ? 0.1 : -0.2);
        reasons.push(!iAmNearest ? 'a teammate was already pressing the ball' : 'you were the nearest defender, so the ball was left free');
        if (runners.length) reasons.push('it took away the pass to the runner');
      } else {
        q += (dist > 10 ? 0.2 : -0.1) + (covered ? -0.1 : 0.1);
        reasons.push(dist > 10 ? 'you were too far away to press' : 'you were close enough to do more than drop off');
      }
      if (holder && holder.side.startsWith('GK')) q -= 0.05;
      return { quality: clamp(q, 0, 1), reasons };
    }
    case 'set': case 'sweep': {
      const d = distance(ball, o.point);
      const holder = actor(s, s.ball.owner);
      const near = holder ? pressureOn(s, holder.pos, teamOf(holder.side)) : 99;
      let q = 0.45;
      if (o.kind === 'sweep') { q += d < 7 && near > 2 ? 0.25 : -0.2; reasons.push(d < 7 ? 'you could get there before the attacker' : 'the attacker would get there first'); }
      else if (o.id === 'set') { q += 0.2; reasons.push('it covered the near post and the far post'); }
      else { q += d > 12 ? 0.1 : -0.15; reasons.push(d > 12 ? 'the ball was still far away' : 'staying on the line left the angle open'); }
      return { quality: clamp(q, 0, 1), reasons };
    }
  }
}

/** Commit the human's choice and play it out. Returns false when the option is not offered right now. */
export function choose(s: DrillState, optionId: string): boolean {
  if (s.phase !== 'observe') return false;
  const o = options(s).find((x) => x.id === optionId);
  if (!o) return false;
  s.chosen = o;
  s.phase = 'execute';
  s.execT = 0;
  s.execLimit = DRILL.executeSeconds;
  s.turnover = false;
  s.startTeam = s.ball.owner ? teamOf(actor(s, s.ball.owner)!.side) : null;
  const me = human(s);
  if (o.kind === 'pass' || o.kind === 'shoot') kick(s, me, o.point, o.kind === 'shoot' ? DRILL.shotSpeed : DRILL.passSpeed, o.toSlot ?? null);
  // After passing, the player follows the pass a few metres to stay available (keepers hold their line).
  if (o.kind === 'pass' && !me.side.startsWith('GK')) me.goal = { x: clamp(me.pos.x + forward(teamOf(me.side)) * 3, 1, s.L - 1), y: me.pos.y };
  else me.goal = { x: o.point.x, y: o.point.y };
  return true;
}

function kick(s: DrillState, from: DrillActor, to: Vec2, speed: number, target: string | null): void {
  const recv = target ? actor(s, target) : undefined;
  // Lead a moving receiver slightly.
  const aim = recv?.goal ? { x: to.x + (recv.goal.x - to.x) * 0.3, y: to.y + (recv.goal.y - to.y) * 0.3 } : to;
  const dx = aim.x - from.pos.x;
  const dy = aim.y - from.pos.y;
  const d = Math.hypot(dx, dy) || 1;
  // Speed so the ball arrives near `aim` under friction, capped at `speed`.
  const sp = Math.min(speed, Math.sqrt(2 * DRILL.friction * 9.8 * d) + 2);
  s.ball.owner = null;
  s.ball.target = target;
  s.ball.lastTeam = teamOf(from.side);
  s.ball.origin = { x: from.pos.x, y: from.pos.y };
  s.ball.passer = from.slot;
  s.ball.pos = { x: from.pos.x + (dx / d) * 0.6, y: from.pos.y + (dy / d) * 0.6 };
  s.ball.vel = { x: (dx / d) * sp, y: (dy / d) * sp };
}

/** NPC intention from what it can see: the ball, its marker duties and its task. Never the human's input. */
function npcGoal(s: DrillState, a: DrillActor): Vec2 {
  const team = teamOf(a.side);
  const ball = s.ball.pos;
  const holder = actor(s, s.ball.owner);
  const holderTeam = holder ? teamOf(holder.side) : null;
  const f = forward(team === 'N' ? 'A' : team);
  if (a.side.startsWith('GK')) {
    const gx = a.side === 'GK_A' ? 0.6 : s.L - 0.6;
    const gy = s.W / 2;
    const dx = ball.x - gx;
    const dy = ball.y - gy;
    const dd = Math.hypot(dx, dy) || 1;
    return { x: gx + (dx / dd) * Math.min(2, dd), y: gy + (dy / dd) * Math.min(2, dd) };
  }
  if (holder === a) {
    // Carry toward the nearest target this team scores in.
    const goals = ownTargets(s, team);
    const g = goals.length ? goals.reduce((p, q) => (Math.hypot(q.cx - a.pos.x, q.cy - a.pos.y) < Math.hypot(p.cx - a.pos.x, p.cy - a.pos.y) ? q : p)) : null;
    const presser = opponents(s, team).filter((o) => !o.side.startsWith('GK')).sort((p, q) => distance(p.pos, a.pos) - distance(q.pos, a.pos))[0];
    const aim = g ? { x: g.cx, y: g.cy } : { x: a.pos.x + f * 2, y: a.pos.y };
    // Dribble away from a close presser rather than into it.
    if (presser && distance(presser.pos, a.pos) < 2.5) {
      const away = { x: a.pos.x - presser.pos.x, y: a.pos.y - presser.pos.y };
      return { x: clamp(a.pos.x + away.x * 1.5 + f, 1, s.L - 1), y: clamp(a.pos.y + away.y * 1.5, 1, s.W - 1) };
    }
    return { x: clamp(aim.x, 1, s.L - 1), y: clamp(aim.y, 1, s.W - 1) };
  }
  const attacking = holderTeam === team || (team === 'N' && holderTeam !== null);
  if (attacking || (!holder && s.ball.lastTeam === team)) {
    if (s.ball.target === a.slot) return { x: ball.x, y: ball.y };
    // Support: keep a distinct angle near the start, shifted toward the ball side.
    return { x: clamp(a.start.x + (ball.x - a.start.x) * 0.25, 1, s.L - 1), y: clamp(a.start.y + (ball.y - a.start.y) * 0.2, 1, s.W - 1) };
  }
  // Defending: nearest presses (or chases a loose ball), next covers inside, others mark.
  const defenders = s.actors.filter((d) => teamOf(d.side) === team && !d.side.startsWith('GK')).sort((x, y) => distance(x.pos, ball) - distance(y.pos, ball));
  const rank = defenders.indexOf(a);
  const goalX = team === 'A' ? 0 : s.L;
  if (rank === 0 && !(defenders[0]?.human)) {
    const mark = s.phase === 'release' ? actor(s, s.pressSlot) : undefined;
    if (mark && mark !== holder) return { x: mark.pos.x - f * 1.2, y: mark.pos.y };
    return { x: ball.x - f * 0.8, y: ball.y };
  }
  if (rank <= 1) return { x: (ball.x + goalX) / 2 + (ball.x - goalX) * 0.2, y: (ball.y + s.W / 2) / 2 };
  const mark = s.actors.filter((o) => teamOf(o.side) !== team && teamOf(o.side) !== 'N' && o !== holder && !o.side.startsWith('GK'))
    .sort((x, y) => distance(x.pos, a.pos) - distance(y.pos, a.pos))[0];
  return mark ? { x: mark.pos.x - f * 1.5, y: mark.pos.y } : a.start;
}

function moveToward(a: DrillActor, g: Vec2, speed: number, dt: number): void {
  const dx = g.x - a.pos.x;
  const dy = g.y - a.pos.y;
  const d = Math.hypot(dx, dy);
  const sp = d < 0.05 ? 0 : Math.min(speed, d / dt);
  a.vel = d < 0.05 ? { x: 0, y: 0 } : { x: (dx / d) * sp, y: (dy / d) * sp };
  a.pos = { x: a.pos.x + a.vel.x * dt, y: a.pos.y + a.vel.y * dt };
}

/** One fixed step. Only the execute phase moves; observe and explain are frozen decision screens. */
export function step(s: DrillState, dt = DRILL.dt): void {
  if (s.phase === 'release') {
    s.t += dt;
    for (const a of s.actors) if (!a.human && a.slot !== s.ball.owner) moveToward(a, npcGoal(s, a), a.side.startsWith('GK') ? 4 : DRILL.npcSpeed, dt);
    s.releaseLeft -= dt;
    if (s.releaseLeft <= 0) { s.phase = 'observe'; for (const a of s.actors) a.vel = { x: 0, y: 0 }; }
    return;
  }
  if (s.phase !== 'execute') return;
  s.t += dt;
  s.execT += dt;
  const me = human(s);
  for (const a of s.actors) {
    if (a.human) {
      if (s.ball.owner === a.slot && a.goal) moveToward(a, a.goal, DRILL.runSpeed * 0.85, dt);
      else if (a.goal) moveToward(a, a.goal, DRILL.runSpeed, dt);
      continue;
    }
    const carrying = s.ball.owner === a.slot;
    moveToward(a, npcGoal(s, a), a.side.startsWith('GK') ? 4 : carrying ? DRILL.npcSpeed * 0.75 : DRILL.npcSpeed, dt);
  }
  const b = s.ball;
  s.holdT += dt;
  npcRelease(s);
  const holder = actor(s, b.owner);
  if (holder) {
    b.pos = { x: holder.pos.x + (holder.vel.x ? Math.sign(holder.vel.x) * 0.4 : 0), y: holder.pos.y };
    // A defender at the ball's feet wins it physically.
    const tackler = s.holdT > 0.35 ? s.actors.find((o) => teamOf(o.side) !== teamOf(holder.side) && teamOf(o.side) !== 'N' && distance(o.pos, b.pos) < 0.75) : undefined;
    if (tackler) { b.owner = tackler.slot; b.lastTeam = teamOf(tackler.side); s.holdT = 0; }
  } else {
    b.pos = { x: b.pos.x + b.vel.x * dt, y: b.pos.y + b.vel.y * dt };
    const sp = Math.hypot(b.vel.x, b.vel.y);
    const nsp = Math.max(0, sp - DRILL.friction * 9.8 * dt);
    b.vel = sp > 0 ? { x: (b.vel.x / sp) * nsp, y: (b.vel.y / sp) * nsp } : b.vel;
    const crossed = s.targets.find((t) => ((t.type === 'goal' || t.type === 'mini-goal') && Math.abs(b.pos.x - t.cx) < 0.4 && Math.abs(b.pos.y - t.cy) <= t.half) && b.lastTeam === t.scoresFor && originOk(t, b.origin));
    if (crossed) return finish(s, crossed.scoresFor === teamOf(me.side) ? 'scored' : 'conceded');
    if (b.pos.x < 0 || b.pos.x > s.L || b.pos.y < 0 || b.pos.y > s.W) return finish(s, 'out');
    // Control: the nearest player within reach takes a slow enough ball.
    const near = s.actors.filter((a) => distance(a.pos, b.pos) < DRILL.reach && (nsp < 9 || a.side.startsWith('GK')) && !(a.slot === b.passer && b.origin && distance(b.origin, b.pos) < 1.5))
      .sort((x, y) => distance(x.pos, b.pos) - distance(y.pos, b.pos))[0];
    if (near && !(near.human && s.execT < 0.15)) { if (teamOf(near.side) === 'N' && (b.lastTeam === 'A' || b.lastTeam === 'B')) b.neutralFor = b.lastTeam; s.holdT = 0; b.owner = near.slot; b.vel = { x: 0, y: 0 }; b.lastTeam = teamOf(near.side); b.target = null; }
  }
  if (b.owner) {
    const t = teamOf(actor(s, b.owner)!.side);
    const mine = teamOf(me.side);
    // Gates and end zones score only on controlled possession, never on a loose ball crossing them.
    if (t !== 'N' && s.targets.some((z) => z.scoresFor === t && controlledIn(s, z, b.pos))) return finish(s, t === mine ? 'scored' : 'conceded');
    if (s.startTeam !== null && t !== s.startTeam && t !== 'N' && !s.turnover) {
      s.turnover = true;
      s.execLimit = Math.max(s.execLimit, s.execT + DRILL.counterSeconds);
    }
    if (!s.turnover && b.owner === me.slot && s.chosen?.kind === 'carry' && me.goal && distance(me.pos, me.goal) < 0.3) return finish(s, 'kept');
  }
  if (s.execT >= s.execLimit) {
    const ot = b.owner ? teamOf(actor(s, b.owner)!.side) : null;
    const mine = teamOf(me.side);
    if (s.turnover && ot !== null && ot !== 'N' && ot !== s.startTeam) finish(s, ot === mine ? 'regained' : 'lost');
    else finish(s, ot === mine ? 'kept' : 'held');
  }
}

/** Is a controlled ball at `p` inside a gate's exit or an end zone for that target? */
function controlledIn(s: DrillState, t: DrillState['targets'][number], p: Vec2): boolean {
  if (t.type === 'gate') return Math.abs(p.x - t.cx) <= DRILL.gateReach && Math.abs(p.y - t.cy) <= t.half;
  if (t.type === 'end-zone') {
    const depth = t.depthMeters ?? 3;
    return t.cx > s.L / 2 ? p.x >= s.L - depth : p.x <= depth;
  }
  return false;
}

const OUTCOME_TEXT: Record<DrillOutcome['kind'], string> = {
  kept: 'Your team kept the ball.',
  lost: 'The other team won the ball.',
  scored: 'Scored.',
  conceded: 'The other team scored.',
  regained: 'Your team won the ball back.',
  out: 'The ball went out of the area.',
  held: 'Play held — nobody broke through.',
};

function finish(s: DrillState, kind: DrillOutcome['kind']): void {
  s.outcome = { kind, text: OUTCOME_TEXT[kind] };
  s.phase = 'explain';
}

/** Run the release to the decision moment (used when the player skips the watch). */
export function settle(s: DrillState): void {
  while (s.phase === 'release') step(s);
}

/** An NPC on the ball that is being closed down passes to the most open teammate it can reach, or shoots when close. */
function npcRelease(s: DrillState): void {
  const a = actor(s, s.ball.owner);
  if (!a || a.human || s.holdT < 0.5) return;
  const team = playsFor(s, a);
  const neutral = teamOf(a.side) === 'N';
  const goal = neutral ? undefined : ownTargets(s, team).find((t) => (t.type === 'goal' || t.type === 'mini-goal') && Math.hypot(t.cx - a.pos.x, t.cy - a.pos.y) < 7 && originOk(t, a.pos));
  if (goal) return kick(s, a, { x: goal.cx, y: goal.cy }, DRILL.shotSpeed, null);
  // A neutral is a wall: it plays the ball on rather than dribbling; others hold until pressed.
  if (pressureOn(s, a.pos, team) > 3.5 && !a.side.startsWith('GK') && !neutral) return;
  let best: DrillActor | null = null;
  let score = 0.3;
  for (const m of mates(s, a)) {
    const lane = laneClearance(s, a.pos, m.pos, team);
    if (lane <= 0) continue;
    const v = lane + pressureOn(s, m.pos, team) * 0.3;
    if (v > score) { score = v; best = m; }
  }
  if (best) kick(s, a, best.pos, DRILL.passSpeed, best.slot);
}
