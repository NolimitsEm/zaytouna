import { refreshExams } from "../services/state-repository.js";
import { state } from "../context/state.js";
import {
  audienceOnlyContent,
  canAccessExam,
  canAnswerQuestionnaire,
  canManageExam,
  filterContent,
  listingFilters,
  visibleExams,
  visibleQuestionnaires,
} from "../utils/content-access.js";
import { renderLoginPage } from "./account.js";
import {
  contentGroupLabels,
  contentLevelLabels,
  escapeHtml,
  formatDateTime,
  groupName,
  hasRole,
  levelName,
  renderOption,
  subjectDisplayName,
  subjectName,
  visibleSubjects,
} from "../utils/formatters.js";
import { attachmentLabels } from "../services/attachments.js";
import { examQuestionCount } from "../controllers/exam-session.js";
import {
  examDuration,
  examQuestions,
  formatNumber,
  questionPoints,
  questionnaireAudienceLabel,
  questionnairePreviewLabel,
  questionnaireQuestionCount,
  questionnaireQuestions,
} from "../components/question-builders.js";
import {
  examAvailability,
  examClosesAt,
  latestExamSubmission,
  questionnaireSubmission,
} from "../services/exam-timing.js";
import { isLessonAbsent, isLessonPublished } from "./lessons.js";
import { courseHref, entityHref, resolveEntityReference, routeQuery } from "../routes/router.js";
import { renderDashboard } from "../components/content-management.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:458592-458879 (gT). */
function renderExamsPage() {
  if ((refreshExams(), !state.currentUser)) return requireLogin();
  const e = listingFilters("");
  const t =
    state.currentUser.role === "student"
      ? {
          ...e,
          subject: "",
        }
      : e;
  const r =
    state.currentUser.role === "student"
      ? searchStudentExams(visibleExams(state.exams), t)
      : filterContent(visibleExams(state.exams), t);
  return renderListingPage({
    title: "الامتحانات",
    eyebrow: "الامتحانات",
    description: "تخضع الامتحانات لنفس قاعدة الوصول الخاصة بالدروس.",
    filters: t,
    items: r,
    type: "exam",
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:458879-459032 (xT). */
function searchStudentExams(e, t) {
  let items = e;
  if (t.search) {
    const a = t.search.toLowerCase();
    items = items.filter((n) => `${n.title} ${n.description || ""}`.toLowerCase().includes(a));
  }
  return items;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:459032-459316 (vT). */
function renderQuestionnairesPage() {
  if (!state.currentUser) return requireLogin();
  const e = listingFilters("");
  const t = filterContent(visibleQuestionnaires(state.questionnaires), e);
  return renderListingPage({
    title: "الاستبيانات",
    eyebrow: "الاستبيانات",
    description:
      state.currentUser.role === "teacher"
        ? "تظهر هنا الاستبيانات الموجهة للأساتذة."
        : "تظهر الاستبيانات المرتبطة بمستوى الطالب ومجموعته فقط.",
    filters: e,
    items: t,
    type: "questionnaire",
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:459316-459343 (Fn). */
function requireLogin(e) {
  return renderLoginPage();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:459343-460010 (jc). */
function renderListingPage({
  title: e,
  eyebrow: t,
  description: r,
  filters: a,
  items: items,
  type: i,
  actions: s = "",
}) {
  return `
    <section class="section listing-page ${escapeHtml(i)}-listing-page" aria-labelledby="listing-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${t}</p>
          <h1 id="listing-title">${e}</h1>
          <p>${r}</p>
        </div>
        ${s ? `<div class="toolbar">${s}</div>` : ""}
      </div>
      ${renderStudentNotice()}
      ${renderListingFilters(a)}
      <div class="grid three" aria-live="polite">
        ${
          items.length
            ? items.map((o) => renderListingCard(o, i)).join("")
            : `
          <div class="empty-state">لا يوجد محتوى متاح لهذه الاختيارات.</div>
        `
        }
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:460010-461278 (bT). */
function renderListingFilters(e) {
  return `
    <form class="filters" data-filter-form>
      <div class="field">
        <label for="subjectFilter">المادة</label>
        <select id="subjectFilter" name="subject" ${e.lockSubject ? "disabled" : ""}>
          <option value="">كل المواد</option>
          ${visibleSubjects()
            .map((t) => renderOption(t.id, subjectDisplayName(t), e.subject))
            .join("")}
        </select>
      </div>
      <div class="field">
        <label for="niveauFilter">المستوى</label>
        <select id="niveauFilter" name="niveau" ${state.currentUser?.role === "student" ? "disabled" : ""}>
          <option value="">كل المستويات</option>
          ${state.levels.map((t) => renderOption(t.id, t.name, e.niveau)).join("")}
        </select>
      </div>
      <div class="field">
        <label for="groupeFilter">المجموعة</label>
        <select id="groupeFilter" name="groupe" ${state.currentUser?.role === "student" ? "disabled" : ""}>
          <option value="">كل المجموعات</option>
          ${state.groups.map((t) => renderOption(t.id, t.name, e.groupe)).join("")}
          <option value="all" ${e.groupe === "all" ? "selected" : ""}>كل المجموعات في المستوى</option>
        </select>
      </div>
      <div class="field">
        <label for="searchFilter">بحث</label>
        <input id="searchFilter" name="search" value="${escapeHtml(e.search)}" placeholder="اكتب عنوانًا أو وصفًا">
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:461278-462763 (wT). */
function renderListingCard(e, t) {
  const r = state.subjects.find((c) => c.id === e.subjectId);
  const a = t === "course" ? "فتح الدرس" : t === "exam" ? "بدء الامتحان" : "فتح الاستبيان";
  const n =
    t === "course"
      ? `<p class="muted">الملفات: ${attachmentLabels(e).join("، ")}</p>`
      : `<p class="muted">${t === "exam" ? examQuestionCount(e) : questionnaireQuestionCount(e)} سؤال${e.duration ? ` · ${e.duration}` : ""}</p>`;
  const i = t === "exam" ? examAvailability(e) : null;
  const s = t === "course" && state.currentUser?.role === "student" && isLessonAbsent(e);
  const o =
    t === "exam"
      ? renderExamAction(e, i)
      : t === "course"
        ? s
          ? '<button class="button ghost" type="button" disabled>مغلق بسبب غياب الأستاذ</button>'
          : state.currentUser?.role === "student" && !isLessonPublished(e)
            ? '<button class="button ghost" type="button" disabled>يفتح بعد نشر الأستاذ</button>'
            : `<a class="button secondary" href="${courseHref("lesson", e.id)}">${a}</a>`
        : renderQuestionnaireAction(e);
  return `
    <article class="card content-card ${escapeHtml(t)}-content-card">
      <div class="chips">
        <span class="chip">${contentLevelLabels(e)}</span>
        <span class="chip gold">${contentGroupLabels(e)}</span>
        <span class="chip turquoise">${r.short}</span>
      </div>
      <h3>${e.title}</h3>
      <p class="muted">${e.description || "تقييم متاح لهذا المسار."}</p>
      ${n}
      ${t === "course" && state.currentUser?.role === "student" && s ? '<p class="muted">تم غلق الدرس لأن الأستاذ متغيب عن الحصّة المرتبطة به.</p>' : ""}
      ${t === "course" && state.currentUser?.role === "student" && !isLessonPublished(e) ? '<p class="muted">تمت إضافة الدرس وهو في انتظار مراجعة ونشر الأستاذ.</p>' : ""}
      ${t === "exam" ? `<p class="muted">${i.label}</p>` : ""}
      ${t === "questionnaire" ? `<p class="muted">${questionnaireAudienceLabel(e.targetAudience)}</p>` : ""}
      <div class="card-actions">
        ${o}
      </div>
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:462763-463198 (ST). */
function renderExamAction(e, t) {
  const r = state.currentUser ? latestExamSubmission(state.currentUser.id, e.id) : null;
  return r?.missedExam && t.state === "open"
    ? `<a class="button secondary" href="${entityHref("examSession", "exam", e.id)}">إجراء امتحان التعويض</a>`
    : r
      ? '<button class="button ghost" type="button" disabled>تم التسليم</button>'
      : t.state !== "open"
        ? `<button class="button ghost" type="button" disabled>${t.action}</button>`
        : `<a class="button secondary" href="${entityHref("examSession", "exam", e.id)}">بدء الامتحان</a>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:463198-463422 (yT). */
function renderQuestionnaireAction(e) {
  return (state.currentUser ? questionnaireSubmission(state.currentUser.id, e.id) : null)
    ? '<button class="button ghost" type="button" disabled>تم التسليم</button>'
    : `<a class="button secondary" href="${entityHref("questionnaireSession", "questionnaire", e.id)}">فتح الاستبيان</a>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:463422-465651 (TT). */
function renderExamSessionPage() {
  if ((refreshExams(), !state.currentUser)) return requireLogin();
  if (state.currentUser.role !== "student")
    return `
      <section class="section">
        <div class="empty-state">صفحة الامتحان مخصصة للطلبة فقط.</div>
      </section>
    `;
  const e = Number(routeQuery().get("scheduleId")) || null;
  const t = Number(resolveEntityReference("exam"));
  const r = e
    ? state.exams.find((s) => Number(s.scheduleId) === e)
    : state.exams.find((s) => Number(s.id) === t);
  if (!r || !audienceOnlyContent([r], state.currentUser).length)
    return `
      <section class="section">
        <div class="empty-state">${e ? "الامتحان غير متاح لهذه الحصة حاليًا. لم يقم الأستاذ بتحضيره بعد." : "هذا الامتحان غير متاح لهذا الحساب."}</div>
      </section>
    `;
  const a = latestExamSubmission(state.currentUser.id, r.id);
  const n = examAvailability(r);
  if (a && !a.missedExam)
    return `
      <section class="section">
        <div class="empty-state">
          تم تسليم هذا الامتحان يوم ${formatDateTime(a.submittedAt)}.
        </div>
      </section>
    `;
  if (n.state !== "open")
    return `
      <section class="section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">صفحة الامتحان</p>
            <h1>${escapeHtml(r.title)}</h1>
            <p>${n.label}</p>
          </div>
          <a class="button ghost" href="#exams">رجوع للامتحانات</a>
        </div>
      </section>
    `;
  const items = examQuestions(r);
  return `
    <section class="section exam-session" data-exam-session data-exam-id="${escapeHtml(r.id)}" oncopy="return false" oncut="return false" onpaste="return false" oncontextmenu="return false">
      <div class="section-heading">
        <div>
          <p class="eyebrow">صفحة الامتحان</p>
          <h1>${escapeHtml(r.title)}</h1>
          <p>${subjectName(r.subjectId)} · ${contentLevelLabels(r)} · ${contentGroupLabels(r)}</p>
        </div>
        <div class="exam-timer" data-exam-countdown data-exam-ends-at="${examClosesAt(r).toISOString()}"></div>
      </div>
      <div class="notice">
        ${a ? "إعادة هذا الامتحان ستعوّض النتيجة السابقة ولا تُحتسب مرتين في المعدل." : "هذه الصفحة مراقبة داخل المنصة. النسخ واللصق والقائمة اليمنى معطّلة أثناء الامتحان."}
      </div>
      <form class="exam-paper" data-exam-session-form data-exam-id="${escapeHtml(r.id)}" autocomplete="off">
        ${items.map((s, o) => renderExamQuestion(s, o)).join("")}
        <div class="form-actions">
          <button class="button primary" type="submit">تسليم الامتحان</button>
          <a class="button ghost" href="#exams">خروج</a>
        </div>
      </form>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:465651-467104 (ET). */
function renderExamPreviewPage() {
  if (!["admin", "teacher"].includes(state.currentUser?.role)) return renderLoginPage();
  const e = Number(routeQuery().get("scheduleId")) || null;
  const t = Number(resolveEntityReference("exam"));
  const r = e
    ? state.exams.find((i) => Number(i.scheduleId) === e)
    : state.exams.find((i) => Number(i.id) === t);
  if (!r || !canAccessExam(r))
    return renderDashboard(
      "معاينة الامتحان",
      `
      <div class="empty-state">${e ? "الامتحان غير متاح لهذه الحصة حاليًا. لم يقم الأستاذ بتحضيره بعد." : "هذا الامتحان غير موجود أو لا تملك صلاحية معاينته."}</div>
    `,
    );
  const items = examQuestions(r);
  const n = state.currentUser.role === "admin" ? "#examManagement" : "#examPrep";
  return renderDashboard(
    "معاينة الامتحان",
    `
    <section class="section exam-session" aria-labelledby="exam-preview-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">معاينة كطالب</p>
          <h1 id="exam-preview-title">${escapeHtml(r.title)}</h1>
          <p>${subjectName(r.subjectId)} · ${contentLevelLabels(r)} · ${contentGroupLabels(r)} · ${examDuration(r)} دقيقة</p>
        </div>
        <div class="toolbar">
          ${canManageExam(r) ? `<a class="button secondary" href="${entityHref("examEditor", "exam", r.id)}">تعديل الامتحان</a>` : ""}
          <a class="button ghost" href="${n}">رجوع للامتحانات</a>
        </div>
      </div>
      <div class="notice">هذه معاينة فقط. لا يتم احتساب الوقت ولا تسجيل إجابات.</div>
      <form class="exam-paper">
        ${items.map((i, s) => renderExamQuestion(i, s)).join("")}
        <div class="form-actions">
          <button class="button primary" type="button" disabled>تسليم الامتحان</button>
          <a class="button ghost" href="${n}">خروج</a>
        </div>
      </form>
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:467104-467813 (Rf). */
function renderExamQuestion(question, t) {
  const r = `${t + 1}. ${escapeHtml(question.text)} (${formatNumber(questionPoints(question))} نقطة)`;
  return question.type === "qcm"
    ? `
      <fieldset class="exam-question">
        <legend>${r}</legend>
        <div class="exam-options">
          ${(question.options || [])
            .map(
              (a, n) => `
            <label>
              <input type="checkbox" name="q-${t}" value="${escapeHtml(a)}" data-exam-answer>
              <span>${escapeHtml(a)}</span>
            </label>
          `,
            )
            .join("")}
        </div>
      </fieldset>
    `
    : `
    <div class="exam-question">
      <label for="exam-answer-${t}">${r}</label>
      <textarea id="exam-answer-${t}" name="q-${t}" required autocomplete="off" spellcheck="false" data-exam-answer onpaste="return false"></textarea>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:467813-469250 (AT). */
function renderQuestionnaireSessionPage() {
  if (!state.currentUser) return requireLogin();
  if (!["student", "teacher"].includes(state.currentUser.role))
    return `
      <section class="section">
        <div class="empty-state">صفحة الاستبيان مخصصة للطلبة والأساتذة فقط.</div>
      </section>
    `;
  const e = Number(resolveEntityReference("questionnaire"));
  const t = state.questionnaires.find((n) => Number(n.id) === e);
  if (!t || !canAnswerQuestionnaire(t, state.currentUser))
    return `
      <section class="section">
        <div class="empty-state">هذا الاستبيان غير متاح لهذا الحساب.</div>
      </section>
    `;
  const r = questionnaireSubmission(state.currentUser.id, t.id);
  if (r)
    return `
      <section class="section">
        <div class="empty-state">
          تم تسليم هذا الاستبيان يوم ${formatDateTime(r.submittedAt)}.
        </div>
      </section>
    `;
  const items = questionnaireQuestions(t);
  return `
    <section class="section" aria-labelledby="questionnaire-session-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">صفحة الاستبيان</p>
          <h1 id="questionnaire-session-title">${escapeHtml(t.title)}</h1>
          <p>${subjectName(t.subjectId)} · ${questionnaireAudienceLabel(t.targetAudience)}</p>
        </div>
        <a class="button ghost" href="#questionnaires">رجوع للاستبيانات</a>
      </div>
      <form class="exam-paper" data-questionnaire-session-form data-questionnaire-id="${escapeHtml(t.id)}">
        ${items.map((n, i) => renderQuestionnaireQuestion(n, i)).join("")}
        <div class="form-actions">
          <button class="button primary" type="submit">تسليم الاستبيان</button>
          <a class="button ghost" href="#questionnaires">خروج</a>
        </div>
      </form>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:469250-470497 (kT). */
function renderQuestionnairePreviewPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const e = Number(resolveEntityReference("questionnaire"));
  const t = state.questionnaires.find((a) => Number(a.id) === e);
  if (!t)
    return renderDashboard(
      "معاينة الاستبيان",
      `
      <div class="empty-state">هذا الاستبيان غير موجود.</div>
    `,
    );
  const items = questionnaireQuestions(t);
  return renderDashboard(
    "معاينة الاستبيان",
    `
    <section class="section" aria-labelledby="questionnaire-preview-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${questionnairePreviewLabel(t)}</p>
          <h1 id="questionnaire-preview-title">${escapeHtml(t.title)}</h1>
          <p>${subjectName(t.subjectId)} · ${questionnaireAudienceLabel(t.targetAudience)} · ${levelName(t.niveauId)} · ${t.groupeId ? groupName(t.groupeId) : "كل المجموعات"}</p>
        </div>
        <div class="toolbar">
          <a class="button secondary" href="${entityHref("questionnaireEditor", "questionnaire", t.id)}">تعديل الاستبيان</a>
          <a class="button ghost" href="#questionnaireManagement">رجوع للاستبيانات</a>
        </div>
      </div>
      <form class="exam-paper questionnaire-preview-paper">
        ${items.map((a, n) => renderQuestionnaireQuestion(a, n)).join("")}
        <div class="form-actions">
          <button class="button primary" type="button" disabled>تسليم الاستبيان</button>
          <a class="button ghost" href="#questionnaireManagement">خروج</a>
        </div>
      </form>
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:470497-471111 (Pf). */
function renderQuestionnaireQuestion(question, t) {
  const r = `${t + 1}. ${escapeHtml(question.text)}`;
  return question.type === "checklist"
    ? `
      <fieldset class="exam-question">
        <legend>${r}</legend>
        <div class="exam-options">
          ${(question.options || [])
            .map(
              (a) => `
            <label>
              <input type="checkbox" name="q-${t}" value="${escapeHtml(a)}">
              <span>${escapeHtml(a)}</span>
            </label>
          `,
            )
            .join("")}
        </div>
      </fieldset>
    `
    : `
    <div class="exam-question">
      <label for="questionnaire-answer-${t}">${r}</label>
      <textarea id="questionnaire-answer-${t}" name="q-${t}" required></textarea>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:471111-471268 (Of). */
function renderStudentNotice() {
  return state.currentUser?.role !== "student"
    ? ""
    : `
    <div class="notice">
      الحساب الحالي: ${state.currentUser.name} · ${levelName(state.currentUser.niveauId)} · ${groupName(state.currentUser.groupeId)}
    </div>
  `;
}
