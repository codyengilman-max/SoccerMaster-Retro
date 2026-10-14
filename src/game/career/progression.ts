import { CAREER_CONFIG, type GrowthConfig } from './config';
import type { CareerPlayer } from './player';
import { ATTRIBUTES, ATTRIBUTE_LABELS, type AttributeId } from './types';

/** One trusted, attributed in-game opportunity. Created only by the game, never by the journal. */
export interface EvidenceItem {
  readonly attribute: AttributeId;
  readonly source: 'match' | 'coach';
  /** Equivalent situations share a key and get diminishing returns. */
  readonly situation: string;
  /** 0 = not achieved, 0.5 = partly, 1 = achieved. */
  readonly success: 0 | 0.5 | 1;
  readonly note: string;
}

export interface AttributeOutcome {
  readonly attribute: AttributeId;
  readonly opportunities: number;
  readonly weightedOpportunities: number;
  readonly weightedSuccesses: number;
  readonly from: number;
  readonly to: number;
  readonly reason: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Weekly growth from game evidence only. Home practice is not an input: it cannot raise attributes.
 * Scoring or winning is not an input either; only the quality of the career player's own actions is.
 */
export function computeGrowth(player: CareerPlayer, evidence: readonly EvidenceItem[], cfg: GrowthConfig = { ...CAREER_CONFIG.growth }): AttributeOutcome[] {
  const raw: { attribute: AttributeId; points: number; opp: number; wOpp: number; wSucc: number; reason: string }[] = [];
  for (const attribute of ATTRIBUTES) {
    const items = evidence.filter((e) => e.attribute === attribute);
    const seen = new Map<string, number>();
    let wOpp = 0;
    let match = 0;
    let coach = 0;
    for (const e of items) {
      const k = (seen.get(`${e.source}:${e.situation}`) ?? 0) + 1;
      seen.set(`${e.source}:${e.situation}`, k);
      const w = Math.max(cfg.repeatFloor, cfg.repeatDecay ** (k - 1));
      wOpp += w;
      if (e.source === 'coach') coach += w * e.success;
      else match += w * e.success;
    }
    // Coach answers count as tactical evidence but never more than coachMaxShare of the total.
    const coachAllowed = cfg.coachMaxShare >= 1 ? coach : Math.min(coach, (match * cfg.coachMaxShare) / (1 - cfg.coachMaxShare));
    const coachOnly = match === 0 && coach > 0;
    const wSucc = coachOnly ? coach : match + coachAllowed;
    const label = ATTRIBUTE_LABELS[attribute];
    let points = 0;
    let reason: string;
    if (items.length === 0) reason = `${label}: no chances this week, so no change. That is not a failure.`;
    else if (wOpp < cfg.minOpportunities) reason = `${label}: only ${round2(wOpp)} chances counted (need ${cfg.minOpportunities}), so no change yet.`;
    else if (wSucc / wOpp < cfg.minSuccessRate) reason = `${label}: ${Math.round((100 * wSucc) / wOpp)}% of chances went well (need ${Math.round(cfg.minSuccessRate * 100)}%). Keep at it.`;
    else {
      points = Math.floor(wSucc / cfg.successesPerPoint);
      if (coachOnly) points = Math.min(points, cfg.coachOnlyMaxGrowth);
      points = Math.min(points, cfg.weeklyCapPerAttribute);
      reason = points > 0 ? `${label}: ${round2(wSucc)} of ${round2(wOpp)} counted chances went well.` : `${label}: good signs, not enough yet for a point.`;
      if (coachOnly) reason += ' Based on Coach answers only, so capped.';
    }
    raw.push({ attribute, points, opp: items.length, wOpp, wSucc, reason });
  }
  let total = 0;
  const order = [...raw].sort((a, b) => b.points - a.points || b.wSucc - a.wSucc);
  const granted = new Map<AttributeId, { points: number; note: string }>();
  for (const r of order) {
    const from = player.attributes[r.attribute];
    const ceiling = Math.min(player.potential[r.attribute], CAREER_CONFIG.attributes.max);
    let p = Math.min(r.points, Math.max(0, ceiling - from), cfg.weeklyCapTotal - total);
    let note = '';
    if (r.points > 0 && from + r.points > ceiling) note = ` Limited by potential (${ceiling}).`;
    else if (r.points > p) note = ' Limited by the weekly total cap.';
    p = Math.max(0, p);
    total += p;
    granted.set(r.attribute, { points: p, note });
  }
  return raw.map((r) => {
    const g = granted.get(r.attribute)!;
    const from = player.attributes[r.attribute];
    return {
      attribute: r.attribute,
      opportunities: r.opp,
      weightedOpportunities: round2(r.wOpp),
      weightedSuccesses: round2(r.wSucc),
      from,
      to: from + g.points,
      reason: (g.points > 0 ? `+${g.points}. ` : '') + r.reason + g.note,
    };
  });
}

export function applyGrowth(player: CareerPlayer, outcomes: readonly AttributeOutcome[]): CareerPlayer {
  const attributes = { ...player.attributes };
  for (const o of outcomes) attributes[o.attribute] = o.to;
  return { ...player, attributes };
}
