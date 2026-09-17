import { state } from "../context/state.js";
import { contentMatchesGroup, contentMatchesLevel, isExamPublished } from "./content-access.js";
import { subjectMatchesStudent } from "./formatters.js";
import { normalizeScheduleType } from "../pages/schedule.js";
import { uniqueTargetIds } from "../services/state-repository.js";
import { courseHref, currentRoute, routeQuery } from "../routes/router.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716643-716695 (Hh). */
function teacherSchedule(e) {
  return state.schedule.filter((course) => course.teacherId === e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716695-716836 (B_). */
function studentSchedule(e) {
  return state.schedule.filter(
    (t) =>
      contentMatchesLevel(t, e.niveauId) &&
      contentMatchesGroup(t, e.groupeId) &&
      scheduleTargetsStudent(t, e) &&
      subjectMatchesStudent(t.subjectId, e) &&
      (normalizeScheduleType(t.type) !== "exam" ||
        !examForSchedule(t) ||
        isExamPublished(examForSchedule(t))),
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716836-716913 (ad). */
function examForSchedule(e) {
  return state.exams.find((t) => Number(t.scheduleId) === Number(e?.id)) || null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716913-716990 (U_). */
function scheduleTargetsStudent(e, t) {
  const r = uniqueTargetIds(e?.studentIds);
  return !r.length || r.includes(t.id);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716990-718018 (q_). */
function scheduleItemHref(course) {
  if (
    state.currentUser?.role === "teacher" &&
    String(course.teacherId || "") === String(state.currentUser.id)
  )
    return normalizeScheduleType(course.type) === "lesson" && courseForSchedule(course)
      ? `#lesson?scheduleId=${encodeURIComponent(course.id)}`
      : `#${normalizeScheduleType(course.type) === "exam" ? "examPrep" : "lessonPrep"}?scheduleId=${encodeURIComponent(course.id)}`;
  if (state.currentUser?.role === "student")
    return `#${normalizeScheduleType(course.type) === "exam" ? "examSession" : "lesson"}?scheduleId=${encodeURIComponent(course.id)}`;
  if (state.currentUser?.role === "admin")
    return `#${normalizeScheduleType(course.type) === "exam" ? "examPreview" : "lesson"}?scheduleId=${encodeURIComponent(course.id)}`;
  const t = String(course.teacherId || "");
  const r = course.groupeId || null;
  const a = state.courses.find(
    (course2) =>
      String(course2.teacherId || "teacher") === t &&
      course2.subjectId === course.subjectId &&
      course2.niveauId === course.niveauId &&
      (course2.groupeId || null) === r,
  );
  const n = state.courses.find(
    (course2) =>
      String(course2.teacherId || "teacher") === t &&
      course2.subjectId === course.subjectId &&
      course2.niveauId === course.niveauId &&
      (!r || course2.groupeId === r || course2.groupeId === null),
  );
  const i =
    state.currentUser?.role === "teacher"
      ? null
      : state.courses.find(
          (o) =>
            o.subjectId === course.subjectId &&
            o.niveauId === course.niveauId &&
            (!r || o.groupeId === r || o.groupeId === null),
        );
  const s = a || n || i;
  return s ? courseHref("lesson", s.id) : `#courses?subject=${encodeURIComponent(course.subjectId || "")}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718018-718088 (j_). */
function courseForSchedule(e) {
  return state.courses.find((t) => Number(t.scheduleId) === Number(e.id));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718088-718293 (z_). */
function calendarMonth(e) {
  const scheduleMonth = routeQuery().get("scheduleMonth");
  if (isMonthValue(scheduleMonth)) return scheduleMonth;
  const a = monthKey(new Date());
  if (e.some((i) => String(i.date || "").startsWith(a))) return a;
  const n = upcomingSchedule(e).sort(compareSchedule)[0];
  return n?.date ? n.date.slice(0, 7) : a;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718293-718397 (H_). */
function isMonthValue(e) {
  if (!/^\d{4}-\d{2}$/.test(e || "")) return false;
  const t = Number(e.slice(5, 7));
  return t >= 1 && t <= 12;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718397-718484 (nd). */
function calendarMonthHref(e) {
  const t = routeQuery();
  t.set("scheduleMonth", e);
  return `#${currentRoute()}?${t.toString()}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718484-718572 (id). */
function shiftMonth(e, t) {
  const [r, a] = e.split("-").map(Number);
  const date = new Date(r, a - 1 + t, 1);
  return monthKey(date);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718572-718656 (wl). */
function monthKey(e) {
  return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718656-718727 (W_). */
function dateKey(e) {
  return `${monthKey(e)}-${String(e.getDate()).padStart(2, "0")}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718727-718874 (V_). */
function formatCalendarMonth(e) {
  const [t, r] = e.split("-").map(Number);
  return new Intl.DateTimeFormat("ar-TN", {
    month: "long",
    year: "numeric",
  }).format(new Date(t, r - 1, 1));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718874-718965 (Wh). */
function upcomingSchedule(items) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return items.filter((r) => scheduleTimestamp(r) >= date.getTime());
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:718965-719001 (Sl). */
function compareSchedule(e, t) {
  return scheduleTimestamp(e) - scheduleTimestamp(t);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719001-719086 (Qo). */
function scheduleTimestamp(e) {
  return new Date(`${e.date || ""}T${e.startTime || "00:00"}`).getTime() || 0;
}
