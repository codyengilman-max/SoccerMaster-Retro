# Home Training curriculum v2 — agreed by the owner (2026-11)

Source of truth: `src/game/career/homeCurriculum.ts` (`HOME_CURRICULUM_VERSION = 2`, status `agreed`). Generated from it. Checkpoints: [CHECKPOINTS.md](CHECKPOINTS.md).

## Rules now in the code

- **No automatic pass.** A lesson passes only when the player reports meeting its approved checkpoint ("Player-reported completion"), after at least one logged practice of it, and only one new lesson a week per track. 33 checkpoints are approved (those with an existing lesson-specific target and a both-feet rule); the rest wait for owner targets and cannot be passed. Logged practice and watching the demo never pass.
- **Labels.** A checkpoint met at home will show as "Player-reported completion". Coach verification stays separate.
- **Assignment.** Each track assigns its first lesson not yet passed. A new story week never moves it on, and home training never blocks the story.
- **Duplicates.** Unresolved designs and proposed aliases stay out of the assigned sequence. Their IDs and records are kept, and no completion transfers between lessons.
- **Setup.** The game uses the setup saved when the player was created (small/medium space, indoors/outdoors, ball only or extra items, safe striking area). A lesson the setup can't support is deferred, never passed, along with the later levels of the same ladder.

## 18-week Ball Mastery core pathway (approved)

One assigned lesson per week, Phase 1 foundations first. All 18 fit a small indoor space with only a ball, so none is ever deferred. Juggling runs alongside as its own track (jg-1 first, then the ladder and the v1.1 aerial lessons by phase).

| Week | Unit | Lesson | Phase | Demo checked |
|---|---|---|---|---|
| 1 | Sole and inside contacts | bmd-055 · Sole taps | 1 | yes |
| 2 | Sole and inside contacts | v11-BM01-L1 · Inside-touch rhythm L1 | 1 | yes |
| 3 | Sole and inside contacts | v11-BM03-L1 · Forward-back sole control L1 | 1 | yes |
| 4 | Sole and inside contacts | dr-inside · Inside Foundations | 1 | no (text only) |
| 5 | First touch | ft-soft-landing · Soft Landing | 1 | no (text only) |
| 6 | First touch | ft-roll-collect · Roll and Collect | 1 | no (text only) |
| 7 | Passing | ps-wide-gate · Wide Gate | 1 | no (text only) |
| 8 | Passing | v11-PA01-L1 · Ground target pass L1 | 1 | no (text only) |
| 9 | Outside and inside-outside dribbling | dr-outside · Outside Foundations | 1 | no (text only) |
| 10 | Outside and inside-outside dribbling | v11-DR01-L1 · Inside-outside lane L1 | 1 | no (text only) |
| 11 | Turns and cuts | v11-TR01-L1 · Pull-back turn L1 | 1 | yes |
| 12 | Turns and cuts | dr-inside-cut · Inside-Cut Escape | 2 | yes |
| 13 | Turns and cuts | v11-TR02-L1 · Outside cut L1 | 1 | no (text only) |
| 14 | Placement, defending stance, awareness | fn-ground-placement · Ground Placement | 1 | no (text only) |
| 15 | Placement, defending stance, awareness | df-balanced-set · Balanced Set | 1 | no (text only) |
| 16 | Placement, defending stance, awareness | aw-eyes-up · Eyes-Up Carry | 1 | no (text only) |
| 17 | Linking it together | v11-CO01-L1 · Choose your combination L1 | 1 | yes |
| 18 | Linking it together | ft-side-door · Side Door | 2 | no (text only) |

**Review (proposed):** each week the card also names one earlier lesson the player has passed, taking them in turn. Nothing has passed yet, so no review shows.

**Pace (proposed, not built yet):** at most one new lesson a week. Passing early leaves the rest of the week for review.

## Duplicate decisions (approved)

