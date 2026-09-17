import { currentRoute, renderRoute } from "../routes/router.js";
import { state } from "../context/state.js";
import { paginateTable, tableRows } from "../components/common/tables.js";
import { studentMatchesCohort } from "../pages/schedule.js";
import { normalizeArabicText } from "../utils/audience.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:710851-711090 (I_). */
function handleListingFilter(event) {
  if (!event.target.closest("[data-filter-form]")) return;
  const t = event.target.form;
  const query = new URLSearchParams();
  new FormData(t).forEach((n, i) => {
    if (n) {
      query.set(i, n);
    }
  });
  const a = currentRoute();
  history.replaceState(null, "", `#${a}${query.toString() ? `?${query}` : ""}`);
  renderRoute();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:711090-711168 (Oh). */
function handleAdminFilter(event) {
  const t = event.target.closest("[data-admin-table-filter]");
  if (t) {
    filterAdminTable(t);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:711168-711230 (F_). */
function handleUserRoleChange(event) {
  if (event.target.closest("[data-new-user-role]")) {
    updateStudentOnlyFields();
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:711230-711456 (C_). */
function handleScheduleAudienceChange(event) {
  const element = event.target.closest('input[name="studentIds"]');
  if (element) {
    updateScheduleStudentCount(element.closest("[data-schedule-student-picker]"));
    return;
  }
  if (event.target.closest("[data-schedule-niveau-control], [data-schedule-groupe-control]")) {
    updateScheduleAudience(event.target);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:711456-712155 ($_). */
function updateScheduleAudience(element) {
  const formElement = element.closest("form, tr");
  if (!formElement) return;
  const r = formElement.querySelector("[data-schedule-niveau-control]")?.value || "";
  const a = formElement.querySelector("[data-schedule-groupe-control]")?.value || "";
  formElement.querySelectorAll("[data-schedule-student-picker]").forEach((formElement2) => {
    let i = 0;
    formElement2.querySelectorAll("[data-student-name]").forEach((formElement3) => {
      const c = studentMatchesCohort(formElement3.dataset, r, a);
      const l = formElement3.querySelector('input[name="studentIds"]');
      formElement3.dataset.targetHidden = c ? "false" : "true";
      formElement3.hidden = !c;
      if (c) {
        i += 1;
      }
      if (l) {
        l.disabled = !c;
        if (!c) {
          l.checked = false;
        }
      }
    });
    const s = formElement2.querySelector("[data-schedule-student-empty]");
    if (s) {
      s.textContent = r ? "لا يوجد طلبة نشطون في القسم والفوج المحددين." : "اختر القسم لعرض طلبته.";
      s.hidden = Boolean(r && i);
    }
    updateScheduleStudentCount(formElement2);
    filterScheduleStudents(formElement2);
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:712155-712280 (N_). */
function handleScheduleStudentSearch(event) {
  const element = event.target.closest("[data-schedule-student-search]");
  if (element) {
    filterScheduleStudents(element.closest("[data-schedule-student-picker]"));
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:712280-712697 (Lh). */
function filterScheduleStudents(formElement) {
  if (!formElement) return;
  const t = normalizeArabicText(formElement.querySelector("[data-schedule-student-search]")?.value);
  let r = 0;
  formElement.querySelectorAll("[data-student-name]").forEach((element) => {
    const s = element.dataset.targetHidden === "true" || (t && !normalizeArabicText(element.dataset.studentName).includes(t));
    element.hidden = s;
    if (!s) {
      r += 1;
    }
  });
  const a = formElement.querySelector("[data-schedule-student-empty]");
  if (a) {
    const level = formElement.closest("form, tr")?.querySelector("[data-schedule-niveau-control]")?.value;
    a.textContent = !level ? "اختر القسم لعرض طلبته." : t
      ? "لا يوجد طالب بهذا الاسم في القسم والفوج المحددين."
      : "لا يوجد طلبة نشطون في القسم والفوج المحددين.";
    a.hidden = r > 0;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:712697-712895 (Mh). */
function updateScheduleStudentCount(formElement) {
  const t = formElement.querySelectorAll('input[name="studentIds"]:checked:not(:disabled)').length;
  const r = formElement.querySelector("[data-schedule-student-count]");
  if (r) {
    r.textContent = t ? `${t} طالب` : "اختيار طلبة";
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:712895-713181 (Bh). */
function updateStudentOnlyFields(formElement = state.mainElement) {
  const t = formElement.querySelector("[data-new-user-role]");
  if (!t) return;
  const r = t.value === "student";
  formElement.querySelectorAll("[data-student-only-field]").forEach((a) => {
    a.classList.toggle("is-disabled-field", !r);
    a.querySelectorAll("input, select, textarea").forEach((n) => {
      n.disabled = !r;
    });
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:713181-713622 (D_). */
function handleTableSearch(event) {
  const t = event.target.closest("[data-exam-management-search]");
  if (t) {
    filterExamCards(t);
    return;
  }
  const element = event.target.closest("[data-table-search]");
  if (!element) return;
  const formElement = element.closest(".table-search")?.nextElementSibling;
  const n = formElement?.classList.contains("table-wrap") ? formElement.querySelector("table") : null;
  if (!n) return;
  const i = element.value.trim().toLowerCase();
  tableRows(n).forEach((element2) => {
    element2.dataset.tableSearchHidden =
      i && !element2.textContent.toLowerCase().includes(i) ? "true" : "false";
  });
  paginateTable(n, 1);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:713622-713916 (R_). */
function filterExamCards(element) {
  const formElement = element.closest(".panel");
  if (!formElement) return;
  const r = element.value.trim().toLowerCase();
  const a = [...formElement.querySelectorAll("[data-exam-card]")];
  let n = 0;
  a.forEach((element2) => {
    const o = !r || element2.dataset.search.includes(r);
    element2.hidden = !o;
    if (o) {
      n += 1;
    }
  });
  const i = formElement.querySelector(".exam-management-empty");
  if (i) {
    i.hidden = n > 0;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:713916-714529 (P_). */
function filterAdminTable(element) {
  const formElement = element.closest(".panel");
  if (!formElement) return;
  const formData = new FormData(element);
  const a = String(formData.get("search") || "")
    .trim()
    .toLowerCase();
  const n = String(formData.get("status") || "");
  const i = String(formData.get("role") || "");
  const s = String(formData.get("program") || "");
  const o = [...formElement.querySelectorAll("[data-admin-row]")];
  let c = 0;
  o.forEach((element2) => {
    const f = !a || element2.dataset.search.toLowerCase().includes(a);
    const m = !n || element2.dataset.status === n;
    const u = !i || element2.dataset.role === i;
    const x = !s || element2.dataset.program === s;
    const b = f && m && u && x;
    element2.dataset.filterHidden = b ? "false" : "true";
    if (b) {
      c += 1;
    }
  });
  formElement.querySelectorAll(".table-wrap table").forEach((d) => paginateTable(d, 1));
  const l = formElement.querySelector(".admin-filter-empty");
  if (l) {
    l.hidden = c > 0;
  }
}
