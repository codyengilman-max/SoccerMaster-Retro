/**
 * Session director (owner brief §2, §6): Brief → Watch → Slow → Decide → Result → Learn → Retry/Continue on one
 * scene clock. Decision quality comes from the package grade, kept apart from what the branch shows. Attempts are
 * recorded by kind (first, assisted, retry, replay-only) so a save adapter can credit only what the session rules
 * allow. Framework-free; the scene drives it with real elapsed seconds.
 */
import { GRADE_BAND } from '../all36/package';
import type { ChoiceId, DisplayBand, Metres, PackageGrade } from '../all36/types';
import type { MomentScene, OutcomeBranch } from './schema';
import { frameAt, type Frame } from './timeline';

export type Stage = 'brief' | 'watch' | 'slow' | 'decide' | 'result' | 'learn' | 'done';
export type AttemptKind = 'first' | 'assisted' | 'retry' | 'replay';
export interface Attempt {
  readonly n: number;
  readonly kind: AttemptKind;
  readonly choice: ChoiceId;
  readonly grade: PackageGrade;
  readonly band: DisplayBand;
}
export interface Evaluation {
  readonly choice: ChoiceId;
  readonly grade: PackageGrade;
  readonly band: DisplayBand;
  /** Package-supported: more than one option can be valid (acceptable) without being the best read. */
  readonly valid: boolean;
  readonly best: readonly ChoiceId[];
  /** What the branch demonstrates, reported separately from the decision grade. */
  readonly execution: OutcomeBranch['kind'];
}
/** Coach Code's explanation: what mattered → what you chose → what changed → what to do next. */
export interface Explanation {
  readonly mattered: string;
  readonly chose: string;
  readonly changed: string;
  readonly next: string;
}

export const RESULT_RATE = 0.5;

export function evaluate(s: MomentScene, choice: ChoiceId): Evaluation {
  const a = s.actions.find((x) => x.id === choice);
  if (!a) throw new Error(`${s.sceneId}: no action ${choice}`);
  return { choice, grade: a.grade, band: GRADE_BAND[a.grade], valid: a.grade !== 'misread', best: s.actions.filter((x) => x.grade === 'preferred').map((x) => x.id), execution: s.branches[choice].kind };
}

export function explain(s: MomentScene, ev: Evaluation): Explanation {
  const a = s.actions.find((x) => x.id === ev.choice)!;
  const br = s.branches[ev.choice];
  const best = s.actions.filter((x) => x.grade === 'preferred');
  const verdict = ev.grade === 'preferred' ? 'the best read' : ev.grade === 'acceptable' ? 'a valid option, not the best read' : 'a misread of the cue';
  return {
    mattered: s.cues[0] ?? s.objective,
    chose: `${a.label}: ${verdict}. ${br.feedback}`,
    changed: br.whatChanged,
    next: ev.grade === 'preferred' ? s.reason : `Next time: ${best.map((x) => x.label).join(' or ')}. ${s.reason}`,
  };
}

export class MomentDirector {
  stage: Stage = 'brief';
  /** Scene time on the current timeline (watch or branch), seconds. */
  t = 0;
  paused = false;
  /** Learn replay of the chosen branch from the frozen snapshot. */
  replaying = false;
  choice: ChoiceId | null = null;
  evaluation: Evaluation | null = null;
  assisted = false;
  readonly attempts: Attempt[] = [];
  readonly replays: { readonly n: number; readonly what: 'watch' | 'result' }[] = [];
  private runs = 0;

  constructor(readonly scene: MomentScene, readonly resultRate = RESULT_RATE) {}

  /** Playback rate of the scene clock right now (shown separately from the stage label). */
  get rate(): number {
    if (this.paused) return 0;
    if (this.stage === 'watch') return 1;
    if (this.stage === 'slow') return this.scene.slow.rate;
    if (this.stage === 'result' || (this.stage === 'learn' && this.replaying)) return this.resultRate;
    return 0;
  }

  get branch(): OutcomeBranch | null {
    return this.choice ? this.scene.branches[this.choice] : null;
  }

  /** The state to draw. Watch/slow/decide sample the watch timeline; result/learn sample the chosen branch. */
  frame(): Frame {
    const s = this.scene;
    const br = this.branch;
    if (br && (this.stage === 'result' || this.stage === 'learn' || this.stage === 'done')) return frameAt(br.timeline, s.ball.decision, this.t);
    return frameAt(s.watch, s.ball.start, this.stage === 'decide' ? s.decision.t : this.t);
  }

  /** Decision snapshot: the full state captured before input, from which every branch and replay resumes. */
  snapshot(): Frame {
    return frameAt(this.scene.watch, this.scene.ball.start, this.scene.decision.t);
  }

  start(): void {
    if (this.stage !== 'brief') return;
    this.stage = 'watch';
    this.t = 0;
  }

