import { calculateExamCloseLabel } from "../services/exam-timing.js";
import { formatCountdown } from "../routes/router.js";
import { submitExam } from "../services/results.js";
import { examQuestions } from "../components/question-builders.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:708887-709039 (Ph). */
function handleExamScheduleInput(event) {
  if (!event.target.matches("[data-exam-opens-at], [data-exam-duration]")) return;
  const t = event.target.closest("[data-exam-schedule-form]");
  if (t) {
    updateExamClosingTime(t);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:709039-709244 (y_). */
function updateExamClosingTime(formElement) {
  const t = formElement.querySelector("[data-exam-closes-at]");
  if (!t) return;
  const r = formElement.querySelector("[data-exam-opens-at]")?.value || "";
  const a = formElement.querySelector("[data-exam-duration]")?.value || "";
  t.value = calculateExamCloseLabel(r, a);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:709244-709512 (T_). */
function updateExamCountdown() {
  const element = document.querySelector("[data-exam-countdown]");
  if (!element) return;
  const r = new Date(element.dataset.examEndsAt).getTime() - Date.now();
  if (((element.textContent = `الوقت المتبقي: ${formatCountdown(r)}`), r > 0)) return;
  const element2 = document.querySelector("[data-exam-session-form]");
  if (element2) {
    submitExam(element2, true);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:709512-709607 (ao). */
function preventExamClipboard(event) {
  if (!(!event.target.closest || !event.target.closest("[data-exam-session]"))) {
    event.preventDefault();
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:709607-709715 (E_). */
function defaultExamQuestions(e) {
  return [
    {
      type: "text",
      text: "السؤال 1",
      points: 1,
      options: [],
      correctAnswers: [],
      correctAnswer: "",
    },
  ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:709715-709804 (ks). */
function examQuestionCount(e) {
  const t = examQuestions(e);
  return t.length ? t.length : Math.max(1, Number(e.questions) || 1);
}
