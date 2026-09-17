# مشيخة التعليم الزيتوني وفروعه — reconstructed frontend

A readable, runnable reconstruction from the surviving production build. The original `../dist` is read-only evidence; this project builds into its own `build/` directory.

## Post-recovery fixes — 2026-09-14

The requested schedule/student-picker and account/reactivation/login fixes are implemented in both this frontend and `../backend`. See [the fix and integration report](docs/BACKEND_FRONTEND_FIXES.md). The original forensic comparison reports describe the pre-fix recovery baseline, not a claim that these intentionally changed screens still match the buggy original.

The subsequent [review](docs/REVIEW_REPORT_2026-09-15.md) found seven issues. The [lesson/Zoom repair report](docs/LESSON_ZOOM_FIXES_2026-09-15.md) documents their fixes, lesson edit/save regressions, fresh Zoom host links, recording access, tests, and coordinated frontend/backend deployment. Read the [Zoom classroom defaults and annotation limitations](docs/ZOOM_CLASSROOM_DEFAULTS.md) before using a live Zoom account.

For local development, configure the documented backend proxy origin (normally `http://127.0.0.1:3001`) and start `npm.cmd run dev` inside `../backend` and this folder in separate terminals. Backend development mode binds only to loopback and permits local HTTP cookies; `npm.cmd start` retains production settings. The real MySQL connection must work first. Current verification uses isolated repositories and does not establish live database or Zoom health. No credentials or real user data were changed.

Current regression commands: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:interactions`, `npm.cmd run test:integration`, and `npm.cmd test` from `../backend`. The older `test:browser`/`test:details` commands are strict comparisons against the surviving original and may report the intentional schedule/account differences. Do not run the reconstruction generator over the fixed source.

## Run locally

Tested with Node 24.21.0 and npm 11.19.0 on Windows. Use `npm.cmd` in PowerShell if execution policy blocks `npm.ps1`.

```powershell
cd C:\Users\hp\Music\zaytouna\frontend_reconstructed
npm.cmd install
npm.cmd run dev
```

Open <http://127.0.0.1:5174/>. Stop the development server with Ctrl+C. Do not start a second copy on that same port.

```powershell
npm.cmd run build
npm.cmd run preview
```

The preview serves `build/` at <http://127.0.0.1:4174/>. The build includes new source maps for this reconstruction; they are not recovered original maps.

## Backend connection

EXACT: the application calls same-origin `/api/` endpoints. No backend implementation, login bypass or mock service is bundled into the application. Public pages work without a backend; real login, saved state, email and Zoom require the original backend contract.

For development only, copy `.env.example` to `.env.local` and set `BACKEND_ORIGIN` to the actual backend origin if known. This optional proxy setting is INFERRED, not a recovered environment variable. There is no invented default port. Production hosting must route `/api/` to the real server on the same origin. Do not enter real SMTP credentials into an untrusted test environment.

Surviving demo records and admin initialization behavior are preserved. They do not prove real accounts or credentials. An authenticated admin session can trigger the original demo-seeding/state-save behavior: review it before connecting this recovered frontend to a live database.

## What is recovered

- EXACT: surviving literal text, markup values, CSS rules and copied asset bytes; active bundle selection; 51 hash-route keys, four aliases and 16 API paths.
- HIGH CONFIDENCE: equivalent application behavior, supported by original/rebuilt browser comparisons and unit tests.
- INFERRED: descriptive source/module names, shared-state organization, build configuration and the narrowly scoped missing `safeJsonParse` repair.
- UNKNOWN: lost original source files, comments/types and most original package versions. No original source maps survive. `brand/` and `brand-concepts/` are absent; two referenced print-logo files are also missing.

See [the final report](FINAL_RECOVERY_REPORT.md), [validation results](docs/VALIDATION_REPORT.md), [uncertainties](docs/UNCERTAINTIES.md) and [maintenance notes](docs/RECOVERY_METHOD.md).

## Source organization

React owns `App.jsx` and the persistent `Header.jsx`. The recovered application uses imperative DOM templates and a native hash router; it was not silently converted into a different SPA architecture.

- `src/pages/`, `src/components/`, `src/layouts/`: route views and shared markup.
- `src/routes/router.js`: route table, guards, aliases and private entity references.
- `src/controllers/`: delegated forms, click actions, filters and exam interactions.
- `src/services/`: fetch helpers, persistence, authentication, imports, teaching workflows, exports and Zoom integration.
- `src/context/state.js`, `src/data/defaults.js`: explicit shared state and surviving literals.
- `src/runtime/bootstrap.js`: original initialization order, listeners and timer management.
- `src/styles/production.css`, `public/`: preserved styling and copied surviving assets.

Every recovered application function includes its original bundle symbol and UTF-16 source offsets. `forensics/symbol-map.json` maps all 680 functions; `forensics/state-map.json` maps 75 state bindings.

## Verify

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
npm.cmd run test:interactions
npm.cmd run test:details
npm.cmd run verify:evidence
```

Browser tests require installed Google Chrome. They use isolated headless profiles, block external resources and intercept `/api/`; they never authenticate against a real backend or send real email. `test:details` also checks the development server, so leave `npm.cmd run dev` running in another terminal. Comparison servers use loopback ports 4175–4180 and close automatically. Run browser suites sequentially on this machine for reproducible screenshots.

Reports and paired screenshots are under `forensics/validation/`. Fixed clock, seeded randomness and blocked external resources exist only in test contexts, never production source.

## Forensic tools

`npm.cmd run forensics:inventory` rechecks all original hashes. `npm.cmd run forensics:analyze` parses every surviving bundle into analysis artifacts. `tools/document.mjs` regenerates evidence reports; `tools/reconstruct.mjs` is the provenance-aware reconstruction generator.

Do not rerun `tools/reconstruct.mjs` over subsequent hand edits without a backup: it regenerates mapped source modules from the evidence. The application does not depend on those tools or the beautified bundle copies at runtime. No generated application code imports a production bundle.
