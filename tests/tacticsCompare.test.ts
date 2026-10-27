import { describe, expect, it } from 'vitest';
import { MatchSim } from '../src/game/match/sim';
import { HomeBot, finalFingerprint, measureMatch } from '../src/game/match/metrics';

// PR B comparison harness. Short halves keep the suite fast; the 50-seed report uses full 165 s halves.
const HALF = 20;

describe('tactics comparison harness', () => {
  it('classic stays the default computer tactics mode', () => {
    expect(new MatchSim({ seed: 1 }).tactics.mode).toBe('classic');
  });

  it('the same seed and mode replays to the same trace hash and score', () => {
    for (const mode of ['classic', 'v05'] as const) {
      const a = measureMatch({ seed: 7, mode, halfSeconds: HALF });
      const b = measureMatch({ seed: 7, mode, halfSeconds: HALF });
      expect(b.traceHash).toBe(a.traceHash);
      expect(b.score).toBe(a.score);
      expect(b.home).toEqual(a.home);
      expect(b.away).toEqual(a.away);
    }
  });

  it('runs each mode it is asked for on the same seed, and the two modes really differ', () => {
    const c = measureMatch({ seed: 3, mode: 'classic', halfSeconds: HALF });
    const v = measureMatch({ seed: 3, mode: 'v05', halfSeconds: HALF });
    expect([c.mode, v.mode, c.seed, v.seed]).toEqual(['classic', 'v05', 3, 3]);
    expect(v.traceHash).not.toBe(c.traceHash);
  });

  it('plays a full timed match with no invariant violations and finite, in-range metrics', () => {
    for (const mode of ['classic', 'v05'] as const) {
      const r = measureMatch({ seed: 11, mode, halfSeconds: HALF });
      expect(r.invariantViolations).toBe(0);
      expect(r.tacticsFailure).toBeNull();
      expect(r.score).toBe(`${r.home.goals}-${r.away.goals}`);
      expect(r.home.possessionShare + r.away.possessionShare).toBeLessThanOrEqual(1 + 1e-9);
      for (const t of [r.home, r.away]) {
        expect(t.shotsOnTarget).toBeLessThanOrEqual(t.shots + t.goals);
        expect(t.goals).toBeLessThanOrEqual(t.shotsOnTarget);
        for (const v of Object.values(t)) expect(Number.isNaN(v) || Number.isFinite(v)).toBe(true);
        expect(t.width).toBeGreaterThanOrEqual(0);
        expect(t.depth).toBeGreaterThanOrEqual(0);
      }
      expect(r.msPerTick).toBeGreaterThan(0);
    }
  });

  it('measuring is observation only: an unmeasured run with the same bot ends with the same score and state', () => {
    const r = measureMatch({ seed: 5, mode: 'v05', halfSeconds: HALF });
    const sim = new MatchSim({ seed: 5, tactics: 'v05', halfSeconds: HALF });
    const bot = new HomeBot(sim);
    for (let i = 0; i < 100_000 && sim.state.phase !== 'fulltime'; i++) {
      if (sim.state.phase === 'halftime') { sim.command({ type: 'startSecondHalf' }); continue; }
      bot.step();
      sim.step(1 / 60);
    }
    expect(sim.state.phase).toBe('fulltime');
    expect(`${sim.state.score.home}-${sim.state.score.away}`).toBe(r.score);
    expect(finalFingerprint(sim.state)).toBe(r.finalState);
  });
});
