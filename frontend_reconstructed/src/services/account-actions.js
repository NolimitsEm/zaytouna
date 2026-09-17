import { state } from "../context/state.js";
import { postJson } from "./http.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:647159-647262 (W0). */
function closeNavigationDropdowns() {
  document.querySelectorAll(".nav-dropdown[open]").forEach((e) => {
    e.removeAttribute("open");
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:647262-647347 (qr). */
function cancelEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:647347-647628 (jr). */
async function confirmPasswordForAction(e = "الحذف") {
  if (!state.currentUser) {
    alert("يجب تسجيل الدخول قبل الحذف.");
    return false;
  }
  const t = prompt(`أدخل كلمة مرور حسابك لتأكيد ${e}:`);
  if (t === null) return false;
  try {
    await postJson("/api/auth/verify-password", {
      password: t,
    });
  } catch {
    alert("كلمة المرور غير صحيحة. لم يتم الحذف.");
    return false;
  }
  return true;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:647628-648177 (HA). */
function registrationPayload(e) {
  const t = e.get("firstName").trim();
  const r = e.get("secondName").trim();
  const a = {
    id: `request-${Date.now()}`,
    firstName: t,
    secondName: r,
    fullName: `${t} ${r}`.trim(),
    studyLevel: e.get("studyLevel"),
    sana: e.get("sana"),
    niveauId: e.get("sana"),
    birthDate: e.get("birthDate").trim(),
    cinPassport: e.get("cinPassport").trim(),
    profession: e.get("profession").trim(),
    email: e.get("email").trim(),
    phone: e.get("phone").trim(),
    program: e.get("program"),
    message: e.get("message").trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
    decidedAt: "",
  };
  state.registrationRequests = [a, ...state.registrationRequests];
  return a;
}
