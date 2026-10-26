/** Attacking-third and front-line situations WING01-04, NINE01-04, AT02, SP01, DEF01 (logic catalog v0.5). */
import type { Fixture } from '../types';
import { CX, L, grade, opt, p, them, us } from './common';

const SHOT_Y = L + 1.2;

const WING01: Fixture = {
  id: 'WING01', seed: 'WING01', version: 1, goal: 'theirs', phase: 'attack', focal: 'LW', human: 'lw',
  title: '1v1 against their right back',
  objective: 'Attack the space when their RB is alone; recycle when cover turns it into 1v2.',
  trigger: 'You have the ball facing their RB on the left.',
  why: 'Their RB is your 1v1; their CB is the possible cover; our LB is the recycle option and our 9 is in the box. The far side is not involved.',
  actors: [
    us('lw', 'LW', 6, 20, 'Has the ball'),
    us('lb', 'LB', 5, 10, 'Support behind'),
    us('nine', '9', 22, 29, 'In the box'),
    them('orb', 'RB', 7, 25, 'Defends you 1v1'),
    them('ocb', 'CB', 19, 29, 'Covers the middle'),
    them('gk', 'GK', CX, 33.6, 'Their keeper'),
  ],
  ball: { owner: 'lw' }, passageSeconds: 0.8, playSeconds: 2.8,
  options: [
    opt('attack', 'carry', 'Dribble at him', p(6, 30)),
    opt('recycle', 'pass', 'Play it back to the LB', p(5, 10), 'lb'),
    opt('nine', 'pass', 'Pass into the 9', p(22, 29), 'nine'),
  ],
  cue: {
    teaches: 'Attack available space to attempt to provoke commitment',
    question: 'You are 1v1 with their RB. What do you do?',
    cues: ['Their CB is marking our 9: no one covers their RB.', 'There is space behind their RB.'],
    grades: {
      attack: grade('good', 'progressed', ['He was alone with space behind him: attacking him made him give ground.'], { responses: { orb: p(7, 29) } }),
      recycle: grade('ok', 'kept', ['Safe, but the 1v1 was on.']),
      nine: grade('poor', 'lost', ['Their CB was right on our 9.'], { stoppedBy: 'ocb' }),
    },
  },
  counter: {
    teaches: 'Keep defender autonomy; cover, angle and execution can favor recycling',
    moves: { ocb: p(11, 27) },
    question: 'You are facing their RB. What do you do?',
    cues: ['Their CB has come across behind their RB: it is 1 against 2.', 'That left our 9 free.'],
    grades: {
      attack: grade('poor', 'lost', ['Their CB had come across: you dribbled into two.'], { tackle: ['ocb', 'orb'], responses: { ocb: p(6.6, 26.5) } }),
      recycle: grade('good', 'kept', ['With the cover there, recycling kept the ball to go again.']),
      nine: grade('good', 'progressed', ['Their CB had left the 9: the pass inside was on.']),
    },
  },
};

