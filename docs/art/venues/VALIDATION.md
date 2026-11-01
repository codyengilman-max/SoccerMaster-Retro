# Validation — 2026-10-21

Completed: 47 extracted props, four lossless WebP grass surfaces, 6 character atlases with 24 frames each (144 frame cells), six animated GIF previews, animation definitions and Phaser-compatible atlas JSON. All image files decode, character PNG/WebP pixels match, all character cells are nonempty and within bounds with feet no lower than y=120, and manifest SHA-256 values match. Exact prepared atlas dimensions are 960×512; each cell is 160×128.

Visually reviewed contact sheets of all prepared props and all animation frames. Removed disconnected crop fragments and low-alpha character fringes. Six-frame motions are stylized and may need timing adjustment at actual game size. Some idle poses are intentionally very similar. Animation playback previews supplied; no actual game playback was tested.

Runtime helper tests passed for mesh coverage, landscape/portrait projection callbacks, valid triangle indices, reaction event deduplication and opposing team responses. These tests do not establish compatibility with MatchScene or Phaser Mesh without repository integration.

Not performed: game source integration, real-camera rendering, performance profiling, physical iPhone testing, browser gameplay regression tests or deployment. The SoccerMaster Retro source checkout was not available. No claims of live-game readiness or tested seamless repetition are made.

Source extraction is mechanical and originals remain in sources/. Parents and coaches use the new canonical sheets, not four variant identities from scenery source art. Seated-to-standing transitions need explicit chair handling; use seated_clap for seated reactions until wired.
