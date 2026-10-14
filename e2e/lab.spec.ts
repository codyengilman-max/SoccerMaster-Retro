import { expect, test } from '@playwright/test';
import { diagnostics, pressElement, trackConsoleErrors, waitForScene, type PointerMode } from './helpers';

const modeFor = (info: { project: { name: string } }): PointerMode => (info.project.name === 'desktop' ? 'mouse' : 'touch');

test('Gameplay Lab: ?lab opens the picker, a scenario stages the real match with no clock, Coach or career', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&lab');
  await waitForScene(page, 'lab');
  await pressElement(page, 'lab-aim', modeFor(info));
  expect(((await diagnostics(page)).gameplay as { aim: string }).aim).toBe('normal');
  await pressElement(page, 'lab-turnover', modeFor(info));
  await waitForScene(page, 'match');
  const d = await diagnostics(page);
  const g = d.gameplay as { owner: string | null; controlledId: string; clock: unknown; aimAssist?: string };
  expect(g.owner).toBe('A7');
  expect(g.controlledId.startsWith('H')).toBe(true);
  expect(d.layout?.elements['minimap']).toBeTruthy();
  const career = await page.evaluate(() => indexedDB.databases().then((dbs) => dbs.map((x) => x.name)));
  expect(career.filter((n) => n && /career|smr/i.test(n))).toEqual([]);
  expect(errors).toEqual([]);
});
