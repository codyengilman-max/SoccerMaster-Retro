/**
 * Library-driven Team Training situations (model ts-1). Each fixture stages one moment from the soccer-logic
 * seed catalog (research/logic/v0.5/data/scenario_catalog.json) on the full 9v9 half-field. Positions, player
 * counts, timing and outcomes are authored prototypes (the catalog has none), never calibrated. Framework-free.
 *
 * Coordinates are metres on the visible half: x across from the left touchline (0 .. HALF_W), y from the halfway
 * line (0) to the goal line (HALF_L). The regulation goal is centred on the goal line at the top of the screen.
 */
import type { RoleId } from '../ref/catalog.mjs';

export const HALF_W = 50 * 0.9144;
export const HALF_L = 75 * 0.9144 / 2;
export const GOAL_W = 6.4;
export const MODEL_VERSION = 'ts-1';

export type SeedId = string;
export type Variant = 'cue' | 'counter';
export type Side = 'A' | 'B' | 'GK_A' | 'GK_B';
export type OptionKind = 'pass' | 'carry' | 'shoot' | 'support' | 'width' | 'run' | 'short' | 'press' | 'delay' | 'cover' | 'recover' | 'set' | 'sweep' | 'claim' | 'clear' | 'hold' | 'track' | 'screen';
export type OutcomeKind = 'kept' | 'progressed' | 'lost' | 'regained' | 'goal' | 'saved' | 'conceded' | 'delayed' | 'beaten' | 'cleared' | 'held' | 'out';
export type Verdict = 'good' | 'ok' | 'poor';

export interface P { readonly x: number; readonly y: number }

export interface FixtureActor {
  readonly slot: string;
  /** A = the user's team, B = opponents. */
  readonly side: Side;
  readonly role: RoleId;
  readonly at: P;
  /** What this player is doing in the moment, in plain words (documented as "why present"). */
  readonly task: string;
  /** Waypoint reached during the short passage before the freeze. */
  readonly passage?: P;
}

export interface FixtureOption {
  readonly id: string;
  readonly kind: OptionKind;
  readonly label: string;
  /** Pass/shot receiver or the player pressed/marked. */
  readonly toSlot?: string;
  /** Where the ball or the user goes. */
  readonly point: P;
  /** A lofted ball cannot be controlled until it comes down (the last quarter of its flight). */
  readonly lofted?: boolean;
}

export interface OptionGrade {
  readonly verdict: Verdict;
  readonly quality: number;
  /** Reasons read from the frozen moment, cited in LEARN. */
  readonly reasons: readonly string[];
  /** Authored tactical result the play-out must reach (checked by tests). */
  readonly expect: OutcomeKind;
  /** NPC responses after this choice: slot -> where it goes. */
  readonly responses?: Readonly<Record<string, P>>;
  /** Pass/shot intercepted or saved by this slot (moves to the ball's path). */
  readonly stoppedBy?: string;
  /** Ball actions by other players during the play-out (the carrier passing to the user's run, a counter pass...). */
  readonly then?: readonly NpcAction[];
  /** Players who win the ball if they reach the carrier (the user always can when pressing). */
  readonly tackle?: readonly string[];
  /** The carrier beats the user's challenge (a dodge): the user cannot win the ball this time. */
  readonly noTackle?: boolean;
}

export interface NpcAction {
  readonly at: number;
  readonly from: string;
  readonly kind: 'pass' | 'shoot' | 'carry';
  readonly to?: string;
  readonly point?: P;
  readonly lofted?: boolean;
}

export interface VariantSpec {
  /** Seed text this variant teaches (cue_candidate_response or counter_response, audit override when present). */
  readonly teaches: string;
  /** Actor overrides from the base layout. */
  readonly moves?: Readonly<Record<string, P>>;
  readonly passage?: Readonly<Record<string, P>>;
  /** Ball override for this variant. */
  readonly ball?: { readonly owner: string } | { readonly at: P };
  /** A ball played during the passage (a through ball, a cross); the freeze can catch it in flight. */
  readonly passageBall?: NpcAction;
  readonly question: string;
  readonly cues: readonly string[];
  readonly grades: Readonly<Record<string, OptionGrade>>;
}

export interface Fixture {
  /** `${seed}@${role}` for role-specific fixtures, the seed id otherwise. */
  readonly id: string;
  readonly seed: SeedId;
  readonly version: 1;
  /** Which goal is at the top: ours (defend / build out) or theirs (attack). */
  readonly goal: 'ours' | 'theirs';
  readonly phase: 'build' | 'attack' | 'defend' | 'transition' | 'set-piece' | 'keeper';
  readonly focal: RoleId;
  readonly human: string;
  readonly title: string;
  readonly objective: string;
  readonly trigger: string;
  /** Why these players (and only these) are on the half. */
  readonly why: string;
  /** Players that exist in the 9v9 shape but are off this half and play no part. */
  readonly offscreen?: string;
  readonly actors: readonly FixtureActor[];
  readonly ball: { readonly owner: string } | { readonly at: P };
  readonly passageSeconds: number;
  readonly options: readonly FixtureOption[];
  /** Seconds the play-out runs before the review point if no earlier tactical result. */
  readonly playSeconds: number;
  readonly cue: VariantSpec;
  readonly counter: VariantSpec;
}
