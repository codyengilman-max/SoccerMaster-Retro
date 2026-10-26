import { describe, expect, it } from 'vitest';
import { FORMATION_IDS, roleDef, type FormationId } from '../src/game/match/formations';
import { MatchSim } from '../src/game/match/sim';
import { MATCH_TUNING as T } from '../src/game/match/tuning';
import { TEAM_PLAYER_IDS, type MatchPlayer, type MatchState, type TeamId } from '../src/game/match/types';

const F = 1 / 60;
const L = T.pitch.length;
const W = T.pitch.width;
const TEAMS: readonly TeamId[] = ['home', 'away'];
const other = (t: TeamId): TeamId => (t === 'home' ? 'away' : 'home');
const world = (team: TeamId, x: number, y: number) => (team === 'home' ? { x, y } : { x: L - x, y: W - y });
const tx = (team: TeamId, x: number) => (team === 'home' ? x : L - x);
const ty = (team: TeamId, y: number) => (team === 'home' ? y : W - y);

function newSim(f: FormationId, seed = 7): MatchSim {
  const sim = new MatchSim({ seed, homeFormation: f, awayFormation: f });
  for (let i = 0; i < Math.round((T.kickoff.countdownSeconds + 0.1) / F); i++) sim.step(F);
  return sim;
}
const outfield = (s: Readonly<MatchState>, team: TeamId): MatchPlayer[] => TEAM_PLAYER_IDS[team].map((id) => s.players[id]).filter((p) => !p.isKeeper);
const line = (s: Readonly<MatchState>, team: TeamId, p: MatchPlayer) => roleDef(s.formations[team], p.slot).line;
const defenders = (s: Readonly<MatchState>, team: TeamId) => outfield(s, team).filter((p) => line(s, team, p) === 'defence');

