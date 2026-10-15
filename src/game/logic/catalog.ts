import raw from '../../../research/logic/v0.2/data/scenario_catalog.json?raw';
import { ContentError, parseStrictJson, type Json } from '../career/curriculum/json';

/**
 * Soccer-logic research catalog v0.2 (authoring seeds). This is research content only:
 * no scenario drives match behaviour until it has typed predicates, fixtures, timing,
 * evidence and passing runtime cases. The 500-plus scenario goal is separate from the
 * home-training exercise count.
 */
export const SCENARIO_GOAL = 500;

export const LOGIC_GROUPS = {
  GK: 'Goalkeeper',
  CB: 'Centre-back',
  OB: 'Outside back',
  SIX: 'Number 6',
  EIGHT: 'Number 8',
  WING: 'Winger',
  NINE: 'Number 9',
  DEF: 'Defending',
  SP: 'Set pieces',
  AT: 'Attacking transition',
  DT: 'Defending transition',
  GM: 'Game management',
} as const;
export type LogicGroup = keyof typeof LOGIC_GROUPS;

export interface LogicText {
  situation: string;
  cue: string;
  counter: string;
}

export interface LogicScenario {
  id: string;
  group: LogicGroup;
  original: LogicText;
  auditOverride: Partial<Pick<LogicText, 'cue' | 'counter'>> | null;
  sourceIds: string[];
  requiredBeforeActivation: string[];
}

export interface LogicCatalog {
  schemaVersion: '0.2';
  runtimeReady: false;
  scenarios: LogicScenario[];
}

type Obj = { [k: string]: Json };

function obj(v: Json | undefined, where: string, keys: readonly string[]): Obj {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new ContentError(`${where}: expected object`);
  for (const k of Object.keys(v)) if (!keys.includes(k)) throw new ContentError(`${where}: unknown field ${k}`);
  for (const k of keys) if (!(k in v)) throw new ContentError(`${where}: missing ${k}`);
  return v;
}

function str(v: Json | undefined, where: string): string {
  if (typeof v !== 'string' || v.trim() === '') throw new ContentError(`${where}: expected text`);
  if (v.includes('<') || v.includes('>')) throw new ContentError(`${where}: markup not permitted`);
  return v;
}

function strs(v: Json | undefined, where: string): string[] {
  if (!Array.isArray(v)) throw new ContentError(`${where}: expected list`);
  return v.map((x, i) => str(x, `${where}[${i}]`));
}

function exact(v: Json | undefined, want: Json, where: string): void {
  if (v !== want) throw new ContentError(`${where}: must be ${JSON.stringify(want)}`);
}

const SCENARIO_KEYS = ['id', 'schema_version', 'status', 'production_enabled', 'calibration_status', 'original', 'audit_override', 'evidence_status', 'source_ids', 'required_before_activation'] as const;
const TEXT_KEYS = ['focal_role_and_situation', 'cue_candidate_response', 'counter_response'] as const;

export function validateLogicCatalog(data: Json): LogicCatalog {
  const top = obj(data, 'catalog', ['schema_version', 'artifact_kind', 'runtime_ready', 'scenarios']);
  exact(top.schema_version, '0.2', 'catalog.schema_version');
  exact(top.artifact_kind, 'authoring_seed_catalog', 'catalog.artifact_kind');
  exact(top.runtime_ready, false, 'catalog.runtime_ready');
  if (!Array.isArray(top.scenarios)) throw new ContentError('catalog.scenarios: expected list');
  const seen = new Set<string>();
  const scenarios = top.scenarios.map((s, i): LogicScenario => {
    const w = `scenario[${i}]`;
    const o = obj(s, w, SCENARIO_KEYS);
    const id = str(o.id, `${w}.id`);
    const group = /^([A-Z]+)\d{2}$/.exec(id)?.[1] ?? '';
    if (!(group in LOGIC_GROUPS)) throw new ContentError(`${w}: unknown id ${id}`);
    if (seen.has(id)) throw new ContentError(`${w}: duplicate id ${id}`);
    seen.add(id);
    exact(o.schema_version, '0.2', `${id}.schema_version`);
    exact(o.status, 'draft_seed', `${id}.status`);
    exact(o.production_enabled, false, `${id}.production_enabled`);
    exact(o.calibration_status, 'not_calibrated', `${id}.calibration_status`);
    exact(o.evidence_status, 'authored_design_not_empirically_validated', `${id}.evidence_status`);
    const t = obj(o.original, `${id}.original`, TEXT_KEYS);
    let auditOverride: LogicScenario['auditOverride'] = null;
    if (o.audit_override !== null) {
      const a = o.audit_override;
      if (a === undefined || typeof a !== 'object' || Array.isArray(a)) throw new ContentError(`${id}.audit_override: expected object or null`);
      for (const k of Object.keys(a)) if (k !== 'cue_candidate_response' && k !== 'counter_response') throw new ContentError(`${id}.audit_override: unknown field ${k}`);
      auditOverride = {};
      if (a.cue_candidate_response !== undefined) auditOverride.cue = str(a.cue_candidate_response, `${id}.audit_override.cue`);
      if (a.counter_response !== undefined) auditOverride.counter = str(a.counter_response, `${id}.audit_override.counter`);
    }
    const required = strs(o.required_before_activation, `${id}.required_before_activation`);
    if (required.length === 0) throw new ContentError(`${id}: activation requirements missing`);
    return {
      id,
      group: group as LogicGroup,
      original: { situation: str(t.focal_role_and_situation, `${id}.situation`), cue: str(t.cue_candidate_response, `${id}.cue`), counter: str(t.counter_response, `${id}.counter`) },
      auditOverride,
      sourceIds: strs(o.source_ids, `${id}.source_ids`),
      requiredBeforeActivation: required,
    };
  });
  return { schemaVersion: '0.2', runtimeReady: false, scenarios };
}

export function loadLogicCatalog(text: string): LogicCatalog {
  return validateLogicCatalog(parseStrictJson(text));
}

export const LOGIC_CATALOG: LogicCatalog = loadLogicCatalog(raw);

/** Scenarios allowed to drive match behaviour. Always empty: no seed has met its activation requirements. */
export function activeLogicScenarios(): readonly LogicScenario[] {
  return [];
}

/** Current text after the audit's corrections, keeping the original visible for review. */
export function currentText(s: LogicScenario): LogicText {
  return { situation: s.original.situation, cue: s.auditOverride?.cue ?? s.original.cue, counter: s.auditOverride?.counter ?? s.original.counter };
}