  tick(dt: number): void {
    if (dt <= 0) return;
    const r = this.rate;
    if (r === 0) return;
    const s = this.scene;
    if (this.stage === 'watch' || this.stage === 'slow') {
      // Advance in two parts so the slow span starts exactly at its authored time, whatever the frame step.
      let left = dt;
      while (left > 1e-9 && (this.stage === 'watch' || this.stage === 'slow')) {
        const rate = this.stage === 'watch' ? 1 : s.slow.rate;
        const edge = this.stage === 'watch' ? s.slow.from : s.decision.t;
        const need = (edge - this.t) / rate;
        if (left < need) {
          this.t += left * rate;
          left = 0;
        } else {
          this.t = edge;
          left -= need;
          this.stage = this.stage === 'watch' ? 'slow' : 'decide';
        }
      }
      return;
    }
    const br = this.branch;
    if (!br) return;
    this.t = Math.min(br.timeline.duration, this.t + dt * r);
    if (this.t >= br.timeline.duration) {
      if (this.stage === 'result') this.stage = 'learn';
      this.replaying = false;
    }
  }

  pause(): void {
    this.paused = true;
  }
  resume(): void {
    this.paused = false;
  }
  hint(): void {
    if (this.stage === 'decide') this.assisted = true;
  }

  /** Accept a choice only once the snapshot is frozen. */
  choose(choice: ChoiceId): Evaluation | null {
    if (this.stage !== 'decide' || !this.scene.branches[choice]) return null;
    this.runs += 1;
    this.choice = choice;
    this.evaluation = evaluate(this.scene, choice);
    const kind: AttemptKind = this.assisted ? 'assisted' : this.runs === 1 ? 'first' : 'retry';
    this.attempts.push({ n: this.runs, kind, choice, grade: this.evaluation.grade, band: this.evaluation.band });
    this.stage = 'result';
    this.t = 0;
    this.paused = false;
    return this.evaluation;
  }

  /** Replay the watch from its start (before deciding) or the chosen result from the snapshot (Learn). No credit. */
  replay(): void {
    if (this.stage === 'watch' || this.stage === 'slow' || this.stage === 'decide') {
      this.stage = 'watch';
      this.t = 0;
      this.replays.push({ n: this.runs, what: 'watch' });
    } else if (this.stage === 'learn') {
      this.t = 0;
      this.replaying = true;
      this.replays.push({ n: this.runs, what: 'result' });
    }
    this.paused = false;
  }

  /** Retry the same situation from its start; the next answer is recorded as a retry. */
  retry(): void {
    if (this.stage !== 'learn') return;
    this.stage = 'watch';
    this.t = 0;
    this.choice = null;
    this.evaluation = null;
    this.assisted = false;
    this.replaying = false;
  }

  finish(): void {
    if (this.stage === 'learn') this.stage = 'done';
  }

  /** Scrub (review only): set the clock on the current timeline. */
  seek(t: number): void {
    const d = this.branch && this.stage !== 'watch' && this.stage !== 'slow' && this.stage !== 'decide' ? this.branch.timeline.duration : this.scene.decision.t;
    this.t = Math.min(Math.max(0, t), d);
  }
}

/** Left-right mirror of a scene (x → width − x). Built for variation tests; not permitted for players until approved. */
export function mirrorScene(s: MomentScene): MomentScene {
  const W = s.field.width;
  const m = (p: Metres): Metres => [Math.round((W - p[0]) * 100) / 100, p[1]];
  const tl = (x: MomentScene['watch']): MomentScene['watch'] => ({
    duration: x.duration,
    actors: x.actors.map((a) => ({ ...a, keys: a.keys.map((k) => ({ ...k, at: m(k.at), look: m(k.look) })) })),
    ball: x.ball.map((e) => {
      // A true mirror swaps anatomical left/right; an unverified foot stays unverified.
      const flip = (f: 'right' | 'left' | 'unverified') => (f === 'right' ? 'left' : f === 'left' ? 'right' : 'unverified') as 'right' | 'left' | 'unverified';
      if (e.kind === 'pass') return { ...e, to: m(e.to), foot: flip(e.foot) };
      if (e.kind === 'receive') return { ...e, foot: flip(e.foot) };
      if (e.kind === 'carry') return { ...e, touches: e.touches.map((x) => ({ ...x, foot: flip(x.foot) })) };
      if (e.kind === 'roll') return { ...e, from: m(e.from), to: m(e.to) };
      if (e.kind === 'loose') return { ...e, at: m(e.at) };
      return e;
    }),
  });
  return {
    ...s,
    sceneId: `${s.sceneId}-mirror`,
    camera: [W - s.camera[2], s.camera[1], W - s.camera[0], s.camera[3]],
    actors: s.actors.map((a) => ({ ...a, start: m(a.start), decision: m(a.decision) })),
    ball: { ...s.ball, start: m(s.ball.start), decision: m(s.ball.decision) },
    watch: tl(s.watch),
    actions: s.actions.map((a) => ({ ...a, marker: a.marker ? m(a.marker) : null })),
    branches: Object.fromEntries(Object.entries(s.branches).map(([k, b]) => [k, { ...b, timeline: tl(b.timeline), packageTarget: { ...b.packageTarget, ball: m(b.packageTarget.ball), actors: Object.fromEntries(Object.entries(b.packageTarget.actors).map(([id, p]) => [id, m(p)])) }, annotations: b.annotations.map((n) => ({ ...n, ...(n.from ? { from: m(n.from) } : {}), ...(n.to ? { to: m(n.to) } : {}), ...(n.at ? { at: m(n.at) } : {}) })) }])) as unknown as MomentScene['branches'],
  };
}
