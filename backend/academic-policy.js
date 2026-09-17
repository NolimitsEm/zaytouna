const same = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();
const fail = (message) => {
  throw Object.assign(new Error(message), { statusCode: 403 });
};
const rows = (state, key) => {
  try {
    return JSON.parse(state[key] || "[]");
  } catch {
    return [];
  }
};
const normalized = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export function withoutAnswerKeys(value) {
  if (Array.isArray(value)) return value.map(withoutAnswerKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !["correctAnswer", "correctAnswers", "answerKey"].includes(key),
      )
      .map(([key, item]) => [key, withoutAnswerKeys(item)]),
  );
}

export function targetsStudent(item, student) {
  const clean = (values) =>
    values.filter((value) => value != null && String(value).trim() !== "");
  const levels = clean(
    Array.isArray(item?.niveauIds) ? item.niveauIds : [item?.niveauId],
  );
  const groups = clean(
    Array.isArray(item?.groupeIds) ? item.groupeIds : [item?.groupeId],
  );
  const students = clean(
    Array.isArray(item?.studentIds) ? item.studentIds : [],
  );
  return (
    (!levels.length || levels.some((id) => same(id, student.niveauId))) &&
    (!groups.length || groups.some((id) => same(id, student.groupeId))) &&
    (!students.length || students.some((id) => same(id, student.id)))
  );
}

export function validateStudentSubmission(
  key,
  item,
  previous,
  user,
  state,
  now = Date.now(),
) {
  if (!same(item.userId, user.id)) fail("Submission owner mismatch.");
  // Submitted answers/marks are immutable for students. Ignore forged updates.
  if (previous && !previous.missedExam) return previous;
  const config = {
    examSubmissions: ["managedExams", "examId"],
    exerciseSubmissions: ["teacherCourses", "courseId"],
    questionnaireSubmissions: ["managedQuestionnaires", "questionnaireId"],
  }[key];
  const content = rows(state, config[0]).find((row) =>
    same(row.id, item[config[1]]),
  );
  if (
    !content ||
    content.publishedToStudents === false ||
    !targetsStudent(content, user)
  )
    fail("This content is not available to you.");
  if (
    rows(state, key).some(
      (row) =>
        same(row.userId, user.id) &&
        same(row[config[1]], content.id) &&
        !same(row.id, item.id) &&
        !row.missedExam,
    )
  )
    fail("Already submitted.");
  const base = {
    id: item.id,
    userId: user.id,
    studentName: user.name,
    [config[1]]: content.id,
    submittedAt: new Date(now).toISOString(),
  };
  if (key === "exerciseSubmissions") {
    const fileUrl = item.fileUrl || item.url;
    if (!content.exercise || !fileUrl)
      fail("An exercise and solution file are required.");
    return {
      ...base,
      fileName: item.fileName || item.name,
      fileType: item.fileType || item.type,
      fileUrl,
    };
  }
  if (key === "questionnaireSubmissions") {
    if (!["students", "all"].includes(content.targetAudience))
      fail("Questionnaire audience mismatch.");
    return {
      ...base,
      userName: user.name,
      userRole: user.role,
      questionnaireTitle: content.title,
      answers: Array.isArray(item.answers)
        ? item.answers.map((answer) => ({
            type: answer.type === "checklist" ? "checklist" : "text",
            question: String(answer.question || ""),
            options: Array.isArray(answer.options) ? answer.options : [],
            answer: answer.answer,
          }))
        : [],
    };
  }
  const opens = new Date(content.opensAt).getTime();
  const closes = opens + Number(content.durationMinutes) * 60000;
  const missed = item.missedExam === true && now >= closes;
  // A small network-delivery grace only; client timestamps cannot extend exams.
  if (
    !Number.isFinite(opens) ||
    !Number.isFinite(closes) ||
    now < opens ||
    (!missed && now > closes + 30000)
  )
    fail("The exam is not open.");
  const rawQuestions = Array.isArray(content.questionItems)
    ? content.questionItems
    : Array.isArray(content.questions)
      ? content.questions
      : [];
  if (!rawQuestions.length) fail("Exam questions are not configured.");
  const answers = rawQuestions.map((raw, index) => {
    const question = typeof raw === "string" ? { text: raw } : raw;
    const points = Number(question.points) > 0 ? Number(question.points) : 1;
    const type = question.type === "qcm" ? "qcm" : "text";
    const submitted = item.answers?.[index]?.answer;
    const answer = missed
      ? type === "qcm"
        ? []
        : ""
      : type === "qcm"
        ? (Array.isArray(submitted) ? submitted : [submitted]).filter(
            (value) => typeof value === "string",
          )
        : String(submitted || "");
    const expected = [
      ...new Set(
        (question.correctAnswers || [question.correctAnswer])
          .map(normalized)
          .filter(Boolean),
      ),
    ];
    const actual =
      type === "qcm"
        ? [...new Set(answer.map(normalized).filter(Boolean))]
        : [];
    const correct =
      !missed &&
      type === "qcm" &&
      expected.length > 0 &&
      expected.length === actual.length &&
      expected.every((value) => actual.includes(value));
    return {
      type,
      question: question.text,
      points,
      answer,
      correctAnswers: expected,
      correctAnswer: question.correctAnswer || "",
      isCorrect: type === "qcm" || missed ? correct : null,
      awardedPoints: missed
        ? 0
        : type === "qcm"
          ? correct
            ? points
            : 0
          : null,
      correctionStatus: missed ? "missed" : type === "qcm" ? "auto" : "pending",
    };
  });
  const totalPoints = answers.reduce(
    (total, answer) => total + answer.points,
    0,
  );
  const awardedPoints = answers.reduce(
    (total, answer) => total + (answer.awardedPoints || 0),
    0,
  );
  const pendingManualCount = answers.filter(
    (answer) => answer.correctionStatus === "pending",
  ).length;
  return {
    ...base,
    examTitle: content.title,
    answers,
    totalPoints,
    awardedPoints,
    autoPoints: awardedPoints,
    pendingManualCount,
    correctionStatus: pendingManualCount ? "pending" : "corrected",
    correctCount: answers.filter((answer) => answer.isCorrect).length,
    totalQuestions: answers.length,
    score: pendingManualCount
      ? `قيد التصحيح (${awardedPoints}/${totalPoints} آلي)`
      : `${awardedPoints}/${totalPoints}`,
    missedExam: missed,
    autoSubmitted: missed || now >= closes,
  };
}

export function validateTeacherAbsence(item, previous, user, state) {
  const schedule = rows(state, "managedSchedule").find((row) =>
    same(row.id, item.scheduleId),
  );
  if (!schedule || !same(schedule.teacherId, user.id))
    fail("You do not own this session.");
  if (previous && previous.status !== "pending") return previous;
  if (item.status !== "pending" || item.approvedBy || item.approvedAt)
    fail("Only an administrator can approve absences.");
  return {
    id: item.id,
    scheduleId: schedule.id,
    teacherId: user.id,
    reason: String(item.reason || "").slice(0, 2000),
    status: "pending",
    requestedAt: previous?.requestedAt || new Date().toISOString(),
  };
}
