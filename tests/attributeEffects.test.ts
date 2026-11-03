import { describe, expect, it, vi } from 'vitest';
import { match } from '../src/game';
import * as K11 from '../src/game/match/kicking';

/** Progression v2: every active attribute has a bounded, measurable effect (docs/PROGRESSION.md). */
const { MatchSim, MATCH_TUNING: T, TEAM_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim> & { id: () => number };
type Id = match.MatchPlayerId;
const F = 1 / 60;
const K = T.kicking;

function sim(attributes?: match.MatchSimOptions['attributes'], seed = 7): Sim {
  const s = new MatchSim({ seed, halfSeconds: null, ...(attributes ? { attributes } : {}) }) as Sim;
  let n = 0;
  s.id = () => ++n;
  for (let i = 0; i < Math.round((T.kickoff.countdownSeconds + 2 * F) / F); i++) s.step(F);
  return s;
}
function clearAround(s: Sim): void {
  s.arrange((st) => {
    for (const id of [...TEAM_PLAYER_IDS.home, ...TEAM_PLAYER_IDS.away] as Id[]) {
      st.players[id].pos = { x: id.startsWith('H') ? 70 : 75, y: 3 + Number(id.slice(1)) * 4 };
      st.players[id].vel = { x: 0, y: 0 };
    }
  });
}
/** H7, controlled, carries the ball toward the away goal with the stick held for `seconds`; returns its speed. */
function carry(attrs: Partial<match.PlayerAttrs>, seconds = 1.5): { speed: number; receives: number } {
  const s = sim({ H7: attrs });
  clearAround(s);
  s.arrange((st) => {
    st.players.H7.pos = { x: 20, y: 25 };
    st.ball.owner = 'H7';
    st.ball.pos = { x: 20.6, y: 25 };
    st.ball.vel = { x: 0, y: 0 };
    st.ball.kick = null;
    st.possession = 'home';
    st.ownedSince = st.simTime;
    st.nextDecisionAt = st.simTime + 10;
    st.protectUntil = st.simTime + 10;
    st.controlledId = 'H7';
    st.controlSince = st.simTime;
    st.controlEpoch += 1;
  });
  const spy = vi.spyOn(s as unknown as { receiveV11: (p: unknown) => void }, 'receiveV11');
  for (let i = 0; i < Math.round(seconds / F); i++) {
    s.command({ type: 'padMove', x: 1, y: 0 });
    s.step(F);
  }
  const v = s.state.players.H7.vel;
  return { speed: Math.hypot(v.x, v.y), receives: spy.mock.calls.length };
}
/** One genuine reception by H7 of a hard (18 yd/s) ball from the front; returns the first-touch quality. */
function receive(attrs: Partial<match.PlayerAttrs>): number {
  const s = sim({ H7: attrs });
  clearAround(s);
  s.arrange((st) => {
    st.players.H7.pos = { x: 30, y: 25 };
    st.ball.owner = null;
    st.ball.pos = { x: 31, y: 25 };
    st.ball.vel = { x: -18, y: 0 };
  });
  (s as unknown as { receiveV11: (p: unknown) => void }).receiveV11(s.state.players.H7);
  return s.lastTouch!.quality;
}

describe('attribute effects (bounded 0.8–1.2x)', () => {
  it('First Touch: better control on the one genuine reception; Dribbling does not change it', () => {
    const lo = receive({ control: 0.8 });
    const hi = receive({ control: 1.2 });
    expect(hi).toBeGreaterThan(lo);
    expect(receive({ dribbling: 0.8 })).toBe(receive({ dribbling: 1.2 }));
  });
  it('Dribbling: faster carries, and carrying never retriggers the first touch', () => {
    const lo = carry({ dribbling: 0.8 });
    const hi = carry({ dribbling: 1.2 });
    expect(hi.speed).toBeGreaterThan(lo.speed);
    expect(lo.receives + hi.receives).toBe(0);
  });
  it('Pace: higher top speed (no sprint input involved)', () => {
    expect(carry({ pace: 1.2 }).speed).toBeGreaterThan(carry({ pace: 0.8 }).speed);
  });
  it('Agility: faster acceleration to speed', () => {
    expect(carry({ agility: 1.2, accel: 1.2 }, 0.25).speed).toBeGreaterThan(carry({ agility: 0.8, accel: 0.8 }, 0.25).speed);
  });
  it('Passing: higher pass speed cap; Finishing: tighter shot spread', () => {
    expect(K11.passSpeedCap(1.2, K)).toBeGreaterThan(K11.passSpeedCap(0.8, K));
    const shot = (finishing: number) => K11.shotErrorSpread({ pressure: 0.5, misalign: 0.3, charge: 0.8, finishing }, K);
    expect(shot(1.2)).toBeLessThan(shot(0.8));
    expect(shot(1.2)).toBeGreaterThan(0);
  });
  it('Composure: the same pressure costs less (0.8–1.2x of it, still 0–1)', () => {
    const s = sim({ H7: { composure: 1.2 }, H8: { composure: 0.8 } });
    const any = s as unknown as { pressureOn: (p: unknown) => number; pressureFor: (p: unknown) => number };
    any.pressureOn = () => 0.5;
    expect(any.pressureFor(s.state.players.H7)).toBeCloseTo(0.4, 12);
    expect(any.pressureFor(s.state.players.H8)).toBeCloseTo(0.6, 12);
    any.pressureOn = () => 1;
    expect(any.pressureFor(s.state.players.H8)).toBe(1);
  });
  it('Tactical Awareness: AI teammates recover team shape faster', () => {
    const spread = (v: number) => {
      const attrs = Object.fromEntries(TEAM_PLAYER_IDS.home.map((id) => [id, { awareness: v }]));
      const s = sim(attrs, 11);
      const ids = (TEAM_PLAYER_IDS.home as readonly Id[]).filter((id) => id !== s.state.controlledId && id !== 'H1');
      s.arrange((st) => {
        for (const id of ids) st.players[id].pos = { x: st.players[id].pos.x, y: Math.min(48, st.players[id].pos.y + 8) };
      });
      for (let i = 0; i < 30; i++) s.step(F);
      const st = s.state.players as unknown as Record<Id, { pos: { x: number; y: number }; target: { x: number; y: number } }>;
      return ids.reduce((a, id) => a + Math.hypot(st[id].pos.x - st[id].target.x, st[id].pos.y - st[id].target.y), 0) / ids.length;
    };
    expect(spread(1.2)).toBeLessThan(spread(0.8));
  });
});
