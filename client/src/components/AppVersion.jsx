import { useEffect, useState } from 'react';
import { getAppVersion } from '../appVersion.js';

export default function AppVersion() {
  const [v, setV] = useState(null);

  useEffect(() => {
    getAppVersion().then(setV);
  }, []);

  return v ? <span className="logo-version">v{v}</span> : null;
}
