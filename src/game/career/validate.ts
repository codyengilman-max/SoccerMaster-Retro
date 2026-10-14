import { FOCUSES, SOURCES } from './catalog';
import { ATTRIBUTES, LEVELS, SKILL_FAMILIES, type Activity } from './types';

/** Content that must never be required: heading, sliding tackles, unstable obstacles, powerful indoor shots. */
const BANNED = /\bhead(ing|er)?\b(?! up)|slid(e|ing)[ -]tackl|\bwobbl|unstable (?!obstacles)|full power|as hard as/i;

/** Schema validation only. Editorial and coaching review are tracked separately in `review`. */
export function validateActivity(a: Activity): string[] {
  const e: string[] = [];
  const req = (ok: boolean, msg: string) => ok || e.push(`${a.id}: ${msg}`);
  req(/^[a-z]{2}-[a-z0-9-]+$/.test(a.id), 'bad id');
  req(Number.isInteger(a.version) && a.version >= 1, 'bad version');
  req(SKILL_FAMILIES.includes(a.skillFamilyId), 'bad skill family');
  req(a.relatedAttribute === null ? a.skillFamilyId === 'juggling' : ATTRIBUTES.includes(a.relatedAttribute), 'bad related attribute');
  req(LEVELS.includes(a.entryLevel), 'bad entry level');
  req(FOCUSES.some((f) => f.id === a.focusId && f.family === a.skillFamilyId), 'focus does not match family');
  req(a.variants.length >= 1 && a.variants.every((v) => v.level >= a.entryLevel && v.change.length > 0), 'needs progression variants');
  req(a.equipment.required.length === 1 && a.equipment.required[0] === 'ball', 'only a ball may be required');
  const needsSub = a.equipment.optional.some((q) => q !== 'audio');
  req(!needsSub || a.ballOnly !== null, 'optional equipment needs a ball-only adaptation');
  req(a.indoor || a.outdoor, 'needs a suitable setting');
  req(!(a.strikingArea && a.indoor), 'firm striking is never indoors');
  req(a.steps.length === 3 && a.steps.every((s) => s.length > 0 && s.length <= 160), 'needs three concise steps');
  for (const k of ['title', 'objective', 'cue', 'success', 'easier', 'harder'] as const) req(a[k].length > 0, `missing ${k}`);
  req(a.mistake.mistake.length > 0 && a.mistake.correction.length > 0, 'missing mistake/correction');
  req(a.selfReport.includes('completion') && a.selfReport.includes('rating'), 'self-report needs completion and rating');
  req(a.limitations.some((l) => /self-reported/i.test(l)), 'must state it is self-reported');
  req(a.sources.every((s) => s.id in SOURCES) && (a.sources.length > 0 || a.sourceNote.length > 0), 'source refs invalid or unexplained');
  req(/not an official|original/i.test(a.sourceNote), 'must not claim an official drill');
  req(a.review.coaching === 'pending' || a.review.coaching === 'approved', 'bad review status');
  const text = [a.objective, ...a.steps, a.cue, a.success, a.easier, a.harder, a.ballOnly?.steps ?? ''].join(' ');
  req(!BANNED.test(text), 'contains excluded content');
  if (a.equipment.optional.includes('audio')) req(/yourself|helper/i.test(a.steps.join(' ')), 'audio must be optional in the steps');
  if (a.demo.kind === 'path') req(a.demo.ball.length >= 2 && a.demo.seconds > 0, 'bad demo');
  else req(a.demo.frames.length >= 2, 'bad step frames');
  return e;
}

export function validateCatalog(list: readonly Activity[]): string[] {
  const errors = list.flatMap(validateActivity);
  const ids = new Set<string>();
  for (const a of list) {
    if (ids.has(a.id)) errors.push(`${a.id}: duplicate id`);
    ids.add(a.id);
  }
  return errors;
}
