import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { episodeById } from '../src/game/training12/all36/package';
import { draftAll } from '../src/game/training12/moments/draft';
import { effectiveStatus, outcomeApproved, sceneHash } from '../src/game/training12/moments/index';

const E2E_SCENES = [...readFileSync(new URL('../e2e/moments.spec.ts', import.meta.url), 'utf8').matchAll(/'(D\\d{2})'/g)].map((m) => m[1]!);
import { draftOutcomes, outcomeHash, type OutcomeDraft } from '../src/game/training12/moments/outcomes';
import { draftOutcomesV2 } from '../src/game/training12/moments/outcomesV2';
import { keptChoice, movementCheck, OWNER_R4, reviseChoices } from '../src/game/training12/moments/choices';
import { stillCast, TT_OPPONENTS, TT_SHEETS, TT_TEAMMATES } from '../src/render/art/teamTrainingFrames';
import type { Timeline } from '../src/game/training12/moments/schema';
import { releaseBlockers, validateScene } from '../src/game/training12/moments/validate';
import type { MomentScene } from '../src/game/training12/moments/schema';

const DIR = new URL('../docs/training/moments/', import.meta.url);

/** Drafts with their review status: READY_FOR_REVIEW when the validator passes, DRAFT otherwise. Never APPROVED. */
export function exportDrafts(): MomentScene[] {
  return draftAll().map((s) => ({ ...s, review: { ...s.review, status: validateScene(s).length ? 'DRAFT' : 'READY_FOR_REVIEW' } }));
}

