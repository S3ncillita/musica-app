import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { maybeRedirectToLive } from './liveRedirect.js';
import { restoreFromNative, mirrorToNative } from './nativeStore.js';
import './index.css';

maybeRedirectToLive().then(async (redirecting) => {
  if (redirecting) return; // la página está a punto de navegar afuera
  // Traer la sesión y las descargas guardadas del lado nativo (el origen
  // empaquetado y el de la versión en vivo tienen localStorage separado).
  await restoreFromNative();
  mirrorToNative();
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
