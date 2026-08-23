# Música 🎵

Aplicación de música estilo streaming con **búsqueda en YouTube**, reproductor en línea, biblioteca, playlists, tendencias y artistas. Incluye app para **Android (Capacitor)** y servidor propio en **Node.js/Express**.

## Características

- 🔍 **Búsqueda de musica ** con resultados reales y reproducción en streaming (sin descargar a disco).
- ▶️ **Reproductor** con cola, shuffle, repeat, seek y volumen.
- 📚 **Biblioteca personal** y **playlists** por usuario.
- 🔥 **Tendencias** y vista de **artistas**.
- 👤 **Registro/login** con JWT y contraseñas hasheadas (bcrypt).
- 📱 **APK Android** con Capacitor 8.
- 🎬 **Streaming por proxy** con soporte de `Range` requests (seek) usando yt-dlp.

## Arquitectura

```
client/     App web React (Vite) + Android (Capacitor)
server/     API REST Express (Node.js)
```

Flujo de reproducción de YouTube:

```
Cliente (React) → /api/ytdlp/stream/:videoId → yt-dlp (obtiene URL directa)
    → Express hace de proxy → audio fluye en chunks (Range) → Audio API del navegador
```

## Stack

| Capa      | Tecnologías                                  |
|-----------|----------------------------------------------|
| Frontend  | React 18, Vite 5, Capacitor 8                |
| Backend   | Node.js, Express, JWT, bcryptjs, dotenv      |
| Descarga  | yt-dlp (URL directa)                         |
| Almacen.  | JSON local (sin DB externa)                  |

## Requisitos

- Node.js 18+ (probado en 24)
- yt-dlp (en `PATH` o con `pip install -U yt-dlp`)
- ffmpeg (opcional, recomendado)
- Android SDK (solo para compilar el APK)

## Instalación y ejecución

### 1. Instalar dependencias

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configurar variables de entorno

```bash
cp server/.env.example server/.env
# editar server/.env con tu JWT_SECRET y CERT_PASSPHRASE
```

### 3. Compilar el client

```bash
cd client && npm run build
```

### 4. Iniciar el servidor

```bash
cd server && node src/index.js
```

El server sirve la app en `http://<IP-local>:48292` (HTTP) y `https://<IP-local>:48291` (HTTPS si tenés `cert.pfx` + `CERT_PASSPHRASE`).

### 5. Modo desarrollo (cliente con hot-reload)

```bash
cd client && npm run dev
```

## Compilar el APK Android

```bash
cd client
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: client/android/app/build/outputs/apk/debug/app-debug.apk
```

> El APK usa el `server.url` definido en `client/capacitor.config.ts` para conectarse al servidor.

## API principal

| Método | Ruta                          | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/youtube/search?q=`      | Buscar en YouTube                    |
| GET    | `/api/youtube/trending`       | Playlists de tendencias              |
| GET    | `/api/ytdlp/stream/:videoId`  | Streaming de audio (proxy + Range)   |
| POST   | `/api/songs/upload`           | Subir archivos de audio              |
| GET    | `/api/songs`                  | Listar biblioteca                    |
| POST   | `/api/songs/youtube`          | Agregar canción de YouTube           |
| POST   | `/api/auth/register` `login`  | Crear usuario / iniciar sesión       |
| GET/POST| `/api/playlists`             | Listar / crear playlists             |

## Notas

- Los datos de usuarios y biblioteca se guardan en `server/data/` (no se sube a Git).
- El streaming no llena el disco: transmite el audio directo de YouTube sin archivos temporales.
- Si un video falla en streaming, el server responde 500 con el motivo (suele ser yt-dlp desactualizado: `pip install -U yt-dlp`).
