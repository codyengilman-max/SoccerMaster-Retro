/**
 * Passing and shooting accuracy (brief v1.1): pure, framework-free planning helpers in pitch yards and
 * sim seconds. The sim owns state, ownership, contact timing and the RNG; these functions only compute.
 * Ball physics is the engine's own constant ground deceleration (`ball.friction`, yd/s^2), so a
 * launch speed v0 rolls d yards and arrives at va with v0 = sqrt(va^2 + 2*f*d).
 */

export interface KickVec {
  readonly x: number;
  readonly y: number;
}

export interface KickingTuning {
  /** Half-angle of the pass search cone around the aim (radians). */
  readonly passAimCone: number;
  readonly passMinRange: number;
  /** Aim angles within this of the best-aligned candidate count as collinear: the nearer one wins. */
  readonly collinearAngle: number;
  /** A highlighted receiver is kept unless another is better aligned by this much (radians). */
  readonly switchAngle: number;
  /** Standard arrival speed (yd/s) of a tap pass at its receiving point. */
  readonly arrivalSpeed: number;
  /** Launch-speed multiplier from tap (0) to full hold (1). */
  readonly firmnessTap: number;
  readonly firmnessFull: number;
  /** Fastest pass (yd/s) at passing multiplier 1; scaled by the passer's passing multiplier. */
  readonly passMaxSpeed: number;
  readonly passMinSpeed: number;
  /** Directional pass (no receiver) roll distance from tap to full hold, yards. */
  readonly directionalMin: number;
  readonly directionalMax: number;
  /** Receiver leading: prediction horizon (s), max lead distance (yd), solver iterations. */
  readonly leadHorizon: number;
  readonly leadMaxDistance: number;
  readonly leadIterations: number;
  /** At contact, the pass may re-aim toward the same receiver by at most this much (radians, yards). */
  readonly contactMaxCorrection: number;
  readonly contactMaxShift: number;
  /** Shot assistance: max angular correction near the goal and the inset of the target edge from each post (yd). */
  readonly shotAssistMax: number;
  readonly shotPostInset: number;
  /** Shot execution error (radians) components, scaled by the shooter's finishing multiplier. */
  readonly shotErrorBase: number;
  readonly shotErrorPressure: number;
  readonly shotErrorMisalign: number;
  readonly shotErrorEffort: number;
  readonly shotErrorMax: number;
  /** First touch: relative speed (yd/s) controlled cleanly, and the speed nothing can be controlled above. */
  readonly touchCleanSpeed: number;
  readonly touchHardSpeed: number;
  /** Ball arriving from behind the body costs up to this much extra difficulty; pressure likewise. */
  readonly touchBehindPenalty: number;
  readonly touchPressurePenalty: number;
  /** Quality at/above `secureQuality` secures the ball; between `deflectQuality` and it, a heavy touch. */
  readonly secureQuality: number;
  readonly deflectQuality: number;
  /** Heavy touch: the ball runs ahead of the receiver by up to this much extra speed (yd/s). */
  readonly heavyTouchSpeed: number;
  /** Share of the run into the ball that a secure touch checks (0..1). */
  readonly touchCushion: number;
  readonly heavyTouchIgnoreSeconds: number;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const finite = (...v: number[]): boolean => v.every((x) => Number.isFinite(x));

// ---- receiver selection ----------------------------------------------------------------------------

export interface ReceiverCandidate {
  readonly id: string;
  readonly pos: KickVec;
}

/** Receiver scoring for one candidate; null when outside the cone or the passer's reachable range. */
export function receiverAngle(origin: KickVec, aim: KickVec, p: KickVec, maxRange: number, K: KickingTuning): { angle: number; dist: number } | null {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (!finite(dist) || dist < K.passMinRange || dist > maxRange) return null;
  const al = Math.hypot(aim.x, aim.y);
  if (!(al > 1e-9)) return null;
  const c = clamp((dx * aim.x + dy * aim.y) / (dist * al), -1, 1);
  const angle = Math.acos(c);
  return angle <= K.passAimCone ? { angle, dist } : null;
}

/**
 * Pick the receiver the aim points at: best angular alignment first; among near-collinear candidates the
 * nearer one; ties by stable id. The previous target is kept while eligible unless another is better
 * aligned by `switchAngle`. Never picks anyone outside the forward cone (no backward snap).
 */
export function selectReceiver(
  origin: KickVec,
  aim: KickVec,
  candidates: readonly ReceiverCandidate[],
  previous: string | null,
  maxRange: number,
  K: KickingTuning,
): string | null {
  let bestAngle = Infinity;
  for (const c of candidates) {
    const r = receiverAngle(origin, aim, c.pos, maxRange, K);
    if (r && r.angle < bestAngle) bestAngle = r.angle;
  }
  if (bestAngle === Infinity) return null;
  let best: string | null = null;
  let bestDist = Infinity;
  let prevAngle: number | null = null;
  for (const c of candidates) {
    const r = receiverAngle(origin, aim, c.pos, maxRange, K);
    if (!r) continue;
    if (c.id === previous) prevAngle = r.angle;
    if (r.angle > bestAngle + K.collinearAngle) continue;
    if (r.dist < bestDist - 1e-9 || (Math.abs(r.dist - bestDist) <= 1e-9 && best !== null && c.id < best)) {
      best = c.id;
      bestDist = r.dist;
    }
  }
  if (previous !== null && prevAngle !== null && prevAngle <= bestAngle + K.switchAngle) return previous;
  return best;
}

// ---- pass delivery -----------------------------------------------------------------------------------

export interface PassBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface PassPlan {
  /** Receiving point the ball is aimed at. */
  readonly target: KickVec;
  /** Unit launch direction. */
  readonly dir: KickVec;
  readonly distance: number;
  /** Speed that would arrive at the standard arrival speed, the firmness-scaled request, and the launch speed. */
  readonly baselineSpeed: number;
  readonly requestedSpeed: number;
  readonly launchSpeed: number;
  /** Speed at the receiving point (0 when the capped launch cannot reach it). */
  readonly arrivalSpeed: number;
  readonly travelSeconds: number;
  readonly leadDistance: number;
  readonly capped: boolean;
  readonly reachesTarget: boolean;
  /** The lead solver failed or went non-finite and the receiver's current position was used. */
  readonly fallback: boolean;
}

export function firmness(q: number, K: KickingTuning): number {
  const c = Number.isFinite(q) ? clamp(q, 0, 1) : 0;
  return K.firmnessTap + (K.firmnessFull - K.firmnessTap) * c;
}

export function passSpeedCap(passing: number, K: KickingTuning): number {
  return K.passMaxSpeed * (Number.isFinite(passing) ? passing : 1);
}

/** Speed left after rolling `d` yards from `v0` under constant deceleration `f` (0 if it stops first). */
export function speedAfter(v0: number, d: number, f: number): number {
  const v2 = v0 * v0 - 2 * f * d;
  return v2 > 0 ? Math.sqrt(v2) : 0;
}

function plan(origin: KickVec, tx: number, ty: number, q: number, passing: number, f: number, K: KickingTuning, lead: number, fallback: boolean, fbDir: KickVec): PassPlan {
  const dx = tx - origin.x;
  const dy = ty - origin.y;
  const d = Math.hypot(dx, dy);
  const dir = d > 1e-6 ? { x: dx / d, y: dy / d } : fbDir;
  const va = K.arrivalSpeed;
  const baseline = Math.sqrt(va * va + 2 * f * d);
  const requested = baseline * firmness(q, K);
  const cap = passSpeedCap(passing, K);
  const launch = clamp(requested, K.passMinSpeed, Math.max(K.passMinSpeed, cap));
  const arrival = speedAfter(launch, d, f);
  const reaches = launch * launch >= 2 * f * d;
  const travel = d <= 1e-6 ? 0 : reaches ? (2 * d) / (launch + arrival) : Infinity;
  return {
    target: { x: tx, y: ty },
    dir,
    distance: d,
    baselineSpeed: baseline,
    requestedSpeed: requested,
    launchSpeed: launch,
    arrivalSpeed: arrival,
    travelSeconds: travel,
    leadDistance: lead,
    capped: requested > launch + 1e-9,
    reachesTarget: reaches,
    fallback,
  };
}

/**
 * Bounded ground delivery to a selected receiver: lead their observed run by at most `leadHorizon` seconds
 * and `leadMaxDistance` yards (inside the pitch), iterating the travel-time estimate a fixed number of times.
 * The launch speed is the standard-arrival baseline times the charge firmness, capped by the passer's ability:
 * a far receiver can stay out of reach (no extra power just because they are far).
 */
export function solvePassDelivery(
  origin: KickVec,
  receiverPos: KickVec,
  receiverVel: KickVec,
  q: number,
  passing: number,
  friction: number,
  bounds: PassBounds,
  K: KickingTuning,
  fbDir: KickVec = { x: 1, y: 0 },
): PassPlan {
  let tx = receiverPos.x;
  let ty = receiverPos.y;
  let lead = 0;
  let ok = finite(origin.x, origin.y, receiverPos.x, receiverPos.y, receiverVel.x, receiverVel.y, friction) && friction > 0;
  if (ok) {
    const va = K.arrivalSpeed;
    const cap = Math.max(K.passMinSpeed, passSpeedCap(passing, K));
    for (let i = 0; i < K.leadIterations; i++) {
      const d = Math.hypot(tx - origin.x, ty - origin.y);
      const v0 = clamp(Math.sqrt(va * va + 2 * friction * d) * firmness(q, K), K.passMinSpeed, cap);
      const vArr = speedAfter(v0, d, friction);
      const t = d <= 1e-6 ? 0 : v0 * v0 >= 2 * friction * d ? (2 * d) / (v0 + vArr) : K.leadHorizon;
      const h = Math.min(t, K.leadHorizon);
      let lx = receiverVel.x * h;
      let ly = receiverVel.y * h;
      const ll = Math.hypot(lx, ly);
      if (ll > K.leadMaxDistance) {
        lx *= K.leadMaxDistance / ll;
        ly *= K.leadMaxDistance / ll;
      }
      tx = clamp(receiverPos.x + lx, bounds.minX, bounds.maxX);
      ty = clamp(receiverPos.y + ly, bounds.minY, bounds.maxY);
      lead = Math.hypot(tx - receiverPos.x, ty - receiverPos.y);
    }
    ok = finite(tx, ty, lead);
  }
  if (!ok) return plan(origin, receiverPos.x, receiverPos.y, q, passing, friction > 0 ? friction : 1, K, 0, true, fbDir);
  return plan(origin, tx, ty, q, passing, friction, K, lead, false, fbDir);
}

/** No eligible receiver: a bounded ground pass along the aim whose roll grows with charge. */
export function directionalPass(origin: KickVec, aim: KickVec, q: number, passing: number, friction: number, K: KickingTuning): PassPlan {
  const al = Math.hypot(aim.x, aim.y);
  const dir = al > 1e-9 && Number.isFinite(al) ? { x: aim.x / al, y: aim.y / al } : { x: 1, y: 0 };
  const c = Number.isFinite(q) ? clamp(q, 0, 1) : 0;
  const roll = K.directionalMin + (K.directionalMax - K.directionalMin) * c;
  const tx = origin.x + dir.x * roll;
  const ty = origin.y + dir.y * roll;
  // Firmness is already expressed as a longer roll here; arrival is the standard speed.
  const p = plan(origin, tx, ty, 0, passing, friction, K, 0, false, dir);
  return p;
}

/**
 * Contact-time re-aim toward the same receiver: bounded by `contactMaxCorrection` radians and
 * `contactMaxShift` yards of endpoint shift; otherwise the locked direction is kept.
 */
export function boundedContactDir(locked: KickVec, lockedTarget: KickVec, origin: KickVec, fresh: KickVec, K: KickingTuning): KickVec {
  if (!finite(fresh.x, fresh.y)) return locked;
  if (Math.hypot(fresh.x - lockedTarget.x, fresh.y - lockedTarget.y) > K.contactMaxShift) return locked;
  const fx = fresh.x - origin.x;
  const fy = fresh.y - origin.y;
  const fl = Math.hypot(fx, fy);
  if (!(fl > 1e-6)) return locked;
  const a0 = Math.atan2(locked.y, locked.x);
  let da = Math.atan2(fy, fx) - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const a = a0 + clamp(da, -K.contactMaxCorrection, K.contactMaxCorrection);
  return { x: Math.cos(a), y: Math.sin(a) };
}

// ---- shooting ------------------------------------------------------------------------------------------

export interface GoalPlane {
  /** Goal line x (yards) and the direction attacked along x (+1 or -1). */
  readonly x: number;
  readonly sign: 1 | -1;
  readonly centerY: number;
  readonly halfWidth: number;
}

export interface ShotAimPreview {
  /** Unit direction after bounded assistance (what the shot is aimed at before execution error). */
  readonly dir: KickVec;
  /** Assistance applied (radians, signed). */
  readonly correction: number;
  /** Where `dir` crosses the goal line, or null (parallel, backward, origin beyond the line, non-finite). */
  readonly hit: KickVec | null;
  readonly onTarget: boolean;
}

const wrap = (a: number): number => {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
};

/** Bounded, continuous, monotonic correction for an aim `e` radians outside the inset target edge. */
export function shotAssist(e: number, cap: number): number {
  if (!(e > 0) || !(cap > 0)) return 0;
  if (e <= 2 * cap) return e / 2;
  if (e <= 4 * cap) return cap - (e - 2 * cap) / 2;
  return 0;
}

export function goalHit(origin: KickVec, dir: KickVec, g: GoalPlane): KickVec | null {
  if (!finite(origin.x, origin.y, dir.x, dir.y)) return null;
  const ahead = (g.x - origin.x) * g.sign;
  if (!(ahead > 1e-6)) return null;
  const vx = dir.x * g.sign;
  if (!(vx > 1e-3)) return null;
  const t = (g.x - origin.x) / dir.x;
  const y = origin.y + dir.y * t;
  if (!finite(t, y) || t <= 0) return null;
  return { x: g.x, y };
}

/**
 * Shot aim preview: the raw aim plus a small correction only when it is just outside the goal (inset edge),
 * never more than `shotAssistMax`; aims inside the posts are untouched (near/far side preserved), clearly
 * wide or backward aims are untouched. The goalkeeper is not an input.
 */
export function computeShotAim(origin: KickVec, rawAim: KickVec, g: GoalPlane, K: KickingTuning): ShotAimPreview {
  const al = Math.hypot(rawAim.x, rawAim.y);
  const raw = al > 1e-9 && Number.isFinite(al) ? { x: rawAim.x / al, y: rawAim.y / al } : { x: g.sign, y: 0 };
  let dir = raw;
  let correction = 0;
  const ahead = (g.x - origin.x) * g.sign;
  if (ahead > 1e-6 && finite(origin.x, origin.y)) {
    const inner = Math.max(0, g.halfWidth - K.shotPostInset);
    const a = Math.atan2(raw.y, raw.x);
    const aL = Math.atan2(g.centerY - inner - origin.y, g.x - origin.x);
    const aR = Math.atan2(g.centerY + inner - origin.y, g.x - origin.x);
    const lo = Math.min(wrap(aL - a), wrap(aR - a));
    const hi = Math.max(wrap(aL - a), wrap(aR - a));
    // lo..hi: the inset goal interval relative to the aim. Inside: 0 in [lo, hi].
    if (Math.abs(hi - lo) < Math.PI && raw.x * g.sign > 0) {
      if (lo > 0) correction = shotAssist(lo, K.shotAssistMax);
      else if (hi < 0) correction = -shotAssist(-hi, K.shotAssistMax);
      if (correction !== 0) {
        const c = a + correction;
        dir = { x: Math.cos(c), y: Math.sin(c) };
      }
    }
  }
  const hit = goalHit(origin, dir, g);
  const onTarget = !!hit && Math.abs(hit.y - g.centerY) <= g.halfWidth;
  return { dir, correction, hit, onTarget };
}

export interface ShotErrorInputs {
  /** 0..1 opponent pressure, body misalignment (0 aligned .. 1 reversed), charge (effort). */
  readonly pressure: number;
  readonly misalign: number;
  readonly charge: number;
  /** Finishing multiplier (1 neutral, higher is more precise). */
  readonly finishing: number;
}

/** Bounded execution-error spread (radians). Full power alone, when balanced and unpressured, adds nothing. */
export function shotErrorSpread(i: ShotErrorInputs, K: KickingTuning): number {
  const pr = clamp(Number.isFinite(i.pressure) ? i.pressure : 0, 0, 1);
  const mis = clamp(Number.isFinite(i.misalign) ? i.misalign : 0, 0, 1);
  const q = clamp(Number.isFinite(i.charge) ? i.charge : 0, 0, 1);
  const fin = Number.isFinite(i.finishing) && i.finishing > 0 ? i.finishing : 1;
  const raw = K.shotErrorBase + K.shotErrorPressure * pr + K.shotErrorMisalign * mis + K.shotErrorEffort * q * Math.max(pr, mis);
  return clamp(raw / fin, 0, K.shotErrorMax);
}

/** One execution error from two RNG draws (triangular in [-spread, spread]). */
export function shotError(spread: number, r1: number, r2: number): number {
  return spread * (r1 + r2 - 1);
}

// ---- first touch ---------------------------------------------------------------------------------------

export type TouchOutcome = 'secure' | 'heavy' | 'deflect';

export interface TouchResult {
  readonly outcome: TouchOutcome;
  /** 0 (uncontrollable) .. 1 (clean). */
  readonly quality: number;
  /** Ball-relative speed the receiver had to absorb. */
  readonly relativeSpeed: number;
}

/**
 * Receiving contact: difficulty grows with the ball's speed relative to the receiver, a ball arriving
 * from behind the body, and real pressure; the control multiplier absorbs it. Deterministic (no extra roll).
 */
export function resolveReceivingContact(
  ballVel: KickVec,
  playerVel: KickVec,
  facing: KickVec,
  control: number,
  pressure: number,
  K: KickingTuning,
): TouchResult {
  const rx = ballVel.x - playerVel.x;
  const ry = ballVel.y - playerVel.y;
  const rel = Math.hypot(rx, ry);
  if (!finite(rel)) return { outcome: 'deflect', quality: 0, relativeSpeed: rel };
  const fl = Math.hypot(facing.x, facing.y);
  // Ball travelling toward the receiver's front: -rel . facing > 0.
  const front = rel > 1e-6 && fl > 1e-6 ? clamp(-(rx * facing.x + ry * facing.y) / (rel * fl), -1, 1) : 1;
  const behind = (1 - front) / 2;
  const pr = clamp(Number.isFinite(pressure) ? pressure : 0, 0, 1);
  const ctl = Number.isFinite(control) && control > 0 ? control : 1;
  const eff = (rel * (1 + K.touchBehindPenalty * behind) * (1 + K.touchPressurePenalty * pr)) / ctl;
  const quality = clamp((K.touchHardSpeed - eff) / (K.touchHardSpeed - K.touchCleanSpeed), 0, 1);
  const outcome: TouchOutcome = quality >= K.secureQuality ? 'secure' : quality >= K.deflectQuality ? 'heavy' : 'deflect';
  return { outcome, quality, relativeSpeed: rel };
}
