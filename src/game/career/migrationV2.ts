/**
 * Progression v2 save migration (career save schema 2 -> 3). Framework-free and pure, run once per save:
 * the schema number makes it repeat-safe. Nothing is reset, deleted or reduced.
 */
import { DEV_CONFIG } from './development';

export const NEW_ATTRIBUTES = ['composure', 'strength', 'agility', 'pace'] as const;
const OLD_ATTRIBUTES = ['firstTouch', 'passing', 'dribbling', 'finishing', 'defending', 'awareness'] as const;

export interface ProgressionMigration {
  readonly version: 2;
  readonly fromSchema: 2;
  /** Attributes this game never had (goalkeeper, stamina, aerial): none were stored, so none are removed. */
  readonly removed: readonly string[];
  /** Starting values given to the four new attributes: the mean of the six existing ones (overall unchanged). */
  readonly added: Readonly<Record<(typeof NEW_ATTRIBUTES)[number], number>> | null;
  readonly overallBefore: number | null;
  readonly overallAfter: number | null;
  /** Unapplied fractional credits (devCarry) that were added to their attributes once, then cleared. */
  readonly pendingApplied: Readonly<Record<string, number>>;
  /** Already above the Season 1 maximum: ratings kept, ordinary growth and bonus spending pause. */
  readonly overCap: boolean;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The report for a schema-2 save, without changing it. */
export function migrationReport(o: Readonly<Record<string, unknown>>): ProgressionMigration {
  const pl = o.player as Record<string, unknown> | null | undefined;
  const attrs = (pl?.attributes ?? null) as Record<string, unknown> | null;
  const carry = (o.devCarry ?? {}) as Record<string, unknown>;
  const pendingApplied: Record<string, number> = {};
  for (const a of OLD_ATTRIBUTES) {
    const c = num(carry[a]);
    if (c && c > 0) pendingApplied[a] = c;
  }
  if (!attrs) return { version: 2, fromSchema: 2, removed: [], added: null, overallBefore: null, overallAfter: null, pendingApplied: {}, overCap: false };
  const vals = OLD_ATTRIBUTES.map((a) => num(attrs[a]) ?? 0);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const added = Object.fromEntries(NEW_ATTRIBUTES.map((a) => [a, num(attrs[a]) ?? mean])) as Record<(typeof NEW_ATTRIBUTES)[number], number>;
  const after = [...OLD_ATTRIBUTES.map((a, i) => vals[i]! + (pendingApplied[a] ?? 0)), ...NEW_ATTRIBUTES.map((a) => added[a])];
  const overallAfter = after.reduce((s, v) => s + v, 0) / after.length;
  return { version: 2, fromSchema: 2, removed: [], added, overallBefore: mean, overallAfter, pendingApplied, overCap: mean > DEV_CONFIG.seasonOneCap };
}

/** Schema 2 -> 3. A save already at schema 3 is returned unchanged. */
export function migrateToV2(o: Record<string, unknown>): Record<string, unknown> {
  if (o.schema !== 2) return o;
  const report = migrationReport(o);
  const pl = o.player as Record<string, unknown> | null | undefined;
  let player: unknown = pl ?? null;
  if (pl && report.added) {
    const attrs = { ...(pl.attributes as Record<string, number>) };
    for (const [a, c] of Object.entries(report.pendingApplied)) attrs[a] = Math.min(DEV_CONFIG.attrMax, (attrs[a] ?? 0) + c);
    for (const a of NEW_ATTRIBUTES) attrs[a] = report.added[a];
    const potential = { ...(pl.potential as Record<string, number>) };
    for (const a of NEW_ATTRIBUTES) potential[a] = DEV_CONFIG.attrMax;
    player = { ...pl, attributes: attrs, potential };
  }
  return { ...o, schema: 3, player, devCarry: {}, progression: report };
}
