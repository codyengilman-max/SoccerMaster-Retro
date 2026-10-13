# Roadmap

Staged plan. One milestone at a time; each ends with verified checks and an updated [STATUS.md](STATUS.md). Later milestones may be re-scoped as we learn.

## M1 — Project foundation ✅ (this milestone)
- TypeScript + Vite + Phaser toolchain, lockfile, strict type checks, CI.
- Start screen with "Enter Training Ground"; static pitch with markings, one placeholder player, and a ball; Back button.
- Responsive portrait/landscape layout; leak-free scene navigation; project records.

## M2 — Hosting
- Connect the repo to Cloudflare Pages (`npm ci && npm run build`, output `dist/`).
- Per-PR preview deploys; verify the served build SHA in the footer and smoke-test on a real iPhone.

## M3 — Simulation core (headless)
- `src/game/` match state: 18 players + ball, pitch coordinates, fixed-step clock, seeded randomness.
- Deterministic tests; renderer still only reads state.

## M4 — Player movement and ball physics
- Touch controls for one player; basic dribble, pass, shoot.
- Simple ball physics on the pitch.

## M5 — 9v9 match flow
- Kick-off, restarts, goals, half-time, full-time; simple team AI.
- Formations `1-3-2-3`, `1-3-3-2`, `1-2-4-2` selectable before a match.

## M6 — Tactical learning pauses
- 4–6 contextual pauses per match triggered from simulation state.
- One weekly learning focus that shapes which situations trigger pauses.

## M7 — Individual RPG growth
- Player profile, attributes, training sessions, and progression between matches.

## M8 — League and tournament play
- Season calendar, league table, tournament brackets, save/load.

## M9 — Art and audio pass
- Original retro storybook art pack replacing placeholders; sound; accessibility pass.
