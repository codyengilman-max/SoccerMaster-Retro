import { describe, expect, it } from 'vitest';
import { COMPETITORS, JUNGLE, canMove, command, drainEvents, newJungle, step, type JungleEvent, type JungleState } from '../src/game/jungle/sim';

/** `step` advances at most 0.25 s per call; this runs longer spans in 1/60 s frames. */
const adv = (s: JungleState, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) step(s, Math.min(1 / 60, seconds - t));
};
const live = (seed = 1): JungleState => {
  const s = newJungle(seed);
  adv(s, JUNGLE.restartFreeze + 0.02);
  drainEvents(s);
  return s;
};
/** Freezes the three AI competitors far away so a test controls every contact. */
const park = (s: JungleState): void => {
  for (const id of ['alex', 'blake', 'sam'] as const) {
    const c = s.competitors[id];
    c.pos = { x: 1 + COMPETITORS.indexOf(id), y: 1 };
    c.stunUntil = c.downUntil = c.protectedUntil = 1e9;
  }
};

describe('Jungle Ball v2 (arcade football feel)', () => {
  it('turbo makes the player faster, drains while held and refills while released', () => {
    const fast = live();
    const slow = live();
    park(fast);
    park(slow);
    for (const s of [fast, slow]) (s.ball.pos = { x: 30, y: 2 }), (s.competitors.player.pos = { x: 4, y: 11 });
    command(fast, { type: 'turbo', on: true });
    for (const s of [fast, slow]) command(s, { type: 'move', x: 1, y: 0 });
    const x0 = fast.competitors.player.pos.x;
    for (let i = 0; i < 30; i++) step(fast, 1 / 60), step(slow, 1 / 60);
    expect(fast.competitors.player.pos.x - x0).toBeGreaterThan(slow.competitors.player.pos.x - x0 + 0.5);
    expect(fast.competitors.player.turbo).toBeCloseTo(1 - JUNGLE.turboDrain * 0.5, 1);
    for (let i = 0; i < 240; i++) step(fast, 1 / 60);
    expect(fast.competitors.player.turbo).toBe(0);
    const runOut = fast.competitors.player.pos.x;
    adv(fast, 0.2);
    // Empty meter: normal speed only.
    expect(fast.competitors.player.pos.x - runOut).toBeLessThanOrEqual(JUNGLE.runSpeed * 0.2 + 1e-6);
    command(fast, { type: 'turbo', on: false });
    adv(fast, 1);
    expect(fast.competitors.player.turbo).toBeCloseTo(JUNGLE.turboRegen, 1);
  });

  it('turbo + PUSH is a big hit: knocked down longer, pushed further, meter spent; protection still follows', () => {
    const s = live();
    park(s);
    const me = s.competitors.player;
    const alex = s.competitors.alex;
    alex.stunUntil = alex.downUntil = alex.protectedUntil = 0;
    me.pos = { x: 10, y: 11 };
    me.facing = { x: 1, y: 0 };
    alex.pos = { x: 11.2, y: 11 };
    s.ball.owner = 'alex';
    command(s, { type: 'turbo', on: true });
    expect(command(s, { type: 'push' })).toBe(true);
    step(s, 1 / 60);
    const hit = drainEvents(s).find((e): e is Extract<JungleEvent, { type: 'hit' }> => e.type === 'hit');
    expect(hit).toMatchObject({ by: 'player', on: 'alex', kind: 'push', big: true });
    expect(alex.pos.x).toBeGreaterThan(11.2 + JUNGLE.pushKnock);
    expect(alex.pos.x - 11.2).toBeLessThanOrEqual(JUNGLE.bigKnock + JUNGLE.runSpeed / 60 + 1e-6);
    expect(alex.downUntil - s.t).toBeGreaterThan(JUNGLE.stunSeconds);
    expect(alex.protectedUntil).toBeCloseTo(alex.stunUntil + JUNGLE.protectSeconds, 6);
    expect(me.turbo).toBeLessThan(1 - JUNGLE.turboMoveCost + 0.01);
    expect(s.ball.owner).not.toBe('alex');
    // Knocked down: no movement until up again.
    const p = { ...alex.pos };
    adv(s, JUNGLE.knockdownSeconds - 0.1);
    expect(alex.pos).toEqual(p);
    // Protected: a second big hit during protection does not knock down again (no stun-lock).
    adv(s, 0.2);
    me.pos = { x: alex.pos.x - 1.2, y: alex.pos.y };
    me.facing = { x: 1, y: 0 };
    me.cooldownUntil = 0;
    me.turbo = 1;
    const until = alex.stunUntil;
    command(s, { type: 'push' });
    step(s, 1 / 60);
    expect(alex.stunUntil).toBe(until);
  });

  it('PUSH without turbo, or with too little meter, is the normal bounded push', () => {
    const s = live();
    park(s);
    const me = s.competitors.player;
    const alex = s.competitors.alex;
    alex.stunUntil = alex.downUntil = alex.protectedUntil = 0;
    me.pos = { x: 10, y: 11 };
    me.facing = { x: 1, y: 0 };
    alex.pos = { x: 11.2, y: 11 };
    me.turbo = JUNGLE.turboMoveCost - 0.01;
    command(s, { type: 'turbo', on: true });
    command(s, { type: 'push' });
    step(s, 1 / 60);
    expect(drainEvents(s).find((e) => e.type === 'hit')).toMatchObject({ big: false });
    expect(alex.downUntil).toBe(0);
  });

  it('turbo + SLIDE dives further than a plain slide', () => {
    const dist = (turbo: boolean): number => {
      const s = live();
      park(s);
      const me = s.competitors.player;
      me.pos = { x: 5, y: 11 };
      me.facing = { x: 1, y: 0 };
      s.ball.pos = { x: 25, y: 2 };
      command(s, { type: 'turbo', on: turbo });
      command(s, { type: 'slide' });
      adv(s, 1);
      return me.pos.x - 5;
    };
    expect(dist(true)).toBeGreaterThan(dist(false) + 1);
  });

  it('turbo + SHOOT kicks the ball harder; the shot is still saveable', () => {
    const speed = (turbo: boolean): number => {
      const s = live();
      park(s);
      s.ball.owner = 'player';
      s.competitors.player.pos = { x: 20, y: 11 };
      command(s, { type: 'turbo', on: turbo });
      command(s, { type: 'kick', x: 1, y: 0, power: 1 });
      step(s, 1 / 60);
      return Math.hypot(s.ball.vel.x, s.ball.vel.y);
    };
    expect(speed(true) - speed(false)).toBeCloseTo(JUNGLE.turboShot, 0);
  });

  it('three goals in a row sets a competitor ON FIRE (unlimited turbo) until someone else scores', () => {
    const s = live();
    const goal = (by: 'player' | 'alex'): JungleEvent[] => {
      s.ball.owner = null;
      s.ball.lastTouch = by;
      s.ball.inGoal = false;
      s.keeper.y = 1;
      s.ball.pos = { x: JUNGLE.goalX - 0.4, y: JUNGLE.width / 2 };
      s.ball.vel = { x: 20, y: 0 };
      step(s, 1 / 60);
      const e = drainEvents(s);
      adv(s, JUNGLE.restartFreeze + 0.02);
      return e;
    };
    goal('player');
    goal('player');
    expect(s.fire).toBeNull();
    expect(goal('player').some((e) => e.type === 'fire' && e.on && e.by === 'player')).toBe(true);
    expect(s.fire).toBe('player');
    command(s, { type: 'turbo', on: true });
    command(s, { type: 'move', x: 1, y: 0 });
    adv(s, 5);
    expect(s.competitors.player.turbo).toBe(1);
    expect(goal('alex').some((e) => e.type === 'fire' && !e.on && e.by === 'player')).toBe(true);
    expect(s.fire).toBeNull();
  });

  it('AI competitors use the same meter (never above 1 or below 0) and land big hits too', () => {
    let big = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = newJungle(seed);
      for (let t = 0; t < JUNGLE.roundSeconds && s.phase !== 'ended'; t += 1 / 30) {
        adv(s, 1 / 30);
        for (const id of COMPETITORS) {
          expect(s.competitors[id].turbo).toBeGreaterThanOrEqual(0);
          expect(s.competitors[id].turbo).toBeLessThanOrEqual(1);
        }
        for (const e of drainEvents(s)) if (e.type === 'hit' && e.big && e.by !== 'player') big++;
      }
    }
    expect(big).toBeGreaterThan(0);
  });

  it('rejects malformed turbo commands; turbo does nothing after the round ends', () => {
    const s = live();
    expect(command(s, { type: 'turbo', on: 'yes' } as never)).toBe(false);
    expect(command(s, { type: 'turbo' } as never)).toBe(false);
    expect(s.turbo).toBe(false);
    s.phase = 'ended';
    expect(command(s, { type: 'turbo', on: true })).toBe(false);
  });

  it('a knocked-down player cannot start a move', () => {
    const s = live();
    const me = s.competitors.player;
    me.stunUntil = me.downUntil = s.t + 1;
    expect(canMove(s, me, 'push')).toBe(false);
    expect(command(s, { type: 'slide' })).toBe(false);
  });
});
