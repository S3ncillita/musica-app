const CONFIG_KEY = 'musica_config';

const defaults = {
  serverUrl: window.location.origin,
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
