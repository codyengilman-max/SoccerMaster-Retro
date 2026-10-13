import { describe, expect, it } from 'vitest';
import { match } from '../src/game';

const { MatchSim, MATCH_TUNING: T, FORMATIONS, FORMATION_IDS, roleMap, checkInvariants, HOME_IDS, AWAY_IDS, MATCH_PLAYER_IDS, TEAM_PLAYER_IDS } = match;
type Sim = InstanceType<typeof MatchSim>;
type Id = match.MatchPlayerId;
const F = 1 / 60;

function run(sim: Sim, seconds: number, until?: (s: Sim) => boolean, frame = F): void {
  for (let i = 0; i < Math.round(seconds / frame); i++) {
    if (until?.(sim)) return;
    sim.step(frame);
  }
}
const live = (sim: Sim): void => run(sim, T.kickoff.countdownSeconds + 2 * F);
const newEvents = (sim: Sim, after: number) => sim.state.events.filter((e) => e.seq > after);
const lastSeq = (sim: Sim): number => sim.state.events.at(-1)?.seq ?? 0;

/** Staged scenario: give `id` the ball at `pos` with play live and everyone else where they are. */
function giveBall(sim: Sim, id: Id, pos: { x: number; y: number }): void {
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
    s.nextDecisionAt = s.simTime + T.ai.reactionSeconds;
    s.protectUntil = s.simTime + T.tackle.protectSeconds;
    if (p.team === 'home' && !p.isKeeper) {
      s.controlledId = id;
      s.laneY = pos.y;
      s.controlEpoch += 1;
    }
  });
}

function aimAt(sim: Sim, target: { x: number; y: number }, power: number): boolean {
  const b = sim.state.ball.pos;
  if (!sim.command({ type: 'aimStart' })) return false;
  sim.command({ type: 'aimUpdate', direction: { x: target.x - b.x, y: target.y - b.y }, power });
  return sim.command({ type: 'aimRelease' });
}
const passPower = (sim: Sim, target: { x: number; y: number }): number =>
  (Math.hypot(target.x - sim.state.ball.pos.x, target.y - sim.state.ball.pos.y) - T.pass.minDistance) / (T.pass.maxDistance - T.pass.minDistance);

describe('9v9 sandbox roster', () => {
  it('has exactly 18 unique players, nine per team, one keeper each', () => {
    const sim = new MatchSim();
    const ids = Object.keys(sim.state.players);
    expect(ids).toHaveLength(18);
    expect(new Set(ids).size).toBe(18);
    for (const team of ['home', 'away'] as const) {
      const ps = TEAM_PLAYER_IDS[team].map((id) => sim.player(id));
      expect(ps).toHaveLength(9);
      expect(ps.filter((p) => p.isKeeper).map((p) => p.id)).toEqual([team === 'home' ? 'H1' : 'A1']);
      expect(ps.every((p) => p.team === team)).toBe(true);
    }
    expect(checkInvariants(sim.state)).toEqual([]);
  });
});

