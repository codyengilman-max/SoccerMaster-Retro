import { describe, expect, it } from 'vitest';
import { MatchSim } from '../src/game/match/sim';
import { AWAY_IDS, HOME_IDS } from '../src/game/match/types';
import { FORMATION_IDS } from '../src/game/match/formations';
import type { MatchState } from '../src/game/match/types';
import { CoachDirector, type HostContext } from '../src/game/coach/director';
import { CATALOG } from '../src/game/coach/templates';
import { extractFacts, stateProblems } from '../src/game/coach/facts';
import { isEligible } from '../src/game/coach/moment';
import { makeNames, safeName } from '../src/game/coach/names';
import type { TemplateDef } from '../src/game/coach/types';

const HOST: HostContext = { gestureActive: false, overlayOpen: false };
const STEP = 1 / 60;

/** Plays a session with a simple scripted user: dribble toward goal; answer `pick` and Continue. */
function playSession(seed: number, formation: (typeof FORMATION_IDS)[number], pick: (d: CoachDirector) => string = (d) => d.view!.options[0]!.id, secs = 300) {
  const sim = new MatchSim({ seed, homeFormation: formation });
  const d = new CoachDirector({ sessionId: `t${seed}`, seed, sessionSeconds: secs });
  let n = 0;
  const holds: number[] = [];
  while (d.phase !== 'summary' && n < secs * 130) {
    n++;
    if (d.phase === 'question') {
      holds.push(sim.state.simTime);
      expect(sim.state.paused).toBe(true);
      expect(d.answer(pick(d))).toBe(true);
      continue;
    }
    if (d.phase === 'feedback') {
      expect(d.continueMoment(sim)).toBe(true);
      continue;
    }
    if (sim.userHasBall() && sim.state.phase === 'live' && n % 30 === 0) sim.command({ type: 'padMove', x: 1, y: Math.sin(n / 200) * 0.5 });
    sim.step(STEP);
    d.update(sim, HOST);
  }
  return { sim, d, holds };
}

