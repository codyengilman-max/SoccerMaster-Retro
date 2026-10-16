import { describe, expect, it } from 'vitest';
import { match } from '../src/game';

const { MatchSim, MATCH_TUNING: T, TEAM_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim>;
type Id = match.MatchPlayerId;
const F = 1 / 60;

function run(sim: Sim, seconds: number, until?: (s: Sim) => boolean, frame = F): void {
  for (let i = 0; i < Math.round(seconds / frame); i++) {
    if (until?.(sim)) return;
    sim.step(frame);
  }
}
const lastSeq = (sim: Sim): number => sim.state.events.at(-1)?.seq ?? 0;
const since = (sim: Sim, after: number) => sim.state.events.filter((e) => e.seq > after);
const speed = (sim: Sim, id: Id) => Math.hypot(sim.state.players[id].vel.x, sim.state.players[id].vel.y);

function padSim(attributes?: match.MatchSimOptions['attributes']): Sim & { id: () => number } {
  const sim = new MatchSim({ seed: 7, controls: 'pad', ...(attributes ? { attributes } : {}) }) as Sim & { id: () => number };
  let n = 0;
  sim.id = () => ++n;
  run(sim, T.kickoff.countdownSeconds + 2 * F);
  return sim;
}

function give(sim: Sim, id: Id, pos: { x: number; y: number }, control: Id | null = null): void {
  sim.arrange((s) => {
    const p = s.players[id];
    p.pos = { ...pos };
    p.vel = { x: 0, y: 0 };
    s.ball.owner = id;
    s.ball.pos = { x: pos.x + (p.team === 'home' ? 0.6 : -0.6), y: pos.y };
    s.ball.vel = { x: 0, y: 0 };
    s.ball.kick = null;
    s.possession = p.team;
    s.ownedSince = s.simTime;
    s.nextDecisionAt = s.simTime + 5;
    s.protectUntil = s.simTime + 5;
    const c = control ?? (p.team === 'home' ? id : 'H7');
    s.controlledId = c;
    s.controlSince = s.simTime;
    s.controlEpoch += 1;
  });
}

function place(sim: Sim, id: Id, pos: { x: number; y: number }): void {
  sim.arrange((s) => {
    s.players[id].pos = { ...pos };
    s.players[id].vel = { x: 0, y: 0 };
  });
}

const press = (sim: Sim & { id: () => number }, action: match.PadAction) => sim.command({ type: 'padPress', id: sim.id(), action });
const release = (sim: Sim & { id: () => number }, action: match.PadAction) => sim.command({ type: 'padRelease', id: sim.id(), action });
const stick = (sim: Sim, x: number, y: number) => sim.command({ type: 'padMove', x, y });

describe('pad movement', () => {
  it('A01: diagonal movement is never faster than straight movement', () => {
    const top = (x: number, y: number) => {
      const sim = padSim();
      give(sim, 'H4', { x: 10, y: 10 }, 'H7');
      place(sim, 'H7', { x: 30, y: 25 });
      stick(sim, x, y);
      let max = 0;
      run(sim, 1.5, (s) => ((max = Math.max(max, speed(s, 'H7'))), false));
      return max;
    };
    const straight = top(1, 0);
    expect(top(Math.SQRT1_2, Math.SQRT1_2)).toBeLessThanOrEqual(straight + 1e-9);
    expect(top(5, 5)).toBeLessThanOrEqual(straight + 1e-9);
    expect(straight).toBeCloseTo(T.movement.chaseSpeed, 1);
  });

  it('A02: pace sets top speed; acceleration sets how fast it is reached', () => {
    const measure = (attrs: Partial<match.PlayerAttrs>) => {
      const sim = padSim({ H7: attrs });
      give(sim, 'H4', { x: 10, y: 10 }, 'H7');
      place(sim, 'H7', { x: 25, y: 25 });
      stick(sim, 1, 0);
      run(sim, 0.1);
      const early = speed(sim, 'H7');
      run(sim, 1.4);
      return { early, top: speed(sim, 'H7') };
    };
    const fast = measure({ pace: 1.2 });
    const slow = measure({ pace: 0.8 });
    expect(fast.top / slow.top).toBeCloseTo(1.5, 1);
    const quick = measure({ accel: 1.2 });
    const sluggish = measure({ accel: 0.8 });
    expect(quick.early).toBeGreaterThan(sluggish.early * 1.3);
    expect(quick.top).toBeCloseTo(sluggish.top, 3);
  });

  it('half deflection asks for slower movement; release decelerates naturally', () => {
    const sim = padSim();
    give(sim, 'H4', { x: 10, y: 10 }, 'H7');
    place(sim, 'H7', { x: 25, y: 25 });
    stick(sim, 0.5, 0);
    run(sim, 1.5);
    expect(speed(sim, 'H7')).toBeCloseTo(T.movement.chaseSpeed * 0.5, 1);
    stick(sim, 0, 0);
    run(sim, F * 2);
    expect(speed(sim, 'H7')).toBeGreaterThan(0.5);
    run(sim, 1);
    expect(speed(sim, 'H7')).toBeLessThan(0.05);
  });
});

describe('pad pass and shoot', () => {
  it('A03: the carrier keeps moving while charging and releasing one pass', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 25, y: 25 });
    place(sim, 'H8', { x: 35, y: 25 });
    stick(sim, 1, 0);
    run(sim, 0.5);
    const seq = lastSeq(sim);
    expect(press(sim, 'pass')).toBe(true);
    const x0 = sim.state.players.H7.pos.x;
    run(sim, 0.3);
    expect(sim.state.players.H7.pos.x).toBeGreaterThan(x0 + 1);
    expect(release(sim, 'pass')).toBe(true);
    run(sim, 0.5);
    const passes = since(sim, seq).filter((e) => e.type === 'pass');
    expect(passes).toHaveLength(1);
    expect(speed(sim, 'H7')).toBeGreaterThan(2);
    expect(release(sim, 'pass')).toBe(false);
  });

  it('A04: the carrier keeps moving while charging and releasing one shot', () => {
    const sim = padSim();
    give(sim, 'H9', { x: 40, y: 25 });
    stick(sim, 1, 0);
    run(sim, 0.3);
    const seq = lastSeq(sim);
    press(sim, 'shoot');
    run(sim, 0.4);
    expect(speed(sim, 'H9')).toBeGreaterThan(2);
    release(sim, 'shoot');
    run(sim, 0.5);
    expect(since(sim, seq).filter((e) => e.type === 'shot')).toHaveLength(1);
  });

  it('A07: losing possession while charging cancels the kick, even after regaining it', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 25, y: 25 });
    press(sim, 'pass');
    run(sim, 0.1);
    const seq = lastSeq(sim);
    give(sim, 'A6', { x: 26, y: 25 });
    sim.arrange((s) => (s.simTime += 0));
    run(sim, F);
    give(sim, 'H7', { x: 25, y: 25 });
    expect(release(sim, 'pass')).toBe(false);
    run(sim, 0.4);
    const ev = since(sim, seq);
    expect(ev.some((e) => e.type === 'pass')).toBe(false);
    expect(ev.some((e) => e.type === 'padCancel')).toBe(true);
  });

  it('A07: losing possession during kick preparation cancels the kick', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 25, y: 25 });
    press(sim, 'shoot');
    run(sim, 0.2);
    release(sim, 'shoot');
    const seq = lastSeq(sim);
    give(sim, 'A6', { x: 26, y: 25 });
    run(sim, 0.3);
    expect(since(sim, seq).some((e) => e.type === 'shot')).toBe(false);
  });

  it('A10: small stick noise does not flicker the highlighted receiver', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 25, y: 25 });
    place(sim, 'H8', { x: 37, y: 27 });
    place(sim, 'H9', { x: 37, y: 23 });
    stick(sim, 1, 0.01);
    press(sim, 'pass');
    const seen = new Set<string | null>();
    for (let i = 0; i < 60; i++) {
      const a = 0.04 * Math.sin(i);
      stick(sim, Math.cos(a) * 0.2, Math.sin(a) * 0.2);
      run(sim, F);
      // Hold teammates still so only stick noise varies.
      place(sim, 'H8', { x: 37, y: 27 });
      place(sim, 'H9', { x: 37, y: 23 });
      seen.add(sim.state.pad.receiver);
    }
    expect(seen.size).toBe(1);
  });

  it('A11: with no receiver in the aim, the pass follows the stick direction', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 30, y: 25 });
    for (const id of TEAM_PLAYER_IDS.home) if (id !== 'H7' && id !== 'H1') place(sim, id, { x: 5, y: 5 });
    for (const id of TEAM_PLAYER_IDS.away) place(sim, id, { x: 55, y: 45 });
    stick(sim, 0, 1);
    press(sim, 'pass');
    run(sim, 0.3);
    release(sim, 'pass');
    run(sim, T.pad.prepSeconds + 2 * F);
    const v = sim.state.ball.vel;
    expect(sim.state.ball.owner).toBeNull();
    expect(v.y / Math.hypot(v.x, v.y)).toBeGreaterThan(0.98);
  });

  it('A12: a neutral-stick shot goes toward the goal this team attacks', () => {
    const sim = padSim();
    expect(sim.attackingGoal('home').x).toBe(T.pitch.length);
    expect(sim.attackingGoal('away').x).toBe(0);
    give(sim, 'H9', { x: 40, y: 15 });
    for (const id of TEAM_PLAYER_IDS.away) if (id !== 'A1') place(sim, id, { x: 10, y: 45 });
    press(sim, 'shoot');
    run(sim, 0.2);
    release(sim, 'shoot');
    run(sim, T.pad.prepSeconds + 2 * F);
    const b = sim.state.ball;
    const goal = sim.attackingGoal('home');
    const want = Math.atan2(goal.y - b.pos.y, goal.x - b.pos.x);
    expect(Math.abs(Math.atan2(b.vel.y, b.vel.x) - want)).toBeLessThan(0.2);
  });
});

