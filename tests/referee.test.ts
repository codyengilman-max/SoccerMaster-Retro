import { describe, expect, it } from 'vitest';
import { match } from '../src/game';
import { U11_9V9_PITCH as P } from '../src/game/pitch';

const { MatchSim, MATCH_TUNING: T, Referee, REFEREE_TUNING: RT, TEAM_PLAYER_IDS, MATCH_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim>;
type Id = match.MatchPlayerId;
type Player = match.MatchPlayer;
const F = 1 / 60;

function run(sim: Sim, seconds: number, until?: (s: Sim) => boolean, frame = F): void {
  for (let i = 0; i < Math.round(seconds / frame); i++) {
    if (until?.(sim)) return;
    sim.step(frame);
  }
}
const live = (sim: Sim): void => run(sim, T.kickoff.countdownSeconds + 2 * F);
const stopped = (s: Sim): boolean => s.state.phase === 'stopped';

function looseBall(sim: Sim, pos: { x: number; y: number }, vel: { x: number; y: number }, by: Id): void {
  sim.arrange((s) => {
    s.ball.owner = null;
    s.ball.pos = { ...pos };
    s.ball.vel = { ...vel };
    s.ball.lastTouch = s.players[by].team;
    s.ball.kick = { by, team: s.players[by].team, kind: 'pass', at: s.simTime - 1, target: null, receiver: null };
  });
}

/** Free-standing players for referee unit checks. */
function squad(): Record<Id, Player> {
  return new MatchSim({ seed: 1 }).state.players as Record<Id, Player>;
}
function put(p: Player, x: number, y: number, vx = 0, vy = 0): void {
  p.pos.x = x;
  p.pos.y = y;
  p.vel.x = vx;
  p.vel.y = vy;
}

describe('referee: out of play', () => {
  it('throw-in: whole ball over the touchline freezes play; the other team throws from the crossing point', () => {
    const sim = new MatchSim({ seed: 1 });
    live(sim);
    looseBall(sim, { x: 40, y: 49.5 }, { x: 0, y: 6 }, 'H6');
    run(sim, 0.5, stopped);
    const st = sim.state.stoppage!;
    expect(st).toMatchObject({ reason: 'out', restart: 'throwIn', restartTeam: 'away' });
    expect(st.spot.x).toBeCloseTo(40, 1);
    expect(st.spot.y).toBeCloseTo(P.width - 0.4, 5);
    expect(sim.referee.call.at.y).toBe(P.width);
    for (const id of MATCH_PLAYER_IDS) expect(Math.hypot(sim.state.players[id].vel.x, sim.state.players[id].vel.y)).toBe(0);
    run(sim, T.stoppage.outSeconds + 0.1);
    const taker = sim.state.ball.owner!;
    expect(taker.startsWith('A')).toBe(true);
    expect(sim.state.players[taker].pos.y).toBeCloseTo(P.width - 0.4, 5);
    expect(sim.state.setPiece).toMatchObject({ kind: 'throwIn', taker });
    const at = { ...sim.state.players[taker].pos };
    const seq = sim.state.events.at(-1)!.seq;
    run(sim, 2, (x) => x.state.phase === 'live');
    run(sim, RT.aiTakeSeconds - 0.05);
    expect(sim.state.ball.owner).toBe(taker);
    expect(Math.hypot(sim.state.players[taker].pos.x - at.x, sim.state.players[taker].pos.y - at.y)).toBeLessThan(1e-9);
    run(sim, 0.5, (s) => s.state.ball.owner !== taker);
    expect(sim.state.events.some((e) => e.seq > seq && e.type === 'pass' && e.by === taker && /throw-in/.test(e.detail))).toBe(true);
    expect(sim.state.setPiece).toBeNull();
  });

  it('goal kick when the attackers touched it last: ball at the goal-area corner, keeper takes', () => {
    const sim = new MatchSim({ seed: 2 });
    live(sim);
    looseBall(sim, { x: 74.5, y: 10 }, { x: 6, y: 0 }, 'H9');
    run(sim, 0.5, stopped);
    const st = sim.state.stoppage!;
    expect(st).toMatchObject({ reason: 'out', restart: 'goalKick', restartTeam: 'away' });
    expect(st.spot).toEqual({ x: P.length - P.goalAreaDepth, y: P.width / 2 - P.goalAreaWidth / 2 });
    run(sim, T.stoppage.outSeconds + 0.1);
    expect(sim.state.ball.owner).toBe('A1');
    for (const id of TEAM_PLAYER_IDS.home) expect(sim.referee.inPenaltyArea(sim.state.players[id].pos, 'away')).toBe(false);
  });

  it('corner when the defenders touched it last: ball at the nearest flag, attackers take, opponents 8 yd off', () => {
    const sim = new MatchSim({ seed: 3 });
    live(sim);
    looseBall(sim, { x: 74.5, y: 10 }, { x: 6, y: 0 }, 'A3');
    run(sim, 0.5, stopped);
    const st = sim.state.stoppage!;
    expect(st).toMatchObject({ reason: 'out', restart: 'corner', restartTeam: 'home' });
    expect(st.spot).toEqual({ x: P.length - 0.5, y: 0.5 });
    run(sim, T.stoppage.outSeconds + 0.1);
    const taker = sim.state.ball.owner!;
    expect(taker.startsWith('H')).toBe(true);
    expect(sim.state.ball.pos.x).toBeLessThan(P.length);
    expect(sim.state.ball.pos.y).toBeGreaterThan(0);
    for (const id of TEAM_PLAYER_IDS.away) {
      const p = sim.state.players[id];
      if (!p.isKeeper) expect(Math.hypot(p.pos.x - st.spot.x, p.pos.y - st.spot.y)).toBeGreaterThanOrEqual(RT.restartDistance - 1e-6);
    }
  });

  it('a ball on the line is still in play: only the whole ball over the line is out', () => {
    const R = new Referee(T.pitch.ballRadius);
    expect(R.isOut({ x: P.length + 0.1, y: 10 })).toBe(false);
    expect(R.isOut({ x: P.length + 0.21, y: 10 })).toBe(true);
    expect(R.isOut({ x: 30, y: -0.15 })).toBe(false);
    expect(R.isOut({ x: 30, y: -0.25 })).toBe(true);
  });

  it('keeps the last two different players to touch the ball', () => {
    const R = new Referee(T.pitch.ballRadius);
    const pl = squad();
    R.touch(pl.H6);
    R.touch(pl.H6);
    expect(R.touches).toEqual(['H6', null]);
    R.touch(pl.A3);
    expect(R.touches).toEqual(['A3', 'H6']);
    R.touch(pl.H9);
    expect(R.touches).toEqual(['H9', 'A3']);
  });
});

describe('referee: offside', () => {
  /** Away defends x = 75: keeper on the line, A2 the second-last opponent at x = 60. */
  function setup(h9x: number, ballX = 45, deep = 50): { R: InstanceType<typeof Referee>; pl: Record<Id, Player> } {
    const R = new Referee(T.pitch.ballRadius);
    const pl = squad();
    for (const id of TEAM_PLAYER_IDS.away) put(pl[id], deep, 25);
    put(pl.A1, 74, 25);
    put(pl.A2, deep < 50 ? deep : 60, 20);
    for (const id of TEAM_PLAYER_IDS.home) put(pl[id], 30, 25);
    put(pl.H6, ballX, 25);
    put(pl.H9, h9x, 30);
    R.notePass(pl.H6, pl, { x: ballX, y: 25 });
    return { R, pl };
  }

  it('caches the second-last opponent at the kick instance and flags a receiver who was past it', () => {
    const { R, pl } = setup(62);
    expect(R.lineX).toBe(60);
    put(pl.H9, 50, 30); // came back onside before receiving: the kick instance decides
    expect(R.touch(pl.H9)).toBe(true);
    expect(R.callOffside(pl.H9)).toMatchObject({ kind: 'indirectFreeKick', team: 'away', offender: 'H9' });
  });

  it('level, behind the ball, or in your own half is onside', () => {
    expect(setup(60.2).R.touch(setup(60.2).pl.H9)).toBe(false);
    const ahead = setup(63, 66);
    expect(ahead.R.touch(ahead.pl.H9)).toBe(false);
    const half = setup(30, 25, 20);
    expect(half.R.lineX).toBe(P.length / 2);
    expect(half.R.touch(half.pl.H9)).toBe(false);
  });

  it('any touch ends the check: a later touch by the same player is not offside', () => {
    const { R, pl } = setup(62);
    expect(R.touch(pl.A2)).toBe(false);
    expect(R.touch(pl.H9)).toBe(false);
  });

  it('mirrors for the away team (attacking x = 0)', () => {
    const R = new Referee(T.pitch.ballRadius);
    const pl = squad();
    for (const id of TEAM_PLAYER_IDS.home) put(pl[id], 25, 25);
    put(pl.H1, 1, 25);
    put(pl.H2, 15, 20);
    for (const id of TEAM_PLAYER_IDS.away) put(pl[id], 45, 25);
    put(pl.A9, 12, 30);
    R.notePass(pl.A6, pl, pl.A6.pos);
    expect(R.lineX).toBe(15);
    expect(R.touch(pl.A9)).toBe(true);
  });

  it('no offside straight from a throw-in, goal kick or corner; no direct goal from an indirect free kick', () => {
    for (const kind of ['throwIn', 'goalKick', 'corner'] as const) {
      const { R, pl } = setup(62);
      R.restartTaken(kind, 'H6');
      R.touch(pl.H6);
      R.notePass(pl.H6, pl, pl.H6.pos);
      expect(R.touch(pl.H9)).toBe(false);
    }
    const { R, pl } = setup(62);
    R.restartTaken('indirectFreeKick', 'H6');
    R.touch(pl.H6);
    expect(R.directGoalDisallowed()).toBe(true);
    R.touch(pl.A1);
    expect(R.directGoalDisallowed()).toBe(false);
  });

  it('in the sim: receiving while offside stops play, shows the call and restarts with an away free kick', () => {
    const sim = new MatchSim({ seed: 4 });
    live(sim);
    sim.arrange((s) => {
      for (const id of TEAM_PLAYER_IDS.away) put(s.players[id], 50, 10);
      put(s.players.A1, 74, 25);
      put(s.players.A2, 60, 10);
      put(s.players.H6, 45, 25);
      put(s.players.H9, 66, 25);
      sim.referee.notePass(s.players.H6, s.players, { x: 45, y: 25 });
      s.ball.owner = null;
      s.ball.pos = { x: 65, y: 25 };
      s.ball.vel = { x: 1.5, y: 0 };
      s.ball.lastTouch = 'home';
      s.ball.kick = { by: 'H6', team: 'home', kind: 'pass', at: s.simTime - 1, target: { x: 66, y: 25 }, receiver: 'H9' };
    });
    run(sim, 1, stopped);
    const st = sim.state.stoppage!;
    expect(st).toMatchObject({ reason: 'offside', restart: 'indirectFreeKick', restartTeam: 'away' });
    expect(Math.hypot(st.spot.x - 66, st.spot.y - 25)).toBeLessThan(1.5);
    expect(sim.state.events.some((e) => e.type === 'offside' && /H9 offside/.test(e.detail))).toBe(true);
    run(sim, T.stoppage.outSeconds + 0.1);
    expect(sim.state.ball.owner?.startsWith('A')).toBe(true);
  });
});

describe('referee: offside with v1.1 first touch', () => {
  it('a heavy or deflected first touch from an offside position is still offside', () => {
    const sim = new MatchSim({ seed: 4, kicking: 'v11' });
    live(sim);
    sim.arrange((s) => {
      for (const id of TEAM_PLAYER_IDS.away) put(s.players[id], 50, 10);
      put(s.players.A1, 74, 25);
      put(s.players.A2, 60, 10);
      put(s.players.H6, 45, 25);
      put(s.players.H9, 66, 25, -4, 0);
      sim.referee.notePass(s.players.H6, s.players, { x: 45, y: 25 });
      s.ball.owner = null;
      s.ball.pos = { x: 63, y: 25 };
      s.ball.vel = { x: 25, y: 0 };
      s.ball.lastTouch = 'home';
      s.ball.kick = { by: 'H6', team: 'home', kind: 'pass', at: s.simTime - 1, target: { x: 66, y: 25 }, receiver: 'H9' };
    });
    run(sim, 1, stopped);
    expect(sim.state.stoppage).toMatchObject({ reason: 'offside', restart: 'indirectFreeKick', restartTeam: 'away' });
    expect(sim.state.events.some((e) => e.type === 'offside' && /H9 offside/.test(e.detail))).toBe(true);
  });
});

describe('referee: slide fouls', () => {
  it('a fast slide from behind is a foul even when it reaches the ball; free kick at the contact point', () => {
    const R = new Referee(T.pitch.ballRadius);
    const pl = squad();
    put(pl.H4, 30, 25, 6, 0);
    put(pl.A6, 31, 25, 3, 0);
    const c = R.assessSlide(pl.H4, pl.A6, true, { x: 31.6, y: 25 });
    expect(c).toBe(R.call);
    expect(c).toMatchObject({ kind: 'freeKick', team: 'away', offender: 'H4', victim: 'A6', spot: { x: 31, y: 25 } });
  });

  it('a slow slide, or a ball-first slide from the front, plays on', () => {
    const R = new Referee(T.pitch.ballRadius);
    const pl = squad();
    put(pl.H4, 30, 25, RT.maxSafeTackleThreshold - 0.1, 0);
    put(pl.A6, 31, 25, 3, 0);
    expect(R.assessSlide(pl.H4, pl.A6, false, { x: 31.6, y: 25 })).toBeNull();
    put(pl.H4, 30, 25, 6, 0);
    put(pl.A6, 31, 25, -3, 0);
    expect(R.assessSlide(pl.H4, pl.A6, true, { x: 30.4, y: 25 })).toBeNull();
    expect(R.assessSlide(pl.H4, pl.A6, false, { x: 30.4, y: 25 })).toMatchObject({ kind: 'freeKick' });
  });

  it('inside the slider’s own penalty area it is a penalty from the mark', () => {
    const R = new Referee(T.pitch.ballRadius);
    const pl = squad();
    put(pl.H4, 7, 25, -6, 0);
    put(pl.A9, 6, 25, -3, 0);
    expect(R.assessSlide(pl.H4, pl.A9, false, { x: 5.4, y: 25 })).toMatchObject({ kind: 'penalty', team: 'away', spot: { x: P.penaltyMarkDistance, y: 25 } });
    put(pl.A4, 68, 20, 6, 0);
    put(pl.H9, 69, 20, 3, 0);
    expect(R.assessSlide(pl.A4, pl.H9, false, { x: 69.6, y: 20 })).toMatchObject({ kind: 'penalty', team: 'home', spot: { x: P.length - P.penaltyMarkDistance, y: 25 } });
  });

  it('penalty restart: 1v1 against the keeper, everyone else held outside the area until the kick', () => {
    for (const [victim, team, auto] of [['A9', 'away', RT.aiTakeSeconds], ['H9', 'home', RT.userTakeSeconds]] as const) {
      const sim = new MatchSim({ seed: 5 });
      live(sim);
      const spotX = team === 'away' ? P.penaltyMarkDistance : P.length - P.penaltyMarkDistance;
      (sim as unknown as { stop: (...a: unknown[]) => void }).stop('foul', null, 'test foul', team, { x: spotX, y: 25 }, 'penalty', victim);
      run(sim, T.stoppage.outSeconds + 0.1);
      const s = sim.state;
      expect(s.ball.owner).toBe(victim);
      expect(s.setPiece).toMatchObject({ kind: 'penalty', taker: victim });
      const defending = team === 'away' ? 'home' : 'away';
      const keeper = defending === 'home' ? 'H1' : 'A1';
      for (const id of MATCH_PLAYER_IDS) {
        if (id === victim || id === keeper || s.players[id].isKeeper) continue;
        expect(sim.referee.inPenaltyArea(s.players[id].pos, defending)).toBe(false);
      }
      expect(Math.abs(s.players[keeper].pos.x - (defending === 'home' ? 0.3 : P.length - 0.3))).toBeLessThan(1e-6);
      const before = MATCH_PLAYER_IDS.map((id) => ({ ...s.players[id].pos }));
      const seq = s.events.at(-1)!.seq;
      run(sim, 2, (x) => x.state.phase === 'live');
      expect(s.phase).toBe('live');
      let drift = 0;
      for (let t = 0; t < auto - 0.1; t += T.stepSeconds) {
        sim.step(T.stepSeconds);
        drift = Math.max(drift, Math.hypot(s.ball.pos.x - spotX, s.ball.pos.y - 25));
      }
      expect(s.ball.owner).toBe(victim);
      expect(drift).toBeLessThan(1e-6);
      MATCH_PLAYER_IDS.forEach((id, i) => expect(Math.hypot(s.players[id].pos.x - before[i]!.x, s.players[id].pos.y - before[i]!.y)).toBeLessThan(0.01));
      run(sim, 0.4, (x) => x.state.ball.owner !== victim);
      expect(s.events.some((e) => e.seq > seq && e.type === 'shot' && e.by === victim && e.detail === 'penalty')).toBe(true);
    }
  });
});

describe('referee: determinism', () => {
  // The sim keeps only its last 40 events, so calls are collected after every step rather than read at the end.
  const CALLS = ['out', 'foul', 'offside', 'goal', 'restart'];
  const record = (sim: Sim, seconds: number, log: string[], frame = F): void => {
    let seq = sim.state.events.at(-1)?.seq ?? -1;
    for (let i = 0; i < Math.round(seconds / frame); i++) {
      sim.step(frame);
      for (const e of sim.state.events) {
        if (e.seq <= seq) continue;
        seq = e.seq;
        if (CALLS.includes(e.type)) log.push(`${e.type}@${e.at.toFixed(4)}:${e.by}:${e.detail}`);
      }
    }
  };

  it('the same match gives the same calls at 60 Hz and 120 Hz', () => {
    const play = (frame: number): { sim: Sim; log: string[] } => {
      const sim = new MatchSim({ seed: 7 });
      const log: string[] = [];
      record(sim, T.kickoff.countdownSeconds + 0.1, log, frame);
      looseBall(sim, { x: 40, y: 49.5 }, { x: 0, y: 6 }, 'H6');
      record(sim, 20, log, frame);
      looseBall(sim, { x: 74.5, y: 10 }, { x: 6, y: 0 }, 'A3');
      record(sim, 20, log, frame);
      return { sim, log };
    };
    const { sim: a, log: la } = play(1 / 60);
    const { sim: b, log: lb } = play(1 / 120);
    expect(la.length).toBeGreaterThanOrEqual(2);
    expect(lb).toEqual(la);
    for (const id of MATCH_PLAYER_IDS) {
      expect(b.state.players[id].pos.x).toBeCloseTo(a.state.players[id].pos.x, 6);
      expect(b.state.players[id].pos.y).toBeCloseTo(a.state.players[id].pos.y, 6);
    }
  });

  it('seeded sweep: every stoppage restarts and every set piece is taken (no stuck play)', () => {
    let restarts = 0;
    for (const seed of [11, 12, 13]) {
      const sim = new MatchSim({ seed });
      let stoppedFor = 0;
      let heldFor = 0;
      let seq = -1;
      const seen: string[] = [];
      for (let i = 0; i < 120 / F; i++) {
        sim.step(F);
        for (const e of sim.state.events) if (e.seq > seq) (seq = e.seq), seen.push(e.type);
        stoppedFor = sim.state.phase === 'stopped' ? stoppedFor + F : 0;
        heldFor = sim.state.setPiece ? heldFor + F : 0;
        expect(stoppedFor).toBeLessThan(T.stoppage.goalSeconds + 0.5);
        expect(heldFor).toBeLessThan(T.kickoff.countdownSeconds + RT.userTakeSeconds + 0.5);
      }
      restarts += seen.filter((t) => t === 'restart').length;
    }
    expect(restarts).toBeGreaterThan(0);
  });
});

describe('referee: restarts wait for the kick (review fixes)', () => {
  const stopAt = (sim: Sim, team: match.TeamId, spot: { x: number; y: number }, kind: match.RestartKind, reason = 'out'): void =>
    (sim as unknown as { stop: (...a: unknown[]) => void }).stop(reason, null, 'test', team, spot, kind, null);
  const toLive = (sim: Sim): void => {
    run(sim, T.stoppage.outSeconds + 0.1);
    run(sim, 2, (x) => x.state.phase === 'live');
  };

  it('free kick, indirect free kick, corner and goal kick: ball stays on the spot until the taker plays it', () => {
    const cases = [
      ['freeKick', { x: 40, y: 20 }],
      ['indirectFreeKick', { x: 50, y: 30 }],
      ['corner', { x: 0.5, y: 0.5 }],
      ['goalKick', { x: P.length - P.goalAreaDepth, y: 25 - P.goalAreaWidth / 2 }],
    ] as const;
    for (const [kind, spot] of cases) {
      const sim = new MatchSim({ seed: 9 });
      live(sim);
      stopAt(sim, 'away', spot, kind, kind === 'freeKick' || kind === 'indirectFreeKick' ? 'foul' : 'out');
      toLive(sim);
      const s = sim.state;
      const taker = s.ball.owner!;
      expect(s.setPiece).toMatchObject({ kind, taker });
      const at = { x: s.ball.pos.x, y: s.ball.pos.y };
      let drift = 0;
      for (let t = 0; t < RT.aiTakeSeconds - 0.1; t += T.stepSeconds) {
        sim.step(T.stepSeconds);
        drift = Math.max(drift, Math.hypot(s.ball.pos.x - at.x, s.ball.pos.y - at.y));
      }
      expect(s.ball.owner, kind).toBe(taker);
      expect(drift, kind).toBeLessThan(1e-6);
      const seq = s.events.at(-1)!.seq;
      run(sim, 0.5, (x) => x.state.ball.owner !== taker);
      expect(s.events.some((e) => e.seq > seq && e.type === 'pass' && e.by === taker && e.detail.endsWith(kind)), kind).toBe(true);
    }
  });

  it('while a throw-in waits, opponents stay the restart distance from the ball', () => {
    const sim = new MatchSim({ seed: 4 });
    live(sim);
    stopAt(sim, 'home', { x: 40, y: P.width }, 'throwIn');
    toLive(sim);
    const s = sim.state;
    const taker = s.ball.owner!;
    expect(taker.startsWith('H')).toBe(true);
    let closest = Infinity;
    for (let t = 0; t < RT.userTakeSeconds - 0.5; t += T.stepSeconds) {
      sim.step(T.stepSeconds);
      for (const id of TEAM_PLAYER_IDS.away) {
        if (s.players[id].isKeeper) continue;
        closest = Math.min(closest, Math.hypot(s.players[id].pos.x - s.ball.pos.x, s.players[id].pos.y - s.ball.pos.y));
      }
    }
    expect(s.ball.owner).toBe(taker);
    expect(closest).toBeGreaterThanOrEqual(RT.restartDistance - 1e-6);
  });

  it('a throw-in straight into the thrower’s own goal is a corner to the opponents, not a goal kick', () => {
    const sim = new MatchSim({ seed: 2 });
    live(sim);
    stopAt(sim, 'home', { x: 3, y: 0 }, 'throwIn');
    toLive(sim);
    const taker = sim.state.ball.owner!;
    expect(taker.startsWith('H')).toBe(true);
    sim.arrange((s) => {
      s.players.H1.pos.x = 12;
      s.players.H1.pos.y = 45;
      s.players[taker].pos.x = 2.1;
      s.players[taker].pos.y = 25;
      s.ball.pos.x = 1.5;
      s.ball.pos.y = 25;
    });
    (sim as unknown as { kickBall: (...a: unknown[]) => void }).kickBall(sim.state.players[taker], { x: -15, y: 0 }, 'pass', null, null);
    run(sim, 1, stopped);
    expect(sim.state.score).toEqual({ home: 0, away: 0 });
    expect(sim.state.stoppage).toMatchObject({ reason: 'out', restart: 'corner', restartTeam: 'away' });
  });

  it('a custom pitch from the match tuning drives the calls', () => {
    const sim = new MatchSim({ seed: 1, tuning: { ...T, pitch: { ...T.pitch, length: 60 } } });
    expect(sim.referee.isOut({ x: 60.5, y: 25 })).toBe(true);
    expect(sim.referee.isOut({ x: 59.9, y: 25 })).toBe(false);
    expect(sim.referee.inPenaltyArea({ x: 55, y: 25 }, 'away')).toBe(true);
  });
});
