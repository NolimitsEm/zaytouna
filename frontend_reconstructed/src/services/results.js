import {
  examQuestions,
  formatNumber,
  questionPoints,
  questionnaireQuestions,
} from "../components/question-builders.js";
import { state } from "../context/state.js";
import { formatDateTime, parseScore } from "../utils/formatters.js";
import { resultMatchesStudent } from "../pages/grades.js";
import {
  examAvailability,
  latestExamSubmission,
  questionnaireSubmission,
  replaceExamSubmission,
} from "./exam-timing.js";
import {
  awaitSave,
  cacheValue,
  saveExamSubmissions,
  saveQuestionnaireSubmissions,
} from "./state-repository.js";
import { canCorrectExam } from "../utils/content-access.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:680917-681175 (Gk). */
function readExamAnswers(e, t) {
  const formData = new FormData(e);
  return examQuestions(t).map((a, n) => {
    const i =
      a.type === "qcm"
        ? formData.getAll(`q-${n}`)
        : formData.get(`q-${n}`) || "";
    return {
      type: a.type,
      question: a.text,
      points: questionPoints(a),
      correctAnswer: a.correctAnswer || "",
      correctAnswers: a.correctAnswers || [],
      answer: i,
    };
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:681175-681378 (Xk). */
function readQuestionnaireAnswers(e, t) {
  const formData = new FormData(e);
  return questionnaireQuestions(t).map((question, n) => {
    const i =
      question.type === "checklist"
        ? formData.getAll(`q-${n}`)
        : formData.get(`q-${n}`) || "";
    return {
      type: question.type,
      question: question.text,
      options: question.options || [],
      answer: i,
    };
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:681378-681455 (Q0). */
function normalizeAnswer(e) {
  return String(e || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:681455-681604 (Nh). */
function equalAnswers(items, items2) {
  const uniqueValues = new Set(items.map(normalizeAnswer).filter(Boolean));
  const uniqueValues2 = new Set(items2.map(normalizeAnswer).filter(Boolean));
  return uniqueValues.size !== uniqueValues2.size
    ? false
    : [...uniqueValues2].every((n) => uniqueValues.has(n));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:681604-682240 (Yk). */
function scoreAnswers(items) {
  let t = 0;
  let r = 0;
  let a = 0;
  const n = items.reduce((i, s) => i + questionPoints(s), 0);
  items.forEach((i) => {
    const s = questionPoints(i);
    if (i.type === "qcm") {
      const o = equalAnswers(
        Array.isArray(i.answer) ? i.answer : [i.answer],
        i.correctAnswers || [],
      );
      i.isCorrect = o;
      i.awardedPoints = o ? s : 0;
      i.correctionStatus = "auto";
      t += i.awardedPoints;
      r += i.awardedPoints;
      return;
    }
    i.isCorrect = null;
    i.awardedPoints = null;
    i.correctionStatus = "pending";
    a += 1;
  });
  return {
    awardedPoints: t,
    autoPoints: r,
    totalPoints: n,
    pendingManualCount: a,
    correctionStatus: a ? "pending" : "corrected",
    correctCount: items.filter((i) => i.type === "qcm" && i.isCorrect).length,
    totalQuestions: items.length,
    score: a
      ? `قيد التصحيح (${formatNumber(r)}/${formatNumber(n)} آلي)`
      : `${formatNumber(t)}/${formatNumber(n)}`,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:682240-683135 (Yr). */
function collectResults() {
  const uniqueValues = new Set(state.deletedUserIds.map(String));
  const t = state.defaultResults
    .filter((a) => !uniqueValues.has(String(a.userId)))
    .map((a) => ({
      ...a,
      type:
        a.type ||
        (String(a.label || "").includes("استبيان") ? "questionnaire" : "exam"),
      subjectId: a.subjectId || subjectFromLabel(a.label),
      rawDate: a.rawDate || a.date,
      correctionStatus:
        a.correctionStatus ||
        (String(a.score || "").includes("قيد التصحيح")
          ? "pending"
          : "corrected"),
    }));
  const r = state.examSubmissions
    .filter((a) => !uniqueValues.has(String(a.userId)))
    .map((a) => {
      const n = state.exams.find((s) => Number(s.id) === Number(a.examId));
      const resultStudent = findResultStudent(a);
      return {
        id: a.id,
        examId: a.examId,
        userId: resultStudent?.id || a.userId,
        studentName: a.studentName || resultStudent?.name || "",
        type: "exam",
        subjectId: n?.subjectId || subjectFromLabel(a.examTitle),
        label: a.examTitle || examTitle(a.examId),
        score: submissionScoreLabel(a),
        awardedPoints: a.awardedPoints,
        totalPoints: a.totalPoints,
        pendingManualCount: a.pendingManualCount,
        correctionStatus:
          a.correctionStatus ||
          (a.pendingManualCount ? "pending" : "corrected"),
        rawDate: a.submittedAt,
        date: formatDateTime(a.submittedAt),
      };
    });
  return deduplicateResults([...t, ...r]);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:683135-683241 (Kk). */
function findResultStudent(e) {
  return (
    state.users.find((t) => t.id === e.userId) ||
    state.users.find(
      (t) =>
        normalizePersonName(t.name) &&
        normalizePersonName(t.name) === normalizePersonName(e.studentName),
    )
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:683241-683318 ($r). */
function normalizePersonName(e) {
  return String(e || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:683318-683528 (Jk). */
function deduplicateResults(items) {
  const uniqueValues = new Set(
    items
      .filter((n) => resultScore(n) !== null)
      .map((n) => resultSubjectKey(n)),
  );
  const r = items.filter((n) =>
    resultIsPending(n) ? !uniqueValues.has(resultSubjectKey(n)) : true,
  );
  const lookup = new Map();
  r.forEach((n) => {
    const i = resultIdentity(n);
    const s = lookup.get(i);
    if (!s || preferResult(n, s)) {
      lookup.set(i, n);
    }
  });
  return [...lookup.values()];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:683528-683606 (Z0). */
function resultSubjectKey(e) {
  return `${e.userId || ""}::${e.type || "exam"}::${e.subjectId || ""}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:683606-683739 (Qk). */
function resultIdentity(e) {
  return e.examId
    ? `${e.userId}::exam::${e.examId}`
    : `${e.userId}::${e.type || "exam"}::${e.subjectId || ""}::${e.label || ""}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:683739-683807 (Zk). */
function preferResult(e, t) {
  const r = resultIsPending(e);
  const a = resultIsPending(t);
  return r !== a ? !r : resultTimestamp(e) >= resultTimestamp(t);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:683807-683898 (As). */
function resultTimestamp(e) {
  const t = new Date(e.rawDate || e.date || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:683898-684002 (ed). */
function subjectFromLabel(e) {
  const t = String(e || "");
  return (
    state.subjects.find((r) => t.includes(r.name) || t.includes(r.short))?.id ||
    ""
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:684002-684319 (to). */
function submissionScoreLabel(e) {
  return awaitsManualCorrection(e)
    ? `قيد التصحيح (${formatNumber(e.autoPoints || e.awardedPoints || 0)}/${formatNumber(e.totalPoints || e.answers?.length || 0)} آلي)`
    : Number.isFinite(Number(e?.awardedPoints)) && Number(e?.totalPoints)
      ? `${formatNumber(e.awardedPoints)}/${formatNumber(e.totalPoints)}`
      : e.score ||
        `${e.correctCount || 0}/${e.totalQuestions || e.answers?.length || 0}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:684319-684715 (ya). */
function awaitsManualCorrection(e) {
  if (!e || e.correctionStatus === "corrected" || parseScore(e.score) !== null)
    return false;
  const t = Array.isArray(e.answers) ? e.answers : [];
  return t.length
    ? t.some((r) => r.type !== "qcm" && !isNumericScore(r.awardedPoints))
    : Number(e.pendingManualCount) > 0
      ? true
      : Number.isFinite(Number(e.awardedPoints)) && Number(e.totalPoints)
        ? false
        : e.correctionStatus === "pending"
          ? !(Number.isFinite(Number(e.awardedPoints)) && Number(e.totalPoints))
          : false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:684715-684975 (Tn). */
function resultIsPending(e) {
  return !e ||
    e.correctionStatus === "corrected" ||
    parseScore(e.score) !== null
    ? false
    : Number(e.pendingManualCount) > 0
      ? true
      : Number.isFinite(Number(e.awardedPoints)) && Number(e.totalPoints)
        ? false
        : e.correctionStatus === "pending"
          ? true
          : String(e.score || "").includes("قيد التصحيح");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:684975-685136 (Wr). */
function resultScore(e) {
  return !e || resultIsPending(e)
    ? null
    : Number.isFinite(Number(e.awardedPoints)) && Number(e.totalPoints)
      ? (Number(e.awardedPoints) / Number(e.totalPoints)) * 20
      : parseScore(e.score);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:685136-685199 (dl). */
function studentExamResults(e) {
  return collectResults().filter(
    (t) => resultMatchesStudent(t, e) && t.type === "exam",
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:685199-685275 (e_). */
function examTitle(e) {
  return state.exams.find((t) => Number(t.id) === Number(e))?.title || "امتحان";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:685275-685337 (Mr). */
function userName(e) {
  return state.users.find((t) => t.id === e)?.name || e || "مستخدم";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:685337-686439 (Dh). */
async function submitExam(element, t = false) {
  const r = state.exams.find(
    (d) => Number(d.id) === Number(element.dataset.examId),
  );
  if (!r || !state.currentUser) return false;
  const a = latestExamSubmission(state.currentUser.id, r.id);
  if (a && !a.missedExam) {
    alert("تم تسليم هذا الامتحان سابقًا، ولا يمكن الدخول إليه مرة أخرى.");
    location.hash = "exams";
    return false;
  }
  const n = examAvailability(r).state !== "open";
  if (n && !t) return false;
  const i = structuredClone(state.examSubmissions);
  const examAnswers = readExamAnswers(element, r);
  const o = scoreAnswers(examAnswers);
  if (
    (replaceExamSubmission(state.currentUser.id, r.id, {
      id: a?.id || `submission-${Date.now()}`,
      examId: r.id,
      userId: state.currentUser.id,
      studentName: state.currentUser.name,
      examTitle: r.title,
      answers: examAnswers,
      awardedPoints: o.awardedPoints,
      autoPoints: o.autoPoints,
      totalPoints: o.totalPoints,
      pendingManualCount: o.pendingManualCount,
      correctionStatus: o.correctionStatus,
      correctCount: o.correctCount,
      totalQuestions: o.totalQuestions,
      score: o.score,
      missedExam: false,
      autoSubmitted: t || n,
      submittedAt: new Date().toISOString(),
    }),
    !(await awaitSave(saveExamSubmissions())))
  ) {
    state.examSubmissions = i;
    cacheValue("examSubmissions", JSON.stringify(state.examSubmissions));
    return false;
  }
  const c =
    t || n
      ? "انتهى الوقت وتم تسليم الامتحان تلقائيًا."
      : a?.missedExam
        ? "تم تعويض نتيجة الغياب بالنتيجة الجديدة."
        : "تم تسليم الامتحان.";
  const saved = latestExamSubmission(state.currentUser.id, r.id) || o;
  const l = saved.pendingManualCount
    ? "النتيجة النهائية قيد التصحيح."
    : `النتيجة: ${saved.score}`;
  alert(`${c}
${l}`);
  location.hash = "exams";
  return true;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:686439-687081 (t_). */
function saveManualCorrection(formElement) {
  const t = state.examSubmissions.find(
    (i) => String(i.id) === String(formElement.dataset.submissionId),
  );
  const r = state.exams.find(
    (i) => Number(i.id) === Number(formElement.dataset.examId),
  );
  if (!t || !r || !canCorrectExam(r)) return false;
  let a = true;
  if (
    ((t.answers = (t.answers || []).map((i, s) => {
      if (i.type === "qcm") return i;
      const o = questionPoints(i);
      const c = formElement.querySelector(`[data-answer-index="${s}"]`)?.value;
      const l = Number(c);
      return c === "" || !Number.isFinite(l) || l < 0 || l > o
        ? ((a = false), i)
        : {
            ...i,
            awardedPoints: l,
            correctionStatus: "manual",
            isCorrect: l >= o,
          };
    })),
    !a)
  ) {
    alert("تثبت من نقاط التصحيح. النقطة لازم تكون بين 0 ونقاط السؤال.");
    return false;
  }
  const n = summarizeAnswerScores(t.answers);
  Object.assign(t, n, {
    correctedBy: state.currentUser.id,
    correctedAt: new Date().toISOString(),
    score: n.score,
  });
  return true;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:687081-687502 (ul). */
function summarizeAnswerScores(items = []) {
  const t = items.reduce((i, s) => i + questionPoints(s), 0);
  const r = items.reduce((i, s) => i + (Number(s.awardedPoints) || 0), 0);
  const a = items
    .filter((i) => i.type === "qcm")
    .reduce((i, s) => i + (Number(s.awardedPoints) || 0), 0);
  const n = items.filter(
    (i) => i.type !== "qcm" && !isNumericScore(i.awardedPoints),
  ).length;
  return {
    awardedPoints: r,
    autoPoints: a,
    totalPoints: t,
    pendingManualCount: n,
    correctionStatus: n ? "pending" : "corrected",
    score: n
      ? `قيد التصحيح (${formatNumber(a)}/${formatNumber(t)} آلي)`
      : `${formatNumber(r)}/${formatNumber(t)}`,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:687502-687568 (ro). */
function isNumericScore(e) {
  return e != null && e !== "" && Number.isFinite(Number(e));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:687568-688242 (r_). */
async function submitQuestionnaire(element) {
  const t = state.questionnaires.find(
    (i) => Number(i.id) === Number(element.dataset.questionnaireId),
  );
  if (
    !t ||
    !state.currentUser ||
    questionnaireSubmission(state.currentUser.id, t.id)
  )
    return false;
  const questionnaireAnswers = readQuestionnaireAnswers(element, t);
  if (
    questionnaireAnswers.some((i) =>
      i.type === "text"
        ? !String(i.answer || "").trim()
        : !Array.isArray(i.answer) || i.answer.length === 0,
    )
  ) {
    alert("أجب عن كل أسئلة الاستبيان قبل التسليم.");
    return false;
  }
  const n = structuredClone(state.questionnaireSubmissions);
  state.questionnaireSubmissions = [
    ...state.questionnaireSubmissions,
    {
      id: `questionnaire-submission-${Date.now()}`,
      questionnaireId: t.id,
      userId: state.currentUser.id,
      userName: state.currentUser.name,
      userRole: state.currentUser.role,
      questionnaireTitle: t.title,
      answers: questionnaireAnswers,
      submittedAt: new Date().toISOString(),
    },
  ];
  return (await awaitSave(saveQuestionnaireSubmissions()))
    ? (alert("تم تسليم الاستبيان."), (location.hash = "questionnaires"), true)
    : ((state.questionnaireSubmissions = n),
      cacheValue(
        "questionnaireSubmissions",
        JSON.stringify(state.questionnaireSubmissions),
      ),
      false);
}
