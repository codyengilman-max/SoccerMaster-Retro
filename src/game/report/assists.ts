/**
 * Assists and defensive points for every player, from the sim's own event log (framework-free, read-only).
 * Owner rules (2026-10-27): a completed pass whose receiver scores within ASSIST_RULES.windowSeconds of active sim
 * time (pauses excluded: the sim clock stops) is an assist. The receiver may control and dribble; another touch by a
 * teammate or opponent, a stoppage, or the window ending clears it. One assist per goal; no own goals or self-assists.
 * Defensive points in half-point units: slide tackle won 2, standing tackle won 1, interception 3 (each event once).
 */
import type { MatchEvent, MatchPlayerId, TeamId } from '../match/types';

export const ASSIST_RULES = { windowSeconds: 4 } as const;
export const DEFENSE_UNITS = { slide: 2, standing: 1, interception: 3, threshold: 20 } as const;

export interface PlayerContribution {
  assists: number;
  slideWon: number;
  standingWon: number;
  interceptions: number;
  /** Half-point units (20 = 10 defensive points). */
  defenseUnits: number;
}

const STOP: ReadonlySet<string> = new Set(['out', 'foul', 'offside', 'restart', 'halftime', 'secondHalf', 'fulltime', 'reset', 'kickoff']);

export class ContributionTracker {
  private lastSeq = -1;
  readonly players = new Map<MatchPlayerId, PlayerContribution>();
  /** Per team: the passer whose completed pass the receiver is still carrying. */
  private open = new Map<TeamId, { passer: MatchPlayerId; receiver: MatchPlayerId; at: number }>();
  private pendingPass = new Map<MatchPlayerId, MatchPlayerId>();
  private slideFrom = new Map<MatchPlayerId, number>();
  missed = 0;

  constructor(private readonly teamOf: (id: MatchPlayerId) => TeamId | undefined) {}

  private of(id: MatchPlayerId): PlayerContribution {
    let c = this.players.get(id);
    if (!c) this.players.set(id, (c = { assists: 0, slideWon: 0, standingWon: 0, interceptions: 0, defenseUnits: 0 }));
    return c;
  }

  observe(events: readonly MatchEvent[]): void {
    const fresh = events.filter((e) => e.seq > this.lastSeq);
    if (!fresh.length) return;
    if (this.lastSeq >= 0 && fresh[0]!.seq > this.lastSeq + 1) {
      // Lost events: never guess an assist across the gap.
      this.missed += fresh[0]!.seq - this.lastSeq - 1;
      this.open.clear();
      this.pendingPass.clear();
    }
    this.lastSeq = fresh.at(-1)!.seq;
    for (const e of fresh) this.step(e);
  }

  private step(e: MatchEvent): void {
    if (STOP.has(e.type)) {
      this.open.clear();
      this.pendingPass.clear();
      return;
    }
    const by = e.by;
    if (!by) return;
    const team = this.teamOf(by);
    if (!team) return;
    if (e.type === 'pass') {
      const r = e.detail.split(' ')[0] as MatchPlayerId | '';
      if (r) this.pendingPass.set(by, r);
      this.open.delete(team);
      return;
    }
    if (e.type === 'slide' && e.detail === 'start') this.slideFrom.set(by, e.at);
    if (e.type === 'received') {
      const passer = [...this.pendingPass].find(([p, r]) => r === by && this.teamOf(p) === team)?.[0];
      this.pendingPass.clear();
      for (const t of this.open.keys()) if (t !== team || this.open.get(t)!.receiver !== by) this.open.delete(t);
      if (passer && passer !== by) this.open.set(team, { passer, receiver: by, at: e.at });
      return;
    }
    if (e.type === 'tackle' || e.type === 'intercepted') {
      this.pendingPass.clear();
      this.open.clear();
      const c = this.of(by);
      const slid = this.slideFrom.has(by) && e.at - this.slideFrom.get(by)! <= 1.5;
      this.slideFrom.delete(by);
      if (e.type === 'tackle') {
        if (slid) (c.slideWon++, (c.defenseUnits += DEFENSE_UNITS.slide));
        else if (e.detail.includes('standing')) (c.standingWon++, (c.defenseUnits += DEFENSE_UNITS.standing));
      } else if (slid) (c.slideWon++, (c.defenseUnits += DEFENSE_UNITS.slide));
      else (c.interceptions++, (c.defenseUnits += DEFENSE_UNITS.interception));
      return;
    }
    if (e.type === 'goal') {
      const scoring = e.detail.split(' ')[0] as TeamId;
      const o = this.open.get(scoring);
      this.open.clear();
      this.pendingPass.clear();
      if (team !== scoring || !o || o.receiver !== by || o.passer === by) return;
      if (e.at - o.at <= ASSIST_RULES.windowSeconds) this.of(o.passer).assists++;
    }
  }
}
