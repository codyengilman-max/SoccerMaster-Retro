/**
 * The tactical-situation library: 40 authored prototype fixtures (one per logic catalog v0.5 seed) and the mapping from
 * every v1.2 session route (108 sessions x 9 roles) to the three moments it plays. Framework-free.
 */
import type { RoleId } from '../ref/catalog.mjs';
import { sessions } from '../ref/seasons.mjs';
import { BACK_FIXTURES } from './fixtures/back';
import { FRONT_FIXTURES } from './fixtures/front';
import { GK_FIXTURES } from './fixtures/gk';
import { MID_FIXTURES } from './fixtures/mid';
import { TEAM_FIXTURES } from './fixtures/team';
import { MODEL_VERSION, type Fixture } from './types';

export const ALL_FIXTURES: readonly Fixture[] = [...GK_FIXTURES, ...BACK_FIXTURES, ...MID_FIXTURES, ...FRONT_FIXTURES, ...TEAM_FIXTURES];

export const SOURCE_CATALOG = 'research/logic/v0.5/data/scenario_catalog.json';

export function fixtureById(id: string): Fixture | null {
  return ALL_FIXTURES.find((f) => f.id === id) ?? null;
}

/** Versioned key saved with a run: model, fixture, fixture version. */
export const fixtureKey = (f: Fixture): string => `${MODEL_VERSION}:${f.id}@${f.version}`;

/** Session families (v1.2 roleRoutes[role].family) each seed teaches. Authored from the catalog situation text. */
export const SEED_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  GK01: ['keeper', 'build'], GK02: ['keeper', 'build', 'switch'], GK03: ['keeper', 'defend'], GK04: ['keeper', 'defend'],
  CB01: ['build'], CB02: ['build', 'switch'], CB03: ['defend'], CB04: ['transition', 'defend'],
  OB01: ['wide', 'build', 'combine'], OB02: ['wide', 'combine'], OB03: ['defend', 'wide'], OB04: ['defend', 'wide'],
  SIX01: ['build', 'combine'], SIX02: ['build', 'combine'], SIX03: ['transition', 'defend'], SIX04: ['transition'],
  EIGHT01: ['combine', 'build'], EIGHT02: ['combine'], EIGHT03: ['finish', 'combine'], EIGHT04: ['defend'],
  WING01: ['wide', 'finish'], WING02: ['switch', 'wide', 'combine'], WING03: ['switch', 'wide'], WING04: ['finish', 'wide'],
  NINE01: ['combine', 'finish'], NINE02: ['combine', 'build'], NINE03: ['finish'], NINE04: ['defend'],
  AT01: ['transition'], AT02: ['transition', 'finish'], DT01: ['transition', 'defend'], DT02: ['transition', 'defend'],
  DEF01: ['defend'], DEF02: ['defend'], DEF03: ['defend'], DEF04: ['defend', 'transition'],
  SP01: ['build', 'wide'], SP02: ['defend'], SP03: ['finish'], GM01: ['finish', 'build'],
};

interface PoolEntry { readonly id: string; readonly mirrored: boolean }
const as = (ids: string[], mirrored = false): PoolEntry[] => ids.map((id) => ({ id, mirrored }));
const LEFT_BACK = ['OB01', 'OB02', 'OB03', 'OB04', 'DEF01'];
const LEFT_WING = ['WING01', 'WING02', 'WING04', 'SP01', 'GM01'];
const RIGHT_WING = ['WING03', 'AT02'];

/** Fixtures each role can play as the user. Right-side roles play left-side fixtures reflected (and vice versa). */
export const ROLE_POOLS: Readonly<Record<RoleId, readonly PoolEntry[]>> = {
  GK: as(['GK01', 'GK02', 'GK03', 'GK04']),
  CB: as(['CB01', 'CB02', 'CB03', 'CB04', 'DEF02', 'DEF03']),
  LB: as(LEFT_BACK),
  RB: as(LEFT_BACK, true),
  '6': as(['SIX01', 'SIX02', 'SIX03', 'SIX04', 'DT02', 'DEF04', 'SP02']),
  '8': as(['EIGHT01', 'EIGHT02', 'EIGHT03', 'EIGHT04', 'AT01', 'DT01', 'SP03']),
  '9': as(['NINE01', 'NINE02', 'NINE03', 'NINE04']),
  LW: [...as(LEFT_WING), ...as(RIGHT_WING, true)],
  RW: [...as(RIGHT_WING), ...as(LEFT_WING, true)],
} as Record<RoleId, readonly PoolEntry[]>;

export interface Moment {
  readonly fixtureId: string;
  readonly mirrored: boolean;
  /** 'family': the seed teaches this session's family. 'role': a role fixture used because too few match the family. */
  readonly fit: 'family' | 'role';
}

export interface RoutePlan {
  readonly sessionId: string;
  readonly role: RoleId;
  readonly family: string;
  readonly moments: readonly Moment[];
  /** 'direct' all three moments match the family, 'partial' some do, 'weak' none (flagged in the mapping doc). */
  readonly fit: 'direct' | 'partial' | 'weak';
}

/** The three moments a session route plays. Rotates through the matching seeds so neighbouring sessions differ. */
export function routePlan(sessionId: string, role: RoleId): RoutePlan | null {
  const index = sessions.findIndex((s) => s.id === sessionId);
  const s = sessions[index];
  const route = s?.roleRoutes[role];
  const pool = ROLE_POOLS[role];
  if (!s || !route || !pool) return null;
  const family = route.family;
  const matching = pool.filter((e) => SEED_FAMILIES[e.id]?.includes(family));
  const rest = pool.filter((e) => !matching.includes(e));
  const rot = <T>(xs: readonly T[], k: number): T[] => xs.map((_, i) => xs[(i + k) % xs.length]!);
  const picked: Moment[] = rot(matching, index).slice(0, 3).map((e) => ({ fixtureId: e.id, mirrored: e.mirrored, fit: 'family' }));
  for (const e of rot(rest, index)) if (picked.length < 3) picked.push({ fixtureId: e.id, mirrored: e.mirrored, fit: 'role' });
  const n = picked.filter((m) => m.fit === 'family').length;
  return { sessionId, role, family, moments: picked, fit: n === 3 ? 'direct' : n > 0 ? 'partial' : 'weak' };
}

const SWAP: Readonly<Record<string, string>> = { left: 'right', right: 'left', Left: 'Right', Right: 'Left', LB: 'RB', RB: 'LB', LW: 'RW', RW: 'LW' };

/** Fixture text for a reflected moment: left and right (and the side roles) swap. */
export function sideText(text: string, mirrored: boolean): string {
  return mirrored ? text.replace(/\b(left|right|Left|Right|LB|RB|LW|RW)\b/g, (w) => SWAP[w] ?? w) : text;
}
