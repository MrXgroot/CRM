import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { MasterProvider } from './contexts/MasterContext.tsx';
import { NotificationProvider } from './contexts/NotificationContext.tsx';
import { GeneralSettingsProvider } from './contexts/GeneralSettingsContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
    // <React.StrictMode>
    <BrowserRouter>
        <AuthProvider>
            <NotificationProvider>
                <MasterProvider>
                    <GeneralSettingsProvider>
                        <App />
                    </GeneralSettingsProvider>
                </MasterProvider>
            </NotificationProvider>
        </AuthProvider>
    </BrowserRouter>
    // </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
