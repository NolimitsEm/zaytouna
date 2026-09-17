# Dependency analysis

| Package / capability | Version | Evidence | Confidence |
| --- | --- | --- | --- |
| react | 19.2.8 | B.version literal in each entry; hooks and React element symbols | EXACT |
| react-dom | 19.2.8 | rendererPackageName/react-dom, version literals, createRoot | EXACT |
| scheduler | React dependency; version not retained | unstable_scheduleCallback / priority scheduling in entry | HIGH CONFIDENCE package; UNKNOWN original exact version |
| vite | Original version UNKNOWN; reconstruction pins 7.3.1 | modulepreload polyfill, vite:preloadError, dynamic import wrapper, hashed assets | HIGH CONFIDENCE tool; INFERRED reconstruction version |
| xlsx (SheetJS CE) | Original exact version UNKNOWN; reconstruction 0.18.5 | Contiguous spreadsheet vendor at offsets 3436–368558; CFB, SheetJS markers; xn reader and $S.sheet_to_json used by importAccounts | HIGH CONFIDENCE identity; INFERRED package version |
| cfb / crc-32 | 1.2.2 / 1.2.0 runtime literals | Embedded spreadsheet vendor version literals | EXACT retained literals; HIGH CONFIDENCE attribution |
| Router | Native hash router | location.hash/hashchange/history.replaceState | EXACT; no router package |
| HTTP | Native fetch | same-origin GET and JSON POST wrappers | EXACT; no axios |
| State | Module-scoped JavaScript state + backend items | Lo cached strings, globals and /api/app-state | EXACT; no Redux/Zustand |
| UI / CSS framework / CSS-in-JS | None detected | Native markup, authored CSS, React shell | HIGH CONFIDENCE absence |
| Icons | Characters, CSS and PNG logos | No icon component/library signatures | HIGH CONFIDENCE |
| Animations | CSS + native timers | @keyframes; gallery and exam intervals | EXACT |
| Forms / validation | Native FormData, validity and regex | submit event delegation and password regex checks | EXACT |
| i18n | Literal Arabic/French with Intl | No translation library or locale chunks | EXACT |
| Charts | Native template/CSS calculations | Questionnaire checklist bars, statistics, grade tables | HIGH CONFIDENCE |
| Dates | Date / Intl.DateTimeFormat | ar-TN/fr-FR formatting | EXACT |
| Auth package | None detected | Session API + role checks | HIGH CONFIDENCE |
| @babel/parser, traverse, generator, types | 7.28.5 | Reconstruction necessity: lexical AST extraction/renaming/module splitting/provenance | INFERRED tooling, not original app dependency |
| prettier | 3.6.2 | Readable analysis/source formatting | INFERRED tooling necessity |
| playwright | 1.58.2 | Requested route/interaction/browser comparison | INFERRED testing necessity |
| pngjs | 7.0.0 | Requested pixel comparison of screenshots | INFERRED testing necessity |

Only React/ReactDOM/SheetJS are application dependencies. Framework vendor internals were replaced by package imports; they are not copied into src. No prior project package manifest or source was consulted.

Package source references: [React versions](https://react.dev/versions), [Vite documentation](https://vite.dev/guide/), [SheetJS installation](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/). SheetJS documents that npm 0.18.5 is an older release; this reconstruction pins it as a compatibility choice, not a claim that it is current or that the original exact version is proved. Upgrading is separate work requiring import-format regression tests.

`package-lock.json` locks resolved versions. Remaining transitive entries are package-manager resolution, not claimed original direct dependencies.
