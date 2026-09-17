import {
  activityStatus,
  contentCreatorLabel,
  contentGroupIds,
  contentGroupLabels,
  contentLevelIds,
  contentLevelLabels,
  escapeHtml,
  formatDateTime,
  groupName,
  hasRole,
  levelName,
  renderOption,
  roleLabel,
  subjectDisplayName,
  subjectName,
  teacherName,
} from "../utils/formatters.js";
import {
  renderDashboard,
  renderPublicContentManager,
  renderStat,
  renderTeacherCourses,
} from "../components/content-management.js";
import { state } from "../context/state.js";
import { renderLoginPage } from "./account.js";
import { renderRegistrationTable, renderUserDirectory } from "./users.js";
import { renderCourseForm } from "../components/teaching.js";
import { normalizeExamSubmission, refreshExams } from "../services/state-repository.js";
import {
  canonicalizeEntityRoute,
  courseHref,
  currentCourseId,
  entityHref,
  entityReference,
  resolveEntityReference,
  routeQuery,
} from "../routes/router.js";
import { canCorrectExam, canEditCourse, canManageExam, isExamPublished } from "../utils/content-access.js";
import {
  awaitsManualCorrection,
  isNumericScore,
  submissionScoreLabel,
  userName,
} from "../services/results.js";
import {
  examDuration,
  examQuestions,
  examTotalPoints,
  formatNumber,
  questionPoints,
  questionnaireAudience,
  questionnaireAudienceLabel,
  questionnairePreviewLabel,
  questionnaireQuestionCount,
  questionnaireQuestions,
  toDateTimeLocal,
} from "../components/question-builders.js";
import { exerciseSubmissions, normalizeExerciseFile, renderExerciseFile } from "./lessons.js";
import { examQuestionCount } from "../controllers/exam-session.js";
import { examCloseLabel, examOpenLabel } from "../services/exam-timing.js";
import { exportAnswerText } from "../services/exports.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:507800-509103 (eE). */
function renderAdminPage() {
  return hasRole("admin")
    ? renderDashboard(
        "لوحة تحكم الإدارة",
        `
    <div class="stats-grid">
      ${renderStat("المستخدمون", state.users.length)}
      ${renderStat("المستويات", state.levels.length)}
      ${renderStat("المجموعات", state.groups.length)}
      ${renderStat("الحصص المبرمجة", state.schedule.length)}
    </div>
    ${
      state.teacherAbsences.length
        ? `<section class="notice absence-notice"><strong>طلبات الغياب</strong>${state.teacherAbsences
            .slice(-5)
            .map((course) => {
              const t = state.schedule.find((a) => String(a.id) === String(course.scheduleId));
              const r = course.status !== "approved" && course.status !== "rescheduled";
              return `<p>${escapeHtml(teacherName(course.teacherId))}: ${escapeHtml(t?.title || "حصة")} — ${escapeHtml(course.date || "")} ${course.reason ? `(${escapeHtml(course.reason)})` : ""} ${r ? `<button class="button secondary" type="button" data-approve-absence="${escapeHtml(course.id)}">الموافقة</button> <a class="button ghost" href="#schedule">تعديل موعد الحصّة</a>` : course.status === "rescheduled" ? '<span class="chip turquoise">تمت إعادة البرمجة</span>' : '<span class="chip danger">تمت الموافقة</span>'}</p>`;
            })
            .join("")}</section>`
        : ""
    }
    <section class="panel">
      <h2>إدارة المنصة</h2>
      ${renderAdminLinks()}
    </section>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>تتبع الدخول والخروج</h2>
          <p>صفحة خاصة لمتابعة دخول الطلبة والأساتذة ومدة بقائهم على المنصة.</p>
        </div>
        <a class="button primary" href="#logs">فتح سجل الدخول</a>
      </div>
    </section>
  `,
        renderPublicContentManager(),
      )
    : renderLoginPage();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:509103-509762 (tE). */
function renderAdminLinks() {
  return `
    <div class="grid three">
      ${[
        {
          label: "إدارة المستخدمين",
          href: "#users",
        },
        {
          label: "إدارة المستويات",
          href: "#levels",
        },
        {
          label: "إدارة المجموعات",
          href: "#groups",
        },
        {
          label: "إدارة المواد",
          href: "#subjects",
        },
        {
          label: "تنظيم الحصص",
          href: "#schedule",
        },
        {
          label: "إدارة الدروس",
          href: "#lessons",
        },
        {
          label: "إدارة الامتحانات",
          href: "#examManagement",
        },
        {
          label: "إدارة الاستبيانات",
          href: "#questionnaireManagement",
        },
        {
          label: "متابعة النتائج والإحصائيات",
          href: "#analytics",
        },
      ]
        .map(
          (t) => `
        ${t.href ? `<a class="button secondary" href="${t.href}">${t.label}</a>` : `<button class="button secondary" type="button">${t.label}</button>`}
      `,
        )
        .join("")}
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:509762-509819 (rE). */
function onlineUserCount() {
  return state.activityLog.filter((e) => activityStatus(e) === "متصل").length;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:509819-511042 (aE). */
function renderUsersPage() {
  return hasRole("admin")
    ? renderDashboard(
        "إدارة المستخدمين",
        `
    <div class="stats-grid">
      ${renderStat("المستخدمون", state.users.length)}
      ${renderStat("الطلبة", state.users.filter((user) => user.role === "student").length)}
      ${renderStat("الأساتذة", state.users.filter((user) => user.role === "teacher").length)}
      ${renderStat("مطالب التسجيل", state.registrationRequests.filter((e) => e.status === "pending").length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>إدارة الحسابات</h2>
          <p>كل ما يخص بيانات الحساب، الدور، المستوى، المجموعة، وحالة الدخول.</p>
        </div>
        <a class="button ghost" href="#admin">رجوع للوحة</a>
      </div>
      <div class="account-management-grid">
        <article class="account-tool">
          <strong>صلاحيات الحساب</strong>
          <span class="muted">طالب، أستاذ، أو إدارة</span>
        </article>
        <article class="account-tool">
          <strong>بيانات التمدرس</strong>
          <span class="muted">ربط الطالب بالمستوى والمجموعة</span>
        </article>
        <article class="account-tool">
          <strong>حالة الحساب</strong>
          <span class="muted">تفعيل، تعطيل، حذف، وتغيير كلمة المرور</span>
        </article>
      </div>
    </section>
  `,
        `
    ${renderRegistrationPanel()}
    ${renderUserDirectory()}
  `,
      )
    : renderLoginPage();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:511042-511691 (nE). */
function renderLessonsPage() {
  return hasRole("admin")
    ? renderDashboard(
        "إدارة الدروس",
        `
    <div class="stats-grid">
      ${renderStat("الدروس", state.courses.length)}
      ${renderStat("المواد", state.subjects.length)}
      ${renderStat("المستويات", state.levels.length)}
      ${renderStat("المجموعات", state.groups.length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>إضافة درس</h2>
          <p>أضف درسًا وحدد المادة والسنة والمجموعة حتى يظهر للطلبة المناسبين فقط.</p>
        </div>
        <a class="button ghost" href="#admin">رجوع للوحة</a>
      </div>
      ${renderCourseForm("admin")}
    </section>
  `,
        `
    <section class="panel">
      <h2>قائمة الدروس</h2>
      ${renderTeacherCourses(state.courses)}
    </section>
  `,
      )
    : renderLoginPage();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:511691-512363 (iE). */
function renderExamManagementPage() {
  refreshExams();
  return hasRole("admin")
    ? renderDashboard(
        "إدارة الامتحانات",
        `
    <div class="stats-grid">
      ${renderStat("الامتحانات", state.exams.length)}
      ${renderStat("المواد", state.subjects.length)}
      ${renderStat("المستويات", state.levels.length)}
      ${renderStat("المجموعات", state.groups.length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>إضافة امتحان</h2>
          <p>أضف امتحانًا وحدد المادة والسنة والمجموعة حتى يظهر للطلبة المناسبين فقط.</p>
        </div>
        <a class="button ghost" href="#admin">رجوع للوحة</a>
      </div>
      ${renderExamForm("admin")}
    </section>
  `,
        `
    <section class="panel">
      <h2>قائمة الامتحانات</h2>
      ${renderExamManagementCards(state.exams)}
    </section>
  `,
      )
    : renderLoginPage();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:512363-513334 (sE). */
function renderExamEditorPage() {
  if (!["admin", "teacher"].includes(state.currentUser?.role)) return renderLoginPage();
  const e = Number(resolveEntityReference("exam"));
  const t = state.exams.find((r) => Number(r.id) === e);
  return !t || (state.currentUser?.role !== "admin" && !canCorrectExam(t))
    ? renderDashboard(
        "تعديل الامتحان",
        `
      <section class="panel">
        <div class="empty-state">هذا الامتحان غير موجود أو لا تملك صلاحية تعديله.</div>
        <a class="button ghost" href="${state.currentUser?.role === "admin" ? "#examManagement" : "#examPrep"}">رجوع</a>
      </section>
    `,
      )
    : renderDashboard(
        "تعديل الامتحان",
        `
    <section class="panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">الامتحانات</p>
          <h2>${escapeHtml(t.title)}</h2>
          <p>${subjectName(t.subjectId)} · ${contentLevelLabels(t)} · ${contentGroupLabels(t)}</p>
        </div>
        <div class="toolbar">
          <a class="button secondary" href="${entityHref("examPreview", "exam", t.id)}">معاينة كطالب</a>
          <a class="button ghost" href="${state.currentUser.role === "admin" ? "#examManagement" : "#examPrep"}">رجوع للقائمة</a>
        </div>
      </div>
      ${renderExamEditorForm(t)}
    </section>
  `,
      );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:513334-515134 (oE). */
function renderExamCorrectionPage() {
  if (!["admin", "teacher"].includes(state.currentUser?.role)) return renderLoginPage();
  const e = Number(resolveEntityReference("exam"));
  const t = state.exams.find((s) => Number(s.id) === e);
  if (!t || (state.currentUser?.role !== "admin" && !canManageExam(t)))
    return renderDashboard(
      "تصحيح الامتحان",
      `
      <section class="panel">
        <div class="empty-state">هذا الامتحان غير موجود أو لا تملك صلاحية تصحيحه.</div>
        <a class="button ghost" href="${state.currentUser?.role === "admin" ? "#examManagement" : "#examPrep"}">رجوع</a>
      </section>
    `,
    );
  const items = state.examSubmissions
    .filter((s) => Number(s.examId) === Number(t.id))
    .map(normalizeExamSubmission)
    .sort((s, o) => {
      const c = Number(awaitsManualCorrection(o)) - Number(awaitsManualCorrection(s));
      return c || (submissionStudentName(s) || "").localeCompare(submissionStudentName(o) || "", "ar");
    });
  const a =
    resolveEntityReference("examSubmission", "submissionRef") ||
    routeQuery().get("submission") ||
    items.find((s) => awaitsManualCorrection(s))?.id ||
    items[0]?.id ||
    "";
  const n = items.find((s) => String(s.id) === String(a));
  const i = items.filter((s) => awaitsManualCorrection(s)).length;
  return renderDashboard(
    "تصحيح الامتحان",
    `
    <section class="panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">تصحيح الإجابات</p>
          <h2>${escapeHtml(t.title)}</h2>
          <p>${subjectName(t.subjectId)} · ${contentLevelLabels(t)} · ${formatNumber(examTotalPoints(t))} نقطة</p>
        </div>
        <div class="toolbar">
          <a class="button secondary" href="${entityHref("examPreview", "exam", t.id)}">معاينة كطالب</a>
          <a class="button ghost" href="${state.currentUser.role === "admin" ? "#examManagement" : "#examPrep"}">رجوع للامتحانات</a>
        </div>
      </div>
      <div class="stats-grid">
        ${renderStat("التسليمات", items.length)}
        ${renderStat("قيد التصحيح", i)}
        ${renderStat("مصَحّحة", items.length - i)}
      </div>
      ${
        items.length
          ? `
        <div class="exam-correction-layout">
          ${renderCorrectionStudents(t, items, n)}
          <div class="exam-correction-workspace">
            ${n ? renderExamCorrectionDetail(t, n) : '<div class="empty-state">اختر طالبًا لفتح ورقة إجابته.</div>'}
          </div>
        </div>
      `
          : '<div class="empty-state">لم يتم تسليم أي إجابة لهذا الامتحان بعد.</div>'
      }
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:515134-516658 (cE). */
function renderExerciseCorrectionPage() {
  if (!["teacher", "admin"].includes(state.currentUser?.role)) return renderLoginPage();
  const e = currentCourseId();
  if (e) {
    canonicalizeEntityRoute("exerciseCorrection", "course", e);
  }
  const t = state.courses.find((i) => String(i.id) === String(e));
  if (!t || !normalizeExerciseFile(t.exercise).url || !canEditCourse(t))
    return renderDashboard(
      "تصحيح التمارين",
      '<section class="panel"><div class="empty-state">التمرين غير موجود أو لا تملك صلاحية الاطلاع عليه.</div><a class="button ghost" href="#lessonPrep">رجوع</a></section>',
    );
  const items = exerciseSubmissions(t.id);
  const a = routeQuery().get("submission") || items[0]?.id || "";
  const n = items.find((i) => String(i.id) === String(a));
  return renderDashboard(
    "تصحيح التمارين",
    `
    <section class="panel">
      <div class="section-heading"><div><p class="eyebrow">عرض إجابات الطلبة</p><h2>${escapeHtml(t.title)}</h2><p>${subjectName(t.subjectId)} · تمرين بصورة أو PDF</p></div><a class="button ghost" href="#lessonPrep">رجوع للدروس</a></div>
      <div class="stats-grid">${renderStat("الإجابات المستلمة", items.length)}</div>
      <div class="exam-correction-layout">
        <aside class="exam-correction-students"><div class="exam-correction-students-head"><strong>إجابات الطلبة</strong><span>${items.length} طالب</span></div><div class="exam-correction-student-list">${items
          .map(
            (i) =>
              `<a class="exam-correction-student ${String(i.id) === String(n?.id) ? "is-selected" : ""}" href="${courseHref(
                "exerciseCorrection",
                t.id,
                {
                  submission: i.id,
                },
              )}"><span><strong>${escapeHtml(i.studentName || userName(i.userId))}</strong><small>${escapeHtml(formatDateTime(i.submittedAt))}</small></span></a>`,
          )
          .join("")}</div></aside>
        <div class="exam-correction-workspace">${n ? renderExerciseCorrection(t, n) : '<div class="empty-state">لم يرسل أي طالب إجابته بعد.</div>'}</div>
      </div>
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:516658-518445 (lE). */
function renderAdminAbsencesPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const items = [...state.teacherAbsences].sort(
    (r, a) => new Date(a.declaredAt || 0) - new Date(r.declaredAt || 0),
  );
  const t = items.filter((r) => r.status === "pending" || !r.status).length;
  return renderDashboard(
    "إدارة الغيابات",
    `
    <div class="stats-grid">${renderStat("كل المطالب", items.length)}${renderStat("في الانتظار", t)}${renderStat("تمت الموافقة", items.filter((r) => r.status === "approved").length)}${renderStat("أعيدت برمجتها", items.filter((r) => r.status === "rescheduled").length)}</div>
    <section class="panel">
      <div class="section-heading"><div><h2>مطالب غياب الأساتذة</h2><p class="muted">الموافقة هي التي تفعّل الغياب في رزنامة الطلبة. بعد ذلك يمكنك تعديل موعد الحصّة من تنظيم الحصص.</p></div><a class="button ghost" href="#admin">رجوع للوحة الإدارة</a></div>
      ${
        items.length
          ? `<div class="table-wrap"><table><thead><tr><th>الأستاذ</th><th>الحصّة</th><th>الموعد</th><th>الملاحظة</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${items
              .map((course) => {
                const a = state.schedule.find((s) => String(s.id) === String(course.scheduleId));
                const n = course.status === "pending" || !course.status;
                const i =
                  course.status === "approved"
                    ? "تمت الموافقة"
                    : course.status === "rescheduled"
                      ? "تمت إعادة البرمجة"
                      : course.status === "rejected"
                        ? "مرفوض"
                        : "في الانتظار";
                return `<tr><td>${escapeHtml(teacherName(course.teacherId))}</td><td>${escapeHtml(a?.title || "حصّة محذوفة")}</td><td>${escapeHtml(a ? `${a.date} ${a.startTime} - ${a.endTime}` : course.date || "-")}</td><td>${escapeHtml(course.reason || "-")}</td><td><span class="chip ${n ? "gold" : course.status === "approved" ? "danger" : "turquoise"}">${i}</span></td><td>${n ? `<button class="button primary" type="button" data-approve-absence="${escapeHtml(course.id)}">موافقة</button> <button class="button ghost danger" type="button" data-reject-absence="${escapeHtml(course.id)}">رفض</button>` : ""} ${a ? '<a class="button secondary" href="#schedule">تعديل الموعد</a>' : ""}</td></tr>`;
              })
              .join("")}</tbody></table></div>`
          : '<div class="empty-state">لا توجد مطالب غياب حالياً.</div>'
      }
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:518445-518824 (dE). */
function renderExerciseCorrection(e, t) {
  return `<article class="exam-correction-detail"><div class="section-heading"><div><h3>${escapeHtml(t.studentName || userName(t.userId))}</h3><p class="muted">تم التسليم: ${escapeHtml(formatDateTime(t.submittedAt))}</p></div></div><div class="exercise-correction-images"><div><h4>التمرين</h4>${renderExerciseFile(e.exercise, "ملف التمرين")}</div><div><h4>إجابة الطالب</h4>${renderExerciseFile(t, "إجابة الطالب")}</div></div></article>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:518824-519685 (uE). */
function renderCorrectionStudents(e, items, r) {
  return `
    <aside class="exam-correction-students" aria-label="قائمة الطلبة الذين اجتازوا الامتحان">
      <div class="exam-correction-students-head">
        <strong>الطلبة الذين اجتازوا</strong>
        <span>${items.length} طالب</span>
      </div>
      <div class="exam-correction-student-list">
        ${items
          .map((a) => {
            const n = String(a.id) === String(r?.id);
            const i = awaitsManualCorrection(a);
            return `
            <a class="exam-correction-student ${n ? "is-selected" : ""}" href="${entityHref(
              "examCorrection",
              "exam",
              e.id,
              {
                submissionRef: entityReference("examSubmission", a.id),
              },
            )}">
              <span>
                <strong>${escapeHtml(submissionStudentName(a))}</strong>
                <small>${formatDateTime(a.submittedAt)} · ${escapeHtml(submissionScoreLabel(a))}</small>
              </span>
              <span class="chip ${i ? "gold" : "turquoise"}">${i ? "قيد التصحيح" : "مصحّح"}</span>
            </a>
          `;
          })
          .join("")}
      </div>
    </aside>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:519685-519735 (Ts). */
function submissionStudentName(e) {
  return e.studentName || userName(e.userId);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:519735-520690 (fE). */
function renderExamCorrectionDetail(e, t) {
  const items = t.answers || [];
  const a = awaitsManualCorrection(t);
  const n = canCorrectExam(e);
  const i = n && (a || routeQuery().get("edit") === "1");
  return `
    <article class="exam-correction-detail">
      <div class="section-heading">
        <div>
          <h3>${escapeHtml(submissionStudentName(t))}</h3>
          <p class="muted">${formatDateTime(t.submittedAt)} · ${submissionScoreLabel(t)}</p>
        </div>
        <span class="chip ${a ? "gold" : "turquoise"}">${a ? "قيد التصحيح" : "مصحّح"}</span>
      </div>
      <form class="exam-correction-form" data-exam-correction-form data-submission-id="${escapeHtml(t.id)}" data-exam-id="${escapeHtml(e.id)}">
        ${items.map((s, o) => renderCorrectionAnswer(s, o, !i)).join("")}
        <div class="form-actions">
          ${
            i
              ? '<button class="button primary" type="submit">حفظ التصحيح</button>'
              : n
                ? `<a class="button secondary" href="${entityHref("examCorrection", "exam", e.id, {
                    submissionRef: entityReference("examSubmission", t.id),
                    edit: "1",
                  })}">تعديل التصحيح</a>`
                : '<span class="muted">الإدارة تطّلع على التصحيح والعدد دون تعديلهما.</span>'
          }
        </div>
      </form>
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:520690-521743 (hE). */
function renderCorrectionAnswer(e, t, r = false) {
  const a = questionPoints(e);
  const n = Array.isArray(e.answer) ? e.answer.join("، ") : e.answer;
  return e.type === "qcm"
    ? `
      <div class="exam-question">
        <strong>${t + 1}. ${escapeHtml(e.question)} (${formatNumber(a)} نقطة)</strong>
        <p><strong>إجابة الطالب:</strong> ${escapeHtml(n || "-")}</p>
        <p><strong>الإجابة الصحيحة:</strong> ${escapeHtml((e.correctAnswers || []).join("، ") || e.correctAnswer || "-")}</p>
        <p class="muted">تصحيح آلي: ${formatNumber(e.awardedPoints || 0)} / ${formatNumber(a)}</p>
      </div>
    `
    : `
    <div class="exam-question">
      <strong>${t + 1}. ${escapeHtml(e.question)} (${formatNumber(a)} نقطة)</strong>
      <p><strong>إجابة الطالب:</strong> ${escapeHtml(n || "-")}</p>
      ${e.correctAnswer ? `<p class="muted"><strong>نموذج الإجابة:</strong> ${escapeHtml(e.correctAnswer)}</p>` : ""}
      <div class="field">
        <label>النقطة على ${formatNumber(a)}</label>
        <input name="answer-${t}" type="number" min="0" max="${escapeHtml(a)}" step="0.25" value="${isNumericScore(e.awardedPoints) ? escapeHtml(e.awardedPoints) : ""}" data-manual-answer-points data-answer-index="${t}" required ${r ? "disabled" : ""}>
      </div>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:521743-524013 (Vf). */
function renderExamForm(e = "admin", exam = {}) {
  return `
    <form class="grid two" data-exam-add-form data-exam-schedule-form>
      <input type="hidden" name="scheduleId" value="${escapeHtml(exam.scheduleId || "")}">
      <div class="field">
        <label for="examTitleNew-${e}">عنوان الامتحان</label>
        <input id="examTitleNew-${e}" name="title" value="${escapeHtml(exam.title || "")}" required>
      </div>
      <div class="field">
        <label for="examSubjectNew-${e}">المادة</label>
        <select id="examSubjectNew-${e}" name="subjectId">${state.subjects.map((r) => renderOption(r.id, subjectDisplayName(r), exam.subjectId || "")).join("")}</select>
      </div>
      <div class="field">
        <label for="examNiveauNew-${e}">المستوى</label>
        <select id="examNiveauNew-${e}" name="niveauId">${state.levels.map((r) => renderOption(r.id, r.name, exam.niveauId || "")).join("")}</select>
      </div>
      <div class="field">
        <label for="examGroupeNew-${e}">المجموعة</label>
        <select id="examGroupeNew-${e}" name="groupeId">
          <option value="" ${exam.groupeId ? "" : "selected"}>كل المجموعات</option>
          ${state.groups.map((r) => renderOption(r.id, r.name, exam.groupeId || "")).join("")}
        </select>
      </div>
      <div class="field">
        <label for="examOpensAtNew-${e}">وقت فتح الامتحان</label>
        <input id="examOpensAtNew-${e}" name="opensAt" type="datetime-local" value="${escapeHtml(exam.opensAt || "")}" data-exam-opens-at required>
      </div>
      <div class="field">
        <label for="examDurationNew-${e}">المدة بالدقائق</label>
        <input id="examDurationNew-${e}" name="durationMinutes" type="number" min="1" placeholder="30" value="${escapeHtml(exam.durationMinutes || "")}" data-exam-duration required>
      </div>
      <div class="field span-two">
        <label for="examClosesAtNew-${e}">وقت غلق الامتحان</label>
        <input id="examClosesAtNew-${e}" class="readonly-input" type="text" value="${escapeHtml(exam.closesAt || "")}" placeholder="يتحسب تلقائيًا بعد تحديد وقت الفتح والمدة" data-exam-closes-at readonly>
      </div>
      <div class="field span-two">
        <label for="examQuestionsNew-${e}">أسئلة الامتحان</label>
        ${renderExamQuestionBuilder(
          [
            {
              type: "text",
              text: "",
              points: 1,
              options: [],
              correctAnswer: "",
            },
          ],
          "",
        )}
      </div>
      <div class="form-actions span-two">
        <button class="button primary" type="submit">حفظ الامتحان</button>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:524013-524686 (Gf). */
function renderExamManagementCards(items) {
  return items.length
    ? `
    <div class="exam-management-toolbar">
      <div class="field">
        <label for="examManagementSearch">البحث في الامتحانات</label>
        <input id="examManagementSearch" type="search" placeholder="ابحث بالعنوان، المادة، المستوى، المجموعة..." data-exam-management-search>
      </div>
      <span class="muted">${items.length} امتحان</span>
    </div>
    <div class="exam-management-list exam-list-scroll" data-exam-management-list>
      ${items.map((t) => renderExamSummaryCard(t)).join("")}
    </div>
    <div class="empty-state exam-management-empty" hidden>لا توجد امتحانات مطابقة للبحث.</div>
  `
    : '<div class="empty-state">لا توجد امتحانات حاليًا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:524686-526384 (mE). */
function renderExamSummaryCard(e) {
  const t = [
    e.title,
    subjectName(e.subjectId),
    contentLevelLabels(e),
    contentGroupLabels(e),
    contentCreatorLabel(e),
    examQuestionCount(e),
    examTotalPoints(e),
    examOpenLabel(e),
    examCloseLabel(e),
  ].join(" ");
  const r = state.examSubmissions.filter((i) => String(i.examId) === String(e.id)).length;
  const a = canManageExam(e);
  const n = isExamPublished(e);
  return `
    <article class="exam-summary-card" data-exam-card data-search="${escapeHtml(t.toLowerCase())}">
      <div class="exam-summary-main">
        <div>
          <h3>${escapeHtml(e.title)}</h3>
          <p class="muted">${subjectName(e.subjectId)} · ${contentLevelLabels(e)} · ${contentGroupLabels(e)} · ${contentCreatorLabel(e)}</p>
        </div>
      </div>
      <div class="exam-summary-meta">
        <span>${examQuestionCount(e)} سؤال</span>
        <span>${formatNumber(examTotalPoints(e))} نقطة</span>
        <span>${examDuration(e)} دقيقة</span>
        <span>يفتح: ${examOpenLabel(e)}</span>
        <span>يغلق: ${examCloseLabel(e)}</span>
        <span>${r} تسليم</span>
        <span class="chip ${n ? "turquoise" : "gold"}">${n ? "منشور للطلبة" : "في انتظار النشر"}</span>
      </div>
      <div class="exam-summary-actions">
        <a class="button ghost" href="${entityHref("examPreview", "exam", e.id)}">معاينة كطالب</a>
        ${
          a
            ? `
          <a class="button secondary" href="${entityHref("examEditor", "exam", e.id)}">فتح / تعديل الأسئلة</a>
          <button class="button ${n ? "secondary" : "primary"}" type="button" data-publish-exam="${escapeHtml(e.id)}" ${n ? "disabled" : ""}>${n ? "تم توزيع الامتحان على الطلبة" : "نشر وتوزيع الامتحان"}</button>
          <a class="button ghost" href="${entityHref("examCorrection", "exam", e.id)}">تصحيح الإجابات</a>
          <button class="button ghost danger" type="button" data-delete-exam="${escapeHtml(e.id)}">حذف</button>
        `
            : state.currentUser?.role === "admin"
              ? `<a class="button secondary" href="${entityHref("examCorrection", "exam", e.id)}">عرض التصحيح والأعداد</a>`
              : '<button class="button ghost" type="button" disabled>للمعاينة فقط</button>'
        }
      </div>
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:526384-528299 (pE). */
function renderExamEditorForm(exam) {
  const t = `exam-edit-${exam.id}`;
  return `
    <form id="${t}" class="grid two exam-editor-form" data-exam-edit-form data-exam-schedule-form data-exam-id="${escapeHtml(exam.id)}">
      <div class="field">
        <label>عنوان الامتحان</label>
        <input name="title" value="${escapeHtml(exam.title)}" required>
      </div>
      <div class="field">
        <label>المادة</label>
        <select name="subjectId">
          ${state.subjects.map((r) => renderOption(r.id, subjectDisplayName(r), exam.subjectId)).join("")}
        </select>
      </div>
      <div class="field">
        <label>المستوى</label>
        <select name="niveauId">
          ${state.levels.map((r) => renderOption(r.id, r.name, contentLevelIds(exam))).join("")}
        </select>
      </div>
      <div class="field">
        <label>المجموعة</label>
        <select name="groupeId">
          <option value="" ${contentGroupIds(exam).length ? "" : "selected"}>كل المجموعات</option>
          ${state.groups.map((r) => renderOption(r.id, r.name, contentGroupIds(exam))).join("")}
        </select>
      </div>
      <div class="field">
        <label>وقت الفتح</label>
        <input name="opensAt" type="datetime-local" value="${escapeHtml(toDateTimeLocal(exam.opensAt))}" data-exam-opens-at required>
      </div>
      <div class="field">
        <label>المدة بالدقائق</label>
        <input name="durationMinutes" type="number" min="1" value="${escapeHtml(examDuration(exam))}" data-exam-duration required>
      </div>
      <div class="field span-two">
        <label>وقت الغلق</label>
        <input class="readonly-input" type="text" value="${escapeHtml(examCloseLabel(exam))}" placeholder="يتحسب تلقائيًا بعد تحديد وقت الفتح والمدة" data-exam-closes-at readonly>
      </div>
      <div class="field span-two exam-management-questions">
        <label>الأسئلة</label>
        ${renderExamQuestionBuilder(examQuestions(exam), t)}
      </div>
      <div class="form-actions span-two">
        <button class="button primary" type="submit">حفظ التعديلات</button>
        <button class="button ghost danger" type="button" data-delete-exam="${escapeHtml(exam.id)}">حذف الامتحان</button>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:528299-528688 (Xf). */
function renderExamQuestionBuilder(e, t = "") {
  const items = e.length
    ? e
    : [
        {
          type: "text",
          text: "",
          points: 1,
          options: [],
          correctAnswer: "",
        },
      ];
  return `
    <div class="exam-question-builder" data-exam-question-builder="${escapeHtml(t)}">
      <div class="exam-builder-list">
        ${items.map((a, n) => renderExamBuilderQuestion(a, n, t)).join("")}
      </div>
      <button class="button ghost" type="button" data-add-exam-question>+ إضافة سؤال</button>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:528688-530122 (Yf). */
function renderExamBuilderQuestion(e, t, r = "") {
  `${t}${Math.random().toString(36).slice(2, 8)}`;
  const a = r ? ` form="${escapeHtml(r)}"` : "";
  const n = e.type === "qcm" ? "qcm" : "text";
  return `
    <div class="exam-builder-question" data-exam-builder-question>
      <div class="exam-builder-head">
        <strong>السؤال ${t + 1}</strong>
        <select name="questionType"${a} data-question-type>
          <option value="text" ${n === "text" ? "selected" : ""}>سؤال عادي</option>
          <option value="qcm" ${n === "qcm" ? "selected" : ""}>QCM</option>
        </select>
        <button class="button ghost danger" type="button" data-remove-exam-question>حذف</button>
      </div>
      <div class="field">
        <label>نقاط السؤال</label>
        <input name="questionPoints"${a} type="number" min="0.25" step="0.25" value="${escapeHtml(questionPoints(e))}" data-question-points required>
      </div>
      <div class="field">
        <label>نص السؤال</label>
        <textarea name="questionText"${a} data-question-text required>${escapeHtml(e.text || "")}</textarea>
      </div>
      <div class="exam-builder-options" data-question-options ${n === "qcm" ? "" : "hidden"}>
        <label>الاختيارات</label>
        <div class="exam-option-header">
          <span>الإجابة الصحيحة</span>
          <span>نص الاختيار</span>
        </div>
        <div class="exam-option-list">
          ${renderExamBuilderOptions(e)}
        </div>
        <button class="button ghost" type="button" data-add-exam-option>+ اختيار</button>
      </div>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:530122-530313 (gE). */
function renderExamBuilderOptions(e, t) {
  const items = e.options?.length ? e.options : ["", ""];
  const a = e.correctAnswers?.length ? e.correctAnswers : [e.correctAnswer].filter(Boolean);
  return items.map((n, i) => renderExamBuilderOption(n, i, a.includes(n))).join("");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:530313-530678 (Kf). */
function renderExamBuilderOption(e, t, r = false) {
  return `
    <div class="exam-builder-option" data-exam-option>
      <input type="checkbox" ${r ? "checked" : ""} data-option-correct aria-label="الإجابة الصحيحة">
      <input data-option-text value="${escapeHtml(e)}" placeholder="اختيار ${t + 1}">
      <button class="button ghost danger" type="button" data-remove-exam-option>حذف</button>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:530678-531059 (Jf). */
function renderQuestionnaireBuilder(e, t = "") {
  const items = e.length
    ? e
    : [
        {
          type: "text",
          text: "",
          options: [],
        },
      ];
  return `
    <div class="exam-question-builder" data-questionnaire-question-builder="${escapeHtml(t)}">
      <div class="exam-builder-list">
        ${items.map((a, n) => renderQuestionnaireBuilderQuestion(a, n, t)).join("")}
      </div>
      <button class="button ghost" type="button" data-add-questionnaire-question>+ إضافة سؤال</button>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:531059-532227 (Qf). */
function renderQuestionnaireBuilderQuestion(e, t, r = "") {
  const a = r ? ` form="${escapeHtml(r)}"` : "";
  const n = e.type === "checklist" ? "checklist" : "text";
  return `
    <div class="exam-builder-question" data-questionnaire-builder-question>
      <div class="exam-builder-head">
        <strong>السؤال ${t + 1}</strong>
        <select name="questionType"${a} data-questionnaire-question-type>
          <option value="text" ${n === "text" ? "selected" : ""}>إجابة نصية</option>
          <option value="checklist" ${n === "checklist" ? "selected" : ""}>Checklist</option>
        </select>
        <button class="button ghost danger" type="button" data-remove-questionnaire-question>حذف</button>
      </div>
      <div class="field">
        <label>نص السؤال</label>
        <textarea name="questionText"${a} data-questionnaire-question-text required>${escapeHtml(e.text || "")}</textarea>
      </div>
      <div class="exam-builder-options" data-questionnaire-question-options ${n === "checklist" ? "" : "hidden"}>
        <label>اختيارات checklist</label>
        <div class="exam-option-list">
          ${renderQuestionnaireBuilderOptions(e)}
        </div>
        <button class="button ghost" type="button" data-add-questionnaire-option>+ اختيار</button>
      </div>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:532227-532315 (xE). */
function renderQuestionnaireBuilderOptions(e) {
  return (e.options?.length ? e.options : ["", ""])
    .map((r, a) => renderQuestionnaireBuilderOption(r, a))
    .join("");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:532315-532625 (Zf). */
function renderQuestionnaireBuilderOption(e, t) {
  return `
    <div class="exam-builder-option questionnaire-builder-option" data-questionnaire-option>
      <input data-option-text value="${escapeHtml(e)}" placeholder="اختيار ${t + 1}">
      <button class="button ghost danger" type="button" data-remove-questionnaire-option>حذف</button>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:532625-533523 (vE). */
function renderQuestionnaireManagementPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = state.questionnaires.filter((r) => questionnaireAudience(r) === "students").length;
  const t = state.questionnaires.filter((r) => questionnaireAudience(r) === "teachers").length;
  return renderDashboard(
    "إدارة الاستبيانات",
    `
    <div class="stats-grid">
      ${renderStat("الاستبيانات", state.questionnaires.length)}
      ${renderStat("للطلبة", e)}
      ${renderStat("للأساتذة", t)}
      ${renderStat("التسليمات", state.questionnaireSubmissions.length)}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>إضافة استبيان</h2>
          <p>أضف استبيانًا وحدد هل هو موجه للطلبة أو للأساتذة، ثم اكتب الأسئلة النصية أو checklist.</p>
        </div>
        <div class="toolbar">
          <a class="button secondary" href="#questionnaireResults">نتائج الاستبيانات</a>
          <a class="button ghost" href="#admin">رجوع للوحة</a>
        </div>
      </div>
      ${renderQuestionnaireForm()}
    </section>
  `,
    `
    <section class="panel">
      <h2>قائمة الاستبيانات</h2>
      ${renderQuestionnaireManagementCards(state.questionnaires)}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:533523-535044 (bE). */
function renderQuestionnaireForm() {
  return `
    <form class="grid two" data-questionnaire-add-form>
      <div class="field">
        <label for="questionnaireTitleNew">عنوان الاستبيان</label>
        <input id="questionnaireTitleNew" name="title" required>
      </div>
      <div class="field">
        <label for="questionnaireAudienceNew">موجه إلى</label>
        <select id="questionnaireAudienceNew" name="targetAudience">
          <option value="students">الطلبة</option>
          <option value="teachers">الأساتذة</option>
        </select>
      </div>
      <div class="field">
        <label for="questionnaireSubjectNew">المادة</label>
        <select id="questionnaireSubjectNew" name="subjectId">${state.subjects.map((e) => renderOption(e.id, subjectDisplayName(e))).join("")}</select>
      </div>
      <div class="field">
        <label for="questionnaireNiveauNew">المستوى</label>
        <select id="questionnaireNiveauNew" name="niveauId">${state.levels.map((e) => renderOption(e.id, e.name)).join("")}</select>
      </div>
      <div class="field">
        <label for="questionnaireGroupeNew">المجموعة</label>
        <select id="questionnaireGroupeNew" name="groupeId">
          <option value="">كل المجموعات</option>
          ${state.groups.map((e) => renderOption(e.id, e.name)).join("")}
        </select>
      </div>
      <div class="field span-two">
        <label>أسئلة الاستبيان</label>
        ${renderQuestionnaireBuilder(
          [
            {
              type: "text",
              text: "",
              options: [],
            },
          ],
          "",
        )}
      </div>
      <div class="form-actions span-two">
        <button class="button primary" type="submit">حفظ الاستبيان</button>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:535044-535727 (wE). */
function renderQuestionnaireManagementCards(items) {
  return items.length
    ? `
    <div class="exam-management-toolbar">
      <div class="field">
        <label for="questionnaireManagementSearch">البحث في الاستبيانات</label>
        <input id="questionnaireManagementSearch" type="search" placeholder="ابحث بالعنوان، المادة، الفئة..." data-exam-management-search>
      </div>
      <span class="muted">${items.length} استبيان</span>
    </div>
    <div class="exam-management-list exam-list-scroll" data-exam-management-list>
      ${items.map((t) => renderQuestionnaireSummaryCard(t)).join("")}
    </div>
    <div class="empty-state exam-management-empty" hidden>لا توجد استبيانات مطابقة للبحث.</div>
  `
    : '<div class="empty-state">لا توجد استبيانات حاليًا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:535727-536908 (SE). */
function renderQuestionnaireSummaryCard(e) {
  const t = [
    e.title,
    subjectName(e.subjectId),
    levelName(e.niveauId),
    e.groupeId ? groupName(e.groupeId) : "كل المجموعات",
    questionnaireAudienceLabel(e.targetAudience),
    questionnaireQuestionCount(e),
  ].join(" ");
  const r = state.questionnaireSubmissions.filter((a) => String(a.questionnaireId) === String(e.id)).length;
  return `
    <article class="exam-summary-card" data-exam-card data-search="${escapeHtml(t.toLowerCase())}">
      <div class="exam-summary-main">
        <div>
          <h3>${escapeHtml(e.title)}</h3>
          <p class="muted">${questionnaireAudienceLabel(e.targetAudience)} · ${subjectName(e.subjectId)} · ${levelName(e.niveauId)} · ${e.groupeId ? groupName(e.groupeId) : "كل المجموعات"}</p>
        </div>
      </div>
      <div class="exam-summary-meta">
        <span>${questionnaireQuestionCount(e)} سؤال</span>
        <span>${r} تسليم</span>
      </div>
      <div class="exam-summary-actions">
        <a class="button secondary" href="${entityHref("questionnaireEditor", "questionnaire", e.id)}">فتح / تعديل الأسئلة</a>
        <a class="button ghost" href="${entityHref("questionnairePreview", "questionnaire", e.id)}">${questionnairePreviewLabel(e)}</a>
        <a class="button ghost" href="${entityHref("questionnaireResults", "questionnaire", e.id)}">نتائج</a>
        <button class="button ghost danger" type="button" data-delete-questionnaire="${escapeHtml(e.id)}">حذف</button>
      </div>
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:536908-537669 (yE). */
function renderQuestionnaireEditorPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = Number(resolveEntityReference("questionnaire"));
  const t = state.questionnaires.find((r) => Number(r.id) === e);
  return t
    ? renderDashboard(
        "تعديل الاستبيان",
        `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>${escapeHtml(t.title)}</h2>
          <p>عدّل الفئة المستهدفة والأسئلة. الاستبيان لا يعتمد على التصحيح، بل على إجابات نصية أو checklist.</p>
        </div>
        <div class="toolbar">
        <a class="button secondary" href="${entityHref("questionnairePreview", "questionnaire", t.id)}">${questionnairePreviewLabel(t)}</a>
          <a class="button ghost" href="#questionnaireManagement">رجوع للاستبيانات</a>
        </div>
      </div>
      ${renderQuestionnaireEditorForm(t)}
    </section>
  `,
      )
    : renderDashboard(
        "إدارة الاستبيانات",
        `
      <div class="empty-state">هذا الاستبيان غير موجود.</div>
    `,
      );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:537669-539222 (TE). */
function renderQuestionnaireEditorForm(e) {
  const t = `questionnaire-edit-${e.id}`;
  return `
    <form id="${t}" class="grid two exam-editor-form" data-questionnaire-edit-form data-questionnaire-id="${escapeHtml(e.id)}">
      <div class="field">
        <label>عنوان الاستبيان</label>
        <input name="title" value="${escapeHtml(e.title)}" required>
      </div>
      <div class="field">
        <label>موجه إلى</label>
        <select name="targetAudience">
          ${renderOption("students", "الطلبة", questionnaireAudience(e))}
          ${renderOption("teachers", "الأساتذة", questionnaireAudience(e))}
        </select>
      </div>
      <div class="field">
        <label>المادة</label>
        <select name="subjectId">
          ${state.subjects.map((r) => renderOption(r.id, subjectDisplayName(r), e.subjectId)).join("")}
        </select>
      </div>
      <div class="field">
        <label>المستوى</label>
        <select name="niveauId">
          ${state.levels.map((r) => renderOption(r.id, r.name, e.niveauId)).join("")}
        </select>
      </div>
      <div class="field">
        <label>المجموعة</label>
        <select name="groupeId">
          <option value="" ${e.groupeId ? "" : "selected"}>كل المجموعات</option>
          ${state.groups.map((r) => renderOption(r.id, r.name, e.groupeId || "")).join("")}
        </select>
      </div>
      <div class="field span-two exam-management-questions">
        <label>الأسئلة</label>
        ${renderQuestionnaireBuilder(questionnaireQuestions(e), t)}
      </div>
      <div class="form-actions span-two">
        <button class="button primary" type="submit">حفظ التعديلات</button>
        <button class="button ghost danger" type="button" data-delete-questionnaire="${escapeHtml(e.id)}">حذف الاستبيان</button>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:539222-540253 (EE). */
function renderQuestionnaireResultsPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = routeQuery();
  const t = Number(resolveEntityReference("questionnaire")) || Number(state.questionnaires[0]?.id) || 0;
  const r = state.questionnaires.find((s) => Number(s.id) === t) || state.questionnaires[0];
  const a = r ? state.questionnaireSubmissions.filter((s) => Number(s.questionnaireId) === Number(r.id)) : [];
  const n =
    resolveEntityReference("questionnaireSubmission", "submissionRef") ||
    e.get("submission") ||
    a[0]?.id ||
    "";
  const i = a.find((s) => String(s.id) === String(n)) || a[0];
  return renderDashboard(
    "نتائج الاستبيانات",
    `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>${r ? escapeHtml(r.title) : "ملخص النتائج"}</h2>
          <p>كل استبيان يعرض التسليمات الخاصة به فقط، ويمكن فتح إجابة كل مشارك من القائمة.</p>
        </div>
        <div class="toolbar">
          ${r ? `<button class="button secondary" type="button" data-export-questionnaire-results="${escapeHtml(r.id)}">تحميل Excel</button>` : ""}
          <a class="button ghost" href="#questionnaireManagement">رجوع للاستبيانات</a>
        </div>
      </div>
      ${state.questionnaires.length ? "" : '<div class="empty-state">لا توجد استبيانات حاليًا.</div>'}
      ${r ? renderQuestionnaireStats(r, a) : ""}
      ${r ? renderQuestionnaireResults(r, a, i) : ""}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:540253-540300 (eh). */
function submissionParticipantName(e) {
  return e.userName || userName(e.userId);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:540300-540656 (AE). */
function renderQuestionnaireResults(e, t, r) {
  return t.length
    ? `
    <div class="exam-correction-layout questionnaire-results-layout">
      ${renderQuestionnaireParticipants(e, t, r)}
      <div class="exam-correction-workspace">
        ${r ? renderParticipantDetail(e, r) : '<div class="empty-state">اختر مشاركًا لعرض إجاباته.</div>'}
      </div>
    </div>
  `
    : '<div class="empty-state">لم يتم تسليم أي إجابة لهذا الاستبيان بعد.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:540656-541477 (kE). */
function renderQuestionnaireParticipants(e, items, r) {
  return `
    <aside class="exam-correction-students" aria-label="قائمة المشاركين في الاستبيان">
      <div class="exam-correction-students-head">
        <strong>المشاركون</strong>
        <span>${items.length} تسليم</span>
      </div>
      <div class="exam-correction-student-list">
        ${items
          .map(
            (a) => `
            <a class="exam-correction-student ${String(a.id) === String(r?.id) ? "is-selected" : ""}" href="${entityHref(
              "questionnaireResults",
              "questionnaire",
              e.id,
              {
                submissionRef: entityReference("questionnaireSubmission", a.id),
              },
            )}">
              <span>
                <strong>${escapeHtml(submissionParticipantName(a))}</strong>
                <small>${formatDateTime(a.submittedAt)} · ${escapeHtml(roleLabel(a.userRole))}</small>
              </span>
              <span class="chip turquoise">تم التسليم</span>
            </a>
          `,
          )
          .join("")}
      </div>
    </aside>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:541477-541984 (_E). */
function renderParticipantDetail(e, t) {
  const items = questionnaireQuestions(e);
  return `
    <article class="exam-correction-detail questionnaire-participant-detail">
      <div class="section-heading">
        <div>
          <h3>${escapeHtml(submissionParticipantName(t))}</h3>
          <p class="muted">${formatDateTime(t.submittedAt)} · ${escapeHtml(roleLabel(t.userRole))}</p>
        </div>
        <span class="chip turquoise">تم التسليم</span>
      </div>
      <div class="questionnaire-participant-answers">
        ${items.map((a, n) => renderQuestionnaireAnswer(a, t.answers?.[n]?.answer, n)).join("")}
      </div>
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:541984-542346 (IE). */
function renderQuestionnaireAnswer(e, t, r) {
  return `
    <div class="exam-question questionnaire-answer-card">
      <div class="questionnaire-focused-head">
        <strong>${r + 1}. ${escapeHtml(e.text)}</strong>
        <span class="chip ${e.type === "checklist" ? "turquoise" : "gold"}">${e.type === "checklist" ? "Checklist" : "إجابة نصية"}</span>
      </div>
      <p>${escapeHtml(exportAnswerText(t) || "-")}</p>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:542346-542794 (FE). */
function renderQuestionnaireStats(e, t) {
  const r = questionnaireQuestions(e);
  return `
    <div class="stats-grid questionnaire-results-stats">
      ${renderStat("التسليمات", t.length)}
      ${renderStat("الأسئلة", r.length)}
      ${renderStat("المادة", subjectName(e.subjectId))}
      ${renderStat("الفئة", questionnaireAudienceLabel(e.targetAudience))}
    </div>
    <div class="questionnaire-results-meta">
      <strong>${escapeHtml(e.title)}</strong>
      <span>${levelName(e.niveauId)} · ${e.groupeId ? groupName(e.groupeId) : "كل المجموعات"}</span>
    </div>
    ${renderQuestionnaireChecklistStats(e, t)}
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:542794-543174 (CE). */
function renderQuestionnaireChecklistStats(e, t) {
  const items = questionnaireQuestions(e)
    .map((n, i) => ({
      question: n,
      index: i,
    }))
    .filter((n) => n.question.type === "checklist");
  return items.length
    ? `
    <div class="questionnaire-stat-list">
      ${items.map(({ question: n, index: i }) => renderChecklistChart(n, i, t)).join("")}
    </div>
  `
    : '<div class="empty-state questionnaire-results-note">هذا الاستبيان يحتوي على أسئلة نصية فقط. راجع جدول الإجابات التفصيلي في الأسفل.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:543174-543913 ($E). */
function renderChecklistChart(e, t, r) {
  const a = r.length || 0;
  const lookup = new Map((e.options || []).map((i) => [i, 0]));
  r.forEach((i) => {
    const s = i.answers?.[t]?.answer;
    (Array.isArray(s) ? s : [s].filter(Boolean)).forEach((c) => lookup.set(c, (lookup.get(c) || 0) + 1));
  });
  return `
    <article class="questionnaire-stat-card">
      <h3>${escapeHtml(e.text)}</h3>
      <div class="questionnaire-stat-options">
        ${[...lookup.entries()]
          .map(([i, s]) => {
            const o = a ? Math.round((s / a) * 100) : 0;
            return `
            <div class="questionnaire-stat-option">
              <div>
                <strong>${escapeHtml(i)}</strong>
                <span>${s} إجابة · ${o}%</span>
              </div>
              <meter min="0" max="100" value="${o}">${o}%</meter>
            </div>
          `;
          })
          .join("")}
      </div>
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:543913-544025 (NE). */
function renderRegistrationPanel() {
  return `
    <section class="panel">
      <h2>مطالب التسجيل</h2>
      ${renderRegistrationTable()}
    </section>
  `;
}
