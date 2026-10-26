/**
 * Mom Replacement v2 (docs/art/season-one/assets/mom-v2): outfit per scene, expression per authored beat.
 * Pure data, no Phaser/DOM. Presentation only: nothing here changes dialogue, speakers, choices or saves.
 */
export const MOM_EXPRESSIONS = ['neutral', 'laughing', 'worried', 'firm', 'reassuring', 'proud'] as const;
export type MomExpression = (typeof MOM_EXPRESSIONS)[number];
export const MOM_OUTFITS = ['casual', 'dressy'] as const;
export type MomOutfit = (typeof MOM_OUTFITS)[number];

/** Casual teal overshirt is her everyday look. */
export const MOM_DEFAULT_OUTFIT: MomOutfit = 'casual';
/** Scenes the script sets at a dressier occasion (burgundy blouse). Season One weeks 1–5 have none. */
export const MOM_DRESSY_SCENES: ReadonlySet<string> = new Set<string>();

export const momAssetId = (outfit: MomOutfit, expression: MomExpression): string => `mom2-${outfit}-${expression}`;

/**
 * Owner's standing Mom (docs/art/season-one/assets/mom-v3, 2026-10-26): three faces, each in both outfits, with her
 * head near the top of the 2:3 slot like the rest of the cast. These are the only Mom cutscene portraits; the v2 busts
 * stood a third shorter and are no longer selected (they stay loadable for the art gallery).
 */
export const MOM_FACES = ['confident', 'worried', 'smiling'] as const;
export type MomFace = (typeof MOM_FACES)[number];
/** Closest standing face for each scripted expression beat (no line text or beat changed). */
export const MOM_FACE: Readonly<Record<MomExpression, MomFace>> = {
  neutral: 'confident',
  firm: 'confident',
  worried: 'worried',
  laughing: 'smiling',
  reassuring: 'smiling',
  proud: 'smiling',
};
export const momStandingId = (outfit: MomOutfit, face: MomFace): string => `mom3-${outfit}-${face}`;
export const MOM_STANDING = momStandingId(MOM_DEFAULT_OUTFIT, MOM_FACE.neutral);
/** The v2 bust portraits the standing Mom replaced in the story. */
export const MOM_V2_SUPERSEDED: readonly string[] = MOM_OUTFITS.flatMap((o) => MOM_EXPRESSIONS.map((e) => momAssetId(o, e)));

/** Every old standalone Mom portrait and the v2 portrait that replaces it (old art stays in Git history only). */
export const MOM_REPLACED: Readonly<Record<string, string>> = {
  'mom-neutral': 'mom3-casual-confident',
  'mom-laughing': 'mom3-casual-smiling',
  'mom-worried': 'mom3-casual-worried',
  'mom-firm': 'mom3-casual-confident',
  'mom-proud': 'mom3-casual-smiling',
  // No "sad" face; worried is the closest supplied expression.
  'mom-sad': 'mom3-casual-worried',
  // Graphics v1 caregiver portrait (draft weeks 2–4 scene map).
  'caregiver-home': MOM_STANDING,
};

const beats = (s: string): Readonly<Record<string, MomExpression>> =>
  Object.fromEntries(s.trim().split(/\s+/).map((p) => p.split('=') as [string, MomExpression]));

/** Expression for each Mom line, keyed by scene then node ID. Unlisted lines use neutral. */
export const MOM_BEATS: Readonly<Record<string, Readonly<Record<string, MomExpression>>>> = {
  S1_W01_C: beats('v2n57=neutral'),
  S1_W01_P: beats(`v2n45=neutral v2n43=laughing v2n42=reassuring v2n40=neutral v2n38=reassuring v2n37=worried v2n35=worried
    v2n33=laughing v2n32=reassuring v2n30=reassuring v2n29=worried v2n27=laughing v2n25=reassuring v2n24=worried v2n22=worried
    v2n21=firm v2n19=reassuring v2n17=reassuring v2n16=proud v2n14=laughing v2n12=neutral v2n10=reassuring v2n9=proud
    v2n7=laughing v2n6=reassuring v2n4=neutral`),
  S1_W02_F: beats('v2n3=neutral'),
  S1_W04_P: beats(`v2n38=neutral v2n36=laughing v2n32=proud v2n30=laughing v2n28=firm v2n27=firm v2n25=firm v2n24=reassuring
    v2n23=neutral v2n22=reassuring v2n20=reassuring v2n19=worried v2n17=neutral v2n15=worried v2n13=firm v2n11=reassuring
    v2n10=neutral v2n8=worried v2n6=laughing v2n4=firm v2n2=reassuring v2n1=proud`),
  S1_W04_G: beats('v2n49=reassuring'),
};

/** One outfit for the whole scene. */
export function momOutfit(sceneId: string | null, dressy: ReadonlySet<string> = MOM_DRESSY_SCENES): MomOutfit {
  return sceneId !== null && dressy.has(sceneId) ? 'dressy' : MOM_DEFAULT_OUTFIT;
}

export function momExpression(sceneId: string | null, nodeId: string | null): MomExpression {
  const e = sceneId && nodeId ? MOM_BEATS[sceneId]?.[nodeId] : undefined;
  return e && (MOM_EXPRESSIONS as readonly string[]).includes(e) ? e : 'neutral';
}

/** Mom's standing portrait for a line: the scene's outfit, the face closest to the line's beat. */
export function momPortrait(sceneId: string | null, nodeId: string | null, dressy: ReadonlySet<string> = MOM_DRESSY_SCENES): string {
  return momStandingId(momOutfit(sceneId, dressy), MOM_FACE[momExpression(sceneId, nodeId)]);
}

/** Every portrait a scene can show (prefetched together so expression changes never wait on the network). */
export function momSceneAssets(sceneId: string | null, dressy: ReadonlySet<string> = MOM_DRESSY_SCENES): string[] {
  const o = momOutfit(sceneId, dressy);
  const used = new Set<MomFace>([MOM_FACE.neutral, ...Object.values((sceneId && MOM_BEATS[sceneId]) || {}).map((e) => MOM_FACE[e])]);
  return [...used].map((f) => momStandingId(o, f));
}
