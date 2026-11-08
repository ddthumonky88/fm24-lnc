@echo off
cd /d "%~dp0"

if not exist "node_modules" (
    echo [INFO] Thu muc node_modules chua ton tai. Dang cai dat dependencies...
    if exist "yarn.lock" (
        call yarn install
    ) else (
        call npm install
    )
    echo.
)

echo Starting FM24 LNC Next.js Frontend...
echo URL: http://localhost:3002
echo.
if exist "yarn.lock" (
    call yarn dev
) else (
    call npm run dev
)
pause
