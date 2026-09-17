# Zoom classroom defaults — 2026-09-15

Implemented in `../backend/server.js` and `../backend/zoom-classroom-policy.js`. This change is separate from the seven open findings in [the review report](REVIEW_REPORT_2026-09-15.md); it does not resolve those findings.

## Behavior

New meetings created by the platform request:

- `mute_upon_entry: true` (already enabled; retained).
- `participant_video: false` (changed from true).
- `host_video: true` (retained so the teacher/admin host works normally).
- Host-user `in_meeting.annotation: false` before meeting creation, followed by a settings read to confirm it is actually false.

These are entry defaults, not a permanent ban on participants turning their microphone or camera on later. Existing recording options, audio connection modes, chat, and screen-sharing settings are unchanged. Incoming frontend settings cannot override the entry defaults. The fields are documented in the [Zoom Meetings API](https://developers.zoom.us/docs/api/meetings/).

## Annotation scope and limitations

The implemented annotation switch disables Zoom shared-screen annotations for everyone, including the teacher/host. It does not implement a teacher-only annotation mode, nor change separate whiteboard document permissions.

This is a setting of the Zoom host user, not an individual meeting. Applying it affects other meetings hosted by that same Zoom user. Use a dedicated teaching host if that user also hosts unrelated meetings. Zoom documents a presenter-only option in its portal, but this implementation does not invent an undocumented REST field for it. See [Zoom annotation settings](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060943).

The host-setting PATCH and confirming GET are best-effort. Missing user-setting OAuth scopes, account/group locks, or an unavailable settings endpoint no longer block meeting creation. The backend logs a warning and still creates the meeting with participant microphone/video entry defaults. If the Zoom account must guarantee that students cannot annotate, disable and lock Annotation once in the Zoom web portal; the meeting-creation API does not expose a documented per-meeting annotation field.

The existing recording-layout sync remains best-effort and runs before the optional annotation policy; its recording-only payload does not overwrite annotation. The later [lesson/Zoom repair](LESSON_ZOOM_FIXES_2026-09-15.md) adds fresh host links, authenticated recording access and polling fixes.

## Deployment and verification

- Restart/deploy the updated backend before creating new meetings.
- User-setting permissions are optional for creating the meeting. To let the platform also manage Annotation, the Zoom OAuth app needs permission to read and update the configured host's settings. The documented granular admin scopes are `user:read:settings:admin` and `user:update:settings:admin`; equivalent supported legacy user read/write scopes can apply. Check the app type and account/group locks in the [Zoom Users API](https://developers.zoom.us/docs/api/users/).
- Already-created meeting video/audio settings are not retroactively updated. Manually pasted external Zoom links are outside this creation workflow.
- Account administrators/hosts may later change Zoom settings. This is not an immutable Zoom account-level lock.
- No real Zoom setting, existing meeting, credential, or application account was changed during implementation. Live Zoom behavior has not been verified; tests replace Zoom requests and recording storage with fixtures. The local backend was not listening on port 3001 during verification.

Run `npm.cmd test` in `backend/`. Zoom checks cover immutable participant entry defaults, normal host video, patch/read verification, locked/missing settings, permission failures, and the actual non-blocking meeting-creation flow. No test contacts Zoom or writes real recording data.

Frontend helper/contract tests: 42/42 pass. Its Zoom creation/binding browser workflow also passes with intercepted API requests; that browser test is not evidence of a live Zoom meeting.
