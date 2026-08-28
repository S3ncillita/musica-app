import { runUpdateCheck } from './updateCheck.js';
import { LIVE_SERVER_URL, isNative, nativeAppVersion } from './config.js';
import './updateCheck.css';

export async function initUpdateCheck() {
  // El chequeo de versión solo tiene sentido en la app Android nativa:
  // ahí hay un APK instalado que puede quedar desactualizado. En el
  // navegador siempre se sirve el código más reciente, así que no hay
  // nada que "actualizar". `isNative` viene de config.js: usa el query
  // param que liveRedirect.js deja antes de saltar, porque
  // Capacitor.isNativePlatform() ya no es confiable en este origen.
  if (!isNative) return null;

  // nativeAppVersion: capturado por liveRedirect.js con App.getInfo() antes
  // de saltar (acá App.getInfo() ya no funciona). Si por algún motivo no
  // llegó (ej: la app abrió directo en este origen sin pasar por el
  // redirect), probamos igual por si Capacitor sí es nativo acá.
  let currentVersion = nativeAppVersion;
  if (!currentVersion) {
    try {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      currentVersion = info?.version || null;
    } catch (err) {
      console.warn('[update] no se pudo leer la versión nativa:', err);
    }
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
