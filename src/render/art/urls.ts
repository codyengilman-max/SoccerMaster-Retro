import { isAllowedAsset } from './catalog';

/** Bundled runtime images (Vite-hashed). The glob is the build-time allowlist; no names or user text form paths. */
const files = import.meta.glob('../../assets/art/v1/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const URLS: ReadonlyMap<string, string> = new Map(
  Object.entries(files)
    .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.webp'.length), url] as const)
    .filter(([id]) => isAllowedAsset(id)),
);

export const artUrl = (assetId: string): string | null => (isAllowedAsset(assetId) ? (URLS.get(assetId) ?? null) : null);
export const artTextureKey = (assetId: string): string => `art-v1:${assetId}`;
