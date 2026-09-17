import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const write=(file,text)=>fs.writeFileSync(path.join(root,file),text);
const v=read('forensics/validation/final-verification.json');
const routes=read('forensics/validation/route-comparison.json');
const interactions=read('forensics/validation/interaction-report.json');
const inventory=read('forensics/inventory.json');
const symbols=read('forensics/symbol-map.json');
const percent=(100*v.maximumScreenshotDifferenceRatio).toFixed(4);
const bullets=items=>items.map(s=>'- '+s).join('\n');
const table=(head,rows)=>'| '+head.join(' | ')+' |\n| '+head.map(()=> '---').join(' | ')+' |\n'+rows.map(r=>'| '+r.join(' | ')+' |').join('\n');
write('docs/VALIDATION_REPORT.md',`# Validation and original/reconstruction comparison

EXACT: recorded local test observations below. HIGH CONFIDENCE: equivalence within those tested states. UNKNOWN: untested real-backend/remote-content behavior. Final local verification: ${v.checkedAt}; ${v.node}, Windows, installed Google Chrome.

${table(['Check','Result'],[
 ['npm install / dependency resolution','PASS; package-lock.json present; npm ls --depth=0 clean'],
 ['Development server','PASS; actual http://127.0.0.1:5174/ home and registration checked'],
 ['Production build','PASS; 82 transformed modules; output confined to frontend_reconstructed/build'],
 ['Unit/contract tests',`${v.unitTests}/${v.unitTests} passed, ${v.unitFailures} failures`],
 ['Base route/role/responsive snapshots',`${v.baseRouteComparisons}/${v.baseRouteComparisons} matched`],
 ['Runtime-discovered query/detail snapshots',`${v.detailComparisons}/${v.detailComparisons} matched`],
 ['Interaction workflows',`${v.testedWorkflowCases}/${v.testedWorkflowCases} passed (${v.workflowExecutions} original/rebuilt executions)`],
 ['Paired full-page screenshots',`${v.screenshotPairs}; no dimension mismatches; maximum differing-pixel ratio ${percent}%`],
 ['Copied assets',`${v.copiedAssets.length}/${v.copiedAssets.length} SHA-256 matches`],
 ['CSS','Original and source are identical after the same CSS formatter; rules/order/values preserved'],
 ['Original evidence',`${v.originalEvidence.files} files, ${v.originalEvidence.totalBytes} bytes; baseline hashes unchanged`],
 ['Uncaught page errors in final comparison/workflow runs','0'],
 ['Horizontal overflow in tested route/viewport matrix','None on either original or rebuilt output'],
])}

## Route and visual method

The 51 recovered hash keys are each visited anonymously and as student, teacher and admin (204 checks), with eight additional mobile checks. Another 129 detail/query views are discovered from original runtime links to depth two: 5 student, 10 teacher, 114 admin. This covers edit/preview/detail/filter/panel variants that bare hashes alone cannot exercise. Unknown-record, forbidden and default-content states remain faithful to the original.

Snapshots compare normalized visible root text, headings, literal link targets, form structures and field values/required/disabled flags, image paths/loading, route state and horizontal overflow. Screenshots cover public screens and representative authenticated dashboards/management screens at 1440 × 1000 and 390 × 844 viewports (full page heights vary).

Both sides run with identical intercepted API fixtures, locale fr-FR, timezone Africa/Tunis, fixed time and deterministic test-only entropy. External resources such as the Google Maps iframe are blocked; this limits the comparison to available evidence. Images are decoded before capture, scrolling is stabilized and screenshot animations disabled. These controls do not modify production source.

${v.screenshotPairsWithNoDifferencesAboveThreshold} of ${v.screenshotPairs} screenshot pairs contain no pixels exceeding a 12-level maximum RGBA-channel difference. The desktop anonymous home screenshot has a ${percent}% differing-pixel ratio, concentrated in the hero/image region, with identical dimensions and DOM snapshot. This small rendering residual is recorded, not misrepresented as universal pixel identity. Full-resolution paired PNGs and per-screenshot counts remain under forensics/validation/.

## Interaction coverage

${table(['Workflow','Role','Result'],interactions.tests.map(t=>[t.name,t.role,t.pass?'PASS':'FAIL']))}

Nineteen workflows execute on both original and reconstructed builds. The twentieth is reconstructed-only because it exercises the explicitly documented missing-JSON-helper repair. That test validates actual persisted attachment state, including the original no-files placeholder. The other tests include validation rejection paths as well as successful navigation/submission.

## Unit coverage

25 original-vs-recovered pure-helper equivalence tests cover audience matching, identifiers, roles/payments, passwords, import normalization, scores, escaping/URLs, CSV cells and exam availability. Additional tests account for all 680 mapped functions, validate the inferred JSON helper and compare workbook parsing against the original bundled SheetJS reader. Twelve GET/POST contract cases compare success, error precedence, non-JSON errors and empty responses against original helper bodies, including same-origin credentials and transmitted options.

## Evidence and reproducibility

${bullets(['forensics/validation/final-verification.json — aggregate results and commands','forensics/validation/unit-tests.log — 40-test TAP output','forensics/validation/production-build.log — complete final Vite build output','forensics/validation/route-comparison.json — 212 snapshots and 28 screenshot metrics','forensics/validation/detail-comparison.json — 129 query views and dev-server check','forensics/validation/interaction-report.json — all 20 final workflows','forensics/dist-sha256.json — original evidence baseline'])}

Run commands and prerequisites are in README.md. Reports describe final runs, not early selector/fixture corrections made while developing the tests.

## Remaining limits

UNKNOWN: live backend authentication, database permissions/state, email delivery, Zoom service access, remote media and absent uploaded files. The test fixture is deliberately not a production backend. Browser coverage is substantial but not an exhaustive proof of every data combination, timer duration or browser family. Printing/report generation source and missing-logo references were recovered; physical printer behavior and all generated-report layouts were not exhaustively validated. Vite reports a non-fatal >500 kB chunk warning because the preserved lazy application includes spreadsheet support. Original source maps are absent; newly generated build maps refer only to the reconstruction.
`);

