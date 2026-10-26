import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fixtureMatchesScene, playedFreeze, sceneActors } from '../src/game/training12/library/fixtureCheck';
import { SESSION_CARDS, scoredSession } from '../src/game/training12/library/gate';
import { cardReview, LIBRARY_SCENES, rulesSha256, sceneProblems, sceneSha256, SIGNOFFS } from '../src/game/training12/library/review';
import { LIBRARY_CARDS, LIBRARY_PITCH, LIBRARY_ROSTERS } from '../src/game/training12/library/tacticalLibrary.generated';
import type { LibraryScene, NumericScene, Signoff } from '../src/game/training12/library/types';
import { sessions } from '../src/game/training12/ref/seasons.mjs';
import { ALL_FIXTURES } from '../src/game/training12/situations/index';
import { createSituation } from '../src/game/training12/situations/sim';
import type { Fixture, P, VariantSpec } from '../src/game/training12/situations/types';

interface Proposal { cardId: string; sceneId: string; cardSha256: string; status: string; numeric: NumericScene; changedCue: { note: string; numeric: NumericScene }; mirrorOf: string | null }
const DIR = 'docs/training/library-v1.2/scenes/';
const doc = JSON.parse(readFileSync(DIR + 'proposed-scenes.json', 'utf8')) as { status: string; blockedCards: string[]; scenes: Proposal[] };
const plan = JSON.parse(readFileSync(DIR + 'session-proposal.json', 'utf8')) as { status: string; mapping: Record<string, Record<string, string[]>> };
const BLOCKED = ['LB01', 'RB01', 'DM03', 'DM05', 'CM05', 'LW03', 'RW03', 'ST03', 'ST04'];
const roster = [...LIBRARY_ROSTERS.H, ...LIBRARY_ROSTERS.A].map((a) => a.id);
const card = (id: string) => LIBRARY_CARDS.find((c) => c.id === id)!;
const prop = (id: string) => doc.scenes.find((s) => s.cardId === id)!;
const spec: VariantSpec = { teaches: 'test', question: 'test', cues: [], grades: {} };

/** Test-only compiled fixture for a proposal: the shape a real scene compiler must produce. */
function compiled(p: Proposal, goal: Fixture['goal'] = 'ours'): Fixture {
  const T = 1.2;
  const base = sceneActors(p.numeric, goal, T);
  const ch = sceneActors(p.changedCue.numeric, goal, T);
  return {
    ...ALL_FIXTURES[0]!, id: p.sceneId, exact: true, goal, human: card(p.cardId).protagonist, passageSeconds: T, actors: base,
    ball: { owner: p.numeric.ball.owner! }, cue: spec,
    counter: { ...spec, moves: Object.fromEntries(ch.map((a) => [a.slot, a.at])), passage: Object.fromEntries(ch.map((a) => [a.slot, a.passage ?? a.at])), ball: { owner: p.changedCue.numeric.ball.owner! } },
  };
}
const asScene = (p: Proposal, fixture: Fixture): LibraryScene => ({ cardId: p.cardId, sceneId: p.sceneId, numeric: p.numeric, changedCue: p.changedCue.numeric, fixture });

