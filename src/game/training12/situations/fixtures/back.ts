/** Centre-back and outside-back situations CB01-CB04, OB01-OB04 (logic catalog v0.5). OB fixtures are the LB; the RB plays them mirrored. */
import type { Fixture } from '../types';
import { CX, grade, opt, p, them, us } from './common';

const CB01: Fixture = {
  id: 'CB01', seed: 'CB01', version: 1, goal: 'ours', phase: 'build', focal: 'CB', human: 'cb',
  title: 'Carry out of the back with no one pressing',
  objective: 'Carry into useful space while no one presses, until a defender has to choose to step to you.',
  trigger: 'You receive from the keeper and their front line drops off.',
  why: 'You, the outside backs and the 6 are our build-out; their 9, 8 and wingers are their first two lines. The keeper behind you and the players beyond halfway play no part.',
  actors: [
    us('cb', 'CB', CX, 25, 'Has the ball'),
    us('lb', 'LB', 37, 25, 'Wide outlet'),
    us('rb', 'RB', 8.5, 25, 'Wide outlet'),
    us('six', '6', CX, 16.5, 'Shows in front'),
    them('o9', '9', 21, 13, 'Drops off, screens the 6', p(22, 14.5)),
    them('o8', '8', 24, 14.8, 'Marks our 6'),
    them('olw', 'LW', 12, 18, 'Holds between our RB and CB'),
    them('orw', 'RW', 34, 18, 'Holds between our LB and CB'),
  ],
  ball: { owner: 'cb' }, passageSeconds: 1, playSeconds: 2.4,
  options: [
    opt('carry', 'carry', 'Carry it forward', p(CX, 16.8)),
    opt('six', 'pass', 'Pass into the 6', p(CX, 16.5), 'six'),
    opt('lb', 'pass', 'Pass wide to the LB', p(37, 25), 'lb'),
    opt('hold', 'hold', 'Stop and wait', p(CX, 25)),
  ],
  cue: {
    teaches: 'Carry into useful space while control, support and risk permit; reassess on pressure, shooting access or loss of control (audit override of "Carry forward until a defender must choose")',
    question: 'No one is coming. What do you do with it?',
    cues: ['Nobody is within ten metres of you.', 'Their 8 is tight to our 6.'],
    grades: {
      carry: grade('good', 'progressed', ['There was open grass in front and no one pressing: carrying makes a defender choose.']),
      six: grade('poor', 'lost', ['Their 8 and 9 were around our 6.'], { stoppedBy: 'o8' }),
      lb: grade('ok', 'kept', ['Safe, but it gave up the space you had in front.']),
      hold: grade('poor', 'kept', ['Waiting let them reorganise; the space in front was free.']),
    },
  },
  counter: {
    teaches: 'Protect ball if a second presser closes (audit counter: the defender may keep delaying; no forced commitment)',
    moves: { o9: p(19, 18), o8: p(28, 19) },
    passage: { o9: p(20.5, 22), o8: p(26.5, 22) },
    question: 'Two of them are closing. What do you do with it?',
    cues: ['Their 9 and 8 are both coming at you.', 'Their 8 has left our 6.'],
    grades: {
      carry: grade('poor', 'lost', ['Carrying into two pressers gave the ball away.'], { tackle: ['o9', 'o8'], responses: { o9: p(CX, 18), o8: p(24, 18.5) } }),
      six: grade('good', 'progressed', ['Their 8 left our 6 to press, so the 6 was free.']),
      lb: grade('good', 'kept', ['The LB was free and away from both pressers.']),
      hold: grade('ok', 'kept', ['Shielding kept it for now, but two were closing.']),
    },
  },
};

