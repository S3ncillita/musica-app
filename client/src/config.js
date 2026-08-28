const CONFIG_KEY = 'musica_config';

// En Android la app puede quedar empaquetada localmente (para funcionar sin
// internet), así que window.location.origin ya no apunta al servidor real.
// Ahí usamos siempre esta URL fija; en web, window.location.origin sigue
// siendo correcto (dev local, etc).
export const LIVE_SERVER_URL = 'http://181.94.245.250:48292';

// window.Capacitor.isNativePlatform() deja de ser confiable después de que
// liveRedirect.js navega a este origen: Capacitor no se reconoce a sí mismo
// como nativo en un origen externo. liveRedirect.js, mientras todavía
// estaba en el origen nativo real (donde esta llamada SÍ es confiable), deja
// esta marca como query param antes de saltar, así que la leemos primero.
const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const isNative = urlParams?.get('vybeNative') === '1' || (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.());
export const nativeAppVersion = urlParams?.get('vybeNativeVersion') || null;
export { isNative };

const defaults = {
  serverUrl: isNative ? LIVE_SERVER_URL : window.location.origin,
};

function load() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) return { ...defaults, ...JSON.parse(saved) };
  } catch {}
  return defaults;
}

function save(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function getApiBase() {
  const config = load();
  return config.serverUrl + '/api';
}

function getServerUrl() {
  return load().serverUrl;
}

function setServerUrl(url) {
  const clean = url.replace(/\/+$/, '');
  save({ ...load(), serverUrl: clean });
}

export { getApiBase, getServerUrl, setServerUrl };
