/** Goalkeeper situations GK01-GK04 (logic catalog v0.5). Our goal is at the top; we attack down the screen. */
import type { Fixture } from '../types';
import { CX, grade, opt, p, them, us } from './common';

const GK01: Fixture = {
  id: 'GK01', seed: 'GK01', version: 1, goal: 'ours', phase: 'keeper', focal: 'GK', human: 'gk',
  title: 'Short build-out against the first presser',
  objective: 'Find the defender the first presser has left free, without playing into a cover shadow.',
  trigger: 'Your back three have split; their first presser commits to one of them.',
  why: 'You and the back three are the short options; their 9 and two wingers are the press; our 6 and their 8 show the next line. The rest of both teams are in the other half and play no part.',
  offscreen: 'Our 8, wingers and 9 and their back line are beyond halfway.',
  actors: [
    us('gk', 'GK', CX, 32.5, 'Has the ball; picks the short outlet'),
    us('rb', 'RB', 8, 27.5, 'Wide right short outlet'),
    us('cb', 'CB', CX, 26.5, 'Central outlet'),
    us('lb', 'LB', 37.7, 27.5, 'Wide left short outlet'),
    us('six', '6', CX, 19, 'Next line: shows between their press'),
    them('o9', '9', CX, 21, 'First presser', p(CX, 25)),
    them('olw', 'LW', 10, 26.5, 'Marks our RB'),
    them('orw', 'RW', 31, 20, 'Tucked in on our 6'),
    them('o8', '8', 25, 17, 'Second line'),
  ],
  ball: { owner: 'gk' }, passageSeconds: 1.4, playSeconds: 2.8,
  options: [
    opt('lb', 'short', 'Pass short to the LB', p(37.7, 27.5), 'lb'),
    opt('cb', 'short', 'Pass to the CB', p(CX, 26.5), 'cb'),
    opt('rb', 'short', 'Pass short to the RB', p(8, 27.5), 'rb'),
    opt('long', 'clear', 'Kick it long', p(CX, -3), undefined, true),
  ],
  cue: {
    teaches: 'First presser commits: find the freed defender',
    question: 'Their 9 has made a choice. Who is free, and can the ball get there?',
    cues: ['Their 9 ran at our CB: that leaves someone.', 'Their right winger tucked in on our 6, so the LB has room.', 'Their left winger is close to our RB, in the lane.'],
    grades: {
      lb: grade('good', 'kept', ['The 9 committed to the CB, so the LB was free.', 'No one stood in the lane to the LB.'], { responses: { orw: p(35, 23) } }),
      cb: grade('poor', 'lost', ['Their 9 was already on the CB.'], { stoppedBy: 'o9' }),
      rb: grade('poor', 'lost', ['Their left winger stood in the lane to the RB.'], { stoppedBy: 'olw' }),
      long: grade('ok', 'cleared', ['Safe, but it gives the ball away when the LB was free.']),
    },
  },
  counter: {
    teaches: 'Cover shadow still blocks the pass',
    moves: { olw: p(7, 19), o8: p(25, 20), o9: p(28, 25) },
    passage: { o9: p(31.2, 29.6), o8: p(CX, 24.6) },
    question: 'Their 9 has curved his run. Who is free, and can the ball get there?',
    cues: ['Their 9 curved to stand in the line to the LB: a cover shadow.', 'Their 8 stepped onto our CB.', 'Their left winger dropped off our RB.'],
    grades: {
      lb: grade('poor', 'lost', ['The 9 curved his run to block the lane to the LB.'], { stoppedBy: 'o9' }),
      cb: grade('poor', 'lost', ['Their 8 stepped onto the CB.'], { stoppedBy: 'o8' }),
      rb: grade('good', 'kept', ['Their left winger dropped off, so the RB was free with an open lane.'], { responses: { olw: p(8.5, 23) } }),
      long: grade('ok', 'cleared', ['Safe, but the RB was free to start the attack.']),
    },
  },
};

