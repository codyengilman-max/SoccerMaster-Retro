import { describe, expect, it } from 'vitest';
import type { CoachFacts, MateFact } from '../src/game/coach/facts';
import { CATALOG } from '../src/game/coach/templates';
import { buildMoment, isEligible } from '../src/game/coach/moment';
import { validateCatalog } from '../src/game/coach/validate';
import { TOPICS, type TemplateDef } from '../src/game/coach/types';

const names = (id: string): string => `P-${id}`;

const mate = (o: Partial<MateFact> & { id: MateFact['id'] }): MateFact => ({
  role: 'CM',
  line: 'midfield',
  pos: { x: 40, y: 25 },
  world: { x: 40, y: 25 },
  distance: 10,
  progress: 0,
  laneClearance: 5,
  receiverPressure: 6,
  open: true,
  relation: 'square',
  wide: false,
  farSide: false,
  ...o,
});

type Over = Partial<Omit<CoachFacts, 'carrier' | 'defend'>> & { carrier?: Partial<NonNullable<CoachFacts['carrier']>> | null; defend?: Partial<NonNullable<CoachFacts['defend']>> | null };

/** Synthetic carrier facts: templates read only facts, so each case states exactly what the engine measured. */
function carrierFacts(o: Over = {}): CoachFacts {
  const { carrier, defend: _d, ...rest } = o;
  const base: CoachFacts = {
    team: 'home',
    pitch: { length: 75, width: 50 },
    simTime: 100,
    scoreFor: 0,
    scoreAgainst: 0,
    scoreDiff: 0,
    timeLeft: 200,
    formation: '1-3-2-3',
    situation: 'carrier',
    ballT: { x: 37, y: 25 },
    ballWorld: { x: 37, y: 25 },
    zone: 'middle',
    ballSide: 'centre',
    carrier: {
      id: 'H8',
      role: 'CM',
      line: 'midfield',
      pos: { x: 37, y: 25 },
      world: { x: 37, y: 25 },
      pressureDistance: 6,
      pressureId: 'A6',
      pressureArrival: 1.1,
      pressersNear: 1,
      spaceAhead: 6,
      facingForward: true,
      nearTouchline: false,
      ownedSeconds: 2,
      oppNearCarrier: 2,
      ...(carrier ?? {}),
    },
    mates: [],
    bestOpenMate: null,
    openSwitch: null,
    shot: null,
    support: { underneath: 0, beyond: 0, wide: 0, open: 0 },
    defend: null,
    stopped: null,
    spaceBehindDefence: 5,
    ...rest,
  };
  if (carrier === null) return { ...base, carrier: null };
  return base;
}

function defendFacts(o: Partial<NonNullable<CoachFacts['defend']>> = {}, rest: Over = {}): CoachFacts {
  const { defend: _x, carrier: _c, ...r } = rest;
  return {
    ...carrierFacts({ ...r, carrier: null }),
    situation: 'opponent',
    carrier: null,
    defend: {
      carrierId: 'A8',
      ballT: rest.ballT ?? { x: 37, y: 25 },
      nearestId: 'H6',
      nearestDistance: 5,
      nearestArrival: 1,
      presserId: 'H6',
      presserDistance: 5,
      coverId: 'H5',
      coverGap: 2,
      coverSpotWorld: { x: 31, y: 25 },
      protectorsCentral: 3,
      caughtUpfield: [],
      oppNear: 2,
      ownNear: 3,
      unmarkedRunner: null,
      goalDistance: 37,
      weakSideWide: null,
      ...o,
    },
  };
}

const T = (id: string): TemplateDef => {
  const t = CATALOG.find((x) => x.id === id);
  if (!t) throw new Error(`no template ${id}`);
  return t;
};
const grades = (t: TemplateDef, f: CoachFacts): Record<string, string> => {
  const v = buildMoment(t, f, names, 'm1');
  if (!v) throw new Error(`${t.id} did not build`);
  return Object.fromEntries(v.options.map((o) => [o.id, o.grade]));
};

const open = mate({ id: 'H7', progress: 8, relation: 'beyond', distance: 12 });
const under = mate({ id: 'H4', progress: -8, relation: 'underneath', distance: 9, pos: { x: 29, y: 22 } });

