import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sessions } from '../src/game/training12/ref/seasons.mjs';
import { scoredSession } from '../src/game/training12/library/gate';
import { briefReview, contentHash, LEGACY_PROPOSAL_REVIEW, LIBRARY_SCENES, SIGNOFFS } from '../src/game/training12/library/review';
import { LIBRARY_V1, LIBRARY_V1_BRIEFS, LIBRARY_V1_SOURCES } from '../src/game/training12/library/tacticalLibraryV1.generated';
import type { LibraryBrief, Signoff } from '../src/game/training12/library/types';
import { ALL_FIXTURES } from '../src/game/training12/situations/index';

const md = readFileSync(LIBRARY_V1.path, 'utf8');
const sha = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');
const ROLES = ['GK', 'CB', 'LB', 'RB', '6', '8', '9', 'LW', 'RW'] as const;
const FIELDS = ['setup', 'preferredCondition', 'acceptableAlternative', 'misconception', 'teamResponse', 'coachFeedback', 'counterfactualTest'] as const;

describe('9v9 Tactical Library v1 import', () => {
  it('pins the committed library file by SHA-256', () => {
    expect(sha(readFileSync(LIBRARY_V1.path))).toBe(LIBRARY_V1.sha256);
    expect(LIBRARY_V1.status).toBe('SOURCE_INFORMED_DRAFT');
  });

  it('imports all 27 briefs verbatim, three per role, with every required field taken from the brief text', () => {
    expect(LIBRARY_V1_BRIEFS).toHaveLength(27);
    expect(new Set(LIBRARY_V1_BRIEFS.map((b) => b.id)).size).toBe(27);
    for (const r of ROLES) expect(LIBRARY_V1_BRIEFS.filter((b) => b.role === r), r).toHaveLength(3);
    for (const b of LIBRARY_V1_BRIEFS) {
      expect(md, b.id).toContain(`### ${b.id} — ${b.title} [${b.sourceIds.join(',')}]\n${b.text}\n`);
      expect(sha(b.text), b.id).toBe(b.briefSha256);
      for (const f of FIELDS) {
        expect(b[f].length, `${b.id}.${f}`).toBeGreaterThan(3);
        expect(b.text, `${b.id}.${f}`).toContain(b[f]);
      }
      if (b.mirrorOf) expect(LIBRARY_V1_BRIEFS.some((x) => x.id === b.mirrorOf), b.id).toBe(true);
    }
  });

  it('every cited source resolves to the source register', () => {
    expect(LIBRARY_V1_SOURCES.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']);
    for (const b of LIBRARY_V1_BRIEFS) for (const id of b.sourceIds) expect(LIBRARY_V1_SOURCES.some((s) => s.id === id), `${b.id} ${id}`).toBe(true);
  });
});

describe('review gate fails closed', () => {
  it('has no sign-offs or validated scenes, so every brief is a draft with exact blockers', () => {
    expect(SIGNOFFS).toEqual([]);
    expect(Object.keys(LIBRARY_SCENES)).toEqual([]);
    for (const b of LIBRARY_V1_BRIEFS) {
      const r = briefReview(b.id);
      expect(r.status).toBe('SOURCE_INFORMED_DRAFT');
      expect(r.blockers).toEqual([`${b.id}: no executable scene has been built and validated from this brief.`, `${b.id}: no Coach Cody sign-off.`]);
    }
    expect(LEGACY_PROPOSAL_REVIEW.status).toBe('NEEDS_TACTICAL_AUTHORING_REVIEW');
  });

  it('blocks all 108 sessions x 9 roles from scored training, with no fallback plan', () => {
    let n = 0;
    for (const s of sessions) for (const r of ROLES) {
      const g = scoredSession(s.id, r);
      expect(g.ok, `${s.id} ${r}`).toBe(false);
      if (!g.ok) expect(g.blockers[0]).toMatch(/^No approved situation is mapped to/);
      expect('plan' in g).toBe(false);
      n++;
    }
    expect(n).toBe(972);
    expect(scoredSession('S9-W99-Z', 'GK')).toEqual({ ok: false, blockers: ['Session S9-W99-Z is not in the schedule.'] });
  });

  // Test-only stand-in: a fixture object used as "the scene" to exercise the approval rules. Not real approved content.
  const scene = ALL_FIXTURES[0]!;
  const brief = LIBRARY_V1_BRIEFS[0]!;
  const sign: Signoff = { briefId: brief.id, briefSha256: brief.briefSha256, sceneId: scene.id, sceneHash: contentHash(scene), reviewer: 'test', date: '2026-10-26', note: 'test only' };
  const s0 = sessions[0]!.id;
  const mapping = { [s0]: { GK: [brief.id] } };

  it('a current sign-off on the exact brief and scene opens only that mapped route', () => {
    expect(briefReview(brief.id, { scenes: { [brief.id]: scene }, signoffs: [sign] })).toEqual({ status: 'APPROVED', blockers: [] });
    const g = scoredSession(s0, 'GK', { mapping, scenes: { [brief.id]: scene }, signoffs: [sign] });
    expect(g.ok).toBe(true);
    if (g.ok) expect(g.plan.moments.map((m) => m.fixtureId)).toEqual([scene.id]);
    expect(scoredSession(s0, 'CB', { mapping, scenes: { [brief.id]: scene }, signoffs: [sign] }).ok).toBe(false);
  });

  it('a change to the library text invalidates the sign-off until re-reviewed', () => {
    const edited: LibraryBrief[] = LIBRARY_V1_BRIEFS.map((b) => (b.id === brief.id ? { ...b, text: b.text + ' x', briefSha256: sha(b.text + ' x') } : b));
    const r = briefReview(brief.id, { briefs: edited, scenes: { [brief.id]: scene }, signoffs: [sign] });
    expect(r.status).toBe('APPROVAL_STALE');
    expect(r.blockers).toContain(`${brief.id}: library text changed after sign-off; re-review required.`);
    expect(scoredSession(s0, 'GK', { mapping, briefs: edited, scenes: { [brief.id]: scene }, signoffs: [sign] }).ok).toBe(false);
  });

  it('a change to the scene (players, pressure, options or grades) invalidates the sign-off', () => {
    const moved = { ...scene, actors: scene.actors.map((a, i) => (i === 0 ? { ...a, at: { ...a.at, x: a.at.x + 1 } } : a)) };
    const r = briefReview(brief.id, { scenes: { [brief.id]: moved }, signoffs: [sign] });
    expect(r.status).toBe('APPROVAL_STALE');
    expect(r.blockers).toContain(`${brief.id}: scene changed after sign-off; re-review required.`);
  });

  it('a mapping to a missing brief or a missing scene is blocked, never replaced', () => {
    const g = scoredSession(s0, 'GK', { mapping: { [s0]: { GK: ['NOPE01'] } } });
    expect(g).toEqual({ ok: false, blockers: [`No brief "NOPE01" in ${LIBRARY_V1.file}.`] });
    const h = scoredSession(s0, 'GK', { mapping, signoffs: [sign] });
    expect(h.ok).toBe(false);
    const half = scoredSession(s0, 'GK', { mapping: { [s0]: { GK: [brief.id, LIBRARY_V1_BRIEFS[1]!.id] } }, scenes: { [brief.id]: scene }, signoffs: [sign] });
    expect(half.ok).toBe(false);
  });
});
