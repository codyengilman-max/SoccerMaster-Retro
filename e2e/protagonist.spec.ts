import { expect, test, type Page } from '@playwright/test';
import { diagnostics, pressElement, trackConsoleErrors, waitForScene } from './helpers';

async function saveGender(page: Page, gender: 'boy' | 'girl'): Promise<void> {
  await page.evaluate(
    (g) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('smr-career', 1);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const st = r.result.transaction('career', 'readwrite').objectStore('career');
          const q = st.get('main');
          q.onsuccess = () => {
            const raw = q.result as unknown;
            const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
            v.player.gender = g;
            const w = st.put(typeof raw === 'string' ? JSON.stringify(v) : v, 'main');
            w.onsuccess = () => resolve();
            w.onerror = () => reject(w.error);
          };
        };
      }),
    gender,
  );
}
const careerKeys = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const r = indexedDB.open('smr-career', 1);
        r.onsuccess = () => {
          const q = r.result.transaction('career').objectStore('career').getAllKeys();
          q.onsuccess = () => resolve(q.result.map(String));
        };
      }),
  );
const gameplay = async (page: Page) => (await diagnostics(page)).gameplay as unknown as { teamTraining?: { phase: string; protagonist?: { id: string; set: string | null } | null }; controlledId?: string };
async function press(page: Page, name: string): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const els = (await diagnostics(page)).layout?.elements ?? {};
    if (els[name] || !els.more) return pressElement(page, name, 'touch');
    await pressElement(page, 'more', 'touch');
    await page.waitForTimeout(50);
  }
  return pressElement(page, name, 'touch');
}
const screen = (page: Page, s: string) => page.waitForFunction((s) => (window.__SMR__?.diagnostics().gameplay as { screen?: string; status?: string } | null)?.screen === s, s, { timeout: 20_000 });

test('Team Training: the saved girl is the player you control in every situation; New game archives the old career', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Ava'));
  await page.goto('/?debug=1&dev&ttSpeed=8&ttProposals');
  await waitForScene(page, 'start');
  await pressElement(page, 'career-button', 'touch');
  await waitForScene(page, 'career');
  await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { status?: string } | null)?.status !== 'loading');
  await pressElement(page, 'pos-FWD', 'touch');
  await screen(page, 'setup');
  await saveGender(page, 'girl');
  // Open Team Training straight from a fresh scene load so the saved gender is read.
  await page.goto('/?debug=1&dev&ttSpeed=8&ttProposals');
  await waitForScene(page, 'start');
  await pressElement(page, 'career-button', 'touch');
  await waitForScene(page, 'career');
  await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { status?: string } | null)?.status !== 'loading');
  await press(page, 'nav-team');
  await screen(page, 'team');
  await press(page, 'tt12-A');
  await waitForScene(page, 'tactical');
  await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { screen?: string } | null)?.screen === 'role', null, { timeout: 30_000 });
  const g = (await gameplay(page)) as unknown as { look: string | null };
  expect(g.look).toBe('girl');

  // Player start screen: New game needs a second tap, then the career is archived and the story starts fresh.
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  expect(await careerKeys(page)).toContain('main');
  await pressElement(page, 'newgame-button', 'touch');
  await page.waitForTimeout(300);
  expect((await diagnostics(page)).activeScenes).toEqual(['start']);
  await pressElement(page, 'newgame-button', 'touch');
  await waitForScene(page, 'story');
  await page.waitForFunction(() => (window.__SMR__?.diagnostics().gameplay as { mode?: string } | null)?.mode !== 'loading', null, { timeout: 30_000 });
  const keys = await careerKeys(page);
  expect(keys).not.toContain('main');
  expect(keys.some((k) => k.startsWith('archive-'))).toBe(true);
  expect(errors).toEqual([]);
});
