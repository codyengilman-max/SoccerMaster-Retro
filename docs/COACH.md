# Coach Moments (M5)

Contextual tactical pauses inside the 9v9 sandbox. Turned on with the development flag `?coach` (5 moments) or `?coach=4`…`?coach=6`. Without the flag the sandbox is unchanged.

In a timed match (the default) a **coached session** spans the whole match (both halves); the clock is frozen while a moment is open, no moment opens at half-time, and the summary is the full-time screen. In the open-ended `?sandbox` a session is 300 s of sim time. Debug builds can shorten it with `?debug&coach&coachSeconds=40` (20–299 s); the browser tests use this.

## Flow

1. While play is live, `CoachDirector.update()` reads the sim state each frame. Only when it is safe (live phase, no gesture, not aiming, no kick in flight, no goal/out being resolved, no user pause or other overlay, past the minimum gap and the current slot start) it extracts facts and looks for an eligible template.
2. If one is found, the sim is frozen with `coachHold` (its own pause reason, independent of the user/background pause). Pitch, players, ball, AI, physics, sim time and sim-time cooldowns all stop together. Any pending gesture or aim is cancelled.
3. The overlay highlights the relevant players, lanes, space or goal and asks one question with 3–4 choices. Questions are untimed.
4. The first answer is recorded; later taps are ignored. Feedback explains the choice (strong / reasonable alternative / risky) and names other strong answers.
5. `Continue` (accepted once) releases only the coach hold, so a background pause stays. No frame time is banked during the hold. The aim allowance and skill cooldowns are untouched. Fresh input is needed to act.
6. The choice has a bounded consequence:
   - **On-ball** choices (pass, carry, shoot, protect…) show a cue (ring on the carrier, line to the target). The player still has to make the play with the normal gestures; nothing is automatic.
   - **Off-ball** choices give one teammate a temporary `coachIntent` (support, run, width, press, cover, protect) that feeds the normal AI intent. Normal speed caps, collisions and role limits apply; no teleport, no attribute or score change. It ends after at most 6 s, on a possession change, when the player receives the ball, or on a restart/stoppage/reset.
7. For 6 s the director observes what actually happened (pass, shot, carry, feint, possession lost, moved toward target, none) and the outcome (goal, save, kept, lost, out…), separately from how good the decision was.
8. After the last slot the session ends with a summary: moments completed / target, any shortfall, tactical strengths and one "Next match, focus on …" line.

## Scheduling

- Target 4–6 moments (default 5), clamped. Slot `k` opens at `sessionSeconds × (k + 0.35) / target`; at least `minGapSeconds` (22 s) between moments.
- No topic twice in a row; each template has its own cooldown and max per session. Seeded tie-breaking (`seed` from the URL) makes sessions repeatable.
- If nothing valid is eligible before the session ends, the shortfall is recorded instead of inventing a situation. Restart templates are used only when the sandbox stoppage facts are valid.
- Leaving through Menu or Reset abandons the session (no shortfall, intentions cleared, hold released).

## Facts (`src/game/coach/facts.ts`)

Facts come only from `MatchState` in the coached team's frame (attacking +x), so both attacking directions give identical facts. They include the carrier, nearest presser distance and arrival time, open/blocked passing lanes, support options, shot range/angle/clearance, cover and numbers around the ball, score, formation, stoppage, and space behind the defence. Missing or non-finite state returns `null`.

Not passed to the Coach facts today (the referee now rules on offside, fouls and restarts, and timed matches have a clock, but `CoachFacts` does not read them): **offside**, fouls, set-piece rules and the match clock. `timeLeft` is only set when a host passes one (the sandbox does not), so no template states time left.

## Authoring a template (`src/game/coach/templates.ts`)

Each template has: stable `id` (`area.name`), integer `version` (bump when the meaning changes), `topic`, `objective`, `phase`/`ball` mode, `requires` (named facts that must be present), `eligible(f)`, `question(f, names)`, `highlights(f)`, 3–4 `options`, `cooldown` and `maxPerSession`.

Each option has `id`, `text(f, names)`, optional `available(f)` (hide choices that would invent an open teammate or lane), `evaluate(f)` → `{ grade, why }`, and an `intention(f)`.

Rules:
- At least two options must always be available, and every built moment needs 3–4 visible choices and at least one strong one; otherwise it is skipped.
- More than one answer may be strong; grade by the facts, not a single "right" answer.
- Never state a fact the facts object does not have (open player, numbers, time, offside).
- Text is plain and short for U11 players. Imported player names go through `safeName` (control and bidi characters removed, length capped) and are rendered as canvas text, never HTML; unnamed players are described by role ("your left winger").

`validateCatalog()` runs at load time (`assertValidCatalog`), and `tests/coachTemplates.test.ts` checks every template in an eligible state, an ineligible state and a counterexample. No runtime AI or network calls are used.

## Deprecated (owner decision H3, 2026-10-27)
Coach Moments are **not** part of the story-match product. Story matches stay uninterrupted: no pauses, answer menus, Decision Heat or tactical grades in Match Reports, and `?coach` is never enabled for ordinary players. This module stays as a dev-only prototype; removing the unused code is a later cleanup task and is not done in Phase One. Tactical questions, grading and explanations belong in Team Training: [specs/RETRO_DECISION_MODEL.md](specs/RETRO_DECISION_MODEL.md).
