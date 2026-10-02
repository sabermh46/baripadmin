import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import RouteErrorBoundary from './components/common/RouteErrorBoundary';
import { completeExternalTripLanding } from './utils/externalRedirect';
import i18n from './i18n';
import { store } from './store';
import { injectStore } from './store/api/baseApi';
import { applyFontScale, readFontScale } from './utils/fontScale';

injectStore(store);

// Before the first render, not inside a component: applying it after mount would paint one
// frame at the default size and then jump.
applyFontScale(readFontScale());

// Keep <html lang> in sync with i18n so CSS :lang(bn) font switching works
document.documentElement.lang = i18n.language || 'en';
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

// Returning from Google by redirect jumps back over Google's history entries and lands on
// the page the trip started from (utils/externalRedirect.js). That landing replaces itself
// with the real destination at once, so rendering the app first would only flash the old
// page. A back-forward-cache restore does not re-run this module, hence `pageshow` as well.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) completeExternalTripLanding();
});

if (!completeExternalTripLanding()) {
  // Last line of defence: whatever escapes the per-page boundary in Layout gets a message
  // and a reload button rather than a blank screen.
  createRoot(document.getElementById('root')).render(
    <RouteErrorBoundary variant="app">
      <App />
    </RouteErrorBoundary>
  )
}
