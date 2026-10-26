/** Midfield situations SIX01-SIX04, EIGHT01-EIGHT04 (logic catalog v0.5). */
import type { Fixture } from '../types';
import { CX, grade, opt, p, them, us } from './common';

const SIX01: Fixture = {
  id: 'SIX01', seed: 'SIX01', version: 1, goal: 'ours', phase: 'build', focal: '6', human: 'six',
  title: 'Receiving with your back to play',
  objective: 'Scan before deciding: turn only when no one is coming from your blind side; otherwise bounce it or shield.',
  trigger: 'You have just received from the CB, facing our goal.',
  why: 'Our CB and LB are your safe options behind; their 8 and 9 are the pressers who decide whether you can turn. The rest are not involved.',
  actors: [
    us('six', '6', CX, 17, 'Has just received, facing our goal'),
    us('cb', 'CB', CX, 26, 'Bounce option behind'),
    us('lb', 'LB', 37, 24, 'Wide option'),
    them('o8', '8', 31, 8, 'Midfielder', p(29.5, 10)),
    them('o9', '9', 14, 21, 'Near our RB side'),
  ],
  ball: { owner: 'six' }, passageSeconds: 1, playSeconds: 2.6,
  options: [
    opt('turn', 'carry', 'Turn and carry forward', p(CX, 8)),
    opt('bounce', 'pass', 'Play it back to the CB', p(CX, 26), 'cb'),
    opt('lb', 'pass', 'Pass to the LB', p(37, 24), 'lb'),
    opt('shield', 'hold', 'Shield it', p(CX, 17)),
  ],
  cue: {
    teaches: 'Scan and choose turn, bounce or shield',
    question: 'You have it with your back to play. What did your scan show?',
    cues: ['No one is behind you.', 'Their 8 is more than ten metres away.'],
    grades: {
      turn: grade('good', 'progressed', ['Nobody was behind you, so turning was safe and moved us forward.']),
      bounce: grade('ok', 'kept', ['Safe, but you had time to turn.']),
      lb: grade('ok', 'kept', ['Safe, but you had time to turn.']),
      shield: grade('poor', 'kept', ['There was no one to shield from: the space was yours.']),
    },
  },
  counter: {
    teaches: 'Blind-side opponent makes the turn unsafe',
    moves: { o9: p(19, 10) },
    passage: { o9: p(21.5, 15.3) },
    question: 'You have it with your back to play. What did your scan show?',
    cues: ['Their 9 is coming from behind you on your blind side.'],
    grades: {
      turn: grade('poor', 'lost', ['Their 9 was arriving on your blind side: turning took you into him.'], { tackle: ['o9'], responses: { o9: p(CX, 13) } }),
      bounce: grade('good', 'kept', ['With someone on your blind side, the bounce back to the CB kept it.']),
      lb: grade('ok', 'kept', ['It kept the ball, but the CB was the simpler option.']),
      shield: grade('ok', 'kept', ['Shielding kept it for now while he closed.']),
    },
  },
};

