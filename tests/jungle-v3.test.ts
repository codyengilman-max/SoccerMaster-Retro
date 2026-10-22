import { describe, expect, it } from 'vitest';
import { AI_COMPETITORS, COMPETITORS, JUNGLE, actState, aimShot, canMove, command, drainEvents, newJungle, shotCharge, step, type JungleEvent, type JungleState } from '../src/game/jungle/sim';

const MID = JUNGLE.width / 2;
const adv = (s: JungleState, seconds: number, ev: JungleEvent[] = []): JungleEvent[] => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) step(s, Math.min(1 / 60, seconds - t), () => 0.99), ev.push(...drainEvents(s));
  return ev;
};
/** A live round with the three AI parked far away and frozen, so the test controls every contact. */
const staged = (): JungleState => {
  const s = newJungle(11);
  s.phase = 'live';
  s.restartUntil = 0;
  s.t = 5;
  for (const id of AI_COMPETITORS) {
    const c = s.competitors[id];
    c.pos = { x: 1 + COMPETITORS.indexOf(id) * 1.5, y: 1 };
    c.stunUntil = c.lagUntil = 1e9;
  }
  s.competitors.player.pos = { x: 10, y: MID };
  s.competitors.player.facing = { x: 1, y: 0 };
  s.ball.pos = { x: 4, y: 20 };
  return s;
};
const wake = (s: JungleState, id: 'alex' | 'blake' | 'sam', x: number, y = MID): void => {
  const c = s.competitors[id];
  c.stunUntil = c.lagUntil = 0;
  c.pos = { x, y };
};
const run = (seed: number, each?: (s: JungleState) => void): { s: JungleState; events: JungleEvent[] } => {
  const s = newJungle(seed);
  const events: JungleEvent[] = [];
  while (s.phase !== 'ended') each?.(s), step(s, 1 / 30), events.push(...drainEvents(s));
  return { s, events };
};

describe('Jungle Ball v3: HIT', () => {
  it('lands only on real contact in front; behind or out of reach it whiffs after the committed window', () => {
    for (const [x, facing] of [[13.5, 1], [9, 1], [11.2, -1]] as const) {
      const s = staged();
      wake(s, 'alex', x);
      s.competitors.alex.lagUntil = 1e9;
      s.competitors.player.facing = { x: facing, y: 0 };
      expect(command(s, { type: 'hit' })).toBe(true);
      const ev = adv(s, JUNGLE.hitWindow + 0.05);
      expect(ev.filter((e) => e.type === 'hit')).toHaveLength(0);
      expect(ev.filter((e) => e.type === 'whiff' && e.kind === 'hit')).toHaveLength(1);
      expect(canMove(s, s.competitors.player, 'hit')).toBe(false);
    }
  });

  it('repeated taps make one hit: the window and cooldown refuse extra presses', () => {
    const s = staged();
    wake(s, 'alex', 11.2);
    s.competitors.alex.lagUntil = 1e9;
    const ev: JungleEvent[] = [];
    let accepted = 0;
    for (let i = 0; i < 40; i++) (accepted += command(s, { type: 'hit' }) ? 1 : 0), adv(s, 1 / 60, ev);
    expect(accepted).toBe(1);
    expect(ev.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'swing')).toHaveLength(1);
  });

  it('knocks the carrier loose with an impulse; the attacker is not handed the ball', () => {
    const s = staged();
    wake(s, 'alex', 11.2);
    s.competitors.alex.lagUntil = 1e9;
    s.ball.owner = 'alex';
    s.ball.lastTouch = 'alex';
    command(s, { type: 'turbo', on: true });
    command(s, { type: 'hit' });
    adv(s, 1 / 60);
    expect(s.ball.owner).toBeNull();
    expect(Math.hypot(s.ball.vel.x, s.ball.vel.y)).toBeGreaterThan(3);
    expect(s.ball.vz).toBeGreaterThan(0);
  });

  it('a big hit goes impact → falling → down → rising → active, with protection after getting up', () => {
    const s = staged();
    wake(s, 'alex', 11.2);
    s.competitors.alex.lagUntil = 1e9;
    s.ball.owner = 'alex';
    command(s, { type: 'turbo', on: true });
    command(s, { type: 'hit' });
    const seen: string[] = [];
    for (let i = 0; i < 90; i++) {
      adv(s, 1 / 60);
      const a = actState(s, 'alex');
      if (seen[seen.length - 1] !== a) seen.push(a);
      if (a === 'down' || a === 'falling' || a === 'impact') {
        // Downed: cannot attack or take the ball.
        expect(canMove(s, s.competitors.alex, 'hit')).toBe(false);
        expect(s.ball.owner).not.toBe('alex');
      }
    }
    expect(seen.slice(0, 4)).toEqual(['impact', 'falling', 'down', 'rising']);
    expect(s.t).toBeLessThan(s.competitors.alex.protectedUntil);
    expect(s.t).toBeGreaterThanOrEqual(s.competitors.alex.downUntil);
  });
});

