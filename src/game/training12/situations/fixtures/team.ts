/** Team situations AT01, DT01, DT02, DEF02-04, SP02, SP03, GM01 (logic catalog v0.5). */
import type { Fixture } from '../types';
import { CX, L, W, grade, opt, p, them, us } from './common';

const SHOT_Y = L + 1.2;

const AT01: Fixture = {
  id: 'AT01', seed: 'AT01', version: 1, goal: 'theirs', phase: 'transition', focal: '8', human: 'eight',
  title: 'You win it: break or recycle?',
  objective: 'Use the advantage while their players are out of position; recycle when they have recovered.',
  trigger: 'You have just won the ball in midfield.',
  why: 'You won it; our 9 and LW are the break; their two CBs and keeper are what is left; their 6 and 8 decide whether they have recovered. Our 6 is the recycle.',
  actors: [
    us('eight', '8', 20, 12, 'Has just won the ball'),
    us('six', '6', 22, 4, 'Recycle option'),
    us('nine', '9', 25, 24, 'Central forward'),
    us('lw', 'LW', 8, 22, 'Wide forward'),
    them('o6', '6', 30, 4, 'Caught upfield'),
    them('o8', '8', 26, 6, 'Chasing back'),
    them('ocb1', 'CB', 19, 26.5, 'Left CB'),
    them('ocb2', 'CB', 28, 27, 'Right CB'),
    them('gk', 'GK', CX, 33.4, 'Their keeper'),
  ],
  ball: { owner: 'eight' }, passageSeconds: 0.8, playSeconds: 3,
  options: [
    opt('carry', 'carry', 'Carry it forward fast', p(20, 22)),
    opt('through', 'pass', 'Pass forward to the 9', p(25, 24), 'nine'),
    opt('recycle', 'pass', 'Play it back to the 6', p(22, 4), 'six'),
  ],
  cue: {
    teaches: 'Exploit temporary numerical/positional advantage',
    question: 'You have won it. What now?',
    cues: ['Their 6 and 8 are behind you.', 'Only their two CBs are in front.'],
    grades: {
      carry: grade('good', 'progressed', ['Their midfield was beaten: carrying at their two CBs used the advantage.']),
      through: grade('good', 'progressed', ['Their midfield was beaten: the early pass to the 9 used the advantage.']),
      recycle: grade('poor', 'kept', ['Going back gave them time to recover.']),
    },
  },
  counter: {
    teaches: 'Recycle when defenders recover or first touch fails',
    moves: { o6: p(20, 15.5), o8: p(23, 10.5) },
    question: 'You have won it, but their 6 is in front of you. What now?',
    cues: ['Their 6 has recovered in front of you.', 'Their 8 is closing from the side.'],
    grades: {
      carry: grade('poor', 'lost', ['They had recovered: carrying ran into their 6.'], { tackle: ['o6'], responses: { o6: p(20, 16.5) } }),
      through: grade('poor', 'lost', ['Their 6 was in the line to the 9.'], { stoppedBy: 'o6' }),
      recycle: grade('good', 'kept', ['They had recovered, so keeping it with the 6 was right.']),
    },
  },
};