const SIX02: Fixture = {
  id: 'SIX02', seed: 'SIX02', version: 1, goal: 'ours', phase: 'build', focal: '6', human: 'six',
  title: 'Get out of the cover shadow',
  objective: 'When their 9 stands between you and the ball, move sideways out of his shadow so the CB can find you.',
  trigger: 'Our CB has the ball and their 9 blocks the line to you.',
  why: 'Our CB has the ball; their 9 is in the line between you; their 8 decides which side is free. The others are not involved.',
  actors: [
    us('six', '6', CX, 17, 'Hidden behind their 9'),
    us('cb', 'CB', CX, 26, 'Has the ball'),
    them('o9', '9', CX, 22.5, 'Screens the pass to you'),
    them('o8', '8', 30.5, 15, 'Holds the left side'),
  ],
  ball: { owner: 'cb' }, passageSeconds: 1, playSeconds: 2.8,
  options: [
    opt('right', 'support', 'Move to your right', p(16.5, 18)),
    opt('left', 'support', 'Move to your left', p(29.2, 18)),
    opt('drop', 'support', 'Drop toward the CB', p(CX, 21)),
    opt('stay', 'hold', 'Stay where you are', p(CX, 17)),
  ],
  cue: {
    teaches: 'Move beyond a cover shadow to offer an angle',
    question: 'Their 9 is between you and the CB. Where do you go?',
    cues: ['Their 9 stands in the line from the CB to you.', 'Their 8 is on your left.'],
    grades: {
      right: grade('good', 'progressed', ['Moving right took you out of the 9\'s shadow and away from their 8.'], { then: [{ at: 1.1, from: 'cb', kind: 'pass', to: 'six' }] }),
      left: grade('poor', 'lost', ['Their 8 was on that side.'], { stoppedBy: 'o8', then: [{ at: 1.1, from: 'cb', kind: 'pass', to: 'six' }] }),
      drop: grade('poor', 'lost', ['Dropping ran you into the 9\'s space.'], { stoppedBy: 'o9', then: [{ at: 0.9, from: 'cb', kind: 'pass', to: 'six' }] }),
      stay: grade('poor', 'kept', ['You stayed hidden, so the CB had no pass to you.']),
    },
  },
  counter: {
    teaches: "Do not retreat into the defender's occupied space",
    moves: { o8: p(15.5, 15) },
    question: 'Their 9 is between you and the CB. Where do you go?',
    cues: ['Their 9 stands in the line from the CB to you.', 'Their 8 is on your right.'],
    grades: {
      right: grade('poor', 'lost', ['Their 8 was on that side.'], { stoppedBy: 'o8', then: [{ at: 1.1, from: 'cb', kind: 'pass', to: 'six' }] }),
      left: grade('good', 'progressed', ['Moving left took you out of the shadow and away from their 8.'], { then: [{ at: 1.1, from: 'cb', kind: 'pass', to: 'six' }] }),
      drop: grade('poor', 'lost', ['Dropping ran you into the 9\'s space.'], { stoppedBy: 'o9', then: [{ at: 0.9, from: 'cb', kind: 'pass', to: 'six' }] }),
      stay: grade('poor', 'kept', ['You stayed hidden, so the CB had no pass to you.']),
    },
  },
};

const SIX03: Fixture = {
  id: 'SIX03', seed: 'SIX03', version: 1, goal: 'theirs', phase: 'attack', focal: '6', human: 'six',
  title: 'Our 8 carries forward',
  objective: 'While a teammate attacks, stay where you can stop their counter through the middle, and shift if their outlet moves.',
  trigger: 'Our 8 carries toward their box; their 9 waits upfield as an outlet.',
  why: 'Our 8 attacks with our LW wide; their 6 will win it; their 9 is the counter outlet you must watch. Our back three are behind halfway.',
  offscreen: 'Our back three are in our half.',
  actors: [
    us('six', '6', CX, 9, 'Holding midfielder'),
    us('eight', '8', 26, 19, 'Carries forward', p(26, 22)),
    us('lw', 'LW', 7, 24, 'Wide'),
    them('o6', '6', 26.5, 26, 'Steps to win it', p(26.3, 23.5)),
    them('ocb', 'CB', 20, 28, 'Covers'),
    them('o9', '9', 21, 4, 'Counter outlet'),
  ],
  ball: { owner: 'eight' }, passageSeconds: 1, playSeconds: 3.6,
  options: [
    opt('screen', 'screen', 'Stay central behind the ball', p(21.8, 9)),
    opt('join', 'support', 'Join the attack', p(30, 18)),
    opt('wide', 'support', 'Drift out to the left', p(12, 11)),
  ],
  cue: {
    teaches: 'Protect central counter route',
    question: 'Our 8 is carrying forward. Where should you be?',
    cues: ['Their 9 is waiting in the middle near halfway.', 'Their 6 is about to step in on our 8.'],
    grades: {
      screen: grade('good', 'regained', ['You stayed in the line to their 9, so the counter pass was yours.'], { tackle: ['o6'], responses: { o6: p(26, 22.4) }, then: [{ at: 0.6, from: 'o6', kind: 'pass', to: 'o9' }] }),
      join: grade('poor', 'lost', ['Joining left the middle open for their counter.'], { tackle: ['o6'], responses: { o6: p(26, 22.4) }, then: [{ at: 0.6, from: 'o6', kind: 'pass', to: 'o9' }] }),
      wide: grade('poor', 'lost', ['Drifting wide left the middle open for their counter.'], { tackle: ['o6'], responses: { o6: p(26, 22.4) }, then: [{ at: 0.6, from: 'o6', kind: 'pass', to: 'o9' }] }),
    },
  },
  counter: {
    teaches: 'Shift if opponent outlet changes sides',
    moves: { o9: p(33, 5) },
    question: 'Our 8 is carrying forward. Where should you be?',
    cues: ['Their 9 has drifted out to their left.', 'Their 6 is about to step in on our 8.'],
    grades: {
      screen: grade('poor', 'lost', ['Their outlet had moved: staying central left the line to him open.'], { tackle: ['o6'], responses: { o6: p(26, 22.4) }, then: [{ at: 0.6, from: 'o6', kind: 'pass', to: 'o9' }] }),
      join: grade('poor', 'lost', ['Joining left their outlet free.'], { tackle: ['o6'], responses: { o6: p(26, 22.4) }, then: [{ at: 0.6, from: 'o6', kind: 'pass', to: 'o9' }] }),
      wide: grade('ok', 'lost', ['You moved, but to the wrong side: their outlet was on the right.'], { tackle: ['o6'], responses: { o6: p(26, 22.4) }, then: [{ at: 0.6, from: 'o6', kind: 'pass', to: 'o9' }] }),
    },
  },
};

