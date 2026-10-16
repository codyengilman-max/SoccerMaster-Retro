# Graphics validation — audited revision 1.1

15 October 2026, America/Phoenix. Scope: this package only.

| Check | Executed result |
| --- | --- |
| School story branches and identity | 1,230 assertions passed across 24 paths: both protagonist presentations × three introduction responses × four crossbar-invitation responses |
| Demo input and text rendering | 13 mocked DOM checks passed: cancellation, extra pointer, stale handler, held key, resize/visibility, restart, plain-text name, image failure and invalid-name recovery |
| Scene continuity | All 18 current v0.7 scene IDs/order mapped; each cast/outfit reference resolves; no invented Sam/Riley attendance |
| Assets | 28 cutscene PNGs, 24 transparent portraits, ten visual identities, four location groups; 19 gameplay atlases with 80 valid frames each |
| Byte preservation | All 48 PNGs, including the gameplay board, are byte-identical to the originally delivered v1 archive |
| Sprite rendering | 1,680 pose combinations visible with no outer-edge clipping; 672 use the existing padding; original drawing instructions, anchor and visible scale preserved |
| Package parsing | JSON references resolve; duplicate/prototype-key and traversal fixtures rejected; no symlinks or .env/.git entries |
| JavaScript | Nine inline/file syntax checks passed |
| Visual comparison | All 24 portrait variants inspected side by side; wardrobe tailoring differences documented. Bedroom and fish inspected for story implications |

`tests/continuity-contract.mjs` and `tests/demo-ui-contract.mjs` use Node built-ins only. `tests/renderer-contract.mjs` requires optional @napi-rs/canvas; `tests/validate-package.py` requires Pillow. Inspect tests before running them. None is a production game test or a required runtime dependency for the static assets.

The cutscene demo has no networking, save writes, canonical effects or real activity launch. It follows the v0.7 school excerpt and stops at the handoff boundary. Revision checks in this disposable demo do not implement or replace production transaction/replay guarantees.

The original graphics v1 padding correction is retained: source cells were expanded from 64 to 96 pixels with a translated anchor, preserving drawing geometry and body scale. Canvas rasterization can differ at antialiased edges between viewport sizes; identical pixel values across browsers are not claimed. Original PNG preservation is separately verified by byte comparison.

## Not run / unresolved

- Actual GitHub source/build/PR inspection, production story integration, saves, imports, rewards or multi-tab transactions.
- Real browser rendering, layout, Safari/Chrome event delivery, memory/FPS measurement or physical iPhone play.
- Owner approval of every new image, complete kit normalization, scene-specific background variants, named NPC gameplay sprites, full directional/expression sets or a dedicated Block pose.
- Cloudflare build/deployment or merge verification.

See `CONTINUITY_AUDIT.md` for findings and `ART_GAPS_AND_CAPABILITIES.md` for missing art. Successful package checks do not establish production readiness or eliminate all possible exploits. A checksum detects accidental changes; it is not an authenticity signature.

Final ZIP packaging validates relative member paths, regular files, SHA-256 file inventory and archive CRC integrity before saving.
