import { state } from "../context/state.js";
import { nextCourseId } from "../services/teaching-management.js";
import { formatNumber, toDateTimeLocal } from "./question-builders.js";
import {
  escapeHtml,
  renderOption,
  subjectDisplayName,
  subjectName,
} from "../utils/formatters.js";
import { renderStat } from "./content-management.js";
import { absenceForSchedule } from "../pages/dashboards.js";
import { renderDraftAttachments } from "../services/attachments.js";
import { routeQuery } from "../routes/router.js";
import {
  normalizeScheduleType,
  scheduleAudienceLabel,
  scheduleTypeLabel,
} from "../pages/schedule.js";
import { calculateExamCloseLabel } from "../services/exam-timing.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:493652-493745 (ys). */
function zoomTimezone(e = "") {
  return (
    e || Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Tunis"
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:493745-494267 (zc). */
function normalizeZoomFields(e = {}) {
  const t = e.scheduleId
    ? state.schedule.find((r) => Number(r.id) === Number(e.scheduleId))
    : null;
  return {
    courseId: e.id || e.courseId || nextCourseId(),
    scheduleId: e.scheduleId || "",
    zoomMeetingId: e.zoomMeetingId || "",
    zoomMeetingUuid: e.zoomMeetingUuid || "",
    zoomJoinUrl: e.zoomJoinUrl || e.conferenceLink || "",
    zoomStartUrl: e.zoomStartUrl || "",
    zoomPassword: e.zoomPassword || "",
    zoomStartTime: toDateTimeLocal(
      t ? scheduleStartsAt(t) : e.zoomStartTime || "",
    ),
    zoomDurationMinutes: t ? scheduleDuration(t) : e.zoomDurationMinutes || 60,
    zoomTimezone: zoomTimezone(e.zoomTimezone),
    zoomRecordingStatus: e.zoomRecordingStatus || "",
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:494267-494598 (VT). */
function zoomDateFields(e = {}) {
  const zoomFields = normalizeZoomFields(e);
  const r = zoomFields.zoomStartTime || "";
  const a = r ? r.slice(0, 10) : "";
  const n = r ? r.slice(11, 16) : "";
  let i = "";
  if (r && zoomFields.zoomDurationMinutes) {
    const date = new Date(r);
    if (!Number.isNaN(date.getTime())) {
      i = new Date(
        date.getTime() + Number(zoomFields.zoomDurationMinutes) * 6e4,
      )
        .toTimeString()
        .slice(0, 5);
    }
  }
  return {
    date: a,
    startClock: n,
    endClock: i,
    timezone: zoomFields.zoomTimezone,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:494598-495517 (Mf). */
function renderZoomScheduleFields(e = "course", t = {}) {
  const r = zoomDateFields(t);
  const a = !!(
    t.scheduleId &&
    state.schedule.some((i) => Number(i.id) === Number(t.scheduleId))
  );
  const n = a ? " readonly" : "";
  return `
    <div class="zoom-schedule-grid span-two">
      <div class="field">
        <label for="zoomDate-${e}">تاريخ Zoom</label>
        <input id="zoomDate-${e}" name="zoomDate" type="date" value="${escapeHtml(r.date)}"${n}>
      </div>
      <div class="field">
        <label for="zoomStartClock-${e}">بداية Zoom</label>
        <input id="zoomStartClock-${e}" name="zoomStartClock" type="time" value="${escapeHtml(r.startClock)}"${n}>
      </div>
      <div class="field">
        <label for="zoomEndClock-${e}">نهاية Zoom</label>
        <input id="zoomEndClock-${e}" name="zoomEndClock" type="time" value="${escapeHtml(r.endClock)}"${n}>
      </div>
      ${a ? '<small class="muted span-two">توقيت Zoom مضبوط تلقائيًا حسب توقيت الحصّة في الرزنامة.</small>' : ""}
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:495517-495968 (Bf). */
function teacherPayroll(e, t = new Date().toISOString().slice(0, 7)) {
  const r = state.lessonSessionLog.filter(
    (course) =>
      String(course.teacherId) === String(e) &&
      course.openedAt &&
      course.closedAt &&
      String(course.openedAt).slice(0, 7) === t,
  );
  const a = r.reduce((i, s) => {
    const o = new Date(s.openedAt).getTime();
    const c = new Date(s.closedAt).getTime();
    return (
      i +
      (Number.isFinite(o) && Number.isFinite(c) && c > o
        ? Math.round((c - o) / 6e4)
        : 0)
    );
  }, 0);
  const n = Number(state.gradeSettings.teacherHourlyRates?.[e]) || 0;
  return {
    monthKey: t,
    sessions: r,
    minutes: a,
    hours: a / 60,
    rate: n,
    total: (a / 60) * n,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:495968-496489 (GT). */
function renderTeacherPayroll(e) {
  const t = teacherPayroll(e);
  return `<section class="panel teacher-payroll"><div class="section-heading"><div><h2>كشف الأجرة الشهري</h2><p class="muted">${escapeHtml(t.monthKey)} — محسوب من وقت فتح وإغلاق حصص Zoom.</p></div><button class="button secondary" type="button" data-download-teacher-payroll>طباعة كشف الأجرة</button></div><div class="stats-grid">${renderStat("الحصص المنجزة", t.sessions.length)}${renderStat("مدة التدريس", `${formatNumber(t.hours)} ساعة`)}${renderStat("سعر الساعة", `${formatNumber(t.rate)} د.ت`)}${renderStat("الأجرة", `${formatNumber(t.total)} د.ت`)}</div></section>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:496489-496653 (XT). */
function sessionMinutes(e) {
  const t = new Date(e?.openedAt).getTime();
  const r = new Date(e?.closedAt).getTime();
  return Number.isFinite(t) && Number.isFinite(r) && r > t
    ? Math.round((r - t) / 6e4)
    : 0;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:496653-496771 (B0). */
function formatMinutes(e) {
  const t = Math.max(0, Number(e) || 0);
  const r = Math.floor(t / 60);
  const a = t % 60;
  return r ? `${r} س ${a ? `${a} د` : ""}` : `${a} د`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:496771-496948 (U0). */
function formatArabicDate(e) {
  const date = new Date(e);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ar-TN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date)
    : "-";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:496948-497110 (q0). */
function formatArabicTime(e) {
  const date = new Date(e);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ar-TN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date)
    : "-";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:497110-497273 (YT). */
function formatPayrollMonth(e) {
  const date = new Date(`${e}-01T12:00:00`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ar-TN", {
        year: "numeric",
        month: "long",
      }).format(date)
    : e;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:497273-502001 (KT). */
function printTeacherPayroll() {
  if (state.currentUser?.role !== "teacher") return;
  const e = teacherPayroll(state.currentUser.id);
  const t = window.open("", "_blank");
  if (!t) return alert("اسمح بفتح النافذة لطباعة كشف الأجرة.");
  try {
    t.opener = null;
  } catch {}
  const r = new URL("assets/email-signature-logo-1.png", location.href).href;
  const a = new URL("assets/email-signature-logo-2.png", location.href).href;
  const n =
    [...e.sessions]
      .sort((i, s) => new Date(i.openedAt) - new Date(s.openedAt))
      .map((i, s) => {
        const o = sessionMinutes(i);
        const c = (o / 60) * e.rate;
        return `<tr><td>${s + 1}</td><td>${escapeHtml(formatArabicDate(i.openedAt))}</td><td>${escapeHtml(i.courseTitle || "حصة تعليمية")}</td><td>${escapeHtml(i.subjectId ? subjectName(i.subjectId) : "-")}</td><td>${escapeHtml(formatArabicTime(i.openedAt))}</td><td>${escapeHtml(formatArabicTime(i.closedAt))}</td><td>${escapeHtml(formatMinutes(o))}</td><td>${formatNumber(e.rate)} د.ت</td><td>${formatNumber(c)} د.ت</td></tr>`;
      })
      .join("") ||
    '<tr><td colspan="9" class="empty">لا توجد حصص مكتملة ومسجلة خلال هذه الفترة.</td></tr>';
  t.document
    .write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${escapeHtml(location.href)}"><title>كشف الأجرة — ${escapeHtml(state.currentUser.name)}</title><style>
    *{box-sizing:border-box} body{margin:0;padding:28px;color:#173b28;font-family:Tahoma,Arial,sans-serif;font-size:13px;background:#fff}.document{max-width:1040px;margin:auto}.letterhead{display:grid;grid-template-columns:115px 1fr 115px;align-items:center;gap:20px;padding-bottom:14px;border-bottom:3px solid #a58a36}.letterhead img{width:96px;height:96px;object-fit:contain;justify-self:center}.letterhead .center{text-align:center}.letterhead h1{margin:0 0 7px;color:#254d31;font-size:23px}.letterhead p{margin:0;color:#6a7439;font-weight:700}.document-title{text-align:center;margin:25px 0 18px}.document-title h2{margin:0;font-size:21px}.document-title p{margin:6px 0 0;color:#58614c}.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px 18px;margin:16px 0}.info-grid div{padding:9px 12px;border:1px solid #d7ddc8;background:#fbfcf7;border-radius:6px}.info-grid strong{color:#56662a}.summary{width:100%;border-collapse:collapse;margin:20px 0}.summary th,.summary td,.details th,.details td{border:1px solid #b8c1aa;padding:9px;text-align:center}.summary th,.details th{background:#e8efda;color:#254d31}.summary td.total{font-weight:800;color:#174b2b;background:#f8f0d8}.details{width:100%;border-collapse:collapse;margin-top:16px;font-size:11px}.details td:nth-child(2),.details td:nth-child(3),.details td:nth-child(4){text-align:right}.empty{padding:28px!important;color:#68704f}.notes{margin-top:18px;padding:12px 14px;border-right:4px solid #a58a36;background:#fffbef;color:#5f623e}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:55px;text-align:center}.signatures div{border-top:1px solid #879278;padding-top:9px;min-height:55px}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #d5dbc9;text-align:center;color:#68704f;font-size:11px}@media print{body{padding:12mm}.details{font-size:9.5px}.letterhead{break-inside:avoid}.details tr{break-inside:avoid}}@page{size:A4 landscape;margin:10mm}
  </style></head><body><main class="document"><header class="letterhead"><img src="${escapeHtml(r)}" alt="شعار الجمعية"><div class="center"><h1>منصة التعليم الزيتوني عن بُعد</h1><p>وثيقة إدارية — كشف الأجرة الشهري</p></div><img src="${escapeHtml(a)}" alt="شعار مشيخة التعليم الزيتوني"></header><section class="document-title"><h2>كشف أجرة الأستاذ</h2><p>الفترة: ${escapeHtml(formatPayrollMonth(e.monthKey))}</p></section><section class="info-grid"><div><strong>الأستاذ:</strong> ${escapeHtml(state.currentUser.name)}</div><div><strong>المعرّف:</strong> ${escapeHtml(state.currentUser.id)}</div><div><strong>الصفة:</strong> ${escapeHtml(state.currentUser.roleLabel || "أستاذ")}</div><div><strong>تاريخ الإصدار:</strong> ${escapeHtml(formatArabicDate(new Date().toISOString()))}</div></section><table class="summary"><thead><tr><th>عدد الحصص المنجزة</th><th>إجمالي ساعات العمل</th><th>سعر الساعة</th><th>المبلغ المستحق</th></tr></thead><tbody><tr><td>${e.sessions.length}</td><td>${formatNumber(e.hours)} ساعة (${formatMinutes(e.minutes)})</td><td>${formatNumber(e.rate)} د.ت</td><td class="total">${formatNumber(e.total)} د.ت</td></tr></tbody></table><h3>تفاصيل الحصص المنجزة</h3><table class="details"><thead><tr><th>#</th><th>التاريخ</th><th>الحصّة / الدرس</th><th>المادة</th><th>بداية</th><th>نهاية</th><th>المدة</th><th>سعر الساعة</th><th>المبلغ</th></tr></thead><tbody>${n}</tbody></table><p class="notes">تم احتساب الأجرة وفق مدة فتح وإغلاق حصص Zoom المسجّلة في المنصة، وبحسب سعر الساعة المضبوط من الإدارة.</p><section class="signatures"><div>إمضاء الأستاذ</div><div>تأشيرة الإدارة</div></section><footer class="footer">هذا الكشف مُنشأ آلياً من منصة التعليم الزيتوني عن بُعد.</footer></main></body></html>`);
  t.document.close();
  t.addEventListener(
    "load",
    () => {
      const items = [...t.document.images];
      Promise.all(
        items.map((s) =>
          s.complete
            ? Promise.resolve()
            : new Promise((o) => {
                s.addEventListener("load", o, {
                  once: true,
                });
                s.addEventListener("error", o, {
                  once: true,
                });
              }),
        ),
      ).finally(() => {
        t.focus();
        t.print();
      });
    },
    {
      once: true,
    },
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:502001-502318 (JT). */
function renderAbsenceNotices(items) {
  const items2 = items
    .map((r) => ({
      item: r,
      absence: absenceForSchedule(r.id),
    }))
    .filter((r) => r.absence?.status === "approved");
  return items2.length
    ? `<section class="notice absence-notice"><strong>تنبيهات الغياب</strong>${items2
        .map(
          ({ item: r }) =>
            `<p>الأستاذ متغيب عن حصة ${escapeHtml(r.title || subjectName(r.subjectId))} بتاريخ ${escapeHtml(r.date)}.</p>`,
        )
        .join("")}</section>`
    : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:502318-503211 (Uf). */
function renderZoomHiddenFields(e = {}) {
  const zoomFields = normalizeZoomFields(e);
  return `
    <input type="hidden" name="courseId" value="${escapeHtml(zoomFields.courseId)}">
    <input type="hidden" name="scheduleId" value="${escapeHtml(zoomFields.scheduleId)}">
    <input type="hidden" name="zoomMeetingId" value="${escapeHtml(zoomFields.zoomMeetingId)}">
    <input type="hidden" name="zoomMeetingUuid" value="${escapeHtml(zoomFields.zoomMeetingUuid)}">
    <input type="hidden" name="zoomJoinUrl" value="${escapeHtml(zoomFields.zoomJoinUrl)}">
    <input type="hidden" name="zoomStartUrl" value="${escapeHtml(zoomFields.zoomStartUrl)}">
    <input type="hidden" name="zoomPassword" value="${escapeHtml(zoomFields.zoomPassword)}">
    <input type="hidden" name="zoomStartTime" value="${escapeHtml(zoomFields.zoomStartTime)}">
    <input type="hidden" name="zoomDurationMinutes" value="${escapeHtml(zoomFields.zoomDurationMinutes)}">
    <input type="hidden" name="zoomTimezone" value="${escapeHtml(zoomFields.zoomTimezone)}">
    <input type="hidden" name="zoomRecordingStatus" value="${escapeHtml(zoomFields.zoomRecordingStatus)}">
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:503211-503638 (qf). */
function renderZoomButton(e = "course", t = {}) {
  const zoomFields = normalizeZoomFields(t);
  const a = zoomFields.zoomMeetingId
    ? `Zoom #${zoomFields.zoomMeetingId}`
    : "غير منشأ";
  return `
    <div class="zoom-meeting-field" aria-label="Zoom">
      <div class="zoom-meeting-row">
        <button id="zoomMeetingButton-${e}" class="button secondary" type="button" data-create-zoom-meeting>إنشاء رابط Zoom</button>
        <span class="chip" data-zoom-meeting-status>${escapeHtml(a)}</span>
      </div>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:503638-506383 (jf). */
function renderCourseForm(e = "admin", t = {}) {
  const r = t.courseId || nextCourseId();
  const a = `course-new-${e}`;
  return `
    <form class="grid two" data-course-add-form>
      <input type="hidden" name="attachmentDraftKey" value="${escapeHtml(a)}">
      ${renderZoomHiddenFields({
        ...t,
        id: r,
        zoomStartTime: t.zoomStartTime || "",
        zoomDurationMinutes: t.zoomDurationMinutes || 60,
        zoomTimezone: zoomTimezone(t.zoomTimezone),
      })}
      <div class="field">
        <label for="courseTitle-${e}">عنوان الدرس</label>
        <input id="courseTitle-${e}" name="title" placeholder="اكتب عنوان الدرس" value="${escapeHtml(t.title || "")}" required>
      </div>
      <div class="field">
        <label for="subjectNew-${e}">المادة</label>
        <select id="subjectNew-${e}" name="subjectId">${state.subjects.map((n) => renderOption(n.id, subjectDisplayName(n), t.subjectId || "")).join("")}</select>
      </div>
      <div class="field">
        <label for="niveauNew-${e}">المستوى</label>
        <select id="niveauNew-${e}" name="niveauId">${state.levels.map((n) => renderOption(n.id, n.name, t.niveauId || "")).join("")}</select>
      </div>
      <div class="field">
        <label for="groupeNew-${e}">المجموعة</label>
        <select id="groupeNew-${e}" name="groupeId">
          <option value="" ${t.groupeId ? "" : "selected"}>كل المجموعات</option>
          ${state.groups.map((n) => renderOption(n.id, n.name, t.groupeId || "")).join("")}
        </select>
      </div>
      <div class="field">
        <label for="fileNew-${e}">رفع ملفات الدرس</label>
        <input id="fileNew-${e}" name="attachments" type="file" accept=".pdf,image/*,video/*,audio/*" multiple data-course-attachments="${escapeHtml(a)}">
        <small class="muted">اختر ملفاً أو عدة ملفات؛ تظهر أسفل هنا ويمكن حذف أي ملف قبل الحفظ.</small>
        <div data-new-course-attachments="${escapeHtml(a)}">${renderDraftAttachments(a)}</div>
      </div>
      <div class="field">
        <label for="exerciseNew-${e}">تمرين: صورة أو PDF (اختياري)</label>
        <input id="exerciseNew-${e}" name="exerciseFile" type="file" accept="image/*,.pdf,application/pdf">
        <small class="muted">ارفع صورة أو PDF. الطالب يسلّم صورة أو PDF مرة واحدة، ثم تظهر لك في قائمة تصحيح منظمة.</small>
      </div>
      <div class="field span-two">
        <label for="conferenceLinkNew-${e}">رابط دخول للحصة</label>
        ${renderZoomScheduleFields(e, {
          ...t,
          id: r,
          zoomStartTime: t.zoomStartTime || "",
          zoomDurationMinutes: t.zoomDurationMinutes || 60,
          zoomTimezone: zoomTimezone(t.zoomTimezone),
        })}
        ${renderZoomButton(e, {
          id: r,
        })}
        <input id="conferenceLinkNew-${e}" name="conferenceLink" type="url" placeholder="https://...">
      </div>
      <div class="field">
        <label for="descNew-${e}">وصف مختصر</label>
        <textarea id="descNew-${e}" name="description" required>${escapeHtml(t.description || "")}</textarea>
      </div>
      <div class="form-actions span-two">
        <button class="button primary" type="submit">حفظ الدرس</button>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:506383-506603 (zf). */
function preparationSchedule(e) {
  if (state.currentUser?.role !== "teacher") return null;
  const t = Number(routeQuery().get("scheduleId"));
  if (!t) return null;
  const course = state.schedule.find((a) => Number(a.id) === t);
  return !course ||
    String(course.teacherId || "") !== String(state.currentUser.id)
    ? null
    : normalizeScheduleType(course.type) === e
      ? course
      : null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:506603-506902 (QT). */
function courseFromSchedule(e) {
  const t = scheduleDuration(e);
  return {
    scheduleId: e.id,
    title: e.title || subjectName(e.subjectId),
    subjectId: e.subjectId || "",
    niveauId: e.niveauId || "",
    groupeId: e.groupeId || "",
    zoomStartTime: scheduleStartsAt(e),
    zoomDurationMinutes: t,
    zoomTimezone: zoomTimezone(),
    description: `تحضير مرتبط بحصة ${formatScheduleDate(e.date)} من ${e.startTime} إلى ${e.endTime}.`,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:506902-507125 (ZT). */
function examFromSchedule(e) {
  const t = scheduleStartsAt(e);
  const r = scheduleDuration(e);
  return {
    scheduleId: e.id,
    title: e.title || `امتحان ${subjectName(e.subjectId)}`,
    subjectId: e.subjectId || "",
    niveauId: e.niveauId || "",
    groupeId: e.groupeId || "",
    opensAt: t,
    durationMinutes: r,
    closesAt: calculateExamCloseLabel(t, r),
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:507125-507200 (Ws). */
function scheduleStartsAt(e) {
  return !e?.date || !e?.startTime ? "" : `${e.date}T${e.startTime}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:507200-507381 (Vs). */
function scheduleDuration(e) {
  if (!e?.startTime || !e?.endTime) return 30;
  const [t, r] = e.startTime.split(":").map(Number);
  const [a, n] = e.endTime.split(":").map(Number);
  const i = t * 60 + r;
  const s = a * 60 + n;
  return Math.max(1, s - i);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:507381-507637 (Hf). */
function renderPreparationNotice(e) {
  return e
    ? `
    <div class="empty-state schedule-prep-notice">
      ${scheduleTypeLabel(e.type)} · ${escapeHtml(e.title || subjectName(e.subjectId))} · ${formatScheduleDate(e.date)} · ${escapeHtml(e.startTime || "")} - ${escapeHtml(e.endTime || "")}
      <br>
      الطلبة المعنيون: ${escapeHtml(scheduleAudienceLabel(e))}
    </div>
  `
    : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:507637-507800 (Wf). */
function formatScheduleDate(e) {
  if (!e) return "";
  const date = new Date(`${e}T00:00`);
  return Number.isNaN(date.getTime())
    ? escapeHtml(e)
    : new Intl.DateTimeFormat("ar-TN", {
        dateStyle: "medium",
      }).format(date);
}
