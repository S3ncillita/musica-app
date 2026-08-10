#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  Música - Instalación automática en Ubuntu Server
#  Uso:
#    bash install-ubuntu.sh                (desde la carpeta del proyecto)
#    bash install-ubuntu.sh /ruta/al/proyecto
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${1:-$SCRIPT_DIR}"
SERVER_DIR="$PROJECT_DIR/server"
CLIENT_DIR="$PROJECT_DIR/client"
PORT_HTTP="${PORT_HTTP:-48292}"
PORT_HTTPS="${PORT_HTTPS:-48291}"

if [ ! -f "$SERVER_DIR/package.json" ] || [ ! -f "$CLIENT_DIR/package.json" ]; then
  echo "ERROR: No se encontró server/ y client/ en $PROJECT_DIR" >&2
  exit 1
fi

echo "==========================================="
echo "  Música - Instalación en Ubuntu Server"
echo "  Proyecto: $PROJECT_DIR"
echo "==========================================="

echo
echo "[1/6] Verificando Node.js..."
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v)
  echo "  Node ya instalado: $NODE_VER"
else
  echo "  Instalando Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get update
  sudo apt-get install -y nodejs
fi
if ! node -e "const [maj]=process.version.slice(1).split('.'); if(+maj<18) process.exit(1)" 2>/dev/null; then
  echo "ERROR: Se necesita Node.js 18+ (tenés $(node -v))" >&2
  exit 1
fi

echo
echo "[2/6] Instalando/actualizando yt-dlp..."
if command -v yt-dlp >/dev/null 2>&1; then
  echo "  yt-dlp ya existe, actualizando..."
  sudo yt-dlp -U >/dev/null 2>&1 || true
else
  sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
  sudo chmod +x /usr/local/bin/yt-dlp
fi
yt-dlp --version

echo
echo "[3/6] Instalando dependencias del server..."
cd "$SERVER_DIR"
npm install --no-audit --no-fund

echo
echo "[4/6] Instalando dependencias y compilando el client..."
cd "$CLIENT_DIR"
npm install --no-audit --no-fund
npm run build

echo
echo "[5/6] Variables de entorno (.env)..."
if [ ! -f "$SERVER_DIR/.env" ]; then
  cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
  echo "  .env creado desde .env.example"
  echo "  ⚠ IMPORTANTE: editá $SERVER_DIR/.env y poné un JWT_SECRET propio."
  echo "    (generalo con: openssl rand -hex 32)"
else
  echo "  .env ya existe, se respeta."
fi

echo
echo "[6/6] Servicio systemd + firewall..."
sudo tee /etc/systemd/system/musica.service >/dev/null <<EOF
[Unit]
Description=Música server
After=network.target

[Service]
WorkingDirectory=$SERVER_DIR
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable musica
sudo systemctl restart musica

sudo ufw allow OpenSSH >/dev/null 2>&1 || true
sudo ufw allow "$PORT_HTTP/tcp" >/dev/null 2>&1 || true
sudo ufw allow "$PORT_HTTPS/tcp" >/dev/null 2>&1 || true
sudo ufw --force enable >/dev/null 2>&1 || true

echo
echo "==========================================="
echo "  Instalación completada ✅"
echo "==========================================="
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "  Estado del servicio:"
sudo systemctl status musica --no-pager -l | head -6
echo
echo "  La app corre en:"
echo "    http://${IP:-<IP-de-este-server>}:$PORT_HTTP"
echo
echo "  Para el celular, en client/capacitor.config.ts"
echo "  poné server.url = 'http://${IP:-<IP>}:$PORT_HTTP'"
echo "  y recompilá el APK (npm run build && npx cap sync android)."
echo
echo "  Ver logs:    journalctl -u musica -f"
echo "  Reiniciar:   sudo systemctl restart musica"
echo "  Detener:     sudo systemctl stop musica"
echo "==========================================="
