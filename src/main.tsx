import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Google Maps Platform Case A (Demo Key Specialization) Client-Side Quota Defense
function notifyMapsQuotaExceeded(): void {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
}

(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  notifyMapsQuotaExceeded();
};

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const joined = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
  if (joined.includes('OverQuotaMapError') || joined.includes('QuotaExceededError')) {
    notifyMapsQuotaExceeded();
  }
  originalConsoleError(...args);
};

// Startup Firestore reachability check deferred after initial paint to keep initial JS < 200 KB gzipped
window.setTimeout(() => {
  void import('./lib/firebase').then((m) => m.testFirestoreConnection()).catch(() => undefined);
}, 1200);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
