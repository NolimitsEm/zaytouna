import {
  attachmentsFromForm,
  courseAttachments,
  matchAttachmentLabels,
  normalizeAttachments,
  parseAttachmentLabels,
  readAttachments,
  readExerciseFile,
} from "./attachments.js";
import { state } from "../context/state.js";
import {
  creatorRole,
  refreshExams,
  uniqueTargetIds,
} from "./state-repository.js";
import { safeJsonParse } from "../utils/json.js";
import { isYoutubeAttachment } from "../pages/lessons.js";
import {
  examQuestions,
  normalizeDateTime,
  questionPoints,
  readExamQuestions,
  readQuestionnaireQuestions,
} from "../components/question-builders.js";
import {
  equalAnswers,
  isNumericScore,
  summarizeAnswerScores,
  userName,
} from "./results.js";
import { createNumericId } from "../utils/identifiers.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:662759-663402 (Sk). */
async function addCourse(e) {
  const items = await readAttachments(attachmentsFromForm(e));
  const r = await readExerciseFile(e);
  const a = Number(e.get("scheduleId")) || null;
  const n = state.schedule.find((o) => Number(o.id) === a);
  const i = uniqueTargetIds(n?.studentIds);
  state.courses = [
    {
      id: nextCourseId(),
      scheduleId: a,
      studentIds: i,
      title: String(e.get("title") || "").trim(),
      description: String(e.get("description") || "").trim(),
      subjectId: e.get("subjectId"),
      niveauId: e.get("niveauId"),
      groupeId: e.get("groupeId") || null,
      teacherId: state.currentUser?.id || "teacher",
      visibleToAdmin: true,
      publishedToStudents: state.currentUser?.role === "admin",
      publishedAt:
        state.currentUser?.role === "admin" ? new Date().toISOString() : "",
      ...zoomFieldsFromForm(e),
      exercise: r
        ? {
            ...r,
            createdAt: new Date().toISOString(),
          }
        : null,
      files: items.map((o) => o.label),
      attachments: items,
      createdAt: new Date().toISOString().slice(0, 10),
    },
    ...state.courses,
  ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:663402-664084 (yk). */
async function editCourse(e, t) {
  const original = state.courses.find((o) => String(o.id) === String(e));
  if (!original)
    throw new Error("الدرس غير موجود. حدّث الصفحة ثم أعد المحاولة.");
  // Read uploads into a draft: a rejected FileReader must not partially edit state.
  const course = structuredClone(original);
  course.title = String(t.get("title") || "").trim();
  course.description = String(t.get("description") || "").trim();
  course.subjectId = t.get("subjectId");
  course.niveauId = t.get("niveauId");
  course.groupeId = t.get("groupeId") || null;
  Object.assign(course, zoomFieldsFromForm(t));
  const a = await readExerciseFile(t);
  if (a) {
    course.exercise = {
      ...(course.exercise || {}),
      ...a,
      updatedAt: new Date().toISOString(),
    };
  }
  const uniqueValues = new Set(
    safeJsonParse(t.get("removedAttachmentIndexes"), []).map(Number),
  );
  const items = courseAttachments(course).filter(
    (o, c) => !uniqueValues.has(c),
  );
  const s = await readAttachments(attachmentsFromForm(t));
  if (s.length) course.attachments = normalizeAttachments([...items, ...s]);
  else if (uniqueValues.size) course.attachments = normalizeAttachments(items);
  else {
    const o = items.filter((d) => !isYoutubeAttachment(d));
    const c = parseAttachmentLabels(t.get("files"));
    const l = matchAttachmentLabels(c, o);
    course.attachments = normalizeAttachments([
      ...l,
      ...items.filter(isYoutubeAttachment),
    ]);
  }
  course.files = course.attachments.map((o) => o.label);
  state.courses = state.courses.map((item) =>
    item === original ? course : item,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:664084-665009 (Th). */
function zoomFieldsFromForm(e) {
  const t = String(e.get("zoomDate") || "").trim();
  const r = String(e.get("zoomStartClock") || "").trim();
  const a = String(e.get("zoomEndClock") || "").trim();
  const n = t && r ? `${t}T${r}` : String(e.get("zoomStartTime") || "").trim();
  let i = Number(e.get("zoomDurationMinutes")) || 0;
  if (t && r && a) {
    const date = new Date(`${t}T${r}`);
    const date2 = new Date(`${t}T${a}`);
    if (!Number.isNaN(date.getTime()) && !Number.isNaN(date2.getTime())) {
      i = Math.round((date2.getTime() - date.getTime()) / 6e4);
    }
  }
  return {
    conferenceLink: String(e.get("conferenceLink") || "").trim(),
    zoomMeetingId: String(e.get("zoomMeetingId") || "").trim(),
    zoomMeetingUuid: String(e.get("zoomMeetingUuid") || "").trim(),
    zoomJoinUrl: String(e.get("zoomJoinUrl") || "").trim(),
    zoomStartUrl: String(e.get("zoomStartUrl") || "").trim(),
    zoomPassword: String(e.get("zoomPassword") || "").trim(),
    zoomStartTime: n,
    zoomDurationMinutes: i,
    zoomTimezone: String(e.get("zoomTimezone") || "").trim(),
    zoomRecordingStatus: String(e.get("zoomRecordingStatus") || "").trim(),
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:665009-666002 (Tk). */
function addExam(e) {
  refreshExams();
  const formData = new FormData(e);
  const examQuestionsValue = readExamQuestions(e);
  const a = Number(formData.get("scheduleId")) || null;
  const n = state.schedule.find((m) => Number(m.id) === a);
  const i = uniqueTargetIds(n?.studentIds);
  if (examQuestionsValue === null) return false;
  const s = Math.max(1, Number(formData.get("durationMinutes")) || 0);
  const dateTime = normalizeDateTime(formData.get("opensAt"));
  const c = uniqueTargetIds(formData.getAll("niveauId"));
  const l = uniqueTargetIds(formData.getAll("groupeId"));
  if (!examQuestionsValue.length || !s || !dateTime) {
    alert("حدد وقت الفتح والمدة واكتب سؤالًا واحدًا على الأقل.");
    return false;
  }
  if (!c.length) {
    alert("حدد مستوى واحدًا على الأقل لهذا الواجب.");
    return false;
  }
  const d = state.currentUser?.id || "admin";
  const f = creatorRole(state.currentUser?.role || "admin");
  state.exams = [
    {
      id: nextExamId(),
      scheduleId: a,
      studentIds: i,
      title: formData.get("title").trim(),
      subjectId: formData.get("subjectId"),
      niveauId: c[0],
      niveauIds: c,
      groupeId: l[0] || null,
      groupeIds: l,
      teacherId: f === "TEACHER" ? d : "admin",
      createdBy: d,
      creatorRole: f,
      createdByRole: f.toLowerCase(),
      createdByName: state.currentUser?.name || userName(d),
      visibleToAdmin: true,
      publishedToStudents: state.currentUser?.role === "admin",
      publishedAt:
        state.currentUser?.role === "admin" ? new Date().toISOString() : "",
      opensAt: dateTime,
      durationMinutes: s,
      duration: `${s} دقيقة`,
      questionItems: examQuestionsValue,
      questions: examQuestionsValue.length,
    },
    ...state.exams,
  ];
  return true;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:666002-666698 (Ek). */
function editExam(e, t) {
  const exam = state.exams.find((l) => l.id === e);
  if (!exam) return false;
  const formData = new FormData(t);
  const examQuestionsValue = readExamQuestions(t);
  if (examQuestionsValue === null) return false;
  const i = Math.max(1, Number(formData.get("durationMinutes")) || 0);
  const dateTime = normalizeDateTime(formData.get("opensAt"));
  const o = uniqueTargetIds(formData.getAll("niveauId"));
  const c = uniqueTargetIds(formData.getAll("groupeId"));
  return !examQuestionsValue.length || !i || !dateTime
    ? (alert("حدد وقت الفتح والمدة واكتب سؤالًا واحدًا على الأقل."), false)
    : o.length
      ? ((exam.title = formData.get("title").trim()),
        (exam.subjectId = formData.get("subjectId")),
        (exam.niveauId = o[0]),
        (exam.niveauIds = o),
        (exam.groupeId = c[0] || null),
        (exam.groupeIds = c),
        (exam.opensAt = dateTime),
        (exam.durationMinutes = i),
        (exam.duration = `${i} دقيقة`),
        (exam.questionItems = examQuestionsValue),
        (exam.questions = examQuestionsValue.length),
        (exam.visibleToAdmin = true),
        (exam.publishedToStudents = exam.publishedToStudents !== false),
        true)
      : (alert("حدد مستوى واحدًا على الأقل لهذا الواجب."), false);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:666698-667347 (Ak). */
function reconcileExamSubmissions(e) {
  const items = examQuestions(e);
  let r = false;
  state.examSubmissions = state.examSubmissions.map((a) => {
    if (Number(a.examId) !== Number(e.id)) return a;
    const n = items.map((o, c) => {
      const l = a.answers?.[c] || {};
      const d = questionPoints(o);
      const f = {
        ...l,
        type: o.type,
        question: o.text,
        points: d,
        correctAnswer: o.correctAnswer || "",
        correctAnswers: o.correctAnswers || [],
      };
      if (o.type === "qcm") {
        f.isCorrect = equalAnswers(
          Array.isArray(f.answer) ? f.answer : [f.answer],
          f.correctAnswers,
        );
        f.awardedPoints = f.isCorrect ? d : 0;
        f.correctionStatus = "auto";
      } else {
        if (isNumericScore(f.awardedPoints)) {
          f.awardedPoints = Math.min(d, Math.max(0, Number(f.awardedPoints)));
        }
      }
      return f;
    });
    const i = summarizeAnswerScores(n);
    const s = {
      ...a,
      examTitle: e.title,
      answers: n,
      ...i,
      score: i.score,
    };
    if (JSON.stringify(s) !== JSON.stringify(a)) {
      r = true;
    }
    return s;
  });
  return r;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:667347-667626 (kk). */
function addQuestionnaire(e, t) {
  const questionnaireQuestionsValue = readQuestionnaireQuestions(e);
  return questionnaireQuestionsValue === null
    ? false
    : ((state.questionnaires = [
        {
          id: nextQuestionnaireId(),
          title: t.get("title").trim(),
          subjectId: t.get("subjectId"),
          niveauId: t.get("niveauId"),
          groupeId: t.get("groupeId") || null,
          targetAudience: t.get("targetAudience") || "students",
          questionItems: questionnaireQuestionsValue,
          questions: questionnaireQuestionsValue.length,
        },
        ...state.questionnaires,
      ]),
      true);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:667626-667944 (_k). */
function editQuestionnaire(e, t, r) {
  const exam = state.questionnaires.find((i) => i.id === e);
  if (!exam) return false;
  const questionnaireQuestionsValue = readQuestionnaireQuestions(t);
  return questionnaireQuestionsValue === null
    ? false
    : ((exam.title = r.get("title").trim()),
      (exam.subjectId = r.get("subjectId")),
      (exam.niveauId = r.get("niveauId")),
      (exam.groupeId = r.get("groupeId") || null),
      (exam.targetAudience = r.get("targetAudience") || "students"),
      (exam.questionItems = questionnaireQuestionsValue),
      (exam.questions = questionnaireQuestionsValue.length),
      true);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:667944-667972 (Zc). */
function nextCourseId() {
  return createNumericId(state.courses);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:667972-668000 (Ik). */
function nextExamId() {
  return createNumericId(state.exams);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:668000-668028 (Fk). */
function nextQuestionnaireId() {
  return createNumericId(state.questionnaires);
}
