import { state } from "../context/state.js";
import { escapeHtml, groupName, levelName, safeImageUrl } from "../utils/formatters.js";
import { dashboardRoute } from "../routes/router.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:420485-422464 (_f). */
function renderSidebar() {
  const element = document.querySelector("[data-app-sidebar-shell]");
  if (!state.currentUser) {
    element?.remove();
    return;
  }
  const t = `
    <div class="app-sidebar-shell" data-app-sidebar-shell>
      <button class="app-sidebar-toggle" type="button" data-toggle-app-sidebar aria-label="فتح القائمة الجانبية" aria-expanded="false"><span aria-hidden="true">☰</span><span>قائمة الحساب</span></button>
      <div class="app-sidebar-backdrop" data-close-app-sidebar></div>
      <aside class="app-sidebar" aria-label="قائمة الحساب">
        <div class="app-sidebar-head">
          <div class="sidebar-sanctuary" aria-hidden="true">
            <span>بسم الله الرحمن الرحيم</span>
            <i></i>
          </div>
          <div class="profile-block">
            ${
              state.currentUser.role === "student"
                ? `
              <label class="profile-photo-control" title="تغيير الصورة الشخصية">
                <span class="profile-avatar" aria-hidden="true">${renderAvatar(state.currentUser)}</span>
                <span class="profile-photo-edit">تغيير الصورة</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" data-profile-avatar-input>
              </label>
            `
                : `<span class="profile-avatar" aria-hidden="true">${renderAvatar(state.currentUser)}</span>`
            }
            <a class="profile-meta profile-meta-link" href="#profile" aria-label="فتح الملف الشخصي">
              <strong>${escapeHtml(state.currentUser.name)}</strong>
              <span class="muted">${escapeHtml(state.currentUser.roleLabel)}</span>
              ${state.currentUser.role === "student" ? `<span class="profile-chips"><span class="chip">${levelName(state.currentUser.niveauId)}</span><span class="chip gold">${groupName(state.currentUser.groupeId)}</span></span>` : ""}
            </a>
          </div>
        </div>
        <nav class="side-links" aria-label="روابط الحساب">
          ${sidebarLinks()
            .map((r) => `<a href="${r.href}">${r.label}</a>`)
            .join("")}
          <button type="button" data-logout>تسجيل الخروج</button>
        </nav>
      </aside>
    </div>
  `;
  if (element) {
    element.outerHTML = t;
  } else {
    document.body.insertAdjacentHTML("beforeend", t);
  }
  restoreSidebarPosition(document.querySelector("[data-toggle-app-sidebar]"));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:422464-422890 (Ly). */
function restoreSidebarPosition(e) {
  if (e)
    try {
      const t = JSON.parse(localStorage.getItem("zaytouna.sidebar-toggle-position") || "null");
      if (!Number.isFinite(t?.left) || !Number.isFinite(t?.top)) return;
      const r = Math.max(8, window.innerWidth - e.offsetWidth - 8);
      const a = Math.max(8, window.innerHeight - e.offsetHeight - 8);
      e.style.left = `${Math.min(Math.max(8, t.left), r)}px`;
      e.style.top = `${Math.min(Math.max(8, t.top), a)}px`;
      e.style.right = "auto";
      e.style.bottom = "auto";
    } catch {}
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:422890-423208 (My). */
function startSidebarDrag(event) {
  const t = event.target.closest("[data-toggle-app-sidebar]");
  if (!t || (event.pointerType === "mouse" && event.button !== 0)) return;
  const r = t.getBoundingClientRect();
  state.sidebarDrag = {
    toggle: t,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - r.left,
    offsetY: event.clientY - r.top,
    moved: false,
  };
  t.setPointerCapture?.(event.pointerId);
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:423208-423733 (By). */
function moveSidebarDrag(event) {
  const t = state.sidebarDrag;
  if (
    !t ||
    t.pointerId !== event.pointerId ||
    (Math.hypot(event.clientX - t.startX, event.clientY - t.startY) > 5 && (t.moved = true), !t.moved)
  )
    return;
  event.preventDefault();
  const a = Math.max(8, window.innerWidth - t.toggle.offsetWidth - 8);
  const n = Math.max(8, window.innerHeight - t.toggle.offsetHeight - 8);
  const i = Math.min(Math.max(8, event.clientX - t.offsetX), a);
  const s = Math.min(Math.max(8, event.clientY - t.offsetY), n);
  t.toggle.style.left = `${i}px`;
  t.toggle.style.top = `${s}px`;
  t.toggle.style.right = "auto";
  t.toggle.style.bottom = "auto";
  t.toggle.classList.add("is-dragging");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:423733-424093 (If). */
function endSidebarDrag(e) {
  const t = state.sidebarDrag;
  if (!(!t || t.pointerId !== e.pointerId)) {
    if ((t.toggle.releasePointerCapture?.(e.pointerId), t.toggle.classList.remove("is-dragging"), t.moved)) {
      const r = t.toggle.getBoundingClientRect();
      localStorage.setItem(
        "zaytouna.sidebar-toggle-position",
        JSON.stringify({
          left: r.left,
          top: r.top,
        }),
      );
      t.toggle.dataset.suppressSidebarToggleClick = "true";
    }
    state.sidebarDrag = null;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:424093-425221 (Uy). */
function sidebarLinks() {
  const e = [
    {
      href: `#${dashboardRoute(state.currentUser.role)}`,
      label: "لوحة الحساب",
    },
    ...(state.currentUser.role === "teacher"
      ? [
          {
            href: "#lessonPrep",
            label: "تحضير الدروس",
          },
        ]
      : []),
    ...(state.currentUser.role === "teacher"
      ? [
          {
            href: "#examPrep",
            label: "تحضير الامتحانات",
          },
        ]
      : []),
    ...(state.currentUser.role === "teacher"
      ? [
          {
            href: "#teacherAbsence",
            label: "غيابي",
          },
        ]
      : []),
    ...(state.currentUser.role !== "admin"
      ? [
          {
            href: "#courses",
            label: "الدروس",
          },
          ...(state.currentUser.role === "student"
            ? [
                {
                  href: "#generalPlan",
                  label: "الخطة العامة",
                },
              ]
            : []),
          {
            href: "#exams",
            label: "الامتحانات",
          },
          ...(state.currentUser.role === "student"
            ? [
                {
                  href: "#studentResults",
                  label: "النتائج",
                },
              ]
            : []),
          {
            href: "#questionnaires",
            label: "الاستبيانات",
          },
        ]
      : []),
  ];
  return state.currentUser.role !== "admin"
    ? e
    : [
        ...e,
        {
          href: "#users",
          label: "إدارة المستخدمين",
        },
        {
          href: "#levels",
          label: "إدارة المستويات",
        },
        {
          href: "#groups",
          label: "إدارة المجموعات",
        },
        {
          href: "#subjects",
          label: "إدارة المواد",
        },
        {
          href: "#schedule",
          label: "تنظيم الحصص",
        },
        {
          href: "#adminAbsences",
          label: "إدارة الغيابات",
        },
        {
          href: "#generalPlans",
          label: "إدارة الخطط العامة",
        },
        {
          href: "#lessons",
          label: "إدارة الدروس",
        },
        {
          href: "#examManagement",
          label: "إدارة الامتحانات",
        },
        {
          href: "#questionnaireManagement",
          label: "إدارة الاستبيانات",
        },
        {
          href: "#analytics",
          label: "متابعة النتائج والإحصائيات",
        },
        {
          href: "#logs",
          label: "سجل الدخول والخروج",
        },
      ];
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:425221-425377 (So). */
function closeSidebar() {
  document.body.classList.remove("app-sidebar-open");
  document.querySelector("[data-toggle-app-sidebar]")?.setAttribute("aria-expanded", "false");
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:425377-425530 (qy). */
function highlightNavigation(e) {
  document.querySelectorAll(".nav-links a").forEach((t) => {
    const r = t.getAttribute("href").replace("#", "");
    t.classList.toggle("active", r === e);
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:425530-426032 (Oc). */
function updateAccountNavigation() {
  const element = document.querySelector("[data-login-link]");
  if (element) {
    if (!state.currentUser) {
      element.innerHTML = "تسجيل الدخول";
      element.setAttribute("href", "#login");
      element.classList.remove("nav-user-profile");
      return;
    }
    element.classList.add("nav-user-profile");
    element.innerHTML = `
    <span class="nav-user-avatar" aria-hidden="true">${renderAvatar(state.currentUser)}</span>
    <span class="nav-user-meta">
      <strong>${escapeHtml(state.currentUser.name)}</strong>
      <small class="nav-account-role">الحساب · ${escapeHtml(state.currentUser.roleLabel)}</small>
    </span>
  `;
    element.setAttribute("href", `#${dashboardRoute(state.currentUser.role)}`);
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:426032-426371 (Ff). */
function updateRegistrationNavigation() {
  document.querySelectorAll("[data-register-link]").forEach((element) => {
    if (
      (element.dataset.defaultHtml || (element.dataset.defaultHtml = element.innerHTML), !state.currentUser)
    ) {
      element.setAttribute("href", "#register");
      element.innerHTML = element.dataset.defaultHtml;
      return;
    }
    element.setAttribute("href", accountHref());
    element.innerHTML = `
      <span>${escapeHtml(state.currentUser.name)}</span>
      <small>${escapeHtml(state.currentUser.roleLabel)}</small>
    `;
  });
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:426371-426420 (In). */
function accountHref() {
  return state.currentUser ? `#${dashboardRoute(state.currentUser.role)}` : "#login";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:426420-427182 (Lc). */
function renderSignedInAccount(e = "أنت متصل بحسابك.") {
  return state.currentUser
    ? `
    <section class="section" aria-labelledby="signed-account-title">
      <div class="panel account-return-card">
        <span class="nav-user-avatar account-return-avatar" aria-hidden="true">${renderAvatar(state.currentUser)}</span>
        <div>
          <p class="eyebrow">الحساب الحالي</p>
          <h1 id="signed-account-title">${escapeHtml(e)}</h1>
          <p class="lead">${escapeHtml(state.currentUser.name)} · ${escapeHtml(state.currentUser.roleLabel)}</p>
        </div>
        <div class="account-return-actions">
          <a class="button primary" href="${accountHref()}">${escapeHtml(state.currentUser.name)}</a>
          ${state.currentUser.role !== "admin" ? '<a class="button secondary" href="#courses">الدروس</a>' : '<a class="button secondary" href="#users">إدارة المستخدمين</a>'}
        </div>
      </div>
    </section>
  `
    : "";
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:427182-427313 (ui). */
function renderAvatar(e) {
  if (e?.avatar) {
    const t = safeImageUrl(e.avatar);
    if (t) return `<img src="${escapeHtml(t)}" alt="">`;
  }
  return escapeHtml(nameInitials(e?.name || e?.roleLabel || "م"));
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:427313-427410 (jy). */
function nameInitials(e) {
  return (
    String(e)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((t) => t.charAt(0))
      .join("") || "م"
  );
}