const WING02: Fixture = {
  id: 'WING02', seed: 'WING02', version: 1, goal: 'theirs', phase: 'attack', focal: 'LW', human: 'lw',
  title: 'Overload on our left',
  objective: 'Draw their players over, then release the switch; keep carrying if they will not commit.',
  trigger: 'You have the ball on the left with our LB and 8 close.',
  why: 'Our LB and 8 make the overload; their RB, 8 and 6 decide whether they have shifted over; our RW and their LB are the switch.',
  actors: [
    us('lw', 'LW', 8, 22, 'Has the ball'),
    us('lb', 'LB', 6, 14, 'Overlap support'),
    us('eight', '8', 14, 19, 'Short support'),
    us('rw', 'RW', 40, 24, 'Far-side width'),
    them('orb', 'RB', 8, 25.5, 'Engages you'),
    them('o8', '8', 13, 16, 'Shifted across'),
    them('o6', '6', 16, 23, 'Shifted across'),
    them('olb', 'LB', 31, 27, 'Tucked in'),
  ],
  ball: { owner: 'lw' }, passageSeconds: 0.8, playSeconds: 3.6,
  options: [
    opt('switch', 'pass', 'Switch it to the RW', p(40, 24), 'rw', true),
    opt('carry', 'carry', 'Keep carrying', p(9, 31)),
    opt('short', 'pass', 'Short pass to the 8', p(14, 19), 'eight'),
  ],
  cue: {
    teaches: 'Draw pressure and release a switch route',
    question: 'Three of them have come over to our side. What do you do?',
    cues: ['Their RB, 8 and 6 are all on our side.', 'Their LB has tucked in: our RW is free.'],
    grades: {
      switch: grade('good', 'kept', ['They had all come over: the switch found our RW free.']),
      carry: grade('poor', 'lost', ['Three were around you: carrying ran into them.'], { tackle: ['orb', 'o6'], responses: { orb: p(8.8, 28.5), o6: p(8.8, 28.5) } }),
      short: grade('ok', 'kept', ['Safe, but it kept the ball in the crowded side.']),
    },
  },
  counter: {
    teaches: 'Keep carrying if defenders refuse to commit',
    moves: { orb: p(8, 29), o6: p(22, 22), o8: p(20, 14), olb: p(37, 25) },
    question: 'Their players are holding their positions. What do you do?',
    cues: ['Their RB is dropping off instead of engaging.', 'Their LB is tight on our RW.'],
    grades: {
      switch: grade('poor', 'lost', ['Their LB was tight on our RW and no one had come over.'], { stoppedBy: 'olb' }),
      carry: grade('good', 'progressed', ['They would not commit, so carrying took the space they gave.'], { responses: { orb: p(8.5, 31.5) } }),
      short: grade('ok', 'kept', ['Safe, but the space in front was yours.']),
    },
  },
};

const WING03: Fixture = {
  id: 'WING03', seed: 'WING03', version: 1, goal: 'theirs', phase: 'attack', focal: 'RW', human: 'rw',
  title: 'Far winger, ball on the other side',
  objective: 'Choose between width, a blind-side run or the far post from where the ball is and what the passer can do.',
  trigger: 'The ball is with our left side.',
  why: 'Our LB or LW has the ball; their LB is the defender you play off; their CBs decide whether the far post is open. Our 9 occupies the middle.',
  actors: [
    us('rw', 'RW', 40, 20, 'Far-side winger'),
    us('lb', 'LB', 6, 18, 'Has the ball'),
    us('lw', 'LW', 6, 26, 'Wide left'),
    us('nine', '9', 20, 28, 'In the middle'),
    them('olb', 'LB', 32, 24, 'Tucked in toward the ball'),
    them('ocb', 'CB', 21, 29.5, 'Marks our 9'),
    them('orb', 'RB', 8, 28, 'On our LW'),
    them('gk', 'GK', CX, 33.6, 'Their keeper'),
  ],
  ball: { owner: 'lb' }, passageSeconds: 0.8, playSeconds: 4.6,
  options: [
    opt('width', 'width', 'Hold the width', p(42, 22)),
    opt('blind', 'run', 'Run in behind their LB', p(37, 29)),
    opt('far', 'run', 'Attack the far post', p(27, 31)),
    opt('narrow', 'support', 'Come inside', p(29, 21)),
  ],
  cue: {
    teaches: 'Choose width, blind-side depth or far-post run',
    question: 'The ball is on our left with time on it. Where do you go?',
    cues: ['Our LB has time and his head up.', 'Their LB has tucked in.'],
    grades: {
      width: grade('good', 'kept', ['Their LB had tucked in: staying wide kept the switch on.'], { then: [{ at: 0.6, from: 'lb', kind: 'pass', to: 'rw', lofted: true }] }),
      blind: grade('good', 'progressed', ['Running behind their tucked-in LB was on with the LB looking up.'], { then: [{ at: 0.8, from: 'lb', kind: 'pass', to: 'rw', lofted: true }] }),
      far: grade('poor', 'kept', ['No cross was coming yet: the far post could wait.']),
      narrow: grade('poor', 'kept', ['Coming inside took away the switch.']),
    },
  },
  counter: {
    teaches: 'Narrowing too early can destroy switch access',
    ball: { owner: 'lw' },
    moves: { lw: p(5, 30.5), orb: p(7, 31) },
    question: 'Our LW is at the byline on the left. Where do you go?',
    cues: ['Our LW is about to cross.', 'The far post is empty.'],
    grades: {
      width: grade('ok', 'kept', ['Width was not needed now: the cross was coming.']),
      blind: grade('ok', 'kept', ['The run was too far from where the cross would land.']),
      far: grade('good', 'goal', ['The cross was coming and the far post was empty.'], { then: [{ at: 0.9, from: 'lw', kind: 'pass', to: 'rw', lofted: true }, { at: 0, from: 'rw', kind: 'shoot', point: p(24.5, SHOT_Y) }] }),
      narrow: grade('poor', 'kept', ['Coming short to the edge gave the cross no target.']),
    },
  },
};

