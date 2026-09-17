import {
  activityDuration,
  activityRole,
  activityStatus,
  escapeHtml,
  formatDateTime,
  groupName,
  hasRole,
  lessonDuration,
  levelName,
  roleLabel,
  subjectName,
} from "../utils/formatters.js";
import { renderLoginPage } from "./account.js";
import { recordActivity } from "../services/settings-and-activity.js";
import { state } from "../context/state.js";
import { renderDashboard, renderStat } from "../components/content-management.js";
import { onlineUserCount } from "./assessment-management.js";
import { userName } from "../services/results.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:599317-601132 (CA). */
function renderLogsPage() {
  if (!hasRole("admin")) return renderLoginPage();
  recordActivity(state.currentUser, "activity");
  const e = state.activityLog.filter((a) => activityRole(a) === "admin");
  const t = state.activityLog.filter((a) => activityRole(a) === "teacher");
  const r = state.activityLog.filter((a) => activityRole(a) === "student");
  return renderDashboard(
    "سجل الدخول والخروج",
    `
    <div class="stats-grid">
      ${renderStat("المتصلون الآن", onlineUserCount())}
      ${renderStat("غير نشطين", state.activityLog.filter((a) => activityStatus(a) === "غير نشط").length)}
      ${renderStat("جلسات الطلبة", state.activityLog.filter((a) => activityRole(a) === "student").length)}
      ${renderStat("جلسات الأساتذة", state.activityLog.filter((a) => activityRole(a) === "teacher").length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>الإدارة</h2>
          <p>جلسات حسابات الإدارة وحدها.</p>
        </div>
        <div class="toolbar">
          <button class="button secondary" type="button" data-export-log="admin">Export Excel</button>
          <a class="button ghost" href="#admin">رجوع للوحة الإدارة</a>
        </div>
      </div>
      ${renderActivityTable(e, "لا توجد جلسات إدارة مسجلة بعد.")}
    </section>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>الأساتذة</h2>
        </div>
        <button class="button secondary" type="button" data-export-log="teacher">Export Excel</button>
      </div>
      ${renderActivityTable(t, "لا توجد جلسات أساتذة مسجلة بعد.")}
    </section>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>حصص الأساتذة على الرابط</h2>
        </div>
        <button class="button secondary" type="button" data-export-log="lesson">Export Excel</button>
      </div>
      ${renderLessonSessionTable()}
    </section>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>الطلبة</h2>
        </div>
        <button class="button secondary" type="button" data-export-log="student">Export Excel</button>
      </div>
      ${renderActivityTable(r, "لا توجد جلسات طلبة مسجلة بعد.")}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:601132-602237 (Ao). */
function renderActivityTable(items = state.activityLog, t = "لا توجد جلسات مسجلة بعد.") {
  return items.length
    ? `
    <div class="table-wrap log-table-scroll">
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الدور</th>
            <th>المستوى</th>
            <th>المجموعة</th>
            <th>الحالة</th>
            <th>الدخول</th>
            <th>آخر نشاط</th>
            <th>المدة</th>
            <th>آخر صفحة</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.userName || r.studentName || "-")}</td>
              <td>${escapeHtml(r.roleLabel || roleLabel(activityRole(r)))}</td>
              <td>${r.niveauId ? levelName(r.niveauId) : "-"}</td>
              <td>${r.groupeId ? groupName(r.groupeId) : "-"}</td>
              <td><span class="chip ${activityStatus(r) === "متصل" ? "turquoise" : ""}">${activityStatus(r)}</span></td>
              <td>${formatDateTime(r.loginAt)}</td>
              <td>${formatDateTime(r.lastActivityAt)}</td>
              <td>${activityDuration(r)}</td>
              <td>${escapeHtml(r.page || "-")}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
    : `<div class="empty-state">${escapeHtml(t)}</div>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:602237-603386 ($A). */
function renderLessonSessionTable() {
  return state.lessonSessionLog.length
    ? `
    <div class="table-wrap log-table-scroll">
      <table>
        <thead>
          <tr>
            <th>الأستاذ</th>
            <th>الدرس</th>
            <th>المادة</th>
            <th>المستوى</th>
            <th>المجموعة</th>
            <th>فتح الرابط</th>
            <th>غلق الرابط</th>
            <th>مدة التدريس online</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${state.lessonSessionLog
            .map(
              (course) => `
            <tr>
              <td>${escapeHtml(course.teacherName || userName(course.teacherId))}</td>
              <td>${escapeHtml(course.courseTitle || "-")}</td>
              <td>${course.subjectId ? subjectName(course.subjectId) : "-"}</td>
              <td>${course.niveauId ? levelName(course.niveauId) : "-"}</td>
              <td>${course.groupeId ? groupName(course.groupeId) : "كل المجموعات"}</td>
              <td>${formatDateTime(course.openedAt)}</td>
              <td>${formatDateTime(course.closedAt)}</td>
              <td>${lessonDuration(course)}</td>
              <td><span class="chip ${course.status === "مفتوح" ? "turquoise" : ""}">${escapeHtml(course.status || "-")}</span></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
    : '<div class="empty-state">لا توجد حصص online مسجلة بعد.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:603386-603825 (NA). */
function exportSessionLogs(e) {
  const r = {
    admin: {
      filename: "sessions-admin.csv",
      rows: state.activityLog.filter((a) => activityRole(a) === "admin").map(activityExportRow),
    },
    teacher: {
      filename: "sessions-enseignants.csv",
      rows: state.activityLog.filter((a) => activityRole(a) === "teacher").map(activityExportRow),
    },
    student: {
      filename: "sessions-etudiants.csv",
      rows: state.activityLog.filter((a) => activityRole(a) === "student").map(activityExportRow),
    },
    lesson: {
      filename: "sessions-cours-online.csv",
      rows: state.lessonSessionLog.map(lessonSessionExportRow),
    },
  }[e];
  if (r) {
    if (!r.rows.length) {
      alert("لا توجد بيانات للتصدير.");
      return;
    }
    downloadCsv(r.filename, r.rows);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:603825-604114 (ko). */
function activityExportRow(e) {
  return {
    الاسم: e.userName || e.studentName || "-",
    الدور: e.roleLabel || roleLabel(activityRole(e)),
    المستوى: e.niveauId ? levelName(e.niveauId) : "-",
    المجموعة: e.groupeId ? groupName(e.groupeId) : "-",
    الحالة: activityStatus(e),
    الدخول: formatDateTime(e.loginAt),
    "آخر نشاط": formatDateTime(e.lastActivityAt),
    الخروج: formatDateTime(e.logoutAt),
    المدة: activityDuration(e),
    "آخر صفحة": e.page || "-",
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:604114-604460 (DA). */
function lessonSessionExportRow(course) {
  return {
    الأستاذ: course.teacherName || userName(course.teacherId),
    الدرس: course.courseTitle || "-",
    المادة: course.subjectId ? subjectName(course.subjectId) : "-",
    المستوى: course.niveauId ? levelName(course.niveauId) : "-",
    المجموعة: course.groupeId ? groupName(course.groupeId) : "كل المجموعات",
    "فتح الرابط": formatDateTime(course.openedAt),
    "غلق الرابط": formatDateTime(course.closedAt),
    "مدة التدريس online": lessonDuration(course),
    الحالة: course.status || "-",
    الرابط: course.conferenceUrl || "-",
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:604460-604800 (RA). */
function downloadCsv(e, items) {
  const items2 = Object.keys(items[0]);
  const a = [items2.join(";"), ...items.map((o) => items2.map((c) => csvCell(o[c])).join(";"))].join(`
`);
  const blob = new Blob([`\uFEFF${a}`], {
    type: "text/csv;charset=utf-8",
  });
  const i = URL.createObjectURL(blob);
  const element = document.createElement("a");
  element.href = i;
  element.download = e;
  document.body.appendChild(element);
  element.click();
  element.remove();
  setTimeout(() => URL.revokeObjectURL(i), 1e3);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:604800-604863 (PA). */
function csvCell(e) {
  return `"${String(e ?? "").replaceAll('"', '""')}"`;
}
