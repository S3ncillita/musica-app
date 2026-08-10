import { useState } from 'react';
import { getApiBase } from '../config.js';
import './Auth.css';

const API = getApiBase();

export default function Auth({ onLogin, onClose, required = false }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error');
        setLoading(false);
        return;
      }
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      onLogin(data.user);
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  return (
    <div className={`auth-overlay ${required ? 'auth-required' : ''}`} onClick={required ? undefined : onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        {!required && <button className="auth-close" onClick={onClose}>×</button>}
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--accent)">
            <circle cx="12" cy="12" r="12"/>
            <path d="M8 15V9l8-3v10" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2>{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '...' : isRegister ? 'Registrarse' : 'Entrar'}
          </button>
        </form>
        <p className="auth-toggle">
          {isRegister ? 'Ya tenés cuenta?' : 'No tenés cuenta?'}
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        </p>
      </div>
    </div>
  );
}
