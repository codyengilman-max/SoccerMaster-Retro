/** docs/training/all36/SCHEDULE.md, generated from ALL36_SCHEDULE so the doc cannot drift from the data. Framework-free. */
import { POSITIONS } from '../../career/types';
import { ALL36_ARCHIVE_SHA256 } from './package';
import { ALL36_SCHEDULE } from './schedule';

export function scheduleMarkdown(): string {
  const rows = ALL36_SCHEDULE;
  const mapped = rows.filter((r) => r.status === 'mapped');
  const lines: string[] = [
    '# All36 runtime schedule (PR C step 1)',
    '',
    `Generated from \`curriculum.json\` and \`episodes.json\` of the package with archive SHA-256 \`${ALL36_ARCHIVE_SHA256}\` by \`scheduleMarkdown()\` in \`src/game/training12/all36/report.ts\` (\`npm run all36:schedule\`). A test fails if this file is stale.`,
    '',
    'Mapped means the session has approved data for that category; it is not playable until step 2 adds facing and authored continuations. Blocked routes stay fail-closed. Nothing is substituted.',
    '',
    '## Totals',
    '',
    '| Category | Roles | Season 1 mapped (of 54) | Season 2 mapped (of 54) |',
    '|---|---|---|---|',
    ...POSITIONS.map((c) => {
      const roles = [...new Set(mapped.filter((r) => r.category === c).flatMap((r) => r.assigned.map((a) => a.role)))].sort();
      const n = (s: number) => mapped.filter((r) => r.category === c && r.season === s).length;
      return `| ${c} | ${roles.join(', ')} | ${n(1)} | ${n(2)} |`;
    }),
    '',
    'Narrow-role turns across mapped Season 1 routes:',
    '',
    ...POSITIONS.map((c) => {
      const count = new Map<string, number>();
      for (const r of mapped) if (r.category === c && r.season === 1) for (const a of r.assigned) count.set(a.role, (count.get(a.role) ?? 0) + 1);
      return `- ${c}: ${[...count].sort().map(([k, v]) => `${k} ${v}`).join(', ')}`;
    }),
    '',
    'Season 1 weeks where all three sessions (A, B, C) map for the category, which the existing weekly credit needs:',
    '',
    ...POSITIONS.map((c) => {
      const weeks = [...new Set(rows.filter((r) => r.season === 1).map((r) => r.week))].filter((w) => mapped.filter((r) => r.season === 1 && r.week === w && r.category === c).length === 3);
      return `- ${c}: ${weeks.length} of 18 (${weeks.join(', ') || 'none'})`;
    }),
    '',
    '## Routes',
    '',
    'Keys: completion `all36.v1/<session>/<category>`; credit is the existing `tt12Run` record for the career week and slot. Prerequisite: the session opens in its own career week (existing rule; A, B, C in any order).',
    '',
    '| Session | Category | Topic | Difficulty | Listed | Assigned (situation · variant · package role → role) | Completion key | Credit key | Status |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) =>
      [
        r.sessionId,
        r.category,
        r.topic,
        `${r.difficulty.mode} (${r.difficulty.level})`,
        r.listed.join(' '),
        r.assigned.map((a) => `${a.situationId} · ${a.variant} · ${a.packageRole}→${a.role}`).join('<br>') || '—',
        `\`${r.completionKey}\``,
        `\`${r.creditKey}\``,
        r.status === 'mapped' ? 'mapped' : `blocked: ${r.blockers.join(' ')}`,
      ].join(' | '),
    ).map((l) => `| ${l} |`),
    '',
  ];
  return lines.join('\n');
}
