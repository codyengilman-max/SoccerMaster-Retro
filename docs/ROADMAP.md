# Roadmap

Staged plan. One milestone at a time; each ends with verified checks and an updated [STATUS.md](STATUS.md). Later milestones may be re-scoped as we learn.

## M1 — Project foundation ✅
- TypeScript + Vite + Phaser toolchain, lockfile, strict type checks, CI.
- Start screen, static pitch, Back button, responsive layout, leak-free navigation, project records.

## M2 — Retro Bowl-inspired playable attack ✅ (in review)
- One repeatable training attack: 3 attackers vs 2 defenders + goalkeeper, landscape-first sideline view.
- Auto-dribble, swipe cut/push/check with cooldowns and control cost, hold-and-drag aimed passes and shots with bounded slow motion, Pass/Shoot selector, control transfer on receive, interceptions, deflections, keeper saves/parries, goal/out resolution, Retry.
- Touch, mouse and keyboard all drive the same commands.

## M2.5 — Hosting (next)
- Connect the repo to Cloudflare Pages (`npm ci && npm run build`, output `dist/`).
- Per-PR preview deploys; verify the served build SHA in the footer and smoke-test on a real iPhone.

## M3 — Simulation core (headless)
- Grow `src/game/attack` into full match state: 18 players + ball, fixed-step clock, seeded randomness.
- Deterministic tests; renderer still only reads state.

## M4 — Full 9v9 movement
- Extend the M2 controls and support/defending rules from 3v3 to 9v9; richer off-ball runs and team shape.

## M5 — 9v9 match flow
- Kick-off, restarts, goals, half-time, full-time; simple team AI.
- Formations `1-3-2-3`, `1-3-3-2`, `1-2-4-2` selectable before a match.

## M6 — Tactical learning pauses
- 4–6 contextual pauses per standard match triggered from simulation state.
- Tactical choices change real play (positions, runs, pressing) rather than awarding automatic goals.
- One weekly learning focus that shapes which situations trigger pauses.

## M7 — Individual RPG growth
- Weekly individual training focus and achievement-based player growth between matches.

## M8 — League and tournament play
- League, tournament and story progression; save/load.

Out of scope unless decided later: accounts, payments, multiplayer, external telemetry.

## M9 — Art and audio pass
- Original retro storybook art pack replacing placeholders; sound; accessibility pass.
