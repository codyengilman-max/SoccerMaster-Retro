import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement, trackConsoleErrors, waitForScene } from './helpers';

type Story = { mode: string; scene: string | null; type?: string; adapter?: string; revision: number; text: string; buttons: string[] };
test.describe.configure({ timeout: 180_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  await expect.poll(async () => Boolean((await diagnostics(page)).layout?.elements?.[name]), { message: `${name} on screen` }).toBe(true);
  await pressElement(page, name, mode);
}
async function story(page: Page, pred: (s: Story) => boolean, what: string): Promise<Story> {
  let last: Story | null = null;
  await expect.poll(async () => {
    const d = await diagnostics(page);
    last = d.activeScenes[0] === 'story' ? (d.gameplay as Story) : null;
    return Boolean(last && last.mode !== 'loading' && pred(last));
  }, { message: what, timeout: 20_000 }).toBe(true);
  return last!;
}
async function tapStage(page: Page, mode: 'touch' | 'mouse'): Promise<void> {
  const c = (await page.locator('canvas').boundingBox())!;
  const p = { x: c.x + c.width / 2, y: c.y + c.height * 0.3 };
  if (mode === 'touch') await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
/** New game, pick the protagonist, confirm the identity (this creates the career player). */
async function newPlayer(page: Page, mode: 'touch' | 'mouse', gender: 'boy' | 'girl'): Promise<void> {
  page.on('dialog', (d) => void d.accept(gender === 'girl' ? 'Zoë' : 'Leo'));
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  await press(page, 'story-button', mode);
  for (let i = 0; i < 12; i++) {
    const s = await story(page, (x) => x.mode === 'story', 'story loaded');
    if (s.adapter === 'identity') break;
    await tapStage(page, mode);
    await story(page, (x) => x.revision !== s.revision, 'advance to identity');
  }
  await press(page, `id-${gender}`, mode);
  await press(page, 'id-name', mode);
  await page.waitForTimeout(200);
  await press(page, 'id-confirm', mode);
  await story(page, (s) => s.scene !== 'S1_PRO_IDENTITY', 'identity confirmed');
}
/** Show a Season One node without changing the saved story (render-only staging, as graphics.spec does). */
async function stage(page: Page, sceneId: string, nodeId: string): Promise<Story> {
  await page.evaluate(([sid, nid]) => {
    const sc = (window as unknown as { __SMR__: { game: { scene: { getScene(k: string): unknown } } } }).__SMR__.game.scene.getScene('story') as { state: object; render(): void };
    sc.state = { ...sc.state, sceneId: sid, nodeId: nid };
    sc.render();
  }, [sceneId, nodeId]);
  return story(page, (x) => x.scene === sceneId && x.adapter === 'home_hub', `${sceneId}.${nodeId} staged`);
}

for (const gender of ['boy', 'girl'] as const) {
  test(`weekly home screen (${gender}): next step, competition, player and team on one screen; Next opens the lesson in one tap`, async ({ page }, info) => {
    const mode = modeFor(info);
    const errors = trackConsoleErrors(page);
    await newPlayer(page, mode, gender);
    for (const [sceneId, competition] of [['S1_W09_H', 'THIS WEEK: AZ Showcase tournament this week'], ['S1_W05_H', 'THIS WEEK: League game 3 of 12 this week']] as const) {
      const hub = await stage(page, sceneId, 'v3a1');
      const text = (await story(page, (x) => x.scene === sceneId && x.text.includes('TEAM:') && !x.text.includes('loading saved results'), 'season panel loaded')).text;
      expect(text.split('\n')[0]).toMatch(new RegExp(`^WEEK ${sceneId === 'S1_W09_H' ? 9 : 5} · `));
      expect(text).toContain('NEXT: Juggling task');
      expect(text).toContain(competition);
      expect(text).toMatch(/MY PLAYER: (overall \d+\.\d \(Season 1 maximum 64\)|\d+\.\d of 64 max)/);
      expect(text).not.toMatch(/HOME MENU|career week|review build|situation/i);
      expect(hub.buttons[0]).toBe('hub-next');
      expect(hub.buttons).not.toContain('hub-continue');
      const d = await diagnostics(page);
      for (const [name, rect] of Object.entries(d.layout!.elements)) if (name !== 'body' && name !== 'panel') expectInside(name, rect, d.layout!.viewport);
      const txt = d.layout!.elements['story-text']!, first = d.layout!.elements['hub-next']!;
      expect(txt.y + txt.height, 'board text clears the buttons').toBeLessThanOrEqual(first.y);
      if (sceneId === 'S1_W05_H') await page.screenshot({ path: info.outputPath(`home-board-${gender}-${info.project.name}.png`) });
    }
    // One tap from the weekly home screen to this week's assigned lesson (was: Training, then Continue).
    await press(page, 'hub-next', mode);
    await waitForScene(page, 'career');
    await expect.poll(async () => ((await diagnostics(page)).gameplay as { screen?: string } | null)?.screen, { message: 'lesson open' }).toBe('activity');
    const lesson = String(((await diagnostics(page)).gameplay as { text?: string }).text);
    expect(lesson).not.toMatch(/review build|never game attributes/);
    await press(page, 'career-menu', mode);
    await story(page, (x) => x.mode === 'story', 'back in the story');
    expect(errors).toEqual([]);
  });
}
