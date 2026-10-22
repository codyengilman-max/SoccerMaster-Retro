#!/usr/bin/env node
// Runs the browser tests in two passes: the phone projects (parallel workers), then the desktop
// project on its own. On 2-core CI a 1280x720 software-WebGL canvas starves when it shares the
// CPU with the phone workers (the desktop Coach session advanced ~2.5 sim-seconds in 45 s).
// Arguments pass through; an explicit --project runs a single pass.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const run = (extra) => spawnSync('npx', ['playwright', 'test', ...extra, ...args], { stdio: 'inherit' }).status ?? 1;
if (args.some((a) => a === '--project' || a.startsWith('--project='))) process.exit(run([]));
const phones = ['phone-portrait', 'phone-landscape', 'small-phone-landscape', 'small-phone-portrait', ...(process.env.WEBKIT ? ['webkit-phone-landscape'] : [])];
const first = run(phones.map((p) => `--project=${p}`));
const second = run(['--project=desktop']);
process.exit(first || second);
