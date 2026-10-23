import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import s1Manifest from '../docs/art/season-one/asset-manifest.json';
import t12Manifest from '../docs/training/v1.2/asset-manifest.json';
import { SEASON_ONE, sceneById } from '../src/game/story/content';
import { ART_ASSETS, MAPPED_SCENE_IDS, RUNTIME_IMAGES, SPEAKER_ROLE, isAllowedAsset, sceneVisual, unmappedScenes, variantAsset } from '../src/render/art/catalog';

const S1_IDS = new Set([...s1Manifest.assets, ...t12Manifest.assets].map((a) => a.assetId));

describe('Graphics v1 catalog', () => {
  it('legacy v0.7 art mappings are not reachable from the active story', () => {
    expect(MAPPED_SCENE_IDS.some((id) => SEASON_ONE.order.includes(id))).toBe(false);
  });

  it('keeps original masters byte-identical to the manifest and derives every runtime image', () => {
    const v1 = ART_ASSETS.filter((a) => !S1_IDS.has(a.assetId));
    expect(v1).toHaveLength(28);
    for (const a of v1) {
      const sha = createHash('sha256').update(readFileSync(`docs/art/graphics-v1/assets/${a.type === 'background' || a.characterId ? 'cutscenes' : ''}/${a.assetId}.png`)).digest('hex');
      expect(sha, a.assetId).toBe(a.sha256);
      expect(RUNTIME_IMAGES.get(a.assetId)?.masterSha256).toBe(a.sha256);
    }
    expect(v1.filter((a) => a.status === 'REFERENCE_APPROVED').map((a) => a.assetId).sort()).toEqual(['blake', 'boy', 'girl', 'jordan', 'school']);
    expect(v1.filter((a) => a.status === 'NEW_ART_REVIEW_PENDING')).toHaveLength(23);
  });

  it('Training/Schoolyard v1.2 masters are byte-identical and each has a derived runtime image', () => {
    expect(t12Manifest.assets.map((a) => a.assetId)).toEqual(['crossbar-schoolyard', 'training-bell94']);
    for (const a of t12Manifest.assets) {
      const sha = createHash('sha256').update(readFileSync(`docs/training/v1.2/${a.path}`)).digest('hex');
      expect(sha, a.assetId).toBe(a.sha256);
      expect(RUNTIME_IMAGES.get(a.assetId)?.masterSha256).toBe(a.sha256);
      expect(isAllowedAsset(a.assetId)).toBe(true);
    }
  });

  it('pins one outfit per scene and swaps only the player appearance', () => {
    const boy = sceneVisual('W1_TRAINING_ARRIVAL', 'boy')!;
    const girl = sceneVisual('W1_TRAINING_ARRIVAL', 'girl')!;
    expect(boy.backgroundAssetId).toBe('training-ground');
    expect(boy.cast.map((c) => c.assetId)).toEqual(['boy-training', 'coach-club', 'alex-training']);
    expect(girl.cast.map((c) => c.assetId)).toEqual(['girl-training', 'coach-club', 'alex-training']);
    expect(sceneVisual('W1_SCHOOL_02', 'girl')!.cast.map((c) => c.assetId)).toEqual(['girl', 'jordan', 'blake']);
    expect(sceneVisual('W1_MATCH_POST', 'boy')!.cast.map((c) => c.assetId)).toEqual(['boy-match', 'coach-club']);
    expect(sceneVisual('W1_HOME_CLOSE', 'boy')!.cast.map((c) => c.assetId)).toEqual(['boy-home', 'fish-tank']);
    for (const id of MAPPED_SCENE_IDS) {
      const v = sceneVisual(id, 'boy')!;
      if (v.presentation !== 'cutscene') expect(v.cast).toEqual([]);
      else for (const c of v.cast) expect(c.assetId, `${id}/${c.role}`).not.toBeNull();
    }
  });

  it('keeps Alex a separate teammate and maps speakers by role, not by the chosen name', () => {
    expect(SPEAKER_ROLE.Alex).toBe('alex');
    expect(SPEAKER_ROLE.Player).toBe('player');
    const cast = sceneVisual('W1_TRAINING_REFLECTION', 'boy')!.cast;
    expect(cast.map((c) => [c.role, c.visualId])).toEqual([['player', 'boy'], ['alex', 'alex']]);
    expect(Object.keys(SPEAKER_ROLE)).not.toContain('System');
  });

  it('gives an unchosen player appearance an explicit neutral gap instead of another person', () => {
    const c = sceneVisual('W1_HOME_01', null)!.cast;
    expect(c[0]).toMatchObject({ role: 'player', visualId: null, assetId: null });
  });

  it('rejects unknown, forged and traversal-like IDs', () => {
    for (const bad of ['../boy', 'boy.png', '/etc/passwd', 'https://x/y.png', 'BOY', '', 'constructor', '__proto__', 'boy-school', null, 7]) {
      expect(isAllowedAsset(bad)).toBe(false);
    }
    for (const bad of ['W1_NOPE', '../W1_HOME_01', 'constructor', '__proto__', 3]) expect(sceneVisual(bad, 'boy')).toBeNull();
    expect(variantAsset('jordan', 'match')).toBeNull();
    expect(variantAsset('alex', 'home')).toBeNull();
  });

  it('Season One screen art: 38 masters byte-identical (V3 home menu, Mom v2 added), 32 runtime images, Tank Cup and the old Mom portraits kept out of the game', () => {
    expect(s1Manifest.assets).toHaveLength(38);
    for (const a of s1Manifest.assets) {
      const sha = createHash('sha256').update(readFileSync(`docs/art/season-one/${a.path}`)).digest('hex');
      expect(sha, a.assetId).toBe(a.sha256);
      expect(isAllowedAsset(a.assetId), a.assetId).toBe(a.runtime);
      if (a.runtime) expect(RUNTIME_IMAGES.get(a.assetId)?.masterSha256).toBe(a.sha256);
    }
    expect(s1Manifest.assets.filter((a) => !a.runtime).map((a) => a.assetId).sort()).toEqual(['mom-firm', 'mom-laughing', 'mom-neutral', 'mom-proud', 'mom-sad', 'mom-worried', 'tank-mini-goal', 'tank-pellet', 'tank-underwater']);
    // no duplicate of an existing core image
    const v1Sha = new Set(ART_ASSETS.filter((a) => !S1_IDS.has(a.assetId)).map((a) => a.sha256));
    expect(s1Manifest.assets.some((a) => v1Sha.has(a.sha256))).toBe(false);
  });

  it('maps every Season One scene; the player is always the saved boy/girl, never a fixed illustration', () => {
    expect(unmappedScenes(SEASON_ONE.order)).toEqual([]);
    for (const look of ['boy', 'girl'] as const) {
      const other = look === 'boy' ? 'girl' : 'boy';
      expect(sceneVisual('S1_PRO_DEPART', look)!.backgroundAssetId).toBe(`departure-${look}`);
      expect(sceneVisual('S1_PRO_ARRIVE', look)!.backgroundAssetId).toBe(`arrival-${look}`);
      // Cloudy scenes: the owner's aquarium painting for the saved look already shows the player and Cloudy.
      const tank = sceneVisual('S1_W01_F', look)!;
      expect(tank.backgroundAssetId).toBe(`s1-tank-${look}`);
      expect(tank.cast).toEqual([]);
      expect(tank.continuityFlags).toContain('cast_in_backdrop');
      // Mom's v2 portrait is cast in every scene where she speaks, unless the backdrop already paints her.
      for (const id of SEASON_ONE.order) {
        const v = sceneVisual(id, look)!;
        const momSpeaks = sceneById(id)!.nodes.some((n) => n.type === 'line' && n.speaker === 'Mom') && !v.embeddedCharacters.includes('caregiver');
        const cast = v.cast;
        expect(cast.some((c) => c.role === 'caregiver' && c.assetId === 'mom2-casual-neutral'), id).toBe(momSpeaks);
        expect(cast.length, id).toBeLessThanOrEqual(3);
      }
      expect(sceneVisual('S1_W02_F', look)!.cast.map((c) => c.assetId)).toEqual(['mom2-casual-neutral']);
      for (const id of SEASON_ONE.order) {
        const v = sceneVisual(id, look)!;
        expect(v, id).not.toBeNull();
        expect(v.backgroundAssetId === null || isAllowedAsset(v.backgroundAssetId), id).toBe(true);
        expect(v.backgroundAssetId ?? '', id).not.toContain(other);
        for (const c of v.cast) {
          if (c.role === 'player') expect(c.visualId, id).toBe(look);
          expect(c.assetId ?? '', `${id} ${c.role}`).not.toMatch(new RegExp(`^${other}`));
        }
      }
    }
    // before a look is chosen the departure plate is an explicit gap, not a guessed protagonist
    expect(sceneVisual('S1_PRO_DEPART', null)!.backgroundAssetId).toBeNull();
    expect(sceneVisual('S1_W03_G', 'boy')!.backgroundAssetId).toBe('match-ground');
    expect(SEASON_ONE.order.filter((id) => sceneVisual(id, 'boy')!.backgroundAssetId === 'recess-goal').length).toBeGreaterThan(0);
  });
});