describe('pad slide and block', () => {
  it('A13: slide spam cannot restart, extend or stack a slide, and is no faster than running', () => {
    const sim = padSim();
    give(sim, 'A6', { x: 50, y: 45 });
    place(sim, 'H7', { x: 20, y: 25 });
    sim.arrange((s) => ((s.controlledId = 'H7'), (s.controlSince = s.simTime)));
    stick(sim, 1, 0);
    run(sim, 1);
    const seq = lastSeq(sim);
    const x0 = sim.state.players.H7.pos.x;
    for (let i = 0; i < 120; i++) {
      press(sim, 'slide');
      run(sim, F);
    }
    const starts = since(sim, seq).filter((e) => e.type === 'slide' && e.detail === 'start').length;
    const cycle = T.pad.slide.startSeconds + T.pad.slide.activeSeconds + T.pad.slide.recoverySeconds + T.pad.slide.cooldownSeconds;
    expect(starts).toBeLessThanOrEqual(Math.ceil(2 / cycle));
    expect(sim.state.players.H7.pos.x - x0).toBeLessThan(T.movement.chaseSpeed * 2);
  });

  it('A14: a missed slide touches nothing and fouls nobody', () => {
    const sim = padSim();
    give(sim, 'A6', { x: 50, y: 45 });
    place(sim, 'H7', { x: 20, y: 10 });
    sim.arrange((s) => ((s.controlledId = 'H7'), (s.controlSince = s.simTime)));
    const seq = lastSeq(sim);
    stick(sim, 1, 0);
    press(sim, 'slide');
    run(sim, 1.5);
    const ev = since(sim, seq);
    expect(ev.some((e) => e.type === 'foul')).toBe(false);
    expect(ev.some((e) => e.type === 'slide' && /ball/.test(e.detail))).toBe(false);
    expect(sim.state.ball.owner).toBe('A6');
  });

  /** Slider `gap` yards from the carrier's ball side (front) or body side (behind), sliding straight at it. */
  function slideAtCarrier(side: 'front' | 'behind', gap: number) {
    const sim = padSim();
    give(sim, 'A6', { x: 30, y: 25 });
    run(sim, F);
    const s = sim.state;
    const a6 = s.players.A6.pos;
    const toBall = { x: s.ball.pos.x - a6.x, y: s.ball.pos.y - a6.y };
    const l = Math.hypot(toBall.x, toBall.y);
    const u = { x: toBall.x / l, y: toBall.y / l };
    const k = side === 'front' ? 1 : -1;
    const from = side === 'front' ? s.ball.pos : a6;
    place(sim, 'H7', { x: from.x + k * u.x * gap, y: from.y + k * u.y * gap });
    sim.arrange((st) => ((st.controlledId = 'H7'), (st.controlSince = st.simTime)));
    const seq = lastSeq(sim);
    stick(sim, -k * u.x, -k * u.y);
    expect(press(sim, 'slide')).toBe(true);
    run(sim, 0.6);
    return { sim, ev: since(sim, seq) };
  }

  it('A14: ball-first contact pokes the ball loose without awarding it', () => {
    const { sim, ev } = slideAtCarrier('front', 1.8);
    expect(ev.some((e) => e.type === 'slide' && /poked/.test(e.detail))).toBe(true);
    expect(ev.some((e) => e.type === 'foul')).toBe(false);
    const poke = ev.find((e) => e.type === 'slide' && /poked/.test(e.detail))!;
    expect(ev.some((e) => e.seq > poke.seq && e.type === 'possession' && e.by === 'H7' && e.at - poke.at < T.pad.slide.sliderIgnoreSeconds)).toBe(false);
    expect(sim.state.stoppage).toBeNull();
  });

  it('A14: body-first contact is a foul with a free-kick restart for the opponent', () => {
    const { sim, ev } = slideAtCarrier('behind', 0.9);
    expect(ev.some((e) => e.type === 'foul' && e.by === 'H7')).toBe(true);
    expect(ev.some((e) => e.type === 'slide' && /poked/.test(e.detail))).toBe(false);
    run(sim, T.stoppage.outSeconds + 0.5);
    const after = since(sim, ev.at(-1)!.seq);
    expect(after.some((e) => e.type === 'restart' || e.type === 'live')).toBe(true);
  });

  it('A15: block slows movement and releases cleanly', () => {
    const sim = padSim();
    give(sim, 'A6', { x: 40, y: 25 });
    for (const id of TEAM_PLAYER_IDS.home) if (id !== 'H1') place(sim, id, { x: 3, y: 3 + Number(id.slice(1)) * 4 });
    place(sim, 'H7', { x: 20, y: 25 });
    sim.arrange((s) => ((s.controlledId = 'H7'), (s.controlSince = s.simTime)));
    stick(sim, 1, 0);
    expect(press(sim, 'block')).toBe(true);
    run(sim, 1.5);
    expect(speed(sim, 'H7')).toBeCloseTo(T.movement.chaseSpeed * T.pad.blockSpeedFactor, 1);
    expect(release(sim, 'block')).toBe(true);
    expect(sim.state.pad.phase).toBe('ready');
    run(sim, 0.6);
    expect(sim.state.controlledId).toBe('H7');
    expect(speed(sim, 'H7')).toBeCloseTo(T.movement.chaseSpeed, 1);
  });

  function shotAt(blockerAt: { x: number; y: number }, from: { x: number; y: number }, v: number) {
    const sim = padSim();
    give(sim, 'A6', { x: 55, y: 45 });
    for (const id of [...TEAM_PLAYER_IDS.home, ...TEAM_PLAYER_IDS.away]) if (id !== 'A6') place(sim, id, { x: 70, y: id.startsWith('H') ? 3 : 47 });
    place(sim, 'H7', blockerAt);
    sim.arrange((s) => {
      s.controlledId = 'H7';
      s.controlSince = s.simTime;
      s.ball.owner = null;
      s.ball.pos = { ...from };
      s.ball.vel = { x: 0, y: 0 };
      s.pad.facing = { x: 1, y: 0 };
    });
    press(sim, 'block');
    const seq = lastSeq(sim);
    sim.arrange((s) => {
      s.ball.vel = { x: -v, y: 0 };
      s.ball.kick = { by: 'A6', team: 'away', kind: 'shot', at: s.simTime, target: null, receiver: null };
    });
    return { sim, seq };
  }

  it('A16: blocking a powerful shot deflects it and does not hand the blocker possession', () => {
    const { sim, seq } = shotAt({ x: 30, y: 25 }, { x: 36, y: 25 }, 22);
    let owned = false;
    run(sim, 0.5, (s) => ((owned ||= s.state.ball.owner === 'H7'), false));
    expect(since(sim, seq).some((e) => e.type === 'deflect')).toBe(true);
    expect(owned).toBe(false);
  });

  it('A17: a fast shot blocked in front of goal resolves the block before any goal', () => {
    const { sim, seq } = shotAt({ x: 1.6, y: T.pitch.goalCenterY }, { x: 9, y: T.pitch.goalCenterY }, 26);
    run(sim, 0.4);
    const ev = since(sim, seq);
    expect(ev.some((e) => e.type === 'deflect')).toBe(true);
    expect(ev.some((e) => e.type === 'goal')).toBe(false);
  });

  it('pass and shoot are unavailable off the ball; slide and block are unavailable with it', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 25, y: 25 });
    expect(sim.padAvailability()).toEqual({ pass: true, shoot: true, slide: false, block: false });
    expect(press(sim, 'slide')).toBe(false);
    give(sim, 'H8', { x: 25, y: 25 }, 'H7');
    expect(sim.padAvailability()).toEqual({ pass: false, shoot: false, slide: false, block: false });
    give(sim, 'A6', { x: 25, y: 25 });
    expect(sim.padAvailability()).toEqual({ pass: false, shoot: false, slide: true, block: true });
    expect(press(sim, 'pass')).toBe(false);
  });

  it('stale and duplicate command ids are rejected', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 25, y: 25 });
    expect(sim.command({ type: 'padPress', id: 5, action: 'pass' })).toBe(true);
    expect(sim.command({ type: 'padRelease', id: 5, action: 'pass' })).toBe(false);
    expect(sim.command({ type: 'padRelease', id: 3, action: 'pass' })).toBe(false);
    expect(sim.command({ type: 'padMove', x: NaN, y: 0 })).toBe(false);
  });
});

