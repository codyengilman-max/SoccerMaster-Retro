import type { CareerSave } from '../career/state';
import { defensePoints, type SavedReport } from './report';

/** Assists and defensive points; reports saved before tracking existed say so instead of showing 0. */
export function contributionLines(r: SavedReport): string[] {
  const c = r.contribution;
  if (!c) return ['Assists, slide tackles won, standing tackles won, interceptions, defensive points: not tracked for this match'];
  const m = c.mine;
  const all = Object.entries(c.assistsBy).sort(([a], [b]) => a.localeCompare(b));
  const side = (p: string) => all.filter(([id]) => id.startsWith(p)).map(([id, n]) => `${id} ${n}`).join(', ') || 'none';
  return [
    `Assists: ${m.assists}`,
    `Successful slide tackles: ${m.slideWon}`,
    `Successful standing tackles: ${m.standingWon}`,
    `Interceptions (pass cut out and kept): ${m.interceptions}`,
    `Defensive points: ${defensePoints(m.defenseUnits)}`,
    `All assists - Batavia: ${side('H')}; opponents: ${side('A')}`,
  ];
}

/** Player statistics across saved matches; assists and defensive points only from matches that tracked them. */
export function seasonTotals(save: CareerSave): string {
  const r = save.reports;
  const tracked = r.filter((x) => x.contribution);
  const goals = r.reduce((n, x) => n + x.stats.goals, 0);
  if (!tracked.length) return `Goals ${goals} in ${r.length} match${r.length === 1 ? '' : 'es'} - assists and defensive points: not tracked yet`;
  const sum = (k: 'assists' | 'defenseUnits') => tracked.reduce((n, x) => n + x.contribution!.mine[k], 0);
  const part = tracked.length < r.length ? ` (${tracked.length} of ${r.length} matches tracked)` : '';
  return `Goals ${goals} - Assists ${sum('assists')} - Defensive points ${defensePoints(sum('defenseUnits'))}${part}`;
}

