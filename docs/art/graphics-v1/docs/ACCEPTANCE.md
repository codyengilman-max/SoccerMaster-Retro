# Acceptance checks

## Art and identity
- Approved original five PNGs match the manifest hashes. New art clearly labeled for review.
- The same face, hair color, shape and identity appear across each character's school/training/match/home variants; no accidental sibling/clone substitution.
- School clothes persist through schoolyard scenes; training kit is distinct from match kit; no backpack appears with a match jersey.
- Main character name flows through dialogue; selecting the alternate protagonist changes appearance only. Alex remains a separate teammate.
- Every actual reachable scene maps to an asset/outfit, or is explicitly reported unsupported. No unsupported scope called complete.

## Gameplay regression
- Use the current controls SOW: joystick movement, charged ground Pass/Shoot, cancel, one Slide Tackle per press and held Block. No sprint or reintroduced skill-move/feint gesture. Verify disabled actions, possession loss/regain, actor reassignment and generation invalidation.
- Hair and enlarged bodies do not hide possession/ball/aim indicators; overlap sorting follows feet.
- Before/after identical seeded simulation input produces the same ball/player physics and growth results unless an independently approved change explains it.
- Test near touchlines/goals, player overlap, camera pan/zoom, orientation change, background/resume and lost pointer capture. No offset joystick/button/input target caused by visual scaling. Cutscene exit clears held actions and requires fresh input.
- Selected ring, roster identity and shirt numbers remain legible; direction and animation state agree with motion.

## Cutscene and security regression
- School -> training -> match -> home shows correct fixed outfits. Back/replay/refresh preserves the canonical story's own state contract.
- Fast-forward stops at choices; double-tap cannot apply two decisions. Ending a scene while holding touch cannot kick or move a player.
- Dialogue history/replay and image-load retries create zero duplicate effects. Malformed/unknown asset keys fail safely; no arbitrary URLs or executable content.
- Render a valid name with punctuation as text, and reject names per current canonical Unicode limits. No display name becomes an HTML/path fragment.
- Missing images give a visible fallback, with choices usable. Reduced-motion and instant text work; keyboard focus and labels are visible.

## Screens and performance
Test 390x844 portrait, 844x390 landscape, 568x320 small landscape and a desktop viewport. Report actual browser/device, not just a green checklist. Check dynamic address bar/safe areas, long name, three choices, portrait overlap and no clipped hair.
Record warm and cold load, peak texture use, and frame cadence during a real match before/after. No universal FPS claim; desktop browser emulation is not a physical iPhone. Test a physical iPhone in Safari before claiming mobile acceptance.

## Report
Provide tested commit, build command/output path, pass/fail/skip reasons, screenshots, a short walkthrough recording, reachability of the exact preview build, new-art review list and remaining assets/expressions. Dependency audit is one signal, not a full security verdict.

## Continuity-specific regressions
- All 18 v0.7 scene IDs resolve in the reference map; separately compare actual repository IDs and source version.
- Alex as a player-entered name, Jordan as a player-entered name, and both protagonist presentations retain distinct actor IDs and speaker highlighting.
- No NPC knows the chosen name before the introduction branch. Directions/quiet branches do not disclose it.
- Transcript exposes only visited/revealed lines from the current run. No alternative branch or private fish disclosure leaks into school scenes.
- Invalid or stale choice/revision, a duplicate action, held key or old pointer cannot select a new node. Failed portrait loads cannot write effects.
- Unknown identity/asset/scene references and traversal-like IDs are rejected or reach explicit recovery; they never select another named person.
- Wardrobe is pinned to scene occurrence and membership-at-event; reload, rename or transfer cannot rewrite a historic outfit or reward.
- Resolve the bedroom, corridor, kit, named-gameplay and Block-pose gaps before calling those areas production-complete.
