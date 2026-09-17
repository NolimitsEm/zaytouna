import { state } from "../context/state.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:117-230 (La). */
function uniqueStrings(e) {
  const items = Array.isArray(e) ? e : [e];
  return [...new Set(items.map((r) => String(r || "").trim()).filter(Boolean))];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:230-421 (aa). */
function normalizeArabicText(e) {
  return String(e || "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:421-517 (cd). */
function normalizeCreatorRole(e) {
  const arabicText = normalizeArabicText(e);
  return arabicText === "admin" || arabicText === "اداره" || arabicText === "direction" ? "ADMIN" : "TEACHER";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:517-553 (es). */
function isAllGroupsAlias(e) {
  return state.allGroupsAliases.has(normalizeArabicText(e));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:553-808 (ld). */
function targetIds(e, t) {
  const r = t === "niveau" ? "niveauIds" : "groupeIds";
  const a = t === "niveau" ? "targetNiveauIds" : "targetGroupeIds";
  const n = t === "niveau" ? "niveauId" : "groupeId";
  const items = [...uniqueStrings(e?.[r]), ...uniqueStrings(e?.[a]), ...uniqueStrings(e?.[n])];
  const s = t === "groupe" ? items.filter((o) => !isAllGroupsAlias(o)) : items;
  return [...new Set(s)];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:808-849 (Zo). */
function targetLevelIds(e) {
  return targetIds(e || {}, "niveau");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:849-890 (ec). */
function targetGroupIds(e) {
  return targetIds(e || {}, "groupe");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:890-1078 (ei). */
function equalTarget(e, t, r = []) {
  if (!e || !t) return false;
  if (String(e) === String(t)) return true;
  const arabicText = normalizeArabicText(e);
  const arabicText2 = normalizeArabicText(t);
  if (arabicText && arabicText === arabicText2) return true;
  const namedTarget = findNamedTarget(e, r);
  const namedTarget2 = findNamedTarget(t, r);
  return !!(namedTarget && namedTarget2 && String(namedTarget.id) === String(namedTarget2.id));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:1078-1266 (tc). */
function matchesStudentAudience(e, t, r = {}) {
  if (!e || !t) return false;
  const a = uniqueStrings([e.studentIds, e.targetStudentIds].flat());
  return a.length && !a.some((n) => String(n) === String(t.id))
    ? false
    : matchesStudentLevel(e, t, r.niveaux) && matchesStudentGroup(e, t, r.groupes);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:1266-1434 (dm). */
function filterByUserRole(items, user, r = {}) {
  return user
    ? user.role === "admin"
      ? items
      : user.role === "teacher"
        ? items.filter((a) => isContentOwner(a, user.id))
        : user.role === "student"
          ? items.filter((a) => a.publishedToStudents !== false && matchesStudentAudience(a, user, r))
          : items
    : [];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:1434-1528 (Is). */
function isContentOwner(course, t) {
  return !course || !t
    ? false
    : [course.createdBy, course.teacherId].some((r) => String(r || "") === String(t));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:1528-1614 (um). */
function canEditContent(e, user) {
  return !e || !user
    ? false
    : user.role === "admin"
      ? true
      : user.role === "teacher"
        ? isContentOwner(e, user.id)
        : false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:1614-1762 (fm). */
function canViewContent(e, user, r = {}) {
  return !e || !user
    ? false
    : user.role === "admin"
      ? true
      : user.role === "teacher"
        ? isContentOwner(e, user.id)
        : user.role === "student"
          ? e.publishedToStudents !== false && matchesStudentAudience(e, user, r)
          : false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:1762-2348 (hm). */
function normalizeExamAudience(e, t = {}) {
  const course = {
    ...e,
  };
  const creatorRoleValue = normalizeCreatorRole(
    course.creatorRole || course.createdByRole || (course.createdBy === "admin" ? "admin" : "teacher"),
  );
  const n = course.createdBy || course.teacherId || (creatorRoleValue === "ADMIN" ? "admin" : "teacher");
  const i = targetLevelIds(course);
  const s = targetGroupIds(course);
  const o = uniqueStrings([course.studentIds, course.targetStudentIds].flat());
  course.createdBy = n;
  course.creatorRole = creatorRoleValue;
  course.createdByRole = creatorRoleValue.toLowerCase();
  course.teacherId = course.teacherId || (creatorRoleValue === "TEACHER" ? n : "admin");
  course.niveauIds = i;
  course.groupeIds = s;
  course.studentIds = o;
  course.niveauId = i[0] || course.niveauId || "";
  course.groupeId = s[0] || null;
  course.createdByName = course.createdByName || t.resolveUserName?.(n) || "";
  course.visibleToAdmin = true;
  course.publishedToStudents = course.publishedToStudents !== false;
  return course;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:2348-2491 (mm). */
function matchesStudentLevel(e, t, r = []) {
  const a = t.niveauId || t.niveau || t.niveauName || t.studyLevel;
  const n = targetLevelIds(e);
  return n.length ? n.some((i) => equalTarget(i, a, r)) : equalTarget(e.niveauId, a, r);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:2491-2665 (pm). */
function matchesStudentGroup(e, t, r = []) {
  const a = t.groupeId || t.groupe || t.groupeName;
  if (isAllGroupsAlias(e?.groupeId) || uniqueStrings(e?.groupeIds).some(isAllGroupsAlias)) return true;
  const n = targetGroupIds(e);
  return n.length ? n.some((i) => equalTarget(i, a, r)) : true;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:2665-2794 (_l). */
function findNamedTarget(e, t) {
  const arabicText = normalizeArabicText(e);
  return t.find(
    (a) =>
      String(a.id || "") === String(e || "") ||
      normalizeArabicText(a.id) === arabicText ||
      normalizeArabicText(a.name) === arabicText ||
      normalizeArabicText(a.label) === arabicText,
  );
}
