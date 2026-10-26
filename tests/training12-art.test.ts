import { describe, expect, it } from 'vitest';
import manifest from '../src/assets/art/team-training-v1/manifest.json';
import { baselineBody, baselinePlaceholder, targetBody, TT_ART, TT_OPPONENTS, TT_TEAMMATES, ttIdentities, ttScale } from '../src/render/art/teamTrainingFrames';
import { ALL_FIXTURES as FIXTURES } from '../src/game/training12/situations/index';
import { createSituation } from '../src/game/training12/situations/sim';

describe('Team Training art v1', () => {
  it('stays marked as a review build', () => {
    expect(manifest.status).toBe('art_review_build_not_shipping_approved');
  });

  it('draws the visible body at exactly 1.2075x the original training body, applied once', () => {
    for (const k of [5, 8.46, 10, 13.1, 20]) {
      expect(targetBody(k) / baselineBody(k)).toBeCloseTo(1.2075, 10);
      expect(baselineBody(k)).toBeCloseTo(1.3 * baselinePlaceholder(k), 10);
      expect(ttScale(k) * TT_ART.standVisibleHeight).toBeCloseTo(targetBody(k), 10);
    }
  });

  it('gives every one of the 18 one stable supplied sheet: one saved protagonist, 7 teammates, 8 opponents, 2 keepers', () => {
    for (const look of ['boy', 'girl'] as const) {
      for (const f of FIXTURES) {
        for (const variant of ['cue', 'counter'] as const) {
          const s = createSituation(f, variant, false);
          const home = s.actors.filter((a) => a.side === 'A' || a.side === 'GK_A').map((a) => a.slot);
          const away = s.actors.filter((a) => a.side === 'B' || a.side === 'GK_B').map((a) => a.slot);
          const me = s.actors.find((a) => a.human)!.slot;
          const gk = (side: string) => s.actors.find((a) => a.side === side)?.slot ?? null;
          const ids = ttIdentities(look, home, away, me, gk('GK_A'), gk('GK_B'));
          const again = ttIdentities(look, home, away, me, gk('GK_A'), gk('GK_B'));
          expect([...again], `${f.id} stable`).toEqual([...ids]);
          const sheets = s.actors.map((a) => ids.get(a.slot));
          expect(sheets.every(Boolean), `${f.id} ${variant} every player drawn`).toBe(true);
          expect(sheets.filter((x) => x === 'boy' || x === 'girl'), `${f.id} one protagonist`).toEqual([look]);
          expect(ids.get(me)).toBe(look);
          // Keeper sessions (review-only) make the protagonist the home keeper: their sheet replaces the keeper strip.
          const meKeeper = s.actors.find((a) => a.human)!.side === 'GK_A';
          expect(sheets.filter((x) => x === 'keeper_home'), `${f.id} ${variant} home keeper`).toHaveLength(meKeeper ? 0 : 1);
          expect(sheets.filter((x) => x === 'keeper_away'), `${f.id} ${variant} away keeper ${s.actors.filter((a) => a.role === 'GK').map((a) => a.slot + ':' + a.side).join(',')}`).toHaveLength(1);
          expect(new Set(sheets.filter((x) => (TT_TEAMMATES as readonly string[]).includes(x!))).size).toBe(7);
          expect(new Set(sheets.filter((x) => (TT_OPPONENTS as readonly string[]).includes(x!))).size).toBe(8);
        }
      }
    }
  });
});
