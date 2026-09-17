import { state } from "../context/state.js";
import { escapeHtml } from "../utils/formatters.js";
import { postJson } from "./http.js";
import { updateCurrentUser } from "../pages/account.js";
import { renderSidebar, updateAccountNavigation } from "../layouts/navigation.js";
import { showToast } from "../components/common/toasts.js";
import { isYoutubeAttachment } from "../pages/lessons.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:668028-668288 (Ck). */
function attachmentType(e) {
  return !(e instanceof File) || !e.size
    ? ["بدون ملفات"]
    : e.type === "application/pdf" || e.name.toLowerCase().endsWith(".pdf")
      ? ["PDF"]
      : e.type.startsWith("video/")
        ? ["فيديو"]
        : e.type.startsWith("audio/")
          ? ["صوت"]
          : e.type.startsWith("image/")
            ? ["صورة"]
            : [e.name];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:668288-668374 (Ys). */
function draftAttachments(e) {
  const t = String(e || "");
  return t ? state.runtime.courseAttachmentDrafts.get(t) || [] : [];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:668374-668772 (el). */
function renderDraftAttachments(e) {
  const items = draftAttachments(e);
  return items.length
    ? `<div class="course-attachment-draft-list">${items.map((r, a) => `<span class="course-attachment-chip"><span>${escapeHtml(r.name)}</span><button type="button" aria-label="حذف ${escapeHtml(r.name)}" data-remove-new-attachment="${escapeHtml(e)}" data-attachment-index="${a}">×</button></span>`).join("")}</div>`
    : '<p class="muted course-attachment-empty">لم تتم إضافة ملفات جديدة بعد.</p>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:668772-669345 ($k). */
function renderSavedAttachments(e, t) {
  const items = courseAttachments(e).filter((a) => !isEmptyAttachment(a));
  return items.length
    ? `<div class="course-attachment-draft-list" data-saved-course-attachments>${items.map((a, n) => `<span class="course-attachment-chip" data-saved-attachment-index="${n}"><span>${escapeHtml(a.name || a.label || "ملف")}</span><button type="button" aria-label="حذف ${escapeHtml(a.name || a.label || "ملف")}" data-remove-saved-attachment="${escapeHtml(e.id)}" data-attachment-index="${n}" data-attachment-form="${escapeHtml(t)}">×</button></span>`).join("")}</div>`
    : '<p class="muted course-attachment-empty" data-saved-course-attachments>لا توجد ملفات محفوظة.</p>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:669345-669478 (Eh). */
function refreshDraftAttachments(e) {
  document.querySelectorAll(`[data-new-course-attachments="${CSS.escape(String(e))}"]`).forEach((t) => {
    t.innerHTML = renderDraftAttachments(e);
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:669478-669755 (Nk). */
function handleAttachmentSelection(event) {
  const element = event.target.closest("[data-course-attachments]");
  if (!element) return;
  const r = element.dataset.courseAttachments;
  const a = Array.from(element.files || []).filter((i) => i instanceof File && i.size);
  if (!a.length) return;
  const n = draftAttachments(r);
  state.runtime.courseAttachmentDrafts.set(r, [...n, ...a]);
  element.value = "";
  refreshDraftAttachments(r);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:669755-669868 (Ah). */
function attachmentsFromForm(e) {
  const t = String(e.get("attachmentDraftKey") || "");
  const r = draftAttachments(t);
  return r.length ? r : e.getAll("attachments");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:669868-669930 (X0). */
function clearDraftAttachments(e) {
  if (e) {
    state.runtime.courseAttachmentDrafts.delete(String(e));
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:669930-670135 (kh). */
async function readAttachments(e) {
  const items = (Array.isArray(e) ? e : [e]).filter((a) => a instanceof File && a.size);
  return Promise.all(
    items.map(async (a) => {
      const n = attachmentType(a)[0];
      return {
        label: n,
        name: a.name,
        type: a.type || n,
        url: await readFileDataUrl(a),
      };
    }),
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:670135-670258 (Ks). */
function readFileDataUrl(e) {
  return new Promise((t, r) => {
    const reader = new FileReader();
    reader.onload = () => t(reader.result);
    reader.onerror = r;
    reader.readAsDataURL(e);
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:670258-670769 (tl). */
async function readExerciseFile(e) {
  const t = e.get("exerciseFile") || e.get("exerciseImage");
  if (!(t instanceof File) || !t.size) return "";
  const r = t.type === "application/pdf" || t.name.toLowerCase().endsWith(".pdf");
  if (!String(t.type || "").startsWith("image/") && !r)
    throw new Error("ملف التمرين يجب أن يكون صورة أو PDF.");
  if (t.size > 8 * 1024 * 1024) throw new Error("حجم ملف التمرين لا يجب أن يتجاوز 8 MB.");
  return {
    fileUrl: await readFileDataUrl(t),
    fileType: r ? "application/pdf" : String(t.type || "image/*"),
    fileName: t.name || (r ? "exercise.pdf" : "exercise-image"),
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:670769-671410 (Dk). */
async function handleAvatarUpload(event) {
  const t = event.target.closest("[data-profile-avatar-input]");
  if (!t || state.currentUser?.role !== "student") return;
  const r = t.files?.[0];
  if (!r) return;
  if (!String(r.type || "").startsWith("image/")) {
    alert("اختر صورة بصيغة PNG أو JPG أو WebP.");
    t.value = "";
    return;
  }
  if (r.size > 2 * 1024 * 1024) {
    alert("حجم الصورة يجب ألا يتجاوز 2 MB.");
    t.value = "";
    return;
  }
  const a = state.users.find((i) => String(i.id) === String(state.currentUser.id));
  if (!a) return;
  const n = a.avatar || "";
  try {
    const i = await readFileDataUrl(r);
    const s = await postJson("/api/auth/profile/avatar", {
      avatar: i,
    });
    updateCurrentUser(s.user);
    updateAccountNavigation();
    renderSidebar();
    showToast("تم حفظ الصورة الشخصية.", "success");
  } catch (i) {
    a.avatar = n;
    state.currentUser.avatar = n;
    t.value = "";
    alert(`تعذر حفظ الصورة الشخصية: ${i.message}`);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:671410-671560 (Nn). */
function courseAttachments(course) {
  return Array.isArray(course.attachments) && course.attachments.length
    ? normalizeAttachments(course.attachments)
    : normalizeAttachments(
        (course.files || []).map((t) => ({
          label: t,
          name: t,
          type: t,
          url: "",
        })),
      );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:671560-671662 (_h). */
function attachmentLabels(e) {
  const t = courseAttachments(e)
    .map((r) => r.label || r.name)
    .filter(Boolean);
  return t.length ? t : ["بدون ملفات"];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:671662-671782 (Rk). */
function savedAttachmentLabels(e) {
  const t = courseAttachments(e)
    .filter((r) => !isYoutubeAttachment(r))
    .map((r) => r.label || r.name)
    .filter(Boolean);
  return t.length ? t : ["بدون ملفات"];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:671782-671958 (bn). */
function normalizeAttachments(e) {
  const t = (e || [])
    .filter((r) => r && !isEmptyAttachment(r))
    .map((r) => ({
      ...r,
      label: r.label || r.name || "ملف",
    }));
  return t.length
    ? t
    : [
        {
          label: "بدون ملفات",
          name: "بدون ملفات",
          type: "none",
          url: "",
        },
      ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:671958-672082 (rl). */
function isEmptyAttachment(e) {
  const t = `${e.type || ""} ${e.name || ""} ${e.label || ""}`.trim();
  return !e.url && (!t || t === "none" || t === "بدون ملفات");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:672082-672293 (Pk). */
function matchAttachmentLabels(items, items2) {
  const r = items2.filter((a) => !isEmptyAttachment(a));
  return items
    .filter((a) => a !== "بدون ملفات")
    .map((a) => {
      const n = r.find((i) => (i.label || i.name) === a) || r.find((i) => i.name === a);
      return n
        ? {
            ...n,
            label: a,
          }
        : {
            label: a,
            name: a,
            type: a,
            url: "",
          };
    });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:672293-672412 (Ok). */
function parseAttachmentLabels(e) {
  const t = String(e || "")
    .split(/[\n،,]/)
    .map((textValue) => textValue.trim())
    .filter(Boolean);
  return t.length ? t : ["بدون ملفات"];
}