describe('Jungle Ball v3: SLIDE', () => {
  it('a missed slide keeps its committed line and leaves the slider on the grass longer than a hit slide', () => {
    const s = staged();
    command(s, { type: 'slide' });
    command(s, { type: 'move', x: 0, y: 1 });
    const ev = adv(s, JUNGLE.slideSeconds + 0.02);
    expect(Math.abs(s.competitors.player.pos.y - MID)).toBeLessThan(1e-6);
    expect(ev.filter((e) => e.type === 'whiff' && e.kind === 'slide')).toHaveLength(1);
    const x = s.competitors.player.pos.x;
    command(s, { type: 'move', x: 1, y: 0 });
    adv(s, JUNGLE.slideMissLag - 0.05);
    expect(s.competitors.player.pos.x - x).toBeLessThan(1e-6);
    expect(actState(s, 'player')).toBe('recover');
  });

  it('hits only one competitor per slide and topples them', () => {
    const s = staged();
    wake(s, 'alex', 11.4);
    wake(s, 'blake', 12.6);
    s.competitors.alex.lagUntil = s.competitors.blake.lagUntil = 1e9;
    command(s, { type: 'slide' });
    const ev = adv(s, JUNGLE.slideSeconds + 0.02);
    expect(ev.filter((e) => e.type === 'hit' && e.kind === 'slide')).toHaveLength(1);
    expect(ev.some((e) => e.type === 'bump' && e.down)).toBe(true);
  });
});

describe('Jungle Ball v3: shooting', () => {
  const carrier = (): JungleState => {
    const s = staged();
    s.competitors.player.pos = { x: 20, y: MID };
    s.ball.owner = 'player';
    s.ball.lastTouch = 'player';
    return s;
  };
  it('a tap is a quick shot; a hold charges to a cap; charge shows while held', () => {
    const quick = carrier();
    command(quick, { type: 'shoot', phase: 'press' });
    adv(quick, 0.05);
    command(quick, { type: 'shoot', phase: 'release' });
    const q = adv(quick, 1 / 60).find((e): e is Extract<JungleEvent, { type: 'shot' }> => e.type === 'shot');
    expect(q).toMatchObject({ by: 'player', power: JUNGLE.quickPower, charged: false });
    const full = carrier();
    command(full, { type: 'shoot', phase: 'press' });
    adv(full, 0.3);
    expect(shotCharge(full, 'player')).toBeGreaterThan(0.2);
    adv(full, 2);
    expect(shotCharge(full, 'player')).toBe(1);
    command(full, { type: 'shoot', phase: 'release' });
    const f = adv(full, 1 / 60).find((e): e is Extract<JungleEvent, { type: 'shot' }> => e.type === 'shot');
    expect(f).toMatchObject({ power: 1, charged: true });
    expect(full.ball.vz).toBeGreaterThan(quick.ball.vz);
  });

  it('a hit interrupts a charge: no shot on release', () => {
    const s = carrier();
    wake(s, 'alex', 21.2);
    s.competitors.alex.facing = { x: -1, y: 0 };
    command(s, { type: 'shoot', phase: 'press' });
    adv(s, 0.2);
    s.competitors.alex.lagUntil = 0;
    s.competitors.alex.cooldownUntil = 0;
    s.competitors.alex.hitDir = { x: -1, y: 0 };
    s.competitors.alex.hitUntil = s.t + JUNGLE.hitWindow;
    s.competitors.alex.hitLanded = false;
    s.competitors.alex.lastMove = { kind: 'hit', t: s.t, big: false };
    adv(s, 1 / 60);
    expect(shotCharge(s, 'player')).toBeNull();
    command(s, { type: 'shoot', phase: 'release' });
    expect(adv(s, 1 / 60).some((e) => e.type === 'shot')).toBe(false);
  });

  it('neutral stick aims inside the posts; assist is limited and a wide aim stays wide', () => {
    const s = staged();
    const from = { x: 20, y: MID + 3 };
    const n = aimShot(s, from, { x: 0, y: 0 });
    const yAt = (d: { x: number; y: number }): number => from.y + (d.y / d.x) * (JUNGLE.goalX - from.x);
    expect(Math.abs(yAt(n) - MID)).toBeLessThan(JUNGLE.goalHalfWidth);
    const near = { x: Math.cos(0.12), y: Math.sin(0.12) };
    const a = aimShot(s, from, near);
    expect(Math.abs(Math.atan2(a.y, a.x) - 0.12)).toBeLessThanOrEqual((JUNGLE.aimAssistMax * Math.PI) / 180 + 1e-9);
    const wide = { x: Math.cos(1), y: Math.sin(1) };
    expect(aimShot(s, from, wide)).toEqual(wide);
  });
});

