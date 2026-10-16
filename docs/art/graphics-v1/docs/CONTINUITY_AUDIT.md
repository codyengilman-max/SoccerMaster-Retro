# SoccerMaster graphics — continuity and exploit audit

**Revision 1.1 • 15 October 2026, America/Phoenix**

**Verdict:** the approved visual direction is coherent, and the supplied portrait identities remain recognizable across outfits. The original handoff contained conflicting controls instructions and a noncanonical school demo. Those code/instruction problems are corrected. The package is ready for a focused integration review; it is not proof that every story location, character animation or production requirement is finished.

This is an internal review of the supplied package. No independent security certification, live repository audit or physical iPhone playtest is claimed.

## Sources and limits

Reviewed the current complete `SoccerMaster_Devin_Plain_Text_Review_v0.7.txt` (Library version 4), especially its v0.7 corrections and 18-scene executable graph; the newer `SoccerMaster_Devin_Controls_SOW_v1.0.md`; the user's latest approved gameplay/cutscene look; all package code/manifests; all 24 portrait variants side by side; and the bedroom/fish illustrations directly. Current source versions are recorded in `docs/reference/source-index.json`.

Earlier Unity projects, older character treatments and superseded no-button controls were not imported as current requirements. The current GitHub repository, its save system and Cloudflare deployment were not available for inspection in this audit.

## Findings and disposition

| ID | Severity | Finding | Correction / remaining work |
| --- | --- | --- | --- |
| C01 | High | Graphics prompt preserved gesture passing/shooting and feints after the newer four-button control decision. | **Fixed instructions:** source precedence and prompt now recognize joystick + PASS, SHOOT, SLIDE TACKLE, BLOCK; no sprint. Pending control migration is a separate dependency; graphics must not install an obsolete path. |
| C02 | Medium | Demo forced “Alex” as player default, inviting confusion with teammate Alex. | **Fixed:** blank name entry; explicit player/visual/NPC IDs. A player may still legitimately choose Alex or Jordan without merging identities or speaker roles. |
| C03 | High | Jordan knew the chosen name before introduction, and demo dialogue/choices diverged from the current canonical school graph. | **Fixed demo:** exact v0.7 school excerpt and branch IDs; name appears in Jordan's dialogue only after Introduce. Original snippets no longer compete with the story graph. |
| C04 | High | A broad location list could be interpreted as cast attendance; no exact scene map was supplied. | **Fixed reference mapping:** all 18 current story scene IDs mapped. Training arrival uses player, Coach Code and Alex. Sam/Riley are not inserted into week one. System panels do not teleport characters; activity handoffs do not fabricate play/results. Actual repository coverage still requires a diff. |
| C05 | Medium | Name handling silently stripped controls and truncated UTF-16 code units at a different length than the story contract. | **Fixed demo:** NFC normalization, 1–24 graphemes, scalar/byte/raw-input bounds, malformed-Unicode/control/template rejection, plain-text rendering. Unsupported segmentation produces recovery, not a fake fallback. Production must reuse its own validated identity service. |
| C06 | Medium | A stale handler or reused input could advance the disposable demo; trying alternate replies mixed branches in one transcript. | **Fixed demo:** revision-checked transitions, fresh button input ownership, cancellation on lifecycle changes, no repeated choice, and a new run clears history. The model cannot launch an activity or write story effects. Real atomic persistence remains an integration test requirement. |
| C07 | Medium | Small-landscape dialogue buttons fell to 36 CSS pixels and lengthy choices lacked explicit scroll space. | **Corrected CSS:** minimum 44px dialogue actions, scrollable dialogue/setup, safe-area padding. Actual small-screen layout and Safari interaction remain untested. |
| C08 | High integration risk | Generic roster sheets do not identify Alex, Sam, Blake or Riley and use one example skin tone/numbers. | **Containment added; art work remains:** identity registry marks missing named-gameplay representations explicitly. Only protagonist references are bound. Never assign random roster slots as completed named characters. |
| C09 | Medium | Demo kit palettes could imply unapproved club affiliations; collar/cuff/shorts trim varies within palette groups. | **Mapping fixed; visual refinement remains:** membership must come from canonical event data, not palette. Fixed wardrobe per scene, transfer/history rules and kit-review flags added. Normalize actual team kits after binding. |
| C10 | Medium | Bedroom shows an unexplained trophy, no moving boxes and strongly sunset-specific light. A courtyard is not an indoor corridor. | **Flagged, not repainted:** explicit background review flags and scene gaps. Do not interpret the trophy as an earned achievement or use the image indiscriminately for every time/location. A matching arrival/corridor variant is still needed where the authored scene requires it. |
| C11 | Medium | A static fish with a baked pellet could be mistaken for playable Tank Cup art; there is no dedicated Block pose or expression set. | **Capability boundary made explicit:** no fake physics/animation claim. Fish remains a private imagined confidant. Separate mini-game assets, Block pose and required expressions remain art tasks. |
| C12 | Medium | Full master loading would be expensive on phones; old validation could be mistaken for current integrated evidence. | **Handoff corrected:** bounded scene/roster loading, explicit decoded-memory arithmetic, current test scope and pending browser/device gates. No FPS, memory or security guarantee from these checks. |

