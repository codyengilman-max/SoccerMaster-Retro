import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import manifest from '../docs/training/all36/MANIFEST.json';
import { contentSha256 } from '../src/game/training12/library/sha256';
import { SESSION_CARDS } from '../src/game/training12/library/gate';
import { sessions } from '../src/game/training12/ref/seasons.mjs';
import { ALL36_ARCHIVE_SHA256, ALL36_EPISODES, CATEGORY_ROLES, GRADE_BAND, PACKAGE_ROLE, protagonistRole } from '../src/game/training12/all36/package';
import { ALL36_SCHEDULE } from '../src/game/training12/all36/schedule';
import { scheduleMarkdown } from '../src/game/training12/all36/report';

const PKG = 'docs/training/all36/package/';
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

describe('All36 package fingerprints', () => {
  it('records the exact owner ZIP and the package manifest check', () => {
    expect(manifest.archive.sha256).toBe(ALL36_ARCHIVE_SHA256);
    expect(manifest.archive.files).toBe(420);
    expect(manifest.files).toHaveLength(420);
    expect(manifest.packageManifest).toMatchObject({ listed: 419, matched: 419, unlisted: ['SHA256_MANIFEST.json'] });
  });

  it('keeps every committed package file byte-identical to the ZIP', () => {
    const committed = manifest.files.filter((f) => !/\.(png|svg)$/.test(f.path));
    expect(committed).toHaveLength(29);
    for (const f of committed) expect(sha(readFileSync(PKG + f.path)), f.path).toBe(f.sha256);
  });

  it('reproduces the per-situation approval hashes and finds no tactical change since review', () => {
    expect(manifest.scenarios.map((s) => s.id)).toEqual(ALL36_EPISODES.map((e) => e.id));
    const before = JSON.parse(readFileSync(PKG + 'review_history/episodes_before_approval.json', 'utf8')) as { id: string }[];
    for (const s of manifest.scenarios) {
      expect(s.reviewedHashReproduced && s.unchangedSinceReview, s.id).toBe(true);
      expect(sha(JSON.stringify(before.find((b) => b.id === s.id))), s.id).toBe(s.reviewedEpisodeSha256);
      const e = ALL36_EPISODES.find((x) => x.id === s.id)!;
      const { status: _s, approval: _a, ...tactical } = e;
      expect(contentSha256(tactical), s.id).toBe(s.semanticSha256);
    }
  });
});

describe('All36 content and grade bands', () => {
  it('holds 36 situations, 72 variants and 288 grades with one preferred answer per variant', () => {
    expect(ALL36_EPISODES.map((e) => e.id)).toEqual(Array.from({ length: 36 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`));
    const variants = ALL36_EPISODES.flatMap((e) => e.variants);
    expect(variants).toHaveLength(72);
    const grades = variants.flatMap((v) => Object.values(v.grades));
    expect(grades).toHaveLength(288);
    expect(grades.filter((g) => g === 'preferred')).toHaveLength(72);
    expect(grades.filter((g) => g === 'acceptable')).toHaveLength(129);
    expect(grades.filter((g) => g === 'misread')).toHaveLength(87);
    for (const v of variants) expect(Object.values(v.grades).filter((g) => g === 'preferred')).toHaveLength(1);
  });

  it('maps package grades to the owner bands; Strong and Forced are not assigned', () => {
    expect(GRADE_BAND).toEqual({ preferred: 'Elite', acceptable: 'Playable', misread: 'Low-value' });
    expect(Object.values(GRADE_BAND)).not.toContain('Strong');
    expect(Object.values(GRADE_BAND)).not.toContain('Forced');
  });

  it('has no goalkeeper learner and maps DM/CM/ST to 6/8/9', () => {
    expect(PACKAGE_ROLE).toMatchObject({ DM: '6', CM: '8', ST: '9' });
    for (const e of ALL36_EPISODES) expect(protagonistRole(e)).not.toBe('GK');
  });
});

describe('All36 runtime schedule', () => {
  it('has one route per session and category, matching the game session IDs', () => {
    expect(ALL36_SCHEDULE).toHaveLength(36 * 3 * 3);
    const ids = new Set(sessions.map((s) => s.id));
    for (const r of ALL36_SCHEDULE) expect(ids.has(r.sessionId), r.sessionId).toBe(true);
    expect(new Set(ALL36_SCHEDULE.map((r) => r.completionKey)).size).toBe(ALL36_SCHEDULE.length);
  });

  it('assigns only listed situations, in order, for roles in the category, with no substitution', () => {
    for (const r of ALL36_SCHEDULE) {
      const listedInCategory = r.listed.filter((id) => CATEGORY_ROLES[r.category].includes(PACKAGE_ROLE[protagonistRole(ALL36_EPISODES.find((e) => e.id === id)!) as keyof typeof PACKAGE_ROLE]));
      if (r.status === 'mapped') {
        expect(r.assigned.map((a) => a.situationId), r.completionKey).toEqual(listedInCategory);
        expect(r.blockers).toEqual([]);
      } else {
        expect(r.assigned).toEqual([]);
        expect(r.blockers.length).toBeGreaterThan(0);
        for (const b of r.blockers) expect(b).toContain(r.sessionId);
      }
      for (const a of r.assigned) expect(a.variant).toBe(r.slot === 'B' ? 'changed' : 'base');
    }
  });

  it('maps 28 DEF, 38 MID and 28 FWD Season One routes and blocks Season Two by exact session', () => {
    const n = (c: string) => ALL36_SCHEDULE.filter((r) => r.season === 1 && r.category === c && r.status === 'mapped').length;
    expect([n('DEF'), n('MID'), n('FWD')]).toEqual([28, 38, 28]);
    for (const r of ALL36_SCHEDULE.filter((x) => x.season === 2)) expect(r.blockers[0]).toMatch(/^S2-W\d\d-[ABC]: the curriculum asks for ".+", which is not a variant in the package\.$/);
  });

  it('rotates narrow roles inside each broad category', () => {
    for (const [c, roles] of Object.entries(CATEGORY_ROLES)) {
      const used = new Set(ALL36_SCHEDULE.filter((r) => r.category === c).flatMap((r) => r.assigned.map((a) => a.role)));
      expect([...used].sort(), c).toEqual([...roles].sort());
    }
  });

  it('keeps SCHEDULE.md in step with the data and leaves scoring untouched', () => {
    expect(readFileSync('docs/training/all36/SCHEDULE.md', 'utf8')).toBe(scheduleMarkdown());
    expect(SESSION_CARDS).toEqual({});
  });
});
