import { roleLabel } from "../utils/formatters.js";
import { getJson, postJson } from "./http.js";
import { state } from "../context/state.js";
import { updateAccountNavigation, updateRegistrationNavigation } from "../layouts/navigation.js";
import { activationBaseUrl, loginUrl } from "./user-management.js";
import { saveUsers } from "./state-repository.js";
import { currentRoute, renderRoute } from "../routes/router.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:392687-393102 (nf). */
function normalizeUsers(items) {
  return items.map((t) => {
    const user = {
      password: "",
      isDisabled: false,
      emailConfirmed: true,
      activationToken: "",
      activationEmailSentAt: "",
      confirmedAt: "",
      payment: normalizePayment(t.payment),
      ...t,
    };
    user.roleLabel = user.roleLabel || roleLabel(user.role);
    user.email = (user.email || fallbackUserEmail(user)).trim().toLowerCase();
    user.avatar = user.avatar || (user.role === "admin" ? "assets/main-logo.png" : "");
    user.payment = user.role === "student" ? normalizePayment(user.payment) : normalizePayment({});
    if (!user.emailConfirmed) {
      user.isDisabled = true;
    }
    return user;
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:393102-393200 (Vr). */
function normalizePayment(e = {}) {
  const t = !!e.allYear;
  return {
    s1: t || !!e.s1,
    s2: t || !!e.s2,
    allYear: t || (!!e.s1 && !!e.s2),
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:393200-393346 (ey). */
function fallbackUserEmail(e) {
  return `${
    String(e.id || e.name || "user")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ".")
      .replace(/^\.+|\.+$/g, "") || "user"
  }@example.org`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:393346-393657 (qo). */
function validatePassword(e) {
  return e.length < 8
    ? "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل."
    : /[a-z]/.test(e)
      ? /[A-Z]/.test(e)
        ? /\d/.test(e)
          ? /[^A-Za-z0-9]/.test(e)
            ? ""
            : "كلمة المرور يجب أن تحتوي على رمز خاص."
          : "كلمة المرور يجب أن تحتوي على رقم."
        : "كلمة المرور يجب أن تحتوي على حرف كبير."
      : "كلمة المرور يجب أن تحتوي على حرف صغير.";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:395865-395954 (ny). */
async function restoreSession() {
  try {
    const e = await getJson("/api/auth/session");
    setCurrentUser(e.user);
  } catch {
    setCurrentUser(null);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:395954-396065 (Ka). */
function setCurrentUser(e) {
  state.currentUserId = e?.id || "";
  state.currentUser = state.currentUserId
    ? state.users.find((t) => String(t.id) === String(state.currentUserId) && !t.isDisabled) || e
    : null;
  state.persistenceEnabled = !!state.currentUser;
  updateAccountNavigation();
  updateRegistrationNavigation();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:396065-396417 (iy). */
function readEmailSettingsForm(formData) {
  state.emailSettings = {
    fromName: String(formData.get("fromName") || "").trim(),
    fromEmail: String(formData.get("fromEmail") || "")
      .trim()
      .toLowerCase(),
    smtpHost: String(formData.get("smtpHost") || "smtp.gmail.com").trim(),
    smtpPort: String(formData.get("smtpPort") || "587").trim(),
    appPassword: String(formData.get("appPassword") || state.emailSettings.appPassword || "").trim(),
    autoSendActivation: formData.has("autoSendActivation"),
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:396698-396754 (sy). */
async function saveEmailSettings() {
  return postJson("/api/email-settings", state.emailSettings);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:401070-401362 (fy). */
function captureActivationToken() {
  const url = new URL(window.location.href);
  const t = url.hash.slice(1).split("?", 2);
  const r = new URLSearchParams(t[1] || "").get("token") || url.searchParams.get("token") || "";
  if (r) {
    state.activationToken = r;
    url.searchParams.delete("token");
    url.hash = "completeSignup";
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:401362-401697 (hy). */
function activationUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: user.roleLabel,
    niveauId: user.niveauId || "",
    groupeId: user.groupeId || "",
    cin: user.cin || "",
    phone: user.phone || "",
    birthDate: user.birthDate || "",
    residence: user.residence || "",
    registrationNumber: user.registrationNumber || "",
    payment: normalizePayment(user.payment),
    activationEmailSentAt: user.activationEmailSentAt,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:401697-402096 (my). */
async function sendActivationEmail(user) {
  if (user?.email) {
    try {
      const t = await postJson("/api/send-activation-email", {
        to: user.email,
        name: user.name,
        activationBaseUrl: activationBaseUrl(),
        loginUrl: loginUrl(),
        user: activationUserPayload(user),
      });
      user.activationDeliveryStatus = "sent";
      user.activationDeliveryMessage = t.messageId || "sent";
      user.activationDeliveredAt = new Date().toISOString();
    } catch (t) {
      user.activationDeliveryStatus = "failed";
      user.activationDeliveryMessage = t.message;
    }
    saveUsers();
    if (currentRoute() === "users") {
      renderRoute();
    }
  }
}
