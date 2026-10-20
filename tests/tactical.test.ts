import { describe, expect, it } from 'vitest';
import { createDecisionEngine, type TacticalObservation, type TacticalRole } from '../src/game/match/tactical';

// Port of research/logic/v0.5/engine/decision-engine.test.mjs (17 tests) and fixtures.mjs.
type Mutable<T> = T extends readonly (infer U)[] ? Mutable<U>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
type Obs = Mutable<TacticalObservation> & Record<string, unknown>;
function fixture(): Obs {
  const names: TacticalRole[] = ['GK', 'LB', 'CB', 'RB', '6', '8', 'LW', '9', 'RW'];
  const positions = [[4, 27.5], [22, 10], [18, 27.5], [22, 45], [32, 22], [40, 33], [54, 7], [58, 27.5], [54, 48]] as const;
  return {
    tick: 1, time: 0, direction: 1, phase: 'live', possessionGeneration: 1, controlGeneration: 1,
    teammates: names.map((role, i) => ({ id: `A${i}`, role, pos: { x: positions[i]![0], y: positions[i]![1] }, human: false, speed: 6, ready: true, passEligible: true })),
    opponents: positions.map(([x, y], i) => ({ id: `B${i}`, pos: { x: 80 - x, y }, seenAt: 0 })),
    ball: { pos: { x: 40, y: 33 }, state: 'controlled', ownerId: 'A5', seenAt: 0 },
    runLimit: 70,
  } as Obs;
}
function mirror(s: Obs): Obs {
  const r = structuredClone(s);
  r.direction = (-s.direction) as 1 | -1;
  r.teammates.forEach((p) => (p.pos.x = 80 - p.pos.x));
  r.opponents!.forEach((p) => (p.pos.x = 80 - p.pos.x));
  r.ball!.pos.x = 80 - r.ball!.pos.x;
  return r;
}
const run = (s: Obs) => createDecisionEngine().step(s);
const tm = (s: Obs, i: number) => s.teammates[i]!;

