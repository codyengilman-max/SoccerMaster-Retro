# Home Training curriculum v1 — PROPOSED for owner review

Source of truth: `src/game/career/homeCurriculum.ts` (`HOME_CURRICULUM_VERSION = 1`, status `proposed`). This table is generated from it.

Two sequential tracks, independent progress, no chooser. Home shows one card per track; Continue opens the assigned lesson.

- **Juggling:** 23 lessons (8 ladder + 15 v1.1 aerial control), Phases 1–5.
- **Ball Mastery:** 182 lessons (84 originals, 85 v1.1, 13 designs), Phases 1–5 (40 / 35 / 38 / 40 / 29).
- **Phase = the lesson's existing entry level.** Inside a Ball Mastery phase the six skills take turns (first touch, dribbling, passing, finishing, defending, awareness); originals come before v1.1 and designs.
- **Nothing invented, merged or dropped.** Every one of the 205 home lessons appears exactly once with its ID.

## Status the game keeps apart

| Status | Meaning |
|---|---|
| Practice reported | A Log practice marked done, or a logged score entry, for that lesson |
| Target met | The existing performance ladder phase was passed from logged scores (self-reported) |
| Lesson viewed | Not recorded yet (see missing items) |

Watching never completes a lesson. No new attribute rewards or penalties.

## Missing or unsettled criteria (need your decision)

1. **Practice count for 187 lessons:** they have no performance target. I used 1 reported practice as a placeholder. This proves practice, not mastery.
2. **Pacing:** 182 Ball Mastery lessons at 1 practice each is far longer than the 18-week season. Should some lessons be optional or grouped?
3. **Shared ladder targets:** jg-1/jg-2, jg-3/jg-4 and jg-5/jg-6 share one ladder phase target. Passing it plus one practice of each lesson completes both.
4. **14 disputed equivalences stay unresolved:** both lessons stay in the sequence, flagged "Possible duplicate".
5. **Setup needs:** 19 lessons need a safe striking area and 16 need medium space. The order doesn't skip them yet. Should a player without that setup skip or wait?
6. **Lesson viewed:** not saved yet. Adding it needs a save-field migration in the next step.
7. **Demos:** 12 lessons have a checked demonstration. The rest show Coach Code text only until their contact checks pass.

## Weekly story tasks (migrated)

The Week 5–7 "first touch" or "passing" task is now also met by the assigned Ball Mastery lesson logged as done that week, because there is no skill chooser anymore. Juggling and Home learning (3 practices) are unchanged. No task is ticked without a real log.

## Proposed sequence

