/**
 * Current-release Team Training (owner decision D60): one coach-approved All36 scenario per story week for each
 * saved category, normal (base) version only. Deterministic: the table depends on the package alone.
 * Sessions A/B/C stay in ALL36_SCHEDULE for later expansion but are not weekly requirements. Framework-free.
 */
import type { RoleId } from '../ref/catalog.mjs';
import { POSITIONS } from '../../career/types';
import { ALL36_CURRICULUM, ALL36_EPISODES, ALL36_VERSION, CATEGORY_ROLES, GRADE_BAND, PACKAGE_ROLE, episodeById, protagonistRole } from './package';
import { MODES } from './schedule';
import type { Category, ChoiceId, DisplayBand, NoDecision, PackageGrade, PackageRole } from './types';

export const WEEKLY_WEEKS = 18;

/** Narrow-role groups rotated inside a category: outside back / centre back, 6 / 8, winger / 9. */
export const ROLE_GROUP: Readonly<Record<Exclude<RoleId, 'GK'>, string>> = { LB: 'outside back', RB: 'outside back', CB: 'centre back', '6': 'holding midfielder', '8': 'central midfielder', LW: 'winger', RW: 'winger', '9': 'striker' };

export interface WeeklyAssignment {
  readonly week: number;
  readonly category: Category;
  readonly situationId: string;
  readonly variant: 'base';
  readonly packageRole: PackageRole;
  readonly role: Exclude<RoleId, 'GK'>;
  readonly roleGroup: string;
  /** Situation title from the package, e.g. "Own-half superiority — CB". */
  readonly title: string;
  /** Tactical topic: the title without the role suffix. */
  readonly topic: string;
  /** The package curriculum's theme for this week (context only). */
  readonly weekTheme: string;
  /** Curriculum mode where the scenario first appears in Season 1 (its place in the difficulty progression). */
  readonly mode: string;
  /** Second or later use of the scenario in this category: deliberate reinforcement. */
  readonly reinforces: number | null;
  readonly completionKey: string;
  readonly creditKey: string;
}

const s1 = ALL36_CURRICULUM.filter((r) => r.season === 1).slice().sort((a, b) => a.week - b.week);
const roleOf = (id: string): Exclude<RoleId, 'GK'> | null => {
  const e = episodeById(id);
  if (!e) return null;
  const r = protagonistRole(e);
  return r === 'GK' ? null : PACKAGE_ROLE[r];
};
const inCategory = (id: string, c: Category): boolean => {
  const r = roleOf(id);
  return r !== null && CATEGORY_ROLES[c].includes(r);
};
const MODE_RANK = (m: string): number => MODES.indexOf(m);
const firstMode = (id: string): string => s1.find((row) => row.sessions.some((s) => s.decision_ids.includes(id)))?.mode ?? s1[s1.length - 1]!.mode;

