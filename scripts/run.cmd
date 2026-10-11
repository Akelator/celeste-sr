@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
if errorlevel 1 (
  echo.
  echo No se ha podido completar el arranque. Revisa el error anterior.
  pause
  exit /b 1
)
exit /b 0
