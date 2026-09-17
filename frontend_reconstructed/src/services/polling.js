import { state } from "../context/state.js";
import { currentRoute, renderRoute, routeQuery } from "../routes/router.js";
import { fetchApplicationState } from "./state-repository.js";
import { syncZoomRecording } from "./zoom.js";
import { lessonSessionAvailability, recordingLinks } from "../pages/lessons.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:414478-415112 (zo). */
function scheduleStatePolling(e) {
  if (state.runtime.scheduleStatePollTimeout) {
    clearTimeout(state.runtime.scheduleStatePollTimeout);
    state.runtime.scheduleStatePollTimeout = null;
  }
  if (
    (e === "student" && state.currentUser?.role === "student") ||
    (e === "teacher" && state.currentUser?.role === "teacher") ||
    (e === "adminAbsences" && state.currentUser?.role === "admin") ||
    (e === "lessons" && state.currentUser?.role === "admin")
  ) {
    state.runtime.scheduleStatePollTimeout = setTimeout(
      async () => {
        if (currentRoute() === e)
          try {
            if (
              document.querySelector(
                ".teacher-course-edit-details[open], form[data-saving]",
              )
            ) {
              scheduleStatePolling(e);
              return;
            }
            const r = JSON.stringify(state.schedule);
            const a = JSON.stringify(state.teacherAbsences);
            const n = JSON.stringify(state.courses);
            await fetchApplicationState();
            if (
              JSON.stringify(state.schedule) !== r ||
              JSON.stringify(state.teacherAbsences) !== a ||
              JSON.stringify(state.courses) !== n
            ) {
              renderRoute({
                silentActivity: true,
              });
            } else {
              scheduleStatePolling(e);
            }
          } catch (r) {
            console.warn("Schedule refresh failed:", r.message);
            scheduleStatePolling(e);
          }
      },
      ["adminAbsences", "lessons"].includes(e) ? 1e3 : 1e4,
    );
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:415112-415440 (Cy). */
function scheduleLessonPolling(e) {
  if (
    (state.runtime.zoomRecordingPollTimeout &&
      (clearTimeout(state.runtime.zoomRecordingPollTimeout),
      (state.runtime.zoomRecordingPollTimeout = null)),
    state.runtime.lessonStatePollTimeout &&
      (clearTimeout(state.runtime.lessonStatePollTimeout),
      (state.runtime.lessonStatePollTimeout = null)),
    !["lesson", "lessonPreview"].includes(e))
  )
    return;
  const t = currentLesson(e);
  syncZoomRecording(t);
  pollZoomRecording(t, e);
  pollLessonState(t, e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:415440-415745 (Af). */
function pollLessonState(e, t) {
  if (state.runtime.lessonStatePollTimeout) {
    clearTimeout(state.runtime.lessonStatePollTimeout);
  }
  if (e) {
    state.runtime.lessonStatePollTimeout = setTimeout(async () => {
      const r = currentRoute();
      if (!(r !== t || !["lesson", "lessonPreview"].includes(r)))
        try {
          await fetchApplicationState();
          renderRoute();
        } catch (a) {
          console.warn("Lesson state refresh failed:", a.message);
          pollLessonState(currentLesson(r), r);
        }
    }, 1e4);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:415745-415950 (Rc). */
function currentLesson(e = currentRoute()) {
  const t = routeQuery();
  if (e === "lesson") {
    const a = Number(t.get("scheduleId")) || null;
    if (a) return state.courses.find((n) => Number(n.scheduleId) === a);
  }
  const id = t.get("id");
  return state.courses.find((a) => String(a.id) === String(id));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:415950-416270 (kf). */
function pollZoomRecording(e, t) {
  if (
    (!e?.zoomMeetingId && !e?.zoomMeetingUuid) ||
    recordingLinks(e).length ||
    e.zoomRecordingStatus === "failed"
  )
    return;
  const r = recordingPollDelay(e);
  state.runtime.zoomRecordingPollTimeout = setTimeout(async () => {
    const a = currentRoute();
    if (a !== t || !["lesson", "lessonPreview"].includes(a)) return;
    const n = currentLesson(a);
    if (!(!n || String(n.id) !== String(e.id))) {
      await syncZoomRecording(n);
      pollZoomRecording(n, a);
    }
  }, r);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:416270-416441 ($y). */
function recordingPollDelay(e, t = new Date()) {
  if (e?.lessonEndedAt) return 1e4;
  const r = lessonSessionAvailability(e, t);
  if (!r.endsAt) return 6e4;
  const a = r.endsAt.getTime() - t.getTime();
  return a > 0 ? Math.min(a + 3e4, 3e5) : 6e4;
}
