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

function plan(s: MomentScene, fam: Family, label: string, runEnd: ReadonlyMap<string, Metres>): Plan | null {
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
        // The label names the pass: a switch goes to the far-side wide player, a forward pass through the middle to a
        // central forward teammate, a screened pass to the teammate whose lane is screened. No credible target = null.
        const W = s.field.width;
        const ahead = mates.filter((m) => (m.decision[1] - at[1]) * up > 0 && dist(m.decision, at) < 35);
        const lane = (m: (typeof mates)[number]) => Math.min(...opps.map((o) => dist(o.decision, segNear(o.decision, at, m.decision))));
        let pool = ahead;
        // A switch from a central position names no side: ask instead of choosing one.
        if (/^Switch/.test(label) && Math.abs(at[0] - W / 2) < W / 6) return null;
        if (/^Switch/.test(label)) pool = mates.filter((m) => /^(LW|RW|LB|RB|LM|RM)$/.test(m.role) && Math.abs(m.decision[0] - at[0]) > W / 3 && (m.decision[0] - W / 2) * (at[0] - W / 2) < 0);
        else if (/crowded forward pass/.test(label)) pool = ahead.filter((m) => Math.abs(m.decision[0] - W / 2) < W / 4);
        const pick = /^Switch/.test(label) ? [...pool].sort((x, y) => Math.abs(y.decision[0] - at[0]) - Math.abs(x.decision[0] - at[0]))[0] : [...pool].sort((x, y) => lane(x) - lane(y))[0];
        if (!pick) return null;
        target = pick.decision;
      }
      // A screen must stand between passer and target: projection strictly inside the lane, within 4 m of it.
      const u = (o: Metres) => { const dx = target[0] - at[0], dy = target[1] - at[1]; return ((o[0] - at[0]) * dx + (o[1] - at[1]) * dy) / (dx * dx + dy * dy || 1); };
      screen = [...opps].filter((o) => u(o.decision) > 0.05 && u(o.decision) < 0.95 && dist(o.decision, segNear(o.decision, at, target)) < 4).sort((a, b) => dist(a.decision, segNear(a.decision, at, target)) - dist(b.decision, segNear(b.decision, at, target)))[0];
      return { to: at, why: `${fam === 'shot' ? 'shoots' : 'plays the pass'} toward [${target.join(', ')}]; Result ends with the ball halfway, in flight${screen ? `, as ${screen.id} steps toward the lane` : '; no opponent stands in the lane at the freeze'}`, ball: fam, ballTo: target, responder: screen?.id };
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
      // The runner the option names: striker for near-post / striker's route, a winger for the winger's approach,
      // otherwise the teammate already making a run at the freeze. Nobody identifiable = null (question).
      const named = /near-post|striker/.test(label) ? mates.filter((x) => x.role === 'ST') : /winger/.test(label) ? mates.filter((x) => /^(LW|RW)$/.test(x.role)) : mates.filter((x) => x.id !== holder);
      // Joining a run needs a runner with established movement; a stationary named player is a question, not a route.
      const m = nearest(named.filter((x) => runEnd.has(x.id)), at);
      if (!m) return null;
      const end = runEnd.get(m.id)!;
      return { to: short(at, end, 1.5), why: `joins ${m.id}'s run, stopping 1.5 m from where it is heading` };
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
  const cont = continuation(s);
  const runEnd = new Map(cont.movers.map((id) => { const k = cont.tl.actors.find((a) => a.id === id)!.keys; return [id, k[k.length - 1]!.at] as const; }));
  const p = fam ? plan(s, fam, v1.packageLabel, runEnd) : null;
  if (!fam || !p) return { ...base, question: `No continuation could be proposed for "${v1.packageLabel}" in ${s.sceneId}: ${fam ? 'no player in the scene matches the one this option names' : 'no movement family fits this label'}. What does it look like?` };
  const P = s.protagonist.actorId;
  const { tl } = cont;
  const at = s.actors.find((a) => a.id === P)!.decision;
  const runT = r2(dist(at, p.to) / RUN_MPS);
  const inFlight = p.ball === 'pass' || p.ball === 'shot';
  // A pass/shot travels its full path, but the Result clock stops when the ball is FLIGHT_SHARE of the way there.
  const arrive = inFlight ? r2(0.35 + dist(at, p.ballTo!) / (p.ball === 'shot' ? 14 : 10)) : 0;
  const end = inFlight ? r2(0.35 + (arrive - 0.35) * FLIGHT_SHARE) : r2(Math.max(tl.duration, runT + 0.4));
  const lookAt = p.ballTo ?? s.ball.decision;
  // Trim a continuation at `end`, sampling the active segment so established movement is kept, not dropped.
  const clip = (keys: ActorTrack['keys']): ActorTrack['keys'] => {
    const kept = keys.filter((q) => q.t <= end + 1e-9);
    const next = keys.find((q) => q.t > end + 1e-9);
    const prev = kept[kept.length - 1];
    if (!next || !prev) return kept;
    const f = (end - prev.t) / (next.t - prev.t);
    return [...kept, { ...next, t: end, at: [r2(prev.at[0] + (next.at[0] - prev.at[0]) * f), r2(prev.at[1] + (next.at[1] - prev.at[1]) * f)] as Metres }];
  };
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
      return { id: tr.id, purpose: 'Proposed response: steps toward the lane / faces the action.', keys: [{ t: 0, at: from, action: 'stand', look: at }, { t: Math.min(0.6, end), at: to, action: dist(from, to) > 0.05 ? 'shuffle' : 'stand', look: at }, { t: end, at: to, action: 'stand', look: at }] };
    }
    return { ...tr, keys: ext(clip(tr.keys)) };
  });
  const holder = s.ball.ownerAtDecision;
  let ballEv: BallEvent[];
  if (p.ball === 'carry') ballEv = [{ kind: 'held', t: 0, by: P }, { kind: 'carry', t0: 0, t1: runT, by: P, touches: Array.from({ length: Math.max(1, Math.ceil(runT / 0.5)) }, (_, i) => ({ t: r2(i * 0.5), foot: 'unverified' as const })) }, { kind: 'held', t: runT, by: P }];
  else if (p.ball === 'pass' || p.ball === 'shot') ballEv = [{ kind: 'held', t: 0, by: P }, { kind: 'pass', t: 0.35, by: P, foot: 'unverified', to: p.ballTo!, arrive, receiver: null }];
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
