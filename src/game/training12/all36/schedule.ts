/**
 * All36 week-by-week plan (owner decision: the approved schedule) turned into validated runtime routes, one per
 * session and career category. Fail-closed: a route with nothing to assign, or a session whose curriculum asks for
 * a variant the package does not contain, is blocked with the exact IDs. Nothing is substituted. Framework-free.
 */
import { POSITIONS } from '../../career/types';
import { ALL36_CURRICULUM, ALL36_VERSION, CATEGORY_ROLES, PACKAGE_ROLE, episodeById, protagonistRole } from './package';
import type { AssignedSituation, Category, PackageCurriculumRow, PackageCurriculumSession, ScheduleRoute, VariantId } from './types';

/** Curriculum modes in the package's own order, six weeks each: Season 1 uses the first three, Season 2 the last three. */
export const MODES: readonly string[] = ['guided', 'supported', 'mixed_review', 'faded_hints', 'competing_cues', 'transfer_review'];

/**
 * Which approved variant a session plays. Season One A is the base scene, B reverses the cue (the changed
 * variant) and C transfers to other roles "with reviewed geometry" (the base scene of the listed situations).
 * Season Two asks for arrangements the package does not contain, so it has no variant.
 */
export function sessionVariant(row: PackageCurriculumRow, s: PackageCurriculumSession): VariantId | null {
  const plan: Readonly<Record<string, VariantId>> = {
    'Base scene; explicit cues': 'base',
    'Reverse the cue that justified the base answer': 'changed',
    'Different role or flank with reviewed geometry': 'base',
  };
  return row.season === 1 ? (plan[s.variant_to_author] ?? null) : null;
}

export const sessionKey = (season: number, week: number, slot: string): string => `S${season}-W${String(week).padStart(2, '0')}-${slot}`;

function route(row: PackageCurriculumRow, s: PackageCurriculumSession, category: Category): ScheduleRoute {
  const sessionId = sessionKey(row.season, row.week, s.slot);
  const blockers: string[] = [];
  const variant = sessionVariant(row, s);
  if (!variant) blockers.push(`${sessionId}: the curriculum asks for "${s.variant_to_author}", which is not a variant in the package.`);
  const assigned: AssignedSituation[] = [];
  for (const id of s.decision_ids) {
    const e = episodeById(id);
    if (!e) {
      blockers.push(`${sessionId}: ${id} is not in episodes.json.`);
      continue;
    }
    const packageRole = protagonistRole(e);
    if (packageRole === 'GK') continue;
    const role = PACKAGE_ROLE[packageRole];
    if (!CATEGORY_ROLES[category].includes(role)) continue;
    if (variant && !e.variants.some((v) => v.id === variant)) blockers.push(`${sessionId}: ${id} has no ${variant} variant.`);
    if (variant) assigned.push({ situationId: id, variant, packageRole, role, family: e.family_id });
  }
  if (variant && assigned.length === 0) blockers.push(`${sessionId} ${category}: none of ${s.decision_ids.join(', ')} is a ${CATEGORY_ROLES[category].join('/')} situation.`);
  const mode = MODES.indexOf(row.mode);
  if (mode < 0) blockers.push(`${sessionId}: unknown curriculum mode ${row.mode}.`);
  return {
    sessionId,
    season: row.season,
    week: row.week,
    slot: s.slot,
    category,
    topic: row.theme,
    purpose: s.purpose,
    difficulty: { mode: row.mode, level: mode + 1 },
    listed: s.decision_ids,
    assigned: blockers.length ? [] : assigned,
    prerequisite: { careerWeek: row.week },
    completionKey: `${ALL36_VERSION}/${sessionId}/${category}`,
    creditKey: `tt12/W${row.week}/${s.slot}`,
    status: blockers.length ? 'blocked' : 'mapped',
    blockers,
  };
}

/** Every session × category route: 36 rows × 3 sessions × 3 categories = 324. */
export const ALL36_SCHEDULE: readonly ScheduleRoute[] = ALL36_CURRICULUM.flatMap((row) => row.sessions.flatMap((s) => POSITIONS.map((c) => route(row, s, c))));

export function scheduleRoute(sessionId: string, category: Category): ScheduleRoute | undefined {
  return ALL36_SCHEDULE.find((r) => r.sessionId === sessionId && r.category === category);
}
