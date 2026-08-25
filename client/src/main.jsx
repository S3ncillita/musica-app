import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { maybeRedirectToLive } from './liveRedirect.js';
import './index.css';

maybeRedirectToLive().then((redirecting) => {
  if (redirecting) return; // la página está a punto de navegar afuera
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
