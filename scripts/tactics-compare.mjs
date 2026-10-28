// PR B: classic vs v0.5 computer tactics on the same seeds, each run twice to check determinism.
// Usage: npm run tactics:compare --  [seeds=50] [firstSeed=1]
// Loads the framework-free TS sim through Vite's SSR loader (no new dependencies).
// Writes docs/tactics/results.json (every run) and docs/tactics/summary.md (means, spreads, paired deltas).
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';

const seeds = Number(process.argv[2] ?? 50);
const first = Number(process.argv[3] ?? 1);
const MODES = ['classic', 'v05'];
const INPUTS = ['chaser', 'sweep'];
const server = await createServer({
  server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] },
});
let runs = [];
try {
  const { measureMatch } = await server.ssrLoadModule('/src/game/match/metrics.ts');
  for (let seed = first; seed < first + seeds; seed++) {
    for (const input of INPUTS) for (const mode of MODES) {
      const r = measureMatch({ seed, mode, input });
      const again = measureMatch({ seed, mode, input });
      r.deterministic = again.traceHash === r.traceHash && again.score === r.score;
      runs.push(r);
      process.stdout.write(`seed ${seed} ${input} ${mode} ${r.score} hash ${r.traceHash} det=${r.deterministic} ${r.msPerTick.toFixed(3)}ms/tick\n`);
    }
  }
} finally {
  await server.close();
}

const stats = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x));
  if (!v.length) return { n: 0, mean: NaN, sd: NaN, min: NaN, max: NaN };
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, v.length - 1));
  return { n: v.length, mean, sd, min: Math.min(...v), max: Math.max(...v) };
};
const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : 'n/a');
let input = 'chaser';
const by = (mode) => runs.filter((r) => r.mode === mode && r.input === input);
const teamKeys = Object.keys(runs[0].home);
const matchKeys = ['stoppages', 'failedRestarts', 'stuckSpells', 'invariantViolations', 'msPerTick'];
const rows = [];
const table = (title, pick, keys) => {
  rows.push(`\n### ${title}\n`, '| Metric | classic mean ± sd [min–max] | v0.5 mean ± sd [min–max] | paired v0.5 − classic (mean ± sd) |', '|---|---|---|---|');
  for (const k of keys) {
    const c = stats(by('classic').map((r) => pick(r)[k]));
    const v = stats(by('v05').map((r) => pick(r)[k]));
    const d = stats(by('classic').map((rc) => pick(by('v05').find((rv) => rv.seed === rc.seed))[k] - pick(rc)[k]));
    const dp = k === 'msPerTick' ? 3 : 2;
    rows.push(`| ${k} | ${f(c.mean, dp)} ± ${f(c.sd, dp)} [${f(c.min, dp)}–${f(c.max, dp)}] | ${f(v.mean, dp)} ± ${f(v.sd, dp)} [${f(v.min, dp)}–${f(v.max, dp)}] | ${f(d.mean, dp)} ± ${f(d.sd, dp)} |`);
  }
};
const head = [];
for (input of INPUTS) {
  rows.push(`\n## Input profile: ${input}`);
  head.push(`- ${input} / ${results('classic')}`, `- ${input} / ${results('v05')}`);
  table(`${input}: computer team (away), the opponent story players face`, (r) => r.away, teamKeys);
  table(`${input}: scripted home team (same input in both modes)`, (r) => r.home, teamKeys);
  table(`${input}: match level`, (r) => r, matchKeys);
}
function results(mode) {
  const rs = by(mode);
  const w = rs.filter((r) => r.home.goals > r.away.goals).length, l = rs.filter((r) => r.home.goals < r.away.goals).length;
  return `${mode}: home bot W${w} D${rs.length - w - l} L${l}; tactics failures ${rs.filter((r) => r.tacticsFailure).length}; non-deterministic ${rs.filter((r) => !r.deterministic).length}`;
}
const summary = [
  `# Tactics comparison results`,
  '',
  `Seeds ${first}–${first + seeds - 1} (${seeds} shared seeds), ${runs.length} matches (both input profiles), every match run twice and trace hashes compared.`,
  '',
  ...head,
  ...rows,
  '',
  '### Per-seed scores and trace hashes',
  '',
  '| Seed | Input | classic | classic hash | v0.5 | v0.5 hash |',
  '|---|---|---|---|---|---|',
  ...runs.filter((r) => r.mode === 'classic').map((c) => { const v = runs.find((r) => r.mode === 'v05' && r.seed === c.seed && r.input === c.input); return `| ${c.seed} | ${c.input} | ${c.score} | \`${c.traceHash}\` | ${v.score} | \`${v.traceHash}\` |`; }),
  '',
];
mkdirSync('docs/tactics', { recursive: true });
writeFileSync('docs/tactics/results.json', JSON.stringify({ seeds, first, runs }, null, 1) + '\n');
writeFileSync('docs/tactics/summary.md', summary.join('\n'));
console.log(summary.slice(0, 8).join('\n'));
