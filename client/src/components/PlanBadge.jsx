import './PlanBadge.css';

// Días que le quedan al plan. No se muestra para el administrador ni para
// cuentas sin vencimiento (expiresAt vacío), ni si el plan ya venció (ahí se
// ve la pantalla de renovación).
export default function PlanBadge({ user }) {
  if (!user || user.isAdmin || !user.expiresAt || user.expired) return null;
  const end = new Date(user.expiresAt);
  const days = Math.max(1, Math.ceil((end - Date.now()) / 86400000));
  const level = days <= 3 ? 'bad' : days <= 7 ? 'warn' : 'ok';
  return (
    <span className={`plan-badge ${level}`} title={`Tu plan vence el ${end.toLocaleDateString()}`}>
      {days} {days === 1 ? 'día' : 'días'}
    </span>
  );
}
