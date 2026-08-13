import { runUpdateCheck } from './updateCheck.js';
import './updateCheck.css';

export async function initUpdateCheck() {
  // El chequeo de versión solo tiene sentido en la app Android nativa:
  // ahí hay un APK instalado que puede quedar desactualizado. En el
  // navegador siempre se sirve el código más reciente, así que no hay
  // nada que "actualizar".
  if (window.Capacitor?.getPlatform?.() !== 'android') return null;

  let currentVersion = null;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    currentVersion = info?.version || null;
  } catch (err) {
    console.warn('[update] no se pudo leer la versión nativa:', err);
  }
  if (!currentVersion) return null;

  return runUpdateCheck({
    endpoint: `${window.location.origin}/api/update`,
    currentVersion,
  });
}