const WING04: Fixture = {
  id: 'WING04', seed: 'WING04', version: 1, goal: 'theirs', phase: 'attack', focal: 'LW', human: 'lw',
  title: 'At the byline: which delivery?',
  objective: 'Compare the cutback, the near post and the far post; cancel the delivery when every arrival lane is covered.',
  trigger: 'You have reached the byline on the left.',
  why: 'Our 9, 8 and RW are the three arrival lanes; their CB, 6 and LB are the defenders on them; our LB is the recycle.',
  actors: [
    us('lw', 'LW', 5, 31, 'At the byline'),
    us('lb', 'LB', 6, 20, 'Recycle option'),
    us('nine', '9', 18, 30.5, 'Near post'),
    us('eight', '8', 24, 26.5, 'Cutback lane'),
    us('rw', 'RW', 30, 30, 'Far post'),
    them('ocb', 'CB', 18.8, 31.6, 'Marks our 9'),
    them('o6', '6', 21, 22, 'Edge of the box'),
    them('olb', 'LB', 33, 29, 'Far post'),
    them('gk', 'GK', 19.5, 33.6, 'Their keeper, near post'),
  ],
  ball: { owner: 'lw' }, passageSeconds: 0.8, playSeconds: 3.6,
  options: [
    opt('cut', 'pass', 'Cut it back to the 8', p(24, 26.5), 'eight'),
    opt('near', 'pass', 'Near post to the 9', p(18, 30.5), 'nine'),
    opt('far', 'pass', 'Far post to the RW', p(30, 30), 'rw', true),
    opt('recycle', 'pass', 'Play it back to the LB', p(6, 20), 'lb'),
  ],
  cue: {
    teaches: 'Compare cutback, near-post pass, far-post delivery',
    question: 'You are at the byline. Where does it go?',
    cues: ['Their 6 is not in the cutback lane.', 'Their CB is on our 9.', 'Their LB is a step from our RW.'],
    grades: {
      cut: grade('good', 'goal', ['The cutback lane was empty and the 8 arrived in it.'], { then: [{ at: 0, from: 'eight', kind: 'shoot', point: p(26, SHOT_Y) }] }),
      near: grade('poor', 'lost', ['Their CB was on our 9 at the near post.'], { stoppedBy: 'ocb' }),
      far: grade('ok', 'kept', ['It reached him, but the cutback was clearer.']),
      recycle: grade('ok', 'kept', ['Safe, but a free lane was there.']),
    },
  },
  counter: {
    teaches: 'Cancel delivery when every arrival lane is covered',
    moves: { o6: p(23, 26), olb: p(30.6, 30.6) },
    question: 'You are at the byline. Where does it go?',
    cues: ['Their 6 has dropped into the cutback lane.', 'Their CB and LB are tight on our 9 and RW.'],
    grades: {
      cut: grade('poor', 'lost', ['Their 6 had dropped into the cutback lane.'], { stoppedBy: 'o6' }),
      near: grade('poor', 'lost', ['Their CB was on our 9.'], { stoppedBy: 'ocb' }),
      far: grade('poor', 'lost', ['Their LB was tight on our RW.'], { stoppedBy: 'olb' }),
      recycle: grade('good', 'kept', ['Every lane was covered: keeping it to go again was right.']),
    },
  },
};