function build(c: Category): WeeklyAssignment[] {
  // Progression order: first appearance in the Season 1 curriculum; any scenario it never lists goes last, by ID.
  const order: string[] = [];
  for (const row of s1) for (const s of row.sessions) for (const id of s.decision_ids) if (inCategory(id, c) && !order.includes(id)) order.push(id);
  for (const e of ALL36_EPISODES) if (inCategory(e.id, c) && !order.includes(e.id)) order.push(e.id);
  const last = new Map<string, number>();
  const out: WeeklyAssignment[] = [];
  let prevGroup: string | null = null;
  let run = 0;
  for (let week = 1; week <= WEEKLY_WEEKS; week++) {
    const row = s1.find((r) => r.week === week)!;
    const unused = order.filter((id) => !last.has(id));
    // Every scenario once before any repeat; repeats take the least recently used first (widest spacing).
    const pool = unused.length ? unused : order.slice().sort((a, b) => last.get(a)! - last.get(b)! || order.indexOf(a) - order.indexOf(b));
    const group = (id: string) => ROLE_GROUP[roleOf(id)!];
    let pick: string;
    if (unused.length) {
      // First pass. Candidates: the next unused scenario of each role group, in curriculum order. Prefer, in turn:
      // not a third week running in the same group, the easier curriculum mode, a different group from last week,
      // the group with more scenarios left, then curriculum order.
      const groups = [...new Set(unused.map(group))];
      const next = groups.map((g) => unused.find((id) => group(id) === g)!);
      const left = (g: string) => unused.filter((id) => group(id) === g).length;
      // Feasible: after this pick the largest group can still be split into runs of at most two.
      const feasible = (id: string): boolean => {
        const counts = new Map(groups.map((g) => [g, left(g) - (g === group(id) ? 1 : 0)]));
        const [big, n] = [...counts].sort((x, y) => y[1] - x[1])[0]!;
        const others = [...counts].reduce((t, [g, k]) => (g === big ? t : t + k), 0);
        const runAfter = group(id) === prevGroup ? run + 1 : 1;
        return n <= 2 * (others + 1) - (big === group(id) ? runAfter : 0);
      };
      const rank = (id: string): number[] => [feasible(id) ? 0 : 1, group(id) === prevGroup && run >= 2 ? 1 : 0, MODE_RANK(firstMode(id)), group(id) === prevGroup ? 1 : 0, -left(group(id)), order.indexOf(id)];
      const cmp = (x: number[], y: number[]) => x.reduce((d, v, k) => d || v - y[k]!, 0);
      pick = next.slice().sort((x, y) => cmp(rank(x), rank(y)))[0]!;
    } else {
      pick = pool.find((id) => group(id) !== prevGroup) ?? pool[0]!;
    }
    const e = episodeById(pick)!;
    const role = roleOf(pick)!;
    const first = out.find((a) => a.situationId === pick)?.week ?? null;
    out.push({
      week,
      category: c,
      situationId: pick,
      variant: 'base',
      packageRole: protagonistRole(e),
      role,
      roleGroup: ROLE_GROUP[role],
      title: e.title,
      topic: e.title.split(' — ')[0]!,
      weekTheme: row.theme,
      mode: firstMode(pick),
      reinforces: first,
      completionKey: `${ALL36_VERSION}/weekly/S1-W${String(week).padStart(2, '0')}/${c}`,
      creditKey: `teamTraining/W${week}`,
    });
    last.set(pick, week);
    run = ROLE_GROUP[role] === prevGroup ? run + 1 : 1;
    prevGroup = ROLE_GROUP[role];
  }
  return out;
}

export const WEEKLY_ASSIGNMENTS: Readonly<Record<Category, readonly WeeklyAssignment[]>> = Object.fromEntries(POSITIONS.map((c) => [c, build(c)])) as Record<Category, WeeklyAssignment[]>;

/** The week's assignment, or null for anything outside the table (unknown category, corrupt week). Fail-closed. */
export function weeklyAssignment(week: unknown, category: unknown): WeeklyAssignment | null {
  if (typeof category !== 'string' || !(POSITIONS as readonly string[]).includes(category)) return null;
  if (typeof week !== 'number' || !Number.isInteger(week) || week < 1 || week > WEEKLY_WEEKS) return null;
  return WEEKLY_ASSIGNMENTS[category as Category][week - 1] ?? null;
}

/** Existing Team Training quality (situations/fixtures/common.ts QUALITY: good 1, ok 0.5, poor 0); a timeout is 0. */
export const GRADE_SCORE: Readonly<Record<PackageGrade, number>> = { preferred: 1, acceptable: 0.5, misread: 0 };

export interface WeeklyVerdict {
  readonly choice: ChoiceId | null;
  readonly grade: PackageGrade | null;
  readonly band: DisplayBand | NoDecision;
  readonly score: number;
  readonly answer: string;
  readonly rationale: string;
  /** The coach's best answer when the selected one was not it (or no decision was made). */
  readonly better: string | null;
}

/** Grade a choice from the approved package data only. `null` is a timeout: no-decision, never a band. */
export function gradeWeekly(a: WeeklyAssignment, choice: ChoiceId | null): WeeklyVerdict | null {
  const e = episodeById(a.situationId);
  const v = e?.variants.find((x) => x.id === a.variant);
  if (!e || !v) return null;
  const best = (Object.keys(v.grades) as ChoiceId[]).find((k) => v.grades[k] === 'preferred')!;
  const label = (k: ChoiceId) => `${k}. ${e.choices.find((c) => c.id === k)?.label ?? v.branches[k].label}`;
  if (choice === null) return { choice, grade: null, band: 'no-decision', score: 0, answer: 'No decision (time ran out)', rationale: v.reason, better: label(best) };
  const grade = v.grades[choice];
  if (!grade) return null;
  return { choice, grade, band: GRADE_BAND[grade], score: GRADE_SCORE[grade], answer: label(choice), rationale: `${v.branches[choice].feedback} ${v.reason}`.trim(), better: choice === best ? null : label(best) };
}
