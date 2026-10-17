import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import story from '../docs/story/v0.7/week_one_scenes.json';
import { ART_ASSETS, OWNER_ART_APPROVAL, MAPPED_SCENE_IDS, RUNTIME_IMAGES, SPEAKER_ROLE, isAllowedAsset, sceneVisual, unmappedScenes, variantAsset } from '../src/render/art/catalog';

const storyIds = (story.scenes as { id: string }[]).map((s) => s.id);

describe('Graphics v1 catalog', () => {
  it('maps every reachable v0.7 story scene, in story order', () => {
    expect(storyIds).toHaveLength(18);
    expect(unmappedScenes(storyIds)).toEqual([]);
    expect(MAPPED_SCENE_IDS).toEqual(storyIds);
  });

  it('keeps original masters byte-identical to the manifest and derives every runtime image', () => {
    expect(ART_ASSETS).toHaveLength(28);
    for (const a of ART_ASSETS) {
      const sha = createHash('sha256').update(readFileSync(`docs/art/graphics-v1/assets/${a.type === 'background' || a.characterId ? 'cutscenes' : ''}/${a.assetId}.png`)).digest('hex');
      expect(sha, a.assetId).toBe(a.sha256);
      expect(RUNTIME_IMAGES.get(a.assetId)?.masterSha256).toBe(a.sha256);
    }
    expect(ART_ASSETS.filter((a) => a.status === 'REFERENCE_APPROVED').map((a) => a.assetId).sort()).toEqual(['blake', 'boy', 'girl', 'jordan', 'school']);
    expect(ART_ASSETS.filter((a) => a.status === 'NEW_ART_REVIEW_PENDING')).toHaveLength(23);
    expect(OWNER_ART_APPROVAL).toBe('2026-10-16');
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
    for (const id of storyIds) {
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

  it('maps every draft weeks 2–4 scene to supplied art only, one location and outfit per scene', async () => {
    const { WEEKS_2_4 } = await import('../src/game/story/content');
    for (const id of WEEKS_2_4.order) {
      const v = sceneVisual(id, 'girl');
      expect(v, id).not.toBeNull();
      if (v!.backgroundAssetId !== null) expect(isAllowedAsset(v!.backgroundAssetId), id).toBe(true);
      for (const c of v!.cast) expect(c.assetId === null || isAllowedAsset(c.assetId), `${id} ${c.role}`).toBe(true);
      expect(v!.cast.filter((c) => c.role === 'player').length, id).toBeLessThanOrEqual(1);
    }
    expect(sceneVisual('W4_TOUCHLINE', 'boy')!.cast.map((c) => c.role)).toEqual(['player', 'alex']);
    expect(MAPPED_SCENE_IDS.some((id) => WEEKS_2_4.order.includes(id))).toBe(false);
  });

  it('rejects unknown, forged and traversal-like IDs', () => {
    for (const bad of ['../boy', 'boy.png', '/etc/passwd', 'https://x/y.png', 'BOY', '', 'constructor', '__proto__', 'boy-school', null, 7]) {
      expect(isAllowedAsset(bad)).toBe(false);
    }
    for (const bad of ['W1_NOPE', '../W1_HOME_01', 'constructor', '__proto__', 3]) expect(sceneVisual(bad, 'boy')).toBeNull();
    expect(variantAsset('jordan', 'match')).toBeNull();
    expect(variantAsset('alex', 'home')).toBeNull();
  });
});
