/**
 * Story scene graph: week one from package v0.7 (immutable) plus the weeks 2–4 DRAFT extension
 * (owner decision A, 2026-10-16). Strict validation, no executable content.
 */
import rawSeason from '../../../docs/story/season-one/season_one_scenes.json';

export const ADAPTERS = ['identity', 'crossbar', 'training_arrangement', 'weekly_focus', 'practice', 'assignment', 'match', 'week_close', 'jungle', 'team_training', 'league_match', 'tournament_match', 'standings', 'home_learning', 'school_reward', 'training_log', 'home_hub'] as const;
export type AdapterKind = (typeof ADAPTERS)[number];
export const PREDICATES = ['always', 'crossbar_accepted', 'jungle_accepted', 'promise_made', 'promise_kept', 'promise_cancelled', 'promise_missed', 'promise_repaired'] as const;
export type LegacyPredicateId = (typeof PREDICATES)[number];
/**
 * Season One adds parametric predicates, still code-evaluated (no expressions):
 * `chose:SCENE.key=a|b` (a saved choice), `result:SCENE=WIN|DRAW|LOSS` (a completed match/challenge),
 * `detail:SCENE=x|y` (a completed activity's recorded detail, e.g. a tournament finish),
 * `done:SCENE` (an activity in that scene completed). Missing facts are never true.
 */
export type PredicateId = string;
const PARAM_PREDICATE = /^(chose:[A-Za-z0-9_]{1,64}\.[A-Za-z0-9_]{1,64}=[A-Za-z0-9_|]{1,128}|result:[A-Za-z0-9_]{1,64}=(WIN|DRAW|LOSS)(\|(WIN|DRAW|LOSS)){0,2}|detail:[A-Za-z0-9_]{1,64}=[A-Za-z0-9_|]{1,128}|done:[A-Za-z0-9_]{1,64})$/;
export const OUTCOMES = ['completed', 'declined', 'abandoned', 'interrupted'] as const;
export type Outcome = (typeof OUTCOMES)[number];
const FULL_OUTCOMES: readonly AdapterKind[] = ['crossbar', 'practice', 'match', 'jungle', 'team_training', 'league_match', 'tournament_match'];
export const BACKGROUNDS = ['neutral_school', 'neutral_home', 'neutral_pitch', 'aquarium', 'recess', 'prologue', 'home_v3'] as const;
export type Background = (typeof BACKGROUNDS)[number];

export interface Effect { readonly op: 'remember_choice'; readonly key: string; readonly value: string }
export interface ChoiceOption { readonly id: string; readonly label: string; readonly predicate: 'always'; readonly effects: readonly Effect[]; readonly next: string }
export type StoryNode =
  | { readonly id: string; readonly type: 'line'; readonly speaker: string; readonly text: string; readonly next: string }
  | { readonly id: string; readonly type: 'choice'; readonly options: readonly ChoiceOption[] }
  | { readonly id: string; readonly type: 'activity_handoff'; readonly adapter: AdapterKind; readonly predicate: PredicateId; readonly on_false: string; readonly outcomes: Readonly<Partial<Record<Outcome, string>>> }
  | { readonly id: string; readonly type: 'branch'; readonly cases: readonly { readonly predicate: PredicateId; readonly next: string }[]; readonly default: string }
  | { readonly id: string; readonly type: 'end'; readonly next_scene: string | null };
export interface StoryScene { readonly id: string; readonly version: string; readonly entry: string; readonly background: Background; readonly nodes: readonly StoryNode[] }
export interface StoryCatalog { readonly version: string; readonly entry: string; readonly scenes: readonly StoryScene[]; readonly order: readonly string[] }

export class StoryContentError extends Error {}
const fail = (m: string): never => {
  throw new StoryContentError(m);
};
type J = unknown;
const isObj = (v: J): v is Record<string, J> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ID = /^[A-Za-z0-9_]{1,64}$/;
function keys(o: Record<string, J>, allowed: readonly string[], w: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`${w}: unexpected field ${k}`);
}
function id(v: J, w: string): string {
  if (typeof v !== 'string' || !ID.test(v)) fail(`${w}: bad id`);
  return v as string;
}
function text(v: J, w: string, max = 4096): string {
  if (typeof v !== 'string' || v.trim() === '' || [...v].length > max) fail(`${w}: expected text`);
  const s = v as string;
  if (/[<>]/.test(s)) fail(`${w}: markup not permitted`);
  // Only {player.name} is a supported token; any other brace is rejected at build time.
  if (/[{}]/.test(s.split('{player.name}').join('').split('{crossbar.score}').join(''))) fail(`${w}: unknown token`);
  return s;
}
function oneOf<T extends string>(v: J, list: readonly T[], w: string): T {
  if (typeof v !== 'string' || !(list as readonly string[]).includes(v)) fail(`${w}: not allowed (${String(v)})`);
  return v as T;
}

