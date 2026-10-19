import { describe, expect, it } from 'vitest';
import { MatchSim, MATCH_TUNING as T, stageFixture } from '../src/game/match';
import { LOGIC_CATALOG } from '../src/game/logic/catalog';
import { emptySave, reduce, type CareerSave } from '../src/game/career/state';
import { exportSave, parseImport, parseSave } from '../src/game/career/saveio';
import { POSITIONS } from '../src/game/career/types';
import {
  SituationObserver,
  TEAM_TRAINING_INACTIVE,
  TEAM_TRAINING_SITUATIONS,
  selectSituations,
  teamTrainingChanges,
  weekDelta,
  type SituationResult,
  type TeamTrainingSituation,
} from '../src/game/career/teamTraining';

const F = 1 / 60;

function run(sit: TeamTrainingSituation, seed = 3, drive?: (sim: MatchSim) => void): SituationResult {
  const sim = new MatchSim({ seed, halfSeconds: null });
  sim.arrange((s) => stageFixture(s, sit.fixture, T.pitch));
  const obs = new SituationObserver(sit, sim.state);
  for (let i = 0; i < 60 * 30 && !obs.finished; i++) {
    drive?.(sim);
    sim.step(F);
    obs.step(sim.state);
  }
  expect(obs.finished).toBe(true);
  return obs.result();
}

function withPlayer(position: 'DEF' | 'MID' | 'FWD'): CareerSave {
  const r = reduce(emptySave(), { type: 'createPlayer', id: 'p1', name: 'Kid', position });
  if (!r.ok) throw new Error(r.error);
  return r.save;
}

const results = (save: CareerSave, scores: readonly number[]): SituationResult[] =>
  selectSituations(save.player!.position, save.week).map((s, i) => ({ id: s.id, score: scores[i]!, notes: [] }));

