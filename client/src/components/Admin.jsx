import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import Toast, { useToast } from './Toast.jsx';
import './Admin.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

function planLabel(u) {
  if (u.infinite) return { text: 'Infinito', cls: 'ok' };
  if (u.expired) return { text: `Vencido (${fmtDate(u.expiresAt)})`, cls: 'bad' };
  const days = Math.ceil((new Date(u.expiresAt) - Date.now()) / 86400000);
  return { text: `Vence ${fmtDate(u.expiresAt)} (${days} d)`, cls: days <= 5 ? 'warn' : 'ok' };
}

// Panel solo para el administrador: ver quién tiene plan activo, sumar 30
// días tras confirmar una transferencia, o dejar a alguien sin vencimiento.
export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('');
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api('/auth/users');
      if (res.ok) setUsers(await res.json());
      else showToast('No se pudo cargar la lista');
    } catch {
      showToast('Sin conexión con el servidor');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (u, path, body, okMsg) => {
    setBusyId(u.id);
    try {
      const res = await api(`/auth/users/${u.id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { showToast(okMsg); await load(); }
      else showToast((await res.json().catch(() => ({}))).error || 'Error');
    } catch {
      showToast('Sin conexión con el servidor');
    }
    setBusyId(null);
  };

  const extend = (u) => {
    if (!window.confirm(`¿Confirmás el pago de ${u.username} y sumar 30 días?`)) return;
    act(u, 'extend', { days: 30 }, `+30 días para ${u.username}`);
  };

  const toggleInfinite = (u) => {
    const msg = u.infinite
      ? `¿Quitar el plan infinito a ${u.username}? Quedará vencido.`
      : `¿Dar plan infinito (sin pagar) a ${u.username}?`;
    if (!window.confirm(msg)) return;
    act(u, 'infinite', { infinite: !u.infinite }, u.infinite ? 'Plan infinito quitado' : 'Plan infinito activado');
  };

  const shown = users.filter(u => u.username.toLowerCase().includes(filter.trim().toLowerCase()));
  const counts = {
    active: users.filter(u => !u.expired && !u.infinite).length,
    expired: users.filter(u => u.expired).length,
    infinite: users.filter(u => u.infinite).length,
  };

  return (
    <div className="admin">
      <Toast message={toast} />
      <h2>Planes</h2>
      <p className="admin-summary">
        {counts.active} activos · {counts.expired} vencidos · {counts.infinite} infinitos
      </p>
      <input
        className="admin-filter"
        placeholder="Buscar usuario…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      {loading ? (
        <p className="admin-empty">Cargando…</p>
      ) : shown.length === 0 ? (
        <p className="admin-empty">Sin usuarios</p>
      ) : (
        <ul className="admin-list">
          {shown.map(u => {
            const label = planLabel(u);
            return (
              <li key={u.id} className="admin-row">
                <div className="admin-user">
                  <strong>{u.username}</strong>
                  <span className="admin-email">{u.email || 'sin correo'}</span>
                  <span className={`admin-plan ${label.cls}`}>{label.text}</span>
                </div>
                <div className="admin-actions">
                  {!u.infinite && (
                    <button disabled={busyId === u.id} onClick={() => extend(u)}>+30 días</button>
                  )}
                  <button className="secondary" disabled={busyId === u.id} onClick={() => toggleInfinite(u)}>
                    {u.infinite ? 'Quitar infinito' : 'Infinito'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
