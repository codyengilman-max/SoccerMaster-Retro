import { CAREER_CONFIG } from './config';
import { ALL_ACTIVITIES, FOCUSES, HOME_ACTIVITIES, activityById, focusById } from './catalog';
import { LEVEL_NAMES, SKILL_FAMILY_LABELS, type Activity, type Level } from './types';

export interface PlannerInput {
  /** 'ballOnly': nothing but a ball. 'optional': cones/markers, a wall or a low target may be used. */
  readonly equipment: 'ballOnly' | 'optional';
  readonly space: 'small' | 'medium';
  readonly setting: 'indoor' | 'outdoor';
  /** A safe outdoor place to strike firmly (net, fence, open park). */
  readonly striking: boolean;
  readonly minutes: number;
}

export type ItemRole = 'familiar' | 'variation' | 'challenge' | 'application';

export interface PlannedItem {
  readonly activityId: string;
  readonly version: number;
  readonly variantId: string | null;
  readonly role: ItemRole;
  readonly ballOnly: boolean;
  readonly minutes: number;
  readonly substitutedFrom?: string;
}

export interface PlannedSession {
  readonly id: string;
  readonly week: number;
  readonly index: number;
  readonly focusId: string;
  readonly minutes: number;
  readonly items: readonly PlannedItem[];
}

export interface WeekPlan {
  readonly week: number;
  readonly focusId: string;
  readonly level: Level;
  readonly input: PlannerInput;
  readonly sessions: readonly PlannedSession[];
}

export type PlanResult =
  | { readonly ok: true; readonly plan: WeekPlan }
  | { readonly ok: false; readonly reason: string; readonly alternatives: readonly string[] };

export const DEFAULT_INPUT: PlannerInput = { equipment: 'ballOnly', space: 'small', setting: 'indoor', striking: false, minutes: CAREER_CONFIG.home.minutesDefault };

export function sessionId(week: number, index: number): string {
  return `w${week}-s${index + 1}`;
}

/** Can this activity be done honestly with what the player has? */
export function suitable(a: Activity, input: PlannerInput): boolean {
  if (input.setting === 'indoor' ? !a.indoor : !a.outdoor) return false;
  if (a.space === 'medium' && input.space === 'small') return false;
  if (a.strikingArea && !(input.striking && input.setting === 'outdoor')) return false;
  if (input.equipment === 'ballOnly' && needsBallOnly(a) && !a.ballOnly) return false;
  return true;
}

function needsBallOnly(a: Activity): boolean {
  return a.equipment.optional.some((q) => q !== 'audio');
}

function poolFor(focusId: string, level: Level, input: PlannerInput, list: readonly Activity[] = ALL_ACTIVITIES): Activity[] {
  return list.filter((a) => a.focusId === focusId && a.entryLevel <= Math.min(5, level + 1) && suitable(a, input)).sort(
    (a, b) => a.entryLevel - b.entryLevel || a.id.localeCompare(b.id),
  );
}

/** Focuses that can be practised honestly with this setup. */
export function workableFocuses(level: Level, input: PlannerInput): string[] {
  return FOCUSES.filter((f) => typeof buildPlan(1, f.id, level, input, null) !== 'string').map((f) => f.id);
}

function describeSetup(input: PlannerInput): string {
  return `${input.space} ${input.setting} space, ${input.equipment === 'ballOnly' ? 'ball only' : 'optional equipment'}, ${input.striking ? 'with' : 'no'} striking area`;
}

function clampMinutes(m: number): number {
  const H = CAREER_CONFIG.home;
  return Number.isFinite(m) ? Math.min(H.minutesMax, Math.max(H.minutesMin, Math.round(m))) : H.minutesDefault;
}

/** The setup as the save stores it: known values only, minutes clamped, striking only outdoors. */
export function normalizeInput(raw: PlannerInput): PlannerInput {
  const setting = raw.setting === 'outdoor' ? 'outdoor' : 'indoor';
  return {
    equipment: raw.equipment === 'optional' ? 'optional' : 'ballOnly',
    space: raw.space === 'medium' ? 'medium' : 'small',
    setting,
    striking: raw.striking === true && setting === 'outdoor',
    minutes: clampMinutes(raw.minutes),
  };
}

function item(a: Activity, role: ItemRole, level: Level, input: PlannerInput, minutes: number, variantTurn: number): PlannedItem {
  const variants = a.variants.filter((v) => v.level <= Math.min(5, level + 1));
  const variantId = role === 'variation' && variants.length > 0 ? variants[variantTurn % variants.length]!.id : null;
  return { activityId: a.id, version: a.version, variantId, role, ballOnly: input.equipment === 'ballOnly' && needsBallOnly(a), minutes };
}

