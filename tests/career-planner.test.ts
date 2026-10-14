import { describe, expect, it } from 'vitest';
import { ALL_ACTIVITIES, FOCUSES, activityById } from '../src/game/career/catalog';
import { DEFAULT_INPUT, configKey, planWeek, substitute, substitutes, suitable, type PlannerInput } from '../src/game/career/planner';
import { LEVELS } from '../src/game/career/types';

const INPUTS: PlannerInput[] = [];
for (const equipment of ['ballOnly', 'optional'] as const)
  for (const space of ['small', 'medium'] as const)
    for (const setting of ['indoor', 'outdoor'] as const)
      for (const striking of [false, true]) INPUTS.push({ equipment, space, setting, striking, minutes: 10 });

describe('M6 weekly planner', () => {
  it('every focus x level x setup either gives three honest sessions or explains why not', () => {
    let ok = 0;
    let refused = 0;
    for (const f of FOCUSES)
      for (const level of LEVELS)
        for (const input of INPUTS) {
          const r = planWeek(3, f.id, level, input);
          if (!r.ok) {
            refused++;
            expect(r.reason.length).toBeGreaterThan(10);
            expect(r.alternatives).not.toContain(f.id);
            continue;
          }
          ok++;
          const { sessions } = r.plan;
          expect(sessions.map((s) => s.id)).toEqual(['w3-s1', 'w3-s2', 'w3-s3']);
          for (let i = 0; i < sessions.length; i++) {
            const s = sessions[i]!;
            if (i > 0) expect(configKey(s)).not.toBe(configKey(sessions[i - 1]!));
            const groups = s.items.map((it) => activityById(it.activityId)!.variantGroupId);
            expect(new Set(groups).size).toBe(groups.length);
            expect(s.items.some((it) => it.role === 'familiar')).toBe(true);
            expect(s.items.length).toBeGreaterThanOrEqual(2);
            for (const it of s.items) {
              const a = activityById(it.activityId)!;
              expect(suitable(a, input), `${a.id} ${JSON.stringify(input)}`).toBe(true);
              expect(a.focusId).toBe(f.id);
              expect(a.entryLevel).toBeLessThanOrEqual(Math.min(5, level + 1));
              if (input.equipment === 'ballOnly' && a.equipment.optional.some((q) => q !== 'audio')) expect(it.ballOnly).toBe(true);
              if (a.strikingArea) expect(input.setting === 'outdoor' && input.striking).toBe(true);
            }
          }
        }
    expect(ok).toBeGreaterThan(refused);
  });

  it('ball-only small indoor space works for most focuses and refuses striking focuses honestly', () => {
    const r = planWeek(1, 'fn-moving-ball', 2, DEFAULT_INPUT);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/can't be practised honestly/);
      expect(r.alternatives.length).toBeGreaterThan(5);
    }
    for (const id of ['ft-cushion', 'ps-accuracy', 'dr-close-control', 'df-stance', 'aw-scan']) expect(planWeek(1, id, 1, DEFAULT_INPUT).ok, id).toBe(true);
  });

  it('never needs a wall, goal, yard or audio: only a ball is required', () => {
    expect(ALL_ACTIVITIES.every((a) => a.equipment.required.join() === 'ball')).toBe(true);
  });

  it('is deterministic and avoids repeating the last session of the previous week', () => {
    const a = planWeek(4, 'ps-accuracy', 2, DEFAULT_INPUT);
    const b = planWeek(4, 'ps-accuracy', 2, DEFAULT_INPUT);
    expect(a).toEqual(b);
    if (!a.ok) throw new Error('plan');
    const next = planWeek(5, 'ps-accuracy', 2, DEFAULT_INPUT, a.plan.sessions[2]);
    if (!next.ok) throw new Error('plan');
    expect(configKey(next.plan.sessions[0]!)).not.toBe(configKey(a.plan.sessions[2]!));
  });

  it('clamps non-finite or extreme minutes', () => {
    for (const minutes of [Number.NaN, -5, 1e9, Number.POSITIVE_INFINITY]) {
      const r = planWeek(1, 'ft-cushion', 1, { ...DEFAULT_INPUT, minutes });
      if (!r.ok) throw new Error('plan');
      expect(r.plan.sessions[0]!.minutes).toBeGreaterThanOrEqual(6);
      expect(r.plan.sessions[0]!.minutes).toBeLessThanOrEqual(20);
    }
  });

  it('substitution stays inside the same session and focus', () => {
    const r = planWeek(2, 'dr-close-control', 3, { ...DEFAULT_INPUT, equipment: 'optional' });
    if (!r.ok) throw new Error('plan');
    const s = r.plan.sessions[0]!;
    const alts = substitutes(r.plan, s.id, 0);
    expect(alts.length).toBeGreaterThan(0);
    const next = substitute(r.plan, s.id, 0, alts[0]!.id)!;
    expect(next.sessions.map((x) => x.id)).toEqual(r.plan.sessions.map((x) => x.id));
    expect(next.sessions[0]!.items[0]!.activityId).toBe(alts[0]!.id);
    expect(next.sessions[0]!.items[0]!.substitutedFrom).toBe(s.items[0]!.activityId);
    expect(substitute(r.plan, s.id, 0, 'ps-wide-gate')).toBeNull();
    expect(substitute(r.plan, 'w9-s9', 0, alts[0]!.id)).toBeNull();
  });
});