const DT01: Fixture = {
  id: 'DT01', seed: 'DT01', version: 1, goal: 'theirs', phase: 'transition', focal: '8', human: 'eight',
  title: 'We have just lost it',
  objective: 'Counterpress straight away when the ball and our support are close; delay and recover if he escapes facing forward.',
  trigger: 'Their 6 has just won the ball from our 9.',
  why: 'Their 6 won it; you are the nearest player; our 9 and LW are the support for a counterpress; their 8 is his escape pass.',
  actors: [
    us('eight', '8', 24, 20, 'Nearest player'),
    us('nine', '9', 22, 25, 'Just lost it'),
    us('lw', 'LW', 15, 23, 'Close support'),
    them('o6', '6', 24, 23, 'Has just won it, facing his goal'),
    them('o8', '8', 30, 17, 'Escape pass'),
  ],
  ball: { owner: 'o6' }, passageSeconds: 0.6, playSeconds: 3,
  options: [
    opt('press', 'press', 'Press him straight away', p(24, 23), 'o6'),
    opt('delay', 'delay', 'Get goal-side and slow him', p(24, 18)),
    opt('drop', 'recover', 'Run back to your position', p(24, 9)),
  ],
  cue: {
    teaches: 'Counterpress when ball and support are accessible',
    question: 'We have just lost it. What do you do?',
    cues: ['He is facing his own goal.', 'Our 9 and LW are right there with you.'],
    grades: {
      press: grade('good', 'regained', ['He was facing his own goal with our players around: pressing won it back.'], { responses: { nine: p(23, 24) } }),
      delay: grade('ok', 'delayed', ['Safe, but the ball was there to win back.']),
      drop: grade('poor', 'delayed', ['Running back let him turn and pass with no pressure.']),
    },
  },
  counter: {
    teaches: 'Delay/recover if opponent escapes facing forward',
    moves: { o6: p(24, 18.5), nine: p(22, 27), lw: p(13, 26) },
    question: 'He has turned and is facing forward. What do you do?',
    cues: ['He has turned and has space ahead of him.', 'Our 9 and LW are behind the ball.'],
    grades: {
      press: grade('poor', 'beaten', ['He was facing forward: diving in let him run past.'], { noTackle: true, responses: { o6: p(25, 4.5) } }),
      delay: grade('good', 'delayed', ['He had escaped, so getting goal-side slowed him down.'], { responses: { o6: p(24.5, 14) } }),
      drop: grade('ok', 'delayed', ['You got back, but did not slow him.'], { responses: { o6: p(24.5, 11) } }),
    },
  },
};

const DT02: Fixture = {
  id: 'DT02', seed: 'DT02', version: 1, goal: 'theirs', phase: 'transition', focal: '6', human: 'six',
  title: 'We lost it on the left: where does the cover go?',
  objective: 'As the cover player, block the most dangerous outlet; do not join the chase and open the centre.',
  trigger: 'Their RB has just won the ball from our LW.',
  why: 'Their RB won it; our LW and 8 are nearest the ball; their 9 is the outlet through the middle. Our back three are behind halfway.',
  offscreen: 'Our back three are in our half.',
  actors: [
    us('six', '6', 22, 12, 'Cover player'),
    us('lw', 'LW', 12, 24.5, 'Just lost it'),
    us('eight', '8', 18, 18, 'Nearest midfielder'),
    them('orb', 'RB', 13, 25.5, 'Has just won it'),
    them('o9', '9', 22, 7, 'Central outlet'),
    them('o8', '8', 30, 14, 'Other outlet'),
  ],
  ball: { owner: 'orb' }, passageSeconds: 0.6, playSeconds: 3.4,
  options: [
    opt('block', 'screen', 'Step across the pass to their 9', p(18.6, 12)),
    opt('chase', 'press', 'Chase the ball', p(13, 25.5), 'orb'),
    opt('stay', 'hold', 'Stay where you are', p(22, 12)),
  ],
  cue: {
    teaches: 'Block the most dangerous outlet',
    question: 'We have just lost it on the left. What do you do?',
    cues: ['Their 9 is waiting in the middle.', 'Our LW and 8 are closer to the ball than you.'],
    grades: {
      block: grade('good', 'regained', ['You stood in the pass to their 9, so their outlet was cut out.'], { then: [{ at: 0.8, from: 'orb', kind: 'pass', to: 'o9' }] }),
      chase: grade('poor', 'beaten', ['Our LW and 8 were already closer: chasing left the middle open.'], { noTackle: true, then: [{ at: 0.8, from: 'orb', kind: 'pass', to: 'o9' }] }),
      stay: grade('ok', 'beaten', ['You were near, but not in the line to their 9.'], { then: [{ at: 0.8, from: 'orb', kind: 'pass', to: 'o9' }] }),
    },
  },
  counter: {
    teaches: 'Do not join the ball chase and open the center',
    moves: { eight: p(11.5, 23) },
    passage: { eight: p(11, 25.5) },
    question: 'Our 8 has gone to press the ball. What do you do?',
    cues: ['Our 8 and LW are both on the ball.', 'Their 9 is free in the middle.'],
    grades: {
      block: grade('good', 'regained', ['Two were already on the ball: you protected the middle.'], { responses: { eight: p(10.5, 26.8) }, then: [{ at: 0.8, from: 'orb', kind: 'pass', to: 'o9' }] }),
      chase: grade('poor', 'beaten', ['A third chaser opened the middle for their 9.'], { noTackle: true, responses: { eight: p(10.5, 26.8) }, then: [{ at: 0.8, from: 'orb', kind: 'pass', to: 'o9' }] }),
      stay: grade('ok', 'beaten', ['You stayed central, but not in the line to their 9.'], { responses: { eight: p(10.5, 26.8) }, then: [{ at: 0.8, from: 'orb', kind: 'pass', to: 'o9' }] }),
    },
  },
};

