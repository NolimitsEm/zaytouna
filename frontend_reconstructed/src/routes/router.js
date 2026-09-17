import { registerMissedExams } from "../services/exam-timing.js";
import {
  renderAboutPage,
  renderActivitiesPage,
  renderContactPage,
  renderHomePage,
  renderMediaPage,
  renderNewsPage,
  renderPlatformPage,
  renderProgramsPage,
  renderRegisterPage,
  renderTeachersPage,
} from "../pages/public.js";
import { renderCoursesPage, renderLessonPage, renderLessonPreviewPage } from "../pages/lessons.js";
import {
  renderExamPreviewPage,
  renderExamSessionPage,
  renderExamsPage,
  renderQuestionnairePreviewPage,
  renderQuestionnaireSessionPage,
  renderQuestionnairesPage,
} from "../pages/assessments.js";
import {
  renderAdminAbsencesPage,
  renderAdminPage,
  renderExamCorrectionPage,
  renderExamEditorPage,
  renderExamManagementPage,
  renderExerciseCorrectionPage,
  renderLessonsPage,
  renderQuestionnaireEditorPage,
  renderQuestionnaireManagementPage,
  renderQuestionnaireResultsPage,
  renderUsersPage,
} from "../pages/assessment-management.js";
import { renderCompleteSignupPage, renderLoginPage, renderProfilePage } from "../pages/account.js";
import {
  renderExamPrepPage,
  renderGeneralPlanPage,
  renderGeneralPlansPage,
  renderLessonPrepPage,
  renderStudentBulletinPage,
  renderStudentPage,
  renderStudentResultsPage,
  renderTeacherAbsencePage,
  renderTeacherPage,
} from "../pages/dashboards.js";
import { renderGroupsPage, renderLevelsPage, renderSubjectsPage } from "../pages/catalogs.js";
import { renderSchedulePage } from "../pages/schedule.js";
import { renderAnalyticsPage } from "../pages/grades.js";
import { renderLogsPage } from "../pages/activity.js";
import { state } from "../context/state.js";
import {
  highlightNavigation,
  renderSidebar,
  updateAccountNavigation,
  updateRegistrationNavigation,
} from "../layouts/navigation.js";
import { renderFooter } from "../layouts/footer.js";
import { updateStudentOnlyFields } from "../controllers/filters.js";
import { enhanceTables } from "../components/common/tables.js";
import { recordActivity } from "../services/settings-and-activity.js";
import { scheduleLessonPolling, scheduleStatePolling } from "../services/polling.js";
import { safeJsonParse } from "../utils/json.js";
import { decodeEntityReference, encodeEntityReference } from "../utils/identifiers.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:412976-413188 (Tt). */
function currentRoute() {
  const e = (location.hash || "#home")
    .replace("#", "")
    .split("?")[0]
    .replace(/^\/+|\/+$/g, "");
  const t = e.toLowerCase();
  return (
    {
      cours: "courses",
      course: "courses",
      connexion: "login",
      connection: "login",
    }[t] ||
    e ||
    "home"
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:413188-414478 (we). */
function renderRoute(e = {}) {
  registerMissedExams();
  const t = currentRoute();
  const uniqueValues = new Set([
    "home",
    "about",
    "teachers",
    "programs",
    "activities",
    "news",
    "media",
    "contact",
    "register",
    "platform",
    "login",
    "completeSignup",
  ]);
  const n = (
    {
      home: renderHomePage,
      about: renderAboutPage,
      teachers: renderTeachersPage,
      programs: renderProgramsPage,
      activities: renderActivitiesPage,
      news: renderNewsPage,
      media: renderMediaPage,
      contact: renderContactPage,
      register: renderRegisterPage,
      platform: renderPlatformPage,
      courses: renderCoursesPage,
      lesson: renderLessonPage,
      lessonPreview: renderLessonPreviewPage,
      quran: () => renderCoursesPage("quran"),
      fiqh: () => renderCoursesPage("fiqh"),
      aqida: () => renderCoursesPage("aqida"),
      exams: renderExamsPage,
      examSession: renderExamSessionPage,
      examPreview: renderExamPreviewPage,
      examEditor: renderExamEditorPage,
      examCorrection: renderExamCorrectionPage,
      exerciseCorrection: renderExerciseCorrectionPage,
      questionnaires: renderQuestionnairesPage,
      questionnaireSession: renderQuestionnaireSessionPage,
      questionnairePreview: renderQuestionnairePreviewPage,
      questionnaireEditor: renderQuestionnaireEditorPage,
      questionnaireResults: renderQuestionnaireResultsPage,
      login: renderLoginPage,
      completeSignup: renderCompleteSignupPage,
      profile: renderProfilePage,
      student: renderStudentPage,
      studentBulletin: renderStudentBulletinPage,
      studentResults: renderStudentResultsPage,
      generalPlan: renderGeneralPlanPage,
      teacher: renderTeacherPage,
      teacherAbsence: renderTeacherAbsencePage,
      lessonPrep: renderLessonPrepPage,
      examPrep: renderExamPrepPage,
      admin: renderAdminPage,
      adminAbsences: renderAdminAbsencesPage,
      generalPlans: renderGeneralPlansPage,
      users: renderUsersPage,
      levels: renderLevelsPage,
      groups: renderGroupsPage,
      subjects: renderSubjectsPage,
      schedule: renderSchedulePage,
      lessons: renderLessonsPage,
      examManagement: renderExamManagementPage,
      questionnaireManagement: renderQuestionnaireManagementPage,
      analytics: renderAnalyticsPage,
      logs: renderLogsPage,
    }[t] || renderHomePage
  )();
  const i = !state.currentUser && n.includes("data-login-form") ? "login" : t;
  document.body.dataset.route = i;
  document.body.classList.toggle("public-route", uniqueValues.has(i));
  state.mainMenu.classList.remove("open");
  state.menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("app-sidebar-open");
  highlightNavigation(i);
  updateAccountNavigation();
  state.mainElement.innerHTML = n;
  renderSidebar();
  renderFooter();
  updateRegistrationNavigation();
  updateStudentOnlyFields();
  enhanceTables();
  if (!e.silentActivity) {
    recordActivity(state.currentUser, "activity");
  }
  scheduleLessonPolling(t);
  scheduleStatePolling(t);
  state.mainElement.focus();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:679789-679871 (Pt). */
function routeQuery() {
  const [, e = ""] = location.hash.split("?");
  return new URLSearchParams(e);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:679933-680123 (Wk). */
function readPrivateRouteReferences() {
  try {
    const e = safeJsonParse(sessionStorage.getItem(state.privateRouteStorageKey), {});
    const t = Date.now() - state.privateRouteLifetime;
    return Object.fromEntries(Object.entries(e).filter(([, r]) => r && Number(r.createdAt) >= t));
  } catch {
    return {};
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:680123-680155 (eo). */
function entityReference(e, t) {
  return encodeEntityReference(e, t);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:680155-680261 (Et). */
function entityHref(e, t, r, a = {}) {
  const n = entityReference(t, r);
  const query = new URLSearchParams({
    ref: n,
    ...a,
  });
  return `#${e}?${query.toString()}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:680261-680549 (Dr). */
function resolveEntityReference(e, t = "ref") {
  const r = routeQuery();
  const a = r.get(t);
  if (a) {
    const i = readPrivateRouteReferences()[a];
    return i?.entityType === e ? i.entityId : decodeEntityReference(e, a);
  }
  if (t !== "ref") return "";
  const n = r.get("id") || "";
  if (n) {
    const i = Object.fromEntries([...r.entries()].filter(([s]) => s !== "id"));
    history.replaceState(null, "", entityHref(currentRoute(), e, n, i));
  }
  return n;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:680549-680715 (cl). */
function canonicalizeEntityRoute(e, t, r) {
  const a = routeQuery();
  if (!a.get("id")) return;
  const n = Object.fromEntries([...a.entries()].filter(([i]) => i !== "id"));
  history.replaceState(null, "", entityHref(e, t, r, n));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:680715-680763 (Ha). */
function courseHref(e, t, r = {}) {
  return entityHref(e, "course", t, r);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:680763-680797 (ll). */
function currentCourseId() {
  return resolveEntityReference("course");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:680797-680917 (Vk). */
function formatCountdown(e) {
  const t = Math.max(0, Math.ceil(e / 1e3));
  const r = Math.floor(t / 60);
  const a = t % 60;
  return `${r}:${String(a).padStart(2, "0")}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:719930-720006 (Ri). */
function dashboardRoute(e) {
  return e === "admin" ? "admin" : e === "teacher" ? "teacher" : "student";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:722786-724020 (Xi). */
function routeLabel(e) {
  return (
    {
      home: "الصفحة الرئيسية",
      about: "من نحن",
      teachers: "طاقم الأساتذة",
      programs: "البرامج التعليمية",
      activities: "الأنشطة والفعاليات",
      news: "الأخبار والإعلانات",
      media: "المعرض",
      contact: "اتصل بنا",
      register: "التسجيل",
      platform: "منصة الدرس",
      courses: state.currentUser?.role === "student" ? "مقرراتي الدراسية" : "الدروس",
      lesson: "فتح الدرس",
      lessonPreview: "معاينة الدرس",
      quran: "دروس القرآن",
      fiqh: "دروس الفقه",
      aqida: "دروس العقيدة",
      exams: "الامتحانات",
      examSession: "صفحة الامتحان",
      examPreview: "معاينة الامتحان",
      examEditor: "تعديل الامتحان",
      examCorrection: "تصحيح الامتحان",
      questionnaires: "الاستبيانات",
      questionnaireSession: "صفحة الاستبيان",
      questionnairePreview: "معاينة الاستبيان",
      questionnaireEditor: "تعديل الاستبيان",
      questionnaireResults: "نتائج الاستبيانات",
      student: "لوحة الطالب",
      studentBulletin: "Bulletin de note",
      studentResults: "النتائج",
      teacher: "لوحة الأستاذ",
      lessonPrep: "تحضير الدروس",
      examPrep: "تحضير الامتحانات",
      admin: "لوحة الإدارة",
      users: "إدارة المستخدمين",
      levels: "إدارة المستويات",
      groups: "إدارة المجموعات",
      subjects: "إدارة المواد",
      schedule: "تنظيم الحصص",
      lessons: "إدارة الدروس",
      examManagement: "إدارة الامتحانات",
      questionnaireManagement: "إدارة الاستبيانات",
      analytics: "متابعة النتائج والإحصائيات",
      logs: "سجل الدخول والخروج",
      login: "تسجيل الدخول",
    }[e] ||
    e ||
    "-"
  );
}
