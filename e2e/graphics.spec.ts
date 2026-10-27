import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { diagnostics, pressElement, trackConsoleErrors, waitForScene } from './helpers';

type Cast = { role: string; assetId: string | null; state: string; visible: boolean; speaking: boolean };
type Art = { scene: string | null; mapped: boolean; background: string | null; backgroundShown: boolean; castInBackdrop: boolean; embedded: string[]; nodeId: string | null; speakerRole: string | null; cast: Cast[]; reducedMotion: boolean; textures: number };
type Story = { mode: string; scene: string | null; type?: string; adapter?: string; revision: number; buttons: string[]; art: Art | null };
test.describe.configure({ timeout: 120_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  await expect.poll(async () => Boolean((await diagnostics(page)).layout?.elements?.[name]), { message: `${name} on screen` }).toBe(true);
  await pressElement(page, name, mode);
}
async function story(page: Page, pred: (s: Story) => boolean, what: string): Promise<Story> {
  let last: Story | null = null;
  await expect
    .poll(async () => {
      last = (await diagnostics(page)).gameplay as Story;
      return Boolean(last && pred(last));
    }, { message: what, timeout: 20_000 })
    .toBe(true);
  return last!;
}
async function tapStage(page: Page, mode: 'touch' | 'mouse'): Promise<void> {
  const l = (await diagnostics(page)).layout!;
  const c = (await page.locator('canvas').boundingBox())!;
  const p = { x: c.x + l.viewport.width / 2, y: c.y + l.elements.panel!.y * 0.6 };
  if (mode === 'touch') await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
/** Tap lines and take the first choice until `pred` holds. */
async function advanceTo(page: Page, mode: 'touch' | 'mouse', pred: (s: Story) => boolean, what: string): Promise<Story> {
  for (let i = 0; i < 60; i++) {
    const s = await story(page, (x) => x.mode === 'story', 'story');
    if (pred(s)) return s;
    if (s.type === 'line') await tapStage(page, mode);
    else if (s.type === 'choice') await press(page, s.buttons[0]!, mode);
    else throw new Error(`unexpected node before ${what}: ${JSON.stringify(s)}`);
    await story(page, (x) => x.revision !== s.revision, `advance towards ${what}`);
    await page.waitForTimeout(80);
  }
  throw new Error(`never reached ${what}`);
}
/** Start Season One, choose girl + a name, and stop on the first moving-day line. */
async function toDeparture(page: Page, mode: 'touch' | 'mouse'): Promise<Story> {
  page.on('dialog', (d) => void d.accept('Zoë'));
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await press(page, 'story-button', mode);
  for (let i = 0; i < 12; i++) {
    const s = await story(page, (x) => x.mode === 'story', 'story loaded');
    if (s.adapter === 'identity') break;
    if (s.type !== 'line') throw new Error(`unexpected node before identity: ${JSON.stringify(s)}`);
    await tapStage(page, mode);
    await story(page, (x) => x.revision !== s.revision, 'advance to identity');
  }
  await press(page, 'id-girl', mode);
  await press(page, 'id-name', mode);
  await page.waitForTimeout(200);
  await press(page, 'id-confirm', mode);
  await story(page, (s) => s.scene !== 'S1_PRO_IDENTITY', 'identity confirmed');
  // Wait for the art layer too: it switches to the new scene on the next frame, after the story cursor.
  return advanceTo(page, mode, (s) => s.scene === 'S1_PRO_DEPART' && s.type === 'line' && s.art?.scene === 'S1_PRO_DEPART', 'departure line');
}
async function toAquarium(page: Page, mode: 'touch' | 'mouse'): Promise<Story> {
  await toDeparture(page, mode);
  return advanceTo(page, mode, (s) => s.scene === 'S1_PRO_ROOM' && s.type === 'line', 'aquarium line');
}

test('Season One cutscenes: departure plate and aquarium for the chosen girl, speaker highlight, never write story state', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await toDeparture(page, modeFor(info));
  const depart = await story(page, (x) => x.art?.backgroundShown === true, 'departure art loaded');
  expect(depart.art!.background).toBe('departure-girl');
  // Mom speaks at the departure, but the car painting already shows her and the player: no second portrait of either.
  expect(depart.art!.embedded).toEqual(['caregiver', 'player']);
  expect(depart.art!.castInBackdrop).toBe(true);
  expect(depart.art!.cast).toEqual([]);
  const s = await advanceTo(page, modeFor(info), (x) => x.scene === 'S1_PRO_ROOM' && x.type === 'line', 'aquarium line');
  const ready = await story(page, (x) => x.art?.backgroundShown === true && (x.art?.cast.every((c) => c.state === 'shown') ?? false), 'art loaded');
  // The owner's aquarium painting for the saved girl already shows her and Cloudy: no portraits on top.
  expect(ready.art!.background).toBe('s1-tank-girl');
  expect(ready.art!.castInBackdrop).toBe(true);
  expect(ready.art!.cast).toEqual([]);
  const speaking = ready.art!.cast.filter((c) => c.speaking).map((c) => c.role);
  expect(speaking).toEqual(ready.art!.speakerRole ? [ready.art!.speakerRole] : []);
  // Image loading and idle time do not advance or rewrite the story.
  await page.waitForTimeout(1200);
  const idle = (await diagnostics(page)).gameplay as Story;
  expect(idle.revision).toBe(s.revision);
  expect(idle.scene).toBe('S1_PRO_ROOM');
  expect(errors).toEqual([]);
});

test.describe('reduced motion', () => {
  test('reduced motion is honoured and the art textures are released on leaving the story', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toAquarium(page, modeFor(info));
    const s = await story(page, (x) => x.art?.backgroundShown === true, 'art loaded');
    expect(s.art!.reducedMotion).toBe(true);
    await press(page, 'story-menu', modeFor(info));
    await waitForScene(page, 'start');
    const keys = (await diagnostics(page)).textureKeys as readonly string[];
    // Only the start screen's own illustration may be resident once the story has shut down.
    expect(keys.filter((k) => k.startsWith('art-v1:'))).toEqual(keys.includes('art-v1:home-screen') ? ['art-v1:home-screen'] : []);
  });
});

