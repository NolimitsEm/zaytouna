import { state } from "../context/state.js";
import { renderListingPage, renderStudentNotice, requireLogin } from "./assessments.js";
import {
  escapeHtml,
  formatDateTime,
  groupName,
  levelName,
  safeUrl,
  subjectName,
  visibleSubjects,
} from "../utils/formatters.js";
import {
  canEditCourse,
  filterContent,
  isCourseTeacher,
  listingFilters,
  studentContent,
  visibleCourses,
} from "../utils/content-access.js";
import { canonicalizeEntityRoute, courseHref, currentCourseId, routeQuery } from "../routes/router.js";
import { renderLoginPage } from "./account.js";
import { renderDashboard } from "../components/content-management.js";
import { courseAttachments, normalizeAttachments } from "../services/attachments.js";
import { isApprovedAbsence } from "./dashboards.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:443262-443659 (Gi). */
function renderCoursesPage(e = "") {
  if (!state.currentUser) return requireLogin(e ? `دروس ${subjectName(e)}` : "الدروس");
  const t = listingFilters(e);
  if (!t.subject) return renderCourseSubjects(t);
  const r = filterContent(visibleCourses(state.courses), t);
  const a = state.currentUser.role === "student" && !e ? "مقرراتي الدراسية" : "الدروس";
  return renderListingPage({
    title: e ? `دروس ${subjectName(e)}` : a,
    eyebrow: a,
    description: "تظهر الدروس المناسبة لحساب الطالب فقط حسب المستوى والمجموعة.",
    filters: t,
    items: r,
    type: "course",
    actions: '<a class="button ghost" href="#courses">كل المواد</a>',
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:443659-444651 (rT). */
function renderLessonPage() {
  if (!state.currentUser) return requireLogin();
  const e = Number(routeQuery().get("scheduleId")) || null;
  const t = currentCourseId();
  if (!e && t) {
    canonicalizeEntityRoute("lesson", "course", t);
  }
  const r = e
    ? state.courses.find((a) => Number(a.scheduleId) === e)
    : state.courses.find((a) => String(a.id) === String(t));
  return !r ||
    !canAccessLesson(r) ||
    (state.currentUser?.role === "student" && (!isLessonPublished(r) || isLessonAbsent(r)))
    ? `
      <section class="section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">فتح الدرس</p>
            <h1>الدرس غير متاح</h1>
            <p>${state.currentUser?.role === "student" && r && isLessonAbsent(r) ? "هذا الدرس مغلق مؤقتًا لأن الأستاذ متغيب عن الحصّة المرتبطة به." : state.currentUser?.role === "student" && r && !isLessonPublished(r) ? "الدرس جاهز لكنه ما زال في مرحلة مراجعة الأستاذ. سيفتح لك فور نشره." : e ? "الدرس غير متاح لهذه الحصة حاليًا. لم يقم الأستاذ بتحضيره بعد." : "هذا الدرس غير موجود أو غير مناسب لحسابك الحالي."}</p>
          </div>
          <a class="button ghost" href="#courses">رجوع للدروس</a>
        </div>
      </section>
    `
    : renderLesson(r, {
        eyebrow: "فتح الدرس",
        backHref: `#courses?subject=${encodeURIComponent(r.subjectId)}`,
        backLabel: "رجوع للدروس",
      });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:444651-445176 (aT). */
function renderLessonPreviewPage() {
  if (!["admin", "teacher"].includes(state.currentUser?.role)) return renderLoginPage();
  const e = currentCourseId();
  if (e) {
    canonicalizeEntityRoute("lessonPreview", "course", e);
  }
  const t = state.courses.find((a) => String(a.id) === String(e));
  if (!t || !canEditCourse(t))
    return renderDashboard(
      "معاينة الدرس",
      `
      <div class="empty-state">هذا الدرس غير موجود أو لا تملك صلاحية معاينته.</div>
    `,
    );
  const r = state.currentUser.role === "admin" ? "#lessons" : "#lessonPrep";
  return renderDashboard(
    "معاينة الدرس",
    renderLesson(t, {
      eyebrow: "معاينة كطالب",
      backHref: r,
      backLabel: "رجوع للدروس",
      previewAsStudent: true,
      actions: `<a class="button secondary" href="${r}">تعديل من القائمة</a>`,
    }),
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:445176-447047 (Cf). */
function renderLesson(course, t = {}) {
  const r = state.users.find((o) => o.id === course.teacherId);
  const items = courseAttachments(course);
  const n = t.eyebrow || "فتح الدرس";
  const i = t.backHref || "#courses";
  const s = t.backLabel || "رجوع للدروس";
  return `
    <section class="section lesson-page" aria-labelledby="lesson-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(n)}</p>
          <h1 id="lesson-title">${escapeHtml(course.title)}</h1>
          <p>${subjectName(course.subjectId)} · ${levelName(course.niveauId)} · ${course.groupeId ? groupName(course.groupeId) : "كل المجموعات"}</p>
        </div>
        <div class="toolbar">
          ${t.actions || ""}
          <a class="button ghost" href="${i}">${escapeHtml(s)}</a>
        </div>
      </div>
      <div class="lesson-layout">
        <article class="panel lesson-content">
          <div class="chips">
            <span class="chip turquoise">${subjectName(course.subjectId)}</span>
            <span class="chip">${levelName(course.niveauId)}</span>
            <span class="chip gold">${course.groupeId ? groupName(course.groupeId) : "كل المجموعات"}</span>
          </div>
          <h2>محتوى الدرس</h2>
          <p>${escapeHtml(course.description || "لا يوجد وصف مفصل لهذا الدرس بعد.")}</p>
          <div class="lesson-reader">
            <h3>${escapeHtml(course.title)}</h3>
            <p>${escapeHtml(course.description || "ابدأ بمراجعة الملفات المرفقة ثم دوّن ملاحظاتك.")}</p>
          </div>
          ${renderLessonOnlineLinks(course)}
          ${renderLessonResources(items, course.id)}
          ${renderLessonExercise(course, {
            previewAsStudent: !!t.previewAsStudent,
          })}
        </article>
        <aside class="panel lesson-sidebar">
          <h2>بيانات الدرس</h2>
          <p><strong>الأستاذ:</strong> ${escapeHtml(r?.name || "الأستاذ")}</p>
          <p><strong>تاريخ الإضافة:</strong> ${escapeHtml(course.createdAt || "-")}</p>
          <h3>الملفات</h3>
          <div class="lesson-files">
            ${items
              .map(
                (o, c) => `
              <span class="button secondary lesson-file-pill">${c + 1}. ${escapeHtml(o.label || o.name)}</span>
            `,
              )
              .join("")}
          </div>
        </aside>
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:447047-448171 (nT). */
function renderLessonOnlineLinks(e) {
  const items = lessonRecordings(e);
  const r = recordingStatusMessage(e);
  const a = lessonSessionAvailability(e);
  const n = canOpenLessonConference(e, a);
  const i = lessonConferenceUrl(e);
  const s = openLessonSession(e);
  return !i && !items.length && !r && !s
    ? ""
    : `
    <section class="lesson-online-links">
      ${
        i
          ? `
        <article>
          <h3>رابط الحصة المباشرة</h3>
          <a class="${n ? "button primary" : "button primary is-disabled"}" href="${escapeHtml(i)}" target="_blank" rel="noopener" aria-disabled="${n ? "false" : "true"}" data-open-lesson-conference="${escapeHtml(e.id)}">${escapeHtml(lessonConferenceLabel())}</a>
          ${n ? "" : `<p class="muted">${escapeHtml(a.message)}</p>`}
          ${s ? `<button class="button ghost danger" type="button" data-end-lesson-conference="${escapeHtml(e.id)}">إنهاء الحصّة</button>` : ""}
        </article>
      `
          : ""
      }
      ${
        items.length
          ? `
        <article>
          <h3>تسجيلات الدرس</h3>
          <div class="lesson-recording-links">
            ${items
              .map(
                (c) => `
              <a class="button secondary" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a>
            `,
              )
              .join("")}
          </div>
        </article>
      `
          : ""
      }
      ${
        r && !items.length
          ? `
        <article>
          <h3>Zoom</h3>
          <p class="muted">${escapeHtml(r)}</p>
        </article>
      `
          : ""
      }
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:448171-448199 (iT). */
function lessonRecordings(e) {
  return recordingLinks(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:448199-448333 (Mc). */
function exerciseSubmissions(e) {
  return state.exerciseSubmissions
    .filter((t) => String(t.courseId) === String(e))
    .sort((t, r) => new Date(r.submittedAt || 0) - new Date(t.submittedAt || 0));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:448333-448815 (zs). */
function normalizeExerciseFile(e = {}) {
  const t = e && typeof e == "object" ? e : {};
  const r = String(t.fileUrl || t.imageUrl || "").trim();
  const a = String(t.fileType || "").toLowerCase();
  const n = String(t.fileName || "").trim();
  const i =
    a === "application/pdf" || n.toLowerCase().endsWith(".pdf") || r.startsWith("data:application/pdf");
  const s = a.startsWith("image/") || r.startsWith("data:image/");
  return {
    url:
      (r.startsWith("data:application/pdf") || r.startsWith("data:image/") || /^https?:\/\//i.test(r)) &&
      (i || s || /^https?:\/\//i.test(r))
        ? r
        : "",
    type: a,
    name: n,
    isPdf: i,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:448815-449216 (Ss). */
function renderExerciseFile(e, t, r = "") {
  const exerciseFile = normalizeExerciseFile(e);
  return exerciseFile.url
    ? exerciseFile.isPdf
      ? `<div class="exercise-pdf-viewer ${r}"><a class="button secondary" href="${escapeHtml(exerciseFile.url)}" target="_blank" rel="noopener">فتح ملف PDF${exerciseFile.name ? `: ${escapeHtml(exerciseFile.name)}` : ""}</a><iframe src="${escapeHtml(exerciseFile.url)}" title="${escapeHtml(t)}"></iframe></div>`
      : `<img class="lesson-exercise-image ${r}" src="${escapeHtml(exerciseFile.url)}" alt="${escapeHtml(t)}">`
    : '<div class="empty-state">الملف غير متاح.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:449216-450459 (sT). */
function renderLessonExercise(e, t = {}) {
  if (!normalizeExerciseFile(e?.exercise).url) return "";
  const a = exerciseSubmissions(e.id);
  const n = !!t.previewAsStudent;
  if (state.currentUser?.role === "student" || n) {
    const i = a.find((s) => String(s.userId) === String(state.currentUser.id));
    return `
      <section class="lesson-exercise panel">
        <h2>تمرين الحصّة</h2>
        ${renderExerciseFile(e.exercise, "ملف التمرين")}
        ${n ? '<div class="exercise-submitted-notice"><strong>معاينة الطالب</strong><span>هنا تظهر للطالب واجهة رفع صورة أو PDF وزرّ التسليم بعد نشر الدرس.</span></div>' : i ? `<div class="exercise-submitted-notice"><strong>تم التسليم</strong><span>تم استلام إجابتك بتاريخ ${escapeHtml(formatDateTime(i.submittedAt))}. لا يمكن إرسال إجابة ثانية.</span></div>` : `<form class="exercise-submission-form" data-exercise-submission-form data-course-id="${escapeHtml(e.id)}"><label>ارفع إجابتك (صورة أو PDF)</label><input name="solutionFile" type="file" accept="image/*,.pdf,application/pdf" required><button class="button primary" type="submit">إرسال الإجابة</button></form>`}
      </section>
    `;
  }
  return canEditCourse(e)
    ? `
    <section class="lesson-exercise panel">
      <h2>تمرين الحصّة</h2>
      ${renderExerciseFile(e.exercise, "ملف التمرين")}
      <div class="form-actions"><a class="button secondary" href="${courseHref("exerciseCorrection", e.id)}">تصحيح إجابات الطلبة (${a.length})</a></div>
    </section>
  `
    : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:450459-451491 (Hs). */
function lessonSessionAvailability(e = {}, t = new Date()) {
  if (e.lessonEndedAt)
    return {
      hasSchedule: true,
      isOpen: false,
      isTeacherOpen: false,
      endsAt: new Date(e.lessonEndedAt),
      message: "أنهى الأستاذ هذه الحصّة.",
    };
  if (!e.zoomStartTime || !e.zoomDurationMinutes)
    return {
      hasSchedule: false,
      isOpen: true,
      isTeacherOpen: true,
      endsAt: null,
      message: "",
    };
  const date = new Date(e.zoomStartTime);
  const a = Number(e.zoomDurationMinutes) || 0;
  if (Number.isNaN(date.getTime()) || a <= 0)
    return {
      hasSchedule: false,
      isOpen: true,
      isTeacherOpen: true,
      endsAt: null,
      message: "",
    };
  const date2 = new Date(date.getTime() + a * 6e4);
  const date3 = new Date(date.getTime() - 5 * 6e4);
  const s = new Intl.DateTimeFormat("ar-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return t < date3
    ? {
        hasSchedule: true,
        isOpen: false,
        isTeacherOpen: false,
        endsAt: date2,
        message: `تفتح الحصة للأستاذ قبل 5 دقائق من الموعد: ${s.format(date)}.`,
      }
    : t < date
      ? {
          hasSchedule: true,
          isOpen: false,
          isTeacherOpen: true,
          endsAt: date2,
          message: `تفتح الحصة للطلبة يوم ${s.format(date)}.`,
        }
      : t > date2
        ? {
            hasSchedule: true,
            isOpen: false,
            isTeacherOpen: false,
            endsAt: date2,
            message: `انتهت الحصة يوم ${s.format(date2)}.`,
          }
        : {
            hasSchedule: true,
            isOpen: true,
            isTeacherOpen: true,
            endsAt: date2,
            message: `الحصة مفتوحة إلى ${s.format(date2)}.`,
          };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:451491-451600 ($f). */
function canOpenLessonConference(e = {}, t = lessonSessionAvailability(e)) {
  return state.currentUser?.role === "admin"
    ? true
    : state.currentUser?.role === "teacher"
      ? (t.isTeacherOpen ?? t.isOpen)
      : t.isOpen;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:451600-451762 (Nf). */
function lessonConferenceUrl(e = {}) {
  const t =
    state.currentUser?.role === "teacher"
      ? e.zoomStartUrl || e.zoomJoinUrl || e.conferenceLink || ""
      : e.zoomJoinUrl || e.conferenceLink || "";
  return safeUrl(t, {
    allowData: false,
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:451762-451836 (oT). */
function lessonConferenceLabel() {
  return state.currentUser?.role === "teacher" ? "دخول للحصة كأستاذ" : "دخول للحصة";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:451836-451995 (Bc). */
function openLessonSession(e = {}) {
  return state.currentUser?.role !== "teacher" || !e?.id
    ? null
    : state.lessonSessionLog.find(
        (course) =>
          String(course.teacherId) === String(state.currentUser.id) &&
          String(course.courseId) === String(e.id) &&
          !course.closedAt,
      ) || null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:451995-452372 (cT). */
function recordingFileLabel(e = {}) {
  const t = String(e.fileType || "").toUpperCase();
  const r = String(e.recordingType || "");
  return /gallery/i.test(r)
    ? "تسجيل Zoom participants"
    : /shared_screen|presentation/i.test(r)
      ? "تسجيل Zoom écran partagé"
      : /active_speaker|speaker/i.test(r)
        ? "تسجيل Zoom intervenant"
        : t === "M4A" || r === "audio_only"
          ? "تسجيل Zoom audio"
          : t === "MP4"
            ? "تسجيل Zoom video"
            : t
              ? `تسجيل Zoom ${t}`
              : "تسجيل Zoom";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:452372-452945 (Uc). */
function recordingLinks(e = {}) {
  const items = [
    {
      label: "تسجيل audio",
      url: e.recordingAudioUrl,
    },
    {
      label: "تسجيل video",
      url: e.recordingVideoUrl,
    },
  ]
    .map((a) => ({
      ...a,
      url: safeUrl(a.url, {
        allowData: false,
      }),
    }))
    .filter((a) => a.url);
  (Array.isArray(e.zoomRecordingFiles) ? e.zoomRecordingFiles : []).forEach((a) => {
    const n = String(a.fileType || "").toUpperCase();
    const i = String(a.recordingType || "");
    if (!(n === "M4A" || (n === "MP4" && !/shared_screen|presentation|gallery/i.test(i)))) return;
    const s = safeUrl(a.playUrl || a.downloadUrl || "", {
      allowData: false,
    });
    if (s) {
      items.push({
        label: recordingFileLabel(a),
        url: s,
      });
    }
  });
  const uniqueValues = new Set();
  return items.filter((a) => (uniqueValues.has(a.url) ? false : (uniqueValues.add(a.url), true)));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:452945-453274 (lT). */
function recordingStatusMessage(e = {}) {
  return !e.zoomMeetingId && !e.zoomMeetingUuid
    ? ""
    : e.zoomRecordingStatus === "completed"
      ? recordingLinks(e).length
        ? ""
        : "تسجيل Zoom جاهز، في انتظار روابط المشاهدة."
      : e.zoomRecordingStatus === "processing"
        ? "انتهت الحصّة وتسجيل Zoom قيد المعالجة."
        : e.zoomRecordingStatus === "failed"
          ? "تعذر تجهيز تسجيل Zoom."
          : "تسجيل Zoom ينتظر نهاية الحصة.";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:453274-453391 (Df). */
function canAccessLesson(e) {
  return state.currentUser?.role === "student"
    ? isLessonPublished(e) && studentContent([e], state.currentUser).length > 0
    : state.currentUser?.role === "teacher"
      ? isCourseTeacher(e, state.currentUser.id)
      : state.currentUser?.role === "admin";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:453391-453441 (Za). */
function isLessonPublished(e) {
  return e?.publishedToStudents !== false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:453441-453498 (Ho). */
function isLessonAbsent(e) {
  return !!(e?.scheduleId && isApprovedAbsence(e.scheduleId));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:453498-454098 (dT). */
function renderLessonResources(e, t = "") {
  const attachments = normalizeAttachments(e);
  return attachments.length === 1 && attachments[0].label === "بدون ملفات"
    ? renderLessonFile(attachments[0], t, 0)
    : `
    <section class="lesson-resources" aria-labelledby="lesson-resources-title">
      <h2 id="lesson-resources-title">موارد الدرس</h2>
      <div class="lesson-resource-list">
        ${attachments
          .map(
            (a, n) => `
          <article class="lesson-resource-item">
            <div class="lesson-resource-heading">
              <span>${n + 1}</span>
              <h3>${escapeHtml(a.label || a.name || "ملف")}</h3>
            </div>
            ${renderLessonFile(a, t, n)}
          </article>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:454098-456307 (L0). */
function renderLessonFile(e, t = "", r = 0) {
  if (!e || e.label === "بدون ملفات")
    return '<div class="lesson-file-viewer empty-state">لا يوجد ملف مرفق بهذا الدرس.</div>';
  const a = e.label || e.name || "ملف";
  const n = safeUrl(e.url);
  if (isYoutubeAttachment(e)) {
    const i = safeUrl(e.originalUrl || e.url, {
      allowData: false,
    });
    const s = safeUrl(youtubeEmbedUrl(e.url), {
      allowData: false,
    });
    return s
      ? `
      <div class="lesson-file-viewer">
        <div class="lesson-file-toolbar">
          <h3>${escapeHtml(a)}</h3>
          ${i ? `<a class="button ghost" href="${escapeHtml(i)}" target="_blank" rel="noopener">فتح في YouTube</a>` : ""}
        </div>
        <iframe
          class="lesson-video-frame"
          title="${escapeHtml(a)}"
          src="${escapeHtml(s)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="origin"
          allowfullscreen
        ></iframe>
      </div>
    `
      : '<div class="lesson-file-viewer empty-state">رابط YouTube غير صالح.</div>';
  }
  return isPdfAttachment(e)
    ? n
      ? `
        <div class="lesson-file-viewer">
          <div class="lesson-file-toolbar">
            <h3>${escapeHtml(e.name || "PDF")}</h3>
            <button class="button ghost" type="button" data-open-pdf="${escapeHtml(t)}" data-file-index="${r}">فتح PDF</button>
            <a class="button ghost" href="${escapeHtml(n)}" download="${escapeHtml(e.name || "lesson.pdf")}">تحميل</a>
          </div>
          <iframe title="${escapeHtml(e.name || "PDF")}" src="${escapeHtml(n)}"></iframe>
        </div>
      `
      : `
      <div class="lesson-file-viewer empty-state">
        هذا الدرس فيه ملف PDF قديم بلا ملف مرفوع. ارفع PDF جديد من حساب الأستاذ حتى يظهر هنا.
      </div>
    `
    : n && String(e.type).startsWith("image/")
      ? `<img class="lesson-media-preview" src="${escapeHtml(n)}" alt="${escapeHtml(e.name || a)}">`
      : n && String(e.type).startsWith("video/")
        ? `<video class="lesson-media-preview" controls src="${escapeHtml(n)}"></video>`
        : n && String(e.type).startsWith("audio/")
          ? `
      <div class="lesson-file-viewer">
        <div class="lesson-file-toolbar">
          <h3>${escapeHtml(e.name || a)}</h3>
          <a class="button ghost" href="${escapeHtml(n)}" download="${escapeHtml(e.name || "lesson-audio")}">تحميل</a>
        </div>
        <audio class="lesson-audio-preview" controls src="${escapeHtml(n)}"></audio>
      </div>
    `
          : `<div class="lesson-file-viewer empty-state">تم اختيار ملف ${escapeHtml(a)}.</div>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:456307-456403 (uT). */
function isPdfAttachment(e) {
  return `${e.type || ""} ${e.name || ""} ${e.label || ""}`.toLowerCase().includes("pdf");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:456403-456454 (qc). */
function isYoutubeAttachment(e) {
  return e?.type === "youtube" && !!e.url;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:456454-456685 (fT). */
function youtubeEmbedUrl(e) {
  try {
    const url = new URL(e);
    url.searchParams.set("rel", "0");
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      url.searchParams.set("origin", window.location.origin);
    }
    return url.toString();
  } catch {
    return e;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:456685-456925 (M0). */
function openPdfAttachment(e) {
  if (!e?.url) {
    alert("ملف PDF غير مرفوع لهذا الدرس.");
    return;
  }
  try {
    const t = URL.createObjectURL(dataUrlToBlob(e.url));
    window.open(t, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(t), 6e4);
  } catch {
    window.open(e.url, "_blank", "noopener");
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:456925-457147 (hT). */
function dataUrlToBlob(e) {
  const [t, r] = String(e).split(",");
  const a = t.match(/data:(.*?);base64/)?.[1] || "application/pdf";
  const n = atob(r || "");
  const bytes = new Uint8Array(n.length);
  for (let s = 0; s < n.length; s += 1) bytes[s] = n.charCodeAt(s);
  return new Blob([bytes], {
    type: a,
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:457147-457944 (mT). */
function renderCourseSubjects(e) {
  const items = filterContent(visibleCourses(state.courses), e);
  const items2 = visibleSubjects()
    .map((n) => ({
      subject: n,
      count: items.filter((i) => i.subjectId === n.id).length,
    }))
    .filter((n) => n.count > 0);
  return `
    <section class="section course-subject-index" aria-labelledby="course-subjects-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${state.currentUser.role === "student" ? "مقرراتي الدراسية" : "الدروس"}</p>
          <h1 id="course-subjects-title">اختر المادة</h1>
          <p>تظهر المواد أولاً. اضغط على المادة حتى تظهر الدروس التابعة لها فقط.</p>
        </div>
      </div>
      ${renderStudentNotice()}
      <div class="grid three course-subject-grid" aria-live="polite">
        ${
          items2.length
            ? items2.map(({ subject: n, count: i }) => renderCourseSubjectCard(n, i)).join("")
            : `
          <div class="empty-state">لا توجد دروس متاحة حاليًا.</div>
        `
        }
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:457944-458592 (pT). */
function renderCourseSubjectCard(e, t) {
  const r = [e.program, e.niveauId ? levelName(e.niveauId) : ""].filter(Boolean);
  return `
    <article class="card subject-card course-subject-card">
      <div class="chips">
        <span class="chip turquoise">${escapeHtml(e.short || e.name)}</span>
        <span class="chip gold">${t} ${t === 1 ? "درس" : "دروس"}</span>
      </div>
      <h3>${escapeHtml(e.name)}</h3>
      <p class="muted">${escapeHtml(e.description || "دروس هذه المادة.")}</p>
      ${r.length ? `<p class="muted">${escapeHtml(r.join(" · "))}</p>` : ""}
      <div class="card-actions">
        <a class="button secondary" href="#courses?subject=${encodeURIComponent(e.id)}">عرض الدروس</a>
      </div>
    </article>
  `;
}
