/** Types for the verbatim v1.2 reference module `engine.mjs`. */
import type { FamilyId, PracticeCard, RoleId } from './catalog.mjs';
export interface RosterPlayer { readonly id: string; readonly keeper: boolean; readonly role: RoleId }
export type Slot = 'A' | 'B' | 'N' | 'GK_A' | 'GK_B';
export interface Assignment { readonly slots: { slot: Slot; playerId: string }[]; readonly bench: string[] }
export type Selection =
  | { readonly status: 'selected'; readonly practice: PracticeCard }
  | { readonly status: 'unavailable'; readonly reason: string };
export interface Evidence {
  readonly id: string;
  readonly actorId: string;
  readonly opportunityId: string;
  readonly dimension: 'decision' | 'support' | 'defense' | 'execution';
  readonly quality: number;
  readonly observable: boolean;
  readonly eligible: boolean;
}
export type RunStatus = 'ready' | 'playing' | 'paused' | 'reflection' | 'complete' | 'aborted';
export interface RunState {
  readonly version: 2;
  readonly careerId: string;
  readonly seasonId: 1 | 2;
  readonly weekId: string;
  readonly slotId: 'A' | 'B' | 'C';
  readonly sessionId: string;
  readonly variantId: string;
  readonly layoutKey: string;
  readonly rulesProfile: string;
  readonly curriculumVersion: number;
  readonly scenarioVersion: number;
  readonly runId: string;
  readonly practiceId: string;
  readonly contentVersion: number;
  readonly seed: number;
  readonly humanId: string;
  readonly actorIds: readonly string[];
  readonly boutSeconds: number;
  readonly status: RunStatus;
  readonly round: number;
  readonly elapsed: number;
  readonly totalPlayed: number;
  readonly seen: readonly string[];
  readonly events: readonly Evidence[];
  readonly participation: readonly { id: string; start: number; end: number }[];
  readonly activeSeconds: number;
  readonly telemetry: 'unknown' | 'healthy' | 'degraded';
  readonly capacityWarning: boolean;
  readonly generation: number;
  readonly lastTick: number;
}
export type RunEvent = { readonly id: string; readonly runId: string; readonly generation: number } & (
  | { readonly type: 'start' | 'continue' | 'pause' | 'resume' | 'abort' }
  | { readonly type: 'tick'; readonly tick: number; readonly dt: number }
  | { readonly type: 'evidence'; readonly evidence: Evidence }
  | { readonly type: 'participation'; readonly actorId: string; readonly windowId: string; readonly kind: 'active-play' | 'off-ball-support'; readonly observable: boolean; readonly start: number; readonly end: number }
  | { readonly type: 'telemetry'; readonly health: 'healthy' | 'degraded' }
);
export type BoundContext = Pick<RunState, 'careerId' | 'seasonId' | 'weekId' | 'slotId' | 'sessionId' | 'variantId' | 'layoutKey' | 'rulesProfile' | 'curriculumVersion' | 'scenarioVersion' | 'humanId' | 'practiceId' | 'contentVersion'>;
export type EvidenceSummary = Record<string, Record<string, { opportunities: number; score: number | null }>>;
export interface CompletionRequest {
  readonly entitlementTuple: readonly [string, number, string, string];
  readonly runId: string;
  readonly practiceId: string;
  readonly contentVersion: number;
  readonly attendanceComplete: true;
  readonly participation: 'observed' | 'insufficient';
  readonly telemetry: RunState['telemetry'];
  readonly creditEligible: boolean;
  readonly masteryGranted: false;
  readonly evidence: EvidenceSummary;
  readonly namespace: 'team-training';
  readonly attributeDelta: null;
}
export function selectPractice(o: { focus: FamilyId; role: RoleId; level?: number; availablePlayers?: number; availableKeepers?: number; players?: readonly RosterPlayer[]; humanId?: string; capabilities?: readonly string[]; recent?: readonly string[] }): Selection;
export function validateRoster(players: readonly RosterPlayer[]): void;
export function assignParticipants(practice: PracticeCard, players: readonly RosterPlayer[], humanId: string, round?: number, humanSlot?: Slot | null): Assignment;
export function evaluateEvidence(events: readonly Evidence[]): EvidenceSummary;
export function recommendNext(o: { level: number; score: number | null; opportunities: number; successfulSessions: number; load: number; task?: 'attack' | 'defend' | 'keeper' | 'unknown' }): { level: number; change: string; reason: string; proposedLevel?: number; requiresNewRunConfig?: boolean; requiresVerifiedLayout?: boolean };
export function createRun(o: Record<string, unknown>): RunState;
export function reduceRun(state: RunState, event: RunEvent): RunState;
export function completionRequest(state: RunState, current: BoundContext): CompletionRequest;
