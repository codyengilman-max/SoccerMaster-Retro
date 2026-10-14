import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { MatchReport } from '../src/scenes/matchReport';
import { diagnostics, expectInside, linger, pressElement, trackConsoleErrors, trackDomListeners, waitForScene, type PointerMode } from './helpers';

// M5 Coach Moments run inside the M3 sandbox behind `?coach`; `coachSeconds` (debug only) shortens the session for CI.
test.describe.configure({ timeout: 150_000 });

const modeFor = (info: TestInfo): PointerMode => (info.project.use.hasTouch ? 'touch' : 'mouse');

async function report(page: Page): Promise<MatchReport> {
  const d = await diagnostics(page);
  if (!d.gameplay || d.activeScenes[0] !== 'match') throw new Error(`no match gameplay in ${d.activeScenes.join(',')}`);
  return d.gameplay as MatchReport;
}

async function waitFor(page: Page, predicate: (r: MatchReport) => boolean, timeout = 30_000): Promise<MatchReport> {
  const start = Date.now();
  for (;;) {
    const r = await report(page);
    if (predicate(r)) return r;
    if (Date.now() - start > timeout) throw new Error(`timed out; phase=${r.phase} coach=${JSON.stringify({ phase: r.coach?.phase, overlay: r.coach?.overlay, n: r.coach?.entries.length, t: r.simTime })}`);
    await page.waitForTimeout(50);
  }
}

async function openCoached(page: Page, mode: PointerMode, query = ''): Promise<MatchReport> {
  await page.goto(`/?debug=1&coach&coachSeconds=40${query}`);
  await waitForScene(page, 'start');
  await pressElement(page, 'sandbox-button', mode);
  await waitForScene(page, 'formation');
  await pressElement(page, 'pick-1-3-2-3', mode);
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
  return waitFor(page, (r) => r.phase === 'live' && r.coach !== null);
}

async function expectCardFits(page: Page): Promise<void> {
  const d = await diagnostics(page);
  const vp = page.viewportSize()!;
  const names = Object.keys(d.layout?.elements ?? {}).filter((n) => n.startsWith('coach-'));
  expect(names).toContain('coach-card');
  for (const n of names) expectInside(n, d.layout!.elements[n], vp);
  const el = d.layout!.elements;
  const score = el['score']!;
  expectInside('score', score, vp);
  for (const b of ['menu-button', 'pause-button', 'help-button']) {
    const r = el[b];
    if (!r) continue;
    const overlap = score.x < r.x + r.width && r.x < score.x + score.width && score.y < r.y + r.height && r.y < score.y + score.height;
    expect(overlap, `score overlaps ${b}`).toBe(false);
  }
}

test.beforeEach(async ({ page }) => {
  await trackDomListeners(page);
});

test('coached session: freeze, answer, feedback, Continue once, through to the summary', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  await openCoached(page, mode);
  let done = 0;
  for (;;) {
    const q = await waitFor(page, (r) => r.coach!.overlay === 'question' || r.coach!.overlay === 'summary', 45_000);
    if (q.coach!.overlay === 'summary') break;
    expect(q.paused).toBe(true);
    expect(q.pauseReasons).toEqual({ user: false, coach: true });
    expect(q.input).toBe('idle');
    const v = q.coach!.view!;
    expect(v.options.length).toBeGreaterThanOrEqual(3);
    expect(v.options.length).toBeLessThanOrEqual(4);
    expect(v.question).not.toMatch(/undefined|NaN|offside/i);
    await expectCardFits(page);
    if (done === 0) await page.screenshot({ path: info.outputPath('coach-question.png') });
    // Frozen: nothing moves while the question is up, however long it waits.
    const frozen = q.simTime;
    await page.waitForTimeout(400);
    expect((await report(page)).simTime).toBe(frozen);
    // Touch-through: a tap on the pitch area outside the card does not reach gameplay.
    const canvas = (await page.locator('canvas').boundingBox())!;
    if (mode === 'touch') await page.touchscreen.tap(canvas.x + 20, canvas.y + canvas.height / 2);
    else await page.mouse.click(canvas.x + 20, canvas.y + canvas.height / 2);
    const afterTap = await report(page);
    expect(afterTap.inputLog.at(-2) ?? afterTap.inputLog.at(-1)).toMatch(/down:ui/);
    expect(afterTap.coach!.overlay).toBe('question');
    // Answer with a double tap: only one answer counts.
    const pick = done % v.options.length;
    await pressElement(page, `coach-option-${pick}`, mode);
    await pressElement(page, `coach-option-${pick}`, mode).catch(() => undefined);
    const fb = await waitFor(page, (r) => r.coach!.overlay === 'feedback');
    expect(fb.coach!.selected).toBe(v.options[pick]!.id);
    expect(fb.paused).toBe(true);
    await expectCardFits(page);
    if (done === 0) await page.screenshot({ path: info.outputPath('coach-feedback.png') });
    await linger(page);
    // Continue twice quickly: resumes exactly once.
    await pressElement(page, 'coach-continue', mode);
    await pressElement(page, 'coach-continue', mode).catch(() => undefined);
    const resumed = await waitFor(page, (r) => r.coach!.overlay === 'hidden' || r.coach!.overlay === 'summary');
    expect(resumed.events.filter((e) => e.type === 'coachRelease').length).toBeLessThanOrEqual(resumed.events.filter((e) => e.type === 'coachHold').length);
    expect(resumed.input).toBe('idle');
    done++;
    const entry = resumed.coach!.entries[done - 1]!;
    expect(entry.selectedOptionId).toBe(v.options[pick]!.id);
    expect(entry.intentionStatus).not.toBe('pending');
  }
  const end = await report(page);
  const s = end.coach!.summary!;
  expect(s.completed).toBe(done);
  expect(s.completed + s.shortfall).toBe(s.target);
  expect(s.completed).toBeGreaterThanOrEqual(3);
  expect(end.paused).toBe(true);
  await expectCardFits(page);
  await page.screenshot({ path: info.outputPath('coach-summary.png') });
  await linger(page);
  // Play again restarts the scene with a fresh session and no leaked canvases.
  await pressElement(page, 'coach-again', mode);
  await waitFor(page, (r) => r.coach !== null && r.coach.entries.length === 0 && r.phase === 'live');
  expect((await diagnostics(page)).canvases).toBe(1);
  expect(errors).toEqual([]);
});

