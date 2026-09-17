import { state } from "../context/state.js";
import { contentMatchesLevel, equalGroup } from "../utils/content-access.js";
import { contentGroupIds } from "../utils/formatters.js";
import { normalizeSemester } from "../pages/grades.js";
import {
  saveCourses,
  saveExams,
  saveQuestionnaires,
  saveSchedule,
  saveSubjectRedirects,
} from "./state-repository.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:657256-657463 (sk). */
function addLevel(e) {
  const t = e.get("name").trim();
  if (!t) {
    alert("اسم المستوى لا يمكن أن يكون فارغًا.");
    return;
  }
  if (state.levels.some((r) => r.name.trim() === t)) {
    alert("هذا المستوى موجود بالفعل.");
    return;
  }
  state.levels = [
    ...state.levels,
    {
      id: nextLevelId(),
      name: t,
    },
  ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:657463-657710 (ok). */
function editLevel(e, t) {
  const r = state.levels.find((i) => i.id === e);
  if (!r) return;
  const a = t.get("name").trim();
  if (!a) {
    alert("اسم المستوى لا يمكن أن يكون فارغًا.");
    return;
  }
  if (state.levels.some((i) => i.id !== e && i.name.trim() === a)) {
    alert("هذا الاسم مستعمل في مستوى آخر.");
    return;
  }
  r.name = a;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:657710-657984 (ck). */
function deleteLevel(e) {
  const t = state.levels.find((a) => a.id === e);
  if (!t) return;
  if (state.levels.length <= 1) {
    alert("يجب أن يبقى مستوى واحد على الأقل.");
    return;
  }
  if (levelUsage(e).total > 0) {
    alert("لا يمكن حذف مستوى مرتبط بطلبة أو محتوى تعليمي.");
    return;
  }
  if (confirm(`هل تريد حذف مستوى ${t.name}؟`)) {
    state.levels = state.levels.filter((a) => a.id !== e);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:657984-658109 (lk). */
function nextLevelId() {
  return `n${
    state.levels.reduce((t, r) => {
      const a = String(r.id).match(/^n(\d+)$/);
      return a ? Math.max(t, Number(a[1])) : t;
    }, 0) + 1
  }`;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:658109-658382 (Kc). */
function levelUsage(e) {
  const t = state.users.filter((user) => user.role === "student" && user.niveauId === e).length;
  const r = state.courses.filter((o) => o.niveauId === e).length;
  const a = state.exams.filter((o) => contentMatchesLevel(o, e)).length;
  const n = state.questionnaires.filter((o) => o.niveauId === e).length;
  const i = state.schedule.filter((o) => o.niveauId === e).length;
  const s = r + a + n + i;
  return {
    students: t,
    content: s,
    total: t + s,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:658382-658592 (dk). */
function addGroup(e) {
  const t = e.get("name").trim();
  if (!t) {
    alert("اسم المجموعة لا يمكن أن يكون فارغًا.");
    return;
  }
  if (state.groups.some((r) => r.name.trim() === t)) {
    alert("هذه المجموعة موجودة بالفعل.");
    return;
  }
  state.groups = [
    ...state.groups,
    {
      id: nextGroupId(),
      name: t,
    },
  ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:658592-658842 (uk). */
function editGroup(e, t) {
  const r = state.groups.find((i) => i.id === e);
  if (!r) return;
  const a = t.get("name").trim();
  if (!a) {
    alert("اسم المجموعة لا يمكن أن يكون فارغًا.");
    return;
  }
  if (state.groups.some((i) => i.id !== e && i.name.trim() === a)) {
    alert("هذا الاسم مستعمل في مجموعة أخرى.");
    return;
  }
  r.name = a;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:658842-659121 (fk). */
function deleteGroup(e) {
  const t = state.groups.find((a) => a.id === e);
  if (!t) return;
  if (state.groups.length <= 1) {
    alert("يجب أن تبقى مجموعة واحدة على الأقل.");
    return;
  }
  if (groupUsage(e).total > 0) {
    alert("لا يمكن حذف مجموعة مرتبطة بطلبة أو محتوى تعليمي.");
    return;
  }
  if (confirm(`هل تريد حذف مجموعة ${t.name}؟`)) {
    state.groups = state.groups.filter((a) => a.id !== e);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:659121-659411 (hk). */
function nextGroupId() {
  const t =
    96 +
    state.groups.reduce((n, i) => {
      const s = String(i.id).match(/^g([a-z])$/);
      if (!s) return n;
      const o = s[1].charCodeAt(0) - 96;
      return Math.max(n, o);
    }, 0) +
    1;
  if (t <= 122) return `g${String.fromCharCode(t)}`;
  let r = state.groups.length + 1;
  let a = `group-${r}`;
  for (; state.groups.some((n) => n.id === a); ) {
    r += 1;
    a = `group-${r}`;
  }
  return a;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:659411-659699 (Jc). */
function groupUsage(e) {
  const t = state.users.filter((user) => user.role === "student" && user.groupeId === e).length;
  const r = state.courses.filter((o) => o.groupeId === e).length;
  const a = state.exams.filter((o) => contentGroupIds(o).some((c) => equalGroup(c, e))).length;
  const n = state.questionnaires.filter((o) => o.groupeId === e).length;
  const i = state.schedule.filter((o) => o.groupeId === e).length;
  const s = r + a + n + i;
  return {
    students: t,
    content: s,
    total: t + s,
  };
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:659699-660129 (mk). */
function addSubject(e) {
  const t = e.get("name").trim();
  const r = e.get("short").trim();
  const program = e.get("program");
  const niveauId = e.get("niveauId");
  const semester = normalizeSemester(e.get("semester"));
  const s = e.get("description").trim();
  if (!t || !r || !program || !niveauId || !semester || !s) {
    alert("بيانات المادة لا يمكن أن تكون فارغة.");
    return;
  }
  if (state.subjects.some((o) => o.name.trim() === t && o.program === program && o.niveauId === niveauId)) {
    alert("هذه المادة موجودة بالفعل.");
    return;
  }
  state.subjects = [
    ...state.subjects,
    {
      id: nextSubjectId(),
      name: t,
      short: r,
      program: program,
      niveauId: niveauId,
      semester: semester,
      description: s,
    },
  ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:660129-660627 (pk). */
function editSubject(e, t) {
  const r = state.subjects.find((d) => d.id === e);
  if (!r) return;
  const a = t.get("name").trim();
  const n = t.get("short").trim();
  const program = t.get("program");
  const niveauId = t.get("niveauId");
  const semester = normalizeSemester(t.get("semester"));
  const c = t.get("description").trim();
  if (!a || !n || !program || !niveauId || !semester || !c) {
    alert("بيانات المادة لا يمكن أن تكون فارغة.");
    return;
  }
  if (
    state.subjects.some(
      (d) => d.id !== e && d.name.trim() === a && d.program === program && d.niveauId === niveauId,
    )
  ) {
    alert("هذه المادة موجودة بالفعل في نفس البرنامج والسنة.");
    return;
  }
  r.name = a;
  r.short = n;
  r.program = program;
  r.niveauId = niveauId;
  r.semester = semester;
  r.description = c;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:660627-661119 (gk). */
function deleteSubject(e) {
  const t = state.subjects.find((n) => n.id === e);
  if (!t) return;
  if (state.subjects.length <= 1) {
    alert("يجب أن تبقى مادة واحدة على الأقل.");
    return;
  }
  const r = subjectUsage(e);
  const a = state.subjects.find((n) => n.id !== e);
  if (!a) {
    alert("يجب أن تبقى مادة واحدة على الأقل.");
    return;
  }
  if (r.total > 0) {
    const n = `هذه المادة مرتبطة بـ ${r.total} عنصر. عند الحذف سيتم تحويل المحتوى إلى ${a.name}. هل تريد المتابعة؟`;
    if (!confirm(n)) return;
    replaceSubjectReferences(e, a.id);
    state.subjectRedirects[e] = a.id;
    saveSubjectRedirects();
    saveExams();
    saveQuestionnaires();
    saveSchedule();
  } else if (!confirm(`هل تريد حذف مادة ${t.name}؟`)) return;
  state.subjects = state.subjects.filter((n) => n.id !== e);
  saveCourses();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:661119-661226 (xk). */
function nextSubjectId() {
  let e = state.subjects.length + 1;
  let t = `subject-${e}`;
  for (; state.subjects.some((r) => r.id === t); ) {
    e += 1;
    t = `subject-${e}`;
  }
  return t;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:661226-661320 (wh). */
function replaceSubjectReferences(e, t) {
  [state.courses, state.exams, state.questionnaires, state.schedule].forEach((r) => {
    r.forEach((a) => {
      if (a.subjectId === e) {
        a.subjectId = t;
      }
    });
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:661320-661403 (vk). */
function applySubjectRedirects() {
  Object.entries(state.subjectRedirects).forEach(([e, t]) => {
    if (state.subjects.some((r) => r.id === t)) {
      replaceSubjectReferences(e, t);
    }
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:661403-661648 (Qc). */
function subjectUsage(e) {
  const t = state.courses.filter((i) => i.subjectId === e).length;
  const r = state.exams.filter((i) => i.subjectId === e).length;
  const a = state.questionnaires.filter((i) => i.subjectId === e).length;
  const n = state.schedule.filter((i) => i.subjectId === e).length;
  return {
    courses: t,
    exams: r,
    questionnaires: a,
    schedule: n,
    total: t + r + a + n,
  };
}
