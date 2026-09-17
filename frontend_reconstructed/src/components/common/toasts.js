import { escapeHtml } from "../../utils/formatters.js";
import { state } from "../../context/state.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:389674-390285 (la). */
function showToast(e, t = "info", r = {}) {
  const a = String(e || "").trim();
  if (!a) return;
  const element = document.createElement("div");
  element.className = `toast toast-${t}`;
  element.setAttribute("role", t === "error" ? "alert" : "status");
  element.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${toastIcon(t)}</span>
    <span class="toast-text">${escapeHtml(a)}</span>
    <button class="toast-close" type="button" aria-label="إغلاق">×</button>
  `;
  const i = () => {
    element.classList.add("is-leaving");
    setTimeout(() => element.remove(), 180);
  };
  element.querySelector(".toast-close")?.addEventListener("click", i);
  state.toastRegion.append(element);
  const s = Number(r.duration) || (t === "error" ? 5200 : 3200);
  setTimeout(i, s);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:390285-390345 (GS). */
function toastIcon(e) {
  return e === "success" ? "✓" : e === "error" ? "!" : "i";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:390345-390518 (XS). */
function toastTypeFromMessage(e) {
  const t = String(e || "");
  return /^(تم|نجح|تمت)/.test(t)
    ? "success"
    : /(تعذر|فشل|خطأ|غير صالح|غير صحيحة|لا يمكن|لا توجد|يجب|ناقصة|مغلق|معطّل)/.test(t)
      ? "error"
      : "info";
}
