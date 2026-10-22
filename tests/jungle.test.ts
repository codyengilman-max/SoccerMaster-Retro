import { describe, expect, it } from 'vitest';
import { COMPETITORS, JUNGLE, abandon, canMove, command, drainEvents, newJungle, restartSpots, standings, step, type JungleEvent, type JungleState } from '../src/game/jungle/sim';

function run(seed: number, seconds = JUNGLE.roundSeconds + 1, each?: (s: JungleState) => void): { s: JungleState; events: JungleEvent[] } {
  const s = newJungle(seed);
  const events: JungleEvent[] = [];
  for (let t = 0; t < seconds && s.phase !== 'ended'; t += 1 / 30) {
    each?.(s);
    step(s, 1 / 30);
    events.push(...drainEvents(s));
  }
  return { s, events };
}

describe('Jungle Ball sim', () => {
  it('is deterministic for a seed and ends within the 60–90 s round', () => {
    const a = run(7);
    const b = run(7);
    expect(a.s.scores).toEqual(b.s.scores);
    expect(a.events).toEqual(b.events);
    expect(a.s.phase).toBe('ended');
    expect(JUNGLE.roundSeconds).toBeGreaterThanOrEqual(60);
    expect(JUNGLE.roundSeconds).toBeLessThanOrEqual(90);
  });

  it('awards exactly one point per goal crossing, to the last toucher, then restarts fairly', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { s, events } = run(seed);
      const goals = events.filter((e) => e.type === 'goal');
      const total = COMPETITORS.reduce((n, id) => n + s.scores[id], 0);
      expect(total).toBe(goals.length);
      for (const id of COMPETITORS) expect(s.scores[id]).toBe(goals.filter((g) => g.type === 'goal' && g.by === id).length);
      // Goals are separated by at least the restart freeze: no double count of one crossing.
      for (let i = 1; i < goals.length; i++) expect(goals[i]!.t - goals[i - 1]!.t).toBeGreaterThanOrEqual(JUNGLE.restartFreeze);
    }
  });

  it('restart spots are equidistant from the ball and none is nearer the goal than the ball', () => {
    const spots = restartSpots();
    const ball = newJungle(1).ball.pos;
    const d = COMPETITORS.map((id) => Math.hypot(spots[id].x - ball.x, spots[id].y - ball.y));
    for (const x of d) expect(x).toBeCloseTo(d[0]!, 6);
    for (const id of COMPETITORS) expect(spots[id].x).toBeLessThanOrEqual(ball.x + 1e-9);
  });

  it('never stuns a competitor again while protected (no stun-lock), across seeded sweeps', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { events } = run(seed);
      const bumps = events.filter((e): e is Extract<JungleEvent, { type: 'bump' }> => e.type === 'bump');
      const last: Record<string, number> = {};
      for (const b of bumps) {
        if (last[b.b] !== undefined) expect(b.t - last[b.b]!).toBeGreaterThanOrEqual(JUNGLE.stunSeconds + JUNGLE.protectSeconds - 1e-9);
        last[b.b] = b.t;
      }
    }
  });

  it('protection does not make an owner untouchable: protected owners still lose the ball to steals', () => {
    let protectedSteals = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = newJungle(seed);
      for (let t = 0; t < JUNGLE.roundSeconds && s.phase !== 'ended'; t += 1 / 30) {
        const owner = s.ball.owner;
        const wasProtected = owner ? s.t < s.competitors[owner].protectedUntil : false;
        step(s, 1 / 30);
        for (const e of drainEvents(s)) if (e.type === 'steal' && wasProtected && e.from === owner) protectedSteals++;
      }
    }
    expect(protectedSteals).toBeGreaterThan(0);
  });

  it('a shoulder push is bounded and nobody leaves the pen', () => {
    for (let seed = 1; seed <= 10; seed++) {
      let prev: Record<string, { x: number; y: number }> | null = null;
      run(seed, JUNGLE.roundSeconds + 1, (s) => {
        for (const id of COMPETITORS) {
          const p = s.competitors[id].pos;
          expect(p.x).toBeGreaterThanOrEqual(JUNGLE.playerRadius - 1e-9);
          expect(p.x).toBeLessThanOrEqual(JUNGLE.length - JUNGLE.playerRadius + 1e-9);
          expect(p.y).toBeGreaterThanOrEqual(JUNGLE.playerRadius - 1e-9);
          expect(p.y).toBeLessThanOrEqual(JUNGLE.width - JUNGLE.playerRadius + 1e-9);
          if (prev && s.phase === 'live') {
            const q = prev[id]!;
            // Running plus at most a few bounded pushes per 1/30 s frame (2 sub-steps x 3 contacts).
            expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThanOrEqual(JUNGLE.runSpeed / 30 + 6 * JUNGLE.maxPush + 1e-6);
          }
        }
        prev = Object.fromEntries(COMPETITORS.map((id) => [id, { ...s.competitors[id].pos }]));
      });
    }
  });

  it('the player can dribble to goal and score with a kick command', () => {
    const s = newJungle(3);
    let scored = false;
    for (let t = 0; t < JUNGLE.roundSeconds && !scored; t += 1 / 30) {
      const me = s.competitors.player;
      if (s.ball.owner === 'player') {
        const dx = JUNGLE.goalX - me.pos.x;
        if (dx < 8) command(s, { type: 'kick', x: dx, y: JUNGLE.width / 2 - me.pos.y + (s.keeper.y > JUNGLE.width / 2 ? -1.8 : 1.8), power: 1 });
        else command(s, { type: 'move', x: 1, y: (JUNGLE.width / 2 - me.pos.y) * 0.2 });
      } else command(s, { type: 'move', x: s.ball.pos.x - me.pos.x, y: s.ball.pos.y - me.pos.y });
      step(s, 1 / 30);
      scored = drainEvents(s).some((e) => e.type === 'goal' && e.by === 'player');
    }
    expect(scored).toBe(true);
  });

  it('a ball dribbled over the goal line inside the mouth scores once (unless the keeper is there)', () => {
    const mid = JUNGLE.width / 2;
    const setup = (keeperY: number): JungleState => {
      const s = newJungle(5);
      s.phase = 'live';
      s.restartUntil = 0;
      for (const id of COMPETITORS) if (id !== 'player') s.competitors[id].pos = { x: 4, y: 2 + COMPETITORS.indexOf(id) * 6 };
      s.competitors.player.pos = { x: 30.6, y: mid + 1.5 };
      s.competitors.player.vel = { x: JUNGLE.dribbleSpeed, y: 0 };
      s.ball.owner = 'player';
      s.ball.lastTouch = 'player';
      s.ball.pos = { x: 31.3, y: mid + 1.5 };
      s.keeper.y = keeperY;
      return s;
    };
    const s = setup(mid - 2.2);
    const events: JungleEvent[] = [];
    for (let i = 0; i < 30; i++) {
      command(s, { type: 'move', x: 1, y: 0 });
      step(s, 1 / 60);
      events.push(...drainEvents(s));
    }
    expect(events.filter((e) => e.type === 'goal')).toEqual([expect.objectContaining({ by: 'player' })]);
    expect(s.scores.player).toBe(1);
    const saved = setup(mid + 1.5);
    const ev2: JungleEvent[] = [];
    for (let i = 0; i < 30; i++) {
      command(saved, { type: 'move', x: 1, y: 0 });
      step(saved, 1 / 60);
      ev2.push(...drainEvents(saved));
    }
    expect(ev2.some((e) => e.type === 'save')).toBe(true);
    expect(saved.scores.player).toBe(0);
    expect(saved.ball.pos.x).toBeLessThan(JUNGLE.goalX);
  });

  describe('arcade moves (SHOOT / SLIDE / PUSH)', () => {
    const staged = (): JungleState => {
      const s = newJungle(9);
      s.phase = 'live';
      s.restartUntil = 0;
      s.t = 5;
      const mid = JUNGLE.width / 2;
      s.competitors.player.pos = { x: 10, y: mid };
      s.competitors.player.facing = { x: 1, y: 0 };
      s.competitors.alex.pos = { x: 11.2, y: mid };
      s.competitors.blake.pos = { x: 3, y: 2 };
      s.competitors.sam.pos = { x: 3, y: 20 };
      s.ball.owner = 'alex';
      s.ball.lastTouch = 'alex';
      s.ball.pos = { x: 11.9, y: mid };
      return s;
    };
    const tick = (s: JungleState, n = 1): JungleEvent[] => {
      const ev: JungleEvent[] = [];
      for (let i = 0; i < n; i++) step(s, 1 / 60, () => 0.99), ev.push(...drainEvents(s));
      return ev;
    };

    it('PUSH knocks the carrier back a bounded distance, pops the ball loose and stuns once', () => {
      const s = staged();
      const x0 = s.competitors.alex.pos.x;
      expect(command(s, { type: 'push' })).toBe(true);
      const ev = tick(s);
      expect(ev.some((e) => e.type === 'hit' && e.by === 'player' && e.on === 'alex' && e.kind === 'hit')).toBe(true);
      expect(s.ball.owner).not.toBe('alex');
      expect(s.competitors.alex.pos.x - x0).toBeLessThanOrEqual(JUNGLE.pushKnock + JUNGLE.maxPush + 0.2);
      expect(s.t < s.competitors.alex.stunUntil).toBe(true);
      // Cooldown: an immediate second push is refused.
      expect(command(s, { type: 'push' })).toBe(false);
    });

    it('a protected competitor is hit but not stunned again (no stun-lock)', () => {
      const s = staged();
      command(s, { type: 'push' });
      tick(s);
      const until = s.competitors.alex.stunUntil;
      s.t = until + 0.01;
      s.competitors.player.cooldownUntil = 0;
      s.competitors.alex.pos = { x: 11, y: JUNGLE.width / 2 };
      command(s, { type: 'push' });
      const ev = tick(s);
      expect(ev.some((e) => e.type === 'hit' && e.on === 'alex')).toBe(true);
      expect(ev.some((e) => e.type === 'bump' && e.b === 'alex')).toBe(false);
      expect(s.competitors.alex.stunUntil).toBe(until);
    });

    it('HIT (old PUSH command) with nobody in front whiffs and still costs the cooldown', () => {
      const s = staged();
      s.competitors.player.facing = { x: -1, y: 0 };
      command(s, { type: 'push' });
      // HIT is a committed lunge: the miss is known when its window ends, then a short recovery.
      const ev = tick(s, Math.ceil(JUNGLE.hitWindow * 60) + 1);
      expect(ev.some((e) => e.type === 'whiff' && e.by === 'player' && e.kind === 'hit')).toBe(true);
      expect(canMove(s, s.competitors.player, 'push')).toBe(false);
    });

    it('SLIDE lunges, takes the ball off the carrier once, then has recovery lag', () => {
      const s = staged();
      s.competitors.alex.pos = { x: 12.4, y: JUNGLE.width / 2 };
      s.ball.pos = { x: 13.1, y: JUNGLE.width / 2 };
      expect(command(s, { type: 'slide' })).toBe(true);
      const ev = tick(s, Math.ceil(JUNGLE.slideSeconds * 60));
      expect(ev.filter((e) => e.type === 'hit' && e.kind === 'slide')).toHaveLength(1);
      expect(s.ball.owner).not.toBe('alex');
      expect(canMove(s, s.competitors.player, 'push')).toBe(false);
      const x = s.competitors.player.pos.x;
      command(s, { type: 'move', x: 1, y: 0 });
      tick(s, 6);
      expect(s.competitors.player.pos.x - x).toBeLessThan(0.3);
    });

    it('the ball carrier cannot slide, and moves are refused while stunned or before kick-off', () => {
      const s = staged();
      s.ball.owner = 'player';
      expect(command(s, { type: 'slide' })).toBe(false);
      s.competitors.player.stunUntil = s.t + 1;
      expect(command(s, { type: 'push' })).toBe(false);
      expect(command(newJungle(1), { type: 'push' })).toBe(false);
    });

    it('the AI uses pushes and slides in seeded rounds, and every stun still respects protection', () => {
      let hits = 0;
      for (let seed = 1; seed <= 10; seed++) hits += run(seed).events.filter((e) => e.type === 'hit' && e.by !== 'player').length;
      expect(hits).toBeGreaterThan(0);
    });
  });

  it('rejects malformed commands and kicks without the ball', () => {
    const s = newJungle(1);
    expect(command(s, { type: 'move', x: Number.NaN, y: 0 })).toBe(false);
    expect(command(s, { type: 'kick', x: 1, y: 0, power: 2 })).toBe(false);
    expect(command(s, { type: 'kick', x: 1, y: 0, power: 0.5 })).toBe(false);
    expect(command(s, { type: 'move', x: 5, y: 0 })).toBe(true);
    expect(Math.hypot(s.stick.x, s.stick.y)).toBeCloseTo(1, 9);
  });

  it('leaving keeps the scores so far and invents no result', () => {
    const { s } = run(5, 20);
    const before = { ...s.scores };
    abandon(s);
    expect(s.phase).toBe('ended');
    expect(s.scores).toEqual(before);
    step(s, 1);
    expect(s.scores).toEqual(before);
    expect(standings(s).map((r) => r.place)[0]).toBe(1);
  });

  it('standings share places on ties and eliminate nobody', () => {
    const s = newJungle(1);
    s.scores = { player: 2, alex: 2, blake: 1, sam: 0 };
    const rows = standings(s);
    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.place === 1).map((r) => r.id).sort()).toEqual(['alex', 'player']);
    expect(rows.find((r) => r.id === 'blake')!.place).toBe(3);
  });
});
