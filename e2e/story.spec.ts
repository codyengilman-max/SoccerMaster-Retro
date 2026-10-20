import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { idealPower } from '../src/game/story/crossbar';
import { thresholdsFor } from '../src/input';
import { Finger, diagnostics, finishTeamTraining, pressElement as pressAny, trackConsoleErrors, waitForScene } from './helpers';

// Season One on one isolated save: identity -> prologue -> week one (aquarium, recess, Coach Code with the
// real Team Training handoff) -> week close -> week 2, then reload. Later weeks: tests/season-story.test.ts.

type Story = {
  mode: string; scene: string | null; node: string | null; type: string | null; adapter: string | null; revision: number; complete: boolean;
  text: string; hint: string; message: string; buttons: string[]; decisions: Record<string, Record<string, string>>;
  outcomes: { scene: string; state: string; outcome: string | null; result: string | null }[];
  player: { name: string; gender: string | null } | null;
  crossbar: { status: string; next: { participant: string } | null; player: number; blake: number; animating: boolean; ready: boolean } | null;
};
type Layout = { elements: Record<string, { x: number; y: number; width: number; height: number }>; viewport: { width: number; height: number } };

test.describe.configure({ timeout: 300_000 });
const modeFor = (info: TestInfo) => (info.project.use.hasTouch ? 'touch' : 'mouse') as 'touch' | 'mouse';

async function pressStory(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  // The story re-renders its handoff after an async save read on return; wait for the button to exist.
  for (let t = Date.now(); Date.now() - t < 15_000; await page.waitForTimeout(50)) {
    if ((await diagnostics(page)).layout?.elements?.[name]) break;
  }
  try {
    await pressAny(page, name, mode);
  } catch (e) {
    const d = await diagnostics(page);
    throw new Error(`${(e as Error).message}: ${JSON.stringify(d.gameplay)} ${JSON.stringify(Object.keys(d.layout?.elements ?? {}))}`);
  }
}
async function press(page: Page, name: string, mode: 'touch' | 'mouse'): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const d = await diagnostics(page);
    const els = d.layout?.elements ?? {};
    if (els[name] || !d.activeScenes.includes('career') || !els.more) return pressAny(page, name, mode);
    await pressAny(page, 'more', mode);
    await page.waitForTimeout(50);
  }
  return pressAny(page, name, mode);
}
async function story(page: Page, pred: (s: Story) => boolean, what: string, ms = 20_000): Promise<Story> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    const g = d.gameplay as Story | null;
    if (d.activeScenes[0] === 'story' && g && g.mode !== 'loading' && pred(g)) return g;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${d.activeScenes.join(',')} ${JSON.stringify(g)}`);
    await page.waitForTimeout(50);
  }
}
async function scene(page: Page, key: string, pred: (g: Record<string, unknown>) => boolean, what: string, ms = 20_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const d = await diagnostics(page);
    if (d.activeScenes[0] === key && pred((d.gameplay ?? {}) as Record<string, unknown>)) return;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}: ${d.activeScenes.join(',')}`);
    await page.waitForTimeout(50);
  }
}
async function layout(page: Page): Promise<Layout> {
  return (await diagnostics(page)).layout as unknown as Layout;
}
async function openStory(page: Page, mode: 'touch' | 'mouse'): Promise<Story> {
  await page.goto('/?debug=1&halfSeconds=8&ttSeconds=2');
  await waitForScene(page, 'start');
  await pressAny(page, 'story-button', mode);
  return story(page, () => true, 'story loaded');
}

async function kick(page: Page, finger: Finger): Promise<void> {
  const l = await layout(page);
  const th = thresholdsFor(Math.min(l.viewport.width, l.viewport.height));
  const len = th.cancelRadius + idealPower() * (th.maxPull - th.cancelRadius);
  const from = { x: l.viewport.width / 2, y: 70 };
  await finger.down(from);
  for (let k = 1; k <= 6; k++) await finger.move({ x: from.x, y: from.y + (len * k) / 6 });
  await finger.up({ x: from.x, y: from.y + len });
}

