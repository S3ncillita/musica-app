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

async function downloadAndInstallApk(url, onProgress) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { FileOpener } = await import('@capacitor-community/file-opener');

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error('No se pudo descargar la actualización');
  const total = Number(res.headers.get('content-length')) || 0;

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(received / total);
  }

  const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
  const path = 'vybe-update.apk';
  await Filesystem.writeFile({ path, directory: Directory.Cache, data: blob });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });

  await FileOpener.open({
    filePath: uri,
    contentType: 'application/vnd.android.package-archive',
  });
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

  const target = window.Capacitor && window.Capacitor.getPlatform ? '_system' : '_blank';
  const downloadBtn = overlay.querySelector('.update-download');
  const progressWrap = overlay.querySelector('.update-progress-wrap');
  const progressFill = overlay.querySelector('.update-progress-fill');
  const progressLabel = overlay.querySelector('.update-progress-label');

  downloadBtn.addEventListener('click', async () => {
    if (!isNative) {
      window.open(info.url, target);
      close();
      return;
    }
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Actualizando...';
    progressWrap.style.display = 'block';
    overlay.querySelector('.update-later')?.remove();
    try {
      await downloadAndInstallApk(info.url, (pct) => {
        const p = Math.min(100, Math.round(pct * 100));
        progressFill.style.width = `${p}%`;
        progressLabel.textContent = `${p}%`;
      });
      close();
    } catch (err) {
      console.error('[update] descarga falló:', err);
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Reintentar';
      progressLabel.textContent = 'Error al descargar';
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

export async function runUpdateCheck(options) {
  const info = await checkUpdate(options);
  if (info) showUpdatePrompt(info);
  return info;
}
