import { describe, expect, it } from 'vitest';
import { DD_DIFFICULTIES, DRIVEWAY, EASY_START, REWARD_QUARTERS, WEEKLY_CAP_QUARTERS, THRESHOLDS } from '../src/game/driveway/config';
import { DrivewaySim, buildRows, medalFor, multiplierFor, reach, segmentHit, type Obj, type Row } from '../src/game/driveway/sim';
import { DrivewayBot } from '../src/game/driveway/bot';
import { allocateQuarters, sumQuarters, weeklyPayout } from '../src/game/driveway/reward';
import { drivewayDue, submissionError, type DrivewaySubmission } from '../src/game/driveway/save';
import { emptySave, reduce, type CareerSave } from '../src/game/career/state';
import { exportSave, parseImport, parseSave } from '../src/game/career/saveio';
import { ATTRIBUTES } from '../src/game/career/types';
import { plainRound } from './support/driveway';

const P = DRIVEWAY.player;
const play = (sim: DrivewaySim, seconds: number, dt = 1 / 60) => {
  const ev = [];
  for (let i = 0; i < Math.round(seconds / dt); i++) ev.push(...sim.update(dt));
  return ev;
};
/** A sim already in play with no waves, so a test can place exact objects. */
const staged = (rows: Row[] = []) => {
  const sim = new DrivewaySim('beginner', 1, rows);
  sim.start();
  play(sim, DRIVEWAY.countdownSeconds + 0.02);
  expect(sim.phase).toBe('playing');
  return sim;
};
const place = (sim: DrivewaySim, o: Partial<Obj> & Pick<Obj, 'kind' | 'cat' | 'x' | 'y'>): Obj => {
  const obj: Obj = { id: 900 + sim.objects.length, r: 0.42, vx: 0, vy: 0, state: 'live', threatened: false, touched: false, scored: false, endedAt: null, ...o };
  sim.objects.push(obj);
  return obj;
};
const quickShot = (sim: DrivewaySim) => {
  sim.press(); play(sim, 0.05); sim.release(); play(sim, 0.05); sim.press(); play(sim, 0.05); sim.release();
};

describe('Driveway Dribbling waves', () => {
  it('every wave of every difficulty leaves a reachable route without shooting (200 seeds each)', () => {
    for (const d of DD_DIFFICULTIES) for (let seed = 1; seed <= 200; seed++) {
      const rows = buildRows(d, seed * 7919);
      let set: [number, number][] = [[P.startX, P.startX]];
      let prev = 0;
      for (const r of rows) {
        set = reach(set, r.arrive - prev, r.free);
        prev = r.arrive;
        expect(set.reduce((s, [a, c]) => s + (c - a), 0), `${d} seed ${seed} row at ${r.arrive.toFixed(2)}`).toBeGreaterThan(0);
      }
    }
  });

  it('opens gently: single solids with wide gaps and no crossing objects in the first seconds', () => {
    for (const d of DD_DIFFICULTIES) for (let seed = 1; seed <= 50; seed++) {
      for (const r of buildRows(d, seed).filter((x) => x.arrive < EASY_START.seconds)) {
        expect(r.spawns.filter((s) => s.kind !== 'box' && s.kind !== 'boxStack' && s.kind !== 'target').length).toBeLessThanOrEqual(1);
        expect(r.spawns.every((s) => s.vx === 0)).toBe(true);
      }
    }
  });

  it('signals every crossing object before it can reach the playable lane', () => {
    let crossings = 0;
    for (const d of DD_DIFFICULTIES) for (let seed = 1; seed <= 50; seed++) for (const r of buildRows(d, seed)) for (const s of r.spawns) {
      if (s.vx === 0) continue;
      crossings++;
      expect(s.warnAt).not.toBeNull();
      const toLane = (s.vx > 0 ? P.minX - s.x : s.x - P.maxX) / Math.abs(s.vx);
      expect(s.at + toLane - s.warnAt!).toBeGreaterThanOrEqual(DRIVEWAY.warnSeconds - 1e-9);
    }
    expect(crossings).toBeGreaterThan(50);
  });

  it('a careful player survives every difficulty without needing a shot', () => {
    for (const d of DD_DIFFICULTIES) for (let seed = 1; seed <= 20; seed++) {
      const sim = new DrivewaySim(d, seed * 977);
      sim.start();
      const bot = new DrivewayBot(1, seed);
      for (let i = 0; i < 70 * 60 && sim.phase !== 'results'; i++) bot.frame(sim, 1 / 60);
      expect(sim.result!.reason, `${d} seed ${seed}`).toBe('time');
    }
  });
});

