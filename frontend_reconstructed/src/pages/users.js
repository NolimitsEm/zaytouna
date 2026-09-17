import { routeQuery } from "../routes/router.js";
import { state } from "../context/state.js";
import {
  activityStatus,
  activityStatusClass,
  escapeHtml,
  formatDateTime,
  groupName,
  latestUserActivity,
  levelName,
  registrationStatus,
  renderOption,
} from "../utils/formatters.js";
import { normalizePayment } from "../services/auth.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:544025-545840 (DE). */
function renderUserDirectory() {
  const panel = routeQuery().get("panel");
  if (panel === "email")
    return `
      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>إعدادات البريد الإلكتروني</h2>
            <p>اضبط Gmail الذي سيظهر كمرسل في رسائل تفعيل الحسابات.</p>
          </div>
          <a class="button ghost" href="#users">رجوع إلى بيانات المستخدمين</a>
        </div>
        ${renderEmailSettingsForm()}
      </section>
    `;
  if (panel === "create")
    return `
      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>إضافة مستخدم جديد</h2>
            <p>أنشئ حساب طالب أو أستاذ أو إدارة، وسيصل رابط التفعيل واختيار كلمة المرور إلى البريد الإلكتروني فقط.</p>
          </div>
          <a class="button ghost" href="#users">رجوع إلى بيانات المستخدمين</a>
        </div>
        ${renderUserCreateForm()}
      </section>
    `;
  const view = routeQuery().get("view");
  if (view === "students") {
    const niveau = routeQuery().get("niveau");
    const groupe = routeQuery().get("groupe");
    if (niveau && groupe) {
      const n = state.users.filter(
        (user) => user.role === "student" && user.niveauId === niveau && user.groupeId === groupe,
      );
      return renderUserListPanel({
        title: `${levelName(niveau)} · ${groupName(groupe)}`,
        description: "حسابات الطلبة المسجلة في هذا الفوج.",
        backHref: "#users?view=students",
        items: n,
      });
    }
    return renderStudentCohorts();
  }
  return view === "teachers"
    ? renderUserListPanel({
        title: "حسابات الأساتذة",
        description: "كل حسابات الأساتذة المسجلة في المنصة.",
        backHref: "#users",
        items: state.users.filter((user) => user.role === "teacher"),
      })
    : view === "admins"
      ? renderUserListPanel({
          title: "حسابات الإدارة",
          description: "كل الحسابات الإدارية التي يمكنها دخول لوحة الإدارة.",
          backHref: "#users",
          items: state.users.filter((user) => user.role === "admin"),
        })
      : `
    <section class="panel">
      <h2>بيانات المستخدمين</h2>
      <div class="user-management-actions">
        <a class="button secondary" href="#users?panel=email">إعدادات البريد الإلكتروني</a>
        <a class="button primary" href="#users?panel=create">إضافة مستخدم جديد</a>
      </div>
      ${renderActivationOutbox()}
      ${renderUserDirectoryCards()}
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:545840-546415 (RE). */
function renderUserDirectoryCards() {
  const e = state.users.filter((user) => user.role === "student").length;
  const t = state.users.filter((user) => user.role === "teacher").length;
  const r = state.users.filter((user) => user.role === "admin").length;
  return `
    <div class="grid three user-directory-grid">
      ${renderDirectoryCard({
        title: "الطلبة",
        description: "ادخل للأفواج ثم افتح حسابات الطلبة المرتبطة بكل فوج.",
        count: e,
        href: "#users?view=students",
      })}
      ${renderDirectoryCard({
        title: "الأساتذة",
        description: "عرض وتعديل وتفعيل حسابات الأساتذة.",
        count: t,
        href: "#users?view=teachers",
      })}
      ${renderDirectoryCard({
        title: "الإدارة",
        description: "عرض وتعديل الحسابات الإدارية.",
        count: r,
        href: "#users?view=admins",
      })}
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:546415-546807 (To). */
function renderDirectoryCard({ title: e, description: t, count: r, href: a }) {
  return `
    <article class="card subject-card user-directory-card">
      <div class="chips">
        <span class="chip turquoise">${r} حساب</span>
      </div>
      <h3>${escapeHtml(e)}</h3>
      <p class="muted">${escapeHtml(t)}</p>
      <div class="card-actions">
        <a class="button secondary" href="${a}">فتح</a>
      </div>
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:546807-547304 (PE). */
function renderStudentCohorts() {
  const items = studentCohorts();
  return `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>أفواج الطلبة</h2>
          <p>اختر الفوج حتى تظهر حسابات الطلبة المسجلة فيه.</p>
        </div>
        <a class="button ghost" href="#users">رجوع إلى بيانات المستخدمين</a>
      </div>
      <div class="grid three user-directory-grid">
        ${items.length ? items.map(renderCohortCard).join("") : '<div class="empty-state">لا توجد حسابات طلبة حاليًا.</div>'}
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:547304-547686 (OE). */
function studentCohorts() {
  return [
    ...new Set(
      state.users
        .filter((user) => user.role === "student" && user.niveauId && user.groupeId)
        .map((e) => `${e.niveauId}::${e.groupeId}`),
    ),
  ]
    .map((e) => {
      const [t, r] = e.split("::");
      return {
        niveauId: t,
        groupeId: r,
        count: state.users.filter(
          (user) => user.role === "student" && user.niveauId === t && user.groupeId === r,
        ).length,
      };
    })
    .sort((e, t) =>
      `${levelName(e.niveauId)} ${groupName(e.groupeId)}`.localeCompare(
        `${levelName(t.niveauId)} ${groupName(t.groupeId)}`,
        "ar",
      ),
    );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:547686-548270 (LE). */
function renderCohortCard(e) {
  return `
    <article class="card subject-card user-directory-card">
      <div class="chips">
        <span class="chip turquoise">${escapeHtml(levelName(e.niveauId))}</span>
        <span class="chip gold">${e.count} طالب</span>
      </div>
      <h3>${escapeHtml(groupName(e.groupeId))}</h3>
      <p class="muted">حسابات ${escapeHtml(levelName(e.niveauId))} · ${escapeHtml(groupName(e.groupeId))}</p>
      <div class="card-actions">
        <a class="button secondary" href="#users?view=students&niveau=${encodeURIComponent(e.niveauId)}&groupe=${encodeURIComponent(e.groupeId)}">عرض الحسابات</a>
      </div>
    </article>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:548270-548593 (Eo). */
function renderUserListPanel({ title: e, description: t, backHref: r, items: a }) {
  return `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>${escapeHtml(e)}</h2>
          <p>${escapeHtml(t)}</p>
        </div>
        <a class="button ghost" href="${r}">رجوع</a>
      </div>
      ${renderActivationOutbox()}
      ${renderUserTable(a)}
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:548593-549736 (ME). */
function renderUserTable(items) {
  return items.length
    ? `
    ${renderUserFilters()}
    <div class="bulk-user-actions">
      <label class="checkline">
        <input type="checkbox" data-select-all-users>
        <span>تحديد الكل</span>
      </label>
      <button class="button secondary" type="button" data-activate-selected-users>تشغيل الحسابات المؤكدة / إرسال التفعيل لغير المؤكدة</button>
    </div>
    <div class="table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th>تحديد</th>
            <th>الاسم</th>
            <th>البريد</th>
            <th>CIN</th>
            <th>الهاتف</th>
            <th>تاريخ الولادة</th>
            <th>المعرف</th>
            <th>الدور</th>
            <th>المستوى</th>
            <th>المجموعة</th>
            <th>الدفع</th>
            <th>تأكيد البريد</th>
            <th>الحالة</th>
            <th>إدارة الحساب</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((t) => renderUserRow(t)).join("")}
        </tbody>
      </table>
    </div>
    <div class="empty-state admin-filter-empty" hidden>لا توجد نتائج مطابقة للبحث.</div>
  `
    : '<div class="empty-state">لا توجد حسابات في هذه القائمة.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:549736-551648 (BE). */
function renderEmailSettingsForm() {
  return `
    <form class="grid two email-settings-form" data-email-settings-form>
      <div class="field">
        <label for="mailFromName">اسم المرسل</label>
        <input id="mailFromName" name="fromName" value="${escapeHtml(state.emailSettings.fromName || "")}" placeholder="مشيخة التعليم الزيتوني وفروعه" required>
      </div>
      <div class="field">
        <label for="mailFromEmail">Gmail المرسل</label>
        <input id="mailFromEmail" name="fromEmail" type="email" value="${escapeHtml(state.emailSettings.fromEmail || "")}" placeholder="votre.email@gmail.com" required>
      </div>
      <div class="field">
        <label for="mailSmtpHost">SMTP host</label>
        <input id="mailSmtpHost" name="smtpHost" value="${escapeHtml(state.emailSettings.smtpHost || "smtp.gmail.com")}" required>
      </div>
      <div class="field">
        <label for="mailSmtpPort">SMTP port</label>
        <input id="mailSmtpPort" name="smtpPort" inputmode="numeric" value="${escapeHtml(state.emailSettings.smtpPort || "587")}" required>
      </div>
      <div class="field">
        <label for="mailAppPassword">Gmail App Password</label>
        <input id="mailAppPassword" name="appPassword" type="password" value="" autocomplete="new-password" placeholder="اتركه فارغًا إذا كان محفوظًا في backend">
      </div>
      <label class="checkline email-auto-send">
        <input type="checkbox" name="autoSendActivation" ${state.emailSettings.autoSendActivation ? "checked" : ""}>
        <span>إرسال رابط التفعيل بالبريد تلقائيًا عند إنشاء أو قبول الحساب</span>
      </label>
      <div class="email-settings-note span-two">
        <strong>الحالة:</strong>
        ${state.emailSettings.fromEmail ? `البريد المرسل مضبوط على ${escapeHtml(state.emailSettings.fromEmail)}.` : "لم يتم ضبط Gmail بعد."}
        <span>الإرسال الحقيقي يحتاج backend، أما هذه الإعدادات تحفظ الآن لاستعمالها في رسائل التفعيل.</span>
      </div>
      <div class="form-actions span-two">
        <button class="button secondary" type="submit">حفظ إعدادات البريد</button>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:551648-555855 (UE). */
function renderUserCreateForm() {
  return `
    <form class="grid two user-create-form" data-user-create-form>
      <div class="field">
        <label for="newUserName">الاسم واللقب</label>
        <input id="newUserName" name="name" required>
      </div>
      <div class="field">
        <label for="newUserEmail">البريد الإلكتروني</label>
        <input id="newUserEmail" name="email" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="newUserCin">CIN</label>
        <input id="newUserCin" name="cin" inputmode="numeric" pattern="[0-9]*" title="الأرقام فقط مسموح بها.">
      </div>
      <div class="field">
        <label for="newUserPhone">رقم الهاتف</label>
        <input id="newUserPhone" name="phone" inputmode="tel" pattern="[0-9\\s\\-+]*" title="الأرقام والمسافات و + و - فقط مسموح بها.">
      </div>
      <div class="field">
        <label for="newUserBirthDate">تاريخ الولادة</label>
        <input id="newUserBirthDate" name="birthDate" type="date">
      </div>
      <div class="field">
        <label for="newUserRole">نوع الحساب</label>
        <select id="newUserRole" name="role" required data-new-user-role>
          ${renderOption("student", "طالب")}
          ${renderOption("teacher", "أستاذ")}
          ${renderOption("admin", "إدارة")}
        </select>
      </div>
      <div class="field" data-student-only-field>
        <label for="newUserNiveau">السنة</label>
        <select id="newUserNiveau" name="niveauId">
          ${state.levels.map((e) => renderOption(e.id, e.name)).join("")}
        </select>
      </div>
      <div class="field" data-student-only-field>
        <label for="newUserGroupe">الفوج</label>
        <select id="newUserGroupe" name="groupeId">
          ${state.groups.map((e) => renderOption(e.id, e.name)).join("")}
        </select>
      </div>
      <div class="field" data-student-only-field>
        <label for="newUserResidence">مكان السكن</label>
        <input id="newUserResidence" name="residence" autocomplete="address-level2" required>
      </div>
      <fieldset class="field payment-fieldset span-two" data-student-only-field>
        <legend>الدفع للطلبة</legend>
        <label class="checkline"><input type="checkbox" name="paymentS1"> <span>السداسي الأول</span></label>
        <label class="checkline"><input type="checkbox" name="paymentS2"> <span>السداسي الثاني</span></label>
        <label class="checkline"><input type="checkbox" name="paymentAllYear"> <span>السنة كاملة</span></label>
      </fieldset>
      <div class="form-actions span-two">
        <button class="button primary" type="submit">إنشاء الحساب وإرسال إيميل التفعيل</button>
      </div>
    </form>
    <form class="panel bulk-student-import" data-bulk-student-import-form>
      <div class="section-heading compact"><div><h3>استيراد قائمة حسابات من Excel</h3><p>ارفع ملف XLSX؛ ستُنشأ حسابات الطلبة أو الأساتذة أو الإدارة ويُرسل رابط التفعيل إلى كل بريد صحيح.</p></div></div>
      <div class="field"><label for="bulk-student-file">ملف Excel (XLSX)</label><input id="bulk-student-file" name="studentsFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required></div>
      <div class="grid three">
        <div class="field"><label for="importDefaultNiveau">السنة الافتراضية للطلبة</label><select id="importDefaultNiveau" name="importDefaultNiveau">${state.levels.map((e) => renderOption(e.id, e.name)).join("")}</select></div>
        <div class="field"><label for="importDefaultGroupe">الفوج الافتراضي للطلبة</label><select id="importDefaultGroupe" name="importDefaultGroupe">${state.groups.map((e) => renderOption(e.id, e.name)).join("")}</select></div>
        <div class="field"><label for="importDefaultResidence">مكان السكن الافتراضي</label><input id="importDefaultResidence" name="importDefaultResidence" value="غير محدد"></div>
      </div>
      <p class="muted">أسهل ملف: Name و Email فقط. Role اختياري (student افتراضيًا). السنة والفوج أعلاه يُطبّقان آليًا على الطلبة. الأعمدة الأخرى اختيارية: CIN، Phone، Birth Date، Payment S1، Payment S2.</p>
      <div class="form-actions"><a class="button ghost" href="/templates/exemple-import-comptes.xlsx" download>تحميل ملف المثال</a><button class="button primary" type="submit">استيراد الحسابات وإرسال روابط التفعيل</button></div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:555855-556382 (th). */
function renderActivationOutbox() {
  const items = state.users.filter((t) => !t.emailConfirmed && t.activationEmailSentAt);
  return items.length
    ? `
    <div class="activation-outbox">
      <strong>رسائل التفعيل بالبريد</strong>
      ${items
        .map(
          (user) => `
        <div class="activation-mail">
          <span>
            ${escapeHtml(user.name)} · ${escapeHtml(user.email)} · من ${escapeHtml(user.activationSenderEmail || state.emailSettings.fromEmail || "غير مضبوط")}
            <small>${escapeHtml(activationDeliveryLabel(user))}</small>
          </span>
          <span class="activation-mail-note">البريد فقط</span>
        </div>
      `,
        )
        .join("")}
    </div>
  `
    : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:556382-556620 (qE). */
function activationDeliveryLabel(e) {
  return e.activationDeliveryStatus === "sent"
    ? "تم إرسال الإيميل"
    : e.activationDeliveryStatus === "failed"
      ? `فشل الإرسال: ${e.activationDeliveryMessage || "-"}`
      : e.activationDeliveryStatus === "queued"
        ? "في انتظار الإرسال"
        : "لم يرسل بعد";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:556620-557440 (jE). */
function renderRegistrationTable() {
  return state.registrationRequests.length
    ? `
    ${renderRegistrationFilters()}
    <div class="table-wrap">
      <table class="registration-table">
        <thead>
          <tr>
            <th>اللقب</th>
            <th>الاسم</th>
            <th>المستوى الدراسي</th>
            <th>تاريخ الولادة</th>
            <th>CIN / Passport</th>
            <th>المهنة</th>
            <th>البريد</th>
            <th>الهاتف</th>
            <th>التسجيل في</th>
            <th>السنة</th>
            <th>رسالة</th>
            <th>الحالة</th>
            <th>الإجراء</th>
          </tr>
        </thead>
        <tbody>
          ${state.registrationRequests.map((e) => renderRegistrationRow(e)).join("")}
        </tbody>
      </table>
    </div>
    <div class="empty-state admin-filter-empty" hidden>لا توجد مطالب مطابقة للبحث.</div>
  `
    : '<div class="empty-state">لا توجد مطالب تسجيل حاليًا.</div>';
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:557440-558416 (zE). */
function renderRegistrationFilters() {
  return `
    <form class="admin-table-filters" data-admin-table-filter="registrations">
      <div class="field">
        <label for="registrationSearch">بحث</label>
        <input id="registrationSearch" name="search" placeholder="الاسم، CIN/Passport، البريد، الهاتف، الرسالة">
      </div>
      <div class="field">
        <label for="registrationStatusFilter">الحالة</label>
        <select id="registrationStatusFilter" name="status">
          <option value="">كل الحالات</option>
          <option value="pending">في الانتظار</option>
          <option value="accepted">مقبول</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>
      <div class="field">
        <label for="registrationProgramFilter">التسجيل في</label>
        <select id="registrationProgramFilter" name="program">
          <option value="">كل البرامج</option>
          ${state.programNames.map((e) => renderOption(e, e)).join("")}
        </select>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:558416-559467 (HE). */
function renderUserFilters() {
  return `
    <form class="admin-table-filters" data-admin-table-filter="users">
      <div class="field">
        <label for="userSearch">بحث</label>
        <input id="userSearch" name="search" placeholder="الاسم، البريد، المعرف، المستوى، المجموعة">
      </div>
      <div class="field">
        <label for="userRoleFilter">الدور</label>
        <select id="userRoleFilter" name="role">
          <option value="">كل الأدوار</option>
          <option value="student">طالب</option>
          <option value="teacher">أستاذ</option>
          <option value="admin">إدارة</option>
        </select>
      </div>
      <div class="field">
        <label for="userStatusFilter">الحالة</label>
        <select id="userStatusFilter" name="status">
          <option value="">كل الحالات</option>
          <option value="online">متصل</option>
          <option value="inactive">غير نشط</option>
          <option value="offline">غير متصل</option>
          <option value="disabled">معطّل</option>
        </select>
      </div>
    </form>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:559467-561125 (WE). */
function renderRegistrationRow(user) {
  const t = user.status === "pending";
  const r = [
    user.secondName,
    user.firstName,
    user.fullName,
    user.studyLevel,
    user.niveauId ? levelName(user.niveauId) : "",
    user.sana ? levelName(user.sana) : "",
    user.birthDate,
    user.cinPassport,
    user.cin,
    user.passportNumber,
    user.profession,
    user.email,
    user.phone,
    user.program,
    user.message,
    user.notes,
    registrationStatus(user.status),
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <tr data-admin-row data-search="${escapeHtml(r)}" data-status="${user.status}" data-program="${escapeHtml(user.program || "")}">
      <td>${escapeHtml(user.secondName || user.fullName || "-")}</td>
      <td>${escapeHtml(user.firstName || "-")}</td>
      <td>${escapeHtml(user.studyLevel || levelName(user.niveauId) || "-")}</td>
      <td>${escapeHtml(user.birthDate || "-")}</td>
      <td>${escapeHtml(user.cinPassport || user.cin || user.passportNumber || "-")}</td>
      <td>${escapeHtml(user.profession || "-")}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.phone)}</td>
      <td>${escapeHtml(user.program || "-")}</td>
      <td>${escapeHtml(levelName(user.niveauId || user.sana) || "-")}</td>
      <td>${escapeHtml(user.message || user.notes || "-")}</td>
      <td><span class="chip ${user.status === "accepted" ? "turquoise" : ""}">${registrationStatus(user.status)}</span></td>
      <td>
        ${
          t
            ? `
          <div class="table-actions">
            <button class="button secondary" type="button" data-accept-registration="${user.id}">قبول الحساب</button>
            <button class="button ghost" type="button" data-reject-registration="${user.id}">رفض</button>
            <button class="button ghost danger" type="button" data-delete-registration="${user.id}">حذف</button>
          </div>
        `
            : `
          <div class="table-actions">
            <span class="muted">${formatDateTime(user.decidedAt)}</span>
            <button class="button ghost danger" type="button" data-delete-registration="${user.id}">حذف</button>
          </div>
        `
        }
      </td>
    </tr>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:561125-563396 (VE). */
function renderUserRow(user) {
  const t = latestUserActivity(user.id);
  const r = user.isDisabled ? "معطّل" : t ? activityStatus(t) : "غير متصل";
  const a = activityStatusClass(r);
  const payment = normalizePayment(user.payment);
  const i = user.emailConfirmed ? "مؤكد" : user.activationEmailSentAt ? "أُرسل التفعيل" : "في الانتظار";
  const s = [
    user.name,
    user.id,
    user.email,
    user.cin,
    user.phone,
    user.birthDate,
    user.roleLabel,
    user.niveauId ? levelName(user.niveauId) : "",
    user.groupeId ? groupName(user.groupeId) : "",
    r,
    i,
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <tr data-admin-row data-search="${escapeHtml(s)}" data-role="${user.role}" data-status="${a}">
      <td><input type="checkbox" data-user-select value="${escapeHtml(user.id)}" ${state.currentUser?.id === user.id ? "disabled" : ""}></td>
      <td>${user.name}</td>
      <td>${escapeHtml(user.email || "-")}</td>
      <td>${escapeHtml(user.cin || "-")}</td>
      <td>${escapeHtml(user.phone || "-")}</td>
      <td>${escapeHtml(user.birthDate || "-")}</td>
      <td>${user.id}</td>
      <td>${user.roleLabel}</td>
      <td>${user.niveauId ? levelName(user.niveauId) : "-"}</td>
      <td>${user.groupeId ? groupName(user.groupeId) : "-"}</td>
      <td>
        ${
          user.role === "student"
            ? `
          <div class="payment-checks">
            <label><input type="checkbox" data-payment-toggle data-payment-user="${escapeHtml(user.id)}" data-payment-field="s1" ${payment.s1 ? "checked" : ""}> S1</label>
            <label><input type="checkbox" data-payment-toggle data-payment-user="${escapeHtml(user.id)}" data-payment-field="s2" ${payment.s2 ? "checked" : ""}> S2</label>
            <label><input type="checkbox" data-payment-toggle data-payment-user="${escapeHtml(user.id)}" data-payment-field="allYear" ${payment.allYear ? "checked" : ""}> سنة كاملة</label>
          </div>
        `
            : "-"
        }
      </td>
      <td><span class="chip ${user.emailConfirmed ? "turquoise" : user.activationEmailSentAt ? "gold" : ""}">${i}</span></td>
      <td><span class="chip ${r === "متصل" ? "turquoise" : ""}">${r}</span></td>
      <td>
        <div class="table-actions">
          <button class="button secondary" type="button" data-edit-user="${user.id}">تعديل</button>
          <button class="button ghost" type="button" data-password-user="${user.id}">كلمة المرور</button>
          <button class="button ghost" type="button" data-toggle-user="${user.id}">${user.isDisabled ? "تشغيل الحساب" : "تعطيل"}</button>
          ${user.emailConfirmed && !user.isDisabled ? `<button class="button ghost" type="button" data-unlock-user="${escapeHtml(user.id)}">رفع حظر الدخول</button>` : ""}
          ${user.emailConfirmed ? "" : `<button class="button ghost" type="button" data-send-activation="${escapeHtml(user.id)}">إرسال التفعيل بالبريد</button>`}
          <button class="button ghost danger" type="button" data-delete-user="${user.id}">حذف</button>
        </div>
      </td>
    </tr>
  `;
}
