# Readable API contracts

EXACT: these are client request fields and response fields consumed by the surviving active code. They are not an invented server schema. The backend's complete response schema, authorization implementation and status codes are UNKNOWN. Original call offsets and source-module links are in [API_MAP.md](API_MAP.md).

All paths are relative to the current origin. GET uses `credentials: "same-origin"`; POST additionally uses JSON content type and a JSON-stringified body. HTTP failures select `reason`, then `detail`, then `error`, then the original Arabic generic error. Failed JSON parsing yields `{}`.

| Endpoint | Client contract |
| --- | --- |
| GET `/api/app-state` | Reads `response.state`; values are cached/decoded by domain loaders. |
| POST `/api/app-state` | `{items: {key: serializedValue, ...}}`; a serialized save queue sends state batches. Successful completion merges the submitted values into the client cache. |
| GET `/api/auth/session` | Reads `response.user`; request failure restores an anonymous session. |
| POST `/api/auth/login` | `{email, password}`; the UI accepts email/identifier in its email field, trims/lowercases it, reads `response.user`, reloads app state and redirects by role. |
| POST `/api/auth/logout` | `{}`; clears current user through the original logout flow. |
| POST `/api/auth/profile` | `{email, phone, birthDate, residence, currentPassword}`; reads `response.user` and updates the profile UI. |
| POST `/api/auth/change-password` | `{currentPassword, password}`; reads `response.user`. New-password confirmation is validated locally, not transmitted. |
| POST `/api/auth/verify-password` | `{password}`; a successful HTTP result permits the requested action. The client does not inspect a `valid` boolean. |
| POST `/api/auth/profile/avatar` | `{avatar: dataUrl}`; image MIME and 2 MB limit checked locally; reads `response.user`. |
| POST `/api/activation-invite` | `{token}`; reads the invited user for the complete-signup form. |
| POST `/api/activation-complete` | `{token, password}`; merges returned `user` or the original activated-user fallback, then redirects to login. |
| POST `/api/registration-requests` | `{request}`; request includes `id`, `firstName`, `secondName`, `fullName`, `studyLevel`, `sana`, `niveauId`, `birthDate`, `cinPassport`, `profession`, `email`, `phone`, `program`, `message`, `status`, `createdAt`, `decidedAt`. No server response body field is required by the submit handler. |
| POST `/api/email-settings` | `{fromName, fromEmail, smtpHost, smtpPort, appPassword, autoSendActivation}` from the administrative form. No real credentials were supplied in reconstruction tests. |
| POST `/api/send-activation-email` | `{to, name, activationBaseUrl, loginUrl, user}`; the nested user includes identity, role, level/group, contact, residence, registration number, payment flags and activation email timestamp. |
| POST `/api/zoom/meetings` | `{courseId, scheduleId, title, description, subjectId, niveauId, groupeId, teacherId, teacherName, teacherEmail, startTime, durationMinutes, timezone}`. Reads `response.meeting` and binds `meetingId`, `meetingUuid`, `joinUrl`, `startUrl`, `password`, `timezone`, `recordingStatus` to form fields. |
| GET `/api/zoom/recordings` | Query: `courseId`, `meetingId`, `uuid`, `refresh=1`. Reads `response.recording`; updates recording audio/video/presentation URLs, status, update time and nonempty file list. |
| POST `/api/zoom/meetings/end` | `{courseId, meetingId, uuid}`; invoked by the lesson-conference end action. |

There are 17 method/call-site entries across 16 distinct paths because `/api/app-state` supports GET and POST. Missing real backend access is not replaced by a production mock. The test-only fixture implements only enough responses to exercise the client; it is not proof of backend functionality.