const SIX04: Fixture = {
  id: 'SIX04', seed: 'SIX04', version: 1, goal: 'theirs', phase: 'transition', focal: '6', human: 'six',
  title: 'You win the ball in midfield',
  objective: 'Play forward straight away if there is a real advantage; secure the ball first if your control or support is poor.',
  trigger: 'You have just intercepted in midfield.',
  why: 'You have won it; our LW, 9 and 8 are the forward options; their RB, CB and recovering 8 decide which are on. Players behind halfway are not involved.',
  actors: [
    us('six', '6', 22, 10, 'Has just won the ball'),
    us('eight', '8', 31, 9, 'Support to the side'),
    us('lw', 'LW', 7, 21, 'Wide forward'),
    us('nine', '9', 24, 24, 'Central forward'),
    them('o8', '8', 26, 4, 'Recovering'),
    them('orb', 'RB', 14, 22, 'Tucked in'),
    them('ocb', 'CB', 24, 26, 'Tight on our 9'),
  ],
  ball: { owner: 'six' }, passageSeconds: 0.8, playSeconds: 2.8,
  options: [
    opt('lw', 'pass', 'Pass forward to the LW', p(7, 21), 'lw'),
    opt('nine', 'pass', 'Pass into the 9', p(24, 24), 'nine'),
    opt('eight', 'pass', 'Pass to the 8', p(31, 9), 'eight'),
    opt('hold', 'hold', 'Take a touch and look', p(22, 10)),
  ],
  cue: {
    teaches: 'Play forward if a usable advantage exists',
    question: 'You have won it. What now?',
    cues: ['Their RB has tucked in: our LW is free.', 'Their CB is tight on our 9.', 'Their 8 is still behind you.'],
    grades: {
      lw: grade('good', 'progressed', ['Their RB was tucked in, so the LW was free before they recovered.'], { responses: { orb: p(10, 23) } }),
      nine: grade('poor', 'lost', ['Their CB was tight on the 9.'], { stoppedBy: 'ocb' }),
      eight: grade('ok', 'kept', ['Safe, but the chance to go forward was there.']),
      hold: grade('poor', 'kept', ['Waiting let them recover: the advantage was there to use.']),
    },
  },
  counter: {
    teaches: 'Secure first touch if control or support is poor',
    moves: { o8: p(23, 8.6), orb: p(8.5, 22.5) },
    question: 'You have won it, but their 8 is right on you. What now?',
    cues: ['Their 8 is right on you.', 'Their RB is tight on our LW.'],
    grades: {
      lw: grade('poor', 'lost', ['Their RB was tight on the LW, and the pass had to go past their 8.'], { stoppedBy: 'orb' }),
      nine: grade('poor', 'lost', ['Their CB was tight on the 9.'], { stoppedBy: 'ocb' }),
      eight: grade('good', 'kept', ['A short, safe pass got the ball away from pressure.']),
      hold: grade('ok', 'kept', ['You kept it, but their 8 was right on you.']),
    },
  },
};