describe('pad timing', () => {
  it('A18: render rate does not change movement or charge power', () => {
    const at = (frame: number) => {
      const sim = padSim();
      give(sim, 'H7', { x: 25, y: 25 });
      stick(sim, 1, 0);
      press(sim, 'pass');
      run(sim, 0.5, undefined, frame);
      release(sim, 'pass');
      return { x: sim.state.players.H7.pos.x, power: sim.state.pad.locked?.power };
    };
    const a = at(1 / 30);
    const b = at(1 / 120);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.power).toBeCloseTo(a.power!, 6);
  });

  it('A19: pausing while charging cancels with no phantom kick after resume', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 25, y: 25 });
    press(sim, 'shoot');
    run(sim, 0.2);
    const seq = lastSeq(sim);
    sim.command({ type: 'pause' });
    expect(sim.state.pad.phase).toBe('ready');
    sim.command({ type: 'resume' });
    expect(release(sim, 'shoot')).toBe(false);
    run(sim, 0.5);
    expect(since(sim, seq).some((e) => e.type === 'shot')).toBe(false);
  });
});

describe('pad review fixes', () => {
  it('an interruption after release but before contact discards the kick', () => {
    const sim = padSim();
    give(sim, 'H7', { x: 25, y: 25 });
    press(sim, 'shoot');
    run(sim, 0.2);
    release(sim, 'shoot');
    expect(sim.state.pad.phase).toBe('kickPrep');
    const seq = lastSeq(sim);
    expect(sim.command({ type: 'padCancel', id: sim.id(), reason: 'resize' })).toBe(true);
    run(sim, 0.5);
    expect(since(sim, seq).some((e) => e.type === 'shot')).toBe(false);
    expect(sim.state.pad.phase).toBe('ready');
  });

  it('a ball that crosses an active slide within one tick is still touched', () => {
    const sim = padSim();
    give(sim, 'A6', { x: 70, y: 45 });
    place(sim, 'H7', { x: 30, y: 20 });
    sim.arrange((s) => ((s.controlledId = 'H7'), (s.controlSince = s.simTime)));
    stick(sim, 0, 1);
    expect(press(sim, 'slide')).toBe(true);
    run(sim, T.pad.slide.startSeconds + 2 * F, (s) => s.state.pad.phase === 'slideActive');
    expect(sim.state.pad.phase).toBe('slideActive');
    const seq = lastSeq(sim);
    sim.arrange((s) => {
      const p = s.players.H7;
      s.ball.owner = null;
      s.ball.pos = { x: p.pos.x - 1.3, y: p.pos.y + 0.1 };
      s.ball.vel = { x: 2.6 / T.stepSeconds, y: 0 };
      s.ball.kick = { by: 'A6', team: 'away', kind: 'shot', at: s.simTime, target: null, receiver: null };
      s.possession = 'away';
    });
    sim.step(T.stepSeconds);
    expect(since(sim, seq).some((e) => e.type === 'slide' && /ball/.test(e.detail))).toBe(true);
  });

  it('a slide never moves faster than the player can run', () => {
    const fast = Object.fromEntries(TEAM_PLAYER_IDS.home.map((id) => [id, { pace: 1.2, accel: 1.2 }]));
    const sim = padSim(fast);
    give(sim, 'A6', { x: 70, y: 45 });
    place(sim, 'H7', { x: 20, y: 25 });
    sim.arrange((s) => ((s.controlledId = 'H7'), (s.controlSince = s.simTime)));
    stick(sim, 1, 0);
    run(sim, 1.5);
    const me = sim.state.controlledId;
    const seq = lastSeq(sim);
    expect(press(sim, 'slide')).toBe(true);
    let peak = 0;
    run(sim, 1.2, (s) => ((peak = Math.max(peak, speed(s, me))), false));
    expect(since(sim, seq).some((e) => e.type === 'slide' && e.by === me && e.detail === 'start')).toBe(true);
    expect(peak).toBeLessThanOrEqual(T.movement.chaseSpeed * 1.2 + 1e-6);
  });

  it('late career attributes are clamped and change the player', () => {
    const sim = padSim();
    expect(sim.setPlayerAttrs('H5', { control: 5, agility: 0.1 })).toBe(true);
    expect(sim.state.players.H5.attrs.control).toBe(T.pad.attrRange.max);
    expect(sim.state.players.H5.attrs.agility).toBe(T.pad.attrRange.min);
    expect(sim.state.players.H5.attrs.pace).toBe(1);
  });
});

