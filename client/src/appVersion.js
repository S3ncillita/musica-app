import { version as webVersion } from '../package.json';

let cached = null;

export async function getAppVersion() {
  if (cached) return cached;
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
