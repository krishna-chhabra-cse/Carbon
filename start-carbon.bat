@echo off
title Carbon AI - Full Stack Launcher
color 0b
echo ========================================================
echo          Starting Project Carbon Full Stack
echo ========================================================
echo.
echo [1/3] Frontend:       http://localhost:5173
echo [2/3] Node Backend:   http://localhost:3002
echo [3/3] Agent Service:  http://127.0.0.1:8005
echo.
echo Launching all services with single-command supervisor...
echo.

cd /d "%~dp0"
npm run dev
pause
