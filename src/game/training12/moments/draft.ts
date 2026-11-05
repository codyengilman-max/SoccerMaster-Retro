/**
 * Draft authoring for Tactical Moments (owner brief §5): one movement scene per All36 situation and variant, built
 * only from the package positions, cues, choices, grades, branch targets and feedback. Every rule that goes beyond
 * the package is listed as an assumption on the scene; every movement the supplied sheets cannot show is a gap.
 * The output is stored as JSON (docs/training/moments/scenes.v1.json) and must be regenerated deliberately.
 */
import { ALL36_ARCHIVE_SHA256, ALL36_EPISODES, ALL36_VERSION } from '../all36/package';
import type { ChoiceId, Metres, PackageActor, PackageEpisode, PackageVariant } from '../all36/types';
import { MOMENTS_SCHEMA, type ActorKey, type ActorTrack, type Annotation, type BallEvent, type Foot, type Gap, type MomentScene, type MoveAction, type OutcomeBranch, type Timeline } from './schema';

/** Draft timing constants (seconds, metres per second). Reviewable; not calibrated. */
export const DRAFT = {
  watch: 4,
  slowFrom: 2.4,
  slowRate: 0.35,
  pressStart: 1.2,
  pressRun: 4,
  carryLead: 2,
  carrySpeed: 3.5,
  runSpeed: 5.5,
  passSpeed: 11,
  contactDelay: 0.35,
  touchEvery: 0.6,
  respondShare: 0.4,
  respondSpeed: 5,
  hold: 0.8,
  rollIn: 5,
} as const;

const CHOICES: readonly ChoiceId[] = ['A', 'B', 'C', 'D'];
const r2 = (n: number): number => Math.round(n * 100) / 100;
const pt = (x: number, y: number): Metres => [r2(x), r2(y)];
const dist = (a: Metres, b: Metres): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const near = (a: Metres, b: Metres, eps = 0.5): boolean => dist(a, b) <= eps;
const unit = (a: Metres, b: Metres): Metres => {
  const d = dist(a, b);
  return d < 1e-6 ? [0, 0] : [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};
const clampField = (p: Metres, w: number, l: number): Metres => pt(Math.min(w - 0.5, Math.max(0.5, p[0])), Math.min(l - 0.5, Math.max(0.5, p[1])));
/** Sheets face right three-quarter and are mirrored for left; the striking/touching foot mirrors with them (foot audit: docs/training/moments/ANIMATION_GAPS.md). */
export const footFacing = (from: Metres, to: Metres): Foot => (to[0] < from[0] - 0.25 ? 'left' : 'right');
/** A move the sheets cannot show honestly: mostly up or down the screen (needs front/back facings that do not exist). */
export const vertical = (a: Metres, b: Metres): boolean => dist(a, b) > 0.75 && Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]);

interface Ctx {
  readonly e: PackageEpisode;
  readonly v: PackageVariant;
  readonly W: number;
  readonly L: number;
  readonly at: (id: string) => Metres;
  readonly actor: (id: string) => PackageActor;
  readonly gaps: Gap[];
  readonly assumptions: Set<string>;
  readonly conflicts: string[];
}

function track(id: string, purpose: string, keys: ActorKey[]): ActorTrack {
  return { id, purpose, keys };
}
function still(id: string, at: Metres, action: MoveAction, look: Metres, purpose: string, until: number): ActorTrack {
  return track(id, purpose, [{ t: 0, at, action, look }, { t: until, at, action, look }]);
}

