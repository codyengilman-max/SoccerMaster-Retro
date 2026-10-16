/**
 * Draft curriculum (training library v1.1), loaded from the unchanged research package.
 * Review-only: nothing here feeds the planner, journal, credit or growth. Player recommendations
 * only ever come from levels approved in `release.ts`, which is empty.
 */
import raw from '../../../../research/training/v1.1/reference/training_manifest_v2.json?raw';
import { approved, choose, trustedFrom, type Choice, type DemoAssets } from './approval';
import { capabilitiesFor } from './capabilities';
import { ContentError, loadManifest, type Manifest } from './manifest';
import { RELEASE_APPROVALS } from './release';
import type { PlannerInput } from '../planner';

export type CurriculumState = { readonly ok: true; readonly manifest: Manifest } | { readonly ok: false; readonly error: string };

export function loadCurriculum(text: string): CurriculumState {
  try {
    return { ok: true, manifest: loadManifest(text) };
  } catch (e) {
    return { ok: false, error: e instanceof ContentError ? e.message : 'invalid curriculum' };
  }
}

export const CURRICULUM: CurriculumState = loadCurriculum(raw);
export const TRUSTED = trustedFrom(RELEASE_APPROVALS);
/** Reviewed demo assets bundled with the build. None exist yet. */
export const DEMO_ASSETS: DemoAssets = new Map();

/** Level IDs a player may be recommended. Empty while every level is a draft. */
export function publishedLevels(state: CurriculumState = CURRICULUM): string[] {
  if (!state.ok) return [];
  return state.manifest.families.flatMap((f) => f.levels.map((l) => l.id)).filter((id) => approved(state.manifest, id, TRUSTED, DEMO_ASSETS));
}

export function recommend(familyId: string, input: PlannerInput, comfortable: ReadonlySet<string>, state: CurriculumState = CURRICULUM): Choice {
  if (!state.ok) return { levelId: null, substituted: false, notice: 'Training library unavailable. Existing activities are unaffected.' };
  return choose(state.manifest, familyId, capabilitiesFor(input), comfortable, TRUSTED, DEMO_ASSETS);
}

export { CATEGORY_SKILL_AREA, COACHING_REVIEW, FAMILY_MAPPING } from './mapping';
export { EMPTY_STATE } from './approval';
