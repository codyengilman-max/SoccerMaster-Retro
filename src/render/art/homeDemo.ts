/**
 * At-home exercise demonstrations drawn with the created player's own training sheet (owner request, 2026-10-21).
 * Pure and cosmetic: maps an activity's DemoSpec and a playback time to a sprite frame, the player's position and a
 * separately drawn ball (position + height). Playback never touches the career save or completion records.
 * Coordinates: the 10 x 6 practice area of the DemoSpec; ball height `h` in the same units.
 */
import type { Activity, DemoSpec } from '../../game/career/types';
import { protagonistSet, type ProtagonistSex, type SpriteSetId } from './spriteSets';
import { juggleTimeline, sheetPoseAt, type JuggleBeat, type JuggleSex } from './juggleSheet';

export type Contact = 'laces' | 'thigh' | 'inside' | 'outside' | 'sole' | 'catch' | 'strike' | 'none';
export interface DemoPose {
  readonly frame: string;
  /** Mirror the frame: left-foot contacts and left-facing travel (the sheets draw right-foot, right-facing poses). */
  readonly flip: boolean;
  readonly px: number;
  readonly py: number;
  readonly ball: { readonly x: number; readonly y: number; readonly h: number };
  readonly contact: Contact;
  readonly caption: string | null;
  /** Working foot, only where the catalog authors one (step frames). Absent for path demos: `flip` there is travel direction. */
  readonly foot?: 'left' | 'right';
  /** Juggling-pack frame (sheet cell px): body frame, planted-boot shift and the separately drawn ball. */
  readonly art?: { readonly sheet: 'juggle'; readonly sex: JuggleSex; readonly index: number; readonly dx: number; readonly ball: { readonly x: number; readonly y: number; readonly r: number } };
}

export interface DemoOptions {
  readonly sex?: ProtagonistSex;
  /** Juggling: play the miss → retrieve → reset branch instead of the final catch. */
  readonly miss?: boolean;
}

/** The one place a demo picks its sheet: saved boy/girl, training kit, keeper sheet for keeper exercises. */
export function demoSet(sex: ProtagonistSex | undefined, keeper = false): SpriteSetId {
  return protagonistSet(sex === 'girl' ? 'girl' : 'boy', 'training', keeper);
}
/** Home exercises that are keeper-specific (none exist in the catalog yet; see docs/art/HOME_DEMOS.md). */
export const isKeeperExercise = (a: Activity): boolean => (a.skillFamilyId as string) === 'goalkeeping';

/** Juggle row of the training sheets, by contact surface (inspected on both boy and girl sheets). */
export const JUGGLE_FRAMES: Readonly<Record<'laces' | 'thigh', readonly string[]>> = {
  laces: ['juggle-0', 'juggle-1', 'juggle-7'],
  thigh: ['juggle-2', 'juggle-6'],
};
const CONTACT_H = { laces: 0.45, thigh: 1.05 } as const;

type Beat = { readonly s: 'laces' | 'thigh' | 'bounce' | 'catch' | 'settle' | 'dribble' | 'pass'; readonly foot: 'right' | 'left' };
const R = (s: Beat['s']): Beat => ({ s, foot: 'right' });
const Lf = (s: Beat['s']): Beat => ({ s, foot: 'left' });
/** Contact pattern per juggling ladder step, from each level's objective and steps. */
export const JUGGLE_PATTERNS: Readonly<Record<string, readonly Beat[]>> = {
  'jg-1': [R('laces'), R('catch')],
  'jg-2': [R('laces'), R('catch'), Lf('laces'), Lf('catch')],
  'jg-3': [R('laces'), R('bounce'), R('laces'), R('catch')],
  'jg-4': [R('laces'), R('laces'), R('catch')],
  'jg-5': [R('laces'), Lf('laces'), R('laces'), Lf('laces'), R('catch')],
  'jg-6': [R('laces'), R('thigh'), R('laces'), Lf('thigh'), R('catch')],
  'jg-7': [R('laces'), Lf('laces'), R('laces'), R('settle'), R('dribble')],
  'jg-8': [R('laces'), Lf('laces'), R('laces'), R('settle'), R('pass')],
};
export const BEAT_SECONDS = 0.8;
/** Highest ball height any demo uses (juggling apex), for framing. */
export const DEMO_BALL_PEAK = 1.9;

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const at = (k: readonly { t: number; x: number; y: number }[], t: number) => {
  let i = 0;
  while (i < k.length - 2 && k[i + 1]!.t < t) i++;
  const p = k[i]!;
  const q = k[Math.min(i + 1, k.length - 1)]!;
  const f = q.t > p.t ? Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t))) : 1;
  return { x: lerp(p.x, q.x, f), y: lerp(p.y, q.y, f), i, f };
};

