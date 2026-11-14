import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Self-hosted Arabic fonts (OFL): no third-party font requests. Only the Arabic subsets.
import '@fontsource/amiri-quran/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-400.css';
import './styles.css';
import { startTheme } from './theme/theme';

// Before React renders: public/theme-init.js set the first theme; this keeps it in sync.
startTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
