import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.musica.app',
  appName: 'Vybe',
  webDir: 'dist',
  // Sin `server.url`: la app arranca con el contenido empaquetado en la APK
  // (funciona sin internet, incluida la reproducción de descargas offline).
  // Si hay conexión al servidor real, src/liveRedirect.js salta a la versión
  // en vivo apenas arranca, para seguir recibiendo cambios de JS/CSS sin
  // necesitar una APK nueva en el uso normal (con internet).
  server: {
    androidScheme: 'https',
    cleartext: true,
    // Sin esto, Capacitor manda la navegación hacia la IP real (ver
    // src/liveRedirect.js) al navegador externo del celular en vez de
    // mantenerla dentro del WebView de la app.
    allowNavigation: ['181.94.245.250'],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
