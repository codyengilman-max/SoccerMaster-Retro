# Story v0.7 → Retro adapter map

Package: `docs/story/v0.7/` (unchanged, SHA256SUMS verified). Runtime reads only `week_one_scenes.json` and `club_world.json`, both strictly validated; no content-supplied code, expressions or effects other than `remember_choice` run.

| Requirement | Implementation | Writer | Test | Status |
|---|---|---|---|---|
| Scene graph (18 scenes, v0.7 order) | `src/game/story/content.ts` `parseCatalog` | none (read-only) | `tests/story-content.test.ts` | Implemented |
| Name + boy/girl identity | `identity.ts` `validateName`, `PRONOUNS`; career `createPlayer`/`setIdentity` (optional `gender`, older saves unchanged) | CareerStore | content tests, `e2e/story.spec.ts` | Implemented (pronouns stored; the v0.7 week-one text uses only `{player.name}`) |
| Cursor/choice persistence | `runtime.ts` `reduceStory`; `store.ts` one IndexedDB transaction per command (`smr-story` DB) | StoryStore | `story-runtime`, `story-store`, e2e reload test | Implemented |
| Stale tab / duplicate / forged commands | revision + seq + node allowlist checks | StoryStore | runtime + store tests | Implemented |
| Replay | `createSession('replay')` read-only; Log button shows seen lines | none | runtime test | Implemented (transcript view; no separate replay picker) |
| identity adapter | `StoryScene` identity card | CareerStore | e2e | Implemented |
| crossbar adapter | `crossbar.ts` 3-D ball, swept bar/post collision; `StoryScene` pull-back kick; contest saved as `crossbar:<runId>` before and after each shot | StoryStore | `story-crossbar.test.ts`, e2e | Implemented |
| training_arrangement / weekly_focus / practice | hand off to Home Training (`returnTo: 'story'`); outcome decided from the career save only (setup saved / focus set / scheduled session logged) | CareerStore (existing rules: one credit per scheduled session) | e2e | Implemented |
| assignment | position card from the career player (`POSITION_SLOT`) | none | e2e | Implemented |
| match | hands off to Formation → Match (career evidence on, `returnTo: 'story'`); completed when at least one evidence batch was saved | CareerStore | e2e | Implemented. Limitation: leaving early after evidence is saved counts as played |
| week_close | existing career `endWeek` | CareerStore | e2e | Implemented |
| W2 callback | scene `W2_SCHOOL_CALLBACK` with factual recap | none | e2e | Implemented (week-one end) |
| Clubs / tournaments | `clubs.ts` design-data loader, `eventEntry` (U12 only, standing invitation) | none | `story-crossbar.test.ts` | Data only: no league, scheduler or entries |
| Weeks 2–4, relationship arcs, transfers, leagues | — | — | — | Not implemented |
| Emotional state affecting soccer | none exists | — | architecture | Never implemented by design |