function gapsFor(c: Ctx, tl: Timeline, phase: 'watch' | 'branch', choice?: ChoiceId): void {
  for (const tr of tl.actors) {
    for (let i = 1; i < tr.keys.length; i++) {
      const a = tr.keys[i - 1]!;
      const b = tr.keys[i]!;
      if ((b.action === 'run' || b.action === 'shuffle') && vertical(a.at, b.at)) {
        c.gaps.push({ actor: tr.id, phase, ...(choice ? { choice } : {}), need: `${b.action} facing ${b.at[1] > a.at[1] ? 'away from the camera (up the screen)' : 'toward the camera (down the screen)'}: only right three-quarter frames exist`, blocksRelease: true });
      }
    }
  }
  for (const ev of tl.ball) {
    if (ev.kind === 'pass') {
      const from = posAtTime(tl, ev.by, ev.t);
      if (from && vertical(from, ev.to)) c.gaps.push({ actor: ev.by, phase, ...(choice ? { choice } : {}), need: `pass ${ev.to[1] > from[1] ? 'up' : 'down'} the screen: the pass row only strikes sideways`, blocksRelease: true });
    }
    if (ev.kind === 'carry') c.gaps.push({ actor: ev.by, phase, ...(choice ? { choice } : {}), need: 'dribble touches: no touch frames exist; touches are timed on run-cycle frames (foot audit pending)', blocksRelease: false });
  }
}

/** Linear position of an actor on a timeline (used while drafting; the runtime sampler is timeline.ts). */
function posAtTime(tl: Timeline, id: string, t: number): Metres | null {
  const tr = tl.actors.find((a) => a.id === id);
  if (!tr) return null;
  const k = tr.keys;
  if (t <= k[0]!.t) return k[0]!.at;
  for (let i = 1; i < k.length; i++) {
    const a = k[i - 1]!;
    const b = k[i]!;
    if (t <= b.t) {
      const u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return [a.at[0] + (b.at[0] - a.at[0]) * u, a.at[1] + (b.at[1] - a.at[1]) * u];
    }
  }
  return k[k.length - 1]!.at;
}

