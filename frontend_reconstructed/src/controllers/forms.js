import { postJson } from "../services/http.js";
import {
  readEmailSettingsForm,
  saveEmailSettings,
  setCurrentUser,
  validatePassword,
} from "../services/auth.js";
import {
  awaitSave,
  cacheValue,
  fetchApplicationState,
  refreshExams,
  saveCourses,
  saveEmailSettingsCache,
  saveExamSubmissions,
  saveExams,
  saveExerciseSubmissions,
  saveGeneralPlans,
  saveGroups,
  saveLevels,
  savePublicContent,
  saveQuestionnaires,
  saveSchedule,
  saveStateBatch,
  saveSubjects,
  saveTeacherAbsences,
  saveUsers,
} from "../services/state-repository.js";
import { currentRoute, dashboardRoute, renderRoute } from "../routes/router.js";
import { state } from "../context/state.js";
import {
  readGradeSettingsForm,
  recordActivity,
  saveGradeSettings,
} from "../services/settings-and-activity.js";
import { showToast } from "../components/common/toasts.js";
import { mergeActivationUser, updateCurrentUser } from "../pages/account.js";
import { registrationPayload } from "../services/account-actions.js";
import { importAccounts } from "../services/account-import.js";
import { createUser } from "../services/user-management.js";
import {
  clearDraftAttachments,
  readExerciseFile,
  readFileDataUrl,
} from "../services/attachments.js";
import { requestTeacherAbsence } from "./actions.js";
import { canAccessLesson } from "../pages/lessons.js";
import { validateZoomSchedule } from "../services/zoom.js";
import {
  addCourse,
  addExam,
  addQuestionnaire,
  editCourse,
  editExam,
  editQuestionnaire,
  reconcileExamSubmissions,
} from "../services/teaching-management.js";
import { canEditCourse, canManageExam } from "../utils/content-access.js";
import {
  saveManualCorrection,
  submitExam,
  submitQuestionnaire,
} from "../services/results.js";
import {
  addGroup,
  addLevel,
  addSubject,
  editGroup,
  editLevel,
  editSubject,
} from "../services/catalog-management.js";
import {
  addSchedule,
  editSchedule,
  nextScheduleId,
} from "../services/schedule-management.js";
import { publicTypeSupportsImage } from "../components/content-management.js";
import {
  createPublicItem,
  optionalFileDataUrl,
  updatePublicItem,
} from "../services/public-content.js";

async function persistCourseForm(form, id) {
  if (form.dataset.saving || !validateZoomSchedule(form, { optional: true }))
    return;
  const data = new FormData(form);
  const previous = structuredClone(state.courses);
  const buttons = [...form.querySelectorAll("button")].map((button) => [
    button,
    button.disabled,
  ]);
  form.dataset.saving = "true";
  buttons.forEach(([button]) => {
    button.disabled = true;
  });
  try {
    if (id == null) await addCourse(data);
    else await editCourse(id, data);
    await saveCourses();
    clearDraftAttachments(data.get("attachmentDraftKey"));
    renderRoute();
  } catch (error) {
    state.courses = previous;
    cacheValue("teacherCourses", JSON.stringify(previous));
    showToast(`تعذر حفظ الدرس: ${error.message}`, "error");
  } finally {
    delete form.dataset.saving;
    buttons.forEach(([button, disabled]) => {
      button.disabled = disabled;
    });
  }
}

