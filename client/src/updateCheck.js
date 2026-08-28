export function compareVersions(a, b) {
  // parseInt (no Number) para tolerar sufijos tipo "22-debug": si no, esa
  // parte da NaN, las comparaciones con NaN son siempre false, y una build
  // de diagnóstico queda para siempre sin poder detectar que hay una
  // versión más nueva.
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export async function checkUpdate({ endpoint = '/api/update', currentVersion, force = false } = {}) {
  if (!currentVersion) return null;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const info = await res.json();
    if (!force && compareVersions(info.version, currentVersion) <= 0) return null;
    // Resolver contra el origin del propio endpoint, no window.location.origin:
    // la app puede estar corriendo desde contenido empaquetado localmente,
    // cuyo origin no es el servidor real.
    const base = new URL(endpoint, window.location.origin).origin;
    const url = new URL(info.apkUrl || info.url, base).href;
    return { ...info, url };
  } catch (err) {
    console.warn('[update] chequeo falló:', err);
    return null;
  }
}

let activePrompt = null;

export function showUpdatePrompt(info) {
  if (activePrompt) return activePrompt;

  // window.Capacitor.getPlatform() ya no es confiable después del
  // live-redirect (ver config.js) — window.VybeNative es el puente directo
  // que sí sigue andando ahí, así que su presencia es la señal real de que
  // estamos en la app nativa.
  const isNative = !!window.VybeNative?.installUpdate;

  const overlay = document.createElement('div');
  overlay.className = 'update-overlay';
  overlay.innerHTML = `
    <div class="update-card" role="dialog" aria-modal="true">
      <h2 class="update-title">Nueva versión disponible</h2>
      <p class="update-version">Versión ${info.version}</p>
      ${info.notes ? `<p class="update-notes">${info.notes}</p>` : ''}
      <div class="update-progress-wrap" style="display:none">
        <div class="update-progress-bar"><div class="update-progress-fill"></div></div>
        <div class="update-progress-label">0%</div>
      </div>
      <div class="update-actions">
        <button type="button" class="update-btn update-download">Actualizar</button>
        ${info.force ? '' : '<button type="button" class="update-btn update-later">Ahora no</button>'}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const downloadBtn = overlay.querySelector('.update-download');
  const progressWrap = overlay.querySelector('.update-progress-wrap');
  const progressFill = overlay.querySelector('.update-progress-fill');
  const progressLabel = overlay.querySelector('.update-progress-label');

  downloadBtn.addEventListener('click', async () => {
    if (!isNative) {
      window.open(info.url, '_blank');
      close();
      return;
    }
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Descargando...';
    progressWrap.style.display = 'block';
    overlay.querySelector('.update-later')?.remove();

    const onError = (msg) => {
      console.error('[update] actualización falló:', msg);
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Reintentar';
      progressLabel.textContent = `Error: ${msg || 'desconocido'}`;
      progressLabel.classList.add('update-progress-error');
      cleanup();
    };
    const onProgress = (pct) => {
      progressFill.style.width = `${pct}%`;
      progressLabel.textContent = `${pct}%`;
    };
    const onDone = () => {
      downloadBtn.textContent = 'Instalando...';
      cleanup();
    };
    const cleanup = () => {
      delete window.__vybeUpdateError;
      delete window.__vybeUpdateProgress;
      delete window.__vybeUpdateDone;
    };
    window.__vybeUpdateError = onError;
    window.__vybeUpdateProgress = onProgress;
    window.__vybeUpdateDone = onDone;

    try {
      window.VybeNative.installUpdate(info.url);
    } catch (err) {
      onError(err?.message || String(err));
    }
  });
  overlay.querySelector('.update-later')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !info.force) close();
  });

  function close() {
    overlay.remove();
    activePrompt = null;
  }

  activePrompt = overlay;
  return overlay;
}

const CHANGELOG_KEY = 'lastSeenChangelogVersion';

export function showWhatsNew(info) {
  if (activePrompt) return activePrompt;

  const overlay = document.createElement('div');
  overlay.className = 'update-overlay';
  overlay.innerHTML = `
    <div class="update-card" role="dialog" aria-modal="true">
      <h2 class="update-title">Qué hay de nuevo</h2>
      <p class="update-version">Versión ${info.version}</p>
      ${info.notes ? `<p class="update-notes">${info.notes}</p>` : ''}
      <div class="update-actions">
        <button type="button" class="update-btn update-download">Entendido</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => { overlay.remove(); activePrompt = null; };
  overlay.querySelector('.update-download').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  activePrompt = overlay;
  return overlay;
}

export async function checkWhatsNew({ endpoint = '/api/update', currentVersion } = {}) {
  if (!currentVersion) return null;
  const lastSeen = localStorage.getItem(CHANGELOG_KEY);
  if (lastSeen === currentVersion) return null;
  if (!lastSeen) {
    // primera vez que corre esta versión del checker: no hay nada previo con qué comparar
    localStorage.setItem(CHANGELOG_KEY, currentVersion);
    return null;
  }
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const info = await res.json();
    if (info.version !== currentVersion) return null;
    localStorage.setItem(CHANGELOG_KEY, currentVersion);
    return info;
  } catch (err) {
    console.warn('[update] chequeo de novedades falló:', err);
    return null;
  }
}

export async function runUpdateCheck(options) {
  const info = await checkUpdate(options);
  if (info) {
    showUpdatePrompt(info);
    return info;
  }
  const whatsNew = await checkWhatsNew(options);
  if (whatsNew) showWhatsNew(whatsNew);
  return whatsNew;
}