const DEF02: Fixture = {
  id: 'DEF02', seed: 'DEF02', version: 1, goal: 'ours', phase: 'defend', focal: 'CB', human: 'cb',
  title: 'Covering the pressing defender',
  objective: 'Protect the inside and the space behind at a useful distance; shift as the attacker changes angle.',
  trigger: 'Our RB is pressing their LW on our right.',
  why: 'Their LW has the ball; our RB presses him; you are the cover; their 9 is the inside threat; our keeper is behind.',
  actors: [
    us('cb', 'CB', 18, 24, 'Cover defender'),
    us('rb', 'RB', 8.5, 18.3, 'Presses their LW'),
    them('olw', 'LW', 8, 16, 'Has the ball'),
    them('o9', '9', 25, 22, 'Central forward'),
    us('gk', 'GK', CX, 33.6, 'Our keeper'),
  ],
  ball: { owner: 'olw' }, passageSeconds: 0.6, playSeconds: 3,
  options: [
    opt('cover', 'cover', 'Cover behind our RB', p(11, 25)),
    opt('shift', 'cover', 'Cover more inside', p(16, 24.5)),
    opt('stay', 'hold', 'Stay with their 9', p(23, 23.5)),
    opt('press', 'press', 'Press him with our RB', p(8, 16), 'olw'),
  ],
  cue: {
    teaches: 'Protect inside and depth at a useful distance',
    question: 'Our RB is pressing. Where do you go?',
    cues: ['Their LW is facing down the line.', 'Their 9 is far from the ball.'],
    grades: {
      cover: grade('good', 'delayed', ['He went down the line and you were there behind our RB.'], { responses: { olw: p(10.5, 24) } }),
      shift: grade('ok', 'beaten', ['Too far inside: he went down the line past you.'], { responses: { olw: p(8.5, 27) } }),
      stay: grade('poor', 'beaten', ['Their 9 was not the danger: our RB had no cover.'], { responses: { olw: p(9, 27) } }),
      press: grade('poor', 'beaten', ['Two on the ball left their 9 free.'], { noTackle: true, then: [{ at: 0.4, from: 'olw', kind: 'pass', to: 'o9' }], responses: { o9: p(24, 27) } }),
    },
  },
  counter: {
    teaches: 'Shift as the attacker changes angle',
    passage: { olw: p(11, 17.5) },
    question: 'Their LW is cutting inside. Where do you go?',
    cues: ['Their LW has turned inside.', 'Our RB is on his outside.'],
    grades: {
      cover: grade('poor', 'beaten', ['He had turned inside: covering the line left the middle.'], { responses: { olw: p(15.5, 25) } }),
      shift: grade('good', 'delayed', ['He came inside, so shifting inside kept you in front of him.'], { responses: { olw: p(15.5, 23.5) } }),
      stay: grade('poor', 'beaten', ['Staying with their 9 left him a free run at goal.'], { responses: { olw: p(17, 23) } }),
      press: grade('poor', 'beaten', ['Two on the ball left their 9 free.'], { noTackle: true, then: [{ at: 0.4, from: 'olw', kind: 'pass', to: 'o9' }], responses: { o9: p(24, 27) } }),
    },
  },
};

