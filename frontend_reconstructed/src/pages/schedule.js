import {
  activeTeachers,
  escapeHtml,
  groupName,
  hasRole,
  levelName,
  renderOption,
  subjectDisplayName,
  subjectName,
  teacherName,
} from "../utils/formatters.js";
import { renderLoginPage } from "./account.js";
import {
  calendarMonth,
  calendarMonthHref,
  compareSchedule,
  dateKey,
  formatCalendarMonth,
  scheduleItemHref,
  shiftMonth,
  upcomingSchedule,
} from "../utils/calendar.js";
import { state } from "../context/state.js";
import { renderDashboard, renderStat } from "../components/content-management.js";
import { uniqueTargetIds } from "../services/state-repository.js";
import { userName } from "../services/results.js";
import { isApprovedAbsence } from "./dashboards.js";
import { normalizeArabicText } from "../utils/audience.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:572283-573068 (rA). */
function renderSchedulePage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = upcomingSchedule(state.schedule).length;
  const t = new Set(state.schedule.map((course) => course.teacherId).filter(Boolean)).size;
  return renderDashboard(
    "تنظيم الحصص",
    `
    <div class="stats-grid">
      ${renderStat("الحصص", state.schedule.length)}
      ${renderStat("القادمة", e)}
      ${renderStat("الأساتذة", t)}
      ${renderStat("المجموعات", state.groups.length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>إضافة حصة</h2>
          <p>الإدارة تحدد الأستاذ، المادة، القسم/المستوى، الفوج، واليوم والوقت.</p>
        </div>
        <a class="button ghost" href="#admin">رجوع للوحة</a>
      </div>
      ${renderScheduleForm()}
    </section>
    <section class="panel">
      <h2>الرزنامة</h2>
      ${renderScheduleCalendar(state.schedule)}
    </section>
    <section class="panel">
      <h2>قائمة الحصص</h2>
      ${renderScheduleTable(state.schedule)}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:573068-575354 (aA). */
function renderScheduleForm() {
  return `
    <form class="grid two schedule-add-form" data-schedule-add-form>
      <div class="field">
        <label for="scheduleTitleNew">عنوان الحصة</label>
        <input id="scheduleTitleNew" name="title" placeholder="مثال: مراجعة التجويد" required>
      </div>
      <div class="field">
        <label for="scheduleTypeNew">نوع الحصة</label>
        <select id="scheduleTypeNew" name="type" required>
          ${renderScheduleTypeOptions()}
        </select>
      </div>
      <div class="field">
        <label for="scheduleSubjectNew">المادة</label>
        <select id="scheduleSubjectNew" name="subjectId">${state.subjects.map((e) => renderOption(e.id, subjectDisplayName(e))).join("")}</select>
      </div>
      <div class="field">
        <label for="scheduleTeacherNew">الأستاذ</label>
        <select id="scheduleTeacherNew" name="teacherId">${activeTeachers()
          .map((e) => renderOption(e.id, e.name))
          .join("")}</select>
      </div>
      <div class="field">
        <label for="scheduleNiveauNew">القسم / المستوى</label>
        <select id="scheduleNiveauNew" name="niveauId" data-schedule-niveau-control>${state.levels.map((e) => renderOption(e.id, e.name)).join("")}</select>
      </div>
      <div class="field">
        <label for="scheduleGroupeNew">الفوج</label>
        <select id="scheduleGroupeNew" name="groupeId" data-schedule-groupe-control>
          <option value="">كل الأفواج</option>
          ${state.groups.map((e) => renderOption(e.id, e.name)).join("")}
        </select>
      </div>
      <div class="field span-two schedule-student-field">
        <label>طلبة محددون</label>
        ${renderScheduleStudentPicker([], state.levels[0]?.id || "")}
        <small class="muted">تظهر الطلبة حسب القسم والفوج المختارين. «كل الأفواج» يعرض طلبة القسم كاملًا. اترك الاختيار فارغًا لتشمل الحصة كامل الفئة المحددة.</small>
      </div>
      <div class="field">
        <label for="scheduleDateNew">التاريخ</label>
        <input id="scheduleDateNew" name="date" type="date" required>
      </div>
      <div class="field">
        <label for="scheduleStartNew">بداية الحصة</label>
        <input id="scheduleStartNew" name="startTime" type="time" required>
      </div>
      <div class="field">
        <label for="scheduleEndNew">نهاية الحصة</label>
        <input id="scheduleEndNew" name="endTime" type="time" required>
      </div>
      <div class="form-actions">
        <button class="button primary" type="submit">إضافة الحصة</button>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:575354-575408 (sa). */
function normalizeScheduleType(e) {
  return state.scheduleTypes.some((t) => t.id === e) ? e : "lesson";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:575408-575473 (Vo). */
function scheduleTypeLabel(e) {
  return state.scheduleTypes.find((t) => t.id === normalizeScheduleType(e))?.label || "حصة درس";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:575473-575547 (rh). */
function renderScheduleTypeOptions(e = "lesson") {
  return state.scheduleTypes.map((t) => renderOption(t.id, t.label, normalizeScheduleType(e))).join("");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:575547-576334 (ah). */
function renderScheduleStudentPicker(e = [], t = "", r = "", formId = "") {
  const a = uniqueTargetIds(e);
  const n = Boolean(String(t ?? "").trim());
  const i = state.users.filter(
    (user) => user.role === "student" && !user.isDisabled && studentMatchesCohort(user, t, r),
  ).length;
  return `
    <details class="schedule-student-picker" data-schedule-student-picker>
      <summary>
        <span data-schedule-student-count>${a.length ? `${a.length} طالب` : "اختيار طلبة"}</span>
      </summary>
      <div class="schedule-student-menu">
        <input type="search" placeholder="ابحث باسم الطالب" data-schedule-student-search>
        <div class="schedule-student-list" data-schedule-student-list>
          ${renderScheduleStudents(a, t, r, formId)}
          <div class="schedule-student-empty" data-schedule-student-empty ${n && i ? "hidden" : ""}>
            ${n ? "لا يوجد طلبة نشطون في القسم والفوج المحددين." : "اختر القسم لعرض طلبته."}
          </div>
        </div>
      </div>
    </details>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:576334-577021 (nA). */
function renderScheduleStudents(e = [], t = "", r = "", formId = "") {
  const a = uniqueTargetIds(e);
  return state.users
    .filter((user) => user.role === "student" && !user.isDisabled)
    .map((n) => {
      const i = studentMatchesCohort(n, t, r);
      return `
        <label
          class="schedule-student-option"
          data-niveau-id="${escapeHtml(String(n.niveauId ?? "").trim())}"
          data-groupe-id="${escapeHtml(String(n.groupeId ?? "").trim())}"
          data-student-name="${escapeHtml(normalizeArabicText(n.name))}"
          data-target-hidden="${i ? "false" : "true"}"
          ${i ? "" : "hidden"}
        >
          <input name="studentIds" type="checkbox" value="${escapeHtml(String(n.id).trim())}" ${formId ? `form="${escapeHtml(formId)}"` : ""} ${a.includes(String(n.id).trim()) && i ? "checked" : ""} ${i ? "" : "disabled"}>
          <span>${escapeHtml(n.name)}</span>
          <small>${levelName(n.niveauId)} · ${groupName(n.groupeId)}</small>
        </label>
      `;
    })
    .join("");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:577021-577094 (Hc). */
function studentMatchesCohort(e, t, r) {
  // Cohort IDs can arrive as JSON numbers or strings. Empty group means all
  // groups in the selected level, matching the actual select option.
  const levelId = String(t ?? "").trim();
  const groupId = String(r ?? "").trim();
  return Boolean(levelId) && String(e.niveauId ?? "").trim() === levelId &&
    (!groupId || String(e.groupeId ?? "").trim() === groupId);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:577094-577360 (iA). */
function selectedScheduleStudents(e, t, r) {
  const items = uniqueTargetIds(e.getAll("studentIds"));
  if (!items.length) return [];
  const n = state.users
    .filter((user) => user.role === "student" && !user.isDisabled && studentMatchesCohort(user, t, r))
    .map((s) => String(s.id).trim());
  return items.filter((s) => !n.includes(s)).length
    ? (alert("اختر فقط الطلبة التابعين للمستوى والفوج المحددين."), null)
    : items;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:577360-577458 (sA). */
function scheduleAudienceLabel(e) {
  const items = uniqueTargetIds(e?.studentIds);
  return items.length ? items.map(userName).join("، ") : "طلبة الفوج المحدد";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:577458-578108 (oA). */
function renderScheduleTable(e) {
  return e.length
    ? `
    <div class="table-wrap managed-table-wrap">
      <table class="managed-table schedule-table">
        <thead>
          <tr>
            <th>الحصة</th>
            <th>النوع</th>
            <th>الأستاذ</th>
            <th>المادة</th>
            <th>القسم</th>
            <th>الفوج</th>
            <th>الطلبة</th>
            <th>التاريخ</th>
            <th>الوقت</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${[...e]
            .sort(compareSchedule)
            .map((r) => renderScheduleRow(r))
            .join("")}
        </tbody>
      </table>
    </div>
  `
    : '<div class="empty-state">لا توجد حصص مبرمجة حاليا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:578108-579862 (cA). */
function renderScheduleRow(course) {
  const t = `schedule-edit-${course.id}`;
  return `
    <tr>
      <td><input form="${t}" name="title" value="${escapeHtml(course.title || "")}" required></td>
      <td>
        <select form="${t}" name="type" required>
          ${renderScheduleTypeOptions(course.type)}
        </select>
      </td>
      <td>
        <select form="${t}" name="teacherId">
          ${activeTeachers()
            .map((r) => renderOption(r.id, r.name, course.teacherId))
            .join("")}
        </select>
      </td>
      <td>
        <select form="${t}" name="subjectId">
          ${state.subjects.map((r) => renderOption(r.id, subjectDisplayName(r), course.subjectId)).join("")}
        </select>
      </td>
      <td>
        <select form="${t}" name="niveauId" data-schedule-niveau-control>
          ${state.levels.map((r) => renderOption(r.id, r.name, course.niveauId)).join("")}
        </select>
      </td>
      <td>
        <select form="${t}" name="groupeId" data-schedule-groupe-control>
          <option value="" ${course.groupeId ? "" : "selected"}>كل الأفواج</option>
          ${state.groups.map((r) => renderOption(r.id, r.name, course.groupeId || "")).join("")}
        </select>
      </td>
      <td>
        ${renderScheduleStudentPicker(course.studentIds, course.niveauId, course.groupeId, t)}
      </td>
      <td><input form="${t}" name="date" type="date" value="${escapeHtml(course.date || "")}" required></td>
      <td>
        <div class="schedule-time-edit">
          <input form="${t}" name="startTime" type="time" value="${escapeHtml(course.startTime || "")}" required>
          <input form="${t}" name="endTime" type="time" value="${escapeHtml(course.endTime || "")}" required>
        </div>
      </td>
      <td>
        <form id="${t}" class="table-action-form" data-schedule-edit-form data-schedule-id="${course.id}">
          <button class="button secondary" type="submit">حفظ</button>
          <button class="button ghost danger" type="button" data-delete-schedule="${course.id}">حذف</button>
        </form>
      </td>
    </tr>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:579862-581925 (Wc). */
function renderScheduleCalendar(items) {
  const t = calendarMonth(items);
  const [r, a] = t.split("-").map(Number);
  const n = a - 1;
  const i = new Date(r, a, 0).getDate();
  const s = new Date(r, n, 1).getDay();
  const o = dateKey(new Date());
  const c = items.filter((f) => String(f.date || "").startsWith(t)).sort(compareSchedule);
  const l = c.reduce((f, m) => ((f[m.date] = [...(f[m.date] || []), m]), f), {});
  const d = [
    ...Array.from(
      {
        length: s,
      },
      (f, m) => `<div class="schedule-day schedule-day-empty" aria-hidden="true" data-empty="${m}"></div>`,
    ),
    ...Array.from(
      {
        length: i,
      },
      (f, m) => {
        const u = m + 1;
        const x = `${t}-${String(u).padStart(2, "0")}`;
        const items2 = l[x] || [];
        return `
        <article class="schedule-day ${x === o ? "is-today" : ""} ${items2.length ? "has-sessions" : ""}">
          <div class="schedule-day-head">
            <strong>${u}</strong>
            ${items2.length ? `<span>${items2.length} حصة</span>` : ""}
          </div>
          <div class="schedule-day-events">
            ${
              items2.length
                ? items2
                    .map((course) => {
                      const p = isApprovedAbsence(course.id);
                      const S = p && state.currentUser?.role === "student";
                      const v = `<time>${escapeHtml(course.startTime || "")}${course.endTime ? ` - ${escapeHtml(course.endTime)}` : ""}</time><span>${escapeHtml(course.title || subjectName(course.subjectId))}</span><small>${p ? "الأستاذ متغيب" : `${scheduleTypeLabel(course.type)} · ${subjectName(course.subjectId)} · ${teacherName(course.teacherId)}`}</small>`;
                      return S
                        ? `<div class="schedule-event is-absent" role="note" aria-label="الأستاذ متغيب عن هذه الحصة">${v}</div>`
                        : `<a class="schedule-event ${p ? "is-absent" : ""}" href="${p ? "#adminAbsences" : scheduleItemHref(course)}" aria-label="فتح ${escapeHtml(scheduleTypeLabel(course.type))} ${escapeHtml(course.title || subjectName(course.subjectId))}">${v}</a>`;
                    })
                    .join("")
                : ""
            }
          </div>
        </article>
      `;
      },
    ),
  ];
  return `
    <div class="schedule-calendar">
      <div class="schedule-calendar-toolbar">
        <a class="button ghost" href="${calendarMonthHref(shiftMonth(t, -1))}">الشهر السابق</a>
        <div>
          <strong>${formatCalendarMonth(t)}</strong>
          <span>${c.length ? `${c.length} حصة في هذا الشهر` : "لا توجد حصص في هذا الشهر"}</span>
        </div>
        <a class="button ghost" href="${calendarMonthHref(shiftMonth(t, 1))}">الشهر التالي</a>
      </div>
      <div class="schedule-weekdays" aria-hidden="true">
        ${["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((f) => `<span>${f}</span>`).join("")}
      </div>
      <div class="schedule-month-grid">
        ${d.join("")}
      </div>
    </div>
  `;
}