interface Case {
  readonly id: string;
  readonly eligible: CoachFacts;
  readonly ineligible: CoachFacts;
  /** A nearby situation where the preferred answer changes or the moment must not trigger. */
  readonly counter: (t: TemplateDef) => void;
}

const CASES: Case[] = [
  {
    id: 'atk.carry-into-space',
    eligible: carrierFacts({ carrier: { pressureDistance: 9, spaceAhead: 14 }, mates: [open], bestOpenMate: open }),
    ineligible: carrierFacts({ carrier: { pressureDistance: 9, spaceAhead: 5 } }),
    counter: (t) => expect(grades(t, carrierFacts({ carrier: { pressureDistance: 9, spaceAhead: 10 }, mates: [open], bestOpenMate: open }))).toMatchObject({ carry: 'reasonable', pass: 'strong' }),
  },
  {
    id: 'atk.release-under-pressure',
    eligible: carrierFacts({ carrier: { pressureDistance: 2.5, pressersNear: 2 }, mates: [open], bestOpenMate: open }),
    ineligible: carrierFacts({ carrier: { pressureDistance: 2.5 }, mates: [], bestOpenMate: null }),
    counter: (t) => expect(grades(t, carrierFacts({ carrier: { pressureDistance: 2.5, pressersNear: 1 }, mates: [open], bestOpenMate: open })).dribble).toBe('reasonable'),
  },
  {
    id: 'atk.combine-nearby',
    eligible: carrierFacts({ carrier: { pressureDistance: 5, spaceAhead: 4 }, mates: [mate({ id: 'H6', distance: 8 })] }),
    ineligible: carrierFacts({ carrier: { pressureDistance: 5 }, mates: [mate({ id: 'H6', distance: 8, open: false })] }),
    counter: (t) => expect(grades(t, carrierFacts({ carrier: { pressureDistance: 5, spaceAhead: 12 }, mates: [mate({ id: 'H6', distance: 8 })] })).solo).toBe('reasonable'),
  },
  {
    id: 'atk.switch-play',
    eligible: carrierFacts({ carrier: { oppNearCarrier: 4 }, mates: [mate({ id: 'H9', farSide: true, distance: 25 })], openSwitch: mate({ id: 'H9', farSide: true, distance: 25 }) }),
    ineligible: carrierFacts({ carrier: { oppNearCarrier: 4 }, openSwitch: null }),
    counter: (t) => expect(isEligible(t, carrierFacts({ carrier: { oppNearCarrier: 1 }, openSwitch: mate({ id: 'H9', farSide: true, distance: 25 }) }))).toBe(false),
  },
  {
    id: 'atk.protect-possession',
    eligible: carrierFacts({ carrier: { pressureDistance: 2 }, mates: [under] }),
    ineligible: carrierFacts({ carrier: { pressureDistance: 2 }, mates: [under, open] }),
    counter: (t) => expect(grades(t, carrierFacts({ carrier: { pressureDistance: 2, nearTouchline: true }, mates: [under] })).sideways).toBe('risky'),
  },
  {
    id: 'atk.turn-when-free',
    eligible: carrierFacts({ carrier: { facingForward: false, pressureDistance: 8 }, mates: [under] }),
    ineligible: carrierFacts({ carrier: { facingForward: true, pressureDistance: 8 } }),
    counter: (t) => expect(isEligible(t, carrierFacts({ carrier: { facingForward: false, pressureDistance: 3 } }))).toBe(false),
  },
  {
    id: 'atk.shoot-when-clear',
    eligible: carrierFacts({ zone: 'attacking', carrier: { pressureDistance: 7 }, shot: { distance: 15, angleDeg: 25, laneClearance: 4, inRange: true, clear: true } }),
    ineligible: carrierFacts({ zone: 'attacking', shot: { distance: 15, angleDeg: 25, laneClearance: 1, inRange: true, clear: false } }),
    counter: (t) => expect(grades(t, carrierFacts({ zone: 'attacking', carrier: { pressureDistance: 2 }, shot: { distance: 15, angleDeg: 25, laneClearance: 4, inRange: true, clear: true } })).closer).toBe('risky'),
  },
  {
    id: 'atk.create-better-chance',
    eligible: carrierFacts({ zone: 'attacking', carrier: { pos: { x: 60, y: 8 } }, shot: { distance: 22, angleDeg: 8, laneClearance: 4, inRange: true, clear: false }, mates: [mate({ id: 'H9', pos: { x: 64, y: 24 } })] }),
    ineligible: carrierFacts({ zone: 'attacking', carrier: { pos: { x: 60, y: 8 } }, shot: { distance: 22, angleDeg: 8, laneClearance: 4, inRange: true, clear: false }, mates: [mate({ id: 'H9', pos: { x: 64, y: 24 }, open: false })] }),
    counter: (t) => expect(isEligible(t, carrierFacts({ zone: 'attacking', carrier: { pos: { x: 60, y: 8 } }, shot: { distance: 22, angleDeg: 30, laneClearance: 4, inRange: true, clear: true }, mates: [mate({ id: 'H9', pos: { x: 64, y: 24 } })] }))).toBe(false),
  },
  {
    id: 'atk.recycle-when-blocked',
    eligible: carrierFacts({ carrier: { pressureDistance: 5, spaceAhead: 4 }, mates: [under] }),
    ineligible: carrierFacts({ carrier: { pressureDistance: 5, spaceAhead: 4 }, mates: [under, open] }),
    counter: (t) => expect(isEligible(t, carrierFacts({ carrier: { pressureDistance: 5, spaceAhead: 15 }, mates: [under] }))).toBe(false),
  },
  {
    id: 'atk.protect-a-lead',
    eligible: carrierFacts({ zone: 'defensive', scoreFor: 2, scoreAgainst: 1, scoreDiff: 1, mates: [open], bestOpenMate: open }),
    ineligible: carrierFacts({ zone: 'defensive', scoreDiff: 0 }),
    counter: (t) => expect(grades(t, carrierFacts({ zone: 'defensive', scoreFor: 1, scoreDiff: 1, bestOpenMate: null }))).toEqual({ clear: 'strong', wide: 'reasonable', dribble: 'risky' }),
  },
  {
    id: 'atk.chasing-the-game',
    eligible: carrierFacts({ scoreFor: 0, scoreAgainst: 1, scoreDiff: -1, carrier: { spaceAhead: 8 } }),
    ineligible: carrierFacts({ scoreDiff: -1, zone: 'defensive', carrier: { spaceAhead: 8 } }),
    counter: (t) => expect(isEligible(t, carrierFacts({ scoreDiff: 1, carrier: { spaceAhead: 8 } }))).toBe(false),
  },
  {
    id: 'sup.offer-underneath',
    eligible: carrierFacts({ carrier: { pressureDistance: 3 }, mates: [mate({ id: 'H6', distance: 8 })] }),
    ineligible: carrierFacts({ carrier: { pressureDistance: 3 }, mates: [mate({ id: 'H6' })], support: { underneath: 1, beyond: 0, wide: 0, open: 1 } }),
    counter: (t) => expect(grades(t, carrierFacts({ carrier: { pressureDistance: 3 }, spaceBehindDefence: 15, mates: [mate({ id: 'H6' })] })).beyond).toBe('reasonable'),
  },
  {
    id: 'sup.run-beyond',
    eligible: carrierFacts({ spaceBehindDefence: 14, mates: [mate({ id: 'H9', line: 'attack', distance: 12 })] }),
    ineligible: carrierFacts({ spaceBehindDefence: 4, mates: [mate({ id: 'H9', line: 'attack' })] }),
    counter: (t) => expect(isEligible(t, carrierFacts({ spaceBehindDefence: 14, support: { underneath: 0, beyond: 1, wide: 0, open: 1 }, mates: [mate({ id: 'H9', line: 'attack' })] }))).toBe(false),
  },
  {
    id: 'sup.give-width',
    eligible: carrierFacts({ mates: [mate({ id: 'H7', pos: { x: 45, y: 33 } })] }),
    ineligible: carrierFacts({ ballSide: 'left', mates: [mate({ id: 'H7', pos: { x: 45, y: 33 } })] }),
    counter: (t) => expect(grades(t, carrierFacts({ carrier: { pressureDistance: 2 }, mates: [mate({ id: 'H7', pos: { x: 45, y: 33 } })] })).inside).toBe('reasonable'),
  },
  {
    id: 'def.press-carrier',
    eligible: defendFacts({ nearestArrival: 1 }),
    ineligible: defendFacts({ nearestArrival: 3 }),
    counter: (t) => expect(isEligible(t, defendFacts({ nearestArrival: 1, coverId: null }))).toBe(false),
  },
  {
    id: 'def.recover-goal-side',
    eligible: defendFacts({ caughtUpfield: ['H7', 'H9'] }),
    ineligible: defendFacts({ caughtUpfield: ['H7'] }),
    counter: (t) => expect(isEligible(t, defendFacts({ caughtUpfield: ['H7', 'H9'] }, { ballT: { x: 60, y: 25 } }))).toBe(false),
  },
  {
    id: 'def.cover-presser',
    eligible: defendFacts({ presserDistance: 2, coverGap: 8 }),
    ineligible: defendFacts({ presserDistance: 2, coverGap: 1 }),
    counter: (t) => expect(Object.keys(grades(t, defendFacts({ presserDistance: 2, coverGap: 8, unmarkedRunner: { id: 'A9', world: { x: 20, y: 20 }, nearestOwnId: 'H3', gap: 9 } })))).toContain('mark'),
  },
  {
    id: 'def.protect-centre',
    eligible: defendFacts({ protectorsCentral: 1, ownNear: 3 }, { zone: 'defensive', ballT: { x: 18, y: 15 } }),
    ineligible: defendFacts({ protectorsCentral: 3 }, { zone: 'defensive' }),
    counter: (t) => expect(isEligible(t, defendFacts({ protectorsCentral: 1, ownNear: 3 }, { zone: 'middle' }))).toBe(false),
  },
  {
    id: 'def.balance-weak-side',
    eligible: defendFacts({ weakSideWide: { id: 'H2', offset: 18 } }, { ballT: { x: 30, y: 8 } }),
    ineligible: defendFacts({ weakSideWide: null }),
    counter: (t) => expect(grades(t, defendFacts({ weakSideWide: { id: 'H2', offset: 18 } }, { ballT: { x: 55, y: 8 } })).stay).toBe('reasonable'),
  },
  {
    id: 'def.track-runner',
    eligible: defendFacts({ unmarkedRunner: { id: 'A9', world: { x: 20, y: 20 }, nearestOwnId: 'H3', gap: 10 } }),
    ineligible: defendFacts({ unmarkedRunner: null }),
    counter: (t) => expect(grades(t, defendFacts({ unmarkedRunner: { id: 'A9', world: { x: 20, y: 20 }, nearestOwnId: 'H3', gap: 6 } })).hold).toBe('reasonable'),
  },
  {
    id: 'def.delay-when-outnumbered',
    eligible: defendFacts({ oppNear: 3, ownNear: 1, nearestDistance: 4 }),
    ineligible: defendFacts({ oppNear: 2, ownNear: 3 }),
    counter: (t) => expect(isEligible(t, defendFacts({ oppNear: 3, ownNear: 1, nearestDistance: 4 }, { zone: 'attacking' }))).toBe(false),
  },
  {
    id: 'stop.restart-ours',
    eligible: { ...carrierFacts({ carrier: null }), situation: 'stopped', stopped: { reason: 'out', restartOurs: true } },
    ineligible: { ...carrierFacts({ carrier: null }), situation: 'stopped', stopped: { reason: 'goal', restartOurs: true } },
    counter: (t) => expect(isEligible(t, { ...carrierFacts(), stopped: { reason: 'out', restartOurs: true } })).toBe(false),
  },
  {
    id: 'stop.restart-theirs',
    eligible: { ...carrierFacts({ carrier: null }), situation: 'stopped', stopped: { reason: 'out', restartOurs: false } },
    ineligible: { ...carrierFacts({ carrier: null }), situation: 'stopped', stopped: { reason: 'out', restartOurs: true } },
    counter: (t) => expect(isEligible(t, { ...carrierFacts({ carrier: null }), situation: 'stopped', stopped: null })).toBe(false),
  },
];

