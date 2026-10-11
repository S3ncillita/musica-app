import { getApiBase } from './config.js';

const API = getApiBase();

export async function api(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  // 402 = plan vencido: App escucha este evento y muestra la pantalla de renovación.
  if (res.status === 402) window.dispatchEvent(new Event('plan-expired'));
  return res;
}

// URL para el <audio> y las descargas: el reproductor del navegador no puede
// mandar headers, así que el token va en ?t=. Si no hay sesión, devuelve la
// URL sin token (el servidor responderá 401).
export function mediaUrl(path) {
  const token = localStorage.getItem('authToken');
  const sep = path.includes('?') ? '&' : '?';
  return `${API}${path}${token ? `${sep}t=${encodeURIComponent(token)}` : ''}`;
}

export { API };