const GK02: Fixture = {
  id: 'GK02', seed: 'GK02', version: 1, goal: 'ours', phase: 'keeper', focal: 'GK', human: 'gk',
  title: 'They mark every short option',
  objective: 'When the short options are taken, judge whether a lofted outlet has a receiver and second-ball support.',
  trigger: 'Their front three each pick up a defender; you have the ball in your hands area.',
  why: 'Our back three are marked by their front three; our 8, LW and 9 are the longer outlets with their RB, CB and 6 near them. Players beyond halfway are not involved.',
  offscreen: 'Our RW and their LB are beyond halfway on the far side.',
  actors: [
    us('gk', 'GK', CX, 32.5, 'Has the ball'),
    us('rb', 'RB', 8, 27, 'Short option, marked'),
    us('cb', 'CB', CX, 27, 'Short option, marked'),
    us('lb', 'LB', 37.5, 27, 'Short option, marked'),
    us('lw', 'LW', 39, 8, 'Long outlet on the left'),
    us('eight', '8', 30, 10, 'Second-ball support'),
    us('nine', '9', 22, 5, 'Central long outlet'),
    them('o9', '9', CX, 29, 'Marks our CB in front'),
    them('olw', 'LW', 9.5, 28.5, 'Marks our RB'),
    them('orw', 'RW', 36, 28.5, 'Marks our LB'),
    them('orb', 'RB', 35.5, 10.5, 'Marks our LW'),
    them('ocb', 'CB', 22, 6.8, 'In front of our 9'),
    them('o6', '6', 27, 14, 'Screens the middle'),
  ],
  ball: { owner: 'gk' }, passageSeconds: 1.2, playSeconds: 4.4,
  options: [
    opt('lw', 'pass', 'Loft it to the LW', p(39, 8), 'lw', true),
    opt('nine', 'pass', 'Loft it to the 9', p(22, 5), 'nine', true),
    opt('cb', 'short', 'Pass short to the CB', p(CX, 27), 'cb'),
    opt('lb', 'short', 'Pass short to the LB', p(37.5, 27), 'lb'),
  ],
  cue: {
    teaches: 'Evaluate lofted outlet and second-ball support',
    question: 'Every short pass is marked. Where can the ball go and be kept?',
    cues: ['Each of our back three has a marker in the lane.', 'Our LW has space, and our 8 is close enough to win a second ball.', 'Their CB is in front of our 9.'],
    grades: {
      lw: grade('good', 'progressed', ['The LW had room and the 8 was close for the second ball.'], { responses: { orb: p(37, 9) } }),
      nine: grade('poor', 'lost', ['Their CB stood in front of our 9.'], { stoppedBy: 'ocb' }),
      cb: grade('poor', 'lost', ['Their 9 was in the lane to the CB.'], { stoppedBy: 'o9' }),
      lb: grade('poor', 'lost', ['Their right winger was in the lane to the LB.'], { stoppedBy: 'orw' }),
    },
  },
  counter: {
    teaches: 'Receiver isolated or delivery beyond kicking range',
    moves: { orb: p(38.5, 9.6), eight: p(19, 13), nine: p(17, 9), ocb: p(28, 6) },
    question: 'Every short pass is marked. Where can the ball go and be kept?',
    cues: ['Our LW is alone with their RB tight on him.', 'Our 9 has dropped into space with our 8 close by.', 'Their CB has gone across.'],
    grades: {
      lw: grade('poor', 'lost', ['The LW was isolated: their RB was tight and no one could help.'], { stoppedBy: 'orb' }),
      nine: grade('good', 'progressed', ['Their CB had gone across, so the 9 was free with the 8 in support.'], { responses: { ocb: p(21, 8) } }),
      cb: grade('poor', 'lost', ['Their 9 was in the lane to the CB.'], { stoppedBy: 'o9' }),
      lb: grade('poor', 'lost', ['Their right winger was in the lane to the LB.'], { stoppedBy: 'orw' }),
    },
  },
};

const GK03: Fixture = {
  id: 'GK03', seed: 'GK03', version: 1, goal: 'ours', phase: 'keeper', focal: 'GK', human: 'gk',
  title: 'Ball played in behind our back line',
  objective: 'Compare when you can reach the ball with when their runner can; come only if you arrive first.',
  trigger: 'A through ball goes past our back three toward the box.',
  why: 'Their 8 plays the ball in behind; their 9 chases it; our CB and outside backs are caught upfield. Everyone else is not involved in this race.',
  actors: [
    us('gk', 'GK', CX, 31.5, 'Protects the goal and the space behind'),
    us('cb', 'CB', 20, 19, 'Caught upfield, recovering', p(21, 21)),
    us('lb', 'LB', 34, 20, 'Caught upfield'),
    us('rb', 'RB', 11, 20, 'Caught upfield'),
    them('o8', '8', 24, 5, 'Plays the ball in behind'),
    them('o9', '9', 30, 12, 'Runs onto the through ball', p(28, 17)),
  ],
  ball: { owner: 'o8' }, passageSeconds: 1.6, playSeconds: 4.5,
  options: [
    opt('sweep', 'sweep', 'Come out for the ball', p(24, 27)),
    opt('set', 'set', 'Stay and set on your line', p(21.8, 32.6)),
    opt('post', 'set', 'Cover your near post', p(19.5, 33.4)),
  ],
  cue: {
    teaches: 'Compare interception arrival against attacker',
    passageBall: { at: 0.3, from: 'o8', kind: 'pass', point: p(24, 31) },
    question: 'The ball is in behind. Who gets there first?',
    cues: ['Their 9 is still several steps behind the ball.', 'The ball is slowing as it comes into the box.'],
    grades: {
      sweep: grade('good', 'held', ['You were closer to where the ball was going than their 9.'], { responses: { o9: p(25, 25) } }),
      set: grade('ok', 'conceded', ['Staying let their 9 reach a ball you could have taken, and shoot from close in.'], { responses: { o9: p(24, 29) }, then: [{ at: 0.1, from: 'o9', kind: 'shoot', point: p(20.4, 34.5) }] }),
      post: grade('poor', 'conceded', ['The ball was coming to the middle; the near post left the goal open.'], { responses: { o9: p(24, 32) }, then: [{ at: 0.4, from: 'o9', kind: 'shoot', point: p(25, 35) }] }),
    },
  },
  counter: {
    teaches: 'Drop and set if attacker arrives first',
    moves: { o9: p(24.5, 21.5) },
    ball: { owner: 'o9' },
    passage: { o9: p(24.3, 25.5), cb: p(21.5, 22.5) },
    question: 'Their 9 is through. Do you come or stay?',
    cues: ['Their 9 reached the ball first and has it under control.', 'If you come, he can go round you.'],
    grades: {
      sweep: grade('poor', 'conceded', ['Their 9 was going to reach the ball first; coming out left the goal open.'], { responses: { o9: p(21, 29) }, then: [{ at: 1.3, from: 'o9', kind: 'shoot', point: p(23.5, 35) }] }),
      set: grade('good', 'held', ['He arrived first, so you set yourself to save.'], { then: [{ at: 0.6, from: 'o9', kind: 'shoot', point: p(19.9, 34.5) }] }),
      post: grade('ok', 'held', ['Set, but leaning to the post gives him the far side.'], { then: [{ at: 0.6, from: 'o9', kind: 'shoot', point: p(19.9, 34.5) }] }),
    },
  },
};