The "14" I reported earlier counted lessons. They form **13 pairs across 7 designs**, each compared on contact surface, foot action, ball path, body movement and exit.

| Design | Compared with | Proposed decision | Curriculum effect | Why |
|---|---|---|---|---|
| bmd-003 Outside cut | dr-outside-cut Outside-Cut Escape | unresolved | design held out until reviewed; existing lesson stays | Same surface, cut and exit, but the package says the turn angle and body rotation are not specified yet. |
| bmd-003 Outside cut | v11-TR02 Outside cut ladder | unresolved | design held out until reviewed; existing lesson stays | Same as above: the design motion is not specified, so it cannot be compared yet. |
| bmd-012 Hook / Cruyff turn | dr-cruyff Cruyff-Turn Foundation | unresolved | design held out until reviewed; existing lesson stays | Both guide the ball behind the support leg with the inside, but the design has no fake and exits with the other foot; Hook vs Cruyff naming is unconfirmed. |
| bmd-012 Hook / Cruyff turn | v11-TR03 Cruyff foundation ladder | unresolved | design held out until reviewed; existing lesson stays | TR03 rehearses a fake kick; the hook has none. Naming is unconfirmed. |
| bmd-017 Sole stop / start | dr-stop-start Stop–Start | variation | teach dr-stop-start first, the design later | Same sole stop; the design adds a released pause sold by the body and an outside-foot restart (still a proposal). |
| bmd-017 Sole stop / start | v11-DR03 Stop, look, restart ladder | variation | teach dr-stop-start first, the design later | DR03 adds a look for the route; the design adds the body sell and outside exit. |
| bmd-053 V pull and exit | dr-pullback Pullback and Go | variation | teach dr-pullback first, the design later | Same sole pull; the design exits diagonally with the same foot's inside (V), the pullback turns and goes. |
| bmd-053 V pull and exit | v11-TR01 Pull-back turn ladder | variation | teach v11-TR01-L1 first, the design later | TR01 draws back, releases and turns; the design adds the diagonal inside exit. |
| bmd-071 Lateral sole roll | v11-BM02 Lateral sole roll ladder | same | alias of v11-BM02-L1; design held out, its ID and records kept | Same sole, same roll across the body, same lateral path, settle with no exit. |
| bmd-071 Lateral sole roll | dr-sole Sole Explorer | variation | teach v11-BM02-L1 first, the design later | Sole Explorer also rolls forward and back and swaps feet. |
| bmd-056 Inside-foot shuffles | v11-BM01 Inside-touch rhythm ladder | same | alias of v11-BM01-L2; design held out, its ID and records kept | Same inside-edge transfers between the feet on the spot, alternating, with a reset. |
| bmd-056 Inside-foot shuffles | dr-inside Inside Foundations | variation | teach v11-BM01-L2 first, the design later | Inside Foundations travels forward; the shuffles stay on the spot. |
| bmd-029 Side step | dr-body-feint Body Feint Exit | unresolved | design held out until reviewed; existing lesson stays | Side step vs shoulder dip is unconfirmed, and the design's outside-foot exit is an original proposal. |

**Aliases:** no completion moves between alias and entry until you confirm each "same".

## Space and equipment (approved)

With the minimum setup, 55 Ball Mastery lessons are deferred. The full list of setup-restricted lessons:

| Lesson | Needs | Proposed safe alternative |
|---|---|---|
| v11-RC01-L1 · Receive into an exit lane L1 | a rebound wall (data says ball only) | ft-soft-landing (Soft Landing): candidate, needs coach approval |
| v11-PA02-L1 · Two-touch wall rhythm L1 | a rebound wall (data says ball only) | ps-wide-gate (Wide Gate): candidate, needs coach approval |
| v11-FI01-L1 · Placed finish foundation L1 | Needs a safe striking area | fn-ground-placement (Ground Placement): candidate, needs coach approval |
| v11-RC02-L1 · Receive, roll, pass L1 | a rebound wall (data says ball only) | ft-soft-landing (Soft Landing): candidate, needs coach approval |
| v11-PA03-L1 · One-touch wall return L1 | a rebound wall (data says ball only) | ps-wide-gate (Wide Gate): candidate, needs coach approval |
| v11-FI02-L1 · Controlled laces contact L1 | Needs a safe striking area | fn-ground-placement (Ground Placement): candidate, needs coach approval |
| fn-roll-strike · Roll and Strike | Needs a safe striking area | None in the library: defer |
| v11-FI01-L2 · Placed finish foundation L2 | Needs a safe striking area | fn-other-foot (Other-Foot Contact): candidate, needs coach approval |
| v11-RC01-L2 · Receive into an exit lane L2 | a rebound wall (data says ball only) | ft-bounce-settle (Bounce and Settle): candidate, needs coach approval |
| v11-PA02-L2 · Two-touch wall rhythm L2 | a rebound wall (data says ball only) | ps-two-foot (Two-Foot Targets): candidate, needs coach approval |
| v11-FI02-L2 · Controlled laces contact L2 | Needs a safe striking area | fn-other-foot (Other-Foot Contact): candidate, needs coach approval |
| v11-RC02-L2 · Receive, roll, pass L2 | a rebound wall (data says ball only) | ft-bounce-settle (Bounce and Settle): candidate, needs coach approval |
| v11-PA03-L2 · One-touch wall return L2 | a rebound wall (data says ball only) | ps-two-foot (Two-Foot Targets): candidate, needs coach approval |
| ps-near-far · Near–Far | Needs medium space | ps-parking-zone (Parking Zone): candidate, needs coach approval |
| fn-set-strike · Set and Strike | Needs a safe striking area | None in the library: defer |
| fn-angle-finder · Angle Finder | Needs a safe striking area | None in the library: defer |
| df-turn-recover · Turn and Recover | Needs medium space | None in the library: defer |
| ps-moving-ball · Moving Ball | Needs medium space | ps-pass-reposition (Pass and Reposition): candidate, needs coach approval |
| fn-dribble-finish · Dribble to Finish | Needs a safe striking area; Needs medium space | None in the library: defer |
| df-recover-inside · Recover Inside | Needs medium space | None in the library: defer |
| v11-FI01-L3 · Placed finish foundation L3 | Needs a safe striking area | fn-other-foot (Other-Foot Contact): candidate, needs coach approval |
| v11-RC01-L3 · Receive into an exit lane L3 | a rebound wall (data says ball only) | ft-bounce-settle (Bounce and Settle): candidate, needs coach approval |
| v11-FI02-L3 · Controlled laces contact L3 | Needs a safe striking area | fn-other-foot (Other-Foot Contact): candidate, needs coach approval |
| v11-RC02-L3 · Receive, roll, pass L3 | a rebound wall (data says ball only) | ft-bounce-settle (Bounce and Settle): candidate, needs coach approval |
| v11-PA02-L3 · Two-touch wall rhythm L3 | a rebound wall (data says ball only) | ps-diagonal (Diagonal Delivery): candidate, needs coach approval |
| v11-PA03-L3 · One-touch wall return L3 | a rebound wall (data says ball only) | ps-diagonal (Diagonal Delivery): candidate, needs coach approval |
| fn-turn-finish · Turn to Finish | Needs a safe striking area | None in the library: defer |
| df-called-side · Called Recovery Side | Needs medium space | None in the library: defer |
| ft-moving-reception · Moving Reception | Needs medium space | ft-set-for-pass (Set for the Pass): candidate, needs coach approval |
| fn-across-body · Across-Body Setup | Needs a safe striking area | None in the library: defer |
| df-recovery-distribution · Recovery to Distribution | Needs medium space | df-collect-escape (Collect and Escape): candidate, needs coach approval |
| ps-channel · Through the Channel | Needs medium space | ps-called-target (Called Target): candidate, needs coach approval |
| fn-change-pace · Change-Pace Finish | Needs a safe striking area; Needs medium space | None in the library: defer |
| v11-RC01-L4 · Receive into an exit lane L4 | a rebound wall (data says ball only) | ft-air-to-ground (Air to Ground): candidate, needs coach approval |
| ps-distance-mixer · Distance Mixer | Needs medium space | ps-parking-zone (Parking Zone): candidate, needs coach approval |
| v11-FI01-L4 · Placed finish foundation L4 | Needs a safe striking area | fn-called-corner (Called Corner): candidate, needs coach approval |
| v11-RC02-L4 · Receive, roll, pass L4 | a rebound wall (data says ball only) | ft-air-to-ground (Air to Ground): candidate, needs coach approval |
| v11-FI02-L4 · Controlled laces contact L4 | Needs a safe striking area | fn-called-corner (Called Corner): candidate, needs coach approval |
| v11-PA02-L4 · Two-touch wall rhythm L4 | a rebound wall (data says ball only) | ps-called-target (Called Target): candidate, needs coach approval |
| v11-PA03-L4 · One-touch wall return L4 | a rebound wall (data says ball only) | ps-called-target (Called Target): candidate, needs coach approval |
| fn-rebound · Rebound Finish | Needs a safe striking area | None in the library: defer |
| df-mixed-course · Mixed Recovery Course | Needs medium space | None in the library: defer |
| aw-clear-route · Find the Clear Route | Needs medium space | aw-scan-turn-pass (Scan–Turn–Pass): candidate, needs coach approval |
| v11-RC01-L5 · Receive into an exit lane L5 | a rebound wall (data says ball only) | ft-air-to-ground (Air to Ground): candidate, needs coach approval |
| dr-creative-route · Creative Route | Needs medium space | dr-stop-start (Stop–Start): candidate, needs coach approval |
| ps-circuit · Passing Circuit | Needs medium space | ps-turn-deliver (Turn and Deliver): candidate, needs coach approval |
| fn-mixed-approach · Mixed-Approach Finishing | Needs a safe striking area | None in the library: defer |
| df-regain-circuit · Regain-to-Play Circuit | Needs medium space | df-collect-escape (Collect and Escape): candidate, needs coach approval |
| v11-RC02-L5 · Receive, roll, pass L5 | a rebound wall (data says ball only) | ft-air-to-ground (Air to Ground): candidate, needs coach approval |
| v11-PA02-L5 · Two-touch wall rhythm L5 | a rebound wall (data says ball only) | v11-PA01-L5 (Ground target pass L5): candidate, needs coach approval |
| v11-FI01-L5 · Placed finish foundation L5 | Needs a safe striking area | fn-circuit (Placement Circuit): candidate, needs coach approval |
| v11-PA03-L5 · One-touch wall return L5 | a rebound wall (data says ball only) | v11-PA01-L5 (Ground target pass L5): candidate, needs coach approval |
| v11-FI02-L5 · Controlled laces contact L5 | Needs a safe striking area | fn-circuit (Placement Circuit): candidate, needs coach approval |

Until you approve an alternative, the lesson is deferred and the next suitable lesson is assigned. A deferred lesson is never passed, and missing equipment never costs anything.

## Built after approval

- `lessonsViewed` and `checkpoints` save fields (older saves load with both empty; nothing inferred).
- "I met the checkpoint" on the assigned lesson once it has a logged practice; saved as player-reported completion. Coach verification stays separate.
- One new lesson a week per track; the rest of the week is review.
- "Practice setup" on every curriculum lesson opens the saved setup.

## Blocked on owner targets

The pathway is sequential, so a lesson without an approved checkpoint holds its track. Ball Mastery core weeks without one: 1–4, 8, 10–17 (approved: 5, 6, 7, 9, 18). Juggling: jg-1 and jg-2 are approved; v11-JU01-L1 (lesson 3) is not. See CHECKPOINTS.md.