const DEF03: Fixture = {
  id: 'DEF03', seed: 'DEF03', version: 1, goal: 'ours', phase: 'defend', focal: 'CB', human: 'cb',
  title: 'Their 8 has time on the ball',
  objective: 'Drop to protect the space behind when the passer has time; do not step up blindly with a runner behind you.',
  trigger: 'Their 8 has the ball in midfield with no one on him.',
  why: 'Their 8 has the ball; their 9 is the runner; our LB and RB make the line with you; our keeper is behind.',
  actors: [
    us('cb', 'CB', 22, 21, 'Central defender'),
    us('lb', 'LB', 34, 21, 'Back line'),
    us('rb', 'RB', 10, 21, 'Back line'),
    them('o8', '8', 24, 7, 'Has the ball, unpressured'),
    them('o9', '9', 23, 18.5, 'On our line'),
    us('gk', 'GK', CX, 33.6, 'Our keeper'),
  ],
  ball: { owner: 'o8' }, passageSeconds: 0.6, playSeconds: 3.6,
  options: [
    opt('drop', 'delay', 'Drop to protect the space behind', p(22.5, 25.5)),
    opt('step', 'support', 'Step up', p(21, 16.5)),
    opt('track', 'track', 'Go with their 9', p(23, 18.5), 'o9'),
  ],
  cue: {
    teaches: 'Prepare to defend depth and coordinate line',
    question: 'Their 8 has time on the ball. What do you do?',
    cues: ['No one is pressing their 8.', 'Their 9 is on our line.'],
    grades: {
      drop: grade('good', 'regained', ['The passer had time, so dropping put you in front of the ball in behind.'], { responses: { o9: p(23, 27.5) }, then: [{ at: 0.8, from: 'o8', kind: 'pass', to: 'o9' }] }),
      step: grade('poor', 'beaten', ['The passer had time: stepping up left space behind you.'], { responses: { o9: p(23, 27.5) }, then: [{ at: 0.8, from: 'o8', kind: 'pass', to: 'o9' }] }),
      track: grade('ok', 'delayed', ['You went with him, but from behind.'], { responses: { o9: p(23, 27.5) }, then: [{ at: 0.8, from: 'o8', kind: 'pass', to: 'o9' }] }),
    },
  },
  counter: {
    teaches: 'Do not step up blindly with a runner behind',
    moves: { o9: p(26, 22.5) },
    question: 'Their 9 is already behind you. What do you do?',
    cues: ['Their 9 has drifted behind your shoulder.'],
    grades: {
      drop: grade('ok', 'beaten', ['Dropping helped, but he was already running free behind you.'], { responses: { o9: p(26, 29) }, then: [{ at: 0.8, from: 'o8', kind: 'pass', to: 'o9' }] }),
      step: grade('poor', 'beaten', ['He was behind you: stepping up left him free.'], { responses: { o9: p(26, 29) }, then: [{ at: 0.8, from: 'o8', kind: 'pass', to: 'o9' }] }),
      track: grade('good', 'delayed', ['He was behind you, so going with him kept him covered.'], { responses: { o9: p(26, 29) }, then: [{ at: 0.8, from: 'o8', kind: 'pass', to: 'o9' }] }),
    },
  },
};