const NINE01: Fixture = {
  id: 'NINE01', seed: 'NINE01', version: 1, goal: 'theirs', phase: 'attack', focal: '9', human: 'nine',
  title: 'Our 8 carries through the middle',
  objective: 'Threaten depth when the 8 can play you; check short when the midfield has no connection.',
  trigger: 'Our 8 is carrying centrally toward their back line.',
  why: 'Our 8 carries; their CBs are the line you play on; their 6 and 8 decide whether our 8 can pass. Wide players are not involved.',
  actors: [
    us('nine', '9', 22, 25, 'Between their CBs'),
    us('eight', '8', 22, 13, 'Carries forward', p(22, 15)),
    them('ocb1', 'CB', 18, 27, 'Left CB'),
    them('ocb2', 'CB', 27, 27, 'Right CB'),
    them('o6', '6', 26, 20, 'Holding midfielder'),
    them('gk', 'GK', CX, 33.4, 'Their keeper'),
  ],
  ball: { owner: 'eight' }, passageSeconds: 1, playSeconds: 3.6,
  options: [
    opt('depth', 'run', 'Run in behind', p(21.5, 31)),
    opt('short', 'support', 'Check short to the side', p(27, 16.5)),
    opt('pin', 'hold', 'Stay between the CBs', p(22, 25)),
  ],
  cue: {
    teaches: 'Pin a defender or threaten depth',
    question: 'Our 8 has the ball and time. What do you do?',
    cues: ['Our 8 has time and no one in front of him.', 'There is space behind their CBs.'],
    grades: {
      depth: grade('good', 'progressed', ['Our 8 had time to play it: your run behind gave him the pass.'], { then: [{ at: 0.5, from: 'eight', kind: 'pass', to: 'nine' }] }),
      short: grade('poor', 'lost', ['Coming short brought you into their 6.'], { stoppedBy: 'o6', then: [{ at: 0.5, from: 'eight', kind: 'pass', to: 'nine' }] }),
      pin: grade('ok', 'kept', ['Pinning them kept their CBs back, but the run was on.']),
    },
  },
  counter: {
    teaches: 'Check short if midfield lacks a playable connection',
    moves: { o6: p(22, 17) },
    passage: { o6: p(22, 15.5) },
    question: 'Their 6 has stepped onto our 8. What do you do?',
    cues: ['Their 6 is right in front of our 8.', 'There is space to the side of him.'],
    grades: {
      depth: grade('poor', 'lost', ['Our 8 was under pressure: he could not play the pass behind.'], { stoppedBy: 'o6', then: [{ at: 0.5, from: 'eight', kind: 'pass', to: 'nine' }] }),
      short: grade('good', 'kept', ['Our 8 was under pressure: checking short gave him a pass.'], { then: [{ at: 0.8, from: 'eight', kind: 'pass', to: 'nine' }] }),
      pin: grade('poor', 'kept', ['Staying up left our 8 with no pass.']),
    },
  },
};

