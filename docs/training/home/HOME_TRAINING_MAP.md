# Home Training: before and after activity map

Owner request 2026-11: Home Training has exactly two sections, Juggling and Ball Mastery. Every activity keeps its ID, version, review status, history and progress; only where it is listed changes. Generated from `src/game/career/catalog` (`ALL_ACTIVITIES`, 92 activities) and the v1.1 draft manifest; `tests/home-tasks.test.ts` checks that every one sits in exactly one section.

## Entry points

| Before (Home Training screen) | After |
|---|---|
| Juggling button | **Juggling** card (progress and the Juggling task inside it) |
| Ball Mastery button | **Ball Mastery** card (progress, First touch/Passing and Home learning tasks inside it) |
| Required task buttons (Juggling task, Control and first-touch / passing work, Home learning) | Shown as to do/done inside the card they belong to; tapping the card opens the section |
| Progress (Weekly Review, Home practice log, Home sessions plan / Choose a focus, Team Training, Character Development) | Removed from Home Training. Team Training stays reachable from Story, My Player and after matches; Character Development from My Player; the saved focus plan and history are kept, not deleted |
| Training Library (Juggling / Ball Mastery / Draft library) | Removed from Home Training; the same lessons are inside the two cards. The v1.1 options and Ball Mastery designs are regular lessons in their category (D68) |
| Log this session / Log extra practice | **Log practice** inside each lesson (scheduled sessions still say Log this session) |

## Approved catalog activities