Severity describes likely integration impact. It does not assert an exploitable production vulnerability where production code was not inspected. “Containment” prevents a misleading handoff; it does not mean missing artwork has been created.

## Character and story continuity

- The selectable protagonist is the newcomer to Scottsdale, loves soccer and is unsure of their ability. The boy's dark hair and girl's light hair remain consistent across the four supplied outfits. The choice affects presentation, not ability or opportunity.
- Alex remains competitive but not automatically hostile. Sam remains independent and humorous. Jordan remains a school friend, not an invented teammate. Blake and Riley have separate roles; working names and proposed affiliations are not live membership facts.
- Coach Code remains demanding and kind. The caregiver's quiet presence is not proof of neglect; one portrait does not establish both parents. The clownfish cannot know private school or match facts without the player's imagined narration/disclosure.
- Every relationship interaction stays in a cutscene. Emotions, homework, outfits and fish/schoolyard activities do not award soccer stats or secretly modify controls, difficulty, growth or selection.
- No first-week romance, gender-based attraction rule, guaranteed win, fabricated tournament trip or automatic club transfer was introduced. The current story graph still owns knowledge, adverse-scene limits, commitments, focus and week closure.
- All 24 portraits were compared. Faces/hair remain recognizable across each character's variants; the observed differences are mainly kit tailoring. The same-face result is a visual inspection, not biometric proof or owner acceptance of new designs.

## Recheck evidence

- `continuity-contract.mjs`: **1,230 assertions passed across 24 school-branch paths**, covering both protagonist choices, canonical lines/IDs, name knowledge, Unicode limits, forged/stale/duplicate inputs and transcript isolation.
- `demo-ui-contract.mjs`: **13 mocked DOM checks passed**, including input cancellation, extra pointers, held keys, stale buttons, resize/visibility, literal text rendering and image failure. This is not a real browser run.
- Existing renderer check: 1,680 pose combinations, unchanged drawing geometry apart from the existing padding, anchor/scale and clipping checks.
- Package check: 28 cutscene PNGs, 24 alpha portraits, ten visual identities, 19 gameplay sheets, wardrobe references and all 18 scene IDs. Original PNG hashes retained.
- JavaScript syntax and archive/path/checksum checks are recorded in `VALIDATION_REPORT.md` after the final packaging pass.

## Still required in Devin's actual game

Reconcile real module/character/scene IDs; map or create missing named sprites and art variants; preserve the current controls work; test real input-to-simulation and cutscene-to-match transitions; test authoritative atomic saves/replays and evidence checks; measure texture load and match performance; run a physical iPhone Safari/Chrome walkthrough. Record failures and unavailable devices instead of converting them into passes.

No image-generation redesign, production merge, credential change, external message or Cloudflare deployment was performed by this audit. The approved original five PNGs are preserved.
