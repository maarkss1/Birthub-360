@echo off
chcp 65001 >nul
title Birth Hub 360 - Servidor (porta 3005)
echo ============================================
echo   Iniciando servidor Birth Hub 360 na porta 3005
echo   Acesso local:  http://localhost:3005
echo   Acesso na rede (Wi-Fi/cabo): http://192.168.60.217:3005 ou http://192.168.0.179:3005
echo ============================================
echo.
echo NAO FECHE esta janela enquanto quiser o servidor ligado.
echo Para desligar, feche esta janela ou use "Parar-Servidor-BirthHub360.bat".
echo.
cd /d "%~dp0"
call npm run dev
pause
