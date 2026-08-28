// La notificación de reproducción usaba @capgo/capacitor-media-session, un
// plugin de Capacitor — pero después de que la app salta a la versión en
// vivo (live-redirect.js), Capacitor deja de reconocerse como plataforma
// nativa en esa página y cualquier llamada a un plugin se pierde en
// silencio o cae a una implementación web que tira error. En su lugar,
// usamos window.VybeNative (addJavascriptInterface agregado en
// MainActivity.java), que sigue funcionando sin importar el origen.

function fetchArtworkBase64(url) {
  if (!url) return Promise.resolve('');
  return fetch(url)
    .then(res => res.blob())
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }))
    .catch(() => '');
}

let handlers = null;

export function registerMediaSessionHandlers({ onPlay, onPause, onPrev, onNext }) {
  handlers = { onPlay, onPause, onPrev, onNext };
  window.__vybeMediaAction = (action) => {
    console.log('[vybe-media] acción recibida desde la notificación:', action);
    if (!handlers) return;
    if (action === 'play') handlers.onPlay();
    else if (action === 'pause') handlers.onPause();
    else if (action === 'next') handlers.onNext();
    else if (action === 'prev') handlers.onPrev();
  };
}

let lastSong = null;
let lastIsPlaying = false;
let lastArtworkBase64 = '';

export async function updateMediaMetadata(song) {
  lastSong = song;
  lastArtworkBase64 = '';
  if (!song || !window.VybeNative?.updateNotification) return;
  lastArtworkBase64 = await fetchArtworkBase64(song.thumbnail);
  // El usuario pudo haber cambiado de canción de nuevo mientras esperábamos
  // la descarga/codificación del artwork.
  if (lastSong !== song) return;
  window.VybeNative.updateNotification(song.title || '', song.artist || '', lastArtworkBase64, lastIsPlaying);
}

export function updateMediaPlaybackState(isPlaying) {
  lastIsPlaying = isPlaying;
  if (!lastSong || !window.VybeNative?.updateNotification) return;
  // Cada notificación se reconstruye entera del lado nativo, así que hay
  // que volver a mandar el mismo artwork o se pierde en el próximo update.
  window.VybeNative.updateNotification(lastSong.title || '', lastSong.artist || '', lastArtworkBase64, isPlaying);
}
