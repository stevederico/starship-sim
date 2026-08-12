import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AnalyticsProvider from './components/AnalyticsProvider.tsx';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root');
}

createRoot(rootEl).render(
  <AnalyticsProvider>
    <App />
  </AnalyticsProvider>
);
