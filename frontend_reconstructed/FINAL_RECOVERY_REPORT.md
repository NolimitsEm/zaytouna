# Frontend recovery report

Post-recovery update (2026-09-14): this report records the original reconstruction baseline. Requested backend/frontend bug fixes were applied afterward; current behavior and validation are documented in [BACKEND_FRONTEND_FIXES.md](docs/BACKEND_FRONTEND_FIXES.md).

Reconstructed project: C:\Users\hp\Music\zaytouna\frontend_reconstructed

Evidence: C:\Users\hp\Music\zaytouna\dist — strictly read-only. EXACT: all 18 file hashes still match the initial baseline. No previous frontend/backend project code was reused.

## Outcome

A runnable source project is implemented, installed, built and compared against the surviving production app. It contains 54 source files, including 46 mapped application domain modules, a readable React shell and preserved CSS/assets. All 40 unit tests, 341 route/detail snapshots and 20 interaction workflows pass. There are no uncaught page errors in the final isolated browser runs.

This is a HIGH CONFIDENCE behavioral reconstruction, not falsely labeled exact original source. Original source names, comments/types and most package versions remain UNKNOWN. No original source maps exist.

## 1. Framework

EXACT: React and ReactDOM 19.2.8 version literals. HIGH CONFIDENCE: React owns the persistent app/header shell; the lazy application uses native DOM templates, delegated events and shared state. That hybrid architecture is retained.

## 2. Build tool

HIGH CONFIDENCE: Vite signatures and preload behavior. UNKNOWN: original Vite version/configuration. INFERRED: reconstruction pins Vite 7.3.1, builds only to build/ and generates source maps for the new readable modules.

## 3. Bundles analyzed

EXACT: all eight surviving JS files, one CSS file and index.html were inspected, with separate readable analysis artifacts.

- index-Bgp60kJC.js — ACTIVE
- index-BpsoARiZ.js — inactive from current HTML
- index-CgL810mR.js — inactive from current HTML
- index-n9OLsKfI.js — inactive from current HTML
- legacyApp-Cum0wzIn.js — ACTIVE
- legacyApp-DC3euCG1.js — inactive from current HTML
- legacyApp-yxETG9Cp.js — inactive from current HTML
- legacyApp-zwsQ_H0a.js — inactive from current HTML

The current HTML selects index-Bgp60kJC.js → legacyApp-Cum0wzIn.js and index-D7j9Kx6Z.css. Alternate bundles were not silently merged into active behavior. Framework/spreadsheet vendor internals are replaced by package imports, not dumped into source.

## 4. Assets analyzed

EXACT: 18 files totaling 8381419 bytes: 8 JS, 1 CSS, 1 HTML, 7 image files and 1 XLSX. All eight non-code assets were copied byte-for-byte; duplicate logos were identified. Three .png-named files contain JPEG data; original paths and bytes remain untouched. See docs/ASSET_MAP.md and docs/ASSET_USAGE.md for dimensions and component use.

## 5. Brand files

EXACT: brand/ is absent. Surviving production logos, institutional identity, colors and motifs are documented from assets/ and CSS. No replacement identity or redesign was introduced.

## 6. Brand concepts

EXACT: brand-concepts/ is absent. No unreferenced concept artwork was invented or inserted. Its absence is explicitly reported in docs/BRAND_CONCEPTS_ANALYSIS.md.

## 7. Routes recovered

EXACT: 51 hash-route keys and four aliases. Routes include public institution pages, account/activation/profile, courses/lessons, exams, questionnaires, three role dashboards, user/catalog/schedule management, grades/bulletins, logs and analytics. Native query/reference handling, guards and unknown-route home fallback are retained. docs/ROUTE_MAP.md maps every key and evidence position.

## 8. Pages reconstructed

HIGH CONFIDENCE: every recovered route handler is implemented in 11 domain page modules, with shared layouts/components. Dynamic record views and query panels were additionally exercised through 129 original-runtime links. Unknown backend records and unavailable content are not replaced by fabricated production data.

## 9. Components reconstructed

EXACT accounting: 680 surviving application functions map once each into 46 modules; 75 state bindings are mapped explicitly. INFERRED names/boundaries organize navigation/footer, cards, tables, filters, forms, file viewers, question builders, grading/report templates, toasts, galleries and actions. The React Header and App are readable JSX. See docs/UI_COMPONENT_MAP.md and docs/RECOVERY_METHOD.md.

## 10. API endpoints

