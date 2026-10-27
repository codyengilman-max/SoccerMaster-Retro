import { describe, expect, it } from 'vitest';
import { ContributionTracker, DEFENSE_UNITS } from '../src/game/report/assists';
import type { MatchEvent } from '../src/game/match/types';

const team = (id: string) => (id.startsWith('h') ? 'home' : id.startsWith('a') ? 'away' : undefined) as never;
let seq = 0;
const ev = (type: string, at: number, by: string | null, detail = ''): MatchEvent => ({ seq: seq++, type: type as never, at, by: by as never, detail });
const run = (events: MatchEvent[]) => { const t = new ContributionTracker(team); t.observe(events); return t; };

describe('assists', () => {
  it('counts a pass whose receiver dribbles and scores inside the window, not after it', () => {
    const t = run([ev('pass', 0, 'h1', 'h2'), ev('received', 1, 'h2'), ev('dribble', 2, 'h2'), ev('control', 3, 'h2'), ev('goal', 5, 'h2', 'home')]);
    expect(t.players.get('h1' as never)?.assists).toBe(1);
    const late = run([ev('pass', 0, 'h1', 'h2'), ev('received', 1, 'h2'), ev('goal', 5.01, 'h2', 'home')]);
    expect(late.players.get('h1' as never)?.assists ?? 0).toBe(0);
  });
  it('ends eligibility on another touch, an opponent touch or a stoppage; never own goals or self-assists', () => {
    expect(run([ev('pass', 0, 'h1', 'h2'), ev('received', 1, 'h2'), ev('pass', 1.5, 'h2', 'h3'), ev('received', 2, 'h3'), ev('goal', 3, 'h3', 'home')]).players.get('h1' as never)?.assists ?? 0).toBe(0);
    expect(run([ev('pass', 0, 'h1', 'h2'), ev('received', 1, 'h2'), ev('tackle', 1.5, 'a1'), ev('goal', 2, 'h2', 'home')]).players.get('h1' as never)?.assists ?? 0).toBe(0);
    expect(run([ev('pass', 0, 'h1', 'h2'), ev('received', 1, 'h2'), ev('out', 1.5, null), ev('goal', 2, 'h2', 'home')]).players.get('h1' as never)?.assists ?? 0).toBe(0);
    expect(run([ev('pass', 0, 'h1', 'h2'), ev('received', 1, 'h2'), ev('goal', 2, 'h2', 'away')]).players.get('h1' as never)?.assists ?? 0).toBe(0);
  });
  it('scores defensive events once: slide 2, standing 1, interception 3 units', () => {
    const t = run([ev('slide', 0, 'h4', 'start'), ev('tackle', 0.5, 'h4'), ev('intercepted', 3, 'h4'), ev('tackle', 5, 'h4', 'standing'), ev('slide', 6, 'h4', 'start'), ev('intercepted', 6.4, 'h4')]);
    expect(t.players.get('h4' as never)).toMatchObject({ slideWon: 2, interceptions: 1, standingWon: 1, defenseUnits: 2 + 3 + 1 + 2 });
    expect(DEFENSE_UNITS.threshold).toBe(20);
  });
  it('re-reading the same events never double counts', () => {
    const events = [ev('pass', 0, 'h1', 'h2'), ev('received', 1, 'h2'), ev('goal', 2, 'h2', 'home')];
    const t = new ContributionTracker(team);
    t.observe(events);
    t.observe(events);
    expect(t.players.get('h1' as never)?.assists).toBe(1);
  });
});
