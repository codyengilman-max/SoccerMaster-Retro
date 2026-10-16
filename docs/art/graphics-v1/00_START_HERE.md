# SoccerMaster — approved graphics handoff v1.1 — continuity-audited
15 October 2026 • target: codyengilman-max/SoccerMaster-Retro

This is an art-and-rendering package for the existing Phaser / TypeScript / Vite browser game. It is not a new game, Unity project, story-engine replacement, or proof of production integration.

## What the owner approved
The gameplay look and the flat pixel-art cutscene look from the Sprite Lab were explicitly approved on 15 October 2026. The original five PNGs and gameplay drawing geometry are preserved. The preview dialogue and labels were corrected against the current story. Their checksums identify the approved source bytes. New cast portraits, wardrobe variants and backgrounds extend that style; their individual designs have not received separate owner acceptance.

## Use this package
1. Read `DEVIN_PROMPT.txt`, `docs/SOURCE_PRECEDENCE.md`, `docs/CONTINUITY_AUDIT.md`, `docs/STYLE_LOCK.md` and `docs/INTEGRATION.md`.
2. Inspect `assets/asset-manifest.json`, `assets/character-continuity.json`, `assets/scene-visual-map.json` and `assets/wardrobe-map.json`.
3. Open `ART_REVIEW.html` for the character/wardrobe gallery. It works locally with the extracted assets. Open `preview/index.html` for the scripted gameplay reference and `preview/cutscene.html` for the school conversation.
4. For the optional module-based sprite exporter, serve this folder with a local static server, for example `python3 -m http.server 8080`, then open `/code/atlas-exporter.html`. No dependency install is needed. Inspect supplied code before executing.
5. Integrate with current repository modules in small, verifiable steps. The corrected school demo uses the v0.7 excerpt with no effects or real activity launch; it must not overwrite production story services.

The package supplies a baseline neutral-expression portrait per documented character/outfit, four cutscene backgrounds, source rendering code, 19 exported gameplay appearance sheets and explicit location mappings. The 96x96 export frames include padding for rotated poses; read code/README.md before integration. It does not supply speaking mouths, facial expression sets, full-body animation sheets or every possible future scene. See the inventory and missing-capability report rather than claiming those are done.

## Upload options
Attach the ZIP if your Devin surface accepts it. If it does not, extract it in Files, upload the contents to a new `docs/art/graphics-v1` folder on a task branch of the existing repo, and give Devin that folder path plus the short prompt. Do not paste binary/base64 image data into chat. Keep folder paths intact. The live reference site is owner-private and may not be accessible to Devin; all needed reference files are included here.

This package does not change live gameplay, saves, team results, controls, progression, leagues or tactical learning content. Existing story definitions and gameplay ownership remain authoritative outside this visual design scope.

## Verification record
Read `docs/VALIDATION_REPORT.md` for completed checks, the clipping fix and remaining review/device tests. `SHA256SUMS.txt` covers every other file in this package.

## Continuity audit correction
This revision removes the obsolete no-button/gesture instruction, keeps player and Alex identities separate, adds an explicit 18-scene map, and fixes the disposable cutscene demo. Read `docs/ART_GAPS_AND_CAPABILITIES.md`: unresolved art coverage is not complete game implementation.
