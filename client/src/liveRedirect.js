import { LIVE_SERVER_URL } from './config.js';

// Cuando la app corre empaquetada localmente en el celular (para poder
// abrir sin internet y reproducir descargas offline), si hay conexión al
// servidor real, saltamos directo a la versión en vivo — así los cambios
// de JS/CSS se siguen viendo al instante sin necesitar una APK nueva.
// Si no hay conexión, seguimos con lo empaquetado en la APK.
export async function maybeRedirectToLive() {
  const isNative = window.Capacitor?.isNativePlatform?.();
  if (!isNative) return false;

  // Ya estamos en la versión en vivo (o en otra ya redirigida): no hacer nada.
  if (window.location.origin === LIVE_SERVER_URL) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${LIVE_SERVER_URL}/api/update`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return false;
  } catch {
    return false;
  }

  window.location.replace(LIVE_SERVER_URL);
  return true;
}