async function persistCatalogForm(form, property, key, mutate, save) {
  if (form.dataset.saving) return;
  form.dataset.saving = "true";
  const previous = structuredClone(state[property]);
  try {
    mutate(new FormData(form));
    await save();
    renderRoute();
  } catch {
    state[property] = previous;
    cacheValue(key, JSON.stringify(previous));
  } finally {
    delete form.dataset.saving;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:619378-631286 (z0). */
async function submitFormAction(event) {
  const t = event.target.closest("[data-login-form]");
  if (t) {
    event.preventDefault();
    const formData = new FormData(t);
    const Y = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    let user = null;
    try {
      user = (
        await postJson("/api/auth/login", {
          email: Y,
          password: String(formData.get("password") || ""),
        })
      ).user;
      setCurrentUser(user);
      await fetchApplicationState();
      setCurrentUser(user);
    } catch (ge) {
      const be = String(ge?.message || "");
      if (ge?.status === 429) {
        const minutes = Math.max(
          1,
          Math.ceil((ge.retryAfterSeconds || 60) / 60),
        );
        alert(
          `تجاوزت عدد محاولات الدخول. جرّب بعد ${minutes} دقيقة، أو اطلب من الإدارة رفع حظر الدخول. هذا الحظر لا يغيّر تأكيد البريد.`,
        );
        return;
      }
      alert(
        be === "This account is disabled. Contact the administrator."
          ? "هذا الحساب معطّل بعد محاولات دخول خاطئة. تواصل مع الإدارة لإعادة تفعيله."
          : be === "This account must be activated from the email link."
            ? "هذا الحساب لم يُفعّل بعد. افتح رابط التفعيل المرسل إلى بريدك الإلكتروني."
            : be === "Too many login attempts. Try again later."
              ? "تم إيقاف محاولات الدخول مؤقتًا. انتظر قليلًا ثم أعد المحاولة."
              : "تعذر تسجيل الدخول. تأكد من البريد / المعرف وكلمة المرور.",
      );
      return;
    }
    const z = dashboardRoute(state.currentUser?.role || user?.role);
    recordActivity(state.currentUser || user, "login");
    showToast("تم تسجيل الدخول بنجاح.", "success");
    if (currentRoute() === z) {
      renderRoute();
    } else {
      location.hash = z;
      setTimeout(() => {
        if (currentRoute() === z) {
          renderRoute();
        }
      }, 0);
    }
    return;
  }
  const r = event.target.closest("[data-account-profile-form]");
  if (r) {
    if ((event.preventDefault(), !state.currentUser)) return;
    const formData = new FormData(r);
    const Y = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const ee = String(formData.get("phone") || "").trim();
    const z = String(formData.get("birthDate") || "").trim();
    const ge = String(formData.get("residence") || "").trim();
    if (!Y) return alert("البريد الإلكتروني إجباري.");
    if (state.currentUser.role === "student" && !ge)
      return alert("مكان السكن إجباري للطالب.");
    try {
      const be = await postJson("/api/auth/profile", {
        email: Y,
        phone: ee,
        birthDate: z,
        residence: ge,
        currentPassword: String(formData.get("currentPassword") || ""),
      });
      updateCurrentUser(be.user);
      showToast("تم حفظ بيانات الملف الشخصي.", "success");
      renderRoute();
    } catch (be) {
      alert(`تعذر حفظ البيانات: ${be.message}`);
    }
    return;
  }
  const a = event.target.closest("[data-account-password-form]");
  if (a) {
    if ((event.preventDefault(), !state.currentUser)) return;
    const formData = new FormData(a);
    const Y = String(formData.get("password") || "");
    const ee = String(formData.get("confirmPassword") || "");
    const z = validatePassword(Y);
    if (z) return alert(z);
    if (Y !== ee) return alert("تأكيد كلمة المرور غير مطابق.");
    try {
      const ge = await postJson("/api/auth/change-password", {
        currentPassword: String(formData.get("currentPassword") || ""),
        password: Y,
      });
      updateCurrentUser(ge.user);
      showToast("تم تغيير كلمة المرور بنجاح.", "success");
      a.reset();
    } catch (ge) {
      alert(`تعذر تغيير كلمة المرور: ${ge.message}`);
    }
    return;
  }
  const n = event.target.closest("[data-complete-signup-form]");
  if (n) {
    event.preventDefault();
    const formData = new FormData(n);
    const Y = state.activationToken;
    const ee = state.activationUser;
    if (!ee) {
      alert("رابط التفعيل غير صالح.");
      return;
    }
    const z = String(formData.get("password") || "");
    const ge = String(formData.get("confirmPassword") || "");
    const be = validatePassword(z);
    if (be) {
      alert(be);
      return;
    }
    if (z !== ge) {
      alert("تأكيد كلمة المرور غير مطابق.");
      return;
    }
    try {
      const ye = await postJson("/api/activation-complete", {
        token: Y,
        password: z,
      });
      state.users = mergeActivationUser(
        ye.user || {
          ...ee,
          emailConfirmed: true,
          isDisabled: false,
          activationToken: "",
        },
      );
    } catch (ye) {
      alert(`تعذر تأكيد الحساب: ${ye.message}`);
      return;
    }
    alert("تم تأكيد الحساب. يمكنك تسجيل الدخول الآن.");
    location.hash = "login";
    return;
  }
  const i = event.target.closest("[data-registration-form]");
  if (i) {
    event.preventDefault();
    const formData = new FormData(i);
    const Y = registrationPayload(formData);
    try {
      await postJson("/api/registration-requests", {
        request: Y,
      });
    } catch (ee) {
      state.registrationRequests = state.registrationRequests.filter(
        (z) => z.id !== Y.id,
      );
      alert(`تعذر إرسال مطلب التسجيل: ${ee.message}`);
      return;
    }
    i.reset();
    alert("تم إرسال مطلب التسجيل. الإدارة ستراجعه من صفحة إدارة المستخدمين.");
    return;
  }
  const s = event.target.closest("[data-email-settings-form]");
  if (s) {
    event.preventDefault();
    readEmailSettingsForm(new FormData(s));
    try {
      await saveEmailSettings();
      saveEmailSettingsCache();
      state.emailSettings.appPassword = "";
      alert("تم حفظ إعدادات البريد في الـ backend.");
    } catch (B) {
      saveEmailSettingsCache();
      alert(
        `تحفظت الإعدادات في الواجهة فقط. شغّل backend ثم أعد المحاولة. السبب: ${B.message}`,
      );
    }
    renderRoute();
    return;
  }
  const o = event.target.closest("[data-user-create-form]");
  const c = event.target.closest("[data-bulk-student-import-form]");
  if (c) {
    event.preventDefault();
    const formData = new FormData(c);
    const studentsFile = formData.get("studentsFile");
    if (!(studentsFile instanceof File) || !studentsFile.size)
      return alert("اختر ملف Excel أولًا.");
    try {
      const ee = await importAccounts(studentsFile, {
        niveauId: String(formData.get("importDefaultNiveau") || ""),
        groupeId: String(formData.get("importDefaultGroupe") || ""),
        residence:
          String(formData.get("importDefaultResidence") || "غير محدد").trim() ||
          "غير محدد",
      });
      alert(`تم إنشاء ${ee.created.length} حساب.${
        ee.skipped.length
          ? `
لم يتم قبول ${ee.skipped.length} سطر: ${ee.skipped.slice(0, 6).join("؛ ")}`
          : ""
      }
تُرسل روابط التفعيل تلقائيًا إلى الإيميلات الصحيحة.`);
      c.reset();
      renderRoute();
    } catch (ee) {
      alert(`تعذر استيراد الملف: ${ee.message}`);
    }
    return;
  }
  if (o) {
    event.preventDefault();
    const B = structuredClone(state.users);
    const formData = new FormData(o);
    const user = createUser(formData);
    if (!user) return;
    if (!(await awaitSave(saveUsers()))) {
      state.users = B;
      cacheValue("acceptedUsers", JSON.stringify(state.users));
      return;
    }
    o.reset();
    alert(
      state.emailSettings.autoSendActivation
        ? `تم إنشاء الحساب وإعداد رسالة التفعيل لـ ${user.email}.`
        : "تم إنشاء الحساب. أرسل إيميل التفعيل يدويًا عند الحاجة.",
    );
    renderRoute();
    return;
  }
  const l = event.target.closest("[data-course-add-form]");
  const d = event.target.closest("[data-general-plan-form]");
  if (d) {
    if ((event.preventDefault(), state.currentUser?.role !== "admin")) return;
    const formData = new FormData(d);
    const planFile = formData.get("planFile");
    if (
      !(planFile instanceof File) ||
      !planFile.size ||
      !(
        planFile.type === "application/pdf" ||
        planFile.name.toLowerCase().endsWith(".pdf")
      )
    ) {
      alert("اختر ملف PDF للخطة العامة.");
      return;
    }
    if (
      ((state.activationToken = ""),
      (state.activationUser = null),
      planFile.size > 10 * 1024 * 1024)
    ) {
      alert("حجم ملف الخطة لا يجب أن يتجاوز 10 MB.");
      return;
    }
    const ee = String(formData.get("niveauId") || "");
    const z = String(formData.get("groupeId") || "");
    const ge = structuredClone(state.generalPlans);
    const be = {
      id: `general-plan-${ee}-${z || "all"}`,
      niveauId: ee,
      groupeId: z || null,
      fileUrl: await readFileDataUrl(planFile),
      fileName: planFile.name,
      updatedAt: new Date().toISOString(),
      updatedBy: state.currentUser.id,
    };
    if (
      ((state.generalPlans = [
        ...state.generalPlans.filter(
          (ye) =>
            !(String(ye.niveauId) === ee && String(ye.groupeId || "") === z),
        ),
        be,
      ]),
      !(await awaitSave(saveGeneralPlans())))
    ) {
      state.generalPlans = ge;
      cacheValue("generalPlans", JSON.stringify(state.generalPlans));
      return;
    }
    renderRoute();
    return;
  }
  const f = event.target.closest("[data-teacher-absence-form]");
  if (f) {
    if ((event.preventDefault(), state.currentUser?.role !== "teacher")) return;
    const formData = new FormData(f);
    const scheduleId = formData.get("scheduleId");
    if (!scheduleId) return alert("اختر الحصّة أولاً.");
    await requestTeacherAbsence(scheduleId, formData.get("reason"));
    return;
  }
  const element = event.target.closest("[data-exercise-submission-form]");
  if (element) {
    if ((event.preventDefault(), state.currentUser?.role !== "student")) return;
    const B = element.dataset.courseId;
    const Y = state.courses.find((ee) => String(ee.id) === String(B));
    if (!Y || !canAccessLesson(Y)) return;
    if (
      state.exerciseSubmissions.some(
        (ee) =>
          String(ee.courseId) === String(B) &&
          String(ee.userId) === String(state.currentUser.id),
      )
    ) {
      alert("تم تسليم إجابتك سابقًا، ولا يمكن إرسال إجابة ثانية.");
      return;
    }
    if (element.dataset.saving) return;
    const previousSubmissions = structuredClone(state.exerciseSubmissions);
    element.dataset.saving = "true";
    try {
      const formData = new FormData(element);
      const formData2 = new FormData();
      formData2.set("exerciseFile", formData.get("solutionFile"));
      const ge = await readExerciseFile(formData2);
      if (!ge) throw new Error("اختر صورة أو PDF لإجابتك.");
      if (
        ((state.exerciseSubmissions = [
          ...state.exerciseSubmissions,
          {
            id: `exercise-${B}-${state.currentUser.id}`,
            courseId: B,
            userId: state.currentUser.id,
            studentName: state.currentUser.name,
            ...ge,
            submittedAt: new Date().toISOString(),
          },
        ]),
        !(await awaitSave(saveExerciseSubmissions())))
      ) {
        state.exerciseSubmissions = previousSubmissions;
        cacheValue("exerciseSubmissions", JSON.stringify(previousSubmissions));
        return;
      }
      renderRoute();
    } catch (ee) {
      state.exerciseSubmissions = previousSubmissions;
      alert(ee.message || "تعذر إرسال الإجابة.");
    } finally {
      delete element.dataset.saving;
    }
    return;
  }
  if (l) {
    event.preventDefault();
    await persistCourseForm(l);
    return;
  }
  const element2 = event.target.closest("[data-course-edit-form]");
  if (element2) {
    event.preventDefault();
    const ee = element2.dataset.courseId;
    const z = state.courses.find((be) => String(be.id) === String(ee));
    if (!canEditCourse(z)) {
      alert("لا يمكنك تعديل درس تابع لأستاذ آخر.");
      return;
    }
    await persistCourseForm(element2, ee);
    return;
  }
  const x = event.target.closest("[data-exam-session-form]");
  if (x) {
    event.preventDefault();
    await submitExam(x);
    return;
  }
  const b = event.target.closest("[data-questionnaire-session-form]");
  if (b) {
    event.preventDefault();
    await submitQuestionnaire(b);
    return;
  }
  const g = event.target.closest("[data-exam-add-form]");
  if (g) {
    if (
      (event.preventDefault(),
      !["admin", "teacher"].includes(state.currentUser?.role))
    )
      return;
    refreshExams();
    const B = structuredClone(state.exams);
    if (!addExam(g)) return;
    if (!(await awaitSave(saveExams()))) {
      state.exams = B;
      cacheValue("managedExams", JSON.stringify(state.exams));
      return;
    }
    renderRoute();
    return;
  }
  const element3 = event.target.closest("[data-exam-edit-form]");
  if (element3) {
    if (
      (event.preventDefault(),
      !["admin", "teacher"].includes(state.currentUser?.role))
    )
      return;
    const B = state.exams.find(
      (be) => Number(be.id) === Number(element3.dataset.examId),
    );
    if (!canManageExam(B)) {
      alert("لا يمكنك تعديل امتحان تابع لأستاذ آخر.");
      return;
    }
    const Y = structuredClone(state.exams);
    const ee = structuredClone(state.examSubmissions);
    if (!editExam(Number(element3.dataset.examId), element3)) return;
    const z = reconcileExamSubmissions(B);
    const ge = {
      managedExams: JSON.stringify(state.exams),
      ...(z
        ? {
            examSubmissions: JSON.stringify(state.examSubmissions),
          }
        : {}),
    };
    if (!(await awaitSave(saveStateBatch(ge)))) {
      state.exams = Y;
      state.examSubmissions = ee;
      cacheValue("managedExams", JSON.stringify(state.exams));
      cacheValue("examSubmissions", JSON.stringify(state.examSubmissions));
      return;
    }
    renderRoute();
    return;
  }
  const S = event.target.closest("[data-exam-correction-form]");
  if (S) {
    event.preventDefault();
    const B = structuredClone(state.examSubmissions);
    if (!saveManualCorrection(S)) return;
    if (!(await awaitSave(saveExamSubmissions()))) {
      state.examSubmissions = B;
      cacheValue("examSubmissions", JSON.stringify(state.examSubmissions));
      return;
    }
    renderRoute();
    return;
  }
  const v = event.target.closest("[data-grade-settings-form]");
  if (v) {
    event.preventDefault();
    const B = structuredClone(state.gradeSettings);
    if (
      (readGradeSettingsForm(new FormData(v)),
      !(await awaitSave(saveGradeSettings())))
    ) {
      state.gradeSettings = B;
      cacheValue("gradeSettings", JSON.stringify(state.gradeSettings));
      return;
    }
    renderRoute();
    return;
  }
  const F = event.target.closest("[data-questionnaire-add-form]");
  if (F) {
    event.preventDefault();
    const formData = new FormData(F);
    const Y = structuredClone(state.questionnaires);
    if (!addQuestionnaire(F, formData)) return;
    if (!(await awaitSave(saveQuestionnaires()))) {
      state.questionnaires = Y;
      cacheValue("managedQuestionnaires", JSON.stringify(state.questionnaires));
      return;
    }
    renderRoute();
    return;
  }
  const element4 = event.target.closest("[data-questionnaire-edit-form]");
  if (element4) {
    event.preventDefault();
    const formData = new FormData(element4);
    const Y = structuredClone(state.questionnaires);
    if (
      !editQuestionnaire(
        Number(element4.dataset.questionnaireId),
        element4,
        formData,
      )
    )
      return;
    if (!(await awaitSave(saveQuestionnaires()))) {
      state.questionnaires = Y;
      cacheValue("managedQuestionnaires", JSON.stringify(state.questionnaires));
      return;
    }
    renderRoute();
    return;
  }
  const j = event.target.closest("[data-level-add-form]");
  if (j) {
    event.preventDefault();
    await persistCatalogForm(
      j,
      "levels",
      "managedNiveaux",
      addLevel,
      saveLevels,
    );
    return;
  }
  const element5 = event.target.closest("[data-level-edit-form]");
  if (element5) {
    event.preventDefault();
    await persistCatalogForm(
      element5,
      "levels",
      "managedNiveaux",
      (data) => editLevel(element5.dataset.levelId, data),
      saveLevels,
    );
    return;
  }
  const O = event.target.closest("[data-group-add-form]");
  if (O) {
    event.preventDefault();
    await persistCatalogForm(
      O,
      "groups",
      "managedGroupes",
      addGroup,
      saveGroups,
    );
    return;
  }
  const element6 = event.target.closest("[data-group-edit-form]");
  if (element6) {
    event.preventDefault();
    await persistCatalogForm(
      element6,
      "groups",
      "managedGroupes",
      (data) => editGroup(element6.dataset.groupId, data),
      saveGroups,
    );
    return;
  }
  const q = event.target.closest("[data-subject-add-form]");
  if (q) {
    event.preventDefault();
    await persistCatalogForm(
      q,
      "subjects",
      "managedSubjects",
      addSubject,
      saveSubjects,
    );
    return;
  }
  const element7 = event.target.closest("[data-subject-edit-form]");
  if (element7) {
    event.preventDefault();
    await persistCatalogForm(
      element7,
      "subjects",
      "managedSubjects",
      (data) => editSubject(element7.dataset.subjectId, data),
      saveSubjects,
    );
    return;
  }
  const X = event.target.closest("[data-schedule-add-form]");
  if (X) {
    event.preventDefault();
    const formData = new FormData(X);
    if (!addSchedule(formData)) return;
    if (!(await awaitSave(saveSchedule()))) {
      state.schedule = state.schedule.filter(
        (Y) => Number(Y.id) !== nextScheduleId() - 1,
      );
      return;
    }
    renderRoute();
    return;
  }
  const element8 = event.target.closest("[data-schedule-edit-form]");
  if (element8) {
    event.preventDefault();
    const formData = new FormData(element8);
    const Y = structuredClone(state.schedule);
    const ee = structuredClone(state.courses);
    const z = structuredClone(state.teacherAbsences);
    if (!editSchedule(Number(element8.dataset.scheduleId), formData)) return;
    if (
      !(
        await Promise.all([
          awaitSave(saveSchedule()),
          awaitSave(saveCourses()),
          awaitSave(saveTeacherAbsences()),
        ])
      ).every(Boolean)
    ) {
      state.schedule = Y;
      state.courses = ee;
      state.teacherAbsences = z;
      cacheValue("managedSchedule", JSON.stringify(state.schedule));
      cacheValue("teacherCourses", JSON.stringify(state.courses));
      cacheValue("teacherAbsences", JSON.stringify(state.teacherAbsences));
      return;
    }
    renderRoute();
    return;
  }
  const he = event.target.closest("[data-public-settings-form]");
  if (he) {
    event.preventDefault();
    const B = structuredClone(state.publicContent);
    const formData = new FormData(he);
    if (
      ((state.publicContent.home.title = formData.get("homeTitle").trim()),
      (state.publicContent.home.description = formData
        .get("homeDescription")
        .trim()),
      (state.publicContent.about.title = formData.get("aboutTitle").trim()),
      (state.publicContent.about.description = formData
        .get("aboutDescription")
        .trim()),
      [
        "teachers",
        "programs",
        "activities",
        "news",
        "media",
        "register",
        "platform",
      ].forEach((ee) => {
        state.publicContent.pages[ee].title = formData.get(`${ee}Title`).trim();
        state.publicContent.pages[ee].description = formData
          .get(`${ee}Description`)
          .trim();
      }),
      (state.publicContent.contact.address = formData
        .get("contactAddress")
        .trim()),
      (state.publicContent.contact.secondaryAddress = formData
        .get("contactSecondaryAddress")
        .trim()),
      (state.publicContent.contact.phone = formData.get("contactPhone").trim()),
      (state.publicContent.contact.email = formData.get("contactEmail").trim()),
      (state.publicContent.contact.hours = formData.get("contactHours").trim()),
      !(await awaitSave(savePublicContent())))
    ) {
      state.publicContent = B;
      cacheValue("publicContent", JSON.stringify(state.publicContent));
      return;
    }
    renderRoute();
    return;
  }
  const element9 = event.target.closest("[data-public-add-form]");
  if (element9) {
    event.preventDefault();
    const B = structuredClone(state.publicContent);
    const Y = element9.dataset.publicAddForm;
    const formData = new FormData(element9);
    const z = formData.get("title").trim();
    const ge = formData.get("meta")?.trim() || "";
    const be = formData.get("detail").trim();
    const ye = publicTypeSupportsImage(Y)
      ? await optionalFileDataUrl(formData.get("image"))
      : "";
    if (
      (createPublicItem(Y, z, ge, be, ye),
      !(await awaitSave(savePublicContent())))
    ) {
      state.publicContent = B;
      cacheValue("publicContent", JSON.stringify(state.publicContent));
      return;
    }
    renderRoute();
    return;
  }
  const element10 = event.target.closest("[data-public-edit-form]");
  if (element10) {
    event.preventDefault();
    const B = structuredClone(state.publicContent);
    const Y = element10.dataset.publicEditForm;
    const ee = Number(element10.dataset.editIndex);
    const formData = new FormData(element10);
    const ge = formData.get("title").trim();
    const be = formData.get("meta")?.trim() || "";
    const ye = formData.get("detail").trim();
    const xe = publicTypeSupportsImage(Y)
      ? await optionalFileDataUrl(formData.get("image"))
      : "";
    if (
      (updatePublicItem(Y, ee, ge, be, ye, xe),
      !(await awaitSave(savePublicContent())))
    ) {
      state.publicContent = B;
      cacheValue("publicContent", JSON.stringify(state.publicContent));
      return;
    }
    renderRoute();
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:631286-631704 (UA). */
async function handleSubmit(event) {
  const element =
    event.target instanceof HTMLFormElement
      ? event.target
      : event.target?.closest?.("form");
  if (!element) return submitFormAction(event);
  if (element.dataset.submitting === "true") {
    event.preventDefault();
    return;
  }
  const r = [
    ...element.querySelectorAll('button[type="submit"], input[type="submit"]'),
  ];
  element.dataset.submitting = "true";
  r.forEach((a) => {
    a.disabled = true;
  });
  try {
    await submitFormAction(event);
  } finally {
    if (element.isConnected) {
      delete element.dataset.submitting;
      r.forEach((a) => {
        a.disabled = false;
      });
    }
  }
}
