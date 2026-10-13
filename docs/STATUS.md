# Status

## Current milestone: M2 — Retro Bowl-inspired playable attack (complete, in review)

One repeatable **training attack** is playable: 3 attackers vs 2 outfield defenders and a goalkeeper in the attacking half. This is a control prototype, **not** a full 9v9 match and not the full soccer-intelligence engine.

### Playable now (Start → "Play Attack Drill")
- **Auto-dribble**: your player (yellow ring + marker) dribbles toward goal; the ball moves out and back with each touch.
- **Swipes** (anywhere): up/down = lateral cut, toward goal = heavier push (ball goes loose briefly), away = check back. Cooldown 0.5 s and a ball-control meter (cut 0.3, push 0.4, check 0.15; refills 0.35/s) stop unlimited speed.
- **Aimed kicks**: hold your player ~0.16 s, drag back (slingshot), release. The guide shows direction and power. Aiming slows the whole simulation to ×0.3 for at most 1.6 s of real time (refills only while not aiming). A short drag or a quick swipe never kicks.
- **Pass/Shoot selector** (top right, Pass by default, resets to Pass after every shot and retry).
- **Receiving**: an attacker who controls the ball becomes your player; nobody is repositioned. Passes can be intercepted (ball ≤ 13 yd/s within 1.1 yd of a defender), deflected (faster balls), missed, or roll out.
- **Shots** travel as real ball trajectories; the keeper shades toward the ball, reacts after 0.25 s, and catches slow shots (≤ 15 yd/s) or parries hard ones. Parries/deflections do not end the attempt.
- **Team behaviour**: supporting attackers hold width and come inside when crowded; one makes a timed run into space when its lane is clear; the nearest defender presses goal-side, the other covers the most dangerous passing lane (they never chase the same point).
- **Attempt ends** on a goal, ball out of the training area, or a defender/keeper securing the ball; the outcome panel explains why and **Retry** fully resets without reloading.
- **Desktop**: arrows/WASD = swipes, hold Space to aim (←/→ turn, ↑/↓ power, release kicks), Tab/Q toggle, 1/2 pick Pass/Shoot, R/Enter retry, Esc back (or cancel aim). Mouse drag works like touch.
- Portrait works (top-down view) with a "rotate to landscape" suggestion.

### Tuning
All numbers are in `src/game/attack/tuning.ts` (speeds, cooldowns, control costs, aim slow-motion, pass/shot power, receive/intercept/tackle ranges, keeper) and `src/input/gestures.ts` (`GESTURE_TUNING`: swipe 30 px within 300 ms, hold 160 ms within 12 px, hold radius 80 px, drag 18–150 px).

### Verification
See the PR for exact counts. Unit tests cover swipe-vs-aim recognition, single possession and control transfer, aim time limit and cooldowns on sim time, single goal/out resolution, retry reset, and input cancellation. Browser tests (Playwright Chromium: 390×844 and 320×568 portrait, 844×390 and 568×320 landscape, 1280×720 desktop mouse/keyboard) cover a completed pass to a moving teammate, an interception, a goal, a keeper save, pointer-cancel and rotation during an aim, keyboard controls, layout fit, and repeated retries/navigation with one canvas and stable listener counts.

### Known limitations
- Not tested on a physical iPhone; Chromium emulation only.
- The browser goal test starts from a debug-only fixture (`?debug&setup=shooting`); the full receive → dribble → shoot → goal loop is verified in seeded unit tests. Headless browser timing makes long scripted moves unreliable.
- A browser-level swipe-vs-hold test was dropped because CDP touch latency in headless Chromium exceeds the 160 ms hold threshold; swipe-vs-hold is covered by unit tests and the keyboard cut test.
- No ball height (chips/headers), no offside, no fouls, no sound. AI is deliberately small: press/cover/keeper rules only.
- Tuning is a first pass and should be adjusted after playtesting on a phone.

### Next task
**Cloudflare Pages deployment** (unchanged in this task): connect the repo with build `npm ci && npm run build`, output `dist/`, enable PR previews, verify the footer build SHA, then smoke-test the drill on a real iPhone in both orientations.