const CB02: Fixture = {
  id: 'CB02', seed: 'CB02', version: 1, goal: 'ours', phase: 'build', focal: 'CB', human: 'cb',
  title: 'Their 9 screens our 6',
  objective: 'When their striker stands in the line to our 6, change the angle or find an outside back instead of forcing it.',
  trigger: 'You have the ball and their 9 drops into the line to our 6.',
  why: 'You, both outside backs and the 6 are the build-out; their 9 screens the 6 and their wingers decide which outside back is free. Players beyond halfway are not involved.',
  actors: [
    us('cb', 'CB', CX, 26, 'Has the ball'),
    us('lb', 'LB', 37, 25.5, 'Outside outlet'),
    us('rb', 'RB', 8.5, 25.5, 'Outside outlet'),
    us('six', '6', CX, 17, 'Pivot, screened'),
    them('o9', '9', CX, 23, 'Screens the pass into our 6', p(CX, 21.5)),
    them('olw', 'LW', 10.5, 24, 'Close to our RB'),
    them('orw', 'RW', 32, 18, 'Holds narrow'),
  ],
  ball: { owner: 'cb' }, passageSeconds: 1, playSeconds: 2.4,
  options: [
    opt('six', 'pass', 'Pass into the 6', p(CX, 17), 'six'),
    opt('lb', 'pass', 'Pass to the LB', p(37, 25.5), 'lb'),
    opt('rb', 'pass', 'Pass to the RB', p(8.5, 25.5), 'rb'),
    opt('angle', 'carry', 'Carry sideways to open a new angle', p(29, 25.5)),
  ],
  cue: {
    teaches: 'Change passing angle or find outside defender',
    question: 'Their 9 is in front of our 6. Where does the ball go?',
    cues: ['Their 9 stands right in the line to our 6.', 'Their right winger is narrow: the LB has room.', 'Their left winger is close to our RB.'],
    grades: {
      six: grade('poor', 'lost', ['The pass had to go through their 9.'], { stoppedBy: 'o9' }),
      lb: grade('good', 'kept', ['Their right winger was narrow, so the LB was free.']),
      rb: grade('poor', 'lost', ['Their left winger was in the lane to the RB.'], { stoppedBy: 'olw' }),
      angle: grade('ok', 'kept', ['Changing the angle is sound, but the LB was free now.']),
    },
  },
  counter: {
    teaches: 'Avoid forcing a pass through the screen',
    moves: { orw: p(35.5, 24.5), olw: p(12, 17) },
    question: 'Their 9 is in front of our 6. Where does the ball go?',
    cues: ['Their 9 stands right in the line to our 6.', 'Their right winger is on the LB.', 'Their left winger has stayed high: the RB has room.'],
    grades: {
      six: grade('poor', 'lost', ['The pass had to go through their 9.'], { stoppedBy: 'o9' }),
      lb: grade('poor', 'lost', ['Their right winger was on the LB.'], { stoppedBy: 'orw' }),
      rb: grade('good', 'kept', ['Their left winger stayed high, so the RB was free.']),
      angle: grade('good', 'kept', ['Carrying sideways took you out of the 9\'s shadow and kept every option.']),
    },
  },
};

const CB03: Fixture = {
  id: 'CB03', seed: 'CB03', version: 1, goal: 'ours', phase: 'defend', focal: 'CB', human: 'cb',
  title: 'Their 9 drops short',
  objective: 'Follow their checking striker only when cover protects the space you leave; otherwise hold or hand over.',
  trigger: 'Their 9 checks toward the ball as their 8 looks up.',
  why: 'Their 8 has the ball, their 9 checks short and their left winger may run in behind; our 6 and RB are the cover that decides whether you can follow. Players on the far side play no part.',
  actors: [
    us('cb', 'CB', CX, 24, 'Marks their 9'),
    us('six', '6', 24.5, 13, 'Screens in front'),
    us('rb', 'RB', 14, 24, 'Right side of the back line'),
    us('lb', 'LB', 34, 24, 'Left side of the back line'),
    them('o8', '8', 26, 5, 'Has the ball'),
    them('o9', '9', 22, 21, 'Checks short', p(21.5, 16)),
    them('olw', 'LW', 9, 18, 'Wide on our right'),
  ],
  ball: { owner: 'o8' }, passageSeconds: 1.2, playSeconds: 4.2,
  options: [
    opt('follow', 'track', 'Follow the 9', p(21.5, 17.5), 'o9'),
    opt('hold', 'hold', 'Hold your position', p(CX, 24)),
    opt('hand', 'cover', 'Pass him on to the 6 and stay', p(21.5, 23.5)),
  ],
  cue: {
    teaches: 'Hold, hand over or follow with cover',
    passage: { o9: p(21.5, 16), rb: p(17, 24) },
    question: 'Their 9 is dropping toward the ball. Do you go with him?',
    cues: ['Our RB has tucked in to cover the space behind you.', 'No one is running in behind.'],
    grades: {
      follow: grade('good', 'delayed', ['The RB covered behind you, so following stopped the 9 turning.'], { then: [{ at: 0.9, from: 'o8', kind: 'pass', to: 'o9' }] }),
      hold: grade('ok', 'delayed', ['Safe, but the 9 could turn freely in front of you.'], { then: [{ at: 0.9, from: 'o8', kind: 'pass', to: 'o9' }] }),
      hand: grade('ok', 'delayed', ['Our 6 was a long way off to take him.'], { then: [{ at: 0.9, from: 'o8', kind: 'pass', to: 'o9' }] }),
    },
  },
  counter: {
    teaches: 'Runner threatens the space behind',
    passage: { o9: p(21.5, 16), olw: p(14, 21), six: p(22.5, 14.5) },
    question: 'Their 9 is dropping toward the ball. Do you go with him?',
    cues: ['Their left winger is starting a run inside, behind you.', 'Our RB is still wide.'],
    grades: {
      follow: grade('poor', 'beaten', ['Following left the space behind you for their winger\'s run.'], { responses: { olw: p(20, 30) }, then: [{ at: 0.5, from: 'o8', kind: 'pass', to: 'olw', lofted: true }] }),
      hold: grade('good', 'regained', ['You stayed between the runner and goal, so the ball in behind was yours.'], { responses: { olw: p(21, 30), cb: p(22, 26) }, then: [{ at: 0.5, from: 'o8', kind: 'pass', to: 'olw', lofted: true }] }),
      hand: grade('good', 'regained', ['Our 6 took the 9 and you protected the space behind.'], { responses: { olw: p(21, 30), six: p(21.5, 15.5) }, then: [{ at: 0.5, from: 'o8', kind: 'pass', to: 'olw', lofted: true }] }),
    },
  },
};

