import type { MatchEvent, MatchPlayerId, MatchState } from '../match/types';

/** Bump when a rule below changes; settled reports keep the version they were built with. */
export const LEDGER_VERSION = 1;

export const LEDGER_RULES = {
  /** Receiver counts as open if no opponent is closer than this when the pass is played (same as EVIDENCE_RULES). */
  openYards: 5,
  /** A slide earns success only if it wins the ball within this long, without a foul. */
  slideWindowSeconds: 1.5,
} as const;

export type LedgerKind =
  | 'pass'
  | 'shot'
  | 'goal'
  | 'involvement'
  | 'possession'
  | 'possessionLost'
  | 'recovery'
  | 'interception'
  | 'slide'
  | 'foul';

/** One validated action by the tracked player. `id` is unique per match (built from the sim's event seq). */
export interface LedgerEvent {
  readonly id: string;
  readonly kind: LedgerKind;
  /** Match seconds (sim time). */
  readonly at: number;
  /** Pass: 'complete' | 'failed' | 'pending'; shot: 'goal' | 'onTarget' | 'off' | 'pending'; slide: 'won' | 'foul' | 'none' | 'pending'. */
  outcome: string;
  /** Pass only: the receiver was open at the moment of the pass (decision evidence, not the result). */
  readonly open?: boolean;
  /** Pass only: 'ground' (this match engine has no chipped pass). */
  readonly style?: 'ground';
}

/**
 * Reads the authoritative sim state and its event log every frame and records the career player's own
 * actions once each (keyed by event seq, so repeated physics callbacks or re-reads never double count).
 * Read-only. Button presses are not events: a cancelled kick never reaches `pass` / `shot`.
 */
export class MatchLedger {
  private lastSeq = -1;
  readonly events: LedgerEvent[] = [];
  private openPass: LedgerEvent | null = null;
  private openShot: LedgerEvent | null = null;
  private openSlide: LedgerEvent | null = null;
  private owning = false;
  private episodeLost = false;
  /** Events that left the rolling log before being read; reported, never guessed. */
  missed = 0;

  constructor(readonly playerId: MatchPlayerId) {}

  private add(e: MatchEvent, kind: LedgerKind, outcome = '', extra: Partial<LedgerEvent> = {}): LedgerEvent {
    const ev: LedgerEvent = { id: `${kind}-${e.seq}`, kind, at: e.at, outcome, ...extra };
    this.events.push(ev);
    return ev;
  }

  private close(outcomePass: string, outcomeShot: string | null): void {
    if (this.openPass) (this.openPass.outcome = outcomePass), (this.openPass = null);
    if (this.openShot && outcomeShot) (this.openShot.outcome = outcomeShot), (this.openShot = null);
  }

  observe(state: Readonly<MatchState>, events: readonly MatchEvent[]): void {
    const me = this.playerId;
    const fresh = events.filter((e) => e.seq > this.lastSeq);
    if (fresh.length > 0) {
      if (this.lastSeq >= 0 && fresh[0]!.seq > this.lastSeq + 1) {
        this.missed += fresh[0]!.seq - this.lastSeq - 1;
        // Lost track: drop open outcomes instead of inventing them.
        if (this.openPass) (this.openPass.outcome = 'unknown'), (this.openPass = null);
        if (this.openShot) (this.openShot.outcome = 'unknown'), (this.openShot = null);
        if (this.openSlide) (this.openSlide.outcome = 'unknown'), (this.openSlide = null);
      }
      this.lastSeq = fresh[fresh.length - 1]!.seq;
    }
    const team = (id: MatchPlayerId | null) => (id ? state.players[id]?.team : undefined);
    for (const e of fresh) {
      const mine = e.by === me;
      const away = team(e.by) === 'away';
      if (e.type === 'pass' && mine) {
        const rid = e.detail.split(' ')[0] as MatchPlayerId | '';
        const r = rid ? state.players[rid] : undefined;
        let open = false;
        if (r) {
          let nearest = Infinity;
          for (const p of Object.values(state.players)) if (p.team === 'away') nearest = Math.min(nearest, Math.hypot(p.pos.x - r.pos.x, p.pos.y - r.pos.y));
          open = nearest >= LEDGER_RULES.openYards;
        }
        if (this.openPass) this.openPass.outcome = 'failed';
        this.openPass = this.add(e, 'pass', 'pending', { open, style: 'ground' });
      } else if (e.type === 'shot' && mine) {
        if (this.openShot) this.openShot.outcome = 'off';
        this.openShot = this.add(e, 'shot', 'pending');
      } else if (e.type === 'goal') {
        // The sim names the last kicker; the detail names the scoring team, so an own goal is never the player's goal.
        const ours = mine && e.detail.split(' ')[0] === team(me);
        if (ours) this.add(e, 'goal');
        this.close('failed', ours ? 'goal' : 'off');
      } else if ((e.type === 'saved' || e.type === 'parried') && away) {
        this.close('failed', 'onTarget');
      } else if (e.type === 'out') {
        this.close('failed', 'off');
      } else if (e.type === 'received' && !mine && team(e.by) === 'home') {
        this.close('complete', 'off');
      } else if ((e.type === 'intercepted' || e.type === 'tackle' || e.type === 'received') && away) {
        this.close('failed', 'off');
      }
      if (mine && (e.type === 'received' || e.type === 'intercepted' || e.type === 'tackle')) this.add(e, 'involvement');
      if (mine && (e.type === 'intercepted' || e.type === 'tackle')) {
        this.add(e, 'recovery');
        if (e.type === 'intercepted') this.add(e, 'interception');
        if (this.openSlide && e.type === 'tackle') (this.openSlide.outcome = 'won'), (this.openSlide = null);
      }
      if (mine && e.type === 'slide' && e.detail === 'start') {
        if (this.openSlide) this.openSlide.outcome = 'none';
        this.openSlide = this.add(e, 'slide', 'pending');
      }
      if (mine && e.type === 'slide' && e.detail === 'recovered' && this.openSlide) {
        const won = state.ball.owner !== null && team(state.ball.owner) === 'home' && e.at - this.openSlide.at <= LEDGER_RULES.slideWindowSeconds;
        this.openSlide.outcome = won ? 'won' : 'none';
        this.openSlide = null;
      }
      if (mine && e.type === 'foul') {
        this.add(e, 'foul');
        if (this.openSlide) (this.openSlide.outcome = 'foul'), (this.openSlide = null);
      }
      // A possession loss is counted once per episode of the player's own control.
      if (this.owning && !this.episodeLost && e.type === 'possession' && away) {
        this.add(e, 'possessionLost');
        this.episodeLost = true;
      }
    }
    const owns = state.ball.owner === me;
    if (owns && !this.owning) {
      this.events.push({ id: `possession-${this.lastSeq}-${this.events.length}`, kind: 'possession', at: state.simTime, outcome: '' });
      this.episodeLost = false;
    }
    if (!owns && this.owning && state.ball.owner !== null && team(state.ball.owner) === 'home') this.episodeLost = true;
    this.owning = owns;
    if (this.openSlide && state.simTime - this.openSlide.at > LEDGER_RULES.slideWindowSeconds) (this.openSlide.outcome = 'none'), (this.openSlide = null);
  }

  /** Closes anything still open at full time: unresolved outcomes stay unknown rather than guessed. */
  finish(): readonly LedgerEvent[] {
    for (const o of [this.openPass, this.openShot, this.openSlide]) if (o && o.outcome === 'pending') o.outcome = 'unknown';
    this.openPass = this.openShot = this.openSlide = null;
    return this.events;
  }
}
