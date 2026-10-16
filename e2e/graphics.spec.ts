import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement, trackConsoleErrors, waitForScene } from './helpers';

type Cast = { role: string; assetId: string | null; state: string; visible: boolean; speaking: boolean };
type Art = { scene: string | null; mapped: boolean; background: string | null; backgroundShown: boolean; speakerRole: string | null; cast: Cast[]; reducedMotion: boolean; textures: number };
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
/** Start the story, choose girl + a name, and stop on the first bedroom line. */
async function toBedroom(page: Page, mode: 'touch' | 'mouse'): Promise<Story> {
  page.on('dialog', (d) => void d.accept('Zoë'));
  await page.goto('/?debug=1');
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
  return story(page, (s) => s.scene === 'W1_HOME_01' && s.type === 'line', 'bedroom line');
}

test('cutscenes show the mapped backdrop and pinned home outfit, highlight the speaker, and never write story state', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const s = await toBedroom(page, modeFor(info));
  const ready = await story(page, (x) => x.art?.backgroundShown === true && (x.art?.cast.every((c) => c.state === 'shown') ?? false), 'art loaded');
  expect(ready.art!.background).toBe('bedroom');
  expect(ready.art!.cast.map((c) => [c.role, c.assetId])).toEqual([['player', 'girl-home'], ['fish', 'fish-tank']]);
  const speaking = ready.art!.cast.filter((c) => c.speaking).map((c) => c.role);
  expect(speaking).toEqual(ready.art!.speakerRole ? [ready.art!.speakerRole] : []);
  // Image loading and idle time do not advance or rewrite the story.
  await page.waitForTimeout(1200);
  const idle = (await diagnostics(page)).gameplay as Story;
  expect(idle.revision).toBe(s.revision);
  expect(idle.scene).toBe('W1_HOME_01');
  expect(errors).toEqual([]);
});

test.describe('reduced motion', () => {
  test('reduced motion is honoured and the art textures are released on leaving the story', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toBedroom(page, modeFor(info));
    const s = await story(page, (x) => x.art?.backgroundShown === true, 'art loaded');
    expect(s.art!.reducedMotion).toBe(true);
    await press(page, 'story-menu', modeFor(info));
    await waitForScene(page, 'start');
    const keys = (await diagnostics(page)).textureKeys as readonly string[];
    expect(keys.filter((k) => k.startsWith('art-v1:'))).toEqual([]);
  });
});

test('missing art falls back to labelled placeholders and the story still advances', async ({ page }, info) => {
  await page.route('**/*.webp', (r) => r.abort());
  const s = await toBedroom(page, modeFor(info));
  const failed = await story(page, (x) => (x.art?.cast.length ?? 0) > 0 && x.art!.cast.every((c) => c.state === 'failed'), 'fallback');
  expect(failed.art!.backgroundShown).toBe(false);
  expect(failed.art!.cast.every((c) => c.assetId !== null)).toBe(true);
  await tapStage(page, modeFor(info));
  await story(page, (x) => x.revision !== s.revision, 'advanced past a line with missing art');
});

test('Art Gallery is reachable from Review & Lab, lists every asset with its status, and does not create a player', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await press(page, 'review-button', mode);
  await waitForScene(page, 'career');
  await press(page, 'hub-art', mode);
  await waitForScene(page, 'gallery');
  const seen = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const g = await (async () => {
      let v: { page: { kind: string }; shown: string[]; loaded: string[]; title: string; gaps: number } | null = null;
      await expect.poll(async () => {
        v = (await diagnostics(page)).gameplay as typeof v;
        return v!.page.kind !== 'assets' || v!.loaded.length === v!.shown.length;
      }, { message: `gallery page ${i} loaded` }).toBe(true);
      return v!;
    })();
    if (g.page.kind === 'assets') g.shown.forEach((id) => seen.add(id));
    if (g.page.kind === 'gaps') expect(g.gaps).toBeGreaterThan(0);
    await press(page, 'gallery-next', mode);
  }
  expect(seen.size).toBe(28);
  await press(page, 'gallery-back', mode);
  await waitForScene(page, 'career');
  const career = (await diagnostics(page)).gameplay as { player: string | null; screen: string };
  expect(career.screen).toBe('reviewHub');
  expect(career.player).toBeNull();
  expect(errors).toEqual([]);
});
