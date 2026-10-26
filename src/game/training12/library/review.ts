/**
 * Review state of each library card. A card is APPROVED only with a validated numeric scene and a sign-off on the
 * exact card, rules profile and scene hashes, with the library's local rules verified. Anything else fails closed
 * with the exact blockers. Framework-free.
 */
import { LIBRARY, LIBRARY_CARDS, LIBRARY_PITCH, LIBRARY_RETIRED_IDS, LIBRARY_ROSTERS } from './tacticalLibrary.generated';
import { fixtureMatchesScene } from './fixtureCheck';
import { contentSha256 } from './sha256';
import type { LibraryCard, LibraryPitch, LibraryScene, NumericScene, Review, Signoff } from './types';

/** Reviewed scenes by card ID. Empty: no card has a numeric scene yet (every card's numeric_scene is null). */
export const LIBRARY_SCENES: Readonly<Record<string, LibraryScene>> = {};
/** Coach Cody's sign-offs. Empty: nothing is approved. */
export const SIGNOFFS: readonly Signoff[] = [];

export interface ReviewOpts {
  readonly cards?: readonly LibraryCard[];
  readonly scenes?: Readonly<Record<string, LibraryScene>>;
  readonly signoffs?: readonly Signoff[];
  readonly pitch?: LibraryPitch;
  readonly rulesSha256?: string;
  /** Proves the playable fixture implements the signed numeric scene; returns problems. Default fixtureMatchesScene. */
  readonly fixtureCheck?: (scene: LibraryScene) => string[];
}

/** SHA-256 of the rules profile a sign-off covers: the pitch proposal actually in force plus the two rosters. */
export const rulesSha256 = (pitch: LibraryPitch = LIBRARY_PITCH): string => contentSha256({ pitch_proposal: pitch, rosters: LIBRARY_ROSTERS });

export const sceneSha256 = (s: LibraryScene): string => contentSha256(s);

export function cardById(id: string, cards: readonly LibraryCard[] = LIBRARY_CARDS): LibraryCard | null {
  return cards.find((c) => c.id === id) ?? null;
}

/** The protagonist, required actors and ball must be on the pitch and inside the freeze's view. */
function freezeProblems(card: LibraryCard, num: NumericScene, label: string): string[] {
  const p: string[] = [];
  const tag = label === 'cue' ? card.id : `${card.id} (${label})`;
  const { min, max } = num.view;
  const inView = (v: { x: number; y: number }): boolean => v.x >= min.x && v.x <= max.x && v.y >= min.y && v.y <= max.y;
  const need = new Set([...card.required_visible_actor_ids, card.protagonist]);
  if (label === 'cue') need.add(card.ball_owner_at_freeze);
  for (const id of need) {
    const a = num.actors.find((x) => x.id === id);
    if (!a) p.push(`${tag}: required actor ${id} is not shown.`);
    else if (!inView(a.pos)) p.push(`${tag}: required actor ${id} is outside the ${num.view.kind} view.`);
  }
  if (!inView(num.ball.pos)) p.push(`${tag}: the ball is outside the ${num.view.kind} view.`);
  return p;
}