const CB04: Fixture = {
  id: 'CB04', seed: 'CB04', version: 1, goal: 'ours', phase: 'transition', focal: 'CB', human: 'cb',
  title: 'Their counterattack runs at you',
  objective: 'Delay the carrier and protect the route to goal until help arrives; step in only with support or a loose touch.',
  trigger: 'We lost the ball upfield and their 9 is running at you.',
  why: 'Their 9 carries with their left winger in support; you are the last defender in the middle, our RB is recovering and our 6 is chasing back. Our keeper is behind you; the rest are upfield.',
  actors: [
    us('gk', 'GK', CX, 32.8, 'Protects the goal'),
    us('cb', 'CB', CX, 22, 'Last defender in the middle'),
    us('rb', 'RB', 10, 18, 'Recovering', p(12, 20)),
    us('six', '6', 26, 6, 'Chasing back', p(25.5, 10)),
    them('o9', '9', 23, 10, 'Carries at goal', p(23, 14)),
    them('olw', 'LW', 13, 11, 'Supports wide', p(13, 15)),
  ],
  ball: { owner: 'o9' }, passageSeconds: 1, playSeconds: 2.4,
  options: [
    opt('delay', 'delay', 'Back off and stay goal-side', p(CX, 23)),
    opt('tackle', 'press', 'Step in and tackle', p(23, 15), 'o9'),
    opt('wide', 'cover', 'Go across to the winger', p(15, 19)),
  ],
  cue: {
    teaches: 'Delay and protect goal-side route',
    question: 'Their 9 is coming at you. What do you do?',
    cues: ['You are on your own in the middle.', 'Our RB and 6 are on their way back.'],
    grades: {
      delay: grade('good', 'delayed', ['Alone, delaying kept you between him and goal until help arrived.'], { responses: { o9: p(23, 17), rb: p(15, 21), six: p(24, 14) } }),
      tackle: grade('poor', 'conceded', ['Diving in alone let him go past you.'], { noTackle: true, responses: { o9: p(26.5, 26) }, then: [{ at: 1.4, from: 'o9', kind: 'shoot', point: p(20.2, 35) }] }),
      wide: grade('poor', 'conceded', ['Going across opened the route to goal.'], { responses: { o9: p(23.5, 25) }, then: [{ at: 1.3, from: 'o9', kind: 'shoot', point: p(20.2, 35) }] }),
    },
  },
  counter: {
    teaches: 'Step to tackle only when support or touch permits',
    moves: { six: p(24, 11) },
    ball: { at: p(22.8, 18) },
    passage: { o9: p(22.5, 14), six: p(23.5, 14) },
    question: 'His touch has run away from him. What do you do?',
    cues: ['The ball is closer to you than to him.', 'Our 6 is right behind him.'],
    grades: {
      delay: grade('ok', 'delayed', ['Safe, but the loose touch and our 6 behind made it a chance to win it.'], { responses: { o9: p(22.8, 18.5) } }),
      tackle: grade('good', 'regained', ['The ball was yours to win, and the 6 was there in support.'], { responses: { o9: p(22.8, 18.5) } }),
      wide: grade('poor', 'delayed', ['Going across gave him time to recover the ball.'], { responses: { o9: p(22.8, 19.5) } }),
    },
  },
};

