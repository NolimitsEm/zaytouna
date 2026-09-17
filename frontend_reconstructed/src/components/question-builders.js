import { defaultExamQuestions } from "../controllers/exam-session.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:672412-672836 (Lk). */
function handleQuestionTypeChange(event) {
  const element = event.target.closest("[data-questionnaire-question-type]");
  if (element) {
    const formElement2 = element.closest("[data-questionnaire-builder-question]");
    const s = element.value === "checklist";
    formElement2.querySelector("[data-questionnaire-question-options]").hidden = !s;
    return;
  }
  const element2 = event.target.closest("[data-question-type]");
  if (!element2) return;
  const formElement = element2.closest("[data-exam-builder-question]");
  const n = element2.value === "qcm";
  formElement.querySelector("[data-question-options]").hidden = !n;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:672836-672984 (Mk). */
function examBuilderElement(formElement) {
  return (
    formElement.querySelector("[data-exam-question-builder]") ||
    (formElement.id ? document.querySelector(`[data-exam-question-builder="${formElement.id}"]`) : null)
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:672984-674094 (Ih). */
function readExamQuestions(e) {
  const t = examBuilderElement(e);
  if (!t) {
    alert("أضف أسئلة الامتحان.");
    return null;
  }
  const r = [];
  const a = [...t.querySelectorAll("[data-exam-builder-question]")];
  for (const [n, formElement] of a.entries()) {
    const s = formElement.querySelector("[data-question-type]")?.value || "text";
    const o = Number(formElement.querySelector("[data-question-points]")?.value || 0);
    const c = formElement.querySelector("[data-question-text]")?.value.trim() || "";
    if (!c) {
      alert(`اكتب نص السؤال ${n + 1}.`);
      return null;
    }
    if (!o || o <= 0) {
      alert(`حدد نقاط السؤال ${n + 1}.`);
      return null;
    }
    if (s === "qcm") {
      const items = [...formElement.querySelectorAll("[data-exam-option]")];
      const d = items
        .map((formElement2) => formElement2.querySelector("[data-option-text]")?.value.trim() || "")
        .filter(Boolean);
      const f = items
        .filter((formElement2) => formElement2.querySelector("[data-option-correct]")?.checked)
        .map((formElement2) => formElement2.querySelector("[data-option-text]")?.value.trim() || "")
        .filter(Boolean);
      if (d.length < 2) {
        alert(`السؤال ${n + 1}: QCM يحتاج اختيارين على الأقل.`);
        return null;
      }
      if (!f.length) {
        alert(`السؤال ${n + 1}: حدد الإجابة الصحيحة في QCM.`);
        return null;
      }
      r.push({
        type: "qcm",
        text: c,
        points: o,
        options: d,
        correctAnswers: f,
        correctAnswer: f.join("، "),
      });
    } else
      r.push({
        type: "text",
        text: c,
        points: o,
        options: [],
        correctAnswers: [],
        correctAnswer: "",
      });
  }
  return r;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:674094-674260 (Bk). */
function questionnaireBuilderElement(formElement) {
  return (
    formElement.querySelector("[data-questionnaire-question-builder]") ||
    (formElement.id
      ? document.querySelector(`[data-questionnaire-question-builder="${formElement.id}"]`)
      : null)
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:674260-675018 (Fh). */
function readQuestionnaireQuestions(e) {
  const t = questionnaireBuilderElement(e);
  if (!t) {
    alert("أضف أسئلة الاستبيان.");
    return null;
  }
  const r = [];
  const a = [...t.querySelectorAll("[data-questionnaire-builder-question]")];
  for (const [n, formElement] of a.entries()) {
    const s =
      formElement.querySelector("[data-questionnaire-question-type]")?.value === "checklist"
        ? "checklist"
        : "text";
    const o = formElement.querySelector("[data-questionnaire-question-text]")?.value.trim() || "";
    if (!o) {
      alert(`اكتب نص السؤال ${n + 1}.`);
      return null;
    }
    if (s === "checklist") {
      const c = [...formElement.querySelectorAll("[data-questionnaire-option]")]
        .map((formElement2) => formElement2.querySelector("[data-option-text]")?.value.trim() || "")
        .filter(Boolean);
      if (c.length < 2) {
        alert(`السؤال ${n + 1}: Checklist يحتاج اختيارين على الأقل.`);
        return null;
      }
      r.push({
        type: "checklist",
        text: o,
        options: c,
      });
    } else
      r.push({
        type: "text",
        text: o,
        options: [],
      });
  }
  return r;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:675018-675202 (Y0). */
function renumberQuestionnaireBuilder(e) {
  if (e) {
    e.querySelectorAll("[data-questionnaire-builder-question]").forEach((formElement, r) => {
      const a = formElement.querySelector(".exam-builder-head strong");
      if (a) {
        a.textContent = `السؤال ${r + 1}`;
      }
    });
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:675202-675377 (K0). */
function renumberExamBuilder(e) {
  if (e) {
    e.querySelectorAll("[data-exam-builder-question]").forEach((formElement, r) => {
      const a = formElement.querySelector(".exam-builder-head strong");
      if (a) {
        a.textContent = `السؤال ${r + 1}`;
      }
    });
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:675377-675693 (ga). */
function questionnaireQuestions(exam) {
  return (
    Array.isArray(exam.questionItems)
      ? exam.questionItems
      : Array.isArray(exam.questions)
        ? exam.questions
        : defaultQuestionnaireQuestions(exam)
  )
    .map((question, a) =>
      typeof question == "string"
        ? {
            type: "text",
            text: question,
            options: [],
          }
        : {
            type: question.type === "checklist" ? "checklist" : "text",
            text: question.text || `سؤال ${a + 1}`,
            options: Array.isArray(question.options) ? question.options : [],
          },
    )
    .filter((r) => r.text);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:675693-675836 (Uk). */
function defaultQuestionnaireQuestions(e) {
  const t = Math.max(1, Number(e.questions) || 1);
  return Array.from(
    {
      length: t,
    },
    (r, a) => ({
      type: "text",
      text: `السؤال ${a + 1}`,
      options: [],
    }),
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:675836-675907 (Xo). */
function questionnaireQuestionCount(e) {
  return questionnaireQuestions(e).length || Math.max(1, Number(e.questions) || 1);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:675907-675981 (ha). */
function questionnaireAudience(e) {
  return e.targetAudience === "teachers" ? "teachers" : "students";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:675981-676048 (en). */
function questionnaireAudienceLabel(e) {
  return e === "teachers" ? "موجه للأساتذة" : "موجه للطلبة";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:676048-676120 (al). */
function questionnairePreviewLabel(e) {
  return questionnaireAudience(e) === "teachers" ? "معاينة كأستاذ" : "معاينة كطالب";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:676120-676553 ($a). */
function examQuestions(exam) {
  return (
    Array.isArray(exam.questionItems)
      ? exam.questionItems
      : Array.isArray(exam.questions)
        ? exam.questions
        : defaultExamQuestions()
  )
    .map((question) =>
      typeof question == "string"
        ? {
            type: "text",
            text: question,
            options: [],
          }
        : {
            type: question.type === "qcm" ? "qcm" : "text",
            text: question.text || "",
            points: questionPoints(question),
            options: Array.isArray(question.options) ? question.options : [],
            correctAnswers: Array.isArray(question.correctAnswers)
              ? question.correctAnswers
              : [question.correctAnswer].filter(Boolean),
            correctAnswer: question.correctAnswer || "",
          },
    )
    .filter((r) => r.text);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:676553-676609 (Nr). */
function questionPoints(e) {
  const t = Number(e?.points);
  return t > 0 ? t : 1;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:676609-676662 (Es). */
function examTotalPoints(e) {
  return examQuestions(e).reduce((t, r) => t + questionPoints(r), 0);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:676662-676784 (Re). */
function formatNumber(e) {
  const t = Number(e) || 0;
  return Number.isInteger(t) ? String(t) : t.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:676784-676930 (Js). */
function examDuration(e) {
  if (Number(e.durationMinutes)) return Number(e.durationMinutes);
  const t = String(e.duration || "").match(/\d+/);
  return t ? Number(t[0]) : 30;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:676930-677210 (Qs). */
function toDateTimeLocal(e) {
  if (!e) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(e))) return String(e).slice(0, 16);
  const date = new Date(e);
  if (Number.isNaN(date.getTime())) return String(e).slice(0, 16);
  const r = date.getTimezoneOffset();
  return new Date(date.getTime() - r * 6e4).toISOString().slice(0, 16);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:677210-677301 (nl). */
function normalizeDateTime(e) {
  const t = String(e || "").trim();
  if (!t) return "";
  const r = toDateTimeLocal(t);
  return isValidDateTime(r) ? r : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:677301-677414 (qk). */
function isValidDateTime(e) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(e || "")) && !Number.isNaN(new Date(e).getTime());
}
