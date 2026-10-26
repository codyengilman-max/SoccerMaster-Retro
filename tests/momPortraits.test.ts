import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pkgManifest from '../docs/art/season-one/assets/mom-v2/manifest.json';
import { SEASON_ONE, sceneById } from '../src/game/story/content';
import { BACKDROP_EMBEDDED, MAPPED_SCENE_IDS, RETIRED_MOM_PORTRAITS, RUNTIME_IMAGES, SPEAKER_ROLE, artAsset, isAllowedAsset, sceneVisual } from '../src/render/art/catalog';
import { MOM_BEATS, MOM_DRESSY_SCENES, MOM_EXPRESSIONS, MOM_OUTFITS, MOM_FACE, MOM_FACES, MOM_REPLACED, MOM_STANDING, MOM_V2_SUPERSEDED, momAssetId, momStandingId, momOutfit, momPortrait, momSceneAssets } from '../src/render/art/momPortraits';
import s1Manifest from '../docs/art/season-one/asset-manifest.json';

const LOOKS = ['boy', 'girl'] as const;
const ALL_SCENES = [...MAPPED_SCENE_IDS, ...SEASON_ONE.order];
const momLines = (id: string) => sceneById(id)!.nodes.filter((n) => n.type === 'line' && n.speaker === 'Mom');

describe('Mom Replacement v2', () => {
  it('all 12 supplied portraits load: byte-identical masters, 2:3 runtime canvas, both outfits x 6 expressions', () => {
    expect(pkgManifest.defaultOutfit).toBe('casual');
    const outfits = pkgManifest.outfits as Record<string, { expressions: Record<string, { file: string }> }>;
    expect(Object.keys(outfits)).toEqual([...MOM_OUTFITS]);
    for (const o of MOM_OUTFITS) expect(Object.keys(outfits[o]!.expressions)).toEqual([...MOM_EXPRESSIONS]);
    for (const o of MOM_OUTFITS) {
      for (const e of MOM_EXPRESSIONS) {
        const id = momAssetId(o, e);
        expect(isAllowedAsset(id), id).toBe(true);
        const a = artAsset(id)!;
        expect(a.characterId).toBe('caregiver');
        expect(a.outfitId).toBe(o);
        const raw = readFileSync(`docs/art/season-one/assets/mom-v2/${outfits[o]!.expressions[e]!.file}`);
        expect(createHash('sha256').update(raw).digest('hex'), id).toBe(a.sha256);
        const r = RUNTIME_IMAGES.get(id)!;
        expect([r.width, r.height]).toEqual([512, 768]);
        expect(readFileSync(`src/assets/art/v1/${r.file}`).subarray(8, 12).toString()).toBe('WEBP');
      }
    }
  });

  it('standing Mom (v3): 3 byte-identical sheets, casual left / dressy right, 6 loadable 2:3 runtime images', () => {
    const rows = s1Manifest.assets as { assetId: string; path: string; sha256: string; characterId: string; outfitId: string; crop?: string }[];
    for (const o of MOM_OUTFITS) {
      for (const f of MOM_FACES) {
        const id = momStandingId(o, f);
        const m = rows.find((a) => a.assetId === id)!;
        expect(m, id).toBeDefined();
        expect([m.characterId, m.outfitId, m.crop, m.path]).toEqual(['caregiver', o, o === 'casual' ? 'left' : 'right', `assets/mom-v3/mom_sheet_${f}.png`]);
        expect(createHash('sha256').update(readFileSync(`docs/art/season-one/${m.path}`)).digest('hex'), id).toBe(m.sha256);
        expect(isAllowedAsset(id), id).toBe(true);
        const r = RUNTIME_IMAGES.get(id)!;
        expect([r.width, r.height]).toEqual([512, 768]);
        expect(readFileSync(`src/assets/art/v1/${r.file}`).subarray(8, 12).toString()).toBe('WEBP');
      }
    }
    expect(MOM_STANDING).toBe('mom3-casual-confident');
    for (const e of MOM_EXPRESSIONS) expect(MOM_FACES).toContain(MOM_FACE[e]);
  });

  it('old standalone Mom portraits are retired: not loadable, never selected, each mapped to the standing portrait', () => {
    for (const [old, v2] of Object.entries(MOM_REPLACED)) {
      expect(isAllowedAsset(v2), v2).toBe(true);
      if (old.startsWith('mom-')) expect(isAllowedAsset(old), old).toBe(false);
    }
    for (const look of LOOKS) {
      for (const id of ALL_SCENES) {
        for (const c of sceneVisual(id, look)?.cast ?? []) {
          expect(RETIRED_MOM_PORTRAITS, id).not.toContain(c.assetId);
          if (c.role === 'caregiver') expect(c.assetId, id).toBe(MOM_STANDING);
          expect(MOM_V2_SUPERSEDED, id).not.toContain(c.assetId);
        }
      }
    }
  });

  it('standing Mom on every spoken line: casual teal by default, burgundy only for dressy scenes, never a v2 bust', () => {
    expect(MOM_DRESSY_SCENES.size).toBe(0);
    expect(MOM_V2_SUPERSEDED).toHaveLength(12);
    for (const id of SEASON_ONE.order) {
      expect(momOutfit(id)).toBe('casual');
      for (const n of momLines(id)) {
        const p = momPortrait(id, n.id);
        expect(p, `${id}.${n.id}`).toMatch(/^mom3-casual-(confident|worried|smiling)$/);
        expect(MOM_V2_SUPERSEDED).not.toContain(p);
      }
      const dressy = new Set([id]);
      expect(momOutfit(id, dressy)).toBe('dressy');
      for (const n of momLines(id)) expect(momPortrait(id, n.id, dressy)).toMatch(/^mom3-dressy-/);
      expect(momSceneAssets(id, dressy).every((a) => a.startsWith('mom3-dressy-'))).toBe(true);
    }
    expect(momPortrait(null, null)).toBe(MOM_STANDING);
  });

  it('expressions are keyed to real Mom lines (no text changed); unlisted lines fall back to neutral', () => {
    for (const [sid, beats] of Object.entries(MOM_BEATS)) {
      const ids = new Set(momLines(sid).map((n) => n.id));
      for (const [nid, e] of Object.entries(beats)) {
        expect(ids.has(nid), `${sid}.${nid}`).toBe(true);
        expect(MOM_EXPRESSIONS).toContain(e);
      }
    }
    expect(momPortrait('S1_W01_P', 'v2n43')).toBe('mom3-casual-smiling');
    expect(momPortrait('S1_W04_P', 'v2n28')).toBe('mom3-casual-confident');
    expect(momPortrait('S1_W01_P', 'not-a-node')).toBe('mom3-casual-confident');
    expect(momSceneAssets('S1_W01_P').length).toBe(3);
  });
});

