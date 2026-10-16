import { describe, expect, it } from 'vitest';
import { labEnabled } from '../vite.config';
import { LAB_SCENARIO_IDS, LAB_SCENARIOS, MatchSim, MATCH_TUNING as T, isLabScenarioId, stageLabScenario } from '../src/game/match';

const F = 1 / 60;
function labSim(id: (typeof LAB_SCENARIO_IDS)[number], seed = 7): MatchSim {
  const sim = new MatchSim({ seed, halfSeconds: null });
  sim.arrange((s) => stageLabScenario(s, id, T.pitch));
  return sim;
}
const snapshot = (sim: MatchSim): string =>
  JSON.stringify([sim.state.ball.pos, sim.state.ball.owner, Object.values(sim.state.players).map((p) => [p.id, p.pos.x.toFixed(4), p.pos.y.toFixed(4)])]);

describe('Gameplay Lab', () => {
  it('is compiled out of the production main build and in for dev and branch previews', () => {
    expect(labEnabled('build', {})).toBe(false);
    expect(labEnabled('build', { CF_PAGES_BRANCH: 'main' })).toBe(false);
    expect(labEnabled('build', { CF_PAGES_BRANCH: 'devin/123-gameplay-feel' })).toBe(true);
    expect(labEnabled('serve', {})).toBe(true);
    expect(labEnabled('build', { SMR_LAB: '1', CF_PAGES_BRANCH: 'main' })).toBe(true);
    expect(labEnabled('serve', { SMR_LAB: '0' })).toBe(false);
  });

  it('every scenario stages legally and replays identically for the same seed', () => {
    for (const id of LAB_SCENARIO_IDS) {
      expect(isLabScenarioId(id)).toBe(true);
      const a = labSim(id);
      const b = labSim(id);
      const s = a.state;
      expect(s.players[s.controlledId].team).toBe('home');
      expect(s.players[s.controlledId].isKeeper).toBe(false);
      const sc = LAB_SCENARIOS[id];
      expect(s.ball.owner).toBe(sc.carrier);
      for (const p of Object.values(s.players)) {
        expect(p.pos.x).toBeGreaterThanOrEqual(0);
        expect(p.pos.x).toBeLessThanOrEqual(T.pitch.length);
        expect(p.pos.y).toBeGreaterThanOrEqual(0);
        expect(p.pos.y).toBeLessThanOrEqual(T.pitch.width);
      }
      for (let i = 0; i < 4 * 60; i++) {
        a.step(F);
        b.step(F);
      }
      expect(snapshot(a)).toBe(snapshot(b));
      expect(a.state.clock).toBeNull();
    }
    expect(isLabScenarioId('nope')).toBe(false);
    expect(isLabScenarioId(null)).toBe(false);
  });

  it('turnover puts the user on a defender who can be steered at once', () => {
    const sim = labSim('turnover');
    for (let i = 0; i < Math.round((T.kickoff.countdownSeconds + 0.1) / F); i++) sim.step(F);
    expect(sim.state.players[sim.state.controlledId].team).toBe('home');
    expect(sim.command({ type: 'dribble', direction: { x: 1, y: 0 } })).toBe(true);
  });
});

describe('Gameplay Lab reset', () => {
  it('a seeded reset replays the scenario exactly like a fresh launch', () => {
    const fresh = labSim('dribble-1v1', 3);
    const replay = new MatchSim({ seed: 3, halfSeconds: null });
    replay.arrange((s) => stageLabScenario(s, 'dribble-1v1', T.pitch));
    for (let i = 0; i < 10 * 60; i++) replay.step(F);
    replay.command({ type: 'reset', seed: 3 });
    replay.arrange((s) => stageLabScenario(s, 'dribble-1v1', T.pitch));
    for (let i = 0; i < 6 * 60; i++) {
      fresh.step(F);
      replay.step(F);
    }
    expect(snapshot(replay)).toBe(snapshot(fresh));
  });
});
