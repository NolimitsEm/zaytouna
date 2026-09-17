import { escapeHtml, renderOption, safeImageUrl } from "../utils/formatters.js";
import { state } from "../context/state.js";
import { accountHref, renderSignedInAccount } from "../layouts/navigation.js";
import { renderActivityCard, renderNewsCard, renderPublicDetail } from "../components/content-management.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:427410-429529 (O0). */
function renderHomePage() {
  return `
    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-hero-copy">
        <p class="home-basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <span class="home-kicker">منارة للعلم والتربية</span>
        <h1 id="home-title">${escapeHtml(state.publicContent.home.title)}</h1>
        <p class="home-lead">${escapeHtml(state.publicContent.home.description)}</p>
        <div class="home-hero-actions">
          ${
            state.currentUser
              ? `
            <a class="button primary" href="${accountHref()}">${escapeHtml(state.currentUser.name)}</a>
            <a class="button secondary" href="#courses">الدروس</a>
          `
              : `
            <a class="button primary" href="#register">ابدأ رحلتك العلمية</a>
            <a class="button secondary" href="#login">تسجيل الدخول</a>
          `
          }
        </div>
        <div class="home-principles" aria-label="مبادئ المنصة">
          <div><strong>علم نافع</strong><span>محتوى متدرّج وموثوق</span></div>
          <div><strong>متابعة قريبة</strong><span>دروس وحصص منظمة</span></div>
          <div><strong>بيئة هادئة</strong><span>تعلم في طمأنينة واحترام</span></div>
        </div>
      </div>
      <aside class="home-hero-mark" aria-label="هوية المنصة">
        <div class="home-arch" aria-hidden="true"></div>
        <img src="assets/main-logo.png" alt="الشعار الرئيسي للمنصة">
        <div class="home-verse">
          <span>وَقُل رَّبِّ زِدْنِي عِلْمًا</span>
          <small>طه · 114</small>
        </div>
      </aside>
    </section>
    <section class="section home-path" aria-labelledby="home-path-title">
      <div class="home-section-intro">
        <p class="eyebrow">طريقك في المنصّة</p>
        <h2 id="home-path-title">رحلة تعليمية مرتّبة وواضحة</h2>
        <p>من التسجيل إلى متابعة الدروس، كل خطوة مصمّمة لتبقى قريبة من الطالب والأستاذ.</p>
      </div>
      <div class="home-path-grid">
        ${renderAccessCard("١", "اختر مسارك", "حدّد مستواك ومجموعتك حتى تظهر لك المواد المناسبة.")}
        ${renderAccessCard("٢", "تابع دروسك", "احضر الحصص، راجع الملفات، واطّلع على الإعلانات.")}
        ${renderAccessCard("٣", "ثبّت علمك", "اختبارات واستبيانات ومتابعة تساعدك على التقدّم.")}
      </div>
    </section>
    ${renderSubjectSection()}
    ${renderLatestNews()}
    ${renderActivitiesSection()}
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:429529-429728 (yo). */
function renderAccessCard(e, t, r) {
  return `
    <div class="access-card">
      <span class="access-number">${e}</span>
      <div>
        <h3>${t}</h3>
        <p class="muted">${r}</p>
      </div>
    </div>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:429728-430514 (zy). */
function renderSubjectSection() {
  return `
    <section class="section" aria-labelledby="subjects-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">المواد الأساسية</p>
          <h2 id="subjects-title">مجالات التعلّم</h2>
        </div>
        <a class="button secondary" href="#programs">البرامج التعليمية</a>
      </div>
      <div class="grid three">
        ${state.defaultSubjects
          .map(
            (e) => `
          <article class="card subject-card">
            <span class="card-icon" aria-hidden="true">◆</span>
            <h3>${e.name}</h3>
            <p class="muted">${e.description}</p>
            <div class="card-actions">
              <a class="button ghost" href="#${e.id}">عرض الدروس</a>
            </div>
          </article>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:430514-430930 (Hy). */
function renderLatestNews() {
  return `
    <section class="section" aria-labelledby="latest-news">
      <div class="section-heading">
        <div>
          <p class="eyebrow">الأخبار والإعلانات</p>
          <h2 id="latest-news">آخر المستجدات</h2>
        </div>
        <a class="button ghost" href="#news">كل الأخبار</a>
      </div>
      <div class="grid three">${state.publicContent.news.slice(0, 3).map(renderActivityCard).join("")}</div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:430930-431362 (Wy). */
function renderActivitiesSection() {
  return `
    <section class="section band" aria-labelledby="activities-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">الأنشطة</p>
          <h2 id="activities-title">فعاليات قريبة من الطالب</h2>
        </div>
        <a class="button ghost" href="#activities">عرض الأنشطة</a>
      </div>
      <div class="grid three">${state.publicContent.activities.map(renderNewsCard).join("")}</div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:431362-432179 (Vy). */
function renderAboutPage() {
  return `
    <section class="section page-hero" aria-labelledby="about-title">
      <p class="eyebrow">من نحن</p>
      <h1 id="about-title">${escapeHtml(state.publicContent.about.title)}</h1>
      <p class="lead">
        ${escapeHtml(state.publicContent.about.description)}
      </p>
    </section>
    <section class="section grid two">
      <article class="panel">
        <h2>رسالتنا</h2>
        <p class="muted">تقديم علم شرعي موثوق، متدرج، ومناسب للطلاب، مع عناية بالأخلاق والسكينة وحسن الفهم.</p>
      </article>
      <article class="panel">
        <h2>قيمنا</h2>
        <div class="chips">
          <span class="chip">الأمانة العلمية</span>
          <span class="chip gold">الوسطية</span>
          <span class="chip turquoise">الرحمة</span>
          <span class="chip">الوضوح</span>
        </div>
      </article>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:432179-433050 (Gy). */
function renderTeachersPage() {
  return `
    <section class="section" aria-labelledby="teachers-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">طاقم الأساتذة</p>
          <h1 id="teachers-title">${escapeHtml(state.publicContent.pages.teachers.title)}</h1>
          <p>${escapeHtml(state.publicContent.pages.teachers.description)}</p>
        </div>
      </div>
      <div class="grid three">
        ${state.publicContent.teachers
          .map((user, t) => {
            const r = safeImageUrl(user.image);
            return `
          <article class="card teacher-card">
            ${
              r
                ? `
              <img class="teacher-image" src="${escapeHtml(r)}" alt="${escapeHtml(user.name)}">
            `
                : `
              <div class="avatar" aria-hidden="true">${escapeHtml(user.name.charAt(0))}</div>
            `
            }
            <h3>${escapeHtml(user.name)}</h3>
            <p class="chip">${escapeHtml(user.role)}</p>
            ${renderPublicDetail(user.bio, `teacher-${t}`)}
          </article>
        `;
          })
          .join("")}
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:433050-434224 (Xy). */
function renderProgramsPage() {
  return `
    <section class="section" aria-labelledby="programs-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">البرامج التعليمية</p>
          <h1 id="programs-title">${escapeHtml(state.publicContent.pages.programs.title)}</h1>
          <p>${escapeHtml(state.publicContent.pages.programs.description)}</p>
        </div>
      </div>
      <div class="grid three">${state.publicContent.programs
        .map((e, t) => {
          const r = safeImageUrl(e.image);
          return `
        <article class="card">
          ${r ? `<img class="card-image" src="${escapeHtml(r)}" alt="${escapeHtml(e.title)}">` : ""}
          <h3>${escapeHtml(e.title)}</h3>
          ${renderPublicDetail(e.detail, `program-${t}`)}
        </article>
      `;
        })
        .join("")}</div>
      <div class="panel info-panel">
        <h2>شروط التسجيل</h2>
        <ul class="clean-list">
          <li>الجدية والالتزام بالحضور أو المتابعة عن بعد.</li>
          <li>القدرة على القراءة والكتابة بالعربية.</li>
          <li>اختيار المستوى والمجموعة بدقة عند التسجيل.</li>
          <li>اجتياز التقييمات المطلوبة في نهاية كل مرحلة.</li>
        </ul>
        ${state.currentUser ? `<a class="button primary" href="${accountHref()}">${escapeHtml(state.currentUser.name)}</a>` : '<a class="button primary" href="#register">سجل من هنا</a>'}
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:434224-434965 (Yy). */
function renderActivitiesPage() {
  return `
    <section class="section" aria-labelledby="activities-page-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">الأنشطة والفعاليات</p>
          <h1 id="activities-page-title">${escapeHtml(state.publicContent.pages.activities.title)}</h1>
          <p>${escapeHtml(state.publicContent.pages.activities.description)}</p>
        </div>
      </div>
      <div class="grid three">${state.publicContent.activities.map(renderNewsCard).join("")}</div>
      <div class="panel info-panel">
        <h2>لماذا تشارك؟</h2>
        <div class="grid three">
          ${["تعزيز المعرفة", "مرونة الحضور", "متابعة مباشرة", "أساتذة متخصصون", "أسئلة ومراجعة", "شهادات مشاركة"].map((e) => `<span class="feature-pill">${e}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:434965-435369 (Ky). */
function renderNewsPage() {
  return `
    <section class="section" aria-labelledby="news-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">الأخبار والإعلانات</p>
          <h1 id="news-title">${escapeHtml(state.publicContent.pages.news.title)}</h1>
          <p>${escapeHtml(state.publicContent.pages.news.description)}</p>
        </div>
      </div>
      <div class="grid three">${state.publicContent.news.map(renderActivityCard).join("")}</div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:435369-436553 (Jy). */
function renderMediaPage() {
  const e = state.publicContent.mediaItems.filter((t) => safeImageUrl(t.image));
  state.publicContent.mediaItems.filter((t) => !t.image || t.type === "فيديو");
  return `
    <section class="section" aria-labelledby="media-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">معرض الصور والفيديو</p>
          <h1 id="media-title">${escapeHtml(state.publicContent.pages.media.title)}</h1>
          <p>${escapeHtml(state.publicContent.pages.media.description)}</p>
        </div>
      </div>
      ${renderGallery(e)}
      <div class="section-heading gallery-subheading">
        <div>
          <p class="eyebrow">مقتطفات</p>
          <h2>صور وفيديوهات مختارة</h2>
        </div>
      </div>
      <div class="grid three">${state.publicContent.mediaItems
        .map((t, r) => {
          const a = safeImageUrl(t.image);
          return `
        <article class="media-card">
          ${
            a
              ? `
            <img class="media-image" src="${escapeHtml(a)}" alt="${escapeHtml(t.title)}">
          `
              : `
            <div class="media-preview" aria-hidden="true">${t.type === "فيديو" ? "▶" : "▦"}</div>
          `
          }
          <div class="card">
            <span class="chip">${escapeHtml(t.type)}</span>
            <h3>${escapeHtml(t.title)}</h3>
            ${renderPublicDetail(t.detail, `media-${r}`)}
          </div>
        </article>
      `;
        })
        .join("")}</div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:436553-437685 (Qy). */
function renderGallery(items) {
  if (!items.length)
    return `
      <div class="empty-state gallery-empty">
        أضف صورًا من لوحة الإدارة حتى تظهر هنا كمعرض متحرك.
      </div>
    `;
  const t = state.galleryIndex % items.length;
  const r = items[t];
  const a = safeImageUrl(r.image);
  return `
    <section class="animated-gallery" aria-label="معرض صور متحرك">
      <div class="gallery-stage">
        <img src="${escapeHtml(a)}" alt="${escapeHtml(r.title)}" data-gallery-image>
        <div class="gallery-caption">
          <span class="chip gold">${escapeHtml(r.type || "صورة")}</span>
          <h2>${escapeHtml(r.title)}</h2>
          <p>${escapeHtml(r.detail)}</p>
        </div>
      </div>
      <div class="gallery-controls">
        <button class="button ghost" type="button" data-gallery-prev>السابق</button>
        <div class="gallery-dots" aria-label="اختيار صورة">
          ${items
            .map(
              (n, i) => `
            <button
              type="button"
              class="${i === t ? "active" : ""}"
              aria-label="الصورة ${i + 1}"
              data-gallery-dot="${i}">
            </button>
          `,
            )
            .join("")}
        </div>
        <button class="button secondary" type="button" data-gallery-next>التالي</button>
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:437685-439448 (Zy). */
function renderContactPage() {
  const items = Array.isArray(state.publicContent.branches) ? state.publicContent.branches : [];
  return `
    <section class="section" aria-labelledby="contact-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">اتصل بنا</p>
          <h1 id="contact-title">نحن هنا لخدمتكم.</h1>
          <p>يمكنكم التواصل معنا للاستفسار عن التسجيل، البرامج، أو منصة الدرس.</p>
        </div>
      </div>
      <div class="grid two contact-branch-grid">
        <form class="panel grid" hidden style="display: none">
          <div class="field">
            <label for="contactName">الاسم الكامل</label>
            <input id="contactName" autocomplete="name">
          </div>
          <div class="field">
            <label for="contactEmail">البريد الإلكتروني</label>
            <input id="contactEmail" type="email" autocomplete="email">
          </div>
          <div class="field">
            <label for="contactMessage">الرسالة</label>
            <textarea id="contactMessage"></textarea>
          </div>
          <button class="button primary" type="button">إرسال الرسالة</button>
        </form>
        <aside class="panel contact-list">
          <h2>معلومات التواصل</h2>
          <p><strong>العنوان:</strong> ${escapeHtml(state.publicContent.contact.address)}</p>
          <p><strong>الهاتف:</strong> ${escapeHtml(state.publicContent.contact.phone)}</p>
          <p><strong>البريد:</strong> ${escapeHtml(state.publicContent.contact.email)}</p>
          <p><strong>أوقات العمل:</strong> ${escapeHtml(state.publicContent.contact.hours)}</p>
        </aside>
        ${items
          .map(
            (t) => `
          <article class="panel contact-list">
            <h2>${escapeHtml(t.title || "فرع")}</h2>
            <p><strong>العنوان:</strong> ${escapeHtml(t.address || "")}</p>
            ${t.detail ? `<p>${escapeHtml(t.detail)}</p>` : ""}
          </article>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:439448-442736 (eT). */
function renderRegisterPage() {
  return state.currentUser
    ? renderSignedInAccount("حسابك مفتوح في المنصة.")
    : `
    <section class="section" aria-labelledby="register-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">استمارة التسجيل</p>
          <h1 id="register-title">${escapeHtml(state.publicContent.pages.register.title)}</h1>
          <p>${escapeHtml(state.publicContent.pages.register.description)}</p>
        </div>
      </div>
      <div class="register-logo-row" aria-label="هوية مشيخة التعليم الزيتوني وفروعه">
        <img src="assets/main-logo.png" alt="الشعار الرئيسي لمشيخة التعليم الزيتوني وفروعه">
        <div>
          <strong>مشيخة التعليم الزيتوني وفروعه</strong>
          <span>طلب تسجيل إلكتروني في فضاء تعليمي زيتوني</span>
        </div>
      </div>
      <form class="panel grid two" data-registration-form>
        <div class="field">
          <label for="secondName">اللقب</label>
          <input id="secondName" name="secondName" autocomplete="family-name" required>
        </div>
        <div class="field">
          <label for="firstName">الاسم</label>
          <input id="firstName" name="firstName" autocomplete="given-name" required>
        </div>
        <div class="field">
          <label for="studyLevel">المستوى الدراسي</label>
          <select id="studyLevel" name="studyLevel" required>
            <option value="">المستوى الدراسي</option>
            ${state.educationLevels.map((e) => renderOption(e, e)).join("")}
          </select>
        </div>
        <div class="field">
          <label for="birthDate">تاريخ الولادة</label>
          <input id="birthDate" name="birthDate" type="text" placeholder="تاريخ الولادة" required>
        </div>
        <div class="field">
          <label for="cinPassport">CIN / N° Passport</label>
          <input id="cinPassport" name="cinPassport" autocomplete="off" required>
        </div>
        <div class="field">
          <label for="profession">المهنة</label>
          <input id="profession" name="profession" required>
        </div>
        <div class="field">
          <label for="email">البريد الإلكتروني</label>
          <input id="email" name="email" type="email" autocomplete="email" required>
        </div>
        <div class="field">
          <label for="phone">الهاتف</label>
          <input id="phone" name="phone" inputmode="tel" pattern="[0-9\\s\\-]*" title="الأرقام فقط مسموح بها." required>
        </div>
        <div class="field">
          <label for="programRegister">التسجيل في</label>
          <select id="programRegister" name="program" required>
            <option value="">التسجيل في</option>
            ${state.programNames.map((e) => renderOption(e, e)).join("")}
          </select>
        </div>
        <div class="field">
          <label for="sana">السنة</label>
          <select id="sana" name="sana" required>
            <option value="">اختر السنة</option>
            ${state.levels.map((e) => renderOption(e.id, e.name)).join("")}
          </select>
        </div>
        <div class="field span-two">
          <label for="message">رسالة</label>
          <textarea id="message" name="message" placeholder="رسالة" required></textarea>
        </div>
        <div class="form-actions">
          <button class="button primary" type="submit">إرسال طلب التسجيل</button>
          <a class="button ghost" href="#platform">رابط المنصة التعليمية</a>
        </div>
      </form>
    </section>
  `;
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:442736-443262 (tT). */
function renderPlatformPage() {
  return `
    <section class="section page-hero" aria-labelledby="platform-title">
      <p class="eyebrow">منصة الدرس</p>
      <h1 id="platform-title">${escapeHtml(state.publicContent.pages.platform.title)}</h1>
      <p class="lead">${escapeHtml(state.publicContent.pages.platform.description)}</p>
      <div class="hero-actions">
        ${state.currentUser ? `<a class="button primary" href="${accountHref()}">${escapeHtml(state.currentUser.name)}</a>` : '<a class="button primary" href="#login">تسجيل الدخول</a>'}
        <a class="button ghost" href="#courses">الدروس المتاحة</a>
      </div>
    </section>
  `;
}
