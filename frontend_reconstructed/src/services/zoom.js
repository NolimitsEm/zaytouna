import { state } from "../context/state.js";
import { toDateTimeLocal } from "../components/question-builders.js";
import { getJson, postJson } from "./http.js";
import { showToast } from "../components/common/toasts.js";
import { currentRoute, renderRoute } from "../routes/router.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:396952-397018 (Ht). */
function formString(e, t) {
  return String(new FormData(e).get(t) || "").trim();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:397018-397097 (_r). */
function setFormValue(formElement, t, r) {
  const a = formElement.querySelector(`[name="${t}"]`);
  if (a) {
    a.value = r || "";
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:397097-397227 (oy). */
function toIsoDate(e) {
  const t = String(e || "").trim();
  if (!t) return "";
  const date = new Date(t);
  return Number.isNaN(date.getTime()) ? t : date.toISOString();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:397227-397608 (cf). */
function readZoomSchedule(e) {
  const t = formString(e, "zoomDate");
  const r = formString(e, "zoomStartClock");
  const a = formString(e, "zoomEndClock");
  const n = t && r ? `${t}T${r}` : formString(e, "zoomStartTime");
  let i = Number(formString(e, "zoomDurationMinutes")) || 60;
  if (t && r && a) {
    const date = new Date(`${t}T${r}`);
    const date2 = new Date(`${t}T${a}`);
    if (!Number.isNaN(date.getTime()) && !Number.isNaN(date2.getTime())) {
      i = Math.round((date2.getTime() - date.getTime()) / 6e4);
    }
  }
  return {
    startTime: n,
    durationMinutes: i,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:397608-398059 (cy). */
function zoomMeetingPayload(e) {
  const zoomSchedule = readZoomSchedule(e);
  return {
    courseId: formString(e, "courseId"),
    scheduleId: formString(e, "scheduleId"),
    title: formString(e, "title"),
    description: formString(e, "description"),
    subjectId: formString(e, "subjectId"),
    niveauId: formString(e, "niveauId"),
    groupeId: formString(e, "groupeId"),
    teacherId: state.currentUser?.id || "",
    teacherName: state.currentUser?.name || "",
    teacherEmail: state.currentUser?.email || "",
    startTime: toIsoDate(zoomSchedule.startTime),
    durationMinutes: zoomSchedule.durationMinutes,
    timezone:
      formString(e, "zoomTimezone") ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "Africa/Tunis",
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:398059-398544 (ly). */
function applyZoomMeeting(formElement, t = {}) {
  setFormValue(formElement, "conferenceLink", t.joinUrl || "");
  setFormValue(formElement, "zoomMeetingId", t.meetingId || "");
  setFormValue(formElement, "zoomMeetingUuid", t.meetingUuid || "");
  setFormValue(formElement, "zoomJoinUrl", t.joinUrl || "");
  setFormValue(formElement, "zoomStartUrl", t.startUrl || "");
  setFormValue(formElement, "zoomPassword", t.password || "");
  setFormValue(
    formElement,
    "zoomTimezone",
    t.timezone || formString(formElement, "zoomTimezone") || "Africa/Tunis",
  );
  setFormValue(
    formElement,
    "zoomRecordingStatus",
    t.recordingStatus || "waiting",
  );
  const r = formElement.querySelector("[data-zoom-meeting-status]");
  if (r) {
    r.textContent = t.meetingId ? `Zoom #${t.meetingId}` : "Zoom";
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:398544-399038 (dy). */
async function createZoomMeeting(element) {
  const formElement = element.closest("form");
  if (
    !formElement ||
    !formElement.reportValidity() ||
    !validateZoomSchedule(formElement)
  )
    return;
  const zoomSchedule = readZoomSchedule(formElement);
  setFormValue(
    formElement,
    "zoomStartTime",
    toDateTimeLocal(zoomSchedule.startTime),
  );
  setFormValue(
    formElement,
    "zoomDurationMinutes",
    zoomSchedule.durationMinutes,
  );
  const a = element.textContent;
  element.disabled = true;
  element.textContent = "جاري إنشاء Zoom...";
  try {
    const i =
      (await postJson("/api/zoom/meetings", zoomMeetingPayload(formElement)))
        .meeting || {};
    applyZoomMeeting(formElement, i);
    showToast(
      "تم إنشاء رابط Zoom وربطه بالدرس. يمكنك الآن حفظ الدرس.",
      "success",
    );
  } catch (n) {
    alert(`تعذر إنشاء اجتماع Zoom: ${n.message}`);
  } finally {
    element.disabled = false;
    element.textContent = a;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:399038-399488 (jo). */
function validateZoomSchedule(e, { optional = false } = {}) {
  const t = formString(e, "zoomDate");
  const r = formString(e, "zoomStartClock");
  const a = formString(e, "zoomEndClock");
  if (optional && !t && !r && !a) return true;
  if (!t || !r || !a) {
    alert("حدد تاريخ ووقت بداية ونهاية حصة Zoom.");
    return false;
  }
  const date = new Date(`${t}T${r}`);
  const date2 = new Date(`${t}T${a}`);
  return Number.isNaN(date.getTime()) ||
    Number.isNaN(date2.getTime()) ||
    date2 <= date
    ? (alert("وقت نهاية حصة Zoom يجب أن يكون بعد وقت البداية."), false)
    : (setFormValue(e, "zoomStartTime", `${t}T${r}`),
      setFormValue(
        e,
        "zoomDurationMinutes",
        Math.round((date2.getTime() - date.getTime()) / 6e4),
      ),
      true);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:399488-400560 (uy). */
function applyZoomRecording(e, t) {
  if (!e || !t) return false;
  const r = JSON.stringify({
    recordingAudioUrl: e.recordingAudioUrl || "",
    recordingVideoUrl: e.recordingVideoUrl || "",
    recordingPresentationUrl: e.recordingPresentationUrl || "",
    zoomRecordingStatus: e.zoomRecordingStatus || "",
    zoomRecordingSyncedAt: e.zoomRecordingSyncedAt || "",
    zoomRecordingFiles: e.zoomRecordingFiles || [],
  });
  if (t.recordingAudioUrl) {
    e.recordingAudioUrl = t.recordingAudioUrl;
  }
  if (t.recordingVideoUrl) {
    e.recordingVideoUrl = t.recordingVideoUrl;
  }
  if (t.recordingPresentationUrl) {
    e.recordingPresentationUrl = t.recordingPresentationUrl;
  }
  if (t.recordingStatus) {
    e.zoomRecordingStatus = t.recordingStatus;
  }
  if (t.recordingUpdatedAt) {
    e.zoomRecordingSyncedAt = t.recordingUpdatedAt;
  }
  if (Array.isArray(t.files) && t.files.length) {
    e.zoomRecordingFiles = t.files;
  }
  const a = JSON.stringify({
    recordingAudioUrl: e.recordingAudioUrl || "",
    recordingVideoUrl: e.recordingVideoUrl || "",
    recordingPresentationUrl: e.recordingPresentationUrl || "",
    zoomRecordingStatus: e.zoomRecordingStatus || "",
    zoomRecordingSyncedAt: e.zoomRecordingSyncedAt || "",
    zoomRecordingFiles: e.zoomRecordingFiles || [],
  });
  return r !== a;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:400560-401070 ($c). */
async function syncZoomRecording(e) {
  if (!e?.zoomMeetingId && !e?.zoomMeetingUuid) return;
  const t = String(e.id);
  const attempts = (state.runtime.zoomRecordingAttempts ||= new Map());
  if (Date.now() < (attempts.get(t) || 0)) return;
  if (!state.runtime.zoomRecordingSyncs.has(t)) {
    attempts.set(t, Date.now() + 10000);
    state.runtime.zoomRecordingSyncs.add(t);
    try {
      const query = new URLSearchParams({
        courseId: String(e.id),
        meetingId: e.zoomMeetingId || "",
        uuid: e.zoomMeetingUuid || "",
        refresh: "1",
      });
      const a = await getJson(`/api/zoom/recordings?${query}`);
      if (a.warning && state.currentUser?.role !== "student")
        showToast(a.warning, "error");
      if (applyZoomRecording(e, a.recording)) {
        // The backend owns the recording cache. Students cannot save course
        // collections, and doing so from polling overwrote concurrent edits.
        if (["lesson", "lessonPreview"].includes(currentRoute())) {
          renderRoute();
        }
      }
    } catch (r) {
      console.warn("Zoom recording sync failed:", r.message);
    } finally {
      state.runtime.zoomRecordingSyncs.delete(t);
    }
  }
}
