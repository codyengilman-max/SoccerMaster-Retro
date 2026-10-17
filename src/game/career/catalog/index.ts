import type { Activity, FocusDef, SourceId } from '../types';
import { AWARENESS } from './awareness';
import { DEFENDING } from './defending';
import { DRIBBLING } from './dribbling';
import { FINISHING } from './finishing';
import { FIRST_TOUCH } from './firstTouch';
import { JUGGLING } from './juggling';
import { PASSING } from './passing';
import { DRAFT_ACTIVITIES } from '../curriculum/drafts';

/** Official pages checked (HTTP 200, relevant content) before attribution. Activities are original adaptations. */
export const SOURCES: Readonly<Record<SourceId, { readonly title: string; readonly url: string }>> = {
  'fifa-first-touch': { title: 'FIFA Training Centre: Directing the ball with the first touch', url: 'https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/directing-the-ball-with-the-first-touch.php' },
  'fifa-passing-receiving': { title: 'FIFA Training Centre: John Peacock, passing and receiving', url: 'https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/john-peacock-passing-and-receiving.php' },
  'fifa-ball-control': { title: 'FIFA Training Centre: Mastering ball control', url: 'https://www.fifatrainingcentre.com/en/practice/elite-sessions/in-possession/mastering-ball-control.php' },
  'ef-1v1-defending': { title: 'England Football Learning: 1v1 emergency defending', url: 'https://learn.englandfootball.com/sessions/resources/2022/1v1-emergency-defending' },
  'ef-take-a-picture': { title: 'England Football Learning: Receiving skills, take a picture', url: 'https://learn.englandfootball.com/sessions/resources/2022/Receiving-skills-take-a-picture' },
};

export const CORE_ACTIVITIES: readonly Activity[] = [...FIRST_TOUCH, ...PASSING, ...DRIBBLING, ...FINISHING, ...DEFENDING, ...AWARENESS];
export const JUGGLING_LADDER: readonly Activity[] = JUGGLING;
export const ALL_ACTIVITIES: readonly Activity[] = [...CORE_ACTIVITIES, ...JUGGLING];

/** Everything a plan, swap or journal entry may reference: the 92 originals plus the owner-enabled v1.1 drafts. */
export const HOME_ACTIVITIES: readonly Activity[] = [...ALL_ACTIVITIES, ...DRAFT_ACTIVITIES];

const byId = new Map(HOME_ACTIVITIES.map((a) => [a.id, a]));
export function activityById(id: string): Activity | undefined {
  return byId.get(id);
}

export const FOCUSES: readonly FocusDef[] = [
  { id: 'ft-cushion', family: 'firstTouch', label: 'Soft first touch', why: 'Keep the ball close when it arrives.' },
  { id: 'ft-directional', family: 'firstTouch', label: 'Directional first touch', why: 'Use the first touch to move the ball where you want to go next.' },
  { id: 'ft-receive-play', family: 'firstTouch', label: 'Receive to play', why: 'Set the ball up for your next action.' },
  { id: 'ps-accuracy', family: 'passing', label: 'Accurate ground passes', why: 'Hit the target along the ground.' },
  { id: 'ps-weight', family: 'passing', label: 'Pass weight', why: 'Make the ball arrive at the right speed.' },
  { id: 'ps-on-the-move', family: 'passing', label: 'Passing on the move', why: 'Pass without stopping the ball first.' },
  { id: 'dr-close-control', family: 'dribbling', label: 'Close control', why: 'Keep the ball near you while moving.' },
  { id: 'dr-change-direction', family: 'dribbling', label: 'Changing direction', why: 'Cut and turn away from trouble.' },
  { id: 'dr-change-pace', family: 'dribbling', label: 'Changing pace', why: 'Slow down and speed up with the ball.' },
  { id: 'dr-moves', family: 'dribbling', label: 'Moves and feints', why: 'Learn the shape of common moves.' },
  { id: 'fn-placement', family: 'finishing', label: 'Placement', why: 'Aim along the ground, not power.' },
  { id: 'fn-moving-ball', family: 'finishing', label: 'Striking a moving ball', why: 'Clean contact on a rolling ball. Needs a safe striking area.' },
  { id: 'fn-angles', family: 'finishing', label: 'Angles and set-ups', why: 'Set up and place from different angles. Needs a safe striking area.' },
  { id: 'df-stance', family: 'defending', label: 'Defending stance', why: 'Balanced and ready to move.' },
  { id: 'df-approach', family: 'defending', label: 'Approach', why: 'Close space without diving in.' },
  { id: 'df-recovery', family: 'defending', label: 'Recovery runs', why: 'Get back goal-side.' },
  { id: 'df-regain', family: 'defending', label: 'Win it and play', why: 'Secure a loose ball and use it.' },
  { id: 'aw-scan', family: 'awareness', label: 'Scanning habit', why: 'Look up and around while you play.' },
  { id: 'aw-memory', family: 'awareness', label: 'Picture and plan', why: 'Remember what you saw and act on it.' },
  { id: 'aw-cues', family: 'awareness', label: 'Reacting to cues', why: 'Change your plan when something changes.' },
  { id: 'jg-ladder', family: 'juggling', label: 'Juggling ladder', why: 'Ball feel in the air. Grows no game attribute.' },
];

export function focusById(id: string): FocusDef | undefined {
  return FOCUSES.find((f) => f.id === id);
}

/** Distinct exercise families after grouping equivalent entries. */
export function distinctGroups(list: readonly Activity[] = ALL_ACTIVITIES): number {
  return new Set(list.map((a) => a.variantGroupId)).size;
}
