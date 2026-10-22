import { describe, expect, it } from 'vitest';
import type { MatchEvent, MatchState } from '../src/game/match/types';
import { MatchLedger } from '../src/game/report/ledger';
import { matchStats, ratioLabel } from '../src/game/report/stats';
import { rateMatch } from '../src/game/report/rating';

type P = { team: 'home' | 'away'; pos: { x: number; y: number } };
const players: Record<string, P> = {
  h1: { team: 'home', pos: { x: 10, y: 10 } },
  h2: { team: 'home', pos: { x: 30, y: 10 } },
  a1: { team: 'away', pos: { x: 32, y: 11 } },
  a2: { team: 'away', pos: { x: 60, y: 40 } },
};
const state = (owner: string | null, t: number) => ({ players, ball: { owner }, simTime: t }) as unknown as MatchState;
let seq = 0;
const ev = (type: MatchEvent['type'], by: string | null, detail = '', at = seq): MatchEvent => ({ seq: seq++, type, by: by as MatchEvent['by'], detail, at });

function run(frames: [string | null, MatchEvent[]][]): MatchLedger {
  const l = new MatchLedger('h1' as MatchEvent['by'] & string);
  const log: MatchEvent[] = [];
  frames.forEach(([owner, es], i) => {
    log.push(...es);
    l.observe(state(owner, i), log.slice(-40));
    l.observe(state(owner, i), log.slice(-40)); // re-reading the same log never double counts
  });
  l.finish();
  return l;
}

describe('match ledger and stats', () => {
  it('counts a reception once, not every frame the ball stays with the player', () => {
    seq = 0;
    const l = run([['h1', [ev('received', 'h1')]], ['h1', []], ['h1', []], ['h1', [ev('dribble', 'h1')]]]);
    const s = matchStats(l.events);
    expect(s.involvements).toBe(1);
    expect(s.possessions).toBe(1);
  });

  it('a cancelled kick is not an attempt; no attempts shows "—"', () => {
    seq = 0;
    const l = run([['h1', [ev('padPress', 'h1', 'pass'), ev('padCancel', 'h1', 'aim: cancelled')]]]);
    const s = matchStats(l.events);
    expect(s.passes.den).toBe(0);
    expect(s.passes.pct).toBeNull();
    expect(ratioLabel(s.shotsOnTarget)).toBe('— (no attempts)');
  });

  it('completed pass needs a teammate reception; covered receiver is a decision miss even if completed', () => {
    seq = 0;
    const l = run([
      ['h1', [ev('received', 'h1')]],
      [null, [ev('pass', 'h1', 'h2')]],
      ['h2', [ev('received', 'h2')]],
    ]);
    const s = matchStats(l.events);
    expect(s.passes).toEqual({ num: 1, den: 1, pct: 100 });
    expect(l.events.find((e) => e.kind === 'pass')!.open).toBe(false); // a1 is 2 yd from h2
    expect(s.groundPasses.den + s.chips.den).toBe(s.passes.den);
  });

  it('one possession loss per episode, even with a tackle and a possession change', () => {
    seq = 0;
    const l = run([
      ['h1', [ev('received', 'h1')]],
      ['a1', [ev('possession', 'a1', 'away'), ev('tackle', 'a1', 'won the ball from h1')]],
      ['a1', [ev('possession', 'a1', 'established away #2')]],
    ]);
    expect(matchStats(l.events).possessionLosses).toBe(1);
  });

  it('shot on target means goal or keeper save; goals are not double counted', () => {
    seq = 0;
    const l = run([
      ['h1', [ev('received', 'h1')]],
      [null, [ev('shot', 'h1', '20')]],
      ['a2', [ev('saved', 'a2', 'keeper caught it')]],
      ['h1', [ev('received', 'h1')]],
      [null, [ev('shot', 'h1', '22'), ev('goal', 'h1', 'h1 scored')]],
      [null, [ev('shot', 'h1', '18'), ev('out', null, 'wide')]],
    ]);
    const s = matchStats(l.events);
    expect(s.shotsOnTarget).toEqual({ num: 2, den: 3, pct: 67 });
    expect(s.goals).toBe(1);
    expect(s.goalConversion.num).toBe(1);
  });

  it('a foul slide is never a successful challenge', () => {
    seq = 0;
    const l = run([[null, [ev('slide', 'h1', 'start')]], [null, [ev('foul', 'h1', 'slide on a1')]]]);
    const s = matchStats(l.events);
    expect(s.slides).toEqual({ num: 0, den: 1, pct: 0 });
    expect(s.fouls).toBe(1);
  });

  it('missing evidence makes categories unavailable instead of a score; positioning is never invented', () => {
    seq = 0;
    const l = run([['h1', [ev('received', 'h1')]]]);
    const r = rateMatch(l.events, matchStats(l.events));
    expect(r.overall).toBeNull();
    expect(r.confidence).toBe('none');
    expect(r.categories.find((c) => c.id === 'positioning')!.score).toBeNull();
  });
});
