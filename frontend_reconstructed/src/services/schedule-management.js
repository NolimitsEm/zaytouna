import { state } from "../context/state.js";
import { scheduleDuration, scheduleStartsAt } from "../components/teaching.js";
import { absenceForSchedule } from "../pages/dashboards.js";
import { normalizeScheduleType, selectedScheduleStudents } from "../pages/schedule.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:661648-661712 (bk). */
function addSchedule(e) {
  const t = scheduleFromForm(e, nextScheduleId());
  return t ? ((state.schedule = [t, ...state.schedule]), true) : false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:661712-662205 (wk). */
function editSchedule(e, t) {
  const r = state.schedule.find((i) => i.id === e);
  if (!r) return false;
  const a = scheduleFromForm(t, e);
  if (!a) return false;
  const n = r.date !== a.date || r.startTime !== a.startTime || r.endTime !== a.endTime;
  if ((Object.assign(r, a), n)) {
    state.courses = state.courses.map((s) =>
      String(s.scheduleId) === String(e)
        ? {
            ...s,
            zoomStartTime: scheduleStartsAt(r),
            zoomDurationMinutes: scheduleDuration(r),
            lessonEndedAt: "",
          }
        : s,
    );
    const i = absenceForSchedule(e);
    if (i?.status === "approved") {
      i.status = "rescheduled";
      i.rescheduledAt = new Date().toISOString();
      i.rescheduledTo = {
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
      };
    }
  }
  return true;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:662205-662688 (Sh). */
function scheduleFromForm(e, t) {
  const r = e.get("title").trim();
  const scheduleType = normalizeScheduleType(e.get("type"));
  const subjectId = e.get("subjectId");
  const teacherId = e.get("teacherId");
  const niveauId = e.get("niveauId");
  const o = e.get("groupeId") || null;
  const date = e.get("date");
  const startTime = e.get("startTime");
  const endTime = e.get("endTime");
  const f = selectedScheduleStudents(e, niveauId, o);
  return f === null
    ? null
    : !r || !subjectId || !teacherId || !niveauId || !date || !startTime || !endTime
      ? (alert("بيانات الحصة ناقصة."), null)
      : startTime >= endTime
        ? (alert("وقت نهاية الحصة يجب أن يكون بعد وقت البداية."), null)
        : {
            id: t,
            title: r,
            type: scheduleType,
            subjectId: subjectId,
            teacherId: teacherId,
            niveauId: niveauId,
            groupeId: o,
            studentIds: f,
            date: date,
            startTime: startTime,
            endTime: endTime,
          };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:662688-662759 (yh). */
function nextScheduleId() {
  return state.schedule.reduce((e, t) => Math.max(e, Number(t.id) || 0), 0) + 1;
}
