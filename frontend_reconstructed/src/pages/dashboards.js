import { refreshExams } from "../services/state-repository.js";
import {
  escapeHtml,
  formatDateTime,
  groupName,
  hasRole,
  levelName,
  renderOption,
  subjectName,
} from "../utils/formatters.js";
import { renderLoginPage } from "./account.js";
import { teacherCourses, visibleExams, visibleQuestionnaires } from "../utils/content-access.js";
import { state } from "../context/state.js";
import { studentSchedule, teacherSchedule } from "../utils/calendar.js";
import { renderDashboard, renderStat, renderTeacherCourses } from "../components/content-management.js";
import { renderScheduleCalendar } from "./schedule.js";
import {
  courseFromSchedule,
  examFromSchedule,
  preparationSchedule,
  renderAbsenceNotices,
  renderCourseForm,
  renderPreparationNotice,
  renderTeacherPayroll,
} from "../components/teaching.js";
import { renderStudentGradebook } from "./grades.js";
import { resolveEntityReference } from "../routes/router.js";
import { studentBulletinData } from "../components/bulletins.js";
import { formatNumber } from "../components/question-builders.js";
import { attachmentLabels } from "../services/attachments.js";
import { examQuestionCount } from "../controllers/exam-session.js";
import { renderExamForm, renderExamManagementCards } from "./assessment-management.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:482682-483329 (NT). */
function renderStudentPage() {
  if ((refreshExams(), !hasRole("student"))) return renderLoginPage();
  const e = visibleExams(state.exams);
  const t = visibleQuestionnaires(state.questionnaires);
  const r = studentSchedule(state.currentUser);
  return renderDashboard(
    "لوحة الطالب",
    `
    <div class="welcome-panel">
      <h2>مرحبًا بالطالب ${state.currentUser.name}</h2>
      <p>${levelName(state.currentUser.niveauId)} · ${groupName(state.currentUser.groupeId)}</p>
    </div>
    <div class="stats-grid">
      ${renderStat("الامتحانات المتاحة", e.length)}
      ${renderStat("الاستبيانات المتاحة", t.length)}
      ${renderStat("الحصص القادمة", r.length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>رزنامة الحصص</h2>
          <p>${levelName(state.currentUser.niveauId)} · ${groupName(state.currentUser.groupeId)}</p>
        </div>
      </div>
      ${renderScheduleCalendar(r)}
    </section>
    ${renderAbsenceNotices(r)}
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:483329-483402 (fi). */
function absenceForSchedule(e) {
  return state.teacherAbsences.find((t) => String(t.scheduleId) === String(e)) || null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:483402-483451 (Lf). */
function isApprovedAbsence(e) {
  return absenceForSchedule(e)?.status === "approved";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:483451-484739 (DT). */
function renderTeacherAbsencePage() {
  if (!hasRole("teacher")) return renderLoginPage();
  const items = teacherSchedule(state.currentUser.id).filter(
    (t) =>
      !absenceForSchedule(t.id) || ["rescheduled", "rejected"].includes(absenceForSchedule(t.id)?.status),
  );
  return renderDashboard(
    "التصريح بالغياب",
    `
    <section class="panel teacher-absence-panel">
      <div class="section-heading">
        <div>
          <h2>مطلب غياب</h2>
        </div>
        <a class="button ghost" href="#teacher">رجوع للوحة الأستاذ</a>
      </div>
      ${
        items.length
          ? `<form class="grid two" data-teacher-absence-form>
        <div class="field span-two">
          <label for="absenceSchedule">الحصّة</label>
          <select id="absenceSchedule" name="scheduleId" required>
            <option value="">اختر الحصّة</option>
            ${items.map((t) => renderOption(t.id, `${t.title || subjectName(t.subjectId)} — ${t.date} ${t.startTime} - ${t.endTime}`)).join("")}
          </select>
        </div>
        <div class="field span-two">
          <label for="absenceReason">ملاحظة للإدارة والطلبة (اختياري)</label>
          <textarea id="absenceReason" name="reason" placeholder="سبب الغياب أو أي توضيح"></textarea>
        </div>
        <div class="form-actions span-two"><button class="button danger" type="submit">تأكيد الغياب</button></div>
      </form>`
          : '<div class="empty-state">لا توجد حصص متاحة للتصريح بالغياب.</div>'
      }
    </section>
    ${renderTeacherAbsences(state.currentUser.id)}
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:484739-484988 (RT). */
function absenceStatus(e) {
  return e === "approved"
    ? {
        label: "تمت الموافقة",
        className: "danger",
      }
    : e === "rejected"
      ? {
          label: "مرفوض",
          className: "danger",
        }
      : e === "rescheduled"
        ? {
            label: "تمت إعادة البرمجة",
            className: "turquoise",
          }
        : {
            label: "في انتظار موافقة الإدارة",
            className: "gold",
          };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:484988-486182 (PT). */
function renderTeacherAbsences(e) {
  const items = state.teacherAbsences
    .filter((course) => String(course.teacherId) === String(e))
    .sort((r, a) => String(a.declaredAt || a.date || "").localeCompare(String(r.declaredAt || r.date || "")));
  return `
    <section class="panel teacher-absence-requests">
      <div class="section-heading">
        <div>
          <h2>جدول الغيابات</h2>
          <p class="muted">تتابع هنا كل المطالب التي قدّمتها وقرار الإدارة.</p>
        </div>
      </div>
      ${
        items.length
          ? `<div class="table-wrap"><table>
        <thead><tr><th>الحصّة</th><th>موعد الحصّة</th><th>تاريخ الطلب</th><th>ملاحظة</th><th>الحالة</th></tr></thead>
        <tbody>${items
          .map((r) => {
            const a = state.schedule.find((o) => String(o.id) === String(r.scheduleId));
            const n = absenceStatus(r.status);
            const i = a?.title || subjectName(a?.subjectId) || "حصّة محذوفة";
            const s = a ? `${a.date || "-"} ${a.startTime || ""} - ${a.endTime || ""}` : `${r.date || "-"}`;
            return `<tr>
            <td>${escapeHtml(i)}</td>
            <td>${escapeHtml(s)}</td>
            <td>${escapeHtml(formatDateTime(r.declaredAt || r.createdAt || r.date || ""))}</td>
            <td>${escapeHtml(r.reason || "—")}</td>
            <td><span class="badge ${n.className}">${n.label}</span></td>
          </tr>`;
          })
          .join("")}</tbody>
      </table></div>`
          : '<div class="empty-state">لم تقدّم أي مطلب غياب بعد.</div>'
      }
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:486182-486532 (OT). */
function renderStudentResultsPage() {
  return hasRole("student")
    ? renderDashboard(
        "النتائج",
        `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>نتائج الامتحانات</h2>
          <p>${levelName(state.currentUser.niveauId)} · ${groupName(state.currentUser.groupeId)}</p>
        </div>
        <a class="button ghost" href="#student">رجوع للوحة</a>
      </div>
      ${renderStudentGradebook(state.currentUser)}
    </section>
  `,
      )
    : renderLoginPage();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:486532-486732 (LT). */
function generalPlanForStudent(e) {
  return (
    (e &&
      (state.generalPlans.find(
        (t) =>
          String(t.niveauId) === String(e.niveauId) && String(t.groupeId || "") === String(e.groupeId || ""),
      ) ||
        state.generalPlans.find((t) => String(t.niveauId) === String(e.niveauId) && !t.groupeId))) ||
    null
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:486732-487432 (MT). */
function renderGeneralPlanPage() {
  if (!hasRole("student")) return renderLoginPage();
  const e = generalPlanForStudent(state.currentUser);
  return renderDashboard(
    "الخطة العامة",
    `
    <section class="panel general-plan-view">
      <div class="section-heading"><div><p class="eyebrow">الخطة السنوية</p><h2>الخطة العامة للدراسة</h2><p>${escapeHtml(levelName(state.currentUser.niveauId))} · ${escapeHtml(groupName(state.currentUser.groupeId))}</p></div><a class="button ghost" href="#student">رجوع للوحة الحساب</a></div>
      ${e?.fileUrl ? `<div class="general-plan-pdf"><button class="button secondary" type="button" data-open-general-plan="${escapeHtml(e.id)}">فتح الخطة في نافذة جديدة</button><iframe src="${escapeHtml(e.fileUrl)}" title="الخطة العامة للدراسة"></iframe></div>` : '<div class="empty-state">لم تضف الإدارة الخطة العامة لهذا القسم بعد.</div>'}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:487432-488965 (BT). */
function renderGeneralPlansPage() {
  return hasRole("admin")
    ? renderDashboard(
        "إدارة الخطط العامة",
        `
    <section class="panel">
      <div class="section-heading"><div><p class="eyebrow">PDF سنوي</p><h2>إضافة أو تحديث خطة عامة</h2><p>ارفع PDF لكل مستوى ومجموعة؛ سيظهر مباشرة للطلبة المطابقين.</p></div><a class="button ghost" href="#admin">رجوع للوحة الإدارة</a></div>
      <form class="grid two" data-general-plan-form>
        <div class="field"><label>المستوى</label><select name="niveauId" required>${state.levels.map((e) => renderOption(e.id, e.name)).join("")}</select></div>
        <div class="field"><label>المجموعة</label><select name="groupeId"><option value="">كل مجموعات المستوى</option>${state.groups.map((e) => renderOption(e.id, e.name)).join("")}</select></div>
        <div class="field span-two"><label>ملف الخطة (PDF)</label><input name="planFile" type="file" accept=".pdf,application/pdf" required></div>
        <div class="form-actions span-two"><button class="button primary" type="submit">حفظ الخطة العامة</button></div>
      </form>
    </section>
  `,
        `
    <section class="panel"><h2>الخطط المضافة</h2>${state.generalPlans.length ? `<div class="table-wrap"><table><thead><tr><th>المستوى</th><th>المجموعة</th><th>آخر تحديث</th><th>الملف</th></tr></thead><tbody>${state.generalPlans.map((e) => `<tr><td>${escapeHtml(levelName(e.niveauId))}</td><td>${escapeHtml(e.groupeId ? groupName(e.groupeId) : "كل المجموعات")}</td><td>${escapeHtml(formatDateTime(e.updatedAt))}</td><td><a class="button secondary" href="${escapeHtml(e.fileUrl)}" target="_blank" rel="noopener">فتح PDF</a></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty-state">لم تتم إضافة أي خطة بعد.</div>'}</section>
  `,
      )
    : renderLoginPage();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:488965-490704 (UT). */
function renderStudentBulletinPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = resolveEntityReference("student");
  const t = state.users.find((user) => String(user.id) === String(e) && user.role === "student");
  if (!t)
    return renderDashboard(
      "Bulletin de note",
      `
      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>Bulletin de note</h2>
            <p>Compte etudiant introuvable.</p>
          </div>
          <a class="button ghost" href="#users?view=students">Retour</a>
        </div>
        <div class="empty-state">Aucun etudiant ne correspond a cette demande.</div>
      </section>
    `,
    );
  const r = studentBulletinData(t);
  const a = `#analytics?niveau=${encodeURIComponent(t.niveauId || "")}&groupe=${encodeURIComponent(t.groupeId || "")}`;
  return renderDashboard(
    "Bulletin de note",
    `
    <section class="panel admin-student-bulletin-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Admin</p>
          <h2>Bulletin de note - ${escapeHtml(t.name)}</h2>
          <p>${escapeHtml(r.niveau)} &middot; ${escapeHtml(r.groupe)} &middot; ${r.subjects.length} matieres</p>
        </div>
        <div class="toolbar">
          <button class="button primary" type="button" data-download-student-bulletin="${escapeHtml(t.id)}">Telecharger PDF</button>
          <a class="button ghost" href="${a}">Retour au tableau</a>
        </div>
      </div>
      <div class="gradebook-meta admin-bulletin-summary">
        <span>Moyenne S1: ${r.semester1Average === null ? "-" : `${formatNumber(r.semester1Average)}/20`}</span>
        <span>Moyenne S2: ${r.semester2Average === null ? "-" : `${formatNumber(r.semester2Average)}/20`}</span>
        <span>Moyenne generale: ${r.generalAverage === null ? "-" : `${formatNumber(r.generalAverage)}/20`}</span>
        <span>Rang: ${r.rank?.total ? `${escapeHtml(r.rank.rank)} / ${escapeHtml(r.rank.total)}` : "-"}</span>
      </div>
      ${renderStudentGradebook(t)}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:490704-491238 (qT). */
function renderTeacherPage() {
  if (!hasRole("teacher")) return renderLoginPage();
  const e = teacherCourses(state.currentUser.id);
  const t = visibleExams(state.exams);
  const r = teacherSchedule(state.currentUser.id);
  const a = visibleQuestionnaires(state.questionnaires);
  return renderDashboard(
    "لوحة تحكم الأستاذ",
    `
    <div class="stats-grid">
      ${renderStat("الدروس", e.length)}
      ${renderStat("الامتحانات", t.length)}
      ${renderStat("الاستبيانات", a.length)}
      ${renderStat("حصصي القادمة", r.length)}
    </div>
    ${renderTeacherPayroll(state.currentUser.id)}
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>رزنامتي</h2>
          <p>الحصص الخاصة بالأستاذ ${state.currentUser.name}</p>
        </div>
      </div>
      ${renderScheduleCalendar(r)}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:491238-491709 (jT). */
function renderLessonPrepPage() {
  if (!hasRole("teacher")) return renderLoginPage();
  const items = teacherCourses(state.currentUser.id);
  const t = preparationSchedule("lesson");
  const r = t ? courseFromSchedule(t) : {};
  return renderDashboard(
    "تحضير الدروس",
    `
    <div class="stats-grid">
      ${renderStat("دروسي", items.length)}
      ${renderStat("المواد", new Set(items.map((a) => a.subjectId)).size)}
      ${renderStat("المستويات", new Set(items.map((a) => a.niveauId)).size)}
      ${renderStat(
        "الملفات",
        items.reduce((a, n) => a + attachmentLabels(n).length, 0),
      )}
    </div>
    ${renderLessonPrepPanel(t, r)}
  `,
    `
    <section class="panel">
      <h2>آخر الدروس</h2>
      ${renderTeacherCourses(items)}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:491709-492417 (zT). */
function renderLessonPrepPanel(e, t) {
  return e
    ? `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>تحضير درس الحصة</h2>
          <p>هذا الدرس مربوط بالحصة التي اختارتها من الرزنامة.</p>
        </div>
        <a class="button ghost" href="#teacher">رجوع للوحة الأستاذ</a>
      </div>
      ${renderPreparationNotice(e)}
      ${renderCourseForm("teacher-prep", t)}
    </section>
  `
    : `
      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>تحضير الدروس من الرزنامة</h2>
            <p>إنشاء درس جديد يتم فقط من حصة درس أضافتها الإدارة في رزنامتك.</p>
          </div>
          <a class="button primary" href="#teacher">فتح الرزنامة</a>
        </div>
      </section>
    `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:492417-492928 (HT). */
function renderExamPrepPage() {
  if ((refreshExams(), !hasRole("teacher"))) return renderLoginPage();
  const items = visibleExams(state.exams);
  const t = preparationSchedule("exam");
  const r = t ? examFromSchedule(t) : {};
  return renderDashboard(
    "تحضير الامتحانات",
    `
    <div class="stats-grid">
      ${renderStat("امتحاناتي", items.length)}
      ${renderStat("المواد", new Set(items.map((a) => a.subjectId)).size)}
      ${renderStat(
        "الأسئلة",
        items.reduce((a, n) => a + examQuestionCount(n), 0),
      )}
      ${renderStat("التسليمات", state.examSubmissions.filter((a) => items.some((n) => String(n.id) === String(a.examId))).length)}
    </div>
    ${renderExamPrepPanel(t, r)}
  `,
    `
    <section class="panel">
      <h2>الامتحانات المحضّرة</h2>
      ${renderExamManagementCards(items)}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:492928-493652 (WT). */
function renderExamPrepPanel(e, t) {
  return e
    ? `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>تحضير امتحان الحصة</h2>
          <p>هذا الامتحان مربوط بالحصة التي اختارتها من الرزنامة.</p>
        </div>
        <a class="button ghost" href="#teacher">رجوع للوحة الأستاذ</a>
      </div>
      ${renderPreparationNotice(e)}
      ${renderExamForm("teacher-prep", t)}
    </section>
  `
    : `
      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>تحضير الامتحانات من الرزنامة</h2>
            <p>إنشاء امتحان جديد يتم فقط من حصة امتحان أضافتها الإدارة في رزنامتك.</p>
          </div>
          <a class="button primary" href="#teacher">فتح الرزنامة</a>
        </div>
      </section>
    `;
}
