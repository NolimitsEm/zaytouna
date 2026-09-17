import { state } from "../context/state.js";
import {
  canEditContent,
  canViewContent,
  equalTarget,
  filterByUserRole,
  isContentOwner,
  matchesStudentAudience,
} from "./audience.js";
import { questionnaireAudience } from "../components/question-builders.js";
import { contentGroupIds, contentLevelIds } from "./formatters.js";
import { isAllGroups, uniqueTargetIds } from "../services/state-repository.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:714529-714799 (hl). */
function listingFilters(e) {
  const [, t = ""] = location.hash.split("?");
  const query = new URLSearchParams(t);
  const a = state.currentUser?.role === "student" ? state.currentUser : null;
  return {
    subject: e || query.get("subject") || "",
    lockSubject: !!e,
    niveau: a?.niveauId || query.get("niveau") || "",
    groupe: a?.groupeId || query.get("groupe") || "",
    search: query.get("search") || "",
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:714799-715166 (no). */
function filterContent(e, t, r = {}) {
  let items = e;
  if (
    (state.currentUser?.role === "student"
      ? (items =
          r.studentMode === "recipientsOnly"
            ? audienceOnlyContent(items, state.currentUser)
            : studentContent(items, state.currentUser))
      : (t.niveau && (items = items.filter((n) => contentMatchesLevel(n, t.niveau))),
        t.groupe && (items = items.filter((n) => contentMatchesGroup(n, t.groupe)))),
    t.subject && (items = items.filter((n) => n.subjectId === t.subject)),
    t.search)
  ) {
    const n = t.search.toLowerCase();
    items = items.filter((i) => `${i.title} ${i.description || ""}`.toLowerCase().includes(n));
  }
  return items;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715166-715221 (Uh). */
function visibleCourses(e) {
  return state.currentUser?.role === "teacher" ? teacherCourses(state.currentUser.id, e) : e;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715221-715269 (ml). */
function teacherCourses(e, items = state.courses) {
  return items.filter((r) => isCourseTeacher(r, e));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715269-715345 (Ci). */
function isCourseTeacher(course, t) {
  return !course || !t ? false : String(course.teacherId || "teacher") === String(t);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715345-715427 ($i). */
function canEditCourse(e) {
  return e
    ? state.currentUser?.role === "admin"
      ? true
      : state.currentUser?.role === "teacher"
        ? isCourseTeacher(e, state.currentUser.id)
        : false
    : false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715427-715471 (pl). */
function audienceContext() {
  return {
    niveaux: state.levels,
    groupes: state.groups,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715471-715506 (mi). */
function visibleExams(e) {
  return filterByUserRole(e, state.currentUser, audienceContext());
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715506-715556 (gl). */
function isExamPublished(e) {
  return e?.publishedToStudents !== false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715556-715690 (xl). */
function visibleQuestionnaires(items) {
  return state.currentUser?.role === "student"
    ? studentContent(
        items.filter((t) => questionnaireAudience(t) === "students"),
        state.currentUser,
      )
    : state.currentUser?.role === "teacher"
      ? items.filter((t) => questionnaireAudience(t) === "teachers")
      : items;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715690-715836 (O_). */
function canAnswerQuestionnaire(e, user) {
  return user?.role === "admin"
    ? true
    : user?.role === "teacher"
      ? questionnaireAudience(e) === "teachers"
      : user?.role === "student"
        ? questionnaireAudience(e) === "students" && studentContent([e], user).length > 0
        : false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715836-715868 (_s). */
function isExamOwner(e, t) {
  return isContentOwner(e, t);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715868-715898 (Ni). */
function canManageExam(e) {
  return canEditContent(e, state.currentUser);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715898-715952 (vl). */
function canCorrectExam(e) {
  return state.currentUser?.role === "teacher" && isExamOwner(e, state.currentUser.id);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715952-715987 (L_). */
function canAccessExam(e) {
  return canViewContent(e, state.currentUser, audienceContext());
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:715987-716041 (Dn). */
function studentContent(items, t) {
  return items.filter((r) => contentMatchesStudent(r, t) && contentMatchesProgram(r, t));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716041-716086 (qh). */
function audienceOnlyContent(items, t) {
  return items.filter((r) => contentMatchesStudent(r, t));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716086-716123 (jh). */
function contentMatchesStudent(e, t) {
  return matchesStudentAudience(e, t, audienceContext());
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716123-716206 (Di). */
function contentMatchesLevel(e, t) {
  const r = contentLevelIds(e);
  return r.length ? r.some((a) => equalLevel(a, t)) : equalLevel(e.niveauId, t);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716206-716367 (bl). */
function contentMatchesGroup(e, t) {
  if (t === "all") return contentGroupIds(e).length === 0;
  if (isAllGroups(e?.groupeId) || uniqueTargetIds(e?.groupeIds).some(isAllGroups)) return true;
  const r = contentGroupIds(e);
  return r.length ? r.some((a) => equalGroup(a, t)) : true;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716367-716402 (rd). */
function equalLevel(e, t) {
  return equalTarget(e, t, state.levels);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716402-716442 (zh). */
function equalGroup(e, t) {
  return e ? equalTarget(e, t, state.groups) : true;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:716442-716643 (M_). */
function contentMatchesProgram(e, t) {
  const r = state.subjects.find((i) => i.id === e.subjectId);
  if (!r) return true;
  const a = !r.program || !t.program || r.program === t.program;
  const n = !r.niveauId || r.niveauId === t.niveauId || e.niveauId === t.niveauId;
  return a && n;
}