// The launch already bumped the revision, so wait for the run itself to resolve after returning.
const resolved = (s: Story) => (x: Story) => x.scene !== s.scene || x.outcomes.some((o) => o.scene === s.scene && o.state === 'resolved');
// The dialogue text never runs under the choice or action buttons.
async function textClearsButtons(page: Page, buttons: string[]): Promise<void> {
  const l = await layout(page);
  const t = l.elements['story-text']!;
  for (const b of buttons) expect(t.y + t.height, `text vs ${b}`).toBeLessThanOrEqual(l.elements[b]!.y + 1);
}
async function playWeek(page: Page, mode: 'touch' | 'mouse', finger: Finger): Promise<Story> {
  // Owner weeks 1–2 are long (~175 lines in week one alone, each revealed then advanced).
  for (let i = 0; i < 1500; i++) {
    const s = await story(page, () => true, 'story');
    // Week one ends at the callback; the story now continues into the weeks 2–4 draft (covered by unit tests).
    if (s.complete || s.scene === 'S1_W02_M') return s;
    if (s.scene === 'W2_SCHOOL_CALLBACK') return story(page, (x) => `${x.text}\n${x.hint ?? ''}`.includes('Match:'), 'week one recap');
    if (s.mode === 'crossbar') {
      if (s.crossbar?.ready) {
        // Optional review captures (CAPTURE_DIR set): the Crossbar screen before each kick.
        if (process.env.CAPTURE_DIR) await page.screenshot({ path: `${process.env.CAPTURE_DIR}/crossbar-${page.viewportSize()?.width}x${page.viewportSize()?.height}-${s.crossbar.player + s.crossbar.blake}.png` });
        const before = s.crossbar.player + s.crossbar.blake;
        await kick(page, finger);
        await story(page, (x) => x.mode !== 'crossbar' || x.crossbar!.animating || x.crossbar!.next?.participant !== 'player' || x.crossbar!.player + x.crossbar!.blake > before, 'kick taken');
      } else await page.waitForTimeout(150);
      continue;
    }
    await page.waitForTimeout(120);
    const rev = s.revision;
    const moved = (x: Story) => x.revision !== rev || x.mode !== s.mode;
    if (s.type === 'line') {
      const l = await layout(page);
      await finger.tap({ x: l.viewport.width / 2, y: l.elements.panel!.y * 0.6 });
      await story(page, moved, `advance ${s.node}`);
    } else if (s.type === 'choice') {
      await textClearsButtons(page, s.buttons);
      const pick = s.buttons.find((b) => !/decline/.test(b)) ?? s.buttons[0]!;
      await pressStory(page, pick, mode);
      await story(page, moved, `choice ${s.node}`);
    } else if (s.adapter === 'identity') {
      await pressStory(page, 'id-girl', mode);
      await pressStory(page, 'id-name', mode);
      await story(page, (x) => x.text.includes('Zoë'), 'name');
      await page.waitForTimeout(120);
      await textClearsButtons(page, (await story(page, () => true, 'identity card')).buttons);
      await pressStory(page, 'id-confirm', mode);
      await story(page, resolved(s), 'identity');
    } else if (s.adapter === 'crossbar') {
      await pressStory(page, s.buttons.includes('crossbar-start') ? 'crossbar-start' : 'handoff-continue', mode);
      await story(page, (x) => x.mode === 'crossbar' || x.scene !== s.scene, 'crossbar start');
    } else if (s.adapter === 'training_arrangement' || s.adapter === 'weekly_focus' || s.adapter === 'practice') {
      await pressStory(page, 'handoff-career', mode);
      await scene(page, 'career', (g) => g.status !== 'loading' && g.screen === 'home', 'career home');
      if (s.adapter === 'training_arrangement') {
        await press(page, 'nav-focus', mode);
        await scene(page, 'career', (g) => g.screen === 'focus', 'focus');
        await press(page, 'nav-setup', mode);
        await scene(page, 'career', (g) => g.screen === 'setup', 'setup');
        await press(page, 'eq-ball', mode);
      } else if (s.adapter === 'weekly_focus') {
        await press(page, 'nav-focus', mode);
        await scene(page, 'career', (g) => g.screen === 'focus', 'focus');
        await press(page, 'focus-ft-cushion', mode);
        await scene(page, 'career', (g) => g.screen === 'sessions', 'sessions');
      } else {
        await press(page, 'nav-sessions', mode);
        await scene(page, 'career', (g) => g.screen === 'sessions', 'sessions');
        await press(page, 'open-w1-s1-0', mode);
        await scene(page, 'career', (g) => g.screen === 'activity', 'activity');
        await press(page, 'log-open', mode);
        await scene(page, 'career', (g) => g.screen === 'log', 'log');
        await press(page, 'r-comfortable', mode);
        await press(page, 'log-complete', mode);
        await press(page, 'log-complete', mode).catch(() => undefined);
        await scene(page, 'career', (g) => g.credit === 1, 'credit');
      }
      await page.waitForTimeout(300);
      await press(page, 'career-menu', mode);
      await story(page, resolved(s), `${s.adapter} completed`);
    } else if (s.adapter === 'team_training') {
      const team = (phase: string) => (g: Record<string, unknown>) => (g.teamTraining as { phase?: string } | null | undefined)?.phase === phase;
      await pressStory(page, 'handoff-career', mode);
      await scene(page, 'career', (g) => g.status !== 'loading' && g.screen === 'team', 'team screen');
      // Leaving during the first situation counts nothing and the story handoff stays open.
      await press(page, 'team-play', mode);
      await scene(page, 'match', team('playing'), 'first situation', 60_000);
      await pressAny(page, 'menu-button', mode);
      await scene(page, 'career', (g) => g.status !== 'loading' && g.screen === 'team', 'back on team screen');
      await press(page, 'career-menu', mode);
      const early = await story(page, (x) => x.mode === 'story', 'story after leaving early');
      expect(resolved(s)(early)).toBe(false);
      await pressStory(page, 'handoff-career', mode);
      await scene(page, 'career', (g) => g.status !== 'loading' && g.screen === 'team', 'team screen again');
      await press(page, 'team-play', mode);
      await finishTeamTraining(page, mode);
      await scene(page, 'match', team('done'), 'three situations', 120_000);
      await pressAny(page, 'menu-button', mode);
      await scene(page, 'career', (g) => g.status !== 'loading' && g.screen === 'team', 'counted');
      await page.waitForTimeout(300);
      await press(page, 'career-menu', mode);
      await story(page, resolved(s), 'team training completed');
    } else if (s.adapter === 'match') {
      await pressStory(page, 'handoff-match', mode);
      await waitForScene(page, 'formation');
      await pressAny(page, 'kickoff-button', mode);
      await scene(page, 'match', (g) => g.phase === 'live', 'match live', 60_000);
      await pressAny(page, 'menu-button', mode);
      // Leaving before full time finishes nothing: the same story match stays open to play again.
      const early = await story(page, (x) => x.message.includes('No full-time result'), 'early exit not counted');
      expect(resolved(s)(early)).toBe(false);
      await pressStory(page, 'handoff-match', mode);
      await waitForScene(page, 'formation');
      await pressAny(page, 'kickoff-button', mode);
      await scene(page, 'match', (g) => g.breakPanel === 'halftime', 'half-time', 120_000);
      await pressAny(page, 'second-half-button', mode);
      await scene(page, 'match', (g) => g.breakPanel === 'fulltime', 'full-time', 120_000);
      await pressAny(page, 'break-menu-button', mode);
      await story(page, resolved(s), 'match completed');
    } else if (s.adapter === 'assignment') {
      await pressStory(page, 'handoff-continue', mode);
      await story(page, resolved(s), 'assignment');
    } else if (s.adapter === 'week_close') {
      await pressStory(page, 'handoff-week', mode);
      await story(page, resolved(s), 'week close');
    } else throw new Error(`unhandled ${JSON.stringify(s)}`);
  }
  throw new Error('story did not finish');
}

