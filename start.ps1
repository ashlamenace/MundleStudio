#!/usr/bin/env pwsh
# Crystal Guardian - Local server launcher

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "================================================" -ForegroundColor Green
Write-Host "   CRYSTAL GUARDIAN - SERVEUR LOCAL" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Demarrage du serveur Node..." -ForegroundColor Yellow
Write-Host "URL locale : http://localhost:3000" -ForegroundColor Cyan
Write-Host "WebSocket  : ws://localhost:3000/ws" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour une URL Internet temporaire :" -ForegroundColor White
Write-Host "  npm run host:public" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur CTRL+C pour arreter le serveur." -ForegroundColor Yellow
Write-Host ""

node "$root\server.js"
