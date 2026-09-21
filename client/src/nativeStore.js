// La app tiene dos "orígenes" distintos: la copia empaquetada en el APK
// (que se usa sin conexión) y la versión en vivo (servidor). Cada uno tiene
// su propio localStorage, así que la sesión y la lista de descargas que
// guarda uno no existen para el otro — por eso al quedarse sin conexión
// la app abría la copia empaquetada, sin sesión y sin descargas, y pedía
// login. Se espeja lo importante en SharedPreferences (vía VybeNative),
// que es común a los dos.

const MIRRORED_KEYS = ['authToken', 'authUser', 'offlineSongs'];

function bridge() {
  return typeof window !== 'undefined' ? window.VybeNative : null;
}

// La interfaz nativa puede tardar un instante en aparecer en la primera
// página que carga el WebView.
async function waitForBridge(ms = 1000) {
  const start = Date.now();
  while (!bridge()?.getPref && Date.now() - start < ms) {
    await new Promise(r => setTimeout(r, 50));
  }
  return bridge()?.getPref ? bridge() : null;
}

export async function restoreFromNative() {
  const b = await waitForBridge();
  if (!b) return;
  try {
    for (const key of MIRRORED_KEYS) {
      const native = b.getPref(key);
      if (!native) continue;
      // La lista de descargas la escriben los dos orígenes, y la copia
      // nativa es siempre la más reciente. La sesión solo se restaura si
      // falta (si ya hay una en este origen, es la vigente).
      if (key === 'offlineSongs' || !localStorage.getItem(key)) {
        localStorage.setItem(key, native);
      }
    }
  } catch {}
}

export function mirrorToNative() {
  const b = bridge();
  if (!b?.setPref) return;
  try {
    for (const key of MIRRORED_KEYS) {
      const value = localStorage.getItem(key);
      if (value) b.setPref(key, value);
    }
  } catch {}
}

export function clearNativeSession() {
  const b = bridge();
  if (!b?.setPref) return;
  try {
    b.setPref('authToken', '');
    b.setPref('authUser', '');
  } catch {}
}
