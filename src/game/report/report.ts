import { LEDGER_VERSION, type LedgerEvent } from './ledger';
import { rateMatch, type MatchRating } from './rating';
import { REGISTRY_VERSION } from './registry';
import { matchStats, type MatchStats } from './stats';

export const REPORTS_KEPT = 40;

/** An immutable report, built once at full time from the match's own ledger. Reopening never recalculates it. */
export interface SavedReport {
  readonly matchId: string;
  readonly week: number;
  readonly competition: string;
  readonly home: string;
  readonly away: string;
  readonly score: { readonly home: number; readonly away: number };
  /** Snapshot at the match; a later name or position change does not rewrite it. */
  readonly playerName: string;
  readonly position: string;
  readonly minutes: number;
  readonly stats: MatchStats;
  readonly rating: MatchRating;
  /** Up to three recorded events with match time, for HIGHLIGHTS. */
  readonly highlights: readonly { readonly at: number; readonly text: string }[];
  readonly versions: { readonly ledger: number; readonly registry: number; readonly rating: number };
}

export interface ReportInput {
  readonly matchId: string;
  readonly week: number;
  readonly competition: string;
  readonly home: string;
  readonly away: string;
  readonly score: { readonly home: number; readonly away: number };
  readonly playerName: string;
  readonly position: string;
  readonly minutes: number;
}

const clock = (at: number) => `${Math.floor(at / 60)}'${String(Math.floor(at % 60)).padStart(2, '0')}`;

export function buildReport(input: ReportInput, events: readonly LedgerEvent[]): SavedReport {
  const stats = matchStats(events);
  const rating = rateMatch(events, stats);
  const notable = events
    .map((e) =>
      e.kind === 'goal' ? 'Goal'
      : e.kind === 'shot' && e.outcome === 'onTarget' ? 'Shot on target, saved'
      : e.kind === 'interception' ? 'Interception'
      : e.kind === 'slide' && e.outcome === 'won' ? 'Slide tackle won the ball'
      : e.kind === 'pass' && e.outcome === 'complete' && e.open ? 'Pass to an open teammate'
      : null,
    )
    .map((text, i) => (text ? { at: events[i]!.at, text } : null))
    .filter((h): h is { at: number; text: string } => h !== null);
  const rank = (t: string) => ['Goal', 'Slide tackle won the ball', 'Interception', 'Shot on target, saved', 'Pass to an open teammate'].indexOf(t);
  const highlights = [...notable].sort((a, b) => rank(a.text) - rank(b.text) || a.at - b.at).slice(0, 3).sort((a, b) => a.at - b.at)
    .map((h) => ({ at: Math.round(h.at), text: `${clock(h.at)} ${h.text}` }));
  return { ...input, minutes: Math.max(0, Math.round(input.minutes)), stats, rating, highlights, versions: { ledger: LEDGER_VERSION, registry: REGISTRY_VERSION, rating: rating.version } };
}

/** Coach Code's two lines from the report only: one strength, one practical next step. */
export function coachFeedback(r: SavedReport): { strength: string; improve: string } {
  const s = r.stats;
  const strength =
    s.goals > 0 ? `You took your chance: ${s.goals} goal${s.goals > 1 ? 's' : ''}.`
    : s.passes.den >= 3 && (s.passes.pct ?? 0) >= 70 ? `Your passing was reliable: ${s.passes.num} of ${s.passes.den} found a teammate.`
    : s.recoveries >= 2 ? `You won the ball back ${s.recoveries} times.`
    : s.involvements > 0 ? `You got on the ball ${s.involvements} times. Keep asking for it.`
    : 'Not much of the ball today, so nothing to judge yet.';
  const improve =
    s.possessionLosses >= 2 ? `You lost it ${s.possessionLosses} times. Scan before it arrives so you know your next pass.`
    : s.shotsOnTarget.den >= 2 && (s.shotsOnTarget.pct ?? 0) < 50 ? 'Pick a corner before you shoot and keep it low.'
    : s.passes.den >= 3 && (s.passes.pct ?? 0) < 60 ? 'Check the receiver is open before you play it.'
    : s.fouls > 0 ? 'Stay on your feet unless you are sure of the ball.'
    : 'Next time, look to get on the ball more and play forward.';
  return { strength, improve };
}
