# update-module

Módulo reutilizable de **chequeo de actualizaciones** para apps que sirve para cualquier proyecto: le avisa al usuario cuando hay un APK nuevo y le da un botón para descargarlo.

> Importante: Android **no permite auto-instalar** un APK sin interacción del usuario. El módulo te lleva a la descarga; el usuario toca "instalar". Es lo máximo que se puede hacer fuera de una tienda.

## Qué incluye

```
update-module/
├── README.md
├── server/
│   ├── update-route.js      # Ruta Express: /api/update + sirve /apk/
│   └── update.json          # Config: versión publicada, URL del APK, notas
└── app/
    ├── update.js            # Lógica JS (sin dependencias): check + prompt + semver
    └── update.css           # Estilos del aviso (tema oscuro)
```

---

## 1) Lado servidor (Node + Express)

1. Copiá `server/update-route.js` a tu server y `server/update.json` a donde quieras (ej. `data/update.json`).
2. Montá la ruta:

```js
import updateRoute from './update-route.js';

app.use('/api/update', updateRoute({
  express,                          // pasá tu instancia de express
  updateFile: 'data/update.json',   // ruta al JSON
  apkDir: 'public/apk',             // carpeta donde va el APK (opcional)
}));
```

3. Dejá el APK en la carpeta `apkDir` (ej. `public/apk/miapp.apk`). El endpoint `/api/update/apk/miapp.apk` lo sirve solo.

4. Configurá `update.json` (el `apkUrl` incluye el prefijo del mount `/api/update`):

```json
{
  "version": "1.1.0",
  "apkUrl": "/api/update/apk/miapp.apk",
  "notes": "Corregimos el bug del reproductor y mejoramos el rendimiento.",
  "force": false
}
```

| Campo     | Qué es                                                      |
|-----------|-------------------------------------------------------------|
| `version` | Versión publicada (semver `1.2.3`). **La única que cambia en cada release.** |
| `apkUrl`  | Ruta relativa al APK dentro de tu server.                    |
| `notes`   | Texto que se muestra en el aviso (opcional).                 |
| `force`   | `true` = no se puede cerrar el aviso (actualización obligatoria). |

---

## 2) Lado app (cualquier frontend)

Copiá `app/update.js` y `app/update.css` a tu proyecto.

### En una app Capacitor/Android (recomendado)

1. Instalá el plugin nativo: `npm i @capacitor/app` y `npx cap sync android`.
2. En el arranque de tu app (React/Vue/vanilla), leé la **versión nativa** del APK:

```js
import { App } from '@capacitor/app';
import { runUpdateCheck } from './update.js';
import './update.css';

async function init() {
  const { version } = await App.getInfo();   // versión del APK instalado (build.gradle)
  await runUpdateCheck({
    endpoint: `${window.location.origin}/api/update`,
    currentVersion: version,
  });
}
init();
```

### En una web común (sin Capacitor)

Pasá un número de versión fijo de tu app:

```js
import { runUpdateCheck } from './update.js';
import './update.css';

runUpdateCheck({ endpoint: '/api/update', currentVersion: '1.0.0' });
```

### API del módulo

| Función             | Descripción |
|---------------------|-------------|
| `compareVersions(a, b)` | Compara semver: `1` si `a>b`, `-1` si `a<b`, `0` si igual. |
| `checkUpdate(opts)`  | Consulta el server y devuelve el objeto actualizado si hay versión nueva, o `null`. |
| `showUpdatePrompt(info)` | Muestra el aviso con botón **Descargar** (y "Ahora no" si no es `force`). |
| `runUpdateCheck(opts)` | `checkUpdate` + `showUpdatePrompt` en un solo paso. Devuelve la info. |

Opciones: `{ endpoint, currentVersion, force }`.

El botón Descargar abre el APK en el navegador externo (en Capacitor usa `_system`, en web `_blank`), donde Android pide instalar.

---

## 3) Cómo se publica una versión nueva

1. En tu proyecto Android subí `versionCode` y `versionName` en `app/build.gradle`.
2. Construí el APK (`./gradlew assembleDebug` o Release).
3. Copiá el APK a la carpeta `apkDir` del server (con el mismo nombre de `apkUrl`).
4. En `update.json`: subí `version` a la misma versión de `build.gradle` y poné las notas.
5. Reiniciá el server (o esperá tu auto-deploy).

El APK instalado tiene versión vieja → el server dice versión nueva → el usuario ve el aviso.
