# SoccerMaster Logic Research

Preserved research, adversarial design audit, corrected specification and scenario catalog.

Latest additive review: [9v9 roles and interactions v0.3](docs/SoccerMaster_9v9_Roles_Interactions_Review_v0.3.md). It covers all nine slots, both teams, 24 interaction rules and 20 unexecuted gameplay fixture requirements.

## Read in this order

1. `audit/AUDIT.md` — findings, fixes and remaining runtime gates.
2. `docs/SoccerMaster_Logic_Foundation_v0.2.md` — complete foundation with corrections.
3. `contracts/ENGINE_CONTRACT.md` — normative requirements for future implementation.
4. `data/scenario_catalog.json` — all 40 original scenario seeds, unchanged text, with authoring metadata.
5. `data/evidence_register.json` and `data/coverage_ledger.json` — provenance and explicit coverage gaps.
6. `docs/DEVIN_HANDOFF.md` — integration constraints.

The original v0.1 is preserved byte-for-byte in `archive/`. Its SHA-256 is
`e45f8e5eaff31d2f2781f1109f05f6353aff37c83af9c021ceabb91a010f481b`.

This is a **research repository**, not the SoccerMaster game repository.
No game runtime was available or audited. No gameplay security, performance,
statistical calibration or football accuracy certification is claimed.
All 40 scenarios are draft design seeds and are disabled for production.

## Verify

Python 3, standard library only:

```sh
python3 tools/validate_repository.py
python3 -m unittest discover -s tests -v
git fsck --full
```

`audit/verification.txt` records the checks actually run. Acceptance tests in
`data/runtime_acceptance.json` describe future engine tests; they were not run.

## Preserve history

Never edit `archive/`. Append a new version and commit the changes. Hashes
detect accidental modification; they are not a signature or protection against
someone able to rewrite both content and hashes.

The deliverable ZIP contains this working tree and `repository.bundle`, which
holds the committed Git history. Restore history with:

```sh
git clone repository.bundle SoccerMaster-Logic-Research
```

No remote is configured and nothing has been pushed or deployed.
GitHub connection and confirmation of the destination are required before
publishing. The known SoccerMaster-Retro repository is a candidate, not an
assumed destination for a new research repository.


## Executable v0.5 tactical prototype

Start with `engine/README.md`. Run `node --test engine/decision-engine.test.mjs`. The module emits coordinated intentions for both teams through separate instances; host adapters and gameplay validation remain required. See `audit/ENGINE_v0.5_AUDIT.md`.