describe('Characters painted into the backdrop never get a second portrait', () => {
  it('embedded cast is explicit per boy/girl backdrop', () => {
    for (const [bg, roles] of Object.entries(BACKDROP_EMBEDDED)) {
      expect(isAllowedAsset(bg), bg).toBe(true);
      for (const r of roles) expect(Object.values(SPEAKER_ROLE).includes(r) || r === 'player', `${bg}:${r}`).toBe(true);
    }
    for (const look of LOOKS) {
      expect(sceneVisual('S1_PRO_DEPART', look)!.embeddedCharacters).toEqual(['caregiver', 'player']);
      expect(sceneVisual('S1_PRO_ARRIVE', look)!.backgroundAssetId).toBe(`arrival-${look}`);
      expect(sceneVisual('S1_PRO_ARRIVE', look)!.embeddedCharacters).toEqual(['caregiver', 'player']);
      expect(sceneVisual('S1_W01_F', look)!.embeddedCharacters).toEqual(['player', 'fish']);
      // Mom speaks in the car, but she is already painted at the wheel: no standalone Mom.
      expect(momLines('S1_PRO_DEPART').length).toBeGreaterThan(0);
      expect(sceneVisual('S1_PRO_DEPART', look)!.cast).toEqual([]);
      expect(sceneVisual('S1_PRO_ARRIVE', look)!.cast).toEqual([]);
      // Empty home backdrop: Mom's standalone portrait is still used.
      expect(sceneVisual('S1_W01_P', look)!.embeddedCharacters).toEqual([]);
      expect(sceneVisual('S1_W01_P', look)!.cast.map((c) => c.role)).toContain('caregiver');
    }
  });

  it('applies to every character in every scene, boy and girl', () => {
    for (const look of LOOKS) {
      for (const id of ALL_SCENES) {
        const v = sceneVisual(id, look);
        if (!v) continue;
        const want = (v.backgroundAssetId && BACKDROP_EMBEDDED[v.backgroundAssetId]) || [];
        expect(v.embeddedCharacters, id).toEqual(want);
        for (const c of v.cast) expect(v.embeddedCharacters, `${id}:${c.role}`).not.toContain(c.role);
        if (want.length) expect(v.continuityFlags, id).toContain('cast_in_backdrop');
      }
    }
  });
});
