import { version as webVersion } from '../package.json';
import { nativeAppVersion } from './config.js';

let cached = null;

export async function getAppVersion() {
  if (cached) return cached;
  // nativeAppVersion viene de liveRedirect.js, capturado con App.getInfo()
  // mientras todavía estábamos en el origen nativo real (después de saltar
  // a la versión en vivo, ese plugin ya no funciona en esta página).
  if (nativeAppVersion) {
    cached = nativeAppVersion;
    return cached;
  }
  try {
    if (window.Capacitor?.getPlatform?.() === 'android') {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      if (info?.version) {
        cached = info.version;
        return cached;
      }
    }
  } catch {}
  cached = webVersion;
  return cached;
}
