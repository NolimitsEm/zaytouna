import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/production.css';

// The surviving entry does not use StrictMode; keep one runtime initialization.
createRoot(document.getElementById('root')).render(<App />);
