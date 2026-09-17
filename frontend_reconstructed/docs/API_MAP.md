# API forensics

EXACT: relative /api paths; base is window origin. Browser-native fetch, not Axios. All JSON POSTs use credentials: same-origin, Content-Type: application/json and JSON.stringify(payload); GETs use credentials: same-origin. No Authorization/Bearer header is emitted. Both helpers parse JSON, fall back to {}, and throw reason || detail || error || the original Arabic backend error for non-OK responses. Server status codes and cookie attributes are UNKNOWN from dist.

| Path | Method | Caller | Payload / query | Source offset | Confidence |
| --- | --- | --- | --- | --- | --- |
| /api/app-state | POST | saveStateBatch | `{items:r}` | 389373 | EXACT |
| /api/app-state | GET | fetchApplicationState | `` | 395584 | EXACT |
| /api/auth/session | GET | restoreSession | `` | 395903 | EXACT |
| /api/email-settings | POST | saveEmailSettings | `Dt` | 396725 | EXACT |
| /api/zoom/meetings | POST | createZoomMeeting | `cy(t)` | 398821 | EXACT |
| /api/zoom/recordings?${r} | GET | syncZoomRecording | `` | 400848 | EXACT |
| /api/send-activation-email | POST | sendActivationEmail | `{to:e.email,name:e.name,activationBaseUrl:tk(),loginUrl:rk(),user:hy(e)}` | 401749 | EXACT |
| /api/activation-invite | POST | loadActivationInvite | `{token:e}` | 475147 | EXACT |
| /api/auth/login | POST | submitFormAction | `{email:Y,password:String(B.get("password")\|\|"")}` | 619570 | EXACT |
| /api/auth/profile | POST | submitFormAction | `{email:Y,phone:ee,birthDate:z,residence:ge,currentPassword:String(B.get("currentPassword")\|\|"")}` | 620753 | EXACT |
| /api/auth/change-password | POST | submitFormAction | `{currentPassword:String(B.get("currentPassword")\|\|""),password:Y}` | 621288 | EXACT |
| /api/activation-complete | POST | submitFormAction | `{token:Y,password:z}` | 621865 | EXACT |
| /api/registration-requests | POST | submitFormAction | `{request:Y}` | 622251 | EXACT |
| /api/auth/logout | POST | handleClick | `{}` | 636124 | EXACT |
| /api/zoom/meetings/end | POST | endLessonConference | `{courseId:r.id,meetingId:r.zoomMeetingId\|\|"",uuid:r.zoomMeetingUuid\|\|""}` | 646588 | EXACT |
| /api/auth/verify-password | POST | confirmPasswordForAction | `{password:t}` | 647512 | EXACT |
| /api/auth/profile/avatar | POST | handleAvatarUpload | `{avatar:i}` | 671218 | EXACT |

## Response and failure handling

### /api/app-state — saveStateBatch

EXACT invocation: `ur("/api/app-state",{items:r})`.

Readable response/error handling: [saveStateBatch](../src/services/state-repository.js). Original active chunk offset 389373.

### /api/app-state — fetchApplicationState

EXACT invocation: `Cc("/api/app-state")`.

Readable response/error handling: [fetchApplicationState](../src/services/state-repository.js). Original active chunk offset 395584.

### /api/auth/session — restoreSession

EXACT invocation: `Cc("/api/auth/session")`.

Readable response/error handling: [restoreSession](../src/services/auth.js). Original active chunk offset 395903.

### /api/email-settings — saveEmailSettings

EXACT invocation: `ur("/api/email-settings",Dt)`.

Readable response/error handling: [saveEmailSettings](../src/services/auth.js). Original active chunk offset 396725.

### /api/zoom/meetings — createZoomMeeting

EXACT invocation: `ur("/api/zoom/meetings",cy(t))`.

Readable response/error handling: [createZoomMeeting](../src/services/zoom.js). Original active chunk offset 398821.

### /api/zoom/recordings?${r} — syncZoomRecording

EXACT invocation: `Cc(`/api/zoom/recordings?${r}`)`.

Readable response/error handling: [syncZoomRecording](../src/services/zoom.js). Original active chunk offset 400848.

### /api/send-activation-email — sendActivationEmail

EXACT invocation: `ur("/api/send-activation-email",{to:e.email,name:e.name,activationBaseUrl:tk(),loginUrl:rk(),user:hy(e)})`.

Readable response/error handling: [sendActivationEmail](../src/services/auth.js). Original active chunk offset 401749.

### /api/activation-invite — loadActivationInvite

EXACT invocation: `ur("/api/activation-invite",{token:e})`.

Readable response/error handling: [loadActivationInvite](../src/pages/account.js). Original active chunk offset 475147.

### /api/auth/login — submitFormAction

EXACT invocation: `ur("/api/auth/login",{email:Y,password:String(B.get("password")||"")})`.

Readable response/error handling: [submitFormAction](../src/controllers/forms.js). Original active chunk offset 619570.

### /api/auth/profile — submitFormAction

EXACT invocation: `ur("/api/auth/profile",{email:Y,phone:ee,birthDate:z,residence:ge,currentPassword:String(B.get("currentPassword")||"")})`.

Readable response/error handling: [submitFormAction](../src/controllers/forms.js). Original active chunk offset 620753.

### /api/auth/change-password — submitFormAction

EXACT invocation: `ur("/api/auth/change-password",{currentPassword:String(B.get("currentPassword")||""),password:Y})`.

Readable response/error handling: [submitFormAction](../src/controllers/forms.js). Original active chunk offset 621288.

### /api/activation-complete — submitFormAction

EXACT invocation: `ur("/api/activation-complete",{token:Y,password:z})`.

Readable response/error handling: [submitFormAction](../src/controllers/forms.js). Original active chunk offset 621865.

### /api/registration-requests — submitFormAction

EXACT invocation: `ur("/api/registration-requests",{request:Y})`.

Readable response/error handling: [submitFormAction](../src/controllers/forms.js). Original active chunk offset 622251.

### /api/auth/logout — handleClick

EXACT invocation: `ur("/api/auth/logout",{})`.

Readable response/error handling: [handleClick](../src/controllers/actions.js). Original active chunk offset 636124.

### /api/zoom/meetings/end — endLessonConference

EXACT invocation: `ur("/api/zoom/meetings/end",{courseId:r.id,meetingId:r.zoomMeetingId||"",uuid:r.zoomMeetingUuid||""})`.

Readable response/error handling: [endLessonConference](../src/controllers/actions.js). Original active chunk offset 646588.

### /api/auth/verify-password — confirmPasswordForAction

EXACT invocation: `ur("/api/auth/verify-password",{password:t})`.

Readable response/error handling: [confirmPasswordForAction](../src/services/account-actions.js). Original active chunk offset 647512.

### /api/auth/profile/avatar — handleAvatarUpload

EXACT invocation: `ur("/api/auth/profile/avatar",{avatar:i})`.

Readable response/error handling: [handleAvatarUpload](../src/services/attachments.js). Original active chunk offset 671218.

Non-API fetch: production modulepreload helper, bulletin image-to-data-URL conversion. External URLs include Google Maps iframe, YouTube embed handling and user-provided meeting/media URLs; these are not new backend endpoints. All four legacy versions were scanned; inactive-only/changed calls remain separately identified in forensics/api-calls.json.

Testing uses an isolated intercepted API fixture only; it is never bundled into src/build and does not claim to implement the real backend.


Evidence offsets in these reports are JavaScript UTF-16 character offsets in the named original file, not byte offsets or reconstructed line numbers. EXACT describes surviving values and observed structures, not lost original source.
