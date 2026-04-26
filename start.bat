@echo off
title Crystal Guardian - Public Host
color 0A

echo ================================================
echo    CRYSTAL GUARDIAN - HOST PUBLIC
echo ================================================
echo.
echo Demarrage du jeu, du serveur et du tunnel Cloudflare...
echo Une ligne HOST_URL=... apparaitra des que la partie est prete.
echo.
echo Appuyez sur CTRL+C pour arreter le serveur et le tunnel.
echo.

node "%~dp0scripts\host-online.js"
