/**
 * Outcome drafts v2 (owner decision 2026-11, round 3). Supersedes v1's "explanation unless the label names an
 * endpoint" rule for a new draft version only; outcomes.v1.json stays frozen. Executable-but-poor options are
 * animated up to the moment their consequence shows, with plausible responses and no authored goal, turnover or
 * failure. Options the package calls unavailable stay an Explanation. Every proposal lists its assumptions.
 */
import type { ChoiceId, Metres } from '../all36/types';
import { vertical } from './draft';
import { continuation, draftOutcome, type OutcomeDraft } from './outcomes';
import type { ActorTrack, BallEvent, Gap, MomentScene, Timeline } from './schema';

export const OUTCOME_V2 = 2;
export const RUN_MPS = 5;
export const RUN_MAX_M = 6;
export const FLIGHT_SHARE = 0.5;
export const CLOSE_M = 0.8;
const r2 = (n: number): number => Math.round(n * 100) / 100;
const dist = (a: Metres, b: Metres): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const toward = (a: Metres, b: Metres, len: number): Metres => {
  const d = dist(a, b);
  if (d < 1e-9) return a;
  const l = Math.min(len, d);
  return [r2(a[0] + ((b[0] - a[0]) / d) * l), r2(a[1] + ((b[1] - a[1]) / d) * l)];
};
const short = (a: Metres, b: Metres, stop: number): Metres => toward(a, b, Math.min(RUN_MAX_M, Math.max(0, dist(a, b) - stop)));
const segNear = (p: Metres, a: Metres, b: Metres): Metres => {
  const L = dist(a, b) ** 2 || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / L));
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
};

export type Family = 'carry' | 'pass' | 'shot' | 'close' | 'run-beyond' | 'run-goal-line' | 'run-same' | 'run-to-mate' | 'chase-wide' | 'follow';
export const FAMILIES: readonly [RegExp, Family][] = [
  [/^(Dribble into|Force play through)/, 'carry'],
  [/^(Force the screened pass|Force a crowded forward pass|Switch blindly)/, 'pass'],
  [/^Shoot through the set blocker/, 'shot'],
  [/^(Dive in|Lunge|Stab|Press before the pass|Rush out|Overrun|Continue an isolated chase|Chase the same ball|Follow everyone to the ball|Both pursue)/, 'close'],
  [/^(Run behind the last defender|Run early into offside)/, 'run-beyond'],
  [/^Arrive behind the goal line/, 'run-goal-line'],
  [/^(Make the identical run|Join the same near-post run|Duplicate the winger|Crowd the striker)/, 'run-same'],
  [/^(Run into CB|Drop onto the goalkeeper)/, 'run-to-mate'],
  [/^Open the center by chasing wide/, 'chase-wide'],
  [/^Follow blindly/, 'follow'],
];

interface Plan { readonly to: Metres; readonly why: string; readonly ball?: 'carry' | 'pass' | 'shot'; readonly ballTo?: Metres; readonly responder?: string | undefined; readonly also?: string | undefined }

