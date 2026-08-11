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
8. Programa el **auto-deploy** cada 2 min (Task Scheduler, con permisos de admin)
9. **Instala MySQL Server si falta** y crea la DB `vybe` + usuario `vybe`
10. Hace el primer deploy

---

## ☑️ PASO 3 — Verificar

```bat
pm2 status
```
Debe mostrar `musica` en `online`.

En el navegador: `http://IP_DE_LA_NUC:48292`

---

## ☑️ PASO 4 — Usuarios en MySQL (automático, para administrarlos desde MySQL Workbench)

> Canciones y playlists siguen en `server\data\db.json`. Solo los usuarios viven en MySQL.

El **auto-deploy ya instala y configura MySQL solo** (lo detecta en cada ciclo):
- Descarga MySQL Server (8.0) y lo registra como servicio `MySQL`.
- Crea la DB `vybe` y el usuario `vybe` (clave `vybe2026`).
- Agrega `DB_*` al `server\.env` si no están.
- Migra los usuarios de `users.json` (mantiene contraseñas actuales) y reinicia pm2.

> Esto requiere que la tarea `musica-deploy` corra **con permisos de admin** (`/RL HIGHEST`).

**Si la NUC ya tenía la tarea creada antes de este cambio**, actualizala una vez (cmd como Administrador):

```bat
schtasks /Create /F /TN "musica-deploy" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\musica\deploy\deploy-windows.ps1" /SC MINUTE /MO 2 /RL HIGHEST
```

A partir del próximo ciclo (máx. 2-4 min) MySQL queda instalado solo. **Workbench sirve solo para VER/editar**; no reemplaza al servidor. Conectarse con `vybe` / `vybe2026` y abrir el esquema `vybe` → `users`. Para cambiar una contraseña: `cd C:\musica\server` + `node reset-password.js <usuario> <nueva-contrasena>`.

### Instalación manual (opcional, si preferís no automatizar)
1. Instalar **MySQL Server** → https://dev.mysql.com/downloads/mysql/ (Server Only, root con contraseña).
2. En cmd como admin: `mysql -u root -p` y correr el CREATE DATABASE / USER / GRANT de arriba.
3. Agregar `DB_*` a `C:\musica\server\.env`, correr `node migrate-mysql.js` y `pm2 restart musica`.

---

## ☑️ CÓMO FUNCIONA EL AUTO-DEPLOY

- La tarea `musica-deploy` (Task Scheduler) corre **cada 2 minutos**.
- Ejecuta `C:\musica\deploy\deploy-windows.ps1`:
  `git pull` de master → si hay commits nuevos → `npm run build` → `pm2 restart musica`.
- En cada ciclo verifica **MySQL** y, si falta, lo instala y configura solo (PASO 4).
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
| Error `ECONNREFUSED` al registrarse/entrar | MySQL no está corriendo o falta la config: verificar el servicio MySQL y los `DB_*` en `server\.env` (PASO 4) |
| `ER_ACCESS_DENIED_ERROR` al migrar | El usuario `vybe` no existe o la contraseña no coincide: recrearlo con los GRANT del PASO 4 |
