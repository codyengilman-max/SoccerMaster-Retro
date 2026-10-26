import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sessions } from '../src/game/training12/ref/seasons.mjs';
import { scoredSession } from '../src/game/training12/library/gate';
import { cardReview, LEGACY_PROPOSAL_REVIEW, LIBRARY_SCENES, rulesSha256, sceneProblems, sceneSha256, SIGNOFFS } from '../src/game/training12/library/review';
import { sha256, stableJson } from '../src/game/training12/library/sha256';
import { LIBRARY, LIBRARY_CARDS, LIBRARY_PITCH, LIBRARY_RETIRED_IDS, LIBRARY_ROSTERS, LIBRARY_SOURCES } from '../src/game/training12/library/tacticalLibrary.generated';
import type { LibraryCard, LibraryScene, Signoff } from '../src/game/training12/library/types';
import { ALL_FIXTURES } from '../src/game/training12/situations/index';
import { SituationSession } from '../src/game/training12/situations/session';

const node = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');
const pkg = JSON.parse(readFileSync(LIBRARY.path, 'utf8')) as {
  version: string; kind: string; rosters: Record<string, { id: string; role: string; team: string }[]>;
  pitch_proposal: typeof LIBRARY_PITCH; retired_ids: string[]; sources: unknown[]; scenarios: Record<string, unknown>[];
};
const ROLES = ['GK', 'LB', 'CB', 'RB', 'DM', 'CM', 'LW', 'RW', 'ST'];
const GAME = ['CB', 'LB', 'RB', '6', '8', '9', 'LW', 'RW'] as const;

/** TS port of the package's validate_library.py structural lint, run against the imported module. */
function lint(cards: readonly LibraryCard[], rosters = LIBRARY_ROSTERS, sources = LIBRARY_SOURCES, pitch = LIBRARY_PITCH, retired = LIBRARY_RETIRED_IDS): string[] {
  const e: string[] = [];
  const need = (ok: boolean, m: string): void => void (ok || e.push(m));
  const actors = new Set<string>();
  need(Object.keys(rosters).sort().join() === 'A,H', 'two teams only');
  for (const t of ['H', 'A'] as const) {
    const r = rosters[t] ?? [];
    need(r.length === 9 && r.map((a) => a.role).sort().join() === [...ROLES].sort().join(), `${t}: eight outfield plus GK`);
    for (const a of r) { need(a.id === `${t}_${a.role}` && a.team === t && !actors.has(a.id), 'actor identity'); actors.add(a.id); }
  }
  const sids = sources.map((s) => s.id);
  need(new Set(sids).size === 15 && sids.length === 15, 'unique source register');
  for (const s of sources) need(!!(s.url.startsWith('https://') && s.origin && s.section && s.supports && s.limitations && s.accessed), `source ${s.id}`);
  need(new Set(cards.map((c) => c.id)).size === 48 && cards.length === 48, '48 unique cards');
  for (const r of ROLES.slice(1)) need(cards.filter((c) => c.role === r).length === 6, `six ${r} cards`);
  need([...retired].sort().join() === 'GK01,GK02,GK03', 'GK retired');
  for (const c of cards) {
    need(c.role !== 'GK' && c.protagonist === `H_${c.role}`, `${c.id}: protagonist slot`);
    need(c.home_formation === '1-3-2-3' && c.opponent_formation === '1-3-2-3', `${c.id}: formation`);
    const v = c.required_visible_actor_ids;
    need(new Set(v).size === v.length && v.every((a) => actors.has(a)), `${c.id}: visible actors`);
    need(v.includes(c.protagonist) && v.includes(c.ball_owner_at_freeze), `${c.id}: protagonist/ball owner visible`);
    need(c.source_ids.length > 0 && c.source_ids.every((s) => sids.includes(s)), `${c.id}: source resolution`);
    need(Object.keys(c.source_sections).sort().join() === [...c.source_ids].sort().join(), `${c.id}: source sections`);
    need([...c.format_source_ids].sort().join() === 'S15,S16', `${c.id}: 9v9 framework`);
    for (const f of ['cue', 'preferred_decision', 'acceptable_alternative', 'misconception', 'coach_feedback', 'changed_cue_test', 'coordination', 'correction'] as const)
      need(typeof c[f] === 'string' && c[f].length > 0, `${c.id}: ${f}`);
    need(c.release_status === 'DRAFT_BLOCKED_FOR_PLAYER_TRAINING', `${c.id}: premature release`);
    need(c.review.independent_coach_approval === null && !c.review.geometry_validated && !c.review.runtime_tested && !c.review.source_exact, `${c.id}: review claims`);
    need(c.numeric_scene === null && c.required_tests.length >= 6, `${c.id}: scene/tests`);
  }
  need(Math.abs(pitch.length_m - pitch.length_yards * 0.9144) < 1e-9 && Math.abs(pitch.width_m - pitch.width_yards * 0.9144) < 1e-9, 'yards/metres');
  need(!pitch.local_rules_verified, 'unverified local rules');
  return e;
}

