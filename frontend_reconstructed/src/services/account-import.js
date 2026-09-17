import { state } from "../context/state.js";
import { read as readWorkbook, utils as workbookUtils } from "xlsx";
import { nextRegistrationNumber, prepareActivation } from "./user-management.js";
import { roleLabel } from "../utils/formatters.js";
import { normalizePayment } from "./auth.js";
import { awaitSave, saveUsers } from "./state-repository.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:648177-648365 (Er). */
function spreadsheetField(e, items) {
  const r = Object.entries(e || {});
  const a = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_\-]/g, "");
  const n = items.map(a);
  const i = r.find(([s]) => n.includes(a(s)));
  return String(i?.[1] ?? "").trim();
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:648365-648513 (V0). */
function resolveImportedTarget(e, t) {
  const r = String(e || "").trim();
  return (
    t.find(
      (a) =>
        String(a.id) === r ||
        String(a.name || "")
          .trim()
          .toLowerCase() === r.toLowerCase(),
    )?.id || ""
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:648513-648743 (WA). */
function importedRole(e) {
  const t = String(e || "student")
    .trim()
    .toLowerCase();
  return ["teacher", "prof", "professeur", "أستاذ", "استاذ"].includes(t)
    ? "teacher"
    : ["admin", "administrator", "administration", "إدارة", "ادارة"].includes(t)
      ? "admin"
      : "student";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:648743-648848 (_o). */
function importedBoolean(e) {
  return ["1", "true", "yes", "oui", "نعم", "مدفوع"].includes(
    String(e || "")
      .trim()
      .toLowerCase(),
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:648848-651125 (VA). */
async function importAccounts(e, t = {}) {
  if (state.currentUser?.role !== "admin") throw new Error("هذه العملية مخصصة للإدارة.");
  const workbook = readWorkbook(await e.arrayBuffer(), {
    type: "array",
  });
  const a = workbook.Sheets[workbook.SheetNames[0]];
  const n = workbookUtils.sheet_to_json(a, {
    defval: "",
  });
  if (!n.length) throw new Error("ملف Excel فارغ.");
  if (n.length > 500) throw new Error("الحد الأقصى هو 500 حساب في كل ملف.");
  const uniqueValues = new Set(
    state.users.map((user) =>
      String(user.email || "")
        .trim()
        .toLowerCase(),
    ),
  );
  const uniqueValues2 = new Set(state.users.map((u) => String(u.id)));
  const o = nextRegistrationNumber();
  const c = o.slice(0, -4);
  let l = Number(o.slice(-4)) || 1;
  const d = [];
  const f = [];
  if (
    (n.forEach((u, x) => {
      const b = x + 2;
      const g = spreadsheetField(u, ["الاسم", "الاسم واللقب", "name", "nom", "full name"]);
      const p = spreadsheetField(u, [
        "البريد الإلكتروني",
        "البريد الالكتروني",
        "email",
        "e-mail",
      ]).toLowerCase();
      const S = importedRole(spreadsheetField(u, ["role", "role type", "نوع الحساب", "الدور"]));
      const v =
        spreadsheetField(u, ["مكان السكن", "السكن", "residence", "address", "adresse"]) ||
        String(t.residence || "غير محدد").trim();
      const F =
        resolveImportedTarget(
          spreadsheetField(u, ["السنة", "المستوى", "niveau", "niveauid", "level"]),
          state.levels,
        ) || String(t.niveauId || state.levels[0]?.id || "");
      const L =
        resolveImportedTarget(
          spreadsheetField(u, ["الفوج", "المجموعة", "groupe", "groupeid", "group"]),
          state.groups,
        ) || String(t.groupeId || state.groups[0]?.id || "");
      if (!g || !p || (S === "student" && (!v || !F || !L)) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) {
        f.push(`السطر ${b}: بيانات إجبارية ناقصة أو غير صحيحة`);
        return;
      }
      if (uniqueValues.has(p)) {
        f.push(`السطر ${b}: البريد الإلكتروني مكرر`);
        return;
      }
      uniqueValues.add(p);
      const j =
        g
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/^-+|-+$/g, "") || "student";
      let N = j;
      let O = 1;
      for (; uniqueValues2.has(N); ) N = `${j}-${++O}`;
      uniqueValues2.add(N);
      d.push({
        id: N,
        name: g,
        email: p,
        role: S,
        roleLabel: roleLabel(S),
        cin: spreadsheetField(u, ["cin", "بطاقة التعريف"]),
        phone: spreadsheetField(u, ["الهاتف", "رقم الهاتف", "phone", "tel"]),
        birthDate: spreadsheetField(u, ["تاريخ الولادة", "birthdate", "birth date", "date de naissance"]),
        residence: S === "student" ? v : "",
        niveauId: S === "student" ? F : "",
        groupeId: S === "student" ? L : "",
        registrationNumber: S === "student" ? `${c}${String(l++).padStart(4, "0")}` : "",
        payment: normalizePayment(
          S === "student"
            ? {
                s1: importedBoolean(spreadsheetField(u, ["payment s1", "payments1", "دفع السداسي الأول"])),
                s2: importedBoolean(spreadsheetField(u, ["payment s2", "payments2", "دفع السداسي الثاني"])),
                allYear: importedBoolean(
                  spreadsheetField(u, ["full year payment", "paymentallyear", "دفع السنة كاملة"]),
                ),
              }
            : {},
        ),
        password: "",
        isDisabled: true,
        emailConfirmed: false,
        activationToken: "",
        activationEmailSentAt: "",
        confirmedAt: "",
      });
    }),
    !d.length)
  )
    return {
      created: d,
      skipped: f,
    };
  const m = state.users;
  if (((state.users = [...state.users, ...d]), !(await awaitSave(saveUsers()))))
    throw ((state.users = m), new Error("فشل حفظ الحسابات في قاعدة البيانات."));
  d.forEach((u) => prepareActivation(u));
  return {
    created: d,
    skipped: f,
  };
}
