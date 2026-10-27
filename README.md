# SoccerMaster Retro

A standalone browser soccer game designed for iPhone play.

## Vision
- Approachable 2D retro storybook visuals.
- U11 9v9 soccer with realistic tactical decisions.
- Three selectable formations.
- Four to six tactical learning moments per match.
- Weekly individual skill development and RPG progression.
- League and tournament play.

## Technology direction
TypeScript, Vite and Phaser.
GitHub stores the project.
Devin implements and tests scoped tasks.
Cloudflare hosts the playable game.

## Current state (main `04e947b`, live at https://soccermaster-retro.pages.dev)
- **Shipped:** Story mode Season One through Week 10 (boy/girl protagonist, league games 1–7, AZ Showcase), timed 9v9 matches with referee and offside, joystick + PASS/SHOOT/SLIDE TACKLE/BLOCK controls, home training and juggling, My Player, Rankings, Match Report, Cloudy and Jungle Ball minigames, IndexedDB saves.
- **Dev-only (URL flag):** Coach Moments (`?coach`), tactics v0.5 (`?tactics=v05`), gesture controls (`?controls=gesture`), Lab/Review (`?dev`, `?lab`).
- **Blocked (fail-closed):** Team Training scoring — no owner-approved card is assigned to any session, so every session shows "not counted".
- **Proposed (owner decisions H1–H8, not built):** story-match Coach Moments with Decision Heat, standing tackle, double-tap quick shot, rest defence, golden moments. See `docs/REMEDIATION_PLAN.md`.
- **Deferred:** chips, lofted shots, extra passing/defensive controls.
- Verified in Chromium phone emulation only; not yet on a real iPhone.

## Working method
Build and verify one milestone at a time.
Keep decisions, roadmap and status in this repository.
This is a new project, separate from earlier SoccerMaster work.
