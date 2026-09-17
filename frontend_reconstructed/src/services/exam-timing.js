import {
  examDuration,
  examQuestions,
  examTotalPoints,
  formatNumber,
  normalizeDateTime,
  questionPoints,
} from "../components/question-builders.js";
import { formatDateTime } from "../utils/formatters.js";
import { state } from "../context/state.js";
import { studentContent } from "../utils/content-access.js";
import { saveExamSubmissions } from "./state-repository.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:677414-677523 (il). */
function examOpensAt(exam) {
  if (!exam.opensAt) return null;
  const date = new Date(exam.opensAt);
  return Number.isNaN(date.getTime()) ? null : date;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:677523-677598 (Zs). */
function examClosesAt(e) {
  const t = examOpensAt(e);
  return t ? new Date(t.getTime() + examDuration(e) * 6e4) : null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:677598-677676 (J0). */
function examOpenLabel(e) {
  const t = examOpensAt(e);
  return t ? formatDateTime(t.toISOString()) : "لم يحدد وقت الفتح";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:677676-677754 (Yo). */
function examCloseLabel(e) {
  const t = examClosesAt(e);
  return t ? formatDateTime(t.toISOString()) : "لم يحدد وقت الغلق";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:677754-677933 (Ch). */
function calculateExamCloseLabel(e, t) {
  const dateTime = normalizeDateTime(e);
  const a = Math.max(1, Number(t) || 0);
  if (!dateTime || !a) return "";
  const date = new Date(dateTime);
  return Number.isNaN(date.getTime())
    ? ""
    : formatDateTime(new Date(date.getTime() + a * 6e4).toISOString());
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:677933-678346 (Ii). */
function examAvailability(e, t = new Date()) {
  const r = examOpensAt(e);
  const a = examClosesAt(e);
  return !r || !a
    ? {
        state: "unscheduled",
        action: "لم يحدد الوقت",
        label: "لم يحدد وقت فتح الامتحان بعد",
      }
    : t < r
      ? {
          state: "pending",
          action: "لم يفتح بعد",
          label: `يفتح الامتحان في ${formatDateTime(r.toISOString())}`,
        }
      : t >= a
        ? {
            state: "closed",
            action: "انتهى الوقت",
            label: `انتهى وقت الامتحان في ${formatDateTime(a.toISOString())}`,
          }
        : {
            state: "open",
            action: "بدء الامتحان",
            label: `مفتوح الآن إلى ${formatDateTime(a.toISOString())}`,
          };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:678346-678484 (Fi). */
function latestExamSubmission(e, t) {
  return state.examSubmissions
    .filter((r) => submissionMatchesExam(r, e, t))
    .sort(
      (r, a) =>
        new Date(a.submittedAt || 0).getTime() -
        new Date(r.submittedAt || 0).getTime(),
    )[0];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:678484-678571 (Ko). */
function submissionMatchesExam(e, t, r) {
  return String(e?.userId) === String(t) && String(e?.examId) === String(r);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:678571-678787 ($h). */
function replaceExamSubmission(e, t, r) {
  const n = state.examSubmissions
    .filter((i) => submissionMatchesExam(i, e, t))
    .sort(
      (i, s) =>
        new Date(s.submittedAt || 0).getTime() -
        new Date(i.submittedAt || 0).getTime(),
    )[0];
  state.examSubmissions = [
    ...state.examSubmissions.filter((i) => !submissionMatchesExam(i, e, t)),
    {
      ...n,
      ...r,
      id: n?.id || r.id,
    },
  ];
  return n || null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:678787-679086 (sl). */
function registerMissedExams() {
  const uniqueValues = new Set(state.deletedUserIds.map(String));
  let t = false;
  state.exams.forEach((r) => {
    if (
      !(
        r.publishedToStudents === false ||
        examAvailability(r).state !== "closed"
      )
    ) {
      state.users
        .filter(
          (user) =>
            state.currentUser?.role !== "student" ||
            String(user.id) === String(state.currentUser.id),
        )
        .filter(
          (user) =>
            user.role === "student" &&
            !user.isDisabled &&
            !uniqueValues.has(String(user.id)),
        )
        .filter((a) => studentContent([r], a).length > 0)
        .forEach((a) => {
          if (!latestExamSubmission(a.id, r.id)) {
            replaceExamSubmission(a.id, r.id, createMissedExamSubmission(r, a));
            t = true;
          }
        });
    }
  });
  if (t) {
    saveExamSubmissions();
  }
  return t;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:679086-679701 (jk). */
function createMissedExamSubmission(e, t) {
  const r = examQuestions(e).map((i) => ({
    type: i.type,
    question: i.text,
    points: questionPoints(i),
    correctAnswer: i.correctAnswer || "",
    correctAnswers: i.correctAnswers || [],
    answer: i.type === "qcm" ? [] : "",
    isCorrect: false,
    awardedPoints: 0,
    correctionStatus: "missed",
  }));
  const a = examTotalPoints(e);
  const n = examClosesAt(e)?.toISOString() || new Date().toISOString();
  return {
    id: `submission-${e.id}-${t.id}`,
    examId: e.id,
    userId: t.id,
    studentName: t.name,
    examTitle: e.title,
    answers: r,
    awardedPoints: 0,
    autoPoints: 0,
    totalPoints: a,
    pendingManualCount: 0,
    correctionStatus: "corrected",
    correctCount: 0,
    totalQuestions: r.length,
    score: `0/${formatNumber(a)}`,
    missedExam: true,
    autoSubmitted: true,
    submittedAt: n,
    correctedAt: n,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:679701-679789 (ol). */
function questionnaireSubmission(e, t) {
  return state.questionnaireSubmissions.find(
    (r) => r.userId === e && Number(r.questionnaireId) === Number(t),
  );
}
