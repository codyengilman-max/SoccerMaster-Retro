/**
 * Shared weekly development engine (progression v2). Framework-free and pure.
 * One engine for the career player, Batavia AI teammates and opposing players: each role applies exactly one
 * multiplier to earned growth, never to existing ratings. See docs/PROGRESSION.md.
 */
import { ATTRIBUTES, type AttributeId } from './types';

export type DevRole = 'protagonist' | 'teammate' | 'opponent';
export type DevSourceId = 'home' | 'team' | 'match';

export const DEV_CONFIG = {
  version: 2,
  /** Shares of one week's development opportunity. */
  sources: { home: 0.35, team: 0.35, match: 0.3 } as Readonly<Record<DevSourceId, number>>,
  /** Earned-growth multipliers: protagonist = 2× opponent = 1.7× teammate. */
  multipliers: { protagonist: 2, teammate: 2 / 1.7, opponent: 1 } as Readonly<Record<DevRole, number>>,
  /** Attribute points (summed over the ten attributes) one week earns at full evidence, before the multiplier. */
  weeklyBudget: 4.2,
  /** New-career attribute value (overall 50). */
  start: 50,
  /** Season 1 overall ceiling for the career player only. */
  seasonOneCap: 64,
  attrMin: 0,
  attrMax: 100,
  /** Home credit: each distinct activity counts once a week, at most this many count. */
  homeActivitiesMax: 3,
} as const;

/** One fixed progression-overall formula all season: the equal-weight mean of the ten active attributes. */
export function overallOf(a: Readonly<Record<AttributeId, number>>): number {
  return ATTRIBUTES.reduce((s, k) => s + (Number.isFinite(a[k]) ? a[k] : 0), 0) / ATTRIBUTES.length;
}

/**
 * One source's week. `none` = nothing eligible was scheduled (not a failure: its share goes to the sources that
 * were available); `skipped` = scheduled but not done (scores 0, share kept); `done` = completed with a 0–1 score.
 */
export interface SourceWeek {
  readonly source: DevSourceId;
  readonly status: 'none' | 'skipped' | 'done';
  /** 0–1 evidence score, ignored unless done. */
  readonly score: number;
  /** Where the source's growth goes; normalized to sum to 1. */
  readonly allocation: Readonly<Partial<Record<AttributeId, number>>>;
  readonly activities: readonly string[];
}

export interface DevProposal {
  readonly version: number;
  readonly role: DevRole;
  readonly multiplier: number;
  /** Source shares after redistributing unavailable (`none`) sources. */
  readonly shares: Readonly<Partial<Record<DevSourceId, number>>>;
  readonly evidence: number;
  /** Gains before any ceiling. */
  readonly proposed: Readonly<Record<AttributeId, number>>;
  /** Gains that fit the ceiling (= proposed when no ceiling applies). */
  readonly applied: Readonly<Record<AttributeId, number>>;
  readonly overallBefore: number;
  readonly overallAfter: number;
  /** Share of the proposed gain kept (1 = uncapped). */
  readonly capScale: number;
  readonly capped: boolean;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const zero = (): Record<AttributeId, number> => Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<AttributeId, number>;

export function normalizeAllocation(w: Readonly<Partial<Record<AttributeId, number>>>): Partial<Record<AttributeId, number>> {
  const total = ATTRIBUTES.reduce((s, a) => s + Math.max(0, w[a] ?? 0), 0);
  if (total <= 0) return {};
  const out: Partial<Record<AttributeId, number>> = {};
  for (const a of ATTRIBUTES) if ((w[a] ?? 0) > 0) out[a] = w[a]! / total;
  return out;
}

/** Shares of the available sources, renormalized to 1; a week with nothing scheduled anywhere has no shares. */
export function sourceShares(weeks: readonly SourceWeek[]): Partial<Record<DevSourceId, number>> {
  const avail = weeks.filter((w) => w.status !== 'none');
  const total = avail.reduce((s, w) => s + DEV_CONFIG.sources[w.source], 0);
  const out: Partial<Record<DevSourceId, number>> = {};
  if (total <= 0) return out;
  for (const w of avail) out[w.source] = DEV_CONFIG.sources[w.source] / total;
  return out;
}

/**
 * earned growth per attribute = weeklyBudget × Σ(source share × evidence × allocation) × role multiplier.
 * `cap` (career player only): positive gains are scaled down together so the unrounded overall never passes it.
 */
export function proposeWeek(attributes: Readonly<Record<AttributeId, number>>, weeks: readonly SourceWeek[], role: DevRole, cap: number | null): DevProposal {
  const seen = new Set<DevSourceId>();
  const uniq = weeks.filter((w) => (seen.has(w.source) ? false : (seen.add(w.source), true)));
  const shares = sourceShares(uniq);
  const mult = DEV_CONFIG.multipliers[role];
  const proposed = zero();
  let evidence = 0;
  for (const w of uniq) {
    const share = shares[w.source] ?? 0;
    const score = w.status === 'done' ? clamp01(w.score) : 0;
    evidence += share * score;
    const alloc = normalizeAllocation(w.allocation);
    for (const a of ATTRIBUTES) proposed[a] += DEV_CONFIG.weeklyBudget * share * score * (alloc[a] ?? 0) * mult;
  }
  const before = overallOf(attributes);
  // Individual attributes stay on the 0–100 scale.
  for (const a of ATTRIBUTES) proposed[a] = Math.max(0, Math.min(proposed[a], DEV_CONFIG.attrMax - attributes[a]));
  const gain = ATTRIBUTES.reduce((s, a) => s + proposed[a], 0) / ATTRIBUTES.length;
  let scale = 1;
  if (cap !== null && gain > 0) scale = Math.max(0, Math.min(1, (cap - before) / gain));
  const applied = zero();
  for (const a of ATTRIBUTES) applied[a] = proposed[a] * scale;
  const after = before + ATTRIBUTES.reduce((s, a) => s + applied[a], 0) / ATTRIBUTES.length;
  return { version: DEV_CONFIG.version, role, multiplier: mult, shares, evidence, proposed, applied, overallBefore: before, overallAfter: after, capScale: scale, capped: scale < 1 };
}

export function applyProposal(attributes: Readonly<Record<AttributeId, number>>, p: DevProposal): Record<AttributeId, number> {
  const out = { ...attributes } as Record<AttributeId, number>;
  for (const a of ATTRIBUTES) out[a] = attributes[a] + p.applied[a];
  return out;
}

/** A whole bonus point (+1, no multiplier) fits only if the overall stays within the ceiling. */
export function bonusFits(attributes: Readonly<Record<AttributeId, number>>, a: AttributeId, cap: number | null): { ok: true } | { ok: false; reason: string } {
  if (attributes[a] + 1 > DEV_CONFIG.attrMax) return { ok: false, reason: 'That attribute is already at 100.' };
  if (cap !== null && overallOf({ ...attributes, [a]: attributes[a] + 1 }) > cap + 1e-9) return { ok: false, reason: `A full point would take your overall past the Season 1 maximum of ${cap}. Your point stays banked.` };
  return { ok: true };
}
