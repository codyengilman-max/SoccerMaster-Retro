/**
 * Story facts read from real records only (owner directive, 2026-10-20). Choices and intentions never
 * count as completed training, and missing records are never treated as proof of inactivity.
 */
import { activityById } from '../career/catalog';
import { sectionOf } from '../career/ballMastery';
import { CAREER_CONFIG } from '../career/config';
import { DEV_CONFIG } from '../career/development';
import type { CareerSave } from '../career/state';
import { seasonWeek } from '../season/calendar';
import type { CompetitorId } from '../jungle/sim';

export type HomeLearningDetail = 'completed' | 'partial' | 'none' | 'unknown';
export type TrainingLogDetail = 'above' | 'below' | 'within' | 'unknown';

/** Last week's home learning, from its saved week review: planned sessions actually completed. */
export function homeLearningDetail(save: CareerSave): HomeLearningDetail {
  const h = save.history.find((r) => r.week === save.week - 1);
  if (!h) return 'unknown';
  if (h.sessionsCompleted >= CAREER_CONFIG.home.sessionsPerWeek) return 'completed';
  if (h.sessionsCompleted > 0) return 'partial';
  // Zero completions only counts as "not done" when a focus (an assignment) was actually set that week.
  return h.focusId !== null ? 'none' : 'unknown';
}

/** This week's training log against the plan: extra practice on top of the planned sessions is "above". */
export function trainingLogDetail(save: CareerSave): TrainingLogDetail {
  const planned = save.completedSessions.length;
  // Uncredited, not skipped: extra practice (including a repeat of a session that already counted).
  const extra = save.journal.filter((j) => j.week === save.week && !j.credited && j.completion !== 'skipped').length;
  if (planned === 0 && extra === 0) return 'unknown';
  if (planned < CAREER_CONFIG.home.sessionsPerWeek) return 'below';
  return extra > 0 ? 'above' : 'within';
}

/** Jungle Ball as a story result: the player's own score against Blake's, from the saved round. */
export function jungleResult(scores: Readonly<Record<CompetitorId, number>> | undefined): 'WIN' | 'DRAW' | 'LOSS' | null {
  if (!scores || !Number.isInteger(scores.player) || !Number.isInteger(scores.blake)) return null;
  return scores.player > scores.blake ? 'WIN' : scores.player < scores.blake ? 'LOSS' : 'DRAW';
}

/**
 * Week 4's school-activity +1/−1 "overall attribute point". The game has no overall rating and neither
 * minigame defines strong/poor bands, so the rule stays unconfigured (owner decision pending) and the
 * activity records 'unconfigured' with no attribute change.
 */
export const SCHOOL_REWARD_RULE: null = null;
export const schoolRewardDetail = (): 'unconfigured' => 'unconfigured';

export interface HomeAssignments {
  readonly juggling: boolean;
  readonly firstTouch: boolean;
  readonly complete: boolean;
}

/**
 * V3 home menu (week 5+): the required juggling task and control/first-touch work for this career week,
 * from logged "done" journal entries only (scheduled or extra; an easier variant still counts). Story
 * choices and session counts in another focus never satisfy it.
 */
export function homeAssignments(save: CareerSave): HomeAssignments {
  const done = (family: string): boolean =>
    save.journal.some((j) => j.week === save.week && j.completion === 'done' && activityById(j.activityId)?.skillFamilyId === family);
  const juggling = done('juggling');
  const firstTouch = done('firstTouch');
  return { juggling, firstTouch, complete: juggling && firstTouch };
}

export type HomeSkill = 'firstTouch' | 'passing';

export interface WeekAssignments {
  readonly juggling: boolean;
  /** The week's assigned skill work: control/first touch (weeks 5-6) or control/passing (week 7). */
  readonly skill: HomeSkill;
  readonly skillDone: boolean;
  /** Assigned home learning (weeks 6+): this week's planned home sessions all completed; null when not assigned. */
  readonly learning: boolean | null;
  /** Practices logged as done this week (Juggling or Ball Mastery); from Week 6 three of them meet Home learning. */
  readonly practices: number;
  readonly complete: boolean;
}

/** The week's required home training (owner scripts): week 5 juggling + first touch; 6 adds home learning; 7 swaps in passing. */
export function weekAssignments(save: CareerSave, storyWeek: number): WeekAssignments {
  const done = (family: string): boolean =>
    save.journal.some((j) => j.week === save.week && j.completion === 'done' && activityById(j.activityId)?.skillFamilyId === family);
  const doneIn = (section: 'ballMastery'): boolean =>
    save.journal.some((j) => {
      const a = j.week === save.week && j.completion === 'done' ? activityById(j.activityId) : undefined;
      return a !== undefined && sectionOf(a) === section;
    });
  const skill: HomeSkill = storyWeek >= 7 ? 'passing' : 'firstTouch';
  const juggling = done('juggling');
  // Ball Mastery is one guided curriculum with no skill chooser, so its assigned lesson also meets the skill task.
  const skillDone = done(skill) || doneIn('ballMastery');
  const n = CAREER_CONFIG.home.sessionsPerWeek;
  const practices = save.journal.filter((j) => j.week === save.week && j.completion === 'done').length;
  // Home Training no longer offers a weekly focus plan, so logged practices also meet Home learning; a save that
  // already finished its planned sessions keeps that. Nothing is ticked without a real log.
  const learning = storyWeek >= 6 ? save.completedSessions.length >= n || practices >= n : null;
  return { juggling, skill, skillDone, learning, practices, complete: juggling && skillDone && learning !== false };
}