const NINE02: Fixture = {
  id: 'NINE02', seed: 'NINE02', version: 1, goal: 'theirs', phase: 'attack', focal: '9', human: 'nine',
  title: 'Back to goal',
  objective: 'Protect it and lay it off to a teammate facing play; turn only if the defender over-commits.',
  trigger: 'You have received with your back to goal.',
  why: 'Their CB is on your back; our 8 faces play for the lay-off; their other CB and keeper decide whether a turn can score.',
  actors: [
    us('nine', '9', 22, 26, 'Back to goal with the ball'),
    us('eight', '8', 26, 19, 'Facing play'),
    them('ocb1', 'CB', 22, 27.4, 'Tight behind you'),
    them('ocb2', 'CB', 29, 28, 'Second CB'),
    them('o6', '6', 18, 21, 'Midfielder'),
    them('gk', 'GK', CX, 33.4, 'Their keeper'),
  ],
  ball: { owner: 'nine' }, passageSeconds: 0.8, playSeconds: 2.8,
  options: [
    opt('lay', 'pass', 'Lay it off to the 8', p(26, 19), 'eight'),
    opt('turn', 'carry', 'Turn him', p(19, 30.5)),
    opt('shield', 'hold', 'Shield it', p(22, 26)),
  ],
  cue: {
    teaches: 'Protect and lay off to a facing teammate',
    question: 'Their CB is tight behind you. What do you do?',
    cues: ['Their CB is touching tight.', 'Our 8 is facing play and free.'],
    grades: {
      lay: grade('good', 'kept', ['He was tight, so the lay-off to a teammate facing play kept it.']),
      turn: grade('poor', 'lost', ['He was tight: turning went into him.'], { tackle: ['ocb1'], responses: { ocb1: p(19.7, 29.4) } }),
      shield: grade('ok', 'kept', ['Shielding kept it, but the lay-off was there.']),
    },
  },
  counter: {
    teaches: 'Turn if defender overcommits and space opens',
    moves: { ocb1: p(24.4, 26.6) },
    passage: { ocb1: p(24.2, 25.4) },
    question: 'Their CB has jumped around your right side. What do you do?',
    cues: ['Their CB has come around one side.', 'Space has opened on your left toward goal.'],
    grades: {
      lay: grade('ok', 'kept', ['Safe, but he had over-committed and the turn was on.']),
      turn: grade('good', 'goal', ['He over-committed, so turning away from him opened the goal.'], { noTackle: true, then: [{ at: 0.9, from: 'nine', kind: 'shoot', point: p(20.6, SHOT_Y) }] }),
      shield: grade('poor', 'kept', ['Shielding wasted the space he left.']),
    },
  },
};

const NINE03: Fixture = {
  id: 'NINE03', seed: 'NINE03', version: 1, goal: 'theirs', phase: 'attack', focal: '9', human: 'nine',
  title: 'Run in behind',
  objective: 'Curve your run and time it to the passer; wait when the passer is under pressure.',
  trigger: 'Our 8 has the ball facing forward.',
  why: 'Our 8 is the passer; their CBs hold the line; their 6 decides whether our 8 can play. The keeper decides how far the ball can go.',
  actors: [
    us('nine', '9', 22, 25, 'On their back line'),
    us('eight', '8', 25, 15, 'Has the ball'),
    them('ocb1', 'CB', 19, 26.5, 'Left CB'),
    them('ocb2', 'CB', 26, 26.5, 'Right CB'),
    them('o6', '6', 22, 20, 'Holding midfielder'),
    them('gk', 'GK', CX, 33.4, 'Their keeper'),
  ],
  ball: { owner: 'eight' }, passageSeconds: 0.8, playSeconds: 3.6,
  options: [
    opt('curve', 'run', 'Curve your run behind', p(30, 31)),
    opt('straight', 'run', 'Run straight through the middle', p(22, 31)),
    opt('wait', 'hold', 'Wait on the line', p(22, 25)),
  ],
  cue: {
    teaches: 'Curve run and time acceleration',
    question: 'Our 8 is facing forward with time. What do you do?',
    cues: ['Our 8 has time and his head up.', 'There is space behind their right CB.'],
    grades: {
      curve: grade('good', 'progressed', ['The passer was ready: a curved run kept you onside and away from the CBs.'], { then: [{ at: 0.4, from: 'eight', kind: 'pass', to: 'nine' }] }),
      straight: grade('ok', 'lost', ['The run was on, but straight through the middle took you between both CBs.'], { stoppedBy: 'ocb1', then: [{ at: 0.4, from: 'eight', kind: 'pass', to: 'nine' }] }),
      wait: grade('poor', 'kept', ['The passer was ready and you did not go.']),
    },
  },
  counter: {
    teaches: 'Delay when passer is pressured or not ready',
    moves: { o6: p(25.5, 16.4) },
    question: 'Their 6 is on our 8. What do you do?',
    cues: ['Their 6 is right on our 8.'],
    grades: {
      curve: grade('poor', 'lost', ['Our 8 was under pressure and could not play it.'], { stoppedBy: 'o6', then: [{ at: 0.4, from: 'eight', kind: 'pass', to: 'nine' }] }),
      straight: grade('poor', 'lost', ['Our 8 was under pressure and could not play it.'], { stoppedBy: 'o6', then: [{ at: 0.4, from: 'eight', kind: 'pass', to: 'nine' }] }),
      wait: grade('good', 'kept', ['Our 8 was pressured: waiting kept your run for when he was ready.']),
    },
  },
};

