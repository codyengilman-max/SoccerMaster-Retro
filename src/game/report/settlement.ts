import { activityById } from '../career/catalog';
import { CAREER_CONFIG } from '../career/config';
import type { CareerPlayer } from '../career/player';
import { ATTRIBUTES, type AttributeId } from '../career/types';
import type { MatchRating } from './rating';
import { REGISTRY_VERSION, weekBudget, type DevSource } from './registry';
import type { MatchStats } from './stats';

/** Bump when the settlement arithmetic changes. Settled weeks keep the version they used. */
export const SETTLEMENT_VERSION = 1;
/** Development credits a perfect week can earn across all sources (1 credit = 1 attribute point). */
export const WEEK_CREDITS = 1;
/** Self-logged home sessions are trusted less than play the game observed. */
export const HOME_CONFIDENCE = 0.6;
/** Credits banked per attribute never exceed this, so blocked weeks cannot be saved up. */
export const CARRY_MAX = 1;
/** Within this many points of potential, credits shrink linearly to zero. */
export const SLOWDOWN_RANGE = 10;

const CONFIDENCE: Readonly<Record<MatchRating['confidence'], number>> = { high: 1, medium: 0.75, low: 0.5, none: 0 };

export type Fractions = Readonly<Record<AttributeId, number>>;
export const zeroFractions = (): Record<AttributeId, number> =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<AttributeId, number>;

export interface SourceSettlement {
  readonly source: DevSource;
  /** This week's share of the development opportunity (after recess redistribution). */
  readonly share: number;
  /** 0–1: how much of the opportunity was taken and how well. */
  readonly factor: number;
  /** 0–1: how much the evidence is trusted. */
  readonly confidence: number;
  readonly credits: number;
  readonly attributes: Partial<Fractions>;
  readonly note: string;
}

export interface WeekSettlement {
  readonly version: number;
  readonly registry: number;
  readonly week: number;
  readonly recessScheduled: boolean;
  readonly sources: readonly SourceSettlement[];
  /** Fractional credits earned this week, after the potential slowdown. */
  readonly earned: Fractions;
  /** Whole points applied this week on top of the evidence growth. */
  readonly applied: Fractions;
  /** Fractions kept for next week. */
  readonly carry: Fractions;
}

export interface MatchInput {
  readonly minutes: number;
  readonly stats: MatchStats;
  readonly rating: MatchRating;
}