const GK04: Fixture = {
  id: 'GK04', seed: 'GK04', version: 1, goal: 'ours', phase: 'keeper', focal: 'GK', human: 'gk',
  title: 'Cross into our box',
  objective: 'Read the flight and the traffic: claim it only if your path to the ball is clear.',
  trigger: 'Their winger crosses from our left side.',
  why: 'Their right winger crosses; their 9 and left winger attack the box; our CB, RB and LB defend it. The other players are outside the box and play no part.',
  actors: [
    us('gk', 'GK', CX, 32.6, 'Protects the goal'),
    us('cb', 'CB', 22.5, 29, 'Marks their 9'),
    us('rb', 'RB', 15, 28, 'Marks the far runner'),
    us('lb', 'LB', 36, 29, 'Closing the crosser'),
    them('orw', 'RW', 39, 30, 'Crosses'),
    them('o9', '9', 23.5, 27.5, 'Attacks the cross'),
    them('olw', 'LW', 14, 26, 'Far-post runner'),
  ],
  ball: { owner: 'orw' }, passageSeconds: 1.1, playSeconds: 2.6,
  options: [
    opt('claim', 'claim', 'Come and catch it', p(25, 31.4)),
    opt('stay', 'set', 'Stay on your line', p(CX, 33.2)),
    opt('near', 'set', 'Go to your near post', p(26, 33.6)),
  ],
  cue: {
    teaches: 'Claim, punch or hold according to trajectory and traffic',
    passageBall: { at: 0.5, from: 'orw', kind: 'pass', point: p(25, 31.4), lofted: true },
    question: 'The cross is in the air. What do you do?',
    cues: ['It is floating toward the six-yard box.', 'No one is between you and where it drops.'],
    grades: {
      claim: grade('good', 'held', ['It was floating into your area with a clear path to it.'], { responses: { o9: p(24.5, 30) } }),
      stay: grade('poor', 'conceded', ['The ball dropped in your area and their 9 got there first.'], { responses: { o9: p(25, 31.2), cb: p(22.5, 30) }, then: [{ at: 1.2, from: 'o9', kind: 'shoot', point: p(25.8, 35) }] }),
      near: grade('poor', 'conceded', ['Going to the near post took you away from where it dropped.'], { responses: { o9: p(25, 31.2) }, then: [{ at: 1.2, from: 'o9', kind: 'shoot', point: p(20.5, 35) }] }),
    },
  },
  counter: {
    teaches: 'Do not advance through bodies or unseen flight',
    passageBall: { at: 0.5, from: 'orw', kind: 'pass', point: p(23.5, 28) },
    question: 'The cross is coming in. What do you do?',
    cues: ['It is driven low and fast.', 'Our CB and their 9 are between you and the ball.'],
    grades: {
      claim: grade('poor', 'conceded', ['You tried to go through the CB and their 9 to a fast ball.'], { responses: { cb: p(20.5, 29.5), o9: p(23.6, 28.2) }, then: [{ at: 0.6, from: 'o9', kind: 'shoot', point: p(20.5, 35) }] }),
      stay: grade('good', 'regained', ['It was low and fast through bodies, so you held your line and let the CB deal with it.'], { responses: { cb: p(23.4, 28.2), o9: p(24.5, 26) } }),
      near: grade('ok', 'regained', ['Still on your line, but the far side was open if it got through.'], { responses: { cb: p(23.4, 28.2), o9: p(24.5, 26) } }),
    },
  },
};

export const GK_FIXTURES: readonly Fixture[] = [GK01, GK02, GK03, GK04];