/** Total loop length of a demo in seconds (one second rest for path demos, matching the old player). */
/** Ladder steps the juggling pack can show (drop, laces touches, bounce, catch); thigh/settle/pass keep the sprite-v2 poses. */
export function sheetBeats(a: Activity): readonly JuggleBeat[] | null {
  const j = JUGGLE_PATTERNS[a.id];
  return j && j.every((b) => b.s === 'laces' || b.s === 'bounce' || b.s === 'catch') ? (j as readonly JuggleBeat[]) : null;
}
const sexOf = (o?: DemoOptions): JuggleSex => (o?.sex === 'girl' ? 'girl' : 'boy');

export function demoLength(a: Activity, opts?: DemoOptions): number {
  const sb = opts && sheetBeats(a);
  if (sb) return juggleTimeline(a.id, sb, sexOf(opts), !!opts.miss).length;
  const j = JUGGLE_PATTERNS[a.id];
  if (j) return j.length * BEAT_SECONDS + 0.6;
  return a.demo.kind === 'path' ? a.demo.seconds + 1 : a.demo.frames.length * 1.4;
}

/** Without `opts` the sprite-v2 poses are used (legacy callers); with `opts` juggling ladders 1–5 use the juggling pack. */
export function demoPose(a: Activity, time: number, opts?: DemoOptions): DemoPose {
  const sb = opts && sheetBeats(a);
  if (sb) {
    const sex = sexOf(opts);
    const p = sheetPoseAt(juggleTimeline(a.id, sb, sex, !!opts.miss), sex, time);
    const contact: Contact = p.contact === 'laces' ? 'laces' : p.contact === 'catch' ? 'catch' : 'none';
    // Practice-area coordinates kept for diagnostics: 100 cell px ≈ one body height.
    return { frame: `juggle-${sex}-${p.index}`, flip: false, px: 5, py: 3.2, ball: { x: 5 + (p.ball.x - 80) / 100, y: 3.2, h: Math.max(0, (120 - p.ball.y - p.ball.r) / 55) }, contact, caption: p.caption, art: { sheet: 'juggle', sex, index: p.index, dx: p.dx, ball: p.ball } };
  }
  const j = JUGGLE_PATTERNS[a.id];
  if (j) return jugglePose(j, time % demoLength(a));
  const d = a.demo;
  return d.kind === 'path' ? pathPose(d, a.skillFamilyId === 'defending', kicksBall(a), deliversBack(a), time % demoLength(a)) : stepsPose(d, a.skillFamilyId === 'defending', time);
}

