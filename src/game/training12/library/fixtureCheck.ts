/**
 * Proves a played fixture implements its signed numeric scene: it runs the fixture's passage in the simulator and
 * compares the frozen players, sides, roles, positions, velocities and ball with the scene, for the cue and the changed
 * cue. Anything the player cannot reproduce (today: facing) is a blocker. Framework-free.
 */
import type { RoleId } from '../ref/catalog.mjs';
import { createSituation, step, type SituationState } from '../situations/sim';
import type { Fixture, FixtureActor, P, Side, Variant } from '../situations/types';
import { LIBRARY_CARDS, LIBRARY_PITCH } from './tacticalLibrary.generated';
import type { LibraryScene, NumericScene } from './types';

const TOL = 0.01;
const GAME_ROLE: Readonly<Record<string, RoleId>> = { DM: '6', CM: '8', ST: '9' };

/**
 * Scene metres (x along the length from the home goal line, y across with home's left at y = width) to the half-field
 * fixture frame (x from the screen's left touchline, y from halfway to the goal line at the top).
 */
export function toFixtureFrame(v: { x: number; y: number }, goal: Fixture['goal'], velocity = false): P {
  const L = velocity ? 0 : LIBRARY_PITCH.length_m / 2;
  const W = velocity ? 0 : LIBRARY_PITCH.width_m;
  if (velocity) return goal === 'ours' ? { x: v.y, y: -v.x } : { x: -v.y, y: v.x };
  return goal === 'ours' ? { x: v.y, y: L - v.x } : { x: W - v.y, y: v.x - L };
}

/** The fixture players a numeric scene requires, moving into their freeze positions over passageSeconds. */
export function sceneActors(num: NumericScene, goal: Fixture['goal'], passageSeconds: number): FixtureActor[] {
  return num.actors.map((a) => {
    const [team, role] = a.id.split('_') as ['H' | 'A', string];
    const side: Side = role === 'GK' ? (team === 'H' ? 'GK_A' : 'GK_B') : team === 'H' ? 'A' : 'B';
    const freeze = toFixtureFrame(a.pos, goal);
    const v = toFixtureFrame(a.vel, goal, true);
    const moving = a.vel.x !== 0 || a.vel.y !== 0;
    const at = moving ? { x: freeze.x - v.x * passageSeconds, y: freeze.y - v.y * passageSeconds } : freeze;
    return { slot: a.id, side, role: (GAME_ROLE[role] ?? role) as RoleId, at, task: '', ...(moving ? { passage: freeze } : {}) };
  });
}

const PLAY_TOL = 0.05;
const near = (a: P | undefined, b: P | undefined, tol = TOL): boolean => (!a && !b) || (!!a && !!b && Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol);
const fmt = (v: P | undefined): string => (v ? `(${v.x.toFixed(2)}, ${v.y.toFixed(2)})` : 'none');

/** Runs the fixture's passage in the simulator and returns the state it actually freezes on. */
export function playedFreeze(fx: Fixture, variant: Variant): SituationState {
  const s = createSituation(fx, variant);
  let guard = 0;
  while (s.phase === 'release' && guard++ < 6000) step(s);
  return s;
}

function compare(id: string, label: string, fx: Fixture, variant: Variant, num: NumericScene): string[] {
  const spec = fx[variant];
  const want = sceneActors(num, fx.goal, fx.passageSeconds);
  const have = fx.actors.map((a) => a.slot).sort().join(', ');
  if (have !== want.map((a) => a.slot).sort().join(', ')) return [`${id} (${label}): fixture players [${have}] differ from the scene's shown players [${want.map((a) => a.slot).sort().join(', ')}].`];
  const p: string[] = [];
  for (const w of want) {
    const a = fx.actors.find((x) => x.slot === w.slot)!;
    if (a.side !== w.side || a.role !== w.role) p.push(`${id} (${label}): ${w.slot} is ${a.side}/${a.role} in the fixture, ${w.side}/${w.role} in the scene.`);
  }
  if (spec.passageBall) p.push(`${id} (${label}): the fixture plays a ball during the passage that the scene does not record.`);
  const ball = spec.ball ?? fx.ball;
  const owner = 'owner' in ball ? ball.owner : null;
  if (owner !== num.ball.owner) p.push(`${id} (${label}): fixture ball is with ${owner ?? 'nobody'}, the scene has ${num.ball.owner ?? 'nobody'}.`);
  const played = playedFreeze(fx, variant);
  if (played.actors.length !== want.length) p.push(`${id} (${label}): the simulator plays ${played.actors.length} players, the scene shows ${want.length}.`);
  for (const a of num.actors) {
    const got = played.actors.find((x) => x.slot === a.id);
    if (!got) continue;
    const pos = toFixtureFrame(a.pos, fx.goal);
    if (!near(got.pos, pos, PLAY_TOL)) p.push(`${id} (${label}): ${a.id} freezes at ${fmt(got.pos)} in play, the scene has ${fmt(pos)}.`);
    const vel = toFixtureFrame(a.vel, fx.goal, true);
    if (!near(got.vel, vel, PLAY_TOL)) p.push(`${id} (${label}): ${a.id} is moving at ${fmt(vel)} m/s in the scene; the simulator freezes it at ${fmt(got.vel)}.`);
  }
  const bp = toFixtureFrame(num.ball.pos, fx.goal);
  if (!near(played.ball.pos, bp, PLAY_TOL)) p.push(`${id} (${label}): the ball freezes at ${fmt(played.ball.pos)} in play, the scene has it at ${fmt(bp)}.`);
  if (num.actors.length) p.push(`${id} (${label}): the half-field player does not model facing, so the scene's signed facing cannot be shown.`);
  return p;
}

/** Problems that stop the played fixture from standing for the signed scene. Empty means they agree. */
export function fixtureMatchesScene(scene: LibraryScene): string[] {
  const id = scene.cardId;
  const fx = scene.fixture;
  const card = LIBRARY_CARDS.find((c) => c.id === id);
  const half = LIBRARY_PITCH.length_m / 2;
  const p: string[] = [];
  if (fx.exact !== true) p.push(`${id}: the played fixture is not exact (squad.ts would add shape-holders the scene does not have).`);
  if (fx.id !== scene.sceneId) p.push(`${id}: fixture ${fx.id} was not built for scene ${scene.sceneId}.`);
  if (card && fx.human !== card.protagonist) p.push(`${id}: the fixture's player is ${fx.human}, the card's protagonist is ${card.protagonist}.`);
  for (const [label, num] of [['cue', scene.numeric], ['changed cue', scene.changedCue]] as const) {
    if (!num) continue;
    const v = num.view;
    if (fx.goal === 'ours' ? v.max.x > half + TOL : v.min.x < half - TOL)
      p.push(`${id} (${label}): the scene's ${v.kind} view is not inside the ${fx.goal === 'ours' ? 'home' : 'away'} half; the half-field player cannot show it yet.`);
  }
  if (!scene.changedCue) p.push(`${id}: no signed changed-cue scene to check the retry against.`);
  if (p.length) return p;
  return [...compare(id, 'cue', fx, 'cue', scene.numeric), ...compare(id, 'changed cue', fx, 'counter', scene.changedCue!)];
}
