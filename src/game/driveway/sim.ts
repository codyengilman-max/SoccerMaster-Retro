/**
 * Driveway Dribbling simulation (framework-free, deterministic for a seed and input sequence).
 * Objects come down the driveway in pre-validated rows; the player dribbles in the lower box, dodges solid
 * objects and breaks breakable ones with the league double-tap quick shot. Fixed 1/120 s sub-steps keep it
 * frame-rate independent. See docs/training/DRIVEWAY.md.
 */
import { createRng } from '../rng';
import { DIFFICULTY, DRIVEWAY, EASY_START, MEDAL_RULES, THRESHOLDS, type DdDifficulty, type Medal } from './config';

export type SolidKind = 'cone' | 'bucket' | 'wateringCan' | 'can';
export type RollerKind = 'basketball' | 'skateboard' | 'scooter' | 'tricycle';
export type BreakableKind = 'box' | 'boxStack' | 'target';
export type ObjKind = SolidKind | RollerKind | BreakableKind;
export type Category = 'solid' | 'breakable';

/** Collision radius (yd) per object; the renderer sizes art from the same table (src/render/drivewayArt.ts). */
export const OBJECT_RADIUS: Readonly<Record<ObjKind, number>> = {
  cone: 0.32, bucket: 0.34, wateringCan: 0.36, can: 0.3,
  basketball: 0.3, skateboard: 0.42, scooter: 0.45, tricycle: 0.5,
  box: 0.42, boxStack: 0.48, target: 0.45,
};
export const CATEGORY: Readonly<Record<ObjKind, Category>> = {
  cone: 'solid', bucket: 'solid', wateringCan: 'solid', can: 'solid',
  basketball: 'solid', skateboard: 'solid', scooter: 'solid', tricycle: 'solid',
  box: 'breakable', boxStack: 'breakable', target: 'breakable',
};
const SOLIDS: readonly SolidKind[] = ['cone', 'bucket', 'wateringCan', 'can'];
const ROLLERS: readonly RollerKind[] = ['basketball', 'skateboard', 'scooter', 'tricycle'];
const BREAKABLES: readonly BreakableKind[] = ['box', 'boxStack', 'target'];

export interface Spawn {
  readonly id: number;
  readonly kind: ObjKind;
  /** Active-play second the object appears (at the top, or at the side for crossing objects). */
  readonly at: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  /** Lateral hazards only: second the edge warning shows. */
  readonly warnAt: number | null;
}
export interface Row {
  /** Second the row reaches the top of the player's box. */
  readonly arrive: number;
  readonly spawns: readonly Spawn[];
  /** x ranges the row leaves open (player centre), already allowing for radii. */
  readonly free: readonly (readonly [number, number])[];
}

export interface Obj {
  readonly id: number;
  readonly kind: ObjKind;
  readonly cat: Category;
  readonly r: number;
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  state: 'live' | 'broken' | 'retired';
  /** Entered the playable lane, so passing it can score a dodge. */
  threatened: boolean;
  /** Touched the player (even during protection): never a dodge. */
  touched: boolean;
  scored: boolean;
  /** Second it broke or was retired (effects). */
  endedAt: number | null;
}
export interface Projectile { readonly id: number; x: number; y: number; readonly vx: number; readonly vy: number; readonly born: number }

export type DdPhase = 'ready' | 'countdown' | 'playing' | 'results';
export type DdEvent =
  | { readonly type: 'touch'; readonly foot: 'left' | 'right'; readonly t: number }
  | { readonly type: 'shot'; readonly id: number; readonly t: number }
  | { readonly type: 'break'; readonly obj: number; readonly points: number; readonly t: number }
  | { readonly type: 'impact'; readonly obj: number; readonly x: number; readonly y: number; readonly t: number }
  | { readonly type: 'miss'; readonly t: number }
  | { readonly type: 'dodge'; readonly obj: number; readonly points: number; readonly t: number }
  | { readonly type: 'hit'; readonly obj: number; readonly chancesLeft: number; readonly t: number }
  | { readonly type: 'warn'; readonly obj: number; readonly side: 'left' | 'right'; readonly t: number }
  | { readonly type: 'recovered'; readonly t: number }
  | { readonly type: 'tapHint'; readonly t: number }
  | { readonly type: 'end'; readonly reason: 'time' | 'chances'; readonly t: number };

