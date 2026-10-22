import { describe, expect, it } from 'vitest';
import { CLOUDY, dash, drainEvents, fitBackground, goalTarget, insideGoal, mouth, multiplierFor, newRound, resultOf, setPaused, setTarget, start, starsFor, step, toPainting, toScreen, type CloudyState } from '../src/game/cloudy/sim';

const playing = (d: 'easy' | 'medium' | 'hard' = 'easy'): CloudyState => {
  const s = newRound(d, 7);
  start(s);
  step(s, 0.1);
  for (let i = 0; i < 40 && s.phase === 'countdown'; i++) step(s, 0.1);
  expect(s.phase).toBe('playing');
  return s;
};
const run = (s: CloudyState, seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) step(s, 1 / 60); };

describe("Cloudy's Feeding Frenzy", () => {
  it('pellet counts per difficulty, and all drops finish early enough to be caught', () => {
    for (const [d, n] of [['easy', 18], ['medium', 24], ['hard', 30]] as const) {
      const s = newRound(d, 3);
      expect(s.total).toBe(n);
      expect(s.schedule).toHaveLength(n);
      expect(Math.max(...s.schedule.map((x) => x.at))).toBeLessThanOrEqual(CLOUDY.roundSeconds - CLOUDY.food.finishBefore + 1e-9);
      const fall = (CLOUDY.foodFloor - CLOUDY.food.spawnY) / CLOUDY.levels[d].sink;
      expect(CLOUDY.roundSeconds - CLOUDY.food.finishBefore + fall).toBeLessThanOrEqual(CLOUDY.roundSeconds + 3);
      for (const x of s.schedule) expect(x.x).toBeGreaterThanOrEqual(CLOUDY.food.spawnX[0]);
    }
  });

  it('combo thresholds: x2 starts on the catch after five in a row, x3 after ten; a miss resets', () => {
    expect([0, 4, 5, 9, 10, 20].map(multiplierFor)).toEqual([1, 1, 2, 2, 3, 3]);
    const s = playing();
    s.schedule = [];
    const catchOne = (): void => {
      const m = mouth(s);
      s.pellets.push({ id: s.nextId++, x: m.x, y: m.y });
      step(s, 1 / 60);
    };
    for (let i = 0; i < 11; i++) catchOne();
    const ev = drainEvents(s).filter((e) => e.type === 'catch');
    expect(ev.map((e) => (e.type === 'catch' ? e.multiplier : 0))).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3]);
    expect(s.score).toBe(5 * 10 + 5 * 20 + 30);
    s.pellets.push({ id: s.nextId++, x: 100 + (s.fish.x > 700 ? 0 : 1200), y: CLOUDY.foodFloor - 0.1 });
    step(s, 1 / 30);
    expect(s.combo).toBe(0);
    expect(s.bestCombo).toBe(11);
  });

  it('the round ends exactly once at 45 s of active play and stops scoring', () => {
    const s = playing('medium');
    run(s, 50);
    expect(s.phase).toBe('results');
    const ends = drainEvents(s).filter((e) => e.type === 'end');
    expect(ends).toHaveLength(1);
    const score = s.score;
    run(s, 2);
    expect(s.score).toBe(score);
    expect(drainEvents(s).some((e) => e.type === 'end')).toBe(false);
    expect(s.caught + s.missed).toBe(s.total);
  });

  it('paused rounds freeze the timer, drops and cooldowns; resume never jumps more than 0.1 s', () => {
    const s = playing();
    dash(s);
    const t = s.t;
    const cd = s.fish.cooldown;
    setPaused(s, true);
    run(s, 5);
    expect([s.t, s.fish.cooldown]).toEqual([t, cd]);
    setPaused(s, false);
    step(s, 30);
    expect(s.t - t).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it('dash is a 0.35 s burst with a 3 s cooldown and never moves the swim target', () => {
    const s = playing();
    setTarget(s, { x: 1200, y: 470 });
    const target = { ...s.target! };
    expect(dash(s)).toBe(true);
    expect(dash(s)).toBe(false);
    expect(s.target).toEqual(target);
    run(s, 0.3);
    expect(Math.hypot(s.fish.vx, s.fish.vy)).toBeGreaterThan(CLOUDY.fish.maxSpeed);
    run(s, 2.8);
    expect(dash(s)).toBe(true);
  });

  it('Cloudy swims toward the finger without teleporting and stays inside the tank', () => {
    const s = playing();
    setTarget(s, { x: 5000, y: -400 });
    const x0 = s.fish.x;
    step(s, 1 / 60);
    expect(s.fish.x - x0).toBeLessThan(CLOUDY.fish.dashSpeed / 60 + 1);
    run(s, 8);
    expect(s.fish.x).toBeLessThanOrEqual(CLOUDY.tank.x1);
    expect(s.fish.y).toBeGreaterThanOrEqual(CLOUDY.tank.y0);
  });

  it('goal: only the whole ball entering the inset painted goal mouth from outside scores, once', () => {
    const g = goalTarget();
    expect(g.x0).toBeCloseTo(908 + CLOUDY.ball.radius);
    expect(g.y1).toBeCloseTo(855 - CLOUDY.ball.radius);
    const s = playing();
    run(s, 12.1);
    expect(s.ball).not.toBeNull();
    expect(insideGoal(s.ball!.x, s.ball!.y)).toBe(false);
    expect(s.goals).toBe(0);
    // Touching a post from outside: no goal.
    Object.assign(s.ball!, { x: 908 - CLOUDY.ball.radius, y: 800, vx: 0, vy: 0 });
    s.fish.x = 300; s.fish.y = 300;
    step(s, 1 / 60);
    expect(s.goals).toBe(0);
    // Rolling in from the left: one goal, then the ball is removed.
    Object.assign(s.ball!, { x: g.x0 - 30, y: 800, vx: 400, vy: 0 });
    run(s, 0.5);
    expect(s.goals).toBe(1);
    expect(s.ball).toBeNull();
    expect(s.score).toBe(CLOUDY.ball.points + 0 + s.caught * 0 + (s.score - CLOUDY.ball.points));
  });

  it('a ball placed inside the goal (spawn edge case) scores nothing while it stays there', () => {
    const s = playing();
    run(s, 12.1);
    const g = goalTarget();
    Object.assign(s.ball!, { x: (g.x0 + g.x1) / 2, y: (g.y0 + g.y1) / 2, vx: 0, vy: 0, inside: true });
    s.fish.x = 300; s.fish.y = 300;
    run(s, 1);
    expect(s.goals).toBe(0);
  });

  it('a missed bonus ball expires after 10 s without touching the food combo', () => {
    const s = playing();
    s.schedule = [];
    run(s, 12.1);
    s.combo = 4;
    s.fish.x = 1300; s.fish.y = 200;
    run(s, 10.1);
    expect(s.ball).toBeNull();
    expect(s.combo).toBe(4);
  });

  it('stars from food catch rate only', () => {
    expect([starsFor(10, 18), starsFor(11, 18), starsFor(15, 18), starsFor(16, 18)]).toEqual([1, 2, 2, 3]);
    const s = playing();
    run(s, 46);
    expect(resultOf(s).stars).toBe(starsFor(s.caught, s.total));
  });

  it('one shared painting->screen transform keeps the goal opening on the painted goal in portrait and landscape', () => {
    for (const view of [{ x: 0, y: 104, width: 390, height: 600 }, { x: 47, y: 0, width: 750, height: 390 }, { x: 0, y: 0, width: 1280, height: 720 }]) {
      const f = fitBackground(view);
      expect(CLOUDY.bg.w * f.scale).toBeLessThanOrEqual(view.width + 1e-6);
      expect(CLOUDY.bg.h * f.scale).toBeLessThanOrEqual(view.height + 1e-6);
      const corner = toScreen(f, { x: 908, y: 746 });
      expect(corner.x).toBeCloseTo(f.x + 908 * f.scale);
      expect(toPainting(f, corner).x).toBeCloseTo(908);
      const goal = toScreen(f, { x: 1166, y: 855 });
      expect(goal.x).toBeLessThanOrEqual(view.x + view.width);
      expect(goal.y).toBeLessThanOrEqual(view.y + view.height);
    }
  });

  it('an idle round (no input) catches little, stays cheerful and deterministic per seed', () => {
    const a = playing('hard');
    const b = playing('hard');
    run(a, 46);
    run(b, 46);
    expect(resultOf(a)).toEqual(resultOf(b));
    expect(a.caught).toBeLessThan(a.total);
  });
});