const DEF04: Fixture = {
  id: 'DEF04', seed: 'DEF04', version: 1, goal: 'ours', phase: 'defend', focal: '6', human: 'six',
  title: 'A loose clearance',
  objective: 'Contest the second ball when you can get there first; stay in the box rather than leave it for a duel you will not win.',
  trigger: 'Our CB has cleared it and the ball is bouncing loose.',
  why: 'The ball is loose; their 8 is the other player going for it; their 9 is in our box; our CB and keeper are behind you.',
  actors: [
    us('six', '6', 21, 19.5, 'Holding midfielder'),
    us('cb', 'CB', 22, 27, 'Has just cleared it'),
    them('o8', '8', 21, 11, 'Arriving for the second ball'),
    them('o9', '9', 25, 26.5, 'In our box'),
    us('gk', 'GK', CX, 33.6, 'Our keeper'),
  ],
  ball: { at: p(20.5, 16) }, passageSeconds: 0.5, playSeconds: 3,
  options: [
    opt('contest', 'run', 'Attack the loose ball', p(20.5, 15.5)),
    opt('screen', 'screen', 'Stand in front of the box', p(22, 22)),
    opt('mark', 'track', 'Go with their 9', p(25, 26.5), 'o9'),
  ],
  cue: {
    teaches: 'Contest second ball or protect next pass',
    question: 'The clearance is loose. What do you do?',
    cues: ['The ball is closer to you than to their 8.', 'Our CB is with their 9.'],
    grades: {
      contest: grade('good', 'regained', ['You were closer, so attacking the second ball won it.'], { responses: { o8: p(20.6, 15) } }),
      screen: grade('ok', 'delayed', ['Safe, but the ball was yours to win.'], { responses: { o8: p(20.6, 15.5) } }),
      mark: grade('poor', 'delayed', ['Our CB already had their 9: the ball was the job.'], { responses: { o8: p(20.6, 15.5) } }),
    },
  },
  counter: {
    teaches: 'Avoid abandoning the box for a low-probability duel',
    ball: { at: p(20.5, 12.5) },
    moves: { o8: p(21, 10.5), six: p(23, 24), cb: p(16, 25) },
    question: 'The clearance is loose, out near their 8. What do you do?',
    cues: ['Their 8 will get there first.', 'Their 9 is free in our box.'],
    grades: {
      contest: grade('poor', 'beaten', ['Their 8 was always getting there first, and leaving the box freed their 9.'], { noTackle: true, responses: { o8: p(20.6, 12.4), o9: p(25, 28) }, then: [{ at: 0.6, from: 'o8', kind: 'pass', to: 'o9' }] }),
      screen: grade('ok', 'delayed', ['You stayed close to the box, but their 9 was free.'], { responses: { o8: p(20.6, 12.4) } }),
      mark: grade('good', 'delayed', ['Their 8 would win it: staying with their 9 protected the box.'], { responses: { o8: p(20.6, 12.4), o9: p(25, 28) }, then: [{ at: 0.6, from: 'o8', kind: 'pass', to: 'o9' }] }),
    },
  },
};

