import { useState, useEffect } from 'react';
import { getApiBase } from '../config.js';
import { getAppVersion } from '../appVersion.js';
import vybeIcon from '../assets/vybe-icon.svg';
import './Auth.css';

const API = getApiBase();

export default function Auth({ onLogin, onClose, required = false }) {
  const [mode, setMode] = useState('login'); // login | register | recover-user | recover-answer
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [recoverQuestion, setRecoverQuestion] = useState('');
  const [recoverAnswer, setRecoverAnswer] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'register' && securityQuestions.length === 0) {
      fetch(`${API}/auth/security-questions`)
        .then(r => r.json())
        .then(data => {
          setSecurityQuestions(data.questions || []);
          setSecurityQuestion(data.questions?.[0] || '');
        })
        .catch(() => {});
    }
  }, [mode]);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (!email.includes('@') || !email.includes('.')) {
        setError('Ingresá un correo válido');
        return;
      }
      if (password !== confirm) {
        setError('Las contraseñas no coinciden');
        return;
      }
      if (!securityAnswer.trim()) {
        setError('Respondé la pregunta de seguridad');
        return;
      }
    }
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const appVersion = await getAppVersion();
      const body = mode === 'register'
        ? { username, email, password, securityQuestion, securityAnswer, appVersion }
        : { username, password, appVersion };
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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

  const handleRecoverUser = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/recovery/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error');
        setLoading(false);
        return;
      }
      setRecoverQuestion(data.question);
      setMode('recover-answer');
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  const handleRecoverReset = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/recovery/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, answer: recoverAnswer, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error');
        setLoading(false);
        return;
      }
      setInfo('✓ Contraseña actualizada, ya podés iniciar sesión');
      setMode('login');
      setPassword('');
      setConfirm('');
      setRecoverAnswer('');
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
          <img src={vybeIcon} alt="Vybe" width="56" height="56" style={{ borderRadius: 14 }} />
        </div>
        <h2>
          {mode === 'register' ? 'Crear cuenta'
            : mode === 'recover-user' ? 'Recuperar contraseña'
            : mode === 'recover-answer' ? 'Verificá tu identidad'
            : 'Iniciar sesión'}
        </h2>

        {mode === 'login' || mode === 'register' ? (
          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <input
                type="email"
                placeholder="Correo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            )}
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus={mode === 'login'}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {mode === 'register' && (
              <>
                <input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
                <select value={securityQuestion} onChange={e => setSecurityQuestion(e.target.value)}>
                  {securityQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Tu respuesta"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  required
                />
              </>
            )}
            {error && <div className="auth-error">{error}</div>}
            {info && <div className="auth-info">{info}</div>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? '...' : mode === 'register' ? 'Registrarse' : 'Entrar'}
            </button>
            {mode === 'login' && (
              <button type="button" className="auth-link" onClick={() => switchMode('recover-user')}>
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </form>
        ) : mode === 'recover-user' ? (
          <form onSubmit={handleRecoverUser}>
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
            />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? '...' : 'Continuar'}
            </button>
            <button type="button" className="auth-link" onClick={() => switchMode('login')}>
              Volver a iniciar sesión
            </button>
          </form>
        ) : (
          <form onSubmit={handleRecoverReset}>
            <p className="auth-question">{recoverQuestion}</p>
            <input
              type="text"
              placeholder="Tu respuesta"
              value={recoverAnswer}
              onChange={e => setRecoverAnswer(e.target.value)}
              autoFocus
              required
            />
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? '...' : 'Cambiar contraseña'}
            </button>
            <button type="button" className="auth-link" onClick={() => switchMode('login')}>
              Cancelar
            </button>
          </form>
        )}

        {(mode === 'login' || mode === 'register') && (
          <p className="auth-toggle">
            {mode === 'register' ? 'Ya tenés cuenta?' : 'No tenés cuenta?'}
            <button onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
              {mode === 'register' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