export interface HomeTask {
  readonly key: 'juggling' | HomeSkill | 'learning';
  readonly label: string;
  /** Short button label in Home Training. */
  readonly short: string;
  readonly done: boolean;
}

/** The week's required home tasks, in the order the home menu and Home Training list them. */
export function homeTasks(a: WeekAssignments): readonly HomeTask[] {
  return [
    { key: 'juggling', label: 'Juggling task', short: 'Juggling', done: a.juggling },
    a.skill === 'passing'
      ? { key: 'passing', label: 'Control and passing work', short: 'Passing', done: a.skillDone }
      : { key: 'firstTouch', label: 'Control and first-touch work', short: 'First touch', done: a.skillDone },
    ...(a.learning === null ? [] : [{ key: 'learning' as const, label: `Home learning (log ${CAREER_CONFIG.home.sessionsPerWeek} practices this week, ${Math.min(a.practices, CAREER_CONFIG.home.sessionsPerWeek)} of ${CAREER_CONFIG.home.sessionsPerWeek})`, short: 'Home learning', done: a.learning }]),
  ];
}

/**
 * Week 7 home menu: Riley's showcase request as saved availability, never a commitment. The script gives
 * no showcase time, so none is shown or invented, and nothing can conflict with training.
 */
export function rileyLine(storyWeek: number, choice: string | undefined): string {
  if (storyWeek !== 7 || (choice !== 'check_training' && choice !== 'show_time')) return '';
  const asked = choice === 'check_training' ? 'help set up' : 'come to the show';
  return `\nRiley's showcase (Friday): you said you'd check whether you can ${asked}. Riley hasn't sent the time yet, so nothing is confirmed.`;
}

/** This week's competition from the Season One calendar, in the words the weekly home screen uses. */
export function weekCompetition(storyWeek: number): string {
  const w = seasonWeek(storyWeek);
  if (!w) return 'No match this week';
  if (w.tournament === 'az_showcase') return 'AZ Showcase tournament this week (league points unchanged)';
  if (w.tournament === 'holiday_classic') return 'Holiday Classic tournament this week (league points unchanged)';
  if (w.leagueGame !== null) return `League game ${w.leagueGame} of 12 this week`;
  if (w.friendly) return 'Friendly this week (no league points)';
  return 'No match this week';
}

export interface HomeBoard {
  readonly week: number;
  readonly tasks: readonly HomeTask[];
  /** The THIS SEASON panel (league, rankings, next league opponent) or '' while it loads. */
  readonly season: string;
  readonly competition: string;
  readonly overall: number | null;
  /** Short screens (phone landscape): fewer, longer lines so the board clears the buttons. */
  readonly compact?: boolean;
}

/** The weekly home screen text: next step first, then competition, player development and team progress. */
export function homeBoard(b: HomeBoard): string {
  const next = b.tasks.find((t) => !t.done);
  const season = b.season.split('\n').filter((l) => l && l !== 'THIS SEASON');
  if (b.compact) {
    return [
      `WEEK ${b.week} · NEXT: ${next ? next.label : 'home training done. Tap Continue Week.'}`,
      `HOME TRAINING: ${b.tasks.map((t) => `${t.done ? '✓' : '○'} ${t.short}`).join(' · ')}`,
      `THIS WEEK: ${b.competition}${b.overall === null ? '' : ` · MY PLAYER: ${b.overall.toFixed(1)} of ${DEV_CONFIG.seasonOneCap} max`}`,
      `TEAM: ${season.length ? season.join(' · ') : 'loading saved results...'}`,
    ].join('\n');
  }
  return [
    `WEEK ${b.week} · HOME`,
    next ? `NEXT: ${next.label}` : 'NEXT: home training done. Tap Continue Week.',
    `HOME TRAINING: ${b.tasks.map((t) => `${t.done ? '✓' : '○'} ${t.short}`).join(' · ')}`,
    `THIS WEEK: ${b.competition}`,
    ...(b.overall === null ? [] : [`MY PLAYER: overall ${b.overall.toFixed(1)} (Season 1 maximum ${DEV_CONFIG.seasonOneCap})`]),
    ...(season.length ? [`TEAM: ${season.join('\n')}`] : ['TEAM: loading saved results...']),
  ].join('\n');
}
