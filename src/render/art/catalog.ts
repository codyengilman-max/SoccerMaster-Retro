/**
 * Graphics v1.1 reference bindings (docs/art/graphics-v1). Pure data + lookups, no Phaser/DOM.
 * Art is cosmetic only: nothing here reads or writes story effects, saves, stats or input.
 */
import manifestRaw from '../../../docs/art/graphics-v1/assets/asset-manifest.json';
import sceneMapRaw from '../../../docs/art/graphics-v1/assets/scene-visual-map.json';
import wardrobeRaw from '../../../docs/art/graphics-v1/assets/wardrobe-map.json';
import continuityRaw from '../../../docs/art/graphics-v1/assets/character-continuity.json';
import runtimeRaw from '../../assets/art/v1/runtime-manifest.json';
import seasonOneRaw from '../../../docs/art/season-one/asset-manifest.json';
import trainingRaw from '../../../docs/training/v1.2/asset-manifest.json';
import { SEASON_ONE, sceneById } from '../../game/story/content';

export const ART_REVISION = 'graphics-v1.1';

export type ArtStatus = 'STYLE_APPROVED' | 'REFERENCE_APPROVED' | 'NEW_ART_REVIEW_PENDING';
export type VisualId = 'boy' | 'girl' | 'alex' | 'sam' | 'jordan' | 'blake' | 'riley' | 'coach' | 'caregiver' | 'fish';
export type CastRole = 'player' | Exclude<VisualId, 'boy' | 'girl'>;
export type Presentation = 'cutscene' | 'system_panel' | 'activity_handoff';

export interface ArtAsset {
  readonly assetId: string;
  readonly type: 'portrait' | 'background' | 'overlay';
  readonly characterId: VisualId | null;
  readonly label: string;
  readonly outfitId: string | null;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly status: ArtStatus;
  readonly continuityFlags: readonly string[];
}

export interface CastMember {
  readonly role: CastRole;
  /** Visual identity; null when the player's appearance is not chosen yet (neutral fallback). */
  readonly visualId: VisualId | null;
  readonly outfit: string;
  /** Allowlisted asset, or null = explicit gap rendered as a labelled neutral fallback. */
  readonly assetId: string | null;
}

export interface SceneVisual {
  readonly sceneId: string;
  readonly presentation: Presentation;
  readonly backgroundAssetId: string | null;
  readonly cast: readonly CastMember[];
  readonly continuityFlags: readonly string[];
  readonly revision: typeof ART_REVISION;
}

const ID_RE = /^[a-z0-9-]{1,40}$/;
const SCENE_RE = /^[A-Z0-9_]{1,40}$/;

export const ART_ASSETS: readonly ArtAsset[] = Object.freeze(
  ([...manifestRaw.assets, ...seasonOneRaw.assets, ...trainingRaw.assets] as unknown as ArtAsset[]).map((a) => {
    if (!ID_RE.test(a.assetId)) throw new Error(`art manifest: bad asset id ${a.assetId}`);
    return Object.freeze({ ...a });
  }),
);
const BY_ID: ReadonlyMap<string, ArtAsset> = new Map(ART_ASSETS.map((a) => [a.assetId, a]));

export interface RuntimeImage { readonly assetId: string; readonly file: string; readonly width: number; readonly height: number; readonly masterSha256: string }
export const RUNTIME_IMAGES: ReadonlyMap<string, RuntimeImage> = new Map(
  (runtimeRaw.assets as RuntimeImage[]).filter((r) => BY_ID.get(r.assetId)?.sha256 === r.masterSha256).map((r) => [r.assetId, r]),
);

/** Build-time allowlist check: only manifest IDs with a derived runtime image are loadable. */
export function isAllowedAsset(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id) && BY_ID.has(id) && RUNTIME_IMAGES.has(id);
}
export const artAsset = (id: string): ArtAsset | undefined => (isAllowedAsset(id) ? BY_ID.get(id) : undefined);

interface WardrobeChar { readonly characterId: VisualId; readonly label: string; readonly variants: Readonly<Record<string, string>> }
const WARDROBE: ReadonlyMap<VisualId, WardrobeChar> = new Map((wardrobeRaw.characters as unknown as WardrobeChar[]).map((c) => [c.characterId, c]));
export const WARDROBE_CHARACTERS: readonly WardrobeChar[] = [...WARDROBE.values()];

interface RawScene { readonly sceneId: string; readonly presentation: Presentation; readonly backgroundAssetId: string | null; readonly castRoles: readonly CastRole[]; readonly wardrobeByRole: Readonly<Record<string, string>>; readonly continuityFlags: readonly string[] }
const PACKAGE_SCENES: readonly RawScene[] = sceneMapRaw.scenes as unknown as RawScene[];

/**
 * Draft weeks 2–4 (not in the Graphics v1 scene map): one location per scene, using only supplied
 * backgrounds and wardrobe variants. A speaker with no outfit for that location is left out of the cast.
 */