describe('Coach session (seeded, framework-free)', () => {
  it('clamps the moment count to 4-6 with a default of 5', () => {
    expect(new CoachDirector({ sessionId: 'a' }).target).toBe(5);
    expect(new CoachDirector({ sessionId: 'a', moments: 2 }).target).toBe(4);
    expect(new CoachDirector({ sessionId: 'a', moments: 9 }).target).toBe(6);
    expect(new CoachDirector({ sessionId: 'a', moments: Number.NaN }).target).toBe(5);
    expect(new CoachDirector({ sessionId: 'a', moments: 6 }).target).toBe(6);
  });

  it('refuses a malformed catalog at load time', () => {
    const bad = { ...CATALOG[0]!, options: CATALOG[0]!.options.slice(0, 1) } as TemplateDef;
    expect(() => new CoachDirector({ sessionId: 'x', catalog: [bad] })).toThrow(/catalog/i);
  });

  for (const formation of FORMATION_IDS) {
    it(`runs complete seeded sessions in ${formation}: spread out, no repeated topic, all recorded`, () => {
      for (const seed of [1, 2, 3]) {
        const { d, sim, holds } = playSession(seed, formation);
        const s = d.summary();
        expect(s.completed + s.shortfall).toBe(s.target);
        expect(s.completed).toBeGreaterThanOrEqual(4);
        const ids = new Set<string>();
        d.entries.forEach((e, i) => {
          expect(e.sessionId).toBe(`t${seed}`);
          expect(ids.has(e.momentId)).toBe(false);
          ids.add(e.momentId);
          expect(e.templateVersion).toBeGreaterThanOrEqual(1);
          expect(e.facts.formation).toBe(formation);
          expect(e.selectedOptionId).not.toBeNull();
          expect(e.intentionStatus).not.toBe('pending');
          expect(e.openedAt).toBeGreaterThanOrEqual(d.slotStart(i) - 1e-9);
          if (i > 0) {
            expect(e.topic).not.toBe(d.entries[i - 1]!.topic);
            expect(e.openedAt - d.entries[i - 1]!.openedAt).toBeGreaterThanOrEqual(22);
          }
          if (i < d.entries.length - 1) expect(e.observed).not.toBeNull();
        });
        // One question per recorded moment; the session ends on the summary hold.
        expect(holds.length).toBe(d.entries.length);
        expect(sim.state.pauseReasons).toEqual({ user: false, coach: true });
        expect(s.nextFocus).toMatch(/^Next match, focus on /);
        expect(sim.state.score.home + sim.state.score.away).toBeGreaterThanOrEqual(0);
      }
    }, 60_000);
  }

  it('freezes everything while a moment is open and resumes from the same state', () => {
    const { sim, d } = (() => {
      const sim = new MatchSim({ seed: 4 });
      const d = new CoachDirector({ sessionId: 'f', seed: 4 });
      while (d.phase !== 'question') {
        sim.step(STEP);
        d.update(sim, HOST);
      }
      return { sim, d };
    })();
    const snap = JSON.stringify({ p: sim.state.players, b: sim.state.ball, t: sim.state.simTime, pad: sim.state.pad });
    for (let i = 0; i < 300; i++) {
      sim.step(0.1);
      d.update(sim, HOST);
    }
    expect(JSON.stringify({ p: sim.state.players, b: sim.state.ball, t: sim.state.simTime, pad: sim.state.pad })).toBe(snap);
    expect(d.answer(d.view!.options[0]!.id)).toBe(true);
    expect(d.answer(d.view!.options[1]!.id)).toBe(false);
    expect(d.continueMoment(sim)).toBe(true);
    expect(d.continueMoment(sim)).toBe(false);
    expect(d.answer('anything')).toBe(false);
    expect(sim.state.paused).toBe(false);
    const before = sim.state.simTime;
    sim.step(0.1);
    // The hold left no banked frame time: one clamped frame only.
    expect(sim.state.simTime - before).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it('keeps a background (user) pause after Continue', () => {
    const sim = new MatchSim({ seed: 5 });
    const d = new CoachDirector({ sessionId: 'b', seed: 5 });
    while (d.phase !== 'question') {
      sim.step(STEP);
      d.update(sim, HOST);
    }
    expect(sim.command({ type: 'pause' })).toBe(true);
    d.answer(d.view!.options[0]!.id);
    d.continueMoment(sim);
    expect(sim.state.paused).toBe(true);
    expect(sim.state.pauseReasons).toEqual({ user: true, coach: false });
    // Pause/resume and hold/release cycles leave the pause reasons consistent.
    for (let i = 0; i < 5; i++) {
      sim.command({ type: 'resume' });
      sim.command({ type: 'coachHold' });
      sim.command({ type: 'pause' });
      sim.command({ type: 'coachRelease' });
    }
    expect(sim.state.pauseReasons.coach).toBe(false);
    expect(sim.command({ type: 'coachRelease' })).toBe(false);
  });

  it('never opens during a kick in flight, another overlay, or active input', () => {
    const sim = new MatchSim({ seed: 6 });
    const d = new CoachDirector({ sessionId: 'g', seed: 6, sessionSeconds: 300 });
    const s = sim.state;
    expect(d.safeToInterrupt(s, { gestureActive: true, overlayOpen: false })).toBe(false);
    expect(d.safeToInterrupt(s, { gestureActive: false, overlayOpen: true })).toBe(false);
    for (let i = 0; i < 300 && !sim.userHasBall(); i++) sim.step(STEP);
    sim.arrange((st) => {
      st.ball.owner = st.controlledId;
      st.possession = 'home';
      st.phase = 'live';
    });
    expect(sim.command({ type: 'padMove', x: 1, y: 0 })).toBe(true);
    expect(sim.command({ type: 'padPress', id: 1, action: 'shoot' })).toBe(true);
    for (let i = 0; i < 30; i++) sim.step(STEP);
    expect(sim.command({ type: 'padRelease', id: 2, action: 'shoot' })).toBe(true);
    for (let i = 0; i < 60 && sim.state.ball.owner !== null; i++) sim.step(STEP);
    // Immediately after the kick the ball is in flight: still not safe.
    expect(sim.state.ball.owner).toBeNull();
    expect(d.safeToInterrupt(sim.state, HOST)).toBe(false);
  });

  it('records a shortfall instead of inventing situations when nothing is eligible', () => {
    const never: TemplateDef[] = CATALOG.map((t) => ({ ...t, eligible: () => false }));
    const sim = new MatchSim({ seed: 7 });
    const d = new CoachDirector({ sessionId: 'n', seed: 7, sessionSeconds: 60, catalog: never });
    while (d.phase !== 'summary') {
      sim.step(STEP);
      d.update(sim, HOST);
    }
    const s = d.summary();
    expect(s.completed).toBe(0);
    expect(s.shortfall).toBe(5);
    expect(sim.state.events.some((e) => e.type === 'coachHold')).toBe(true);
  });

  it('abandoning releases the hold, clears intentions and does not count a shortfall', () => {
    const sim = new MatchSim({ seed: 8 });
    const d = new CoachDirector({ sessionId: 'ab', seed: 8 });
    while (d.phase !== 'question') {
      sim.step(STEP);
      d.update(sim, HOST);
    }
    d.abandon(sim);
    expect(sim.state.pauseReasons.coach).toBe(false);
    expect(sim.state.coachIntent).toBeNull();
    expect(d.summary()).toMatchObject({ abandoned: true, shortfall: 0, completed: 0 });
    expect(d.answer('x')).toBe(false);
  });
});

describe('Coach intentions in the sim', () => {
  const live = (seed = 9): MatchSim => {
    const sim = new MatchSim({ seed });
    for (let i = 0; i < 240; i++) sim.step(STEP);
    return sim;
  };

  it('rejects intentions for keepers, opponents, bad targets and stopped play', () => {
    const sim = live();
    const ok = { type: 'coachIntent', playerId: 'H6', kind: 'support', target: { x: 30, y: 20 }, seconds: 4, source: 't' } as const;
    expect(sim.command({ ...ok, playerId: 'H1' })).toBe(false);
    expect(sim.command({ ...ok, playerId: 'A6' })).toBe(false);
    expect(sim.command({ ...ok, target: { x: Number.NaN, y: 1 } })).toBe(false);
    expect(sim.command({ ...ok, seconds: -1 })).toBe(false);
    expect(sim.command({ ...ok, playerId: 'H99' as never })).toBe(false);
    expect(sim.command(ok)).toBe(true);
    expect(sim.state.coachIntent!.until - sim.state.simTime).toBeLessThanOrEqual(sim.tuning.coach.maxIntentSeconds);
  });

  it('caps duration, clamps targets to the pitch and never teleports', () => {
    const sim = live(10);
    const id = HOME_IDS.find((i) => i !== 'H1' && sim.state.ball.owner !== i && sim.state.players[i].team === 'home')!;
    expect(sim.command({ type: 'coachIntent', playerId: id, kind: 'run', target: { x: 500, y: -40 }, seconds: 99, source: 't' })).toBe(true);
    const it = sim.state.coachIntent!;
    expect(it.target.x).toBeLessThanOrEqual(75);
    expect(it.target.y).toBeGreaterThanOrEqual(0);
    expect(it.until - sim.state.simTime).toBeCloseTo(sim.tuning.coach.maxIntentSeconds, 5);
    let prev = { ...sim.state.players[id].pos };
    const maxSpeed = Math.max(...Object.values(sim.tuning).flatMap((v) => (typeof v === 'object' && v && 'sprint' in v ? [Number((v as { sprint: number }).sprint)] : [])), 9);
    for (let i = 0; i < 120 && sim.state.coachIntent; i++) {
      sim.step(STEP);
      const p = sim.state.players[id].pos;
      expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(maxSpeed * STEP * 1.5 + 0.05);
      prev = { ...p };
    }
  });

  it('expires on duration, possession change and reset (no stale intentions)', () => {
    const sim = live(11);
    sim.command({ type: 'coachIntent', playerId: 'H6', kind: 'support', target: { x: 30, y: 20 }, seconds: 1, source: 't' });
    for (let i = 0; i < 90; i++) sim.step(STEP);
    expect(sim.state.coachIntent).toBeNull();
    expect(sim.state.events.some((e) => e.type === 'coachIntentEnd')).toBe(true);

    sim.command({ type: 'coachIntent', playerId: 'H6', kind: 'support', target: { x: 30, y: 20 }, seconds: 5, source: 't' });
    const other = sim.state.possession === 'home' ? 'away' : 'home';
    const taker = other === 'home' ? 'H8' : 'A8';
    sim.arrange((st) => {
      st.ball.owner = taker;
      st.ball.kick = null;
      st.possession = other;
    });
    sim.step(STEP);
    expect(sim.state.coachIntent).toBeNull();

    sim.command({ type: 'coachIntent', playerId: 'H6', kind: 'support', target: { x: 30, y: 20 }, seconds: 5, source: 't' });
    sim.command({ type: 'reset' });
    expect(sim.state.coachIntent).toBeNull();
    expect(sim.state.pauseReasons).toEqual({ user: false, coach: false });
  });
});

describe('Coach facts', () => {
  it('returns null for missing or invalid state instead of inventing facts', () => {
    const sim = new MatchSim({ seed: 1 });
    expect(extractFacts(null, sim.tuning)).toBeNull();
    expect(extractFacts(undefined, sim.tuning)).toBeNull();
    const bad = structuredClone(sim.state) as MatchState;
    bad.players.H6.pos.x = Number.NaN;
    expect(stateProblems(bad).length).toBeGreaterThan(0);
    expect(extractFacts(bad, sim.tuning)).toBeNull();
    const noBall = structuredClone(sim.state) as MatchState;
    (noBall as { ball: unknown }).ball = undefined;
    expect(extractFacts(noBall, sim.tuning)).toBeNull();
  });

  it('only states time left when the host provides a clock', () => {
    const sim = new MatchSim({ seed: 1 });
    for (let i = 0; i < 200; i++) sim.step(STEP);
    expect(extractFacts(sim.state, sim.tuning)!.timeLeft).toBeNull();
    expect(extractFacts(sim.state, sim.tuning, 'home', { timeLeft: 90 })!.timeLeft).toBe(90);
  });

  it('gives the same facts for both attacking directions (mirrored pitch, teams swapped)', () => {
    const sim = new MatchSim({ seed: 3 });
    let compared = 0;
    for (let i = 0; i < 60 * 60; i++) {
      sim.step(STEP);
      if (i % 120 !== 0) continue;
      const s = sim.state;
      const L = sim.tuning.pitch.length;
      const W = sim.tuning.pitch.width;
      const m = structuredClone(s) as MatchState;
      const swap = (id: string | null): string | null => (id === null ? null : id.startsWith('H') ? `A${id.slice(1)}` : `H${id.slice(1)}`);
      for (const id of [...HOME_IDS, ...AWAY_IDS]) {
        const src = s.players[id];
        const dst = m.players[swap(id) as typeof id];
        Object.assign(dst, { role: src.role, pos: { x: L - src.pos.x, y: W - src.pos.y }, vel: { x: -src.vel.x, y: -src.vel.y } });
      }
      m.ball.pos = { x: L - s.ball.pos.x, y: W - s.ball.pos.y };
      m.ball.vel = { x: -s.ball.vel.x, y: -s.ball.vel.y };
      m.ball.owner = swap(s.ball.owner) as typeof s.ball.owner;
      m.possession = s.possession === 'home' ? 'away' : 'home';
      m.score = { home: s.score.away, away: s.score.home };
      m.formations = { home: s.formations.away, away: s.formations.home };
      m.controlledId = swap(s.controlledId) as typeof s.controlledId;
      const swapAll = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' && /^[HA]\d+$/.test(v) ? swap(v) : v])) as T;
      m.defense = { home: swapAll(s.defense.away), away: swapAll(s.defense.home) };
      if (m.stoppage) m.stoppage = { ...m.stoppage, restartTeam: s.stoppage!.restartTeam === 'home' ? 'away' : 'home' };
      const a = extractFacts(s, sim.tuning, 'home');
      const b = extractFacts(m, sim.tuning, 'away');
      if (!a || !b) continue;
      expect(b.situation).toBe(a.situation);
      expect(b.zone).toBe(a.zone);
      expect(b.ballT.x).toBeCloseTo(a.ballT.x, 6);
      expect(b.carrier?.pressureDistance ?? null).toBeCloseTo(a.carrier?.pressureDistance ?? 0, 6);
      expect(b.mates.map((x) => [x.open, Math.round(x.progress * 1000)])).toEqual(a.mates.map((x) => [x.open, Math.round(x.progress * 1000)]));
      expect(CATALOG.filter((t) => isEligible(t, b)).map((t) => t.id)).toEqual(CATALOG.filter((t) => isEligible(t, a)).map((t) => t.id));
      compared++;
    }
    expect(compared).toBeGreaterThan(10);
  });

  it('renders imported names as safe plain text', () => {
    expect(safeName('  Ana\u202e\u0000  Lee \n')).toBe('Ana Lee');
    expect(safeName('<img src=x onerror=alert(1)>')).toBe('<img src=x onerro…');
    expect(safeName(42)).toBe('');
    expect(safeName('x'.repeat(100)).length).toBeLessThanOrEqual(18);
    const n = makeNames(() => 'LW', { H7: '\u2066Sam\u2069' });
    expect(n('H7')).toBe('Sam');
    expect(n('H9')).toMatch(/^your /);
    expect(n('A9')).toMatch(/^their /);
  });
});
