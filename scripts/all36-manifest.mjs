// PR C step 1: fingerprint the coach-approved All36 package from the exact ZIP.
// Usage: node scripts/all36-manifest.mjs <SoccerMaster_Coach_Approved_All36.zip>
// Extracts into a fresh temporary directory, hashes every file (raw and normalized), checks the package's own
// SHA256_MANIFEST.json, reproduces the per-situation approval hashes, and writes docs/training/all36/MANIFEST.json.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const zip = process.argv[2];
if (!zip) throw new Error('Usage: node scripts/all36-manifest.mjs <SoccerMaster_Coach_Approved_All36.zip>');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const stable = (v) =>
  Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);

/** Normalized bytes: archive/encoding noise removed, content kept. */
function normalize(path, buf) {
  if (path.endsWith('.json')) return { kind: 'json-canonical', bytes: Buffer.from(stable(JSON.parse(buf.toString('utf8')))) };
  if (/\.(md|txt|py|html|svg|csv)$/.test(path)) {
    const t = buf.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
    return { kind: 'text-lf', bytes: Buffer.from(t) };
  }
  if (path.endsWith('.png')) {
    // Critical and transparency chunks only: drops timestamps/text/colour-profile metadata, keeps every pixel byte.
    const keep = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
    const parts = [];
    for (let o = 8; o < buf.length; ) {
      const len = buf.readUInt32BE(o);
      const type = buf.toString('latin1', o + 4, o + 8);
      if (keep.has(type)) parts.push(buf.subarray(o + 4, o + 8 + len));
      o += 12 + len;
    }
    return { kind: 'png-critical-chunks', bytes: Buffer.concat(parts) };
  }
  return { kind: 'raw', bytes: buf };
}

const dir = mkdtempSync(join(tmpdir(), 'all36-'));
try {
  execFileSync('unzip', ['-q', zip, '-d', dir]);
  const top = readdirSync(dir);
  if (top.length !== 1) throw new Error(`Expected one top folder, found ${top.join(', ')}`);
  const root = join(dir, top[0]);
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const files = walk(root).map((p) => relative(root, p).split('\\').join('/')).sort();
  const own = JSON.parse(readFileSync(join(root, 'SHA256_MANIFEST.json'), 'utf8'));
  const entries = files.map((path) => {
    const buf = readFileSync(join(root, path));
    const n = normalize(path, buf);
    const listed = own[path];
    return { path, bytes: buf.length, sha256: sha(buf), normalized: n.kind, normalizedSha256: sha(n.bytes), packageManifest: listed === undefined ? 'unlisted' : listed === sha(buf) ? 'match' : 'MISMATCH' };
  });
  const mismatched = entries.filter((e) => e.packageManifest === 'MISMATCH').map((e) => e.path);
  const missing = Object.keys(own).filter((p) => !files.includes(p));
  if (mismatched.length || missing.length) throw new Error(`Package manifest check failed: ${[...mismatched, ...missing].join(', ')}`);

  const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const episodes = read('episodes.json');
  const before = read('review_history/episodes_before_approval.json');
  const approval = read('COACH_APPROVAL.json');
  const tactical = (e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'status' && k !== 'approval'));
  const scenarios = episodes.map((e, i) => {
    const pre = before.find((b) => b.id === e.id);
    const rec = approval.situations.find((s) => s.id === e.id);
    const reviewed = pre ? sha(Buffer.from(JSON.stringify(pre))) : null;
    return {
      id: e.id,
      index: i,
      family: e.family_id,
      title: e.title,
      variants: e.variants.map((v) => v.id),
      semanticSha256: sha(Buffer.from(stable(tactical(e)))),
      unchangedSinceReview: !!pre && stable(tactical(pre)) === stable(tactical(e)),
      reviewedEpisodeSha256: rec?.reviewed_episode_sha256 ?? null,
      reviewedHashReproduced: reviewed !== null && reviewed === rec?.reviewed_episode_sha256,
    };
  });
  const out = {
    generatedBy: 'scripts/all36-manifest.mjs',
    archive: { file: zip.split('/').pop(), sha256: sha(readFileSync(zip)), topFolder: top[0], files: files.length },
    packageManifest: { listed: Object.keys(own).length, matched: entries.filter((e) => e.packageManifest === 'match').length, unlisted: entries.filter((e) => e.packageManifest === 'unlisted').map((e) => e.path) },
    approval: { status: approval.status, reviewer: approval.reviewer_name, date: approval.approval_date, reviewedPackageSha256: approval.reviewed_package_sha256, runtimeValidation: approval.runtime_validation },
    normalization: {
      'json-canonical': 'UTF-8 JSON parsed and re-serialized with sorted keys and no whitespace',
      'text-lf': 'UTF-8, BOM removed, CRLF/CR to LF, exactly one trailing newline',
      'png-critical-chunks': 'type+data of IHDR, PLTE, tRNS, IDAT, IEND (ancillary metadata chunks dropped)',
      raw: 'bytes as extracted',
      semanticSha256: 'json-canonical of the episode without status and approval (the tactical content)',
      reviewedEpisodeSha256: 'COACH_APPROVAL.json value; reproduced as SHA-256 of compact JSON (key order as authored) of the matching review_history/episodes_before_approval.json entry',
    },
    scenarios,
    files: entries,
  };
  writeFileSync('docs/training/all36/MANIFEST.json', `${JSON.stringify(out, null, 1)}\n`);
  console.log(`archive ${out.archive.sha256} files ${files.length} manifest ${out.packageManifest.matched}/${out.packageManifest.listed} reviewed hashes reproduced ${scenarios.filter((s) => s.reviewedHashReproduced).length}/36 unchanged ${scenarios.filter((s) => s.unchangedSinceReview).length}/36`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
