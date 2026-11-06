/**
 * Owner-authorized art fallbacks (D76d): the supplied team-training sheets are used now. Where a direction or action
 * has no frames, the closest supplied animation stands in and the gap stays documented; it no longer blocks release.
 * A tackle has no stand-in (it must not be faked with pass frames) and still blocks.
 */
import type { Gap } from './schema';

export function fallbackFor(g: Gap): string | null {
  if (/^(run|shuffle|stand|keeper-ready) /.test(g.need) || /^(run|shuffle) (up|down) the screen/.test(g.need)) return 'Closest supplied view: the three-quarter side frames, mirrored to face the ball or the travel side; body facing stays separate from travel direction.';
  if (/^pass (up|down) the screen/.test(g.need)) return 'Closest supplied view: the side-on pass row, mirrored toward the target side; the ball travels the true route.';
  if (/^dribble touches/.test(g.need)) return 'Run-cycle frames; the separate ball is pushed ahead on each timed touch and the runner catches up between touches.';
  return null;
}

/** A gap that still blocks release after the owner's fallback authorization. */
export const blocksAfterFallback = (g: Gap): boolean => g.blocksRelease && fallbackFor(g) === null;
