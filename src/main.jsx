import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.jsx';
import { OrgProvider } from './context/OrgContext';
import { ConfirmProvider } from './components/shared/ConfirmDialog';
import { initPwa } from './lib/pwa';
import './index.css';

initPwa();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OrgProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </OrgProvider>
    <Toaster richColors position="top-right" closeButton />
  </StrictMode>
);