export const SEASON_VERSION = 's1-v2.0';

export function parseCatalog(input: J, opts: { version?: string; branches?: boolean; allowOpenLinks?: boolean; season?: boolean } = {}): StoryCatalog {
  const version = opts.version ?? SEASON_VERSION;
  if (!isObj(input)) fail('catalog: expected object');
  const c = input as Record<string, J>;
  keys(c, ['version', 'entry', 'scenes'], 'catalog');
  if (c.version !== version) fail(`catalog: unsupported version ${String(c.version)}`);
  if (!Array.isArray(c.scenes) || c.scenes.length === 0 || c.scenes.length > 200) fail('catalog: scenes');
  const scenes: StoryScene[] = [];
  const pred = (v: J, w: string): string => (opts.season && typeof v === 'string' && PARAM_PREDICATE.test(v) ? v : oneOf(v, PREDICATES, w));
  const sceneIds = new Set<string>();
  const links = new Map<string, string | null>();
  for (const [i, s] of (c.scenes as J[]).entries()) {
    const w = `scene[${i}]`;
    if (!isObj(s)) fail(`${w}: expected object`);
    const so = s as Record<string, J>;
    keys(so, ['id', 'version', 'entry', 'background', 'nodes'], w);
    const sid = id(so.id, w);
    if (sceneIds.has(sid)) fail(`${w}: duplicate scene ${sid}`);
    sceneIds.add(sid);
    if (so.version !== c.version) fail(`${sid}: version mismatch`);
    const background = oneOf(so.background, BACKGROUNDS, `${sid}.background`);
    if (!Array.isArray(so.nodes) || so.nodes.length === 0 || so.nodes.length > 500) fail(`${sid}: nodes`);
    const nodes: StoryNode[] = [];
    const nodeIds = new Set<string>();
    const edges = new Map<string, string[]>();
    let ends = 0;
    for (const [j, n] of (so.nodes as J[]).entries()) {
      const nw = `${sid}.node[${j}]`;
      if (!isObj(n)) fail(`${nw}: expected object`);
      const no = n as Record<string, J>;
      const nid = id(no.id, nw);
      if (nodeIds.has(nid)) fail(`${sid}: duplicate node ${nid}`);
      nodeIds.add(nid);
      const t = oneOf(no.type, opts.branches ? (['line', 'choice', 'activity_handoff', 'branch', 'end'] as const) : (['line', 'choice', 'activity_handoff', 'end'] as const), `${sid}.${nid}.type`);
      if (t === 'line') {
        keys(no, ['id', 'type', 'speaker', 'text', 'next'], nw);
        nodes.push({ id: nid, type: 'line', speaker: text(no.speaker, `${sid}.${nid}.speaker`, 32), text: text(no.text, `${sid}.${nid}.text`), next: id(no.next, `${sid}.${nid}.next`) });
        edges.set(nid, [no.next as string]);
      } else if (t === 'choice') {
        keys(no, ['id', 'type', 'options'], nw);
        if (!Array.isArray(no.options) || no.options.length === 0 || no.options.length > 6) fail(`${sid}.${nid}: options`);
        const seen = new Set<string>();
        const options: ChoiceOption[] = (no.options as J[]).map((o, k) => {
          const ow = `${sid}.${nid}.option[${k}]`;
          if (!isObj(o)) fail(`${ow}: expected object`);
          const oo = o as Record<string, J>;
          keys(oo, ['id', 'label', 'predicate', 'effects', 'next'], ow);
          const oid = id(oo.id, ow);
          if (seen.has(oid)) fail(`${sid}.${nid}: duplicate option ${oid}`);
          seen.add(oid);
          if (oo.predicate !== 'always') fail(`${ow}: predicate not allowed`);
          if (!Array.isArray(oo.effects) || oo.effects.length > 4) fail(`${ow}: effects`);
          const effects = (oo.effects as J[]).map((e, m) => {
            const ew = `${ow}.effect[${m}]`;
            if (!isObj(e)) fail(`${ew}: expected object`);
            const eo = e as Record<string, J>;
            keys(eo, ['op', 'key', 'value'], ew);
            // remember_choice is the only allowlisted effect and may only record this option for this node.
            if (eo.op !== 'remember_choice' || eo.key !== nid || eo.value !== oid) fail(`${ew}: effect not allowed`);
            return { op: 'remember_choice' as const, key: nid, value: oid };
          });
          return { id: oid, label: text(oo.label, `${ow}.label`, 72), predicate: 'always' as const, effects, next: id(oo.next, `${ow}.next`) };
        });
        nodes.push({ id: nid, type: 'choice', options });
        edges.set(nid, options.map((o) => o.next));
      } else if (t === 'activity_handoff') {
        keys(no, ['id', 'type', 'adapter', 'predicate', 'on_false', 'outcomes'], nw);
        const adapter = oneOf(no.adapter, ADAPTERS, `${sid}.${nid}.adapter`);
        const predicate = pred(no.predicate, `${sid}.${nid}.predicate`);
        if (!isObj(no.outcomes)) fail(`${sid}.${nid}: outcomes`);
        const oc = no.outcomes as Record<string, J>;
        const required: readonly Outcome[] = FULL_OUTCOMES.includes(adapter) ? OUTCOMES : ['completed'];
        const got = Object.keys(oc).sort().join(',');
        if (got !== [...required].sort().join(',')) fail(`${sid}.${nid}: outcomes must be ${required.join(',')}`);
        const outcomes: Partial<Record<Outcome, string>> = {};
        for (const o of required) outcomes[o] = id(oc[o], `${sid}.${nid}.outcomes.${o}`);
        const onFalse = id(no.on_false, `${sid}.${nid}.on_false`);
        nodes.push({ id: nid, type: 'activity_handoff', adapter, predicate, on_false: onFalse, outcomes });
        edges.set(nid, [...Object.values(outcomes), onFalse] as string[]);
      } else if (t === 'branch') {
        keys(no, ['id', 'type', 'cases', 'default'], nw);
        if (!Array.isArray(no.cases) || no.cases.length === 0 || no.cases.length > 8) fail(`${sid}.${nid}: cases`);
        const cases = (no.cases as J[]).map((cv, ci) => {
          if (!isObj(cv)) fail(`${sid}.${nid}.cases[${ci}]: expected object`);
          const co = cv as Record<string, J>;
          keys(co, ['predicate', 'next'], `${sid}.${nid}.cases[${ci}]`);
          return { predicate: pred(co.predicate, `${sid}.${nid}.cases[${ci}].predicate`), next: id(co.next, `${sid}.${nid}.cases[${ci}].next`) };
        });
        const dflt = id(no.default, `${sid}.${nid}.default`);
        nodes.push({ id: nid, type: 'branch', cases, default: dflt });
        edges.set(nid, [...cases.map((x) => x.next), dflt]);
      } else {
        keys(no, ['id', 'type', 'next_scene'], nw);
        const next = no.next_scene === null ? null : id(no.next_scene, `${sid}.${nid}.next_scene`);
        if (links.has(sid) && links.get(sid) !== next) fail(`${sid}: ends disagree on next scene`);
        links.set(sid, next);
        nodes.push({ id: nid, type: 'end', next_scene: next });
        edges.set(nid, []);
        ends++;
      }
    }
    if (ends === 0) fail(`${sid}: no end`);
    const entry = id(so.entry, `${sid}.entry`);
    if (!nodeIds.has(entry)) fail(`${sid}: missing entry`);
    for (const [from, tos] of edges) for (const to of tos) if (!nodeIds.has(to)) fail(`${sid}.${from}: missing target ${to}`);
    const done = new Set<string>();
    const active = new Set<string>();
    const visit = (x: string): void => {
      if (active.has(x)) fail(`${sid}: cycle at ${x}`);
      if (done.has(x)) return;
      active.add(x);
      for (const y of edges.get(x)!) visit(y);
      active.delete(x);
      done.add(x);
    };
    visit(entry);
    if (done.size !== nodeIds.size) fail(`${sid}: unreachable node`);
    scenes.push({ id: sid, version: c.version as string, entry, background, nodes });
  }
  const entry = id(c.entry, 'catalog.entry');
  if (!sceneIds.has(entry)) fail('catalog: missing entry scene');
  for (const [from, to] of links) if (to !== null && !sceneIds.has(to)) fail(`${from}: missing next scene ${to}`);
  const order: string[] = [];
  for (let s: string | null = entry; s !== null; s = links.get(s) ?? null) {
    if (order.includes(s)) fail('catalog: scene cycle');
    order.push(s);
  }
  if (order.length !== sceneIds.size) fail('catalog: unreachable scene');
  if (opts.season) checkReferences(scenes, order);
  return { version: c.version as string, entry, scenes, order };
}