/** Structural problems that stop a scene from representing its card. Empty means it can be put up for sign-off. */
export function sceneProblems(card: LibraryCard, scene: LibraryScene, pitch: LibraryPitch = LIBRARY_PITCH): string[] {
  const p: string[] = [];
  const roster = new Set([...LIBRARY_ROSTERS.H, ...LIBRARY_ROSTERS.A].map((a) => a.id));
  const shown = scene.numeric.actors.map((a) => a.id);
  const omitted = scene.numeric.omitted.map((a) => a.id);
  if (scene.cardId !== card.id) p.push(`${card.id}: scene ${scene.sceneId} was built for ${scene.cardId}.`);
  if (scene.numeric.units !== 'm') p.push(`${card.id}: scene units must be metres.`);
  if (Math.abs(scene.numeric.pitch.length_m - pitch.length_m) > 1e-6 || Math.abs(scene.numeric.pitch.width_m - pitch.width_m) > 1e-6)
    p.push(`${card.id}: scene pitch is not the library's ${pitch.length_yards} x ${pitch.width_yards} yd profile.`);
  if (new Set([...shown, ...omitted]).size !== shown.length + omitted.length) p.push(`${card.id}: an actor appears twice.`);
  for (const id of [...shown, ...omitted]) if (!roster.has(id)) p.push(`${card.id}: ${id} is not one of the 18 roster actors.`);
  for (const id of roster) if (!shown.includes(id) && !omitted.includes(id)) p.push(`${card.id}: ${id} is neither shown nor recorded as omitted.`);
  for (const o of scene.numeric.omitted) if (!o.reason.trim()) p.push(`${card.id}: omitted ${o.id} has no reason it cannot change the decision.`);
  p.push(...freezeProblems(card, scene.numeric, 'cue'));
  if (scene.changedCue) {
    const ch = scene.changedCue;
    if (ch.actors.map((a) => a.id).sort().join() !== [...shown].sort().join()) p.push(`${card.id} (changed cue): shows different players from the cue.`);
    p.push(...freezeProblems(card, ch, 'changed cue'));
  }
  if (scene.numeric.ball.owner !== card.ball_owner_at_freeze)
    p.push(`${card.id}: ball is with ${scene.numeric.ball.owner ?? 'nobody'} at the freeze, card says ${card.ball_owner_at_freeze}.`);
  if (!scene.numeric.localRules.trim()) p.push(`${card.id}: scene does not name the local rules it uses.`);
  return p;
}

export function cardReview(id: string, opts: ReviewOpts = {}): Review {
  if (LIBRARY_RETIRED_IDS.includes(id))
    return { status: 'RETIRED', blockers: [`${id} is retired in ${LIBRARY.file} v${LIBRARY.version}: there are no goalkeeper decision sessions.`] };
  const card = cardById(id, opts.cards);
  if (!card) return { status: 'NEEDS_TACTICAL_AUTHORING_REVIEW', blockers: [`No card "${id}" in ${LIBRARY.file} v${LIBRARY.version}.`] };
  const pitch = opts.pitch ?? LIBRARY_PITCH;
  const rules = opts.rulesSha256 ?? rulesSha256(pitch);
  const scene = (opts.scenes ?? LIBRARY_SCENES)[id];
  const signs = (opts.signoffs ?? SIGNOFFS).filter((s) => s.cardId === id);
  const blockers: string[] = [];
  if (!scene) blockers.push(`${id}: no numeric scene has been built and validated from this card (numeric_scene is null).`);
  else blockers.push(...sceneProblems(card, scene, pitch), ...(opts.fixtureCheck ?? fixtureMatchesScene)(scene));
  if (!pitch.local_rules_verified) blockers.push(`${id}: local competition rules are not verified (pitch_proposal.local_rules_verified is false).`);
  if (signs.length === 0) {
    blockers.push(`${id}: no Coach Cody sign-off.`);
    return { status: 'DRAFT_BLOCKED_FOR_PLAYER_TRAINING', blockers };
  }
  const hash = scene ? sceneSha256(scene) : null;
  const current = signs.find((s) => s.cardSha256 === card.cardSha256 && s.rulesSha256 === rules && !!scene && s.sceneId === scene.sceneId && s.sceneSha256 === hash);
  if (current) return blockers.length === 0 ? { status: 'APPROVED', blockers: [] } : { status: 'DRAFT_BLOCKED_FOR_PLAYER_TRAINING', blockers };
  if (signs.every((s) => s.cardSha256 !== card.cardSha256)) blockers.push(`${id}: library card changed after sign-off; re-review required.`);
  else if (signs.every((s) => s.rulesSha256 !== rules)) blockers.push(`${id}: rules profile (pitch or rosters) changed after sign-off; re-review required.`);
  else blockers.push(`${id}: scene changed after sign-off; re-review required.`);
  return { status: 'APPROVAL_STALE', blockers };
}

export const LEGACY_PROPOSAL_REVIEW: Review = {
  status: 'NEEDS_TACTICAL_AUTHORING_REVIEW',
  blockers: [
    'Earlier ts-1 situations come from v0.5 draft seeds (runtime_ready: false); their positions, choices, grades, outcomes and Coach Code feedback were written by Devin and are not in any library.',
  ],
};
