// HIGH CONFIDENCE: markup/text recovered from index-Bgp60kJC.js, component ch.
export function Header() {
  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="القائمة الرئيسية">
        <a className="brand" href="#home" aria-label="مشيخة التعليم الزيتوني وفروعه">
          <span className="brand-logos" aria-hidden="true">
            <span className="brand-mark"><img src="assets/bulletin-header-right.png" alt="" /></span>
            <span className="brand-mark"><img src="assets/bulletin-header-left.png" alt="" /></span>
          </span>
          <span className="brand-copy">
            <strong>مشيخة التعليم الزيتوني وفروعه</strong>
            <small>Enseignement Zitouni</small>
          </span>
        </a>
        <button className="menu-button" type="button" aria-expanded="false" aria-controls="main-menu">
          <span aria-hidden="true" /><span>القائمة</span>
        </button>
        <div className="nav-links" id="main-menu">
          <a href="#home"><span>الرئيسية</span><small>Accueil</small></a>
          <details className="nav-dropdown">
            <summary><span>المؤسسة</span><small>Institution</small></summary>
            <div className="nav-dropdown-menu">
              <a href="#about"><span>من نحن</span><small>À propos</small></a>
              <a href="#teachers"><span>طاقم الأساتذة</span><small>Enseignants</small></a>
              <a href="#programs"><span>البرامج التعليمية</span><small>Programmes</small></a>
            </div>
          </details>
          <details className="nav-dropdown">
            <summary><span>الأنشطة والإعلام</span><small>Actualités</small></summary>
            <div className="nav-dropdown-menu">
              <a href="#activities"><span>الأنشطة والفعاليات</span><small>Activités</small></a>
              <a href="#news"><span>الأخبار والإعلانات</span><small>Annonces</small></a>
              <a href="#media"><span>معرض الصور والفيديو</span><small>Médiathèque</small></a>
            </div>
          </details>
          <details className="nav-dropdown">
            <summary><span>الخدمات</span><small>Services</small></summary>
            <div className="nav-dropdown-menu">
              <a href="#register" data-register-link={true}><span>التسجيلات والخدمات</span><small>Inscription</small></a>
              <a href="#contact"><span>اتصل بنا</span><small>Contact</small></a>
            </div>
          </details>
          <a href="#platform"><span>منصة الدرس</span><small>Plateforme</small></a>
          <a href="#login" className="nav-action" data-login-link={true}>تسجيل الدخول</a>
        </div>
      </nav>
    </header>
  );
}
