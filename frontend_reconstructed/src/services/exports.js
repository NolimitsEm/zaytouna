import { state } from "../context/state.js";
import { questionnaireAudienceLabel, questionnaireQuestions } from "../components/question-builders.js";
import {
  escapeHtml,
  formatDateTime,
  groupName,
  levelName,
  roleLabel,
  subjectName,
} from "../utils/formatters.js";
import { userName } from "./results.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:705018-705322 (g_). */
function exportQuestionnaireResults(e) {
  const t = state.questionnaires.find((i) => Number(i.id) === Number(e));
  if (!t) return;
  const r = state.questionnaireSubmissions.filter((i) => Number(i.questionnaireId) === Number(t.id));
  if (!r.length) {
    alert("لا توجد إجابات لتصديرها بعد.");
    return;
  }
  const a = questionnaireQuestions(t);
  const n = renderQuestionnaireExport(t, a, r);
  downloadText(`questionnaire-${t.id}-results.xls`, n, "application/vnd.ms-excel;charset=utf-8");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:705322-705388 (fl). */
function exportAnswerText(e) {
  return Array.isArray(e) ? e.join("، ") : String(e || "");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:705388-706651 (x_). */
function renderQuestionnaireExport(e, items, r) {
  const a = escapeHtml(e.title || "نتائج الاستبيان");
  const items2 = [
    ["الاستبيان", e.title],
    ["المادة", subjectName(e.subjectId)],
    ["المستوى", levelName(e.niveauId)],
    ["المجموعة", e.groupeId ? groupName(e.groupeId) : "كل المجموعات"],
    ["الفئة المستهدفة", questionnaireAudienceLabel(e.targetAudience)],
    ["عدد التسليمات", r.length],
    ["عدد الأسئلة", items.length],
  ];
  return `
    <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #cfdacb; padding: 8px; vertical-align: top; text-align: right; }
          th { background: #edf4ea; color: #1f422b; font-weight: 700; }
          .section-title { background: #1f422b; color: #ffffff; font-weight: 700; font-size: 16px; }
          .summary-label { background: #f7faf6; color: #1f422b; font-weight: 700; width: 180px; }
          .spacer td { border: 0; height: 16px; }
          td { mso-number-format:"\\@"; }
        </style>
      </head>
      <body>
        <h2>${a}</h2>
        <table>
          ${items2
            .map(
              (i) => `
            <tr>
              <td class="summary-label">${escapeHtml(i[0])}</td>
              <td>${escapeHtml(i[1])}</td>
            </tr>
          `,
            )
            .join("")}
        </table>
        ${renderQuestionnaireExportTable(items, r)}
        ${items.map((i, s) => renderQuestionnaireExportQuestion(e, i, s, r)).join("")}
      </body>
    </html>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:706651-707319 (v_). */
function renderQuestionnaireExportTable(items, items2) {
  return `
    <table>
      <tr class="spacer"><td colspan="${3 + items.length}"></td></tr>
      <tr><td class="section-title" colspan="${3 + items.length}">إجابات المشاركين على كل الأسئلة</td></tr>
      <tr>
        <th>المشارك</th>
        <th>الفئة</th>
        <th>تاريخ التسليم</th>
        ${items.map((r, a) => `<th>${a + 1}. ${escapeHtml(r.text)}</th>`).join("")}
      </tr>
      ${items2
        .map(
          (r) => `
        <tr>
          <td>${escapeHtml(r.userName || userName(r.userId))}</td>
          <td>${escapeHtml(roleLabel(r.userRole))}</td>
          <td>${formatDateTime(r.submittedAt)}</td>
          ${items.map((a, n) => `<td>${escapeHtml(exportAnswerText(r.answers?.[n]?.answer) || "-")}</td>`).join("")}
        </tr>
      `,
        )
        .join("")}
    </table>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:707319-708081 (b_). */
function renderQuestionnaireExportQuestion(e, t, r, items) {
  return `
    <table>
      <tr class="spacer"><td colspan="4"></td></tr>
      <tr><td class="section-title" colspan="4">${r + 1}. ${escapeHtml(t.text)}</td></tr>
      <tr>
        <td class="summary-label">نوع السؤال</td>
        <td colspan="3">${t.type === "checklist" ? "Checklist" : "إجابة نصية"}</td>
      </tr>
      ${t.type === "checklist" ? questionnaireChecklistCounts(t, r, items) : ""}
      <tr>
        <th>المشارك</th>
        <th>الفئة</th>
        <th>تاريخ التسليم</th>
        <th>الإجابة</th>
      </tr>
      ${items
        .map(
          (n) => `
        <tr>
          <td>${escapeHtml(n.userName || userName(n.userId))}</td>
          <td>${escapeHtml(roleLabel(n.userRole))}</td>
          <td>${formatDateTime(n.submittedAt)}</td>
          <td>${escapeHtml(exportAnswerText(n.answers?.[r]?.answer) || "-")}</td>
        </tr>
      `,
        )
        .join("")}
    </table>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:708081-708640 (w_). */
function questionnaireChecklistCounts(e, t, r) {
  const a = r.length || 0;
  const lookup = new Map((e.options || []).map((i) => [i, 0]));
  r.forEach((i) => {
    const s = i.answers?.[t]?.answer;
    (Array.isArray(s) ? s : [s].filter(Boolean)).forEach((c) => lookup.set(c, (lookup.get(c) || 0) + 1));
  });
  return `
    <tr><th colspan="4">Statistique</th></tr>
    <tr>
      <th>اختيار</th>
      <th>عدد الإجابات</th>
      <th>النسبة</th>
      <th></th>
    </tr>
    ${[...lookup.entries()]
      .map(
        ([i, s]) => `
      <tr>
        <td>${escapeHtml(i)}</td>
        <td>${s}</td>
        <td>${a ? Math.round((s / a) * 100) : 0}%</td>
        <td></td>
      </tr>
    `,
      )
      .join("")}
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:708640-708887 (S_). */
function downloadText(e, t, r = "text/plain;charset=utf-8") {
  const blob = new Blob([t], {
    type: r,
  });
  const n = URL.createObjectURL(blob);
  const element = document.createElement("a");
  element.href = n;
  element.download = e;
  document.body.appendChild(element);
  element.click();
  element.remove();
  setTimeout(() => URL.revokeObjectURL(n), 1e3);
}
