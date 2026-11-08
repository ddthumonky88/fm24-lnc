@echo off
cd /d "%~dp0"
echo Starting FM24 LNC System (Backend Java + Frontend Next.js)...

start "FM24 LNC Backend (Java :3001)" cmd /c "cd /d %~dp0fm24-lnc-be && run-local.bat"
start "FM24 LNC Frontend (Next.js :3002)" cmd /c "cd /d %~dp0fm24-lnc-fe && run-local.bat"

echo.
echo Both servers launched in separate windows:
echo   - Backend:  http://localhost:3001 (Swagger: http://localhost:3001/docs)
echo   - Frontend: http://localhost:3002
echo.

