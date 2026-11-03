/**
 * Driveway Dribbling development rewards (framework-free). Integer quarter points throughout:
 * 1 quarter = 0.25 development points = +0.25 on one attribute before the Season 1 ceiling.
 * The week's best reward is a ledger shared by all difficulties and replays, capped at WEEKLY_CAP_QUARTERS.
 */
import { DIFFICULTY, DD_ATTRIBUTES, REWARD_QUARTERS, WEEKLY_CAP_QUARTERS, type DdDifficulty, type Medal } from './config';
import type { AttributeId } from '../career/types';

export type QuarterAlloc = Partial<Record<AttributeId, number>>;

/** Reward an attempt qualifies for, before the weekly ledger (never above the weekly cap). */
export function attemptQuarters(d: DdDifficulty, m: Medal): number {
  return Math.min(WEEKLY_CAP_QUARTERS, REWARD_QUARTERS[d][m]);
}

/** New quarters an attempt pays: only the improvement above the week's previous best, within the cap. */
export function weeklyPayout(prevBestQuarters: number, attempt: number): { readonly pay: number; readonly best: number } {
  const prev = Math.max(0, Math.min(WEEKLY_CAP_QUARTERS, Math.floor(prevBestQuarters)));
  const best = Math.max(prev, Math.min(WEEKLY_CAP_QUARTERS, Math.floor(attempt)));
  return { pay: best - prev, best };
}

/**
 * Splits newly paid quarters across attributes from the attempt's successful actions:
 * clean dodges -> First touch (control), shared with Agility/Pace by the difficulty's speed share (faster patterns);
 * targets destroyed -> Finishing. Misses earn nothing. An attempt with no successful action puts it all on First touch.
 * Largest remainder, ties in DD_ATTRIBUTES order, so the split is exact and deterministic.
 */
export function allocateQuarters(q: number, d: DdDifficulty, r: { readonly dodges: number; readonly targets: number }): QuarterAlloc {
  const n = Math.max(0, Math.floor(q));
  if (n === 0) return {};
  const dodges = Math.max(0, r.dodges);
  const targets = Math.max(0, r.targets);
  if (dodges + targets === 0) return { firstTouch: n };
  const s = DIFFICULTY[d].speedShare;
  const w: Record<string, number> = { firstTouch: dodges * (1 - s), finishing: targets, agility: (dodges * s) / 2, pace: (dodges * s) / 2 };
  const total = DD_ATTRIBUTES.reduce((a, k) => a + (w[k] ?? 0), 0);
  const raw = DD_ATTRIBUTES.map((k) => ({ k, v: (n * (w[k] ?? 0)) / total }));
  const out: Record<string, number> = {};
  let used = 0;
  for (const { k, v } of raw) { out[k] = Math.floor(v); used += out[k]!; }
  const order = raw.map((x, i) => ({ ...x, i, rem: x.v - Math.floor(x.v) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (let i = 0; used < n; i++, used++) out[order[i % order.length]!.k]! += 1;
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v > 0)) as QuarterAlloc;
}

export const sumQuarters = (a: QuarterAlloc): number => Object.values(a).reduce((s, v) => s + (v ?? 0), 0);