const roots=['src','public','docs','tests','tools'];
function tree(directory,prefix=''){
 const entries=fs.readdirSync(path.join(root,directory),{withFileTypes:true}).sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name));
 return entries.flatMap((e,i)=>{const last=i===entries.length-1;const line=prefix+(last?'└── ':'├── ')+e.name+(e.isDirectory()?'/':'');return e.isDirectory()?[line,...tree(path.join(directory,e.name),prefix+(last?'    ':'│   '))]:[line];});
}
const projectTree=['frontend_reconstructed/'];
for(const dir of roots){projectTree.push('├── '+dir+'/');projectTree.push(...tree(dir,'│   '));}
projectTree.push('├── forensics/','│   ├── beautified_bundles/  (8 JS + 1 CSS analysis copies)','│   ├── validation/         (JSON reports, logs and paired screenshots)','│   ├── dist-sha256.json','│   ├── inventory.json','│   ├── symbol-map.json','│   ├── state-map.json','│   └── other per-bundle/API/text/asset analysis JSON and declaration catalogs','├── exact_recovered_sources/README.md  (no original sources found)','├── build/                  (verified generated output, not original dist)','├── node_modules/           (installed dependencies)','├── .npm-cache/             (project-local npm cache)','├── .env.example','├── .gitignore','├── .npmrc','├── index.html','├── package.json','├── package-lock.json','├── vite.config.js','├── README.md','└── FINAL_RECOVERY_REPORT.md');
write('FINAL_RECOVERY_REPORT.md',`# Frontend recovery report

Reconstructed project: C:\\Users\\hp\\Music\\zaytouna\\frontend_reconstructed

Evidence: C:\\Users\\hp\\Music\\zaytouna\\dist — strictly read-only. EXACT: all 18 file hashes still match the initial baseline. No previous frontend/backend project code was reused.

## Outcome

A runnable source project is implemented, installed, built and compared against the surviving production app. It contains ${v.sourceFiles} source files, including ${v.sourceModulesWithRecoveredFunctions} mapped application domain modules, a readable React shell and preserved CSS/assets. All ${v.unitTests} unit tests, ${v.baseRouteComparisons+v.detailComparisons} route/detail snapshots and ${v.testedWorkflowCases} interaction workflows pass. There are no uncaught page errors in the final isolated browser runs.

This is a HIGH CONFIDENCE behavioral reconstruction, not falsely labeled exact original source. Original source names, comments/types and most package versions remain UNKNOWN. No original source maps exist.

## 1. Framework

EXACT: React and ReactDOM 19.2.8 version literals. HIGH CONFIDENCE: React owns the persistent app/header shell; the lazy application uses native DOM templates, delegated events and shared state. That hybrid architecture is retained.

## 2. Build tool

HIGH CONFIDENCE: Vite signatures and preload behavior. UNKNOWN: original Vite version/configuration. INFERRED: reconstruction pins Vite 7.3.1, builds only to build/ and generates source maps for the new readable modules.

## 3. Bundles analyzed

EXACT: all eight surviving JS files, one CSS file and index.html were inspected, with separate readable analysis artifacts.

${bullets(inventory.filter(f=>f.extension==='.js').map(f=>f.filename+(f.filename==='index-Bgp60kJC.js'||f.filename==='legacyApp-Cum0wzIn.js'?' — ACTIVE':' — inactive from current HTML')))}

The current HTML selects index-Bgp60kJC.js → legacyApp-Cum0wzIn.js and index-D7j9Kx6Z.css. Alternate bundles were not silently merged into active behavior. Framework/spreadsheet vendor internals are replaced by package imports, not dumped into source.

## 4. Assets analyzed

EXACT: 18 files totaling ${v.originalEvidence.totalBytes} bytes: 8 JS, 1 CSS, 1 HTML, 7 image files and 1 XLSX. All eight non-code assets were copied byte-for-byte; duplicate logos were identified. Three .png-named files contain JPEG data; original paths and bytes remain untouched. See docs/ASSET_MAP.md and docs/ASSET_USAGE.md for dimensions and component use.

## 5. Brand files

EXACT: brand/ is absent. Surviving production logos, institutional identity, colors and motifs are documented from assets/ and CSS. No replacement identity or redesign was introduced.

## 6. Brand concepts

EXACT: brand-concepts/ is absent. No unreferenced concept artwork was invented or inserted. Its absence is explicitly reported in docs/BRAND_CONCEPTS_ANALYSIS.md.

## 7. Routes recovered

EXACT: 51 hash-route keys and four aliases. Routes include public institution pages, account/activation/profile, courses/lessons, exams, questionnaires, three role dashboards, user/catalog/schedule management, grades/bulletins, logs and analytics. Native query/reference handling, guards and unknown-route home fallback are retained. docs/ROUTE_MAP.md maps every key and evidence position.

## 8. Pages reconstructed

HIGH CONFIDENCE: every recovered route handler is implemented in 11 domain page modules, with shared layouts/components. Dynamic record views and query panels were additionally exercised through 129 original-runtime links. Unknown backend records and unavailable content are not replaced by fabricated production data.

## 9. Components reconstructed

EXACT accounting: ${symbols.length} surviving application functions map once each into ${v.sourceModulesWithRecoveredFunctions} modules; 75 state bindings are mapped explicitly. INFERRED names/boundaries organize navigation/footer, cards, tables, filters, forms, file viewers, question builders, grading/report templates, toasts, galleries and actions. The React Header and App are readable JSX. See docs/UI_COMPONENT_MAP.md and docs/RECOVERY_METHOD.md.

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

${bullets(['UNKNOWN original source maps/names, Vite/SheetJS exact versions and build-time environment names.','EXACT missing print logos: assets/email-signature-logo-1.png and assets/email-signature-logo-2.png; no substitute assets were invented.','UNKNOWN real backend content, authorization, SMTP/Zoom configuration and private/remote uploads. Public local preview is available; backend-dependent actions need the actual same-origin API.','EXACT original demo records/admin seeding remain. Review them before attaching this frontend to a live database.','HIGH CONFIDENCE visual fidelity on this machine: 28 screenshot pairs, identical dimensions; maximum differing-pixel ratio '+percent+'% with a 12-level RGBA threshold. This is not a claim of universal pixel identity.','UNKNOWN exhaustive printer/report output, all browser families and all possible data/timing combinations.','Non-fatal build warning: the lazy application/spreadsheet chunk exceeds 500 kB. Fidelity-preserving source reconstruction was prioritized; no unsupported feature split was imposed.'])}

## 16. Build and validation status

PASS: dependency install, npm run dev and npm run build. Final build emits index.html, one CSS file, two JS chunks, their new maps and copied assets. PASS: ${v.unitTests} unit/contract tests; ${v.baseRouteComparisons} base-route/role/mobile snapshots; ${v.detailComparisons} query-detail snapshots; ${v.testedWorkflowCases} workflows (${v.workflowExecutions} original/rebuilt executions); 28 screenshot pairs with no dimension mismatch. Original evidence hashes are unchanged.

See docs/VALIDATION_REPORT.md and forensics/validation/final-verification.json for methods, raw reports and limitations. Test mocks/clock/entropy overrides are never imported into production source.

## 17. Run commands

\`\`\`powershell
cd C:\\Users\\hp\\Music\\zaytouna\\frontend_reconstructed
npm.cmd install
npm.cmd run dev
# Open http://127.0.0.1:5174/
npm.cmd run build
npm.cmd run preview
# Open http://127.0.0.1:4174/
\`\`\`

Use npm.cmd on this machine because PowerShell blocks npm.ps1. For a real backend, configure the explicitly INFERRED optional BACKEND_ORIGIN development proxy described in README.md/.env.example, or serve /api on the same production origin. No backend port/credentials are guessed.

## 18. Final project tree

Source, public assets, docs, tests and tools are listed below. Generated dependency/cache/build contents and verbose forensic artifacts are summarized.

\`\`\`text
${projectTree.join('\n')}
\`\`\`
`);
console.log(JSON.stringify({finalReport:true,validationReport:true,routeSnapshots:v.baseRouteComparisons+v.detailComparisons,workflowCases:interactions.tests.length},null,2));
