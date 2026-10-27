/**
 * Assists and defensive points for every player on both teams, read from the sim's own event log (framework-free,
 * read-only, keyed by event seq so re-reads never double count). Owner rules 2026-10-27, see docs/training/home/TARGETS.md.
 *
 * Assist: a completed pass (a teammate receives it under control) whose receiver scores within
 * ASSIST_RULES.windowSeconds of sim time from the reception. The sim clock stops while paused, so pauses never count.
 * The receiver may dribble and shoot; any other player's touch (team-mate or opponent), any stoppage or the time limit
 * ending clears it. One assist per goal; never an own goal or a self-assist. The 9v9 engine plays ground passes only
 * (no chip or cross exists yet), and every pass event qualifies, set-piece passes included.
 *
 * Defensive points, in half-point units (DEFENSE_UNITS): a successful slide tackle 2, standing tackle 1,
 * interception 3. Each action is classified once:
 * - Slide: a clean ball contact (poke, touch, or the slider winning the ball), no foul, then controlled possession
 *   for the slider's team within DEFENSE_RULES.recoverySeconds of the slide starting. Missed slides, fouls and pokes
 *   the opponents collect first score nothing. A slide that cuts out a pass is a slide only.
 * - Standing tackle: only a sim 'tackle' event whose detail starts with "standing" (PR D). The current engine's
 *   contact tackle ("won the ball from ...") is an ordinary collision and scores nothing.
 * - Interception: cutting out an opponent's pass (never a shot) and controlled possession for the cutter's team,
 *   directly or after a deflection within the same recovery time. The team-mate who collects the loose ball gets
 *   nothing extra.
 */
import type { MatchEvent, MatchPlayerId, TeamId } from '../match/types';

export const ASSIST_RULES = { windowSeconds: 4 } as const;
export const DEFENSE_RULES = { recoverySeconds: 2 } as const;
export const DEFENSE_UNITS = { slide: 2, standing: 1, interception: 3, threshold: 20 } as const;
export const CONTRIBUTION_VERSION = 1;

export interface PlayerContribution {
  assists: number;
  slideWon: number;
  standingWon: number;
  interceptions: number;
  /** Half-point units (20 = 10 defensive points). */
  defenseUnits: number;
}

export interface ContributionRules {
  readonly windowSeconds: number;
  readonly recoverySeconds: number;
}

/** What the tracker needs from the match: each player's team and the sim clock. */
export interface ContributionView {
  readonly simTime: number;
  readonly players: Readonly<Record<string, { readonly team: TeamId }>>;
}

const STOP: ReadonlySet<string> = new Set(['out', 'foul', 'offside', 'restart', 'halftime', 'secondHalf', 'fulltime', 'reset', 'kickoff', 'goal']);
/** Events where the named player touches or wins the ball. */
const TOUCH: ReadonlySet<string> = new Set(['pass', 'shot', 'received', 'intercepted', 'tackle', 'deflected', 'saved', 'parried']);
const GAIN: ReadonlySet<string> = new Set(['received', 'intercepted', 'tackle', 'saved']);

interface Slide { readonly by: MatchPlayerId; readonly team: TeamId; readonly at: number; contact: boolean; dirty: boolean }
interface Cut { readonly by: MatchPlayerId; readonly team: TeamId; readonly at: number }

export const emptyContribution = (): PlayerContribution => ({ assists: 0, slideWon: 0, standingWon: 0, interceptions: 0, defenseUnits: 0 });

export class ContributionTracker {
  private lastSeq = -1;
  readonly players = new Map<MatchPlayerId, PlayerContribution>();
  /** Per team: the passer whose completed pass the receiver is still carrying. */
  private open = new Map<TeamId, { passer: MatchPlayerId; receiver: MatchPlayerId; at: number }>();
  private pendingPass: { passer: MatchPlayerId; team: TeamId } | null = null;
  /** Last kick still travelling: who kicked it, their team and whether it was a pass. */
  private kick: { by: MatchPlayerId; team: TeamId; pass: boolean } | null = null;
  private slides: Slide[] = [];
  private cut: Cut | null = null;
  /** Events that left the rolling log before being read; reported, never guessed. */
  missed = 0;
  private team: (id: MatchPlayerId | null) => TeamId | undefined = () => undefined;

  constructor(private readonly rules: ContributionRules = { ...ASSIST_RULES, ...DEFENSE_RULES }) {}

  of(id: MatchPlayerId): PlayerContribution {
    let c = this.players.get(id);
    if (!c) this.players.set(id, (c = emptyContribution()));
    return c;
  }

  private reset(): void {
    this.open.clear();
    this.pendingPass = null;
    this.kick = null;
    this.slides = [];
    this.cut = null;
  }

