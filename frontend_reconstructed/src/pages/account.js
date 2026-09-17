import { state } from "../context/state.js";
import { renderAvatar, renderSignedInAccount } from "../layouts/navigation.js";
import { escapeHtml, groupName, levelName, roleLabel } from "../utils/formatters.js";
import { postJson } from "../services/http.js";
import { currentRoute, dashboardRoute, renderRoute } from "../routes/router.js";
import { normalizeUsers, setCurrentUser } from "../services/auth.js";
import { renderDashboard } from "../components/content-management.js";
import { cacheValue } from "../services/state-repository.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:471268-472509 (nt). */
function renderLoginPage() {
  return state.currentUser
    ? renderSignedInAccount("أنت داخل بحسابك.")
    : `
    <section class="section" aria-labelledby="login-title">
      <div class="login-shell">
        <div class="login-intro">
          <img class="login-logo" src="assets/main-logo.png" alt="الشعار الرئيسي لمشيخة التعليم الزيتوني وفروعه">
          <p class="eyebrow">تسجيل الدخول</p>
          <h1 id="login-title">ادخل إلى مساحتك التعليمية.</h1>
          <p>استعمل البريد الإلكتروني وكلمة المرور. الحسابات الجديدة لا تفتح إلا بعد تأكيد رابط التفعيل واختيار كلمة مرور قوية.</p>
        </div>
        <form class="login-form" data-login-form>
          <div class="field">
            <label for="loginEmail">البريد الإلكتروني</label>
            <input id="loginEmail" name="email" type="email" autocomplete="email" placeholder="admin@example.org" required>
          </div>
          <div class="field">
            <label for="password">كلمة المرور</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>
          </div>
          <button class="button primary full" type="submit">تسجيل الدخول</button>
          <a class="button ghost full" href="#register">إنشاء حساب جديد</a>
        </form>
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:472509-475055 (_T). */
function renderCompleteSignupPage() {
  if (state.currentUser) return renderSignedInAccount("حسابك مفتوح في المنصة.");
  const e = state.activationToken;
  const user = state.activationUser;
  return e && !user && state.activationRequests.get(e) !== "failed"
    ? (loadActivationInvite(e),
      `
      <section class="section" aria-labelledby="signup-title">
        <div class="login-shell">
          <div class="login-intro">
            <img class="login-logo" src="assets/main-logo.png" alt="الشعار الرئيسي لمشيخة التعليم الزيتوني وفروعه">
            <p class="eyebrow">تأكيد الحساب</p>
            <h1 id="signup-title">جاري التحقق من رابط التفعيل.</h1>
            <p>نفتح صفحة اختيار كلمة المرور خلال لحظات.</p>
          </div>
          <div class="login-form">
            <div class="empty-state">جاري تحميل بيانات الحساب...</div>
          </div>
        </div>
      </section>
    `)
    : !e || !user
      ? `
      <section class="section" aria-labelledby="signup-title">
        <div class="login-shell">
          <div class="login-intro">
            <img class="login-logo" src="assets/main-logo.png" alt="الشعار الرئيسي لمشيخة التعليم الزيتوني وفروعه">
            <p class="eyebrow">تأكيد الحساب</p>
            <h1 id="signup-title">رابط التفعيل غير صالح.</h1>
            <p>اطلب من الإدارة إرسال رابط تفعيل جديد من صفحة إدارة المستخدمين.</p>
          </div>
          <div class="login-form">
            <a class="button primary full" href="#login">الرجوع لتسجيل الدخول</a>
          </div>
        </div>
      </section>
    `
      : `
    <section class="section" aria-labelledby="signup-title">
      <div class="login-shell">
        <div class="login-intro">
          <img class="login-logo" src="assets/main-logo.png" alt="الشعار الرئيسي لمشيخة التعليم الزيتوني وفروعه">
          <p class="eyebrow">تأكيد الحساب</p>
          <h1 id="signup-title">أكمل إنشاء كلمة المرور.</h1>
          <p>${escapeHtml(user.name)} · ${escapeHtml(user.email)}. بعد الحفظ يصير الحساب مفعّلًا ويمكنك الدخول مباشرة.</p>
        </div>
        <form class="login-form" data-complete-signup-form>
          <div class="field">
            <label for="newPassword">كلمة المرور</label>
            <input id="newPassword" name="password" type="password" autocomplete="new-password" required>
            <small class="muted">8 أحرف على الأقل مع حرف كبير، حرف صغير، رقم، ورمز.</small>
          </div>
          <div class="field">
            <label for="confirmPassword">تأكيد كلمة المرور</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" required>
          </div>
          <button class="button primary full" type="submit">تأكيد الحساب</button>
        </form>
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:475055-475328 (IT). */
async function loadActivationInvite(e) {
  if (!(!e || state.activationRequests.get(e) === "loading")) {
    state.activationRequests.set(e, "loading");
    try {
      const t = await postJson("/api/activation-invite", {
        token: e,
      });
      if (!t.user?.id) throw new Error("رابط التفعيل غير صالح.");
      state.activationUser = t.user;
      state.activationRequests.set(e, "loaded");
    } catch {
      state.activationRequests.set(e, "failed");
    }
    if (currentRoute() === "completeSignup") {
      renderRoute();
    }
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:475328-475658 (FT). */
function mergeActivationUser(e) {
  const user = normalizeUsers([e])[0];
  return state.users.some(
    (user2) =>
      String(user2.id || "") === String(user.id || "") ||
      String(user2.email || "")
        .trim()
        .toLowerCase() ===
        String(user.email || "")
          .trim()
          .toLowerCase(),
  )
    ? state.users.map((user2) =>
        String(user2.id || "") === String(user.id || "") ||
        String(user2.email || "")
          .trim()
          .toLowerCase() ===
          String(user.email || "")
            .trim()
            .toLowerCase()
          ? {
              ...user2,
              ...user,
            }
          : user2,
      )
    : [...state.users, user];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:475658-479562 (CT). */
function renderProfilePage() {
  if (!state.currentUser) return renderLoginPage();
  const items = [
    ["الاسم الكامل", state.currentUser.name],
    ["معرّف الحساب", state.currentUser.id],
    ["نوع الحساب", state.currentUser.roleLabel || roleLabel(state.currentUser.role)],
    ...(state.currentUser.role === "student"
      ? [
          ["المستوى", levelName(state.currentUser.niveauId)],
          ["المجموعة", groupName(state.currentUser.groupeId)],
          ["رقم التسجيل", state.currentUser.registrationNumber || "-"],
          ["مكان السكن", state.currentUser.residence || "-"],
        ]
      : []),
    ["رقم بطاقة التعريف / جواز السفر", state.currentUser.cin || state.currentUser.cinPassport || "-"],
  ];
  return renderDashboard(
    "الملف الشخصي",
    `
    <section class="panel account-profile">
      <div class="section-heading"><div><p class="eyebrow">بيانات الحساب</p><h2>الملف الشخصي</h2><p>يمكنك تعديل البريد الإلكتروني ورقم الهاتف وتاريخ الولادة من حسابك.</p></div><a class="button ghost" href="#${dashboardRoute(state.currentUser.role)}">رجوع للوحة الحساب</a></div>
      <div class="account-profile-identity">
        <span class="profile-avatar account-profile-avatar" aria-hidden="true">${renderAvatar(state.currentUser)}</span>
        <div><h3>${escapeHtml(state.currentUser.name)}</h3><p>${escapeHtml(state.currentUser.email)}</p><span class="chip turquoise">${escapeHtml(state.currentUser.roleLabel || roleLabel(state.currentUser.role))}</span></div>
      </div>
      <dl class="account-detail-grid">${items.map(([t, r]) => `<div><dt>${escapeHtml(t)}</dt><dd>${escapeHtml(r || "-")}</dd></div>`).join("")}</dl>
      ${state.currentUser.role === "student" ? '<div class="form-actions"><button class="button primary" type="button" data-print-enrollment-certificate>شهادة الترسيم</button></div>' : ""}
    </section>
    <div class="account-profile-forms">
      <section class="panel">
        <div class="section-heading compact"><div><h2>تعديل البيانات الشخصية</h2><p>عند تغيير البريد الإلكتروني، أدخل كلمة المرور الحالية للتأكيد.</p></div></div>
        <form class="grid two" data-account-profile-form>
          <div class="field"><label for="profile-email">البريد الإلكتروني</label><input id="profile-email" name="email" type="email" autocomplete="email" value="${escapeHtml(state.currentUser.email || "")}" required></div>
          <div class="field"><label for="profile-phone">رقم الهاتف</label><input id="profile-phone" name="phone" type="tel" autocomplete="tel" value="${escapeHtml(state.currentUser.phone || "")}" maxlength="40" placeholder="22 000 000"></div>
          <div class="field"><label for="profile-birth-date">تاريخ الولادة</label><input id="profile-birth-date" name="birthDate" type="date" autocomplete="bday" value="${escapeHtml(state.currentUser.birthDate || "")}"></div>
          ${state.currentUser.role === "student" ? `<div class="field"><label for="profile-residence">مكان السكن</label><input id="profile-residence" name="residence" autocomplete="address-level2" value="${escapeHtml(state.currentUser.residence || "")}" required></div>` : ""}
          <div class="field"><label for="profile-current-password">كلمة المرور الحالية</label><input id="profile-current-password" name="currentPassword" type="password" autocomplete="current-password"><small class="muted">مطلوبة فقط عند تغيير البريد الإلكتروني.</small></div>
          <div class="form-actions span-two"><button class="button primary" type="submit">حفظ البيانات</button></div>
        </form>
      </section>
      <section class="panel">
        <div class="section-heading compact"><div><h2>تغيير كلمة المرور</h2><p>استعمل كلمة قوية ولا تشاركها مع أي شخص.</p></div></div>
        <form class="grid" data-account-password-form>
          <div class="field"><label for="account-current-password">كلمة المرور الحالية</label><input id="account-current-password" name="currentPassword" type="password" autocomplete="current-password" required></div>
          <div class="field"><label for="account-new-password">كلمة المرور الجديدة</label><input id="account-new-password" name="password" type="password" autocomplete="new-password" required><small class="muted">8 أحرف على الأقل، حرف كبير وصغير، رقم ورمز خاص.</small></div>
          <div class="field"><label for="account-confirm-password">تأكيد كلمة المرور الجديدة</label><input id="account-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" required></div>
          <div class="form-actions"><button class="button secondary" type="submit">تغيير كلمة المرور</button></div>
        </form>
      </section>
    </div>
  `,
  );
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:479562-479687 (Wo). */
function updateCurrentUser(e) {
  if (e?.id) {
    state.users = state.users.map((t) =>
      String(t.id) === String(e.id)
        ? {
            ...t,
            ...e,
          }
        : t,
    );
    cacheValue("acceptedUsers", JSON.stringify(state.users));
    setCurrentUser(e);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:479687-482682 ($T). */
function renderEnrollmentCertificate(e) {
  const t = window.open("", "_blank");
  if (!t) return alert("اسمح بفتح نافذة جديدة لطباعة شهادة الترسيم.");
  const r = new URL("assets/email-signature-logo-1.png", location.href).href;
  const a = new URL("assets/email-signature-logo-2.png", location.href).href;
  const n = new URL("assets/bulletin-signature.png", location.href).href;
  const i = new Intl.DateTimeFormat("ar-TN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  t.document.write(
    `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>شهادة ترسيم — ${escapeHtml(e.name)}</title><style>*{box-sizing:border-box}body{margin:0;padding:8mm;color:#1b3c28;font-family:Tahoma,Arial,sans-serif;background:#fff}.certificate{max-width:780px;margin:auto;border:2px solid #a58a36;padding:12px;height:281mm}.inner{height:100%;border:1px solid #d7c987;padding:18px}.head{display:grid;grid-template-columns:100px 1fr 100px;align-items:center;text-align:center;border-bottom:2px solid #a58a36;padding-bottom:12px}.head img{width:76px;height:76px;object-fit:contain}.head h1{margin:0;color:#214c31;font-size:21px}.head p{margin:6px 0 0;color:#6b733e;font-weight:700}.title{text-align:center;margin:28px 0}.title h2{margin:0;font-size:26px;text-decoration:underline;text-underline-offset:8px}.content{font-size:17px;line-height:2.15;text-align:right}.content strong{color:#214c31}.details{margin:18px 0;padding:12px 18px;background:#fbfcf7;border-right:5px solid #a58a36;line-height:1.9}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:30px;text-align:center}.signatures div{padding-top:8px;border-top:1px solid #849170}.stamp{display:block;width:155px;height:115px;object-fit:contain;margin:6px auto 0}.footer{text-align:center;margin-top:10px;color:#66714e;font-size:11px}@media print{body{padding:8mm}@page{size:A4;margin:0}}</style></head><body><main class="certificate"><div class="inner"><header class="head"><img src="${escapeHtml(r)}" alt="شعار الجمعية"><div><h1>مشيخة التعليم الزيتوني وفروعه</h1><p>إدارة التعليم الزيتوني عن بُعد</p></div><img src="${escapeHtml(a)}" alt="شعار المشيخة"></header><section class="title"><h2>شهادة ترسيم</h2></section><section class="content"><p>تشهد إدارة التعليم الزيتوني عن بُعد أن الطالب(ة): <strong>${escapeHtml(e.name)}</strong></p><p>مرسّم(ة) بصفة قانونية بالسنة الدراسية <strong>${escapeHtml(state.gradeSettings.academicYear || "2025-2026")}</strong>.</p><div class="details"><div><strong>رقم التسجيل:</strong> ${escapeHtml(e.registrationNumber || e.id)}</div><div><strong>السنة:</strong> ${escapeHtml(levelName(e.niveauId))}</div><div><strong>الفوج:</strong> ${escapeHtml(groupName(e.groupeId))}</div><div><strong>مكان السكن:</strong> ${escapeHtml(e.residence || "-")}</div></div><p>سُلّمت هذه الشهادة للمعني(ة) بالأمر لاستعمالها عند الحاجة.</p></section><section class="signatures"><div>إمضاء الطالب(ة)</div><div>إدارة التعليم الزيتوني عن بُعد<img class="stamp" src="${escapeHtml(n)}" alt="خاتم الإدارة"></div></section><footer class="footer">حُرّرت بتاريخ ${escapeHtml(i)} · وثيقة مُنشأة من المنصة</footer></div></main><script>window.onload=()=>window.print()<\/script></body></html>`,
  );
  t.document.close();
}
