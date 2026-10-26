/** Authoring helpers for the situation fixtures (metres on the visible half; see ../types.ts). */
import type { RoleId } from '../../ref/catalog.mjs';
import { HALF_L, HALF_W, type FixtureActor, type FixtureOption, type OptionGrade, type OptionKind, type OutcomeKind, type P, type Verdict } from '../types';

export const W = HALF_W;
export const L = HALF_L;
export const CX = HALF_W / 2;

export const p = (x: number, y: number): P => ({ x, y });

export function us(slot: string, role: RoleId, x: number, y: number, task: string, passage?: P): FixtureActor {
  return { slot, side: role === 'GK' ? 'GK_A' : 'A', role, at: p(x, y), task, ...(passage ? { passage } : {}) };
}

export function them(slot: string, role: RoleId, x: number, y: number, task: string, passage?: P): FixtureActor {
  return { slot, side: role === 'GK' ? 'GK_B' : 'B', role, at: p(x, y), task, ...(passage ? { passage } : {}) };
}

export function opt(id: string, kind: OptionKind, label: string, point: P, toSlot?: string, lofted?: boolean): FixtureOption {
  return { id, kind, label, point, ...(toSlot ? { toSlot } : {}), ...(lofted ? { lofted } : {}) };
}

const QUALITY: Record<Verdict, number> = { good: 1, ok: 0.5, poor: 0 };

export function grade(verdict: Verdict, expect: OutcomeKind, reasons: string[], extra: Omit<OptionGrade, 'verdict' | 'quality' | 'expect' | 'reasons'> = {}): OptionGrade {
  return { verdict, quality: QUALITY[verdict], expect, reasons, ...extra };
}
