# Devin implementation instructions — training library 1.1

## Owner handoff

Upload this ZIP to Devin in the SoccerMaster-Retro project. Paste the contents of `DEVIN_PROMPT.txt` into the task. No manual extraction or code entry is required from the owner.

## Coaching review gate

Read `01_COACHING_REVIEW.md` first. The coaching review found unresolved instructional gaps. This ZIP is a reviewed draft handoff, not a finalized coaching curriculum. Resolve those findings before final demo production or player release.

## Read order and authority

1. Read these instructions, then the complete `SoccerMaster_Training_Library_v1.md`. Its internal content revision is **1.1.0**, despite the retained v1 filename.
2. The complete document is the specification; its embedded manifest is the authoritative content. The files in `reference/` are extracted convenience copies. Do not maintain divergent copies.
3. `reference/training_recheck_results.json` records offline reference tests only. It is not evidence of app integration, coaching approval, video inspection or correct animation.
4. This handoff adds implementation instructions, not new curriculum or approval. If a conflict is discovered, report it rather than silently weakening the specification.

## Execute in this order

1. Inspect only `codyengilman-max/SoccerMaster-Retro`. Read repository instructions; record main commit, open gameplay PR/branch, architecture, current training implementation, economy, save schema and required checks. Do not modify the concurrent gameplay revision.
2. Create an isolated training branch from the appropriate verified base. Document dependencies on unmerged gameplay work; avoid copying or merging that work without review. Preserve TypeScript/Vite/Phaser and existing saves.
3. Commit the unchanged supplied specification and offline reference material under a suitable docs/spec directory. Keep synthetic approval fixtures out of runtime production assets.
4. From the extracted ZIP root run:

   ```sh
   cd reference
   python3 test_training_reference.py
   ```

   Python 3 standard library only. Expected reference result: 63 passed, 0 failed. Investigate any difference; do not edit assertions merely to pass. Tests rewrite their local result JSON.
5. Port the validated schema/import rules, eligibility and substitution checks, trusted review boundary, plan identity and journal transaction behavior into the existing TypeScript systems. The Python implementation is a reference, not an app runtime dependency. Use actual browser transactions for cross-tab claims.
6. Inspect proposal P-001 against the existing economy before changing rewards. Do not silently remove established upgrades or player progress. If incompatible, document the precise decision needed and continue compatible work with the conflicting path disabled.
7. Build draft review cards, equipment/space selection, explicit no-eligible-activity states and the six specified demo prototypes: BM01, DR01, TR01, PA02, JU01 and FI01. Implement accessible pause/replay/slow playback and both-side labels. Original assets must match the selected variant's instructions.
8. Leave all content draft until real evidence, qualified coaching review, asset rights/provenance and rendered-demo QA satisfy the specification. Never fabricate reviewers or promote synthetic test approvals. Review prototypes must not grant career rewards. A missing approval blocks player publication, not development of the review interface.
9. Run repository checks and the actual application adversarial tests listed in the specification: cross-tab claims, interrupted writes, migration/restore, content and capability changes, revoked/altered demos, hostile imports, empty states, network behavior, accessibility and existing game regressions. Run `npm run build`; Cloudflare output remains `dist`.
10. Open a focused PR and provide a branch preview where access permits. Do not merge to main or deploy production. Report access blockers honestly; never substitute a production deployment for a preview.

## Required delivery to owner

- PR URL, source branch, base commit and exact tested commit.
- Preview URL and steps to open the training review area on an iPhone.
- Implemented requirements mapped to tests and files; unresolved requirements explicitly marked.
- Fresh test outputs, build result and exact browser/device environments. Emulated iPhone is not physical hardware verification.
- Screenshots or recordings of review cards and six prototypes, plus sample empty/error states.
- Save/economy compatibility decision and any migration evidence.
- Remaining research, coaching, demo and asset-rights approvals; no claim that all 100 variations are player-ready.
- A short iPhone checklist: readable text, clear contact and foot labels, pause/replay, safe navigation, no draft recommendations or rewards, existing saves and match flow intact.

## Packaging verification

The source document was preserved byte-for-byte. Four embedded files were extracted; all 63 offline tests were rerun successfully on 15 October 2026. `SHA256SUMS.txt` covers the packaged files except itself. ZIP integrity is checked during packaging. These checks do not certify the live game or physical exercise demonstrations.