function jugglePose(beats: readonly Beat[], t: number): DemoPose {
  const px = 5, py = 3.2;
  const idx = Math.min(beats.length - 1, Math.floor(t / BEAT_SECONDS));
  const b = beats[idx]!;
  const f = Math.min(1, (t - idx * BEAT_SECONDS) / BEAT_SECONDS);
  const flip = b.foot === 'left';
  const bx = px + (flip ? -0.35 : 0.35);
  const touched = (s: Beat['s']) => s === 'laces' || s === 'thigh';
  const next = beats[idx + 1];
  const nextH = next && touched(next.s) ? CONTACT_H[next.s as 'laces' | 'thigh'] : next?.s === 'catch' ? 0.75 : 0.45;
  if (t >= beats.length * BEAT_SECONDS) return { frame: 'idle-s', flip: false, px, py, ball: { x: px + 0.2, y: py, h: 0.75 }, contact: 'none', caption: 'Reset' };
  if (touched(b.s)) {
    const s = b.s as 'laces' | 'thigh';
    const h0 = CONTACT_H[s];
    const peak = DEMO_BALL_PEAK;
    // Rise to the peak, then fall to the next contact height: contact is exactly at the start of the beat.
    const h = f < 0.5 ? lerp(h0, peak, 1 - (1 - f * 2) ** 2) : lerp(peak, nextH, ((f - 0.5) * 2) ** 2);
    const list = JUGGLE_FRAMES[s];
    // Falling half drifts to where the next beat meets the ball (the other foot, or the hands).
    const nextX = next?.s === 'catch' ? px + 0.2 : next?.s === 'settle' ? px + 0.5 : next && touched(next.s) ? px + (next.foot === 'left' ? -0.35 : 0.35) : bx;
    const x = f < 0.5 ? bx : lerp(bx, nextX, (f - 0.5) * 2);
    // Preparation: the last part of the beat already shows the next contact surface, rising to meet the ball.
    if (f > 0.85 && next && touched(next.s)) {
      const nl = JUGGLE_FRAMES[next.s as 'laces' | 'thigh'];
      return { frame: nl[(idx + 1) % nl.length]!, flip: next.foot === 'left', px, py, ball: { x, y: py, h }, contact: 'none', caption: `${next.foot === 'left' ? 'Left' : 'Right'} ${next.s === 'laces' ? 'laces' : 'thigh'} up` };
    }
    const frame = f < 0.15 ? list[idx % list.length]! : 'idle-e';
    return { frame, flip, px, py, ball: { x, y: py, h }, contact: f < 0.15 ? s : 'none', caption: `${b.foot === 'left' ? 'Left' : 'Right'} ${s === 'laces' ? 'laces' : 'thigh'} up` };
  }
  if (b.s === 'bounce') {
    // Continues the previous beat's fall (laces height) to the ground, rebounds, and drops back to the next contact.
    const h = f < 0.25 ? lerp(0.45, 0, (f / 0.25) ** 2) : f < 0.65 ? lerp(0, 1.1, 1 - (1 - (f - 0.25) / 0.4) ** 2) : lerp(1.1, nextH, ((f - 0.65) / 0.35) ** 2);
    return { frame: 'idle-e', flip, px, py, ball: { x: bx, y: py, h }, contact: 'none', caption: 'Let it bounce once' };
  }
  if (b.s === 'catch') {
    // Hold, then drop from the hands onto the next contact.
    const drop = next && f > 0.7;
    const h = drop ? lerp(0.75, nextH, ((f - 0.7) / 0.3) ** 2) : 0.75;
    return { frame: 'idle-s', flip: false, px, py, ball: { x: drop ? lerp(px + 0.2, px + (next.foot === 'left' ? -0.35 : 0.35), (f - 0.7) / 0.3) : px + 0.2, y: py, h }, contact: drop ? 'none' : 'catch', caption: drop ? 'Drop it' : 'Catch it' };
  }
  if (b.s === 'settle') return { frame: 'dribble-0', flip: false, px, py, ball: { x: px + 0.5, y: py, h: lerp(0.45, 0, f) }, contact: 'sole', caption: 'Settle it on the ground' };
  if (b.s === 'dribble') {
    const x = lerp(px, 8.5, f);
    return { frame: `dribble-${Math.floor(f * 6) % 2}`, flip: false, px: x, py, ball: { x: x + 0.5, y: py, h: 0 }, contact: 'inside', caption: 'Dribble away' };
  }
  const frame = f < 0.25 ? 'kick-2' : f < 0.45 ? 'kick-4' : 'kick-5';
  return { frame, flip: false, px, py, ball: { x: f < 0.35 ? px + 0.5 : lerp(px + 0.5, 9.4, (f - 0.35) / 0.65), y: py, h: 0 }, contact: f >= 0.25 && f < 0.45 ? 'strike' : 'none', caption: 'Pass to the spot' };
}

/** Moving demos: run/dribble with the ball, a kick exactly when the ball leaves the foot, jockey for defending. */
function pathPose(d: Extract<DemoSpec, { kind: 'path' }>, defending: boolean, kicks: boolean, back: boolean, t: number): DemoPose {
  const pl = at(d.player, t);
  const b = at(d.ball, t);
  const nb = at(d.ball, Math.min(d.seconds, t + 0.05));
  const np = at(d.player, Math.min(d.seconds, t + 0.05));
  const ballSpeed = Math.hypot(nb.x - b.x, nb.y - b.y) / 0.05;
  const speed = Math.hypot(np.x - pl.x, np.y - pl.y) / 0.05;
  const vx = speed > 0.05 ? np.x - pl.x : b.x - pl.x;
  const flip = vx < 0;
  // A strike: the ball starts a long, fast segment while next to the player.
  const strikeAt = strikeTimes(d);
  const s = strikeAt.find((k) => t >= k - 0.25 && t <= k + 0.3);
  const ball = { x: b.x, y: b.y, h: 0 };
  // Directional first touches, carries and recoveries push the ball with a touch, never a kick.
  if (s !== undefined && !kicks) {
    const frame = t < s + 0.15 ? 'dribble-1' : `run-${Math.floor(t * 8) % 8}`;
    return { frame, flip, px: pl.x, py: pl.y, ball, contact: Math.abs(t - s) < 0.1 ? 'inside' : 'none', caption: null };
  }
  // A pass/shot exercise whose route ends with the ball at the feet: deliver it at the end of the route.
  if (kicks && strikeAt.length === 0 && t > d.seconds) {
    const f = t - d.seconds;
    const last = d.ball[d.ball.length - 1]!;
    const frame = f < 0.15 ? 'kick-2' : f < 0.3 ? 'kick-4' : 'kick-5';
    const k = Math.max(0, (f - 0.22) / 0.78);
    // Delivered the way the route was travelling, or back the other way after a turn.
    const prev = d.ball[d.ball.length - 2] ?? last;
    const dir = Math.sign(last.x - prev.x) || 1;
    const toward = back ? -dir : dir;
    return { frame, flip: toward < 0, px: pl.x, py: pl.y, ball: { x: lerp(last.x, toward > 0 ? 9.7 : 0.3, k), y: last.y, h: 0 }, contact: f >= 0.15 && f < 0.3 ? 'strike' : 'none', caption: null };
  }
  if (s !== undefined) {
    const frame = t < s - 0.1 ? 'kick-2' : t < s + 0.1 ? 'kick-4' : 'kick-5';
    return { frame, flip, px: pl.x, py: pl.y, ball, contact: Math.abs(t - s) < 0.1 ? 'strike' : 'none', caption: null };
  }
  const near = Math.hypot(b.x - pl.x, b.y - pl.y) < 1.2;
  const step = Math.floor(t * 8);
  let frame = defending ? 'block-0' : 'idle-e';
  if (speed > 0.3) {
    if (defending && !near) frame = speed > 1.8 ? `run-${step % 8}` : `jockey-${step % 2}`;
    else if (near && ballSpeed > 0.3) frame = `dribble-${Math.floor(t * 4) % 2}`;
    else frame = `run-${step % 8}`;
  }
  return { frame, flip, px: pl.x, py: pl.y, ball, contact: near && ballSpeed > 0.3 && speed > 0.3 ? 'inside' : 'none', caption: null };
}

