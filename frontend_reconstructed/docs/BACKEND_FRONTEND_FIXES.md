# Backend/frontend corrections — 2026-09-14

These are intentional, user-requested corrections after forensic recovery. Original `dist` remains read-only. The earlier fidelity reports remain a baseline; they do not assert that the corrected behavior exactly matches the original bugs.

## Schedule and selected students

Confirmed code defects and fixes:

- Empty group selection is labeled “all groups” but previously excluded every student. It now selects active students in the chosen level, across groups.
- Numeric and string cohort/user IDs are now compared consistently; whitespace is trimmed. Exact level/group identifiers are used, not guessed names.
- Search uses the existing Arabic normalization utility, so diacritics and common Alef variants do not hide a matching name. Clearing search also clears the stale “no student” notice.
- Changing a level/group deselects and disables students outside the new cohort.
- The edit-row checkboxes previously had no association with the external edit form, so selected IDs were absent from FormData. They now carry the correct `form` attribute.
- Confirmed accounts re-enabled by the admin return to the active student picker. Disabled/pending accounts are still excluded; they are not silently made active.

Verified in Chrome against the real HTTP route handler: add a schedule with student s1, edit it to include s1+s2, and confirm the backend repository stores the expected IDs and cohort. No real schedules were created.

## Account access and login

The previous backend combined two independent actions after five failed attempts: permanent `isDisabled=true` plus a 15-minute IP/identifier throttle. Admin reactivation did not clear the in-memory throttle. Generic whole-user-list saves could also overwrite a newer session version/security state from an old browser snapshot.

Changes:

- Failed credentials now trigger temporary throttling only. They do not disable an account or revoke an already valid session. Default limits remain five attempts / 15 minutes.
- Email and ID aliases share the same per-IP account counter. Expiry resets the count; successful login clears that account's attempts.
- New admin-only `POST /api/admin/users/status` accepts `{id, isDisabled}` and returns `{ok, user}`. Anonymous/student/teacher requests are denied; self-status changes and non-boolean inputs are rejected.
- Status changes lock and update only the requested database row within a transaction. Password and confirmation/activation metadata are preserved. Re-enabling clears legacy disable-reason fields and login counters across IPs/aliases, only after the save commits.
- A confirmed disabled account uses “تشغيل الحساب”; an active confirmed account additionally offers “رفع حظر الدخول”. Neither action sends an activation email or asks the user to choose a new password.
- Unconfirmed accounts remain unconfirmed. Status activation returns a clear 409 explanation, without sending mail; the separate explicit activation-email action remains available for first-time activation.
- Manual disablement still revokes sessions. Login/logout session rotation updates one locked row, not a stale snapshot of all accounts.
- General app-state user writes preserve existing server-owned confirmation/disable/session state. The existing explicit administrative password-reset path is retained and rotates the session version.
- The frontend awaits the persisted server response before updating status; failures do not pretend the account was saved. HTTP 429 errors show the retry interval and the admin unlock option.

Deploy frontend and backend together: the corrected status controls require the new endpoint. No backend database schema migration is introduced by these fixes.

## Local connection setup

The frontend now has a local development proxy to `http://127.0.0.1:3001`, matching backend configuration. Backend `npm.cmd run dev` uses a loopback-only development launcher with local HTTP cookies. Production `npm.cmd start` and backend/.env secrets are unchanged.

Read-only live-database audit: the MySQL listener became reachable on port 3306, but the configured backend credentials were rejected with `ER_ACCESS_DENIED_ERROR`. The audit stopped; no alternative passwords were tried, no MySQL users/passwords were changed, and no live application accounts were reactivated. Correct the MySQL credentials in backend/.env locally, without sending passwords in chat, before real-data verification.

## Validation

- Frontend: 42 unit/helper/contract tests pass; production build passes.
- Backend: 14 tests pass, including existing role-scoped access tests, temporary throttle expiry, alias/IP clearing, unchanged confirmation/password, unauthorized/pending/self-change rejection, transaction locking/rollback, real HTTP cookies and stale snapshot protection. Resaving the same password does not rehash it or revoke sessions; an actual password change does.
- Browser/backend integration: 11 scenarios pass against the actual backend HTTP/auth/permission handlers and production frontend. Only storage is replaced with a test-only in-memory repository; API requests are not intercepted by a fake frontend response layer.
- Previous 20 interaction workflows also pass after the fixes.
- Original `dist` hashes remain verifiable with `npm.cmd run verify:evidence`.

The integration tests do not prove live MySQL persistence, SMTP delivery, Zoom connectivity or the status of an unspecified real account. The reported live database authentication failure prevents that last verification.

Raw artifacts: `forensics/validation/bugfix-integration.json` and `backend-data-audit.json`. Tests: `tests/backend-integration.mjs`, `tests/schedule-audience.test.mjs`, `../backend/login-security.test.js`. Run the new `npm.cmd run test:integration` after building the frontend.
