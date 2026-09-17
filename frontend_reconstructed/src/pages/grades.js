import {
  activeTeachers,
  average,
  escapeHtml,
  formatDateTime,
  groupName,
  hasRole,
  levelName,
  renderOption,
} from "../utils/formatters.js";
import { renderLoginPage } from "./account.js";
import {
  awaitsManualCorrection,
  collectResults,
  normalizePersonName,
  resultIsPending,
  resultScore,
  resultTimestamp,
  studentExamResults,
  submissionScoreLabel,
} from "../services/results.js";
import { state } from "../context/state.js";
import { entityHref, routeQuery } from "../routes/router.js";
import { renderDashboard, renderStat } from "../components/content-management.js";
import { formatNumber } from "../components/question-builders.js";
import {
  defaultGradeSettings,
  normalizeObservationRules,
  saveGradeSettings,
} from "../services/settings-and-activity.js";
import { contentMatchesGroup, contentMatchesLevel, studentContent } from "../utils/content-access.js";
import { examAvailability, latestExamSubmission, registerMissedExams } from "../services/exam-timing.js";
import { studentSubjectAverage } from "../components/bulletins.js";
import { awaitSave, cacheValue } from "../services/state-repository.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:581925-583260 (lA). */
function renderAnalyticsPage() {
  if (!hasRole("admin")) return renderLoginPage();
  const items = collectResults();
  const items2 = items.map((o) => ({
    ...o,
    note20: resultScore(o),
  }));
  const r = state.users
    .filter((user) => user.role === "student")
    .map((o) => studentGeneralAverage(o.id, items))
    .filter((o) => o !== null);
  const a = r.length ? average(r) : null;
  const n = items2.filter((o) => o.note20 !== null).sort((o, c) => c.note20 - o.note20)[0];
  const i = new Set(items.map((o) => o.userId)).size;
  const s = routeQuery().get("settings") === "1";
  return renderDashboard(
    "متابعة النتائج والإحصائيات",
    `
    <div class="stats-grid">
      ${renderStat("عدد النتائج", items.length)}
      ${renderStat("طلبة لديهم نتائج", i)}
      ${renderStat("متوسط النتائج", a === null ? "-" : `${formatNumber(a)}/20`)}
      ${renderStat("أفضل نتيجة", n ? `${formatNumber(n.note20)}/20` : "-")}
    </div>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>ملخص النتائج</h2>
          <p>متابعة نتائج الطلبة حسب المستوى والمجموعة مع احتساب المعدلات على 20.</p>
        </div>
        <div class="toolbar">
          <a class="button secondary" href="#analytics?settings=${s ? "0" : "1"}">${s ? "إخفاء الإعدادات" : "إعدادات المعدلات"}</a>
          <a class="button ghost" href="#admin">رجوع للوحة</a>
        </div>
      </div>
      ${s ? renderGradeSettings() : ""}
      ${renderCohortAnalytics()}
    </section>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>دفتر أعداد الأقسام</h2>
          <p>اختر السنة ثم الفوج لعرض الطلبة في الأسطر والمواد في الأعمدة.</p>
        </div>
      </div>
      ${renderGradebook()}
    </section>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:583260-584227 (dA). */
function renderCohortAnalytics() {
  const items = collectResults();
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>السنة</th><th>الفوج</th><th>عدد الطلبة</th><th>عدد النتائج</th><th>معدل الفوج /20</th><th>Top معدل /20</th><th>الطالب الأول</th></tr>
        </thead>
        <tbody>${analyticsCohorts()
          .map(({ niveau: r, groupe: a }) => {
            const items2 = state.users.filter(
              (user) => user.role === "student" && user.niveauId === r.id && user.groupeId === a.id,
            );
            const uniqueValues = new Set(items2.map((d) => d.id));
            const s = items.filter((d) => uniqueValues.has(d.userId)).length;
            const o = items2.map((d) => studentGeneralAverage(d.id, items)).filter((d) => d !== null);
            const c = o.length ? average(o) : null;
            const l = items2
              .map((d) => ({
                student: d,
                average: studentGeneralAverage(d.id, items),
              }))
              .filter((d) => d.average !== null)
              .sort((d, f) => f.average - d.average)[0];
            return `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(a.name)}</td>
        <td>${items2.length}</td>
        <td>${s}</td>
        <td>${c === null ? "-" : `${formatNumber(c)}/20`}</td>
        <td>${l ? `${formatNumber(l.average)}/20` : "-"}</td>
        <td>${l ? escapeHtml(l.student.name) : "-"}</td>
      </tr>
    `;
          })
          .join("")}</tbody>
      </table>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:584227-588027 (uA). */
function renderGradeSettings() {
  const e = routeQuery().get("settingsNiveau") || state.levels[0]?.id || "";
  const t = state.levels.find((a) => a.id === e) || state.levels[0];
  const items = t ? levelSubjects(t.id) : state.subjects;
  return `
    <form class="grade-settings-form" data-grade-settings-form>
      <div class="section-heading">
        <div>
          <h3>إعدادات حساب المعدلات</h3>
          <p class="muted">Coefficient المادة مربوط بالسنة. معدل السداسي والمعدل العام يتحسبوا حسب الإعدادات هنا.</p>
        </div>
      </div>
      <div class="grade-settings-layout">
        <div class="grade-settings-card">
          <div class="field">
            <label>السنة الجامعية في كشف الأعداد</label>
            <input name="academicYear" value="${escapeHtml(state.gradeSettings.academicYear || defaultGradeSettings().academicYear)}" placeholder="2026-2025">
          </div>
          <div class="field">
            <label>طريقة حساب المعدل العام</label>
            <select name="generalMode">
              ${renderOption("semesterAverage", "معدل السداسي الأول والثاني مع coefficients", state.gradeSettings.generalMode || "semesterAverage")}
              ${renderOption("allYearSubjects", "معدل كل السنة حسب المواد", state.gradeSettings.generalMode || "semesterAverage")}
            </select>
          </div>
          <div class="grid two">
            <div class="field">
              <label>Coefficient السداسي الأول</label>
              <input name="semester1Coefficient" type="number" min="0" step="0.25" value="${escapeHtml(semesterCoefficient("s1"))}">
            </div>
            <div class="field">
              <label>Coefficient السداسي الثاني</label>
              <input name="semester2Coefficient" type="number" min="0" step="0.25" value="${escapeHtml(semesterCoefficient("s2"))}">
            </div>
          </div>
        </div>
        <div class="grade-settings-card">
          <strong>السنة</strong>
          <div class="gradebook-tabs">
            ${state.levels
              .map(
                (a) => `
              <a class="chip ${t?.id === a.id ? "turquoise" : ""}" href="#analytics?settings=1&settingsNiveau=${encodeURIComponent(a.id)}">${escapeHtml(a.name)}</a>
            `,
              )
              .join("")}
          </div>
        </div>
        <div class="grade-settings-card span-two">
          <div class="grade-settings-head"><strong>سعر ساعة التدريس</strong><span class="muted">يُستعمل تلقائياً في كشف أجرة الأستاذ.</span></div>
          <div class="grade-coefficient-grid">
            ${activeTeachers()
              .map(
                (a) =>
                  `<label>${escapeHtml(a.name)}<input name="teacher-rate-${escapeHtml(a.id)}" type="number" min="0" step="0.001" value="${escapeHtml(state.gradeSettings.teacherHourlyRates?.[a.id] || "")}" placeholder="د.ت / ساعة"></label>`,
              )
              .join("")}
          </div>
        </div>
        <div class="grade-settings-card span-two">
          <div class="grade-settings-head">
            <strong>Coefficients المواد - ${escapeHtml(t?.name || "كل السنوات")}</strong>
            <span class="muted">${items.length} مادة</span>
          </div>
          <div class="grade-coefficient-grid">
            ${items.map((a) => renderSubjectCoefficient(t, a)).join("")}
          </div>
          ${renderHiddenCoefficients(t?.id)}
        </div>
        <div class="grade-settings-card span-two">
          <div class="grade-settings-head">
            <strong>ملاحظات كشف الأعداد حسب المعدل</strong>
            <span class="muted">تظهر تلقائيًا في bulletin</span>
          </div>
          <div class="observation-rule-grid">
            ${normalizeObservationRules(state.gradeSettings.observationRules)
              .map(
                (a, n) => `
              <div class="observation-rule-row">
                <label>
                  <span>من معدل</span>
                  <input name="observation-min-${n}" type="number" min="0" max="20" step="0.25" value="${escapeHtml(a.min)}">
                </label>
                <label>
                  <span>الملاحظة</span>
                  <input name="observation-text-${n}" value="${escapeHtml(a.text)}">
                </label>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="button primary" type="submit">حفظ الإعدادات</button>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:588027-588386 (fA). */
function renderSubjectCoefficient(e, t) {
  if (!e) return "";
  const r = coefficientKey(e.id, t.id);
  return `
    <div class="grade-coefficient-row">
      <span>
        <strong>${escapeHtml(t.name)}</strong>
        <small>${escapeHtml(t.short || t.id)}</small>
      </span>
      <input name="coef-${escapeHtml(r)}" type="number" min="0" step="0.25" value="${escapeHtml(subjectCoefficient(t.id, e.id))}" aria-label="Coefficient ${escapeHtml(t.name)}">
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:588386-588597 (hA). */
function renderHiddenCoefficients(e) {
  return state.levels
    .flatMap((t) =>
      state.subjects.map((r) => {
        if (t.id === e && levelSubjects(t.id).some((n) => n.id === r.id)) return "";
        const a = coefficientKey(t.id, r.id);
        return `<input type="hidden" name="coef-${escapeHtml(a)}" value="${escapeHtml(subjectCoefficient(r.id, t.id))}">`;
      }),
    )
    .join("");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:588597-588827 (nh). */
function levelSubjects(e) {
  const uniqueValues = new Set(
    state.subjects.filter((r) => !r.niveauId || r.niveauId === e).map((r) => r.id),
  );
  state.exams.filter((r) => contentMatchesLevel(r, e)).forEach((r) => uniqueValues.add(r.subjectId));
  return state.subjects
    .filter((r) => uniqueValues.has(r.id))
    .sort((r, a) => (r.name || "").localeCompare(a.name || "", "ar"));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:588827-589329 (mA). */
function analyticsCohorts() {
  const e = state.users
    .filter((user) => user.role === "student" && user.niveauId && user.groupeId)
    .map((r) => `${r.niveauId}::${r.groupeId}`);
  const t = collectResults()
    .map((r) => state.users.find((a) => a.id === r.userId))
    .filter((r) => r?.niveauId && r?.groupeId)
    .map((r) => `${r.niveauId}::${r.groupeId}`);
  return [...new Set([...e, ...t])]
    .map((r) => {
      const [a, n] = r.split("::");
      return {
        niveau: state.levels.find((i) => i.id === a),
        groupe: state.groups.find((i) => i.id === n),
      };
    })
    .filter((r) => r.niveau && r.groupe)
    .sort((r, a) =>
      `${r.niveau.name} ${r.groupe.name}`.localeCompare(`${a.niveau.name} ${a.groupe.name}`, "ar"),
    );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:589329-589603 (_a). */
function studentGeneralAverage(e, t = collectResults()) {
  const items = weightedStudentResults(e, examResultsOnly(t));
  if (!items.length) return null;
  if ((state.gradeSettings.generalMode || "semesterAverage") === "allYearSubjects")
    return weightedSubjectAverage(items);
  const a = ["s1", "s2"]
    .map((n) => ({
      semester: n,
      value: weightedSubjectAverage(items.filter((i) => i.semester === n)),
    }))
    .filter((n) => n.value !== null);
  return a.length ? weightedSemesterAverage(a) : weightedSubjectAverage(items);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:589603-589733 (pA). */
function weightedSemesterAverage(e) {
  let t = 0;
  let r = 0;
  e.forEach((a) => {
    const n = semesterCoefficient(a.semester);
    if (!(n <= 0)) {
      t += a.value * n;
      r += n;
    }
  });
  return r ? Math.round((t / r) * 100) / 100 : null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:589733-589806 (vn). */
function studentSemesterAverage(e, t, r = collectResults()) {
  return weightedSubjectAverage(
    weightedStudentResults(e, examResultsOnly(r)).filter((a) => a.semester === t),
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:589806-590066 (ih). */
function weightedStudentResults(e, t = collectResults()) {
  return examResultsOnly(t)
    .filter((r) => resultMatchesStudent(r, e))
    .map((r) => ({
      ...r,
      note20: resultScore(r),
      niveauId: state.users.find((a) => a.id === r.userId)?.niveauId || "",
      coefficient: subjectCoefficient(
        r.subjectId,
        state.users.find((a) => a.id === r.userId)?.niveauId || "",
      ),
      semester: resultSemester(r),
    }))
    .filter((r) => r.note20 !== null && r.subjectId);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590066-590364 (Qi). */
function weightedSubjectAverage(e) {
  if (!e.length) return null;
  const t = e.reduce((n, i) => {
    const s = n.get(i.subjectId) || [];
    s.push(i.note20);
    n.set(i.subjectId, s);
    return n;
  }, new Map());
  let r = 0;
  let a = 0;
  t.forEach((n, i) => {
    const s = e.find((o) => o.subjectId === i)?.coefficient ?? 1;
    if (!(s <= 0)) {
      r += average(n) * s;
      a += s;
    }
  });
  return a ? Math.round((r / a) * 100) / 100 : null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590364-590511 (Cn). */
function subjectCoefficient(e, t = "") {
  const r = Number(state.gradeSettings.subjectCoefficients?.[coefficientKey(t, e)]);
  if (r >= 0) return r;
  const a = Number(state.gradeSettings.subjectCoefficients?.[e]);
  return a >= 0 ? a : 1;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590511-590587 (Go). */
function semesterCoefficient(e) {
  const t = Number(state.gradeSettings.semesterCoefficients?.[e]);
  return t >= 0 ? t : 1;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590587-590630 (Gs). */
function coefficientKey(e, t) {
  return `${e || "all"}__${t}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590630-590717 (sh). */
function semesters() {
  return [
    {
      id: "s1",
      label: "السداسي الأول",
    },
    {
      id: "s2",
      label: "السداسي الثاني",
    },
  ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590717-590758 ($n). */
function normalizeSemester(e) {
  return e === "s2" ? "s2" : "s1";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590758-590826 (j0). */
function semesterLabel(e) {
  return normalizeSemester(e) === "s2" ? "السداسي الثاني" : "السداسي الأول";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590826-590907 (gA). */
function subjectSemester(e) {
  const t = state.subjects.find((r) => r.id === e);
  return t?.semester ? normalizeSemester(t.semester) : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590907-590968 (Xs). */
function resultSemester(e) {
  return subjectSemester(e.subjectId) || semesterFromDate(e.rawDate || e.date);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:590968-591065 (xA). */
function semesterFromDate(e) {
  const t = parseResultDate(e);
  if (!t) return "s2";
  const r = t.getMonth() + 1;
  return r >= 9 || r <= 1 ? "s1" : "s2";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:591065-591279 (vA). */
function parseResultDate(e) {
  if (!e) return null;
  const date = new Date(e);
  if (!Number.isNaN(date.getTime())) return date;
  const r = String(e).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return r ? new Date(Number(r[3]), Number(r[2]) - 1, Number(r[1])) : null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:591279-592244 (bA). */
function renderGradebook() {
  const e = routeQuery();
  const t = e.get("niveau") || state.levels[0]?.id || "";
  const r = state.levels.find((s) => s.id === t) || state.levels[0];
  if (!r) return '<div class="empty-state">لا توجد سنوات مسجلة.</div>';
  const items = gradebookGroups(r.id);
  const n = e.get("groupe") || items[0]?.id || "";
  const i = items.find((s) => s.id === n);
  return `
    <div class="gradebook-picker">
      <div>
        <strong>السنة</strong>
        <div class="gradebook-tabs">
          ${state.levels
            .map(
              (s) => `
            <a class="chip ${s.id === r.id ? "turquoise" : ""}" href="#analytics?niveau=${encodeURIComponent(s.id)}">${escapeHtml(s.name)}</a>
          `,
            )
            .join("")}
        </div>
      </div>
      <div>
        <strong>الأفواج</strong>
        <div class="gradebook-tabs">
          ${
            items.length
              ? items
                  .map(
                    (s) => `
            <a class="chip ${s.id === n ? "gold" : ""}" href="#analytics?niveau=${encodeURIComponent(r.id)}&groupe=${encodeURIComponent(s.id)}">${escapeHtml(s.name)}</a>
          `,
                  )
                  .join("")
              : '<span class="muted">لا توجد أفواج في هذه السنة.</span>'
          }
        </div>
      </div>
    </div>
    ${i ? renderCohortGradebook(r, i) : ""}
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:592244-592389 (wA). */
function gradebookGroups(e) {
  const uniqueValues = new Set(
    state.users
      .filter((user) => user.role === "student" && user.niveauId === e && user.groupeId)
      .map((r) => r.groupeId),
  );
  return state.groups.filter((r) => uniqueValues.has(r.id));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:592389-593477 (SA). */
function renderCohortGradebook(e, t) {
  const items = state.users
    .filter((user) => user.role === "student" && user.niveauId === e.id && user.groupeId === t.id)
    .sort((n, i) => n.name.localeCompare(i.name, "ar"));
  const items2 = cohortSubjects(e.id, t.id);
  return items.length
    ? items2.length
      ? `
    <div class="gradebook-meta">
      <strong>${escapeHtml(e.name)} · ${escapeHtml(t.name)}</strong>
      <span>${items.length} طالب · ${items2.length} مادة</span>
    </div>
    ${renderBulletinDistribution(e, t, items, items2)}
    <div class="table-wrap gradebook-table-wrap">
      <table class="gradebook-table">
        <thead>
          <tr>
            <th>الطالب</th>
            ${items2.map((n) => `<th>${escapeHtml(n.short || n.name)}<span class="gradebook-coef">coef ${formatNumber(subjectCoefficient(n.id, e.id))}</span></th>`).join("")}
            <th>معدل س1 /20</th>
            <th>معدل س2 /20</th>
            <th>المعدل العام /20</th>
            <th>Bulletin de note</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((n) =>
              renderGradebookRow(n, items2, "", {
                includeBulletinAction: true,
              }),
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
      : '<div class="empty-state">لا توجد مواد مرتبطة بهذه السنة والفوج.</div>'
    : `<div class="empty-state">لا يوجد طلبة في ${escapeHtml(e.name)} - ${escapeHtml(t.name)}.</div>`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:593477-594042 (yA). */
function renderBulletinDistribution(e, t, r, a) {
  if (state.currentUser?.role !== "admin") return "";
  const n = bulletinDistributionDate(e.id, t.id);
  const i = r.length > 0 && a.length > 0;
  return `
    <div class="form-actions gradebook-actions class-bulletin-actions">
      <button class="button primary" type="button" data-distribute-class-bulletins="${escapeHtml(bulletinDistributionKey(e.id, t.id))}" ${i ? "" : "disabled"}>Distribuer les bulletins de note</button>
      <span class="muted">
        ${n ? `Bulletins distribues le ${formatDateTime(n)}` : i ? "Les bulletins sont prets pour cette classe." : "Ajoutez au moins un etudiant et une matiere avant la distribution."}
      </span>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:594042-594262 (oh). */
function renderStudentGradebook(e) {
  const t = cohortSubjects(e.niveauId, e.groupeId);
  const r = studentExamResults(e.id);
  return r.length
    ? t.length
      ? renderStudentGrades(e, t, r)
      : '<div class="empty-state">لا توجد مواد مرتبطة بحسابك.</div>'
    : '<div class="empty-state">لا توجد نتائج امتحانات حاليًا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:594262-594503 (Ai). */
function cohortSubjects(e, t) {
  const uniqueValues = new Set(
    state.subjects.filter((a) => !a.niveauId || a.niveauId === e).map((a) => a.id),
  );
  state.exams
    .filter((a) => contentMatchesLevel(a, e) && contentMatchesGroup(a, t))
    .forEach((a) => uniqueValues.add(a.subjectId));
  return state.subjects
    .filter((a) => uniqueValues.has(a.id))
    .sort((a, n) => (a.name || "").localeCompare(n.name || "", "ar"));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:594503-595274 (ch). */
function renderGradebookRow(e, items, r = "", a = {}) {
  const items2 = items.map((d) => subjectGradeCell(e.id, d.id, r));
  const i =
    a.includeBulletinAction && state.currentUser?.role === "admin"
      ? `<td><a class="button secondary" href="${entityHref("studentBulletin", "student", e.id)}">Bulletin de note</a></td>`
      : "";
  const s = examResultsOnly();
  if (r) {
    const d = studentSemesterAverage(e.id, r, s);
    return `
      <tr>
        <td><strong>${escapeHtml(e.name)}</strong></td>
        ${items2.map((f) => `<td>${f.html}</td>`).join("")}
        <td>${d === null ? "-" : `${formatNumber(d)}/20`}</td>
        ${i}
      </tr>
    `;
  }
  const o = studentSemesterAverage(e.id, "s1", s);
  const c = studentSemesterAverage(e.id, "s2", s);
  const l = studentGeneralAverage(e.id, s);
  return `
    <tr>
      <td><strong>${escapeHtml(e.name)}</strong></td>
      ${items2.map((d) => `<td>${d.html}</td>`).join("")}
      <td>${o === null ? "-" : `${formatNumber(o)}/20`}</td>
      <td>${c === null ? "-" : `${formatNumber(c)}/20`}</td>
      <td>${l === null ? "-" : `${formatNumber(l)}/20`}</td>
      ${i}
    </tr>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:595274-595833 (TA). */
function subjectGradeCell(e, t, r = "") {
  const items = studentSubjectResults(e, t);
  const items2 = r ? items.filter((f) => resultSemester(f) === r) : items;
  if (!items2.length && !items.length)
    return {
      html: '<span class="muted">-</span>',
      note20: null,
    };
  const i = items2.map((f) => resultScore(f)).filter((f) => f !== null);
  const items3 = items.filter((f) => resultScore(f) !== null);
  const o = i.length ? items2 : items3;
  const c = i.length ? i : items3.map((f) => resultScore(f)).filter((f) => f !== null);
  const l = !c.length && items2.some((f) => resultIsPending(f));
  if (!c.length)
    return {
      html: l ? '<span class="chip gold">قيد التصحيح</span>' : '<span class="muted">-</span>',
      note20: null,
    };
  const d = average(c);
  [...o]
    .filter((f) => resultScore(f) !== null)
    .sort((f, m) => resultTimestamp(f) - resultTimestamp(m))
    .at(-1);
  return {
    html: `<strong>${formatNumber(d)}/20</strong>`,
    note20: d,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:595833-595894 (lh). */
function studentSubjectResults(e, t, items = examResultsOnly()) {
  return items.filter((a) => resultMatchesStudent(a, e) && resultMatchesSubject(a, t));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:595894-596028 (Vc). */
function resultMatchesStudent(e, t) {
  if (e.userId === t) return true;
  const r = state.users.find((a) => a.id === t);
  return !!(
    r &&
    normalizePersonName(e.studentName) &&
    normalizePersonName(e.studentName) === normalizePersonName(r.name)
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:596028-596188 (EA). */
function resultMatchesSubject(e, t) {
  if (e.subjectId === t) return true;
  const r = state.subjects.find((n) => n.id === t);
  const a = String(e.label || "");
  return !!(r && (a.includes(r.name) || (r.short && a.includes(r.short))));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:596188-596624 (AA). */
function renderStudentGrades(e, t, r) {
  const a = examResultsOnly();
  const n = studentGeneralAverage(e.id, a);
  const i = bulletinReadiness(e, t);
  return `
    <div class="gradebook-meta">
      <strong>${escapeHtml(e.name)}</strong>
      <span>${levelName(e.niveauId)} · ${groupName(e.groupeId)} · ${r.length} نتيجة امتحان</span>
      <span>المعدل العام: ${n === null ? "-" : `${formatNumber(n)}/20`}</span>
    </div>
    <div class="student-semester-results">
      ${["s1", "s2"].map((s) => renderSemesterResults(e, t, s, a)).join("")}
    </div>
    ${state.currentUser?.role === "student" ? renderStudentBulletinAction(e, i) : ""}
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:596624-596945 (kA). */
function renderStudentBulletinAction(e, t) {
  return canDownloadBulletin(e)
    ? `
    <div class="form-actions gradebook-actions">
      <button class="button primary" type="button" data-download-student-bulletin="${escapeHtml(e.id)}" ${t.isComplete ? "" : "disabled"}>تحميل كشف الأعداد</button>
      ${t.isComplete ? "" : `<span class="muted">${escapeHtml(t.message)}</span>`}
    </div>
  `
    : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:596945-597491 (dh). */
function bulletinReadiness(e, items = cohortSubjects(e.niveauId, e.groupeId)) {
  registerMissedExams();
  const r = examResultsOnly();
  const a = items.filter((o) => studentSubjectAverage(e.id, o.id, "", r) === null);
  const n = studentExamResults(e.id).filter(resultIsPending);
  const i = studentExams(e).filter((o) => {
    if (examAvailability(o).state !== "closed") return true;
    const c = latestExamSubmission(e.id, o.id);
    return c
      ? awaitsManualCorrection(c) ||
          resultScore({
            score: submissionScoreLabel(c),
            awardedPoints: c.awardedPoints,
            totalPoints: c.totalPoints,
            pendingManualCount: c.pendingManualCount,
            correctionStatus: c.correctionStatus,
          }) === null
      : true;
  });
  const s = a.length + n.length + i.length;
  return {
    isComplete: !!canDownloadBulletin(e) || (items.length > 0 && s === 0),
    missingCount: s,
    message: s ? "كشف الأعداد يتفعّل بعد اكتمال كل الأعداد وتصحيح كل الامتحانات." : "",
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:597491-597574 (_A). */
function studentExams(e) {
  return state.exams.filter((t) => t.publishedToStudents !== false && studentContent([t], e).length > 0);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:597574-597657 (uh). */
function bulletinDistributionKey(e, t) {
  return `${state.gradeSettings.academicYear || defaultGradeSettings().academicYear}::${e || ""}::${t || ""}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:597657-597721 (fh). */
function bulletinDistributionDate(e, t) {
  return state.gradeSettings.bulletinDistributions?.[bulletinDistributionKey(e, t)] || "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:597721-597769 (Gc). */
function canDownloadBulletin(e) {
  return bulletinDistributionDate(e.niveauId, e.groupeId);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:597769-598311 (IA). */
async function distributeBulletins(e) {
  if (state.currentUser?.role !== "admin") return false;
  const [, t = "", r = ""] = String(e || "").split("::");
  const a = state.users.filter(
    (user) => user.role === "student" && user.niveauId === t && user.groupeId === r,
  );
  const n = cohortSubjects(t, r);
  if (!(a.length > 0 && n.length > 0)) {
    alert("لا يمكن توزيع كشوف الأعداد قبل اكتمال كل الأعداد وتصحيح كل الامتحانات.");
    return false;
  }
  const s = structuredClone(state.gradeSettings);
  state.gradeSettings = {
    ...state.gradeSettings,
    bulletinDistributions: {
      ...(state.gradeSettings.bulletinDistributions || {}),
      [e]: new Date().toISOString(),
    },
  };
  return (await awaitSave(saveGradeSettings()))
    ? (alert("تم توزيع كشوف الأعداد على طلبة هذا القسم."), true)
    : ((state.gradeSettings = s), cacheValue("gradeSettings", JSON.stringify(state.gradeSettings)), false);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:598311-599261 (FA). */
function renderSemesterResults(e, items, r, a = collectResults()) {
  const items2 = items.filter((o) => normalizeSemester(o.semester) === r);
  const i = studentExamResults(e.id).filter((o) => resultSemester(o) === r).length;
  const s = studentSemesterAverage(e.id, r, a);
  return `
    <section class="student-semester-panel">
      <div class="gradebook-meta compact">
        <strong>${semesterLabel(r)}</strong>
        <span>${items2.length} مادة · ${i} نتيجة · المعدل: ${s === null ? "-" : `${formatNumber(s)}/20`}</span>
      </div>
      ${
        items2.length
          ? `
        <div class="table-wrap gradebook-table-wrap">
          <table class="gradebook-table">
            <thead>
              <tr>
                <th>الطالب</th>
                ${items2.map((o) => `<th>${escapeHtml(o.short || o.name)}<span class="gradebook-coef">coef ${formatNumber(subjectCoefficient(o.id, e.niveauId))}</span></th>`).join("")}
                <th>معدل السداسي /20</th>
              </tr>
            </thead>
            <tbody>
              ${renderGradebookRow(e, items2, r)}
            </tbody>
          </table>
        </div>
      `
          : `<div class="empty-state">لا توجد مواد في ${semesterLabel(r)}.</div>`
      }
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:599261-599317 (pa). */
function examResultsOnly(items = collectResults()) {
  return items.filter((t) => t.type === "exam");
}
