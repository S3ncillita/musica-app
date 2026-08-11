# Vybe - auto-deploy en Windows (corre cada 2 min via Task Scheduler)
# Trae los cambios de master, si hay nuevos rebuilda y reinicia el server (pm2).
$ErrorActionPreference = 'Continue'
$repo = 'C:\musica'
$state = Join-Path $env:TEMP 'musica_last_deploy'

Set-Location $repo

# MySQL: si falta el servicio y hay admin, se instala/configura solo (no bloquea el deploy).
. (Join-Path $PSScriptRoot 'mysql-windows.ps1')
Ensure-MySQL | Out-Null

git fetch origin master *> $null
if ($LASTEXITCODE -ne 0) { exit 0 }
git pull --ff-only origin master *> $null
if ($LASTEXITCODE -ne 0) { exit 0 }

$head = (git rev-parse HEAD).Trim()
$last = ''
if (Test-Path $state) { $last = (Get-Content $state -Raw).Trim() }
$depsOk = (Test-Path (Join-Path $repo 'server\node_modules')) -and (Test-Path (Join-Path $repo 'client\node_modules'))
if ($head -eq $last -and $depsOk) { exit 0 }

# Dependencias: con commits nuevos (o si falta node_modules)
Write-Output 'Instalando dependencias (server)...'
Push-Location (Join-Path $repo 'server')
npm install --no-audit --no-fund *> $null
if ($LASTEXITCODE -ne 0) { throw 'npm install del server fallo' }
Pop-Location

Write-Output 'Instalando dependencias (client)...'
Push-Location (Join-Path $repo 'client')
npm install --no-audit --no-fund *> $null
if ($LASTEXITCODE -ne 0) { throw 'npm install del client fallo' }
npm run build *> $null
if ($LASTEXITCODE -ne 0) { throw 'El build falló' }
Pop-Location

pm2 restart musica *> $null
if ($LASTEXITCODE -ne 0) { throw 'El restart de pm2 falló' }

Set-Content $state $head
Write-Output ("[{0}] Deploy a {1}" -f (Get-Date), $head)