EXACT: 17 call sites across 16 same-origin paths, using native fetch. GET and POST /api/app-state share one path. A clean HTTP/services layer preserves request fields, credentials, response access and error handling. Full evidence is in docs/API_MAP.md; readable payloads are in docs/API_CONTRACTS.md. No backend endpoints were invented.

## 11. Dependencies

EXACT React/ReactDOM versions are pinned. HIGH CONFIDENCE SheetJS identity; its exact original version is UNKNOWN. INFERRED xlsx 0.18.5 is the compatibility choice, validated against the original reader on the surviving workbook, not claimed as the latest version. Babel/Prettier are reconstruction tools; Playwright/pngjs are comparison tools; Vite is build tooling. Every direct dependency is justified in docs/DEPENDENCY_ANALYSIS.md. package-lock.json and clean npm ls output verify resolution.

## 12. Authentication

EXACT: login/logout, session restoration, role guards, account updates, password validation/verification and activation invite/completion flows. HIGH CONFIDENCE: cookie-backed same-origin session design. UNKNOWN: cookie attributes, server policy and actual live credentials. No JWT/refresh-token library is evidenced. Browser tests use isolated fixtures; real email, meetings and database mutations were not performed.

## 13. Text and styles

EXACT: original Arabic/French/English literals are retained; 1,419 distinct Arabic-bearing/shell text candidates are cataloged and full unfiltered strings from all bundles are available in analysis JSON. Markup fragments are labeled as such. The recovered stylesheet matches the original after identical formatting, preserving rule order and values. All copied asset hashes match. No typography/spacing/color redesign was made.

## 14. Exact versus inferred code

EXACT: literal values, routes/paths, surviving asset bytes, stylesheet semantics and evidence references. HIGH CONFIDENCE: reconstructed runtime behavior. INFERRED: source organization/descriptive names, build configuration and shared-state representation. UNKNOWN: lost original module files/types/comments. The only intentional behavior repair supplies the missing safeJsonParse helper at its three existing call sites; it is documented and tested. exact_recovered_sources contains no fabricated originals.

## 15. Missing and uncertain items

- UNKNOWN original source maps/names, Vite/SheetJS exact versions and build-time environment names.
- EXACT missing print logos: assets/email-signature-logo-1.png and assets/email-signature-logo-2.png; no substitute assets were invented.
- UNKNOWN real backend content, authorization, SMTP/Zoom configuration and private/remote uploads. Public local preview is available; backend-dependent actions need the actual same-origin API.
- EXACT original demo records/admin seeding remain. Review them before attaching this frontend to a live database.
- HIGH CONFIDENCE visual fidelity on this machine: 28 screenshot pairs, identical dimensions; maximum differing-pixel ratio 0.0980% with a 12-level RGBA threshold. This is not a claim of universal pixel identity.
- UNKNOWN exhaustive printer/report output, all browser families and all possible data/timing combinations.
- Non-fatal build warning: the lazy application/spreadsheet chunk exceeds 500 kB. Fidelity-preserving source reconstruction was prioritized; no unsupported feature split was imposed.

## 16. Build and validation status

PASS: dependency install, npm run dev and npm run build. Final build emits index.html, one CSS file, two JS chunks, their new maps and copied assets. PASS: 40 unit/contract tests; 212 base-route/role/mobile snapshots; 129 query-detail snapshots; 20 workflows (39 original/rebuilt executions); 28 screenshot pairs with no dimension mismatch. Original evidence hashes are unchanged.

See docs/VALIDATION_REPORT.md and forensics/validation/final-verification.json for methods, raw reports and limitations. Test mocks/clock/entropy overrides are never imported into production source.

## 17. Run commands

```powershell
cd C:\Users\hp\Music\zaytouna\frontend_reconstructed
npm.cmd install
npm.cmd run dev
# Open http://127.0.0.1:5174/
npm.cmd run build
npm.cmd run preview
# Open http://127.0.0.1:4174/
```

Use npm.cmd on this machine because PowerShell blocks npm.ps1. For a real backend, configure the explicitly INFERRED optional BACKEND_ORIGIN development proxy described in README.md/.env.example, or serve /api on the same production origin. No backend port/credentials are guessed.

## 18. Final project tree

Source, public assets, docs, tests and tools are listed below. Generated dependency/cache/build contents and verbose forensic artifacts are summarized.

