// Writes docs/training/all36/SCHEDULE.md and WEEKLY.md from the framework-free schedule (loaded through Vite's SSR loader).
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] } });
try {
  const { scheduleMarkdown, weeklyMarkdown } = await vite.ssrLoadModule('/src/game/training12/all36/report.ts');
  writeFileSync('docs/training/all36/SCHEDULE.md', scheduleMarkdown());
  writeFileSync('docs/training/all36/WEEKLY.md', weeklyMarkdown());
  console.log('wrote docs/training/all36/SCHEDULE.md and WEEKLY.md');
} finally {
  await vite.close();
}