describe('Coach Moment catalog', () => {
  it('has at least 20 valid templates covering attack/defence, on/off ball and the required topics', () => {
    expect(validateCatalog(CATALOG)).toEqual([]);
    expect(CATALOG.length).toBeGreaterThanOrEqual(20);
    expect(new Set(CATALOG.map((t) => t.phase))).toEqual(new Set(['attack', 'defend']));
    expect(new Set(CATALOG.map((t) => t.ball))).toEqual(new Set(['on', 'off']));
    for (const topic of ['carry', 'release', 'combine', 'switch', 'protect', 'support', 'press', 'recover', 'cover', 'balance', 'shoot', 'chance', 'risk', 'space'] as const) {
      expect(CATALOG.some((t) => t.topic === topic), topic).toBe(true);
    }
    expect(CATALOG.every((t) => TOPICS.includes(t.topic))).toBe(true);
  });

  it('rejects malformed templates at load time', () => {
    const good = CATALOG[0]!;
    expect(validateCatalog([good, good]).join()).toMatch(/duplicate id/);
    expect(validateCatalog([{ ...good, version: 0 }]).join()).toMatch(/version/);
    expect(validateCatalog([{ ...good, options: good.options.slice(0, 2) }]).join()).toMatch(/3-4 options/);
    expect(validateCatalog([{ ...good, requires: [] }]).join()).toMatch(/required state features/);
    expect(validateCatalog([{ ...good, topic: 'magic' as never }]).join()).toMatch(/unknown topic/);
    expect(validateCatalog([{ ...good, objective: '' }]).join()).toMatch(/objective/);
  });

  it('has an eligible, ineligible and counterexample case for every template', () => {
    expect(CASES.map((c) => c.id).sort()).toEqual(CATALOG.map((t) => t.id).sort());
  });

  for (const c of CASES) {
    describe(c.id, () => {
      const t = T(c.id);
      it('builds a 3-4 option moment with a strong answer from eligible facts', () => {
        const v = buildMoment(t, c.eligible, names, 'm1');
        expect(v).not.toBeNull();
        expect(v!.options.length).toBeGreaterThanOrEqual(3);
        expect(v!.options.length).toBeLessThanOrEqual(4);
        expect(v!.options.some((o) => o.grade === 'strong')).toBe(true);
        expect(v!.question.length).toBeGreaterThan(10);
        expect(v!.question).not.toMatch(/undefined|NaN|Infinity/);
        for (const o of v!.options) expect(`${o.text} ${o.feedback}`).not.toMatch(/undefined|NaN|Infinity/);
        expect(v!.templateVersion).toBe(t.version);
      });
      it('does not trigger on ineligible facts', () => expect(buildMoment(t, c.ineligible, names, 'm1')).toBeNull());
      it('counterexample', () => c.counter(t));
    });
  }

  it('allows more than one defensible answer and never claims offside', () => {
    const v = buildMoment(T('stop.restart-ours'), CASES.find((c) => c.id === 'stop.restart-ours')!.eligible, names, 'm')!;
    expect(v.options.filter((o) => o.grade === 'strong').length).toBe(2);
    const multi = buildMoment(T('atk.chasing-the-game'), carrierFacts({ scoreDiff: -1, carrier: { spaceAhead: 8 }, mates: [open] }), names, 'm')!;
    expect(multi.options.filter((o) => o.grade === 'strong').length).toBe(2);
    for (const c of CASES) {
      const v2 = buildMoment(T(c.id), c.eligible, names, 'm');
      expect(v2).not.toBeNull();
      expect(String(v2!.question) + v2!.options.map((o) => o.text + o.feedback).join(' ')).not.toMatch(/offside/i);
    }
  });

  it('never invents an open teammate: options needing one are hidden when the facts have none', () => {
    const f = carrierFacts({ carrier: { pressureDistance: 9, spaceAhead: 14 }, mates: [], bestOpenMate: null });
    expect(buildMoment(T('atk.carry-into-space'), f, names, 'm')).toBeNull();
    const lead = buildMoment(T('atk.protect-a-lead'), carrierFacts({ zone: 'defensive', scoreDiff: 1, bestOpenMate: null }), names, 'm')!;
    expect(lead.options.map((o) => o.id)).toEqual(['clear', 'wide', 'dribble']);
  });

  it('survives missing or broken facts without throwing', () => {
    const broken = { ...carrierFacts(), carrier: null } as CoachFacts;
    for (const t of CATALOG) {
      expect(() => buildMoment(t, broken, names, 'm')).not.toThrow();
      expect(() => buildMoment(t, defendFacts({ carrierId: null, presserId: null, coverId: null }), names, 'm')).not.toThrow();
    }
  });
});