export interface DdStats {
  score: number;
  combo: number;
  bestCombo: number;
  dodges: number;
  targets: number;
  shots: number;
  collisions: number;
  survived: number;
}
export interface DdResult {
  readonly difficulty: DdDifficulty;
  readonly seed: number;
  readonly reason: 'time' | 'chances';
  readonly score: number;
  readonly medal: Medal;
  readonly bestCombo: number;
  readonly dodges: number;
  readonly targets: number;
  readonly shots: number;
  readonly accuracy: number;
  readonly survived: number;
  readonly collisions: number;
}

const STEP = 1 / 120;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const P = DRIVEWAY.player;

/** Combo multiplier for the next event, from the streak before it (x2 from the 6th event, x3 from the 11th). */
export function multiplierFor(streakBefore: number): 1 | 2 | 3 {
  return streakBefore >= DRIVEWAY.score.x3At ? 3 : streakBefore >= DRIVEWAY.score.x2At ? 2 : 1;
}

/** Medal for a finished round: Silver also needs survival, Gold the full round and accurate shooting. */
export function medalFor(d: DdDifficulty, r: Pick<DdResult, 'score' | 'survived' | 'accuracy' | 'reason'>): Medal {
  const th = THRESHOLDS[d];
  const full = r.reason === 'time';
  if (r.score >= th.gold && full && r.accuracy >= MEDAL_RULES.goldAccuracy) return 'gold';
  if (r.score >= th.silver && r.survived >= MEDAL_RULES.silverMinSurvived) return 'silver';
  if (r.score >= th.bronze) return 'bronze';
  return 'completed';
}

/** Free x ranges for the player's centre given blocked ranges, inside the movement box. */
function freeRanges(blocked: readonly (readonly [number, number])[]): [number, number][] {
  const b = [...blocked].sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  let x = P.minX;
  for (const [a, c] of b) {
    if (a > x) out.push([x, Math.min(a, P.maxX)]);
    x = Math.max(x, c);
    if (x >= P.maxX) break;
  }
  if (x < P.maxX) out.push([x, P.maxX]);
  return out.filter(([a, c]) => c - a > 1e-6);
}

/** Reachable player-x ranges after `dt` seconds, then limited to a row's free ranges. */
export function reach(from: readonly (readonly [number, number])[], dt: number, free: readonly (readonly [number, number])[]): [number, number][] {
  const V = DRIVEWAY.validate;
  const d = P.speed * V.speedShare * Math.max(0, dt - V.reactionSeconds);
  const grown = from.map(([a, c]) => [clamp(a - d, P.minX, P.maxX), clamp(c + d, P.minX, P.maxX)] as [number, number]);
  const out: [number, number][] = [];
  for (const [a, c] of grown) for (const [f, g] of free) {
    const lo = Math.max(a, f);
    const hi = Math.min(c, g);
    if (hi >= lo) out.push([lo, hi]);
  }
  // Merge overlaps so the set stays small row after row.
  out.sort((p, q) => p[0] - q[0]);
  const merged: [number, number][] = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1e-9) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

/**
 * Pre-builds every row of a round. Each row is accepted only if, from every position the player could be in after
 * the previous row, an open range is reachable in time at a conservative speed and reaction — without shooting.
 * Breakable objects count as blockers here, so no row ever requires a shot.
 */