/** Every parametric predicate must name an earlier scene (and, for `chose:`, a real choice and option). */
function checkReferences(scenes: readonly StoryScene[], order: readonly string[]): void {
  const at = new Map(order.map((sid, i) => [sid, i]));
  for (const sc of scenes) {
    const preds = sc.nodes.flatMap((n) => (n.type === 'branch' ? n.cases.map((c) => c.predicate) : n.type === 'activity_handoff' ? [n.predicate] : []));
    for (const p of preds) {
      if (p === 'always' || !p.includes(':')) continue;
      const [kind, rest] = p.split(':') as [string, string];
      const target = rest.split(/[.=]/)[0]!;
      const tScene = scenes.find((x) => x.id === target);
      if (!tScene || at.get(target)! > at.get(sc.id)!) fail(`${sc.id}: predicate ${p} names a missing or later scene`);
      if (kind === 'chose') {
        const [key, values] = rest.slice(target.length + 1).split('=') as [string, string];
        const node = tScene!.nodes.find((n) => n.id === key);
        if (node?.type !== 'choice') fail(`${sc.id}: predicate ${p} names a missing choice`);
        for (const v of values.split('|')) if (node?.type === 'choice' && !node.options.some((o) => o.id === v)) fail(`${sc.id}: predicate ${p} names a missing option ${v}`);
      }
    }
  }
}

