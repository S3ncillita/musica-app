import { useEffect, useState } from 'react';
import { api } from '../api.js';
import './PlanExpired.css';

// Pantalla que reemplaza la app cuando el plan venció. "Ya pagué" vuelve a
// consultar al servidor por si el administrador ya extendió la cuenta.
export default function PlanExpired({ user, onRefresh, onLogout }) {
  const [instructions, setInstructions] = useState('');
  const [checking, setChecking] = useState(false);
  const [stillExpired, setStillExpired] = useState(false);

  useEffect(() => {
    api('/auth/payment-info')
      .then(res => (res.ok ? res.json() : null))
      .then(data => data && setInstructions(data.instructions || ''))
      .catch(() => {});
  }, []);

  const check = async () => {
    setChecking(true);
    setStillExpired(false);
    const ok = await onRefresh();
    setChecking(false);
    if (!ok) setStillExpired(true);
  };

  const expiredOn = user?.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : null;

  return (
    <div className="plan-expired">
      <div className="plan-expired-card">
        <h2>Tu plan venció</h2>
        {expiredOn && <p className="plan-expired-date">Venció el {expiredOn}</p>}
        <p>Para seguir usando la app, renová tu plan de 30 días.</p>
        {instructions && <pre className="plan-expired-instructions">{instructions}</pre>}
        <p className="plan-expired-hint">Cuando hagas la transferencia, mandá el comprobante con tu usuario <strong>{user?.username}</strong> y te activamos la cuenta.</p>
        {stillExpired && <p className="plan-expired-error">Todavía no está activada.</p>}
        <button className="plan-expired-btn" onClick={check} disabled={checking}>
          {checking ? 'Verificando…' : 'Ya pagué, verificar'}
        </button>
        <button className="plan-expired-link" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </div>
  );
}
