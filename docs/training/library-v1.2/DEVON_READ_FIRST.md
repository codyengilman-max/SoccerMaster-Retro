# Devon — import v1.2, not v1.1

Read AUDIT.md, then LIBRARY.md, SOURCES.md and scenarios.json. This ZIP contains 48 corrected OUTfield tactical briefs and an offline structural linter, not a playable game build. There are 15 sources, including two added 9v9-specific references.

## Required changes

1. Replace the active proposed v1.1 definitions with v1.2, retaining IDs and history. Retire GK01–GK03 from selection. Do not alter completed player saves without a reviewed migration. There are no goalkeeper decision sessions.
2. Both teams use 1-3-2-3 in these cards: GK + LB/CB/RB + DM/CM + LW/RW/ST. Eight outfield slots only. Never add the protagonist, a neutral or source exercise player as an extra slot.
3. Use each card's named actor bindings and coordination, not generic adult 11v11 formations. Partial overhead views are allowed. Show all tactically influential actors; do not force all 18 to appear or constrain all scenes to half a field.
4. Keep the source formats distinct. Never copy neutral players, four-back lines, protected wide areas, altered offside lines or exercise scoring. Older 11v11 analyses are principle context only.
5. Author numeric scenes with explicit units, time, ball/actor state and local rules. The proposed 75x50 field is in YARDS, not metres; do not silently resize existing gameplay. Geometry is null until reviewed.
6. Keep all cards in developer/coach review preview until the human project owner approves the adapted scene and runtime checks pass. This package's structural pass does not grant production approval. Show approval requests with source sections, adaptation changes, scene diagram and conditional answer branches.
7. Team Training has Sessions A/B/C only. Remove free-play Team Training entry and normal gameplay instructions. Observe → choose → scripted consequence → Coach Code critique. No gameplay-time requirement, live-match controls or source drill minigame.
8. Run python3 validate_library.py from this folder for offline structural lint. No dependencies/network needed. This does NOT run the game's tests or validate soccer physics. Implement the runtime acceptance tests in AUDIT.md in the real project.
9. Pin each approved content/rules/scene version and invalidate approval on change. Do not automatically fill missing library content with generated situations.
10. Return an implementation report listing approved, draft and blocked cards separately. Never claim all audit findings are production-fixed when runtime checks remain open.

## Presentation retained

Use the supplied individual player sheets and previously supplied boy/girl protagonist sheets if present in the project; no sprite files are bundled here. Boy and girl are alternatives in ONE existing slot. Preserve face/hairstyle identity throughout a session.

Home outfield players wear orange; opponents bright green pinnies over orange. Keep a thin, subtle gold outline on the selected protagonist regardless of possession or selected answer. Preserve the artwork's existing outline; do not double-outline, flash or transfer it.

Target visible character height: 1.2075 times ORIGINAL baseline. If 1.15 is already applied, add only 1.05. Preserve proportions and foot anchors. Inspect generated six-column/four-row source sheets (run, pass, receive, defensive shuffle) before slicing; verify ordering, clipping and contact frames. Keep ball separate. Validate both protagonists and portrait/landscape.

## Handoff boundaries

No changes have been made to the game repository, deployment, source art or player saves by this package. No coach-certified label is authorized. The scene cards contain conditional real-football principles but are authored adaptations, not exact reproductions of source footage. A full two-season 108-session assignment remains a separate curriculum task.

