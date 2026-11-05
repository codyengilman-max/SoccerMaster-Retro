/**
 * Outcome drafts for the 159 branches the approved package presents as a frozen teaching frame ("Review pause only"
 * / "Freeze for explanation"), owner decision 2026-11. The package label, consequence and feedback are kept as they
 * are; each draft is a separately versioned record that needs its own owner approval. Only continuations the label
 * itself supports are drafted (a hold or a wait while players already moving keep moving); anything that would need
 * an invented destination, pass, turnover or goal is left as an explanation with the missing decision named.
 */
import type { ChoiceId, Metres } from '../all36/types';
import { vertical } from './draft';
import type { ActorTrack, Gap, MomentScene, Timeline } from './schema';
import { actorAt } from './timeline';

export const OUTCOME_SCHEMA = 'tactical-moments-outcome.v1';
export type OutcomeCategory = 'scan' | 'hold-position' | 'needs-decision' | 'unavailable' | 'proposed';
export interface OutcomeDraft {
  readonly schema: typeof OUTCOME_SCHEMA;
  readonly branchId: string;
  readonly sceneId: string;
  readonly sceneVersion: number;
  readonly choice: ChoiceId;
  readonly outcomeVersion: number;
  readonly packageLabel: string;
  readonly packageConsequence: string;
  readonly packageFeedback: string;
  readonly category: OutcomeCategory;
  /** result = a played-out consequence; explanation = a deliberately frozen teaching frame. */
  readonly presentation: 'result' | 'explanation';
  readonly timeline: Timeline | null;
  readonly whatChanged: string;
  readonly missingDecision: string | null;
  readonly assumptions: readonly string[];
  readonly gaps: readonly Gap[];
  readonly status: 'DRAFT' | 'READY_FOR_REVIEW';
  /** v2: a genuinely open, scene-specific coaching question (policy questions are recorded once in DECISIONS). */
  readonly question?: string;
}

export const CONTINUE_S = 1.2;
export const HOLD_S = 0.8;
export const CONTINUE_MAX_M = 2;
export const PRESS_STOP_M = 1.2;
const SCAN = /^Pause, scan and communicate/;
/** Labels whose action is to stay put or wait: the protagonist holding is the chosen action itself. */
const HOLD = /^(Stand |Stay |Remain |Watch only|Wait until|Delay until|Hide on the same line)/;
const r2 = (n: number): number => Math.round(n * 100) / 100;
const dist = (a: Metres, b: Metres): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

export const isFrozenBranch = (s: MomentScene, k: ChoiceId): boolean => s.branches[k].kind === 'hold' && /^(Review pause only|Freeze for explanation)/.test(s.branches[k].consequence);

/** Players moving at the freeze keep their established direction and speed for CONTINUE_S (pressers stop short of the ball). */
export function continuation(s: MomentScene): { tl: Timeline; movers: string[] } {
  const T = s.decision.t;
  const ball = s.ball.decision;
  const movers: string[] = [];
  const actors: ActorTrack[] = s.watch.actors.map((tr) => {
    const k = tr.keys;
    const a = k[k.length - 2];
    const b = k[k.length - 1]!;
    const at = actorAt(s.watch, tr.id, T).at;
    const start = { t: 0, at, action: 'stand' as const, look: b.look };
    // The ball holder holds (keeping the ball is the point of these options); only players off the ball continue.
    if (tr.id === s.ball.ownerAtDecision || !a || b.t < T - 1e-9 || dist(a.at, b.at) < 0.05 || b.t === a.t || (b.action !== 'run' && b.action !== 'shuffle')) return { id: tr.id, purpose: 'Holds.', keys: [start, { ...start, t: CONTINUE_S + HOLD_S }] };
    const speed = dist(a.at, b.at) / (b.t - a.t);
    const dir: Metres = [(b.at[0] - a.at[0]) / dist(a.at, b.at), (b.at[1] - a.at[1]) / dist(a.at, b.at)];
    let len = Math.min(CONTINUE_MAX_M, speed * CONTINUE_S);
    const pressing = /Presser/.test(tr.purpose);
    if (pressing) len = Math.max(0, Math.min(len, dist(at, ball) - PRESS_STOP_M));
    if (len < 0.05) return { id: tr.id, purpose: 'Holds (already at the ball).', keys: [start, { ...start, t: CONTINUE_S + HOLD_S }] };
    const to: Metres = [r2(at[0] + dir[0] * len), r2(at[1] + dir[1] * len)];
    movers.push(tr.id);
    return { id: tr.id, purpose: pressing ? 'Keeps pressing (established movement), stopping short of the ball.' : 'Keeps its established movement.', keys: [start, { t: r2(len / speed), at: to, action: b.action, look: b.look }, { t: CONTINUE_S + HOLD_S, at: to, action: 'stand', look: b.look }] };
  });
  const owner = s.ball.ownerAtDecision;
  return { tl: { duration: CONTINUE_S + HOLD_S, actors, ball: owner ? [{ kind: 'held', t: 0, by: owner }] : [{ kind: 'loose', t: 0, at: ball }] }, movers };
}

