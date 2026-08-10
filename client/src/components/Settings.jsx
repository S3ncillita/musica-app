import { useState } from 'react';
import { getServerUrl, setServerUrl } from '../config.js';
import './Settings.css';

export default function Settings({ onClose }) {
  const [url, setUrl] = useState(getServerUrl());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setServerUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Configuración</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <label className="settings-label">URL del servidor</label>
          <p className="settings-hint">
            IP de tu PC + puerto. Ej: <code>http://192.168.1.100:8080</code>
          </p>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="settings-input"
            placeholder="http://192.168.x.x:8080"
          />
          <button className="settings-save" onClick={handleSave}>
            {saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
