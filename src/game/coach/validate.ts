import { TOPICS, type FactFeature, type TemplateDef } from './types';

const FEATURES: readonly FactFeature[] = ['carrier', 'pressure', 'passingLanes', 'support', 'shot', 'defend', 'cover', 'score', 'time', 'formation', 'stoppage', 'space'];

/** Load-time catalog validation. Returns human-readable problems; an empty list means the catalog is usable. */
export function validateCatalog(catalog: readonly TemplateDef[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const t of catalog) {
    const at = `template ${String(t?.id)}`;
    if (!t || typeof t.id !== 'string' || !/^[a-z]+\.[a-z0-9-]+$/.test(t.id)) out.push(`${at}: invalid id`);
    else if (ids.has(t.id)) out.push(`${at}: duplicate id`);
    else ids.add(t.id);
    if (!Number.isInteger(t.version) || t.version < 1) out.push(`${at}: version must be a positive integer`);
    if (!TOPICS.includes(t.topic)) out.push(`${at}: unknown topic ${String(t.topic)}`);
    if (t.phase !== 'attack' && t.phase !== 'defend') out.push(`${at}: bad phase`);
    if (t.ball !== 'on' && t.ball !== 'off') out.push(`${at}: bad ball`);
    if (typeof t.objective !== 'string' || t.objective.trim().length < 10) out.push(`${at}: missing learning objective`);
    if (!Array.isArray(t.requires) || t.requires.length === 0) out.push(`${at}: must declare required state features`);
    else for (const r of t.requires) if (!FEATURES.includes(r)) out.push(`${at}: unknown feature ${String(r)}`);
    if (!Number.isFinite(t.cooldownSeconds) || t.cooldownSeconds <= 0) out.push(`${at}: cooldown must be positive`);
    if (!Number.isInteger(t.maxPerSession) || t.maxPerSession < 1) out.push(`${at}: maxPerSession must be >= 1`);
    for (const fn of ['eligible', 'question', 'highlights'] as const) if (typeof t[fn] !== 'function') out.push(`${at}: ${fn} must be a function`);
    if (!Array.isArray(t.options) || t.options.length < 3 || t.options.length > 4) out.push(`${at}: needs 3-4 options`);
    else {
      const oids = new Set<string>();
      for (const o of t.options) {
        if (!o || typeof o.id !== 'string' || oids.has(o.id)) out.push(`${at}: bad or duplicate option id ${String(o?.id)}`);
        else oids.add(o.id);
        for (const fn of ['text', 'grade', 'feedback', 'intention'] as const) if (typeof o?.[fn] !== 'function') out.push(`${at}/${String(o?.id)}: ${fn} must be a function`);
      }
      const always = t.options.filter((o) => !o.available).length;
      if (always < 2) out.push(`${at}: at least two options must always be available`);
    }
  }
  return out;
}

export function assertValidCatalog(catalog: readonly TemplateDef[]): readonly TemplateDef[] {
  const problems = validateCatalog(catalog);
  if (problems.length > 0) throw new Error(`Invalid Coach Moment catalog:\n${problems.join('\n')}`);
  return catalog;
}