function plan(s: MomentScene, fam: Family, label: string): Plan | null {
  const P = s.protagonist.actorId;
  const me = s.actors.find((a) => a.id === P)!;
  const at = me.decision;
  const ball = s.ball.decision;
  const holder = s.ball.ownerAtDecision;
  const mates = s.actors.filter((a) => a.team === me.team && a.id !== P && a.role !== 'GK');
  const opps = s.actors.filter((a) => a.team !== me.team && a.role !== 'GK');
  const up = me.team === 'H' ? 1 : -1;
  const nearest = <T extends { decision: Metres }>(xs: readonly T[], p: Metres): T | undefined => [...xs].sort((a, b) => dist(a.decision, p) - dist(b.decision, p))[0];
  switch (fam) {
    case 'carry': {
      if (holder !== P) return null;
      const d = nearest(opps.filter((o) => (o.decision[1] - at[1]) * up > 0), at);
      return d ? { to: short(at, d.decision, 1.5), why: `carries at ${d.id} and stops 1.5 m short`, ball: 'carry', responder: d.id } : null;
    }
    case 'pass': case 'shot': {
      if (holder !== P) return null;
      let target: Metres; let screen: (typeof opps)[number] | undefined;
      if (fam === 'shot') target = [r2(s.field.width / 2), me.team === 'H' ? s.field.length : 0];
      else {
        const ahead = mates.filter((m) => (m.decision[1] - at[1]) * up > 0 && dist(m.decision, at) < 35);
        const blocked = ahead.map((m) => ({ m, o: nearest(opps, segNear(m.decision, at, m.decision)) })).map((x) => ({ ...x, gap: Math.min(...opps.map((o) => dist(o.decision, segNear(o.decision, at, x.m.decision)))) })).sort((a, b) => a.gap - b.gap)[0];
        if (!blocked) return null;
        target = blocked.m.decision;
      }
      screen = [...opps].sort((a, b) => dist(a.decision, segNear(a.decision, at, target)) - dist(b.decision, segNear(b.decision, at, target)))[0];
      return { to: at, why: `${fam === 'shot' ? 'shoots' : 'plays the pass'} toward [${target.join(', ')}]; Result ends with the ball halfway, in flight, as ${screen?.id ?? 'nobody'} steps toward the lane`, ball: fam, ballTo: toward(at, target, dist(at, target) * FLIGHT_SHARE), responder: screen?.id };
    }
    case 'close': {
      const tgt = holder && holder !== P ? s.actors.find((a) => a.id === holder)!.decision : ball;
      const second = /^Both pursue/.test(label) ? nearest(mates, tgt)?.id : undefined;
      return { to: short(at, tgt, CLOSE_M), why: `closes to ${CLOSE_M} m of ${holder && holder !== P ? holder : 'the ball'}; no tackle is resolved`, also: second };
    }
    case 'run-beyond': {
      const last = opps.reduce((m, o) => ((o.decision[1] - m) * up > 0 ? o.decision[1] : m), at[1]);
      return { to: toward(at, [at[0], r2(last + 2.5 * up)], RUN_MAX_M), why: 'runs to 2.5 m beyond the last outfield defender (capped at 6 m)' };
    }
    case 'run-goal-line':
      return { to: toward(at, [at[0], me.team === 'H' ? s.field.length - 1 : 1], RUN_MAX_M), why: 'runs toward the goal line (capped at 6 m)' };
    case 'run-same': {
      const m = nearest(mates.filter((x) => x.id !== holder), at);
      return m ? { to: short(at, m.decision, 1.5), why: `runs into ${m.id}'s route, stopping 1.5 m from them` } : null;
    }
    case 'run-to-mate': {
      const role = /CB/.test(label) ? 'CB' : 'GK';
      const m = s.actors.find((a) => a.team === me.team && a.role === role);
      return m ? { to: short(at, m.decision, role === 'GK' ? 3 : 1.5), why: `moves toward ${m.id}` } : null;
    }
    case 'chase-wide':
      return { to: short(at, ball, 1.2), why: 'chases the ball wide, stopping 1.2 m short' };
    case 'follow': {
      const o = nearest(opps.filter((x) => x.id !== holder), at);
      return o ? { to: short(at, o.decision, 1), why: `follows ${o.id}, ending 1 m behind` } : null;
    }
  }
}

