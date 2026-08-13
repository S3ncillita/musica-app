import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const INDEX_KEY = 'offlineSongs';
const DIR = Directory.Data;
const FOLDER = 'offline';

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

function downloadBlob(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
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
  try {
    const { uri } = await Filesystem.getUri({ directory: DIR, path: entry.path });
    return Capacitor.convertFileSrc(uri);
  } catch {
    return null;
  }
}

export async function downloadSong(song, apiBase, onProgress) {
  const key = songKey(song);
  const isYt = song.videoId || song.type === 'youtube';
  const url = isYt ? `${apiBase}/ytdlp/stream/${song.videoId}` : `${apiBase}/stream/${song.id}`;
  const blob = await downloadBlob(url, onProgress);
  const ext = isYt ? 'm4a' : (song.filename?.split('.').pop() || 'mp3');
  const path = `${FOLDER}/${key}.${ext}`;

  const base64 = await blobToBase64(blob);
  await Filesystem.mkdir({ path: FOLDER, directory: DIR, recursive: true }).catch(() => {});
  await Filesystem.writeFile({ path, directory: DIR, data: base64 });

  const index = readIndex();
  index[key] = {
    key,
    path,
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
  try { await Filesystem.deleteFile({ path: entry.path, directory: DIR }); } catch {}
  delete index[key];
  writeIndex(index);
}
