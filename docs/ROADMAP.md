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

## M4 — 9v9 match flow
- Kick-off, restarts (throw-ins, goal kicks, corners), half-time, full-time, match clock; simple fouls/offside decisions.

## M5 — Tactical learning pauses
- 4–6 contextual pauses per standard match triggered from simulation state.
- Tactical choices change real play (positions, runs, pressing) rather than awarding automatic goals.
- One weekly learning focus that shapes which situations trigger pauses.

## M6 — Individual RPG growth
- Weekly individual training focus and achievement-based player growth between matches.

## M7 — League and tournament play
- League, tournament and story progression; save/load.

Out of scope unless decided later: accounts, payments, multiplayer, external telemetry.

## M8 — Art and audio pass
- Original retro storybook art pack replacing placeholders; sound; accessibility pass.