export function buildRows(difficulty: DdDifficulty, seed: number): Row[] {
  const D = DIFFICULTY[difficulty];
  const rnd = createRng(seed ^ 0x5dd1e);
  const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]!;
  const margin = DRIVEWAY.validate.margin;
  const travel = (DRIVEWAY.spawnY - P.maxY) / D.approach;
  const rows: Row[] = [];
  let reachable: [number, number][] = [[P.startX, P.startX]];
  let t = Math.max(2.2, travel * 0.35);
  let prevArrive = 0;
  let id = 1;
  while (t < DRIVEWAY.roundSeconds + travel) {
    const early = t < EASY_START.seconds;
    let accepted: { spawns: Spawn[]; free: [number, number][]; next: [number, number][] } | null = null;
    for (let attempt = 0; attempt < 24 && !accepted; attempt++) {
      const maxS = early ? 1 : Math.max(1, D.maxSolids - Math.floor(attempt / 8));
      const n = 1 + Math.floor(rnd() * maxS);
      const kinds: ObjKind[] = [];
      for (let i = 0; i < n; i++) kinds.push(pick(SOLIDS));
      if (rnd() < D.breakableChance) kinds.push(pick(BREAKABLES));
      const crossing = !early && attempt < 16 && rnd() < D.crossingChance;
      // Lanes: object centres, at least minGap apart edge to edge.
      const xs: number[] = [];
      let ok = true;
      for (const k of kinds) {
        let placed = false;
        for (let tries = 0; tries < 12 && !placed; tries++) {
          const x = 0.5 + rnd() * (DRIVEWAY.width - 1);
          if (xs.every((o, j) => Math.abs(o - x) - OBJECT_RADIUS[k] - OBJECT_RADIUS[kinds[j]!] >= D.minGap)) {
            xs.push(x);
            placed = true;
          }
        }
        if (!placed) ok = false;
      }
      if (!ok) continue;
      const spawns: Spawn[] = kinds.map((k, i) => ({ id: id + i, kind: k, at: t - travel, x: xs[i]!, y: DRIVEWAY.spawnY, vx: 0, vy: -D.approach, warnAt: null }));
      const blocked: [number, number][] = spawns.map((s) => {
        const w = OBJECT_RADIUS[s.kind] + P.radius + margin;
        return [s.x - w, s.x + w];
      });
      if (crossing) {
        const k = pick(ROLLERS);
        const dir = rnd() < 0.5 ? 1 : -1;
        const vx = dir * D.crossSpeed;
        const crossX = 1 + rnd() * (DRIVEWAY.width - 2);
        // Position when it reaches the top of the player's box, then walk back to where it enters the lane.
        const startX = dir > 0 ? -0.6 : DRIVEWAY.width + 0.6;
        const tToCross = (crossX - startX) / vx;
        const at = t - tToCross;
        const y = P.maxY + D.approach * tToCross;
        if (y <= DRIVEWAY.spawnY) {
          spawns.push({ id: id + spawns.length, kind: k, at, x: startX, y, vx, vy: -D.approach, warnAt: at - DRIVEWAY.warnSeconds });
          // Blocks the x it sweeps while inside the player's box (conservative: any player y).
          const band = (P.maxY - P.minY + 2 * (OBJECT_RADIUS[k] + P.radius)) / D.approach;
          const w = OBJECT_RADIUS[k] + P.radius + margin;
          const x2 = crossX + vx * band;
          blocked.push([Math.min(crossX, x2) - w, Math.max(crossX, x2) + w]);
        }
      }
      const free = freeRanges(blocked);
      const next = reach(reachable, t - prevArrive, free);
      if (next.reduce((s, [a, c]) => s + (c - a), 0) >= 0.3) accepted = { spawns, free, next };
    }
    if (!accepted) {
      // Fallback: one cone at the edge farthest from the reachable set (always passable).
      const mid = reachable.reduce((s, [a, c]) => s + (a + c) / 2, 0) / reachable.length;
      const x = mid < DRIVEWAY.width / 2 ? DRIVEWAY.width - 0.5 : 0.5;
      const spawns: Spawn[] = [{ id, kind: 'cone', at: t - travel, x, y: DRIVEWAY.spawnY, vx: 0, vy: -D.approach, warnAt: null }];
      const w = OBJECT_RADIUS.cone + P.radius + margin;
      const free = freeRanges([[x - w, x + w]]);
      accepted = { spawns, free, next: reach(reachable, t - prevArrive, free) };
    }
    rows.push({ arrive: t, spawns: accepted.spawns, free: accepted.free });
    id += accepted.spawns.length;
    reachable = accepted.next;
    prevArrive = t;
    t += D.rowGap * (early ? EASY_START.factor : 1) * (0.9 + rnd() * 0.25);
  }
  return rows;
}

export class DrivewaySim {
  readonly difficulty: DdDifficulty;
  readonly seed: number;
  readonly rows: readonly Row[];
  phase: DdPhase = 'ready';
  /** Countdown seconds left (countdown phase). */
  countdown = DRIVEWAY.countdownSeconds;
  /** Active-play seconds (never advances while paused or outside play). */
  t = 0;
  paused = false;
  readonly player = { x: P.startX, y: P.startY, vx: 0, vy: 0, facing: 1 as 1 | -1 };
  chances: number = DRIVEWAY.chances;
  protectUntil = 0;
  slowUntil = 0;
  readonly ball = { state: 'held' as 'held' | 'recovering', recoverAt: 0, foot: 'right' as 'left' | 'right', nextTouchAt: 0, x: P.startX, y: P.startY + DRIVEWAY.ball.ahead, rollFrom: 1 as 1 | -1 };
  readonly objects: Obj[] = [];
  readonly projectiles: Projectile[] = [];
  readonly stats: DdStats = { score: 0, combo: 0, bestCombo: 0, dodges: 0, targets: 0, shots: 0, collisions: 0, survived: 0 };
  events: DdEvent[] = [];
  endReason: 'time' | 'chances' | null = null;
  private resultValue: DdResult | null = null;
  private spawnQueue: Spawn[];
  private warned = new Set<number>();
  private acc = 0;
  private move = { x: 0, y: 0 };
  private gesture: { phase: 'idle' | 'held' | 'gap' | 'prep'; since: number } = { phase: 'idle', since: 0 };
  private nextProjectile = 1;

