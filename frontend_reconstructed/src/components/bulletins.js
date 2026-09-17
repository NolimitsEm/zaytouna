import {
  cohortSubjects,
  examResultsOnly,
  resultSemester,
  studentGeneralAverage,
  studentSemesterAverage,
  studentSubjectResults,
  subjectCoefficient,
} from "../pages/grades.js";
import { average, escapeHtml, groupName, levelName } from "../utils/formatters.js";
import { state } from "../context/state.js";
import { defaultGradeSettings, normalizeObservationRules } from "../services/settings-and-activity.js";
import { formatNumber } from "./question-builders.js";
import { collectResults, resultScore } from "../services/results.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:688242-688342 (a_). */
async function downloadStudentBulletin(e) {
  try {
    await prepareStudentBulletin(e);
  } catch (t) {
    alert(`تعذر تحميل كشف الأعداد. السبب: ${t.message}`);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:688342-689000 (Rh). */
function studentBulletinData(e) {
  const t = examResultsOnly();
  const items = cohortSubjects(e.niveauId, e.groupeId);
  const a = studentGeneralAverage(e.id, t);
  const n = studentSemesterAverage(e.id, "s1", t);
  const i = studentSemesterAverage(e.id, "s2", t);
  return {
    student: e,
    niveau: levelName(e.niveauId),
    groupe: groupName(e.groupeId),
    academicYear: state.gradeSettings.academicYear || defaultGradeSettings().academicYear,
    cin: e.cin || e.cinPassport || "-",
    registrationNumber: e.registrationNumber || e.studentNumber || e.id || "-",
    birthDate: formatBulletinDate(e.birthDate),
    generatedAt: new Intl.DateTimeFormat("fr-FR").format(new Date()),
    semester1Average: n,
    semester2Average: i,
    generalAverage: a,
    rank: studentRank(e, t),
    observation: gradeObservation(a),
    subjects: items.map((s) => {
      const o = studentSubjectAverage(e.id, s.id, "s1", t);
      const c = studentSubjectAverage(e.id, s.id, "s2", t);
      return {
        subject: s,
        coefficient: subjectCoefficient(s.id, e.niveauId),
        s1: o,
        s2: c,
        average: average([o, c].filter((l) => l !== null)),
      };
    }),
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:689000-689240 (n_). */
function formatBulletinDate(e) {
  const t = String(e || "").trim();
  if (!t) return "-";
  const r = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (r) return `${r[3]}/${r[2]}/${r[1]}`;
  const date = new Date(t);
  return Number.isNaN(date.getTime()) ? t : new Intl.DateTimeFormat("fr-FR").format(date);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:689240-689350 (i_). */
function renderBulletinNote(e) {
  return e == null || e === ""
    ? "-"
    : `<span class="bulletin-note-value" dir="ltr">${escapeHtml(formatNumber(e))}/20</span>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:689350-689469 (s_). */
function renderBulletinRank(e) {
  return e?.total
    ? `<span class="bulletin-number-value" dir="ltr">${escapeHtml(e.rank)} / ${escapeHtml(e.total)}</span>`
    : "-";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:689469-689666 (Jo). */
function studentSubjectAverage(e, t, r = "", a = collectResults()) {
  const items = studentSubjectResults(e, t, examResultsOnly(a));
  const i = r ? items.filter((c) => resultSemester(c) === r) : items;
  const o = (i.some((c) => resultScore(c) !== null) ? i : items.filter((c) => resultScore(c) !== null))
    .map((c) => resultScore(c))
    .filter((c) => c !== null);
  return o.length ? average(o) : null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:689666-689901 (o_). */
function studentRank(e, t = collectResults()) {
  const items = state.users.filter(
    (user) => user.role === "student" && !user.isDisabled && user.niveauId === e.niveauId,
  );
  const a = studentGeneralAverage(e.id, t);
  return a === null
    ? {
        rank: "-",
        total: items.length,
      }
    : {
        rank: items.map((i) => studentGeneralAverage(i.id, t)).filter((i) => i !== null && i > a).length + 1,
        total: items.length,
      };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:689901-690012 (c_). */
function gradeObservation(e) {
  return e === null
    ? "في انتظار اكتمال النتائج"
    : normalizeObservationRules(state.gradeSettings.observationRules).find((r) => e >= r.min)?.text || "-";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:690012-690585 (l_). */
function openPrintWindow(e, textValue) {
  const r = window.open("", "_blank", "width=900,height=1200");
  if (!r) {
    alert("افتح النوافذ المنبثقة لهذا الموقع حتى تتمكن من حفظ كشف الأعداد PDF.");
    return;
  }
  r.document.open();
  r.document.write(textValue.replace("<title>", `<title>${escapeHtml(e)} - `));
  r.document.close();
  let a = false;
  const n = () => {
    if (a) return;
    a = true;
    r.focus();
    const s = Array.from(r.document.images || []).map((o) =>
      o.complete
        ? Promise.resolve()
        : new Promise((c) => {
            o.onload = c;
            o.onerror = c;
          }),
    );
    Promise.race([Promise.all(s), new Promise((o) => setTimeout(o, 800))]).then(() => r.print());
  };
  r.addEventListener("load", n, {
    once: true,
  });
  setTimeout(n, 500);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:690751-690939 (d_). */
async function prepareStudentBulletin(e) {
  const t = studentBulletinData(e);
  if (!t.subjects.length) {
    alert("لا توجد مواد أو نتائج كافية لتحميل كشف الأعداد.");
    return;
  }
  const r = await loadBulletinImages();
  const a = renderBulletinDocument(t, r);
  openPrintWindow(`bulletin-notes-${safeDownloadName(e.name)}`, a);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:690939-691069 (u_). */
async function loadBulletinImages() {
  const e = await Promise.all(
    Object.entries(state.bulletinImages).map(async ([t, r]) => [t, await loadImageDataUrl(r)]),
  );
  return Object.fromEntries(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:691069-691393 (f_). */
async function loadImageDataUrl(e) {
  if (state.imageCache.has(e)) return state.imageCache.get(e);
  const t = fetch(new URL(e, window.location.origin).href)
    .then((response) => {
      if (!response.ok) throw new Error(`Missing asset: ${e}`);
      return response.blob();
    })
    .then(
      (r) =>
        new Promise((a, n) => {
          const reader = new FileReader();
          reader.onload = () => a(reader.result);
          reader.onerror = n;
          reader.readAsDataURL(r);
        }),
    )
    .catch(() => e);
  state.imageCache.set(e, t);
  return t;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:691393-704805 (h_). */
function renderBulletinDocument(e, t = {}) {
  const r = renderBulletinNote;
  const a = renderBulletinRank(e.rank);
  const n = passDecision(e.generalAverage);
  const i = e.student.studentNumber || e.student.registrationNumber || e.student.id || "-";
  const s = t.educationLogo || state.bulletinImages.educationLogo;
  const o = t.zitounaLogo || state.bulletinImages.zitounaLogo;
  const c = t.signature || state.bulletinImages.signature;
  const l = e.academicYear || "2025-2026";
  return `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>كشف الأعداد - ${escapeHtml(e.student.name)}</title>
  <style>
    @page { size: 210mm 297mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    body {
      font-family: "Amiri", "Noto Naskh Arabic", "Traditional Arabic", "Times New Roman", serif;
      direction: rtl;
      color: #171717;
      font-size: 14px;
      line-height: 1.3;
    }
    .print-toolbar {
      direction: rtl;
      width: 210mm;
      padding: 8px 14mm 0;
      text-align: left;
    }
    .print-button {
      border: 1px solid #2f3437;
      background: #ffffff;
      color: #171717;
      padding: 6px 18px;
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
      border-radius: 4px;
      box-shadow: none;
    }
    .page {
      position: relative;
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      padding: 10mm 12mm;
      background:
        linear-gradient(90deg, rgba(185,154,75,0.14), transparent 14%, transparent 86%, rgba(47,52,55,0.08)),
        #ffffff;
      overflow: hidden;
    }
    .outer-frame {
      position: relative;
      width: 100%;
      height: 100%;
      border: 1.4px solid #2f3437;
      padding: 4.5mm;
      background: #ffffff;
      box-shadow: inset 0 0 0 1px #d7d7d7;
    }
    .inner-frame {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      border: 0;
      padding: 3mm 4.5mm 4mm;
      background: #ffffff;
    }
    .top-accent {
      height: 4px;
      margin: -1mm 0 5mm;
      background: linear-gradient(90deg, #2f3437 0 36%, #b99a4b 36% 64%, #68752a 64% 100%);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-table {
      display: grid;
      grid-template-columns: 88px minmax(0, 1fr) 88px;
      align-items: center;
      gap: 18px;
      width: 100%;
      margin: 0 0 5px;
      direction: ltr;
      min-height: 86px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .logo-cell {
      width: 88px;
      min-height: 82px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .header-copy {
      min-width: 0;
      text-align: center;
      font-weight: 700;
      color: #111111;
      direction: rtl;
      padding: 0 4px;
    }
    .header-copy .line-main { font-size: 12px; line-height: 1.45; white-space: normal; }
    .header-copy .line-sub { font-size: 10.5px; line-height: 1.45; margin-top: 2px; white-space: normal; }
    .header-copy .year {
      display: inline-block;
      border-top: 1px solid #9b9b9b;
      border-bottom: 1px solid #9b9b9b;
      padding: 3px 18px;
      font-size: 18px;
      font-weight: 700;
      margin-top: 7px;
      line-height: 1.25;
    }
    .header-logo {
      width: 76px;
      height: 76px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .header-rule { border: 0; border-top: 2px solid #2f3437; margin: 5px 0 7px; }
    .bulletin-title {
      text-align: center;
      font-size: 19px;
      font-weight: 700;
      margin: 0 auto 8px;
      width: 54mm;
      border: 1px solid #2f3437;
      background: #f7f7f4;
      padding: 4px 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 9px;
      table-layout: fixed;
    }
    .info-table td {
      border: 1px solid #9c9c9c;
      background: #f0f1ee;
      padding: 5px 8px;
      height: 29px;
      vertical-align: middle;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .info-label-cell {
      width: 18%;
      font-weight: 700;
      text-align: right;
    }
    .info-value-cell {
      width: 32%;
      text-align: center;
      background: #ffffff !important;
    }
    .info-label { font-weight: 700; margin-left: 5px; }
    .info-value { font-weight: 400; }
    .section-title {
      text-align: center;
      font-weight: 700;
      font-size: 16px;
      margin: 8px 0 5px;
      color: #2f3437;
    }
    .table-area {
      position: relative;
      margin-bottom: 9px;
    }
    .watermark {
      position: absolute;
      z-index: 0;
      top: 50%;
      left: 50%;
      width: 64mm;
      height: 64mm;
      object-fit: contain;
      transform: translate(-50%, -50%);
      opacity: 0.045;
    }
    .notes {
      position: relative;
      z-index: 1;
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      background: transparent;
    }
    .notes th, .notes td, .summary th, .summary td {
      border: 1px solid #9e9e9e;
      padding: 5px 7px;
      text-align: center;
      vertical-align: middle;
    }
    .notes th {
      background: #2f3437;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .notes tr { height: 26px; }
    .notes tbody tr:nth-child(odd) td { background: #ffffff; }
    .notes tbody tr:nth-child(even) td { background: #f0f1ee; }
    .notes tbody tr:last-child td {
      background: #e7e7e0;
      font-weight: 700;
    }
    .notes tbody td {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .bulletin-note-value,
    .bulletin-number-value {
      direction: ltr;
      unicode-bidi: isolate;
      display: inline-block;
    }
    .subject-col { width: 36%; }
    .coef-col { width: 13%; }
    .note-col { width: 18%; }
    .average-col { width: 15%; }
    .subject-cell { text-align: right !important; padding-right: 10px !important; font-weight: 700; }
    .general-title {
      text-align: center;
      font-weight: 700;
      font-size: 16px;
      margin: 9px 0 5px;
      color: #7d1916;
    }
    .summary {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 0;
    }
    .summary td {
      background: #ffffff;
      border: 1px solid #9e9e9e;
      height: 39px;
      padding: 5px 8px;
      box-shadow: none;
      border-radius: 0;
    }
    .summary .summary-label-cell {
      width: 22%;
      background: #f0f1ee;
      font-weight: 700;
      text-align: right;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .summary .summary-value-cell {
      width: 28%;
      text-align: center;
      font-weight: 700;
    }
    .summary-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .summary-value {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: #2f3437;
    }
    .observation {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    .observation td {
      border: 1px solid #9e9e9e;
      height: 32px;
      text-align: center;
      vertical-align: middle;
      font-weight: 700;
      background: #ffffff;
    }
    .signature-table {
      position: absolute;
      left: 6mm;
      right: 6mm;
      bottom: 7mm;
      width: calc(100% - 12mm);
      border-collapse: collapse;
      table-layout: fixed;
    }
    .signature-table td {
      border: 0;
      vertical-align: middle;
      height: 174px;
      font-weight: 700;
      font-size: 14px;
    }
    .date-cell { text-align: right; vertical-align: top !important; padding-top: 14px; }
    .stamp-cell { text-align: center; }
    .signature-label-cell { text-align: center; vertical-align: top !important; }
    .signature-block {
      display: inline-grid;
      justify-items: center;
      gap: 4px;
      min-width: 250px;
    }
    .stamp-image {
      width: 250px;
      height: 168px;
      object-fit: contain;
      opacity: 0.92;
    }
    .footer {
      position: absolute;
      left: 6mm;
      right: 6mm;
      bottom: 4mm;
      text-align: center;
      font-size: 11px;
      color: #333333;
    }
    @media print {
      html, body { width: 210mm; height: 297mm; }
      .print-toolbar { display: none !important; mso-hide: all; }
      .page { margin: 0; }
      .header-table { grid-template-columns: 88px minmax(0, 1fr) 88px !important; gap: 18px !important; }
      .top-accent, .notes th, .notes td, .summary td, .info-table td, .bulletin-title {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button class="print-button" type="button" onclick="window.print()">طباعة</button>
  </div>
  <div class="page">
    <div class="outer-frame">
      <div class="inner-frame">
        <div class="top-accent"></div>
        <div class="header-table">
          <div class="logo-cell"><img class="header-logo" src="${escapeHtml(s)}" alt=""></div>
          <div class="header-copy">
            <div class="line-main">مشيخة التعليم الزيتوني وفروعه بإشراف الجمعية التربوية للثقافة والعلوم</div>
            <div class="line-sub">الهيئة العلمية للتعليم الزيتوني - 6 نهج قليبية، باب الخضراء، تونس 1002</div>
            <div class="year">التعليم الزيتوني عن بعد ${escapeHtml(l)}</div>
          </div>
          <div class="logo-cell"><img class="header-logo" src="${escapeHtml(o)}" alt=""></div>
        </div>
        <hr class="header-rule">
        <div class="bulletin-title">بطاقة الأعداد</div>

        <table class="info-table">
          <tr>
            <td class="info-label-cell">الاسم واللقب</td>
            <td class="info-value-cell">${escapeHtml(e.student.name)}</td>
            <td class="info-label-cell">السنة</td>
            <td class="info-value-cell">${escapeHtml(e.niveau)}</td>
          </tr>
          <tr>
            <td class="info-label-cell">الفوج</td>
            <td class="info-value-cell">${escapeHtml(e.groupe)}</td>
            <td class="info-label-cell">تاريخ الولادة</td>
            <td class="info-value-cell">${escapeHtml(e.birthDate)}</td>
          </tr>
          <tr>
            <td class="info-label-cell">CIN</td>
            <td class="info-value-cell">${escapeHtml(e.cin)}</td>
            <td class="info-label-cell">رقم التسجيل</td>
            <td class="info-value-cell">${escapeHtml(i)}</td>
          </tr>
        </table>

        <div class="section-title">أعداد المواد حسب السداسيين</div>
        <div class="table-area">
          <img class="watermark" src="${escapeHtml(s)}" alt="">
          <table class="notes">
            <colgroup>
              <col class="subject-col">
              <col class="coef-col">
              <col class="note-col">
              <col class="note-col">
              <col class="average-col">
            </colgroup>
            <thead>
              <tr>
                <th>المادة</th>
                <th>المعامل</th>
                <th>السداسي الأول</th>
                <th>السداسي الثاني</th>
                <th>معدل المادة</th>
              </tr>
            </thead>
            <tbody>
              ${e.subjects
                .map(
                  (d) => `
                <tr>
                  <td class="subject-cell">${escapeHtml(d.subject.name)}</td>
                  <td>${escapeHtml(formatNumber(d.coefficient))}</td>
                  <td>${r(d.s1)}</td>
                  <td>${r(d.s2)}</td>
                  <td>${r(d.average)}</td>
                </tr>
              `,
                )
                .join("")}
              <tr>
                <td class="subject-cell">المعدل</td>
                <td>-</td>
                <td>${r(e.semester1Average)}</td>
                <td>${r(e.semester2Average)}</td>
                <td>${r(e.generalAverage)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="general-title">النتائج العامة</div>
        <table class="summary">
          <tr>
            <td class="summary-label-cell">معدل السداسي الأول</td>
            <td class="summary-value-cell">${r(e.semester1Average)}</td>
            <td class="summary-label-cell">معدل السداسي الثاني</td>
            <td class="summary-value-cell">${r(e.semester2Average)}</td>
          </tr>
          <tr>
            <td class="summary-label-cell">المعدل العام</td>
            <td class="summary-value-cell">${r(e.generalAverage)}</td>
            <td class="summary-label-cell">الرتبة</td>
            <td class="summary-value-cell">${a}</td>
          </tr>
          <tr>
            <td class="summary-label-cell">الملاحظة</td>
            <td class="summary-value-cell" colspan="3">${escapeHtml(e.observation || n)}</td>
          </tr>
        </table>

        <table class="signature-table">
          <tr>
            <td class="date-cell">تونس في : ${escapeHtml(e.generatedAt)}</td>
            <td class="stamp-cell"></td>
            <td class="signature-label-cell">
              <span class="signature-block">
                <span>إمضاء إدارة المعهد والختم</span>
                <img class="stamp-image" src="${escapeHtml(c)}" alt="">
              </span>
            </td>
          </tr>
        </table>
        <div class="footer">التعليم الزيتوني عن بعد — صفحة 1 / 1</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:704805-704895 (m_). */
function passDecision(e) {
  return e === null ? "في انتظار اكتمال النتائج" : e >= 10 ? "ناجح" : e >= 8 ? "مؤجل" : "راسب";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:704895-705018 (p_). */
function safeDownloadName(e) {
  return (
    String(e || "student")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "student"
  );
}
