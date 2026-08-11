# Guía de instalación en Windows (NUC)

> Setup único + auto-deploy para correr Vybe en una PC/NUC con Windows.

---

## ☑️ PASO 1 — Instalar los requisitos (una vez)

1. **Node.js LTS** → https://nodejs.org/en/download (el instalador de "LTS")
2. **Git for Windows** → https://git-scm.com/download/win

Durante la instalación de Git elegir:
- SSH executable: **Use bundled OpenSSH**
- `git pull` default: **Default (fast-forward or merge)**
- Default branch name: **Let Git decide** (usa `master`, que es la rama del repo)
- Credential Manager: **Git Credential Manager** (recomendado)

> Cerrar todas las ventanas de terminal y abrir una nueva después de instalar.

---

## ☑️ PASO 2 — Clonar el repo y correr el setup

En un **cmd como Administrador**:

```bat
git clone https://github.com/S3ncillita/musica-app.git C:\musica
cd C:\musica\deploy
powershell -ExecutionPolicy Bypass -File setup-windows.ps1
```

`setup-windows.ps1` hace SOLO (en orden):
1. Verifica Node y Git
2. Descarga e instala **yt-dlp** en `System32` (audio de YouTube)
3. Instala **pm2** (mantiene el server vivo + arranque con Windows)
4. Instala dependencias y compila el client
5. Crea `server\.env` (JWT secreto aleatorio + puerto 48292)
6. Registra el server en pm2 como `musica` y lo hace arrancar con Windows
7. Abre el firewall en el puerto 48292
8. Programa el **auto-deploy** cada 2 min (Task Scheduler)
9. Hace el primer deploy

---

## ☑️ PASO 3 — Verificar

```bat
pm2 status
```
Debe mostrar `musica` en `online`.

En el navegador: `http://IP_DE_LA_NUC:48292`

---

## ☑️ CÓMO FUNCIONA EL AUTO-DEPLOY

- La tarea `musica-deploy` (Task Scheduler) corre **cada 2 minutos**.
- Ejecuta `C:\musica\deploy\deploy-windows.ps1`:
  `git pull` de master → si hay commits nuevos → `npm run build` → `pm2 restart musica`.
- Corre **oculto** (via `deploy-hidden.vbs` + `wscript`), no abre ventanas.
- Si no hay cambios nuevos, no hace nada.
- El estado del último deploy está en `%TEMP%\musica_last_deploy`.

---

## ☑️ COMANDOS ÚTILES

| Acción                | Comando                                          |
|------------------------|--------------------------------------------------|
| Estado del server      | `pm2 status`                                     |
| Logs del server        | `pm2 logs musica`                                |
| Reiniciar el server    | `pm2 restart musica`                             |
| Probar deploy a mano   | `powershell -NoProfile -ExecutionPolicy Bypass -File C:\musica\deploy\deploy-windows.ps1` |
| Pausar auto-deploy     | `schtasks /Change /TN musica-deploy /DISABLE`    |
| Reanudar auto-deploy   | `schtasks /Change /TN musica-deploy /ENABLE`     |
| Ver la tarea           | `schtasks /query /tn musica-deploy`              |

---

## ⚠️ PROBLEMAS COMUNES

| Problema                          | Solución |
|-----------------------------------|----------|
| `git` no se reconoce como comando | Instalar Git for Windows y reabrir la terminal |
| Error rojo de git al correr deploy-windows.ps1 | PowerShell 5.1 trata los avisos de git (stderr) como error. El script ya está corregido (usa `*> $null`). Si tenés la versión vieja, volvé a correr el `setup` o copiá el `deploy-windows.ps1` actualizado desde el repo |
| Se abre una ventana cada 2 minutos | Es la tarea de auto-deploy. Ya está configurada oculta con `deploy-hidden.vbs`. Si reaparece, recrear el VBS y reprogramar la tarea con `wscript.exe C:\musica\deploy\deploy-hidden.vbs` |
| No conecta desde el celular | Verificar IP, firewall (48292) y que `pm2 status` muestre `online` |
| La canción da error | Actualizar yt-dlp: descargar `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe` a `C:\Windows\System32\yt-dlp.exe` |
