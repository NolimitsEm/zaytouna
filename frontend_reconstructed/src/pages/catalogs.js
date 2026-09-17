import { escapeHtml, hasRole, renderOption } from "../utils/formatters.js";
import { renderLoginPage } from "./account.js";
import { state } from "../context/state.js";
import { groupUsage, levelUsage, subjectUsage } from "../services/catalog-management.js";
import { renderDashboard, renderStat } from "../components/content-management.js";
import { semesters } from "./grades.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:563396-564564 (GE). */
function renderLevelsPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = state.levels.filter((t) => levelUsage(t.id).total > 0).length;
  return renderDashboard(
    "إدارة المستويات",
    `
    <div class="stats-grid">
      ${renderStat("المستويات", state.levels.length)}
      ${renderStat("المستعملة", e)}
      ${renderStat("غير المستعملة", Math.max(0, state.levels.length - e))}
      ${renderStat("الطلبة المرتبطون", state.users.filter((user) => user.role === "student" && user.niveauId).length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>إدارة المستويات</h2>
          <p>أضف مستوى جديدًا أو عدّل اسم مستوى موجود. لا يمكن حذف مستوى مرتبط بطالب أو محتوى تعليمي.</p>
        </div>
        <a class="button ghost" href="#admin">رجوع للوحة</a>
      </div>
      <form class="grid two level-add-form" data-level-add-form>
        <div class="field">
          <label for="levelNameNew">اسم المستوى</label>
          <input id="levelNameNew" name="name" placeholder="مثال: السنة الرابعة" required>
        </div>
        <div class="form-actions">
          <button class="button primary" type="submit">إضافة مستوى</button>
        </div>
      </form>
    </section>
    <section class="panel">
      <h2>قائمة المستويات</h2>
      ${renderLevelsTable()}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:564564-565034 (XE). */
function renderLevelsTable() {
  return state.levels.length
    ? `
    <div class="table-wrap">
      <table class="levels-table">
        <thead>
          <tr>
            <th>المعرّف</th>
            <th>اسم المستوى</th>
            <th>الطلبة</th>
            <th>المحتوى</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${state.levels.map((e) => renderLevelRow(e)).join("")}
        </tbody>
      </table>
    </div>
  `
    : '<div class="empty-state">لا توجد مستويات حاليًا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:565034-565680 (YE). */
function renderLevelRow(e) {
  const t = `level-edit-${e.id}`;
  const r = levelUsage(e.id);
  const a = state.levels.length > 1 && r.total === 0;
  return `
    <tr>
      <td><span class="chip">${escapeHtml(e.id)}</span></td>
      <td>
        <input form="${t}" name="name" value="${escapeHtml(e.name)}" required>
      </td>
      <td>${r.students}</td>
      <td>${r.content}</td>
      <td>
        <form id="${t}" class="table-action-form" data-level-edit-form data-level-id="${escapeHtml(e.id)}">
          <button class="button secondary" type="submit">حفظ</button>
          <button class="button ghost danger" type="button" data-delete-level="${escapeHtml(e.id)}" ${a ? "" : "disabled"}>حذف</button>
        </form>
      </td>
    </tr>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:565680-566851 (KE). */
function renderGroupsPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = state.groups.filter((t) => groupUsage(t.id).total > 0).length;
  return renderDashboard(
    "إدارة المجموعات",
    `
    <div class="stats-grid">
      ${renderStat("المجموعات", state.groups.length)}
      ${renderStat("المستعملة", e)}
      ${renderStat("غير المستعملة", Math.max(0, state.groups.length - e))}
      ${renderStat("الطلبة المرتبطون", state.users.filter((user) => user.role === "student" && user.groupeId).length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>إدارة المجموعات</h2>
          <p>أضف مجموعة جديدة أو عدّل اسم مجموعة موجودة. لا يمكن حذف مجموعة مرتبطة بطالب أو محتوى تعليمي.</p>
        </div>
        <a class="button ghost" href="#admin">رجوع للوحة</a>
      </div>
      <form class="grid two group-add-form" data-group-add-form>
        <div class="field">
          <label for="groupNameNew">اسم المجموعة</label>
          <input id="groupNameNew" name="name" placeholder="مثال: المجموعة د" required>
        </div>
        <div class="form-actions">
          <button class="button primary" type="submit">إضافة مجموعة</button>
        </div>
      </form>
    </section>
    <section class="panel">
      <h2>قائمة المجموعات</h2>
      ${renderGroupsTable()}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:566851-567322 (JE). */
function renderGroupsTable() {
  return state.groups.length
    ? `
    <div class="table-wrap">
      <table class="groups-table">
        <thead>
          <tr>
            <th>المعرّف</th>
            <th>اسم المجموعة</th>
            <th>الطلبة</th>
            <th>المحتوى</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${state.groups.map((e) => renderGroupRow(e)).join("")}
        </tbody>
      </table>
    </div>
  `
    : '<div class="empty-state">لا توجد مجموعات حاليًا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:567322-567968 (QE). */
function renderGroupRow(e) {
  const t = `group-edit-${e.id}`;
  const r = groupUsage(e.id);
  const a = state.groups.length > 1 && r.total === 0;
  return `
    <tr>
      <td><span class="chip">${escapeHtml(e.id)}</span></td>
      <td>
        <input form="${t}" name="name" value="${escapeHtml(e.name)}" required>
      </td>
      <td>${r.students}</td>
      <td>${r.content}</td>
      <td>
        <form id="${t}" class="table-action-form" data-group-edit-form data-group-id="${escapeHtml(e.id)}">
          <button class="button secondary" type="submit">حفظ</button>
          <button class="button ghost danger" type="button" data-delete-group="${escapeHtml(e.id)}" ${a ? "" : "disabled"}>حذف</button>
        </form>
      </td>
    </tr>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:567968-570301 (ZE). */
function renderSubjectsPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = state.subjects.filter((t) => subjectUsage(t.id).total > 0).length;
  return renderDashboard(
    "إدارة المواد",
    `
    <div class="stats-grid">
      ${renderStat("المواد", state.subjects.length)}
      ${renderStat("المستعملة", e)}
      ${renderStat("غير المستعملة", Math.max(0, state.subjects.length - e))}
      ${renderStat("الدروس", state.courses.length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>إدارة المواد</h2>
          <p>أضف مادة جديدة أو عدّل بيانات مادة موجودة. لا يمكن حذف مادة مرتبطة بدروس أو امتحانات أو استبيانات.</p>
        </div>
        <a class="button ghost" href="#admin">رجوع للوحة</a>
      </div>
      <form class="grid two subject-add-form" data-subject-add-form>
        <div class="field">
          <label for="subjectNameNew">اسم المادة</label>
          <input id="subjectNameNew" name="name" placeholder="مثال: السيرة" required>
        </div>
        <div class="field">
          <label for="subjectShortNew">الاسم المختصر</label>
          <input id="subjectShortNew" name="short" placeholder="مثال: السيرة" required>
        </div>
        <div class="field">
          <label for="subjectProgramNew">التسجيل في</label>
          <select id="subjectProgramNew" name="program" required>
            <option value="">اختر البرنامج</option>
            ${state.programNames.map((t) => renderOption(t, t)).join("")}
          </select>
        </div>
        <div class="field">
          <label for="subjectNiveauNew">السنة</label>
          <select id="subjectNiveauNew" name="niveauId" required>
            <option value="">اختر السنة</option>
            ${state.levels.map((t) => renderOption(t.id, t.name)).join("")}
          </select>
        </div>
        <div class="field">
          <label for="subjectSemesterNew">السداسي</label>
          <select id="subjectSemesterNew" name="semester" required>
            ${semesters()
              .map((t) => renderOption(t.id, t.label))
              .join("")}
          </select>
        </div>
        <div class="field span-two">
          <label for="subjectDescriptionNew">وصف المادة</label>
          <textarea id="subjectDescriptionNew" name="description" required></textarea>
        </div>
        <div class="form-actions span-two">
          <button class="button primary" type="submit">إضافة مادة</button>
        </div>
      </form>
    </section>
  `,
    `
    <section class="panel">
      <h2>قائمة المواد</h2>
      ${renderSubjectsTable()}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:570301-570885 (eA). */
function renderSubjectsTable() {
  return state.subjects.length
    ? `
    <div class="table-wrap">
      <table class="subjects-table">
        <thead>
          <tr>
            <th>المعرّف</th>
            <th>اسم المادة</th>
            <th>المختصر</th>
            <th>التسجيل في</th>
            <th>السنة</th>
            <th>السداسي</th>
            <th>الوصف</th>
            <th>المحتوى</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${state.subjects.map((e) => renderSubjectRow(e)).join("")}
        </tbody>
      </table>
    </div>
  `
    : '<div class="empty-state">لا توجد مواد حاليًا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:570885-572283 (tA). */
function renderSubjectRow(e) {
  const t = `subject-edit-${e.id}`;
  const r = subjectUsage(e.id);
  const a = state.subjects.length > 1;
  return `
    <tr>
      <td><span class="chip">${escapeHtml(e.id)}</span></td>
      <td>
        <input form="${t}" name="name" value="${escapeHtml(e.name)}" required>
      </td>
      <td>
        <input form="${t}" name="short" value="${escapeHtml(e.short || e.name)}" required>
      </td>
      <td>
        <select form="${t}" name="program" required>
          <option value="">اختر البرنامج</option>
          ${state.programNames.map((n) => renderOption(n, n, e.program || "")).join("")}
        </select>
      </td>
      <td>
        <select form="${t}" name="niveauId" required>
          <option value="">اختر السنة</option>
          ${state.levels.map((n) => renderOption(n.id, n.name, e.niveauId || "")).join("")}
        </select>
      </td>
      <td>
        <select form="${t}" name="semester" required>
          ${semesters()
            .map((n) => renderOption(n.id, n.label, e.semester || "s1"))
            .join("")}
        </select>
      </td>
      <td>
        <textarea form="${t}" name="description" required>${escapeHtml(e.description || "")}</textarea>
      </td>
      <td>${r.total}</td>
      <td>
        <form id="${t}" class="table-action-form" data-subject-edit-form data-subject-id="${escapeHtml(e.id)}">
          <button class="button secondary" type="submit">حفظ</button>
          <button class="button ghost danger" type="button" data-delete-subject="${escapeHtml(e.id)}" ${a ? "" : "disabled"}>حذف</button>
        </form>
      </td>
    </tr>
  `;
}
