import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { episodeById } from '../src/game/training12/all36/package';
import { draftAll } from '../src/game/training12/moments/draft';
import { effectiveStatus, outcomeApproved, sceneHash } from '../src/game/training12/moments/index';

const E2E_SCENES = [...readFileSync(new URL('../e2e/moments.spec.ts', import.meta.url), 'utf8').matchAll(/'(D\\d{2})'/g)].map((m) => m[1]!);
import { draftOutcomes, outcomeHash, type OutcomeDraft } from '../src/game/training12/moments/outcomes';
import { draftOutcomesV2 } from '../src/game/training12/moments/outcomesV2';
import { REVEALING, reviseChoices } from '../src/game/training12/moments/choices';
import { stillCast, TT_OPPONENTS, TT_SHEETS, TT_TEAMMATES } from '../src/render/art/teamTrainingFrames';
import type { Timeline } from '../src/game/training12/moments/schema';
import { releaseBlockers, validateScene } from '../src/game/training12/moments/validate';
import type { MomentScene } from '../src/game/training12/moments/schema';

const DIR = new URL('../docs/training/moments/', import.meta.url);

/** Drafts with their review status: READY_FOR_REVIEW when the validator passes, DRAFT otherwise. Never APPROVED. */
export function exportDrafts(): MomentScene[] {
  return draftAll().map((s) => ({ ...s, review: { ...s.review, status: validateScene(s).length ? 'DRAFT' : 'READY_FOR_REVIEW' } }));
}

