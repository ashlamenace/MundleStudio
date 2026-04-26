#!/usr/bin/env pwsh
# Crystal Guardian - public game launcher

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "================================================" -ForegroundColor Green
Write-Host "   CRYSTAL GUARDIAN - HOST PUBLIC" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Demarrage du jeu, du serveur et du tunnel Cloudflare..." -ForegroundColor Yellow
Write-Host "Une ligne HOST_URL=... apparaitra des que la partie est prete." -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur CTRL+C pour arreter le serveur et le tunnel." -ForegroundColor Yellow
Write-Host ""

node "$root\scripts\host-online.js"