| ID | Activity | Category (before) | After | Review status |
|---|---|---|---|---|
| `ft-soft-landing` | Soft Landing | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-roll-collect` | Roll and Collect | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-side-door` | Side Door | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-across-body` | Across the Body | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-outside-exit` | Outside Exit | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-bounce-settle` | Bounce and Settle | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-touch-turn-travel` | Touch–Turn–Travel | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-set-for-pass` | Set for the Pass | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-rebound-angles` | Rebound Angles | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-called-exit` | Called Exit | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-moving-reception` | Moving Reception | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-air-to-ground` | Air to Ground | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-mixed-service` | Mixed-Service Control | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ft-circuit` | First-Touch Circuit | First touch | Ball Mastery > First touch | pending (unchanged) |
| `ps-wide-gate` | Wide Gate | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-parking-zone` | Parking Zone | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-two-foot` | Two-Foot Targets | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-near-far` | Near–Far | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-diagonal` | Diagonal Delivery | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-moving-ball` | Moving Ball | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-turn-deliver` | Turn and Deliver | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-pass-reposition` | Pass and Reposition | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-receive-set-pass` | Receive–Set–Pass | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-called-target` | Called Target | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-channel` | Through the Channel | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-one-touch-return` | One-Touch Return | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-distance-mixer` | Distance Mixer | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `ps-circuit` | Passing Circuit | Passing and control | Ball Mastery > Passing and control | pending (unchanged) |
| `dr-inside` | Inside Foundations | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-outside` | Outside Foundations | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-sole` | Sole Explorer | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-figure-eight` | Figure Eight | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-inside-cut` | Inside-Cut Escape | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-outside-cut` | Outside-Cut Escape | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-pullback` | Pullback and Go | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-body-feint` | Body Feint Exit | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-stop-start` | Stop–Start | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-step-over` | Step-Over Exit | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-cruyff` | Cruyff-Turn Foundation | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-sole-roll-combo` | Sole-Roll Combination | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-choose-move` | Choose Your Move | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `dr-creative-route` | Creative Route | Dribbling, turns and feints | Ball Mastery > Dribbling, turns and feints | pending (unchanged) |
| `fn-ground-placement` | Ground Placement | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-inside-accuracy` | Inside-Foot Accuracy | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-other-foot` | Other-Foot Contact | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-roll-strike` | Roll and Strike | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-set-strike` | Set and Strike | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-angle-finder` | Angle Finder | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-dribble-finish` | Dribble to Finish | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-turn-finish` | Turn to Finish | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-across-body` | Across-Body Setup | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-called-corner` | Called Corner | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-change-pace` | Change-Pace Finish | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-rebound` | Rebound Finish | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-mixed-approach` | Mixed-Approach Finishing | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `fn-circuit` | Placement Circuit | Finishing | Ball Mastery > Finishing | pending (unchanged) |
| `df-balanced-set` | Balanced Set | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-close-slow` | Close and Slow | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-protect-gate` | Protect the Gate | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-angled-approach` | Angled Approach | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-side-step` | Side-Step and Reset | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-turn-recover` | Turn and Recover | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-recover-inside` | Recover Inside | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-rolling-collect` | Rolling-Ball Collection | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-collect-escape` | Collect and Escape | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-called-side` | Called Recovery Side | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-close-retreat` | Close–Retreat–Reset | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-recovery-distribution` | Recovery to Distribution | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-mixed-course` | Mixed Recovery Course | Defending | Ball Mastery > Defending | pending (unchanged) |
| `df-regain-circuit` | Regain-to-Play Circuit | Defending | Ball Mastery > Defending | pending (unchanged) |
| `aw-eyes-up` | Eyes-Up Carry | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-find-gates` | Find the Gates | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-look-before-turn` | Look Before Turning | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-call-what-you-see` | Call What You See | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-remember-route` | Remember the Route | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-check-both` | Check Both Sides | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-listen-travel` | Listen and Travel | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-scan-turn-pass` | Scan–Turn–Pass | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-look-between` | Look Between Contacts | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-changing-exit` | Changing Exit | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-two-part` | Two-Part Instruction | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-clear-route` | Find the Clear Route | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-mixed-cue` | Mixed-Cue Course | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `aw-observe-explain` | Observe and Explain | Awareness | Ball Mastery > Awareness | pending (unchanged) |
| `jg-1` | Ladder 1: One contact and catch | Juggling | Juggling | pending (unchanged) |
| `jg-2` | Ladder 2: Either foot | Juggling | Juggling | pending (unchanged) |
| `jg-3` | Ladder 3: Contact, bounce, contact | Juggling | Juggling | pending (unchanged) |
| `jg-4` | Ladder 4: Two contacts and catch | Juggling | Juggling | pending (unchanged) |
| `jg-5` | Ladder 5: Alternating feet | Juggling | Juggling | pending (unchanged) |
| `jg-6` | Ladder 6: Foot and thigh | Juggling | Juggling | pending (unchanged) |
| `jg-7` | Ladder 7: Juggle, settle, dribble | Juggling | Juggling | pending (unchanged) |
| `jg-8` | Ladder 8: Juggle, settle, pass | Juggling | Juggling | pending (unchanged) |

## v1.1 library families (owner-approved lessons, D68; 5 options each, listed directly in the category)

Listed inside the matching category with a DRAFT label; never put in plans, required tasks or credit. Unchanged IDs `v11-<level>`.

| Family | Name | After |
|---|---|---|
| `BM01` | Inside-touch rhythm | Ball Mastery > Dribbling, turns and feints |
| `BM02` | Lateral sole roll | Ball Mastery > Dribbling, turns and feints |
| `BM03` | Forward-back sole control | Ball Mastery > Dribbling, turns and feints |
| `DR01` | Inside-outside lane | Ball Mastery > Dribbling, turns and feints |
| `DR02` | Gentle slalom | Ball Mastery > Dribbling, turns and feints |
| `DR03` | Stop, look, restart | Ball Mastery > Dribbling, turns and feints |
| `TR01` | Pull-back turn | Ball Mastery > Dribbling, turns and feints |
| `TR02` | Outside cut | Ball Mastery > Dribbling, turns and feints |
| `TR03` | Cruyff foundation | Ball Mastery > Dribbling, turns and feints |
| `PA01` | Ground target pass | Ball Mastery > Passing and control |
| `PA02` | Two-touch wall rhythm | Ball Mastery > Passing and control |
| `PA03` | One-touch wall return | Ball Mastery > Passing and control |
| `RC01` | Receive into an exit lane | Ball Mastery > First touch |
| `RC02` | Receive, roll, pass | Ball Mastery > First touch |
| `JU01` | Drop, touch, catch | Juggling |
| `JU02` | Bounce juggling | Juggling |
| `JU03` | Air touch to ground control | Juggling |
| `FI01` | Placed finish foundation | Ball Mastery > Finishing |
| `FI02` | Controlled laces contact | Ball Mastery > Finishing |
| `CO01` | Choose your combination | Ball Mastery > Dribbling, turns and feints |

## Ball Mastery designs v1.0 (14)

Owner-approved (D68): 13 are Ball Mastery > Dribbling lessons; BM-002 is Inside-Cut Escape (table at the end).

## Ball Mastery designs v1.0 (owner-approved lessons, D68)

| Design | Title | Lesson |
|---|---|---|
| `BM-055` | Sole taps | `bmd-055` Ball Mastery > Dribbling |
| `BM-056` | Inside-foot shuffles | `bmd-056` Ball Mastery > Dribbling |
| `BM-071` | Lateral sole roll | `bmd-071` Ball Mastery > Dribbling |
| `BM-081` | Inside pulls | `bmd-081` Ball Mastery > Dribbling |
| `BM-082` | Tap • tap • roll | `bmd-082` Ball Mastery > Dribbling |
| `BM-083` | Inside squish | `bmd-083` Ball Mastery > Dribbling |
| `BM-009` | One-foot dribble cut | `bmd-009` Ball Mastery > Dribbling |
| `BM-002` | Inside cut | merged into `dr-inside-cut` Inside-Cut Escape |
| `BM-003` | Outside cut | `bmd-003` Ball Mastery > Dribbling |
| `BM-012` | Hook / Cruyff turn | `bmd-012` Ball Mastery > Dribbling |
| `BM-029` | Side step | `bmd-029` Ball Mastery > Dribbling |
| `BM-017` | Sole stop / start | `bmd-017` Ball Mastery > Dribbling |
| `BM-018` | Inside-foot pull / push | `bmd-018` Ball Mastery > Dribbling |
| `BM-053` | V pull and exit | `bmd-053` Ball Mastery > Dribbling |
