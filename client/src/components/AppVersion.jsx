import { useEffect, useState } from 'react';
import { version as webVersion } from '../../package.json';

export default function AppVersion() {
  const [v, setV] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        if (window.Capacitor?.getPlatform?.() === 'android') {
          const { App } = await import('@capacitor/app');
          const info = await App.getInfo();
          if (info?.version) {
            setV(info.version);
            return;
          }
        }
      } catch {}
      setV(webVersion);
    })();
  }, []);

  return v ? <span className="logo-version">v{v}</span> : null;
}
