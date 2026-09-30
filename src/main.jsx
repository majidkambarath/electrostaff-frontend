import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from '@/app/App';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ChangePasswordForm, SignedOutScreen } from '@/features/auth/AuthScreens';
import { ConfirmProvider } from '@/shared/components/ConfirmDialog';
import { initPwa } from '@/shared/lib/pwa';
import './index.css';

initPwa();

const authScreens = { SignedOut: SignedOutScreen, ChangePassword: ChangePasswordForm };

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider screens={authScreens}>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </AuthProvider>
    <Toaster richColors position="top-center" closeButton />
  </StrictMode>
);
