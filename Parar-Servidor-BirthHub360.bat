@echo off
chcp 65001 >nul
title Birth Hub 360 - Parar servidor
echo Procurando processo na porta 3024...
echo.

set FOUND=0
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3024" ^| findstr "LISTENING"') do (
    echo Encerrando processo PID %%P...
    taskkill /F /PID %%P
    set FOUND=1
)

if "%FOUND%"=="0" (
    echo Nenhum servidor rodando na porta 3024.
) else (
    echo.
    echo Servidor encerrado.
)

echo.
pause
