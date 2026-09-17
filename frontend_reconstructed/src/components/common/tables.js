import { state } from "../../context/state.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:418310-419119 (Dy). */
function enhanceTables(e = state.mainElement) {
  e.querySelectorAll(".table-wrap table").forEach((element) => {
    tableRows(element).forEach((element2) => {
      if (!element2.dataset.filterHidden) {
        element2.dataset.filterHidden = "false";
      }
      if (!element2.dataset.tableSearchHidden) {
        element2.dataset.tableSearchHidden = "false";
      }
    });
    const a = element.closest(".table-wrap");
    if (a) {
      addTableSearch(element, a);
      if (!a.nextElementSibling?.classList.contains("table-pagination")) {
        a.insertAdjacentHTML(
          "afterend",
          `
        <div class="table-pagination" aria-label="تصفح الجدول">
          <button class="button ghost table-page-button" type="button" data-table-page="prev" aria-label="الصفحة السابقة">&#8249;</button>
          <span data-table-page-label></span>
          <button class="button ghost table-page-button" type="button" data-table-page="next" aria-label="الصفحة التالية">&#8250;</button>
        </div>
      `,
        );
      }
      paginateTable(element, Number(element.dataset.currentPage) || 1);
    }
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:419119-419534 (Ry). */
function addTableSearch(e, element) {
  if (
    !!element.closest(".panel")?.querySelector("[data-admin-table-filter]") ||
    element.previousElementSibling?.classList.contains("table-search")
  )
    return;
  const n = `table-search-${Math.random().toString(36).slice(2)}`;
  element.insertAdjacentHTML(
    "beforebegin",
    `
    <div class="table-search field">
      <label for="${n}">بحث</label>
      <input id="${n}" data-table-search placeholder="بحث داخل الجدول">
    </div>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:419534-419591 (Pc). */
function tableRows(e) {
  return [...e.querySelectorAll("tbody tr")];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:419591-419974 (js). */
function paginateTable(element, t = 1) {
  const items = tableRows(element);
  const a = items.filter(
    (element2) => element2.dataset.filterHidden !== "true" && element2.dataset.tableSearchHidden !== "true",
  );
  const n = Math.max(1, Math.ceil(a.length / state.tablePageSize));
  const i = Math.min(Math.max(1, t), n);
  const s = (i - 1) * state.tablePageSize;
  const o = s + state.tablePageSize;
  items.forEach((element2) => {
    const l = element2.dataset.filterHidden === "true" || element2.dataset.tableSearchHidden === "true";
    const d = a.indexOf(element2);
    element2.hidden = l || d < s || d >= o;
  });
  element.dataset.currentPage = String(i);
  updatePaginationControls(element, i, n, a.length);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:419974-420334 (Py). */
function updatePaginationControls(element, t, r, a) {
  const formElement = element.closest(".table-wrap")?.nextElementSibling;
  if (!formElement?.classList.contains("table-pagination")) return;
  formElement.hidden = a <= state.tablePageSize;
  const i = formElement.querySelector("[data-table-page-label]");
  const s = formElement.querySelector("[data-table-page='prev']");
  const o = formElement.querySelector("[data-table-page='next']");
  if (i) {
    i.textContent = `${t} / ${r}`;
  }
  if (s) {
    s.disabled = t <= 1;
  }
  if (o) {
    o.disabled = t >= r;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:420334-420485 (Oy). */
function paginationTable(element) {
  const formElement = element.closest(".table-pagination")?.previousElementSibling;
  return formElement?.classList.contains("table-wrap") ? formElement.querySelector("table") : null;
}