describe('9v9 Audited Library v1.2 import', () => {
  it('pins every committed package file by SHA-256 and stays a blocked draft', () => {
    expect(node(readFileSync(LIBRARY.path))).toBe(LIBRARY.sha256);
    for (const [f, h] of Object.entries(LIBRARY.packageFiles)) expect(node(readFileSync(`docs/training/library-v1.2/${f}`)), f).toBe(h);
    expect(Object.keys(LIBRARY.packageFiles)).toHaveLength(6);
    expect([LIBRARY.version, LIBRARY.status]).toEqual(['1.2', 'DRAFT_BLOCKED_FOR_PLAYER_TRAINING']);
    expect(LIBRARY.rulesSha256).toBe(node(stableJson({ pitch_proposal: pkg.pitch_proposal, rosters: pkg.rosters })));
  });

  it('imports all 48 cards unchanged, with a card hash over the exact package record', () => {
    expect(LIBRARY_CARDS.map((c) => c.id)).toEqual(pkg.scenarios.map((c) => c.id));
    LIBRARY_CARDS.forEach((c, i) => {
      const { gameRole, cardSha256, ...rest } = c;
      expect(rest, c.id).toEqual(pkg.scenarios[i]);
      expect(cardSha256, c.id).toBe(node(stableJson(pkg.scenarios[i])));
      expect(sha256(stableJson(pkg.scenarios[i])), c.id).toBe(cardSha256);
      expect(gameRole, c.id).toBe({ DM: '6', CM: '8', ST: '9' }[c.role] ?? c.role);
    });
    for (const r of GAME) expect(LIBRARY_CARDS.filter((c) => c.gameRole === r), r).toHaveLength(6);
    expect(LIBRARY_ROSTERS).toEqual(pkg.rosters);
    expect(LIBRARY_SOURCES).toEqual(pkg.sources);
  });

  it('passes the package structural lint, and the lint rejects the package mutations', () => {
    expect(lint(LIBRARY_CARDS)).toEqual([]);
    const c0 = LIBRARY_CARDS[0]!;
    const bad: [string, () => string[]][] = [
      ['tenth player', () => lint(LIBRARY_CARDS, { ...LIBRARY_ROSTERS, H: [...LIBRARY_ROSTERS.H, { id: 'H_EXTRA', role: 'CB', team: 'H' }] })],
      ['neutral actor', () => lint([{ ...c0, required_visible_actor_ids: [...c0.required_visible_actor_ids, 'NEUTRAL_1'] }, ...LIBRARY_CARDS.slice(1)])],
      ['GK protagonist', () => lint([{ ...c0, role: 'GK', protagonist: 'H_GK' }, ...LIBRARY_CARDS.slice(1)])],
      ['missing card', () => lint(LIBRARY_CARDS.slice(1))],
      ['unknown source', () => lint([{ ...c0, source_ids: [...c0.source_ids, 'S99'] }, ...LIBRARY_CARDS.slice(1)])],
      ['11v11 formation', () => lint([{ ...c0, home_formation: '1-4-3-3' }, ...LIBRARY_CARDS.slice(1)])],
      ['invented approval', () => lint([{ ...c0, review: { ...c0.review, independent_coach_approval: 'AI approved' } }, ...LIBRARY_CARDS.slice(1)])],
      ['metres/yards', () => lint(LIBRARY_CARDS, LIBRARY_ROSTERS, LIBRARY_SOURCES, { ...LIBRARY_PITCH, length_m: 75 })],
      ['missing alternative', () => lint([{ ...c0, acceptable_alternative: '' }, ...LIBRARY_CARDS.slice(1)])],
    ];
    for (const [name, run] of bad) expect(run().length, name).toBeGreaterThan(0);
  });

  it('sha256() matches node:crypto on ASCII, UTF-8 and block-boundary inputs', () => {
    for (const s of ['', 'abc', '“One pressed; you protected what was behind.”', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'é'.repeat(200)]) expect(sha256(s)).toBe(node(s));
  });
});

