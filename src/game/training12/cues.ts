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
  const near1 = pressureOn(s, me.pos, team);
  lines.push(near1 < 3 ? `An opponent is close: ${m(near1)} from you.` : `The nearest opponent is ${m(near1)} from you.`);
  if (holder && ours) {
    if (holder !== me) lines.push(`Pressure on the ball: ${m(pressureOn(s, holder.pos, team))}.`);
    const open = lanes.filter((l) => l.open).length;
    lines.push(lanes.length ? `${open} of ${lanes.length} passing lanes from the ball are open.` : 'No teammate to pass to.');
  } else if (holder) {
    const goals = s.targets.filter((t) => t.scoresFor === holderTeam);
    const gd = goals.length ? Math.min(...goals.map((t) => Math.abs(t.cx - holder.pos.x))) : null;
    if (gd !== null) lines.push(`The ball is ${m(gd)} from the goal you defend.`);
    const free = s.actors.filter((a) => a !== holder && teamOf(a.side) === holderTeam && !a.side.startsWith('GK') && pressureOn(s, a.pos, holderTeam!) > 4).length;
    lines.push(free ? `${free === 1 ? 'One of their players is' : `${free} of their players are`} unmarked.` : 'Every one of their other players is marked.');
  }
  return { lines, pressure: near.map((a) => a.slot), lanes };
}

/**
 * One short coaching question for the decision moment, worded from what is true in the frozen state (who has the
 * ball, who is pressing, how close pressure is). It frames the problem; it never names or hints at a choice.
 */
export function coachQuestion(s: DrillState): string {
  const me = human(s);
  const team = teamOf(me.side);
  const holder = actor(s, s.ball.owner);
  const holderTeam = holder ? teamOf(holder.side) : null;
  if (me.side.startsWith('GK')) return holderTeam === team ? 'You have it in goal. How do we start?' : 'They are coming at your goal. Where do you stand?';
  if (!holder) return 'The ball is loose. What do you do?';
  if (holderTeam === team || holderTeam === 'N') {
    if (holder === me) return pressureOn(s, me.pos, team) < 3 ? 'Pressure is coming. Where is the space?' : 'You have time on the ball. What helps most?';
    return 'Your teammate has the ball. How do you help?';
  }
  const presser = s.actors.find((a) => a !== me && teamOf(a.side) === team && !a.side.startsWith('GK') && Math.hypot(a.pos.x - holder.pos.x, a.pos.y - holder.pos.y) < 3);
  if (presser) return 'Your teammate is pressing. Which space should you protect?';
  return Math.hypot(me.pos.x - holder.pos.x, me.pos.y - holder.pos.y) < 6 ? 'You are nearest the ball. What is your job?' : 'They have the ball. Where should you be?';
}