test('backgrounding and rotation during a Coach Moment keep the pause and the moment', async ({ page }, info) => {
  const errors = trackConsoleErrors(page);
  const mode = modeFor(info);
  await openCoached(page, mode);
  const q = await waitFor(page, (r) => r.coach!.overlay === 'question', 45_000);
  // App goes to the background while the question is up.
  await page.evaluate(() => window.__SMR__!.game.events.emit('hidden'));
  const bg = await report(page);
  expect(bg.pauseReasons).toEqual({ user: true, coach: true });
  expect(bg.coach!.overlay).toBe('hidden');
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(300);
  await page.setViewportSize(vp);
  await page.waitForTimeout(300);
  await pressElement(page, 'resume-button', mode);
  const back = await waitFor(page, (r) => r.coach!.overlay === 'question');
  expect(back.simTime).toBe(q.simTime);
  expect(back.coach!.view!.momentId).toBe(q.coach!.view!.momentId);
  expect(back.aimAllowance).toEqual(q.aimAllowance);
  await expectCardFits(page);
  // Answer, then background again before Continue: Continue releases only the coach hold.
  await pressElement(page, 'coach-option-0', mode);
  await waitFor(page, (r) => r.coach!.overlay === 'feedback');
  await page.evaluate(() => window.__SMR__!.game.events.emit('hidden'));
  await pressElement(page, 'resume-button', mode);
  await waitFor(page, (r) => r.coach!.overlay === 'feedback');
  await pressElement(page, 'coach-continue', mode);
  const live = await waitFor(page, (r) => r.coach!.overlay === 'hidden');
  expect(live.pauseReasons).toEqual({ user: false, coach: false });
  expect(errors).toEqual([]);
});

test('keyboard answers and Continue (desktop)', async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, 'keyboard shortcuts are a desktop path');
  await openCoached(page, 'mouse');
  await waitFor(page, (r) => r.coach!.overlay === 'question', 45_000);
  await page.keyboard.press('Digit2');
  const fb = await waitFor(page, (r) => r.coach!.overlay === 'feedback');
  expect(fb.coach!.selected).toBe(fb.coach!.view!.options[1]!.id);
  await page.keyboard.press('Enter');
  await waitFor(page, (r) => r.coach!.overlay === 'hidden');
});

test('imported names are shown as plain text and the sandbox without ?coach is unchanged', async ({ page }, info) => {
  const mode = modeFor(info);
  await openCoached(page, mode, `&names=${encodeURIComponent('H2:<b>Ana</b>\u202e,H3:Bo,H4:Cy,H5:Di,H6:Ed,H7:Flo,H8:Gus,H9:Hal')}`);
  const q = await waitFor(page, (r) => r.coach!.overlay === 'question', 45_000);
  expect(q.coach!.view!.question).not.toMatch(/\u202e/);
  await page.goto('/?debug=1');
  await waitForScene(page, 'start');
  await pressElement(page, 'sandbox-button', mode);
  await waitForScene(page, 'formation');
  await pressElement(page, 'pick-1-3-2-3', mode);
  await pressElement(page, 'kickoff-button', mode);
  await waitForScene(page, 'match');
  const plain = await report(page);
  expect(plain.coach).toBeNull();
});
