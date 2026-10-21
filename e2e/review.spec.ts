import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, expectInside, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

type Career = { screen: string; credit: number; journal: number; player: string | null; plan: string[]; status: string; text: string; overflow: string[] };
type Rect = { x: number; y: number; width: number; height: number };
test.describe.configure({ timeout: 180_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const els = (await diagnostics(page)).layout?.elements ?? {};
    if (els[name] || !els.more) return pressAny(page, name, mode);
    await pressAny(page, 'more', mode);
    await page.waitForTimeout(50);
  }
  return pressAny(page, name, mode);
}
async function until(page: Page, pred: (c: Career) => boolean, what: string): Promise<Career> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const c = d.gameplay as Career | null;
    if (d.activeScenes.includes('career') && c && pred(c)) return c;
    if (Date.now() - start > 15_000) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(c)}`);
    await page.waitForTimeout(50);
  }
}
async function fits(page: Page): Promise<void> {
  const d = await diagnostics(page);
  for (const [name, rect] of Object.entries(d.layout!.elements)) if (name !== 'body') expectInside(name, rect, d.layout!.viewport);
  expect((d.gameplay as Career).overflow).toEqual([]);
}
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('Review & Lab hub reaches Training Review and the catalog-only Soccer Logic Review without touching the save', async ({ page }, info) => {
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev');
  await waitForScene(page, 'start');
  const start = await diagnostics(page);
  const els = start.layout!.elements as Record<string, Rect>;
  for (const other of ['sandbox-button', 'jungle-button', 'career-button', 'footer', 'subtitle']) expect(overlaps(els['review-button']!, els[other]!), other).toBe(false);
  expect(els['review-button']!.height).toBeGreaterThanOrEqual(44);

  await press(page, 'review-button', mode);
  await waitForScene(page, 'career');
  let c = await until(page, (x) => x.status === 'ok' && x.screen === 'reviewHub', 'hub');
  expect(c.player).toBeNull();
  expect(c.text).toContain('Story & RPG: Start → Story plays Season One weeks 1–4 (owner scripts); weeks 5–18 are empty until new text is approved.');
  expect(c.text).toContain('U12, coming later');
  await fits(page);

  await press(page, 'hub-logic', mode);
  c = await until(page, (x) => x.screen === 'logic', 'logic');
  expect(c.text).toContain('CATALOG ONLY');
  expect(c.text).toContain('0 of 40 drive the game');
  expect(c.text).toContain('460 short');
  await fits(page);
  await press(page, 'logic-CB', mode);
  await until(page, (x) => x.screen === 'logic' && x.text.length > 0, 'group');
  await press(page, 'logic-item-CB01', mode);
  c = await until(page, (x) => x.screen === 'logicItem', 'item');
  expect(c.text).toContain('switched off');
  expect(c.text).toContain('Audit corrected this');
  await fits(page);

  await press(page, 'career-back', mode);
  await press(page, 'career-back', mode);
  await press(page, 'career-back', mode);
  await until(page, (x) => x.screen === 'reviewHub', 'hub again');
  await press(page, 'hub-training', mode);
  c = await until(page, (x) => x.screen === 'drafts', 'drafts');
  expect(c.text).toContain('ENABLED BY OWNER, NOT COACH-CERTIFIED');
  expect(c.text).toContain('published: 0');
  await fits(page);
  expect(c.credit).toBe(0);
  expect(c.journal).toBe(0);
  expect(c.plan).toEqual([]);
  expect(c.player).toBeNull();
  expect(errors).toEqual([]);
});
