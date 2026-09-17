import { state } from "../context/state.js";
import { targetGroupIds, targetLevelIds } from "./audience.js";
import { creatorRole } from "../services/state-repository.js";
import { userName } from "../services/results.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719086-719206 (io). */
function activeTeachers() {
  const e = state.users.filter((user) => user.role === "teacher" && !user.isDisabled);
  return e.length
    ? e
    : [
        {
          id: "teacher",
          name: "الأستاذ",
        },
      ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719206-719263 (yl). */
function teacherName(e) {
  return state.users.find((t) => t.id === e)?.name || e || "-";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719263-719295 (Tl). */
function contentLevelIds(e) {
  return targetLevelIds(e || {});
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719295-719327 (En). */
function contentGroupIds(e) {
  return targetGroupIds(e || {});
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719327-719408 (tn). */
function contentLevelLabels(e) {
  const items = contentLevelIds(e);
  return items.length ? items.map(levelName).join("، ") : "كل المستويات";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719408-719489 (An). */
function contentGroupLabels(e) {
  const items = contentGroupIds(e);
  return items.length ? items.map(groupName).join("، ") : "كل المجموعات";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719489-719661 (sd). */
function contentCreatorLabel(course) {
  return `${creatorRole(course?.creatorRole || course?.createdByRole || (course?.createdBy === "admin" ? "admin" : "teacher")) === "ADMIN" ? "إدارة" : "أستاذ"}: ${userName(course?.createdBy || course?.teacherId || "")}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719661-719827 (Vh). */
function subjectMatchesStudent(e, t) {
  const r = state.subjects.find((i) => i.id === e);
  if (!r) return true;
  const a = !r.program || !t.program || r.program === t.program;
  const n = !r.niveauId || r.niveauId === t.niveauId;
  return a && n;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719827-719896 (Gh). */
function visibleSubjects() {
  return state.currentUser?.role !== "student"
    ? state.subjects
    : state.subjects.filter((e) => subjectMatchesStudent(e.id, state.currentUser));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719896-719930 (wt). */
function hasRole(e) {
  return state.currentUser?.role === e;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720006-720058 (ot). */
function subjectName(e) {
  return state.subjects.find((t) => t.id === e)?.name || e;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720058-720192 (xa). */
function subjectDisplayName(e) {
  const t = [e.program, e.niveauId ? levelName(e.niveauId) : ""].filter(Boolean);
  return t.length ? `${e.name} - ${t.join(" - ")}` : e.name;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720192-720244 (We). */
function levelName(e) {
  return state.levels.find((t) => t.id === e)?.name || e;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720244-720296 (at). */
function groupName(e) {
  return state.groups.find((t) => t.id === e)?.name || e;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720296-720509 (so). */
function parseScore(e) {
  if (String(e || "").includes("قيد التصحيح")) return null;
  const t = String(e || "").match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!t) return null;
  const r = Number(t[1]);
  const a = Number(t[2]);
  return a ? (r / a) * 20 : null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720509-720618 (Rn). */
function average(e) {
  if (!e.length) return null;
  const t = e.reduce((r, a) => r + a, 0) / e.length;
  return Math.round(t * 100) / 100;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720618-720747 ($e). */
function renderOption(e, t, r = "") {
  const a = Array.isArray(r) ? r.includes(e) : e === r;
  return `<option value="${e}" ${a ? "selected" : ""}>${t}</option>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720747-720873 (h). */
function escapeHtml(e) {
  return String(e)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:720873-721395 (Wa). */
function safeUrl(e, t = {}) {
  const { allowData: r = true, dataTypes: a = ["image", "audio", "video", "application/pdf"] } = t;
  const n = String(e || "").trim();
  if (!n) return "";
  if (/^(assets\/|\/assets\/|#)/i.test(n)) return n;
  if (/^data:/i.test(n)) {
    if (!r) return "";
    const i = n.match(/^data:([^;,]+);base64,/i);
    if (!i) return "";
    const s = i[1].toLowerCase();
    return a.some((c) => (c.endsWith("/") ? s.startsWith(c) : s === c || s.startsWith(`${c}/`))) ? n : "";
  }
  try {
    const url = new URL(n, window.location.origin);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? n : "";
  } catch {
    return "";
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:721395-721458 (Rr). */
function safeImageUrl(e) {
  return safeUrl(e, {
    allowData: true,
    dataTypes: ["image"],
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:721458-721577 (ct). */
function formatDateTime(e) {
  return e
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(e))
    : "-";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:721577-721829 (Xh). */
function activityDuration(e) {
  const t = new Date(e.loginAt).getTime();
  const r = new Date(e.logoutAt || e.lastActivityAt || Date.now()).getTime();
  const a = Math.max(0, Math.round((r - t) / 6e4));
  if (a < 60) return `${a} دقيقة`;
  const n = Math.floor(a / 60);
  const i = a % 60;
  return `${n} ساعة${i ? ` و ${i} دقيقة` : ""}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:721829-722124 (Yh). */
function lessonDuration(e) {
  const t = new Date(e.openedAt).getTime();
  const r = new Date(e.closedAt || Date.now()).getTime();
  if (!Number.isFinite(t) || !Number.isFinite(r)) return "-";
  const a = Math.max(0, Math.round((r - t) / 6e4));
  if (a < 60) return `${a} دقيقة`;
  const n = Math.floor(a / 60);
  const i = a % 60;
  return `${n} ساعة${i ? ` و ${i} دقيقة` : ""}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:722124-722266 (rn). */
function activityStatus(e) {
  if (e.status !== "متصل") return e.status;
  const t = new Date(e.lastActivityAt).getTime();
  return (Date.now() - t) / 6e4 > 15 ? "غير نشط" : "متصل";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:722266-722411 (G_). */
function latestUserActivity(e) {
  return (
    state.activityLog
      .filter((t) => t.userId === e)
      .sort((t, r) => new Date(r.lastActivityAt).getTime() - new Date(t.lastActivityAt).getTime())[0] || null
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:722411-722492 (Qr). */
function activityRole(user) {
  return user.role ? user.role : state.users.find((r) => r.id === user.userId)?.role || "student";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:722492-722586 (Pr). */
function roleLabel(e) {
  return e === "admin" ? "إدارة" : e === "teacher" ? "أستاذ" : e === "student" ? "طالب" : "مستخدم";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:722586-722676 (od). */
function registrationStatus(e) {
  return (
    {
      pending: "في الانتظار",
      accepted: "مقبول",
      rejected: "مرفوض",
    }[e] ||
    e ||
    "-"
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:722676-722786 (X_). */
function activityStatusClass(e) {
  return (
    {
      متصل: "online",
      "غير نشط": "inactive",
      "غير متصل": "offline",
      معطّل: "disabled",
    }[e] || "offline"
  );
}