const esc = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function choicesMd(scenes: MomentScene[]): string {
  const all = scenes.map(reviseChoices);
  const rows = all.flatMap((c) => c.revisions.filter((r) => r.change !== 'unchanged').map((r) => `| ${c.sceneId}/${r.choice} | ${r.grade} | ${r.gradeStatus} | ${r.meaning ?? '—'} | ${esc(r.original)} | ${r.proposed ? esc(r.proposed) : '(removed)'} | ${r.reason} |`));
  const left = all.flatMap((c) => c.revisions.filter((r) => r.change === 'unchanged' && REVEALING.test(r.original)).map((r) => `${c.sceneId}/${r.choice}: ${r.original}`));
  return [
    '# Tactical Moments: neutral-choice revisions (generated)',
    '',
    'Generated from `scenes.v2.json` by `tests/momentsExport.test.ts`; records in `choices.v1.json`. Original wording, action IDs and grades are unchanged; each revision needs owner approval. Grades are never edited here. The review build shows the proposed wording (generic option removed); **Original only** on the review screen shows the package wording.',
    '',
    '- **Grade status:** PACKAGE = the package grade applies to unchanged wording. RECHECK = the wording changed, so the package grade is shown but not assumed correct until the owner confirms it.',
    '- **Meaning:** same = the proposed text names the same action without the judgment word. may-change = the original also named a consequence or timing ("expose inside", "too late") that the neutral text drops; the owner should confirm it is still the same action before keeping its grade.',
    '',
    `Removed: ${all.flatMap((c) => c.revisions).filter((r) => r.change === 'removed').length}. Reworded: ${all.flatMap((c) => c.revisions).filter((r) => r.change === 'reworded').length}. Versions needing reauthoring (fewer than 2 choices left): ${all.filter((c) => c.needsReauthoring).length}. Choices left per version: ${[...new Set(all.map((c) => c.remaining))].join(', ')}.`,
    '',
    `Unchanged but matching a judgment word (owner to check): ${left.length ? left.join('; ') : 'none'}.`,
    '',
    'No other distractor was removed: none is plainly implausible without coaching judgment, so plausibility is left to the owner.',
    '',
    `Meaning may change: ${all.flatMap((c) => c.revisions.filter((r) => r.meaning === 'may-change').map((r) => `${c.sceneId}/${r.choice}`)).join(', ') || 'none'}.`,
    '',
    '| Branch | Package grade | Grade status | Meaning | Original | Proposed | Why |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

type ContactStatus = 'VERIFIED' | 'UNVERIFIED' | 'NOT_APPLICABLE' | 'INCOMPLETE';
const CONTACT_TYPES = ['dribble', 'pass', 'receive', 'shot', 'tackle', 'interception', 'control'] as const;
const CONTACT_RECORDS = JSON.parse(readFileSync(new URL('contact-frames.json', DIR), 'utf8')) as { action: string; status: string }[];
function contactAudit(s: MomentScene, outs: OutcomeDraft[]) {
  const n: Record<(typeof CONTACT_TYPES)[number], number> = { dribble: 0, pass: 0, receive: 0, shot: 0, tackle: 0, interception: 0, control: 0 };
  const tls = [s.watch, ...(['A', 'B', 'C', 'D'] as const).map((k) => s.branches[k].timeline), ...outs.flatMap((o) => (o.timeline ? [o.timeline] : []))];
  for (const tl of tls) {
    for (const e of tl.ball) {
      if (e.kind === 'pass') n[e.to[1]! <= 0.01 || e.to[1]! >= s.field.length - 0.01 ? 'shot' : 'pass']++;
      if (e.kind === 'receive') n.receive++;
      if (e.kind === 'carry') n.dribble += e.touches.length;
      // A held ball is a separate control only if nothing (receive, carry) already took possession since the last loose/rolling ball.
      if (e.kind === 'held' && e.t > 0) {
        const tOf = (q: (typeof tl.ball)[number]) => ('t' in q ? q.t : q.t0);
        const lastLoose = Math.max(-1, ...tl.ball.filter((q) => (q.kind === 'loose' || q.kind === 'roll') && tOf(q) <= e.t).map(tOf));
        if (lastLoose >= 0 && !tl.ball.some((q) => (q.kind === 'receive' || q.kind === 'carry') && tOf(q) >= lastLoose && tOf(q) <= e.t)) n.control++;
      }
    }
  }
  const types = Object.fromEntries(CONTACT_TYPES.map((k) => {
    if (!n[k]) return [k, { n: 0, status: 'NOT_APPLICABLE' as ContactStatus }];
    const recs = CONTACT_RECORDS.filter((r) => r.action === k);
    const status: ContactStatus = !recs.length ? 'INCOMPLETE' : recs.every((r) => r.status === 'VERIFIED') ? 'VERIFIED' : 'UNVERIFIED';
    return [k, { n: n[k], status }];
  })) as Record<(typeof CONTACT_TYPES)[number], { n: number; status: ContactStatus }>;
  const st = Object.values(types).map((v) => v.status);
  const overall: ContactStatus = st.includes('INCOMPLETE') ? 'INCOMPLETE' : st.includes('UNVERIFIED') ? 'UNVERIFIED' : st.includes('VERIFIED') ? 'VERIFIED' : 'NOT_APPLICABLE';
  return { types, overall };
}
function contactMd(scenes: MomentScene[]): string {
  const rows = scenes.map((s) => { const a = contactAudit(s, draftOutcomesV2([s])); return `| ${s.sceneId} | ${a.overall} | ${CONTACT_TYPES.map((k) => (a.types[k].n ? `${a.types[k].status} (${a.types[k].n})` : 'NOT_APPLICABLE')).join(' | ')} |`; });
  return ['# Tactical Moments: contact audit (generated, review only)', '', 'Counts are contacts across the watch, the four branches and the v2 outcome drafts of each scene version. Status per type: VERIFIED = reviewed metadata for every sheet; UNVERIFIED = `contact-frames.json` records exist but anatomical foot, supporting foot and surface are unreviewed (the art does not show them clearly at this size; see `contact/*.png`); INCOMPLETE = no metadata record for that contact type exists yet; NOT_APPLICABLE = does not occur. Facing never decides the foot. Unresolved contact animations stay out of release.', '', `| Scene | Overall | ${CONTACT_TYPES.join(' | ')} |`, `|---|---|${CONTACT_TYPES.map(() => '---').join('|')}|`, ...rows, ''].join('\n');
}

function matrix(scenes: MomentScene[]): string {
  const rows = scenes.map((s) => {
    const e = episodeById(s.library.situationId)!;
    const kinds = (['A', 'B', 'C', 'D'] as const).map((k) => `${k}:${s.branches[k].kind}`).join(' ');
    const blockers = releaseBlockers(s).length;
    void kinds;
    const outs = draftOutcomesV2([s]);
    const missing = outs.filter((o) => o.missingDecision).length;
    const movement = effectiveStatus(s) === 'APPROVED' ? 'approved' : 'not approved';
    const outApproved = outs.filter((o) => outcomeApproved(o)).length;
    const assetGaps = s.assets.gaps.filter((g) => g.blocksRelease).length + outs.reduce((n, o) => n + o.gaps.filter((g) => g.blocksRelease).length, 0);
    const ca = contactAudit(s, outs);
    const cv = ca.overall === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : `${ca.overall}: ${Object.entries(ca.types).filter(([, v]) => v.status !== 'NOT_APPLICABLE').map(([k, v]) => `${k} ${v.status} (${v.n})`).join(', ')}`;
    const e2e = E2E_SCENES.includes(s.library.situationId) ? 'browser: situation covered' : 'browser: no';
    const tech = `validator ${validateScene(s).length ? 'FAIL' : 'pass'}; unit: yes; ${e2e}`;
    return `| ${s.sceneId} v${s.version} | ${esc(e.title)} | ${s.protagonist.role} | decisions: coach-approved 2026-10-27; outcome drafts: ${outs.length} pending (${missing} missing decision) | scene: ${movement}; outcome drafts approved: ${outApproved}/${outs.length} | ${assetGaps ? `BLOCKED: ${assetGaps} directional gaps` : 'no directional gap'} | ${cv} | ${tech} | ${movement === 'approved' && !blockers && !assetGaps && ca.overall !== 'UNVERIFIED' && ca.overall !== 'INCOMPLETE' ? 'eligible' : 'BLOCKED (review only)'} | \`${sceneHash(s)}\` |`;
  });
  return [
    '# Tactical Moments: release matrix (generated)',
    '',
    'Generated by `WRITE_MOMENTS=1 npx vitest run tests/momentsExport.test.ts` from `scenes.v2.json` and `outcomes.v2.json`; do not edit by hand.',
    'Contact verification (per scene, over watch, branches and v2 outcome drafts): VERIFIED = every contact has reviewed metadata; UNVERIFIED = metadata exists but foot/surface are unreviewed (pass, receive); INCOMPLETE = no metadata record exists for that contact type (dribble, shot, control); NOT_APPLICABLE = the type does not occur. Tackles and interceptions are never authored (no invented turnovers), so they are NOT_APPLICABLE everywhere. Detail: [CONTACT_AUDIT.md](CONTACT_AUDIT.md).',
    'Status: READY_FOR_REVIEW = passes the validator; nothing is APPROVED until an owner record in `approvals.json` matches the hash.',
    'Blockers = release blockers (validator errors + animation gaps that block release). Full assumptions, conflicts and gaps are in each scene record and on the `?dev` review page.',
    '',
    'Five separate axes; a scene version reaches players only when all five pass AND an owner approval record matches its hash. Tactical approval covers the All36 decisions, grades and feedback; it does not cover drafted movement. TM-D36-changed has no directional gap but is still blocked on movement approval and contact verification.',
    '',
    '| Scene | Library title | Role | Tactical approval | Movement approval | Asset readiness | Contact verification | Technical tests | Release | Hash |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
    '## Conflicts for owner decision',
    '',
    ...scenes.flatMap((s) => s.review.conflicts.map((c) => `- ${s.sceneId}: ${esc(c)}`)),
    '',
  ].join('\n');
}

function gaps(scenes: MomentScene[]): string {
  const lines = scenes.flatMap((s) => s.assets.gaps.map((g) => `| ${s.sceneId} | ${g.phase}${g.choice ? ` ${g.choice}` : ''} | ${g.actor ?? ''} | ${esc(g.need)} | ${g.blocksRelease ? 'yes' : 'no'} |`));
  const blocked = scenes.filter((s) => s.assets.gaps.some((g) => g.blocksRelease)).length;
  return [
    '# Tactical Moments: animation gaps per scene (generated)',
    '',
    `${blocked} of ${scenes.length} scene versions have at least one release-blocking animation gap. Summary and the sheet audit: [ANIMATION_GAPS.md](ANIMATION_GAPS.md).`,
    '',
    '| Scene | Phase | Actor | Missing | Blocks release |',
    '|---|---|---|---|---|',
    ...lines,
    '',
  ].join('\n');
}

function frozen(scenes: MomentScene[], outs: OutcomeDraft[]): string {
  const stationary = scenes.flatMap((s) => (['A', 'B', 'C', 'D'] as const).filter((k) => ['hold', 'off-ball'].includes(s.branches[k].kind) && s.branches[k].packageTarget.ball.every((n, i) => Math.abs(n - s.ball.decision[i]!) < 0.5)).map((k) => `${s.sceneId}/${k}`));
  const offBall = scenes.flatMap((s) => (['A', 'B', 'C', 'D'] as const).filter((k) => s.branches[k].kind === 'off-ball' && /^Illustrative/.test(s.branches[k].consequence) && s.ball.ownerAtDecision === null).map((k) => `${s.sceneId}/${k}`));
  const by = (c: string) => outs.filter((o) => `${o.category}/${o.presentation}` === c).length;
  return [
    '# Tactical Moments: frozen-branch inventory (generated)',
    '',
    'Stable branch ID = `<scene id>/<choice>`; scene version shown. The package label, consequence and feedback are unchanged; outcome drafts are separate records in `outcomes.v1.json` (outcome version 1), each needing its own approval.',
    '',
    '## Reconciling 164 vs 159',
    '',
    `- 164 (first report) = branches whose ball does not move. Different counting unit from 159.`,
    `- 159 = branches the package itself presents as a frozen teaching frame: consequence "Review pause only…" (${outs.filter((o) => /^Review pause only/.test(o.packageConsequence)).length}) or "Freeze for explanation…" (${outs.filter((o) => /^Freeze for explanation/.test(o.packageConsequence)).length}). These were the conflicts.`,
    `- The other 5 are loose-ball defensive options with package player endpoints ("Illustrative endpoint…"); they already play out as player movement with the ball still, now kind \`off-ball\`: ${offBall.join(', ')}.`,
    `- In scenes v2, ${stationary.length} branches keep the ball still overall (holding the ball or protecting space is a valid outcome); only the 159 are frozen frames.`,
    '',
    `## Outcome drafts: ${outs.length}`,
    '',
    `- scan → result: ${by('scan/result')} (the carrier keeps the ball; players already moving keep moving)`,
    `- hold-position → result: ${by('hold-position/result')} (label is to stay or wait)`,
    `- explanation (missing decision named): ${by('needs-decision/explanation') + by('scan/explanation') + by('hold-position/explanation')}`,
    '',
    '| Branch ID | Scene v | Package label | Package consequence | Category | Presentation | Missing decision | Release-blocking gaps | Outcome hash |',
    '|---|---|---|---|---|---|---|---|---|',
    ...outs.map((o) => `| ${o.branchId} | ${o.sceneVersion} | ${esc(o.packageLabel)} | ${esc(o.packageConsequence.split(';')[0]!)} | ${o.category} | ${o.presentation.toUpperCase()} | ${o.missingDecision ? esc(o.missingDecision) : '—'} | ${o.gaps.filter((g) => g.blocksRelease).length} | \`${outcomeHash(o)}\` |`),
    '',
  ].join('\n');
}


type Facing = 'N' | 'S' | 'E' | 'W';
const FACING_TEXT: Record<Facing, string> = { N: 'N: away from camera (up the screen)', S: 'S: toward camera (down the screen)', E: 'E: screen right', W: 'W: screen left' };
const sector = (a: readonly number[], b: readonly number[]): Facing | null => {
  const dx = b[0]! - a[0]!;
  const dy = b[1]! - a[1]!;
  if (Math.hypot(dx, dy) < 0.05) return null;
  return Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'N' : 'S') : dx > 0 ? 'E' : 'W';
};
type AssetStatus = 'VERIFIED_REUSABLE' | 'CANDIDATE_NEEDS_REVIEW' | 'MISSING';
type ReqAction = 'stand' | 'run' | 'shuffle' | 'pass' | 'shot' | 'receive' | 'dribble touch' | 'keeper ready';
const CONTACT_ACTIONS: readonly ReqAction[] = ['pass', 'shot', 'receive', 'dribble touch'];
/** Art-brief priority (owner order): 1 front/back stand+run, 2 dribble touches, 3 pass/receive directions, 4 shuffles, 5 keeper. */
const priority = (action: ReqAction): number => (action === 'stand' || action === 'run' ? 1 : action === 'dribble touch' ? 2 : action === 'pass' || action === 'shot' || action === 'receive' ? 3 : action === 'shuffle' ? 4 : 5);
const FRAMES: Record<ReqAction, string> = {
  stand: '1 frame: upright two-foot stance (existing atlas frame 6).',
  run: '6-frame stride cycle, phase driven by distance travelled (existing run row 0-5).',
  shuffle: '6-frame side-step cycle (existing shuffle row 18-23).',
  pass: '4 frames: plant, plant, CONTACT, follow-through (existing 7-10); contact frame held 0.12 s from ball release, follow-through to 0.30 s.',
  shot: 'As pass (no separate shot row exists): plant, plant, CONTACT, follow-through; contact held 0.12 s from release.',
  receive: '3 frames: reach, CONTACT (first touch), settle (existing 13-15); contact held 0.15 s from arrival, settle to 0.35 s.',
  'dribble touch': 'New: 6-frame carry cycle with a touch frame on each authored carry touch (none exist; currently drawn on the run cycle).',
  'keeper ready': '1 frame: keeper ready stance (keeper strip pose 3).',
};
const ANCHORS = 'Cell 160x160 px; ground/feet anchor (80, 154). Feet must sit on the anchor in every frame; contact frames also need a contact anchor in cell px.';
const MIRROR = 'E→W only by a true horizontal mirror that swaps anatomical L/R, anchors and motion (it does not verify the original foot). N and S cannot be made from E/W, nor from each other.';
function assetStatus(action: ReqAction, body: Facing, travel: Facing | null, keeper: boolean): { status: AssetStatus; why: string } {
  if (body === 'N' || body === 'S') return { status: 'MISSING', why: 'no frames face away from or toward the camera' };
  if (action === 'dribble touch') return { status: 'MISSING', why: 'no dribble-touch frames exist in any direction' };
  if (keeper && action !== 'keeper ready' && action !== 'stand' && action !== 'run') return { status: 'MISSING', why: 'keeper strip has stand/run/stride/ready only' };
  if (CONTACT_ACTIONS.includes(action)) return { status: 'CANDIDATE_NEEDS_REVIEW', why: 'frames exist; contact foot, surface and anchor are UNVERIFIED' };
  if (action === 'shuffle') return { status: 'CANDIDATE_NEEDS_REVIEW', why: 'side-step frames exist; step direction relative to the body is not audited' };
  if (action === 'run' && travel !== body) return { status: 'CANDIDATE_NEEDS_REVIEW', why: `run cycle is drawn travelling the way it faces; travel ${travel} differs` };
  if (body === 'W') return { status: 'CANDIDATE_NEEDS_REVIEW', why: 'true mirror of E frames; asymmetric kit/hair detail flips and needs an owner check' };
  return { status: 'VERIFIED_REUSABLE', why: 'existing right three-quarter frames as drawn, same body facing and travel' };
}

function requirements(scenes: MomentScene[], outs: OutcomeDraft[]) {
  type Row = { action: ReqAction; bodyFacing: Facing; travelDirection: Facing | null; ballDirection: Facing | null; keeper: boolean; sheets: Set<string>; ids: Set<string>; events: number };
  const rows = new Map<string, Row>();
  const add = (action: ReqAction, body: Facing | null, travel: Facing | null, ball: Facing | null, keeper: boolean, sheets: string[], id: string) => {
    if (!body) return;
    const key = `${action}|${body}|${travel ?? '-'}|${ball ?? '-'}`;
    const r = rows.get(key) ?? { action, bodyFacing: body, travelDirection: travel, ballDirection: ball, keeper, sheets: new Set<string>(), ids: new Set<string>(), events: 0 };
    for (const x of sheets) r.sheets.add(x);
    r.ids.add(id);
    r.events++;
    rows.set(key, r);
  };
  const scan = (s: MomentScene, tl: Timeline, id: string) => {
    const actors = s.actors.map((a) => ({ id: a.id, team: a.team, role: a.role, at: a.decision }));
    const casts = (['boy', 'girl'] as const).map((l) => stillCast(l, actors, s.protagonist.actorId));
    const sheets = (aid: string) => [...new Set(casts.map((c) => c.get(aid)!))];
    const gk = (aid: string) => s.actors.find((a) => a.id === aid)?.role === 'GK';
    for (const tr of tl.actors) {
      for (let i = 0; i < tr.keys.length; i++) {
        const k = tr.keys[i]!;
        const prev = tr.keys[i - 1];
        const travel = prev ? sector(prev.at, k.at) : null;
        if (prev && (k.action === 'run' || k.action === 'shuffle') && travel) add(k.action, sector(k.at, k.look) ?? travel, travel, null, gk(tr.id), sheets(tr.id), id);
        if (k.action === 'stand' || k.action === 'keeper-ready') add(k.action === 'stand' ? 'stand' : 'keeper ready', sector(k.at, k.look), null, null, gk(tr.id), sheets(tr.id), id);
      }
    }
    const goalLine = (to: readonly number[]) => to[1]! <= 0.01 || to[1]! >= s.field.length - 0.01;
    for (const e of tl.ball) {
      if (e.kind === 'pass') {
        const tr = tl.actors.find((a) => a.id === e.by)!;
        const k = tr.keys.find((q) => q.action === 'pass') ?? tr.keys[0]!;
        add(goalLine(e.to) ? 'shot' : 'pass', sector(k.at, k.look) ?? sector(k.at, e.to), null, sector(k.at, e.to), gk(e.by), sheets(e.by), id);
      }
      if (e.kind === 'receive') {
        const tr = tl.actors.find((a) => a.id === e.by)!;
        const k = tr.keys.find((q) => q.action === 'receive')!;
        const p = tl.ball.find((q) => q.kind === 'pass' && q.receiver === e.by && q.t < e.t);
        const from = p && p.kind === 'pass' ? (tl.actors.find((a) => a.id === p.by)!.keys.find((q) => q.action === 'pass') ?? tl.actors.find((a) => a.id === p.by)!.keys[0]!).at : null;
        // A loose-ball collection looks at its own key; face the way the collector arrived instead.
        const ki = tr.keys.indexOf(k);
        const before = tr.keys.slice(0, ki).reverse().find((q) => Math.hypot(q.at[0] - k.at[0], q.at[1] - k.at[1]) >= 0.05);
        const arrived = before ? sector(before.at, k.at) : null;
        add('receive', sector(k.at, k.look) ?? (from ? sector(k.at, from) : null) ?? arrived, null, from ? sector(from, k.at) : null, gk(e.by), sheets(e.by), id);
      }
      if (e.kind === 'carry') {
        const tr = tl.actors.find((a) => a.id === e.by)!;
        const d = sector(tr.keys[0]!.at, tr.keys[tr.keys.length - 1]!.at);
        add('dribble touch', d, d, d, gk(e.by), sheets(e.by), id);
      }
    }
  };
  // Discarded choices (removed in the revised choice set) need no art: their branch and outcome drafts are skipped.
  const kept = (s: MomentScene, k: string) => reviseChoices(s).revisions.some((r) => r.choice === k && r.change !== 'removed');
  for (const s of scenes) {
    scan(s, s.watch, `${s.sceneId}/watch`);
    for (const k of ['A', 'B', 'C', 'D'] as const) if (kept(s, k)) scan(s, s.branches[k].timeline, `${s.sceneId}/${k}`);
  }
  for (const o of outs) if (o.timeline && kept(scenes.find((x) => x.sceneId === o.sceneId)!, o.choice)) scan(scenes.find((x) => x.sceneId === o.sceneId)!, o.timeline, `${o.branchId}#outcome-v${o.outcomeVersion}`);
  const list = [...rows.values()].sort((a, b) => priority(a.action) - priority(b.action) || a.action.localeCompare(b.action) || a.bodyFacing.localeCompare(b.bodyFacing) || (a.travelDirection ?? '').localeCompare(b.travelDirection ?? '') || (a.ballDirection ?? '').localeCompare(b.ballDirection ?? ''));
  const json = list.map((r) => {
    const st = assetStatus(r.action, r.bodyFacing, r.travelDirection, r.keeper);
    return { priority: priority(r.action), action: r.action, bodyFacing: r.bodyFacing, travelDirection: r.travelDirection, ballDirection: r.ballDirection, status: st.status, statusReason: st.why, contact: CONTACT_ACTIONS.includes(r.action) ? { anatomicalContactFoot: 'UNVERIFIED', supportingFoot: 'UNVERIFIED', surface: 'UNVERIFIED', contactFrame: 'see contact-frames.json', status: 'UNVERIFIED' } : null, sheets: [...r.sheets].sort(), uses: r.ids.size, events: r.events, ids: [...r.ids].sort() };
  });
  // Why later identity sheets never appear: the cast assigns teammate_01.. and opponent_01.. in slot order to the players a scene shows.
  const maxHome = Math.max(...scenes.map((s) => s.actors.filter((a) => a.team === 'H' && a.role !== 'GK' && a.id !== s.protagonist.actorId).length));
  const maxAway = Math.max(...scenes.map((s) => s.actors.filter((a) => a.team === 'A' && a.role !== 'GK').length));
  const used = new Set(json.flatMap((r) => r.sheets));
  const unused = [...TT_TEAMMATES, ...TT_OPPONENTS].filter((x) => !used.has(x));
  const count = (st: AssetStatus) => json.filter((r) => r.status === st).length;
  const md = [
    '# Tactical Moments: directional animation requirements v2 (generated, review only)',
    '',
    'Generated by `WRITE_MOMENTS=1 npx vitest run tests/momentsExport.test.ts` from `scenes.v2.json` and `outcomes.v2.json`. Nothing here is approved art; missing art blocks release, not framework work. Choices removed in `choices.v1.json` (the generic "Pause, scan and communicate" option) are excluded: only the watch and retained choices count.',
    '',
    '- **bodyFacing**: where the body looks (from each key\'s `look`), the frame to draw. **travelDirection**: where the player moves (key to key). **ballDirection**: where the ball goes (pass/shot target, receive approach, carry). They are independent: a shuffle can face E while travelling N.',
    '- Directions are screen directions on the true overhead pitch (home attacks up). ' + (['N', 'S', 'E', 'W'] as const).map((f) => FACING_TEXT[f]).join('; ') + '.',
    `- **Status**: VERIFIED_REUSABLE = an existing frame is drawn for this body facing and travel, as-is (not an owner art approval); CANDIDATE_NEEDS_REVIEW = frames exist but a mirror, travel mismatch or unverified contact needs review; MISSING = no frame exists. Rows: ${count('VERIFIED_REUSABLE')} verified reusable, ${count('CANDIDATE_NEEDS_REVIEW')} candidate, ${count('MISSING')} missing.`,
    '- **Uses** = distinct timeline IDs (`<scene>/watch`, `<scene>/<choice>`, `<branch>#outcome-v2`) needing the row. Boy and girl are alternatives for one protagonist slot, so a protagonist timeline counts once and both sheets are listed. **Events** = raw key/ball-event count.',
    `- **Absent identity sheets**: the cast gives teammate_01, 02… and opponent_01, 02… in slot order to the players a scene shows, skipping the protagonist and keepers. No scene shows more than ${maxHome} non-protagonist home outfielders or ${maxAway} away outfielders, so ${unused.join(', ') || 'no sheet'} never appear. They are not excluded; scenes only show the participants the situation needs.`,
    '- Art brief per character, with thumbnails, frame timing, anchors and mirror rules: [ART_BRIEF.md](ART_BRIEF.md).',
    '',
    '| Priority | Action | Body facing | Travel | Ball | Status | Why | Contact | Sheets | Uses | Events |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...json.map((r) => `| ${r.priority} | ${r.action} | ${r.bodyFacing} | ${r.travelDirection ?? '—'} | ${r.ballDirection ?? '—'} | ${r.status} | ${r.statusReason} | ${r.contact ? 'UNVERIFIED' : 'NOT_APPLICABLE'} | ${r.sheets.join(', ')} | ${r.uses} | ${r.events} |`),
    '',
    'Scene/branch IDs per row: `ANIMATION_REQUIREMENTS.json`.',
    '',
  ].join('\n');
  return { json: JSON.stringify(json, null, 1) + '\n', md, rows: json };
}

const SOURCE: Record<string, string> = Object.fromEntries([...['boy', 'girl'].map((x) => [x, `docs/art/team-training-v1/source/${x}_highlight.png`]), ...[...TT_TEAMMATES, ...TT_OPPONENTS].map((x) => [x, `docs/art/team-training-v1/source/${x}.png`]), ['keeper_home', 'docs/art/team-training-v1/source/home_keeper_keyposes.png'], ['keeper_away', 'docs/art/team-training-v1/source/opposition_keeper_keyposes.png']]);
function artBrief(rows: ReturnType<typeof requirements>['rows']): string {
  const need = rows.filter((r) => r.status !== 'VERIFIED_REUSABLE');
  const sheets = [...new Set(need.flatMap((r) => r.sheets))].sort((a, b) => TT_SHEETS.indexOf(a as never) - TT_SHEETS.indexOf(b as never));
  const out = [
    '# Tactical Moments: consolidated art brief (generated, review only)',
    '',
    'One section per existing character sheet, in the owner priority order (1 front/back stand and run, 2 dribble touches, 3 pass/receive directions, 4 shuffles, 5 keeper). Every item reuses the character as drawn in its exact source asset; no lookalikes. Rows already VERIFIED_REUSABLE are omitted. Affected IDs per item: `ANIMATION_REQUIREMENTS.json` (same action/bodyFacing/travel/ball key).',
    '',
    `- **Ground/foot anchors:** ${ANCHORS}`,
    `- **Mirror restrictions:** ${MIRROR}`,
    '- **Contact requirements (pass, shot, receive, dribble touch):** reviewed anatomical contact foot, supporting foot, surface (inside/outside/instep/sole), contact frame, contact anchor, ball approach and departure. The ball is drawn separately and never glued to the foot between contacts.',
    '',
  ];
  for (const sh of sheets) {
    out.push(`## ${sh}`, '', `Source: \`${SOURCE[sh]}\`; runtime: \`src/assets/art/team-training-v1/${sh}.webp\``, '', `![${sh}](art-brief/${sh}.png)`, '', '| Priority | Action | Body facing | Permitted travel | Ball | Status | Frames and timing | Contact | Uses |', '|---|---|---|---|---|---|---|---|---|');
    const mine = need.filter((r) => r.sheets.includes(sh));
    const groups = new Map<string, typeof mine>();
    for (const r of mine) groups.set(`${r.action}|${r.bodyFacing}`, [...(groups.get(`${r.action}|${r.bodyFacing}`) ?? []), r]);
    for (const g of groups.values()) {
      const r = g[0]!;
      const travel = [...new Set(g.map((x) => x.travelDirection).filter(Boolean))].sort().join(', ') || 'stationary';
      const ball = [...new Set(g.map((x) => x.ballDirection).filter(Boolean))].sort().join(', ') || '—';
      const st = g.some((x) => x.status === 'MISSING') ? 'MISSING' : 'CANDIDATE_NEEDS_REVIEW';
      out.push(`| ${r.priority} | ${r.action} | ${r.bodyFacing} | ${travel} | ${ball} | ${st} | ${FRAMES[r.action as ReqAction]} | ${r.contact ? 'required' : 'NOT_APPLICABLE'} | ${new Set(g.flatMap((x) => x.ids)).size} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

/** ChatGPT-ready production brief: only the MISSING groups (discarded choices already excluded), one numbered group each. */
function production(rows: ReturnType<typeof requirements>['rows']): string {
  const miss = rows.filter((r) => r.status === 'MISSING');
  const out = [
    '# Tactical Moments: art production brief, missing groups (generated, production preparation only)',
    '',
    `${miss.length} missing action/direction groups, in the owner priority order. Requirements used only by discarded choices (the removed generic option) are excluded. This brief prepares art production; it is not a commission and no finished frame is approved until the owner reviews it.`,
    '',
    '## Rules for every frame',
    '',
    '- **Identity:** draw each character exactly as in its listed source sheet (face, hair, skin, kit, boots, proportions). No lookalikes, no new characters, no swapped kits. Boy and girl are alternatives for the one protagonist slot.',
    '- **View:** true overhead training pitch, same three-quarter pixel-art style, palette and outline weight as the source sheet. ' + (['N', 'S', 'E', 'W'] as const).map((f) => FACING_TEXT[f]).join('; ') + '.',
    `- **Cells and anchors:** ${ANCHORS} Transparent background; one row per group, frames left to right.`,
    `- **Mirroring:** ${MIRROR}`,
    '- **Ball:** never drawn in the character frames; the game draws the approved patterned ball separately. Contact frames must show the foot where the ball will be placed.',
    '- **Contact groups (pass, receive, dribble touch):** for each contact frame state the anatomical contact foot (L/R), supporting foot, surface (inside/outside/instep/sole) and the contact anchor in cell px. Mark anything unclear UNVERIFIED; the foot is never inferred from facing.',
    '',
    '## Groups',
    '',
    '| # | Priority | Action | Body facing | Travel | Ball | Frames and timing | Contact | Sheets (source) | Uses |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...miss.map((r, i) => `| ${i + 1} | ${r.priority} | ${r.action} | ${r.bodyFacing} | ${r.travelDirection ?? 'stationary'} | ${r.ballDirection ?? '—'} | ${FRAMES[r.action as ReqAction]} | ${r.contact ? 'required' : 'NOT_APPLICABLE'} | ${r.sheets.map((x) => `${x} (\`${SOURCE[x]}\`)`).join(', ')} | ${r.uses} |`),
    '',
    '## Affected scene/branch IDs (first 8 per group; full list in `ANIMATION_REQUIREMENTS.json`)',
    '',
    ...miss.map((r, i) => `${i + 1}. ${r.action} ${r.bodyFacing}${r.travelDirection ? ` travelling ${r.travelDirection}` : ''}${r.ballDirection ? `, ball ${r.ballDirection}` : ''}: ${r.ids.slice(0, 8).join(', ')}${r.ids.length > 8 ? ` … (+${r.ids.length - 8})` : ''}`),
    '',
  ];
  return out.join('\n');
}

describe('stored Tactical Moments drafts', () => {
  const scenes = exportDrafts();
  const outs = draftOutcomes(scenes);
  it('scenes.v1.json stays frozen as history', () => {
    expect(createHash('sha256').update(readFileSync(new URL('scenes.v1.json', DIR))).digest('hex')).toBe('3f8059a6bbbe0159802b9967cbf66a2ef1d61d98c1db2fdad0767a850c69894c');
  });
  const files: [string, string][] = [
    ['scenes.v2.json', '[\n' + scenes.map((s) => JSON.stringify(s)).join(',\n') + '\n]\n'],
    ['REVIEW_MATRIX.md', matrix(scenes)],
    ['GAPS_BY_SCENE.md', gaps(scenes)],
    ['outcomes.v1.json', '[\n' + outs.map((o) => JSON.stringify(o)).join(',\n') + '\n]\n'],
    ['choices.v1.json', '[\n' + scenes.map((x) => JSON.stringify(reviseChoices(x))).join(',\n') + '\n]\n'],
    ['CHOICE_REVISIONS.md', choicesMd(scenes)],
    ['outcomes.v2.json', '[\n' + draftOutcomesV2(scenes).map((o) => JSON.stringify(o)).join(',\n') + '\n]\n'],
    ['FROZEN_BRANCHES.md', frozen(scenes, outs)],
    ['ANIMATION_REQUIREMENTS.json', requirements(scenes, draftOutcomesV2(scenes)).json],
    ['ANIMATION_REQUIREMENTS.md', requirements(scenes, draftOutcomesV2(scenes)).md],
    ['CONTACT_AUDIT.md', contactMd(scenes)],
    ['ART_BRIEF.md', artBrief(requirements(scenes, draftOutcomesV2(scenes)).rows)],
    ['ART_PRODUCTION_MISSING.md', production(requirements(scenes, draftOutcomesV2(scenes)).rows)],
  ];
  for (const [name, want] of files) {
    it(`${name} equals the generator output (regenerate with WRITE_MOMENTS=1)`, () => {
      if (process.env.WRITE_MOMENTS === '1') writeFileSync(new URL(name, DIR), want);
      expect(readFileSync(new URL(name, DIR), 'utf8')).toBe(want);
    });
  }
});
