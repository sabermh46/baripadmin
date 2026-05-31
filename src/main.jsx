import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n';
import { store } from './store';
import { injectStore } from './store/api/baseApi';

injectStore(store);

createRoot(document.getElementById('root')).render(
      <App />
)
