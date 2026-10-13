# Decisions

Approved technical choices. Add a new entry rather than silently changing an old one.

| # | Decision | Reason |
|---|----------|--------|
| D1 | **TypeScript** with `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`, `noImplicitOverride` (`tsconfig.json`). | Catch mistakes early in a codebase that will grow a simulation. |
| D2 | **Vite 6** as dev server and bundler (`vite.config.ts`, `index.html` entry). | Fast dev loop, static `dist/` output suitable for Cloudflare Pages. |
| D3 | **Phaser 3.90** (final, mature Phaser 3 release) for rendering, input, and scenes. Phaser 4 was not chosen for this foundation because Phaser 3 has the longer track record and documentation. | Stable 2D engine with WebGL/Canvas, Scale Manager, scene lifecycle. |
| D4 | **npm** with committed `package-lock.json`; CI uses `npm ci`. Dependencies pinned to exact versions. Node 20 pinned in `.node-version`. | One package manager, reproducible installs, Cloudflare reads `.node-version`. |
| D5 | **Simulation separated from rendering.** `src/game/` holds framework-free state and geometry (no Phaser, DOM, or render imports, enforced by `tests/architecture.test.ts`). `src/render/` holds drawing helpers (pure layout math in `layout.ts`, Phaser textures). `src/scenes/` holds Phaser scenes that read simulation state and draw it. | Future match logic can be tested headlessly and cannot be entangled with drawing code. |
| D6 | **Phaser Scale Manager `RESIZE` mode** on a `#app` element that fills the iOS safe area. Each scene re-lays out on the scale `resize` event; the pitch runs vertically in portrait and horizontally in landscape. `FIT` was not used because it letterboxes and wastes phone screen space. `src/render/resizeGuard.ts` re-syncs the canvas each step if Phaser 3.90's orientation handler leaves it at the previous orientation's size. | Fills both phone orientations without letterboxing. |
| D7 | **Scene lifecycle rule:** navigate with `scene.start(key)` (stops the current scene). Every listener a scene adds to a shared emitter (`this.scale`, `this.input.keyboard`) is removed in its `SHUTDOWN` handler. One `Phaser.Game` per page; Vite HMR destroys the old game. | Repeated navigation must not leak canvases or handlers. |
| D8 | **Original placeholder art drawn in code** (`src/render/textures.ts`, Phaser `Graphics` → generated textures). System fonts only. No third-party art assets. | No copyright risk; easy to replace with an original art pack later. |
| D9 | **Vitest** for unit tests (`tests/`), **Playwright (Chromium, phone portrait + landscape emulation)** for browser tests (`e2e/`). | Fast pure-logic tests plus a real-browser check for leaks, layout fit, and console errors. |
| D10 | **Debug handle** `window.__SMR__` exposed only in dev or with `?debug` in the URL; reports canvas count, active scenes, listener totals, and layout bounds. | Lets browser tests and humans verify there are no leaks without shipping debug UI. |
| D11 | **Build stamp:** `__APP_VERSION__` and `__BUILD_SHA__` are injected at build time (from `CF_PAGES_COMMIT_SHA`, `GITHUB_SHA`, or `git rev-parse HEAD`) and shown in the start-screen footer. | Lets a future deploy prove which commit is being served. |
| D12 | **GitHub Actions CI** (`.github/workflows/ci.yml`) runs type check, unit tests, production build, and browser tests on every push and pull request. | Every change is verified the same way. |
| D13 | **Hosting: Cloudflare Pages (planned, not configured yet).** | Static hosting with per-commit preview deploys. |