test('Season One week one: identity, prologue, aquarium, recess, Team Training handoff, week close, reload', async ({ page }, info) => {
  test.setTimeout(900_000);
  const mode = modeFor(info);
  const errors = trackConsoleErrors(page);
  page.on('dialog', (d) => void d.accept('Zoë'));
  const finger = new Finger(page, mode);
  const first = await openStory(page, mode);
  expect(first).toMatchObject({ scene: 'S1_PRO_IDENTITY', complete: false });

  const end = await playWeek(page, mode, finger);
  expect(end.scene).toBe('S1_W02_M');
  expect(end.player).toEqual({ name: 'Zoë', gender: 'girl' });
  const by = (id: string) => end.outcomes.find((o) => o.scene === id);
  for (const id of ['S1_PRO_IDENTITY', 'S1_W01_S', 'S1_W01_C', 'S1_W01_E']) expect(by(id), id).toMatchObject({ state: 'resolved', outcome: 'completed' });
  expect(end.outcomes.filter((o) => o.scene === 'S1_W01_C')).toHaveLength(1);

  // Reload: cursor, outcomes and identity persist; the career is in week 2 with week 1's Team Training counted once.
  const again = await openStory(page, mode);
  expect(again).toMatchObject({ scene: 'S1_W02_M', complete: false, revision: end.revision, player: end.player });
  expect(again.outcomes).toEqual(end.outcomes);
  await pressAny(page, 'story-menu', mode);
  await waitForScene(page, 'start');
  await pressAny(page, 'career-button', mode);
  await scene(page, 'career', (g) => g.status !== 'loading', 'career');
  const c = (await diagnostics(page)).gameplay as { week: number; player: string };
  expect(c).toMatchObject({ week: 2, player: 'Zoë' });
  expect(errors).toEqual([]);
});

