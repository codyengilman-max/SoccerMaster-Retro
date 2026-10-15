/**
 * Schema-2 curriculum manifest: a TypeScript port of the package's offline reference validator
 * (research/training/v1.1/reference/training_reference.py). Imported content is drafts only and
 * can never publish, approve, supply asset paths or change the economy.
 */
import { ContentError, parseStrictJson, type Json } from './json';

export const CAPABILITIES = [
  'ball', 'clear_floor', 'lane_clear', 'permitted_wall', 'safe_rebound',
  'safe_runout', 'overhead_clear', 'outdoor_clear', 'safe_target', 'backstop',
] as const;
export type Capability = (typeof CAPABILITIES)[number];
export const CATEGORIES = ['ball_control', 'dribbling', 'turning', 'passing', 'first_touch', 'aerial_control', 'finishing'] as const;
export type Category = (typeof CATEGORIES)[number];
export const SOURCE_HOSTS = new Set([
  'www.ussoccer.com', 'www.coerver.com', 'www.thefa.com', 'norcalpremier.com', 'www.gftskills.com',
  'mypersonalfootballcoach.com', 'www.soccerdrive.com', 'community.thefa.com', 'www.fifatrainingcentre.com',
]);
const PROHIBITED = ['heading', 'standing_on_ball', 'eyes_closed_balance', 'max_power_indoor_shooting', 'fatigue_sprints', 'contact_tackles'];
const CLAIM_TYPES = ['direct_technique', 'contextual_principle', 'original_adaptation', 'unresolved'] as const;

export interface Source { id: string; title: string; url: string; scope: string; textReviewed: boolean; videoReviewed: boolean; reviewDate: string }
export interface SpaceProfile { id: string; requiredCapabilities: Capability[]; setup: string }
export interface Claim { id: string; type: (typeof CLAIM_TYPES)[number]; sourceIds: string[]; claim: string; locator: string | null; scope: string; videoTimestamp: null }
export interface Level {
  id: string; ordinal: number; setup: string; startingState: string; steps: string[]; endingState: string; footMode: string;
  prerequisites: string[]; components: string[]; demoIds: string[]; claimIds: string[]; releaseStatus: 'draft';
}
export interface Family {
  id: string; title: string; category: Category; profile: string; requiredCapabilities: Capability[];
  optionalEquipment: string[]; qualityCheck: string; correction: string; limitation: string; levels: Level[];
}
export interface Demo { id: string; levelId: string; side: 'left' | 'right'; assetPath: null; assetSha256: null; captionSha256: null; status: 'not_created'; checkpoint: string; videoReviewed: false }
export interface Substitution { fromFamily: string; toFamily: string; sameOutcome: false; notice: string }
export interface SessionTemplate { focus: string; slots: { index: number; families: string[] }[] }
export interface Manifest {
  schemaVersion: 2; contentVersion: string; audience: 'U11-U12'; capabilities: Capability[]; sources: Source[];
  spaceProfiles: SpaceProfile[]; claims: Claim[]; families: Family[]; demos: Demo[]; sessionTemplates: SessionTemplate[];
  substitutions: Substitution[]; reviewRecords: []; rewardPolicy: Record<string, Json>; progressionDecision: Record<string, string>;
  physicalSchedule: Record<string, Json>; safety: { prohibited: string[]; stopRule: string; skipPenalty: false };
}

