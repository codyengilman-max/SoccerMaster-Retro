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

/** Every old standalone Mom portrait and the v2 portrait that replaces it (old art stays in Git history only). */
export const MOM_REPLACED: Readonly<Record<string, string>> = {
  'mom-neutral': 'mom2-casual-neutral',
  'mom-laughing': 'mom2-casual-laughing',
  'mom-worried': 'mom2-casual-worried',
  'mom-firm': 'mom2-casual-firm',
  'mom-proud': 'mom2-casual-proud',
  // v2 has no "sad"; worried is the closest supplied expression.
  'mom-sad': 'mom2-casual-worried',
  // Graphics v1 caregiver portrait (draft weeks 2–4 scene map).
  'caregiver-home': 'mom2-casual-neutral',
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

export function momPortrait(sceneId: string | null, nodeId: string | null, dressy: ReadonlySet<string> = MOM_DRESSY_SCENES): string {
  return momAssetId(momOutfit(sceneId, dressy), momExpression(sceneId, nodeId));
}

/** Every portrait a scene can show (prefetched together so expression changes never wait on the network). */
export function momSceneAssets(sceneId: string | null, dressy: ReadonlySet<string> = MOM_DRESSY_SCENES): string[] {
  const o = momOutfit(sceneId, dressy);
  const used = new Set<MomExpression>(['neutral', ...Object.values((sceneId && MOM_BEATS[sceneId]) || {})]);
  return [...used].map((e) => momAssetId(o, e));
}