  observe(view: ContributionView, events: readonly MatchEvent[]): void {
    this.team = (id) => (id ? view.players[id]?.team : undefined);
    const fresh = events.filter((e) => e.seq > this.lastSeq);
    if (fresh.length) {
      if (this.lastSeq >= 0 && fresh[0]!.seq > this.lastSeq + 1) {
        this.missed += fresh[0]!.seq - this.lastSeq - 1;
        this.reset();
      }
      this.lastSeq = fresh.at(-1)!.seq;
      for (const e of fresh) this.step(e);
    }
    this.expire(view.simTime);
  }

  private expire(now: number): void {
    const R = this.rules.recoverySeconds;
    this.slides = this.slides.filter((s) => now - s.at <= R);
    if (this.cut && now - this.cut.at > R) this.cut = null;
  }

  private step(e: MatchEvent): void {
    this.expire(e.at);
    if (e.type === 'goal') this.goal(e);
    if (e.type === 'foul' && e.by) for (const s of this.slides) if (s.by === e.by) s.dirty = true;
    if (STOP.has(e.type)) return this.reset();
    const by = e.by;
    const team = this.team(by);
    if (!by || !team) return;
    if (e.type === 'slide') return this.slide(e, by, team);
    if (!TOUCH.has(e.type) && e.type !== 'dribble') return;
    // Any touch by someone other than the open chain's receiver ends that chain.
    for (const [t, o] of [...this.open]) if (o.receiver !== by) this.open.delete(t);
    if (GAIN.has(e.type)) this.gain(e, by, team);
    if (e.type === 'pass') {
      this.pendingPass = { passer: by, team };
      this.kick = { by, team, pass: true };
    } else if (e.type === 'shot') {
      this.pendingPass = null;
      this.kick = { by, team, pass: false };
    } else if (e.type === 'deflected') {
      if (this.pendingPass && this.pendingPass.passer !== by) this.pendingPass = null;
      if (this.kick && this.kick.pass && this.kick.team !== team && !this.cut && !this.slides.some((s) => s.team === team)) this.cut = { by, team, at: e.at };
    } else if (e.type === 'parried') {
      this.pendingPass = null;
    }
  }

  private slide(e: MatchEvent, by: MatchPlayerId, team: TeamId): void {
    if (e.detail === 'start') {
      this.slides = this.slides.filter((s) => s.by !== by);
      this.slides.push({ by, team, at: e.at, contact: false, dirty: false });
      return;
    }
    const s = this.slides.find((x) => x.by === by);
    if (e.detail.startsWith('ball poked') || e.detail === 'ball touched') {
      if (s) s.contact = true;
      // The poke is the slider's touch: it ends any chain and any pass still travelling.
      for (const [t, o] of [...this.open]) if (o.receiver !== by) this.open.delete(t);
      this.pendingPass = null;
      this.kick = { by, team, pass: false };
    } else if (e.detail.startsWith('contact ') && s) s.dirty = true;
  }

  /** Controlled possession by `by`: resolves open slides and cuts, then completes a pass or counts an interception. */
  private gain(e: MatchEvent, by: MatchPlayerId, team: TeamId): void {
    let credited = false;
    for (const s of this.slides) {
      const own = s.team === team;
      if (own && !s.dirty && (s.contact || (s.by === by && e.type === 'tackle'))) {
        const c = this.of(s.by);
        c.slideWon++;
        c.defenseUnits += DEFENSE_UNITS.slide;
        credited = true;
      }
    }
    this.slides = [];
    if (this.cut) {
      if (this.cut.team === team && !credited) {
        const c = this.of(this.cut.by);
        c.interceptions++;
        c.defenseUnits += DEFENSE_UNITS.interception;
        credited = true;
      }
      this.cut = null;
    }
    if (!credited && e.type === 'intercepted' && this.kick?.pass && this.kick.team !== team) {
      const c = this.of(by);
      c.interceptions++;
      c.defenseUnits += DEFENSE_UNITS.interception;
    }
    if (!credited && e.type === 'tackle' && e.detail.startsWith('standing')) {
      const c = this.of(by);
      c.standingWon++;
      c.defenseUnits += DEFENSE_UNITS.standing;
    }
    const p = this.pendingPass;
    if (e.type === 'received' && p && p.team === team && p.passer !== by) this.open.set(team, { passer: p.passer, receiver: by, at: e.at });
    this.pendingPass = null;
    this.kick = null;
  }

  private goal(e: MatchEvent): void {
    const scoring = e.detail.split(' ')[0] as TeamId;
    const o = this.open.get(scoring);
    if (!o || !e.by || this.team(e.by) !== scoring || o.receiver !== e.by || o.passer === e.by) return;
    if (e.at - o.at <= this.rules.windowSeconds) this.of(o.passer).assists++;
  }

  /** Final per-player table, sorted by id, every player present (zeros included). */
  table(ids: readonly MatchPlayerId[]): Record<string, PlayerContribution> {
    const out: Record<string, PlayerContribution> = {};
    for (const id of [...ids].sort()) out[id] = { ...(this.players.get(id) ?? emptyContribution()) };
    return out;
  }
}