describe('formations', () => {
  it('ships exactly the three U11 formations', () => {
    expect([...FORMATION_IDS].sort()).toEqual(['1-2-4-2', '1-3-2-3', '1-3-3-2']);
  });

  for (const id of FORMATION_IDS) {
    it(`${id}: nine valid roles with positions inside their limits and the pitch`, () => {
      const f = FORMATIONS[id];
      const roles = f.roles.map((r) => r.id);
      expect(roles).toHaveLength(9);
      expect(new Set(roles).size).toBe(9);
      expect(f.roles[0]?.id).toBe('GK');
      const lines = f.roles.map((r) => r.line);
      expect(lines.filter((l) => l === 'keeper')).toHaveLength(1);
      // The name is the outfield line counts, e.g. 1-3-2-3 = keeper, 3 defenders, 2 midfielders, 3 forwards.
      const [, d, m, a] = id.split('-').map(Number);
      expect(lines.filter((l) => l === 'defence')).toHaveLength(d!);
      expect(lines.filter((l) => l === 'midfield')).toHaveLength(m!);
      expect(lines.filter((l) => l === 'attack')).toHaveLength(a!);
      for (const r of f.roles) {
        expect(r.base.x).toBeGreaterThanOrEqual(r.bounds.minX);
        expect(r.base.x).toBeLessThanOrEqual(r.bounds.maxX);
        expect(r.base.y).toBeGreaterThanOrEqual(r.bounds.minY);
        expect(r.base.y).toBeLessThanOrEqual(r.bounds.maxY);
        expect(r.bounds.maxX).toBeLessThanOrEqual(T.pitch.length);
        expect(r.bounds.minY).toBeGreaterThanOrEqual(0);
        expect(r.bounds.maxY).toBeLessThanOrEqual(T.pitch.width);
        expect(r.adjacent.length).toBeGreaterThan(0);
        for (const a2 of r.adjacent) {
          if (a2 === 'CB' || a2 === 'LCB' || a2 === 'RCB') continue; // keeper lists every centre-back name
          expect(roles, `${r.id} adjacent ${a2}`).toContain(a2);
        }
      }
    });
  }

  it('role remapping between any two formations is an explicit one-to-one mapping', () => {
    for (const from of FORMATION_IDS) {
      for (const to of FORMATION_IDS) {
        const map = roleMap(from, to);
        expect(map.size).toBe(9);
        expect(new Set(map.values()).size).toBe(9);
        expect(map.get('GK')).toBe('GK');
      }
    }
    expect(roleMap('1-3-2-3', '1-2-4-2').get('RB')).toBe('RM');
    expect(roleMap('1-3-2-3', '1-3-3-2').get('RW')).toBe('RS');
  });
});

describe('formation changes', () => {
  it('only while paused, preserving identities, ball, possession and positions', () => {
    const sim = new MatchSim({ seed: 3 });
    live(sim);
    run(sim, 2);
    expect(sim.command({ type: 'setFormation', team: 'home', formation: '1-2-4-2' })).toBe(false);
    sim.command({ type: 'pause' });
    const before = structuredClone(sim.state);
    expect(sim.command({ type: 'setFormation', team: 'home', formation: '1-2-4-2' })).toBe(true);
    const after = sim.state;
    expect(after.ball).toEqual(before.ball);
    expect(after.possession).toBe(before.possession);
    expect(after.controlledId).toBe(before.controlledId);
    expect(after.score).toEqual(before.score);
    for (const id of MATCH_PLAYER_IDS) {
      expect(after.players[id].pos).toEqual(before.players[id].pos);
      expect(after.players[id].vel).toEqual(before.players[id].vel);
      expect(after.players[id].slot).toBe(before.players[id].slot);
    }
    const map = roleMap('1-3-2-3', '1-2-4-2');
    for (const id of HOME_IDS) expect(after.players[id].role).toBe(map.get(before.players[id].role));
    for (const id of AWAY_IDS) expect(after.players[id].role).toBe(before.players[id].role);
    expect(checkInvariants(after)).toEqual([]);
  });

  it('players then move toward their new jobs without teleporting', () => {
    const sim = new MatchSim({ seed: 4 });
    live(sim);
    run(sim, 1.5);
    sim.command({ type: 'pause' });
    sim.command({ type: 'setFormation', team: 'home', formation: '1-2-4-2' });
    sim.command({ type: 'resume' });
    const maxStep = 8 * F; // no player moves faster than 8 yd/s
    let prev = HOME_IDS.map((id) => ({ ...sim.player(id).pos }));
    // RB (slot 3) becomes RM: watch it push up from the back line.
    const startX = sim.player('H4').pos.x;
    let maxJump = 0;
    for (let i = 0; i < 180 && sim.state.phase !== 'stopped'; i++) {
      sim.step(F);
      const now = HOME_IDS.map((id) => ({ ...sim.player(id).pos }));
      now.forEach((p, k) => (maxJump = Math.max(maxJump, Math.hypot(p.x - prev[k]!.x, p.y - prev[k]!.y))));
      prev = now;
    }
    expect(maxJump).toBeLessThanOrEqual(maxStep);
    expect(sim.player('H4').role).toBe('RM');
    expect(sim.player('H4').pos.x).toBeGreaterThan(startX + 2);
  });
});

