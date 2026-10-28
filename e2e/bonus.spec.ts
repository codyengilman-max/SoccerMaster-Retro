import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { diagnostics, pressElement as pressAny, revealElement, trackConsoleErrors, waitForScene } from './helpers';

const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';
async function pressElement(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  const d = await diagnostics(page);
  if (d.activeScenes.includes('myPlayer')) await revealElement(page, name);
  return pressAny(page, name, mode);
}
type MP = { status: string; bonus: { points: number; awards: string[] } | null; attributes: Record<string, number> | null; bonusNote: string | null };
type Fish = { fit: { scale: number }; screen: string; phase: string; caught: number; total: number; savedMessage: string; fish: { screen: { x: number; y: number } }; pellets: { screen: { x: number; y: number } }[] };
const gp = async <T>(page: Page): Promise<T> => (await diagnostics(page)).gameplay as T;

async function myPlayer(page: Page, mode: 'touch' | 'mouse'): Promise<MP> {
  await page.goto('/?debug=1&dev&cloudySpeed=2');
  await waitForScene(page, 'start');
  await pressElement(page, 'my-player-button', mode);
  await waitForScene(page, 'myPlayer');
  await expect.poll(async () => (await gp<MP>(page)).status, { timeout: 15_000 }).toBe('ready');
  return gp<MP>(page);
}

test('Bonus Attribute Points: earn Cloudy Champion with 3 stars, spend +1 once, survives reload', async ({ page }, info) => {
  test.setTimeout(480_000);
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Kid'));
  await page.goto('/?debug=1&dev&cloudySpeed=2');
  await waitForScene(page, 'start');
  await pressElement(page, 'career-button', mode);
  await waitForScene(page, 'career');
  await pressElement(page, 'pos-MID', mode);
  await page.waitForTimeout(400);

  let g = await myPlayer(page, mode);
  expect(g.bonus).toEqual({ points: 0, awards: [] });

  await page.goto('/?debug=1&dev&cloudySpeed=2');
  await waitForScene(page, 'start');
  await pressElement(page, 'cloudy-button', mode);
  await waitForScene(page, 'cloudy');
  // A real round on Easy; 3 stars needs 85% of the food. A scripted swimmer manages that in roughly half of the
  // random rounds, so play again (same as a player would) until one earns 3 stars.
  let s: Fish | null = null;
  for (let round = 0; round < 8; round++) {
    await pressElement(page, round === 0 ? 'cloudy-easy-button' : 'replay-button', mode);
    await expect.poll(async () => (await gp<Fish>(page)).phase, { timeout: 10_000 }).toBe('playing');
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          type G = { fit: { scale: number }; screen: string; fish: { screen: { x: number; y: number } }; pellets: { screen: { x: number; y: number } }[] };
          const smr = (window as unknown as { __SMR__: { diagnostics(): { gameplay: G } } }).__SMR__;
          const c = document.querySelector('canvas')!;
          const fire = (type: string, x: number, y: number) => {
            const r = c.getBoundingClientRect();
            c.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: r.left + x, clientY: r.top + y, button: 0, buttons: type === 'mouseup' ? 0 : 1 }));
          };
          const g0 = smr.diagnostics().gameplay;
          fire('mousedown', g0.fish.screen.x, g0.fish.screen.y);
          const end = Date.now() + 90_000;
          let lock: { x: number; dir: number } | null = null;
          const tick = () => {
            const g = smr.diagnostics().gameplay;
            if (g.screen !== 'game' || Date.now() > end) {
              fire('mouseup', g.fish.screen.x, g.fish.screen.y);
              return done();
            }
            const f = g.fish.screen;
            const p = g.pellets.slice().sort((a, b) => b.screen.y - a.screen.y)[0];
            if (p) {
              // Commit to a side per pellet (they sink straight down), or he turns back and forth across it.
              if (!lock || Math.abs(lock.x - p.screen.x) > 1) lock = { x: p.screen.x, dir: p.screen.x >= f.x ? 1 : -1 };
              const dir = lock.dir;
              fire('mousemove', p.screen.x - dir * 72 * g.fit.scale, p.screen.y + 6 * g.fit.scale);
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    await expect.poll(async () => (await gp<Fish>(page)).savedMessage, { timeout: 10_000 }).not.toBe('');
    s = await gp<Fish>(page);
    if (s.caught / s.total >= 0.85) break;
  }
  expect(s!.caught / s!.total, `caught ${s!.caught}/${s!.total}`).toBeGreaterThanOrEqual(0.85);

  g = await myPlayer(page, mode);
  expect(g.bonus).toEqual({ points: 1, awards: ['cloudyChampion:w1'] });
  const before = g.attributes!;
  const pass0 = before.passing!;

  // Spend: +1 passing, exactly once; with no points left the spend buttons are gone.
  await pressElement(page, 'my-player-spend-passing', mode);
  await expect.poll(async () => (await gp<MP>(page)).bonus?.points, { timeout: 10_000 }).toBe(0);
  g = await gp<MP>(page);
  expect(g.attributes!.passing).toBe(pass0 + 1);
  expect(g.bonusNote).toMatch(/Passing is now/);
  const d = await diagnostics(page);
  expect(d.layout?.elements['my-player-spend-passing']).toBeUndefined();

  // Reload: the point stays spent, the attribute stays raised, nothing is paid twice.
  g = await myPlayer(page, mode);
  expect(g.bonus).toEqual({ points: 0, awards: ['cloudyChampion:w1'] });
  expect(g.attributes).toEqual({ ...before, passing: pass0 + 1 });
  expect(errors).toEqual([]);
});