describe('Jungle Ball v3: ball, goal and keeper', () => {
  const shot = (s: JungleState, pos: { x: number; y: number }, vel: { x: number; y: number }, z = 0, vz = 0): void => {
    s.ball.owner = null;
    s.ball.lastTouch = 'player';
    s.ball.pos = { ...pos };
    s.ball.vel = { ...vel };
    s.ball.z = z;
    s.ball.vz = vz;
  };
  it('a 30 yd/s shot at the post rebounds (no tunnelling) and does not score', () => {
    const s = staged();
    s.keeper.y = MID - 2;
    shot(s, { x: 26, y: MID + JUNGLE.goalHalfWidth + 0.05 }, { x: 30, y: 0 });
    const ev = adv(s, 0.4);
    expect(ev.some((e) => e.type === 'woodwork')).toBe(true);
    expect(ev.some((e) => e.type === 'goal')).toBe(false);
    expect(s.ball.vel.x).toBeLessThan(0);
  });

  it('over the bar is no goal; a high-speed low shot into the mouth scores exactly once', () => {
    const high = staged();
    high.keeper.y = 1;
    shot(high, { x: 30, y: MID }, { x: 25, y: 0 }, 2.6, 0);
    expect(adv(high, 0.3).some((e) => e.type === 'goal')).toBe(false);
    const low = staged();
    low.keeper.y = MID - 2.4;
    low.keeper.x = JUNGLE.goalX - JUNGLE.keeperLine;
    shot(low, { x: 24, y: MID + 1.8 }, { x: 40, y: 0 });
    const ev = adv(low, JUNGLE.celebrateSeconds + 0.5);
    expect(ev.filter((e) => e.type === 'goal')).toEqual([expect.objectContaining({ by: 'player' })]);
    expect(low.scores.player).toBe(1);
  });

  it('the whole ball must cross: resting on the line is not a goal', () => {
    const s = staged();
    s.keeper.y = 1;
    shot(s, { x: JUNGLE.goalX + JUNGLE.ballRadius - 0.02, y: MID }, { x: 0, y: 0 });
    expect(adv(s, 0.5).some((e) => e.type === 'goal')).toBe(false);
  });

  it('keeper catches a soft shot, holds, then distributes away from goal without re-catching it', () => {
    const s = staged();
    // Soft: under the keeper's catch speed, and hard enough to roll all the way to him.
    shot(s, { x: 27, y: MID }, { x: 11, y: 0 });
    const ev = adv(s, 2.5);
    expect(ev.some((e) => e.type === 'save' && e.kind === 'catch')).toBe(true);
    expect(ev.filter((e) => e.type === 'distribute')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'save' && e.kind === 'catch')).toHaveLength(1);
    expect(s.ball.held).toBe(false);
    expect(s.ball.pos.x).toBeLessThan(JUNGLE.goalX - 3);
  });

  it('keeper parries a hard shot into play; the shooter keeps the credit on the rebound', () => {
    const s = staged();
    s.keeper.y = MID;
    shot(s, { x: 24, y: MID }, { x: 22, y: 0 });
    const ev = adv(s, 0.5);
    expect(ev.some((e) => e.type === 'save' && e.kind === 'parry')).toBe(true);
    expect(s.ball.lastTouch).toBe('player');
    expect(s.ball.pos.x).toBeLessThan(JUNGLE.goalX);
    expect(s.keeper.mode).not.toBe('hold');
  });

  it('the keeper is never a HIT target and is not knocked down', () => {
    const s = staged();
    s.competitors.player.pos = { x: s.keeper.x - 1.2, y: s.keeper.y };
    command(s, { type: 'turbo', on: true });
    command(s, { type: 'hit' });
    const ev = adv(s, 0.4);
    expect(ev.some((e) => e.type === 'hit')).toBe(false);
    expect(s.keeper.mode).toBe('set');
    expect(Math.hypot(s.competitors.player.pos.x - s.keeper.x, s.competitors.player.pos.y - s.keeper.y)).toBeGreaterThanOrEqual(JUNGLE.playerRadius + JUNGLE.keeperRadius - JUNGLE.maxPush);
  });

  it('round expiry during a goal celebration ends cleanly with one goal', () => {
    const s = staged();
    s.t = JUNGLE.roundSeconds - 0.5;
    s.keeper.y = 1;
    shot(s, { x: 30, y: MID }, { x: 20, y: 0 });
    const ev = adv(s, 2);
    expect(ev.filter((e) => e.type === 'goal')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'end')).toHaveLength(1);
    expect(s.phase).toBe('ended');
  });
});