describe('weekly Team Training from the soccer-logic catalog', () => {
  it('uses only real catalog entries; set pieces, aerial play and goalkeeping stay inactive', () => {
    const ids = new Set(LOGIC_CATALOG.scenarios.map((s) => s.id));
    for (const s of TEAM_TRAINING_SITUATIONS) expect(ids.has(s.id)).toBe(true);
    for (const id of ['GK01', 'GK04', 'SP01', 'SP02', 'SP03', 'WING04']) expect(TEAM_TRAINING_INACTIVE).toContain(id);
    expect(TEAM_TRAINING_SITUATIONS.length + TEAM_TRAINING_INACTIVE.length).toBe(LOGIC_CATALOG.scenarios.length);
  });

  it('picks three distinct, position-appropriate situations each week, the same for every save', () => {
    for (const pos of POSITIONS) {
      for (let w = 1; w <= 8; w++) {
        const a = selectSituations(pos, w);
        expect(a).toHaveLength(3);
        expect(new Set(a.map((s) => s.id)).size).toBe(3);
        for (const s of a) expect(s.positions).toContain(pos);
        expect(selectSituations(pos, w).map((s) => s.id)).toEqual(a.map((s) => s.id));
      }
      expect(selectSituations(pos, 1).map((s) => s.id)).not.toEqual(selectSituations(pos, 2).map((s) => s.id));
    }
  });

  it('every situation stages, ends on its own and grades deterministically within 0..1', () => {
    for (const sit of TEAM_TRAINING_SITUATIONS) {
      const a = run(sit);
      const b = run(sit);
      expect(a).toEqual(b);
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(1);
      expect(a.notes.length).toBeGreaterThan(0);
    }
  });

  it('grades play, not idling: carrying forward and passing to the open teammate beats standing still', () => {
    const sit = TEAM_TRAINING_SITUATIONS.find((s) => s.id === 'CB01')!;
    const idle = run(sit);
    let frame = 0;
    const played = run(sit, 3, (sim) => {
      frame += 1;
      if (frame < 50) sim.command({ type: 'padMove', x: 1, y: 0 });
      else if (frame === 50) {
        sim.command({ type: 'padMove', x: 0.6, y: -0.8 });
        sim.command({ type: 'padPress', id: 1, action: 'pass' });
      } else if (frame === 60) sim.command({ type: 'padRelease', id: 2, action: 'pass' });
    });
    expect(played.notes.join(' ')).toMatch(/pass/);
    expect(played.score).toBeGreaterThan(idle.score);
  });

  it('defending by hand (staying close and goal-side) beats letting the engine do it', () => {
    const sit = TEAM_TRAINING_SITUATIONS.find((s) => s.id === 'CB04')!;
    // Seeded outcomes are chaotic, so judge the habit over 10 seeds, not one lucky or unlucky seed.
    let idleSum = 0;
    let playedSum = 0;
    let wonBack = 0;
    for (let seed = 1; seed <= 10; seed++) {
      let ids = 0;
      const idle = run(sit, seed);
      const played = run(sit, seed, (sim) => {
        // Step goal-side of the ball and hold BLOCK when the carrier is close, as a player would.
        const s = sim.state;
        const owner = s.ball.owner;
        const me = s.players[s.controlledId];
        const at = owner ? s.players[owner].pos : s.ball.pos;
        const dx = at.x - 2 - me.pos.x;
        const dy = at.y - me.pos.y;
        const m = Math.hypot(dx, dy) || 1;
        sim.command({ type: 'padMove', x: dx / m, y: dy / m });
        const near = !!owner && s.players[owner].team === 'away' && Math.hypot(at.x - me.pos.x, at.y - me.pos.y) < 6;
        if (near && s.pad.phase === 'ready') sim.command({ type: 'padPress', id: ++ids, action: 'block' });
        if (!near && s.pad.phase === 'blocking') sim.command({ type: 'padRelease', id: ++ids, action: 'block' });
      });
      idleSum += idle.score;
      playedSum += played.score;
      if (played.score > 0.5) wonBack++;
    }
    expect(playedSum / 10).toBeGreaterThan(idleSum / 10 + 0.05);
    expect(wonBack).toBeGreaterThan(0);
  });

  it('a player who does nothing has a poor week in every situation', () => {
    for (const sit of TEAM_TRAINING_SITUATIONS) {
      for (const seed of [3, 11]) expect(run(sit, seed).score, `${sit.id} seed ${seed}`).toBeLessThan(0.5);
    }
    for (const pos of POSITIONS) expect(weekDelta(selectSituations(pos, 1).map((s) => run(s).score))).toBe(-1);
  });

  it('maps the week average to +2 / +1 / 0 / -1', () => {
    expect(weekDelta([1, 0.8, 0.75])).toBe(2);
    expect(weekDelta([0.6, 0.5, 0.4])).toBe(1);
    expect(weekDelta([0.3, 0.3, 0.3])).toBe(0);
    expect(weekDelta([0, 0.2, 0.1])).toBe(-1);
  });

  it('gains go to trained attributes up to potential; a loss never goes below the starting value', () => {
    const save = withPlayer('MID');
    const p = save.player!;
    const good = teamTrainingChanges(p, results(save, [1, 1, 1]));
    expect(good).toHaveLength(2);
    const trained = new Set(selectSituations('MID', 1).flatMap((s) => s.attributes));
    for (const c of good) {
      expect(trained.has(c.attribute)).toBe(true);
      expect(c.to).toBe(c.from + 1);
    }
    expect(teamTrainingChanges(p, results(save, [0, 0, 0]))).toEqual([]);
    const capped = { ...p, attributes: Object.fromEntries(Object.keys(p.attributes).map((k) => [k, p.potential[k as keyof typeof p.potential]])) as typeof p.attributes };
    expect(teamTrainingChanges(capped, results(save, [1, 1, 1]))).toEqual([]);
    const raised = { ...p, attributes: { ...p.attributes, passing: 45, awareness: 45, firstTouch: 45 } };
    const bad = teamTrainingChanges(raised, results(save, [0, 0, 0]));
    expect(bad).toHaveLength(1);
    expect(bad[0]!.to).toBe(44);
  });

  it('counts once per week, rejects foreign or out-of-range results, and survives save/reload', () => {
    let save = withPlayer('FWD');
    expect(reduce(save, { type: 'teamTraining', week: 2, results: results(save, [1, 1, 1]) }).ok).toBe(false);
    expect(reduce(save, { type: 'teamTraining', week: 1, results: results(save, [1, 1, 1]).slice(0, 2) }).ok).toBe(false);
    expect(reduce(save, { type: 'teamTraining', week: 1, results: results(save, [1, 1, 2]) }).ok).toBe(false);
    const swapped = results(save, [1, 1, 1]).reverse();
    expect(reduce(save, { type: 'teamTraining', week: 1, results: swapped }).ok).toBe(false);
    const first = reduce(save, { type: 'teamTraining', week: 1, results: results(save, [1, 0.9, 0.8]) });
    if (!first.ok) throw new Error(first.error);
    save = first.save;
    const gained = Object.values(save.player!.attributes).reduce((a, b) => a + b, 0) - 40 * 6;
    expect(gained).toBe(2);
    const again = reduce(save, { type: 'teamTraining', week: 1, results: results(save, [1, 1, 1]) });
    expect(again.ok && again.changed).toBe(false);
    const back = parseImport(exportSave(save));
    expect(back.ok && back.value.teamTraining).toEqual(save.teamTraining);
    expect(back.ok && back.value.player).toEqual(save.player);
    const twice = JSON.parse(JSON.stringify(save));
    twice.teamTraining.push(twice.teamTraining[0]);
    expect(parseSave(twice).ok).toBe(false);
    const forged = JSON.parse(JSON.stringify(save));
    forged.teamTraining[0].delta = 2;
    forged.teamTraining[0].scores = [0, 0, 0];
    expect(parseSave(forged).ok).toBe(false);
  });

  it('older saves without Team Training load with none recorded', () => {
    const save = withPlayer('DEF') as unknown as Record<string, unknown>;
    const { teamTraining: _drop, ...old } = save;
    const r = parseSave(JSON.parse(JSON.stringify(old)));
    expect(r.ok && r.value.teamTraining).toEqual([]);
  });
});