const OB01: Fixture = {
  id: 'OB01', seed: 'OB01', version: 1, goal: 'theirs', phase: 'attack', focal: 'LB', human: 'lb',
  title: 'Our winger holds the width',
  objective: 'Support the winger from a different lane: inside when he holds the touchline, outside when he comes in.',
  trigger: 'Our LW has the ball on the touchline facing their RB.',
  why: 'Our LW has the ball against their RB; their RW tracks back; our 8 is the inside link. You are the LB arriving. The far side plays no part.',
  actors: [
    us('lb', 'LB', 7, 10, 'Arrives from behind'),
    us('lw', 'LW', 3.5, 21, 'Has the ball, holds width'),
    us('eight', '8', 17, 18, 'Inside link'),
    them('orb', 'RB', 7, 24, 'Faces our LW'),
    them('orw', 'RW', 9, 14, 'Tracks back'),
    them('o8', '8', 18.5, 21.5, 'Near our 8'),
  ],
  ball: { owner: 'lw' }, passageSeconds: 1, playSeconds: 4,
  options: [
    opt('inside', 'support', 'Run inside him', p(10, 24)),
    opt('overlap', 'run', 'Overlap round the outside', p(3, 27)),
    opt('stay', 'support', 'Stay behind as a back pass', p(6, 15)),
  ],
  cue: {
    teaches: 'Offer inside support or overlap',
    question: 'Our LW has it wide. Where do you go?',
    cues: ['Our LW is on the touchline: the outside lane is his.', 'There is space inside their RB.'],
    grades: {
      inside: grade('good', 'kept', ['He was holding the touchline, so inside was the free lane.'], { responses: { orb: p(6, 25) }, then: [{ at: 1, from: 'lw', kind: 'pass', to: 'lb' }] }),
      overlap: grade('poor', 'lost', ['He was already in the outside lane: you ran into his space.'], { stoppedBy: 'orb', then: [{ at: 1, from: 'lw', kind: 'pass', to: 'lb' }] }),
      stay: grade('ok', 'kept', ['A safe back pass, but no help going forward.'], { then: [{ at: 1, from: 'lw', kind: 'pass', to: 'lb' }] }),
    },
  },
  counter: {
    teaches: 'Do not occupy the same running lane',
    moves: { lw: p(10, 20), orb: p(11, 23) },
    question: 'Our LW has come inside with it. Where do you go?',
    cues: ['Our LW has come inside: the inside lane is his.', 'The touchline is empty.'],
    grades: {
      inside: grade('poor', 'lost', ['He had come inside: you ran into his lane.'], { stoppedBy: 'orb', then: [{ at: 1, from: 'lw', kind: 'pass', to: 'lb' }] }),
      overlap: grade('good', 'kept', ['He came inside, so the outside lane was free for you.'], { responses: { orb: p(9, 24) }, then: [{ at: 2.2, from: 'lw', kind: 'pass', to: 'lb' }] }),
      stay: grade('ok', 'kept', ['A safe back pass, but no help going forward.'], { then: [{ at: 1, from: 'lw', kind: 'pass', to: 'lb' }] }),
    },
  },
};

