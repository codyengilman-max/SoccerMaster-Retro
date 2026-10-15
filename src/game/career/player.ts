import { CAREER_CONFIG } from './config';
import type { PlayerAttrs } from '../match/types';
import { ATTRIBUTES, type AttributeId, type Position } from './types';

export interface CareerPlayer {
  readonly id: string;
  readonly name: string;
  readonly position: Position;
  /** Story identity (boy/girl): pronouns and presentation only, never abilities. Absent on older saves. */
  readonly gender?: 'boy' | 'girl';
  readonly attributes: Readonly<Record<AttributeId, number>>;
  readonly potential: Readonly<Record<AttributeId, number>>;
}

const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g;

/** Plain text: control and bidi characters removed, whitespace collapsed, length bounded. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return Array.from(raw.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
}

export function cleanName(raw: unknown): string {
  return cleanText(raw, CAREER_CONFIG.limits.nameMax);
}

function filled(value: number): Record<AttributeId, number> {
  return Object.fromEntries(ATTRIBUTES.map((a) => [a, value])) as Record<AttributeId, number>;
}

export function createPlayer(id: string, name: string, position: Position, gender?: 'boy' | 'girl'): CareerPlayer {
  const A = CAREER_CONFIG.attributes;
  const base = { id, name: cleanName(name) || 'Player', position, attributes: filled(A.start), potential: filled(A.potential) };
  return gender === 'boy' || gender === 'girl' ? { ...base, gender } : base;
}

/** Home slot the career player occupies in the sandbox (1-3-2-3 numbering: H2-H4 defence, H5-H6 midfield, H7-H9 attack). */
export const POSITION_SLOT: Readonly<Record<Position, string>> = { DEF: 'H3', MID: 'H5', FWD: 'H8' };

/**
 * Career ratings (1-99) to match multipliers around the starting rating. The career has no pace or
 * acceleration rating, so those stay neutral; control follows first touch and dribbling, agility dribbling.
 */
export function matchAttrsFromCareer(attributes: Readonly<Record<AttributeId, number>>): Partial<PlayerAttrs> {
  const A = CAREER_CONFIG.attributes;
  const m = (v: unknown): number => {
    const x = typeof v === 'number' && Number.isFinite(v) ? Math.min(A.max, Math.max(A.min, v)) : A.start;
    return x >= A.start ? 1 + (0.2 * (x - A.start)) / (A.max - A.start) : 1 - (0.2 * (A.start - x)) / (A.start - A.min);
  };
  return { control: m((attributes.firstTouch + attributes.dribbling) / 2), agility: m(attributes.dribbling) };
}