const ARRAY = new Set(['capabilities', 'sources', 'spaceProfiles', 'claims', 'families', 'demos', 'sessionTemplates', 'substitutions', 'reviewRecords', 'requiredCapabilities', 'optionalEquipment', 'levels', 'sourceIds', 'steps', 'prerequisites', 'components', 'demoIds', 'claimIds', 'slots', 'prohibited', 'entitlementFields', 'families']);
const OBJECT = new Set(['rewardPolicy', 'progressionDecision', 'physicalSchedule', 'safety']);
const BOOL = new Set(['textReviewed', 'videoReviewed', 'sameOutcome', 'skipPenalty', 'transferable', 'convertible', 'clockDriven', 'automaticExercisePrompts', 'careerAdvanceCreatesPhysicalBacklog', 'completionTimerRequired']);
const INT = new Set(['schemaVersion', 'ordinal', 'index', 'slotsPerWeek', 'amount', 'statDelta', 'currencyDelta', 'mandatorySessions']);
const NULLABLE = new Set(['locator', 'videoTimestamp', 'assetPath', 'assetSha256', 'captionSha256']);

function require(ok: unknown, msg: string): asserts ok {
  if (!ok) throw new ContentError(msg);
}
const isObj = (o: unknown): o is Record<string, Json> => typeof o === 'object' && o !== null && !Array.isArray(o);

function keys(o: unknown, names: string): Record<string, Json> {
  const want = names.split(' ');
  require(isObj(o) && Object.keys(o).length === want.length && want.every((k) => Object.prototype.hasOwnProperty.call(o, k)), `unknown/missing fields: ${names}`);
  for (const [k, v] of Object.entries(o)) {
    if (NULLABLE.has(k) && v === null) continue;
    const ok = ARRAY.has(k) ? Array.isArray(v) : OBJECT.has(k) ? isObj(v) : BOOL.has(k) ? typeof v === 'boolean' : INT.has(k) ? Number.isInteger(v) : typeof v === 'string';
    require(ok, `field type ${k}`);
  }
  return o;
}
function strings(a: Json): string[] {
  require(Array.isArray(a) && a.every((x) => typeof x === 'string' && x.length > 0), 'string array');
  require(new Set(a).size === a.length, 'duplicate entries');
  return a as string[];
}
function unique<T extends { id: string }>(a: T[]): Map<string, T> {
  const m = new Map(a.map((x) => [x.id, x]));
  require(m.size === a.length, 'duplicate IDs');
  return m;
}
const sameSet = (a: Iterable<string>, b: Iterable<string>) => {
  const x = new Set(a), y = new Set(b);
  return x.size === y.size && [...x].every((v) => y.has(v));
};
const subset = (a: Iterable<string>, b: { has(v: string): boolean }) => [...a].every((v) => b.has(v));

