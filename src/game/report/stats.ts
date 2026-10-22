import type { LedgerEvent } from './ledger';

/** Numerator over denominator; `pct` is null when there were no attempts (shown as "—", never 0% or 100%). */
export interface Ratio {
  readonly num: number;
  readonly den: number;
  readonly pct: number | null;
}
export const ratio = (num: number, den: number): Ratio => ({ num, den, pct: den > 0 ? Math.round((100 * num) / den) : null });
export const ratioLabel = (r: Ratio): string => (r.den === 0 ? '— (no attempts)' : `${r.num}/${r.den} (${r.pct}%)`);

export interface MatchStats {
  /** Deliberate controlled contacts (receptions, interceptions, tackles). Not a true touch count: dribble touches are not modelled. */
  readonly involvements: number;
  readonly possessions: number;
  readonly possessionLosses: number;
  readonly passes: Ratio;
  readonly groundPasses: Ratio;
  /** This match engine has no chipped pass, so chips are always 0/0 and the combined total equals ground passes. */
  readonly chips: Ratio;
  readonly shotsOnTarget: Ratio;
  readonly goalConversion: Ratio;
  readonly goals: number;
  readonly recoveries: number;
  readonly interceptions: number;
  readonly slides: Ratio;
  readonly fouls: number;
  /** Not tracked by this engine: take-ons, assists, shoulder challenges (Jungle Ball only), off-ball positioning. */
  readonly unavailable: readonly string[];
}

const count = (ev: readonly LedgerEvent[], kind: LedgerEvent['kind'], outcome?: string) => ev.filter((e) => e.kind === kind && (outcome === undefined || e.outcome === outcome)).length;

export function matchStats(ev: readonly LedgerEvent[]): MatchStats {
  // Unknown outcomes (event log gaps, still open at full time) are left out of both sides of a ratio.
  const passes = ev.filter((e) => e.kind === 'pass' && e.outcome !== 'unknown');
  const shots = ev.filter((e) => e.kind === 'shot' && e.outcome !== 'unknown');
  const slides = ev.filter((e) => e.kind === 'slide' && e.outcome !== 'unknown');
  const done = passes.filter((e) => e.outcome === 'complete').length;
  const goals = count(ev, 'goal');
  const onTarget = shots.filter((e) => e.outcome === 'goal' || e.outcome === 'onTarget').length;
  return {
    involvements: count(ev, 'involvement'),
    possessions: count(ev, 'possession'),
    possessionLosses: count(ev, 'possessionLost'),
    passes: ratio(done, passes.length),
    groundPasses: ratio(done, passes.length),
    chips: ratio(0, 0),
    shotsOnTarget: ratio(onTarget, shots.length),
    goalConversion: ratio(goals, shots.length),
    goals,
    recoveries: count(ev, 'recovery'),
    interceptions: count(ev, 'interception'),
    slides: ratio(slides.filter((e) => e.outcome === 'won').length, slides.length),
    fouls: count(ev, 'foul'),
    unavailable: ['Take-ons', 'Assists', 'Shoulder challenges', 'Off-ball positioning'],
  };
}
