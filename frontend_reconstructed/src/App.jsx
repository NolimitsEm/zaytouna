import { useEffect, useState } from 'react';
import { Header } from './layouts/Header.jsx';

// Preserve the recovered hybrid architecture: React owns the persistent shell;
// the hash-routed application owns #main and #site-footer after its lazy import.
export default function App() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(() => import('./runtime/bootstrap.js'))
      .then(({ initializeRuntime }) => {
        initializeRuntime();
        if (mounted) setLoading(false);
      })
      .catch((cause) => {
        if (mounted) {
          console.error(cause);
          setError('تعذر تحميل المنصة. أعد تحديث الصفحة.');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  return <>
    <a className="skip-link" href="#main">انتقل إلى المحتوى</a>
    <Header />
    {loading ? <div className="loading-screen" role="status" aria-live="polite">
      <img src="assets/main-logo.png" alt="" /><span>جاري تحميل المنصة</span>
    </div> : null}
    {error ? <div className="empty-state">{error}</div> : null}
    <main id="main" tabIndex="-1" />
    <footer className="site-footer" id="site-footer" />
  </>;
}
