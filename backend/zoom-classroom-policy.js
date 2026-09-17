// Zoom REST settings, verified against the official Meetings and Users APIs.
// Entry defaults are per meeting. Annotation is a setting of the Zoom host user
// and affects all meetings that user hosts, not just this application's lessons.
export function classroomEntrySettings() {
  return {
    // Teachers/admins enter through Zoom's host URL and keep normal host video.
    host_video: true,
    // Students enter through the participant URL with camera and microphone off.
    participant_video: false,
    mute_upon_entry: true
  };
}

export function classroomHostSettings() {
  // This disables Zoom screen annotations for everyone, including the host.
  // Do not invent a per-meeting or host-only annotation field: the documented
  // REST API exposes this boolean at the user-settings level.
  return { in_meeting: { annotation: false } };
}

export async function ensureClassroomAnnotationPolicy(requestZoom, hostUserId) {
  const settingsPath = `/users/${encodeURIComponent(hostUserId)}/settings`;
  try {
    await requestZoom(settingsPath, {
      method: "PATCH",
      body: JSON.stringify(classroomHostSettings())
    });
    // A successful PATCH alone is insufficient when group/account settings are
    // locked. Confirm the effective value before creating a classroom meeting.
    const effective = await requestZoom(settingsPath, { method: "GET" });
    if (effective?.in_meeting?.annotation !== false) {
      return { applied: false, reason: "not_confirmed" };
    }
    return { applied: true, reason: "confirmed" };
  } catch {
    // User-setting scopes are optional for meeting creation. Participant entry
    // defaults belong to the meeting request and must continue to work even if
    // this host-wide preference cannot be managed by the OAuth application.
    return { applied: false, reason: "unavailable" };
  }
}
