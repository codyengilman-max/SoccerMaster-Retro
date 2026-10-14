import { MATCH_TUNING, type MatchTuning } from './tuning';
import type { MatchClock, MatchState } from './types';

export type MatchResult = 'win' | 'draw' | 'loss';

/** Home team's result from the score. */
export function matchResult(s: Readonly<MatchState>): MatchResult {
  return s.score.home > s.score.away ? 'win' : s.score.home < s.score.away ? 'loss' : 'draw';
}

/** Match-clock minute:second on the U11 half length (e.g. "1st 12:30", "2nd 37:05"). */
export function clockLabel(c: Readonly<MatchClock>, T: MatchTuning = MATCH_TUNING): string {
  const half = T.match.displayHalfMinutes * 60;
  const shown = Math.min(half, Math.floor((c.elapsed / c.halfSeconds) * half)) + (c.half - 1) * half;
  return `${c.half === 1 ? '1st' : '2nd'} ${Math.floor(shown / 60)}:${String(shown % 60).padStart(2, '0')}`;
}
