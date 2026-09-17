# Validation and original/reconstruction comparison

EXACT: recorded local test observations below. HIGH CONFIDENCE: equivalence within those tested states. UNKNOWN: untested real-backend/remote-content behavior. Final local verification: 2026-09-14T15:24:57.133Z; v24.21.0, Windows, installed Google Chrome.

| Check | Result |
| --- | --- |
| npm install / dependency resolution | PASS; package-lock.json present; npm ls --depth=0 clean |
| Development server | PASS; actual http://127.0.0.1:5174/ home and registration checked |
| Production build | PASS; 82 transformed modules; output confined to frontend_reconstructed/build |
| Unit/contract tests | 40/40 passed, 0 failures |
| Base route/role/responsive snapshots | 212/212 matched |
| Runtime-discovered query/detail snapshots | 129/129 matched |
| Interaction workflows | 20/20 passed (39 original/rebuilt executions) |
| Paired full-page screenshots | 28; no dimension mismatches; maximum differing-pixel ratio 0.0980% |
| Copied assets | 8/8 SHA-256 matches |
| CSS | Original and source are identical after the same CSS formatter; rules/order/values preserved |
| Original evidence | 18 files, 8381419 bytes; baseline hashes unchanged |
| Uncaught page errors in final comparison/workflow runs | 0 |
| Horizontal overflow in tested route/viewport matrix | None on either original or rebuilt output |

## Route and visual method

The 51 recovered hash keys are each visited anonymously and as student, teacher and admin (204 checks), with eight additional mobile checks. Another 129 detail/query views are discovered from original runtime links to depth two: 5 student, 10 teacher, 114 admin. This covers edit/preview/detail/filter/panel variants that bare hashes alone cannot exercise. Unknown-record, forbidden and default-content states remain faithful to the original.

Snapshots compare normalized visible root text, headings, literal link targets, form structures and field values/required/disabled flags, image paths/loading, route state and horizontal overflow. Screenshots cover public screens and representative authenticated dashboards/management screens at 1440 × 1000 and 390 × 844 viewports (full page heights vary).

Both sides run with identical intercepted API fixtures, locale fr-FR, timezone Africa/Tunis, fixed time and deterministic test-only entropy. External resources such as the Google Maps iframe are blocked; this limits the comparison to available evidence. Images are decoded before capture, scrolling is stabilized and screenshot animations disabled. These controls do not modify production source.

27 of 28 screenshot pairs contain no pixels exceeding a 12-level maximum RGBA-channel difference. The desktop anonymous home screenshot has a 0.0980% differing-pixel ratio, concentrated in the hero/image region, with identical dimensions and DOM snapshot. This small rendering residual is recorded, not misrepresented as universal pixel identity. Full-resolution paired PNGs and per-screenshot counts remain under forensics/validation/.

## Interaction coverage

| Workflow | Role | Result |
| --- | --- | --- |
| mobile menu, dropdown and navigation | anonymous | PASS |
| public details disclosure | anonymous | PASS |
| route aliases and unknown-route fallback | anonymous | PASS |
| invalid login, student login, sidebar, logout | anonymous | PASS |
| teacher login redirect | anonymous | PASS |
| admin login redirect | anonymous | PASS |
| registration constraints and request payload | anonymous | PASS |
| activation token capture, validation, completion | anonymous | PASS |
| profile update and password validation | student | PASS |
| level add, edit, delete and save | admin | PASS |
| group add, edit, delete and save | admin | PASS |
| table search and pagination | admin | PASS |
| exam builder, submit answers and score persistence | student | PASS |
| questionnaire completion and duplicate-submit state | student | PASS |
| exam question add/remove controls | admin | PASS |
| spreadsheet import and activation requests (intercepted) | admin | PASS |
| email settings form and same-origin save (intercepted) | admin | PASS |
| Zoom creation and hidden-field binding (intercepted) | admin | PASS |
| original Excel template download bytes | admin | PASS |
| repaired attachment removal and course save | admin | PASS |

Nineteen workflows execute on both original and reconstructed builds. The twentieth is reconstructed-only because it exercises the explicitly documented missing-JSON-helper repair. That test validates actual persisted attachment state, including the original no-files placeholder. The other tests include validation rejection paths as well as successful navigation/submission.

## Unit coverage

25 original-vs-recovered pure-helper equivalence tests cover audience matching, identifiers, roles/payments, passwords, import normalization, scores, escaping/URLs, CSV cells and exam availability. Additional tests account for all 680 mapped functions, validate the inferred JSON helper and compare workbook parsing against the original bundled SheetJS reader. Twelve GET/POST contract cases compare success, error precedence, non-JSON errors and empty responses against original helper bodies, including same-origin credentials and transmitted options.

## Evidence and reproducibility

- forensics/validation/final-verification.json — aggregate results and commands
- forensics/validation/unit-tests.log — 40-test TAP output
- forensics/validation/production-build.log — complete final Vite build output
- forensics/validation/route-comparison.json — 212 snapshots and 28 screenshot metrics
- forensics/validation/detail-comparison.json — 129 query views and dev-server check
- forensics/validation/interaction-report.json — all 20 final workflows
- forensics/dist-sha256.json — original evidence baseline

Run commands and prerequisites are in README.md. Reports describe final runs, not early selector/fixture corrections made while developing the tests.

## Remaining limits

UNKNOWN: live backend authentication, database permissions/state, email delivery, Zoom service access, remote media and absent uploaded files. The test fixture is deliberately not a production backend. Browser coverage is substantial but not an exhaustive proof of every data combination, timer duration or browser family. Printing/report generation source and missing-logo references were recovered; physical printer behavior and all generated-report layouts were not exhaustively validated. Vite reports a non-fatal >500 kB chunk warning because the preserved lazy application includes spreadsheet support. Original source maps are absent; newly generated build maps refer only to the reconstruction.
