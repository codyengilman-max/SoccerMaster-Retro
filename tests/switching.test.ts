import { describe, expect, it } from 'vitest';
import { match } from '../src/game';
import { stageLabScenario } from '../src/game/match/lab';

const { MatchSim, MATCH_TUNING: T, TEAM_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim>;
type Id = match.MatchPlayerId;
type V = { x: number; y: number };
const F = 1 / 60;
const O = T.offBall;
const angleDeg = (a: V, b: V): number => (Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) * 180) / Math.PI;
let cmd = 0;

function run(sim: Sim, seconds: number, h = F, each?: () => boolean | void): void {
  for (let i = 0; i < Math.round(seconds / h); i++) {
    sim.step(h);
    if (each?.()) return;
  }
}

/** Everyone parked away from play; `spots` places the players that matter. Control starts on `ctrl`, held long enough. */
function stage(spots: Partial<Record<Id, V>>, ball: { owner: Id | null; pos: V }, ctrl: Id, seed = 1): Sim {
  const sim = new MatchSim({ seed, halfSeconds: null });
  run(sim, T.kickoff.countdownSeconds + 2 * F);
  sim.arrange((s) => {
    for (const id of [...TEAM_PLAYER_IDS.home, ...TEAM_PLAYER_IDS.away] as Id[]) {
      s.players[id].pos = spots[id] ?? { x: id.startsWith('H') ? 80 : 85, y: 3 + Number(id.slice(1)) * 4 };
      s.players[id].vel = { x: 0, y: 0 };
    }
    s.ball.owner = ball.owner;
    s.ball.pos = { ...ball.pos };
    s.ball.vel = { x: 0, y: 0 };
    s.ball.kick = null;
    s.possession = ball.owner?.startsWith('A') ? 'away' : 'home';
    s.ownedSince = s.simTime;
    s.nextDecisionAt = s.simTime + 5;
    s.protectUntil = s.simTime;
    s.controlledId = ctrl;
    s.controlSince = s.simTime - 5;
    s.prevControlledId = ctrl;
    s.controlEpoch += 1;
  });
  return sim;
}

