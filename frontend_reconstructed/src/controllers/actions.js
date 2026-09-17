import { state } from "../context/state.js";
import { setUserAccess } from "../services/user-management.js";
import {
  awaitSave,
  cacheValue,
  saveCourses,
  saveExamSubmissions,
  saveExams,
  saveGroups,
  saveLevels,
  savePublicContent,
  saveQuestionnaireSubmissions,
  saveQuestionnaires,
  saveRegistrationRequests,
  saveSchedule,
  saveSubjects,
  saveTeacherAbsences,
  saveUsers,
} from "../services/state-repository.js";
import { renderEnrollmentCertificate } from "../pages/account.js";
import { printTeacherPayroll } from "../components/teaching.js";
import {
  courseAttachments,
  draftAttachments,
  refreshDraftAttachments,
} from "../services/attachments.js";
import { safeJsonParse } from "../utils/json.js";
import {
  cancelEvent,
  closeNavigationDropdowns,
  confirmPasswordForAction,
} from "../services/account-actions.js";
import { closeSidebar } from "../layouts/navigation.js";
import { exportSessionLogs } from "../pages/activity.js";
import { createZoomMeeting, syncZoomRecording } from "../services/zoom.js";
import { currentRoute, renderRoute } from "../routes/router.js";
import {
  clearCurrentUser,
  recordActivity,
  saveLessonSessionLog,
} from "../services/settings-and-activity.js";
import { postJson } from "../services/http.js";
import {
  canOpenLessonConference,
  isLessonPublished,
  lessonConferenceUrl,
  lessonSessionAvailability,
  openLessonSession,
  openPdfAttachment,
} from "../pages/lessons.js";
import { exportQuestionnaireResults } from "../services/exports.js";
import {
  bulletinReadiness,
  canDownloadBulletin,
  distributeBulletins,
} from "../pages/grades.js";
import { downloadStudentBulletin } from "../components/bulletins.js";
import {
  renderExamBuilderOption,
  renderExamBuilderQuestion,
  renderQuestionnaireBuilderOption,
  renderQuestionnaireBuilderQuestion,
} from "../pages/assessment-management.js";
import {
  renumberExamBuilder,
  renumberQuestionnaireBuilder,
} from "../components/question-builders.js";
import { paginateTable, paginationTable } from "../components/common/tables.js";
import {
  canEditCourse,
  canManageExam,
  isCourseTeacher,
  isExamOwner,
  isExamPublished,
} from "../utils/content-access.js";
import {
  deleteGroup,
  deleteLevel,
  deleteSubject,
} from "../services/catalog-management.js";
import {
  acceptRegistration,
  deleteRegistration,
  deleteUser,
  editUser,
  enableUser,
  rejectRegistration,
  resetUserPassword,
  toggleUserDisabled,
  updateStudentPayment,
} from "../services/user-management.js";
import { movePublicItem } from "../services/public-content.js";
import { safeImageUrl } from "../utils/formatters.js";
import { showToast } from "../components/common/toasts.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:631704-632284 (gh). */
async function requestTeacherAbsence(e, t = "") {
  const course = state.schedule.find((n) => String(n.id) === String(e));
  if (
    !course ||
    state.currentUser?.role !== "teacher" ||
    String(course.teacherId) !== String(state.currentUser.id)
  ) {
    alert("لا يمكن التصريح بهذا الغياب.");
    return false;
  }
  if (!confirm("إرسال طلب الغياب إلى الإدارة للموافقة؟")) return false;
  const a = structuredClone(state.teacherAbsences);
  state.teacherAbsences = [
    ...state.teacherAbsences.filter(
      (n) => String(n.scheduleId) !== String(course.id),
    ),
    {
      id: `absence-${course.id}`,
      scheduleId: course.id,
      teacherId: state.currentUser.id,
      date: course.date,
      reason: String(t || "").trim(),
      status: "pending",
      declaredAt: new Date().toISOString(),
    },
  ];
  return (await awaitSave(saveTeacherAbsences()))
    ? ((location.hash = "teacher"), true)
    : ((state.teacherAbsences = a),
      cacheValue("teacherAbsences", JSON.stringify(state.teacherAbsences)),
      false);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:632284-644957 (qA). */
async function handleClick(event) {
  if (event.target.closest("[data-print-enrollment-certificate]")) {
    if (state.currentUser?.role === "student") {
      renderEnrollmentCertificate(state.currentUser);
    }
    return;
  }
  if (event.target.closest("[data-download-teacher-payroll]")) {
    event.preventDefault();
    printTeacherPayroll();
    return;
  }
  const element = event.target.closest("[data-remove-new-attachment]");
  if (element) {
    const K = element.dataset.removeNewAttachment;
    const te = Number(element.dataset.attachmentIndex);
    const items = draftAttachments(K);
    if (Number.isInteger(te) && te >= 0) {
      state.runtime.courseAttachmentDrafts.set(
        K,
        items.filter((ut, fe) => fe !== te),
      );
      refreshDraftAttachments(K);
    }
    return;
  }
  const element2 = event.target.closest("[data-remove-saved-attachment]");
  if (element2) {
    const formElement = document.getElementById(
      element2.dataset.attachmentForm,
    );
    const te = formElement?.querySelector(
      'input[name="removedAttachmentIndexes"]',
    );
    const Ie = Number(element2.dataset.attachmentIndex);
    if (!te || !Number.isInteger(Ie) || Ie < 0) return;
    const uniqueValues = new Set(safeJsonParse(te.value, []).map(Number));
    uniqueValues.add(Ie);
    te.value = JSON.stringify([...uniqueValues]);
    element2.closest("[data-saved-attachment-index]")?.remove();
    const formElement2 = formElement.querySelector(
      "[data-saved-course-attachments]",
    );
    if (
      formElement2 &&
      !formElement2.querySelector("[data-saved-attachment-index]")
    ) {
      formElement2.innerHTML =
        '<p class="muted course-attachment-empty">لا توجد ملفات محفوظة.</p>';
    }
    return;
  }
  const element3 = event.target.closest("[data-toggle-public-detail]");
  if (element3) {
    const K = document.getElementById(element3.dataset.togglePublicDetail);
    if (!K) return;
    const element46 = document.createElement("dialog");
    element46.className = "public-detail-dialog";
    const element47 = document.createElement("div");
    element47.className = "public-detail-dialog-head";
    const element48 = document.createElement("h2");
    element48.textContent = "تفاصيل النشاط";
    const element49 = document.createElement("button");
    element49.type = "button";
    element49.className = "public-detail-dialog-close";
    element49.textContent = "إغلاق";
    element49.addEventListener("click", () => element46.close());
    element47.append(element48, element49);
    const element50 = document.createElement("div");
    element50.className = "public-detail-dialog-content";
    element50.textContent = K.textContent || "";
    element46.append(element47, element50);
    element46.addEventListener("click", (ce) => {
      const Ut = element46.getBoundingClientRect();
      if (
        ce.clientX < Ut.left ||
        ce.clientX > Ut.right ||
        ce.clientY < Ut.top ||
        ce.clientY > Ut.bottom
      ) {
        element46.close();
      }
    });
    element46.addEventListener("close", () => element46.remove(), {
      once: true,
    });
    document.body.append(element46);
    element46.showModal();
    return;
  }
  const element4 = event.target.closest(".nav-dropdown summary");
  if (element4) {
    const K = element4.closest(".nav-dropdown");
    document.querySelectorAll(".nav-dropdown[open]").forEach((te) => {
      if (te !== K) {
        te.removeAttribute("open");
      }
    });
    return;
  }
  if (event.target.closest(".nav-dropdown-menu a")) {
    closeNavigationDropdowns();
    return;
  }
  if (!event.target.closest(".nav-shell")) {
    closeNavigationDropdowns();
  }
  const element5 = event.target.closest("[data-toggle-app-sidebar]");
  if (element5) {
    if (element5.dataset.suppressSidebarToggleClick === "true") {
      delete element5.dataset.suppressSidebarToggleClick;
      return;
    }
    const K = document.body.classList.toggle("app-sidebar-open");
    element5.setAttribute("aria-expanded", String(K));
    return;
  }
  if (event.target.closest("[data-close-app-sidebar]")) {
    closeSidebar();
    return;
  }
  if (event.target.closest(".app-sidebar a")) {
    closeSidebar();
  }
  const element6 = event.target.closest("[data-export-log]");
  if (element6) {
    exportSessionLogs(element6.dataset.exportLog);
    return;
  }
  const l = event.target.closest("[data-create-zoom-meeting]");
  if (l) {
    event.preventDefault();
    createZoomMeeting(l);
    return;
  }
  const d = event.target.closest("[data-open-lesson-conference]");
  if (d) {
    event.preventDefault();
    openLessonConference(d);
    return;
  }
  const element7 = event.target.closest("[data-end-lesson-conference]");
  if (element7) {
    event.preventDefault();
    await endLessonConference(element7.dataset.endLessonConference, element7);
    return;
  }
  const element8 = event.target.closest("[data-declare-absence]");
  if (element8) {
    await requestTeacherAbsence(element8.dataset.declareAbsence);
    return;
  }
  const element9 = event.target.closest("[data-approve-absence]");
  if (element9) {
    if (state.currentUser?.role !== "admin") return;
    const K = state.teacherAbsences.find(
      (te) => String(te.id) === String(element9.dataset.approveAbsence),
    );
    if (!K || K.status === "approved") return;
    K.status = "approved";
    K.approvedAt = new Date().toISOString();
    K.approvedBy = state.currentUser.id;
    if (await awaitSave(saveTeacherAbsences())) {
      renderRoute();
    }
    return;
  }
  const element10 = event.target.closest("[data-reject-absence]");
  if (element10) {
    if (state.currentUser?.role !== "admin") return;
    const K = state.teacherAbsences.find(
      (te) => String(te.id) === String(element10.dataset.rejectAbsence),
    );
    if (!K || K.status === "approved") return;
    K.status = "rejected";
    K.rejectedAt = new Date().toISOString();
    K.rejectedBy = state.currentUser.id;
    if (await awaitSave(saveTeacherAbsences())) {
      renderRoute();
    }
    return;
  }
  if (event.target.closest("[data-logout]")) {
    closeTeacherSessions();
    recordActivity(state.currentUser, "logout");
    postJson("/api/auth/logout", {}).catch((K) => {
      console.warn("Session logout failed:", K.message);
    });
    clearCurrentUser();
    closeSidebar();
    if (currentRoute() === "home") {
      renderRoute();
    } else {
      location.hash = "home";
    }
    return;
  }
  const element11 = event.target.closest("[data-open-pdf]");
  if (element11) {
    const K = state.courses.find(
      (Ie) => String(Ie.id) === String(element11.dataset.openPdf),
    );
    const te = courseAttachments(K || {})[
      Number(element11.dataset.fileIndex) || 0
    ];
    openPdfAttachment(te);
    return;
  }
  const element12 = event.target.closest("[data-open-general-plan]");
  if (element12) {
    const K = state.generalPlans.find(
      (te) => String(te.id) === String(element12.dataset.openGeneralPlan),
    );
    openPdfAttachment(
      K
        ? {
            url: K.fileUrl,
          }
        : null,
    );
    return;
  }
  const element13 = event.target.closest("[data-export-questionnaire-results]");
  if (element13) {
    exportQuestionnaireResults(
      Number(element13.dataset.exportQuestionnaireResults),
    );
    return;
  }
  const element14 = event.target.closest("[data-download-student-bulletin]");
  if (element14) {
    const K = element14.dataset.downloadStudentBulletin;
    const te = state.users.find(
      (user) => String(user.id) === String(K) && user.role === "student",
    );
    if (
      !te ||
      (state.currentUser?.role !== "admin" &&
        (state.currentUser?.role !== "student" ||
          String(state.currentUser.id) !== String(K)))
    )
      return;
    if (state.currentUser?.role === "student" && !canDownloadBulletin(te)) {
      alert("كشف الأعداد لم يتم توزيعه بعد من الإدارة.");
      return;
    }
    if (
      state.currentUser?.role === "student" &&
      !bulletinReadiness(te).isComplete
    ) {
      alert("كشف الأعداد يتفعّل بعد اكتمال كل الأعداد وتصحيح كل الامتحانات.");
      return;
    }
    downloadStudentBulletin(te);
    return;
  }
  const element15 = event.target.closest("[data-distribute-class-bulletins]");
  if (element15) {
    if (element15.disabled) return;
    if (await distributeBulletins(element15.dataset.distributeClassBulletins)) {
      renderRoute();
    }
    return;
  }
  const element16 = event.target.closest("[data-add-exam-question]");
  if (element16) {
    const formElement = element16.closest("[data-exam-question-builder]");
    const te = formElement?.querySelector(".exam-builder-list");
    if (!formElement || !te) return;
    te.insertAdjacentHTML(
      "beforeend",
      renderExamBuilderQuestion(
        {
          type: "text",
          text: "",
          points: 1,
          options: [],
          correctAnswer: "",
        },
        te.children.length,
        formElement.dataset.examQuestionBuilder || "",
      ),
    );
    renumberExamBuilder(formElement);
    return;
  }
  const element17 = event.target.closest("[data-remove-exam-question]");
  if (element17) {
    const K = element17.closest("[data-exam-question-builder]");
    const te = element17.closest("[data-exam-builder-question]");
    if (
      (K?.querySelectorAll("[data-exam-builder-question]").length || 0) <= 1
    ) {
      alert("يجب أن يبقى سؤال واحد على الأقل.");
      return;
    }
    te?.remove();
    renumberExamBuilder(K);
    return;
  }
  const element18 = event.target.closest("[data-add-exam-option]");
  if (element18) {
    const te = element18
      .closest("[data-question-options]")
      ?.querySelector(".exam-option-list");
    if (!te) return;
    te.insertAdjacentHTML(
      "beforeend",
      renderExamBuilderOption("", te.children.length, false),
    );
    return;
  }
  const element19 = event.target.closest("[data-remove-exam-option]");
  if (element19) {
    if (
      (element19
        .closest(".exam-option-list")
        ?.querySelectorAll("[data-exam-option]").length || 0) <= 2
    ) {
      alert("QCM يحتاج اختيارين على الأقل.");
      return;
    }
    element19.closest("[data-exam-option]")?.remove();
    return;
  }
  const element20 = event.target.closest("[data-add-questionnaire-question]");
  if (element20) {
    const formElement = element20.closest(
      "[data-questionnaire-question-builder]",
    );
    const te = formElement?.querySelector(".exam-builder-list");
    if (!formElement || !te) return;
    te.insertAdjacentHTML(
      "beforeend",
      renderQuestionnaireBuilderQuestion(
        {
          type: "text",
          text: "",
          options: [],
        },
        te.children.length,
        formElement.dataset.questionnaireQuestionBuilder || "",
      ),
    );
    renumberQuestionnaireBuilder(formElement);
    return;
  }
  const element21 = event.target.closest(
    "[data-remove-questionnaire-question]",
  );
  if (element21) {
    const K = element21.closest("[data-questionnaire-question-builder]");
    const te = element21.closest("[data-questionnaire-builder-question]");
    if (
      (K?.querySelectorAll("[data-questionnaire-builder-question]").length ||
        0) <= 1
    ) {
      alert("يجب أن يبقى سؤال واحد على الأقل.");
      return;
    }
    te?.remove();
    renumberQuestionnaireBuilder(K);
    return;
  }
  const element22 = event.target.closest("[data-add-questionnaire-option]");
  if (element22) {
    const te = element22
      .closest("[data-questionnaire-question-options]")
      ?.querySelector(".exam-option-list");
    if (!te) return;
    te.insertAdjacentHTML(
      "beforeend",
      renderQuestionnaireBuilderOption("", te.children.length),
    );
    return;
  }
  const element23 = event.target.closest("[data-remove-questionnaire-option]");
  if (element23) {
    if (
      (element23
        .closest(".exam-option-list")
        ?.querySelectorAll("[data-questionnaire-option]").length || 0) <= 2
    ) {
      alert("Checklist يحتاج اختيارين على الأقل.");
      return;
    }
    element23.closest("[data-questionnaire-option]")?.remove();
    return;
  }
  const element24 = event.target.closest("[data-table-page]");
  if (element24) {
    const element46 = paginationTable(element24);
    if (!element46) return;
    const te = element24.dataset.tablePage === "next" ? 1 : -1;
    paginateTable(element46, Number(element46.dataset.currentPage || 1) + te);
    return;
  }
  const element25 = event.target.closest("[data-delete-course]");
  const element26 = event.target.closest("[data-publish-course]");
  const element27 = event.target.closest("[data-publish-exam]");
  if (element27) {
    const K = state.exams.find(
      (Ie) => String(Ie.id) === String(element27.dataset.publishExam),
    );
    if (
      state.currentUser?.role !== "teacher" ||
      !isExamOwner(K, state.currentUser.id)
    ) {
      alert("لا يمكنك نشر امتحان تابع لأستاذ آخر.");
      return;
    }
    if (
      isExamPublished(K) ||
      !confirm(
        "هل راجعت الامتحان؟ بعد النشر سيظهر للطلبة المستهدفين في قائمة الامتحانات.",
      )
    )
      return;
    const te = structuredClone(state.exams);
    if (
      ((K.publishedToStudents = true),
      (K.publishedAt = new Date().toISOString()),
      (K.publishedBy = state.currentUser.id),
      !(await awaitSave(saveExams())))
    ) {
      state.exams = te;
      cacheValue("managedExams", JSON.stringify(state.exams));
      return;
    }
    renderRoute();
    return;
  }
  if (element26) {
    const K = state.courses.find(
      (Ie) => String(Ie.id) === String(element26.dataset.publishCourse),
    );
    if (
      state.currentUser?.role !== "teacher" ||
      !isCourseTeacher(K, state.currentUser.id)
    ) {
      alert("لا يمكنك نشر درس تابع لأستاذ آخر.");
      return;
    }
    if (
      isLessonPublished(K) ||
      !confirm(
        "هل راجعت الدرس؟ بعد النشر سيظهر زر فتح الدرس للطلبة المستهدفين.",
      )
    )
      return;
    const te = structuredClone(state.courses);
    if (
      ((K.publishedToStudents = true),
      (K.publishedAt = new Date().toISOString()),
      (K.publishedBy = state.currentUser.id),
      !(await awaitSave(saveCourses())))
    ) {
      state.courses = te;
      cacheValue("teacherCourses", JSON.stringify(state.courses));
      return;
    }
    renderRoute();
    return;
  }
  if (element25) {
    cancelEvent(event);
    const K = String(element25.dataset.deleteCourse);
    const te = state.courses.find((Ie) => String(Ie.id) === K);
    if (!canEditCourse(te)) {
      alert("لا يمكنك حذف درس تابع لأستاذ آخر.");
      return;
    }
    if (
      !confirm("هل تريد حذف هذا الدرس؟") ||
      !(await confirmPasswordForAction("حذف الدرس"))
    )
      return;
    const previous = state.courses;
    state.courses = state.courses.filter((Ie) => String(Ie.id) !== K);
    if (!(await awaitSave(saveCourses()))) {
      state.courses = previous;
      cacheValue("teacherCourses", JSON.stringify(previous));
      return;
    }
    renderRoute();
    return;
  }
  const element28 = event.target.closest("[data-delete-exam]");
  if (element28) {
    if (
      (cancelEvent(event),
      !["admin", "teacher"].includes(state.currentUser?.role))
    )
      return;
    const K = state.exams.find(
      (Ie) => String(Ie.id) === String(element28.dataset.deleteExam),
    );
    if (!canManageExam(K)) {
      alert("لا يمكنك حذف امتحان تابع لأستاذ آخر.");
      return;
    }
    if (
      !confirm("هل تريد حذف هذا الامتحان؟") ||
      !(await confirmPasswordForAction("حذف الامتحان"))
    )
      return;
    const te = String(element28.dataset.deleteExam);
    if (
      ((state.exams = state.exams.filter((Ie) => String(Ie.id) !== te)),
      (state.examSubmissions = state.examSubmissions.filter(
        (Ie) => String(Ie.examId) !== te,
      )),
      saveExams(),
      saveExamSubmissions(),
      currentRoute() === "examEditor")
    ) {
      location.hash =
        state.currentUser.role === "admin" ? "examManagement" : "examPrep";
      return;
    }
    renderRoute();
    return;
  }
  const element29 = event.target.closest("[data-delete-questionnaire]");
  if (element29) {
    if (
      (cancelEvent(event),
      !confirm("هل تريد حذف هذا الاستبيان؟") ||
        !(await confirmPasswordForAction("حذف الاستبيان")))
    )
      return;
    const K = Number(element29.dataset.deleteQuestionnaire);
    state.questionnaires = state.questionnaires.filter((te) => te.id !== K);
    state.questionnaireSubmissions = state.questionnaireSubmissions.filter(
      (te) => Number(te.questionnaireId) !== K,
    );
    saveQuestionnaires();
    saveQuestionnaireSubmissions();
    renderRoute();
    return;
  }
  const element30 = event.target.closest("[data-delete-level]");
  if (element30) {
    if ((cancelEvent(event), !(await confirmPasswordForAction("حذف المستوى"))))
      return;
    const previous = structuredClone(state.levels);
    deleteLevel(element30.dataset.deleteLevel);
    if (!(await awaitSave(saveLevels()))) {
      state.levels = previous;
      cacheValue("managedNiveaux", JSON.stringify(previous));
      return;
    }
    renderRoute();
    return;
  }
  const element31 = event.target.closest("[data-delete-group]");
  if (element31) {
    if ((cancelEvent(event), !(await confirmPasswordForAction("حذف الفوج"))))
      return;
    const previous = structuredClone(state.groups);
    deleteGroup(element31.dataset.deleteGroup);
    if (!(await awaitSave(saveGroups()))) {
      state.groups = previous;
      cacheValue("managedGroupes", JSON.stringify(previous));
      return;
    }
    renderRoute();
    return;
  }
  const element32 = event.target.closest("[data-delete-subject]");
  if (element32) {
    if ((cancelEvent(event), !(await confirmPasswordForAction("حذف المادة"))))
      return;
    deleteSubject(element32.dataset.deleteSubject);
    saveSubjects();
    renderRoute();
    return;
  }
  const element33 = event.target.closest("[data-delete-schedule]");
  if (element33) {
    if (
      (cancelEvent(event),
      !confirm("هل تريد حذف هذه الحصة؟") ||
        !(await confirmPasswordForAction("حذف الحصة")))
    )
      return;
    state.schedule = state.schedule.filter(
      (K) => K.id !== Number(element33.dataset.deleteSchedule),
    );
    saveSchedule();
    renderRoute();
    return;
  }
  const element34 = event.target.closest("[data-accept-registration]");
  if (element34) {
    acceptRegistration(element34.dataset.acceptRegistration);
    saveRegistrationRequests();
    saveUsers();
    renderRoute();
    return;
  }
  const element35 = event.target.closest("[data-reject-registration]");
  if (element35) {
    rejectRegistration(element35.dataset.rejectRegistration);
    saveRegistrationRequests();
    renderRoute();
    return;
  }
  const element36 = event.target.closest("[data-delete-registration]");
  if (element36) {
    if (
      (cancelEvent(event),
      !(await confirmPasswordForAction("حذف مطلب التسجيل")))
    )
      return;
    deleteRegistration(element36.dataset.deleteRegistration);
    saveRegistrationRequests();
    renderRoute();
    return;
  }
  const De = event.target.closest("[data-select-all-users]");
  if (De) {
    state.mainElement
      .querySelectorAll("[data-user-select]:not(:disabled)")
      .forEach((K) => {
        K.checked = De.checked;
      });
    return;
  }
  if (event.target.closest("[data-activate-selected-users]")) {
    const K = [
      ...state.mainElement.querySelectorAll("[data-user-select]:checked"),
    ].map((te) => te.value);
    if (!K.length) {
      alert("اختر حسابًا واحدًا على الأقل.");
      return;
    }
    try {
      for (const te of K) await enableUser(te);
      saveUsers();
      renderRoute();
    } catch (error) {
      alert(`تعذر تحديث الحسابات: ${error.message}`);
    }
    return;
  }
  const element37 = event.target.closest("[data-payment-toggle]");
  if (element37) {
    updateStudentPayment(
      element37.dataset.paymentUser,
      element37.dataset.paymentField,
      element37.checked,
    );
    saveUsers();
    renderRoute();
    return;
  }
  const element38 = event.target.closest("[data-send-activation]");
  if (element38) {
    try {
      await enableUser(element38.dataset.sendActivation);
      saveUsers();
      renderRoute();
    } catch (error) {
      alert(`تعذر إرسال التفعيل: ${error.message}`);
    }
    return;
  }
  const element39 = event.target.closest("[data-edit-user]");
  if (element39) {
    editUser(element39.dataset.editUser);
    saveUsers();
    renderRoute();
    return;
  }
  const element40 = event.target.closest("[data-password-user]");
  if (element40) {
    resetUserPassword(element40.dataset.passwordUser);
    saveUsers();
    renderRoute();
    return;
  }
  const unlockButton = event.target.closest("[data-unlock-user]");
  if (unlockButton) {
    if (unlockButton.disabled) return;
    unlockButton.disabled = true;
    try {
      await setUserAccess(unlockButton.dataset.unlockUser, false);
      alert(
        "تم رفع حظر الدخول دون تغيير كلمة المرور أو إعادة إرسال إيميل التفعيل.",
      );
      renderRoute();
    } catch (error) {
      alert(`تعذر رفع الحظر: ${error.message}`);
    } finally {
      unlockButton.disabled = false;
    }
    return;
  }
  const element41 = event.target.closest("[data-toggle-user]");
  if (element41) {
    if (element41.disabled) return;
    element41.disabled = true;
    try {
      await toggleUserDisabled(element41.dataset.toggleUser);
      renderRoute();
    } catch (error) {
      alert(`تعذر تغيير حالة الحساب: ${error.message}`);
    } finally {
      element41.disabled = false;
    }
    return;
  }
  const element42 = event.target.closest("[data-delete-user]");
  if (element42) {
    if ((cancelEvent(event), !(await confirmPasswordForAction("حذف المستخدم"))))
      return;
    deleteUser(element42.dataset.deleteUser);
    saveUsers();
    renderRoute();
    return;
  }
  const element43 = event.target.closest("[data-delete-public-item]");
  if (element43) {
    if (
      (cancelEvent(event),
      !(await confirmPasswordForAction("حذف محتوى من الواجهة")))
    )
      return;
    const K = element43.dataset.deletePublicItem;
    const te = Number(element43.dataset.deleteIndex);
    state.publicContent[K].splice(te, 1);
    savePublicContent();
    renderRoute();
    return;
  }
  const element44 = event.target.closest("[data-move-public-item]");
  if (element44) {
    const K = element44.dataset.movePublicItem;
    const te = Number(element44.dataset.moveIndex);
    const Ie = element44.dataset.moveDirection;
    movePublicItem(K, te, Ie);
    savePublicContent();
    renderRoute();
    return;
  }
  if (event.target.closest("[data-reset-public-content]")) {
    if (
      (cancelEvent(event),
      !confirm("هل تريد استرجاع المحتوى الأصلي؟") ||
        !(await confirmPasswordForAction("استرجاع المحتوى الأصلي")))
    )
      return;
    state.publicContent = structuredClone(state.defaultPublicContent);
    savePublicContent();
    renderRoute();
    return;
  }
  const _e = state.publicContent.mediaItems.filter((K) =>
    safeImageUrl(K.image),
  );
  if (event.target.closest("[data-gallery-next]") && _e.length) {
    state.galleryIndex = (state.galleryIndex + 1) % _e.length;
    renderRoute();
    return;
  }
  if (event.target.closest("[data-gallery-prev]") && _e.length) {
    state.galleryIndex = (state.galleryIndex - 1 + _e.length) % _e.length;
    renderRoute();
    return;
  }
  const element45 = event.target.closest("[data-gallery-dot]");
  if (element45) {
    state.galleryIndex = Number(element45.dataset.galleryDot);
    renderRoute();
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:644957-646149 (jA). */
async function openLessonConference(element) {
  const t = state.courses.find(
    (s) => String(s.id) === String(element.dataset.openLessonConference),
  );
  const r = lessonSessionAvailability(t);
  if (!canOpenLessonConference(t, r)) {
    alert(r.message || "الحصة غير مفتوحة الآن.");
    return;
  }
  let a = lessonConferenceUrl(t) || element.getAttribute("href") || "";
  if (!a) return;
  const date = new Date();
  if (!canEditCourse(t) || !t) {
    const s = window.open(a, "_blank");
    try {
      if (s) {
        s.opener = null;
      }
    } catch {}
    if (!s) {
      location.href = a;
    }
    return;
  }
  const i = window.open("about:blank", "_blank");
  try {
    if (i) {
      i.opener = null;
    }
  } catch {}
  if (t.zoomMeetingId) {
    try {
      const response = await postJson("/api/zoom/meetings/start-link", {
        courseId: t.id,
      });
      if (!response.startUrl) throw new Error("لم يرجع Zoom رابط المضيف.");
      a = response.startUrl;
    } catch (error) {
      if (i) i.close();
      alert(`تعذر فتح Zoom: ${error.message}`);
      return;
    }
  }
  if (state.currentUser?.role === "admin") {
    if (i) i.location.href = a;
    else location.href = a;
    return;
  }
  if (state.currentUser?.role === "teacher" && t) {
    const s = openLessonSession(t);
    if (s) {
      const c = s.conferenceUrl;
      if (((s.conferenceUrl = a), !(await awaitSave(saveLessonSessionLog())))) {
        s.conferenceUrl = c;
        cacheValue("lessonSessionLog", JSON.stringify(state.lessonSessionLog));
        if (i) {
          i.close();
        }
        return;
      }
      renderRoute();
      if (i) {
        i.location.href = a;
        watchConferenceWindow(i, s.id);
      } else {
        location.href = a;
      }
      return;
    }
    const o = {
      id: `lesson-session-${state.currentUser.id}-${t.id}-${date.getTime()}`,
      teacherId: state.currentUser.id,
      teacherName: state.currentUser.name,
      courseId: t.id,
      courseTitle: t.title,
      subjectId: t.subjectId,
      niveauId: t.niveauId,
      groupeId: t.groupeId || null,
      scheduleId: t.scheduleId || null,
      conferenceUrl: a,
      openedAt: date.toISOString(),
      closedAt: "",
      status: i ? "مفتوح" : "غير مؤكد",
    };
    if (
      (state.lessonSessionLog.unshift(o),
      (state.lessonSessionLog = state.lessonSessionLog.slice(0, 200)),
      !(await awaitSave(saveLessonSessionLog())))
    ) {
      state.lessonSessionLog = state.lessonSessionLog.filter(
        (c) => c.id !== o.id,
      );
      cacheValue("lessonSessionLog", JSON.stringify(state.lessonSessionLog));
      if (i) {
        i.close();
      }
      return;
    }
    renderRoute();
    if (i) {
      i.location.href = a;
      watchConferenceWindow(i, o.id);
    }
  }
  if (!i) {
    location.href = a;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:646149-646232 (H0). */
function watchConferenceWindow(e, t) {
  const r = setInterval(() => {
    if (e.closed) {
      clearInterval(r);
      closeLessonSession(t);
    }
  }, 3e3);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:646232-646373 (xh). */
function closeLessonSession(e) {
  const t = state.lessonSessionLog.find((r) => r.id === e);
  if (!(!t || t.closedAt)) {
    t.closedAt = new Date().toISOString();
    t.status = "مغلق";
    saveLessonSessionLog();
    if (currentRoute() === "lesson") {
      renderRoute();
    }
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:646373-646974 (zA). */
async function endLessonConference(e, t) {
  const r = state.courses.find((i) => String(i.id) === String(e));
  if (!r || state.currentUser?.role !== "teacher") return;
  const a = openLessonSession(r);
  const n = t?.textContent || "إنهاء الحصّة";
  if (t) {
    t.disabled = true;
    t.textContent = "جاري إنهاء الحصّة...";
  }
  try {
    await postJson("/api/zoom/meetings/end", {
      courseId: r.id,
      meetingId: r.zoomMeetingId || "",
      uuid: r.zoomMeetingUuid || "",
    });
    r.lessonEndedAt = new Date().toISOString();
    r.zoomRecordingStatus = "processing";
    if (a) {
      closeLessonSession(a.id);
    }
    await saveCourses();
    showToast(
      "تم إنهاء الحصّة. أُغلق الرابط وبدأ تجهيز التسجيل للأستاذ والطلبة.",
      "success",
    );
    renderRoute();
    await syncZoomRecording(r);
  } catch (i) {
    alert(`تعذر إنهاء الحصّة: ${i.message}`);
    if (t) {
      t.disabled = false;
      t.textContent = n;
    }
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:646974-647159 (vh). */
function closeTeacherSessions() {
  if (state.currentUser?.role !== "teacher") return;
  let e = false;
  state.lessonSessionLog.forEach((course) => {
    if (
      !(
        String(course.teacherId) !== String(state.currentUser.id) ||
        course.closedAt
      )
    ) {
      course.closedAt = new Date().toISOString();
      course.status = "مغلق";
      e = true;
    }
  });
  if (e) {
    saveLessonSessionLog();
  }
}
