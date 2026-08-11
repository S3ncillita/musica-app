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

function Ensure-SecureConfig {
  $ErrorActionPreference = 'Continue'
  $ini = Join-Path $script:MySQLBase 'my.ini'
  $wanted = @"
[mysqld]
basedir=$($script:MySQLBase -replace '\\','/')
datadir=$($script:MySQLBase -replace '\\','/')/data
port=3306
bind-address=127.0.0.1
mysqlx=0
"@
  $needs = $true
  if (Test-Path $ini) {
    $cur = Get-Content $ini -Raw
    if ($cur -match 'bind-address\s*=\s*127\.0\.0\.1' -and $cur -match 'mysqlx\s*=\s*0' -and $cur -match '^\[mysqld\]') { $needs = $false }
  }
  if ($needs -and (Test-Path $script:MySQLBase)) {
    Set-Content $ini $wanted -Encoding ascii
    Write-Host 'MySQL: aplicando config segura (escucha solo en 127.0.0.1)'
    $svc = @(Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
      Where-Object { $_.PathName -like "*$($script:MySQLBase)*" }) | Select-Object -First 1
    if ($svc) {
      & sc.exe stop $svc.Name | Out-Null
      Start-Sleep -Seconds 3
      & sc.exe start $svc.Name | Out-Null
      Start-Sleep -Seconds 2
    }
    return $true
  }
  return $false
}

function Ensure-MySQL {
  $ErrorActionPreference = 'Continue'
  $ProgressPreference = 'SilentlyContinue'
  $ourBase = 'C:\mysql\mysql-8.0.29-winx64'
  $script:MySQLBase = $ourBase
  $marker = 'C:\mysql\vybe.mysql-ready'

  # 1) Parar y desactivar servidores mysql ajenos (ej: XAMPP) que ocupen el 3306
  $all = @(Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^(mysql|MySQL|MySQL80|MariaDB)$' })
  $foreign = @($all | Where-Object { $_.PathName -notlike "*$ourBase*" })
  foreach ($s in $foreign) {
    if ($s.State -eq 'Running') {
      Write-Host ("MySQL: deteniendo servicio conflictivo '{0}'" -f $s.Name)
      & sc.exe stop $s.Name | Out-Null
      Start-Sleep -Seconds 2
    }
    if ($s.StartMode -ne 'Disabled') {
      & sc.exe config $s.Name start= disabled | Out-Null
    }
  }

  # 2) Instalar MySQL si no esta
  if (-not (Test-Path (Join-Path $ourBase 'bin\mysqld.exe'))) {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
      Write-Host 'MySQL: no instalado y sin admin. Recrear la tarea con /RL HIGHEST.'
      return 'no-admin'
    }

    $lock = Join-Path $env:TEMP 'vybe-mysql-install.lock'
    if (Test-Path $lock) {
      $age = (Get-Date) - (Get-Item $lock).LastWriteTime
      if ($age.TotalMinutes -lt 30) { return 'locked' }
    }
    Set-Content $lock 'installing' -Encoding utf8

    try {
      $version = '8.0.29'
      $mysqld = Join-Path $ourBase 'bin\mysqld.exe'
      $url = "https://repo.huaweicloud.com/mysql/Downloads/MySQL-8.0/mysql-$version-winx64.zip"
      $zip = Join-Path $env:TEMP 'mysql-winx64.zip'
      $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      Write-Host "MySQL: descargando $url"
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -UserAgent $ua | Out-Null
      Expand-Archive -Path $zip -DestinationPath 'C:\mysql' -Force | Out-Null
      if (-not (Test-Path (Join-Path $ourBase 'data'))) {
        Write-Host 'MySQL: inicializando datadir'
        & $mysqld --initialize-insecure | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'mysqld --initialize-insecure fallo' }
      }
      Write-Host 'MySQL: registrando servicio'
      & $mysqld --install MySQL | Out-Null
      if ($LASTEXITCODE -ne 0) { throw 'mysqld --install fallo' }
    }
    catch {
      Write-Host ("MySQL: error de instalacion - {0}" -f $_.Exception.Message)
      Remove-Item $lock -ErrorAction SilentlyContinue
      return 'error'
    }
    Remove-Item $lock -ErrorAction SilentlyContinue
  }

  # 3) Config segura (escucha solo en 127.0.0.1)
  $null = Ensure-SecureConfig

  # 4) Asegurar que NUESTRO MySQL este corriendo
  $oursSvc = @(Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
    Where-Object { $_.PathName -like "*$ourBase*" }) | Select-Object -First 1
  if (-not $oursSvc) {
    Write-Host 'MySQL: no quedo el servicio registrado'
    return 'error'
  }
  if ($oursSvc.State -ne 'Running') {
    Write-Host 'MySQL: iniciando servicio'
    & sc.exe start $oursSvc.Name | Out-Null
    Start-Sleep -Seconds 3
    $oursSvc = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq $oursSvc.Name } | Select-Object -First 1
    if (-not $oursSvc -or $oursSvc.State -ne 'Running') {
      Write-Host 'MySQL: el servicio no quedo corriendo'
      return 'error'
    }
  }

  if (Test-Path $marker) { return 'ok' }

  if (Configure-MySQL) {
    Set-Content $marker 'ok' -Encoding utf8
    return 'installed'
  }
  return 'error'
}
