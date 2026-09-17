# Uncertainties and limitations

- UNKNOWN: original source filenames, directories, local variable names, comments, TypeScript types, package.json and build configuration. No source maps exist. exact_recovered_sources contains an explanatory README only.
- INFERRED: source/module names, shared state object, lexical variable names, React Header boundary, Vite 7.3.1 config and optional development proxy. Each recovered function maps back to its active-bundle offset.
- HIGH CONFIDENCE: React 19.2.8 hybrid shell + imperative hash application; Vite identity. EXACT: React/ReactDOM version literals. UNKNOWN: original Vite/SheetJS exact versions; xlsx 0.18.5 is the reconstruction compatibility selection.
- EXACT: the active graph is selected from index.html; three other entry/legacy pairs remain evidence, not feature sources to merge.
- EXACT: brand/ and brand-concepts/ are absent. Their requested analyses explicitly report absence.
- UNKNOWN: actual backend database content, cookie policies, server-side roles, working SMTP/Zoom settings, private uploaded materials and live API status. Backend folder was not read or reused. Tests intercept requests and never send real email, create real meetings or edit a real database.
- EXACT: original safeJsonParse is undefined at three call sites. A small INFERRED parser repair is documented and tested; without it removing/saving attachments throws. The original route-reference reader catches this error and falls back to {}.
- EXACT missing original asset paths: `assets/email-signature-logo-1.png`, `assets/email-signature-logo-2.png`. These chiefly affect enrollment/payroll print logos. No fabricated replacements are silently inserted.
- UNKNOWN: remote/user-supplied images, videos, PDFs and iframes when URLs/records are absent. Google Maps/external resources are blocked in isolated comparison tests.
- EXACT: system-font fallbacks only; pixel fidelity is verified on the current test machine, not all OS/font combinations.
- INFERRED module boundaries preserve the original shared-state architecture and can contain circular function imports. No initialization runs at module top level beyond inert defaults/state; bootstrap preserves original execution order.
- Original pre-existing behavior is preserved: sample literals/admin demo seeding, unknown-route home fallback, native password prompts and client-generated reports. Not claimed to be a new backend or a redesign.
