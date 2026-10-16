/**
 * Graphics v1.1 reference bindings (docs/art/graphics-v1). Pure data + lookups, no Phaser/DOM.
 * Art is cosmetic only: nothing here reads or writes story effects, saves, stats or input.
 */
import manifestRaw from '../../../docs/art/graphics-v1/assets/asset-manifest.json';
import sceneMapRaw from '../../../docs/art/graphics-v1/assets/scene-visual-map.json';
import wardrobeRaw from '../../../docs/art/graphics-v1/assets/wardrobe-map.json';
import continuityRaw from '../../../docs/art/graphics-v1/assets/character-continuity.json';
import runtimeRaw from '../../assets/art/v1/runtime-manifest.json';

export const ART_REVISION = 'graphics-v1.1';

export type ArtStatus = 'STYLE_APPROVED' | 'REFERENCE_APPROVED' | 'NEW_ART_REVIEW_PENDING';
export type VisualId = 'boy' | 'girl' | 'alex' | 'sam' | 'jordan' | 'blake' | 'riley' | 'coach' | 'caregiver' | 'fish';
export type CastRole = 'player' | Exclude<VisualId, 'boy' | 'girl'>;
export type Presentation = 'cutscene' | 'system_panel' | 'activity_handoff';

export interface ArtAsset {
  readonly assetId: string;
  readonly type: 'portrait' | 'background';
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
  (manifestRaw.assets as unknown as ArtAsset[]).map((a) => {
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
const SCENES: ReadonlyMap<string, RawScene> = new Map((sceneMapRaw.scenes as unknown as RawScene[]).map((s) => [s.sceneId, s]));
export const MAPPED_SCENE_IDS: readonly string[] = [...SCENES.keys()];
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
  'Coach Code': 'coach',
  Alex: 'alex',
});

export function variantAsset(visualId: VisualId, outfit: string): string | null {
  const id = WARDROBE.get(visualId)?.variants[outfit];
  return id && isAllowedAsset(id) && BY_ID.get(id)!.characterId === visualId ? id : null;
}

/** Resolve one scene's backdrop and pinned outfits. Unknown/forged scene IDs return null (explicit gap). */
export function sceneVisual(sceneId: unknown, appearance: 'boy' | 'girl' | null): SceneVisual | null {
  if (typeof sceneId !== 'string' || !SCENE_RE.test(sceneId)) return null;
  const s = SCENES.get(sceneId);
  if (!s) return null;
  const cast = s.castRoles.map((role): CastMember => {
    const outfit = s.wardrobeByRole[role]!;
    const visualId: VisualId | null = role === 'player' ? appearance : role;
    return { role, visualId, outfit, assetId: visualId ? variantAsset(visualId, outfit) : null };
  });
  const bg = s.backgroundAssetId && isAllowedAsset(s.backgroundAssetId) ? s.backgroundAssetId : null;
  return { sceneId, presentation: s.presentation, backgroundAssetId: bg, cast, continuityFlags: s.continuityFlags, revision: ART_REVISION };
}

/** Story scene IDs with no visual binding (reported, never invented). */
export const unmappedScenes = (storySceneIds: readonly string[]): string[] => storySceneIds.filter((id) => !SCENES.has(id));