const OB02: Fixture = {
  id: 'OB02', seed: 'OB02', version: 1, goal: 'theirs', phase: 'attack', focal: 'LB', human: 'lb',
  title: 'Our winger moves inside',
  objective: 'Give the team width when the winger comes inside, but only when someone covers the space behind you.',
  trigger: 'Our LW carries inside off the touchline.',
  why: 'Our LW comes inside; our 6 near halfway is the cover behind you; their RW is the counter threat if you go. The rest are not involved.',
  actors: [
    us('lb', 'LB', 6, 9, 'Left back'),
    us('lw', 'LW', 11, 19, 'Carries inside', p(13, 21)),
    us('six', '6', 14, 3, 'Cover behind'),
    them('orb', 'RB', 12, 24, 'Follows our LW inside'),
    them('o8', '8', 17, 23, 'Blocks the middle'),
    them('orw', 'RW', 10, 6, 'Counter threat behind you'),
  ],
  ball: { owner: 'lw' }, passageSeconds: 1, playSeconds: 2.6,
  options: [
    opt('wide', 'width', 'Go high and wide', p(3, 22)),
    opt('hold', 'hold', 'Hold your position', p(6, 9)),
    opt('tuck', 'support', 'Come inside too', p(13, 14)),
  ],
  cue: {
    teaches: 'Provide width when defensive cover exists',
    question: 'Our LW is coming inside. What do you do?',
    cues: ['The touchline is empty now.', 'Our 6 is behind you, near their right winger.'],
    grades: {
      wide: grade('good', 'kept', ['He came inside and our 6 covered, so the width was yours to give.'], { then: [{ at: 1.1, from: 'lw', kind: 'pass', to: 'lb' }] }),
      hold: grade('ok', 'kept', ['Safe, but no one gave the team width.'], { then: [{ at: 1.1, from: 'lw', kind: 'pass', to: 'lb' }] }),
      tuck: grade('poor', 'lost', ['Coming inside crowded his lane.'], { stoppedBy: 'o8', responses: { o8: p(14, 17) }, then: [{ at: 1.1, from: 'lw', kind: 'pass', to: 'lb' }] }),
    },
  },
  counter: {
    teaches: 'Hold if advancing leaves a direct counter route',
    moves: { six: p(30, 4), orw: p(8, 5) },
    question: 'Our LW is coming inside. What do you do?',
    cues: ['Our 6 is on the far side.', 'Their right winger is waiting behind you.'],
    grades: {
      wide: grade('poor', 'lost', ['No one covered behind you: their right winger was free for the counter.'], { tackle: ['orb'], responses: { orb: p(13, 21) } }),
      hold: grade('good', 'kept', ['With no cover, holding kept their right winger in check and gave a safe pass back.'], { then: [{ at: 1, from: 'lw', kind: 'pass', to: 'lb' }] }),
      tuck: grade('poor', 'lost', ['Coming inside crowded his lane and left their winger.'], { tackle: ['orb'], responses: { orb: p(13, 21) } }),
    },
  },
};

const OB03: Fixture = {
  id: 'OB03', seed: 'OB03', version: 1, goal: 'ours', phase: 'defend', focal: 'LB', human: 'lb',
  title: '1v1 against their winger',
  objective: 'Approach under control and show him away from the most dangerous route.',
  trigger: 'Their right winger receives facing you on our left.',
  why: 'Their RW has the ball against you; our CB covers the middle; in the counter their 8 overlaps outside. Players away from this side play no part.',
  actors: [
    us('lb', 'LB', 36, 23, 'Faces the winger'),
    us('cb', 'CB', 26, 26, 'Covers the middle'),
    them('orw', 'RW', 38, 13, 'Has the ball'),
    them('o9', '9', 24, 20, 'Central, marked by our CB'),
  ],
  ball: { owner: 'orw' }, passageSeconds: 1, playSeconds: 2.6,
  options: [
    opt('line', 'delay', 'Show him down the line', p(36.2, 17)),
    opt('inside', 'delay', 'Show him inside', p(40.5, 17)),
    opt('dive', 'press', 'Dive in for the ball', p(38, 14), 'orw'),
  ],
  cue: {
    teaches: 'Approach under control and protect dangerous route',
    passage: { orw: p(38.5, 15) },
    question: 'He is running at you. How do you defend him?',
    cues: ['No one is supporting him on the outside.', 'The dangerous way is inside, toward goal.'],
    grades: {
      line: grade('good', 'delayed', ['Showing him down the line kept him away from goal.'], { responses: { orw: p(42, 17.5) } }),
      inside: grade('poor', 'delayed', ['Showing him inside sent him toward goal: only our CB stepping off their 9 stopped him.'], { responses: { orw: p(33, 22.5) } }),
      dive: grade('poor', 'beaten', ['Diving in let him skip past.'], { noTackle: true, responses: { orw: p(33.5, 24) } }),
    },
  },
  counter: {
    teaches: "Opponent's support changes the preferred direction",
    moves: { cb: p(29, 23) },
    passage: { orw: p(38.5, 15) },
    question: 'He is running at you, and their 8 is coming outside. How do you defend him?',
    cues: ['Their 8 is overlapping outside him.', 'Our CB has shifted across to cover inside.'],
    grades: {
      line: grade('poor', 'beaten', ['Showing him outside played him into the overlap.'], { responses: { orw: p(42.5, 22) } }),
      inside: grade('good', 'delayed', ['With the overlap outside, showing him inside sent him into our CB.'], { responses: { orw: p(35, 17), cb: p(32.5, 19) } }),
      dive: grade('poor', 'beaten', ['Diving in let him skip past.'], { noTackle: true, responses: { orw: p(33.5, 24) } }),
    },
  },
};

