# Vybe - setup unico en Windows para la NUC (ejecutar UNA vez como Administrador).
# Requisitos previos: Node.js LTS y Git for Windows instalados, y el repo clonado en C:\musica.
$ErrorActionPreference = 'Stop'
$repo = 'C:\musica'
$serverDir = Join-Path $repo 'server'
$clientDir = Join-Path $repo 'client'

if (-not (Test-Path (Join-Path $serverDir 'package.json'))) {
  throw 'No se encontro C:\musica\server. Clona primero: git clone https://github.com/S3ncillita/musica-app.git C:\musica'
}
if (-not (Test-Path (Join-Path $clientDir 'package.json'))) { throw 'No se encontro C:\musica\client' }

Write-Host '== Verificando Node y Git =='
node -v
git --version

Write-Host '== 1/8 yt-dlp (en System32 para que el server lo encuentre) =='
if (-not (Test-Path "$env:WINDIR\System32\yt-dlp.exe")) {
  Write-Host '  Descargando yt-dlp.exe...'
  Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile "$env:WINDIR\System32\yt-dlp.exe"
} else {
  Write-Host '  yt-dlp ya esta.'
}

Write-Host '== 2/8 pm2 (gestor de procesos + arranque con Windows) =='
npm install -g pm2 pm2-windows-startup --no-audit --no-fund

Write-Host '== 3/8 dependencias y build del client =='
Push-Location $serverDir
npm install --no-audit --no-fund
Pop-Location

Push-Location $clientDir
npm install --no-audit --no-fund
npm run build
Pop-Location

Write-Host '== 4/8 .env (JWT secreto + puerto 48292) =='
$envPath = Join-Path $serverDir '.env'
if (-not (Test-Path $envPath)) {
  $secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  @('JWT_SECRET=' + $secret, 'PORT=48292') | Set-Content $envPath -Encoding utf8
  Write-Host "  .env creado en $envPath"
} else {
  Write-Host '  .env ya existe, se respeta.'
}

Write-Host '== 5/8 registrar el server en pm2 + arranque con Windows =='
Push-Location $serverDir
pm2 start src/index.js --name musica
pm2 save
Pop-Location
pm2-startup install

Write-Host '== 6/8 firewall (puerto 48292) =='
netsh advfirewall firewall add rule name="Vybe 48292" dir=in action=allow protocol=TCP localport=48292 | Out-Null

Write-Host '== 7/8 auto-deploy cada 2 min (Task Scheduler) =='
schtasks /Create /F /TN "musica-deploy" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\musica\deploy\deploy-windows.ps1" /SC MINUTE /MO 2 | Out-Null

Write-Host '== 8/8 deploy inicial =='
& (Join-Path $PSScriptRoot 'deploy-windows.ps1')

Write-Host ''
pm2 status
Write-Host ''
Write-Host 'Setup completo. La app corre en http://IP_DE_LA_NUC:48292'
Write-Host 'Ver logs:  pm2 logs musica'