describe('v1.2 proposed scenes (Devin proposals for Coach Cody, not approved)', () => {
  it('cover exactly the 39 ready cards, stay out of the game, and pin the current card text', () => {
    expect(doc.status).toBe('PROPOSALS_NOT_APPROVED');
    expect(doc.blockedCards).toEqual(BLOCKED);
    expect(doc.scenes.map((s) => s.cardId).sort()).toEqual(LIBRARY_CARDS.map((c) => c.id).filter((id) => !BLOCKED.includes(id)).sort());
    expect(Object.keys(LIBRARY_SCENES)).toEqual([]);
    expect(SIGNOFFS).toEqual([]);
    for (const s of doc.scenes) {
      expect(s.status).toBe('PROPOSAL_FOR_SCENE_REVIEW');
      expect(s.cardSha256, s.cardId).toBe(card(s.cardId).cardSha256);
    }
  });

  it('each freeze is structurally valid for its card; each changed cue keeps the same players, inside its view', () => {
    for (const s of doc.scenes) {
      const c = card(s.cardId);
      expect(sceneProblems(c, asScene(s, ALL_FIXTURES[0]!)), s.cardId).toEqual([]);
      const ch = s.changedCue.numeric;
      expect(ch.actors.map((a) => a.id), s.cardId).toEqual(s.numeric.actors.map((a) => a.id));
      expect(ch.omitted).toEqual(s.numeric.omitted);
      for (const a of ch.actors) {
        expect(roster).toContain(a.id);
        expect(a.pos.x >= ch.view.min.x && a.pos.x <= ch.view.max.x && a.pos.y >= ch.view.min.y && a.pos.y <= ch.view.max.y, `${s.cardId} ${a.id}`).toBe(true);
      }
      expect(s.changedCue.note.trim()).not.toBe('');
    }
  });

  it('no two players stand on top of each other, and positions are on the pitch', () => {
    for (const s of doc.scenes)
      for (const n of [s.numeric, s.changedCue.numeric]) {
        for (const a of n.actors) expect(a.pos.x >= 0 && a.pos.x <= LIBRARY_PITCH.length_m && a.pos.y >= 0 && a.pos.y <= LIBRARY_PITCH.width_m).toBe(true);
        for (let i = 0; i < n.actors.length; i++)
          for (let j = i + 1; j < n.actors.length; j++) {
            const [a, b] = [n.actors[i]!.pos, n.actors[j]!.pos];
            expect(Math.hypot(a.x - b.x, a.y - b.y), `${s.cardId} ${n.actors[i]!.id}/${n.actors[j]!.id}`).toBeGreaterThanOrEqual(1.5);
          }
      }
  });

  it('mirror scenes are true mirrors of the freeze (left/right roles, y, movement and facing)', () => {
    const swap = (id: string) => id.replace(/_(LB|RB|LW|RW)$/, (_, r: string) => '_' + ({ LB: 'RB', RB: 'LB', LW: 'RW', RW: 'LW' } as Record<string, string>)[r]);
    for (const s of doc.scenes.filter((x) => x.mirrorOf)) {
      const src = prop(s.mirrorOf!);
      for (const a of src.numeric.actors) {
        const m = s.numeric.actors.find((x) => x.id === swap(a.id))!;
        expect(m.pos.x).toBeCloseTo(a.pos.x, 6);
        expect(m.pos.y).toBeCloseTo(LIBRARY_PITCH.width_m - a.pos.y, 6);
        expect(m.vel.y).toBeCloseTo(-a.vel.y, 6);
        expect(((m.facingDeg + a.facingDeg) % 360 + 360) % 360 === 0 || Math.abs(((m.facingDeg + a.facingDeg) % 360) - 360) < 0.2 || Math.abs((m.facingDeg + a.facingDeg) % 360) < 0.2, `${s.cardId} ${m.id}`).toBe(true);
      }
    }
  });

  it('the session proposal is a proposal: 3 distinct ready cards of the route role, never loaded into the gate', () => {
    expect(plan.status).toBe('PROPOSAL_NOT_APPROVED');
    expect(SESSION_CARDS).toEqual({});
    expect(Object.keys(plan.mapping)).toHaveLength(108);
    for (const s of sessions)
      for (const role of Object.keys(s.roleRoutes)) {
        const ids = plan.mapping[s.id]?.[role];
        if (role === 'GK') { expect(ids).toBeUndefined(); continue; }
        expect(ids, `${s.id} ${role}`).toHaveLength(3);
        expect(new Set(ids).size).toBe(3);
        for (const id of ids!) {
          expect(BLOCKED).not.toContain(id);
          expect(card(id).gameRole).toBe(role);
        }
        expect(scoredSession(s.id, role as never).ok).toBe(false);
      }
  });
});