export function draftOutcome(s: MomentScene, k: ChoiceId): OutcomeDraft | null {
  if (!isFrozenBranch(s, k)) return null;
  const br = s.branches[k];
  const label = s.actions.find((a) => a.id === k)!.label;
  const category: OutcomeCategory = SCAN.test(label) ? 'scan' : HOLD.test(label) ? 'hold-position' : 'needs-decision';
  const base = { schema: OUTCOME_SCHEMA, branchId: `${s.sceneId}/${k}`, sceneId: s.sceneId, sceneVersion: s.version, choice: k, outcomeVersion: 1, packageLabel: label, packageConsequence: br.consequence, packageFeedback: br.feedback, category } as const;
  if (category === 'needs-decision') {
    return { ...base, presentation: 'explanation', timeline: null, whatChanged: 'Explanation frame: the package defines no endpoint for this option.', missingDecision: `Owner decision needed: where "${label}" goes (players and ball) and what it leads to; the package gives no endpoint, so nothing is invented.`, assumptions: [], gaps: [], status: 'READY_FOR_REVIEW' };
  }
  const { tl, movers } = continuation(s);
  if (!movers.length) {
    return { ...base, presentation: 'explanation', timeline: null, whatChanged: 'Explanation frame: nobody was moving at the freeze, so holding changes nothing on its own.', missingDecision: `Owner decision needed: what the opposition does while "${label}" happens; no movement was established before the freeze.`, assumptions: [], gaps: [], status: 'READY_FOR_REVIEW' };
  }
  const gaps: Gap[] = [];
  for (const tr of tl.actors) for (let i = 1; i < tr.keys.length; i++) if ((tr.keys[i]!.action === 'run' || tr.keys[i]!.action === 'shuffle') && vertical(tr.keys[i - 1]!.at, tr.keys[i]!.at)) gaps.push({ actor: tr.id, phase: 'branch', choice: k, need: `${tr.keys[i]!.action} ${tr.keys[i]!.at[1] > tr.keys[i - 1]!.at[1] ? 'up' : 'down'} the screen: only right three-quarter frames exist`, blocksRelease: true });
  const holder = s.ball.ownerAtDecision;
  return {
    ...base,
    presentation: 'result',
    timeline: tl,
    whatChanged: `${holder ? `${holder} keeps the ball` : 'The ball stays loose'}; ${category === 'scan' ? 'while you scan' : 'while you hold'}, ${movers.join(', ')} keep moving as they were.`,
    missingDecision: null,
    assumptions: [`Hesitation/hold: players moving at the freeze continue in the same direction and speed for ${CONTINUE_S} s (max ${CONTINUE_MAX_M} m; a presser stops ${PRESS_STOP_M} m from the ball). Nobody else moves; no pass, turnover or goal is authored.`],
    gaps,
    status: 'READY_FOR_REVIEW',
  };
}

export function draftOutcomes(scenes: readonly MomentScene[]): OutcomeDraft[] {
  return scenes.flatMap((s) => (['A', 'B', 'C', 'D'] as const).map((k) => draftOutcome(s, k)).filter((o): o is OutcomeDraft => !!o));
}

export function outcomeHash(o: OutcomeDraft): string {
  const text = JSON.stringify({ ...o, status: null });
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
