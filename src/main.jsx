import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import i18n from './i18n';
import { store } from './store';
import { injectStore } from './store/api/baseApi';

injectStore(store);

// Keep <html lang> in sync with i18n so CSS :lang(bn) font switching works
document.documentElement.lang = i18n.language || 'en';
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

createRoot(document.getElementById('root')).render(
      <App />
)
