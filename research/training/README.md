# Training research

`v1.1/` contains the owner-supplied package `SoccerMaster_Training_Coaching_Reviewed_Draft.zip` (SHA-256 `44634be599d52cec03ce993f4bc2433496442e07a7276ad4e4d30a705af651a6`), extracted **unchanged**. Every file matches `v1.1/SHA256SUMS.txt`. Never edit `v1.1/`: revised content goes in a new versioned directory and must record what changed and why.

- Content revision: 1.1.0. Schema: 2. Audience: U11–U12.
- 20 exercise families × 5 practice options = 100 variations. All are `draft`.
- 200 demo specifications, all `not_created`. No review records.
- `01_COACHING_REVIEW.md` is AI-assisted. It is not independent coaching certification. Its findings stay open until a qualified coach resolves them.

## Reference tests (offline contract only)

`v1.1/reference/test_training_reference.py` was inspected before running. It imports only hashlib, json, re, sqlite3, urllib.parse, tempfile, pathlib and concurrent.futures. It writes only a temporary SQLite file and `training_recheck_results.json`.

It was run on 2026-10-15 under owner authorization:
- Run on a copy of the package, with no network (`unshare -rn`), an empty environment (`env -i`) and `python3 -E -s` (Python 3.10.12).
- Result: **63 passed, 0 failed**. The rewritten results file is byte-identical to the packaged one.
- The reference tests stay unchanged as evidence of the package's original contract. They test the Python reference model, not the game.

## Owner decisions that override the package (2026-10-15)

| Package proposal | Decision for SoccerMaster Retro |
|---|---|
| P-001: one zero-stat `local_journal_stamp` per `(careerId, careerWeekId, slotIndex)` | **Overridden.** Retro keeps its existing reward: one participation credit per scheduled session, at most 3 per week, never attributes. No second week-slot reward system. A substitution, catalog update or replay never issues another credit. |
| A level for each family | **Overridden.** The seven existing skill-area levels stay the player's progression. The 20 families and their options are curriculum organization only. Prerequisites decide which exercises are suitable. They create no new progression tracks. |
| Five options per family | The options are alternatives, **not** automatically increasing difficulty. |
| Catalog size | No numeric quota. The 500-plus soccer-scenario catalog is separate from home training. Exercises are never duplicated to reach a count. |

The package's own tests still assert P-001 and pass unchanged. Retro's integration tests (`tests/curriculum-*.test.ts`) assert the override explicitly.
