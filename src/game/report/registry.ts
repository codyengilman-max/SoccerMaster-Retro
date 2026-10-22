import type { AttributeId } from '../career/types';

/** Bump when a mapping or weight changes. Settled reports and weeks store the version they used. */
export const REGISTRY_VERSION = 1;

export type DevSource = 'home' | 'team' | 'match' | 'recess';
/** Shares of the weekly development opportunity (not attribute points, not match-rating weights). */
export const DEV_WEIGHTS: Readonly<Record<DevSource, number>> = { home: 0.35, team: 0.3, match: 0.3, recess: 0.05 };

/**
 * This week's source shares. Unscheduled recess is shared between home and team in proportion; a skipped
 * activity is never redistributed, and a no-match week leaves the match share unearned (not a poor score).
 */
export function weekBudget(recessScheduled: boolean): Readonly<Record<DevSource, number>> {
  if (recessScheduled) return DEV_WEIGHTS;
  const r = DEV_WEIGHTS.recess;
  const ht = DEV_WEIGHTS.home + DEV_WEIGHTS.team;
  return { home: DEV_WEIGHTS.home + (r * DEV_WEIGHTS.home) / ht, team: DEV_WEIGHTS.team + (r * DEV_WEIGHTS.team) / ht, match: DEV_WEIGHTS.match, recess: 0 };
}

/**
 * Every match of a week shares the one match budget: each match's factor (0–1, already confidence
 * weighted) contributes by its share of the week's counted opportunities, so more matches never add more.
 */
export function matchShare(matches: readonly { readonly factor: number; readonly opportunities: number }[]): number {
  const opp = matches.reduce((a, m) => a + Math.max(0, m.opportunities), 0);
  if (opp === 0) return 0;
  const f = matches.reduce((a, m) => a + Math.min(1, Math.max(0, m.factor)) * Math.max(0, m.opportunities), 0) / opp;
  return DEV_WEIGHTS.match * f;
}

export interface MappingEntry {
  readonly event: string;
  readonly evidence: string;
  readonly statistic: string;
  readonly category: 'decision' | 'execution' | 'positioning' | 'defending' | null;
  /** Attributes the event feeds; a split, never a full reward each. Empty = statistic only. */
  readonly attributes: readonly AttributeId[];
  readonly explanation: string;
}

/** The one table linking events to statistics, rating categories and attributes (docs/REPORTS.md). */
export const MAPPING: readonly MappingEntry[] = [
  { event: 'pass', evidence: 'sim `pass` event by the player; outcome from the next reception, interception, tackle or out', statistic: 'Passes completed/attempted (ground)', category: 'execution', attributes: ['passing'], explanation: 'Completed when a teammate controls it first.' },
  { event: 'pass choice', evidence: 'receiver open (no opponent within 5 yd) at the moment of the pass', statistic: '—', category: 'decision', attributes: ['awareness'], explanation: 'Judged at the moment of choice, not by the result.' },
  { event: 'received', evidence: 'sim `received` event by the player', statistic: 'Controlled involvements', category: 'execution', attributes: ['firstTouch'], explanation: 'One per controlled contact; not a true touch count.' },
  { event: 'possession', evidence: 'ball owner becomes the player', statistic: 'Possessions; possession losses (once per episode)', category: 'execution', attributes: ['dribbling'], explanation: 'A lost episode counts once.' },
  { event: 'shot', evidence: 'sim `shot` event; goal or keeper save = on target', statistic: 'Shots on target/attempted; goals; conversion', category: 'execution', attributes: ['finishing'], explanation: 'Blocks and woodwork misses are off target.' },
  { event: 'goal', evidence: 'sim `goal` event by the player', statistic: 'Goals', category: null, attributes: [], explanation: 'Summary of the shot; no extra reward.' },
  { event: 'tackle / intercepted', evidence: 'sim event by the player', statistic: 'Recoveries; interceptions', category: 'defending', attributes: ['defending'], explanation: 'Winning the ball back.' },
  { event: 'slide', evidence: '`slide start` then a tackle or recovery within 1.5 s with no foul', statistic: 'Slide challenges won/attempted', category: 'defending', attributes: ['defending'], explanation: 'Contact alone or a foul is not success.' },
  { event: 'foul', evidence: 'sim `foul` event by the player', statistic: 'Fouls committed', category: 'defending', attributes: [], explanation: 'Never rewarded.' },
];

/** Requested attributes this game does not have; shown as "not tracked", never invented. */
export const NOT_TRACKED = ['Lofted Delivery', 'Composure', 'Strength/Balance', 'Agility', 'Pace', 'Handling', 'Reflexes', 'GK Positioning', 'Throwing', 'Kicking'] as const;