/** Places players in `team`'s frame (own goal x = 0) and gives `carrier` the ball. */
function stage(sim: MatchSim, team: TeamId, carrier: MatchPlayer['id'], at: { x: number; y: number }, place: Partial<Record<MatchPlayer['id'], [number, number]>> = {}): void {
  sim.arrange((s) => {
    for (const [id, [x, y]] of Object.entries(place) as [MatchPlayer['id'], [number, number]][]) {
      s.players[id].pos = world(team, x, y);
      s.players[id].vel = { x: 0, y: 0 };
    }
    const p = s.players[carrier];
    p.pos = world(team, at.x, at.y);
    p.vel = { x: 0, y: 0 };
    s.ball.owner = carrier;
    s.ball.pos = { ...p.pos };
    s.ball.vel = { x: 0, y: 0 };
    s.ball.kick = null;
    s.possession = p.team;
    s.ownedSince = s.simTime;
    if (p.team === 'home' && !p.isKeeper) s.controlledId = carrier;
  });
}
/** Runs `seconds` with the carrier kept on the ball (no tackles, no AI pass yet), optionally moving at `vel` (team frame of the carrier). */
function hold(sim: MatchSim, seconds: number, vel?: { x: number; y: number }): void {
  const o0 = sim.state.ball.owner ? sim.state.players[sim.state.ball.owner] : null;
  const pin = o0 ? { ...o0.pos } : null;
  for (let i = 0; i < Math.round(seconds / F); i++) {
    sim.arrange((s) => {
      s.protectUntil = s.simTime + 1;
      s.nextDecisionAt = s.simTime + 1;
      s.ownedSince = s.simTime;
      const o = s.ball.owner ? s.players[s.ball.owner] : null;
      if (o && vel && pin) {
        o.vel = o.team === 'home' ? { ...vel } : { x: -vel.x, y: -vel.y };
        pin.x += o.vel.x * F;
        pin.y += o.vel.y * F;
      } else if (o) o.vel = { x: 0, y: 0 };
      if (o && pin) o.pos = { ...pin };
      if (o) s.ball.pos = { ...o.pos };
    });
    sim.step(F);
  }
}
const targetT = (team: TeamId, p: MatchPlayer) => ({ x: tx(team, p.target.x), y: ty(team, p.target.y) });
const posT = (team: TeamId, p: MatchPlayer) => ({ x: tx(team, p.pos.x), y: ty(team, p.pos.y) });
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** Opponents (in `team`'s frame) parked deep in their own half, spread across. */
function parkOpponents(team: TeamId, x = 64): Partial<Record<MatchPlayer['id'], [number, number]>> {
  const out: Partial<Record<MatchPlayer['id'], [number, number]>> = {};
  TEAM_PLAYER_IDS[other(team)].forEach((id, i) => (out[id] = i === 0 ? [73, 25] : [x + (i % 2) * 3, 5 + i * 5]));
  return out;
}

describe('team shape: one shared controller for both teams, every formation, both directions', () => {
  for (const f of FORMATION_IDS) {
    for (const team of TEAMS) {
      it(`${f} ${team}: keeper build-up splits the back line and midfield is not stacked in front of him`, () => {
        const sim = newSim(f);
        const gk = TEAM_PLAYER_IDS[team][0]!;
        stage(sim, team, gk, { x: 4, y: 25 }, parkOpponents(team, 42));
        hold(sim, 2.5);
        const s = sim.state;
        expect(s.shape[team].phase).toBe('gkBuild');
        const d = defenders(s, team).map((p) => targetT(team, p));
        for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) expect(Math.hypot(d[i]!.x - d[j]!.x, d[i]!.y - d[j]!.y)).toBeGreaterThan(8);
        // Not all of the back line directly in front of the keeper.
        expect(d.filter((p) => p.x < 12 && Math.abs(p.y - 25) < 8).length).toBeLessThanOrEqual(1);
        expect(Math.max(...d.map((p) => p.y)) - Math.min(...d.map((p) => p.y))).toBeGreaterThan(f === '1-2-4-2' ? 14 : 28);
        const mids = outfield(s, team).filter((p) => line(s, team, p) === 'midfield').map((p) => targetT(team, p));
        for (const m of mids) expect(m.x).toBeGreaterThan(18);
      });

      it(`${f} ${team}: controlled advance moves the back line up behind the ball`, () => {
        const sim = newSim(f);
        const mid = outfield(sim.state, team).find((p) => line(sim.state, team, p) === 'midfield')!;
        stage(sim, team, mid.id, { x: 30, y: 25 }, parkOpponents(team));
        hold(sim, 1.5);
        const before = avg(defenders(sim.state, team).map((p) => posT(team, p).x));
        hold(sim, 4, { x: 4, y: 0 });
        const s = sim.state;
        const bx = tx(team, s.players[mid.id].pos.x);
        const after = defenders(s, team).map((p) => posT(team, p).x);
        expect(bx).toBeGreaterThan(44);
        // The shared line wants to sit behindBall yards back; its smoothed height trails a moving ball a little.
        expect(s.shape[team].lineDesired).toBeGreaterThan(bx - T.teamShape.behindBall - 1);
        expect(s.shape[team].lineX).toBeGreaterThan(bx - T.teamShape.behindBall - 3);
        expect(avg(after)).toBeGreaterThan(before + 6);
        for (const x of after) expect(x).toBeLessThan(bx);
      });

      it(`${f} ${team}: sustained attack brings the back line toward halfway; one stays behind as rest defence`, () => {
        const sim = newSim(f);
        const fwd = outfield(sim.state, team).find((p) => line(sim.state, team, p) === 'attack')!;
        stage(sim, team, fwd.id, { x: 62, y: 20 }, parkOpponents(team, 62));
        hold(sim, 6);
        const s = sim.state;
        const d = defenders(s, team).map((p) => posT(team, p).x);
        expect(avg(d)).toBeGreaterThan(30);
        expect(Math.min(...d)).toBeGreaterThan(26);
        expect(Math.min(...d)).toBeLessThan(tx(team, s.ball.pos.x) - 8);
        expect(s.shape[team].why[defenders(s, team)[0]!.id]).toBeTruthy();
      });

      it(`${f} ${team}: their forward left high keeps a defender goal-side of him`, () => {
        const sim = newSim(f);
        const fwd = outfield(sim.state, team).find((p) => line(sim.state, team, p) === 'attack')!;
        const park = parkOpponents(team, 62);
        const high = TEAM_PLAYER_IDS[other(team)][8]!;
        park[high] = [24, 25];
        stage(sim, team, fwd.id, { x: 62, y: 20 }, park);
        hold(sim, 5);
        const s = sim.state;
        const hx = tx(team, s.players[high].pos.x);
        const d = defenders(s, team).map((p) => targetT(team, p).x);
        expect(Math.min(...d)).toBeLessThan(hx);
        expect(s.shape[team].lineDesired).toBeLessThanOrEqual(hx + T.teamShape.restAhead + 0.01);
      });
    }
  }
});

