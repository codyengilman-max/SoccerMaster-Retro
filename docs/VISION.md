# Vision

> **Status: future milestones.** Everything on this page describes where SoccerMaster Retro is headed. None of it is implemented yet beyond the Milestone 1 foundation (start screen, static pitch, navigation). See [STATUS.md](STATUS.md) for what actually exists.

## Product

SoccerMaster Retro is a standalone **U11 9v9 browser soccer game designed for iPhone play**. It runs in mobile Safari (and other modern browsers) with no install, in both portrait and landscape.

## Pillars (future)

- **Approachable retro storybook visuals.** Warm palette, chunky clear outlines, readable at phone size. All art original.
- **U11 9v9 soccer with realistic tactical decisions.** Small-sided youth soccer on a youth-sized pitch.
- **Three selectable formations:** `1-3-2-3`, `1-3-3-2`, and `1-2-4-2`.
- **4–6 contextual tactical learning pauses per match.** The match pauses at meaningful moments so the player can read the situation and make a decision; the pause is tied to what is happening on the pitch, not a scripted quiz.
- **One weekly learning focus.** Each in-game week highlights a single tactical or technical theme that the learning pauses reinforce.
- **Individual RPG growth.** The player's own footballer develops attributes and skills over a season.
- **League and tournament play.** A season structure with league fixtures plus tournament events.

## Principles

- Simulation decides; rendering only draws. Soccer logic lives in `src/game/` and never depends on Phaser or the DOM.
- Phone-first: every screen must fit portrait and landscape iPhone viewports.
- Ship one verified milestone at a time; record decisions, roadmap, and status in this repository.
- Separate from earlier SoccerMaster projects; no code or assets are reused from them.
