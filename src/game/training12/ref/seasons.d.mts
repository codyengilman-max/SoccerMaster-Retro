/** Types for the verbatim v1.2 reference module `seasons.mjs`. */
import type { FamilyId, PracticeCard, RoleId } from './catalog.mjs';
import type { Assignment, RosterPlayer, RunState, Slot } from './engine.mjs';
export interface RoleRoute { readonly family: FamilyId; readonly relationship: string; readonly variantId: string }
export interface Session {
  readonly id: string;
  readonly season: 1 | 2;
  readonly week: number;
  readonly slot: 'A' | 'B' | 'C';
  readonly theme: string;
  readonly focus: FamilyId;
  readonly scenario: string;
  readonly transferQuestion: string;
  readonly objective: string;
  readonly coachQuestion: string;
  readonly maxLevel: 1 | 2 | 3;
  readonly roleRoutes: Readonly<Record<RoleId, RoleRoute>>;
  readonly matchTransfer: { readonly required: true; readonly separateFromTrainingScore: true; readonly question: string };
  readonly state: string;
}
export interface LayoutActor { readonly slot: string; readonly side: Slot; x: number; y: number; task: string; human?: true }
export interface Target {
  readonly type: 'goal' | 'mini-goal' | 'gate' | 'end-zone';
  readonly x: number;
  readonly y?: number;
  readonly width?: 'host-goal-width';
  readonly widthMeters?: number;
  readonly depthMeters?: number;
  readonly scoresFor: 'A' | 'B';
  readonly shotOriginWithinEndMeters?: number;
}
export interface ScenarioDefinition {
  readonly key: string;
  readonly variantId: string;
  readonly practiceId: string;
  readonly level: number;
  readonly curriculumVersion: 2;
  readonly scenarioVersion: 1;
  readonly layoutRevision: 2;
  readonly rulesProfile: string;
  readonly humanSide: Slot;
  readonly task: 'attack' | 'defend' | 'keeper';
  readonly actors: readonly LayoutActor[];
  readonly ball: { readonly ownerSlot: string };
  readonly targets: readonly Target[];
  readonly pitch: { readonly length: number; readonly width: number };
  readonly localOverload: boolean;
  readonly release: string;
  readonly objective: string;
  readonly coachQuestion: string;
  readonly roleSituation: string;
  readonly matchContext: string;
}
export interface ScenarioRecord { readonly key: string; readonly verified: true; readonly definition: ScenarioDefinition }
export type Plan =
  | { readonly status: 'unavailable'; readonly reason: string; readonly sessionId?: string; readonly variantId?: string }
  | {
      readonly status: 'selected';
      readonly practice: PracticeCard;
      readonly session: Session;
      readonly route: RoleRoute;
      readonly level: number;
      readonly definition: ScenarioDefinition;
      readonly actors: readonly (LayoutActor & { playerId: string; position: { x: number; y: number } })[];
      readonly assignment: Assignment;
      readonly humanId: string;
      readonly entitlementContext: { season: number; week: number; slot: string };
    };
export const sessions: readonly Session[];
export function scenarioDefinition(sessionId: string, role: RoleId, level: number, rulesProfile: string): ScenarioDefinition;
export function planSession(o: { sessionId: string; role: RoleId; earnedLevel: number; players: readonly RosterPlayer[]; humanId: string; rulesProfile: string; practiceCapabilities?: readonly string[]; scenarioCapabilities?: readonly ScenarioRecord[] }): Plan;
export function createScheduledRun(o: { plan: Plan; careerId: string; runId: string; seed: number; boutSeconds?: number }): RunState;
export function validateCurriculum(): { seasons: number; weeksPerSeason: number; sessionsPerWeek: number; scheduledSessions: number; basePracticeCards: number; roleMappings: number };
