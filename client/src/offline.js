// Las descargas offline usaban @capacitor/filesystem (Filesystem.writeFile,
// getUri, etc). Después de que la app salta a la versión en vivo
// (liveRedirect.js), Capacitor deja de reconocerse como plataforma nativa
// ahí y esas llamadas se pierden en silencio o fallan — así que usamos
// window.VybeNative (addJavascriptInterface en MainActivity.java), que
// sigue funcionando sin importar el origen de la página. De paso, los
// archivos ahora quedan en el almacenamiento propio de la app
// (getExternalFilesDir), que no necesita el permiso "Acceso a todos los
// archivos" que hacía falta antes para el almacenamiento compartido.

const INDEX_KEY = 'offlineSongs';

function nativeBridge() {
  return typeof window !== 'undefined' ? window.VybeNative : null;
}

function readIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '{}'); } catch { return {}; }
}

function writeIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('No se pudo convertir el archivo'));
    reader.readAsDataURL(blob);
  });
}

let activeController = null;

export function cancelDownload() {
  activeController?.abort();
}

async function downloadBlob(url, onProgress) {
  const controller = new AbortController();
  activeController = controller;
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Descarga falló (HTTP ${res.status})`);

    const total = Number(res.headers.get('content-length')) || 0;
    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    if (!res.body || !res.body.getReader) {
      // Fallback para entornos sin soporte de streams (poco común)
      const blob = await res.blob();
      onProgress?.({ loaded: blob.size, total: blob.size || total, pct: 1 });
      return blob;
    }

    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.({ loaded, total, pct: total ? loaded / total : 0 });
    }
    return new Blob(chunks, { type: contentType });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new DOMException('Descarga cancelada', 'AbortError');
    }
    throw err;
  } finally {
    activeController = null;
  }
}

export function songKey(song) {
  return (song.videoId || song.type === 'youtube') ? `yt_${song.videoId}` : `local_${song.id}`;
}

export function isDownloaded(song) {
  return !!readIndex()[songKey(song)];
}

export function listDownloaded() {
  return Object.values(readIndex());
}

export async function getOfflineSrc(song) {
  const entry = readIndex()[songKey(song)];
  if (!entry) return null;
  const bridge = nativeBridge();
  if (!bridge?.songFileUrl) return null;
  try {
    const url = bridge.songFileUrl(entry.filename);
    return url || null;
  } catch {
    return null;
  }
}

export async function downloadSong(song, apiBase, onProgress) {
  const bridge = nativeBridge();
  if (!bridge?.writeSongFile) {
    throw new Error('Las descargas offline solo funcionan en la app instalada');
  }
  const key = songKey(song);
  const isYt = song.videoId || song.type === 'youtube';
  const url = isYt ? `${apiBase}/ytdlp/stream/${song.videoId}` : `${apiBase}/stream/${song.id}`;
  const blob = await downloadBlob(url, onProgress);
  const ext = isYt ? 'm4a' : (song.filename?.split('.').pop() || 'mp3');
  const filename = `${key}.${ext}`;

  const base64 = await blobToBase64(blob);
  const ok = bridge.writeSongFile(filename, base64);
  if (!ok) {
    throw new Error('No se pudo guardar la descarga en el celular');
  }

  const index = readIndex();
  index[key] = {
    key,
    filename,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail || null,
    downloadedAt: Date.now(),
  };
  writeIndex(index);
}

export async function removeDownload(song) {
  const key = songKey(song);
  const index = readIndex();
  const entry = index[key];
  if (!entry) return;
  try { nativeBridge()?.deleteSongFile?.(entry.filename); } catch {}
  delete index[key];
  writeIndex(index);
}
