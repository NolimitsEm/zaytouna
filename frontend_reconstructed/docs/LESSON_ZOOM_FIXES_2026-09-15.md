# Lesson saving and Zoom repair — 2026-09-15

Implemented locally in the reconstructed frontend and backend. This is not a claim that every possible application bug is eliminated or that production Zoom/MySQL has been tested.

## Repairs

- Course edit/save supports string IDs, optional Zoom dates, and existing PDF/YouTube attachments. Upload errors leave the original course untouched. Failed saves retain the form for retry and restore local state. Submit buttons are locked while saving.
- Automatic lesson-list polling pauses while an editor is open. Course deletion and level/group writes await persistence and roll back on failure. Level/group/subject add/edit forms retain input on failure.
- Zoom host entry fetches a fresh host URL for the course owner/admin. The stored URL can expire; Zoom documents retrieving its replacement through Get a meeting. Students never receive host URLs. [Zoom Meetings API](https://developers.zoom.us/docs/api/meetings/)
- Recording retrieval and meeting end/start-link routes require authentication and course ownership/audience checks. Submitted identifiers cannot select another meeting; teachers cannot bind another host's platform-created meeting to their course.
- Recording polls no longer save the entire course collection. Students may poll their own published lessons. Server refreshes are limited to one attempt per meeting per 30 seconds, concurrent cache writes are serialized, and recording JSON is written atomically. Only completed files are displayed; an empty result stays processing. Permission failures produce a warning for staff.
- Zoom HTTP calls have timeouts. Webhook signatures reject old timestamps. Meeting UUID lookup takes precedence over stale course indexes. Download-only recording links may still require Zoom authentication; API tokens are never given to the browser. [Zoom recordings API](https://developers.zoom.us/docs/api/meetings/), [Zoom webhooks](https://developers.zoom.us/docs/api/webhooks/)
- Participant video off and microphone muted on entry remain enforced for newly platform-created meetings. Annotation configuration remains best-effort and must not block lesson creation; see [the annotation limitations](ZOOM_CLASSROOM_DEFAULTS.md).

## Previous review findings

| Finding | Implemented protection |
| --- | --- |
| R1: answer-key disclosure | Remove keys recursively from student exam/submission responses, including `questionItems`. |
| R2: client-supplied marks | Validate exam existence, audience, server time and one-attempt rules; compute QCM scores from server questions; preserve submitted records. Exercise grading fields are not accepted from students. |
| R3: teacher self-approval | Validate owned timetable session and pending-only requests; retain administrative decisions. |
| R4: profile save overwrites account status | Profile, avatar and password changes update only the locked target user row. |
| R5: stale collection drops newer rows | Per-key revision preconditions reject stale snapshots with HTTP 409. Collection writes recheck locked database rows before replacement. Old clients without revisions receive 428 and must reload. |
| R6: unauthenticated recording access | Authenticated, audience-bound recording routes; no arbitrary client-selected Zoom refresh. |
| R7: failed catalog save leaves ghost rows | Await saves, restore prior state, retain form input for retry. |

The old review report and `tools/review-checks.mjs` are historical bug reproducers, not post-fix acceptance tests. Use the regression commands below instead. This pass does not redesign all legacy whole-collection persistence: preconditions prevent the tested stale-overwrite cases; it is not a distributed transactional redesign of every endpoint.

## Verification

From `backend`: `node --test *.test.js` — 59 passing tests (excludes the unrelated `xxxxxxxx` backup).

From `frontend_reconstructed`:

- `npm.cmd test` — 47 passing tests.
- `npm.cmd run build` — successful; existing bundle-size warning remains.
- `npm.cmd run test:interactions` — 20 passing interaction cases.
- `npm.cmd run test:integration` — 11 passing browser/real-HTTP cases with an in-memory repository.
- `npm.cmd run test:lessons` — editor persistence, rollback/retry, attachments, and fresh admin host-link flow.
- `npm.cmd run test:save-failures` — level/group failure regressions.

Browser tests use isolated fixtures; backend tests use injected storage/Zoom transports. No production records, real email, Zoom meeting, or host settings were changed. The original `../dist` and backend `.env` are untouched.

## Deploy together

1. Deploy `backend/server.js`, `backend/academic-policy.js`, and `backend/state-revisions.js` alongside the existing backend modules. Keep `zoom-classroom-policy.js`, `account-access.js`, and `login-security.js` from the preceding fixes. Keep the production `.env` and `data/` files; do not overwrite them with local copies.
2. Deploy the contents of `frontend_reconstructed/build/` to the existing frontend web root, then restart the existing backend service using its configured process manager. Do not guess a PM2/service name.
3. Reload open browser tabs (Ctrl+F5). Frontend and backend now share the revision contract; do not deploy only one side.
4. No SQL/schema change is required by this repair. Preserve the writable backend `data/` directory for recording/webhook state. If running multiple backend processes, the in-process recording queue is not a distributed lock; use one writer or a shared transactional recording store.
5. Live acceptance still needed on the VPS: create/edit/reload a lesson as teacher and admin; start it from the platform; join as an assigned student and check mic/video defaults; end it; wait for Zoom processing and check recording playback. Verify the Zoom app has meeting-read permissions for fresh host links and cloud-recording-read permissions for recordings, and that the configured host can record to the cloud. Settings read/update permissions are optional for creation but needed for automatic host-setting changes. [Zoom scope reference](https://developers.zoom.us/docs/integrations/oauth-scopes-granular/)

Remaining external limits: no VPS session or authenticated live Zoom test was available. Automatic recording depends on the actual Zoom account, recording settings, permissions, storage and processing. Annotation defaults do not prevent a Zoom account administrator from subsequently changing settings.