describe('v0.5 tactical decision engine (ported behavioural tests)', () => {
  it('all nine players receive finite bounded orders without world mutation', () => {
    const s = fixture(), before = structuredClone(s), r = run(s);
    expect(r.orders.length).toBe(9);
    expect(s).toEqual(before);
    for (const o of r.orders) expect(o.target.x >= 0 && o.target.x <= 80 && o.target.y >= 0 && o.target.y <= 55).toBe(true);
    expect(r.orders.filter((o) => o.task === 'rest-defense').length).toBe(2);
  });
  it('human carrier receives no AI commands', () => {
    const s = fixture();
    tm(s, 5).human = true;
    expect(run(s).orders.every((o) => o.actorId !== 'A5' && !o.action)).toBe(true);
  });
  it('one presser, one cover, center preserved', () => {
    const s = fixture();
    s.ball!.ownerId = 'B5';
    const o = run(s).orders;
    expect(o.filter((p) => p.task === 'pressure' || p.task === 'block-lane').length).toBe(1);
    expect(o.filter((p) => p.task === 'cover').length).toBe(1);
    expect(o.some((p) => p.task === 'protect-center')).toBe(true);
  });
  it('loose ball is contested, never kicked as controlled', () => {
    const s = fixture();
    s.ball!.state = 'contested';
    const r = run(s);
    expect(r.orders.filter((o) => o.task === 'contest-ball').length).toBe(1);
    expect(r.orders.every((o) => o.action === null)).toBe(true);
  });
  it('stale ball falls back to shape', () => {
    const s = fixture();
    s.time = 2;
    expect(run(s).orders.every((o) => o.task === 'hold-shape' && !o.action)).toBe(true);
  });
  it('mirroring preserves intentions and target geometry', () => {
    const s = fixture(), a = run(s), b = run(mirror(s));
    a.orders.forEach((o, i) => {
      expect(o.task).toBe(b.orders[i]!.task);
      expect(Math.abs(o.target.x + b.orders[i]!.target.x - 80)).toBeLessThan(1e-9);
      expect(o.target.y).toBe(b.orders[i]!.target.y);
    });
  });
  it('roster ordering does not change decisions', () => {
    const s = fixture(), a = run(s);
    s.teammates.reverse();
    expect(run(s)).toEqual(a);
  });
  it('duplicate ticks emit no duplicate actions; possession loss cancels', () => {
    const s = fixture();
    s.ball!.pos = { x: 68, y: 27.5 };
    tm(s, 5).pos = { ...s.ball!.pos };
    s.opponents = [];
    const e = createDecisionEngine(), a = e.step(s);
    const kick = a.orders.find((o) => o.action)!.action!;
    expect(kick.type).toBe('SHOOT');
    expect(e.step(s).orders.length).toBe(0);
    s.tick++; s.time = 0.2; s.ball!.seenAt = 0.2; s.possessionGeneration++; s.ball!.ownerId = 'B5';
    const b = e.step(s);
    expect(b.cancel).toContain(kick.id);
    expect(b.orders.every((o) => !o.action)).toBe(true);
  });
  it('pending kick cannot repeat before executor acknowledgment', () => {
    const s = fixture();
    s.ball!.pos = { x: 68, y: 27.5 };
    tm(s, 5).pos = { ...s.ball!.pos };
    s.opponents = [];
    const e = createDecisionEngine();
    expect(e.step(s).orders.some((o) => o.action)).toBe(true);
    s.tick++; s.time = 0.2; s.ball!.seenAt = 0.2;
    expect(e.step(s).orders.every((o) => !o.action)).toBe(true);
  });
  it('pause cancels and reset permits a fresh timeline', () => {
    const s = fixture(), e = createDecisionEngine();
    e.step(s);
    s.tick++; s.phase = 'paused';
    expect(e.step(s).orders.length).toBe(0);
    e.reset();
    expect(e.step(fixture()).orders.length).toBe(9);
  });
  it('invalid geometry, clocks, roster and options are rejected', () => {
    expect(() => createDecisionEngine({ length: NaN })).toThrow();
    const s = fixture();
    tm(s, 1).pos.x = NaN;
    expect(() => run(s)).toThrow();
    expect(() => run({ ...fixture(), tick: 1.5 })).toThrow();
    expect(() => run({ ...fixture(), teammates: [] })).toThrow();
  });
  it('hidden state fields cannot influence choices', () => {
    const s = fixture(), a = run(s);
    s.hiddenOpponentIntent = 'shoot'; s.futureRng = 0.999; s.humanUnreleasedAim = { x: 0, y: 0 };
    expect(run(s)).toEqual(a);
  });
  it('open ground pass selected, receiver does not get ball ownership', () => {
    const s = fixture();
    s.opponents = [];
    tm(s, 7).pos = { x: 55, y: 33 };
    const r = run(s), kick = r.orders.find((o) => o.actorId === 'A5')!.action!;
    expect(kick.type).toBe('PASS');
    expect(kick.targetId).toBeTruthy();
    expect(s.ball!.ownerId).toBe('A5');
  });
  it('ineligible receivers cannot be selected', () => {
    const s = fixture();
    s.teammates.forEach((p) => (p.passEligible = false));
    expect(run(s).orders.every((o) => !o.action)).toBe(true);
  });
  it('keeper sweeps loose safe ball; distributes controlled ball', () => {
    const s = fixture();
    s.ball = { pos: { x: 5, y: 27.5 }, state: 'traveling', seenAt: 0 };
    s.opponents = [];
    expect(run(s).orders.find((o) => o.actorId === 'A0')!.task).toBe('goalkeeper-sweep');
    s.ball.state = 'controlled'; s.ball.ownerId = 'A0';
    expect(run(s).orders.find((o) => o.actorId === 'A0')!.action!.type).toBe('PASS');
  });
  it('two team instances support eighteen NPCs', () => {
    const a = fixture(), b = mirror(fixture());
    b.teammates.forEach((p) => (p.id = p.id.replace('A', 'B')));
    b.ball!.ownerId = 'A5';
    expect(run(a).orders.length + run(b).orders.length).toBe(18);
  });
  it('friendly flight preserves support and assigns receiver without a kick', () => {
    const s = fixture();
    s.ball = { pos: { x: 45, y: 33 }, state: 'traveling', seenAt: 0, fromId: 'A5', receiverId: 'A7', receivePoint: { x: 57, y: 29 } };
    const r = run(s);
    expect(r.orders.find((o) => o.actorId === 'A7')!.task).toBe('receive-pass');
    expect(r.orders.find((o) => o.actorId === 'A7')!.target).toEqual({ x: 57, y: 29 });
    expect(r.orders.every((o) => !o.action)).toBe(true);
    expect(r.orders.filter((o) => o.task === 'rest-defense').length).toBe(2);
  });
});