describe('BLOCK-hold jockeying (FIFA-style)', () => {
  // A6 carries laterally (+y) at a fixed pace; H4 is the user's defender, goal-side (home defends x = 0).
  function jockey(hold: boolean, stickX = 0, stickY = 0, laneSpeed = 3) {
    const sim = padSim();
    for (const id of TEAM_PLAYER_IDS.home) if (id !== 'H1') place(sim, id, { x: 3, y: 3 + Number(id.slice(1)) * 4 });
    give(sim, 'A6', { x: 30, y: 18 }, 'H4');
    place(sim, 'H4', { x: 27, y: 18 });
    stick(sim, stickX, stickY);
    if (hold) expect(press(sim, 'block')).toBe(true);
    let maxSpeed = 0;
    let minGap = Infinity;
    for (let i = 0; i < 90; i++) {
      sim.arrange((s) => {
        const c = s.players.A6;
        c.pos = { x: 30, y: 18 + laneSpeed * (i * F) };
        c.vel = { x: 0, y: laneSpeed };
        s.ball.pos = { x: c.pos.x - 0.6, y: c.pos.y };
        s.ball.vel = { x: 0, y: laneSpeed };
        s.ball.owner = 'A6';
        s.protectUntil = s.simTime + 5;
        s.nextDecisionAt = s.simTime + 5;
      });
      sim.step(F);
      if (i > 20) maxSpeed = Math.max(maxSpeed, speed(sim, 'H4'));
      minGap = Math.min(minGap, Math.hypot(sim.state.players.H4.pos.x - sim.state.players.A6.pos.x, sim.state.players.H4.pos.y - sim.state.players.A6.pos.y));
    }
    const d = sim.state.players.H4.pos;
    const c = sim.state.players.A6.pos;
    return { sim, dx: c.x - d.x, dy: Math.abs(c.y - d.y), maxSpeed, minGap };
  }

  it('tracks goal-side and mirrors a lateral run with the stick neutral', () => {
    const r = jockey(true);
    expect(r.sim.state.pad.jockeying).toBe(true);
    expect(r.dx).toBeGreaterThan(0.8); // between the carrier and the home goal
    expect(r.dy).toBeLessThan(1.2); // mirrored the 4.5-yard lateral run
    // Without the modifier the same neutral stick leaves the defender behind.
    expect(jockey(false).dy).toBeGreaterThan(3);
  });

  it("caps the defender's speed at the carrier's", () => {
    const r = jockey(true, 0, 0, 2.5);
    expect(r.maxSpeed).toBeLessThan(2.5 + 0.15);
  });

  it('pushing the stick at the carrier shades sideways but never overcommits', () => {
    const r = jockey(true, 1, 0);
    expect(r.minGap).toBeGreaterThan(T.pad.jockey.gap * 0.7);
    expect(r.dx).toBeGreaterThan(0.8);
    // Against a standing carrier, stick +y shades the defender to the +y side of the line, bounded by stickShade.
    const side = jockey(true, 0, 1, 0);
    const c = side.sim.state.players.A6.pos;
    const d = side.sim.state.players.H4.pos;
    const g = { x: 0 - c.x, y: T.pitch.goalCenterY - c.y };
    const gl = Math.hypot(g.x, g.y);
    // Signed distance off the carrier→goal line, on the +y side.
    const off = ((d.x - c.x) * -g.y + (d.y - c.y) * g.x) / gl;
    expect(Math.abs(off)).toBeGreaterThan(0.6);
    expect(Math.abs(off)).toBeLessThan(T.pad.jockey.stickShade + 0.2);
    expect(d.y).toBeGreaterThan(c.y);
  });

  it('turns off when the carrier is out of range or BLOCK is released', () => {
    const r = jockey(true);
    expect(release(r.sim, 'block')).toBe(true);
    r.sim.step(F);
    expect(r.sim.state.pad.jockeying).toBe(false);
  });
});
