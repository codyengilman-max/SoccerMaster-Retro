import type { Vec2 } from '../vec';
import type { CoachIntentKind, MatchPlayerId } from '../match/types';
import type { CoachFacts } from './facts';

export type Grade = 'strong' | 'reasonable' | 'risky';
export const TOPICS = [
  'carry',
  'release',
  'combine',
  'switch',
  'protect',
  'turn',
  'shoot',
  'chance',
  'risk',
  'support',
  'press',
  'recover',
  'cover',
  'balance',
  'space',
] as const;
export type Topic = (typeof TOPICS)[number];

/** Facts a template reads. Validated at load time and checked against the live facts before use. */
export type FactFeature = 'carrier' | 'pressure' | 'passingLanes' | 'support' | 'shot' | 'defend' | 'cover' | 'score' | 'time' | 'formation' | 'stoppage' | 'space';

export type OnBallAction = 'carry' | 'pass' | 'switch' | 'shoot' | 'protect' | 'turn' | 'recycle' | 'delay';

/** What the chosen answer means for play after Continue. */
export type Intention =
  | { readonly kind: 'onBall'; readonly action: OnBallAction; readonly targetId: MatchPlayerId | null }
  | { readonly kind: 'offBall'; readonly intent: CoachIntentKind; readonly playerId: MatchPlayerId; readonly target: Vec2 }
  | { readonly kind: 'none'; readonly note: string };

export type Highlight =
  | { readonly kind: 'player'; readonly id: MatchPlayerId; readonly tone: 'focus' | 'mate' | 'opponent' }
  | { readonly kind: 'lane'; readonly from: MatchPlayerId; readonly to: MatchPlayerId; readonly open: boolean }
  | { readonly kind: 'space'; readonly at: Vec2; readonly radius: number }
  | { readonly kind: 'goal' };

export interface OptionDef {
  readonly id: string;
  /** Options that would name something the facts do not contain are hidden (never invented). */
  readonly available?: (f: CoachFacts) => boolean;
  readonly text: (f: CoachFacts, names: NameFn) => string;
  readonly grade: (f: CoachFacts) => Grade;
  readonly feedback: (f: CoachFacts, names: NameFn, grade: Grade) => string;
  /** Null when the option has no tactical instruction to apply (e.g. "stay where you are"). */
  readonly intention: (f: CoachFacts) => Intention;
}

export interface TemplateDef {
  readonly id: string;
  readonly version: number;
  readonly topic: Topic;
  readonly phase: 'attack' | 'defend';
  readonly ball: 'on' | 'off';
  readonly objective: string;
  readonly requires: readonly FactFeature[];
  /** Only allowed while play is stopped (broad context near a safe stoppage). */
  readonly stoppageOnly?: boolean;
  readonly cooldownSeconds: number;
  readonly maxPerSession: number;
  readonly eligible: (f: CoachFacts) => boolean;
  readonly question: (f: CoachFacts, names: NameFn) => string;
  readonly highlights: (f: CoachFacts) => readonly Highlight[];
  readonly options: readonly OptionDef[];
}

export type NameFn = (id: MatchPlayerId) => string;

/** A fully populated moment, built from one template and one frozen set of facts. */
export interface EvaluatedOption {
  readonly id: string;
  readonly text: string;
  readonly grade: Grade;
  readonly feedback: string;
  readonly intention: Intention;
}

export interface MomentView {
  readonly momentId: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly topic: Topic;
  readonly objective: string;
  readonly question: string;
  readonly options: readonly EvaluatedOption[];
  readonly highlights: readonly Highlight[];
}