test('story: reload restores the cursor and an answered choice is never re-applied', async ({ page }, info) => {
  const mode = modeFor(info);
  page.on('dialog', (d) => void d.accept('Kai'));
  const finger = new Finger(page, mode);
  let s = await openStory(page, mode);
  for (let i = 0; i < 5 && s.adapter !== 'identity'; i++) {
    const l = await layout(page);
    const rev = s.revision;
    await finger.tap({ x: l.viewport.width / 2, y: l.elements.panel!.y * 0.6 });
    s = await story(page, (x) => x.revision !== rev, 'intro');
    await page.waitForTimeout(100);
  }
  await pressStory(page, 'id-boy', mode);
  await pressAny(page, 'id-name', mode);
  await story(page, (x) => x.text.includes('Kai'), 'name');
  await page.waitForTimeout(120);
  await pressAny(page, 'id-confirm', mode);
  s = await story(page, (x) => x.scene !== 'S1_PRO_IDENTITY', 'identity');
  expect(s.player).toEqual({ name: 'Kai', gender: 'boy' });
  for (let i = 0; i < 30 && s.type !== 'choice'; i++) {
    const l = await layout(page);
    const rev = s.revision;
    await finger.tap({ x: l.viewport.width / 2, y: l.elements.panel!.y * 0.6 });
    s = await story(page, (x) => x.revision !== rev, 'advance');
    await page.waitForTimeout(100);
  }
  expect(s.type).toBe('choice');
  await pressStory(page, 'story-log', mode);
  await story(page, (x) => x.mode === 'transcript', 'log');
  await textClearsButtons(page, ['story-log-close']);
  await pressStory(page, 'story-log-close', mode);
  s = await story(page, (x) => x.mode === 'story', 'log closed');
  await page.waitForTimeout(150);
  // Rapid double press on one option: one decision, one revision step.
  const rev = s.revision;
  await pressAny(page, s.buttons[0]!, mode);
  await pressAny(page, s.buttons[0]!, mode).catch(() => undefined);
  const after = await story(page, (x) => x.revision !== rev, 'choice');
  await page.waitForTimeout(300);
  // A late second tap may land on the next line and advance it; it must never re-answer the choice.
  const settled = await story(page, () => true, 'settled');
  const key = Object.keys(settled.decisions[s.scene!] ?? {});
  expect(key).toHaveLength(1);
  expect(settled.decisions[s.scene!]![key[0]!]).toBe(s.buttons[0]!.replace(/^choice-/, ''));
  expect(after.node).not.toBe(s.node);
  expect([s.scene, after.scene]).toContain(settled.scene);
  expect(settled.node).not.toBe(s.node);
  const reloaded = await openStory(page, mode);
  expect(reloaded).toMatchObject({ scene: settled.scene, node: settled.node, revision: settled.revision, decisions: settled.decisions });
});
