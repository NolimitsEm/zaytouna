# Recovered hash routes

EXACT: custom location.hash router, 51 route keys. No react-router, pathname router or lazy route chunks. Four aliases: cours/course → courses; connexion/connection → login. Leading/trailing slashes are removed; empty hash → home. Unknown route keys render the home content (no distinct 404 page); their body data-route can remain the unknown key.

| URL | Renderer | Module | Access | Query evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| #home | renderHomePage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #about | renderAboutPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #teachers | renderTeachersPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #programs | renderProgramsPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #activities | renderActivitiesPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #news | renderNewsPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #media | renderMediaPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #contact | renderContactPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #register | renderRegisterPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #platform | renderPlatformPage | src/pages/public.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #courses | renderCoursesPage | src/pages/lessons.js | authenticated; role/audience checks in renderer | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #lesson | renderLessonPage | src/pages/lessons.js | authenticated; role/audience checks in renderer | scheduleId | EXACT route; HIGH CONFIDENCE access |
| #lessonPreview | renderLessonPreviewPage | src/pages/lessons.js | admin / teacher, ownership checks | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #quran | renderCoursesPage | src/pages/lessons.js | authenticated; role/audience checks in renderer | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #fiqh | renderCoursesPage | src/pages/lessons.js | authenticated; role/audience checks in renderer | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #aqida | renderCoursesPage | src/pages/lessons.js | authenticated; role/audience checks in renderer | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #exams | renderExamsPage | src/pages/assessments.js | authenticated; role/audience checks in renderer | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #examSession | renderExamSessionPage | src/pages/assessments.js | authenticated; role/audience checks in renderer | scheduleId | EXACT route; HIGH CONFIDENCE access |
| #examPreview | renderExamPreviewPage | src/pages/assessments.js | admin / teacher, ownership checks | scheduleId | EXACT route; HIGH CONFIDENCE access |
| #examEditor | renderExamEditorPage | src/pages/assessment-management.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #examCorrection | renderExamCorrectionPage | src/pages/assessment-management.js | admin | submission | EXACT route; HIGH CONFIDENCE access |
| #exerciseCorrection | renderExerciseCorrectionPage | src/pages/assessment-management.js | admin / teacher, ownership checks | submission | EXACT route; HIGH CONFIDENCE access |
| #questionnaires | renderQuestionnairesPage | src/pages/assessments.js | authenticated; role/audience checks in renderer | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #questionnaireSession | renderQuestionnaireSessionPage | src/pages/assessments.js | authenticated; role/audience checks in renderer | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #questionnairePreview | renderQuestionnairePreviewPage | src/pages/assessments.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #questionnaireEditor | renderQuestionnaireEditorPage | src/pages/assessment-management.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #questionnaireResults | renderQuestionnaireResultsPage | src/pages/assessment-management.js | admin | submission | EXACT route; HIGH CONFIDENCE access |
| #login | renderLoginPage | src/pages/account.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #completeSignup | renderCompleteSignupPage | src/pages/account.js | public | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #profile | renderProfilePage | src/pages/account.js | authenticated; role/audience checks in renderer | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #student | renderStudentPage | src/pages/dashboards.js | student | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #studentBulletin | renderStudentBulletinPage | src/pages/dashboards.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #studentResults | renderStudentResultsPage | src/pages/dashboards.js | student | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #generalPlan | renderGeneralPlanPage | src/pages/dashboards.js | student | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #teacher | renderTeacherPage | src/pages/dashboards.js | teacher (see per-record guards) | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #teacherAbsence | renderTeacherAbsencePage | src/pages/dashboards.js | teacher (see per-record guards) | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #lessonPrep | renderLessonPrepPage | src/pages/dashboards.js | teacher (see per-record guards) | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #examPrep | renderExamPrepPage | src/pages/dashboards.js | teacher (see per-record guards) | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #admin | renderAdminPage | src/pages/assessment-management.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #adminAbsences | renderAdminAbsencesPage | src/pages/assessment-management.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #generalPlans | renderGeneralPlansPage | src/pages/dashboards.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #users | renderUsersPage | src/pages/assessment-management.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #levels | renderLevelsPage | src/pages/catalogs.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #groups | renderGroupsPage | src/pages/catalogs.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #subjects | renderSubjectsPage | src/pages/catalogs.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #schedule | renderSchedulePage | src/pages/schedule.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #lessons | renderLessonsPage | src/pages/assessment-management.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #examManagement | renderExamManagementPage | src/pages/assessment-management.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #questionnaireManagement | renderQuestionnaireManagementPage | src/pages/assessment-management.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |
| #analytics | renderAnalyticsPage | src/pages/grades.js | admin | settings | EXACT route; HIGH CONFIDENCE access |
| #logs | renderLogsPage | src/pages/activity.js | admin | None directly; shared routing helpers may add ref/id/filter parameters | EXACT route; HIGH CONFIDENCE access |

## Shared parameters and redirects

EXACT: entity links encode ref=entityType:entityId using URLSearchParams. Legacy id links are canonicalized with history.replaceState. Entity kinds include course, exam, questionnaire and student. scheduleId links connect lessons/exams/preparation to a schedule. Listing queries: subject, niveau, groupe, search. Other views read panel, student, participant, edit, role, scheduleMonth, settingsNiveau, niveau, groupe. See exhaustive query/attribute strings in the catalog.

EXACT: token from the URL query or hash query is captured in memory, removed from the query and replaced with #completeSignup. Private-route references have a 12-hour filter, but the original helper calls an undefined safeJsonParse; the narrowly documented repair restores its intended parser. Login sends the user to admin/teacher/student; logout returns to home. Unauthorized page renderers show login/account return, not an invented route.


Evidence offsets in these reports are JavaScript UTF-16 character offsets in the named original file, not byte offsets or reconstructed line numbers. EXACT describes surviving values and observed structures, not lost original source.
