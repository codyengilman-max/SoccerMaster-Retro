import type { LearningEntry } from '../coach/director';
import type { MatchEvent, MatchPlayerId, MatchState } from '../match/types';
import type { EvidenceItem } from './progression';
import type { AttributeId } from './types';

export interface PitchInfo {
  readonly length: number;
  readonly width: number;
  readonly goalCenterY: number;
  readonly goalHalfWidth: number;
}

/** Tunable evidence rules. Documented in docs/TRAINING.md. */
export const EVIDENCE_RULES = {
  /** A reception counts as kept if the career player still has it after this long, or plays it on. */
  keepSeconds: 1.5,
  /** Receiver counts as open if no opponent is closer than this when the pass is played. */
  openYards: 5,
  /** Shot from further than this is a poor choice for a U11 9v9 sandbox. */
  shotMaxYards: 22,
  /** Aim this far from the goal centre counts as placed away from the keeper. */
  placedYards: 1.5,
  /** Career player this close to the opponent carrier is "involved" in a duel. */
  duelYards: 6,
  /** Involved player still this close when the ball is won back gets the credit. */
  regainYards: 10,
  duelTimeoutSeconds: 10,
} as const;

type Pending = { kind: AttributeId; at: number; situation: string; extra?: string };

/**
 * Reads the real sandbox state and its event log and turns the career player's own actions into
 * evidence. Read-only: it never changes the sim. Tracks `seq` so the 40-event rolling window is safe
 * as long as it is called at least once per 40 events (every frame in practice).
 */
export class EvidenceCollector {
  private lastSeq = -1;
  private reception: Pending | null = null;
  private pass: Pending | null = null;
  private carry: Pending | null = null;
  private duel: Pending | null = null;
  /** Events that left the window before being read; reported, never guessed. */
  missed = 0;

  constructor(
    readonly careerId: MatchPlayerId,
    private readonly pitch: PitchInfo,
  ) {}

  private zone(x: number, y: number): string {
    const t = Math.min(2, Math.max(0, Math.floor((x / this.pitch.length) * 3)));
    const l = Math.min(2, Math.max(0, Math.floor((y / this.pitch.width) * 3)));
    return `${['def', 'mid', 'att'][t]}-${['l', 'c', 'r'][l]}`;
  }