function walk(o: Json, depth: number): void {
  require(depth <= 16, 'depth');
  if (typeof o === 'string') {
    require(o.length > 0 && o.length <= 4000 && ![...o].some((c) => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t'), 'text length/control');
    require(!o.includes('<') && !o.includes('>'), 'markup not permitted in catalog');
  } else if (Array.isArray(o)) {
    require(o.length <= 500, 'array bound');
    for (const v of o) walk(v, depth + 1);
  } else if (isObj(o)) {
    for (const [k, v] of Object.entries(o)) {
      require(!['__proto__', 'constructor', 'prototype'].includes(k), 'dangerous key');
      walk(v, depth + 1);
    }
  } else require(o === null || typeof o === 'boolean' || Number.isInteger(o), 'unexpected type');
}

function sourceUrlOk(raw: string): boolean {
  const m = /^https:\/\/([a-z0-9.-]+)(:443)?(\/[^?#\s]*)?$/.exec(raw);
  return !!m && SOURCE_HOSTS.has(m[1]!);
}

const canonical = (o: Json): string =>
  Array.isArray(o) ? `[${o.map(canonical).join(',')}]` : isObj(o) ? `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k]!)}`).join(',')}}` : JSON.stringify(o);

/** Validates an already-parsed manifest. Throws `ContentError`; never returns partial data. */
export function validateManifest(m: Json): Manifest {
  walk(m, 0);
  const top = keys(m, 'schemaVersion contentVersion audience capabilities sources spaceProfiles claims families demos sessionTemplates substitutions reviewRecords rewardPolicy progressionDecision physicalSchedule safety');
  require(top.schemaVersion === 2, 'schema version');
  require(/^\d+\.\d+\.\d+$/.test(top.contentVersion as string), 'content version');
  require(top.audience === 'U11-U12', 'audience');
  const caps = new Set(strings(top.capabilities!));
  require(sameSet(caps, CAPABILITIES), 'capability vocabulary');
  const fams = top.families as Json[];
  require(fams.length > 0 && fams.length <= 250, 'family count');
  const srcList = top.sources as Json[], profList = top.spaceProfiles as Json[], claimList = top.claims as Json[], demoList = top.demos as Json[];
  for (const x of srcList) {
    const s = keys(x, 'id title url scope textReviewed videoReviewed reviewDate');
    require(sourceUrlOk(s.url as string), 'source URL');
    require(/^\d{4}-\d{2}-\d{2}$/.test(s.reviewDate as string), 'date');
  }
  for (const x of profList) {
    const p = keys(x, 'id requiredCapabilities setup');
    require(subset(strings(p.requiredCapabilities!), caps), 'profile capabilities');
  }
  const src = unique(srcList as unknown as Source[]);
  const profiles = unique(profList as unknown as SpaceProfile[]);
  for (const x of claimList) {
    const c = keys(x, 'id type sourceIds claim locator scope videoTimestamp');
    const ids = strings(c.sourceIds!);
    require((CLAIM_TYPES as readonly string[]).includes(c.type as string), 'claim type');
    require(subset(ids, src), 'claim sources');
    if (c.type === 'direct_technique' || c.type === 'contextual_principle') require(ids.length > 0 && !!c.locator, 'evidence locator');
    require(c.videoTimestamp === null, 'v2 text-only evidence; no video timestamps approved');
  }
  const claims = unique(claimList as unknown as Claim[]);
  const levels = new Map<string, Level>();
  const owner = new Map<string, Family>();
  for (const x of fams) {
    const f = keys(x, 'id title category profile requiredCapabilities optionalEquipment qualityCheck correction limitation levels') as unknown as Family;
    require(/^[A-Z]{2}\d{2}$/.test(f.id), 'family id');
    require((CATEGORIES as readonly string[]).includes(f.category), 'category');
    require(profiles.has(f.profile), 'profile');
    require(sameSet(strings(f.requiredCapabilities), profiles.get(f.profile)!.requiredCapabilities), 'profile mismatch');
    require(subset(strings(f.optionalEquipment), new Set(['flat_soft_markers'])), 'optional equipment');
    require(f.levels.length === 5, 'level count');
    f.levels.forEach((lx, i) => {
      const l = keys(lx, 'id ordinal setup startingState steps endingState footMode prerequisites components demoIds claimIds releaseStatus') as unknown as Level;
      require(l.ordinal === i + 1 && l.id === `${f.id}-L${i + 1}`, 'level identity');
      require(!levels.has(l.id), 'duplicate level');
      levels.set(l.id, l);
      owner.set(l.id, f);
      for (const n of ['steps', 'prerequisites', 'components', 'demoIds', 'claimIds'] as const) strings(l[n]);
      require(l.steps.length >= 2 && l.steps.length <= 12, 'steps');
      require(l.releaseStatus === 'draft', 'content import cannot publish');
      require(l.claimIds.length > 0 && subset(l.claimIds, claims), 'claims');
      require(sameSet(l.demoIds, [`${l.id}-right`, `${l.id}-left`]), 'demo sides');
    });
  }
  const families = unique(fams as unknown as Family[]);
  const demos = unique(demoList as unknown as Demo[]);
  require(sameSet(demos.keys(), [...levels.values()].flatMap((l) => l.demoIds)), 'demo coverage');
  for (const l of levels.values()) {
    require(subset([...l.prerequisites, ...l.components], levels), 'prerequisite reference');
    require(subset(l.components, new Set(l.prerequisites)), 'components require familiarity');
    if (owner.get(l.id)!.id === 'CO01') require(sameSet(l.components, l.ordinal === 1 ? ['BM01-L1'] : ['BM01-L1', 'BM02-L1']), 'combination allowlist');
    else require(l.components.length === 0, 'unexpected component');
  }
  const visit = (id: string, path: Set<string>) => {
    require(!path.has(id), 'prerequisite cycle');
    for (const p of levels.get(id)!.prerequisites) visit(p, new Set([...path, id]));
  };
  for (const id of levels.keys()) visit(id, new Set());
  for (const x of demoList) {
    const d = keys(x, 'id levelId side assetPath assetSha256 captionSha256 status checkpoint videoReviewed');
    require(levels.has(d.levelId as string) && (d.side === 'left' || d.side === 'right') && d.id === `${d.levelId}-${d.side}`, 'demo identity');
    require(d.status === 'not_created' && d.assetPath === null && d.assetSha256 === null && d.captionSha256 === null && d.videoReviewed === false, 'draft asset authority');
  }
  require((top.reviewRecords as Json[]).length === 0, 'runtime catalog may not carry approvals');
  const focus = new Set<string>();
  for (const t of top.sessionTemplates as Json[]) {
    const tt = keys(t, 'focus slots');
    require(!focus.has(tt.focus as string), 'duplicate focus');
    focus.add(tt.focus as string);
    const slots = tt.slots as Json[];
    require(slots.length === 3, 'slot count');
    slots.forEach((s, i) => {
      const ss = keys(s, 'index families');
      const fs = strings(ss.families!);
      require(ss.index === i && fs.length === 2 && subset(fs, families), 'slot');
    });
  }
  const edges = new Map<string, string>();
  for (const s of top.substitutions as Json[]) {
    const ss = keys(s, 'fromFamily toFamily sameOutcome notice');
    const from = ss.fromFamily as string, to = ss.toFamily as string;
    require(families.has(from) && families.has(to) && from !== to, 'substitution reference');
    require(!edges.has(from) && ss.sameOutcome === false && !!ss.notice, 'substitution metadata');
    edges.set(from, to);
  }
  for (const id of edges.keys()) {
    const seen = new Set<string>();
    let p: string | undefined = id;
    while (p !== undefined && edges.has(p)) {
      require(!seen.has(p), 'substitution cycle');
      seen.add(p);
      p = edges.get(p);
    }
  }
  keys(top.rewardPolicy, 'entitlementFields slotsPerWeek reward amount transferable convertible statDelta currencyDelta clockDriven');
  require(canonical(top.rewardPolicy!) === canonical({ entitlementFields: ['careerId', 'careerWeekId', 'slotIndex'], slotsPerWeek: 3, reward: 'local_journal_stamp', amount: 1, transferable: false, convertible: false, statDelta: 0, currencyDelta: 0, clockDriven: false }), 'reward policy');
  keys(top.physicalSchedule, 'automaticExercisePrompts careerAdvanceCreatesPhysicalBacklog mandatorySessions completionTimerRequired');
  require(canonical(top.physicalSchedule!) === canonical({ automaticExercisePrompts: false, careerAdvanceCreatesPhysicalBacklog: false, mandatorySessions: 0, completionTimerRequired: false }), 'physical schedule');
  const pd = keys(top.progressionDecision, 'status home gameplay conflictAction');
  require(pd.status === 'implementation_proposal', 'decision status');
  const safety = keys(top.safety, 'prohibited stopRule skipPenalty');
  require(safety.skipPenalty === false, 'skip penalty');
  require(sameSet(strings(safety.prohibited!), PROHIBITED), 'safety exclusions');
  return m as unknown as Manifest;
}

/** Parse + validate in one atomic step: any failure throws and nothing is returned. */
export function loadManifest(text: string): Manifest {
  return validateManifest(parseStrictJson(text));
}

export { canonical, ContentError };
