import { describe, expect, it } from 'vitest';
import { contestResult, newContest, nextSlot, type Contest } from '../src/game/story/crossbar';

const shot = (c: Contest, round: 'main' | 'sudden', participant: 'player' | 'blake', index: number, scored: boolean): Contest =>
  ({ ...c, attempts: [...c.attempts, { key: `${round}${participant}${index}`, round, participant, index, state: 'resolved', scored } as never] });

describe('crossbar sudden death', () => {
  it('Blake replies after the player scores in sudden death; no winner on unequal attempts', () => {
    let c = newContest('t', false);
    for (let i = 0; i < 3; i++) { c = shot(c, 'main', 'player', i, i === 0); c = shot(c, 'main', 'blake', i, i === 0); }
    expect(nextSlot(c)).toEqual({ round: 'sudden', participant: 'player', index: 0 });
    c = shot(c, 'sudden', 'player', 0, true);
    expect(nextSlot(c)).toEqual({ round: 'sudden', participant: 'blake', index: 0 });
    expect(contestResult(c)).toBeNull();
    c = shot(c, 'sudden', 'blake', 0, false);
    expect(contestResult(c)).toBe('WIN');
  });
});