const SP02: Fixture = {
  id: 'SP02', seed: 'SP02', version: 1, goal: 'ours', phase: 'set-piece', focal: '6', human: 'six',
  title: 'Defending a corner',
  objective: 'Know your job: first contact, second ball, or the late runner when they play it short.',
  trigger: 'They have a corner on our left.',
  why: 'Their taker and 9 attack the near post; their 8 is the short option; their 6 is the late runner; our CB and keeper defend the box.',
  actors: [
    us('six', '6', 23, 26, 'Edge of the six-yard area'),
    us('cb', 'CB', 26, 31, 'Near-post zone'),
    us('gk', 'GK', CX, 33.8, 'Our keeper'),
    them('taker', 'LW', W - 0.4, L - 0.4, 'Takes the corner'),
    them('o9', '9', 24, 29.5, 'Near-post runner'),
    them('o8', '8', 40, 29, 'Short option'),
    them('o6', '6', 24, 16, 'Late runner'),
  ],
  ball: { owner: 'taker' }, passageSeconds: 0.6, playSeconds: 3.6,
  options: [
    opt('second', 'screen', 'Guard the second-ball zone', p(23, 23)),
    opt('first', 'run', 'Attack the first contact', p(25.5, 30)),
    opt('late', 'track', 'Pick up the late runner', p(24, 18), 'o6'),
  ],
  cue: {
    teaches: 'Assign first-contact and second-ball responsibilities',
    question: 'They are about to take the corner. What is your job?',
    cues: ['Our CB has the near post.', 'Their 6 is staying out.'],
    grades: {
      second: grade('good', 'regained', ['Our CB had first contact, so you held the second-ball zone.'], { then: [{ at: 0.6, from: 'taker', kind: 'pass', to: 'o9', lofted: true }] }),
      first: grade('poor', 'regained', ['Our CB already had first contact: two of you went for one ball.'], { then: [{ at: 0.6, from: 'taker', kind: 'pass', to: 'o9', lofted: true }] }),
      late: grade('ok', 'regained', ['He was staying out: the second ball mattered more.'], { then: [{ at: 0.6, from: 'taker', kind: 'pass', to: 'o9', lofted: true }] }),
    },
  },
  counter: {
    teaches: 'Adapt to short corner and delayed runner',
    passage: { o6: p(26, 19) },
    question: 'They have played it short and their 6 is coming. What is your job?',
    passageBall: { at: 0.2, from: 'taker', kind: 'pass', to: 'o8' },
    cues: ['They played it short.', 'Their 6 is running at the edge of the box.'],
    grades: {
      second: grade('ok', 'delayed', ['Close, but their 6 was the free man.'], { responses: { o6: p(26, 22.5) }, then: [{ at: 0.4, from: 'o8', kind: 'pass', to: 'o6' }] }),
      first: grade('poor', 'delayed', ['The corner was short: their 6 was free until our CB had to leave the near post.'], { responses: { o6: p(26, 22.5) }, then: [{ at: 0.4, from: 'o8', kind: 'pass', to: 'o6' }] }),
      late: grade('good', 'delayed', ['It went short, so picking up the late runner stopped a free shot.'], { responses: { o6: p(26, 22.5) }, then: [{ at: 0.4, from: 'o8', kind: 'pass', to: 'o6' }] }),
    },
  },
};

const SP03: Fixture = {
  id: 'SP03', seed: 'SP03', version: 1, goal: 'theirs', phase: 'set-piece', focal: '8', human: 'eight',
  title: 'Attacking free kick',
  objective: 'Compare a direct shot with a planned pass; distance and the wall can make the shot poor.',
  trigger: 'We have a free kick in front of their goal.',
  why: 'You take it; their wall and keeper decide whether the shot is on; our 9 and LW are the planned pass.',
  actors: [
    us('eight', '8', 22, 22, 'Takes the free kick'),
    us('nine', '9', 28, 22.5, 'Square option'),
    us('lw', 'LW', 7, 24, 'Wide option'),
    them('w1', 'CB', 20.2, 29.3, 'Wall'),
    them('w2', 'CB', 21.4, 29.3, 'Wall'),
    them('orb', 'RB', 9, 27, 'Marks our LW'),
    them('gk', 'GK', 21.2, 33.6, 'Their keeper'),
  ],
  ball: { owner: 'eight' }, passageSeconds: 0.5, playSeconds: 2.6,
  options: [
    opt('shoot', 'shoot', 'Shoot at goal', p(25.4, SHOT_Y)),
    opt('square', 'pass', 'Square it to the 9', p(28, 22.5), 'nine'),
    opt('wide', 'pass', 'Play it wide to the LW', p(7, 24), 'lw'),
  ],
  cue: {
    teaches: 'Compare direct attempt and planned combination',
    question: 'Free kick, close to goal. What do you do?',
    cues: ['It is close to goal.', 'Their wall covers the near side; the far side is open.'],
    grades: {
      shoot: grade('good', 'goal', ['Close range with the far side open: the direct shot was the best chance.']),
      square: grade('ok', 'kept', ['A fair plan, but the shot was on.']),
      wide: grade('poor', 'kept', ['Going wide gave up a good shooting chance.']),
    },
  },
  counter: {
    teaches: 'Range, wall and rules can make direct shot poor',
    moves: { eight: p(22, 9), nine: p(30, 12), w1: p(21, 16.5), w2: p(22.2, 16.5), orb: p(10, 26) },
    question: 'Free kick, a long way out. What do you do?',
    cues: ['It is a long way from goal.', 'Their wall stands in the middle.'],
    grades: {
      shoot: grade('poor', 'lost', ['Too far out with the wall in the middle: the wall blocked it.']),
      square: grade('good', 'kept', ['A long way out, so a planned pass kept the attack going.']),
      wide: grade('good', 'progressed', ['A long way out, so the pass wide moved us forward.']),
    },
  },
};

