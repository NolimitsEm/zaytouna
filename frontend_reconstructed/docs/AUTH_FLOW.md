# Authentication recovery

EXACT: login, logout, profile update, password change, activation invite/completion, password verification before destructive UI actions and avatar update exist. The backend session is requested at startup; browser fetch uses same-origin credentials. No frontend JWT decoder, accessToken, refreshToken, Bearer header, localStorage auth token or refresh endpoint is evidenced. Cookies are implied by credentials/session behavior (HIGH CONFIDENCE); cookie names, expiry, HttpOnly/SameSite flags and server authorization are UNKNOWN.

Current user ID/object and persistence eligibility live in memory. State loads before session restoration; authenticated users trigger a second load. Disabled users are excluded. Admin initialization seeds surviving demo records and queues state persistence exactly as the build does. Demo literals are not newly invented users and do not prove real backend credentials.

Roles: student, teacher, admin. Each renderer and content helper retains its original role, level, group, program, publication and ownership checks. The UI is not a replacement for server authorization. Unauthenticated private views render login. A signed-in visit to login/register renders the account return card.

Login POST body: email (trimmed/lowercase) and password. Disabled, unactivated and throttled backend messages map to the original Arabic alerts; other login failures use the original generic alert. Successful login restores state, records activity, shows a toast and changes the hash to the role dashboard.

Activation token may enter through page query or hash query; it is moved to in-memory state and removed from the URL before #completeSignup. The invite resolves through /api/activation-invite, then the completion form validates password and confirmation before /api/activation-complete. The inferred safeJsonParse repair affects private reference storage/attachment editing, not authentication policy.

Local storage is used only for draggable sidebar coordinates. Session storage is read for private entity references. No additional persistence or auth library was introduced.
