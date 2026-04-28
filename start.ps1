#!/usr/bin/env pwsh
# Crystal Guardian - public game launcher

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Auto-elevate to admin so the script can patch the hosts file
# (needed on networks that filter trycloudflare.com DNS, e.g. university).
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Relancement en administrateur pour le patch DNS automatique..." -ForegroundColor Yellow
    $args = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process pwsh -Verb RunAs -ArgumentList $args
    exit
}

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
