import { state } from "../context/state.js";
import { getJson, postJson } from "./http.js";
import { showToast } from "../components/common/toasts.js";
import { normalizeUsers, restoreSession, setCurrentUser } from "./auth.js";
import { normalizeSemester } from "../pages/grades.js";
import { applySubjectRedirects } from "./catalog-management.js";
import { registerMissedExams } from "./exam-timing.js";
import { currentRoute, renderRoute } from "../routes/router.js";
import {
  loadActivityLog,
  loadGradeSettings,
  loadLessonSessionLog,
} from "./settings-and-activity.js";
import {
  isAllGroupsAlias,
  normalizeCreatorRole,
  normalizeExamAudience,
  uniqueStrings,
} from "../utils/audience.js";
import {
  normalizePersonName,
  summarizeAnswerScores,
  userName,
} from "./results.js";
import { parseScore } from "../utils/formatters.js";
import { formatNumber } from "../components/question-builders.js";
import { removeUserRelatedData } from "./user-management.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:388520-388584 (Ku). */
function restoreCachedUser() {
  return (
    state.users.find((e) => e.id === state.currentUserId && !e.isDisabled) ||
    null
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:388584-388660 (Bs). */
function readCachedValue(e) {
  return Object.prototype.hasOwnProperty.call(state.cachedValues, e)
    ? state.cachedValues[e]
    : null;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:388660-388693 (ht). */
function cacheValue(e, t) {
  state.cachedValues[e] = String(t);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:388693-388767 (VS). */
function mergeCachedValues(e) {
  Object.entries(e || {}).forEach(([t, r]) => {
    if (r != null) {
      cacheValue(t, r);
    }
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:388767-388937 (Jt). */
function readCachedArray(e, t = []) {
  const cachedValue = readCachedValue(e);
  if (!cachedValue) return structuredClone(t);
  try {
    const a = JSON.parse(cachedValue);
    return Array.isArray(a) ? a : structuredClone(t);
  } catch {
    return structuredClone(t);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:388937-389131 (Us). */
function readCachedObject(e, t = {}) {
  const cachedValue = readCachedValue(e);
  if (!cachedValue) return structuredClone(t);
  try {
    const a = JSON.parse(cachedValue);
    return a && typeof a == "object" && !Array.isArray(a)
      ? a
      : structuredClone(t);
  } catch {
    return structuredClone(t);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:389131-389159 (Ei). */
function readCachedFlag(e) {
  return readCachedValue(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:389159-389249 (pt). */
function saveStateValue(e, t, r = {}) {
  const a = typeof t == "string" ? t : JSON.stringify(t);
  return saveStateBatch(
    {
      [e]: a,
    },
    r,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:389249-389615 (Ic). */
function saveStateBatch(e, t = {}) {
  if (!state.persistenceEnabled)
    return Promise.resolve({
      skipped: true,
    });
  const r = {
    ...e,
  };
  const a = !t.silent && shouldNotifySave(r);
  const n = async () => {
    const s = await postJson("/api/app-state", {
      items: r,
      revisions: state.serverRevisions || {},
    });
    mergeCachedValues(s.items || r);
    if (s.revisions)
      state.serverRevisions = {
        ...state.serverRevisions,
        ...Object.fromEntries(
          Object.keys(r).map((key) => [key, s.revisions[key]]),
        ),
      };
    // Grades are computed by the server, never trusted from the browser.
    if (s.items?.examSubmissions) state.examSubmissions = loadExamSubmissions();
    if (a) {
      showToast(saveSuccessMessage(r), "success");
    }
    return s;
  };
  const i = state.saveQueue.catch(() => {}).then(n);
  state.saveQueue = i.catch((s) => {
    console.warn("Database state save failed:", s.message);
    if (a) {
      showToast(`فشل حفظ العملية في قاعدة البيانات: ${s.message}`, "error");
    }
  });
  return i;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:389615-389674 (ft). */
async function awaitSave(e) {
  try {
    await e;
    return true;
  } catch {
    return false;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:390548-390626 (YS). */
function shouldNotifySave(e) {
  return state.saveNotificationsEnabled
    ? Object.keys(e || {}).filter((r) => !state.silentStateKeys.has(r)).length >
        0
    : false;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:390837-391005 (KS). */
function saveSuccessMessage(e) {
  const t = Object.keys(e || {}).filter((r) => !state.silentStateKeys.has(r));
  return t.length === 1
    ? state.saveMessages[t[0]] || "تم حفظ العملية في قاعدة البيانات."
    : "تم حفظ التغييرات في قاعدة البيانات.";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:391982-392030 (Qu). */
function loadUsers() {
  return normalizeUsers(readCachedArray("acceptedUsers", state.defaultUsers));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392030-392074 (gr). */
function saveUsers() {
  return saveStateValue("acceptedUsers", state.users);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392074-392128 (Zu). */
function loadDeletedUserIds() {
  return readCachedArray("deletedUserIds").map(String);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392128-392166 (Fc). */
function saveDeletedUserIds() {
  saveStateValue("deletedUserIds", state.deletedUserIds);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392166-392250 (ef). */
function loadLevels() {
  const cachedArray = readCachedArray("managedNiveaux", state.defaultLevels);
  return cachedArray.length
    ? cachedArray
    : structuredClone(state.defaultLevels);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392250-392288 (Bo). */
function saveLevels() {
  return saveStateValue("managedNiveaux", state.levels);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392288-392372 (tf). */
function loadGroups() {
  const cachedArray = readCachedArray("managedGroupes", state.defaultGroups);
  return cachedArray.length
    ? cachedArray
    : structuredClone(state.defaultGroups);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392372-392410 (Uo). */
function saveGroups() {
  return saveStateValue("managedGroupes", state.groups);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392410-392499 (rf). */
function loadSubjects() {
  const cachedArray = readCachedArray("managedSubjects", state.defaultSubjects);
  return normalizeSubjects(
    cachedArray.length ? cachedArray : structuredClone(state.defaultSubjects),
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392499-392538 (vs). */
function saveSubjects() {
  return saveStateValue("managedSubjects", state.subjects);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392538-392603 (QS). */
function normalizeSubjects(items) {
  return items.map((t) => ({
    ...t,
    semester: normalizeSemester(t.semester),
  }));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392603-392647 (af). */
function loadSubjectRedirects() {
  return readCachedObject("subjectRedirects");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392647-392687 (ZS). */
function saveSubjectRedirects() {
  saveStateValue("subjectRedirects", state.subjectRedirects);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:393657-393705 (sf). */
function loadRegistrationRequests() {
  return readCachedArray("registrationRequests");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:393705-393749 (Ji). */
function saveRegistrationRequests() {
  saveStateValue("registrationRequests", state.registrationRequests);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:393749-393990 (of). */
function loadEmailSettings() {
  const e = {
    fromName: "مشيخة التعليم الزيتوني وفروعه",
    fromEmail: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    appPassword: "",
    autoSendActivation: true,
  };
  const cachedObject = readCachedObject("emailSettings");
  return {
    ...e,
    ...cachedObject,
    autoSendActivation: cachedObject.autoSendActivation !== false,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:393990-394055 (R0). */
function saveEmailSettingsCache() {
  const { appPassword: e, ...t } = state.emailSettings;
  saveStateValue("emailSettings", t);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:394055-395083 (ty). */
function persistInitialState() {
  const { appPassword: e, ...t } = state.emailSettings;
  const r = [
    "correctedExamExamplesSeededV1",
    "examCorrectionExamplesSeeded",
    "examDataResetVersion",
    "ilyasCompletedSemesterWorkV1",
    "ilyasDemoRestoredV1",
    "questionnaireResultExamplesSeededV1",
  ];
  const a = {
    acceptedUsers: JSON.stringify(state.users),
    activityLog: JSON.stringify(state.activityLog),
    deletedUserIds: JSON.stringify(state.deletedUserIds),
    emailSettings: JSON.stringify(t),
    examSubmissions: JSON.stringify(state.examSubmissions),
    exerciseSubmissions: JSON.stringify(state.exerciseSubmissions),
    generalPlans: JSON.stringify(state.generalPlans),
    gradeSettings: JSON.stringify(state.gradeSettings),
    lessonSessionLog: JSON.stringify(state.lessonSessionLog),
    managedExams: JSON.stringify(state.exams),
    managedGroupes: JSON.stringify(state.groups),
    managedNiveaux: JSON.stringify(state.levels),
    managedQuestionnaires: JSON.stringify(state.questionnaires),
    managedSchedule: JSON.stringify(state.schedule),
    managedSubjects: JSON.stringify(state.subjects),
    publicContent: JSON.stringify(state.publicContent),
    questionnaireSubmissions: JSON.stringify(state.questionnaireSubmissions),
    registrationRequests: JSON.stringify(state.registrationRequests),
    subjectRedirects: JSON.stringify(state.subjectRedirects),
    teacherCourses: JSON.stringify(state.courses),
    teacherAbsences: JSON.stringify(state.teacherAbsences),
  };
  r.forEach((n) => {
    const cachedValue = readCachedValue(n);
    if (cachedValue !== null) {
      a[n] = cachedValue;
    }
  });
  return saveStateBatch(a);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:395083-395549 (ry). */
async function initializeApplication() {
  try {
    await fetchApplicationState();
  } catch (e) {
    console.warn("Initial database state load failed:", e.message);
  }
  if ((await restoreSession(), state.currentUser))
    try {
      const e = state.currentUser;
      await fetchApplicationState();
      setCurrentUser(e);
    } catch (e) {
      alert(`تعذر تحميل بيانات الحساب من قاعدة البيانات.
${e.message}`);
    }
  if (((state.persistenceEnabled = !!state.currentUser), state.currentUser)) {
    applySubjectRedirects();
    if (state.currentUser.role === "admin") {
      seedCorrectionExamples();
      restoreDemoStudent();
      seedDemoSemesterWork();
      seedCorrectedExamExamples();
      seedQuestionnaireExamples();
    }
    registerMissedExams();
    try {
      if (state.currentUser.role === "admin") {
        await persistInitialState();
      }
    } catch (e) {
      alert(`تعذر تثبيت البيانات في قاعدة البيانات. تأكد أن MySQL والـ backend يخدموا ثم أعد تحميل الصفحة.
${e.message}`);
    }
  }
  state.saveNotificationsEnabled = true;
  renderRoute();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:395549-395676 (li). */
async function fetchApplicationState() {
  const recordings = new Map(
    state.courses.map((course) => [String(course.id), course]),
  );
  const response = await getJson("/api/app-state");
  const t = response.state || {};
  state.serverRevisions = response.revisions || {};
  Object.entries(t).forEach(([r, a]) => {
    if (a != null) {
      cacheValue(r, a);
    }
  });
  reloadCachedState();
  for (const course of state.courses) {
    const previous = recordings.get(String(course.id));
    if (
      previous &&
      course.zoomMeetingId &&
      String(previous.zoomMeetingId) === String(course.zoomMeetingId) &&
      String(previous.zoomMeetingUuid || "") ===
        String(course.zoomMeetingUuid || "")
    ) {
      for (const key of [
        "recordingAudioUrl",
        "recordingVideoUrl",
        "recordingPresentationUrl",
        "zoomRecordingStatus",
        "zoomRecordingSyncedAt",
        "zoomRecordingFiles",
      ]) {
        if (previous[key]) course[key] = previous[key];
      }
    }
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:395676-395865 (ay). */
function reloadCachedState() {
  state.subjects = loadSubjects();
  state.levels = loadLevels();
  state.groups = loadGroups();
  state.publicContent = loadPublicContent();
  state.activityLog = loadActivityLog();
  state.lessonSessionLog = loadLessonSessionLog();
  state.courses = loadCourses();
  state.schedule = loadSchedule();
  state.exams = loadExams();
  state.questionnaires = loadQuestionnaires();
  state.users = loadUsers();
  state.deletedUserIds = loadDeletedUserIds();
  state.registrationRequests = loadRegistrationRequests();
  state.emailSettings = loadEmailSettings();
  state.subjectRedirects = loadSubjectRedirects();
  state.examSubmissions = loadExamSubmissions();
  state.questionnaireSubmissions = loadQuestionnaireSubmissions();
  state.gradeSettings = loadGradeSettings();
  state.exerciseSubmissions = loadExerciseSubmissions();
  state.teacherAbsences = loadTeacherAbsences();
  state.generalPlans = loadGeneralPlans();
  state.currentUser = restoreCachedUser();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:402096-402918 (lf). */
function loadPublicContent() {
  const cachedObject = readCachedObject(
    "publicContent",
    state.defaultPublicContent,
  );
  return {
    ...structuredClone(state.defaultPublicContent),
    ...cachedObject,
    home: {
      ...state.defaultPublicContent.home,
      ...(cachedObject.home || {}),
    },
    about: {
      ...state.defaultPublicContent.about,
      ...(cachedObject.about || {}),
    },
    pages: {
      ...state.defaultPublicContent.pages,
      ...(cachedObject.pages || {}),
      teachers: {
        ...state.defaultPublicContent.pages.teachers,
        ...(cachedObject.pages?.teachers || {}),
      },
      programs: {
        ...state.defaultPublicContent.pages.programs,
        ...(cachedObject.pages?.programs || {}),
      },
      activities: {
        ...state.defaultPublicContent.pages.activities,
        ...(cachedObject.pages?.activities || {}),
      },
      news: {
        ...state.defaultPublicContent.pages.news,
        ...(cachedObject.pages?.news || {}),
      },
      media: {
        ...state.defaultPublicContent.pages.media,
        ...(cachedObject.pages?.media || {}),
      },
      register: {
        ...state.defaultPublicContent.pages.register,
        ...(cachedObject.pages?.register || {}),
      },
      platform: {
        ...state.defaultPublicContent.pages.platform,
        ...(cachedObject.pages?.platform || {}),
      },
    },
    contact: {
      ...state.defaultPublicContent.contact,
      ...(cachedObject.contact || {}),
    },
    teachers: cachedObject.teachers || state.defaultPublicContent.teachers,
    programs: cachedObject.programs || state.defaultPublicContent.programs,
    activities:
      cachedObject.activities || state.defaultPublicContent.activities,
    news: cachedObject.news || state.defaultPublicContent.news,
    mediaItems:
      cachedObject.mediaItems || state.defaultPublicContent.mediaItems,
    branches: Array.isArray(cachedObject.branches) ? cachedObject.branches : [],
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:402918-402962 (za). */
function savePublicContent() {
  return saveStateValue("publicContent", state.publicContent);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:402962-403007 (df). */
function loadCourses() {
  return readCachedArray("teacherCourses", state.defaultCourses);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403007-403058 (da). */
function saveCourses(e = {}) {
  return saveStateValue("teacherCourses", state.courses, e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403058-403104 (uf). */
function loadSchedule() {
  return readCachedArray("managedSchedule", state.defaultSchedule);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403104-403150 (di). */
function saveSchedule() {
  return saveStateValue("managedSchedule", state.schedule);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403150-403197 (Nc). */
function loadExams() {
  return normalizeExams(readCachedArray("managedExams", state.defaultExams));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403197-403240 (fa). */
function saveExams() {
  return saveStateValue("managedExams", state.exams);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403240-403287 (ff). */
function loadExerciseSubmissions() {
  return readCachedArray("exerciseSubmissions");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403287-403337 (py). */
function saveExerciseSubmissions() {
  return saveStateValue("exerciseSubmissions", state.exerciseSubmissions);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403337-403380 (hf). */
function loadTeacherAbsences() {
  return readCachedArray("teacherAbsences");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403380-403426 (bs). */
function saveTeacherAbsences() {
  return saveStateValue("teacherAbsences", state.teacherAbsences);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403426-403466 (mf). */
function loadGeneralPlans() {
  return readCachedArray("generalPlans");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403466-403509 (gy). */
function saveGeneralPlans() {
  return saveStateValue("generalPlans", state.generalPlans);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403509-403638 (xy). */
function normalizeExams(items) {
  const t = items.map((a) =>
    normalizeExamAudience(a, {
      resolveUserName: userName,
    }),
  );
  if (JSON.stringify(items) !== JSON.stringify(t)) {
    saveStateValue("managedExams", t);
  }
  return t;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403638-403666 (pf). */
function creatorRole(e) {
  return normalizeCreatorRole(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403666-403694 (Cr). */
function uniqueTargetIds(e) {
  return uniqueStrings(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403694-403722 (P0). */
function isAllGroups(e) {
  return isAllGroupsAlias(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403722-403808 (Ca). */
function refreshExams() {
  const exams = loadExams();
  return JSON.stringify(exams) === JSON.stringify(state.exams)
    ? false
    : ((state.exams = exams), true);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403808-403877 (vy). */
function handleStorageChange(e) {
  if (e.key !== "managedExams") return;
  if (refreshExams() && routeUsesExams(currentRoute())) {
    renderRoute();
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:403877-404081 (by). */
function routeUsesExams(e) {
  return [
    "admin",
    "analytics",
    "examCorrection",
    "examEditor",
    "examManagement",
    "examPrep",
    "examPreview",
    "examSession",
    "exams",
    "student",
    "studentBulletin",
    "studentResults",
    "teacher",
  ].includes(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:404081-404133 (gf). */
function loadQuestionnaires() {
  return readCachedArray("managedQuestionnaires", state.defaultQuestionnaires);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:404133-404185 (Ja). */
function saveQuestionnaires() {
  return saveStateValue("managedQuestionnaires", state.questionnaires);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:404185-404236 (xf). */
function loadExamSubmissions() {
  return readCachedArray("examSubmissions").map(normalizeExamSubmission);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:404236-404671 (vf). */
function normalizeExamSubmission(e) {
  if (!e || typeof e != "object") return e;
  const t = {
    ...e,
  };
  if (parseScore(t.score) !== null)
    return {
      ...t,
      pendingManualCount: 0,
      correctionStatus: "corrected",
    };
  if (Array.isArray(t.answers) && t.answers.length) {
    const r = summarizeAnswerScores(t.answers);
    return {
      ...t,
      ...r,
      score: r.score,
    };
  }
  if (Number.isFinite(Number(t.awardedPoints)) && Number(t.totalPoints)) {
    t.pendingManualCount = 0;
    t.correctionStatus = "corrected";
    t.score = `${formatNumber(t.awardedPoints)}/${formatNumber(t.totalPoints)}`;
  }
  return t;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:404671-404717 (Zr). */
function saveExamSubmissions() {
  return saveStateValue("examSubmissions", state.examSubmissions);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:404717-405121 (wy). */
function seedCorrectionExamples() {
  if (readCachedFlag("examCorrectionExamplesSeeded") === "true") return;
  let e = false;
  if (
    !state.exams.some(
      (n) => Number(n.id) === Number(state.demoCorrectionExam.id),
    )
  ) {
    state.exams = [structuredClone(state.demoCorrectionExam), ...state.exams];
    e = true;
  }
  const uniqueValues = new Set(state.examSubmissions.map((n) => String(n.id)));
  const uniqueValues2 = new Set(state.deletedUserIds.map(String));
  const items = state.demoCorrectionSubmissions.filter(
    (n) =>
      !uniqueValues.has(String(n.id)) && !uniqueValues2.has(String(n.userId)),
  );
  if (items.length) {
    state.examSubmissions = [
      ...items.map((n) => structuredClone(n)),
      ...state.examSubmissions,
    ];
    e = true;
  }
  if (e) {
    saveExams();
    saveExamSubmissions();
  }
  saveStateValue("examCorrectionExamplesSeeded", "true");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:405121-405632 (Sy). */
function seedCorrectedExamExamples() {
  if (readCachedFlag("correctedExamExamplesSeededV1") === "true") return;
  let e = false;
  const uniqueValues = new Set(state.exams.map((s) => String(s.id)));
  const items = state.demoCorrectedExams.filter(
    (s) => Number(s.id) !== 9003 && !uniqueValues.has(String(s.id)),
  );
  if (items.length) {
    state.exams = [...items.map((s) => structuredClone(s)), ...state.exams];
    e = true;
  }
  const uniqueValues2 = new Set(state.examSubmissions.map((s) => String(s.id)));
  const uniqueValues3 = new Set(state.deletedUserIds.map(String));
  const items2 = state.demoCorrectedSubmissions.filter(
    (s) =>
      String(s.userId) !== state.demoStudent.id &&
      !uniqueValues2.has(String(s.id)) &&
      !uniqueValues3.has(String(s.userId)),
  );
  if (items2.length) {
    state.examSubmissions = [
      ...items2.map((s) => structuredClone(s)),
      ...state.examSubmissions,
    ];
    e = true;
  }
  if (e) {
    saveExams();
    saveExamSubmissions();
  }
  saveStateValue("correctedExamExamplesSeededV1", "true");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:405632-406427 (yy). */
function restoreDemoStudent() {
  if (readCachedFlag("ilyasDemoRestoredV1") === "true") return;
  const user = structuredClone(state.demoStudent);
  removeUserRelatedData(user);
  state.users = state.users.filter(
    (user2) =>
      String(user2.id) !== user.id &&
      String(user2.email || "")
        .trim()
        .toLowerCase() !== user.email &&
      normalizePersonName(user2.name) !== normalizePersonName(user.name),
  );
  state.deletedUserIds = state.deletedUserIds.filter(
    (i) => String(i) !== user.id,
  );
  state.users = [...state.users, user];
  if (
    !state.questionnaires.some(
      (i) => Number(i.id) === Number(state.demoQuestionnaire.id),
    )
  ) {
    state.questionnaires = [
      structuredClone(state.demoQuestionnaire),
      ...state.questionnaires,
    ];
    saveQuestionnaires();
  }
  const items = state.demoCorrectedSubmissions.filter(
    (i) => String(i.userId) === user.id,
  );
  const uniqueValues = new Set(items.map((i) => String(i.examId)));
  const items2 = state.demoCorrectedExams.filter(
    (i) =>
      uniqueValues.has(String(i.id)) &&
      !state.exams.some((s) => Number(s.id) === Number(i.id)),
  );
  if (items2.length) {
    state.exams = [...items2.map((i) => structuredClone(i)), ...state.exams];
    saveExams();
  }
  const uniqueValues2 = new Set(items.map((i) => String(i.id)));
  state.examSubmissions = [
    ...items.map((i) => structuredClone(i)),
    ...state.examSubmissions.filter((i) => !uniqueValues2.has(String(i.id))),
  ];
  state.questionnaireSubmissions = [
    structuredClone(state.demoStudentQuestionnaireSubmission),
    ...state.questionnaireSubmissions.filter(
      (i) =>
        String(i.id) !== String(state.demoStudentQuestionnaireSubmission.id),
    ),
  ];
  saveUsers();
  saveDeletedUserIds();
  saveExamSubmissions();
  saveQuestionnaireSubmissions();
  saveStateValue("ilyasDemoRestoredV1", "true");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:406427-407263 (Ty). */
function seedDemoSemesterWork() {
  if (readCachedFlag("ilyasCompletedSemesterWorkV1") === "true") return;
  const user = structuredClone(state.demoStudent);
  removeUserRelatedData(user);
  state.users = state.users.filter(
    (user2) =>
      String(user2.id) !== user.id &&
      String(user2.email || "")
        .trim()
        .toLowerCase() !== user.email &&
      normalizePersonName(user2.name) !== normalizePersonName(user.name),
  );
  state.deletedUserIds = state.deletedUserIds.filter(
    (o) => String(o) !== user.id,
  );
  state.users = [...state.users, user];
  const uniqueValues = new Set(state.subjects.map((o) => String(o.id)));
  const items = state.demoSemesterSubjects.filter(
    (o) => !uniqueValues.has(String(o.id)),
  );
  if (items.length) {
    state.subjects = [
      ...state.subjects,
      ...items.map((o) => structuredClone(o)),
    ];
    saveSubjects();
  }
  const items2 = state.demoSemesterResults.map(createDemoSemesterExam);
  const items3 = state.demoSemesterResults.map(createDemoSemesterSubmission);
  const uniqueValues2 = new Set(items2.map((o) => String(o.id)));
  const uniqueValues3 = new Set(items3.map((o) => String(o.id)));
  state.exams = [
    ...state.exams.filter(
      (o) => !uniqueValues2.has(String(o.id)) && Number(o.id) !== 9003,
    ),
    ...items2,
  ];
  state.examSubmissions = [
    ...state.examSubmissions.filter((o) => !uniqueValues3.has(String(o.id))),
    ...items3,
  ];
  if (
    !state.questionnaires.some(
      (o) => Number(o.id) === Number(state.demoQuestionnaire.id),
    )
  ) {
    state.questionnaires = [
      structuredClone(state.demoQuestionnaire),
      ...state.questionnaires,
    ];
    saveQuestionnaires();
  }
  state.questionnaireSubmissions = [
    structuredClone(state.demoStudentQuestionnaireSubmission),
    ...state.questionnaireSubmissions.filter(
      (o) =>
        String(o.id) !== String(state.demoStudentQuestionnaireSubmission.id),
    ),
  ];
  saveUsers();
  saveDeletedUserIds();
  saveExams();
  saveExamSubmissions();
  saveQuestionnaireSubmissions();
  saveStateValue("ilyasCompletedSemesterWorkV1", "true");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:407263-407753 (Ey). */
function createDemoSemesterExam(e) {
  return {
    id: e.id,
    title: e.title,
    subjectId: e.subjectId,
    niveauId: "n2",
    groupeId: "gb",
    teacherId: "teacher",
    opensAt: e.date.slice(0, 16),
    durationMinutes: 45,
    duration: "45 دقيقة",
    questionItems: [
      {
        type: "qcm",
        text: `سؤال اختيار في ${e.title}`,
        points: 10,
        options: ["إجابة صحيحة", "إجابة غير صحيحة"],
        correctAnswers: ["إجابة صحيحة"],
        correctAnswer: "إجابة صحيحة",
      },
      {
        type: "text",
        text: `سؤال تطبيقي في ${e.title}`,
        points: 10,
        options: [],
        correctAnswers: [],
        correctAnswer: "إجابة نموذجية مختصرة.",
      },
    ],
    questions: 2,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:407753-408588 (Ay). */
function createDemoSemesterSubmission(e) {
  const t = Math.max(0, Math.min(10, Number(e.score) - 10));
  return {
    id: e.submissionId,
    examId: e.id,
    userId: "ilyas",
    studentName: state.demoStudent.name,
    examTitle: e.title,
    answers: [
      {
        type: "qcm",
        question: `سؤال اختيار في ${e.title}`,
        points: 10,
        correctAnswer: "إجابة صحيحة",
        correctAnswers: ["إجابة صحيحة"],
        answer: ["إجابة صحيحة"],
        isCorrect: true,
        awardedPoints: 10,
        correctionStatus: "auto",
      },
      {
        type: "text",
        question: `سؤال تطبيقي في ${e.title}`,
        points: 10,
        correctAnswer: "إجابة نموذجية مختصرة.",
        correctAnswers: [],
        answer: "إجابة إلياس كانت مكتملة ومصححة من الأستاذ.",
        isCorrect: t >= 10,
        awardedPoints: t,
        correctionStatus: "manual",
      },
    ],
    awardedPoints: Number(e.score),
    autoPoints: 10,
    totalPoints: 20,
    pendingManualCount: 0,
    correctionStatus: "corrected",
    correctCount: 1,
    totalQuestions: 2,
    score: `${formatNumber(e.score)}/20`,
    autoSubmitted: false,
    submittedAt: e.date,
    correctedBy: "teacher",
    correctedAt: e.date,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:408588-409067 (ky). */
function seedQuestionnaireExamples() {
  if (readCachedFlag("questionnaireResultExamplesSeededV1") === "true") return;
  let e = false;
  const uniqueValues = new Set(state.questionnaires.map((s) => String(s.id)));
  const items = state.defaultQuestionnaires.filter(
    (s) => !uniqueValues.has(String(s.id)),
  );
  if (items.length) {
    state.questionnaires = [
      ...items.map((s) => structuredClone(s)),
      ...state.questionnaires,
    ];
    e = true;
  }
  const uniqueValues2 = new Set(
    state.questionnaireSubmissions.map((s) => String(s.id)),
  );
  const uniqueValues3 = new Set(state.deletedUserIds.map(String));
  const items2 = state.demoQuestionnaireSubmissions.filter(
    (s) =>
      !uniqueValues2.has(String(s.id)) && !uniqueValues3.has(String(s.userId)),
  );
  if (items2.length) {
    state.questionnaireSubmissions = [
      ...items2.map((s) => structuredClone(s)),
      ...state.questionnaireSubmissions,
    ];
  }
  if (e) {
    saveQuestionnaires();
  }
  if (items2.length) {
    saveQuestionnaireSubmissions();
  }
  saveStateValue("questionnaireResultExamplesSeededV1", "true");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:409067-409119 (bf). */
function loadQuestionnaireSubmissions() {
  return readCachedArray("questionnaireSubmissions");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:409119-409174 (_n). */
function saveQuestionnaireSubmissions() {
  return saveStateValue(
    "questionnaireSubmissions",
    state.questionnaireSubmissions,
  );
}
