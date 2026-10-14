import type { Vec2 } from '../vec';
import type { MatchPlayerId } from '../match/types';
import type { CoachFacts, MateFact } from './facts';
import { COACH_TUNING as C } from './tuning';
import type { Grade, Highlight, Intention, NameFn, OptionDef, TemplateDef } from './types';

/**
 * Authored Coach Moment templates. Each one reads only measured coach facts; options that would refer to
 * something the facts do not contain (an open teammate, a shooting lane) declare `available` and are hidden.
 * Grades are decided from the frozen pre-answer facts; several answers may be defensible.
 */

const W = (f: CoachFacts, p: Vec2): Vec2 =>
  f.team === 'home' ? { x: p.x, y: p.y } : { x: f.pitch.length - p.x, y: f.pitch.width - p.y };
const clampT = (f: CoachFacts, p: Vec2): Vec2 => ({
  x: Math.min(f.pitch.length - 2, Math.max(2, p.x)),
  y: Math.min(f.pitch.width - 2, Math.max(2, p.y)),
});
const yd = (n: number): string => `${Math.round(n)} yd`;
const carrierId = (f: CoachFacts): MatchPlayerId => f.carrier!.id;
const settled = (f: CoachFacts): boolean => !!f.carrier && f.carrier.ownedSeconds >= C.settledSeconds;
const onBall = (action: Extract<Intention, { kind: 'onBall' }>['action'], targetId: MatchPlayerId | null = null): Intention => ({ kind: 'onBall', action, targetId });
const none = (note: string): Intention => ({ kind: 'none', note });
const focus = (id: MatchPlayerId): Highlight => ({ kind: 'player', id, tone: 'focus' });
const mateHi = (id: MatchPlayerId): Highlight => ({ kind: 'player', id, tone: 'mate' });
const oppHi = (id: MatchPlayerId): Highlight => ({ kind: 'player', id, tone: 'opponent' });
const lane = (f: CoachFacts, m: MateFact): Highlight => ({ kind: 'lane', from: carrierId(f), to: m.id, open: m.open });
const fixed = (g: Grade) => (): Grade => g;

/** The open teammate closest to the carrier (a short combination). */
const nearOpen = (f: CoachFacts): MateFact | null =>
  f.mates.filter((m) => m.open && m.distance <= 12).sort((a, b) => a.distance - b.distance)[0] ?? null;
const openUnderneath = (f: CoachFacts): MateFact | null =>
  f.mates.filter((m) => m.open && m.relation === 'underneath').sort((a, b) => a.distance - b.distance)[0] ?? null;
const openForward = (f: CoachFacts): MateFact | null =>
  f.mates.filter((m) => m.open && m.progress > 3).sort((a, b) => b.progress - a.progress)[0] ?? null;
/** Closest non-open teammate who could move to help (off-ball support questions). */
const helper = (f: CoachFacts, pred: (m: MateFact) => boolean = () => true): MateFact | null =>
  f.mates.filter((m) => m.distance <= 20 && pred(m)).sort((a, b) => a.distance - b.distance)[0] ?? null;
/** Open teammate with a better shooting position than the carrier. */
const betterChance = (f: CoachFacts): MateFact | null => {
  const c = f.carrier;
  if (!c) return null;
  const gy = f.pitch.width / 2;
  const goalDist = (p: Vec2): number => Math.hypot(f.pitch.length - p.x, gy - p.y);
  return f.mates.filter((m) => m.open && goalDist(m.pos) + 3 < goalDist(c.pos) && Math.abs(m.pos.y - gy) < Math.abs(c.pos.y - gy)).sort((a, b) => goalDist(a.pos) - goalDist(b.pos))[0] ?? null;
};

const opt = (o: OptionDef): OptionDef => o;

