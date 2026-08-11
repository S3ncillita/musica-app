# Guía de instalación en Ubuntu Server (paso a paso)

> Checklist para no perderte. Todos los comandos van en la terminal del Ubuntu.

---

## ☑️ ANTES DE EMPEZAR (en tu notebook)

- [ ] Tener el proyecto actualizado (los cambios de streaming ya están en `server/` y `client/dist`).
- [ ] Copiar la carpeta al Ubuntu. Opciones:
  - **Por USB/disco**: copiar la carpeta `musica/` completa.
  - **Por red**: `scp -r /home/rodrigo/Documents/musica usuario@IP_UBUNTU:/home/usuario/`
  - **Por GitHub** (si ya lo subiste): `git clone https://github.com/TU_USUARIO/musica-app.git`

---

## ☑️ PASO 1 — Ubicar el proyecto en el Ubuntu

```bash
# Si lo copiaste al home:
cd ~/musica

# O moverlo a una ruta fija (recomendado):
sudo mv ~/musica /opt/musica
cd /opt/musica
```

- [ ] La carpeta tiene que contener `server/` y `client/` (además de `install-ubuntu.sh`).

---

## ☑️ PASO 2 — Correr el instalador

```bash
bash install-ubuntu.sh
```

Esto hace SOLO (en orden):
1. Instala Node.js 20 (si no está)
2. Instala yt-dlp
3. Instala dependencias del server
4. Instala dependencias y compila el client
5. Crea `server/.env` (te va a avisar que lo edites)
6. Crea el servicio systemd + abre el firewall

- [ ] Al final debe decir **"Instalación completada ✅"**
- [ ] Debe mostrar la URL: `http://IP_DEL_UBUNTU:48292`

---

## ☑️ PASO 3 — Configurar secretos (obligatorio)

```bash
# Generar un secreto nuevo:
openssl rand -hex 32

# Editar el .env:
sudo nano /opt/musica/server/.env
```

Pegar el secreto generado en `JWT_SECRET=...` (guardar y salir con Ctrl+O, Enter, Ctrl+X).

- [ ] `JWT_SECRET` tiene un valor largo y aleatorio.
- [ ] Si no querés HTTPS, dejá `CERT_PASSPHRASE` vacío o borrá esa línea.

Reiniciar el servicio:

```bash
sudo systemctl restart musica
```

---

## ☑️ PASO 4 — MySQL (base de datos de usuarios)

> Las canciones y playlists siguen en `server/data/db.json`. Solo los usuarios viven en MySQL.

Instalar MySQL y crear la base + usuario de la app:

```bash
sudo apt update
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo mysql_secure_installation   # configurar root (o responder no a todo)
```

```bash
sudo mysql   # entra como root (auth_socket)
```

Dentro de MySQL:

```sql
CREATE DATABASE vybe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vybe'@'localhost' IDENTIFIED BY 'vybe2026';
CREATE USER 'vybe'@'127.0.0.1' IDENTIFIED BY 'vybe2026';
GRANT ALL PRIVILEGES ON vybe.* TO 'vybe'@'localhost';
GRANT ALL PRIVILEGES ON vybe.* TO 'vybe'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

Agregar al `server/.env`:

```bash
sudo nano /opt/musica/server/.env
```

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=vybe
DB_PASSWORD=vybe2026
DB_NAME=vybe
```

Migrar los usuarios que ya existían y reiniciar:

```bash
cd /opt/musica/server
node migrate-mysql.js
sudo systemctl restart musica
```

> MySQL en Ubuntu escucha solo en `127.0.0.1` por defecto (nadie externo accede). No abras el 3306 en el firewall.

---

## ☑️ PASO 5 — Verificar que funciona

En el Ubuntu:

```bash
# Estado del servicio (debe estar "active (running)"):
sudo systemctl status musica

# Ver logs (Ctrl+C para salir):
journalctl -u musica -f
```

En tu notebook o celular, abrir en el navegador:

```
http://IP_DEL_UBUNTU:48292
```

- [ ] Se ve la app y responde.
- [ ] Buscar una canción y reproducirla (debe sonar sin descargar nada).

---

## ☑️ PASO 6 — Configurar el celular (APK)

El APK se conecta al servidor usando la IP que está en `client/capacitor.config.ts`.

En tu notebook:

```bash
cd /home/rodrigo/Documents/musica/client
nano capacitor.config.ts   # cambiar url: 'http://IP_DEL_UBUNTU:48292'
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

- [ ] APK nuevo generado en `client/android/app/build/outputs/apk/debug/app-debug.apk`
- [ ] Instalar en el celular y probar.

> Si el celular está en la **misma red** que el Ubuntu, podés usar la IP local.
> Si es **remoto/internet**, usá la IP pública del Ubuntu y abrí el puerto en el router.

---

## ☑️ CAMBIAR CONTRASEÑA DE UN USUARIO (si se olvidó)

> No edites el hash a mano (ni desde Workbench/MySQL): la clave va con hash bcrypt y un texto plano no entra.

```bash
cd /opt/musica/server
node reset-password.js <usuario> <nueva-contrasena>
```

Ejemplo:

```bash
node reset-password.js test MiClaveNueva123
```

- [ ] Dice `Contraseña actualizada para test` → ya puede entrar con la clave nueva.
- [ ] Si dice `Usuario no encontrado: test` → revisá que el nombre esté bien.

---

## ☑️ COMANDOS ÚTILES (post-instalación)

| Acción                | Comando                              |
|-----------------------|--------------------------------------|
| Ver logs              | `sudo journalctl -u musica -f`       |
| Reiniciar servicio    | `sudo systemctl restart musica`      |
| Detener servicio      | `sudo systemctl stop musica`         |
| Iniciar servicio      | `sudo systemctl start musica`        |
| Arrancar con el equipo| `sudo systemctl enable musica` (ya hecho) |
| Actualizar yt-dlp     | `sudo yt-dlp -U`                     |
| Abrir puerto          | `sudo ufw allow 48292/tcp`           |

---

## ⚠️ PROBLEMAS COMUNES

| Problema                          | Solución                                      |
|-----------------------------------|-----------------------------------------------|
| La canción da error 500           | `sudo yt-dlp -U` (yt-dlp desactualizado)      |
| No conecta desde el celular       | Verificar IP, firewall y que el servicio esté `active` |
| Node muy viejo                    | El script instala 20 LTS; si no, `sudo apt install -y nodejs` |
| Error de MySQL (ECONNREFUSED)     | `sudo systemctl status mysql` y que esté `active`; revisar `DB_*` en el `.env` |
| "Usuario no encontrado" al reset  | `node reset-password.js` usa MySQL: la cuenta no existe o el nombre está mal escrito |
| Querés que corra siempre          | Ya lo hace (systemd). No cerrar el Ubuntu.    |