test('missing art falls back to labelled placeholders and the story still advances', async ({ page }, info) => {
  await page.route('**/*.webp', (r) => r.abort());
  // Departure: the car painting fails; Mom is painted into it, so no standalone Mom is cast even then.
  const s = await toDeparture(page, modeFor(info));
  expect(s.art!.backgroundShown).toBe(false);
  expect(s.art!.cast).toEqual([]);
  await tapStage(page, modeFor(info));
  await story(page, (x) => x.revision !== s.revision, 'advanced past a line with missing art');
  // Aquarium: the painted backdrop fails, so nothing claims the cast is in the backdrop, and the story still advances.
  const tank = await advanceTo(page, modeFor(info), (x) => x.scene === 'S1_PRO_ROOM' && x.type === 'line', 'aquarium line');
  expect(tank.art!.backgroundShown).toBe(false);
  await tapStage(page, modeFor(info));
  await story(page, (x) => x.revision !== tank.revision, 'advanced past an aquarium line with missing art');
});

test('Art Gallery is reachable from Review & Lab, lists every asset with its status, and does not create a player', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await press(page, 'review-button', mode);
  await waitForScene(page, 'career');
  await press(page, 'hub-art', mode);
  await waitForScene(page, 'gallery');
  const seen = new Set<string>();
  for (let i = 0; i < 11; i++) {
    const g = await (async () => {
      let v: { page: { kind: string }; shown: string[]; loaded: string[]; title: string; gaps: number } | null = null;
      await expect.poll(async () => {
        v = (await diagnostics(page)).gameplay as typeof v;
        return v!.page.kind !== 'assets' || v!.loaded.length === v!.shown.length;
      }, { message: `gallery page ${i} loaded` }).toBe(true);
      return v!;
    })();
    if (g.page.kind === 'assets') g.shown.forEach((id) => seen.add(id));
    // Only the visible page stays decoded (no textures from pages already left).
    const resident = ((await diagnostics(page)).textureKeys as readonly string[]).filter((k) => k.startsWith('art-v1:'));
    expect(resident.length).toBeLessThanOrEqual(g.page.kind === 'assets' ? 6 : 0);
    if (g.page.kind === 'gaps') expect(g.gaps).toBeGreaterThan(0);
    await press(page, 'gallery-next', mode);
  }
  expect(seen.size).toBe(64); // 42 + v1.2 crossbar-schoolyard and training-bell94 + 12 Mom v2 portraits, 2 aquarium paintings, the V3 home menu and 5 phone poses
  await press(page, 'gallery-back', mode);
  await waitForScene(page, 'career');
  const career = (await diagnostics(page)).gameplay as { player: string | null; screen: string };
  expect(career.screen).toBe('reviewHub');
  expect(career.player).toBeNull();
  expect(errors).toEqual([]);
});

