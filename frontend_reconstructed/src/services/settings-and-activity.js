import { state } from "../context/state.js";
import { coefficientKey } from "../pages/grades.js";
import { activeTeachers, activityStatus } from "../utils/formatters.js";
import { readCachedArray, readCachedObject, savePublicContent, saveStateValue } from "./state-repository.js";
import { currentRoute, routeLabel } from "../routes/router.js";
import { setCurrentUser } from "./auth.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:409174-410237 (_y). */
function readGradeSettingsForm(e) {
  const t = {};
  state.levels.forEach((i) => {
    state.subjects.forEach((s) => {
      const o = coefficientKey(i.id, s.id);
      const c = Number(e.get(`coef-${o}`));
      t[o] = Number.isFinite(c) && c >= 0 ? c : 1;
    });
  });
  const r = Number(e.get("semester1Coefficient"));
  const a = Number(e.get("semester2Coefficient"));
  const n = defaultObservationRules()
    .map((i, s) => {
      const o = Number(e.get(`observation-min-${s}`));
      return {
        min: Number.isFinite(o) ? Math.max(0, Math.min(20, o)) : i.min,
        text: String(e.get(`observation-text-${s}`) || i.text).trim() || i.text,
      };
    })
    .sort((i, s) => s.min - i.min);
  state.gradeSettings = {
    academicYear:
      String(e.get("academicYear") || defaultGradeSettings().academicYear).trim() ||
      defaultGradeSettings().academicYear,
    generalMode: e.get("generalMode") === "allYearSubjects" ? "allYearSubjects" : "semesterAverage",
    semesterCoefficients: {
      s1: Number.isFinite(r) && r >= 0 ? r : 1,
      s2: Number.isFinite(a) && a >= 0 ? a : 1,
    },
    subjectCoefficients: t,
    teacherHourlyRates: Object.fromEntries(
      activeTeachers().map((i) => {
        const s = Number(e.get(`teacher-rate-${i.id}`));
        return [
          i.id,
          Number.isFinite(s) && s >= 0 ? s : Number(state.gradeSettings.teacherHourlyRates?.[i.id]) || 0,
        ];
      }),
    ),
    bulletinDistributions:
      state.gradeSettings.bulletinDistributions &&
      typeof state.gradeSettings.bulletinDistributions == "object"
        ? state.gradeSettings.bulletinDistributions
        : {},
    observationRules: n,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:410237-410811 (wf). */
function loadGradeSettings() {
  const e = defaultGradeSettings();
  const cachedObject = readCachedObject("gradeSettings");
  return {
    ...e,
    ...cachedObject,
    semesterCoefficients: {
      ...e.semesterCoefficients,
      ...(cachedObject.semesterCoefficients && typeof cachedObject.semesterCoefficients == "object"
        ? cachedObject.semesterCoefficients
        : {}),
    },
    subjectCoefficients:
      cachedObject.subjectCoefficients && typeof cachedObject.subjectCoefficients == "object"
        ? cachedObject.subjectCoefficients
        : {},
    teacherHourlyRates:
      cachedObject.teacherHourlyRates && typeof cachedObject.teacherHourlyRates == "object"
        ? cachedObject.teacherHourlyRates
        : {},
    bulletinDistributions:
      cachedObject.bulletinDistributions && typeof cachedObject.bulletinDistributions == "object"
        ? cachedObject.bulletinDistributions
        : {},
    observationRules: normalizeObservationRules(cachedObject.observationRules),
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:410811-411013 (Qa). */
function defaultGradeSettings() {
  return {
    academicYear: "2026-2025",
    generalMode: "semesterAverage",
    semesterCoefficients: {
      s1: 1,
      s2: 1,
    },
    subjectCoefficients: {},
    teacherHourlyRates: {},
    bulletinDistributions: {},
    observationRules: defaultObservationRules(),
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:411013-411163 (Zn). */
function defaultObservationRules() {
  return [
    {
      min: 16,
      text: "ممتاز",
    },
    {
      min: 14,
      text: "حسن جدًا",
    },
    {
      min: 12,
      text: "حسن",
    },
    {
      min: 10,
      text: "مقبول",
    },
    {
      min: 0,
      text: "يحتاج إلى مزيد من العمل",
    },
  ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:411163-411417 (Dc). */
function normalizeObservationRules(items) {
  return !Array.isArray(items) || !items.length
    ? defaultObservationRules()
    : items
        .map((t, r) => ({
          min: Number.isFinite(Number(t?.min))
            ? Math.max(0, Math.min(20, Number(t.min)))
            : (defaultObservationRules()[r]?.min ?? 0),
          text: String(t?.text || defaultObservationRules()[r]?.text || "").trim(),
        }))
        .filter((t) => t.text)
        .sort((t, r) => r.min - t.min);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:411417-411461 (Sf). */
function saveGradeSettings() {
  return saveStateValue("gradeSettings", state.gradeSettings);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:411461-411500 (yf). */
function loadActivityLog() {
  return readCachedArray("activityLog");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:411500-411535 (Tf). */
function saveActivityLog() {
  saveStateValue("activityLog", state.activityLog);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:411535-411579 (Ef). */
function loadLessonSessionLog() {
  return readCachedArray("lessonSessionLog");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:411579-411626 (ws). */
function saveLessonSessionLog() {
  return saveStateValue("lessonSessionLog", state.lessonSessionLog);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:411626-412664 (qs). */
function recordActivity(user, t) {
  if (!user || !["admin", "student", "teacher"].includes(user.role)) return;
  const date = new Date();
  const a = state.activityLog.findIndex((n) => n.userId === user.id && n.status === "متصل");
  if (t === "login") {
    if (a >= 0 && activityStatus(state.activityLog[a]) === "متصل") {
      state.activityLog[a].lastActivityAt = date.toISOString();
      state.activityLog[a].page = routeLabel(currentRoute());
    } else {
      if (a >= 0) {
        state.activityLog[a].status = "غير نشط";
      }
      state.activityLog.unshift({
        id: `${user.id}-${date.getTime()}`,
        userId: user.id,
        userName: user.name,
        studentName: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
        niveauId: user.niveauId,
        groupeId: user.groupeId,
        loginAt: date.toISOString(),
        lastActivityAt: date.toISOString(),
        logoutAt: "",
        status: "متصل",
        page: routeLabel(currentRoute()),
      });
    }
  }
  if (t === "activity" && a >= 0) {
    state.activityLog[a].lastActivityAt = date.toISOString();
    state.activityLog[a].page = routeLabel(currentRoute());
  }
  if (t === "activity" && a < 0) {
    state.activityLog.unshift({
      id: `${user.id}-${date.getTime()}`,
      userId: user.id,
      userName: user.name,
      studentName: user.name,
      role: user.role,
      roleLabel: user.roleLabel,
      niveauId: user.niveauId,
      groupeId: user.groupeId,
      loginAt: date.toISOString(),
      lastActivityAt: date.toISOString(),
      logoutAt: "",
      status: "متصل",
      page: routeLabel(currentRoute()),
    });
  }
  if (t === "logout" && a >= 0) {
    state.activityLog[a].logoutAt = date.toISOString();
    state.activityLog[a].lastActivityAt = date.toISOString();
    state.activityLog[a].status = "غير متصل";
  }
  state.activityLog = state.activityLog.slice(0, 100);
  saveActivityLog();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:412664-412952 (Iy). */
function normalizeInstitutionName() {
  const e = ["معهد النور", "مشيخة الزيتونة", "مشيخة الزيتونة للعلوم الشرعية"];
  const t = "مشيخة التعليم الزيتوني وفروعه";
  let r = false;
  ["home", "about"].forEach((a) => {
    ["title", "description"].forEach((n) => {
      e.forEach((i) => {
        if (state.publicContent[a]?.[n]?.includes(i)) {
          state.publicContent[a][n] = state.publicContent[a][n].replaceAll(i, t);
          r = true;
        }
      });
    });
  });
  if (r) {
    savePublicContent();
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:412952-412976 (Fy). */
function clearCurrentUser(e) {
  setCurrentUser(null);
}
