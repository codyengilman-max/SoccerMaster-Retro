/** Types for the verbatim v1.2 reference module `catalog.mjs` (SoccerMaster_Team_Training_Fixed_v1.2.zip). */
export type FamilyId = 'build' | 'switch' | 'combine' | 'wide' | 'defend' | 'transition' | 'finish' | 'keeper';
export type RoleId = 'GK' | 'CB' | 'LB' | 'RB' | '6' | '8' | 'LW' | 'RW' | '9';
export interface Family {
  readonly name: string;
  readonly roles: readonly RoleId[];
  readonly cue: string;
  readonly sources: readonly string[];
  readonly behaviors: readonly string[];
  readonly evidence: string;
}
export interface Participants {
  readonly outfieldA: number;
  readonly outfieldB: number;
  readonly neutrals: number;
  readonly gkA: number;
  readonly gkB: number;
  readonly total: number;
}
export interface PracticeCard {
  readonly id: string;
  readonly family: FamilyId;
  readonly level: 1 | 2 | 3;
  readonly name: string;
  readonly version: number;
  readonly rounds: number;
  readonly roles: readonly RoleId[];
  readonly participants: Participants;
  readonly pitch: { readonly length: number; readonly width: number };
  readonly objective: string;
  readonly turnover: string;
  readonly [k: string]: unknown;
}
export const families: Readonly<Record<FamilyId, Family>>;
export const catalog: readonly PracticeCard[];
