import {
  escapeHtml,
  groupName,
  levelName,
  renderOption,
  safeImageUrl,
  subjectDisplayName,
  subjectName,
} from "../utils/formatters.js";
import { state } from "../context/state.js";
import {
  renderDraftAttachments,
  renderSavedAttachments,
  savedAttachmentLabels,
} from "../services/attachments.js";
import { exerciseSubmissions, isLessonPublished, normalizeExerciseFile } from "../pages/lessons.js";
import { isCourseTeacher } from "../utils/content-access.js";
import { courseHref } from "../routes/router.js";
import { renderZoomButton, renderZoomHiddenFields, renderZoomScheduleFields } from "./teaching.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:604863-608799 (OA). */
function renderPublicContentManager() {
  return `
    <section class="panel admin-public-manager">
      <div class="section-heading">
        <div>
          <h2>إدارة واجهة الموقع العمومية</h2>
          <p>هذه التعديلات تظهر في الصفحات التي يراها الزائر من خارج المنصة.</p>
        </div>
        <button class="button ghost" type="button" data-reset-public-content>استرجاع المحتوى الأصلي</button>
      </div>

      <form class="grid two admin-edit-form" data-public-settings-form>
        <div class="field">
          <label for="homeTitleAdmin">عنوان الصفحة الرئيسية</label>
          <input id="homeTitleAdmin" name="homeTitle" value="${escapeHtml(state.publicContent.home.title)}">
        </div>
        <div class="field">
          <label for="homeDescriptionAdmin">وصف الصفحة الرئيسية</label>
          <textarea id="homeDescriptionAdmin" name="homeDescription">${escapeHtml(state.publicContent.home.description)}</textarea>
        </div>
        <div class="field">
          <label for="aboutTitleAdmin">عنوان صفحة من نحن</label>
          <input id="aboutTitleAdmin" name="aboutTitle" value="${escapeHtml(state.publicContent.about.title)}">
        </div>
        <div class="field">
          <label for="aboutDescriptionAdmin">وصف صفحة من نحن</label>
          <textarea id="aboutDescriptionAdmin" name="aboutDescription">${escapeHtml(state.publicContent.about.description)}</textarea>
        </div>
        ${renderPublicPageFields("teachers", "صفحة طاقم الأساتذة")}
        ${renderPublicPageFields("programs", "صفحة البرامج التعليمية")}
        ${renderPublicPageFields("activities", "صفحة الأنشطة والفعاليات")}
        ${renderPublicPageFields("news", "صفحة الأخبار والإعلانات")}
        ${renderPublicPageFields("media", "صفحة معرض الصور والفيديو")}
        ${renderPublicPageFields("register", "صفحة استمارة التسجيل")}
        ${renderPublicPageFields("platform", "صفحة منصة الدرس")}
        <div class="field">
          <label for="contactAddressAdmin">العنوان</label>
          <input id="contactAddressAdmin" name="contactAddress" value="${escapeHtml(state.publicContent.contact.address)}">
        </div>
        <div class="field">
          <label for="contactSecondaryAddressAdmin">عنوان فرعي (يظهر كنص فقط)</label>
          <input id="contactSecondaryAddressAdmin" name="contactSecondaryAddress" value="${escapeHtml(state.publicContent.contact.secondaryAddress || "")}">
        </div>
        <div class="field">
          <label for="contactPhoneAdmin">الهاتف</label>
          <input id="contactPhoneAdmin" name="contactPhone" value="${escapeHtml(state.publicContent.contact.phone)}">
        </div>
        <div class="field">
          <label for="contactEmailAdmin">البريد الإلكتروني</label>
          <input id="contactEmailAdmin" name="contactEmail" type="email" value="${escapeHtml(state.publicContent.contact.email)}">
        </div>
        <div class="field">
          <label for="contactHoursAdmin">أوقات العمل</label>
          <input id="contactHoursAdmin" name="contactHours" value="${escapeHtml(state.publicContent.contact.hours)}">
        </div>
        <div class="form-actions span-two">
          <button class="button primary" type="submit">حفظ تعديل النصوص</button>
          <a class="button ghost" href="#home">معاينة الصفحة الرئيسية</a>
        </div>
      </form>

      <div class="grid two admin-add-grid">
        ${renderPublicAddForm("news", "إضافة خبر أو إعلان", "عنوان الخبر", "التاريخ", "نص الإعلان")}
        ${renderPublicAddForm("activities", "إضافة نشاط أو فعالية", "عنوان النشاط", "الموعد", "وصف النشاط")}
        ${renderPublicAddForm("programs", "إضافة برنامج تعليمي", "اسم البرنامج", "", "وصف البرنامج")}
        ${renderPublicAddForm("teachers", "إضافة أستاذ", "اسم الأستاذ", "التخصص", "نبذة قصيرة")}
        ${renderPublicAddForm("mediaItems", "إضافة عنصر للمعرض", "عنوان العنصر", "النوع: صورة أو فيديو", "وصف العنصر")}
        ${renderPublicAddForm("branches", "إضافة فرع", "اسم الفرع", "العنوان", "معلومات إضافية: هاتف أو بريد أو أوقات العمل")}
      </div>

      <div class="public-list-panel">
        <h3>المحتوى الحالي</h3>
      </div>
      ${renderPublicManagedTable("الأخبار والإعلانات", "news", state.publicContent.news)}
      ${renderPublicManagedTable("الأنشطة والفعاليات", "activities", state.publicContent.activities)}
      ${renderPublicManagedTable("البرامج التعليمية", "programs", state.publicContent.programs)}
      ${renderPublicManagedTable("طاقم الأساتذة", "teachers", state.publicContent.teachers)}
      ${renderPublicManagedTable("معرض الصور والفيديو", "mediaItems", state.publicContent.mediaItems)}
      ${renderPublicManagedTable("الفروع", "branches", state.publicContent.branches)}
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:608799-609197 (Pa). */
function renderPublicPageFields(e, t) {
  return `
    <div class="field">
      <label for="${e}TitleAdmin">عنوان ${t}</label>
      <input id="${e}TitleAdmin" name="${e}Title" value="${escapeHtml(state.publicContent.pages[e].title)}">
    </div>
    <div class="field">
      <label for="${e}DescriptionAdmin">وصف ${t}</label>
      <textarea id="${e}DescriptionAdmin" name="${e}Description">${escapeHtml(state.publicContent.pages[e].description)}</textarea>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:609197-609910 (ln). */
function renderPublicAddForm(e, t, r, a, n) {
  return `
    <form class="card" data-public-add-form="${e}">
      <h3>${t}</h3>
      <div class="field">
        <label>${r}</label>
        <input name="title" required>
      </div>
      ${
        a
          ? `
        <div class="field">
          <label>${a}</label>
          <input name="meta" required>
        </div>
      `
          : ""
      }
      <div class="field">
        <label>${n}</label>
        <textarea name="detail" required></textarea>
      </div>
      ${
        publicTypeSupportsImage(e)
          ? `
        <div class="field">
          <label>رفع صورة</label>
          <input name="image" type="file" accept="image/*">
        </div>
      `
          : ""
      }
      <button class="button secondary" type="submit">إضافة</button>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:609910-610613 (dn). */
function renderPublicManagedTable(e, t, items) {
  return `
    <div class="managed-table-section">
      <h4>${e}</h4>
      ${
        items.length
          ? `
        <div class="table-wrap managed-table-wrap">
          <table class="managed-table">
            <thead>
              <tr>
                <th>${t === "teachers" ? "الاسم" : "العنوان"}</th>
                <th>${publicExtraFieldLabel(t)}</th>
                <th>${t === "teachers" ? "نبذة" : "الوصف"}</th>
                ${publicTypeSupportsImage(t) ? "<th>الصورة</th>" : ""}
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((a, n) => renderPublicManagedRow(t, a, n)).join("")}
            </tbody>
          </table>
        </div>
      `
          : '<p class="muted">لا يوجد محتوى بعد.</p>'
      }
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:610613-611969 (LA). */
function renderPublicManagedRow(e, user, r) {
  const a = user.title || user.name;
  const n = user.date || user.role || user.type || user.address || "";
  const i = user.detail || user.bio || "";
  return `
    <tr>
      <td>
        <input form="edit-${e}-${r}" name="title" value="${escapeHtml(a)}" required>
      </td>
      <td>
        <input form="edit-${e}-${r}" name="meta" value="${escapeHtml(n)}" ${e === "programs" ? "" : "required"}>
      </td>
      <td>
        <textarea form="edit-${e}-${r}" name="detail" required>${escapeHtml(i)}</textarea>
      </td>
      ${
        publicTypeSupportsImage(e)
          ? `
        <td>
          ${safeImageUrl(user.image) ? `<img class="admin-thumb" src="${escapeHtml(safeImageUrl(user.image))}" alt="">` : '<span class="muted">لا توجد صورة</span>'}
          <input form="edit-${e}-${r}" name="image" type="file" accept="image/*">
        </td>
      `
          : ""
      }
      <td>
        <form id="edit-${e}-${r}" class="table-action-form" data-public-edit-form="${e}" data-edit-index="${r}">
          <button class="button secondary" type="submit">حفظ</button>
          <button class="button ghost" type="button" data-move-public-item="${e}" data-move-index="${r}" data-move-direction="up">فوق</button>
          <button class="button ghost" type="button" data-move-public-item="${e}" data-move-index="${r}" data-move-direction="down">تحت</button>
          <button class="button ghost" type="button" data-delete-public-item="${e}" data-delete-index="${r}">حذف</button>
        </form>
      </td>
    </tr>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:611969-612059 (hi). */
function publicTypeSupportsImage(e) {
  return ["news", "activities", "programs", "teachers", "mediaItems"].includes(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:612059-612222 (MA). */
function publicExtraFieldLabel(e) {
  return (
    {
      news: "التاريخ",
      activities: "الموعد",
      programs: "حقل إضافي اختياري",
      teachers: "التخصص",
      mediaItems: "النوع",
      branches: "العنوان",
    }[e] || "معلومة إضافية"
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:612222-612748 (Ge). */
function renderDashboard(e, t, r = "") {
  return `
    <section class="section dashboard-section" aria-labelledby="dashboard-title">
      <div class="section-heading">
        <div>
          <p class="dashboard-basmala">بسم الله الرحمن الرحيم</p>
          <span class="dashboard-kicker">فضاء التعلّم والمتابعة</span>
          <h1 id="dashboard-title">${e}</h1>
        </div>
      </div>
      <div class="dashboard-layout">
        <div>${t}</div>
      </div>
      ${r ? `<div class="dashboard-full-width">${r}</div>` : ""}
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:612748-612836 (pe). */
function renderStat(e, t) {
  return `<div class="stat"><strong>${t}</strong><span>${e}</span></div>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:612836-613225 (ki). */
function renderPublicDetail(e, t) {
  const r = String(e || "").trim();
  if (!r) return "";
  const a = `public-detail-${t}`;
  return `
    <button class="text-link public-detail-toggle" type="button" data-toggle-public-detail="${escapeHtml(a)}" aria-haspopup="dialog" aria-controls="${escapeHtml(a)}">عرض التفاصيل</button>
    <div id="${escapeHtml(a)}" class="muted public-card-detail" role="region" aria-label="تفاصيل النشاط" hidden>${escapeHtml(r)}</div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:613225-613508 (hh). */
function renderNewsCard(e, t) {
  const r = safeImageUrl(e.image);
  return `
    <article class="card">
      ${r ? `<img class="card-image" src="${escapeHtml(r)}" alt="${escapeHtml(e.title)}">` : ""}
      <span class="chip gold">${escapeHtml(e.date)}</span>
      <h3>${escapeHtml(e.title)}</h3>
      ${renderPublicDetail(e.detail, `activity-${t}`)}
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:613508-613792 (mh). */
function renderActivityCard(e, t) {
  const r = safeImageUrl(e.image);
  return `
    <article class="card">
      ${r ? `<img class="card-image" src="${escapeHtml(r)}" alt="${escapeHtml(e.title)}">` : ""}
      <span class="chip turquoise">${escapeHtml(e.date)}</span>
      <h3>${escapeHtml(e.title)}</h3>
      ${renderPublicDetail(e.detail, `news-${t}`)}
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:613792-614491 (ph). */
function renderTeacherCourses(items) {
  return items.length
    ? `
    <div class="exam-management-toolbar teacher-course-toolbar">
      <div class="field">
        <label for="teacherCourseSearch">البحث في الدروس</label>
        <input id="teacherCourseSearch" type="search" placeholder="ابحث بالعنوان، المادة، المستوى، المجموعة..." data-exam-management-search>
      </div>
      <span class="muted">${items.length} درس</span>
    </div>
    <div class="exam-management-list exam-list-scroll teacher-course-list" data-exam-management-list>
      ${items.map((t) => renderCourseEditorCard(t)).join("")}
    </div>
    <div class="empty-state exam-management-empty" hidden>لا توجد دروس مطابقة للبحث.</div>
  `
    : '<div class="empty-state">لا توجد دروس حاليًا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:614491-619378 (BA). */
function renderCourseEditorCard(e) {
  const t = `course-edit-${e.id}`;
  const r = savedAttachmentLabels(e);
  const a = isLessonPublished(e);
  const n = state.currentUser?.role === "teacher" && isCourseTeacher(e, state.currentUser.id);
  const i = [
    e.title,
    subjectName(e.subjectId),
    levelName(e.niveauId),
    e.groupeId ? groupName(e.groupeId) : "كل المجموعات",
    r.join(" "),
    e.conferenceLink || "",
    e.zoomMeetingId || "",
    e.zoomMeetingUuid || "",
    e.recordingAudioUrl || "",
    e.recordingVideoUrl || "",
    e.recordingPresentationUrl || "",
    e.description || "",
  ].join(" ");
  return `
    <article class="exam-summary-card teacher-course-summary-card" data-exam-card data-search="${escapeHtml(i.toLowerCase())}">
      <div class="exam-summary-main">
        <div>
          <h3>${escapeHtml(e.title)}</h3>
          <p class="muted">${subjectName(e.subjectId)} · ${levelName(e.niveauId)} · ${e.groupeId ? groupName(e.groupeId) : "كل المجموعات"}</p>
        </div>
      </div>
      <div class="exam-summary-meta">
        <span>${escapeHtml(e.createdAt || "-")}</span>
        <span>${escapeHtml(r.join("، "))}</span>
        <span class="chip ${a ? "turquoise" : "gold"}">${a ? "منشور للطلبة" : "في انتظار النشر"}</span>
      </div>
      <div class="exam-summary-actions">
        <a class="button ghost" href="${courseHref("lesson", e.id)}">فتح الدرس</a>
        <a class="button ghost" href="${courseHref("lessonPreview", e.id)}">معاينة كطالب</a>
        ${n ? `<button class="button ${a ? "secondary" : "primary"}" type="button" data-publish-course="${escapeHtml(e.id)}" ${a ? "disabled" : ""}>${a ? "تم توزيع الدرس على الطلبة" : "نشر وفتح الدرس للطلبة"}</button>` : ""}
        ${normalizeExerciseFile(e.exercise).url ? `<a class="button secondary" href="${courseHref("exerciseCorrection", e.id)}">تصحيح التمارين (${exerciseSubmissions(e.id).length})</a>` : ""}
        <button class="button ghost danger" type="button" data-delete-course="${e.id}">حذف</button>
      </div>
      <details class="teacher-course-edit-details">
        <summary class="button secondary">تعديل الدرس</summary>
        <form id="${t}" class="teacher-course-form" data-course-edit-form data-course-id="${e.id}">
          ${renderZoomHiddenFields(e)}
          <input type="hidden" name="attachmentDraftKey" value="course-edit-${escapeHtml(e.id)}">
          <input type="hidden" name="removedAttachmentIndexes" value="[]">
          <div class="field">
            <label for="${t}-title">عنوان الدرس</label>
            <input id="${t}-title" name="title" value="${escapeHtml(e.title)}" required>
          </div>
          <div class="teacher-course-meta-grid">
          <div class="field">
            <label for="${t}-subject">المادة</label>
            <select id="${t}-subject" name="subjectId">
              ${state.subjects.map((s) => renderOption(s.id, subjectDisplayName(s), e.subjectId)).join("")}
            </select>
          </div>
          <div class="field">
            <label for="${t}-niveau">المستوى</label>
            <select id="${t}-niveau" name="niveauId">
              ${state.levels.map((s) => renderOption(s.id, s.name, e.niveauId)).join("")}
            </select>
          </div>
          <div class="field">
            <label for="${t}-groupe">المجموعة</label>
            <select id="${t}-groupe" name="groupeId">
              <option value="" ${e.groupeId ? "" : "selected"}>كل المجموعات</option>
              ${state.groups.map((s) => renderOption(s.id, s.name, e.groupeId || "")).join("")}
            </select>
          </div>
          </div>
          <div class="teacher-course-editor-grid">
          <div class="field">
            <label for="${t}-description">الوصف</label>
            <textarea id="${t}-description" name="description" required>${escapeHtml(e.description || "")}</textarea>
          </div>
          <div class="field course-file-edit">
            <label for="${t}-files">الملفات والروابط</label>
            <input id="${t}-files" name="files" value="${escapeHtml(r.join("، "))}" placeholder="PDF، فيديو، صوت">
            <input name="attachments" type="file" accept=".pdf,image/*,video/*,audio/*" multiple data-course-attachments="course-edit-${escapeHtml(e.id)}">
            <small class="muted">الملفات المحفوظة والملفات الجديدة تظهر هنا. احذف الملف الغالط وحده ثم احفظ التعديل.</small>
            <div class="course-attachment-section"><strong>الملفات المحفوظة</strong>${renderSavedAttachments(e, t)}</div>
            <div class="course-attachment-section"><strong>ملفات جديدة قبل الحفظ</strong><div data-new-course-attachments="course-edit-${escapeHtml(e.id)}">${renderDraftAttachments(`course-edit-${e.id}`)}</div></div>
            <label for="${t}-exercise">تمرين جديد: صورة أو PDF (اختياري)</label>
            <input id="${t}-exercise" name="exerciseFile" type="file" accept="image/*,.pdf,application/pdf">
          </div>
          </div>
          <div class="teacher-course-links-grid">
            <div class="field">
              <label for="${t}-conference">رابط دخول للحصة</label>
              ${renderZoomScheduleFields(t, e)}
              ${renderZoomButton(t, e)}
              <input id="${t}-conference" name="conferenceLink" type="url" value="${escapeHtml(e.conferenceLink || "")}" placeholder="https://...">
            </div>
          </div>
          <div class="teacher-course-actions">
            <button class="button secondary" type="submit">حفظ التعديل</button>
          </div>
        </form>
      </details>
    </article>
  `;
}
