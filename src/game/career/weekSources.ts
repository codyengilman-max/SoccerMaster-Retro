/**
 * Builds one week's development sources (home 35 / team 35 / match 30) from the saved career only.
 * Framework-free and pure; the same week always produces the same sources, so a review replayed after a
 * reload, refresh or duplicate event cannot earn more.
 */
import { activityById } from './catalog';
import { DEV_CONFIG, type SourceWeek } from './development';
import { meets, specFor } from './homeMastery';
import { situationById } from './teamTraining';
import type { AttributeId } from './types';
import type { CareerSave } from './state';
import { seasonWeek } from '../season/calendar';
import type { MatchStats } from '../report/stats';

type Alloc = Partial<Record<AttributeId, number>>;

/** Home skill and activity mappings (each sums to 1). Juggling never needs aerial play. */
export const HOME_ALLOCATION: Readonly<Record<'juggling' | 'firstTouch' | 'passing', Alloc>> = {
  juggling: { firstTouch: 0.5, dribbling: 0.5 },
  firstTouch: { firstTouch: 0.6, dribbling: 0.2, agility: 0.2 },
  passing: { passing: 0.7, composure: 0.3 },
};
/** Team Training: half to the tactical read, half to the attributes the scenario's situations practise. */
export const TEAM_AWARENESS_SHARE = 0.5;
/** Matches: a fixed physical/mental share, the rest split by the player's counted involvements. */
export const MATCH_FIXED: Readonly<Alloc> = { composure: 0.1, strength: 0.1, agility: 0.1, pace: 0.1 };
const CONFIDENCE = { high: 1, medium: 0.75, low: 0.5, none: 0 } as const;

const add = (into: Record<string, number>, from: Alloc, w: number) => {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + (v ?? 0) * w;
};

export function matchAllocation(s: MatchStats): Alloc {
  const raw: Alloc = {
    passing: s.passes.den,
    awareness: s.passes.den / 2 + s.interceptions,
    firstTouch: s.involvements,
    dribbling: s.possessions,
    finishing: s.shotsOnTarget.den,
    defending: s.recoveries + s.interceptions + s.slides.den,
  };
  const total = Object.values(raw).reduce((a, b) => a + (b ?? 0), 0);
  const fixed = Object.values(MATCH_FIXED).reduce((a, b) => a + (b ?? 0), 0);
  const out: Record<string, number> = { ...MATCH_FIXED };
  if (total > 0) add(out, raw, (1 - fixed) / total);
  return out;
}

/** Home: each distinct activity counts once a week (best entry), the best three count, a third each. */
function home(save: CareerSave, week: number): SourceWeek {
  const best = new Map<string, { score: number; alloc: Alloc }>();
  const offer = (id: string, score: number, alloc: Alloc) => {
    const cur = best.get(id);
    if (!cur || score > cur.score) best.set(id, { score, alloc });
  };
  for (const l of save.homeLogs) {
    if (l.week !== week) continue;
    const spec = specFor(l.skill, l.phase);
    if (!spec) continue;
    offer(`home:${l.skill}:${l.activityId}`, l.attempts.filter((a) => meets(spec, a)).length / Math.max(1, l.attempts.length), HOME_ALLOCATION[l.skill]);
  }
  for (const j of save.journal) {
    if (j.week !== week || !j.credited || j.completion === 'skipped') continue;
    const a = activityById(j.activityId);
    const alloc: Alloc = a?.relatedAttribute ? { [a.relatedAttribute]: 1 } : HOME_ALLOCATION.juggling;
    offer(`journal:${j.activityId}`, j.completion === 'done' ? 1 : 0.5, alloc);
  }
  const top = [...best.entries()].sort((x, y) => y[1].score - x[1].score || (x[0] < y[0] ? -1 : 1)).slice(0, DEV_CONFIG.homeActivitiesMax);
  const allocation: Record<string, number> = {};
  for (const [, v] of top) add(allocation, v.alloc, v.score);
  const score = top.reduce((s, [, v]) => s + v.score, 0) / DEV_CONFIG.homeActivitiesMax;
  // Home Training opens from Week 2 in the story; a Week 1 with nothing logged had nothing scheduled.
  const status = top.length ? 'done' : week >= 2 ? 'skipped' : 'none';
  return { source: 'home', status, score, allocation, activities: top.map(([k]) => k) };
}

/** Team: the week's one scheduled scenario, counted once (legacy, All36 or v1.2 sessions all write one record). */
function team(save: CareerSave, week: number): SourceWeek {
  const rec = save.teamTraining.find((t) => t.week === week);
  if (!rec || rec.scores.length === 0) return { source: 'team', status: 'skipped', score: 0, allocation: { awareness: 1 }, activities: [] };
  const allocation: Record<string, number> = { awareness: TEAM_AWARENESS_SHARE };
  const attrs = [...new Set(rec.situations.flatMap((id) => situationById(id)?.attributes ?? []))];
  if (attrs.length) add(allocation, Object.fromEntries(attrs.map((a) => [a, 1 / attrs.length])), 1 - TEAM_AWARENESS_SHARE);
  else allocation.awareness = 1;
  const score = rec.scores.reduce((a, b) => a + b, 0) / rec.scores.length;
  return { source: 'team', status: 'done', score, allocation, activities: [...rec.situations] };
}

/** Match: every official report of the week shares one match share, weighted by involvement. */
function match(save: CareerSave, week: number): SourceWeek {
  const sw = seasonWeek(week);
  const scheduled = !!sw && (sw.kind === 'league' || sw.kind === 'tournament' || sw.kind === 'state_cup' || sw.friendly !== null);
  const played = save.reports.filter((r) => r.week === week && r.minutes > 0);
  if (!played.length) return { source: 'match', status: scheduled ? 'skipped' : 'none', score: 0, allocation: {}, activities: [] };
  const allocation: Record<string, number> = {};
  let score = 0;
  for (const r of played) {
    score += (Math.max(0, Math.min(100, r.rating.overall ?? 0)) / 100) * CONFIDENCE[r.rating.confidence];
    add(allocation, matchAllocation(r.stats), 1 / played.length);
  }
  return { source: 'match', status: 'done', score: score / played.length, allocation, activities: played.map((r) => r.matchId) };
}

export function weekSources(save: CareerSave, week: number): SourceWeek[] {
  return [home(save, week), team(save, week), match(save, week)];
}