```text
frontend_reconstructed/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── tables.js
│   │   │   └── toasts.js
│   │   ├── bulletins.js
│   │   ├── content-management.js
│   │   ├── question-builders.js
│   │   └── teaching.js
│   ├── context/
│   │   └── state.js
│   ├── controllers/
│   │   ├── actions.js
│   │   ├── exam-session.js
│   │   ├── filters.js
│   │   └── forms.js
│   ├── data/
│   │   └── defaults.js
│   ├── layouts/
│   │   ├── footer.js
│   │   ├── Header.jsx
│   │   └── navigation.js
│   ├── pages/
│   │   ├── account.js
│   │   ├── activity.js
│   │   ├── assessment-management.js
│   │   ├── assessments.js
│   │   ├── catalogs.js
│   │   ├── dashboards.js
│   │   ├── grades.js
│   │   ├── lessons.js
│   │   ├── public.js
│   │   ├── schedule.js
│   │   └── users.js
│   ├── routes/
│   │   └── router.js
│   ├── runtime/
│   │   └── bootstrap.js
│   ├── services/
│   │   ├── account-actions.js
│   │   ├── account-import.js
│   │   ├── attachments.js
│   │   ├── auth.js
│   │   ├── catalog-management.js
│   │   ├── exam-timing.js
│   │   ├── exports.js
│   │   ├── http.js
│   │   ├── polling.js
│   │   ├── public-content.js
│   │   ├── results.js
│   │   ├── schedule-management.js
│   │   ├── settings-and-activity.js
│   │   ├── state-repository.js
│   │   ├── teaching-management.js
│   │   ├── user-management.js
│   │   └── zoom.js
│   ├── styles/
│   │   └── production.css
│   ├── utils/
│   │   ├── audience.js
│   │   ├── calendar.js
│   │   ├── content-access.js
│   │   ├── formatters.js
│   │   ├── identifiers.js
│   │   └── json.js
│   ├── App.jsx
│   └── main.jsx
├── public/
│   ├── assets/
│   │   ├── bulletin-header-left.png
│   │   ├── bulletin-header-right.png
│   │   ├── bulletin-signature.png
│   │   ├── islamic-pattern.png
│   │   ├── main-logo.png
│   │   ├── platform-logo-full.png
│   │   └── platform-logo-mark.png
│   └── templates/
│       └── exemple-import-comptes.xlsx
├── docs/
│   ├── ACCOUNT_IMPORT_TEMPLATE.md
│   ├── API_CONTRACTS.md
│   ├── API_MAP.md
│   ├── ASSET_MAP.md
│   ├── ASSET_USAGE.md
│   ├── AUTH_FLOW.md
│   ├── BRAND_ANALYSIS.md
│   ├── BRAND_CONCEPTS_ANALYSIS.md
│   ├── BUNDLE_ANALYSIS.md
│   ├── DEPENDENCY_ANALYSIS.md
│   ├── DIST_INVENTORY.md
│   ├── ENVIRONMENT.md
│   ├── INDEX_ANALYSIS.md
│   ├── RECOVERY_METHOD.md
│   ├── ROUTE_MAP.md
│   ├── SOURCE_MAP_REPORT.md
│   ├── STYLE_ANALYSIS.md
│   ├── TEXT_CATALOG.md
│   ├── UI_COMPONENT_MAP.md
│   ├── UNCERTAINTIES.md
│   └── VALIDATION_REPORT.md
├── tests/
│   ├── compare-browser.mjs
│   ├── detail-browser.mjs
│   ├── http.test.mjs
│   ├── interactions-browser.mjs
│   ├── recovery.test.mjs
│   ├── smoke-browser.mjs
│   └── support.mjs
├── tools/
│   ├── analyze.mjs
│   ├── app-summary.mjs
│   ├── document.mjs
│   ├── final-report.mjs
│   ├── final-verify.mjs
│   ├── inventory.mjs
│   ├── peek.mjs
│   ├── reconstruct.mjs
│   └── semantic-names.mjs
├── forensics/
│   ├── beautified_bundles/  (8 JS + 1 CSS analysis copies)
│   ├── validation/         (JSON reports, logs and paired screenshots)
│   ├── dist-sha256.json
│   ├── inventory.json
│   ├── symbol-map.json
│   ├── state-map.json
│   └── other per-bundle/API/text/asset analysis JSON and declaration catalogs
├── exact_recovered_sources/README.md  (no original sources found)
├── build/                  (verified generated output, not original dist)
├── node_modules/           (installed dependencies)
├── .npm-cache/             (project-local npm cache)
├── .env.example
├── .gitignore
├── .npmrc
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── README.md
└── FINAL_RECOVERY_REPORT.md
```
