/** Scene validator (owner brief §4–§6): library traceability, decision picture, branch endpoints, speeds, possession and contact sync. */
import { blocksAfterFallback } from './artFallback';
import { ALL36_ARCHIVE_SHA256, ALL36_VERSION, episodeById } from '../all36/package';
import type { ChoiceId, Metres } from '../all36/types';
import { MOMENTS_SCHEMA, type MomentScene, type Timeline } from './schema';
import { actorAt, ballAt } from './timeline';

export const MAX_RUN_MS = 7;
export const MAX_BALL_MS = 20;
const CHOICES: readonly ChoiceId[] = ['A', 'B', 'C', 'D'];
const dist = (a: Metres, b: Metres): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

function timelineErrors(tl: Timeline, ball0: Metres, where: string): string[] {
  const out: string[] = [];
  for (const tr of tl.actors) {
    for (let i = 1; i < tr.keys.length; i++) {
      const a = tr.keys[i - 1]!;
      const b = tr.keys[i]!;
      if (b.t < a.t) out.push(`${where}: ${tr.id} keys go back in time at ${b.t}`);
      const d = dist(a.at, b.at);
      if (d > 0.01 && (b.t === a.t || d / (b.t - a.t) > MAX_RUN_MS)) out.push(`${where}: ${tr.id} moves ${d.toFixed(2)} m in ${(b.t - a.t).toFixed(2)} s (teleport or faster than ${MAX_RUN_MS} m/s)`);
    }
  }
  for (const e of tl.ball) {
    if (e.kind === 'pass') {
      const p = actorAt(tl, e.by, e.t);
      if (p.action !== 'pass' || Math.abs(p.since) > 1e-6) out.push(`${where}: pass by ${e.by} at ${e.t} is not on the pass contact frame`);
      const d = dist(ballAt(tl, ball0, e.t).at, e.to);
      if (d / Math.max(1e-6, e.arrive - e.t) > MAX_BALL_MS) out.push(`${where}: pass faster than ${MAX_BALL_MS} m/s`);
      if (e.foot !== 'unverified') out.push(`${where}: pass by ${e.by} names the ${e.foot} foot without reviewed contact metadata`);
    }
    if (e.kind === 'receive') {
      const p = actorAt(tl, e.by, e.t);
      if (p.action !== 'receive') out.push(`${where}: receive by ${e.by} at ${e.t} is not on the receive contact frame`);
      if (dist(p.at, ballAt(tl, ball0, e.t).at) > 1) out.push(`${where}: ${e.by} receives ${dist(p.at, ballAt(tl, ball0, e.t).at).toFixed(2)} m from the ball`);
    }
  }
  for (let t = 0; t <= tl.duration + 1e-9; t += 0.05) {
    const b = ballAt(tl, ball0, t);
    if (b.state.mode === 'held' && dist(actorAt(tl, b.state.by, t).at, b.at) > 1) out.push(`${where}: ball is ${dist(actorAt(tl, b.state.by, t).at, b.at).toFixed(2)} m from its holder ${b.state.by} at ${t.toFixed(2)} s`);
  }
  return [...new Set(out)];
}

export function validateScene(s: MomentScene): string[] {
  const out: string[] = [];
  if (s.schema !== MOMENTS_SCHEMA) out.push('unknown schema');
  const e = episodeById(s.library.situationId);
  const v = e?.variants.find((x) => x.id === s.library.variant);
  if (!e || !v) return [...out, `library record ${s.library.situationId}/${s.library.variant} not found`];
  if (s.library.libraryVersion !== ALL36_VERSION || s.library.archiveSha256 !== ALL36_ARCHIVE_SHA256) out.push('library version or archive hash differs from the imported All36 package');
  if (s.sceneId !== `TM-${e.id}-${v.id}`) out.push('scene id does not match the library record');
  if (s.protagonist.actorId !== e.protagonist_id || s.protagonist.role === 'GK') out.push('protagonist must be the package protagonist and not a goalkeeper');
  if (!(s.slow.from > 0 && s.slow.from < s.decision.t && s.slow.rate > 0 && s.slow.rate <= 1)) out.push('slow span must start before the decision with a rate in (0, 1]');
  if (Math.abs(s.decision.t - s.watch.duration) > 1e-9) out.push('decision must freeze at the end of the watch timeline');
  // The frozen picture is exactly the approved package picture.
  for (const a of e.actors) {
    const want = v.actor_overrides[a.id] ?? a.position_m;
    const got = actorAt(s.watch, a.id, s.decision.t).at;
    if (dist(want, got) > 0.05) out.push(`decision picture: ${a.id} at ${got.map((n) => n.toFixed(2)).join(', ')}, package ${want.join(', ')}`);
  }
  const bd = ballAt(s.watch, s.ball.start, s.decision.t);
  if (dist(bd.at, v.ball_position_m) > 0.05) out.push('decision picture: ball is not on the package ball position');
  if ((bd.state.mode === 'held' ? bd.state.by : null) !== v.ball_owner) out.push(`decision picture: ball owner ${bd.state.mode === 'held' ? bd.state.by : 'none'}, package ${v.ball_owner ?? 'none'}`);
  out.push(...timelineErrors(s.watch, s.ball.start, 'watch'));
  if (s.actions.length < 2 || s.actions.length > 4) out.push('two to four actions are required');
  for (const k of CHOICES) {
    const act = s.actions.find((a) => a.id === k);
    const pc = e.choices.find((c) => c.id === k);
    if (!pc) continue;
    if (!act || act.label !== pc.label || act.grade !== v.grades[k]) out.push(`${k}: action label or grade differs from the package`);
    const br = s.branches[k];
    if (!br) {
      out.push(`${k}: no outcome branch`);
      continue;
    }
    for (const a of e.actors) {
      const first = br.timeline.actors.find((t) => t.id === a.id)?.keys[0];
      if (!first || dist(first.at, actorAt(s.watch, a.id, s.decision.t).at) > 0.05) out.push(`${k}: ${a.id} does not resume from the decision snapshot`);
    }
    const pb = v.branches[k];
    if (br.feedback !== pb.feedback || br.consequence !== pb.consequence) out.push(`${k}: feedback differs from the package`);
    const end = ballAt(br.timeline, v.ball_position_m, br.timeline.duration);
    if (dist(end.at, pb.ball_target) > 0.6) out.push(`${k}: ball ends ${dist(end.at, pb.ball_target).toFixed(2)} m from the package target`);
    const holder = end.state.mode === 'held' ? end.state.by : null;
    if (br.kind !== 'loose' && br.kind !== 'hold' && br.kind !== 'off-ball' && holder !== pb.owner_after) out.push(`${k}: ball ends with ${holder ?? 'nobody'}, package ${pb.owner_after ?? 'nobody'}`);
    for (const [id, to] of Object.entries(pb.actor_targets)) if (dist(actorAt(br.timeline, id, br.timeline.duration).at, to) > 0.05) out.push(`${k}: ${id} does not reach the package target`);
    out.push(...timelineErrors(br.timeline, v.ball_position_m, `branch ${k}`));
  }
  return out;
}

export const releaseBlockers = (s: MomentScene): string[] => [...validateScene(s), ...s.assets.gaps.filter(blocksAfterFallback).map((g) => `${g.phase}${g.choice ? ` ${g.choice}` : ''}: ${g.actor ?? ''} ${g.need}`)];