describe('Jungle Ball v3: seeded rounds', () => {
  it('ball and players stay in bounds; goals are single-count and match scores', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const { s, events } = run(seed, (st) => {
        const b = st.ball;
        expect(b.pos.x).toBeGreaterThanOrEqual(JUNGLE.ballRadius - 1e-9);
        expect(b.pos.x).toBeLessThanOrEqual(JUNGLE.goalX + JUNGLE.netDepth);
        expect(b.pos.y).toBeGreaterThanOrEqual(JUNGLE.ballRadius - 1e-9);
        expect(b.pos.y).toBeLessThanOrEqual(JUNGLE.width - JUNGLE.ballRadius + 1e-9);
        expect(b.z).toBeGreaterThanOrEqual(0);
        if (b.pos.x > JUNGLE.goalX) expect(Math.abs(b.pos.y - MID)).toBeLessThanOrEqual(JUNGLE.goalHalfWidth);
      });
      const goals = events.filter((e) => e.type === 'goal');
      expect(COMPETITORS.reduce((n, id) => n + s.scores[id], 0)).toBe(goals.length);
    }
  });

  it('every AI competes: shots, hits, slides, turbo and goals across seeds; nobody is permanently bunched', () => {
    const stats = Object.fromEntries(AI_COMPETITORS.map((id) => [id, { shot: 0, hit: 0, slide: 0, goal: 0, turbo: false }]));
    let samples = 0;
    let bunched = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { events } = run(seed, (s) => {
        for (const id of AI_COMPETITORS) if (s.competitors[id].turbo < 0.99) stats[id]!.turbo = true;
        if (s.phase !== 'live') return;
        samples++;
        const ps = AI_COMPETITORS.map((id) => s.competitors[id].pos);
        if (Math.hypot(ps[0]!.x - ps[1]!.x, ps[0]!.y - ps[1]!.y) < 1.5 && Math.hypot(ps[1]!.x - ps[2]!.x, ps[1]!.y - ps[2]!.y) < 1.5) bunched++;
      });
      for (const e of events) {
        if (e.type === 'shot' && e.by !== 'player') stats[e.by]!.shot++;
        if (e.type === 'goal' && e.by !== 'player') stats[e.by]!.goal++;
        if (e.type === 'swing' && e.by !== 'player') stats[e.by]![e.kind]++;
      }
    }
    for (const id of AI_COMPETITORS) {
      const st = stats[id]!;
      expect(st.shot, id).toBeGreaterThan(0);
      expect(st.goal, id).toBeGreaterThan(0);
      expect(st.hit, id).toBeGreaterThan(0);
      expect(st.slide, id).toBeGreaterThan(0);
      expect(st.turbo, id).toBe(true);
    }
    expect(bunched / samples, `bunched ${bunched}/${samples}`).toBeLessThan(0.1);
  });

  it('a scripted player using press/release SHOOT scores in seeded rounds', () => {
    let goals = 0;
    for (let seed = 1; seed <= 6; seed++) {
      let held = false;
      const { events } = run(seed, (s) => {
        const me = s.competitors.player;
        if (s.ball.owner === 'player') {
          const dx = JUNGLE.goalX - me.pos.x;
          if (dx < 9 && !held) held = command(s, { type: 'shoot', phase: 'press' });
          else if (held) (held = false), command(s, { type: 'move', x: 1, y: (s.keeper.y > MID ? MID - 1.8 : MID + 1.8) - me.pos.y }), command(s, { type: 'shoot', phase: 'release' });
          else command(s, { type: 'move', x: 1, y: (MID - me.pos.y) * 0.2 });
        } else command(s, { type: 'move', x: s.ball.pos.x - me.pos.x, y: s.ball.pos.y - me.pos.y });
      });
      goals += events.filter((e) => e.type === 'goal' && e.by === 'player').length;
    }
    expect(goals).toBeGreaterThan(0);
  });
});