describe('team shape out of possession', () => {
  for (const team of TEAMS) {
    const opp = other(team);
    it(`${team}: wide attack shifts the unit to the ball side, far side narrows, one presser`, () => {
      const sim = newSim('1-3-2-3');
      const carrier = TEAM_PLAYER_IDS[opp][6]!;
      // Carrier on our left touchline (team frame y small), level with our midfield.
      stage(sim, opp, carrier, { x: 75 - 32, y: 50 - 5 });
      hold(sim, 2.5);
      const s = sim.state;
      const d = defenders(s, team).map((p) => targetT(team, p));
      expect(avg(d.map((p) => p.y))).toBeLessThan(23);
      expect(Math.max(...d.map((p) => p.y))).toBeLessThan(40);
      const intents = TEAM_PLAYER_IDS[team].map((id) => s.players[id].intent);
      expect(intents.filter((x) => x === 'press').length).toBe(1);
    });

    it(`${team}: a backward pass lets the line step up together`, () => {
      const sim = newSim('1-3-2-3');
      const carrier = TEAM_PLAYER_IDS[opp][5]!;
      // Our frame: nobody close to the carrier, so the block is organised (not already stepping to pressure).
      const park: Partial<Record<MatchPlayer['id'], [number, number]>> = {};
      for (const p of outfield(sim.state, team)) {
        const [x, y] = line(sim.state, team, p) === 'defence' ? [20, 5 + p.slot * 10] : [28, 5 + p.slot * 5];
        park[p.id] = [L - x, W - y];
      }
      stage(sim, opp, carrier, { x: L - 48, y: 25 }, park);
      // Past the turnover window, so this is an organised block reading their pass.
      hold(sim, T.teamShape.transitionSeconds + 0.1);
      const before = sim.state.shape[team].lineDesired;
      expect(sim.state.shape[team].effectivePressure).toBe(false);
      // Their pass rolls back toward their own goal.
      sim.arrange((s) => {
        s.ball.owner = null;
        const a = world(team, 0, 0);
        const b = world(team, 9, 0);
        s.ball.vel = { x: b.x - a.x, y: 0 };
        s.ball.kick = { by: carrier, team: opp, kind: 'pass', at: s.simTime, target: world(team, 62, 25), receiver: TEAM_PLAYER_IDS[opp][2]! };
        s.ball.ignore = [{ id: carrier, until: s.simTime + 1 }];
      });
      sim.step(F);
      sim.step(F);
      const sh = sim.state.shape[team];
      expect(sim.state.possession).toBe(opp);
      expect(sh.stepUntil).toBeGreaterThan(sim.state.simTime);
      expect(sh.reason).toMatch(/backward/);
      expect(sh.lineDesired).toBeGreaterThan(before);
    });

    it(`${team}: unpressured forward-facing carrier with a runner near the line makes the line protect depth`, () => {
      const sim = newSim('1-3-2-3');
      const carrier = TEAM_PLAYER_IDS[opp][5]!;
      const runner = TEAM_PLAYER_IDS[opp][7]!;
      // Our frame: back line at x 20, everyone else upfield behind the ball; their runner on our line.
      const park: Partial<Record<MatchPlayer['id'], [number, number]>> = {};
      for (const p of outfield(sim.state, team)) {
        const [x, y] = line(sim.state, team, p) === 'defence' ? [20, 5 + p.slot * 10] : [62, p.slot * 5];
        park[p.id] = [L - x, W - y];
      }
      park[runner] = [L - 23, W - 25];
      stage(sim, opp, carrier, { x: L - 45, y: 25 }, park);
      hold(sim, 1.6);
      // Their runner sprints at our line while the carrier comes forward.
      const runFrom = { ...sim.state.players[runner].pos };
      for (let i = 0; i < 24; i++) {
        sim.arrange((s) => {
          const r = s.players[runner];
          const v = world(team, -6, 0);
          const o = world(team, 0, 0);
          r.vel = { x: v.x - o.x, y: 0 };
          r.pos = { x: runFrom.x + r.vel.x * F * (i + 1), y: runFrom.y };
        });
        hold(sim, F, { x: 2.5, y: 0 });
      }
      const sh = sim.state.shape[team];
      expect(sh.carrierForward).toBe(true);
      expect(sh.reason).toMatch(/protect depth/);
      expect(sh.lineDesired).toBeLessThan(tx(team, sim.state.players[runner].pos.x));
    });

    it(`${team}: through ball beyond the line drops the line toward the runner`, () => {
      const sim = newSim('1-3-2-3');
      const carrier = TEAM_PLAYER_IDS[opp][5]!;
      const park: Partial<Record<MatchPlayer['id'], [number, number]>> = {};
      for (const p of outfield(sim.state, team)) {
        const [x, y] = line(sim.state, team, p) === 'defence' ? [24, 5 + p.slot * 10] : [60, p.slot * 5];
        park[p.id] = [L - x, W - y];
      }
      stage(sim, opp, carrier, { x: L - 40, y: 25 }, park);
      hold(sim, 0.5);
      const lineBefore = sim.state.shape[team].lineActual;
      sim.arrange((s) => {
        s.ball.owner = null;
        const a = world(team, 0, 0);
        const b = world(team, -12, 0);
        s.ball.vel = { x: b.x - a.x, y: 0 };
        s.ball.kick = { by: carrier, team: opp, kind: 'pass', at: s.simTime, target: world(team, lineBefore - 8, 25), receiver: TEAM_PLAYER_IDS[opp][7]! };
        s.ball.ignore = [{ id: carrier, until: s.simTime + 1 }];
      });
      sim.step(F);
      const sh = sim.state.shape[team];
      expect(sh.reason).toMatch(/through ball/);
      expect(sh.lineDesired).toBeLessThan(lineBefore);
    });

    it(`${team}: switch of play moves the unit across without collapsing`, () => {
      const sim = newSim('1-3-2-3');
      const carrier = TEAM_PLAYER_IDS[opp][6]!;
      stage(sim, opp, carrier, { x: 75 - 36, y: 50 - 8 });
      hold(sim, 2.5);
      const y1 = avg(defenders(sim.state, team).map((p) => targetT(team, p).y));
      const carrier2 = TEAM_PLAYER_IDS[opp][8]!;
      stage(sim, opp, carrier2, { x: 75 - 36, y: 50 - 42 });
      hold(sim, 2.5);
      const d = defenders(sim.state, team).map((p) => targetT(team, p).y);
      expect(avg(d)).toBeGreaterThan(y1 + 8);
      // Not collapsed around the ball: the unit keeps its spread and at most one defender is on the ball.
      expect(Math.max(...d) - Math.min(...d)).toBeGreaterThan(10);
      const ball = { x: tx(team, sim.state.ball.pos.x), y: ty(team, sim.state.ball.pos.y) };
      expect(defenders(sim.state, team).filter((p) => Math.hypot(targetT(team, p).x - ball.x, targetT(team, p).y - ball.y) < 6).length).toBeLessThanOrEqual(1);
    });

    it(`${team}: an organised block keeps units 9-14 yd apart and the block within 32 yd`, () => {
      const sim = newSim('1-3-2-3');
      const carrier = TEAM_PLAYER_IDS[opp][5]!;
      stage(sim, opp, carrier, { x: 75 - 50, y: 25 });
      hold(sim, 3);
      const sh = sim.state.shape[team];
      expect(sh.midX - sh.lineX).toBeGreaterThanOrEqual(9 - 1e-6);
      expect(sh.midX - sh.lineX).toBeLessThanOrEqual(14);
      expect(sh.frontX - sh.lineX).toBeLessThanOrEqual(32);
    });

    it(`${team}: turnover gives one presser and the line does not keep pushing up`, () => {
      const sim = newSim('1-3-2-3');
      const mine = outfield(sim.state, team).find((p) => line(sim.state, team, p) === 'attack')!;
      stage(sim, team, mine.id, { x: 55, y: 25 }, parkOpponents(team, 50));
      hold(sim, 4);
      const lineBefore = sim.state.shape[team].lineX;
      const thief = TEAM_PLAYER_IDS[opp][4]!;
      stage(sim, opp, thief, { x: 75 - 56, y: 25 });
      hold(sim, 0.5);
      const s = sim.state;
      expect(s.shape[team].phase).toBe('transitionLost');
      // Without real pressure on the new carrier the line holds; with it, the counter-press may step a little.
      if (!s.shape[team].effectivePressure) expect(s.shape[team].lineX).toBeLessThanOrEqual(lineBefore + 1e-6);
      else expect(s.shape[team].lineX).toBeLessThanOrEqual(lineBefore + T.teamShape.lineUpSpeed * 0.5 + 1e-6);
      expect(TEAM_PLAYER_IDS[team].filter((id) => s.players[id].intent === 'press').length).toBe(1);
    });
  }
});
