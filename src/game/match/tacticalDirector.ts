import { clamp } from '../math';
import { roleDef, type RoleId } from './formations';
import {
  createDecisionEngine,
  type TacticalAction,
  type TacticalEngine,
  type TacticalObservation,
  type TacticalRole,
  type TacticalTask,
} from './tactical';
import type { MatchTuning } from './tuning';
import { TEAM_PLAYER_IDS, otherTeam, type Intent, type MatchPlayer, type MatchPlayerId, type MatchState, type TeamId } from './types';

/**
 * Host adapter for the v0.5 tactical engine (tactical.ts). Phase 1 integration: one complete attacking
 * possession. While a team has its own carrier or its own pass in flight, the engine decides where that
 * team's computer-controlled outfielders go and whether an AI outfield carrier passes, shoots or carries.
 * Defending, loose balls, keepers, the user's player, the pass receiver and Coach Moment intentions stay
 * with the classic AI (ai.ts). Kicks go through the sim's own AI kick executor.
 *
 * Each team is observed in its own team frame (own goal at x = 0, attacking +x, y mirrored for away
 * exactly as ai.ts does), converted from yards to metres, with direction always +1.
 */
export type TacticsMode = 'v05' | 'classic';

export const YARD_METRES = 0.9144;

/** 1-3-2-3 slots onto the engine's canonical roles. LCM is the holding 6, RCM the connecting 8, ST the 9. */
const ROLE_MAP: Partial<Record<RoleId, TacticalRole>> = {
  GK: 'GK', LB: 'LB', CB: 'CB', RB: 'RB', LCM: '6', RCM: '8', LW: 'LW', ST: '9', RW: 'RW',
};

const TASK_INTENT: Partial<Record<TacticalTask, Intent>> = {
  support: 'support',
  'support-triangle': 'support',
  'rest-defense': 'balance',
  'provide-width': 'width',
  'support-behind-wing': 'width',
  'offer-depth': 'depth',
  'receive-pass': 'receive',
  'recover-shape': 'recover',
  'hold-shape': 'hold',
};

interface HeldOrder {
  task: TacticalTask;
  /** Team-frame yards. */
  x: number;
  y: number;
  expiresAt: number;
}

interface MutPoint { x: number; y: number }
interface MutMate { id: string; role: TacticalRole; pos: MutPoint; human: boolean; speed: number; ready: boolean; passEligible: boolean }
interface MutOpp { id: string; pos: MutPoint; seenAt: number }

interface TeamTactics {
  readonly engine: TacticalEngine;
  readonly mates: MutMate[];
  readonly opps: MutOpp[];
  readonly ballPos: MutPoint;
  readonly receivePoint: MutPoint;
  readonly orders: Map<MatchPlayerId, HeldOrder>;
  readonly completed: string[];
  action: TacticalAction | null;
  attack: boolean;
  supported: boolean;
  needsReset: boolean;
}

export class TacticalDirector {
  readonly mode: TacticsMode;
  /** Set if the engine ever rejects an observation; the sim then falls back to classic AI for good. */
  failure: string | null = null;
  private readonly teams: Record<TeamId, TeamTactics>;
  private lastTime = -1;
  private tick = 0;
  private owner: MatchPlayerId | null = null;
  private possessionGeneration = 0;

  constructor(mode: TacticsMode, private readonly T: MatchTuning) {
    this.mode = mode;
    const L = T.pitch.length * YARD_METRES;
    const W = T.pitch.width * YARD_METRES;
    const make = (): TeamTactics => ({
      engine: createDecisionEngine({ length: L, width: W }),
      mates: Array.from({ length: 9 }, () => ({ id: '', role: 'GK' as TacticalRole, pos: { x: 0, y: 0 }, human: false, speed: 1, ready: false, passEligible: false })),
      opps: Array.from({ length: 9 }, () => ({ id: '', pos: { x: 0, y: 0 }, seenAt: 0 })),
      ballPos: { x: 0, y: 0 },
      receivePoint: { x: 0, y: 0 },
      orders: new Map(),
      completed: [],
      action: null,
      attack: false,
      supported: false,
      needsReset: false,
    });
    this.teams = { home: make(), away: make() };
  }