const GENERIC_RE = /^Pause, scan and communicate before committing$/;
const esc = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function choicesMd(scenes: MomentScene[]): string {
  const all = scenes.map(reviseChoices);
  const v2 = new Map(draftOutcomesV2(scenes).map((o) => [o.branchId, o]));
  const revs = all.flatMap((c) => c.revisions.map((r) => ({ c, r })));
  const n = (f: (r: (typeof revs)[number]['r']) => boolean) => revs.filter(({ r }) => f(r)).length;
  const sit = (d: string) => Object.entries(OWNER_R4).filter(([, w]) => w.decision === d).length * 2;
  const scene = (c: (typeof all)[number]) => scenes.find((s) => s.sceneId === c.sceneId)!;
  // Picture facts the generator can read from the frozen frame; anything else is left to the owner.
  const facts = (s: MomentScene, k: string, original: string): { facts: string; conflict: string | null } => {
    const o = v2.get(`${s.sceneId}/${k}`);
    const P = s.protagonist.actorId;
    const holder = s.ball.ownerAtDecision;
    const me = s.actors.find((a) => a.id === P)!.decision;
    const tgt = holder && holder !== P ? s.actors.find((a) => a.id === holder)!.decision : s.ball.decision;
    const ball = holder ? `ball held by ${holder === P ? 'you' : holder}` : 'ball loose';
    const lane = o?.timeline?.actors.find((tr) => /^Proposed response/.test(tr.purpose ?? ''));
    const out: string[] = [ball, `${Math.hypot(me[0] - tgt[0], me[1] - tgt[1]).toFixed(1)} m from ${holder && holder !== P ? holder : 'the ball'}`];
    let conflict: string | null = null;
    if (o?.timeline?.ball.some((e) => e.kind === 'pass')) {
      out.push(lane ? `${lane.id} stands in the lane` : 'no opponent in the lane at the freeze');
      if (!lane && /screen|crowded|blocker|through defender/i.test(original)) conflict = `the package wording names a screened/crowded/blocked lane, but no opponent stands within 4 m of the drafted lane in ${s.library.variant}`;
    }
    if (/protected ball/i.test(original) && !holder) conflict = `the package wording names a protected ball, but the ball is loose at the freeze in ${s.library.variant}`;
    return { facts: out.join('; '), conflict };
  };
  const reviewed = revs.filter(({ c, r }) => r.change !== 'unchanged' && !GENERIC_RE.test(r.original) && OWNER_R4[scene(c).library.situationId]);
  const rows = reviewed.map(({ c, r }) => {
    const s = scene(c);
    const o = v2.get(`${c.sceneId}/${r.choice}`);
    const m = movementCheck(s, r.intent, o);
    const f = facts(s, r.choice, r.original);
    const check = r.change === 'removed' ? 'archived' : `${m.check}${m.note ? `: ${m.note}` : ''}`;
    const grade = r.change === 'removed' ? 'archived' : f.conflict ? `CONFLICT: ${f.conflict}` : m.check !== 'MATCHES' ? 'CANNOT EVALUATE: the movement does not show this action yet' : 'OWNER TO SET from the picture';
    return `| ${c.sceneId}/${r.choice} | ${esc(r.original)} | ${r.proposedR3 ? esc(r.proposedR3) : '—'} | ${r.proposed ? esc(r.proposed) : '(removed)'} | ${r.ownerDecision} | ${r.meaning ?? '—'}${r.meaningWhy ? `: ${esc(r.meaningWhy)}` : ''} | ${r.overlap ? `may read like ${esc(r.overlap)}` : '—'} | ${esc(check)} | ${r.grade} | ${esc(f.facts)} | ${esc(grade)} |`;
  });
  const mism = reviewed.filter(({ c, r }) => r.change === 'reworded' && movementCheck(scene(c), r.intent, v2.get(`${c.sceneId}/${r.choice}`)).check !== 'MATCHES');
  const d17 = all.filter((c) => c.sceneId.startsWith('TM-D17-'));
  return [
    '# Tactical Moments: choice wording review (generated)',
    '',
    'Generated from `scenes.v2.json` and `outcomes.v2.json` by `tests/momentsExport.test.ts`; records in `choices.v2.json` (`choices.v1.json` = round-3 proposals, frozen as history). Package wording, action IDs and grades are never edited: they stay as the historical record. The review build shows the owner wording; **Original only** shows the package wording.',
    '',
    '## Owner wording review (round 4), as recorded',
    '',
    `- ${n((r) => r.change === 'removed' && GENERIC_RE.test(r.original))} generic choices ("Pause, scan and communicate before committing"): removal approved.`,
    `- ${sit('approved')} revised labels (branch C, base and changed): approved as written.`,
    `- ${sit('replaced')} revised labels: owner replacements.`,
    `- ${sit('removed')} goal-line choices (\`TM-D17-base/C\`, \`TM-D17-changed/C\`): removed; branches archived in \`scenes.v2.json\`, their exclusive animation requirements excluded.`,
    '- Movement, contact and grade approval: not established by this wording review.',
    '',
    `Choices left per version: ${[...new Set(all.map((c) => c.remaining))].sort().join(', ')}. Versions needing reauthoring (fewer than 2): ${all.filter((c) => c.needsReauthoring).length}. D17 keeps ${d17.map((c) => `${c.sceneId}: ${c.revisions.filter((r) => r.change !== 'removed').map((r) => `${r.choice} "${r.original}" (${r.grade})`).join(', ')}`).join('; ')}. These differ in route (near side vs central), so they still form a decision; no third choice was invented.`,
    '',
    '## How to read the table',
    '',
    '- **Movement:** MATCHES = the v2 draft animates the action the wording names. MISMATCH / STOPS_BEFORE_CONTACT / NO_DRAFT_MOVEMENT = it does not; the animation was **not** changed to fit the wording, and the review build shows no destination marker for that option.',
    '- **Grade:** the package grade is kept as history. "OWNER TO SET" = movement matches; the owner grades it from the picture, separately for base and changed. CONFLICT = a fact readable from the frozen frame contradicts the package wording. CANNOT EVALUATE = the movement does not show the action, so no outcome was forced to justify the package grade.',
    '- **Meaning:** may-change = the owner wording may name a different action than the package label (reason given).',
    '- **Overlap:** another retained choice in the same version that may read as the same action; the picture or route must separate them.',
    '',
    `Wording/movement mismatches to resolve (${mism.length}): ${mism.map(({ c, r }) => `${c.sceneId}/${r.choice}`).join(', ') || 'none'}.`,
    '',
    '## Tackles (D19, D25, D32)',
    '',
    'The earlier report that no tackle occurs still holds: in all six branches the draft closes to 0.8 m and stops before contact (STOPS_BEFORE_CONTACT); no tackle is attempted or resolved. The approved labels now name a tackle, so the contact audit lists a tackle as INCOMPLETE for these versions, and the art brief lists tackle frames as pending a movement decision. Actual contact needs tackle animation and contact metadata.',
    '',
    '| Branch | Package | Round 3 | Shown now | Owner | Meaning | Overlap | Movement | Package grade (history) | Picture facts (freeze) | Grade review |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

type ContactStatus = 'VERIFIED' | 'UNVERIFIED' | 'NOT_APPLICABLE' | 'INCOMPLETE';
const CONTACT_TYPES = ['dribble', 'pass', 'receive', 'shot', 'tackle', 'interception', 'control'] as const;
const CONTACT_RECORDS = JSON.parse(readFileSync(new URL('contact-frames.json', DIR), 'utf8')) as { action: string; status: string }[];
function contactAudit(s: MomentScene, outs: OutcomeDraft[]) {
  const n: Record<(typeof CONTACT_TYPES)[number], number> = { dribble: 0, pass: 0, receive: 0, shot: 0, tackle: 0, interception: 0, control: 0 };
  // Retained choices only: removed (archived) options need no contact.
  const kept = (['A', 'B', 'C', 'D'] as const).filter((k) => keptChoice(s, k));
  const tls = [s.watch, ...kept.map((k) => s.branches[k].timeline), ...outs.filter((o) => kept.includes(o.choice)).flatMap((o) => (o.timeline ? [o.timeline] : []))];
  // A retained label that names a tackle needs a tackle contact even though no draft plays one yet.
  n.tackle += reviseChoices(s).revisions.filter((r) => r.change !== 'removed' && r.intent === 'tackle').length;
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
  return ['# Tactical Moments: contact audit (generated, review only)', '', 'Counts are contacts across the watch, the retained branches and their v2 outcome drafts of each scene version (removed choices excluded); a tackle is counted where a retained label names one (D19, D25, D32 C), although no draft plays it yet. Status per type: VERIFIED = reviewed metadata for every sheet; UNVERIFIED = `contact-frames.json` records exist but anatomical foot, supporting foot and surface are unreviewed (the art does not show them clearly at this size; see `contact/*.png`); INCOMPLETE = no metadata record for that contact type exists yet; NOT_APPLICABLE = does not occur. Facing never decides the foot. Unresolved contact animations stay out of release.', '', `| Scene | Overall | ${CONTACT_TYPES.join(' | ')} |`, `|---|---|${CONTACT_TYPES.map(() => '---').join('|')}|`, ...rows, ''].join('\n');
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
    'Generated by `WRITE_MOMENTS=1 npx vitest run tests/momentsExport.test.ts` from `scenes.v2.json` and `outcomes.v2.json`. Nothing here is approved art; missing art blocks release, not framework work. Choices removed in `choices.v2.json` (the generic "Pause, scan and communicate" option in all 72 versions and D17 C) are excluded: only the watch and retained choices count.',
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
function pending(scenes: MomentScene[]): string[] {
  const v2 = new Map(draftOutcomesV2(scenes).map((o) => [o.branchId, o]));
  return scenes.flatMap((s) => reviseChoices(s).revisions.flatMap((r) => {
    if (r.change !== 'reworded') return [];
    const m = movementCheck(s, r.intent, v2.get(`${s.sceneId}/${r.choice}`));
    if (m.check === 'MATCHES') return [];
    const P = s.protagonist.actorId;
    const holder = s.ball.ownerAtDecision;
    const tgt = holder && holder !== P ? s.actors.find((a) => a.id === holder)!.decision : s.ball.decision;
    const face = sector(s.actors.find((a) => a.id === P)!.decision, tgt);
    const need = r.intent === 'tackle' ? `tackle (contact: anatomical foot, surface, support foot, contact frame) facing ${face} toward ${holder && holder !== P ? holder : 'the ball'}, boy and girl` : r.intent === 'pass' ? 'pass; target lane not identified yet' : r.intent === 'overrun' ? 'run through without braking (existing run frames may serve; direction from the decided route)' : r.intent === 'close-with-mate' ? 'teammate run toward the ball (route not decided)' : 'movement not decided';
    return [`- ${s.sceneId}/${r.choice} "${r.proposed}": ${m.check}. Needs: ${need}.`];
  }));
}

function production(rows: ReturnType<typeof requirements>['rows'], scenes: MomentScene[]): string {
  const miss = rows.filter((r) => r.status === 'MISSING');
  const out = [
    '# Tactical Moments: art production brief, missing groups (generated, production preparation only)',
    '',
    `${miss.length} missing action/direction groups, in the owner priority order. Requirements used only by discarded choices (the removed generic option and D17 C) are excluded. This brief prepares art production; it is not a commission and no finished frame is approved until the owner reviews it.`,
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
    '## Pending a movement decision (not in the groups above; do not produce yet)',
    '',
    'These approved or replacement labels name an action the current drafts do not animate. The animation is not changed to fit the wording; once the owner decides the movement, the matching group is added above.',
    '',
    ...pending(scenes),
    '',
  ];
  return out.join('\n');
}

describe('stored Tactical Moments drafts', () => {
  const scenes = exportDrafts();
  const outs = draftOutcomes(scenes);
  it('choices.v1.json (round-3 proposals) stays frozen as history', () => {
    expect(createHash('sha256').update(readFileSync(new URL('choices.v1.json', DIR))).digest('hex')).toBe('4f8164865ee5c0c76f9453622afc669645644e548808f6f595fb994f7a3453aa');
  });
  it('scenes.v1.json stays frozen as history', () => {
    expect(createHash('sha256').update(readFileSync(new URL('scenes.v1.json', DIR))).digest('hex')).toBe('3f8059a6bbbe0159802b9967cbf66a2ef1d61d98c1db2fdad0767a850c69894c');
  });
  const files: [string, string][] = [
    ['scenes.v2.json', '[\n' + scenes.map((s) => JSON.stringify(s)).join(',\n') + '\n]\n'],
    ['REVIEW_MATRIX.md', matrix(scenes)],
    ['GAPS_BY_SCENE.md', gaps(scenes)],
    ['outcomes.v1.json', '[\n' + outs.map((o) => JSON.stringify(o)).join(',\n') + '\n]\n'],
    ['choices.v2.json', '[\n' + scenes.map((x) => JSON.stringify(reviseChoices(x))).join(',\n') + '\n]\n'],
    ['CHOICE_REVISIONS.md', choicesMd(scenes)],
    ['outcomes.v2.json', '[\n' + draftOutcomesV2(scenes).map((o) => JSON.stringify(o)).join(',\n') + '\n]\n'],
    ['FROZEN_BRANCHES.md', frozen(scenes, outs)],
    ['ANIMATION_REQUIREMENTS.json', requirements(scenes, draftOutcomesV2(scenes)).json],
    ['ANIMATION_REQUIREMENTS.md', requirements(scenes, draftOutcomesV2(scenes)).md],
    ['CONTACT_AUDIT.md', contactMd(scenes)],
    ['ART_BRIEF.md', artBrief(requirements(scenes, draftOutcomesV2(scenes)).rows)],
    ['ART_PRODUCTION_MISSING.md', production(requirements(scenes, draftOutcomesV2(scenes)).rows, scenes)],
  ];
  for (const [name, want] of files) {
    it(`${name} equals the generator output (regenerate with WRITE_MOMENTS=1)`, () => {
      if (process.env.WRITE_MOMENTS === '1') writeFileSync(new URL(name, DIR), want);
      expect(readFileSync(new URL(name, DIR), 'utf8')).toBe(want);
    });
  }
});