function draftWatch(c: Ctx): { tl: Timeline; starts: Record<string, Metres>; ballStart: Metres; slowCue: string } {
  const { e, v } = c;
  const T = DRAFT.watch;
  const ball = v.ball_position_m;
  const owner = v.ball_owner ? c.actor(v.ball_owner) : null;
  const tracks: ActorTrack[] = [];
  const starts: Record<string, Metres> = {};
  const events: BallEvent[] = [];
  c.assumptions.add('The package positions are the decision picture (the package gives no starting picture); the lead-in is drafted backwards from them.');
  // The nearest opponent of the ball's side within 10 m is the presser: the base cue in most situations is pressure arriving.
  const side = owner?.team ?? null;
  const opp = e.actors.filter((a) => a.role !== 'GK' && (side ? a.team !== side : a.id !== e.protagonist_id && a.team !== c.actor(e.protagonist_id).team));
  const presser = opp.map((a) => ({ a, d: dist(c.at(a.id), ball) })).filter((x) => x.d < 10 && !(x.a.id in v.actor_overrides)).sort((x, y) => x.d - y.d)[0]?.a ?? null;
  let slowCue = v.visible_cues[0] ?? '';
  for (const a of e.actors) {
    const dec = c.at(a.id);
    const look: Metres = owner && a.id === owner.id ? pt(dec[0], dec[1] + (a.team === 'H' ? 5 : -5)) : ball;
    if (a.id in v.actor_overrides && v.id === 'changed') {
      const base = a.position_m;
      const t0 = r2(Math.max(0.2, Math.min(DRAFT.slowFrom - 0.6, T - dist(base, dec) / DRAFT.runSpeed)));
      const lateral = Math.abs(dec[0] - base[0]) >= Math.abs(dec[1] - base[1]);
      const defending = side ? a.team !== side : false;
      const action: MoveAction = defending && lateral && dist(base, dec) < 6 ? 'shuffle' : 'run';
      tracks.push(track(a.id, `Changed cue: moves from the base position (${base.join(', ')}) to the changed position (${dec.join(', ')}).`, [{ t: 0, at: base, action: 'stand', look }, { t: t0, at: base, action: 'stand', look }, { t: T, at: dec, action, look }]));
      starts[a.id] = base;
      c.assumptions.add('Changed variant: actors the package moves (actor_overrides) start on their base-variant spot and make that move during the slow span; it is the visible changed cue.');
      continue;
    }
    if (owner && a.id === owner.id) {
      const dir: Metres = [0, a.team === 'H' ? 1 : -1];
      const start = clampField(pt(dec[0] - dir[0] * DRAFT.carryLead, dec[1] - dir[1] * DRAFT.carryLead), c.W, c.L);
      const t1 = T - 0.8;
      const t0 = t1 - dist(start, dec) / DRAFT.carrySpeed;
      tracks.push(track(a.id, 'Ball carrier: settles the ball and carries it into the decision spot.', [{ t: 0, at: start, action: 'stand', look }, { t: r2(t0), at: start, action: 'stand', look }, { t: r2(t1), at: dec, action: 'run', look }, { t: T, at: dec, action: 'stand', look }]));
      starts[a.id] = start;
      const touches: { t: number; foot: Foot }[] = [];
      for (let t = t0; t < t1 - 0.05; t += DRAFT.touchEvery) touches.push({ t: r2(t), foot: 'right' });
      events.push({ kind: 'carry', t0: r2(t0), t1: r2(t1), by: a.id, touches }, { kind: 'held', t: r2(t1), by: a.id });
      c.assumptions.add('The ball carrier carries 2 m along their attacking direction before the decision (the package does not say how the ball arrived).');
      continue;
    }
    if (presser && a.id === presser.id) {
      const away = unit(ball, dec);
      const start = clampField(pt(dec[0] + away[0] * DRAFT.pressRun, dec[1] + away[1] * DRAFT.pressRun), c.W, c.L);
      tracks.push(track(a.id, 'Presser: closes the ball; the pressure arriving is the cue the slow-motion span shows.', [{ t: 0, at: start, action: 'stand', look: ball }, { t: DRAFT.pressStart, at: start, action: 'stand', look: ball }, { t: T, at: dec, action: 'run', look: ball }]));
      starts[a.id] = start;
      if (v.id === 'base') slowCue = v.visible_cues[0] ?? 'Pressure arrives.';
      c.assumptions.add('The nearest opponent within 10 m of the ball presses during the lead-in, arriving at the decision spot.');
      continue;
    }
    const purpose = a.id === e.protagonist_id ? 'You: hold your starting spot while the picture develops.' : a.role === 'GK' ? 'Keeper: holds position (no keeper lesson).' : 'Holds position (not part of the cue).';
    const defendingGk = a.role === 'GK' && side && a.team !== side;
    tracks.push(still(a.id, dec, defendingGk ? 'keeper-ready' : 'stand', look, purpose, T));
    starts[a.id] = dec;
  }
  c.assumptions.add('Players not involved in the cue hold their package positions during the lead-in instead of inventing support runs.');
  let ballStart: Metres = ball;
  if (!owner) {
    const nearest = e.actors.filter((a) => a.role !== 'GK').map((a) => ({ a, d: dist(c.at(a.id), ball) })).sort((x, y) => x.d - y.d)[0]!.a;
    const dir = unit(c.at(nearest.id), ball);
    ballStart = clampField(pt(ball[0] - dir[0] * DRAFT.rollIn, ball[1] - dir[1] * DRAFT.rollIn), c.W, c.L);
    events.push({ kind: 'roll', t0: 0.8, t1: 3.6, from: ballStart, to: ball }, { kind: 'loose', t: 3.6, at: ball });
    c.assumptions.add(`Loose ball: it rolls ${DRAFT.rollIn} m into its package spot from the far side of the nearest player (${nearest.id}); the package gives only the resting spot.`);
  } else {
    const off: Metres = [ball[0] - c.at(owner.id)[0], ball[1] - c.at(owner.id)[1]];
    const s = starts[owner.id]!;
    ballStart = pt(s[0] + off[0], s[1] + off[1]);
    events.unshift({ kind: 'held', t: 0, by: owner.id });
  }
  return { tl: { duration: T, actors: tracks, ball: events }, starts, ballStart, slowCue };
}

