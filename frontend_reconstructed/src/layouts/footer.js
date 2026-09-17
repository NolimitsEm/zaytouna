import { state } from "../context/state.js";
import { escapeHtml } from "../utils/formatters.js";
import { accountHref } from "./navigation.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:416441-418310 (Ny). */
function renderFooter() {
  const e = state.publicContent.contact.address;
  const t = encodeURIComponent(e || "Zitouna Tunis");
  queueMicrotask(() => {
    state.footerElement
      .querySelector(".footer-brand p")
      ?.replaceChildren("بإشراف الجمعية الزيتونية للثقافة و العلوم");
    if (state.publicContent.contact.secondaryAddress) {
      state.footerElement
        .querySelector(".footer-contact")
        ?.insertAdjacentHTML(
          "beforeend",
          `<p>${escapeHtml(state.publicContent.contact.secondaryAddress)}</p>`,
        );
    }
  });
  state.footerElement.innerHTML = `
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="assets/main-logo.png" alt="الشعار الرئيسي للمنصة">
        <div>
          <strong>مشيخة التعليم الزيتوني وفروعه</strong>
          <p>تعليم القرآن والفقه والعقيدة في بيئة منظمة وهادئة.</p>
        </div>
      </div>

      <div class="footer-contact">
        <h2>معلومات الاتصال</h2>
        <p><strong>العنوان:</strong> ${escapeHtml(state.publicContent.contact.address)}</p>
        <p><strong>الهاتف:</strong> ${escapeHtml(state.publicContent.contact.phone)}</p>
        <p><strong>البريد:</strong> ${escapeHtml(state.publicContent.contact.email)}</p>
        <p><strong>أوقات العمل:</strong> ${escapeHtml(state.publicContent.contact.hours)}</p>
      </div>

      <div class="footer-links" aria-label="روابط مهمة">
        <h2>روابط مهمة</h2>
        <a href="#programs">البرامج التعليمية</a>
        <a href="#activities">الأنشطة والفعاليات</a>
        <a href="#news">الأخبار والإعلانات</a>
        ${state.currentUser ? `<a href="${accountHref()}">${escapeHtml(state.currentUser.name)}</a>` : '<a href="#register">استمارة التسجيل</a>'}
        <a href="#platform">منصة الدرس</a>
        <a href="#contact">اتصل بنا</a>
      </div>

      <div class="footer-map">
        <h2>الموقع على الخريطة</h2>
        <iframe
          title="موقع مشيخة التعليم الزيتوني وفروعه على الخريطة"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=${t}&output=embed">
        </iframe>
      </div>
    </div>
    <div class="footer-bottom">
      © 2026 مشيخة التعليم الزيتوني وفروعه. جميع الحقوق محفوظة.
    </div>
  `;
}