  /** `rows` replaces the generated waves (tests stage exact situations). */
  constructor(difficulty: DdDifficulty, seed: number, rows?: readonly Row[]) {
    this.difficulty = difficulty;
    this.seed = seed >>> 0;
    this.rows = rows ?? buildRows(difficulty, this.seed);
    this.spawnQueue = this.rows.flatMap((r) => r.spawns).sort((a, b) => a.at - b.at || a.id - b.id);
  }

  start(): void {
    if (this.phase === 'ready') this.phase = 'countdown';
  }
  pause(): void {
    if (this.phase !== 'results') this.paused = true;
    this.cancelInputs();
  }
  resume(): void {
    this.paused = false;
  }
  /** Clears held stick and any half-made double tap (interruptions, blur, rotation). */
  cancelInputs(): void {
    this.move = { x: 0, y: 0 };
    if (this.gesture.phase !== 'prep') this.gesture = { phase: 'idle', since: this.t };
  }
  setMove(x: number, y: number): void {
    const m = Math.hypot(x, y);
    this.move = !Number.isFinite(m) || m === 0 ? { x: 0, y: 0 } : m > 1 ? { x: x / m, y: y / m } : { x, y };
  }
  /** Shooting needs the ball: false during recovery (shown greyed), when the press is ignored, never queued. */
  get canShoot(): boolean {
    return this.phase === 'playing' && !this.paused && this.ball.state === 'held' && this.gesture.phase !== 'prep';
  }
  /** SHOOT pressed. A press during recovery or the countdown does nothing and is not remembered. */
  press(): void {
    if (!this.canShoot) {
      this.gesture = { phase: 'idle', since: this.t };
      return;
    }
    const g = this.gesture;
    if (g.phase === 'gap' && this.t - g.since <= DRIVEWAY.quickShot.gapSeconds + 1e-9) {
      this.gesture = { phase: 'prep', since: this.t };
      return;
    }
    this.gesture = { phase: 'held', since: this.t };
  }
  release(): void {
    const g = this.gesture;
    if (g.phase === 'held') this.gesture = this.t - g.since <= DRIVEWAY.quickShot.tapSeconds + 1e-9 ? { phase: 'gap', since: this.t } : { phase: 'idle', since: this.t };
  }

  get result(): DdResult | null {
    return this.resultValue;
  }

  /** Advances by real seconds (clamped per call so a long frame cannot skip collisions). Returns this call's events. */
  update(dt: number): DdEvent[] {
    this.events = [];
    if (!Number.isFinite(dt) || dt <= 0 || this.paused || this.phase === 'ready' || this.phase === 'results') return this.events;
    this.acc += Math.min(dt, 0.25);
    while (this.acc >= STEP - 1e-12 && (this.phase as DdPhase) !== 'results') {
      this.acc -= STEP;
      this.tick(STEP);
    }
    return this.events;
  }

