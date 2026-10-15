/**
 * Maps Retro's setup answers onto the package's capability vocabulary. Anything Retro's setup does
 * not ask about is treated as false: an unknown capability never qualifies a level.
 */
import type { PlannerInput } from '../planner';
import type { Capability } from './manifest';

export function capabilitiesFor(input: PlannerInput): ReadonlySet<Capability> {
  const caps = new Set<Capability>(['ball', 'clear_floor']);
  if (input.space === 'medium') {
    caps.add('lane_clear');
    caps.add('safe_runout');
  }
  if (input.setting === 'outdoor') caps.add('outdoor_clear');
  if (input.striking && input.setting === 'outdoor') {
    caps.add('safe_target');
    caps.add('backstop');
  }
  return caps;
}
