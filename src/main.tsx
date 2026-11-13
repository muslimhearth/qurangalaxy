import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Self-hosted Arabic fonts (OFL): no third-party font requests. Only the Arabic subsets.
import '@fontsource/amiri-quran/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-400.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
