import { state } from "../context/state.js";
import { roleLabel } from "../utils/formatters.js";
import { normalizePayment, sendActivationEmail, validatePassword } from "./auth.js";
import {
  saveCourses,
  saveDeletedUserIds,
  saveExamSubmissions,
  saveExams,
  saveQuestionnaireSubmissions,
  saveRegistrationRequests,
  saveSchedule,
} from "./state-repository.js";
import { normalizePersonName } from "./results.js";
import { defaultGradeSettings, saveActivityLog } from "./settings-and-activity.js";
import { isExamOwner } from "../utils/content-access.js";
import { postJson } from "./http.js";
import { cacheValue } from "./state-repository.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:651125-652137 (GA). */
function createUser(e) {
  const t = String(e.get("name") || "").trim();
  const r = String(e.get("email") || "")
    .trim()
    .toLowerCase();
  const a = String(e.get("role") || "student").trim();
  const n = ["student", "teacher", "admin"].includes(a) ? a : "student";
  if (!t || !r) {
    alert("الاسم والبريد الإلكتروني إجباريان.");
    return null;
  }
  if (state.users.some((user) => String(user.email || "").toLowerCase() === r)) {
    alert("يوجد حساب آخر بنفس البريد الإلكتروني.");
    return null;
  }
  const s = {
    id: uniqueUserId(t),
    name: t,
    email: r,
    cin: String(e.get("cin") || "").trim(),
    registrationNumber: n === "student" ? nextRegistrationNumber() : "",
    phone: String(e.get("phone") || "").trim(),
    birthDate: String(e.get("birthDate") || "").trim(),
    residence: n === "student" ? String(e.get("residence") || "").trim() : "",
    role: n,
    roleLabel: roleLabel(n),
    password: "",
    isDisabled: true,
    emailConfirmed: false,
    activationToken: "",
    activationEmailSentAt: "",
    confirmedAt: "",
  };
  if (n === "student") {
    if (!s.residence) {
      alert("مكان السكن إجباري للطالب.");
      return null;
    }
    s.niveauId = e.get("niveauId") || state.levels[0]?.id || "n1";
    s.groupeId = e.get("groupeId") || state.groups[0]?.id || "ga";
    s.payment = paymentFromForm(e);
  }
  if (state.emailSettings.autoSendActivation) {
    prepareActivation(s);
  }
  state.users = [...state.users, s];
  return s;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:652137-652241 (XA). */
function paymentFromForm(e) {
  return normalizePayment({
    s1: e.has("paymentS1"),
    s2: e.has("paymentS2"),
    allYear: e.has("paymentAllYear"),
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:652241-653025 (YA). */
function acceptRegistration(e) {
  const user = state.registrationRequests.find((i) => i.id === e);
  if (!user || user.status !== "pending") return;
  const r = String(user.email || "")
    .trim()
    .toLowerCase();
  if (r && state.users.some((user2) => String(user2.email || "").toLowerCase() === r)) {
    alert("يوجد حساب آخر بنفس البريد الإلكتروني.");
    return;
  }
  const a = uniqueUserId(user.fullName);
  const n = {
    id: a,
    name: user.fullName,
    role: "student",
    roleLabel: "طالب",
    niveauId: user.niveauId || user.sana || educationLevelId(user.studyLevel),
    groupeId: state.groups[0]?.id || "ga",
    email: r,
    cin: user.cinPassport || user.cin || user.passportNumber || "",
    cinPassport: user.cinPassport || user.cin || user.passportNumber || "",
    registrationNumber: nextRegistrationNumber(),
    phone: user.phone,
    program: user.program,
    password: "",
    isDisabled: true,
    emailConfirmed: false,
    payment: normalizePayment({}),
    activationToken: "",
    activationEmailSentAt: "",
    confirmedAt: "",
  };
  if (state.emailSettings.autoSendActivation) {
    prepareActivation(n);
  }
  state.users = [...state.users, n];
  user.status = "accepted";
  user.userId = a;
  user.decidedAt = new Date().toISOString();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:653025-653154 (KA). */
function rejectRegistration(e) {
  const t = state.registrationRequests.find((r) => r.id === e);
  if (!(!t || t.status !== "pending")) {
    t.status = "rejected";
    t.decidedAt = new Date().toISOString();
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:653154-653282 (JA). */
function deleteRegistration(e) {
  const user = state.registrationRequests.find((r) => r.id === e);
  if (user && confirm(`هل تريد حذف مطلب ${user.fullName || user.email}؟`)) {
    state.registrationRequests = state.registrationRequests.filter((r) => r.id !== e);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:653282-654308 (QA). */
function editUser(e) {
  const user = state.users.find((l) => l.id === e);
  if (!user) return;
  const textValue = prompt("الاسم", user.name);
  if (textValue === null) return;
  const textValue2 = prompt("البريد الإلكتروني", user.email || "");
  if (textValue2 === null) return;
  const n = textValue2.trim().toLowerCase();
  if (!n) {
    alert("البريد الإلكتروني إجباري.");
    return;
  }
  if (state.users.some((user2) => user2.id !== e && String(user2.email || "").toLowerCase() === n)) {
    alert("يوجد حساب آخر بنفس البريد الإلكتروني.");
    return;
  }
  const textValue3 = prompt("الدور: student / teacher / admin", user.role);
  if (textValue3 === null) return;
  const s = ["student", "teacher", "admin"].includes(textValue3.trim()) ? textValue3.trim() : user.role;
  let o = user.niveauId;
  let c = user.groupeId;
  if (s === "student") {
    const l = state.levels[0]?.id || "n1";
    const d = state.groups[0]?.id || "ga";
    const f = state.levels.map((b) => b.id).join(" / ") || l;
    const m = state.groups.map((b) => b.id).join(" / ") || d;
    const textValue4 = prompt(`المستوى: ${f}`, user.niveauId || l);
    if (textValue4 === null) return;
    const textValue5 = prompt(`المجموعة: ${m}`, user.groupeId || d);
    if (textValue5 === null) return;
    o = state.levels.some((b) => b.id === textValue4.trim()) ? textValue4.trim() : l;
    c = state.groups.some((b) => b.id === textValue5.trim()) ? textValue5.trim() : d;
  }
  user.name = textValue.trim() || user.name;
  user.email = n;
  user.role = s;
  user.roleLabel = roleLabel(s);
  if (s === "student") {
    user.niveauId = o;
    user.groupeId = c;
  } else {
    delete user.niveauId;
    delete user.groupeId;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:654308-654577 (ZA). */
function resetUserPassword(e) {
  const t = state.users.find((n) => n.id === e);
  if (!t) return;
  const textValue = prompt(`كلمة مرور جديدة لـ ${t.name}`, t.password || "");
  if (textValue === null) return;
  const a = validatePassword(textValue.trim());
  if (a) {
    alert(a);
    return;
  }
  t.password = textValue.trim();
  t.emailConfirmed = true;
  t.activationToken = "";
  t.activationEmailSentAt = "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:654577-654830 (ek). */
async function toggleUserDisabled(e) {
  const user = state.users.find((r) => String(r.id) === String(e));
  if (user) {
    if (String(state.currentUser?.id) === String(e)) {
      alert("لا يمكنك تعطيل الحساب الذي تستعمله الآن.");
      return;
    }
    return setUserAccess(user.id, !user.isDisabled);
  }
}
// A targeted server mutation keeps confirmation/password intact and clears a
// temporary login block when the administrator enables the account.
export async function setUserAccess(id, isDisabled) {
  const response = await postJson("/api/admin/users/status", { id, isDisabled });
  if (!response.user?.id) throw new Error("لم يرجع الخادم حالة الحساب المحفوظة.");
  state.users = state.users.map(user => String(user.id) === String(response.user.id)
    ? { ...user, ...response.user } : user);
  const updated = state.users.find(user => String(user.id) === String(response.user.id));
  if (!updated.isDisabled) { delete updated.disabledAt; delete updated.disabledReason; }
  cacheValue("acceptedUsers", JSON.stringify(state.users));
  return updated;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:654830-654942 (G0). */
async function enableUser(e) {
  const t = state.users.find((r) => String(r.id) === String(e));
  if (t && String(state.currentUser?.id) !== String(e)) {
    if (t.emailConfirmed) {
      return setUserAccess(t.id, false);
    }
    prepareActivation(t);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:654942-655221 (_i). */
function prepareActivation(e) {
  if (e) {
    e.activationToken = "";
    e.activationEmailSentAt = new Date().toISOString();
    e.activationSenderName = state.emailSettings.fromName || "";
    e.activationSenderEmail = state.emailSettings.fromEmail || "";
    e.activationDeliveryStatus = "queued";
    e.activationDeliveryMessage = "";
    e.isDisabled = true;
    e.emailConfirmed = false;
    sendActivationEmail(e);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:655221-655297 (tk). */
function activationBaseUrl() {
  return `${location.origin}${location.pathname}#completeSignup`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:655297-655364 (rk). */
function loginUrl() {
  return `${location.origin}${location.pathname}#login`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:655364-655577 (ak). */
function updateStudentPayment(e, t, r) {
  const a = state.users.find((user) => user.id === e && user.role === "student");
  if (!a || !["s1", "s2", "allYear"].includes(t)) return;
  const payment = normalizePayment(a.payment);
  payment[t] = r;
  if (t === "allYear") {
    payment.s1 = r;
    payment.s2 = r;
  } else {
    payment.allYear = payment.s1 && payment.s2;
  }
  a.payment = normalizePayment(payment);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:655577-655836 (nk). */
function deleteUser(e) {
  const t = state.users.find((r) => r.id === e);
  if (t) {
    if (state.currentUser?.id === e) {
      alert("لا يمكنك حذف الحساب الذي تستعمله الآن.");
      return;
    }
    if (confirm(`هل تريد حذف حساب ${t.name} وكل البيانات المرتبطة به؟`)) {
      removeUserRelatedData(t);
      state.users = state.users.filter((r) => r.id !== e);
      state.deletedUserIds = [...new Set([...state.deletedUserIds, String(e)])];
      saveDeletedUserIds();
    }
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:655836-656550 (Xc). */
function removeUserRelatedData(user) {
  const t = String(user.id);
  const r = String(user.email || "")
    .trim()
    .toLowerCase();
  const personName = normalizePersonName(user.name);
  const n = (i, s = "", o = "") =>
    String(i || "") === t ||
    (r &&
      String(o || "")
        .trim()
        .toLowerCase() === r)
      ? true
      : !!(personName && normalizePersonName(s) === personName);
  if (
    ((state.examSubmissions = state.examSubmissions.filter((i) => !n(i.userId, i.studentName))),
    (state.questionnaireSubmissions = state.questionnaireSubmissions.filter((i) => !n(i.userId, i.userName))),
    (state.registrationRequests = state.registrationRequests.filter(
      (user2) =>
        !n(user2.userId, user2.fullName || `${user2.firstName || ""} ${user2.secondName || ""}`, user2.email),
    )),
    (state.activityLog = state.activityLog.filter((i) => !n(i.userId, i.userName || i.studentName))),
    saveExamSubmissions(),
    saveQuestionnaireSubmissions(),
    saveRegistrationRequests(),
    saveActivityLog(),
    user.role === "teacher")
  ) {
    const uniqueValues = new Set(state.exams.filter((s) => isExamOwner(s, t)).map((s) => String(s.id)));
    state.courses = state.courses.filter((course) => String(course.teacherId || "") !== t);
    state.exams = state.exams.filter((s) => !isExamOwner(s, t));
    state.schedule = state.schedule.filter((course) => String(course.teacherId || "") !== t);
    if (uniqueValues.size) {
      state.examSubmissions = state.examSubmissions.filter((s) => !uniqueValues.has(String(s.examId)));
      saveExamSubmissions();
    }
    saveCourses();
    saveExams();
    saveSchedule();
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:656550-656748 (bh). */
function uniqueUserId(e) {
  const t =
    String(e || "student")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "student";
  let r = t;
  let a = 1;
  for (; state.users.some((n) => n.id === r); ) {
    a += 1;
    r = `${t}-${a}`;
  }
  return r;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:656748-657146 (Yc). */
function nextRegistrationNumber() {
  const t = `EZ${
    String(state.gradeSettings.academicYear || defaultGradeSettings().academicYear)
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "") || "20262025"
  }`;
  const r = state.users
    .filter((user) => user.role === "student")
    .map((a) => String(a.registrationNumber || ""))
    .map((textValue) => textValue.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter((a) => a.startsWith(t))
    .map((a) => Number(a.slice(t.length)))
    .filter(Number.isFinite)
    .reduce((a, n) => Math.max(a, n), 0);
  return `${t}${String(r + 1).padStart(4, "0")}`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:657146-657256 (ik). */
function educationLevelId(e) {
  return (
    {
      "تعليم إبتدائي": "n1",
      "تعليم إعدادي": "n2",
      "تعليم ثانوي": "n3",
      "تعليم عالي": "n3",
    }[e] || "n1"
  );
}
