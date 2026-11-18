import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Tier 1: Global Google Maps Platform Demo Key Quota & Auth Interceptor
if (typeof window !== 'undefined') {
  const win = window as unknown as { gm_authFailure?: () => void };
  const prevAuthFailure = win.gm_authFailure;
  win.gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    if (typeof prevAuthFailure === 'function') {
      prevAuthFailure();
    }
  };

  const origConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const joined = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
    if (
      joined.includes('OverQuotaMapError') ||
      joined.includes('QuotaExceededError') ||
      joined.includes('RESOURCE_EXHAUSTED')
    ) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
    origConsoleError(...args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

