@echo off
echo Iniciando Musica...

REM Buscar ffmpeg en WinGet
for /d %%i in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*") do (
    set "PATH=%%i\ffmpeg-9.0-full_build\bin;%PATH%"
)

REM Buscar Python y yt-dlp en todas las ubicaciones
for /d %%v in ("%APPDATA%\Python\*") do (
    if exist "%%v\Scripts" set "PATH=%%v\Scripts;%PATH%"
    if exist "%%v" set "PATH=%%v;%PATH%"
)
for /d %%v in ("%LOCALAPPDATA%\Programs\Python\*") do (
    if exist "%%v\Scripts" set "PATH=%%v\Scripts;%PATH%"
    if exist "%%v" set "PATH=%%v;%PATH%"
)
REM Microsoft Store Python
for /d %%p in ("%LOCALAPPDATA%\Packages\PythonSoftwareFoundation*") do (
    for /d %%c in ("%%p\LocalCache\local-packages\Python*") do (
        if exist "%%c\Scripts" set "PATH=%%c\Scripts;%PATH%"
    )
    for /d %%r in ("%%p\LocalState") do (
        if exist "%%r" set "PATH=%%r;%PATH%"
    )
)

cd /d "%~dp0server"
node src/index.js