const EIGHT01: Fixture = {
  id: 'EIGHT01', seed: 'EIGHT01', version: 1, goal: 'theirs', phase: 'attack', focal: '8', human: 'eight',
  title: 'Receiving between their lines',
  objective: 'Turn and go forward when there is space; play it straight back if pressure arrives first.',
  trigger: 'You have just received between their midfield and defence.',
  why: 'Our 6 is your bounce option; their 6 and 8 are the pressers; their CB marks our 9. Players on the far side are not involved.',
  actors: [
    us('eight', '8', 27, 19, 'Has just received between the lines'),
    us('six', '6', 22, 10, 'Bounce option'),
    us('nine', '9', 22, 28, 'Central forward'),
    them('o6', '6', 26, 27, 'Holding midfielder'),
    them('o8', '8', 33, 13, 'Midfielder'),
    them('ocb', 'CB', 21, 30, 'Marks our 9'),
  ],
  ball: { owner: 'eight' }, passageSeconds: 0.8, playSeconds: 2.6,
  options: [
    opt('turn', 'carry', 'Turn and carry forward', p(27, 27.5)),
    opt('bounce', 'pass', 'Play it back to the 6', p(22, 10), 'six'),
    opt('nine', 'pass', 'Pass into the 9', p(22, 28), 'nine'),
    opt('hold', 'hold', 'Hold it up', p(27, 19)),
  ],
  cue: {
    teaches: 'Receive side-on and progress when space exists',
    question: 'You are between their lines. What do you do?',
    cues: ['Their 6 is eight metres away.', 'Their 8 is behind you and not closing.'],
    grades: {
      turn: grade('good', 'progressed', ['There was space in front and no one close: turning moved us forward.']),
      bounce: grade('ok', 'kept', ['Safe, but you had room to turn.']),
      nine: grade('poor', 'lost', ['Their CB was tight on the 9.'], { stoppedBy: 'ocb' }),
      hold: grade('poor', 'kept', ['Waiting let their 6 close the space.']),
    },
  },
  counter: {
    teaches: 'Bounce pass if pressure arrives before control',
    moves: { o6: p(26.5, 24), o8: p(31, 16) },
    passage: { o6: p(26.8, 20.7), o8: p(29, 18.2) },
    question: 'You are between their lines. What do you do?',
    cues: ['Their 6 and 8 are both arriving.'],
    grades: {
      turn: grade('poor', 'lost', ['Two of them arrived: turning took you into pressure.'], { tackle: ['o6', 'o8'], responses: { o6: p(27, 21) } }),
      bounce: grade('good', 'kept', ['Pressure came first, so the bounce back to the 6 kept the ball.']),
      nine: grade('poor', 'lost', ['Their CB was tight on the 9.'], { stoppedBy: 'ocb' }),
      hold: grade('ok', 'kept', ['You kept it for now, but two were closing.']),
    },
  },
};

