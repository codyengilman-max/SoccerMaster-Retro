import { describe, expect, it } from 'vitest';
import { match } from '../src/game';
import { OFFSIDE_POPUP, OffsidePopup } from '../src/render/offsidePopup';

const { MatchSim, MATCH_TUNING: T, TEAM_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim>;
const F = 1 / 60;

function run(sim: Sim, seconds: number, each?: (s: Sim, i: number) => boolean | void): void {
  for (let i = 0; i < Math.round(seconds / F); i++) {
    if (each?.(sim, i)) return;
    sim.step(F);
  }
}
const put = (p: match.MatchPlayer, x: number, y: number) => {
  p.pos.x = x;
  p.pos.y = y;
  p.vel.x = 0;
  p.vel.y = 0;
};
/** Same staging as the authoritative referee test and `?debug&setup=offside|offside-position`. */
function stage(sim: Sim, pass: boolean): void {
  run(sim, T.kickoff.countdownSeconds + 2 * F);
  sim.arrange((s) => {
    for (const id of TEAM_PLAYER_IDS.away) put(s.players[id], 50, 10);
    put(s.players.A1, 74, 25);
    put(s.players.A2, 60, 10);
    put(s.players.H9, 66, 25);
    if (pass) {
      put(s.players.H6, 45, 25);
      sim.referee.notePass(s.players.H6, s.players, { x: 45, y: 25 });
      s.ball.owner = null;
      s.ball.pos = { x: 65, y: 25 };
      s.ball.vel = { x: 1.5, y: 0 };
      s.ball.lastTouch = 'home';
      s.ball.kick = { by: 'H6', team: 'home', kind: 'pass', at: s.simTime - 1, target: { x: 66, y: 25 }, receiver: 'H9' };
    } else {
      put(s.players.H8, 30, 25);
      s.ball.owner = 'H8';
      s.ball.pos = { x: 30.6, y: 25 };
      s.ball.vel = { x: 0, y: 0 };
    }
  });
}
/** Drive the popup the way MatchScene.render does: stoppage only while play is stopped. */
const frame = (popup: OffsidePopup, sim: Sim, ms: number) => popup.update(sim.state.phase === 'stopped' ? sim.state.stoppage : null, sim.state.phase === 'stopped', ms, false);

describe('offside popup state', () => {
  const call = { reason: 'offside' };
  it('shows only for an offside stoppage, never for goals, fouls, outs or live play', () => {
    const p = new OffsidePopup();
    for (const reason of ['goal', 'foul', 'out']) expect(p.update({ reason }, true, 0, false).visible).toBe(false);
    expect(p.update(call, false, 0, false).visible).toBe(false);
    expect(p.update(null, true, 0, false).visible).toBe(false);
    expect(p.shown).toBe(0);
    expect(p.update(call, true, 0, false).visible).toBe(true);
    expect(p.shown).toBe(1);
  });

  it('counts one popup per call however often the same stoppage is rendered', () => {
    const p = new OffsidePopup();
    for (let ms = 0; ms < 2000; ms += 16) p.update(call, true, ms, false);
    expect(p.shown).toBe(1);
    p.update({ reason: 'offside' }, true, 2100, false);
    expect(p.shown).toBe(2);
  });

  it('slides in, or only fades with reduced motion, then times out', () => {
    const p = new OffsidePopup();
    const a = p.update(call, true, 0, false);
    expect(a).toMatchObject({ visible: true, alpha: 0, slide: 1 });
    expect(p.update(call, true, OFFSIDE_POPUP.inMs, false)).toMatchObject({ alpha: 1, slide: 0 });
    expect(p.update(call, true, OFFSIDE_POPUP.maxMs + 1, false).visible).toBe(false);
    const r = new OffsidePopup();
    expect(r.update(call, true, 0, true)).toMatchObject({ visible: true, alpha: 0, slide: 0 });
    expect(r.update(call, true, 100, true).slide).toBe(0);
  });

  it('clears on dismissal, restart and reset, and does not come back for the same call', () => {
    const p = new OffsidePopup();
    p.update(call, true, 0, false);
    p.dismiss();
    expect(p.update(call, true, 50, false).visible).toBe(false);
    expect(p.update(null, false, 60, false).visible).toBe(false);
    expect(p.update(call, true, 70, false).visible).toBe(false);
    p.reset();
    expect(p.shown).toBe(0);
    expect(p.update(call, true, 80, false).visible).toBe(true);
  });
});

describe('offside popup from the rules engine', () => {
  it('a confirmed offside call shows it once; the free kick restart and score are unchanged', () => {
    const sim = new MatchSim({ seed: 4 });
    const popup = new OffsidePopup();
    stage(sim, true);
    const score = { ...sim.state.score };
    let seen = 0;
    run(sim, 1, (s, i) => void (frame(popup, s, i * 16).visible && seen++));
    expect(sim.state.stoppage).toMatchObject({ reason: 'offside', restart: 'indirectFreeKick', restartTeam: 'away' });
    expect(seen).toBeGreaterThan(0);
    run(sim, T.stoppage.outSeconds + 0.1, (s, i) => void frame(popup, s, 1000 + i * 16));
    expect(popup.shown).toBe(1);
    expect(sim.state.phase).toBe('live');
    expect(sim.state.ball.owner?.startsWith('A')).toBe(true);
    expect(sim.state.score).toEqual(score);
    expect(frame(popup, sim, 9000).visible).toBe(false);
  });

  it('a player merely standing in an offside position does not show it', () => {
    const sim = new MatchSim({ seed: 4 });
    const popup = new OffsidePopup();
    stage(sim, false);
    const behind = sim.state.players.H9.pos.x > sim.state.players.A2.pos.x;
    expect(behind).toBe(true);
    run(sim, 0.5, (s, i) => {
      expect(frame(popup, s, i * 16).visible).toBe(false);
    });
    expect(popup.shown).toBe(0);
    expect(sim.state.events.some((e) => e.type === 'offside')).toBe(false);
  });
});
