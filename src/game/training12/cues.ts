/**
 * Situation cues for the Team Training hint: what a player could read at the frozen decision moment (pressure,
 * lanes, space, danger). Read from the drill state only; never says which choice is best. Framework-free.
 */
import { actor, human, laneClearance, pressureOn, teamOf, type DrillState } from './drill';

export interface Cues {
  readonly lines: readonly string[];
  /** Opponents close enough to matter, by slot. */
  readonly pressure: readonly string[];
  /** Every pass lane from the ball holder to a teammate, with whether it is open. */
  readonly lanes: readonly { readonly to: string; readonly open: boolean }[];
}

const m = (n: number): string => `${Math.max(0, Math.round(n))} m`;

export function situationCues(s: DrillState): Cues {
  const me = human(s);
  const team = teamOf(me.side);
  const holder = actor(s, s.ball.owner);
  const holderTeam = holder ? teamOf(holder.side) : null;
  const ours = holderTeam === team || holderTeam === 'N';
  const near = s.actors.filter((a) => { const t = teamOf(a.side); return t !== team && t !== 'N' && Math.hypot(a.pos.x - me.pos.x, a.pos.y - me.pos.y) < 8; });
  const lanes = holder && ours
    ? s.actors.filter((a) => a !== holder && (teamOf(a.side) === team || teamOf(a.side) === 'N')).map((a) => ({ to: a.slot, open: laneClearance(s, holder.pos, a.pos, team) > 0.5 }))
    : [];
  const lines: string[] = [];
  lines.push(`Nearest opponent to you: ${m(pressureOn(s, me.pos, team))}.`);
  if (holder && ours) {
    if (holder !== me) lines.push(`Pressure on the ball: ${m(pressureOn(s, holder.pos, team))}.`);
    lines.push(`Open pass lanes from the ball: ${lanes.filter((l) => l.open).length} of ${lanes.length}.`);
  } else if (holder) {
    const goals = s.targets.filter((t) => t.scoresFor === holderTeam);
    const gd = goals.length ? Math.min(...goals.map((t) => Math.abs(t.cx - holder.pos.x))) : null;
    if (gd !== null) lines.push(`The ball is ${m(gd)} from the target you defend.`);
    const free = s.actors.filter((a) => a !== holder && teamOf(a.side) === holderTeam && !a.side.startsWith('GK') && pressureOn(s, a.pos, holderTeam!) > 4).length;
    lines.push(`Their free runners (no one within 4 m): ${free}.`);
  }
  return { lines, pressure: near.map((a) => a.slot), lanes };
}
