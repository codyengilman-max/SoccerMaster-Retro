# Mom Replacement v2 (owner package, 2026-10-25)

Package kept unchanged in `assets/mom-v2/` (START_HERE_DEVIN.md, DEVIN_PROMPT.txt, manifest, 2 sheets, 12 portraits).
`scripts/art/build-mom-v2.py` puts each 512×512 portrait, unscaled and with its own alpha, at the bottom of a
transparent 512×768 canvas (the cutscene portrait slot is 2:3) and writes `src/assets/art/v1/mom2-<outfit>-<expression>.webp`.
The Season One manifest records each source PNG's SHA-256; the runtime manifest records each WebP.

## Replaced runtime portraits

| Old (retired, kept in Git history, `runtime: false`) | New |
|---|---|
| `mom-neutral` | `mom2-casual-neutral` |
| `mom-laughing` | `mom2-casual-laughing` |
| `mom-worried` | `mom2-casual-worried` |
| `mom-firm` | `mom2-casual-firm` |
| `mom-proud` | `mom2-casual-proud` |
| `mom-sad` | `mom2-casual-worried` (v2 has no "sad"; worried is the closest supplied expression) |
| `caregiver-home` (code-drawn fallback id) | `mom2-casual-neutral` |

New with no old equivalent: `mom2-casual-reassuring` and all six `mom2-dressy-*`.

## Outfit and expression
- Casual teal is the default. Burgundy (dressy) is used only for scenes listed in `MOM_DRESSY_SCENES`
  (`src/render/art/momPortraits.ts`). No Weeks 1–5 scene is a dressier occasion, so the list is empty and the dressy
  set is loaded and tested but not yet shown in the story.
- The outfit is chosen per scene, so it never changes inside a scene. The expression is chosen per Mom line from
  `MOM_BEATS` (keyed by node id; dialogue text is untouched). Unlisted lines fall back to neutral.
- Lines with a portrait: S1_W01_C (1), S1_W01_P (26), S1_W02_F (1), S1_W04_P (22), S1_W04_G (1).
  S1_PRO_DEPART and S1_PRO_ARRIVE paint Mom into the car, so they show no Mom portrait.

## Characters painted into the backdrop
`BACKDROP_EMBEDDED` in `src/render/art/catalog.ts` lists, per background and boy/girl variant, who is painted in:

| Background | Painted in |
|---|---|
| `departure-boy`, `departure-girl`, `arrival-boy`, `arrival-girl` | Mom, player |
| `s1-tank-boy`, `s1-tank-girl` | player, Cloudy |

Those characters are removed from the cast and never get a portrait, even while speaking (the code-drawn
fallback is suppressed too). Other characters still appear. Portraits show only on spoken lines: narration,
choices and hand-offs clear them, and a scene change rebuilds the cast so nothing carries over.

## Car backdrop framing

With no Mom portrait over the prologue car, `BACKDROP_FOCUS` now gives `departure-*` and `arrival-*` a focus box (`x 0.22–0.78`, `y 0.16–0.43`). It keeps Mom's painted face and the rear-seat player below the top bar and above the dialogue panel on every tested phone size, in both orientations. Before this change, the landscape crop cut off Mom's face; that problem was already in the old build. `tests/layout.test.ts` checks the box against each backdrop's real image size.

## Superseded in cutscenes by the standing Mom (2026-10-26)
The owner supplied three standing sheets (`assets/mom-v3/mom_sheet_{confident,worried,smiling}.png`, 1448×1086, byte-identical), each with the casual outfit on the left and the dressy one on the right. `scripts/art/build-mom-v3.py` cuts each figure out by alpha and writes `src/assets/art/v1/mom3-<outfit>-<face>.webp` (512×768). Every spoken Mom line now shows one of these (`momPortrait` in `src/render/art/momPortraits.ts`, beat → face via `MOM_FACE`); the 12 v2 busts above stay in the gallery only. See D54.