describe('fixtureMatchesScene: the played fixture must be the signed scene', () => {
  const p = prop('CB01');
  const fx = compiled(p);

  const half = LIBRARY_PITCH.length_m / 2;
  /** CB01 with nobody moving and the ball where the simulator freezes it: what the half-field player can reproduce. */
  function still(): Proposal {
    const stop = (n: NumericScene): NumericScene => ({ ...n, actors: n.actors.map((a) => ({ ...a, vel: { x: 0, y: 0 } })) });
    const base: Proposal = { ...p, numeric: stop(p.numeric), changedCue: { ...p.changedCue, numeric: stop(p.changedCue.numeric) } };
    const f = compiled(base);
    const ball = (v: 'cue' | 'counter') => { const b = playedFreeze(f, v).ball.pos; return { x: half - b.y, y: b.x }; };
    return { ...base, numeric: { ...base.numeric, ball: { ...base.numeric.ball, pos: ball('cue') } }, changedCue: { ...base.changedCue, numeric: { ...base.changedCue.numeric, ball: { ...base.changedCue.numeric.ball, pos: ball('counter') } } } };
  }

  it('a fixture compiled from a still scene freezes exactly there, with only those players; facing still blocks it', () => {
    const q = still();
    const f = compiled(q);
    expect(fixtureMatchesScene(asScene(q, f))).toEqual([
      'CB01 (cue): the half-field player does not model facing, so the scene\'s signed facing cannot be shown.',
      'CB01 (changed cue): the half-field player does not model facing, so the scene\'s signed facing cannot be shown.',
    ]);
    const s = createSituation(f, 'cue');
    expect(s.actors.map((a) => a.slot).sort()).toEqual(p.numeric.actors.map((a) => a.id).sort());
    expect(s.actors.find((a) => a.human)?.slot).toBe('H_CB');
  });

  it('signed movement into the freeze and a signed ball position must be what the simulator actually plays', () => {
    const moving = fixtureMatchesScene(asScene(p, fx));
    expect(moving.some((m) => m.startsWith('CB01 (cue): A_RW is moving at'))).toBe(true);
    expect(moving.some((m) => m.startsWith('CB01 (cue): A_ST is moving at'))).toBe(true);
    const q = still();
    const off = { ...q, numeric: { ...q.numeric, ball: { ...q.numeric.ball, pos: { x: q.numeric.ball.pos.x - 1.2, y: q.numeric.ball.pos.y } } } };
    expect(fixtureMatchesScene(asScene(off, compiled(q))).some((m) => m.startsWith('CB01 (cue): the ball freezes at'))).toBe(true);
  });

  it('the changed cue must show its required players and ball inside its own view', () => {
    const narrow = { ...p.changedCue.numeric, view: { kind: 'area' as const, min: { x: 0, y: 0 }, max: { x: 5, y: 45.72 } } };
    const probs = sceneProblems(card('CB01'), { ...asScene(p, fx), changedCue: narrow });
    expect(probs).toContain('CB01 (changed cue): the ball is outside the area view.');
    expect(probs).toContain('CB01 (changed cue): required actor H_CB is outside the area view.');
    expect(sceneProblems(card('CB01'), asScene(p, fx))).toEqual([]);
  });

  it('rejects a non-exact fixture, a moved player, an extra player, a wrong ball and a different changed cue', () => {
    const scene = (f: Fixture) => fixtureMatchesScene(asScene(p, f));
    const { exact: _e, ...loose } = fx;
    expect(scene(loose as Fixture)).toContain('CB01: the played fixture is not exact (squad.ts would add shape-holders the scene does not have).');
    const moved = { ...fx, actors: fx.actors.map((a) => (a.slot === 'H_CB' ? { ...a, at: { x: a.at.x + 2, y: a.at.y } as P } : a)) };
    expect(scene(moved).some((m) => m.startsWith('CB01 (cue): H_CB freezes at'))).toBe(true);
    const extra = { ...fx, actors: [...fx.actors, { ...fx.actors[0]!, slot: 'H_CM', role: '8' as const }] };
    expect(scene(extra)[0]).toMatch(/^CB01 \(cue\): fixture players/);
    expect(scene({ ...fx, ball: { owner: 'A_ST' } })).toContain('CB01 (cue): fixture ball is with A_ST, the scene has A_RW.');
    const counter = { ...fx, counter: { ...fx.counter, moves: { ...fx.counter.moves, A_RW: { x: 1, y: 1 } } } };
    expect(scene(counter).some((m) => m.startsWith('CB01 (changed cue): A_RW freezes at'))).toBe(true);
    expect(fixtureMatchesScene({ ...asScene(p, fx), changedCue: undefined } as unknown as LibraryScene)).toContain('CB01: no signed changed-cue scene to check the retry against.');
    expect(scene({ ...fx, id: 'CB01' })).toContain('CB01: fixture CB01 was not built for scene CB01-p1.');
  });

  it('a scene that needs more than one half is refused by the half-field player', () => {
    const st = prop('ST06');
    expect(fixtureMatchesScene(asScene(st, compiled(st, 'theirs')))).toContain("ST06 (cue): the scene's area view is not inside the away half; the half-field player cannot show it yet.");
  });

  it('a current sign-off still cannot score while the player cannot reproduce the scene; drift stales or blocks it', () => {
    const pitch = { ...LIBRARY_PITCH, local_rules_verified: true };
    const sc = asScene(p, fx);
    const sign: Signoff = { cardId: 'CB01', cardSha256: card('CB01').cardSha256, rulesSha256: rulesSha256(pitch), sceneId: sc.sceneId, sceneSha256: sceneSha256(sc), reviewer: 'test', date: '2026-10-26', note: 'test only' };
    const r = cardReview('CB01', { scenes: { CB01: sc }, signoffs: [sign], pitch });
    expect(r.status).toBe('DRAFT_BLOCKED_FOR_PLAYER_TRAINING');
    expect(r.blockers).toContain("CB01 (cue): the half-field player does not model facing, so the scene's signed facing cannot be shown.");
    expect(cardReview('CB01', { scenes: { CB01: sc }, signoffs: [sign], pitch, fixtureCheck: () => [] })).toEqual({ status: 'APPROVED', blockers: [] });
    expect(cardReview('CB01', { scenes: { CB01: sc }, signoffs: [sign] }).status).not.toBe('APPROVED');
    const drift = { ...sc, fixture: { ...fx, actors: fx.actors.map((a) => (a.slot === 'A_ST' ? { ...a, at: { x: 0, y: 0 } } : a)) } };
    expect(cardReview('CB01', { scenes: { CB01: drift }, signoffs: [sign], pitch }).status).toBe('APPROVAL_STALE');
    expect(cardReview('CB01', { scenes: { CB01: drift }, signoffs: [{ ...sign, sceneSha256: sceneSha256(drift) }], pitch }).status).toBe('DRAFT_BLOCKED_FOR_PLAYER_TRAINING');
  });
});
