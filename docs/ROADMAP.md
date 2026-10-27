# Roadmap

Staged plan. One milestone at a time; each ends with verified checks and an updated [STATUS.md](STATUS.md). Later milestones may be re-scoped as we learn.

## M1 — Project foundation ✅
- TypeScript + Vite + Phaser toolchain, lockfile, strict type checks, CI.
- Start screen, static pitch, Back button, responsive layout, leak-free navigation, project records.

## M2 — Retro Bowl-inspired playable attack ✅ (in review)
- One repeatable training attack: 3 attackers vs 2 defenders + goalkeeper, landscape-first sideline view.
- Auto-dribble, swipe cut/push/check with cooldowns and control cost, hold-and-drag aimed passes and shots with bounded slow motion, Pass/Shoot selector, control transfer on receive, interceptions, deflections, keeper saves/parries, goal/out resolution, Retry.
- Touch, mouse and keyboard all drive the same commands.

## M2.5 — Hosting
- Connect the repo to Cloudflare Pages (`npm run build`, output `dist/`). Per-PR preview deploys; verify the served build SHA in the footer and smoke-test on a real iPhone.

## M3 — 9v9 team behaviour and formations ✅ (in review)
- 18-player sandbox (`src/game/match/`) on a 75×50 pitch with two goals, fixed-step clock, seeded AI.
- Formations `1-3-2-3` (default), `1-3-3-2`, `1-2-4-2` as data; chosen before kick-off and changeable while paused.
- In/out-of-possession team AI, opponent possession, both keepers, sandbox stoppages, pause/reset/menu, dev overlay.
- Absorbs the old "full 9v9 movement" milestone; later milestones renumbered.

## M4 — 9v9 match flow (core done, in review)
- Kick-off, restarts (throw-ins, goal kicks, corners), half-time, full-time, match clock; simple fouls/offside decisions.
- **Done:** two-half match clock (default 2 × 165 sim s (5.5 min of play, owner cap 5–6 min) shown as 2 × 25 min), kick-off, half-time card, second half with the away team kicking off, full-time result (win/draw/loss and stats), Play again. The clock stops for pauses, backgrounding, Coach Moments, kick-off countdowns and stoppages. `?sandbox` keeps the open-ended M3 sandbox; `?debug&halfSeconds=N` shortens halves for tests.
- **Since built:** referee with out of play, throw-ins, goal kicks, corners, slide-tackle fouls and offside (including saves and deflections), `src/game/match/referee.ts`.
- **Still not built:** added time.

## M5 — Tactical learning pauses
- 4–6 contextual pauses per standard match triggered from simulation state.
- Tactical choices change real play (positions, runs, pressing) rather than awarding automatic goals.
- One weekly learning focus that shapes which situations trigger pauses.
- **Status:** Coach Moments run in timed matches but only with the dev flag `?coach`; story matches do not show them. **Owner decision H3 retires in-match Coach Moments from the product:** story matches stay uninterrupted, `?coach` is deprecated and dev-only, and tactical teaching moves to Team Training (PR C in `docs/REMEDIATION_PLAN.md`, coach-approved All36 package). The goals above are kept as history.

## M6 — Individual RPG growth ✅ (in review)
Implemented as home training + game-evidence progression; see `docs/TRAINING.md`.
- Weekly individual training focus and achievement-based player growth between matches.

## M7 — League and tournament play ✅ (Season One weeks 1–10 shipped)
- League, tournament and story progression; save/load.

Out of scope unless decided later: accounts, payments, multiplayer, external telemetry.

## M8 — Art and audio pass
- Original retro storybook art pack replacing placeholders; sound; accessibility pass.

## Next (owner decisions H1–H8, 2026-10-27)
Focused PRs in order; details, files and acceptance in [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md):
A docs reconciliation + All36 inventory · B classic vs v0.5 comparison (≥50 seeds) · C coach-approved All36 Team Training integration · D standing tackle + quick shot · E rest defence + golden-moment highlights · F regression/stability (Chromium, WebKit, desktop, local + deployed journey) · G real-iPhone verification by a person · H Tournament Results Screen (from #37) · I Animated Rosters v2 (from #37).

Not planned: match-long position lock (H1); story-match Coach Moments, in-match tactical questions, Decision Heat in matches (H3). Deferred: chips, lofted shots, extra controls (H6).