describe('passing, receiving and control', () => {
  it('a completed pass keeps play live and moves user control to the receiver', () => {
    const sim = new MatchSim({ seed: 2 });
    live(sim);
    giveBall(sim, 'H5', { x: 30, y: 20 });
    sim.arrange((s) => {
      for (const id of AWAY_IDS) if (id !== 'A1') s.players[id].pos = { x: 60, y: s.players[id].pos.y };
      s.players.H6.pos = { x: 34, y: 34 };
    });
    const target = { x: 34.5, y: 34 };
    expect(aimAt(sim, target, passPower(sim, target))).toBe(true);
    run(sim, 3, (s) => s.state.ball.owner !== null);
    expect(sim.state.ball.owner).toBe('H6');
    expect(sim.state.controlledId).toBe('H6');
    expect(sim.state.phase).toBe('live');
    expect(sim.state.stoppage).toBeNull();
  });

  it('losing the ball cancels a held aim, and a stale release never kicks for anyone', () => {
    const sim = new MatchSim({ seed: 5 });
    live(sim);
    giveBall(sim, 'H5', { x: 30, y: 25 });
    sim.arrange((s) => {
      s.protectUntil = 0;
      s.players.A5.pos = { x: 31.2, y: 25 };
    });
    expect(sim.command({ type: 'aimStart' })).toBe(true);
    sim.command({ type: 'aimUpdate', direction: { x: 1, y: 0 }, power: 0.8 });
    const seq = lastSeq(sim);
    run(sim, 3, (s) => s.state.possession === 'away');
    expect(sim.state.possession).toBe('away');
    expect(sim.state.phase).not.toBe('aiming');
    expect(newEvents(sim, seq).some((e) => e.type === 'aimCancel' && e.detail === 'possession lost')).toBe(true);
    expect(sim.command({ type: 'aimRelease' })).toBe(false);
    expect(newEvents(sim, seq).some((e) => (e.type === 'pass' || e.type === 'shot') && e.by?.startsWith('H'))).toBe(false);
  });

  it('an aim started for one carrier is void if control moves before release', () => {
    const sim = new MatchSim({ seed: 6 });
    live(sim);
    giveBall(sim, 'H5', { x: 30, y: 25 });
    sim.command({ type: 'aimStart' });
    sim.command({ type: 'aimUpdate', direction: { x: 1, y: 0 }, power: 1 });
    giveBall(sim, 'H6', { x: 32, y: 35 });
    sim.arrange((s) => (s.phase = 'aiming'));
    expect(sim.command({ type: 'aimRelease' })).toBe(false);
    expect(sim.state.ball.owner).toBe('H6');
  });

  it('defenders react only to visible play, never to the unreleased aim', () => {
    const a = new MatchSim({ seed: 7 });
    const b = new MatchSim({ seed: 7 });
    for (const sim of [a, b]) {
      live(sim);
      giveBall(sim, 'H5', { x: 30, y: 25 });
    }
    a.command({ type: 'aimStart' });
    b.command({ type: 'aimStart' });
    a.command({ type: 'aimUpdate', direction: { x: 0, y: 1 }, power: 1 });
    b.command({ type: 'aimUpdate', direction: { x: 0, y: -1 }, power: 0.2 });
    run(a, 0.5);
    run(b, 0.5);
    for (const id of AWAY_IDS) {
      expect(a.player(id).pos).toEqual(b.player(id).pos);
      expect(a.player(id).intent).toBe(b.player(id).intent);
    }
  });
});