const EIGHT02: Fixture = {
  id: 'EIGHT02', seed: 'EIGHT02', version: 1, goal: 'theirs', phase: 'attack', focal: '8', human: 'eight',
  title: 'Third-player run off the 9',
  objective: 'Time your run as the wall player receives; wait if the pass into him is not on.',
  trigger: 'Our 6 is about to play into our 9.',
  why: 'Our 6 passes into our 9; you are the third player; their CB and 6 decide whether the wall pass is on. The rest are not involved.',
  actors: [
    us('eight', '8', 28, 14, 'Third player'),
    us('six', '6', 22, 10, 'Has the ball'),
    us('nine', '9', 22, 22, 'Wall player, checks to the ball'),
    them('ocb', 'CB', 22, 25.5, 'Behind our 9'),
    them('o6', '6', 17, 17, 'Holding midfielder'),
    them('olb', 'LB', 36, 25, 'Wide'),
  ],
  ball: { owner: 'six' }, passageSeconds: 1.2, playSeconds: 3.4,
  options: [
    opt('run', 'run', 'Run beyond the 9', p(27.5, 27)),
    opt('short', 'support', 'Come short to the 9', p(24.5, 19.5)),
    opt('stay', 'hold', 'Stay where you are', p(28, 14)),
  ],
  cue: {
    teaches: 'Move as the wall player receives',
    passageBall: { at: 0.3, from: 'six', kind: 'pass', to: 'nine' },
    question: 'The ball is going into our 9. What do you do?',
    cues: ['Our 9 can receive: no one is in front of him.', 'There is space behind their CB.'],
    grades: {
      run: grade('good', 'kept', ['You ran as he received, so his lay-off found you in space.'], { then: [{ at: 0.7, from: 'nine', kind: 'pass', to: 'eight' }] }),
      short: grade('poor', 'kept', ['Coming short crowded him and gave no forward option.'], { then: [{ at: 0.7, from: 'nine', kind: 'pass', to: 'eight' }] }),
      stay: grade('ok', 'kept', ['Safe, but the run behind was on.'], { then: [{ at: 0.7, from: 'nine', kind: 'pass', to: 'eight' }] }),
    },
  },
  counter: {
    teaches: 'Delay if the wall pass is unavailable',
    moves: { o6: p(22, 19) },
    question: 'Our 6 has the ball. Their 6 has stepped in front of our 9. What do you do?',
    cues: ['Their 6 stands in front of our 9: the pass into him is off.'],
    grades: {
      run: grade('poor', 'lost', ['The pass into the 9 was off, so your run had no ball to follow.'], { stoppedBy: 'o6', then: [{ at: 0.6, from: 'six', kind: 'pass', to: 'nine' }] }),
      short: grade('ok', 'progressed', ['Coming short offered a pass, but too close to their 6.'], { then: [{ at: 1.2, from: 'six', kind: 'pass', to: 'eight' }] }),
      stay: grade('good', 'kept', ['With the wall pass off, you waited and gave the 6 a safe pass.'], { then: [{ at: 0.6, from: 'six', kind: 'pass', to: 'eight' }] }),
    },
  },
};

const EIGHT03: Fixture = {
  id: 'EIGHT03', seed: 'EIGHT03', version: 1, goal: 'theirs', phase: 'attack', focal: '8', human: 'eight',
  title: 'Arriving for the cutback',
  objective: 'Arrive late into a free finishing lane; hold back if another runner has it or no one covers behind.',
  trigger: 'Our LW has reached the byline on the left.',
  why: 'Our LW is on the byline; our 9 attacks the near post; their keeper, CB and LB defend the box. Our 6 is the cover behind you.',
  actors: [
    us('eight', '8', 25, 17, 'Arrives from midfield'),
    us('lw', 'LW', 5, 31, 'On the byline with the ball'),
    us('nine', '9', 18.5, 31, 'Near-post run'),
    us('six', '6', 22, 6, 'Cover behind'),
    them('gk', 'GK', CX, 33.6, 'Their keeper'),
    them('ocb', 'CB', 19.5, 32, 'Marks our 9'),
    them('olb', 'LB', 30, 30, 'Far side of the box'),
    them('o9', '9', 25, 4, 'Counter outlet'),
  ],
  ball: { owner: 'lw' }, passageSeconds: 1, playSeconds: 5,
  options: [
    opt('arrive', 'run', 'Arrive at the penalty spot', p(23.5, 26.5)),
    opt('near', 'run', 'Attack the near post', p(19.5, 31.5)),
    opt('hold', 'hold', 'Hold your position', p(25, 17)),
  ],
  cue: {
    teaches: 'Arrive late into a free finishing lane',
    question: 'Our LW is on the byline. Where do you go?',
    cues: ['The space around the penalty spot is empty.', 'Our 9 has the near post.', 'Our 6 is covering behind.'],
    grades: {
      arrive: grade('good', 'goal', ['The penalty-spot lane was free and the 6 covered.'], { then: [{ at: 1.6, from: 'lw', kind: 'pass', to: 'eight' }, { at: 0, from: 'eight', kind: 'shoot', point: p(25.5, 35.6) }] }),
      near: grade('poor', 'lost', ['Our 9 already had the near post: you ran into his lane.'], { stoppedBy: 'ocb', then: [{ at: 1.6, from: 'lw', kind: 'pass', to: 'eight' }] }),
      hold: grade('ok', 'kept', ['Safe, but the finishing lane was free and we had cover.']),
    },
  },
  counter: {
    teaches: 'Hold if another runner occupies it or cover is absent',
    moves: { six: p(33, 4) },
    question: 'Our LW is on the byline. Our 6 has gone wide. Where do you go?',
    cues: ['Our 6 is out on the right: no one covers the middle.', 'Their 9 waits near halfway.'],
    grades: {
      arrive: grade('poor', 'goal', ['With no cover behind, arriving left their 9 free for the counter.'], { then: [{ at: 1.6, from: 'lw', kind: 'pass', to: 'eight' }, { at: 0, from: 'eight', kind: 'shoot', point: p(25.5, 35.6) }] }),
      near: grade('poor', 'lost', ['Our 9 already had the near post: you ran into his lane.'], { stoppedBy: 'ocb', then: [{ at: 1.6, from: 'lw', kind: 'pass', to: 'eight' }] }),
      hold: grade('good', 'kept', ['No one covered behind, so holding stopped their counter route.']),
    },
  },
};

