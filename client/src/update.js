import { runUpdateCheck } from './updateCheck.js';
import './updateCheck.css';

const FALLBACK_VERSION = '1.1';

export async function initUpdateCheck() {
  let currentVersion = FALLBACK_VERSION;
  try {
    if (window.Capacitor?.getPlatform?.() === 'android') {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      if (info?.version) currentVersion = info.version;
    }
  } catch (err) {
    console.warn('[update] no se pudo leer la versión nativa:', err);
  }
  return runUpdateCheck({
    endpoint: `${window.location.origin}/api/update`,
    currentVersion,
  });
}