describe('league-match player switching', () => {
  it('two nearby defenders do not keep stealing selection from each other', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const sim = stage({ H7: { x: 30, y: 24 }, H8: { x: 30.4, y: 26 }, A6: { x: 46, y: 25 } }, { owner: 'A6', pos: { x: 45.4, y: 25 } }, 'H7', seed);
      const seen: { id: Id; at: number }[] = [{ id: sim.state.controlledId, at: sim.state.simTime }];
      run(sim, 3, F, () => {
        const c = sim.state.controlledId;
        if (c !== seen[seen.length - 1]!.id) seen.push({ id: c, at: sim.state.simTime });
      });
      // At most two automatic changes in 3 s, never back to the previous player inside returnHoldSeconds.
      expect(seen.length).toBeLessThanOrEqual(3);
      for (let i = 2; i < seen.length; i++) {
        if (seen[i]!.id === seen[i - 2]!.id) expect(seen[i]!.at - seen[i - 1]!.at).toBeGreaterThanOrEqual(O.returnHoldSeconds - 1e-9);
      }
    }
  });

  it('a clearly better challenger is selected promptly', () => {
    const sim = stage({ H7: { x: 70, y: 45 }, H8: { x: 43, y: 27 }, A6: { x: 40, y: 25 } }, { owner: 'A6', pos: { x: 39.4, y: 25 } }, 'H7');
    const t0 = sim.state.simTime;
    let at = -1;
    run(sim, 2, F, () => {
      if (sim.state.controlledId === 'H8') return ((at = sim.state.simTime), true);
      return false;
    });
    expect(at).toBeGreaterThan(0);
    expect(at - t0).toBeLessThanOrEqual(0.25);
    expect(sim.state.lastSwitch?.why).toBe('defend');
  });

  it('SWITCH picks the previewed teammate and automation does not reverse it during the hold', () => {
    const sim = stage({ H7: { x: 43, y: 27 }, H8: { x: 46, y: 18 }, A6: { x: 40, y: 25 } }, { owner: 'A6', pos: { x: 39.4, y: 25 } }, 'H7');
    sim.step(F);
    const cand = sim.state.switchCandidate;
    expect(cand).not.toBeNull();
    expect(sim.switchAvailable()).toBe(true);
    expect(sim.command({ type: 'switchPlayer' })).toBe(true);
    expect(sim.state.controlledId).toBe(cand);
    expect(sim.state.lastSwitch?.why).toBe('manual');
    run(sim, O.manualHoldSeconds - 0.05, F, () => expect(sim.state.controlledId).toBe(cand));
  });

  it('SWITCH during a tackle recovery moves control without resetting that recovery', () => {
    const sim = stage({ H7: { x: 41.6, y: 25 }, H8: { x: 46, y: 18 }, A6: { x: 40, y: 25 } }, { owner: 'A6', pos: { x: 39.4, y: 25 } }, 'H7');
    sim.command({ type: 'padMove', x: -1, y: 0 });
    sim.step(F);
    expect(sim.command({ type: 'padPress', id: ++cmd, action: 'tackle' })).toBe(true);
    sim.command({ type: 'padRelease', id: ++cmd, action: 'tackle' });
    run(sim, 1.5, F, () => sim.state.pad.phase === 'tackleRecovery');
    expect(sim.state.pad.phase).toBe('tackleRecovery');
    if (sim.state.ball.owner === 'H7') return; // tackle won: possession rules apply instead
    const since = sim.state.pad.since;
    const readyAt = sim.state.pad.readyAt;
    expect(sim.command({ type: 'switchPlayer' })).toBe(true);
    expect(sim.state.controlledId).not.toBe('H7');
    expect(sim.state.pad.phase).toBe('tackleRecovery');
    expect(sim.state.pad.actor).toBe('H7');
    expect(sim.state.pad.since).toBe(since);
    expect(sim.state.pad.readyAt).toBe(readyAt);
    sim.step(F);
    expect(sim.state.pad.since).toBe(since);
  });

  it('SWITCH is unavailable while the user has the ball', () => {
    const sim = stage({ H7: { x: 43, y: 27 }, H8: { x: 46, y: 18 } }, { owner: 'H7', pos: { x: 43.6, y: 27 } }, 'H7');
    sim.step(F);
    expect(sim.switchAvailable()).toBe(false);
    expect(sim.command({ type: 'switchPlayer' })).toBe(false);
    expect(sim.state.controlledId).toBe('H7');
  });

  it('holding the joystick through a SWITCH steers the new player at once, no re-touch needed', () => {
    const sim = stage({ H7: { x: 43, y: 27 }, H8: { x: 46, y: 18 }, A6: { x: 40, y: 25 } }, { owner: 'A6', pos: { x: 39.4, y: 25 } }, 'H7');
    sim.command({ type: 'padMove', x: 0, y: 1 });
    sim.step(F);
    expect(sim.command({ type: 'switchPlayer' })).toBe(true);
    const id = sim.state.controlledId;
    const v0 = { ...sim.state.players[id].vel };
    let turned = -1;
    run(sim, 0.6, F, () => {
      const v = sim.state.players[id].vel;
      if (Math.hypot(v.x, v.y) > 2 && angleDeg(v, { x: 0, y: 1 }) < 20) return ((turned = 1), true);
      return false;
    });
    expect(turned).toBe(1);
    // No artificial stop or teleport at the switch: speed carries over continuously.
    expect(Math.hypot(v0.x, v0.y)).toBeGreaterThanOrEqual(0);
  });

  it('holding SHOOT through a possession loss never turns into a tackle', () => {
    const sim = stage({ H7: { x: 43, y: 27 }, A6: { x: 46, y: 27 } }, { owner: 'H7', pos: { x: 43.6, y: 27 } }, 'H7');
    sim.step(F);
    expect(sim.command({ type: 'padPress', id: ++cmd, action: 'shoot' })).toBe(true);
    run(sim, 0.1);
    sim.arrange((s) => {
      s.ball.owner = 'A6';
      s.ball.pos = { x: 45.4, y: 27 };
      s.possession = 'away';
      s.ownedSince = s.simTime;
      s.controlEpoch += 1;
    });
    const tackling = ['tackleStart', 'tackleActive', 'tackleRecovery', 'slideStart', 'slideActive', 'slideRecovery', 'jockey'];
    const never = (): void => expect(tackling).not.toContain(sim.state.pad.phase);
    run(sim, 0.4, F, never);
    sim.command({ type: 'padRelease', id: ++cmd, action: 'shoot' });
    run(sim, 0.6, F, never);
    // No pad tackle or shot from the held SHOOT (a body-contact ball win is not a pad action).
    expect(sim.state.events.filter((e) => (e.type === 'standing' || e.type === 'slide' || e.type === 'shot') && e.by === 'H7')).toEqual([]);
  });

  for (const h of [1 / 30, 1 / 60, 1 / 120]) {
    it(`a released ground pass hands control to its receiver on the release frame (${Math.round(1 / h)} fps), before the first touch`, () => {
      const sim = new MatchSim({ seed: 2 });
      run(sim, T.kickoff.countdownSeconds + 2 * F);
      sim.arrange((s) => stageLabScenario(s, 'pass-range', T.pitch));
      const passer = sim.state.ball.owner;
      sim.command({ type: 'padPress', id: ++cmd, action: 'pass' });
      sim.step(h);
      sim.command({ type: 'padMove', x: 0.894, y: -0.447 });
      sim.command({ type: 'padRelease', id: ++cmd, action: 'pass' });
      let checked = false;
      run(sim, 1, h, () => {
        const s = sim.state;
        if (s.ball.kick?.kind === 'pass' && !s.ball.owner) {
          expect(s.controlledId).toBe(s.ball.kick.receiver);
          expect(s.lastSwitch?.why).toBe('pass receiver');
          // The receiver is controlled, not in possession, until contact.
          expect(s.ball.owner).toBeNull();
          return (checked = true);
        }
        return false;
      });
      expect(checked).toBe(true);
      expect(passer).not.toBe(sim.state.controlledId);
    });
  }

  it('fresh stick input steers the receiver before the first touch; a held aim stick does not', () => {
    const sim = new MatchSim({ seed: 2 });
    run(sim, T.kickoff.countdownSeconds + 2 * F);
    sim.arrange((s) => stageLabScenario(s, 'pass-range', T.pitch));
    sim.command({ type: 'padPress', id: ++cmd, action: 'pass' });
    sim.step(F);
    sim.command({ type: 'padMove', x: 0.894, y: -0.447 });
    sim.command({ type: 'padRelease', id: ++cmd, action: 'pass' });
    run(sim, 0.5, F, () => !!sim.state.receiveAssist);
    const id = sim.state.controlledId;
    expect(sim.state.receiveAssist?.id).toBe(id);
    sim.command({ type: 'padMove', x: 0, y: 1 });
    let steered = false;
    run(sim, 0.6, F, () => {
      const s = sim.state;
      if (s.ball.owner) return true;
      expect(s.receiveAssist).toBeNull();
      const v = s.players[id].vel;
      if (v.y > 1) steered = true;
      return false;
    });
    expect(steered).toBe(true);
  });
});