  private tick(h: number): void {
    if (this.phase === 'countdown') {
      this.countdown -= h;
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.phase = 'playing';
      }
      return;
    }
    this.t += h;
    const t = this.t;
    this.stats.survived = Math.min(DRIVEWAY.roundSeconds, t);
    this.updateGesture();
    this.movePlayer(h);
    this.carryBall();
    while (this.spawnQueue.length && this.spawnQueue[0]!.at <= t) this.spawn(this.spawnQueue.shift()!);
    for (const s of this.spawnQueue) {
      if (s.warnAt !== null && s.warnAt <= t && !this.warned.has(s.id)) {
        this.warned.add(s.id);
        this.events.push({ type: 'warn', obj: s.id, side: s.vx > 0 ? 'left' : 'right', t });
      }
      if (s.at > t + DRIVEWAY.warnSeconds + 1) break;
    }
    for (const o of this.objects) {
      if (o.state !== 'live') continue;
      o.x += o.vx * h;
      o.y += o.vy * h;
    }
    this.moveProjectiles(h);
    this.collide();
    this.scoreDodges();
    // Drop objects well past the player or off the sides; keep broken/retired ones briefly for effects.
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i]!;
      const gone = o.y < -1.5 || o.x < -3 || o.x > DRIVEWAY.width + 3 || (o.endedAt !== null && t - o.endedAt > 0.6);
      if (gone) this.objects.splice(i, 1);
    }
    if (this.chances <= 0) this.finish('chances');
    else if (t >= DRIVEWAY.roundSeconds - 1e-9) this.finish('time');
  }

  private updateGesture(): void {
    const g = this.gesture;
    const Q = DRIVEWAY.quickShot;
    if (g.phase === 'gap' && this.t - g.since > Q.gapSeconds + 1e-9) {
      this.gesture = { phase: 'idle', since: this.t };
      this.events.push({ type: 'tapHint', t: this.t });
    } else if (g.phase === 'prep' && this.t - g.since >= Q.prepSeconds - 1e-9) {
      this.gesture = { phase: 'idle', since: this.t };
      this.shoot();
    }
  }

  private movePlayer(h: number): void {
    const p = this.player;
    const speed = P.speed * (this.t < this.slowUntil ? DRIVEWAY.hit.slowFactor : 1);
    const tx = this.move.x * speed;
    const ty = this.move.y * speed;
    const a = P.accel * h;
    p.vx += clamp(tx - p.vx, -a, a);
    p.vy += clamp(ty - p.vy, -a, a);
    p.x += p.vx * h;
    p.y += p.vy * h;
    if (p.x < P.minX || p.x > P.maxX) { p.x = clamp(p.x, P.minX, P.maxX); p.vx = 0; }
    if (p.y < P.minY || p.y > P.maxY) { p.y = clamp(p.y, P.minY, P.maxY); p.vy = 0; }
    if (Math.abs(p.vx) > 0.3) p.facing = p.vx > 0 ? 1 : -1;
  }

  /** The ball sits just ahead of the working foot; each touch moves it to the other foot's side. */
  private carryBall(): void {
    const p = this.player;
    const b = this.ball;
    if (b.state === 'recovering') {
      if (this.t >= b.recoverAt - 1e-9) {
        b.state = 'held';
        b.nextTouchAt = this.t;
        this.events.push({ type: 'recovered', t: this.t });
      } else {
        // The replacement ball rolls in from the side towards the player's feet.
        const k = 1 - (b.recoverAt - this.t) / DRIVEWAY.shot.recoverySeconds;
        b.x = p.x + b.rollFrom * DRIVEWAY.shot.rollInFrom * (1 - k);
        b.y = p.y + DRIVEWAY.ball.ahead * k;
        return;
      }
    }
    const moving = Math.hypot(p.vx, p.vy) > 0.4;
    if (moving && this.t >= b.nextTouchAt) {
      b.foot = b.foot === 'right' ? 'left' : 'right';
      b.nextTouchAt = this.t + DRIVEWAY.ball.touchSeconds;
      this.events.push({ type: 'touch', foot: b.foot, t: this.t });
    }
    b.x = p.x + (b.foot === 'right' ? 0.12 : -0.12);
    b.y = p.y + DRIVEWAY.ball.ahead;
  }

  private shoot(): void {
    if (this.ball.state !== 'held' || this.phase !== 'playing') return;
    // Aim: the stick if it points up the driveway at all, otherwise straight ahead.
    let ax = this.move.x;
    let ay = this.move.y;
    if (Math.hypot(ax, ay) < 0.2 || ay < 0.35) { ax = clamp(ax, -0.6, 0.6); ay = 1; }
    const m = Math.hypot(ax, ay);
    const S = DRIVEWAY.shot;
    const id = this.nextProjectile++;
    this.projectiles.push({ id, x: this.ball.x, y: this.ball.y, vx: (ax / m) * S.speed, vy: (ay / m) * S.speed, born: this.t });
    this.stats.shots += 1;
    this.ball.state = 'recovering';
    this.ball.recoverAt = this.t + S.recoverySeconds;
    this.ball.rollFrom = this.player.x < DRIVEWAY.width / 2 ? 1 : -1;
    this.events.push({ type: 'shot', id, t: this.t });
  }

  /** Swept circle test along each sub-step, so a fast shot cannot pass through a target. */
  private moveProjectiles(h: number): void {
    const S = DRIVEWAY.shot;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i]!;
      const x0 = pr.x;
      const y0 = pr.y;
      pr.x += pr.vx * h;
      pr.y += pr.vy * h;
      let hit: Obj | null = null;
      let best = Infinity;
      for (const o of this.objects) {
        if (o.state !== 'live') continue;
        const s = segmentHit(x0, y0, pr.x, pr.y, o.x, o.y, o.r + S.radius);
        if (s !== null && s < best) { best = s; hit = o; }
      }
      if (hit) {
        this.projectiles.splice(i, 1);
        if (hit.cat === 'breakable') {
          hit.state = 'broken';
          hit.endedAt = this.t;
          hit.scored = true;
          this.stats.targets += 1;
          const pts = this.event(DRIVEWAY.score.target);
          this.events.push({ type: 'break', obj: hit.id, points: pts, t: this.t });
        } else {
          this.events.push({ type: 'impact', obj: hit.id, x: pr.x, y: pr.y, t: this.t });
          this.missed();
        }
        continue;
      }
      if (this.t - pr.born > S.lifetime || pr.y > DRIVEWAY.spawnY + 1 || pr.x < -1 || pr.x > DRIVEWAY.width + 1) {
        this.projectiles.splice(i, 1);
        this.missed();
      }
    }
  }

  private missed(): void {
    this.stats.combo = 0;
    this.events.push({ type: 'miss', t: this.t });
  }

  /** One successful event: points at the current multiplier, then the streak grows. */
  private event(base: number): number {
    const pts = base * multiplierFor(this.stats.combo);
    this.stats.score += pts;
    this.stats.combo += 1;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.combo);
    return pts;
  }

  private collide(): void {
    const p = this.player;
    for (const o of this.objects) {
      if (o.state !== 'live') continue;
      if (Math.hypot(o.x - p.x, o.y - p.y) >= o.r + P.radius) continue;
      o.touched = true;
      if (this.t < this.protectUntil) continue;
      o.state = 'retired';
      o.endedAt = this.t;
      this.chances -= 1;
      this.stats.collisions += 1;
      this.stats.combo = 0;
      this.slowUntil = this.t + DRIVEWAY.hit.slowSeconds;
      this.protectUntil = this.t + DRIVEWAY.hit.protectSeconds;
      this.events.push({ type: 'hit', obj: o.id, chancesLeft: this.chances, t: this.t });
      if (this.chances <= 0) return;
    }
  }

  private scoreDodges(): void {
    const p = this.player;
    for (const o of this.objects) {
      if (o.state !== 'live' || o.cat !== 'solid' || o.scored) continue;
      const inLane = o.x >= P.minX - o.r - P.radius && o.x <= P.maxX + o.r + P.radius;
      if (inLane && o.y - o.r <= P.maxY + P.radius) o.threatened = true;
      if (o.threatened && !o.touched && o.y + o.r < p.y - P.radius) {
        o.scored = true;
        this.stats.dodges += 1;
        const pts = this.event(DRIVEWAY.score.dodge);
        this.events.push({ type: 'dodge', obj: o.id, points: pts, t: this.t });
      }
    }
  }

  private spawn(s: Spawn): void {
    this.objects.push({ id: s.id, kind: s.kind, cat: CATEGORY[s.kind], r: OBJECT_RADIUS[s.kind], x: s.x, y: s.y, vx: s.vx, vy: s.vy, state: 'live', threatened: false, touched: false, scored: false, endedAt: null });
  }

  /** Ends the round exactly once. */
  private finish(reason: 'time' | 'chances'): void {
    if (this.phase === 'results') return;
    this.phase = 'results';
    this.endReason = reason;
    this.projectiles.length = 0;
    const st = this.stats;
    const accuracy = st.shots ? st.targets / st.shots : 0;
    const base = { score: st.score, survived: Math.round(st.survived * 100) / 100, accuracy, reason };
    this.resultValue = Object.freeze({
      difficulty: this.difficulty, seed: this.seed, reason, score: st.score, medal: medalFor(this.difficulty, base),
      bestCombo: st.bestCombo, dodges: st.dodges, targets: st.targets, shots: st.shots, accuracy, survived: base.survived, collisions: st.collisions,
    });
    this.events.push({ type: 'end', reason, t: this.t });
  }
}

/** Fraction 0..1 along a→b where a circle of radius r around c is first touched, or null. */
export function segmentHit(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number): number | null {
  const dx = bx - ax;
  const dy = by - ay;
  const fx = ax - cx;
  const fy = ay - cy;
  const a = dx * dx + dy * dy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const s = (-b - Math.sqrt(disc)) / (2 * a);
  return s >= 0 && s <= 1 ? s : null;
}