const NINE04: Fixture = {
  id: 'NINE04', seed: 'NINE04', version: 1, goal: 'theirs', phase: 'defend', focal: '9', human: 'nine',
  title: 'Pressing their build-up',
  objective: 'Curve your press so it cuts off a pass; recover when the ball has already gone past you.',
  trigger: 'Their CB has the ball in their half.',
  why: 'Their CB has it; their 6 is the pass you cut off; their other CB is the switch. Our 8 is the next presser.',
  actors: [
    us('nine', '9', 22, 18, 'First presser'),
    us('eight', '8', 27, 14, 'Second presser'),
    them('ocb1', 'CB', 15, 27, 'Has the ball'),
    them('ocb2', 'CB', 30, 27, 'Other CB'),
    them('o6', '6', 21, 22.5, 'Pivot'),
    them('gk', 'GK', CX, 32.5, 'Their keeper'),
  ],
  ball: { owner: 'ocb1' }, passageSeconds: 0.8, playSeconds: 3.4,
  options: [
    opt('curve', 'screen', 'Curve your press to cut out their 6', p(18.6, 23.8)),
    opt('straight', 'press', 'Run straight at the CB', p(15, 27), 'ocb1'),
    opt('stay', 'hold', 'Stay where you are', p(22, 18)),
    opt('recover', 'recover', 'Sprint back behind the ball', p(20.5, 14.2)),
  ],
  cue: {
    teaches: 'Curve press to remove a return or pivot lane',
    question: 'Their CB has the ball. How do you press?',
    cues: ['Their 6 is the easy pass inside.', 'Their CB is facing up the touchline side.'],
    grades: {
      curve: grade('good', 'regained', ['Curving your run cut out their 6, so the pass inside was ours.'], { then: [{ at: 0.9, from: 'ocb1', kind: 'pass', to: 'o6' }] }),
      straight: grade('poor', 'delayed', ['Running straight left the pass inside to their 6 open.'], { noTackle: true, then: [{ at: 0.6, from: 'ocb1', kind: 'pass', to: 'o6' }] }),
      stay: grade('poor', 'delayed', ['Standing still let them play out.'], { then: [{ at: 0.6, from: 'ocb1', kind: 'pass', to: 'o6' }] }),
      recover: grade('poor', 'delayed', ['Nothing had gone past you yet: dropping let them play out.'], { then: [{ at: 0.6, from: 'ocb1', kind: 'pass', to: 'o6' }] }),
    },
  },
  counter: {
    teaches: 'Recover if the first line is bypassed',
    ball: { owner: 'o6' },
    moves: { o6: p(20, 17), nine: p(19, 21) },
    question: 'Their 6 already has it behind you. What do you do?',
    cues: ['The ball is already past you.', 'Our 8 is the next defender.'],
    grades: {
      curve: grade('poor', 'delayed', ['The ball had gone past you: pressing their CB did nothing.']),
      straight: grade('poor', 'delayed', ['The ball had gone past you: pressing their CB did nothing.'], { noTackle: true }),
      stay: grade('ok', 'delayed', ['Better than pressing, but you could have helped behind the ball.']),
      recover: grade('good', 'regained', ['The press was bypassed: recovering behind the ball helped our 8 win it.'], { tackle: ['eight'], responses: { eight: p(20, 17) } }),
    },
  },
};