export function configKey(s: PlannedSession): string {
  return s.items.map((i) => `${i.activityId}:${i.variantId ?? '-'}`).join('|');
}

/**
 * Three optional sessions for one numbered career week around one focus. Deterministic: same inputs,
 * same plan. No clock is read. Each session has a familiar piece, a meaningful variation, a manageable
 * challenge and (where the focus has one) a linked application piece. One activity group per session.
 */
export function planWeek(week: number, focusId: string, level: Level, rawInput: PlannerInput, previous?: PlannedSession | null): PlanResult {
  const input: PlannerInput = { ...rawInput, minutes: clampMinutes(rawInput.minutes) };
  const r = buildPlan(week, focusId, level, input, previous ?? null);
  if (typeof r === 'string') return { ok: false, reason: r, alternatives: workableFocuses(level, input).filter((id) => id !== focusId) };
  return { ok: true, plan: r };
}

function buildPlan(week: number, focusId: string, level: Level, input: PlannerInput, previous: PlannedSession | null): WeekPlan | string {
  const focus = focusById(focusId);
  if (!focus) return 'Unknown focus.';
  const pool = poolFor(focusId, level, input);
  const groups = new Set(pool.map((a) => a.variantGroupId));
  if (groups.size < 2) {
    return `“${focus.label}” (${SKILL_FAMILY_LABELS[focus.family]}) can't be practised honestly at ${LEVEL_NAMES[level]} with a ${describeSetup(input)}.`;
  }
  const below = pool.filter((a) => a.entryLevel < level);
  const atOrAbove = pool.filter((a) => a.entryLevel >= level);
  const familiarPool = below.length > 0 ? below : pool;
  const challengePool = atOrAbove.length > 0 ? atOrAbove : pool.slice().reverse();
  const appPool = pool.filter((a) => a.application);

  const sessions: PlannedSession[] = [];
  let prev = previous;
  for (let i = 0; i < CAREER_CONFIG.home.sessionsPerWeek; i++) {
    let session: PlannedSession | null = null;
    for (let shift = 0; shift < pool.length * 2 && !session; shift++) {
      const turn = week + i + shift;
      const picked: { a: Activity; role: ItemRole }[] = [];
      const used = new Set<string>();
      const take = (list: Activity[], role: ItemRole, offset: number) => {
        for (let k = 0; k < list.length; k++) {
          const a = list[(offset + k) % list.length]!;
          if (!used.has(a.variantGroupId)) {
            used.add(a.variantGroupId);
            picked.push({ a, role });
            return;
          }
        }
      };
      take(familiarPool, 'familiar', turn);
      take(pool, 'variation', turn + 1);
      take(challengePool, 'challenge', turn);
      if (appPool.length > 0) take(appPool, 'application', turn);
      const minutes = input.minutes;
      const each = Math.max(2, Math.round(minutes / picked.length));
      const candidate: PlannedSession = {
        id: sessionId(week, i),
        week,
        index: i,
        focusId,
        minutes,
        items: picked.map((p) => item(p.a, p.role, level, input, each, turn)),
      };
      if (!prev || configKey(prev) !== configKey(candidate)) session = candidate;
    }
    if (!session) return `“${focus.label}” doesn't have enough different activities for three varied sessions with a ${describeSetup(input)}.`;
    sessions.push(session);
    prev = session;
  }
  return { week, focusId, level, input, sessions };
}

/** Same-focus, same-setup alternatives for one item. Substituting keeps the session (and its single credit). */
export function substitutes(plan: WeekPlan, sessionIdValue: string, index: number): Activity[] {
  const s = plan.sessions.find((x) => x.id === sessionIdValue);
  const current = s?.items[index];
  if (!s || !current) return [];
  const usedGroups = new Set(s.items.map((i) => activityById(i.activityId)?.variantGroupId));
  // Plans are built from the originals only; owner-enabled v1.1 drafts are offered as swaps in the same focus.
  return poolFor(plan.focusId, plan.level, plan.input, HOME_ACTIVITIES).filter((a) => !usedGroups.has(a.variantGroupId));
}

export function substitute(plan: WeekPlan, sessionIdValue: string, index: number, activityId: string): WeekPlan | null {
  const a = substitutes(plan, sessionIdValue, index).find((x) => x.id === activityId);
  if (!a) return null;
  return {
    ...plan,
    sessions: plan.sessions.map((s) =>
      s.id !== sessionIdValue
        ? s
        : {
            ...s,
            items: s.items.map((it, k) =>
              k !== index ? it : { ...item(a, it.role, plan.level, plan.input, it.minutes, 0), substitutedFrom: it.activityId },
            ),
          },
    ),
  };
}
