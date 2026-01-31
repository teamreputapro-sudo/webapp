import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { getRouterBase } from './lib/routerBase'

const shouldLogVitals = import.meta.env.DEV || import.meta.env.VITE_VITALS_LOG === '1';
if (shouldLogVitals) {
  import('web-vitals').then(({ onCLS, onLCP, onINP }) => {
    const logMetric = (metric: { name: string; value: number; id: string }) => {
      console.log(`[vitals] ${metric.name}`, { value: metric.value, id: metric.id });
    };

    onCLS(logMetric);
    onLCP(logMetric);
    onINP(logMetric);
  }).catch((err) => {
    console.warn('[vitals] failed to load web-vitals', err);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={getRouterBase()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