const AT02: Fixture = {
  id: 'AT02', seed: 'AT02', version: 1, goal: 'theirs', phase: 'transition', focal: 'RW', human: 'rw',
  title: '3v2 break: the supporting runner',
  objective: 'Separate your lane from the carrier and time your arrival so you stay a useful option.',
  trigger: 'Our 8 is breaking with us against two of theirs.',
  why: 'Our 8 carries; our 9 is the other runner; their two CBs and keeper are all the defence there is. Everyone else is behind the ball.',
  offscreen: 'Their midfield is still behind halfway.',
  actors: [
    us('rw', 'RW', 30, 10, 'Supporting runner'),
    us('eight', '8', 22, 12, 'Carries the break', p(22, 15)),
    us('nine', '9', 15, 14, 'Other runner'),
    them('ocb1', 'CB', 19, 24, 'Retreating CB'),
    them('ocb2', 'CB', 25, 24, 'Retreating CB'),
    them('gk', 'GK', CX, 33.4, 'Their keeper'),
  ],
  ball: { owner: 'eight' }, passageSeconds: 1, playSeconds: 3.6,
  options: [
    opt('lane', 'run', 'Run in a wide lane', p(35, 22)),
    opt('close', 'support', 'Run close to the 8', p(25, 17)),
    opt('ahead', 'run', 'Sprint ahead into the CB', p(26, 23)),
  ],
  cue: {
    teaches: 'Separate useful passing lanes and coordinate arrival with the carrier',
    question: 'It is 3 against 2. Where do you run?',
    cues: ['Their right CB is inside.', 'The right lane is empty.'],
    grades: {
      lane: grade('good', 'progressed', ['A separate lane stretched their two CBs and gave the 8 a pass.'], { then: [{ at: 0.9, from: 'eight', kind: 'pass', to: 'rw' }] }),
      close: grade('poor', 'kept', ['Running close let one CB defend both of you.'], { then: [{ at: 0.9, from: 'eight', kind: 'pass', to: 'rw' }] }),
      ahead: grade('poor', 'lost', ['Running ahead into the CB took you out of the passing lane.'], { stoppedBy: 'ocb2', then: [{ at: 0.9, from: 'eight', kind: 'pass', to: 'rw' }] }),
    },
  },
  counter: {
    teaches: 'Level support can be valid; reject only spacing/timing that removes a useful option',
    moves: { ocb2: p(32, 22) },
    question: 'Their right CB has gone wide to your lane. Where do you run?',
    cues: ['Their right CB has moved out wide.', 'The space inside him is open.'],
    grades: {
      lane: grade('poor', 'lost', ['Their CB was already in the wide lane.'], { stoppedBy: 'ocb2', then: [{ at: 0.9, from: 'eight', kind: 'pass', to: 'rw' }] }),
      close: grade('good', 'kept', ['Level, inside support was valid: their CB had gone wide.'], { then: [{ at: 0.9, from: 'eight', kind: 'pass', to: 'rw' }] }),
      ahead: grade('ok', 'progressed', ['The run inside him was on, but it was early.'], { then: [{ at: 0.9, from: 'eight', kind: 'pass', to: 'rw' }] }),
    },
  },
};

const SP01: Fixture = {
  id: 'SP01', seed: 'SP01', version: 1, goal: 'theirs', phase: 'set-piece', focal: 'LW', human: 'lw',
  title: 'Throw-in receiver',
  objective: 'Check away and come back to give the thrower a legal angle; switch receiver if your marker follows tight.',
  trigger: 'Our LB is about to take a throw-in.',
  why: 'Our LB throws; you and our 8 are the receivers; their RB and 8 are the markers.',
  actors: [
    us('lw', 'LW', 5, 22, 'Throw-in receiver'),
    us('lb', 'LB', 0.3, 17, 'Takes the throw'),
    us('eight', '8', 10, 15, 'Second receiver'),
    them('orb', 'RB', 5.5, 24.5, 'Marks you'),
    them('o8', '8', 14, 19, 'Marks our 8 loosely'),
  ],
  ball: { owner: 'lb' }, passageSeconds: 0.6, playSeconds: 2.8,
  options: [
    opt('short', 'short', 'Come back to the thrower', p(3.5, 18.5)),
    opt('clear', 'run', 'Run down the line to clear the space', p(4, 28)),
    opt('stay', 'hold', 'Stay where you are', p(5, 22)),
  ],
  cue: {
    teaches: 'Check away, return and offer a legal angle',
    question: 'Our LB is ready to throw. What do you do?',
    cues: ['Their RB is two and a half metres off you.'],
    grades: {
      short: grade('good', 'kept', ['He was off you, so coming back gave the LB a clean throw.'], { then: [{ at: 0.7, from: 'lb', kind: 'pass', to: 'lw' }] }),
      clear: grade('ok', 'kept', ['It made room for our 8, but you were the free one.'], { responses: { orb: p(5, 29) }, then: [{ at: 0.9, from: 'lb', kind: 'pass', to: 'eight' }] }),
      stay: grade('poor', 'kept', ['Standing still gave the thrower no angle.']),
    },
  },
  counter: {
    teaches: 'Switch receiver if marker follows tightly',
    moves: { orb: p(5.2, 22.9) },
    question: 'Their RB is right on you. What do you do?',
    cues: ['Their RB is touching tight.', 'Our 8 has space.'],
    grades: {
      short: grade('poor', 'lost', ['He was tight and followed you: the throw to you was cut out.'], { stoppedBy: 'orb', responses: { orb: p(3.6, 19.4) }, then: [{ at: 0.7, from: 'lb', kind: 'pass', to: 'lw' }] }),
      clear: grade('good', 'kept', ['He followed you, so clearing the space gave our 8 the throw.'], { responses: { orb: p(5, 28.5) }, then: [{ at: 0.9, from: 'lb', kind: 'pass', to: 'eight' }] }),
      stay: grade('poor', 'kept', ['Standing still gave the thrower no angle.']),
    },
  },
};

