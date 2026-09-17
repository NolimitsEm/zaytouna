# Recovery method and maintenance

## Evidence boundary

EXACT: only `../dist` supplied application evidence. All 18 surviving files were read and SHA-256 inventoried, including all eight JS bundles. The backend directory and previous reconstruction sources were not reused. No files were written into `dist`.

The current `index.html` selects one entry and one lazy legacy chunk. Other entry/chunk pairs were analyzed independently and retained as forensic artifacts, not merged into production behavior.

## This is not verbatim original-source recovery

UNKNOWN: original module paths, local names, comments, types and build configuration. No source maps or `sourcesContent` survive. `exact_recovered_sources/` therefore contains only an explanation, not falsely labeled recovered source.

EXACT refers to surviving literals and observations. HIGH CONFIDENCE refers to reconstructed behavior supported by tests. INFERRED identifies organizational decisions or repairs. Each function's offsets are UTF-16 character positions in the named original JS file, not byte offsets.

## Reconstruction work

1. Parse every JS file and format separate analysis copies; extract declarations, strings, templates, imports and I/O references.
2. Identify the active React shell and application/vendor boundaries. Remove framework/SheetJS vendor internals from application source and use explicit package imports.
3. Account for all 680 application functions and 75 shared bindings. Rename bindings through lexical AST scope, not global string replacement.
4. Split into 46 mapped domain modules, generate explicit imports and expose shared state through one named object. Recover literal defaults separately.
5. Expand minified boolean/void/sequence and statement forms where semantics can be preserved. Keep meaningful native template/form/DOM behavior and the original initialization order.
6. Recreate the React shell/header as readable JSX, retain the authored stylesheet's rule order and values, and copy surviving asset bytes.
7. Compare original and rebuilt outputs under identical, isolated browser fixtures, then test actual interactions and production/development builds.

INFERRED: module boundaries and names are maintenance choices; they do not claim to be the lost author's exact source layout. Some short local names remain where their original names are unprovable. Several domain modules depend on each other's functions, reflecting the original shared-state application; avoid adding effectful top-level initialization. `bootstrap.js` owns initialization.

## One intentional behavior repair

EXACT: `safeJsonParse` is called but not declared in the active surviving bundle at three sites: saved-attachment removal, course editing and private route-reference restoration. The first two otherwise throw; the route reader catches its missing-helper error and discards stored references.

INFERRED: `src/utils/json.js` adds `JSON.parse` with the fallback argument already supplied at those call sites. It does not invent another feature. Unit tests cover valid/malformed input; an isolated browser test removes a saved attachment and persists the edited course. The original empty-attachment placeholder (`type: "none"`) is preserved.

## Deliberately retained limits

- EXACT: sample records, demo seeding, native prompts, home fallback for unknown routes, original access checks and original save/error behavior remain.
- UNKNOWN: server-side security and database behavior. Client role guards are not authorization. All browser fixtures are excluded from application/build imports.
- EXACT: two absent print logos are referenced by the surviving code. No substitute image was invented. Restore those assets only from a trustworthy source.
- UNKNOWN: original SheetJS version. The pinned `xlsx` 0.18.5 reproduces the surviving workbook's parsed values in an original-vendor comparison. This does not prove identical support for every spreadsheet format or that it is a current dependency release.
- HIGH CONFIDENCE: screenshot results apply to the tested Chrome, OS fonts and viewport sizes. They are not a claim of universal pixel identity.

## Where to change things later

Start from `docs/ROUTE_MAP.md` for a screen, `docs/UI_COMPONENT_MAP.md` for a function, `docs/API_MAP.md` plus `API_CONTRACTS.md` for an API, and `forensics/symbol-map.json` for provenance. Make source changes in the relevant domain module, then run unit and browser regressions. Treat a redesign or backend implementation as separate work.