describe('team behaviour', () => {
  it('one presser and a separate cover; the rest hold shape (no swarm), with stable assignments', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const sim = new MatchSim({ seed });
      live(sim);
      let switches = 0;
      let last: string | null = null;
      let lastSpell = '';
      for (let i = 0; i < 60 * 30; i++) {
        sim.step(F);
        const s = sim.state;
        for (const team of ['home', 'away'] as const) {
          const intents = TEAM_PLAYER_IDS[team].map((id) => s.players[id].intent);
          expect(intents.filter((x) => x === 'press').length).toBeLessThanOrEqual(1);
          expect(intents.filter((x) => x === 'press' || x === 'chase' || x === 'cover').length).toBeLessThanOrEqual(3);
          const d = s.defense[team];
          if (d.presserId && d.coverId) expect(d.presserId).not.toBe(d.coverId);
        }
        // Count presser changes within one spell of possession (a turnover legitimately changes it).
        const defending = s.possession === 'home' ? 'away' : 'home';
        const p = s.ball.owner ? s.defense[defending].presserId : null;
        const spell = `${s.possession}:${s.stats.turnovers}`;
        if (spell !== lastSpell) {
          last = null;
          lastSpell = spell;
        }
        if (p && last && p !== last) switches++;
        if (p) last = p;
      }
      // Commitment windows: no flicker between pressers (fewer than one switch per second of play).
      expect(switches).toBeLessThan(30);
    }
  });

  it('in possession the team keeps width, depth and players behind the ball', () => {
    const sim = new MatchSim({ seed: 2 });
    live(sim);
    giveBall(sim, 'H5', { x: 40, y: 22 });
    // Staged: opponents start deep so the carrier keeps the ball while the shape forms.
    sim.arrange((s) => {
      for (const id of AWAY_IDS) if (id !== 'A1') s.players[id].pos = { x: 60, y: s.players[id].pos.y };
    });
    run(sim, 1.2);
    const s = sim.state;
    const mates = HOME_IDS.filter((id) => id !== 'H1' && id !== s.ball.owner).map((id) => s.players[id]);
    const bx = s.ball.pos.x;
    expect(mates.some((p) => p.target.x > bx + 3)).toBe(true); // ahead
    expect(mates.filter((p) => p.target.x < bx - 3).length).toBeGreaterThanOrEqual(2); // rest defence
    expect(mates.some((p) => p.target.y < 8) && mates.some((p) => p.target.y > 42)).toBe(true); // both flanks
    // Support targets do not stack on each other.
    for (let i = 0; i < mates.length; i++)
      for (let j = i + 1; j < mates.length; j++) {
        const a = mates[i]!.target;
        const b = mates[j]!.target;
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${mates[i]!.id}/${mates[j]!.id}`).toBeGreaterThan(2);
      }
  });

  it('after a pass the passer moves on (give-and-go) instead of stopping', () => {
    const sim = new MatchSim({ seed: 2 });
    live(sim);
    giveBall(sim, 'H5', { x: 30, y: 20 });
    const target = { x: 36, y: 30 };
    aimAt(sim, target, passPower(sim, target));
    run(sim, 0.1);
    expect(sim.player('H5').intent).toBe('giveAndGo');
    const from = { ...sim.player('H5').pos };
    run(sim, 1);
    expect(Math.hypot(sim.player('H5').pos.x - from.x, sim.player('H5').pos.y - from.y)).toBeGreaterThan(3);
  });
});

describe('opponent possession and keepers', () => {
  it('opponent possession produces passes and shots over normal sandbox play', () => {
    let passes = 0;
    let shots = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const sim = new MatchSim({ seed });
      run(sim, 90);
      passes += sim.state.stats.passes.away;
      shots += sim.state.stats.shots.away;
    }
    expect(passes).toBeGreaterThan(20);
    expect(shots).toBeGreaterThan(0);
  });

  it('staged: an unmarked opponent near goal shoots', () => {
    const sim = new MatchSim({ seed: 3 });
    live(sim);
    giveBall(sim, 'A8', { x: 16, y: 25 });
    sim.arrange((s) => {
      for (const id of HOME_IDS) if (id !== 'H1') s.players[id].pos = { x: 40, y: s.players[id].pos.y };
    });
    const seq = lastSeq(sim);
    run(sim, 2, (s) => newEvents(s, seq).some((e) => e.type === 'shot'));
    expect(newEvents(sim, seq).find((e) => e.type === 'shot')?.by).toBe('A8');
  });

  for (const [team, keeper, shooter, from, goalX] of [
    ['home', 'H1', 'A8', { x: 16, y: 25 }, 0],
    ['away', 'A1', 'H8', { x: 59, y: 25 }, 75],
  ] as const) {
    it(`${team} keeper catches a soft shot and then distributes it`, () => {
      const sim = new MatchSim({ seed: 1 });
      live(sim);
      giveBall(sim, shooter, from);
      sim.arrange((s) => {
        s.players[keeper].pos = { x: goalX === 0 ? 1.5 : 73.5, y: 25 };
        s.ball.owner = null;
        s.ball.pos = { x: from.x + (goalX === 0 ? -1 : 1), y: 25 };
        s.ball.vel = { x: goalX === 0 ? -14 : 14, y: 0 };
        s.ball.kick = { by: shooter, team: s.players[shooter].team, kind: 'shot', at: s.simTime, target: null, receiver: null };
        s.ball.ignore = [{ id: shooter, until: s.simTime + 1 }];
        // Clear the shot's path so only the keeper can play it.
        for (const id of TEAM_PLAYER_IDS[team]) if (id !== keeper) s.players[id].pos = { x: 37.5, y: s.players[id].pos.y };
        s.players[shooter].pos = { x: from.x, y: 45 };
      });
      const seq = lastSeq(sim);
      run(sim, 2, (s) => s.state.ball.owner === keeper);
      expect(sim.state.ball.owner).toBe(keeper);
      expect(newEvents(sim, seq).some((e) => e.type === 'saved' && e.by === keeper)).toBe(true);
      run(sim, T.keeper.maxHoldSeconds + 0.5, (s) => s.state.ball.owner !== keeper);
      expect(newEvents(sim, seq).some((e) => e.type === 'distributed' && e.by === keeper)).toBe(true);
    });
  }

  it('M2 scoring still holds: a hard far-post shot beats the keeper, a central one does not', () => {
    let far = 0;
    let central = 0;
    for (let seed = 1; seed <= 8; seed++) {
      for (const off of [0, 2.5]) {
        const sim = new MatchSim({ seed });
        live(sim);
        // Same geometry as the M2 drill sweep: shooter in an off-centre lane, settled keeper.
        giveBall(sim, 'H8', { x: 56, y: 19 });
        sim.arrange((s) => {
          for (const id of AWAY_IDS) if (id !== 'A1') s.players[id].pos = { x: 30, y: s.players[id].pos.y };
          s.players.A1.pos = { x: 75 - T.keeper.depth, y: 25 + (19 - 25) * T.keeper.shade };
          s.players.A1.vel = { x: 0, y: 0 };
        });
        sim.command({ type: 'setAction', action: 'shoot' });
        aimAt(sim, { x: 75, y: 25 + off }, 1);
        run(sim, 3, (s) => s.state.phase === 'stopped');
        const goal = sim.state.stoppage?.reason === 'goal' && sim.state.stoppage.scorer === 'home';
        if (goal && off > 0) far++;
        if (goal && off === 0) central++;
      }
    }
    expect(far).toBe(8);
    expect(central).toBe(0);
  });
});

describe('sandbox flow', () => {
  it('pause freezes everything; resume continues; reset restores the kickoff', () => {
    const sim = new MatchSim({ seed: 2 });
    live(sim);
    run(sim, 3);
    sim.command({ type: 'pause' });
    const frozen = structuredClone(sim.state.players);
    const t = sim.state.simTime;
    run(sim, 2);
    expect(sim.state.simTime).toBe(t);
    expect(sim.state.players).toEqual(frozen);
    expect(sim.command({ type: 'aimStart' })).toBe(false);
    sim.command({ type: 'resume' });
    run(sim, 0.5);
    expect(sim.state.simTime).toBeGreaterThan(t);
    sim.command({ type: 'pause' });
    sim.command({ type: 'setFormation', team: 'home', formation: '1-3-3-2' });
    sim.command({ type: 'reset' });
    expect(sim.state.phase).toBe('kickoff');
    expect(sim.state.paused).toBe(false);
    expect(sim.state.ball.owner).toBe('H8');
    expect(sim.state.score).toEqual({ home: 0, away: 0 });
    expect(sim.state.formations.home).toBe('1-3-3-2');
    expect(checkInvariants(sim.state)).toEqual([]);
  });

  it('a goal stops play, is labelled as a sandbox reset, and restarts with the conceding team', () => {
    const sim = new MatchSim({ seed: 1 });
    live(sim);
    sim.arrange((s) => {
      s.ball.owner = null;
      s.ball.pos = { x: 74, y: 25 };
      s.ball.vel = { x: 10, y: 0 };
      s.ball.kick = { by: 'H8', team: 'home', kind: 'shot', at: s.simTime - 1, target: null, receiver: null };
      s.players.A1.pos = { x: 70, y: 40 };
    });
    run(sim, 0.2, (s) => s.state.phase === 'stopped');
    expect(sim.state.stoppage).toMatchObject({ reason: 'goal', scorer: 'home', restartTeam: 'away' });
    expect(sim.state.score.home).toBe(1);
    run(sim, T.stoppage.goalSeconds + 0.1);
    expect(sim.state.ball.owner).toBe('A8');
    expect(sim.state.possession).toBe('away');
  });

  it('ball over the touchline stops play and the other team restarts from that spot', () => {
    const sim = new MatchSim({ seed: 1 });
    live(sim);
    sim.arrange((s) => {
      s.ball.owner = null;
      s.ball.pos = { x: 40, y: 49.5 };
      s.ball.vel = { x: 0, y: 6 };
      s.ball.lastTouch = 'home';
      s.ball.kick = { by: 'H6', team: 'home', kind: 'pass', at: s.simTime - 1, target: null, receiver: null };
    });
    run(sim, 0.3, (s) => s.state.phase === 'stopped');
    expect(sim.state.stoppage).toMatchObject({ reason: 'out', restartTeam: 'away' });
    run(sim, T.stoppage.outSeconds + 0.1);
    const owner = sim.state.ball.owner;
    expect(owner?.startsWith('A')).toBe(true);
    expect(Math.abs(sim.state.ball.pos.x - 40)).toBeLessThan(2);
  });

  it('equivalent scripted input gives the same play at 30, 60 and 144 fps (within one frame of input timing)', () => {
    const script = (fps: number) => {
      const sim = new MatchSim({ seed: 9 });
      const frame = 1 / fps;
      let passed = false;
      const types: string[] = [];
      let seq = 0;
      for (let i = 0; i < fps * 8; i++) {
        if (!passed && sim.state.simTime >= 1.5 - 1e-6 && sim.userHasBall()) {
          aimAt(sim, { x: sim.state.ball.pos.x + 6, y: sim.state.ball.pos.y + 12 }, 0.35);
          passed = true;
        }
        sim.step(frame);
        for (const e of sim.state.events) if (e.seq > seq) {
          seq = e.seq;
          if (e.type !== 'aimStart') types.push(`${e.type}:${e.by ?? ''}`);
        }
      }
      return { types, sim };
    };
    const base = script(120);
    for (const fps of [30, 60, 144]) {
      const r = script(fps);
      expect(r.types.slice(0, 8)).toEqual(base.types.slice(0, 8));
      expect(Math.hypot(r.sim.state.ball.pos.x - base.sim.state.ball.pos.x, r.sim.state.ball.pos.y - base.sim.state.ball.pos.y)).toBeLessThan(1.5);
    }
  });

  it('no invariant breaks over long seeded play', () => {
    for (let seed = 1; seed <= 3; seed++) {
      const sim = new MatchSim({ seed });
      for (let i = 0; i < 60 * 60; i++) {
        sim.step(F);
        const v = checkInvariants(sim.state);
        expect(v, `seed ${seed} t=${sim.state.simTime}`).toEqual([]);
      }
    }
  });
});