const DEF01: Fixture = {
  id: 'DEF01', seed: 'DEF01', version: 1, goal: 'ours', phase: 'defend', focal: 'LB', human: 'lb',
  title: 'Their winger takes a heavy touch',
  objective: 'Press the moment he loses control; stay on your feet if he has it back first.',
  trigger: 'Their RW has just received on our left.',
  why: 'Their RW is the receiver; their 8 is his support; our CB covers inside you. The far side is not involved.',
  actors: [
    us('lb', 'LB', 36.5, 20, 'First defender'),
    us('cb', 'CB', 26, 25, 'Covers inside'),
    them('orw', 'RW', 36, 13, 'Receives'),
    them('o8', '8', 27, 9, 'Support'),
    us('gk', 'GK', CX, 33.6, 'Our keeper'),
  ],
  ball: { at: p(36.2, 16.4) }, passageSeconds: 0.5, playSeconds: 2.6,
  options: [
    opt('press', 'press', 'Go for the ball', p(36.2, 16.4)),
    opt('jockey', 'delay', 'Close him down and stay on your feet', p(36, 18)),
    opt('drop', 'delay', 'Drop off', p(36, 24)),
  ],
  cue: {
    teaches: 'Press on observable loss of control',
    question: 'His touch has run away from him. What do you do?',
    cues: ['The ball is closer to you than to him.'],
    grades: {
      press: grade('good', 'regained', ['His touch got away: the ball was closer to you, so you won it.'], { responses: { orw: p(36.1, 15.5) } }),
      jockey: grade('ok', 'delayed', ['Safe, but the ball was there to win.'], { responses: { orw: p(36.1, 15.5) } }),
      drop: grade('poor', 'delayed', ['Dropping off gave back a ball you could have won.'], { responses: { orw: p(36.1, 15.5) } }),
    },
  },
  counter: {
    teaches: 'Abandon tackle if opponent regains control first',
    ball: { owner: 'orw' },
    moves: { orw: p(36, 15.5) },
    question: 'He has the ball under control. What do you do?',
    cues: ['He has it back under control, facing you.'],
    grades: {
      press: grade('poor', 'beaten', ['He had it under control: diving in let him go past.'], { noTackle: true, responses: { orw: p(33, 25) } }),
      jockey: grade('good', 'delayed', ['He had control, so staying on your feet kept you in front of him.'], { responses: { orw: p(36.5, 17) } }),
      drop: grade('ok', 'delayed', ['You stayed in front, but gave him a lot of room.'], { responses: { orw: p(36, 20) } }),
    },
  },
};

export const FRONT_FIXTURES: readonly Fixture[] = [WING01, WING02, WING03, WING04, NINE01, NINE02, NINE03, NINE04, AT02, SP01, DEF01];
