@echo off
title BekalGo Server (Localhost:8080)
echo ========================================================
echo   Menjalankan Local Server BekalGo di Port 8080...
echo   Buka browser pada: http://localhost:8080
echo ========================================================
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
pause
