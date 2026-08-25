import { runUpdateCheck } from './updateCheck.js';
import { LIVE_SERVER_URL } from './config.js';
import './updateCheck.css';

export async function initUpdateCheck() {
  // El chequeo de versión solo tiene sentido en la app Android nativa:
  // ahí hay un APK instalado que puede quedar desactualizado. En el
  // navegador siempre se sirve el código más reciente, así que no hay
  // nada que "actualizar".
  if (!window.Capacitor?.isNativePlatform?.()) return null;

  let currentVersion = null;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    currentVersion = info?.version || null;
  } catch (err) {
    console.warn('[update] no se pudo leer la versión nativa:', err);
  }
  if (!currentVersion) return null;

  // Ojo: NO usar window.location.origin acá. La app puede estar corriendo
  // desde el contenido empaquetado localmente (sin internet, u offline
  // porque liveRedirect.js todavía no saltó), y en ese caso el origin no
  // apunta al servidor real — el chequeo de actualización nunca
  // encontraría nada nuevo.
  return runUpdateCheck({
    endpoint: `${LIVE_SERVER_URL}/api/update`,
    currentVersion,
  });
}