export interface SettleInput {
  readonly week: number;
  readonly player: CareerPlayer;
  /** Activity ids of this week's credited home sessions. */
  readonly homeSessions: readonly string[];
  /** Mean Team Training score (0–1) for the week, or null when none was done. */
  readonly teamScore: number | null;
  readonly teamAttributes: readonly AttributeId[];
  /** Every match report of this week (a tournament week can have several). */
  readonly matches: readonly MatchInput[];
  /** null when no recess was scheduled this week. */
  readonly recess: { readonly played: boolean } | null;
  readonly carry: Fractions;
  /** Points the evidence growth already granted this week, per attribute (count against the caps). */
  readonly granted: Fractions;
  /** Protagonist growth modifier, applied once. */
  readonly modifier?: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

function split(weights: Partial<Record<AttributeId, number>>, credits: number): Partial<Fractions> {
  const total = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
  if (total <= 0 || credits <= 0) return {};
  const out: Partial<Record<AttributeId, number>> = {};
  for (const a of ATTRIBUTES) if (weights[a]) out[a] = r4((credits * weights[a]!) / total);
  return out;
}

function matchWeights(s: MatchStats): Partial<Record<AttributeId, number>> {
  return {
    passing: s.passes.den,
    awareness: s.passes.den,
    firstTouch: s.involvements,
    dribbling: s.possessions,
    finishing: s.shotsOnTarget.den,
    defending: s.recoveries + s.interceptions + s.slides.den,
  };
}

/**
 * One weekly settlement: source share × performance factor × evidence confidence × modifier, split over the
 * attributes the evidence touched. Skipped activities earn nothing (no redistribution); matches of one week
 * share one match share, averaged by their opportunities, so volume and replays never add more.
 */
export function settleWeek(i: SettleInput): WeekSettlement {
  const budget = weekBudget(i.recess !== null);
  const mod = Math.max(0, i.modifier ?? 1);
  const C = CAREER_CONFIG.growth;
  const sources: SourceSettlement[] = [];

  const perWeek = CAREER_CONFIG.home.sessionsPerWeek;
  const homeW: Partial<Record<AttributeId, number>> = {};
  for (const id of i.homeSessions) {
    const a = activityById(id)?.relatedAttribute;
    if (a) homeW[a] = (homeW[a] ?? 0) + 1;
  }
  const homeF = clamp01(i.homeSessions.length / perWeek);
  const homeC = WEEK_CREDITS * budget.home * homeF * HOME_CONFIDENCE * mod;
  sources.push({ source: 'home', share: budget.home, factor: r4(homeF), confidence: HOME_CONFIDENCE, credits: r4(homeC), attributes: split(homeW, homeC), note: `${i.homeSessions.length}/${perWeek} home sessions` });

  const teamF = i.teamScore === null ? 0 : clamp01(i.teamScore);
  const teamC = i.teamAttributes.length ? WEEK_CREDITS * budget.team * teamF * mod : 0;
  const teamW = Object.fromEntries(i.teamAttributes.map((a) => [a, 1]));
  sources.push({ source: 'team', share: budget.team, factor: r4(teamF), confidence: 1, credits: r4(teamC), attributes: split(teamW, teamC), note: i.teamScore === null ? 'No Team Training this week' : `Team Training ${Math.round(teamF * 100)}%` });

  const played = i.matches.filter((m) => m.minutes > 0);
  let opp = 0;
  let weighted = 0;
  let conf = 0;
  const mW: Partial<Record<AttributeId, number>> = {};
  for (const m of played) {
    const w = matchWeights(m.stats);
    const o = Object.values(w).reduce((a, b) => a + (b ?? 0), 0);
    const c = CONFIDENCE[m.rating.confidence];
    opp += o;
    weighted += o * clamp01((m.rating.overall ?? 0) / 100);
    conf += o * c;
    for (const a of ATTRIBUTES) mW[a] = (mW[a] ?? 0) + (w[a] ?? 0);
  }
  const matchF = opp > 0 ? weighted / opp : 0;
  const matchConf = opp > 0 ? conf / opp : 0;
  const matchC = WEEK_CREDITS * budget.match * matchF * matchConf * mod;
  sources.push({ source: 'match', share: budget.match, factor: r4(matchF), confidence: r4(matchConf), credits: r4(matchC), attributes: split(mW, matchC), note: played.length === 0 ? 'No match played this week: match development unearned' : `${played.length} match${played.length > 1 ? 'es' : ''} (one shared match share)` });

  if (i.recess) {
    const f = i.recess.played ? 1 : 0;
    const c = WEEK_CREDITS * budget.recess * f * mod;
    sources.push({ source: 'recess', share: budget.recess, factor: f, confidence: 1, credits: r4(c), attributes: split({ dribbling: 1 }, c), note: i.recess.played ? 'Recess game played' : 'Recess game skipped' });
  }

  const earned = zeroFractions();
  const applied = zeroFractions();
  const carry = zeroFractions();
  let total = ATTRIBUTES.reduce((a, k) => a + (i.granted[k] ?? 0), 0);
  for (const a of ATTRIBUTES) {
    const raw = sources.reduce((s, x) => s + (x.attributes[a] ?? 0), 0);
    const from = i.player.attributes[a] + (i.granted[a] ?? 0);
    const ceiling = Math.min(i.player.potential[a], CAREER_CONFIG.attributes.max);
    const slow = clamp01((ceiling - from) / SLOWDOWN_RANGE);
    earned[a] = r4(raw * slow);
    let bank = (i.carry[a] ?? 0) + earned[a];
    const room = Math.max(0, Math.min(ceiling - from, C.weeklyCapPerAttribute - (i.granted[a] ?? 0), C.weeklyCapTotal - total));
    const pts = Math.min(Math.floor(bank + 1e-9), room);
    applied[a] = pts;
    total += pts;
    bank -= pts;
    carry[a] = r4(Math.min(CARRY_MAX, ceiling - from - pts <= 0 ? 0 : bank));
  }
  return { version: SETTLEMENT_VERSION, registry: REGISTRY_VERSION, week: i.week, recessScheduled: i.recess !== null, sources, earned, applied, carry };
}