  get enabled(): boolean {
    return this.mode === 'v05' && this.failure === null;
  }

  /** True when the engine owns this AI carrier's decision this step. */
  ownsCarrier(s: MatchState, p: MatchPlayer): boolean {
    const t = this.teams[p.team];
    return this.enabled && t.supported && t.attack && !p.isKeeper && s.ball.owner === p.id && !(p.team === 'home' && s.controlledId === p.id);
  }

  /** Latest held order target for a player, in world yards, if unexpired. */
  heldTarget(s: MatchState, p: MatchPlayer, out: MutPoint): boolean {
    const o = this.teams[p.team].orders.get(p.id);
    if (!o || o.expiresAt < s.simTime) return false;
    this.toWorld(p.team, o.x, o.y, out);
    return true;
  }

  /** The pending kick for `actor`, revalidated: same owner, generations and not expired. Invalid ones are acknowledged. */
  takeAction(s: MatchState, actor: MatchPlayerId): TacticalAction | null {
    const t = this.teams[s.players[actor].team];
    const a = t.action;
    if (!a || a.actorId !== actor) return null;
    t.action = null;
    t.completed.push(a.id);
    const valid = s.ball.owner === actor && a.possessionGeneration === this.possessionGeneration && a.controlGeneration === s.controlEpoch && s.simTime <= a.expiresAt;
    return valid ? a : null;
  }

  /** World-yard point from an engine (team-frame metres) point. */
  toWorld(team: TeamId, xm: number, ym: number, out: MutPoint): MutPoint {
    const x = xm / YARD_METRES;
    const y = ym / YARD_METRES;
    const L = this.T.pitch.length;
    const W = this.T.pitch.width;
    out.x = team === 'home' ? x : L - x;
    out.y = team === 'home' ? y : W - y;
    return out;
  }

  /**
   * Called every fixed step after the classic plan. Steps both engines and overrides the movement of
   * the attacking team's computer-controlled outfielders with the held v0.5 orders.
   */
  plan(s: MatchState): void {
    if (!this.enabled) return;
    if (s.simTime < this.lastTime) for (const team of ['home', 'away'] as const) this.teams[team].needsReset = true;
    this.lastTime = s.simTime;
    this.tick += 1;
    if (s.ball.owner !== this.owner) {
      this.owner = s.ball.owner;
      this.possessionGeneration += 1;
    }
    try {
      for (const team of ['home', 'away'] as const) this.planTeam(s, team);
    } catch (e) {
      this.failure = e instanceof Error ? e.message : String(e);
      for (const team of ['home', 'away'] as const) {
        this.teams[team].orders.clear();
        this.teams[team].action = null;
        this.teams[team].attack = false;
      }
    }
  }

  private planTeam(s: MatchState, team: TeamId): void {
    const t = this.teams[team];
    const formation = s.formations[team];
    t.supported = formation === '1-3-2-3';
    if (!t.supported) {
      t.orders.clear();
      t.action = null;
      t.attack = false;
      t.needsReset = true;
      return;
    }
    if (t.needsReset) {
      t.engine.reset();
      t.needsReset = false;
      t.orders.clear();
      t.action = null;
      t.completed.length = 0;
    }
    const obs = this.observe(s, team, t);
    t.completed.length = 0;
    const r = t.engine.step(obs);
    for (const id of r.cancel) if (t.action?.id === id) t.action = null;
    const ball = obs.ball;
    const owner = ball?.state === 'controlled' ? ball.ownerId : null;
    t.attack = s.phase === 'live' && (TEAM_PLAYER_IDS[team].some((id) => id === owner) || (ball?.state === 'traveling' && !!ball.fromId));
    if (!t.attack) {
      t.orders.clear();
      t.action = null;
      return;
    }
    for (const o of r.orders) {
      const id = o.actorId as MatchPlayerId;
      let h = t.orders.get(id);
      if (!h) t.orders.set(id, (h = { task: o.task, x: 0, y: 0, expiresAt: 0 }));
      h.task = o.task;
      h.x = o.target.x / YARD_METRES;
      h.y = o.target.y / YARD_METRES;
      h.expiresAt = o.expiresAt;
      if (o.action) t.action = o.action;
    }
    this.apply(s, team, t);
  }

