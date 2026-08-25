export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
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

  const isNative = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android');

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
    try {
      const ApkUpdater = (await import('cordova-plugin-apkupdater')).default;
      await ApkUpdater.download(info.url, {
        onDownloadProgress: (e) => {
          const p = Math.round(e.progress);
          progressFill.style.width = `${p}%`;
          progressLabel.textContent = `${p}%`;
        },
      });
      downloadBtn.textContent = 'Instalando...';
      await ApkUpdater.install();
      close();
    } catch (err) {
      console.error('[update] actualización falló:', err);
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Reintentar';
      const detail = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      progressLabel.textContent = `Error: ${detail || 'desconocido'}`;
      progressLabel.classList.add('update-progress-error');
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