export function draftOutcomeV2(s: MomentScene, k: ChoiceId): OutcomeDraft | null {
  const v1 = draftOutcome(s, k);
  if (!v1) return null;
  const base = { ...v1, outcomeVersion: OUTCOME_V2 };
  if (v1.presentation === 'result') return base;
  if (/^Freeze for explanation/.test(v1.packageConsequence)) {
    return { ...base, category: 'unavailable', missingDecision: null, whatChanged: 'Explanation frame: in this version the package treats this action as unavailable, so it is not shown being executed.', assumptions: ['Package: "do not illustrate a successful outcome for an unavailable action" read as genuinely unavailable (not executable-but-poor).'], question: `Is "${v1.packageLabel}" genuinely unavailable in ${s.sceneId}, or executable but poor (then it would be animated)?` };
  }
  const fam = FAMILIES.find(([re]) => re.test(v1.packageLabel))?.[1];
  const p = fam ? plan(s, fam, v1.packageLabel) : null;
  if (!fam || !p) return { ...base, question: `No continuation could be proposed for "${v1.packageLabel}" in ${s.sceneId}: ${fam ? 'the scene lacks the needed player' : 'no movement family fits this label'}. What does it look like?` };
  const P = s.protagonist.actorId;
  const { tl } = continuation(s);
  const at = s.actors.find((a) => a.id === P)!.decision;
  const runT = r2(dist(at, p.to) / RUN_MPS);
  const flight = p.ball === 'pass' || p.ball === 'shot' ? r2(0.35 + dist(at, p.ballTo!) / (p.ball === 'shot' ? 14 : 10)) : 0;
  const end = r2(Math.max(tl.duration, runT + 0.4, flight));
  const lookAt = p.ballTo ?? s.ball.decision;
  const actors: ActorTrack[] = tl.actors.map((tr) => {
    const ext = (keys: ActorTrack['keys']) => (keys[keys.length - 1]!.t < end ? [...keys, { ...keys[keys.length - 1]!, t: end }] : keys);
    if (tr.id === P || tr.id === p.also) {
      const from = s.actors.find((a) => a.id === tr.id)!.decision;
      const to = tr.id === P ? p.to : short(from, p.to, 1.5);
      if (p.ball === 'pass' || p.ball === 'shot') return { id: tr.id, purpose: `Proposed: ${p.why}.`, keys: [{ t: 0, at: from, action: 'stand', look: lookAt }, { t: 0.35, at: from, action: 'pass', look: lookAt }, { t: end, at: from, action: 'stand', look: lookAt }] };
      const t1 = Math.max(0.05, r2(dist(from, to) / RUN_MPS));
      return { id: tr.id, purpose: `Proposed: ${tr.id === P ? p.why : 'also goes (same option)'}.`, keys: [{ t: 0, at: from, action: 'stand', look: to }, { t: t1, at: to, action: 'run', look: s.ball.decision }, { t: end, at: to, action: 'stand', look: s.ball.decision }] };
    }
    if (tr.id === p.responder) {
      const from = tr.keys[0]!.at;
      const to = p.ballTo ? toward(from, segNear(from, at, p.ballTo), 1) : from;
      return { id: tr.id, purpose: 'Proposed response: steps toward the lane / faces the action.', keys: [{ t: 0, at: from, action: 'stand', look: at }, { t: 0.6, at: to, action: dist(from, to) > 0.05 ? 'shuffle' : 'stand', look: at }, { t: end, at: to, action: 'stand', look: at }] };
    }
    return { ...tr, keys: ext(tr.keys) };
  });
  const holder = s.ball.ownerAtDecision;
  let ballEv: BallEvent[];
  if (p.ball === 'carry') ballEv = [{ kind: 'held', t: 0, by: P }, { kind: 'carry', t0: 0, t1: runT, by: P, touches: Array.from({ length: Math.max(1, Math.ceil(runT / 0.5)) }, (_, i) => ({ t: r2(i * 0.5), foot: 'unverified' as const })) }, { kind: 'held', t: runT, by: P }];
  else if (p.ball === 'pass' || p.ball === 'shot') ballEv = [{ kind: 'held', t: 0, by: P }, { kind: 'pass', t: 0.35, by: P, foot: 'unverified', to: p.ballTo!, arrive: flight, receiver: null }];
  else ballEv = [...tl.ball];
  const timeline: Timeline = { duration: end, actors, ball: ballEv };
  const gaps: Gap[] = [];
  for (const tr of actors) for (let i = 1; i < tr.keys.length; i++) if ((tr.keys[i]!.action === 'run' || tr.keys[i]!.action === 'shuffle') && vertical(tr.keys[i - 1]!.at, tr.keys[i]!.at)) gaps.push({ actor: tr.id, phase: 'branch', choice: k, need: `${tr.keys[i]!.action} ${tr.keys[i]!.at[1] > tr.keys[i - 1]!.at[1] ? 'up' : 'down'} the screen: only right three-quarter frames exist`, blocksRelease: true });
  return {
    ...base,
    category: 'proposed',
    presentation: 'result',
    timeline,
    whatChanged: `Proposed: ${P} ${p.why}.${p.ball ? '' : holder ? ` ${holder} keeps the ball.` : ' The ball stays loose.'} The result is not resolved: no goal, turnover or failure is authored.`,
    missingDecision: null,
    assumptions: [`Movement family "${fam}" from the label; run speed ${RUN_MPS} m/s, capped at ${RUN_MAX_M} m.`, ...(p.ball === 'pass' || p.ball === 'shot' ? [`Result stops with the ball ${FLIGHT_SHARE * 100}% of the way to its target, so whether it is cut out is not decided.`] : []), 'Everyone else keeps the movement established at the freeze (as v1).'],
    gaps,
    status: 'READY_FOR_REVIEW',
  };
}

export function draftOutcomesV2(scenes: readonly MomentScene[]): OutcomeDraft[] {
  return scenes.flatMap((s) => (['A', 'B', 'C', 'D'] as const).map((k) => draftOutcomeV2(s, k)).filter((o): o is OutcomeDraft => !!o));
}
