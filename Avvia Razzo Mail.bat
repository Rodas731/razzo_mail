@echo off
title Razzo Mail - Avvio Applicazione
cd /d "%~dp0"

echo ==============================================
echo       AVVIO DI RAZZO MAIL APP
echo ==============================================
echo.
echo Avvio del server in corso...
if exist "target\release\razzo_mail.exe" (
    start "" "target\release\razzo_mail.exe"
) else (
    start "" "target\debug\razzo_mail.exe"
)

exit
