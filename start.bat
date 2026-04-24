@echo off
title Crystal Guardian - Local Server
color 0A

echo ================================================
echo    CRYSTAL GUARDIAN - SERVEUR LOCAL
echo ================================================
echo.
echo Demarrage du serveur Node...
echo URL locale : http://localhost:3000
echo WebSocket  : ws://localhost:3000/ws
echo.
echo Pour une URL Internet temporaire :
echo   npm run host:public
echo.
echo Appuyez sur CTRL+C pour arreter le serveur.
echo.

node "%~dp0server.js"
