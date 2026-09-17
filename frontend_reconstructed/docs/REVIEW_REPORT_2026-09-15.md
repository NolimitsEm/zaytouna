# Backend/frontend review — 2026-09-15

Historical pre-fix review. The subsequently authorized implementation addresses the reproduced findings; see [the lesson/Zoom repair and verification report](LESSON_ZOOM_FIXES_2026-09-15.md). The findings and line references below describe the earlier source, not the current status.

Verdict: the existing tests pass, but the application is not bug-free or ready to be declared fully verified. Seven remaining issues were reproduced in isolated fixtures. Live database verification is blocked by MySQL authentication.

This was a review, not an implementation pass. Application source, account records, credentials, and the original `dist/` were not modified. Diagnostic scripts/reports were added and the reconstructed build/test outputs were regenerated. No real activation email, Zoom operation, or database write was performed.

## Confirmed remaining issues

### R1 — High: exam answers are disclosed to students

Location: `backend/server.js:1463`, `backend/server.js:1494` (`roleScopedAppState`).

The student response includes the full published exam object, including `questions[].correctAnswers`. It also includes that content before the exam's opening time. An isolated student received the answer key for a fixture exam opening in 2099. The UI hiding an answer does not prevent its disclosure in the response.

Required direction: create an explicit student exam response without answer keys; enforce the release policy on the server.

### R2 — High: students can supply their own marks

Location: `backend/server.js:526`, `backend/server.js:560`; request path at `backend/server.js:2461`.

Submission writes verify ownership by `userId`, but do not recompute marks or restrict grading fields. A fixture student submission containing empty answers, `awardedPoints: 20`, and `correctionStatus: "corrected"` was accepted unchanged. Both a not-yet-open existing exam and a nonexistent exam ID were accepted by this validation layer. The declared SQL schema has no exam foreign-key constraint, and the persistence mapping stores the supplied payload.

Required direction: dedicated submission validation, server-side automatic grading, teacher-only manual grading, and server checks for exam existence, audience, timing, and resubmission rules.

### R3 — High: teachers can approve their own absence

Location: `backend/server.js:552`; frontend admin-only approval at `src/controllers/actions.js:245`.

The UI restricts approval to administrators, but the backend only checks the absence's `teacherId`. A teacher changing their own absence from `pending` to `approved` passed the actual backend write-permission and merge functions.

Required direction: enforce absence transitions and approver fields on the server, not only in the browser.

### R4 — High: a concurrent profile save can undo account reactivation

Location: `backend/server.js:883`, `backend/server.js:893`, `backend/server.js:1273`. Profile/password handlers at lines 835 and 865 use the same whole-user-list write pattern.

The avatar handler reads every user and writes the entire snapshot back without `preserveUserSecurity`. Reproduction: it reads a disabled account, an administrator enables that account, then an unrelated user's avatar save commits the stale snapshot. The newly enabled account becomes disabled again. This is a conditional concurrency bug, not proof that it caused a particular historical production incident.

Required direction: targeted, transactional profile/avatar/password updates with explicit allowed fields; avoid rewriting other users' security data.

### R5 — High: stale full-list saves can remove newer accounts

Location: `backend/server.js:1261`, `backend/server.js:1280`.

`replaceArrayState` deletes all rows in the target table and reinserts the submitted list. The isolated persistence check started with two accounts and saved an older one-account snapshot: the newer account disappeared, even with `preserveUserSecurity: true`. Preserving fields of included users does not preserve users omitted from a stale snapshot.

Required direction: explicit per-record operations or revision/conflict checks that distinguish intentional deletion from stale data.

### R6 — High: recording links are returned without authentication

Location: `backend/server.js:2487`.

The recordings route does not authenticate the caller or check course access. The original request handler returned HTTP 200 and a fixture recording link for a cookie-free request specifying a known course ID. This does not establish that Zoom itself allows playback without additional protection. No real recording was accessed and no refresh operation was called.

Required direction: authenticate the caller and verify access to the requested course/meeting before returning recording metadata or refreshing it.

### R7 — Medium: failed class/group saves leave unsaved rows visible

Location: `src/controllers/forms.js:533`, `src/controllers/forms.js:551`; `src/services/state-repository.js:149`, `src/services/state-repository.js:158`.

Both add flows modify local state and redraw without awaiting persistence or rolling back failure. In isolated Chrome tests, the API returned 503: an error toast correctly appeared, but the new row remained visible until reload, then disappeared. This is not a false success toast; it is inconsistent visible state after a failed save.

Required direction: await the save and roll back/reload on failure, or visibly retain an explicit unsaved/retry state.

## Checks completed

- Backend automated tests: 14/14 passed.
- Frontend automated tests: 42/42 passed.
- Backend/frontend integration scenarios: 11/11 passed, no browser page errors. These cover the earlier schedule filtering and account-access fixes using isolated in-memory storage; they do not exercise a live MySQL connection or every role-scoped write rule.
- Browser interaction workflows: 20/20 passed. API calls, email sending, and Zoom actions are intercepted fixtures.
- Production build: passed, 82 modules. A non-fatal large-chunk warning remains (largest JavaScript chunk approximately 742 kB before gzip).
- New backend reproductions: R1–R6 reproduced from actual backend function bodies with external dependencies replaced by fixtures.
- New browser failure reproductions: R7 reproduced for both levels and groups.

Passing the existing tests does not invalidate these findings; the new checks deliberately cover cases the existing suite did not test.

## Live verification limitation

Read-only MySQL connection attempt at `2026-09-15T07:26:08.687Z` failed with `ER_ACCESS_DENIED_ERROR`. MySQL was listening on 3306; the frontend was listening on 5174; nothing was listening on the configured backend port 3001. Therefore live front/backend/database behavior, actual account histories, and real email/Zoom workflows were not verified. No password or environment setting was changed to bypass this.

## Reproduction artifacts

- `node tools/review-checks.mjs` → `forensics/validation/review-findings.json`.
- `node tools/review-save-failure.mjs` → `forensics/validation/review-save-failure.json` (requires an existing reconstructed build and local Chrome).
- Existing integration/browser reports: `forensics/validation/bugfix-integration.json`, `forensics/validation/interaction-report.json`.
- Read-only database result: `forensics/validation/backend-data-audit.json`.

The review commands intentionally succeed when the documented bugs reproduce. They are diagnostic evidence, not acceptance tests asserting that the application is fixed.
