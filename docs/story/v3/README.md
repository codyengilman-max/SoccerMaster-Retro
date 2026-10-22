# SoccerMaster V3 — Week Five content and integration handoff

Read DEVIN_START_HERE.md first.

This is the V3 content/rules update to apply to the game and the previously supplied v0.2 engine. It includes the user-approved Week Five script, definitive rule changes from Week Five onward, structured scene routing, season continuity and verification requirements.

It is not the unfinished earlier v0.3 engine experiment. That experiment contained superseded school dialogue and a mandatory Cloudy slot; it is intentionally excluded.

## Contents
- home-screen-background.jpeg — exact approved home hub background.
- HOME_BACKGROUND_INSTRUCTIONS.md — responsive placement and menu integration.
- WEEK_05_APPROVED.md — authoritative dialogue and scene directions.
- WEEK_05_FLOW.json — implementation specification with branches, gates and activity hooks; not v0.2 runtime scene JSON.
- SEASON_RULES_V3.json — new cadence and authoritative progression boundaries.
- SEASON_CONTINUITY.md — fixed Weeks 1–18 schedule and preserved story milestones.
- DEVIN_START_HERE.md — integration instructions.
- ACCEPTANCE_CHECKLIST.md — app-specific verification before release.
- validate-package.mjs — checks package references, cadence, activity gates and calendar counts.
- MANIFEST.json — generated file hashes for this handoff.

The user approved the Week Five narrative with “Great let’s add a V3 zip for Devon to go a long with week 5 content.” Approval of dialogue does not verify an unseen implementation. This archive does not include fake runtime approval records.

Weeks 1–4 remain their approved versions. Later weeks keep their outline and new rules; write their dialogue week by week. No live app, GitHub repository or production save was changed here.

Run node validate-package.mjs inside this folder to verify this handoff. Devin must separately compile/import it into the actual project's format, test the live integration and register the resulting reviewed scene hashes.
