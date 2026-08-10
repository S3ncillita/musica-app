@echo off
echo ========================================
echo   Musica - Setup automatico
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] Instalando dependencias del servidor...
cd server
call npm install
cd ..
echo.

echo [2/6] Instalando dependencias del cliente...
cd client
call npm install
echo.

echo [3/6] Build del cliente...
call npm run build
cd ..
echo.

echo [4/6] Verificando yt-dlp...
where yt-dlp >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando yt-dlp...
    pip install yt-dlp
) else (
    echo yt-dlp ya instalado
)
echo.

echo [5/6] Verificando ffmpeg...
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando ffmpeg...
    winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
) else (
    echo ffmpeg ya instalado
)
echo.

echo [6/6] Creando carpeta de audio temporal...
if not exist "server\temp_audio" mkdir "server\temp_audio"
echo.

echo ========================================
echo   Setup completado!
echo ========================================
echo.
echo IMPORTANTE: Cerrar y volver a abrir la consola
echo para que ffmpeg y yt-dlp esten en el PATH.
echo.
echo Despues ejecuta: start.bat
echo.
pause