const EIGHT04: Fixture = {
  id: 'EIGHT04', seed: 'EIGHT04', version: 1, goal: 'ours', phase: 'defend', focal: '8', human: 'eight',
  title: 'Screening their pivot',
  objective: 'Stand in the pass to their 6 while our 9 presses; hand him over when a more dangerous run appears.',
  trigger: 'Our 9 presses their CB; their 6 offers for the ball.',
  why: 'Their CB has the ball under our 9\'s press; their 6 is the pass you screen; their 8 is the runner; our 6 can take over. Others are not involved.',
  actors: [
    us('eight', '8', 27, 15, 'Screens their 6'),
    us('nine', '9', 17, 5.5, 'Presses their CB from the side', p(19.5, 3.5)),
    us('six', '6', 20, 18, 'Holds behind'),
    them('ocb', 'CB', 22, 2.5, 'Has the ball'),
    them('o6', '6', 24, 11, 'Pivot'),
    them('o8', '8', 31, 9, 'Midfielder'),
  ],
  ball: { owner: 'ocb' }, passageSeconds: 1, playSeconds: 3.6,
  options: [
    opt('screen', 'screen', 'Step into the pass to their 6', p(23.7, 8)),
    opt('press', 'press', 'Press the CB too', p(22, 3.5), 'ocb'),
    opt('track', 'track', 'Follow their 8', p(31, 12), 'o8'),
  ],
  cue: {
    teaches: 'Screen pass while supporting pressure',
    question: 'Our 9 is pressing. Where do you go?',
    cues: ['Their 6 is the pass the CB wants.', 'Their 8 is staying where he is.'],
    grades: {
      screen: grade('good', 'regained', ['You stood in the pass to their 6, so the press won it.'], { then: [{ at: 0.9, from: 'ocb', kind: 'pass', to: 'o6' }] }),
      press: grade('poor', 'delayed', ['Two pressing the CB left their 6 free.'], { noTackle: true, then: [{ at: 0.9, from: 'ocb', kind: 'pass', to: 'o6' }] }),
      track: grade('poor', 'delayed', ['Their 8 was not going anywhere; their 6 was the danger.'], { then: [{ at: 0.9, from: 'ocb', kind: 'pass', to: 'o6' }] }),
    },
  },
  counter: {
    teaches: 'Hand over marking when another threat becomes urgent',
    passage: { o8: p(31, 13), six: p(23, 14) },
    question: 'Their 8 is starting a run. Where do you go?',
    cues: ['Their 8 is running beyond you.', 'Our 6 has stepped up to their 6.'],
    grades: {
      screen: grade('poor', 'beaten', ['Their 8\'s run was the danger: our 6 already had their 6.'], { responses: { o8: p(30, 22) }, then: [{ at: 0.9, from: 'ocb', kind: 'pass', to: 'o8', lofted: true }] }),
      press: grade('poor', 'beaten', ['Pressing left their 8 free.'], { noTackle: true, responses: { o8: p(30, 22) }, then: [{ at: 0.9, from: 'ocb', kind: 'pass', to: 'o8', lofted: true }] }),
      track: grade('good', 'delayed', ['Our 6 took their 6, so you went with the more dangerous runner and stayed goal-side.'], { responses: { o8: p(30, 22) }, then: [{ at: 0.9, from: 'ocb', kind: 'pass', to: 'o8', lofted: true }] }),
    },
  },
};

export const MID_FIXTURES: readonly Fixture[] = [SIX01, SIX02, SIX03, SIX04, EIGHT01, EIGHT02, EIGHT03, EIGHT04];