describe('Driveway Dribbling simulation', () => {
  it('runs ready -> countdown -> playing -> results, the same at any frame rate', () => {
    const run = (dt: number) => {
      const sim = new DrivewaySim('advanced', 4242);
      expect(sim.update(1)).toEqual([]);
      sim.start();
      expect(sim.phase).toBe('countdown');
      play(sim, 80, dt);
      return sim.result;
    };
    const a = run(1 / 30);
    expect(a).not.toBeNull();
    expect(run(1 / 144)).toEqual(a);
    expect(run(1 / 60)).toEqual(a);
  });

  it('a collision costs one chance, breaks the combo, slows the player, then protects briefly', () => {
    const sim = staged();
    sim.stats.combo = 7;
    place(sim, { kind: 'cone', cat: 'solid', x: sim.player.x, y: sim.player.y, r: 0.32 });
    place(sim, { kind: 'bucket', cat: 'solid', x: sim.player.x + 0.1, y: sim.player.y, r: 0.34 });
    const ev = play(sim, 0.02);
    expect(ev.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(sim.chances).toBe(2);
    expect(sim.stats.combo).toBe(0);
    expect(sim.objects.find((o) => o.kind === 'cone')!.state).toBe('retired');
    // The second object overlapped during protection: no chance lost, and it can never be a dodge.
    play(sim, 0.5);
    expect(sim.chances).toBe(2);
    expect(sim.objects.find((o) => o.kind === 'bucket')?.touched ?? true).toBe(true);
    sim.setMove(1, 0);
    const x0 = sim.player.x;
    play(sim, 0.2);
    expect(sim.player.x - x0).toBeLessThan(P.speed * 0.2 * 0.6);
  });

  it('ends after the third collision, never earlier and never twice', () => {
    const sim = staged();
    for (let i = 0; i < 3; i++) {
      place(sim, { kind: 'can', cat: 'solid', x: sim.player.x, y: sim.player.y, r: 0.4 });
      play(sim, DRIVEWAY.hit.protectSeconds + 0.05);
    }
    expect(sim.phase).toBe('results');
    expect(sim.result!.reason).toBe('chances');
    expect(sim.result!.collisions).toBe(3);
    expect(play(sim, 1)).toEqual([]);
  });

  it('scores a dodge once, only for a solid that threatened the lane and passed behind untouched', () => {
    const sim = staged();
    const solid = place(sim, { kind: 'cone', cat: 'solid', x: sim.player.x + 2, y: 6, vy: -6, r: 0.32 });
    const off = place(sim, { kind: 'cone', cat: 'solid', x: DRIVEWAY.width + 2, y: 6, vy: -6, r: 0.32 });
    const box = place(sim, { kind: 'box', cat: 'breakable', x: sim.player.x - 2, y: 6, vy: -6 });
    const ev = play(sim, 2);
    const dodges = ev.filter((e) => e.type === 'dodge');
    expect(dodges.map((e) => (e as { obj: number }).obj)).toEqual([solid.id]);
    expect(sim.stats.dodges).toBe(1);
    expect(sim.stats.score).toBe(DRIVEWAY.score.dodge);
    expect(off.scored || box.scored).toBe(false);
  });

  it('multiplier: x2 from the event after the fifth success, x3 after the tenth', () => {
    expect([0, 4, 5, 9, 10, 30].map(multiplierFor)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('the double-tap quick shot comes from the ball and breaks a target once; a single tap does not shoot', () => {
    const sim = staged();
    const t = place(sim, { kind: 'target', cat: 'breakable', x: sim.ball.x, y: 12, r: 0.45 });
    sim.press(); play(sim, 0.05); sim.release(); play(sim, 0.5);
    expect(sim.stats.shots).toBe(0);
    quickShot(sim);
    const ev = play(sim, 1);
    expect(sim.stats.shots).toBe(1);
    expect(ev.filter((e) => e.type === 'break')).toHaveLength(1);
    expect(t.state).toBe('broken');
    expect(sim.stats.targets).toBe(1);
    expect(sim.stats.score).toBe(DRIVEWAY.score.target);
  });

  it('a shot cannot tunnel through a target even in one long frame', () => {
    expect(segmentHit(0, 0, 0, 50, 0.1, 25, 0.3)).not.toBeNull();
    const sim = staged();
    place(sim, { kind: 'box', cat: 'breakable', x: sim.ball.x, y: 6, r: 0.42 });
    quickShot(sim);
    sim.update(0.25);
    expect(sim.stats.targets).toBe(1);
  });

  it('a shot into a solid is stopped with an impact: no points, object still there, combo broken', () => {
    const sim = staged();
    sim.stats.combo = 3;
    const cone = place(sim, { kind: 'cone', cat: 'solid', x: sim.ball.x, y: 8, r: 0.32 });
    quickShot(sim);
    const ev = play(sim, 1);
    expect(ev.some((e) => e.type === 'impact')).toBe(true);
    expect(cone.state).toBe('live');
    expect(sim.stats.score).toBe(0);
    expect(sim.stats.combo).toBe(0);
    expect(sim.projectiles).toHaveLength(0);
  });

  it('a missed shot expires; recovery takes 0.6 s, keeps movement, ignores and never queues SHOOT', () => {
    const sim = staged();
    quickShot(sim);
    play(sim, 0.05);
    expect(sim.ball.state).toBe('recovering');
    expect(sim.canShoot).toBe(false);
    sim.setMove(-1, 0);
    const x0 = sim.player.x;
    quickShot(sim);
    play(sim, 0.3);
    expect(sim.player.x).toBeLessThan(x0);
    play(sim, DRIVEWAY.shot.recoverySeconds);
    expect(sim.canShoot).toBe(true);
    play(sim, 1.5);
    expect(sim.stats.shots).toBe(1);
    expect(sim.projectiles).toHaveLength(0);
    expect(sim.stats.combo).toBe(0);
  });

  it('touches alternate feet while dribbling and the ball stays at the feet', () => {
    const sim = staged();
    const ev = [];
    for (let i = 0; i < 4; i++) { sim.setMove(i % 2 ? -1 : 1, 0); ev.push(...play(sim, 0.4)); }
    const touches = ev.filter((e) => e.type === 'touch') as { foot: string }[];
    expect(touches.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < touches.length; i++) expect(touches[i]!.foot).not.toBe(touches[i - 1]!.foot);
    expect(Math.abs(sim.ball.y - sim.player.y - DRIVEWAY.ball.ahead)).toBeLessThan(1e-9);
  });

  it('pause freezes the clock and clears held inputs and half-made taps', () => {
    const sim = staged();
    sim.setMove(1, 0);
    sim.press(); sim.release();
    const t = sim.t;
    sim.pause();
    play(sim, 5);
    expect(sim.t).toBe(t);
    sim.resume();
    sim.press(); play(sim, 0.05); sim.release();
    play(sim, 0.5);
    expect(sim.stats.shots).toBe(0);
    const x = sim.player.x;
    play(sim, 0.5);
    expect(Math.abs(sim.player.x - x)).toBeLessThan(0.05);
  });

  it('a finished double tap that has not fired yet is dropped by pause, so resume never shoots on its own', () => {
    const sim = staged();
    sim.press(); sim.release();
    play(sim, 0.05);
    sim.press();
    sim.pause();
    sim.release();
    sim.resume();
    play(sim, 1);
    expect(sim.stats.shots).toBe(0);
    expect(sim.canShoot).toBe(true);
  });

  it('medals need sustained play: early failure or shot spam cannot reach Silver or Gold', () => {
    for (const d of DD_DIFFICULTIES) {
      const th = THRESHOLDS[d];
      expect(medalFor(d, { score: th.gold * 2, survived: 20, accuracy: 1, reason: 'chances' })).toBe('bronze');
      expect(medalFor(d, { score: th.gold * 2, survived: 60, accuracy: 0.2, reason: 'time' })).toBe('silver');
      expect(medalFor(d, { score: th.gold, survived: 60, accuracy: 0.6, reason: 'time' })).toBe('gold');
      expect(medalFor(d, { score: 0, survived: 60, accuracy: 0, reason: 'time' })).toBe('completed');
    }
  });
});

describe('Driveway Dribbling rewards', () => {
  it('owner table in quarter points, two points (8 quarters) at most', () => {
    expect(REWARD_QUARTERS.beginner).toEqual({ completed: 1, bronze: 2, silver: 3, gold: 4 });
    expect(REWARD_QUARTERS.expert).toEqual({ completed: 4, bronze: 5, silver: 6, gold: 8 });
    expect(WEEKLY_CAP_QUARTERS).toBe(8);
  });

  it('replays pay only the improvement over the week, never above the cap', () => {
    expect(weeklyPayout(0, 3)).toEqual({ pay: 3, best: 3 });
    expect(weeklyPayout(3, 8)).toEqual({ pay: 5, best: 8 });
    expect(weeklyPayout(3, 3)).toEqual({ pay: 0, best: 3 });
    expect(weeklyPayout(5, 2)).toEqual({ pay: 0, best: 5 });
    expect(weeklyPayout(8, 40)).toEqual({ pay: 0, best: 8 });
  });

  it('splits exactly by what went right: no finishing without targets, participation goes to first touch', () => {
    expect(allocateQuarters(3, 'expert', { dodges: 0, targets: 0 })).toEqual({ firstTouch: 3 });
    const a = allocateQuarters(5, 'expert', { dodges: 30, targets: 0 });
    expect(a.finishing).toBeUndefined();
    expect(sumQuarters(a)).toBe(5);
    const b = allocateQuarters(8, 'beginner', { dodges: 10, targets: 10 });
    expect(b).toEqual({ firstTouch: 4, finishing: 4 });
    expect(allocateQuarters(7, 'advanced', { dodges: 13, targets: 4 })).toEqual(allocateQuarters(7, 'advanced', { dodges: 13, targets: 4 }));
  });
});

const fresh = (): CareerSave => {
  const r = reduce(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Ava', position: 'MID', gender: 'girl' });
  if (!r.ok) throw new Error(r.error);
  return r.save;
};
const submit = (s: CareerSave, sub: DrivewaySubmission) => {
  const r = reduce(s, { type: 'drivewayResult', result: sub });
  if (!r.ok) throw new Error(r.error);
  return r;
};
const total = (s: CareerSave) => ATTRIBUTES.reduce((x, a) => x + s.player!.attributes[a], 0);
const round = (o: Partial<DrivewaySubmission> & Pick<DrivewaySubmission, 'runId'>): DrivewaySubmission => ({
  week: 1, difficulty: 'beginner', seed: 3, reason: 'time', score: 0, dodges: 0, targets: 0, shots: 0, bestCombo: 0, survived: 60, collisions: 0, ...o,
});
const gold = (runId: string, difficulty: DrivewaySubmission['difficulty'] = 'beginner'): DrivewaySubmission =>
  round({ runId, difficulty, score: THRESHOLDS[difficulty].gold, dodges: Math.floor((THRESHOLDS[difficulty].gold - 400) / 20), targets: 20, shots: 30, bestCombo: 20 });

describe('Driveway Dribbling weekly requirement and ledger', () => {
  it('blocks the week until one finished round, whatever the score; completion only satisfies Driveway', () => {
    let s = fresh();
    expect(drivewayDue(s.driveway, 1)).toBe(true);
    const blocked = reduce(s, { type: 'endWeek' });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("Complete this week's Driveway Dribbling.");
    s = submit(s, plainRound(1)).save;
    expect(drivewayDue(s.driveway, 1)).toBe(false);
    const closed = reduce(s, { type: 'endWeek' });
    expect(closed.ok).toBe(true);
    if (closed.ok) {
      expect(closed.save.week).toBe(2);
      expect(drivewayDue(closed.save.driveway, 2)).toBe(true);
      expect(reduce(closed.save, { type: 'endWeek' }).ok).toBe(false);
    }
  });

  it('a round that started in a week that has since closed is not credited to the new week', () => {
    let s = submit(fresh(), plainRound(1)).save;
    const closed = reduce(s, { type: 'endWeek' });
    if (!closed.ok) throw new Error(closed.error);
    s = closed.save;
    const late = reduce(s, { type: 'drivewayResult', result: gold('late-w1') });
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.error).toBe('This round started in Week 1, which has closed. It was not counted.');
    expect(drivewayDue(s.driveway, 2)).toBe(true);
    expect(s.driveway.weeks.find((w) => w.week === 2)).toBeUndefined();
    expect(reduce(s, { type: 'drivewayResult', result: { ...gold('w2'), week: 2 } }).ok).toBe(true);
  });

  it('a quit, an unfinished timer or impossible stats never count', () => {
    const s = fresh();
    expect(reduce(s, { type: 'drivewayResult', result: { ...plainRound(1), reason: 'quit' as never } }).ok).toBe(false);
    expect(reduce(s, { type: 'drivewayResult', result: round({ runId: 'a', survived: 30 }) }).ok).toBe(false);
    expect(reduce(s, { type: 'drivewayResult', result: round({ runId: 'b', reason: 'chances', collisions: 2, survived: 20 }) }).ok).toBe(false);
    expect(submissionError(round({ runId: 'c', score: 999, dodges: 1 }))).not.toBeNull();
    expect(submissionError(round({ runId: 'd', targets: 3, shots: 1 }))).not.toBeNull();
    expect(drivewayDue(s.driveway, 1)).toBe(true);
  });

  it('pays the best-difference across replays and difficulties, two points a week at most, exactly once per round', () => {
    let s = fresh();
    s = { ...s, driveway: { ...s.driveway, unlocked: 4 } };
    const t0 = total(s);
    const r1 = submit(s, round({ runId: 'r1', difficulty: 'advanced' }));
    expect(total(r1.save) - t0).toBeCloseTo(0.75, 10);
    expect(submit(r1.save, round({ runId: 'r1', difficulty: 'advanced' })).changed).toBe(false);
    const r2 = submit(r1.save, round({ runId: 'r2', difficulty: 'beginner' }));
    expect(total(r2.save) - total(r1.save)).toBeCloseTo(0, 10);
    const r3 = submit(r2.save, gold('r3', 'expert'));
    expect(total(r3.save) - t0).toBeCloseTo(2, 10);
    const r4 = submit(r3.save, gold('r4', 'expert'));
    expect(total(r4.save)).toBeCloseTo(total(r3.save), 10);
    const w = r4.save.driveway.weeks.find((x) => x.week === 1)!;
    expect(w.bestQuarters).toBe(8);
    expect(sumQuarters(w.awarded)).toBe(8);
    expect(w.attempts).toBe(4);
  });

  it('a new week has a fresh two points; past weeks cannot pay again', () => {
    let s = fresh();
    s = submit(s, gold('w1')).save;
    const e = reduce(s, { type: 'endWeek' });
    if (!e.ok) throw new Error(e.error);
    const before = total(e.save);
    const w2 = submit(e.save, { ...gold('w2'), week: 2 });
    expect(total(w2.save) - before).toBeCloseTo(1, 10);
    expect(w2.save.driveway.weeks.map((w) => w.week)).toEqual([1, 2]);
    expect(w2.save.driveway.weeks[0]!.bestQuarters).toBe(4);
  });

  it('unlocks the next difficulty with Silver or Gold on the highest unlocked one only, and keeps it across weeks', () => {
    let s = fresh();
    expect(reduce(s, { type: 'drivewayResult', result: gold('x', 'intermediate') }).ok).toBe(false);
    s = submit(s, round({ runId: 'b1', score: THRESHOLDS.beginner.bronze, dodges: 40 })).save;
    expect(s.driveway.unlocked).toBe(1);
    s = submit(s, gold('g1')).save;
    expect(s.driveway.unlocked).toBe(2);
    s = submit(s, gold('g2')).save;
    expect(s.driveway.unlocked).toBe(2);
    const e = reduce(s, { type: 'endWeek' });
    if (!e.ok) throw new Error(e.error);
    expect(e.save.driveway.unlocked).toBe(2);
    expect(e.save.driveway.best.find((b) => b.difficulty === 'beginner')!.medal).toBe('gold');
  });

  it('respects the Season 1 maximum and says so', () => {
    let s = fresh();
    const attrs = Object.fromEntries(ATTRIBUTES.map((a) => [a, 64])) as Record<(typeof ATTRIBUTES)[number], number>;
    s = { ...s, player: { ...s.player!, attributes: attrs } };
    const r = submit(s, gold('cap'));
    expect(total(r.save)).toBeCloseTo(64 * ATTRIBUTES.length, 10);
    expect(r.message).toMatch(/Season 1 maximum/);
    const w = r.save.driveway.weeks[0]!;
    expect(w.bestQuarters).toBe(4);
    expect(Object.values(w.applied).reduce((x, y) => x + (y ?? 0), 0)).toBe(0);
  });

  it('survives reload with its ledger, and old saves start the requirement in their current week only', () => {
    const s = submit(fresh(), gold('rl')).save;
    const back = parseImport(exportSave(s));
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.value.driveway).toEqual(s.driveway);
      expect(reduce(back.value, { type: 'drivewayResult', result: gold('rl') }).ok && (reduce(back.value, { type: 'drivewayResult', result: gold('rl') }) as { changed: boolean }).changed).toBe(false);
    }
    const old = JSON.parse(JSON.stringify({ ...fresh(), week: 5 })) as Record<string, unknown>;
    delete old.driveway;
    const parsed = parseSave(old);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.driveway.activeFrom).toBe(5);
      expect(drivewayDue(parsed.value.driveway, 4)).toBe(false);
      expect(drivewayDue(parsed.value.driveway, 5)).toBe(true);
    }
    const tampered = JSON.parse(JSON.stringify(s)) as { driveway: { weeks: { bestQuarters: number }[] } };
    tampered.driveway.weeks[0]!.bestQuarters = 8;
    expect(parseSave(tampered).ok).toBe(false);
  });
});