describe('review gate fails closed', () => {
  it('has no scenes or sign-offs, so every card is a blocked draft with exact blockers; GK cards are retired', () => {
    expect(SIGNOFFS).toEqual([]);
    expect(Object.keys(LIBRARY_SCENES)).toEqual([]);
    for (const c of LIBRARY_CARDS) expect(cardReview(c.id)).toEqual({ status: 'DRAFT_BLOCKED_FOR_PLAYER_TRAINING', blockers: [
      `${c.id}: no numeric scene has been built and validated from this card (numeric_scene is null).`,
      `${c.id}: local competition rules are not verified (pitch_proposal.local_rules_verified is false).`,
      `${c.id}: no Coach Cody sign-off.`] });
    for (const id of ['GK01', 'GK02', 'GK03']) expect(cardReview(id).status).toBe('RETIRED');
    expect(LEGACY_PROPOSAL_REVIEW.status).toBe('NEEDS_TACTICAL_AUTHORING_REVIEW');
  });

  it('blocks all 108 sessions x 9 roles from scored training, with no fallback plan', () => {
    let n = 0;
    for (const s of sessions) for (const r of [...GAME, 'GK'] as const) {
      const g = scoredSession(s.id, r);
      expect(g.ok, `${s.id} ${r}`).toBe(false);
      if (!g.ok) expect(g.blockers[0]).toMatch(r === 'GK' ? /no goalkeeper decision sessions/ : /^No approved situation is mapped to/);
      expect('plan' in g).toBe(false);
      n++;
    }
    expect(n).toBe(972);
    expect(scoredSession('S9-W99-Z', 'CB')).toEqual({ ok: false, blockers: ['Session S9-W99-Z is not in the schedule.'] });
  });

  // Test-only stand-in scenes for CB01-CB03 to exercise the approval rules. Positions are placeholders, not reviewed content.
  const all = [...LIBRARY_ROSTERS.H, ...LIBRARY_ROSTERS.A].map((a) => a.id);
  const pitch = { ...LIBRARY_PITCH, local_rules_verified: true };
  const make = (id: string, i: number): LibraryScene => {
    const c = LIBRARY_CARDS.find((x) => x.id === id)!;
    const shown = new Set([...c.required_visible_actor_ids, c.protagonist, c.ball_owner_at_freeze]);
    return {
      cardId: id, sceneId: `${id}-test`, fixture: { ...ALL_FIXTURES[i]!, id: `${id}-reviewed` },
      numeric: {
        units: 'm', pitch: { length_m: LIBRARY_PITCH.length_m, width_m: LIBRARY_PITCH.width_m }, view: { kind: 'area', min: { x: 0, y: 0 }, max: { x: 45.72, y: 30 } },
        actors: [...shown].map((a, k) => ({ id: a, pos: { x: 2 + k * 3, y: 15 }, vel: { x: 0, y: 0 }, facingDeg: 0 })),
        omitted: all.filter((a) => !shown.has(a)).map((a) => ({ id: a, reason: 'test only' })),
        ball: { pos: { x: 5, y: 15 }, vel: { x: 0, y: 0 }, owner: c.ball_owner_at_freeze }, events: [], localRules: 'test only',
      },
    };
  };
  const ids = ['CB01', 'CB02', 'CB03'];
  const scenes = Object.fromEntries(ids.map((id, i) => [id, make(id, i)]));
  const signFor = (s: LibraryScene): Signoff => ({ cardId: s.cardId, cardSha256: LIBRARY_CARDS.find((c) => c.id === s.cardId)!.cardSha256, rulesSha256: rulesSha256(pitch), sceneId: s.sceneId, sceneSha256: sceneSha256(s), reviewer: 'test', date: '2026-10-26', note: 'test only' });
  const card = LIBRARY_CARDS.find((c) => c.id === 'CB01')!;
  const scene = scenes.CB01!;
  const sign = signFor(scene);
  const s0 = sessions[0]!.id;
  const mapping = { [s0]: { CB: ids } };
  const fixtureCheck = (): string[] => [];
  const ok = { mapping, scenes, signoffs: ids.map((id) => signFor(scenes[id]!)), pitch, fixtureCheck };

  it('current sign-offs on the exact cards, rules and scenes open only that mapped route, and it plays the signed scenes', () => {
    expect(sceneProblems(card, scene)).toEqual([]);
    expect(cardReview('CB01', ok)).toEqual({ status: 'APPROVED', blockers: [] });
    const g = scoredSession(s0, 'CB', ok);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.scenes).toEqual(ids.map((id) => scenes[id]!.fixture));
    const run = new SituationSession(g.plan, 'run-test', 7, g.scenes);
    expect(g.plan.moments.map((m) => run.fixtureOf(m.fixtureId)?.id)).toEqual(['CB01-reviewed', 'CB02-reviewed', 'CB03-reviewed']);
    expect(run.fixtureOf(ALL_FIXTURES[0]!.id)).toBeNull();
    expect(scoredSession(s0, 'LB', ok).ok).toBe(false);
    expect(scoredSession(s0, 'CB', { ...ok, mapping: { [s0]: { LB: ids } } }).ok).toBe(false);
  });

  it('a signed scene stays blocked until its played fixture is checked against the numeric scene', () => {
    const noCheck = { mapping, scenes, signoffs: ok.signoffs, pitch };
    const r = cardReview('CB01', noCheck);
    expect(r.status).toBe('DRAFT_BLOCKED_FOR_PLAYER_TRAINING');
    expect(r.blockers).toEqual(['CB01: the played fixture cannot yet be checked against the signed numeric scene (no numeric-scene player exists).']);
    expect(scoredSession(s0, 'CB', noCheck).ok).toBe(false);
    expect(scoredSession(s0, 'CB', { ...ok, fixtureCheck: (x) => (x.cardId === 'CB02' ? ['CB02: fixture places H_CB elsewhere.'] : []) })).toEqual({ ok: false, blockers: ['CB02: fixture places H_CB elsewhere.'] });
  });

  it('a route needs exactly three approved moments', () => {
    for (const m of [['CB01'], ['CB01', 'CB02'], [...ids, 'CB01']]) {
      const g = scoredSession(s0, 'CB', { ...ok, mapping: { [s0]: { CB: m } } });
      expect(g.ok, m.join()).toBe(false);
      if (!g.ok) expect(g.blockers).toContain(`${s0} CB maps ${m.length} card(s); a round needs exactly 3 approved moments.`);
    }
  });

  it('card, rules or scene changes invalidate the sign-off until re-reviewed', () => {
    const edited = LIBRARY_CARDS.map((c) => (c.id === 'CB01' ? { ...c, preferred_decision: 'join LB at the ball.', cardSha256: node(stableJson({ ...c, preferred_decision: 'x' })) } : c));
    expect(cardReview('CB01', { ...ok, cards: edited }).blockers).toContain('CB01: library card changed after sign-off; re-review required.');
    // Signed while local rules were unverified: flipping the flag changes the rules profile, so the old sign-off is stale.
    const old = { ...sign, rulesSha256: LIBRARY.rulesSha256 };
    expect(rulesSha256()).toBe(LIBRARY.rulesSha256);
    const flipped = cardReview('CB01', { ...ok, signoffs: [old] });
    expect(flipped.status).toBe('APPROVAL_STALE');
    expect(flipped.blockers).toContain('CB01: rules profile (pitch or rosters) changed after sign-off; re-review required.');
    expect(cardReview('CB01', { ...ok, pitch: { ...pitch, width_m: 40 } }).status).not.toBe('APPROVED');
    const moved = { ...scene, numeric: { ...scene.numeric, actors: scene.numeric.actors.map((a, i) => (i === 0 ? { ...a, pos: { x: a.pos.x + 1, y: a.pos.y } } : a)) } };
    const r = cardReview('CB01', { ...ok, scenes: { ...scenes, CB01: moved } });
    expect(r.status).toBe('APPROVAL_STALE');
    expect(r.blockers).toContain('CB01: scene changed after sign-off; re-review required.');
  });

  it('a scene with an extra or neutral player, a hidden required actor or the wrong ball owner cannot be approved', () => {
    const extra = { ...scene, numeric: { ...scene.numeric, actors: [...scene.numeric.actors, { id: 'NEUTRAL_1', pos: { x: 1, y: 1 }, vel: { x: 0, y: 0 }, facingDeg: 0 }] } };
    expect(sceneProblems(card, extra)).toContain('CB01: NEUTRAL_1 is not one of the 18 roster actors.');
    const hidden = { ...scene, numeric: { ...scene.numeric, actors: scene.numeric.actors.filter((a) => a.id !== 'A_ST'), omitted: [...scene.numeric.omitted, { id: 'A_ST', reason: 'x' }] } };
    expect(sceneProblems(card, hidden)).toContain('CB01: required actor A_ST is not shown.');
    const dup = { ...scene, numeric: { ...scene.numeric, omitted: [...scene.numeric.omitted, { id: 'H_CB', reason: 'x' }] } };
    expect(sceneProblems(card, dup)).toContain('CB01: an actor appears twice.');
    const ball = { ...scene, numeric: { ...scene.numeric, ball: { ...scene.numeric.ball, owner: 'A_ST' } } };
    expect(sceneProblems(card, ball)[0]).toMatch(/ball is with A_ST/);
    const off = { ...scene, numeric: { ...scene.numeric, actors: scene.numeric.actors.map((a) => (a.id === 'A_ST' ? { ...a, pos: { x: 60, y: 15 } } : a)) } };
    expect(sceneProblems(card, off)).toEqual(['CB01: required actor A_ST is outside the area view.']);
    const half = { ...scene, numeric: { ...scene.numeric, view: { kind: 'half' as const, min: { x: 0, y: 34.29 }, max: { x: 45.72, y: 68.58 } } } };
    expect(sceneProblems(card, half)).toContain('CB01: the ball is outside the half view.');
    for (const s of [extra, hidden, ball, off, half]) {
      const sg = { ...sign, sceneSha256: sceneSha256(s) };
      expect(cardReview('CB01', { scenes: { CB01: s }, signoffs: [sg], pitch, fixtureCheck }).status, 'signed but invalid').toBe('DRAFT_BLOCKED_FOR_PLAYER_TRAINING');
    }
  });

  it('a mapping to a missing, retired or unsigned card is blocked, never replaced', () => {
    const missing = scoredSession(s0, 'CB', { ...ok, mapping: { [s0]: { CB: ['CB01', 'CB02', 'NOPE01'] } } });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.blockers).toEqual([`No card "NOPE01" in ${LIBRARY.file} v${LIBRARY.version}.`]);
    expect(scoredSession(s0, 'CB', { ...ok, mapping: { [s0]: { CB: ['CB01', 'CB02', 'GK01'] } } }).ok).toBe(false);
    expect(scoredSession(s0, 'CB', { ...ok, signoffs: [] }).ok).toBe(false);
    expect(scoredSession(s0, 'CB', { ...ok, mapping: { [s0]: { CB: ['CB01', 'CB02', 'CB04'] } } }).ok).toBe(false);
  });
});
