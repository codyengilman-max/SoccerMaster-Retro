/** Builds docs/training/TACTICAL_SITUATIONS_MAPPING.md from the library and mapping code (kept in sync by a test). */
import type { RoleId } from '../ref/catalog.mjs';
import { sessions } from '../ref/seasons.mjs';
import { ALL_FIXTURES, SEED_FAMILIES, SOURCE_CATALOG, routePlan } from './index';
import { MODEL_VERSION } from './types';

/** docs/training/v1.2/references/selected_tactical_seeds.json */
export const SELECTED_SEEDS: readonly string[] = ['GK01', 'CB02', 'CB04', 'OB01', 'SIX01', 'SIX02', 'EIGHT01', 'EIGHT03', 'WING01', 'WING02', 'WING03', 'WING04', 'AT01', 'DT01', 'DT02', 'DEF01', 'DEF02'];

const ROLES: readonly RoleId[] = ['GK', 'CB', 'LB', 'RB', '6', '8', '9', 'LW', 'RW'] as RoleId[];

export function mappingMarkdown(): string {
  const out: string[] = [];
  out.push('# Team Training: curriculum to tactical situation mapping', '');
  out.push(`Generated from \`src/game/training12/situations/\` (model \`${MODEL_VERSION}\`). Do not edit by hand: run \`UPDATE_MAPPING=1 npx vitest run tests/training12-situations-library.test.ts\`.`, '');
  out.push('**Review only, never scored.** These ts-1 situations are earlier proposals written by Devin, not approved library content. Scored Team Training is gated on the Audited Library v1.2: see `docs/training/library-v1.2/SESSION_MAPPING.md` and `REVIEW_SHEET.md`.', '');
  out.push('## Sources', '');
  out.push(`- Situations: \`${SOURCE_CATALOG}\` (40 seeds; the v0.2 copy is identical). Every seed is \`draft_seed\`, \`production_enabled: false\`, \`not_calibrated\`, with no source ids.`);
  out.push('- Selected seeds: `docs/training/v1.2/references/selected_tactical_seeds.json` (17, marked * below).');
  out.push('- Roles and interactions: `docs/training/v1.2/references/SoccerMaster_9v9_Roles_Interactions_Review_v0.3.md`.');
  out.push('- Schedule: `season-sessions.json` in `docs/training/v1.2/SoccerMaster_Team_Training_Fixed_v1.2.zip` (108 sessions, a family per role route).', '');
  out.push('## What the library does not contain', '');
  out.push('No seed has coordinates, player counts, rosters, timing, a passage of play, outcome branches or AI responsibilities. Those are authored here from the seed text and the roles review, and are **authored prototype data, not calibrated or validated**. The catalog cue and counter texts are quoted verbatim as what each variant teaches.', '');
  out.push('## Seeds', '');
  out.push('| Seed | Moment | User | Half | Phase | Players (ours + theirs) | Families |', '|---|---|---|---|---|---|---|');
  for (const f of ALL_FIXTURES) {
    const ours = f.actors.filter((a) => a.side === 'A' || a.side === 'GK_A').length;
    const theirs = f.actors.length - ours;
    out.push(`| ${f.seed}${SELECTED_SEEDS.includes(f.seed) ? '*' : ''} | ${f.title} | ${f.focal} | ${f.goal === 'ours' ? 'our goal' : 'their goal'} | ${f.phase} | ${ours} + ${theirs} | ${(SEED_FAMILIES[f.seed] ?? []).join(', ')} |`);
  }
  out.push('', '## Sessions', '');
  out.push('Each cell: the route family, then the three moments (R = played reflected, for the other side). Every moment is played as its cue variant in round 1, its counter variant in round 2, and a mixed timed round 3.');
  out.push('Fit: `direct` all three moments teach the family; `partial` some are role moments added because the role has fewer than three for that family; `weak` none do (flagged).', '');
  out.push(`| Session | ${ROLES.join(' | ')} |`, `|---|${ROLES.map(() => '---').join('|')}|`);
  const counts = { direct: 0, partial: 0, weak: 0 };
  for (const s of sessions) {
    const cells = ROLES.map((r) => {
      const p = routePlan(s.id, r)!;
      counts[p.fit]++;
      const ids = p.moments.map((m) => `${m.fixtureId}${m.mirrored ? 'R' : ''}${m.fit === 'role' ? '~' : ''}`).join(' ');
      return `${p.family}: ${ids}${p.fit === 'direct' ? '' : ` (${p.fit})`}`;
    });
    out.push(`| ${s.id} | ${cells.join(' | ')} |`);
  }
  out.push('', '`~` marks a role moment outside the session family.', '');
  out.push(`Totals: ${counts.direct + counts.partial + counts.weak} routes; ${counts.direct} direct, ${counts.partial} partial, ${counts.weak} weak.`, '');
  return out.join('\n');
}