type Location = 'school' | 'training' | 'match' | 'home' | 'handoff';
const LOCATION: Readonly<Record<Exclude<Location, 'handoff'>, { bg: string; outfit: string }>> = {
  school: { bg: 'school', outfit: 'school' },
  training: { bg: 'training-ground', outfit: 'training' },
  match: { bg: 'match-ground', outfit: 'match' },
  home: { bg: 'bedroom', outfit: 'home' },
};
const DRAFT_SCENE_ART: Readonly<Record<string, readonly [Location, readonly CastRole[]]>> = {
  W2_ROLE_BOARD: ['training', ['coach', 'blake']],
  W2_ALEX_LATE: ['school', ['alex']],
  W2_JORDAN: ['school', ['jordan']],
  W2_JUNGLE: ['school', ['alex', 'blake', 'sam', 'jordan']],
  W2_PRACTICE: ['training', ['coach']],
  W2_MATCH_PRE: ['match', []],
  W2_MATCH: ['handoff', []],
  W2_MATCH_POST: ['match', ['coach']],
  W2_HOME_REFLECT: ['home', ['caregiver']],
  W2_CLOSE: ['handoff', []],
  W3_COMMITMENT: ['school', ['alex']],
  W3_ASSIGNMENT: ['training', ['coach']],
  W3_SAM: ['training', ['sam']],
  W3_MATCH_PRE: ['match', []],
  W3_MATCH: ['handoff', []],
  W3_MATCH_POST: ['match', ['coach']],
  W3_REPAIR: ['school', ['alex']],
  W3_PREP: ['home', ['caregiver']],
  W3_CLOSE: ['handoff', []],
  W4_ROLE: ['training', ['coach']],
  W4_TOUCHLINE: ['match', ['alex']],
  W4_MATCH: ['handoff', []],
  W4_FINAL: ['match', ['coach']],
  W4_OUTCOME: ['match', ['coach']],
  W4_BEDROOM: ['home', []],
};
const outfitFor = (role: CastRole, loc: Exclude<Location, 'handoff'>): string | null => {
  const want = role === 'coach' ? 'club' : role === 'caregiver' ? 'home' : LOCATION[loc].outfit;
  const v = role === 'player' ? WARDROBE.get('boy') : WARDROBE.get(role);
  return v?.variants[want] ? want : null;
};
export const DRAFT_ART_SCENES: readonly RawScene[] = Object.entries(DRAFT_SCENE_ART).map(([sceneId, [loc, roles]]): RawScene => {
  if (loc === 'handoff') return { sceneId, presentation: 'activity_handoff', backgroundAssetId: null, castRoles: [], wardrobeByRole: {}, continuityFlags: [] };
  const cast = (['player', ...roles] as CastRole[]).filter((r) => outfitFor(r, loc) !== null);
  return { sceneId, presentation: 'cutscene', backgroundAssetId: LOCATION[loc].bg, castRoles: cast, wardrobeByRole: Object.fromEntries(cast.map((r) => [r, outfitFor(r, loc)!])), continuityFlags: ['draft_weeks_2_4'] };
});
const SCENES: ReadonlyMap<string, RawScene> = new Map([...DRAFT_ART_SCENES, ...PACKAGE_SCENES].map((s) => [s.sceneId, s]));
/** Scenes mapped by the supplied Graphics v1 package (draft weeks 2–4 are mapped in code above). */
export const MAPPED_SCENE_IDS: readonly string[] = PACKAGE_SCENES.map((s) => s.sceneId);
export const SCENE_MAP_STORY_VERSION: string = sceneMapRaw.storyContentVersion;

export interface ContinuityEntry { readonly visualId: VisualId; readonly storyRole: string; readonly identityMasterAssetId: string; readonly gameplaySheetId: string | null; readonly gameplayStatus: string; readonly reviewStatus: string }
export const CONTINUITY: readonly ContinuityEntry[] = continuityRaw.characters as unknown as ContinuityEntry[];

/**
 * Story speaker label → cast role. Keyed on the story's speaker *role* field, never on the
 * player's chosen name: a player called "Alex" is still role `player`.
 */
export const SPEAKER_ROLE: Readonly<Record<string, CastRole>> = Object.freeze({
  Player: 'player',
  Jordan: 'jordan',
  Blake: 'blake',
  Caregiver: 'caregiver',
  Mom: 'caregiver',
  'Coach Code': 'coach',
  Alex: 'alex',
  Sam: 'sam',
  Riley: 'riley',
  Cloudy: 'fish',
});

export function variantAsset(visualId: VisualId, outfit: string): string | null {
  const id = WARDROBE.get(visualId)?.variants[outfit];
  return id && isAllowedAsset(id) && BY_ID.get(id)!.characterId === visualId ? id : null;
}

