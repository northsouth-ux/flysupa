import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './styles/index.css';
import { logInfra } from './lib/infra';

if (import.meta.env.DEV) {
  logInfra(import.meta.env.VITE_SUPABASE_URL, import.meta.env.MODE, __GIT_BRANCH__);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/">
      <App />
    </BrowserRouter>
  </StrictMode>
);