/** Presentation-only staging: show one authored node of another scene without advancing or saving the story. */
async function stage(page: Page, sceneId: string, nodeId: string): Promise<Story> {
  await page.evaluate(([sid, nid]) => {
    const sc = (window as unknown as { __SMR__: { game: { scene: { getScene(k: string): unknown } } } }).__SMR__.game.scene.getScene('story') as { state: object; render(): void };
    sc.state = { ...sc.state, sceneId: sid, nodeId: nid };
    sc.render();
  }, [sceneId, nodeId]);
  return story(page, (x) => x.scene === sceneId && x.art?.nodeId === nodeId, `${sceneId}.${nodeId} staged`);
}
const shown = (s: Story) => s.art!.cast.filter((c) => c.visible).map((c) => `${c.role}:${c.assetId}`);

test('Mom v2: casual expression per line over an empty backdrop, cleared on narration and choices, never stale across scenes', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await toDeparture(page, modeFor(info));
  await stage(page, 'S1_W01_P', 'v2n43');
  const laugh = await story(page, (x) => x.art!.cast.every((c) => c.state === 'shown'), 'home cast loaded');
  expect(laugh.art!.embedded).toEqual([]);
  expect(shown(laugh)).toContain('caregiver:mom2-casual-laughing');
  // Same scene, next beat: her expression changes, her outfit does not.
  const firm = await stage(page, 'S1_W01_P', 'v2n21');
  expect(shown(firm)).toContain('caregiver:mom2-casual-firm');
  // Narration and choices clear every portrait.
  expect(shown(await stage(page, 'S1_W01_P', 'v2n47'))).toEqual([]);
  expect(shown(await stage(page, 'S1_W01_P', 'worry'))).toEqual([]);
  // Back into the car: the painted Mom and player get no overlay, and nothing from the home scene lingers.
  const car = await stage(page, 'S1_PRO_DEPART', 'v2n20');
  expect(car.art!.cast).toEqual([]);
  expect(((await diagnostics(page)).textureKeys as readonly string[]).includes('art-v1:mom-neutral')).toBe(false);
  // Week 2 home (owner rewrite): Mom appears only while she speaks, and only once.
  await stage(page, 'S1_W02_H', 'v3n4');
  await story(page, (x) => x.art!.backgroundShown && x.art!.cast.every((c) => c.state === 'shown'), 'home loaded');
  expect(shown(await story(page, (x) => x.art!.cast.some((c) => c.visible), 'mom shown')).filter((r) => r.startsWith('caregiver:'))).toEqual(['caregiver:mom2-casual-neutral']);
  expect(errors).toEqual([]);
});

test('Phone poses: only the scripted phone lines show the matching character on a phone, nobody duplicated', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await toDeparture(page, modeFor(info));
  const scenes = (JSON.parse(readFileSync('docs/story/season-one/season_one_scenes.json', 'utf8')) as { scenes: { id: string; nodes: { id: string; type: string; speaker?: string; text?: string }[] }[] }).scenes;
  const node = (sid: string, speaker: string, text: string) => scenes.find((s) => s.id === sid)!.nodes.find((n) => n.type === 'line' && n.speaker === speaker && n.text!.startsWith(text))!.id;
  const at = async (sid: string, speaker: string, text: string, shot: string) => {
    await stage(page, sid, node(sid, speaker, text));
    const s = await story(page, (x) => x.art!.backgroundShown && x.art!.cast.filter((c) => c.visible).every((c) => c.state === 'shown'), `${sid} ${shot} loaded`);
    await page.screenshot({ path: info.outputPath(`${shot}.png`) });
    return shown(s);
  };
  expect(await at('S1_W02_T', 'Sam', 'Found our team.', 'w2-sam-rankings')).toContain('sam:phone-sam');
  expect(await at('S1_W02_T', 'Player', 'Near the top?', 'w2-player')).not.toContain('player:phone-girl');
  expect(await at('S1_W02_T', 'Coach Code', 'Control it, find a pass', 'w2-coach')).not.toContain('sam:phone-sam');
  expect(await at('S1_W06_T', 'Sam', "Here's where we are.", 'w6-sam-rankings')).toContain('sam:phone-sam');
  expect(await at('S1_W07_M', 'Sam', 'Checking your ranking?', 'w7-blake-rankings')).toContain('blake:phone-blake');
  expect(await at('S1_W08_T', 'Sam', "Blake's late.", 'w8-sam-chat')).toContain('sam:phone-sam');
  expect(await at('S1_W08_T', 'Coach Code', 'Bring it in.', 'w8-phone-away')).not.toContain('sam:phone-sam');
  expect(await at('S1_W09_M', 'Sam', 'Two out-of-state teams', 'w9-sam-showcase')).toContain('sam:phone-sam');
  expect(errors).toEqual([]);
});
