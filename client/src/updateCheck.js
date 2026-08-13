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
    const url = new URL(info.apkUrl || info.url, window.location.origin).href;
    return { ...info, url };
  } catch (err) {
    console.warn('[update] chequeo falló:', err);
    return null;
  }
}

let activePrompt = null;

export function showUpdatePrompt(info) {
  if (activePrompt) return activePrompt;

  const overlay = document.createElement('div');
  overlay.className = 'update-overlay';
  overlay.innerHTML = `
    <div class="update-card" role="dialog" aria-modal="true">
      <h2 class="update-title">Nueva versión disponible</h2>
      <p class="update-version">Versión ${info.version}</p>
      ${info.notes ? `<p class="update-notes">${info.notes}</p>` : ''}
      <p class="update-progress-label" style="display:none">Se abrió la descarga. Revisá la barra de notificaciones de tu celular para instalarla cuando termine.</p>
      <div class="update-actions">
        <button type="button" class="update-btn update-download">Actualizar</button>
        ${info.force ? '' : '<button type="button" class="update-btn update-later">Ahora no</button>'}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const target = window.Capacitor && window.Capacitor.getPlatform ? '_system' : '_blank';
  const downloadBtn = overlay.querySelector('.update-download');
  const hint = overlay.querySelector('.update-progress-label');

  downloadBtn.addEventListener('click', () => {
    window.open(info.url, target);
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Descargando...';
    hint.style.display = 'block';
    overlay.querySelector('.update-later')?.remove();
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

export async function runUpdateCheck(options) {
  const info = await checkUpdate(options);
  if (info) showUpdatePrompt(info);
  return info;
}
