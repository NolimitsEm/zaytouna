import { state } from "../context/state.js";
import { normalizeArabicText } from "../utils/audience.js";
import {
  bulletinImages,
  cachedValues,
  defaultActivities,
  defaultCourses,
  defaultExams,
  defaultGroups,
  defaultLevels,
  defaultMediaItems,
  defaultNews,
  defaultPrograms,
  defaultQuestionnaires,
  defaultResults,
  defaultSchedule,
  defaultSubjects,
  defaultTeachers,
  defaultUsers,
  demoCorrectedExams,
  demoCorrectedSubmissions,
  demoCorrectionExam,
  demoCorrectionSubmissions,
  demoQuestionnaire,
  demoQuestionnaireSubmissions,
  demoSemesterResults,
  demoSemesterSubjects,
  demoStudent,
  demoStudentQuestionnaireSubmission,
  educationLevels,
  privateRouteStorageKey,
  programNames,
  saveMessages,
  scheduleTypes,
  tablePageSize,
} from "../data/defaults.js";
import {
  handleStorageChange,
  initializeApplication,
  loadCourses,
  loadDeletedUserIds,
  loadEmailSettings,
  loadExamSubmissions,
  loadExams,
  loadExerciseSubmissions,
  loadGeneralPlans,
  loadGroups,
  loadLevels,
  loadPublicContent,
  loadQuestionnaireSubmissions,
  loadQuestionnaires,
  loadRegistrationRequests,
  loadSchedule,
  loadSubjectRedirects,
  loadSubjects,
  loadTeacherAbsences,
  loadUsers,
  restoreCachedUser,
} from "../services/state-repository.js";
import {
  loadActivityLog,
  loadGradeSettings,
  loadLessonSessionLog,
  normalizeInstitutionName,
} from "../services/settings-and-activity.js";
import { currentRoute, renderRoute } from "../routes/router.js";
import { closeTeacherSessions, handleClick } from "../controllers/actions.js";
import { handleSubmit } from "../controllers/forms.js";
import {
  handleAdminFilter,
  handleListingFilter,
  handleScheduleAudienceChange,
  handleScheduleStudentSearch,
  handleTableSearch,
  handleUserRoleChange,
} from "../controllers/filters.js";
import { handleAttachmentSelection, handleAvatarUpload } from "../services/attachments.js";
import {
  handleExamScheduleInput,
  preventExamClipboard,
  updateExamCountdown,
} from "../controllers/exam-session.js";
import { handleQuestionTypeChange } from "../components/question-builders.js";
import { endSidebarDrag, moveSidebarDrag, startSidebarDrag } from "../layouts/navigation.js";
import { safeImageUrl } from "../utils/formatters.js";
import { captureActivationToken } from "../services/auth.js";
import { showToast, toastTypeFromMessage } from "../components/common/toasts.js";
export function initializeRuntime() {
  state.allGroupsAliases = new Set(
    ["all", "all-groups", "all_groups", "tous", "toutes", "كل المجموعات", "كل المجموعات في المستوى"].map(
      normalizeArabicText,
    ),
  );
  state.defaultSubjects = defaultSubjects;
  state.cachedValues = cachedValues;
  state.currentUserId = "";
  state.persistenceEnabled = false;
  state.saveQueue = Promise.resolve();
  state.subjects = loadSubjects();
  state.defaultLevels = defaultLevels;
  state.levels = loadLevels();
  state.defaultGroups = defaultGroups;
  state.groups = loadGroups();
  state.educationLevels = educationLevels;
  state.programNames = programNames;
  state.defaultUsers = defaultUsers;
  state.demoStudent = demoStudent;
  state.defaultTeachers = defaultTeachers;
  state.defaultPrograms = defaultPrograms;
  state.defaultActivities = defaultActivities;
  state.defaultNews = defaultNews;
  state.defaultMediaItems = defaultMediaItems;
  state.defaultPublicContent = {
    home: {
      title: "مرحبًا بكم في مشيخة التعليم الزيتوني وفروعه.",
      description:
        "فضاء تعليمي هادئ لتعلم القرآن الكريم والفقه والعقيدة، مع متابعة الدروس والامتحانات حسب مستوى الطالب ومجموعته.",
    },
    about: {
      title: "مؤسسة تعليمية تهتم بنشر العلم الشرعي بلغة سهلة.",
      description:
        "تهدف مشيخة التعليم الزيتوني وفروعه إلى تقريب القرآن والفقه والعقيدة للطلاب بطريقة منظمة، مع الجمع بين الأصالة والوضوح وخدمة المتعلم.",
    },
    pages: {
      teachers: {
        title: "أساتذة متخصصون في العلوم الشرعية.",
        description: "يعتمد المعهد على أساتذة يجمعون بين المعرفة الشرعية والخبرة التربوية.",
      },
      programs: {
        title: "تعلم متدرج يناسب الطالب.",
        description: "تتنوع البرامج بين دروس حضورية، دروس عن بعد، مراجعات، واختبارات تقييمية.",
      },
      activities: {
        title: "محاضرات ودورات ومجالس مراجعة.",
        description: "أنشطة علمية وتربوية تساعد الطالب على تثبيت العلم والتواصل مع أساتذته.",
      },
      news: {
        title: "تابع كل جديد.",
        description: "هنا تجد إعلانات التسجيل، الدورات الجديدة، والتنبيهات المهمة.",
      },
      media: {
        title: "لمحات من الأنشطة التعليمية.",
        description: "مساحة لعرض صور الدروس واللقاءات ومقاطع الفيديو المختارة.",
      },
      register: {
        title: "طلب تسجيل إلكتروني.",
        description: "اختر المستوى والمجموعة حتى يظهر لك المحتوى المناسب بعد قبول الحساب.",
      },
      platform: {
        title: "الدخول إلى المنصة التعليمية.",
        description: "من هنا يصل الطالب إلى الدروس والامتحانات والاستبيانات بعد تسجيل الدخول.",
      },
    },
    contact: {
      address: "مقر المعهد، المدينة التعليمية",
      secondaryAddress: "",
      phone: "98 139 615",
      email: "contact@example.org",
      hours: "من السبت إلى الخميس، 09:00 - 17:00",
    },
    teachers: state.defaultTeachers,
    programs: state.defaultPrograms,
    activities: state.defaultActivities,
    news: state.defaultNews,
    mediaItems: state.defaultMediaItems,
    branches: [],
  };
  state.publicContent = loadPublicContent();
  normalizeInstitutionName();
  state.activityLog = loadActivityLog();
  state.lessonSessionLog = loadLessonSessionLog();
  state.galleryIndex = 0;
  state.defaultCourses = defaultCourses;
  state.courses = loadCourses();
  state.defaultSchedule = defaultSchedule;
  state.schedule = loadSchedule();
  state.scheduleTypes = scheduleTypes;
  state.defaultExams = defaultExams;
  state.demoCorrectionExam = demoCorrectionExam;
  state.exams = loadExams();
  state.demoCorrectionSubmissions = demoCorrectionSubmissions;
  state.demoCorrectedExams = demoCorrectedExams;
  state.demoCorrectedSubmissions = demoCorrectedSubmissions;
  state.demoQuestionnaire = demoQuestionnaire;
  state.demoStudentQuestionnaireSubmission = demoStudentQuestionnaireSubmission;
  state.demoSemesterSubjects = demoSemesterSubjects;
  state.demoSemesterResults = demoSemesterResults;
  state.defaultQuestionnaires = defaultQuestionnaires;
  state.questionnaires = loadQuestionnaires();
  state.demoQuestionnaireSubmissions = demoQuestionnaireSubmissions;
  state.defaultResults = defaultResults;
  state.users = loadUsers();
  state.deletedUserIds = loadDeletedUserIds();
  state.registrationRequests = loadRegistrationRequests();
  state.emailSettings = loadEmailSettings();
  state.currentUser = restoreCachedUser();
  state.activationRequests = new Map();
  state.activationToken = "";
  state.activationUser = null;
  state.subjectRedirects = loadSubjectRedirects();
  state.examSubmissions = loadExamSubmissions();
  state.questionnaireSubmissions = loadQuestionnaireSubmissions();
  state.gradeSettings = loadGradeSettings();
  state.exerciseSubmissions = loadExerciseSubmissions();
  state.teacherAbsences = loadTeacherAbsences();
  state.generalPlans = loadGeneralPlans();
  state.tablePageSize = tablePageSize;
  state.mainElement = document.querySelector("#main");
  state.footerElement = document.querySelector("#site-footer");
  state.menuButton = document.querySelector(".menu-button");
  state.mainMenu = document.querySelector("#main-menu");
  state.toastRegion = document.createElement("div");
  state.saveNotificationsEnabled = false;
  state.sidebarDrag = null;
  state.toastRegion.className = "toast-region";
  state.toastRegion.setAttribute("aria-live", "polite");
  state.toastRegion.setAttribute("aria-atomic", "false");
  document.body.append(state.toastRegion);
  state.runtime = window.__zaytounaAppRuntime || {};
  if (state.runtime.eventController) {
    state.runtime.eventController.abort();
  }
  if (state.runtime.galleryInterval) {
    clearInterval(state.runtime.galleryInterval);
  }
  if (state.runtime.examTimerInterval) {
    clearInterval(state.runtime.examTimerInterval);
  }
  if (state.runtime.zoomRecordingPollTimeout) {
    clearTimeout(state.runtime.zoomRecordingPollTimeout);
  }
  if (state.runtime.lessonStatePollTimeout) {
    clearTimeout(state.runtime.lessonStatePollTimeout);
  }
  if (state.runtime.scheduleStatePollTimeout) {
    clearTimeout(state.runtime.scheduleStatePollTimeout);
  }
  state.runtime.eventController = new AbortController();
  if (!state.runtime.zoomRecordingSyncs) {
    state.runtime.zoomRecordingSyncs = new Set();
  }
  if (!state.runtime.courseAttachmentDrafts) {
    state.runtime.courseAttachmentDrafts = new Map();
  }
  window.__zaytounaAppRuntime = state.runtime;
  state.eventOptions = {
    signal: state.runtime.eventController.signal,
  };
  state.menuButton.addEventListener(
    "click",
    () => {
      const e = state.mainMenu.classList.toggle("open");
      state.menuButton.setAttribute("aria-expanded", String(e));
    },
    state.eventOptions,
  );
  window.addEventListener("hashchange", renderRoute, state.eventOptions);
  window.addEventListener("storage", handleStorageChange, state.eventOptions);
  window.addEventListener("beforeunload", closeTeacherSessions, state.eventOptions);
  document.addEventListener("submit", handleSubmit, state.eventOptions);
  document.addEventListener("change", handleListingFilter, state.eventOptions);
  document.addEventListener("change", handleAttachmentSelection, state.eventOptions);
  document.addEventListener("input", handleExamScheduleInput, state.eventOptions);
  document.addEventListener("change", handleExamScheduleInput, state.eventOptions);
  document.addEventListener("input", handleAdminFilter, state.eventOptions);
  document.addEventListener("change", handleAdminFilter, state.eventOptions);
  document.addEventListener("change", handleUserRoleChange, state.eventOptions);
  document.addEventListener("change", handleAvatarUpload, state.eventOptions);
  document.addEventListener("change", handleScheduleAudienceChange, state.eventOptions);
  document.addEventListener("input", handleScheduleStudentSearch, state.eventOptions);
  document.addEventListener("input", handleTableSearch, state.eventOptions);
  document.addEventListener("change", handleQuestionTypeChange, state.eventOptions);
  document.addEventListener("click", handleClick, state.eventOptions);
  document.addEventListener("pointerdown", startSidebarDrag, state.eventOptions);
  document.addEventListener("pointermove", moveSidebarDrag, state.eventOptions);
  document.addEventListener("pointerup", endSidebarDrag, state.eventOptions);
  document.addEventListener("pointercancel", endSidebarDrag, state.eventOptions);
  document.addEventListener("copy", preventExamClipboard, state.eventOptions);
  document.addEventListener("cut", preventExamClipboard, state.eventOptions);
  document.addEventListener("paste", preventExamClipboard, state.eventOptions);
  document.addEventListener("contextmenu", preventExamClipboard, state.eventOptions);
  state.runtime.galleryInterval = setInterval(() => {
    if (currentRoute() !== "media") return;
    const e = state.publicContent.mediaItems.filter((t) => safeImageUrl(t.image));
    if (!(e.length < 2)) {
      state.galleryIndex = (state.galleryIndex + 1) % e.length;
      renderRoute();
    }
  }, 6e3);
  state.runtime.examTimerInterval = setInterval(updateExamCountdown, 1e3);
  captureActivationToken();
  initializeApplication();
  window.alert = (e) => {
    showToast(e, toastTypeFromMessage(e));
  };
  state.silentStateKeys = new Set([
    "activityLog",
    "correctedExamExamplesSeededV1",
    "examCorrectionExamplesSeeded",
    "examDataResetVersion",
    "ilyasCompletedSemesterWorkV1",
    "ilyasDemoRestoredV1",
    "questionnaireResultExamplesSeededV1",
  ]);
  state.saveMessages = saveMessages;
  state.privateRouteStorageKey = privateRouteStorageKey;
  state.privateRouteLifetime = 720 * 60 * 1e3;
  state.bulletinImages = bulletinImages;
  state.imageCache = new Map();
}