/** Season One: the single story catalog. Weeks 1–4 are owner-approved; weeks 5–18 and the epilogue are empty slots. */
export const SEASON_ONE: StoryCatalog = parseCatalog(rawSeason, { version: SEASON_VERSION, branches: true, season: true });
export const CATALOGS: readonly StoryCatalog[] = [SEASON_ONE];
export const catalogFor = (version: string): StoryCatalog | undefined => CATALOGS.find((c) => c.version === version);
/** Story versions replaced by Season One; such saves are archived unchanged, never played. */
export const RETIRED_VERSIONS: readonly string[] = ['0.7', 'w24-draft-1'];

export function sceneById(sid: string): StoryScene | undefined {
  return SEASON_ONE.scenes.find((s) => s.id === sid);
}
export function nodeById(scene: StoryScene, nid: string): StoryNode | undefined {
  return scene.nodes.find((n) => n.id === nid);
}

/** Who the Season One crossbar is against and how it is set up. Same physics for every opponent. */
export interface CrossbarRules {
  readonly opponent: string;
  /** 'always': one warm-up each; 'choice': only if the scene's `warmup` choice is `yes` (or the older `challenge=warmup`). */
  readonly warmup: 'always' | 'choice';
  /** False: a tie after the counted shots stands as a draw. */
  readonly sudden: boolean;
}
const CROSSBAR_RULES: Readonly<Record<string, CrossbarRules>> = {
  S1_W01_S: { opponent: 'Sam', warmup: 'always', sudden: false },
  S1_W02_S: { opponent: 'Blake', warmup: 'choice', sudden: false },
  // V3 week 5: Sam's challenge, no warm-up choice in the scene; a tie stands ("Rematch next week").
  S1_W05_S: { opponent: 'Sam', warmup: 'always', sudden: false },
  // Weeks 6-7: Sam's recess again (his reactions; "Rematch next week" / lunch line on a tie).
  S1_W06_S: { opponent: 'Sam', warmup: 'always', sudden: false },
  S1_W07_S: { opponent: 'Sam', warmup: 'always', sudden: false },
};
export const crossbarRules = (sceneId: string): CrossbarRules => CROSSBAR_RULES[sceneId] ?? { opponent: 'Blake', warmup: 'choice', sudden: true };

/** Story detail for a completed Team Training week, from its real grade (weekDelta: +2 / +1 / 0 or -1). */
export const trainingDetail = (delta: number): 'strong' | 'steady' | 'struggled' => (delta >= 2 ? 'strong' : delta >= 1 ? 'steady' : 'struggled');

/**
 * Weeks 6+ Code reaction from the real grade: strong week; otherwise the evaluator's own "right choice,
 * did not come off" evidence ('execution'); otherwise a poor week is a 'poor_decision'. A steady week
 * with no such evidence gets no extra line. Older records without the evidence never claim it.
 */
export const decisionDetail = (rec: { readonly delta: number; readonly choiceMissed?: number }): 'strong' | 'execution' | 'poor_decision' | 'steady' =>
  rec.delta >= 2 ? 'strong' : (rec.choiceMissed ?? 0) > 0 ? 'execution' : rec.delta <= 0 ? 'poor_decision' : 'steady';
