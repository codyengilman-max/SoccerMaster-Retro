import { describe, expect, it } from 'vitest';
import raw from '../docs/story/v0.7/club_world.json';
import { CLUB_WORLD, ClubContentError, eventEntry, parseClubWorld } from '../src/game/story/clubs';
import { CROSSBAR, contestResult, idealPower, launchAttempt, newContest, nextSlot, opponentKick, points, resolveAttempt, restoreContest, simulateShot, type Contest } from '../src/game/story/crossbar';

describe('crossbar physics', () => {
  const ideal = idealPower();
  it('a centred shot at the ideal power hits the bar and scores once', () => {
    const r = simulateShot({ dirX: 0, dirY: 1, power: ideal });
    expect(r).toMatchObject({ contact: 'bar', scored: true });
  });
  it('under the bar is a net hit, over is a miss, neither scores', () => {
    expect(simulateShot({ dirX: 0, dirY: 1, power: Math.max(0, ideal - 0.2) })).toMatchObject({ scored: false });
    expect(['net', 'ground']).toContain(simulateShot({ dirX: 0, dirY: 1, power: Math.max(0, ideal - 0.2) }).contact);
    expect(simulateShot({ dirX: 0, dirY: 1, power: Math.min(1, ideal + 0.25) })).toMatchObject({ contact: 'miss', scored: false });
  });
  it('the initial resting contact is not a bounce', () => {
    for (const p of [0, 0.5, 1]) expect(simulateShot({ dirX: 0, dirY: 1, power: p }).time).toBeGreaterThan(0.3);
  });
  it('post-only hits never score, and wide shots miss', () => {
    const contacts = new Set<string>();
    for (let k = 0; k <= 400; k++) {
      const dirX = 0.2 + k * 0.0005;
      const r = simulateShot({ dirX, dirY: 1, power: Math.max(0, ideal - 0.1) });
      contacts.add(r.contact);
      if (r.contact === 'post') expect(r.scored).toBe(false);
    }
    expect(contacts.has('post')).toBe(true);
    const wide = simulateShot({ dirX: 1, dirY: 1, power: ideal });
    expect(wide.scored).toBe(false);
    expect(['miss', 'ground']).toContain(wide.contact);
  });
  it('swept collision: the scoring power window is contiguous with no tunnelling gaps', () => {
    const scored: number[] = [];
    for (let k = 0; k <= 4000; k++) if (simulateShot({ dirX: 0, dirY: 1, power: k / 4000 }).scored) scored.push(k);
    expect(scored.length).toBeGreaterThan(20);
    expect(scored.at(-1)! - scored[0]! + 1).toBe(scored.length);
    expect(CROSSBAR.barHeight).toBe(2.13);
  });
});

describe('crossbar contest lifecycle', () => {
  const shoot = (c: Contest, power: number): Contest => {
    const slot = nextSlot(c)!;
    const input = slot.participant === 'blake' ? { dirX: 0, dirY: 1, power } : { dirX: 0, dirY: 1, power };
    const l = launchAttempt(c, slot.participant, input);
    if (!l.ok) throw new Error(l.error);
    const r = resolveAttempt(l.contest);
    if (!r.ok) throw new Error(r.error);
    return r.contest;
  };
  it('warm-up never counts; three alternating shots each; equal attempts before any result', () => {
    let c = newContest('k1', true);
    c = shoot(c, idealPower());
    c = shoot(c, idealPower());
    expect(points(c, 'player') + points(c, 'blake')).toBe(0);
    for (let i = 0; i < 5; i++) {
      c = shoot(c, i === 0 ? idealPower() : 0);
      expect(contestResult(c)).toBeNull();
    }
    c = shoot(c, 0);
    expect(contestResult(c)).toBe('WIN');
    expect(c.attempts.filter((a) => a.round === 'main')).toHaveLength(6);
  });
  it('a tie gets one sudden-death round each, then a draw', () => {
    let c = newContest('k2', false);
    for (let i = 0; i < 6; i++) c = shoot(c, 0);
    expect(nextSlot(c)).toMatchObject({ round: 'sudden', participant: 'player' });
    c = shoot(c, 0);
    expect(contestResult(c)).toBeNull();
    c = shoot(c, 0);
    expect(contestResult(c)).toBe('DRAW');
    expect(nextSlot(c)).toBeNull();
  });
  it('no extra or out-of-turn launches; reload replays the frozen input with the same result', () => {
    const c = newContest('k3', false);
    expect(launchAttempt(c, 'blake', { dirX: 0, dirY: 1, power: 0.5 }).ok).toBe(false);
    const l = launchAttempt(c, 'player', { dirX: 0, dirY: 1, power: idealPower() });
    expect(l.ok).toBe(true);
    const launched = (l as { contest: Contest }).contest;
    expect(launchAttempt(launched, 'player', { dirX: 0, dirY: 1, power: 0.5 }).ok).toBe(false);
    const reloaded = restoreContest(JSON.parse(JSON.stringify(launched)))!;
    const a = resolveAttempt(launched);
    const b = resolveAttempt(reloaded);
    expect(a).toEqual(b);
    expect(launchAttempt(c, 'player', { dirX: 0, dirY: -1, power: 2 } as never).ok).toBe(false);
  });
  it('an incompatible simulation version is interrupted, never an invented win or loss', () => {
    const c = restoreContest({ ...newContest('k4', false), simVersion: 999 })!;
    expect(c.status).toBe('interrupted');
    expect(contestResult(c)).toBeNull();
  });
  it('Blake uses the same physics, is seeded by the attempt key and is beatable', () => {
    expect(opponentKick('x')).toEqual(opponentKick('x'));
    let hits = 0;
    for (let i = 0; i < 300; i++) if (simulateShot(opponentKick(`key-${i}`)).scored) hits++;
    expect(hits / 300).toBeGreaterThan(0.1);
    expect(hits / 300).toBeLessThan(0.7);
  });
});

describe('club world', () => {
  it('six fictional clubs, Batavia starts, Next Horizon is not in the local league', () => {
    expect(CLUB_WORLD.clubs.map((c) => c.displayName)).toEqual(['FC Batavia', 'Royal Salt Academy', 'Valley Rising', 'Desert Tuzon', 'Sol Vista', 'Next Horizon']);
    expect(CLUB_WORLD.startingClubId).toBe('batavia');
    expect(CLUB_WORLD.clubs.find((c) => c.id === 'next_horizon')!.leagueParticipation).toBe('not_entered');
  });
  it('cups are U12 only; at U11 only the standing-invitation policy may be referenced', () => {
    expect(eventEntry('pacific_wave', 'next_horizon', 'U11')).toBe('not_until_U12');
    expect(eventEntry('pacific_wave', 'next_horizon', 'U12')).toBe('standing_invitation');
    expect(eventEntry('lone_star', 'batavia', 'U12')).toBe('unconfigured');
  });
  it('rejects invented league entries or dates', () => {
    const bad = JSON.parse(JSON.stringify(raw));
    bad.clubs[0].leagueParticipation = 'entered';
    expect(() => parseClubWorld(bad)).toThrow(ClubContentError);
    const bad2 = JSON.parse(JSON.stringify(raw));
    bad2.events[0].dates = '2027-06-01';
    expect(() => parseClubWorld(bad2)).toThrow(ClubContentError);
  });
});