const GM01: Fixture = {
  id: 'GM01', seed: 'GM01', version: 1, goal: 'theirs', phase: 'attack', focal: 'LW', human: 'lw',
  title: 'Protecting a late lead',
  objective: 'Prefer safe, controllable progress with support; do not turn down a clear chance to score.',
  trigger: 'We lead 2-1 with two minutes left. You have the ball on the left.',
  why: 'Our LB is your safe support; our 9 is the attacking option; their RB and CBs decide whether that option is real.',
  actors: [
    us('lw', 'LW', 8, 20, 'Has the ball'),
    us('lb', 'LB', 6, 11, 'Safe support'),
    us('nine', '9', 21, 26, 'Central forward'),
    them('orb', 'RB', 9, 23.5, 'Engages you'),
    them('ocb1', 'CB', 20.5, 27.4, 'Marks our 9'),
    them('ocb2', 'CB', 27, 27, 'Other CB'),
    them('gk', 'GK', CX, 33.4, 'Their keeper'),
  ],
  ball: { owner: 'lw' }, passageSeconds: 0.6, playSeconds: 3,
  options: [
    opt('safe', 'pass', 'Play it back to the LB', p(6, 11), 'lb'),
    opt('through', 'pass', 'Pass to the 9', p(21, 26), 'nine'),
    opt('corner', 'carry', 'Carry it toward the corner', p(4, 31)),
  ],
  cue: {
    teaches: 'Prefer controllable progress and secure support',
    question: 'We lead 2-1 late on. What do you do?',
    cues: ['Their CB is tight on our 9.', 'Our LB is free behind you.'],
    grades: {
      safe: grade('good', 'kept', ['Late on and leading, the safe pass kept the ball.']),
      through: grade('poor', 'lost', ['Their CB was tight on the 9: a turnover now could cost the lead.'], { stoppedBy: 'ocb1' }),
      corner: grade('ok', 'lost', ['Running down the clock is fine, but their RB was right there.'], { tackle: ['orb'], responses: { orb: p(5, 27) } }),
    },
  },
  counter: {
    teaches: 'Do not reject a clear high-value attacking chance',
    moves: { ocb1: p(14, 19.5), nine: p(22.5, 27.5) },
    question: 'We lead 2-1 late on. Our 9 is free. What do you do?',
    cues: ['Our 9 is free in front of goal.', 'Their CB has stepped toward you.'],
    grades: {
      safe: grade('ok', 'kept', ['Safe, but a clear chance to make it 3-1 was there.']),
      through: grade('good', 'saved', ['Our 9 was free in front of goal: that chance was worth taking.'], { then: [{ at: 0, from: 'nine', kind: 'shoot', point: p(25.4, SHOT_Y) }] }),
      corner: grade('poor', 'lost', ['Their RB was right there, and the 9 was free.'], { tackle: ['orb'], responses: { orb: p(5, 27) } }),
    },
  },
};

export const TEAM_FIXTURES: readonly Fixture[] = [AT01, DT01, DT02, DEF02, DEF03, DEF04, SP02, SP03, GM01];