  observe(state: Readonly<MatchState>, events: readonly MatchEvent[]): EvidenceItem[] {
    const out: EvidenceItem[] = [];
    const me = state.players[this.careerId];
    const fresh = events.filter((e) => e.seq > this.lastSeq);
    if (fresh.length > 0) {
      if (this.lastSeq >= 0 && fresh[0]!.seq > this.lastSeq + 1) {
        this.missed += fresh[0]!.seq - this.lastSeq - 1;
        // Lost track: drop pending opportunities instead of inventing outcomes.
        this.reception = this.pass = this.carry = this.duel = null;
      }
      this.lastSeq = fresh[fresh.length - 1]!.seq;
    }
    const give = (p: Pending, success: 0 | 0.5 | 1, note: string, attribute: AttributeId = p.kind) =>
      out.push({ attribute, source: 'match', situation: p.situation, success, note });
    const zone = this.zone(me.pos.x, me.pos.y);
    const R = EVIDENCE_RULES;

    for (const e of fresh) {
      const mine = e.by === this.careerId;
      const awayBy = e.by !== null && state.players[e.by]?.team === 'away';
      if (e.type === 'received' && mine) this.reception = { kind: 'firstTouch', at: e.at, situation: `recv-${zone}` };
      if (e.type === 'deflected' && mine) give({ kind: 'firstTouch', at: e.at, situation: `recv-${zone}` }, 0, 'Ball came off you');
      if ((e.type === 'dribble' || e.type === 'feint') && mine && !this.carry && state.ball.owner === this.careerId)
        this.carry = { kind: 'dribbling', at: e.at, situation: `carry-${zone}` };
      if ((e.type === 'pass' || e.type === 'shot') && mine) {
        if (this.reception) give(this.reception, 1, 'Kept it and played on'), (this.reception = null);
        if (this.carry) give(this.carry, 1, 'Carried it and released it'), (this.carry = null);
      }
      if (e.type === 'pass' && mine) {
        const rid = e.detail.split(' ')[0] as MatchPlayerId | '';
        const receiver = rid ? state.players[rid] : undefined;
        let open = false;
        if (receiver) {
          let nearest = Infinity;
          for (const p of Object.values(state.players)) if (p.team === 'away') nearest = Math.min(nearest, Math.hypot(p.pos.x - receiver.pos.x, p.pos.y - receiver.pos.y));
          open = nearest >= R.openYards;
        }
        give({ kind: 'awareness', at: e.at, situation: `choice-${zone}` }, open ? 1 : 0, open ? 'Passed to an open teammate' : 'Passed into cover');
        this.pass = { kind: 'passing', at: e.at, situation: `pass-${zone}` };
      } else if (e.type === 'shot' && mine) {
        const b = state.ball;
        const dist = Math.hypot(this.pitch.length - b.pos.x, this.pitch.goalCenterY - b.pos.y);
        const vx = b.vel.x;
        const aimY = vx > 1e-3 ? b.pos.y + (b.vel.y * (this.pitch.length - b.pos.x)) / vx : this.pitch.goalCenterY;
        const placed = Math.abs(aimY - this.pitch.goalCenterY) >= R.placedYards;
        const p = { kind: 'finishing' as const, at: e.at, situation: `shot-${zone}` };
        if (dist > R.shotMaxYards) give(p, 0, `Shot from ${Math.round(dist)} yd: too far`);
        else give(p, placed ? 1 : 0.5, placed ? 'Good range, placed away from the keeper' : 'Good range, aimed at the keeper');
      }
      if (this.pass) {
        if (e.type === 'received' && e.by && state.players[e.by]?.team === 'home' && !mine) give(this.pass, 1, 'Pass found a teammate'), (this.pass = null);
        else if ((e.type === 'intercepted' || e.type === 'tackle') && awayBy) give(this.pass, 0, 'Pass was cut out'), (this.pass = null);
        else if (e.type === 'out' || e.type === 'goal') give(this.pass, 0, 'Pass went out of play'), (this.pass = null);
      }
      if ((e.type === 'tackle' || e.type === 'intercepted') && awayBy && e.detail.includes(this.careerId)) {
        if (this.reception) give(this.reception, 0, 'Lost it after receiving'), (this.reception = null);
        if (this.carry) give(this.carry, 0, 'Lost it while carrying'), (this.carry = null);
      }
      if (e.type === 'possession' && e.detail === 'away') {
        if (this.reception) give(this.reception, 0, 'Lost it after receiving'), (this.reception = null);
        if (this.carry) give(this.carry, 0, 'Lost it while carrying'), (this.carry = null);
      }
      if (this.duel && e.type === 'possession' && e.detail === 'home') {
        const won = mine || Math.hypot(me.pos.x - state.ball.pos.x, me.pos.y - state.ball.pos.y) <= R.regainYards;
        give(this.duel, won ? 1 : 0.5, won ? 'Helped win the ball back' : 'Ball won back by a teammate');
        this.duel = null;
      } else if (this.duel && (e.type === 'goal' || (e.type === 'shot' && awayBy))) {
        give(this.duel, 0, 'They got a shot away');
        this.duel = null;
      }
      if (e.type === 'reset' || e.type === 'kickoff') this.reception = this.pass = this.carry = this.duel = null;
    }

    const now = state.simTime;
    if (this.reception && now - this.reception.at >= R.keepSeconds && state.ball.owner === this.careerId) give(this.reception, 1, 'Kept the ball'), (this.reception = null);
    const owner = state.ball.owner ? state.players[state.ball.owner] : null;
    if (!this.duel && owner?.team === 'away' && Math.hypot(me.pos.x - owner.pos.x, me.pos.y - owner.pos.y) <= R.duelYards)
      this.duel = { kind: 'defending', at: now, situation: `duel-${this.zone(owner.pos.x, owner.pos.y)}` };
    if (this.duel && now - this.duel.at > R.duelTimeoutSeconds) give(this.duel, 0, 'They kept the ball'), (this.duel = null);
    return out;
  }
}

/** Coach Moment answers as tactical (awareness) evidence. Unanswered moments are no opportunity, not failure. */
export function coachEvidence(entries: readonly Pick<LearningEntry, 'templateId' | 'selectedGrade'>[]): EvidenceItem[] {
  return entries
    .filter((e) => e.selectedGrade !== null)
    .map((e) => ({
      attribute: 'awareness' as const,
      source: 'coach' as const,
      situation: e.templateId,
      success: e.selectedGrade === 'strong' ? 1 : e.selectedGrade === 'reasonable' ? 0.5 : 0,
      note: `Coach Moment answer: ${e.selectedGrade}`,
    }));
}
