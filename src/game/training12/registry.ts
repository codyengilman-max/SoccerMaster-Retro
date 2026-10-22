/**
 * Exact v1.2 scenario keys whose playable drill has passed tests/training12-drill.test.ts and the browser checks.
 * Hand-maintained: a key is added only after its scene is verified. Nothing here is generated at runtime.
 */
import { scenarioDefinition } from './ref/seasons.mjs';
import type { RoleId } from './ref/catalog.mjs';
import type { ScenarioDefinition, ScenarioRecord } from './ref/seasons.mjs';

export const RULES_PROFILE = 'youth';

/** Practice formats with a playable drill (all level 1, used by Season 1 weeks 1-4). */
export const PRACTICE_CAPABILITIES: readonly string[] = ['B1', 'C1', 'D1', 'F1', 'K1', 'S1', 'T1', 'W1'];

export const VERIFIED_KEYS: readonly string[] = [
  "S1-W01-A-GK:B1:c2:s1:youth:layout2",
  "S1-W01-A-CB:B1:c2:s1:youth:layout2",
  "S1-W01-A-LB:B1:c2:s1:youth:layout2",
  "S1-W01-A-RB:B1:c2:s1:youth:layout2",
  "S1-W01-A-6:B1:c2:s1:youth:layout2",
  "S1-W01-A-8:B1:c2:s1:youth:layout2",
  "S1-W01-A-LW:T1:c2:s1:youth:layout2",
  "S1-W01-A-RW:T1:c2:s1:youth:layout2",
  "S1-W01-A-9:D1:c2:s1:youth:layout2",
  "S1-W01-B-GK:K1:c2:s1:youth:layout2",
  "S1-W01-B-CB:B1:c2:s1:youth:layout2",
  "S1-W01-B-LB:B1:c2:s1:youth:layout2",
  "S1-W01-B-RB:B1:c2:s1:youth:layout2",
  "S1-W01-B-6:C1:c2:s1:youth:layout2",
  "S1-W01-B-8:C1:c2:s1:youth:layout2",
  "S1-W01-B-LW:C1:c2:s1:youth:layout2",
  "S1-W01-B-RW:C1:c2:s1:youth:layout2",
  "S1-W01-B-9:C1:c2:s1:youth:layout2",
  "S1-W01-C-GK:K1:c2:s1:youth:layout2",
  "S1-W01-C-CB:D1:c2:s1:youth:layout2",
  "S1-W01-C-LB:D1:c2:s1:youth:layout2",
  "S1-W01-C-RB:D1:c2:s1:youth:layout2",
  "S1-W01-C-6:D1:c2:s1:youth:layout2",
  "S1-W01-C-8:D1:c2:s1:youth:layout2",
  "S1-W01-C-LW:D1:c2:s1:youth:layout2",
  "S1-W01-C-RW:D1:c2:s1:youth:layout2",
  "S1-W01-C-9:D1:c2:s1:youth:layout2",
  "S1-W02-A-GK:K1:c2:s1:youth:layout2",
  "S1-W02-A-CB:D1:c2:s1:youth:layout2",
  "S1-W02-A-LB:S1:c2:s1:youth:layout2",
  "S1-W02-A-RB:S1:c2:s1:youth:layout2",
  "S1-W02-A-6:S1:c2:s1:youth:layout2",
  "S1-W02-A-8:S1:c2:s1:youth:layout2",
  "S1-W02-A-LW:S1:c2:s1:youth:layout2",
  "S1-W02-A-RW:S1:c2:s1:youth:layout2",
  "S1-W02-A-9:C1:c2:s1:youth:layout2",
  "S1-W02-B-GK:B1:c2:s1:youth:layout2",
  "S1-W02-B-CB:B1:c2:s1:youth:layout2",
  "S1-W02-B-LB:B1:c2:s1:youth:layout2",
  "S1-W02-B-RB:B1:c2:s1:youth:layout2",
  "S1-W02-B-6:B1:c2:s1:youth:layout2",
  "S1-W02-B-8:B1:c2:s1:youth:layout2",
  "S1-W02-B-LW:T1:c2:s1:youth:layout2",
  "S1-W02-B-RW:T1:c2:s1:youth:layout2",
  "S1-W02-B-9:D1:c2:s1:youth:layout2",
  "S1-W02-C-GK:K1:c2:s1:youth:layout2",
  "S1-W02-C-CB:B1:c2:s1:youth:layout2",
  "S1-W02-C-LB:B1:c2:s1:youth:layout2",
  "S1-W02-C-RB:B1:c2:s1:youth:layout2",
  "S1-W02-C-6:C1:c2:s1:youth:layout2",
  "S1-W02-C-8:C1:c2:s1:youth:layout2",
  "S1-W02-C-LW:C1:c2:s1:youth:layout2",
  "S1-W02-C-RW:C1:c2:s1:youth:layout2",
  "S1-W02-C-9:C1:c2:s1:youth:layout2",
  "S1-W03-A-GK:K1:c2:s1:youth:layout2",
  "S1-W03-A-CB:D1:c2:s1:youth:layout2",
  "S1-W03-A-LB:W1:c2:s1:youth:layout2",
  "S1-W03-A-RB:W1:c2:s1:youth:layout2",
  "S1-W03-A-6:T1:c2:s1:youth:layout2",
  "S1-W03-A-8:W1:c2:s1:youth:layout2",
  "S1-W03-A-LW:W1:c2:s1:youth:layout2",
  "S1-W03-A-RW:W1:c2:s1:youth:layout2",
  "S1-W03-A-9:W1:c2:s1:youth:layout2",
  "S1-W03-B-GK:K1:c2:s1:youth:layout2",
  "S1-W03-B-CB:B1:c2:s1:youth:layout2",
  "S1-W03-B-LB:B1:c2:s1:youth:layout2",
  "S1-W03-B-RB:B1:c2:s1:youth:layout2",
  "S1-W03-B-6:C1:c2:s1:youth:layout2",
  "S1-W03-B-8:C1:c2:s1:youth:layout2",
  "S1-W03-B-LW:C1:c2:s1:youth:layout2",
  "S1-W03-B-RW:C1:c2:s1:youth:layout2",
  "S1-W03-B-9:C1:c2:s1:youth:layout2",
  "S1-W03-C-GK:F1:c2:s1:youth:layout2",
  "S1-W03-C-CB:D1:c2:s1:youth:layout2",
  "S1-W03-C-LB:D1:c2:s1:youth:layout2",
  "S1-W03-C-RB:D1:c2:s1:youth:layout2",
  "S1-W03-C-6:T1:c2:s1:youth:layout2",
  "S1-W03-C-8:F1:c2:s1:youth:layout2",
  "S1-W03-C-LW:F1:c2:s1:youth:layout2",
  "S1-W03-C-RW:F1:c2:s1:youth:layout2",
  "S1-W03-C-9:F1:c2:s1:youth:layout2",
  "S1-W04-A-GK:K1:c2:s1:youth:layout2",
  "S1-W04-A-CB:D1:c2:s1:youth:layout2",
  "S1-W04-A-LB:D1:c2:s1:youth:layout2",
  "S1-W04-A-RB:D1:c2:s1:youth:layout2",
  "S1-W04-A-6:D1:c2:s1:youth:layout2",
  "S1-W04-A-8:D1:c2:s1:youth:layout2",
  "S1-W04-A-LW:D1:c2:s1:youth:layout2",
  "S1-W04-A-RW:D1:c2:s1:youth:layout2",
  "S1-W04-A-9:D1:c2:s1:youth:layout2",
  "S1-W04-B-GK:K1:c2:s1:youth:layout2",
  "S1-W04-B-CB:T1:c2:s1:youth:layout2",
  "S1-W04-B-LB:T1:c2:s1:youth:layout2",
  "S1-W04-B-RB:T1:c2:s1:youth:layout2",
  "S1-W04-B-6:T1:c2:s1:youth:layout2",
  "S1-W04-B-8:T1:c2:s1:youth:layout2",
  "S1-W04-B-LW:T1:c2:s1:youth:layout2",
  "S1-W04-B-RW:T1:c2:s1:youth:layout2",
  "S1-W04-B-9:T1:c2:s1:youth:layout2",
  "S1-W04-C-GK:B1:c2:s1:youth:layout2",
  "S1-W04-C-CB:B1:c2:s1:youth:layout2",
  "S1-W04-C-LB:B1:c2:s1:youth:layout2",
  "S1-W04-C-RB:B1:c2:s1:youth:layout2",
  "S1-W04-C-6:B1:c2:s1:youth:layout2",
  "S1-W04-C-8:B1:c2:s1:youth:layout2",
  "S1-W04-C-LW:T1:c2:s1:youth:layout2",
  "S1-W04-C-RW:T1:c2:s1:youth:layout2",
  "S1-W04-C-9:D1:c2:s1:youth:layout2",
];

/** Registry records for planSession. The definition must still match the reference exactly, or the plan is refused. */
export function verifiedRecord(sessionId: string, role: RoleId, level: number): ScenarioRecord | null {
  let definition: ScenarioDefinition;
  try {
    definition = scenarioDefinition(sessionId, role, level, RULES_PROFILE);
  } catch {
    // Unknown session, role or a level above the session cap: no route, never a crash.
    return null;
  }
  return VERIFIED_KEYS.includes(definition.key) ? { key: definition.key, verified: true, definition } : null;
}
