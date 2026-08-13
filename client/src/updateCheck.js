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

function downloadBlob(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Descarga falló (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red al descargar'));
    xhr.send();
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('No se pudo convertir el archivo'));
    reader.readAsDataURL(blob);
  });
}

function tagError(step, err) {
  const msg = err?.message || err?.errorMessage || (typeof err === 'string' ? err : JSON.stringify(err)) || 'desconocido';
  const tagged = new Error(`[${step}] ${msg}`);
  tagged.cause = err;
  return tagged;
}

async function downloadAndInstallApk(url, onProgress) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { FileOpener } = await import('@capacitor-community/file-opener');

  let blob;
  try {
    blob = await downloadBlob(url, onProgress);
  } catch (err) {
    throw tagError('descarga', err);
  }

  const path = 'vybe-update.apk';
  try {
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({ path, directory: Directory.Cache, data: base64 });
  } catch (err) {
    throw tagError('guardar archivo', err);
  }

  let uri;
  try {
    ({ uri } = await Filesystem.getUri({ path, directory: Directory.Cache }));
  } catch (err) {
    throw tagError('obtener ruta', err);
  }

  try {
    await FileOpener.open({
      filePath: uri,
      contentType: 'application/vnd.android.package-archive',
    });
  } catch (err) {
    throw tagError('abrir instalador', err);
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
      const detail = err?.message || err?.errorMessage || (typeof err === 'string' ? err : JSON.stringify(err));
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

export async function runUpdateCheck(options) {
  const info = await checkUpdate(options);
  if (info) showUpdatePrompt(info);
  return info;
}