| # | Phase | Lesson ID | Title | Skill | Advance | Demo | Flags |
|---|---|---|---|---|---|---|---|
| | | **JUGGLING** | | | | | |
| 1 | 1 | jg-1 | Ladder 1: One contact and catch | juggling | target: juggling ladder phase 1 + 1 practice | none (text only) | Shares its phase target with jg-2 |
| 2 | 1 | jg-2 | Ladder 2: Either foot | juggling | target: juggling ladder phase 1 + 1 practice | none (text only) | Shares its phase target with jg-1 |
| 3 | 1 | v11-JU01-L1 | Drop, touch, catch L1 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 4 | 1 | v11-JU02-L1 | Bounce juggling L1 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 5 | 1 | v11-JU03-L1 | Air touch to ground control L1 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 6 | 2 | jg-3 | Ladder 3: Contact, bounce, contact | juggling | target: juggling ladder phase 2 + 1 practice | none (text only) | Shares its phase target with jg-4 |
| 7 | 2 | jg-4 | Ladder 4: Two contacts and catch | juggling | target: juggling ladder phase 2 + 1 practice | none (text only) | Shares its phase target with jg-3 |
| 8 | 2 | v11-JU01-L2 | Drop, touch, catch L2 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 9 | 2 | v11-JU02-L2 | Bounce juggling L2 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 10 | 2 | v11-JU03-L2 | Air touch to ground control L2 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 11 | 3 | jg-5 | Ladder 5: Alternating feet | juggling | target: juggling ladder phase 3 + 1 practice | none (text only) | Shares its phase target with jg-6 |
| 12 | 3 | jg-6 | Ladder 6: Foot and thigh | juggling | target: juggling ladder phase 3 + 1 practice | none (text only) | Shares its phase target with jg-5 |
| 13 | 3 | v11-JU01-L3 | Drop, touch, catch L3 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 14 | 3 | v11-JU02-L3 | Bounce juggling L3 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 15 | 3 | v11-JU03-L3 | Air touch to ground control L3 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 16 | 4 | jg-7 | Ladder 7: Juggle, settle, dribble | juggling | target: juggling ladder phase 4 + 1 practice | none (text only) |  |
| 17 | 4 | v11-JU01-L4 | Drop, touch, catch L4 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 18 | 4 | v11-JU02-L4 | Bounce juggling L4 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 19 | 4 | v11-JU03-L4 | Air touch to ground control L4 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 20 | 5 | jg-8 | Ladder 8: Juggle, settle, pass | juggling | target: juggling ladder phase 5 + 1 practice | none (text only) |  |
| 21 | 5 | v11-JU01-L5 | Drop, touch, catch L5 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 22 | 5 | v11-JU02-L5 | Bounce juggling L5 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| 23 | 5 | v11-JU03-L5 | Air touch to ground control L5 | juggling | 1 practice (PROPOSED) | none (text only) |  |
| | | **BALL MASTERY** | | | | | |
| 1 | 1 | ft-soft-landing | Soft Landing | firstTouch | target: firstTouch ladder phase 1 + 1 practice | none (text only) |  |
| 2 | 1 | dr-inside | Inside Foundations | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of BM-056 (unresolved) |
| 3 | 1 | ps-wide-gate | Wide Gate | passing | target: passing ladder phase 1 + 1 practice | none (text only) |  |
| 4 | 1 | fn-ground-placement | Ground Placement | finishing | 1 practice (PROPOSED) | none (text only) |  |
| 5 | 1 | df-balanced-set | Balanced Set | defending | 1 practice (PROPOSED) | none (text only) |  |
| 6 | 1 | aw-eyes-up | Eyes-Up Carry | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 7 | 1 | ft-roll-collect | Roll and Collect | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 8 | 1 | dr-outside | Outside Foundations | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 9 | 1 | v11-PA01-L1 | Ground target pass L1 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 10 | 1 | fn-inside-accuracy | Inside-Foot Accuracy | finishing | 1 practice (PROPOSED) | none (text only) |  |
| 11 | 1 | v11-RC01-L1 | Receive into an exit lane L1 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 12 | 1 | dr-sole | Sole Explorer | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of BM-071 (unresolved) |
| 13 | 1 | v11-PA02-L1 | Two-touch wall rhythm L1 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 14 | 1 | v11-FI01-L1 | Placed finish foundation L1 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 15 | 1 | v11-RC02-L1 | Receive, roll, pass L1 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 16 | 1 | v11-BM01-L1 | Inside-touch rhythm L1 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 17 | 1 | v11-PA03-L1 | One-touch wall return L1 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 18 | 1 | v11-FI02-L1 | Controlled laces contact L1 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 19 | 1 | v11-BM02-L1 | Lateral sole roll L1 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 20 | 1 | v11-BM03-L1 | Forward-back sole control L1 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 21 | 1 | v11-DR01-L1 | Inside-outside lane L1 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 22 | 1 | v11-DR02-L1 | Gentle slalom L1 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 23 | 1 | v11-DR03-L1 | Stop, look, restart L1 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 24 | 1 | v11-TR01-L1 | Pull-back turn L1 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 25 | 1 | v11-TR02-L1 | Outside cut L1 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 26 | 1 | v11-TR03-L1 | Cruyff foundation L1 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 27 | 1 | v11-CO01-L1 | Choose your combination L1 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 28 | 1 | bmd-055 | Sole taps | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 29 | 1 | bmd-056 | Inside-foot shuffles | dribbling | 1 practice (PROPOSED) | side view, checked | Possible duplicate of dr-inside (unresolved: Inside Foundations travels forward; shuffles are on the spot. Similar, not confirmed.) |
| 30 | 1 | bmd-071 | Lateral sole roll | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of dr-sole (unresolved: The package marks the lateral sole roll mapping for review; Sole Explorer also rolls forward and back.) |
| 31 | 1 | bmd-081 | Inside pulls | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 32 | 1 | bmd-082 | Tap • tap • roll | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 33 | 1 | bmd-083 | Inside squish | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 34 | 1 | bmd-009 | One-foot dribble cut | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 35 | 1 | bmd-003 | Outside cut | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of dr-outside-cut (unresolved: Same name; the package marks the outside-cut mechanics for review.) |
| 36 | 1 | bmd-012 | Hook / Cruyff turn | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of dr-cruyff (unresolved: A hook turn and a Cruyff turn are not confirmed to be the same move.) |
| 37 | 1 | bmd-029 | Side step | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of dr-body-feint (unresolved: Both fake one way and exit the other; the shoulder dip vs side step is not confirmed equivalent.) |
| 38 | 1 | bmd-017 | Sole stop / start | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of dr-stop-start (unresolved: The package marks the sole stop/start mapping for review.) |
| 39 | 1 | bmd-018 | Inside-foot pull / push | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 40 | 1 | bmd-053 | V pull and exit | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of dr-pullback (unresolved: The research leaves the V pull-and-exit mapping unresolved.) |
| 41 | 2 | ft-side-door | Side Door | firstTouch | target: firstTouch ladder phase 2 + 1 practice | none (text only) |  |
| 42 | 2 | dr-figure-eight | Figure Eight | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 43 | 2 | ps-parking-zone | Parking Zone | passing | 1 practice (PROPOSED) | none (text only) |  |
| 44 | 2 | fn-other-foot | Other-Foot Contact | finishing | 1 practice (PROPOSED) | none (text only) |  |
| 45 | 2 | df-close-slow | Close and Slow | defending | 1 practice (PROPOSED) | none (text only) |  |
| 46 | 2 | aw-find-gates | Find the Gates | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 47 | 2 | ft-across-body | Across the Body | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 48 | 2 | dr-inside-cut | Inside-Cut Escape | dribbling | 1 practice (PROPOSED) | teaching demo |  |
| 49 | 2 | ps-two-foot | Two-Foot Targets | passing | target: passing ladder phase 2 + 1 practice | none (text only) |  |
| 50 | 2 | fn-roll-strike | Roll and Strike | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 51 | 2 | df-protect-gate | Protect the Gate | defending | 1 practice (PROPOSED) | none (text only) |  |
| 52 | 2 | aw-look-before-turn | Look Before Turning | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 53 | 2 | ft-bounce-settle | Bounce and Settle | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 54 | 2 | dr-outside-cut | Outside-Cut Escape | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of BM-003 (unresolved) |
| 55 | 2 | v11-PA01-L2 | Ground target pass L2 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 56 | 2 | v11-FI01-L2 | Placed finish foundation L2 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 57 | 2 | df-side-step | Side-Step and Reset | defending | 1 practice (PROPOSED) | none (text only) |  |
| 58 | 2 | aw-listen-travel | Listen and Travel | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 59 | 2 | v11-RC01-L2 | Receive into an exit lane L2 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 60 | 2 | dr-stop-start | Stop–Start | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of BM-017 (unresolved) |
| 61 | 2 | v11-PA02-L2 | Two-touch wall rhythm L2 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 62 | 2 | v11-FI02-L2 | Controlled laces contact L2 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 63 | 2 | df-rolling-collect | Rolling-Ball Collection | defending | 1 practice (PROPOSED) | none (text only) |  |
| 64 | 2 | v11-RC02-L2 | Receive, roll, pass L2 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 65 | 2 | v11-BM01-L2 | Inside-touch rhythm L2 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 66 | 2 | v11-PA03-L2 | One-touch wall return L2 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 67 | 2 | v11-BM02-L2 | Lateral sole roll L2 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 68 | 2 | v11-BM03-L2 | Forward-back sole control L2 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 69 | 2 | v11-DR01-L2 | Inside-outside lane L2 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 70 | 2 | v11-DR02-L2 | Gentle slalom L2 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 71 | 2 | v11-DR03-L2 | Stop, look, restart L2 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 72 | 2 | v11-TR01-L2 | Pull-back turn L2 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 73 | 2 | v11-TR02-L2 | Outside cut L2 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 74 | 2 | v11-TR03-L2 | Cruyff foundation L2 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 75 | 2 | v11-CO01-L2 | Choose your combination L2 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 76 | 3 | ft-outside-exit | Outside Exit | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 77 | 3 | dr-pullback | Pullback and Go | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of BM-053 (unresolved) |
| 78 | 3 | ps-near-far | Near–Far | passing | target: passing ladder phase 3 + 1 practice | none (text only) | Needs medium space |
| 79 | 3 | fn-set-strike | Set and Strike | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 80 | 3 | df-angled-approach | Angled Approach | defending | 1 practice (PROPOSED) | none (text only) |  |
| 81 | 3 | aw-call-what-you-see | Call What You See | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 82 | 3 | ft-touch-turn-travel | Touch–Turn–Travel | firstTouch | target: firstTouch ladder phase 3 + 1 practice | none (text only) |  |
| 83 | 3 | dr-body-feint | Body Feint Exit | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of BM-029 (unresolved) |
| 84 | 3 | ps-diagonal | Diagonal Delivery | passing | 1 practice (PROPOSED) | none (text only) |  |
| 85 | 3 | fn-angle-finder | Angle Finder | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 86 | 3 | df-turn-recover | Turn and Recover | defending | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 87 | 3 | aw-remember-route | Remember the Route | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 88 | 3 | ft-set-for-pass | Set for the Pass | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 89 | 3 | v11-BM01-L3 | Inside-touch rhythm L3 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 90 | 3 | ps-moving-ball | Moving Ball | passing | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 91 | 3 | fn-dribble-finish | Dribble to Finish | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area; Needs medium space |
| 92 | 3 | df-recover-inside | Recover Inside | defending | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 93 | 3 | aw-check-both | Check Both Sides | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 94 | 3 | ft-rebound-angles | Rebound Angles | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 95 | 3 | v11-BM02-L3 | Lateral sole roll L3 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 96 | 3 | ps-pass-reposition | Pass and Reposition | passing | 1 practice (PROPOSED) | none (text only) |  |
| 97 | 3 | v11-FI01-L3 | Placed finish foundation L3 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 98 | 3 | df-collect-escape | Collect and Escape | defending | 1 practice (PROPOSED) | none (text only) |  |
| 99 | 3 | aw-observe-explain | Observe and Explain | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 100 | 3 | v11-RC01-L3 | Receive into an exit lane L3 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 101 | 3 | v11-BM03-L3 | Forward-back sole control L3 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 102 | 3 | v11-PA01-L3 | Ground target pass L3 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 103 | 3 | v11-FI02-L3 | Controlled laces contact L3 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 104 | 3 | v11-RC02-L3 | Receive, roll, pass L3 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 105 | 3 | v11-DR01-L3 | Inside-outside lane L3 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 106 | 3 | v11-PA02-L3 | Two-touch wall rhythm L3 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 107 | 3 | v11-DR02-L3 | Gentle slalom L3 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 108 | 3 | v11-PA03-L3 | One-touch wall return L3 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 109 | 3 | v11-DR03-L3 | Stop, look, restart L3 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 110 | 3 | v11-TR01-L3 | Pull-back turn L3 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 111 | 3 | v11-TR02-L3 | Outside cut L3 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 112 | 3 | v11-TR03-L3 | Cruyff foundation L3 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 113 | 3 | v11-CO01-L3 | Choose your combination L3 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 114 | 4 | ft-called-exit | Called Exit | firstTouch | target: firstTouch ladder phase 4 + 1 practice | none (text only) |  |
| 115 | 4 | dr-step-over | Step-Over Exit | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 116 | 4 | ps-turn-deliver | Turn and Deliver | passing | 1 practice (PROPOSED) | none (text only) |  |
| 117 | 4 | fn-turn-finish | Turn to Finish | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 118 | 4 | df-called-side | Called Recovery Side | defending | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 119 | 4 | aw-scan-turn-pass | Scan–Turn–Pass | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 120 | 4 | ft-moving-reception | Moving Reception | firstTouch | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 121 | 4 | dr-cruyff | Cruyff-Turn Foundation | dribbling | 1 practice (PROPOSED) | none (text only) | Possible duplicate of BM-012 (unresolved) |
| 122 | 4 | ps-receive-set-pass | Receive–Set–Pass | passing | 1 practice (PROPOSED) | none (text only) |  |
| 123 | 4 | fn-across-body | Across-Body Setup | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 124 | 4 | df-close-retreat | Close–Retreat–Reset | defending | 1 practice (PROPOSED) | none (text only) |  |
| 125 | 4 | aw-look-between | Look Between Contacts | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 126 | 4 | ft-air-to-ground | Air to Ground | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 127 | 4 | dr-sole-roll-combo | Sole-Roll Combination | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 128 | 4 | ps-called-target | Called Target | passing | 1 practice (PROPOSED) | none (text only) |  |
| 129 | 4 | fn-called-corner | Called Corner | finishing | 1 practice (PROPOSED) | none (text only) |  |
| 130 | 4 | df-recovery-distribution | Recovery to Distribution | defending | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 131 | 4 | aw-changing-exit | Changing Exit | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 132 | 4 | ft-mixed-service | Mixed-Service Control | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 133 | 4 | v11-BM01-L4 | Inside-touch rhythm L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 134 | 4 | ps-channel | Through the Channel | passing | target: passing ladder phase 4 + 1 practice | none (text only) | Needs medium space |
| 135 | 4 | fn-change-pace | Change-Pace Finish | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area; Needs medium space |
| 136 | 4 | aw-two-part | Two-Part Instruction | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 137 | 4 | v11-RC01-L4 | Receive into an exit lane L4 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 138 | 4 | v11-BM02-L4 | Lateral sole roll L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 139 | 4 | ps-distance-mixer | Distance Mixer | passing | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 140 | 4 | v11-FI01-L4 | Placed finish foundation L4 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 141 | 4 | v11-RC02-L4 | Receive, roll, pass L4 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 142 | 4 | v11-BM03-L4 | Forward-back sole control L4 | dribbling | 1 practice (PROPOSED) | side view, checked |  |
| 143 | 4 | v11-PA01-L4 | Ground target pass L4 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 144 | 4 | v11-FI02-L4 | Controlled laces contact L4 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 145 | 4 | v11-DR01-L4 | Inside-outside lane L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 146 | 4 | v11-PA02-L4 | Two-touch wall rhythm L4 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 147 | 4 | v11-DR02-L4 | Gentle slalom L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 148 | 4 | v11-PA03-L4 | One-touch wall return L4 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 149 | 4 | v11-DR03-L4 | Stop, look, restart L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 150 | 4 | v11-TR01-L4 | Pull-back turn L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 151 | 4 | v11-TR02-L4 | Outside cut L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 152 | 4 | v11-TR03-L4 | Cruyff foundation L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 153 | 4 | v11-CO01-L4 | Choose your combination L4 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 154 | 5 | ft-circuit | First-Touch Circuit | firstTouch | target: firstTouch ladder phase 5 + 1 practice | none (text only) |  |
| 155 | 5 | dr-choose-move | Choose Your Move | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 156 | 5 | ps-one-touch-return | One-Touch Return | passing | 1 practice (PROPOSED) | none (text only) |  |
| 157 | 5 | fn-rebound | Rebound Finish | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 158 | 5 | df-mixed-course | Mixed Recovery Course | defending | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 159 | 5 | aw-clear-route | Find the Clear Route | awareness | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 160 | 5 | v11-RC01-L5 | Receive into an exit lane L5 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 161 | 5 | dr-creative-route | Creative Route | dribbling | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 162 | 5 | ps-circuit | Passing Circuit | passing | target: passing ladder phase 5 + 1 practice | none (text only) | Needs medium space |
| 163 | 5 | fn-mixed-approach | Mixed-Approach Finishing | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 164 | 5 | df-regain-circuit | Regain-to-Play Circuit | defending | 1 practice (PROPOSED) | none (text only) | Needs medium space |
| 165 | 5 | aw-mixed-cue | Mixed-Cue Course | awareness | 1 practice (PROPOSED) | none (text only) |  |
| 166 | 5 | v11-RC02-L5 | Receive, roll, pass L5 | firstTouch | 1 practice (PROPOSED) | none (text only) |  |
| 167 | 5 | v11-BM01-L5 | Inside-touch rhythm L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 168 | 5 | v11-PA01-L5 | Ground target pass L5 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 169 | 5 | fn-circuit | Placement Circuit | finishing | 1 practice (PROPOSED) | none (text only) |  |
| 170 | 5 | v11-BM02-L5 | Lateral sole roll L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 171 | 5 | v11-PA02-L5 | Two-touch wall rhythm L5 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 172 | 5 | v11-FI01-L5 | Placed finish foundation L5 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 173 | 5 | v11-BM03-L5 | Forward-back sole control L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 174 | 5 | v11-PA03-L5 | One-touch wall return L5 | passing | 1 practice (PROPOSED) | none (text only) |  |
| 175 | 5 | v11-FI02-L5 | Controlled laces contact L5 | finishing | 1 practice (PROPOSED) | none (text only) | Needs a safe striking area |
| 176 | 5 | v11-DR01-L5 | Inside-outside lane L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 177 | 5 | v11-DR02-L5 | Gentle slalom L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 178 | 5 | v11-DR03-L5 | Stop, look, restart L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 179 | 5 | v11-TR01-L5 | Pull-back turn L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 180 | 5 | v11-TR02-L5 | Outside cut L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 181 | 5 | v11-TR03-L5 | Cruyff foundation L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
| 182 | 5 | v11-CO01-L5 | Choose your combination L5 | dribbling | 1 practice (PROPOSED) | none (text only) |  |
