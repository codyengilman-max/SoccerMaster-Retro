/**
 * Batavia teammates and opposing players develop through the same engine as the main character
 * (development.ts), with their own role multiplier and simulated evidence. Pure: a player's ratings are a
 * function of (club, slot, reviews completed), so opening a screen or reloading a team never rerolls them,
 * and they advance only when a weekly review completes. No Season 1 maximum applies to AI players.
 */
import { DEV_CONFIG, applyProposal, proposeWeek, type DevRole, type SourceWeek } from './development';
import { ATTRIBUTES, type AttributeId } from './types';

type Attrs = Record<AttributeId, number>;

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
/** Deterministic 0–1 value for one key. */
const unit = (key: string): number => fnv(key) / 0x100000000;

/** Start: 50 per attribute with a fixed ±4 personal spread (the squad mean stays near 50). */
export function aiStart(club: string, slot: string): Attrs {
  return Object.fromEntries(ATTRIBUTES.map((a) => [a, DEV_CONFIG.start + (unit(`${club}|${slot}|start|${a}`) * 2 - 1) * 4])) as Attrs;
}

/** Simulated evidence for one review: every source scheduled, scores 0.35–0.85, allocation over all ten. */
export function aiWeekSources(club: string, slot: string, week: number): SourceWeek[] {
  return (['home', 'team', 'match'] as const).map((source) => {
    const raw = ATTRIBUTES.map((a) => 0.5 + unit(`${club}|${slot}|${week}|${source}|w|${a}`));
    const sum = raw.reduce((x, y) => x + y, 0);
    return {
      source,
      status: 'done' as const,
      score: 0.35 + 0.5 * unit(`${club}|${slot}|${week}|${source}|score`),
      allocation: Object.fromEntries(ATTRIBUTES.map((a, i) => [a, raw[i]! / sum])),
      activities: [`ai:${source}:${week}`],
    };
  });
}

/** Ratings after `reviews` completed weekly reviews. */
export function aiAttributes(club: string, slot: string, role: Exclude<DevRole, 'protagonist'>, reviews: number): Attrs {
  let a = aiStart(club, slot);
  const n = Math.max(0, Math.floor(Number.isFinite(reviews) ? reviews : 0));
  for (let w = 1; w <= n; w++) a = applyProposal(a, proposeWeek(a, aiWeekSources(club, slot, w), role, null));
  return a;
}

/** Team strength comes only from the selected players' attributes: their mean overall, nothing hidden. */
export function squadOverall(squad: readonly Readonly<Attrs>[]): number {
  if (!squad.length) return 0;
  return squad.reduce((s, a) => s + ATTRIBUTES.reduce((t, k) => t + a[k], 0) / ATTRIBUTES.length, 0) / squad.length;
}
