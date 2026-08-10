import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.musica.app',
  appName: 'Vybe',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'http://181.94.245.250:48292',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
