import { describe, expect, it } from 'vitest';
import { CURRICULUM, publishedLevels } from '../src/game/career/curriculum';
import { DEMO_PROTOTYPES, resolveSteps, stepAt, demoDuration } from '../src/game/career/curriculum/demos';
import type { Manifest } from '../src/game/career/curriculum/manifest';

const m = (CURRICULUM as { ok: true; manifest: Manifest }).manifest;

describe('demo prototypes (review-only)', () => {
  it('covers exactly the six packaged prototypes in order', () => {
    expect(DEMO_PROTOTYPES.map((d) => d.levelId)).toEqual(['BM01-L1', 'DR01-L1', 'TR01-L1', 'PA02-L1', 'JU01-L1', 'FI01-L1']);
  });
  it.each(DEMO_PROTOTYPES.map((d) => [d.levelId, d] as const))('%s: contact and bounce counts match the option', (_id, d) => {
    const steps = resolveSteps(d, 'right');
    expect(steps.filter((s) => s.contact).length).toBe(d.expected.contacts);
    expect(steps.filter((s) => s.bounce).length).toBe(d.expected.bounces);
    expect(steps[0]!.phase).toBe('setup');
    expect(steps.at(-1)!.phase).toBe('reset');
    for (let i = 1; i < steps.length; i++) expect(steps[i]!.ballFrom).toEqual(steps[i - 1]!.ballTo);
    expect(m.families.some((f) => f.levels.some((l) => l.id === d.levelId))).toBe(true);
  });
  it('JU01-L1 has a bounce; the ground prototypes never leave the floor', () => {
    expect(resolveSteps(DEMO_PROTOTYPES[4]!, 'right').some((s) => s.bounce)).toBe(true);
    for (const d of DEMO_PROTOTYPES.filter((x) => x.levelId !== 'JU01-L1')) expect(d.steps.every((s) => s.air === 0)).toBe(true);
  });
  it('left mirrors limb and direction but keeps every contact surface', () => {
    for (const d of DEMO_PROTOTYPES) {
      const r = resolveSteps(d, 'right');
      const l = resolveSteps(d, 'left');
      r.forEach((s, i) => {
        expect(l[i]!.ballFrom.x).toBeCloseTo(10 - s.ballFrom.x);
        if (s.contact) {
          expect(l[i]!.contact!.surface).toBe(s.contact.surface);
          expect(l[i]!.contact!.side).toBe(s.contact.side === 'right' ? 'left' : 'right');
        }
      });
    }
  });
  it('every prototype carries open blockers and none is published', () => {
    for (const d of DEMO_PROTOTYPES) expect(d.blockers.length).toBeGreaterThan(0);
    expect(publishedLevels()).toEqual([]);
  });
  it('stepAt loops deterministically', () => {
    const d = DEMO_PROTOTYPES[0]!;
    expect(stepAt(d, 0)).toEqual({ index: 0, f: 0 });
    expect(stepAt(d, demoDuration(d)).index).toBe(0);
  });
});