/** Exercises whose demonstrated contact is a pass or shot (kick frames); every other route uses touch frames. */
export const kicksBall = (a: Activity): boolean => a.skillFamilyId === 'passing' || a.skillFamilyId === 'finishing' || /pass|distribution/.test(a.id);

/** Pass/shot exercises that turn and play the ball back the way they came (their steps say so). */
export const deliversBack = (a: Activity): boolean => a.steps.some((x) => /\bturn\b/i.test(x)) && a.steps.some((x) => /\bback\b|other way/i.test(x));

/** Times at which the ball leaves the player's foot for a long, fast segment (pass, shot, wall pass). */
export function strikeTimes(d: Extract<DemoSpec, { kind: 'path' }>): number[] {
  const out: number[] = [];
  for (let i = 0; i < d.ball.length - 1; i++) {
    const p = d.ball[i]!, q = d.ball[i + 1]!;
    const dist = Math.hypot(q.x - p.x, q.y - p.y);
    const dt = q.t - p.t;
    const pl = at(d.player, p.t);
    if (dist >= 2 && dt > 0 && dist / dt > 2 && Math.hypot(pl.x - p.x, pl.y - p.y) < 1.4) out.push(p.t);
  }
  return out;
}

const STEP_POSE = {
  inside: { frame: 'dribble-0', dx: 0.45, h: 0, contact: 'inside' },
  outside: { frame: 'dribble-1', dx: 0.6, h: 0, contact: 'outside' },
  sole: { frame: 'dribble-0', dx: 0.4, h: 0, contact: 'sole' },
  front: { frame: 'idle-e', dx: 0.7, h: 0, contact: 'none' },
  air: { frame: 'juggle-0', dx: 0.35, h: 0.9, contact: 'laces' },
  away: { frame: 'dribble-1', dx: 1.3, h: 0, contact: 'none' },
} as const;

/** Still-frame demos (footwork an animation would misrepresent): the protagonist in the closest pose per frame. */
function stepsPose(d: Extract<DemoSpec, { kind: 'steps' }>, defending: boolean, t: number): DemoPose {
  const n = d.frames.length;
  const k = Math.floor(t / 1.4) % n;
  const fr = d.frames[k]!;
  const p = STEP_POSE[fr.ball];
  const flip = fr.foot === 'left';
  const frame = defending && fr.ball === 'away' ? `jockey-${k % 2}` : p.frame;
  const dx = defending && fr.ball === 'away' ? 1.6 : p.dx;
  return { frame, flip, px: 5, py: 3.2, ball: { x: 5 + (flip ? -dx : dx), y: 3.2, h: p.h }, contact: p.contact, caption: `${k + 1}. ${fr.caption}`, ...(fr.foot === 'either' ? {} : { foot: fr.foot }) };
}

/** Times (s) where a sprite-v2 demo changes pose or contact; Step jumps between them. Always starts at 0. */
export function demoBeats(a: Activity): number[] {
  const len = demoLength(a);
  const out = [0];
  let prev = demoPose(a, 0);
  for (let t = 0.05; t < len; t += 0.05) {
    const p = demoPose(a, t);
    if (p.frame !== prev.frame || p.contact !== prev.contact || p.flip !== prev.flip) out.push(Math.round(t * 100) / 100);
    prev = p;
  }
  return out;
}

/** Next Step target after `t`, wrapping to the start. */
export function nextBeat(beats: readonly number[], t: number, len: number): number {
  const at = ((t % len) + len) % len;
  return beats.find((b) => b > at + 0.001) ?? 0;
}