  private observe(s: MatchState, team: TeamId, t: TeamTactics): TacticalObservation {
    const T = this.T;
    const L = T.pitch.length;
    const W = T.pitch.width;
    const fx = (p: { x: number; y: number }, out: MutPoint): MutPoint => {
      out.x = (team === 'home' ? p.x : L - p.x) * YARD_METRES;
      out.y = (team === 'home' ? p.y : W - p.y) * YARD_METRES;
      return out;
    };
    const ids = TEAM_PLAYER_IDS[team];
    const owner = s.ball.owner;
    const live = s.phase === 'live';
    for (let i = 0; i < ids.length; i++) {
      const p = s.players[ids[i]!];
      const m = t.mates[i]!;
      const role = ROLE_MAP[roleDef(s.formations[team], p.slot).id];
      if (!role) throw new Error(`No v0.5 role for slot ${p.slot}`);
      m.id = p.id;
      m.role = role;
      fx(p.pos, m.pos);
      m.human = team === 'home' && s.controlledId === p.id;
      m.speed = T.movement.runSpeed * YARD_METRES;
      m.ready = live && p.id === owner && !p.isKeeper && !m.human && s.simTime >= s.nextDecisionAt;
      m.passEligible = !p.isKeeper;
    }
    const oppIds = TEAM_PLAYER_IDS[otherTeam(team)];
    for (let i = 0; i < oppIds.length; i++) {
      const o = t.opps[i]!;
      o.id = oppIds[i]!;
      fx(s.players[oppIds[i]!].pos, o.pos);
      o.seenAt = s.simTime;
    }
    fx(s.ball.pos, t.ballPos);
    const k = s.ball.kick;
    const ownPass = !owner && k?.kind === 'pass' && k.team === team && k.receiver && k.target ? k : null;
    if (ownPass?.target) fx(ownPass.target, t.receivePoint);
    const speed = Math.hypot(s.ball.vel.x, s.ball.vel.y);
    return {
      tick: this.tick,
      time: s.simTime,
      direction: 1,
      phase: live ? 'live' : 'stoppage',
      possessionGeneration: this.possessionGeneration,
      controlGeneration: s.controlEpoch,
      teammates: t.mates,
      opponents: t.opps,
      ball: {
        pos: t.ballPos,
        state: !live ? 'dead' : owner ? 'controlled' : ownPass || speed > 0.05 ? 'traveling' : 'contested',
        seenAt: s.simTime,
        ownerId: owner,
        fromId: ownPass?.by ?? null,
        receiverId: ownPass?.receiver ?? null,
        receivePoint: ownPass ? t.receivePoint : null,
      },
      completedCommands: t.completed,
    };
  }

  private readonly scratch: MutPoint = { x: 0, y: 0 };

  private apply(s: MatchState, team: TeamId, t: TeamTactics): void {
    const M = this.T.movement;
    const L = this.T.pitch.length;
    const W = this.T.pitch.width;
    const k = s.ball.kick;
    const receiver = !s.ball.owner && k?.kind === 'pass' && k.team === team ? k.receiver : null;
    const coach = s.coachIntent?.playerId ?? null;
    for (const id of TEAM_PLAYER_IDS[team]) {
      const p = s.players[id];
      if (p.isKeeper || id === s.ball.owner || id === receiver || id === coach) continue;
      if (team === 'home' && id === s.controlledId) continue;
      const o = t.orders.get(id);
      if (!o || o.expiresAt < s.simTime) continue;
      const intent = TASK_INTENT[o.task];
      if (!intent) continue;
      const w = this.toWorld(team, o.x, o.y, this.scratch);
      p.intent = intent;
      p.target.x = clamp(w.x, 0.5, L - 0.5);
      p.target.y = clamp(w.y, 0.5, W - 0.5);
      p.speed =
        intent === 'receive' ? M.runSpeed
        : intent === 'support' || intent === 'depth' ? M.supportSpeed
        : intent === 'recover' ? M.recoverSpeed
        : M.shapeSpeed;
    }
  }
}