function branchKind(c: Ctx, k: ChoiceId): OutcomeBranch['kind'] {
  const b = c.v.branches[k];
  const owner = c.v.ball_owner;
  const ballMoves = !near(b.ball_target, c.v.ball_position_m);
  if (b.owner_after === null) return ballMoves ? 'loose' : 'hold';
  if (!owner) return 'collect';
  const ownerTeam = owner ? c.actor(owner).team : c.actor(c.e.protagonist_id).team;
  if (c.actor(b.owner_after).team !== ownerTeam && b.owner_after !== owner) return 'turnover';
  if (b.owner_after !== owner && ballMoves) return 'pass';
  if (ballMoves || Object.keys(b.actor_targets).length) return 'carry';
  return 'hold';
}

function draftBranch(c: Ctx, k: ChoiceId): OutcomeBranch {
  const { e, v } = c;
  const b = v.branches[k];
  const kind = branchKind(c, k);
  const ball0 = v.ball_position_m;
  const owner = v.ball_owner;
  const keys = new Map<string, ActorKey[]>();
  const purposes = new Map<string, string>();
  const look0 = (id: string): Metres => (id === owner ? pt(c.at(id)[0], c.at(id)[1] + (c.actor(id).team === 'H' ? 5 : -5)) : ball0);
  for (const a of e.actors) keys.set(a.id, [{ t: 0, at: c.at(a.id), action: a.role === 'GK' && owner && c.actor(owner).team !== a.team ? 'keeper-ready' : 'stand', look: look0(a.id) }]);
  const move = (id: string, to: Metres, t0: number, speed: number, action: MoveAction, look: Metres, purpose: string): number => {
    const ks = keys.get(id)!;
    const from = ks[ks.length - 1]!.at;
    if (near(from, to, 0.05)) return t0;
    const t1 = r2(t0 + dist(from, to) / speed);
    if (t0 > ks[ks.length - 1]!.t) ks.push({ t: r2(t0), at: from, action: 'stand', look });
    ks.push({ t: t1, at: to, action, look });
    purposes.set(id, purpose);
    return t1;
  };
  const events: BallEvent[] = [];
  let end = 0.6;
  let ballEnd: Metres = ball0;
  let receiver: string | null = null;
  const contact = DRAFT.contactDelay;
  if (owner) events.push({ kind: 'held', t: 0, by: owner });
  else events.push({ kind: 'loose', t: 0, at: ball0 });
  if (kind === 'pass' || (kind === 'turnover' && owner && !near(b.ball_target, ball0, 1.5))) {
    const passer = owner ?? e.protagonist_id;
    receiver = b.owner_after;
    const arrive = r2(contact + dist(ball0, b.ball_target) / DRAFT.passSpeed);
    const foot = footFacing(c.at(passer), b.ball_target);
    keys.get(passer)!.push({ t: r2(contact), at: c.at(passer), action: 'pass', look: b.ball_target });
    events.push({ kind: 'pass', t: r2(contact), by: passer, foot, to: b.ball_target, arrive, receiver });
    if (receiver) {
      const rTo = b.actor_targets[receiver] ?? b.ball_target;
      if (!near(c.at(receiver), rTo, 0.05)) {
        const ks = keys.get(receiver)!;
        ks.push({ t: r2(Math.max(0.05, arrive - dist(c.at(receiver), rTo) / DRAFT.runSpeed)), at: c.at(receiver), action: 'stand', look: ball0 });
        ks.push({ t: arrive, at: rTo, action: 'run', look: ball0 });
        purposes.set(receiver, kind === 'turnover' ? 'Intercepts the pass at the package endpoint.' : 'Receives at the package endpoint.');
      }
      keys.get(receiver)!.push({ t: arrive, at: rTo, action: 'receive', look: ball0 });
      events.push({ kind: 'receive', t: arrive, by: receiver, foot: footFacing(rTo, ball0) });
    }
    end = arrive + DRAFT.hold;
    ballEnd = b.ball_target;
    if (kind === 'turnover') c.assumptions.add('A turnover whose endpoint is away from the ball is drafted as an interception of a pass toward that endpoint.');
  } else if (kind === 'turnover') {
    receiver = b.owner_after;
    const t1 = move(receiver!, b.actor_targets[receiver!] ?? b.ball_target, 0.2, DRAFT.runSpeed, 'run', ball0, 'Wins the ball (dispossession).');
    events.push({ kind: 'receive', t: Math.max(t1, 0.4), by: receiver!, foot: footFacing(c.at(receiver!), ball0) });
    c.gaps.push({ actor: receiver, phase: 'branch', choice: k, need: 'tackle / dispossession: no tackle frames exist (must not be faked with pass frames)', blocksRelease: true });
    end = Math.max(t1, 0.4) + DRAFT.hold;
    ballEnd = b.ball_target;
  } else if (kind === 'collect') {
    receiver = b.owner_after!;
    const t1 = move(receiver, ball0, 0.2, DRAFT.runSpeed, 'run', ball0, 'Collects the loose ball.');
    const tr = r2(Math.max(t1, 0.4));
    const foot = footFacing(c.at(receiver), ball0);
    keys.get(receiver)!.push({ t: tr, at: ball0, action: 'receive', look: ball0 });
    events.push({ kind: 'receive', t: tr, by: receiver, foot });
    let tEnd = r2(tr + 0.35);
    ballEnd = ball0;
    const to = b.actor_targets[receiver] ?? b.ball_target;
    if (!near(to, ball0, 0.05)) {
      const t2 = move(receiver, to, tEnd, DRAFT.carrySpeed, 'run', pt(to[0] + (to[0] - ball0[0]), to[1] + (to[1] - ball0[1])), 'Collects the loose ball and carries it to the package endpoint.');
      const touches: { t: number; foot: Foot }[] = [];
      for (let t = tEnd; t < t2 - 0.05; t += DRAFT.touchEvery) touches.push({ t: r2(t), foot: footFacing(ball0, to) });
      events.push({ kind: 'carry', t0: tEnd, t1: t2, by: receiver, touches }, { kind: 'held', t: t2, by: receiver });
      tEnd = t2;
      ballEnd = to;
    }
    end = tEnd + DRAFT.hold;
    c.assumptions.add('Loose ball options: the package owner_after runs to the ball, controls it on the receive contact frame, then carries to the package endpoint.');
  } else if (kind === 'carry' && owner) {
    const to = b.actor_targets[owner] ?? b.ball_target;
    const off: Metres = [ball0[0] - c.at(owner)[0], ball0[1] - c.at(owner)[1]];
    const t1 = move(owner, to, 0.2, DRAFT.carrySpeed, 'run', pt(to[0] + (to[0] - c.at(owner)[0]), to[1] + (to[1] - c.at(owner)[1])), 'Carries the ball to the package endpoint.');
    const touches: { t: number; foot: Foot }[] = [];
    for (let t = 0.2; t < t1 - 0.05; t += DRAFT.touchEvery) touches.push({ t: r2(t), foot: footFacing(c.at(owner), to) });
    events.push({ kind: 'carry', t0: 0.2, t1, by: owner, touches }, { kind: 'held', t: t1, by: owner });
    end = t1 + DRAFT.hold;
    ballEnd = pt(to[0] + off[0], to[1] + off[1]);
    if (!near(ballEnd, b.ball_target, 0.6)) c.conflicts.push(`${k}: carried ball ends at ${ballEnd.join(', ')}, package ball target ${b.ball_target.join(', ')}.`);
  } else if (kind === 'loose') {
    events.push({ kind: 'roll', t0: contact, t1: r2(contact + dist(ball0, b.ball_target) / 6), from: ball0, to: b.ball_target }, { kind: 'loose', t: r2(contact + dist(ball0, b.ball_target) / 6), at: b.ball_target });
    end = contact + dist(ball0, b.ball_target) / 6 + DRAFT.hold;
    ballEnd = b.ball_target;
  } else {
    end = 1.2;
    if (/no speculative|Freeze for explanation/i.test(b.consequence)) c.conflicts.push(`${k} "${b.label}": the brief asks Result to show the chosen action; the approved package says "${b.consequence}" Kept as a freeze with Coach Code's explanation; needs your decision.`);
  }
  // Package actor targets that are not the passer/receiver/carrier move after contact.
  for (const [id, to] of Object.entries(b.actor_targets)) {
    if (id === owner || id === receiver) continue;
    end = Math.max(end, move(id, to, contact, DRAFT.runSpeed, 'run', b.ball_target, 'Moves to the package endpoint for this option.') + DRAFT.hold);
  }
  // Coordinated response (same rule for every option, so no answer is favoured): the nearest opponent of the team
  // that has the ball afterwards closes part of the gap toward where the ball ends.
  const possessor = b.owner_after ?? owner;
  if (kind !== 'hold' && possessor) {
    const team = c.actor(possessor).team;
    const resp = e.actors.filter((a) => a.team !== team && a.role !== 'GK' && !(a.id in b.actor_targets) && a.id !== receiver).map((a) => ({ a, d: dist(c.at(a.id), ballEnd) })).sort((x, y) => x.d - y.d)[0];
    if (resp && resp.d > 1.5) {
      const from = c.at(resp.a.id);
      const to = pt(from[0] + (ballEnd[0] - from[0]) * DRAFT.respondShare, from[1] + (ballEnd[1] - from[1]) * DRAFT.respondShare);
      end = Math.max(end, move(resp.a.id, to, contact, DRAFT.respondSpeed, 'run', ballEnd, 'Responds: closes toward the ball (draft response rule, identical for every option).') + 0.3);
      c.assumptions.add(`Responses: after contact the nearest opponent of the team on the ball closes ${DRAFT.respondShare * 100}% of the gap at ${DRAFT.respondSpeed} m/s, the same rule for every option.`);
    }
  }
  const duration = r2(end);
  const actors: ActorTrack[] = e.actors.map((a) => {
    const ks = keys.get(a.id)!;
    const last = ks[ks.length - 1]!;
    if (last.t < duration) ks.push({ t: duration, at: last.at, action: last.action === 'run' || last.action === 'pass' || last.action === 'receive' ? 'stand' : last.action, look: last.look });
    return track(a.id, purposes.get(a.id) ?? 'Holds.', ks);
  });
  const tl: Timeline = { duration, actors, ball: events };
  gapsFor(c, tl, 'branch', k);
  const bestK = CHOICES.find((x) => v.grades[x] === 'preferred');
  const annotations: Annotation[] = [];
  if (!near(ball0, b.ball_target)) annotations.push({ kind: 'arrow', from: ball0, to: b.ball_target, note: `${b.label}`, support: `branch ${k} ball_target` });
  const spaceCue = v.visible_cues.find((q) => /space|lane|clear|open/i.test(q));
  if (k === bestK && spaceCue && !near(ball0, b.ball_target)) annotations.push({ kind: 'space', at: b.ball_target, radius: 3, note: spaceCue, support: 'variant visible_cues' });
  const moved = actors.filter((t) => t.keys.length > 1 && !near(t.keys[0]!.at, t.keys[t.keys.length - 1]!.at, 0.05)).map((t) => t.id);
  const whatChanged = kind === 'hold' ? (moved.length ? `The ball stays where it is; moving to package endpoints: ${moved.join(', ')}.` : 'Nothing moves: the package shows this option as a pause for explanation.') : `${kind === 'pass' ? `The ball travels to ${receiver}` : kind === 'carry' ? `${owner} carries the ball` : kind === 'turnover' ? `${receiver} wins the ball` : kind === 'collect' ? `${receiver} collects the loose ball` : 'The ball runs loose'} (ends at ${ballEnd.join(', ')}); moving: ${moved.join(', ') || 'nobody else'}.`;
  return { choice: k, kind, timeline: tl, packageTarget: { ball: b.ball_target, ownerAfter: b.owner_after, actors: b.actor_targets }, whatChanged, feedback: b.feedback, consequence: b.consequence, stop: kind === 'hold' ? 'Freeze: package review pause.' : 'Stops once the ball reaches the package endpoint and the response is visible.', annotations };
}