const OB04: Fixture = {
  id: 'OB04', seed: 'OB04', version: 1, goal: 'ours', phase: 'defend', focal: 'LB', human: 'lb',
  title: 'Attack on the far side',
  objective: 'Tuck in and scan for the far-post runner; re-expand only if a switch actually travels across.',
  trigger: 'They attack down our right; you are the far outside back.',
  why: 'Their LW has the ball on our right with our RB on him; our CB marks their 9; their RW is the far-post threat you must see. The rest are not involved.',
  actors: [
    us('lb', 'LB', 37, 21, 'Far outside back'),
    us('cb', 'CB', 22, 28, 'Marks their 9'),
    us('rb', 'RB', 9, 24, 'Faces their LW'),
    them('olw', 'LW', 6, 25, 'Has the ball, looks to cross'),
    them('o9', '9', 22.5, 26.5, 'Attacks the near post'),
    them('orw', 'RW', 40, 17, 'Far-post runner', p(36, 22)),
  ],
  ball: { owner: 'olw' }, passageSeconds: 1, playSeconds: 6.5,
  options: [
    opt('tuck', 'cover', 'Tuck in toward the far post', p(29, 28.5)),
    opt('wide', 'hold', 'Stay wide with their winger', p(39, 21)),
    opt('press', 'press', 'Go to their winger', p(40, 17), 'orw'),
  ],
  cue: {
    teaches: 'Tuck and scan far-post threats; adjust as observed switch cues and ball travel develop (audit override)',
    question: 'The ball is on the far side. Where should you be?',
    cues: ['Their LW is about to cross.', 'Their RW is running toward the far post.'],
    grades: {
      tuck: grade('good', 'regained', ['Tucking in put you between the far-post runner and goal.'], { responses: { orw: p(30, 28.5) }, then: [{ at: 0.4, from: 'olw', kind: 'pass', point: p(29.5, 29), lofted: true }] }),
      wide: grade('poor', 'conceded', ['Staying wide left the far post open.'], { responses: { orw: p(29.5, 29) }, then: [{ at: 0.4, from: 'olw', kind: 'pass', point: p(29.5, 29), lofted: true }, { at: 0.5, from: 'orw', kind: 'shoot', point: p(22, 35) }] }),
      press: grade('poor', 'conceded', ['Going to him left the far post open as he ran in.'], { noTackle: true, responses: { orw: p(29.5, 29) }, then: [{ at: 0.4, from: 'olw', kind: 'pass', point: p(29.5, 29), lofted: true }, { at: 0.5, from: 'orw', kind: 'shoot', point: p(22, 35) }] }),
    },
  },
  counter: {
    teaches: 'Re-expand if a switch travels across (audit counter: balance new-side pressure against central and far-post threats; no automatic full expansion)',
    moves: { orw: p(40, 14) },
    passage: { lb: p(31, 25), orw: p(40, 14.5) },
    passageBall: { at: 0.2, from: 'olw', kind: 'pass', to: 'orw', lofted: true },
    question: 'They have switched it to your side. What now?',
    cues: ['The ball is travelling across to their right winger.', 'You are tucked in; he is out wide.'],
    grades: {
      tuck: grade('poor', 'beaten', ['The switch came across and he had room to run at goal.'], { then: [{ at: 0, from: 'orw', kind: 'carry', point: p(31, 28) }] }),
      wide: grade('ok', 'delayed', ['Going back out is right, but holding off let him settle.'], { responses: { orw: p(40, 16) } }),
      press: grade('good', 'regained', ['The switch was travelling: closing him as it arrived won it.'], { tackle: ['lb'] }),
    },
  },
};

export const BACK_FIXTURES: readonly Fixture[] = [CB01, CB02, CB03, CB04, OB01, OB02, OB03, OB04];
