/**
 * Maps Retro's setup answers onto the package's capability vocabulary. Anything Retro's setup does
 * not ask about is treated as false: an unknown capability never qualifies a level.
 */
import type { PlannerInput } from '../planner';
import type { Capability } from './manifest';

export function capabilitiesFor(input: PlannerInput): ReadonlySet<Capability> {
  const caps = new Set<Capability>(['ball', 'clear_floor']);
  if (input.space === 'medium') caps.add('lane_clear');
  if (input.setting === 'outdoor') caps.add('outdoor_clear');
  // Setup never asks about a safe runout, a safe target or a backstop, so they are never granted:
  // "medium space" or "safe striking area" alone must not qualify an exercise that needs them.
  return caps;
}