/** Resolve one scene's backdrop and pinned outfits. Unknown/forged scene IDs return null (explicit gap). */
export function sceneVisual(sceneId: unknown, appearance: 'boy' | 'girl' | null): SceneVisual | null {
  if (typeof sceneId !== 'string' || !SCENE_RE.test(sceneId)) return null;
  const s = SCENES.get(sceneId);
  if (!s) return seasonOneVisual(sceneId, appearance);
  const cast = s.castRoles.map((role): CastMember => {
    const outfit = s.wardrobeByRole[role]!;
    const visualId: VisualId | null = role === 'player' ? appearance : role;
    return { role, visualId, outfit, assetId: visualId ? variantAsset(visualId, outfit) : null };
  });
  const bg = s.backgroundAssetId && isAllowedAsset(s.backgroundAssetId) ? s.backgroundAssetId : null;
  return { sceneId, presentation: s.presentation, backgroundAssetId: bg, cast, continuityFlags: s.continuityFlags, revision: ART_REVISION };
}

/** Story scene IDs with no visual binding (reported, never invented). */
export const unmappedScenes = (storySceneIds: readonly string[]): string[] => storySceneIds.filter((id) => !SCENES.has(id) && !SEASON_ONE.order.includes(id));

/** Scene order used to prefetch the next scene's art. */
export const PREFETCH_ORDER: readonly string[] = [...MAPPED_SCENE_IDS, ...SEASON_ONE.order];

/** Mom's neutral expression; the Season One script has no per-line expression field yet. */
export const MOM_PORTRAIT = 'mom-neutral';
/** Backdrop already paints the cast (StoryScene draws no fallback portrait over it). */
export const CAST_IN_BACKDROP = 'cast_in_backdrop';

/**
 * Season One: backdrop from the scene's authored location; the player is always the saved boy/girl
 * (never a fixed illustrated character). Mom is cast with the owner's portrait in every scene where she speaks.
 * Cloudy scenes use the owner's aquarium painting for the saved boy/girl, which already shows the player and Cloudy.
 */
function seasonOneVisual(sceneId: string, appearance: 'boy' | 'girl' | null): SceneVisual | null {
  if (!SEASON_ONE.order.includes(sceneId)) return null;
  const sc = sceneById(sceneId)!;
  const allowed = (id: string | null): string | null => (id && isAllowedAsset(id) ? id : null);
  const visual = (bg: string | null, cast: CastMember[], flags: string[] = []): SceneVisual => ({ sceneId, presentation: 'cutscene', backgroundAssetId: allowed(bg), cast, continuityFlags: ['season_one', ...flags], revision: ART_REVISION });
  const mom: CastMember[] = sc.nodes.some((n) => n.type === 'line' && SPEAKER_ROLE[n.speaker] === 'caregiver')
    ? [{ role: 'caregiver', visualId: 'caregiver', outfit: 'home', assetId: allowed(MOM_PORTRAIT) }]
    : [];
  if (sc.background === 'prologue') {
    const kind = sceneId === 'S1_PRO_DEPART' ? 'departure' : 'arrival';
    return visual(appearance ? `${kind}-${appearance}` : null, mom, kind === 'departure' ? ['neutral_departure_region'] : []);
  }
  if (sc.background === 'aquarium') {
    const painted = appearance ? allowed(`s1-tank-${appearance}`) : null;
    if (painted) return visual(painted, mom, [CAST_IN_BACKDROP]);
    return visual('s1-bedroom-tank', [
      { role: 'player', visualId: appearance, outfit: 'tank', assetId: appearance ? allowed(`player-${appearance}-down`) : null },
      { role: 'fish', visualId: 'fish', outfit: 'tank', assetId: allowed('clownfish') },
      ...mom,
    ]);
  }
  const loc: Exclude<Location, 'handoff'> =
    sc.background === 'neutral_home' ? 'home'
    : sc.background === 'neutral_pitch' ? (/_G\d?$|^S1_END_FIELD$/.test(sceneId) ? 'match' : 'training')
    : 'school';
  const bg = sc.background === 'recess' ? 'recess-goal' : LOCATION[loc].bg;
  const roles: CastRole[] = ['player'];
  if (loc !== 'home') {
    for (const n of sc.nodes) {
      const r = n.type === 'line' ? SPEAKER_ROLE[n.speaker] : undefined;
      if (r && r !== 'fish' && r !== 'caregiver' && !roles.includes(r) && roles.length < 3) roles.push(r);
    }
  }
  if (mom.length && roles.length >= 3) roles.pop();
  const cast = roles.flatMap((role): CastMember[] => {
    const outfit = outfitFor(role, loc);
    if (!outfit) return [];
    const visualId: VisualId | null = role === 'player' ? appearance : role;
    return [{ role, visualId, outfit, assetId: visualId ? variantAsset(visualId, outfit) : null }];
  });
  return visual(bg, [...cast, ...mom]);
}
