@echo off
chcp 65001 >nul 2>nul
setlocal
set "DSHCLI=D:\app\dsh\resources\runtime\cli\bin\dsh.cmd"
if not exist "%DSHCLI%" set "DSHCLI=dsh"

echo ============================================================
echo  dsh-startup-cinematic install
echo ============================================================
echo.
echo  Please fully quit DeepSeek Harness Desktop before running this.
echo  If dsh-startup-screen is installed, remove it first:
echo    dsh plugin --profile desktop remove dsh-startup-screen
echo.

set "TGZ="
for %%f in ("%~dp0dsh-startup-cinematic-*.tgz") do if exist "%%~ff" set "TGZ=%%~ff"

if defined TGZ (
  echo Installing from "%TGZ%" ...
  call "%DSHCLI%" plugin --profile desktop add "%TGZ%"
) else (
  echo No release tgz found; trying a link install from this folder...
  call "%DSHCLI%" plugin --profile desktop add "link:%~dp0"
)
if errorlevel 1 (
  echo.
  echo [!] Install failed. Make sure Desktop is fully closed and the DSH CLI path is correct.
  echo     Manual command:
  echo     dsh plugin --profile desktop add "%~dp0dsh-startup-cinematic-1.0.0.tgz"
  pause
  exit /b 1
)

echo.
echo Installed. Reopen DeepSeek Harness Desktop, then open Settings -> Startup Animation.
echo.
pause