export const CATALOG: readonly TemplateDef[] = [
  {
    id: 'atk.carry-into-space',
    version: 1,
    topic: 'carry',
    phase: 'attack',
    ball: 'on',
    objective: 'When there is open grass in front of you, carry the ball into it.',
    requires: ['carrier', 'pressure', 'space'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.carrier!.pressureDistance >= C.pressureLoose && f.carrier!.spaceAhead >= C.spaceAhead,
    question: (f) => `You have the ball and about ${yd(f.carrier!.spaceAhead)} of space in front of you. What's best?`,
    highlights: (f) => [focus(carrierId(f)), { kind: 'space', at: W(f, { x: f.carrier!.pos.x + Math.min(8, f.carrier!.spaceAhead / 2), y: f.carrier!.pos.y }), radius: 4 }],
    options: [
      opt({ id: 'carry', text: () => 'Carry it forward into the space', grade: (f) => (f.carrier!.spaceAhead >= 12 ? 'strong' : 'reasonable'), feedback: (f) => `Nobody was within ${yd(f.carrier!.pressureDistance)}, so carrying forward gains ground and pulls defenders toward you.`, intention: () => onBall('carry') }),
      opt({ id: 'pass', available: (f) => !!f.bestOpenMate, text: (f, n) => `Pass now to ${n(f.bestOpenMate!.id)}`, grade: fixed('reasonable'), feedback: (f, n) => `${n(f.bestOpenMate!.id)} was open, so the pass is fine, but you gave away the free space you had.`, intention: (f) => onBall('pass', f.bestOpenMate!.id) }),
      opt({ id: 'wait', text: () => 'Stop and wait for help', grade: fixed('risky'), feedback: () => 'Stopping gives the defenders time to close the space you had.', intention: () => onBall('protect') }),
    ],
  },
  {
    id: 'atk.release-under-pressure',
    version: 1,
    topic: 'release',
    phase: 'attack',
    ball: 'on',
    objective: 'Under pressure, move the ball on to an open teammate.',
    requires: ['carrier', 'pressure', 'passingLanes'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.carrier!.pressureDistance <= C.pressureTight && !!f.bestOpenMate,
    question: (f, n) => `${n(f.carrier!.pressureId!)} is only ${yd(f.carrier!.pressureDistance)} away from you. What now?`,
    highlights: (f) => [focus(carrierId(f)), oppHi(f.carrier!.pressureId!), mateHi(f.bestOpenMate!.id), lane(f, f.bestOpenMate!)],
    options: [
      opt({ id: 'release', text: (f, n) => `Pass quickly to ${n(f.bestOpenMate!.id)}`, grade: fixed('strong'), feedback: (f, n) => `The lane to ${n(f.bestOpenMate!.id)} was clear by ${yd(f.bestOpenMate!.laneClearance)}. A quick pass beats the pressure.`, intention: (f) => onBall('pass', f.bestOpenMate!.id) }),
      opt({ id: 'dribble', text: () => 'Dribble past the defender', grade: (f) => (f.carrier!.pressersNear >= 2 ? 'risky' : 'reasonable'), feedback: (f) => (f.carrier!.pressersNear >= 2 ? `There were ${f.carrier!.pressersNear} defenders close by, so dribbling here often loses the ball.` : 'With only one defender close, a dribble can work, but a pass was safer.'), intention: () => onBall('carry') }),
      opt({ id: 'shield', text: () => 'Shield the ball and wait', grade: (f) => (f.carrier!.pressersNear <= 1 ? 'reasonable' : 'risky'), feedback: (f) => (f.carrier!.pressersNear <= 1 ? 'Shielding against one defender can hold the ball, but it slows the attack.' : 'Shielding against two defenders usually ends in losing the ball.'), intention: () => onBall('protect') }),
    ],
  },
  {
    id: 'atk.combine-nearby',
    version: 1,
    topic: 'combine',
    phase: 'attack',
    ball: 'on',
    objective: 'Use a nearby teammate for a quick give-and-go.',
    requires: ['carrier', 'passingLanes', 'support'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && !!nearOpen(f) && f.carrier!.pressureDistance <= C.pressureLoose && f.carrier!.pressureDistance > 2,
    question: (f, n) => `${n(nearOpen(f)!.id)} is open ${yd(nearOpen(f)!.distance)} from you, and a defender is coming. What's the move?`,
    highlights: (f) => [focus(carrierId(f)), mateHi(nearOpen(f)!.id), lane(f, nearOpen(f)!)],
    options: [
      opt({ id: 'one-two', text: (f, n) => `Pass to ${n(nearOpen(f)!.id)} and move for the return`, grade: fixed('strong'), feedback: () => 'A short pass and a move takes the defender out of the game.', intention: (f) => onBall('pass', nearOpen(f)!.id) }),
      opt({ id: 'long', available: (f) => !!openForward(f) && openForward(f)!.distance > 15, text: (f, n) => `Play a long pass to ${n(openForward(f)!.id)}`, grade: fixed('reasonable'), feedback: (f, n) => `${n(openForward(f)!.id)} was open, so the long pass is possible, but long passes are harder to control.`, intention: (f) => onBall('pass', openForward(f)!.id) }),
      opt({ id: 'solo', text: () => 'Dribble on your own', grade: (f) => (f.carrier!.spaceAhead >= C.spaceAhead ? 'reasonable' : 'risky'), feedback: (f) => (f.carrier!.spaceAhead >= C.spaceAhead ? 'There was some space ahead, so a dribble is an option.' : `Only ${yd(f.carrier!.spaceAhead)} ahead before a defender: dribbling alone is risky.`), intention: () => onBall('carry') }),
    ],
  },
  {
    id: 'atk.switch-play',
    version: 1,
    topic: 'switch',
    phase: 'attack',
    ball: 'on',
    objective: 'When one side is crowded, switch the ball to the open side.',
    requires: ['carrier', 'passingLanes', 'support'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && !!f.openSwitch && f.carrier!.oppNearCarrier >= 3,
    question: (f, n) => `${f.carrier!.oppNearCarrier} opponents are near you. ${n(f.openSwitch!.id)} is open on the far side. What's best?`,
    highlights: (f) => [focus(carrierId(f)), mateHi(f.openSwitch!.id), lane(f, f.openSwitch!)],
    options: [
      opt({ id: 'switch', text: (f, n) => `Switch the ball to ${n(f.openSwitch!.id)}`, grade: fixed('strong'), feedback: (f, n) => `Most defenders were on your side, so ${n(f.openSwitch!.id)} had time on the ball.`, intention: (f) => onBall('switch', f.openSwitch!.id) }),
      opt({ id: 'back', available: (f) => !!openUnderneath(f), text: (f, n) => `Play back to ${n(openUnderneath(f)!.id)} first`, grade: fixed('reasonable'), feedback: () => 'Going back keeps the ball and can still switch, but it is slower.', intention: (f) => onBall('recycle', openUnderneath(f)!.id) }),
      opt({ id: 'force', text: () => 'Keep attacking down this side', grade: fixed('risky'), feedback: (f) => `${f.carrier!.oppNearCarrier} defenders were waiting on this side.`, intention: () => onBall('carry') }),
    ],
  },
  {
    id: 'atk.protect-possession',
    version: 1,
    topic: 'protect',
    phase: 'attack',
    ball: 'on',
    objective: 'With a defender tight and no forward pass, protect the ball and play back.',
    requires: ['carrier', 'pressure', 'passingLanes'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.carrier!.pressureDistance <= 3.5 && !openForward(f) && !!openUnderneath(f),
    question: (f, n) => `A defender is right on you and nobody ahead is open. ${n(openUnderneath(f)!.id)} is behind you. What do you do?`,
    highlights: (f) => [focus(carrierId(f)), oppHi(f.carrier!.pressureId!), mateHi(openUnderneath(f)!.id), lane(f, openUnderneath(f)!)],
    options: [
      opt({ id: 'shield-back', text: (f, n) => `Shield it, then pass back to ${n(openUnderneath(f)!.id)}`, grade: fixed('strong'), feedback: () => 'Keeping your body between the defender and the ball, then playing back, keeps possession.', intention: (f) => onBall('recycle', openUnderneath(f)!.id) }),
      opt({ id: 'sideways', text: () => 'Carry it sideways away from the defender', grade: (f) => (f.carrier!.nearTouchline ? 'risky' : 'reasonable'), feedback: (f) => (f.carrier!.nearTouchline ? 'Near the touchline there is little room to go sideways.' : 'Moving sideways can buy time if you keep your body in the way.'), intention: () => onBall('carry') }),
      opt({ id: 'turn', text: () => 'Turn into the defender', grade: fixed('risky'), feedback: (f) => `The defender was ${yd(f.carrier!.pressureDistance)} away, so turning into them usually loses the ball.`, intention: () => onBall('turn') }),
    ],
  },
  {
    id: 'atk.turn-when-free',
    version: 1,
    topic: 'turn',
    phase: 'attack',
    ball: 'on',
    objective: 'When no one is close, turn and face forward.',
    requires: ['carrier', 'pressure'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && !f.carrier!.facingForward && f.carrier!.pressureDistance >= 6,
    question: (f) => `You are facing away from goal, and the nearest defender is ${yd(f.carrier!.pressureDistance)} away. What's best?`,
    highlights: (f) => [focus(carrierId(f)), ...(f.carrier!.pressureId ? [oppHi(f.carrier!.pressureId)] : [])],
    options: [
      opt({ id: 'turn', text: () => 'Turn and face forward', grade: fixed('strong'), feedback: (f) => `With ${yd(f.carrier!.pressureDistance)} of room, turning lets you see the whole pitch.`, intention: () => onBall('turn') }),
      opt({ id: 'back', available: (f) => !!openUnderneath(f), text: (f, n) => `Pass back to ${n(openUnderneath(f)!.id)}`, grade: fixed('reasonable'), feedback: () => 'Safe, but you had time to turn and play forward yourself.', intention: (f) => onBall('recycle', openUnderneath(f)!.id) }),
      opt({ id: 'shield', text: () => 'Keep shielding with your back to goal', grade: fixed('risky'), feedback: () => 'No one was pressing, so shielding wastes the time you had.', intention: () => onBall('protect') }),
    ],
  },
  {
    id: 'atk.shoot-when-clear',
    version: 1,
    topic: 'shoot',
    phase: 'attack',
    ball: 'on',
    objective: 'Shoot when you are in range with a clear look at goal.',
    requires: ['carrier', 'shot'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && !!f.shot && f.shot.inRange && f.shot.clear,
    question: (f) => `You are ${yd(f.shot!.distance)} from goal with a clear look. What do you do?`,
    highlights: (f) => [focus(carrierId(f)), { kind: 'goal' }],
    options: [
      opt({ id: 'shoot', text: () => 'Shoot, aiming away from the keeper', grade: fixed('strong'), feedback: (f) => `The path to goal was clear by ${yd(f.shot!.laneClearance)}. A good chance to shoot; the keeper may still save it.`, intention: () => onBall('shoot') }),
      opt({ id: 'pass', available: (f) => !!betterChance(f), text: (f, n) => `Pass to ${n(betterChance(f)!.id)}, who is closer`, grade: fixed('reasonable'), feedback: (f, n) => `${n(betterChance(f)!.id)} was open nearer goal, so the pass is also good.`, intention: (f) => onBall('pass', betterChance(f)!.id) }),
      opt({ id: 'closer', text: () => 'Take more touches to get closer', grade: (f) => (f.carrier!.pressureDistance >= 6 ? 'reasonable' : 'risky'), feedback: (f) => (f.carrier!.pressureDistance >= 6 ? 'You had a little time, but the chance was already good.' : 'A defender was close; waiting usually lets them block the shot.'), intention: () => onBall('carry') }),
    ],
  },
  {
    id: 'atk.create-better-chance',
    version: 1,
    topic: 'chance',
    phase: 'attack',
    ball: 'on',
    objective: 'When your angle is poor, find a teammate with a better chance.',
    requires: ['carrier', 'shot', 'passingLanes'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.zone === 'attacking' && !!f.shot && f.shot.inRange && !f.shot.clear && !!betterChance(f),
    question: (f, n) => `Your shooting angle is only ${Math.round(f.shot!.angleDeg)}°, or blocked. ${n(betterChance(f)!.id)} is open closer to the middle. What's best?`,
    highlights: (f) => [focus(carrierId(f)), mateHi(betterChance(f)!.id), lane(f, betterChance(f)!), { kind: 'goal' }],
    options: [
      opt({ id: 'pass', text: (f, n) => `Pass to ${n(betterChance(f)!.id)}`, grade: fixed('strong'), feedback: (f, n) => `${n(betterChance(f)!.id)} had a better view of goal. Making a better chance is smart.`, intention: (f) => onBall('pass', betterChance(f)!.id) }),
      opt({ id: 'carry', text: () => 'Dribble to improve your angle', grade: (f) => (f.carrier!.spaceAhead >= 5 ? 'reasonable' : 'risky'), feedback: (f) => (f.carrier!.spaceAhead >= 5 ? 'There was a little room to improve the angle.' : 'There was almost no room to dribble into.'), intention: () => onBall('carry') }),
      opt({ id: 'shoot', text: () => 'Shoot anyway', grade: fixed('risky'), feedback: (f) => (f.shot!.laneClearance < C.laneOpen ? 'A defender was in the shooting lane.' : `From ${Math.round(f.shot!.angleDeg)}° the keeper covers most of the goal.`), intention: () => onBall('shoot') }),
    ],
  },
  {
    id: 'atk.recycle-when-blocked',
    version: 1,
    topic: 'risk',
    phase: 'attack',
    ball: 'on',
    objective: 'When every forward pass is blocked, keep the ball by going back or sideways.',
    requires: ['carrier', 'passingLanes', 'pressure'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && !openForward(f) && !!openUnderneath(f) && f.carrier!.pressureDistance > 3.5 && f.carrier!.pressureDistance <= C.pressureLoose && f.carrier!.spaceAhead < C.spaceAhead,
    question: (f, n) => `Every forward pass is blocked. ${n(openUnderneath(f)!.id)} is open behind you. What's best?`,
    highlights: (f) => [focus(carrierId(f)), mateHi(openUnderneath(f)!.id), lane(f, openUnderneath(f)!)],
    options: [
      opt({ id: 'recycle', text: (f, n) => `Play back to ${n(openUnderneath(f)!.id)}`, grade: fixed('strong'), feedback: () => 'Going back keeps the ball and lets the team find a new way forward.', intention: (f) => onBall('recycle', openUnderneath(f)!.id) }),
      opt({ id: 'sideways', text: () => 'Carry it sideways to find a new angle', grade: fixed('reasonable'), feedback: () => 'Moving the ball sideways can open a new lane.', intention: () => onBall('carry') }),
      opt({ id: 'force', text: () => 'Force a pass forward anyway', grade: fixed('risky'), feedback: () => 'The forward lanes were blocked, so a forced pass is often intercepted.', intention: () => onBall('pass') }),
    ],
  },
  {
    id: 'atk.protect-a-lead',
    version: 1,
    topic: 'risk',
    phase: 'attack',
    ball: 'on',
    objective: 'When winning, avoid risky dribbles near your own goal.',
    requires: ['carrier', 'score', 'pressure'],
    cooldownSeconds: 90,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.scoreDiff > 0 && f.zone === 'defensive' && f.carrier!.pressureDistance <= C.pressureLoose,
    question: (f) => `You lead ${f.scoreFor}–${f.scoreAgainst} and have the ball near your own goal. What's smart?`,
    highlights: (f) => [focus(carrierId(f)), ...(f.bestOpenMate ? [mateHi(f.bestOpenMate.id), lane(f, f.bestOpenMate)] : [])],
    options: [
      opt({ id: 'safe-pass', available: (f) => !!f.bestOpenMate, text: (f, n) => `Safe pass to ${n(f.bestOpenMate!.id)}`, grade: fixed('strong'), feedback: () => 'A safe pass moves the ball away from your goal and keeps it.', intention: (f) => onBall('pass', f.bestOpenMate!.id) }),
      opt({ id: 'clear', text: () => 'Kick it long up the pitch', grade: fixed('reasonable'), feedback: () => 'Clearing removes the danger, but you may give the ball back.', intention: () => onBall('pass') }),
      opt({ id: 'dribble', text: () => 'Dribble past them near your goal', grade: fixed('risky'), feedback: () => 'Losing the ball here could give away a goal while you are ahead.', intention: () => onBall('carry') }),
    ],
  },
  {
    id: 'atk.chasing-the-game',
    version: 1,
    topic: 'risk',
    phase: 'attack',
    ball: 'on',
    objective: 'When behind, look to go forward with purpose.',
    requires: ['carrier', 'score', 'space'],
    cooldownSeconds: 90,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.scoreDiff < 0 && f.zone !== 'defensive' && f.carrier!.spaceAhead >= 6,
    question: (f) => `You are behind ${f.scoreFor}–${f.scoreAgainst}${f.timeLeft !== null ? ` with about ${Math.max(1, Math.round(f.timeLeft / 60))} min left` : ''}. You have ${yd(f.carrier!.spaceAhead)} ahead. What's best?`,
    highlights: (f) => [focus(carrierId(f)), ...(openForward(f) ? [mateHi(openForward(f)!.id), lane(f, openForward(f)!)] : [])],
    options: [
      opt({ id: 'attack', text: () => 'Carry forward and attack', grade: fixed('strong'), feedback: () => 'You need a goal, and there was space ahead to attack.', intention: () => onBall('carry') }),
      opt({ id: 'forward-pass', available: (f) => !!openForward(f), text: (f, n) => `Pass forward to ${n(openForward(f)!.id)}`, grade: fixed('strong'), feedback: (f, n) => `${n(openForward(f)!.id)} was open ahead, which also moves the attack on.`, intention: (f) => onBall('pass', openForward(f)!.id) }),
      opt({ id: 'slow', text: () => 'Slow down and keep the ball', grade: fixed('reasonable'), feedback: () => 'Keeping the ball is fine, but when behind you need to go forward.', intention: () => onBall('protect') }),
    ],
  },
  {
    id: 'sup.offer-underneath',
    version: 1,
    topic: 'support',
    phase: 'attack',
    ball: 'off',
    objective: 'When the carrier is pressed, a teammate should offer a safe pass behind.',
    requires: ['carrier', 'pressure', 'support'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.carrier!.pressureDistance <= 5 && f.support.underneath === 0 && !!helper(f, (m) => m.relation !== 'underneath'),
    question: (f, n) => `You are pressed and nobody is open behind you. Where should ${n(helper(f, (m) => m.relation !== 'underneath')!.id)} go?`,
    highlights: (f) => [focus(carrierId(f)), mateHi(helper(f, (m) => m.relation !== 'underneath')!.id), { kind: 'space', at: W(f, clampT(f, { x: f.carrier!.pos.x - 7, y: f.carrier!.pos.y })), radius: 3 }],
    options: [
      opt({ id: 'underneath', text: () => 'Drop behind you to offer a safe pass', grade: fixed('strong'), feedback: () => 'A teammate behind gives you a safe way out of pressure.', intention: (f) => ({ kind: 'offBall', intent: 'support', playerId: helper(f, (m) => m.relation !== 'underneath')!.id, target: W(f, clampT(f, { x: f.carrier!.pos.x - 7, y: (f.carrier!.pos.y + helper(f, (m) => m.relation !== 'underneath')!.pos.y) / 2 })) }) }),
      opt({ id: 'beyond', text: () => 'Run in behind the defenders', grade: (f) => (f.spaceBehindDefence >= 10 ? 'reasonable' : 'risky'), feedback: (f) => (f.spaceBehindDefence >= 10 ? `There was ${yd(f.spaceBehindDefence)} behind the defence, so the run can work, but you needed a safe pass first.` : 'There was little space behind the defenders for a run.'), intention: (f) => ({ kind: 'offBall', intent: 'run', playerId: helper(f, (m) => m.relation !== 'underneath')!.id, target: W(f, clampT(f, { x: f.pitch.length - 3 - f.spaceBehindDefence + 5, y: helper(f, (m) => m.relation !== 'underneath')!.pos.y })) }) }),
      opt({ id: 'stay', text: () => 'Stay where they are', grade: fixed('risky'), feedback: () => 'Standing still leaves you with no safe pass.', intention: () => none('no change') }),
    ],
  },
  {
    id: 'sup.run-beyond',
    version: 1,
    topic: 'space',
    phase: 'attack',
    ball: 'off',
    objective: 'When the carrier has time, a forward should run into the space behind.',
    requires: ['carrier', 'pressure', 'support', 'space'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.carrier!.pressureDistance >= 5 && f.support.beyond === 0 && f.spaceBehindDefence >= 10 && !!helper(f, (m) => m.line === 'attack'),
    question: (f, n) => `You have time and there is ${yd(f.spaceBehindDefence)} behind their defence. What should ${n(helper(f, (m) => m.line === 'attack')!.id)} do?`,
    highlights: (f) => [focus(carrierId(f)), mateHi(helper(f, (m) => m.line === 'attack')!.id), { kind: 'space', at: W(f, clampT(f, { x: f.pitch.length - 3 - f.spaceBehindDefence / 2, y: helper(f, (m) => m.line === 'attack')!.pos.y })), radius: 4 }],
    options: [
      opt({ id: 'run', text: () => 'Run into the space behind the defence', grade: fixed('strong'), feedback: () => 'A run into space gives you a forward pass and pushes their defence back.', intention: (f) => ({ kind: 'offBall', intent: 'run', playerId: helper(f, (m) => m.line === 'attack')!.id, target: W(f, clampT(f, { x: Math.min(f.pitch.length - 8, f.pitch.length - 3 - f.spaceBehindDefence + 6), y: helper(f, (m) => m.line === 'attack')!.pos.y })) }) }),
      opt({ id: 'short', text: () => 'Come short toward the ball', grade: fixed('reasonable'), feedback: () => 'Coming short gives a safe pass, but you were not under pressure.', intention: (f) => ({ kind: 'offBall', intent: 'support', playerId: helper(f, (m) => m.line === 'attack')!.id, target: W(f, clampT(f, { x: f.carrier!.pos.x + 6, y: helper(f, (m) => m.line === 'attack')!.pos.y })) }) }),
      opt({ id: 'stay', text: () => 'Stand still and wait', grade: fixed('risky'), feedback: () => 'A still forward is easy to mark.', intention: () => none('no change') }),
    ],
  },
  {
    id: 'sup.give-width',
    version: 1,
    topic: 'support',
    phase: 'attack',
    ball: 'off',
    objective: 'Wide players stretch the defence by staying near the touchline.',
    requires: ['carrier', 'support', 'formation'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => settled(f) && f.ballSide === 'centre' && f.support.wide === 0 && !!f.mates.find((m) => m.line !== 'defence' && Math.abs(m.pos.y - f.pitch.width / 2) >= 6),
    question: (f, n) => `You are in the middle and nobody is wide. What should ${n(f.mates.find((m) => m.line !== 'defence' && Math.abs(m.pos.y - f.pitch.width / 2) >= 6)!.id)} do?`,
    highlights: (f) => [focus(carrierId(f)), mateHi(f.mates.find((m) => m.line !== 'defence' && Math.abs(m.pos.y - f.pitch.width / 2) >= 6)!.id)],
    options: [
      opt({ id: 'wide', text: () => 'Move wide toward the touchline', grade: fixed('strong'), feedback: () => 'Width spreads the defenders out and opens gaps in the middle.', intention: (f) => { const m = f.mates.find((x) => x.line !== 'defence' && Math.abs(x.pos.y - f.pitch.width / 2) >= 6)!; return { kind: 'offBall', intent: 'width', playerId: m.id, target: W(f, { x: m.pos.x + 2, y: m.pos.y < f.pitch.width / 2 ? 3.5 : f.pitch.width - 3.5 }) }; } }),
      opt({ id: 'inside', text: () => 'Come inside close to you', grade: (f) => (f.carrier!.pressureDistance <= C.pressureTight ? 'reasonable' : 'risky'), feedback: (f) => (f.carrier!.pressureDistance <= C.pressureTight ? 'Close help is useful under pressure, but it also brings defenders in.' : 'Coming inside crowds the middle and brings more defenders.'), intention: (f) => { const m = f.mates.find((x) => x.line !== 'defence' && Math.abs(x.pos.y - f.pitch.width / 2) >= 6)!; return { kind: 'offBall', intent: 'support', playerId: m.id, target: W(f, clampT(f, { x: f.carrier!.pos.x, y: (f.carrier!.pos.y + m.pos.y) / 2 })) }; } }),
      opt({ id: 'stay', text: () => 'Stay where they are', grade: fixed('reasonable'), feedback: () => 'Holding position is fine, but more width would help.', intention: () => none('no change') }),
    ],
  },
  {
    id: 'def.press-carrier',
    version: 1,
    topic: 'press',
    phase: 'defend',
    ball: 'off',
    objective: 'The nearest player presses quickly when a teammate is covering.',
    requires: ['defend', 'pressure', 'cover'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => !!f.defend && f.defend.nearestArrival <= 1.6 && !!f.defend.coverId && f.defend.coverId !== f.defend.nearestId && f.ballT.x > 25,
    question: (f, n) => `They have the ball. ${n(f.defend!.nearestId)} can reach it in about ${f.defend!.nearestArrival.toFixed(1)} s and ${n(f.defend!.coverId!)} is covering. What should ${n(f.defend!.nearestId)} do?`,
    highlights: (f) => [oppHi(f.defend!.carrierId!), focus(f.defend!.nearestId), mateHi(f.defend!.coverId!)],
    options: [
      opt({ id: 'press', text: () => 'Press the ball now', grade: fixed('strong'), feedback: () => 'Close and with cover behind, pressing quickly gives them less time.', intention: (f) => ({ kind: 'offBall', intent: 'press', playerId: f.defend!.nearestId, target: f.ballWorld }) }),
      opt({ id: 'drop', text: () => 'Drop back and wait', grade: fixed('reasonable'), feedback: () => 'Dropping keeps shape, but gives them time to pick a pass.', intention: (f) => ({ kind: 'offBall', intent: 'protect', playerId: f.defend!.nearestId, target: W(f, clampT(f, { x: f.ballT.x - 8, y: (f.ballT.y + f.pitch.width / 2) / 2 })) }) }),
      opt({ id: 'all', text: () => 'Everyone rush the ball', grade: fixed('risky'), feedback: () => 'If everyone runs at the ball, one pass beats the whole team.', intention: () => none('team shape unchanged') }),
    ],
  },
  {
    id: 'def.recover-goal-side',
    version: 1,
    topic: 'recover',
    phase: 'defend',
    ball: 'off',
    objective: 'After losing the ball, get back between the ball and your goal.',
    requires: ['defend'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => !!f.defend && f.defend.caughtUpfield.length >= 2 && f.ballT.x < 45,
    question: (f, n) => `${f.defend!.caughtUpfield.length} of your players are caught upfield of the ball. What should ${n(f.defend!.caughtUpfield[0]!)} do?`,
    highlights: (f) => [oppHi(f.defend!.carrierId!), ...f.defend!.caughtUpfield.slice(0, 3).map((id, i) => (i === 0 ? focus(id) : mateHi(id)))],
    options: [
      opt({ id: 'sprint', text: () => 'Sprint back goal-side', grade: fixed('strong'), feedback: () => 'Getting between the ball and your goal stops the counter-attack.', intention: (f) => ({ kind: 'offBall', intent: 'protect', playerId: f.defend!.caughtUpfield[0]!, target: W(f, clampT(f, { x: f.ballT.x - 5, y: f.pitch.width / 2 + (f.ballT.y - f.pitch.width / 2) * 0.5 })) }) }),
      opt({ id: 'jog', text: () => 'Jog back to their position', grade: fixed('reasonable'), feedback: () => 'Returning is right, but quicker gets there before the danger.', intention: () => none('normal recovery') }),
      opt({ id: 'wait', text: () => 'Wait upfield for a counter', grade: fixed('risky'), feedback: () => 'Waiting upfield leaves your defence outnumbered.', intention: () => none('no change') }),
    ],
  },
  {
    id: 'def.cover-presser',
    version: 1,
    topic: 'cover',
    phase: 'defend',
    ball: 'off',
    objective: 'A second defender covers behind the player pressing.',
    requires: ['defend', 'cover'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => !!f.defend && !!f.defend.presserId && !!f.defend.coverId && f.defend.presserDistance <= 4 && f.defend.coverGap >= 5,
    question: (f, n) => `${n(f.defend!.presserId!)} is pressing the ball. ${n(f.defend!.coverId!)} is ${yd(f.defend!.coverGap)} from the cover spot. What should they do?`,
    highlights: (f) => [oppHi(f.defend!.carrierId!), mateHi(f.defend!.presserId!), focus(f.defend!.coverId!), { kind: 'space', at: f.defend!.coverSpotWorld, radius: 3 }],
    options: [
      opt({ id: 'cover', text: (f, n) => `Cover behind ${n(f.defend!.presserId!)}`, grade: fixed('strong'), feedback: () => 'If the attacker beats the presser, the cover player is there.', intention: (f) => ({ kind: 'offBall', intent: 'cover', playerId: f.defend!.coverId!, target: f.defend!.coverSpotWorld }) }),
      opt({ id: 'mark', available: (f) => !!f.defend!.unmarkedRunner, text: (f, n) => `Mark ${n(f.defend!.unmarkedRunner!.id)}`, grade: fixed('reasonable'), feedback: () => 'Marking an open attacker helps, but the presser has no cover.', intention: (f) => ({ kind: 'offBall', intent: 'cover', playerId: f.defend!.coverId!, target: f.defend!.unmarkedRunner!.world }) }),
      opt({ id: 'double', text: () => 'Also press the ball', grade: fixed('risky'), feedback: () => 'Two players on the ball leave space behind them.', intention: (f) => ({ kind: 'offBall', intent: 'press', playerId: f.defend!.coverId!, target: f.ballWorld }) }),
    ],
  },
  {
    id: 'def.protect-centre',
    version: 1,
    topic: 'balance',
    phase: 'defend',
    ball: 'off',
    objective: 'Protect the space in front of your goal when the ball is near it.',
    requires: ['defend', 'cover'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => !!f.defend && f.zone === 'defensive' && f.defend.protectorsCentral <= 1 && f.defend.ownNear >= 2,
    question: (f) => `The ball is near your goal and only ${f.defend!.protectorsCentral} of your players guards the middle. What should your nearest midfielder do?`,
    highlights: (f) => [oppHi(f.defend!.carrierId!), focus(f.defend!.nearestId), { kind: 'space', at: W(f, { x: Math.max(4, f.ballT.x * 0.5), y: f.pitch.width / 2 }), radius: 4 }],
    options: [
      opt({ id: 'protect', text: () => 'Protect the middle in front of goal', grade: fixed('strong'), feedback: () => 'The middle is where most goals come from; guarding it forces them wide.', intention: (f) => ({ kind: 'offBall', intent: 'protect', playerId: f.defend!.presserId === f.defend!.nearestId && f.defend!.coverId ? f.defend!.coverId : f.defend!.nearestId, target: W(f, { x: Math.max(4, f.ballT.x * 0.5), y: f.pitch.width / 2 }) }) }),
      opt({ id: 'mark', available: (f) => !!f.defend!.unmarkedRunner, text: (f, n) => `Mark ${n(f.defend!.unmarkedRunner!.id)}`, grade: fixed('reasonable'), feedback: () => 'Marking an open attacker is useful, but the middle stays open.', intention: (f) => ({ kind: 'offBall', intent: 'cover', playerId: f.defend!.unmarkedRunner!.nearestOwnId, target: f.defend!.unmarkedRunner!.world }) }),
      opt({ id: 'chase', text: () => 'Chase the ball too', grade: fixed('risky'), feedback: () => 'Chasing the ball pulls you out of the middle.', intention: (f) => ({ kind: 'offBall', intent: 'press', playerId: f.defend!.nearestId, target: f.ballWorld }) }),
    ],
  },
  {
    id: 'def.balance-weak-side',
    version: 1,
    topic: 'balance',
    phase: 'defend',
    ball: 'off',
    objective: 'Far-side defenders tuck in toward the middle.',
    requires: ['defend', 'formation'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => !!f.defend && !!f.defend.weakSideWide,
    question: (f, n) => `The ball is on one wing. ${n(f.defend!.weakSideWide!.id)} is ${yd(f.defend!.weakSideWide!.offset)} wide on the far side. What should they do?`,
    highlights: (f) => [oppHi(f.defend!.carrierId!), focus(f.defend!.weakSideWide!.id)],
    options: [
      opt({ id: 'tuck', text: () => 'Tuck in toward the middle', grade: fixed('strong'), feedback: () => 'Tucking in closes the gaps the attackers want to use.', intention: (f) => ({ kind: 'offBall', intent: 'protect', playerId: f.defend!.weakSideWide!.id, target: W(f, clampT(f, { x: Math.max(6, f.ballT.x - 6), y: f.pitch.width / 2 + Math.sign(f.pitch.width / 2 - f.ballT.y) * 6 })) }) }),
      opt({ id: 'stay', text: () => 'Stay wide on the far side', grade: (f) => (f.ballT.x < 40 ? 'risky' : 'reasonable'), feedback: (f) => (f.ballT.x < 40 ? 'Near your goal, staying wide leaves the middle open.' : 'Far from your goal, staying wide is not so dangerous.'), intention: () => none('no change') }),
      opt({ id: 'press', text: () => 'Run across to press the ball', grade: fixed('risky'), feedback: () => 'Running across leaves the whole far side open.', intention: (f) => ({ kind: 'offBall', intent: 'press', playerId: f.defend!.weakSideWide!.id, target: f.ballWorld }) }),
    ],
  },
  {
    id: 'def.track-runner',
    version: 1,
    topic: 'cover',
    phase: 'defend',
    ball: 'off',
    objective: 'Track an attacker who is running free toward your goal.',
    requires: ['defend'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => !!f.defend && !!f.defend.unmarkedRunner,
    question: (f, n) => `${n(f.defend!.unmarkedRunner!.id)} is free in your half, ${yd(f.defend!.unmarkedRunner!.gap)} from ${n(f.defend!.unmarkedRunner!.nearestOwnId)}. What should ${n(f.defend!.unmarkedRunner!.nearestOwnId)} do?`,
    highlights: (f) => [oppHi(f.defend!.unmarkedRunner!.id), focus(f.defend!.unmarkedRunner!.nearestOwnId), oppHi(f.defend!.carrierId!)],
    options: [
      opt({ id: 'track', text: () => 'Track the free attacker, staying goal-side', grade: fixed('strong'), feedback: () => 'Staying goal-side of a free attacker stops an easy pass.', intention: (f) => ({ kind: 'offBall', intent: 'cover', playerId: f.defend!.unmarkedRunner!.nearestOwnId, target: W(f, clampT(f, { x: (f.team === 'home' ? f.defend!.unmarkedRunner!.world.x : f.pitch.length - f.defend!.unmarkedRunner!.world.x) - 1.5, y: f.team === 'home' ? f.defend!.unmarkedRunner!.world.y : f.pitch.width - f.defend!.unmarkedRunner!.world.y })) }) }),
      opt({ id: 'hold', text: () => 'Stay in position', grade: (f) => (f.defend!.unmarkedRunner!.gap < 8 ? 'reasonable' : 'risky'), feedback: (f) => (f.defend!.unmarkedRunner!.gap < 8 ? 'Close enough to step across later, but tracking is safer.' : 'The attacker was far from anyone; staying put leaves them free.'), intention: () => none('no change') }),
      opt({ id: 'press', text: () => 'Go press the ball instead', grade: fixed('risky'), feedback: () => 'Leaving a free attacker to chase the ball invites a pass to them.', intention: (f) => ({ kind: 'offBall', intent: 'press', playerId: f.defend!.unmarkedRunner!.nearestOwnId, target: f.ballWorld }) }),
    ],
  },
  {
    id: 'def.delay-when-outnumbered',
    version: 1,
    topic: 'press',
    phase: 'defend',
    ball: 'off',
    objective: 'When outnumbered, slow the attack down and wait for help.',
    requires: ['defend', 'pressure'],
    cooldownSeconds: 60,
    maxPerSession: 1,
    eligible: (f) => !!f.defend && f.zone !== 'attacking' && f.defend.ownNear < f.defend.oppNear && f.defend.nearestDistance <= 6,
    question: (f, n) => `${f.defend!.oppNear} attackers against ${f.defend!.ownNear} of your players near the ball. What should ${n(f.defend!.nearestId)} do?`,
    highlights: (f) => [oppHi(f.defend!.carrierId!), focus(f.defend!.nearestId)],
    options: [
      opt({ id: 'delay', text: () => 'Stay goal-side and slow them down', grade: fixed('strong'), feedback: () => 'Delaying buys time for teammates to get back.', intention: (f) => ({ kind: 'offBall', intent: 'press', playerId: f.defend!.nearestId, target: W(f, clampT(f, { x: f.ballT.x - 3, y: f.ballT.y + (f.pitch.width / 2 - f.ballT.y) * 0.2 })) }) }),
      opt({ id: 'drop', text: () => 'Drop off toward your goal', grade: fixed('reasonable'), feedback: () => 'Dropping protects the goal, but gives them room to run.', intention: (f) => ({ kind: 'offBall', intent: 'protect', playerId: f.defend!.nearestId, target: W(f, clampT(f, { x: f.ballT.x - 10, y: f.pitch.width / 2 })) }) }),
      opt({ id: 'dive', text: () => 'Dive in for the tackle', grade: fixed('risky'), feedback: () => 'If the tackle misses, they are through with more players.', intention: (f) => ({ kind: 'offBall', intent: 'press', playerId: f.defend!.nearestId, target: f.ballWorld }) }),
    ],
  },
  {
    id: 'stop.restart-ours',
    version: 1,
    topic: 'space',
    phase: 'attack',
    ball: 'off',
    objective: 'At our restart, make the pitch big by spreading out.',
    requires: ['stoppage'],
    stoppageOnly: true,
    cooldownSeconds: 90,
    maxPerSession: 1,
    eligible: (f) => !!f.stopped && f.stopped.reason === 'out' && f.stopped.restartOurs,
    question: () => 'The ball went out and it is our restart. How should the team set up?',
    highlights: () => [],
    options: [
      opt({ id: 'spread', text: () => 'Spread out wide and deep', grade: fixed('strong'), feedback: () => 'Spreading out gives the taker more passing choices.', intention: () => none('team shape: normal support') }),
      opt({ id: 'near', text: () => 'One player close, the rest spread', grade: fixed('strong'), feedback: () => 'A short option plus width is also a great set-up.', intention: () => none('team shape: normal support') }),
      opt({ id: 'crowd', text: () => 'Everyone crowd near the ball', grade: fixed('risky'), feedback: () => 'Crowding brings defenders close and blocks your own passes.', intention: () => none('no change') }),
    ],
  },
  {
    id: 'stop.restart-theirs',
    version: 1,
    topic: 'recover',
    phase: 'defend',
    ball: 'off',
    objective: 'At their restart, get compact and goal-side.',
    requires: ['stoppage'],
    stoppageOnly: true,
    cooldownSeconds: 90,
    maxPerSession: 1,
    eligible: (f) => !!f.stopped && f.stopped.reason === 'out' && !f.stopped.restartOurs,
    question: () => 'The ball went out and it is their restart. What should the team do?',
    highlights: () => [],
    options: [
      opt({ id: 'compact', text: () => 'Get goal-side and close together', grade: fixed('strong'), feedback: () => 'A compact team is hard to pass through.', intention: () => none('team shape: normal defence') }),
      opt({ id: 'press-high', text: () => 'Mark the nearest players to the ball', grade: fixed('reasonable'), feedback: () => 'Marking close options can win the ball back, if the rest stay compact.', intention: () => none('team shape: normal defence') }),
      opt({ id: 'rest', text: () => 'Stay where we are', grade: fixed('risky'), feedback: () => 'Standing still lets them pick any pass.', intention: () => none('no change') }),
    ],
  },
];

export type _NameFn = NameFn;
