# Vision

> **Status:** this page describes the product direction. Much of it is now shipped (9v9 matches, formations, story weeks 1–10, RPG growth, league and tournament). The 4–6 in-match tactical pauses below are **superseded by owner decision H3**: story matches stay uninterrupted, the `?coach` prototype is deprecated and dev-only, and tactical questions, grading and explanations live in Team Training (coach-approved All36 package). See [STATUS.md](STATUS.md) for what is shipped, dev-only, blocked, deferred and proposed, and [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md) for the next PRs.

## Product

SoccerMaster Retro is a standalone **U11 9v9 browser soccer game designed for iPhone play**. It runs in mobile Safari (and other modern browsers) with no install, in both portrait and landscape.

## Pillars

- **Approachable retro storybook visuals.** Warm palette, chunky clear outlines, readable at phone size. All art original.
- **U11 9v9 soccer with realistic tactical decisions.** Small-sided youth soccer on a youth-sized pitch.
- **Three selectable formations:** `1-3-2-3`, `1-3-3-2`, and `1-2-4-2`.
- **4–6 contextual tactical learning pauses per match.** The match pauses at meaningful moments so the player can read the situation and make a decision; the pause is tied to what is happening on the pitch, not a scripted quiz.
- **One weekly learning focus.** Each in-game week highlights a single tactical or technical theme that the learning pauses reinforce.
- **Player control.** FIFA-style automatic switching to the pressing or chasing player is intended (H1). The chosen DEF/MID/FWD career position sets identity, look, attributes and position-specific learning, not a locked player.
- **Individual RPG growth.** The player's own footballer develops attributes and skills over a season.
- **League and tournament play.** A season structure with league fixtures plus tournament events.

## Principles

- Simulation decides; rendering only draws. Soccer logic lives in `src/game/` and never depends on Phaser or the DOM.
- Phone-first: every screen must fit portrait and landscape iPhone viewports.
- Ship one verified milestone at a time; record decisions, roadmap, and status in this repository.
- Separate from earlier SoccerMaster projects; no code or assets are reused from them.