export function draftScene(e: PackageEpisode, v: PackageVariant): MomentScene {
  const actorMap = new Map(e.actors.map((a) => [a.id, a]));
  const c: Ctx = {
    e,
    v,
    W: e.field.width_m,
    L: e.field.length_m,
    at: (id) => v.actor_overrides[id] ?? actorMap.get(id)!.position_m,
    actor: (id) => {
      const a = actorMap.get(id);
      if (!a) throw new Error(`${e.id}/${v.id}: unknown actor ${id}`);
      return a;
    },
    gaps: [],
    assumptions: new Set(),
    conflicts: [],
  };
  const w = draftWatch(c);
  gapsFor(c, w.tl, 'watch');
  const branches = Object.fromEntries(CHOICES.map((k) => [k, draftBranch(c, k)])) as Record<ChoiceId, OutcomeBranch>;
  const prot = c.actor(e.protagonist_id);
  const objective = v.visible_cues[1] ?? 'Read the picture before you choose.';
  return {
    schema: MOMENTS_SCHEMA,
    sceneId: `TM-${e.id}-${v.id}`,
    version: 1,
    library: { situationId: e.id, variant: v.id, libraryVersion: ALL36_VERSION, archiveSha256: ALL36_ARCHIVE_SHA256, familyId: e.family_id, title: e.title },
    sources: e.source_ids,
    objective,
    brief: `${e.title.replace(/\s+—\s+\w+$/, '')}. ${objective}`,
    protagonist: { actorId: prot.id, role: prot.role },
    formation: '1-3-2-3',
    attack: '+y',
    field: { width: c.W, length: c.L, convention: 'metres; x from the left touchline, y from the home goal line; home attacks +y (up the screen)' },
    camera: e.camera_bounds_m,
    actors: e.actors.map((a) => ({ id: a.id, team: a.team, role: a.role, start: w.starts[a.id]!, decision: c.at(a.id) })),
    ball: { start: w.ballStart, decision: v.ball_position_m, ownerAtDecision: v.ball_owner },
    cues: v.visible_cues,
    watch: w.tl,
    slow: { from: DRAFT.slowFrom, rate: DRAFT.slowRate, cue: w.slowCue },
    decision: { t: DRAFT.watch, freeze: 'Every actor and the ball reach their package decision positions; the clock stops and the full state is captured before input.', pause: 'full' },
    actions: e.choices.map((ch) => ({ id: ch.id, label: ch.label, grade: v.grades[ch.id], rubric: v.grades[ch.id] === 'preferred' ? 'Best read of the cue (package: preferred).' : v.grades[ch.id] === 'acceptable' ? 'Valid but not the best read (package: acceptable).' : 'Misreads the cue (package: misread).', marker: near(v.branches[ch.id].ball_target, v.ball_position_m) ? null : v.branches[ch.id].ball_target })),
    branches,
    reason: v.reason,
    variations: ['Left-right mirror (x → field width − x): built and tested, not permitted until approved.'],
    assets: { required: ['team-training-v1 boy/girl, teammate_01-07, opponent_01-08, keeper_home/away', 'jungle-v4/jungle4-ball', 'v1/coach-club'], gaps: c.gaps },
    review: { status: 'DRAFT', assumptions: [...c.assumptions], conflicts: c.conflicts, author: 'Devin draft (owner authorisation to draft, 2026-11)' },
  };
}

/** All 72 drafts (36 situations × base/changed), in package order. */
export function draftAll(): MomentScene[] {
  return ALL36_EPISODES.flatMap((e) => e.variants.map((v) => draftScene(e, v)));
}
