import { expect, test } from '@playwright/test';
import { diagnostics, pressElement, trackConsoleErrors, waitForScene, type PointerMode } from './helpers';

const modeFor = (info: { project: { name: string } }): PointerMode => (info.project.name === 'desktop' ? 'mouse' : 'touch');

test('Gameplay Lab: ?lab opens the picker, a scenario stages the real match with no clock, Coach or career', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev&lab');
  await waitForScene(page, 'lab');
  // No scenario row may overlap another row, at any viewport.
  const els = Object.entries((await diagnostics(page)).layout?.elements ?? {}).filter(([k]) => k.startsWith('lab-'));
  // 14 scenarios (10 feel + 4 controls setups); the zoom toggle is gone with the old camera.
  expect(els.length).toBe(14);
  for (let i = 0; i < els.length; i++)
    for (let j = i + 1; j < els.length; j++) {
      const [na, a] = els[i]!;
      const [nb, b] = els[j]!;
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlap, `${na} overlaps ${nb}`).toBe(false);
    }
  await pressElement(page, 'lab-turnover', modeFor(info));
  await waitForScene(page, 'match');
  const d = await diagnostics(page);
  expect((d.gameplay as { camera: { zoom?: number } }).camera.zoom).toBeUndefined();
  const g = d.gameplay as {
    owner: string | null;
    controlledId: string;
    clock: unknown;
  };
  expect(g.owner).toBe('A7');
  expect(g.controlledId.startsWith('H')).toBe(true);
  expect(d.layout?.elements['minimap']).toBeTruthy();
  const career = await page.evaluate(() => indexedDB.databases().then((dbs) => dbs.map((x) => x.name)));
  expect(career.filter((n) => n && /career|smr/i.test(n))).toEqual([]);
  expect(errors).toEqual([]);
});

test('Gameplay Lab: the controls setups stage their carrier and runner', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/?debug=1&dev&lab');
  await waitForScene(page, 'lab');
  await pressElement(page, 'lab-through-ball', modeFor(info));
  await waitForScene(page, 'match');
  const g = (await diagnostics(page)).gameplay as { owner: string | null; controlledId: string };
  expect(g.owner).toBe('H8');
  expect(g.controlledId).toBe('H8');
  expect(errors).toEqual([]);
});
