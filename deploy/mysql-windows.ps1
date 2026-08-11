# Vybe - provisiona MySQL Server en Windows (instala si falta y configura la DB).
# Se usa desde setup-windows.ps1 y deploy-windows.ps1. Idempotente y no fatal para el deploy.
# Requiere permisos de admin SOLO si hay que instalar el servicio.
$script:MySQLBase = $null

function Find-MySqlClient {
  $cands = @()
  if ($script:MySQLBase) {
    $c = Join-Path $script:MySQLBase 'bin\mysql.exe'
    if (Test-Path $c) { $cands += $c }
  }
  $dir = 'C:\Program Files\MySQL'
  if (Test-Path $dir) {
    Get-ChildItem $dir -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like 'MySQL Server *' } |
      ForEach-Object {
        $c = Join-Path $_.FullName 'bin\mysql.exe'
        if (Test-Path $c) { $cands += $c }
      }
  }
  if ($cands.Count -gt 0) { return $cands[0] }
  return $null
}

function Configure-MySQL {
  $ErrorActionPreference = 'Continue'
  $cli = Find-MySqlClient
  if (-not $cli) {
    Write-Output 'MySQL: no se encontro el cliente mysql.exe, config manual requerida'
    return $false
  }

  Write-Output 'MySQL: configurando root y creando DB vybe + usuario vybe'
  & $cli -u root --protocol=tcp -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'root123'"
  & $cli -u root -proot123 --protocol=tcp -e "CREATE DATABASE IF NOT EXISTS vybe; CREATE USER IF NOT EXISTS 'vybe'@'localhost' IDENTIFIED BY 'vybe2026'; CREATE USER IF NOT EXISTS 'vybe'@'127.0.0.1' IDENTIFIED BY 'vybe2026'; GRANT ALL PRIVILEGES ON vybe.* TO 'vybe'@'localhost'; GRANT ALL PRIVILEGES ON vybe.* TO 'vybe'@'127.0.0.1'; FLUSH PRIVILEGES;"
  if ($LASTEXITCODE -ne 0) {
    Write-Output 'MySQL: fallo al crear el usuario vybe'
    return $false
  }

  $envPath = 'C:\musica\server\.env'
  if (Test-Path $envPath) {
    $has = Select-String -Path $envPath -Pattern '^DB_HOST=' -Quiet
    if (-not $has) {
      Add-Content $envPath @'
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=vybe
DB_PASSWORD=vybe2026
DB_NAME=vybe
'@ -Encoding utf8
    }
  }

  Push-Location 'C:\musica\server'
  node migrate-mysql.js
  Pop-Location

  pm2 restart musica *> $null
  Write-Output 'MySQL: configurado y listo'
  return $true
}

function Ensure-MySQL {
  $ErrorActionPreference = 'Continue'
  $marker = 'C:\mysql\vybe.mysql-ready'
  if (Test-Path $marker) { return 'ok' }

  $svc = Get-Service -Name 'MySQL*' -ErrorAction SilentlyContinue
  if (-not $svc) {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
      Write-Output 'MySQL: no instalado y sin admin. Recrear la tarea con /RL HIGHEST.'
      return 'no-admin'
    }

    $lock = Join-Path $env:TEMP 'vybe-mysql-install.lock'
    if (Test-Path $lock) {
      $age = (Get-Date) - (Get-Item $lock).LastWriteTime
      if ($age.TotalMinutes -lt 30) { return 'locked' }
    }
    Set-Content $lock 'installing' -Encoding utf8

    try {
      $version = '8.0.41'
      $script:MySQLBase = "C:\mysql\mysql-$version-winx64"
      $mysqld = Join-Path $script:MySQLBase 'bin\mysqld.exe'
      if (-not (Test-Path $mysqld)) {
        $url = "https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-$version-winx64.zip"
        $zip = Join-Path $env:TEMP 'mysql-winx64.zip'
        Write-Output "MySQL: descargando $url"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath 'C:\mysql' -Force
      }
      if (-not (Test-Path (Join-Path $script:MySQLBase 'data'))) {
        Write-Output 'MySQL: inicializando datadir'
        & $mysqld --initialize-insecure
        if ($LASTEXITCODE -ne 0) { throw 'mysqld --initialize-insecure fallo' }
      }
      Write-Output 'MySQL: registrando servicio'
      & $mysqld --install MySQL
      if ($LASTEXITCODE -ne 0) { throw 'mysqld --install fallo' }
    }
    catch {
      Write-Output ("MySQL: error de instalacion - {0}" -f $_.Exception.Message)
      Remove-Item $lock -ErrorAction SilentlyContinue
      return 'error'
    }
    Remove-Item $lock -ErrorAction SilentlyContinue
    $svc = Get-Service -Name 'MySQL*' -ErrorAction SilentlyContinue
  }

  if (-not $svc) {
    Write-Output 'MySQL: el servicio no quedo registrado'
    return 'error'
  }
  if ($svc.Status -ne 'Running') {
    Write-Output 'MySQL: iniciando servicio'
    Start-Service $svc.Name -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
  }

  if (Configure-MySQL) {
    Set-Content $marker 'ok' -Encoding utf8
    return 'installed'
  }
  return 'error'
}
