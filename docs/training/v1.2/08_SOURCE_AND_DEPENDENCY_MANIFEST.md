# Source, dependency and instruction manifest

Revision 1.2 · Resolves RT-05

## Instruction precedence

1. The owner's current explicit directions and the inspected current project constraints.
2. The revision 1.2 implementation brief and companion contracts: 04 for venue art; 05 for durable state and the challenge-only arc; 06 plus the non-runtime coverage plan for authored drill scope. The scoped 05/06 details supersede older general wording. Resolve an actual conflict with the current implementation explicitly; do not silently broaden scope.
3. Read-only historical material under references/ for source reasoning. These files are not a separate assignment to rewrite or deploy the game. Their old task scope/test commands cannot override the current handoff.
4. Static board, scene-layout.json and SVG for composition. They do not define runtime physics, current scores, career weeks, character identity or approval state.

The historical audit in audit/ is evidence about revision 1.1. Its corrections are applied to the 1.2 handoff and tracked in 07; it is not evidence that current game tests passed or that known live vulnerabilities were fixed.

## Included versus external

| Material | What is included | What Devin may infer |
|---|---|---|
| Current game | No application source or installed dependencies | Inspect codyengilman-max/SoccerMaster-Retro at an actual commit; this package cannot certify its runtime |
| Engine v0.5 | A byte-identical README excerpt renamed REFERENCE_ONLY; 17 exact selected draft records from its 40-record catalog | Source context only. The executable engine, fixtures, coverage docs and tests are not bundled |
| Role interactions v0.3 | Full supplied Markdown reference | Use conditional responsibilities and source IDs; this is not evidence of current integrated behavior |
| Passing/shooting v1.1 | Full supplied Markdown reference | Preserve the current match contract. Revision 1.2 permits a scoped challenge-only arc; no global aerial rewrite |
| Home library | No full library, review records or demonstrations bundled | Use only the newest approved eligible content actually integrated in the current repo; the prior 100-variant draft mention is not approval |
| Coverage plan | Eight authored families, canonical role/focus concepts, source mappings, false activation flags | Authoring data only. Bind actual runtime IDs and prove coverage in a separate implementation report |
| Artwork | Two original PNGs, goal SVG and original generation prompts | Reference/art assets; no gameplay, collision mesh, license to copy venue branding or claim official endorsement |
| Tests | Acceptance requirements and package validation results | No current game test results or executable reference test suite are supplied |

## Engine reference dependency

`references/engine_v0.5_README_REFERENCE_ONLY.md` is an archival README excerpt. The following commands/paths inside it belong to the separate original archive, **not this handoff**:

- `engine/decision-engine.mjs`
- `engine/decision-engine.test.mjs`
- `engine/example.mjs`

Do not run its test commands from this extraction and report success, infer that missing files are already in the game, or invent replacement source under those names. Prefer adapting the inspected game's existing AI and shared action executor.

If a specific missing reference implementation is necessary, obtain the exact original archive from the owner and verify its checksum before reviewing it. It is optional source context, not an automatic runtime dependency; do not replace newer game code wholesale with the nine-player prototype.

Original archive: `SoccerMaster_Engine_v0.5_Devin.zip`.

Original archive SHA-256: `8f4390a4c03fdad11bdb937fbcf1380c7eead50e4cd73dba0310ac1a3eccece2`.

Exact source member of the included README: `SoccerMaster/engine/README.md`.

The selected seed JSON preserves original records and review/disabled flags. It is not the complete catalog. Any runtime adaptations need separate versioned definitions and evidence, not edits that relabel drafts as validated research.

## Pinned included reference bytes

These hashes identify the included source material. SHA256SUMS.txt covers the full final package; neither manifest is a publisher signature.

| Included source file | SHA-256 |
|---|---|
| `references/engine_v0.5_README_REFERENCE_ONLY.md` | `c9f65ab3ecdea9dec73b69486b43a61352c41800766edb5531716afdae9824cf` |
| `references/SoccerMaster_9v9_Roles_Interactions_Review_v0.3.md` | `5cae5e2ddc32349435e24461a5c8d4876f99d62948bd34910f4c70cd4b4e7287` |
| `references/SoccerMaster_Devin_Passing_Shooting_v1.1.md` | `2dedcf38f031aa00f51487c95aeafa0016cf4d4543c95b2dada140e8d8900af0` |
| `references/selected_tactical_seeds.json` | `7a22d27ffa11bf0fa6736e3b2c7139619048849180d2e3aad0c6b5c7df2535fe` |