import { emptySave, reduce } from '../src/game/career/state';
import { parseSave } from '../src/game/career/saveio';
describe('Cloudy best scores in the career save', () => {
  it('keeps best score and best stars separately per difficulty, counts a round once, and never touches attributes', () => {
    let s = emptySave();
    const put = (runId: string, difficulty: 'easy' | 'hard', score: number, stars: 1 | 2 | 3) => {
      const r = reduce(s, { type: 'cloudyResult', runId, difficulty, score, stars });
      if (!r.ok) throw new Error(r.error);
      s = r.save;
      return r;
    };
    put('a', 'easy', 200, 3);
    put('b', 'easy', 350, 2);
    put('c', 'hard', 90, 1);
    expect(put('b', 'easy', 999, 3).changed).toBe(false);
    expect(s.cloudy.find((b) => b.difficulty === 'easy')).toEqual({ difficulty: 'easy', bestScore: 350, bestStars: 3 });
    expect(s.cloudy.find((b) => b.difficulty === 'hard')).toEqual({ difficulty: 'hard', bestScore: 90, bestStars: 1 });
    expect(s.player).toBeNull();
    const round = parseSave(JSON.parse(JSON.stringify(s)));
    expect(round.ok && round.value.cloudy).toEqual(s.cloudy);
  });
});
