import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSIGNABLE_DESIGNS, BALL_MASTERY_DESIGNS, DESIGN_MATCHES, DESIGN_SOURCES, HOME_SECTIONS, designsFor, sectionOf } from '../src/game/career/ballMastery';
import { ALL_ACTIVITIES, HOME_ACTIVITIES, activityById } from '../src/game/career/catalog';
import { CURRICULUM } from '../src/game/career/curriculum';
import { SAVE_SCHEMA, emptySave, reduce } from '../src/game/career/state';
import { SKILL_FAMILIES } from '../src/game/career/types';
import { demoBeats, demoLength, nextBeat } from '../src/render/art/homeDemo';

const PKG = join(__dirname, '../research/training/ball-mastery-designs-v1.0');

describe('Ball Mastery designs v1.0 (review only)', () => {
  it('ships the package unchanged: every file matches SHA256.json', () => {
    const sums = JSON.parse(readFileSync(join(PKG, 'SHA256.json'), 'utf8')) as Record<string, string>;
    expect(Object.keys(sums).length).toBe(52);
    for (const [f, h] of Object.entries(sums)) expect(createHash('sha256').update(readFileSync(join(PKG, f))).digest('hex'), f).toBe(h);
  });

  it('loads all 14 designs, each a draft with no approval, no frame review and publication off', () => {
    expect(BALL_MASTERY_DESIGNS).toHaveLength(14);
    for (const d of BALL_MASTERY_DESIGNS) {
      expect(d.status, d.id).toBe('design_draft');
      expect(d.coachApproval, d.id).toBeNull();
      expect(d.frameReviewed, d.id).toBe(false);
      expect(d.publication, d.id).toBe(false);
      expect(d.phases, d.id).toHaveLength(4);
      for (const s of d.sourceIds) expect(DESIGN_SOURCES[s]?.title, `${d.id} ${s}`).toBeTruthy();
    }
  });

  it('keeps every design out of player assignments, the catalog and the planner', () => {
    expect(ASSIGNABLE_DESIGNS).toEqual([]);
    const ids = new Set(BALL_MASTERY_DESIGNS.map((d) => d.id));
    expect(HOME_ACTIVITIES.filter((a) => ids.has(a.id) || /BM-\d/.test(a.id))).toEqual([]);
    const s = reduce(emptySave(), { type: 'createPlayer', id: 'p', name: 'Sam', position: 'MID' });
    let planned = 0;
    for (const f of ['dr-close-control', 'dr-change-direction', 'dr-moves', 'dr-change-pace', 'ft-cushion', 'jg-ladder'] as const) {
      const r = reduce(s.ok ? s.save : emptySave(), { type: 'chooseFocus', focusId: f });
      if (!r.ok || !r.save.plan) continue;
      planned++;
      for (const ses of r.save.plan!.sessions) for (const it of ses.items) expect(activityById(it.activityId), it.activityId).toBeDefined();
    }
    expect(planned).toBeGreaterThanOrEqual(3);
  });

  it('matches every design once; only BM-002 is merged as an equivalent and linked lessons stay unchanged', () => {
    expect(Object.keys(DESIGN_MATCHES).sort()).toEqual(BALL_MASTERY_DESIGNS.map((d) => d.id).sort());
    expect(Object.entries(DESIGN_MATCHES).filter(([, m]) => m.verdict === 'equivalent').map(([id]) => id)).toEqual(['BM-002']);
    const fams = new Set(CURRICULUM.ok ? CURRICULUM.manifest.families.map((f) => f.id) : []);
    for (const [id, m] of Object.entries(DESIGN_MATCHES)) {
      for (const a of m.activities) expect(activityById(a), `${id} -> ${a}`).toBeDefined();
      for (const f of m.draftFamilies) expect(fams.has(f), `${id} -> ${f}`).toBe(true);
      if (m.verdict === 'new') expect(m.activities).toEqual([]);
    }
    expect(designsFor('dr-inside-cut').map((x) => x.design.id)).toEqual(['BM-002']);
    expect(activityById('dr-inside-cut')!.title).toBe('Inside-Cut Escape');
  });

  it('places every existing activity in exactly one of the two Home Training sections', () => {
    expect(Object.keys(HOME_SECTIONS)).toEqual(['juggling', 'ballMastery']);
    expect([...HOME_SECTIONS.juggling, ...HOME_SECTIONS.ballMastery].sort()).toEqual([...SKILL_FAMILIES].sort());
    for (const a of ALL_ACTIVITIES) expect(sectionOf(a), a.id).toBe(a.skillFamilyId === 'juggling' ? 'juggling' : 'ballMastery');
    expect(ALL_ACTIVITIES).toHaveLength(92);
  });

  it('save schema is unchanged, so existing saves load without migration', () => {
    expect(SAVE_SCHEMA).toBe(2);
  });

  it('Step walks the demo pose/contact changes in order and wraps', () => {
    for (const a of ALL_ACTIVITIES.filter((x) => sectionOf(x) === 'ballMastery')) {
      const b = demoBeats(a);
      const len = demoLength(a);
      expect(b[0]).toBe(0);
      for (let i = 1; i < b.length; i++) expect(b[i]!).toBeGreaterThan(b[i - 1]!);
      let t = 0;
      for (let i = 1; i < b.length; i++) expect((t = nextBeat(b, t, len))).toBe(b[i]);
      expect(nextBeat(b, t, len)).toBe(0);
    }
  });
});
