import { describe, expect, it } from 'vitest';
import { MatchSim, checkInvariants, clockLabel, matchResult, MATCH_TUNING } from '../src/game/match';

const FRAME = 1 / 60;
function run(sim: MatchSim, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) sim.step(FRAME);
}
function runUntil(sim: MatchSim, pred: () => boolean, maxSeconds: number): void {
  for (let t = 0; t < maxSeconds && !pred(); t += FRAME) sim.step(FRAME);
}

describe('M4 match clock', () => {
  it('the open-ended sandbox has no clock and never reaches half-time', () => {
    const sim = new MatchSim({ seed: 3 });
    expect(sim.state.clock).toBeNull();
    run(sim, 120);
    expect(['halftime', 'fulltime']).not.toContain(sim.state.phase);
  });

  it('half-time stops play exactly at the half length and freezes everything', () => {
    const sim = new MatchSim({ seed: 3, halfSeconds: 20 });
    runUntil(sim, () => sim.state.phase === 'halftime', 30);
    const s = sim.state;
    expect(s.phase).toBe('halftime');
    expect(s.clock).toMatchObject({ half: 1, elapsed: 20 });
    expect(s.events.some((e) => e.type === 'halftime')).toBe(true);
    expect(s.simTime).toBeCloseTo(20, 6);
    const frozen = JSON.stringify({ t: s.simTime, b: s.ball.pos, p: s.players.H5.pos });
    run(sim, 5);
    expect(JSON.stringify({ t: sim.state.simTime, b: sim.state.ball.pos, p: sim.state.players.H5.pos })).toBe(frozen);
    expect(sim.command({ type: 'dribble', direction: { x: 1, y: 0 } })).toBe(false);
    expect(sim.command({ type: 'aimStart' })).toBe(false);
    expect(sim.command({ type: 'feint' })).toBe(false);
    expect(sim.state.phase).toBe('halftime');
  });

  it('pauses and Coach holds stop the clock', () => {
    const sim = new MatchSim({ seed: 4, halfSeconds: 60 });
    run(sim, 5);
    const at = sim.state.clock!.elapsed;
    sim.command({ type: 'pause' });
    run(sim, 30);
    expect(sim.state.clock!.elapsed).toBe(at);
    sim.command({ type: 'resume' });
    sim.command({ type: 'coachHold' });
    run(sim, 30);
    expect(sim.state.clock!.elapsed).toBe(at);
    sim.command({ type: 'coachRelease' });
    run(sim, 1);
    expect(sim.state.clock!.elapsed).toBeGreaterThan(at);
  });

  it('second half: away kicks off, score is kept, and full-time ends the match', () => {
    const sim = new MatchSim({ seed: 5, halfSeconds: 15 });
    runUntil(sim, () => sim.state.phase === 'halftime', 20);
    sim.arrange((s) => {
      s.score.home = 2;
      s.score.away = 1;
    });
    sim.command({ type: 'pause' });
    expect(sim.command({ type: 'startSecondHalf' })).toBe(false);
    sim.command({ type: 'resume' });
    expect(sim.command({ type: 'startSecondHalf' })).toBe(true);
    expect(sim.command({ type: 'startSecondHalf' })).toBe(false);
    const s = sim.state;
    expect(s.phase).toBe('kickoff');
    expect(s.clock).toMatchObject({ half: 2, elapsed: 0 });
    expect(s.ball.owner).toBe('A8');
    expect(s.score).toEqual({ home: 2, away: 1 });
    expect(s.aimAllowance.home).toBe(MATCH_TUNING.aimAllowance.seconds);
    runUntil(sim, () => sim.state.phase === 'fulltime', 20);
    expect(sim.state.phase).toBe('fulltime');
    expect(sim.state.events.some((e) => e.type === 'fulltime' && e.detail === '2-1')).toBe(true);
    expect(matchResult(sim.state)).toBe('win');
    expect(sim.command({ type: 'startSecondHalf' })).toBe(false);
    run(sim, 5);
    expect(sim.state.phase).toBe('fulltime');
    expect(sim.command({ type: 'reset' })).toBe(true);
    expect(sim.state.phase).toBe('kickoff');
    expect(sim.state.clock).toMatchObject({ half: 1, elapsed: 0 });
    expect(sim.state.score).toEqual({ home: 0, away: 0 });
  });

  it('an aim in progress at the whistle is cancelled, never fired', () => {
    const sim = new MatchSim({ seed: 6, halfSeconds: 12 });
    runUntil(sim, () => sim.state.phase === 'live' && sim.userHasBall(), 5);
    sim.arrange((s) => {
      s.clock!.elapsed = 11.99;
    });
    expect(sim.command({ type: 'aimStart' })).toBe(true);
    sim.command({ type: 'aimUpdate', direction: { x: 1, y: 0 }, power: 1 });
    run(sim, 0.5);
    expect(sim.state.phase).toBe('halftime');
    expect(sim.state.aim).toBeNull();
    expect(sim.command({ type: 'aimRelease' })).toBe(false);
    expect(sim.state.ball.kick).toBeNull();
    expect(sim.state.events.some((e) => e.type === 'aimCancel' && e.detail === 'half-time')).toBe(true);
  });

  it('rejects unusable half lengths', () => {
    expect(new MatchSim({ halfSeconds: 1 }).state.clock!.halfSeconds).toBe(MATCH_TUNING.match.minHalfSeconds);
    expect(new MatchSim({ halfSeconds: 1e9 }).state.clock!.halfSeconds).toBe(MATCH_TUNING.match.maxHalfSeconds);
    expect(new MatchSim({ halfSeconds: Number.NaN }).state.clock).toBeNull();
    expect(new MatchSim({ halfSeconds: null }).state.clock).toBeNull();
  });

  it('a full default-length match keeps every invariant and is deterministic', () => {
    const play = (): string => {
      const sim = new MatchSim({ seed: 11, halfSeconds: MATCH_TUNING.match.halfSeconds });
      for (let t = 0; t < 600 && sim.state.phase !== 'fulltime'; t += FRAME) {
        sim.step(FRAME);
        if (sim.state.phase === 'halftime') sim.command({ type: 'startSecondHalf' });
        const bad = checkInvariants(sim.state);
        if (bad.length) throw new Error(bad.join('; '));
      }
      expect(sim.state.phase).toBe('fulltime');
      return JSON.stringify({ score: sim.state.score, t: sim.state.simTime });
    };
    expect(play()).toBe(play());
  });

  it('labels the clock on a 25-minute U11 half', () => {
    expect(clockLabel({ half: 1, elapsed: 0, halfSeconds: 240 })).toBe('1st 0:00');
    expect(clockLabel({ half: 1, elapsed: 120, halfSeconds: 240 })).toBe('1st 12:30');
    expect(clockLabel({ half: 2, elapsed: 240, halfSeconds: 240 })).toBe('2nd 50:00');
  });
});
