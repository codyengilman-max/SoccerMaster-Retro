/** Publication, eligibility and one-hop fallback rules (port of the reference `approved`/`eligible`/`choose`). */
import { canonical, type Capability, type Family, type Level, type Manifest } from './manifest';
import type { ReleaseApproval } from './release';
import { sha256Hex } from './sha256';
import type { Json } from './json';

export const EMPTY_STATE = 'No eligible reviewed activity. Choose another focus or skip without penalty.';

export interface DemoAsset { readonly bytes: Uint8Array; readonly caption: Uint8Array; readonly side: 'left' | 'right' }
export type TrustedApprovals = ReadonlyMap<string, ReleaseApproval>;
export type DemoAssets = ReadonlyMap<string, DemoAsset>;

export function familyOf(m: Manifest, levelId: string): { family: Family; level: Level } | null {
  for (const family of m.families) {
    const level = family.levels.find((l) => l.id === levelId);
    if (level) return { family, level };
  }
  return null;
}

/** SHA-256 over the canonical JSON of everything a reviewer approves for this level. */
export function contentHash(m: Manifest, levelId: string): string {
  const hit = familyOf(m, levelId);
  if (!hit) throw new Error(`unknown level ${levelId}`);
  const { family, level } = hit;
  const claims = m.claims.filter((c) => level.claimIds.includes(c.id));
  const sourceIds = new Set(claims.flatMap((c) => c.sourceIds));
  const { levels: _omit, ...familyFields } = family;
  const components = level.components.map((id) => contentHash(m, id));
  const payload = {
    family: familyFields,
    level,
    claims,
    sources: m.sources.filter((s) => sourceIds.has(s.id)),
    profile: m.spaceProfiles.find((p) => p.id === family.profile)!,
    safety: m.safety,
    components,
  };
  return sha256Hex(canonical(payload as unknown as Json));
}

export function approved(m: Manifest, levelId: string, trusted: TrustedApprovals, assets: DemoAssets): boolean {
  const r = trusted.get(levelId);
  const hit = familyOf(m, levelId);
  if (!r || !hit || r.revoked || r.levelId !== levelId || r.contentHash !== contentHash(m, levelId)) return false;
  if (!r.coachReviewer || !r.qaReviewer || !r.evidenceReviewed || !r.rightsReviewed) return false;
  if (m.claims.some((c) => hit.level.claimIds.includes(c.id) && c.type === 'unresolved')) return false;
  for (const side of ['left', 'right'] as const) {
    const a = assets.get(`${levelId}-${side}`);
    const s = r.sides[side];
    if (!a || !s || a.side !== side) return false;
    if (sha256Hex(a.bytes) !== s.assetHash || sha256Hex(a.caption) !== s.captionHash) return false;
  }
  return true;
}

export function eligible(m: Manifest, levelId: string, caps: ReadonlySet<Capability>, comfortable: ReadonlySet<string>, trusted: TrustedApprovals, assets: DemoAssets): boolean {
  const hit = familyOf(m, levelId);
  if (!hit || !approved(m, levelId, trusted, assets)) return false;
  if (!hit.family.requiredCapabilities.every((c) => caps.has(c))) return false;
  if (!hit.level.prerequisites.every((p) => comfortable.has(p))) return false;
  return hit.level.components.every((c) => eligible(m, c, caps, comfortable, trusted, assets));
}

export interface Choice { readonly levelId: string | null; readonly substituted: boolean; readonly notice: string | null }

/** Finite one-hop fallback; no recursion, rerolls or relaxed requirements. UI must ask before using a substitute. */
export function choose(m: Manifest, familyId: string, caps: ReadonlySet<Capability>, comfortable: ReadonlySet<string>, trusted: TrustedApprovals, assets: DemoAssets): Choice {
  const fam = m.families.find((f) => f.id === familyId);
  for (const l of fam?.levels ?? []) if (eligible(m, l.id, caps, comfortable, trusted, assets)) return { levelId: l.id, substituted: false, notice: null };
  const sub = m.substitutions.find((s) => s.fromFamily === familyId);
  const to = sub && m.families.find((f) => f.id === sub.toFamily);
  for (const l of to?.levels ?? []) if (eligible(m, l.id, caps, comfortable, trusted, assets)) return { levelId: l.id, substituted: true, notice: sub!.notice };
  return { levelId: null, substituted: false, notice: EMPTY_STATE };
}

export type Surface = 'inside' | 'outside' | 'sole' | 'laces';
/** Mirroring swaps the limb and direction, never the contact surface. */
export function mirror(side: 'left' | 'right', surface: Surface): ['left' | 'right', Surface] {
  return [side === 'right' ? 'left' : 'right', surface];
}

export function trustedFrom(list: readonly ReleaseApproval[]): TrustedApprovals {
  return new Map(list.map((r) => [r.levelId, r]));
}
