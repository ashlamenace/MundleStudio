#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 3000);
const wsPath = process.env.WS_PATH || '/ws';
const tunnelOrigin = `http://127.0.0.1:${port}`;
const publicUrlRegex = /https:\/\/[-a-z0-9]+\.trycloudflare\.com/ig;

let shuttingDown = false;
let serverProcess = null;
let tunnelProcess = null;
let publicUrlFound = false;

function findCloudflared() {
    const envPath = process.env.CLOUDFLARED_BIN;
    if (envPath && fs.existsSync(envPath)) return envPath;

    const lookup = process.platform === 'win32' ? 'where' : 'which';
    const discovered = spawnSync(lookup, ['cloudflared'], { encoding: 'utf8' });
    if (discovered.status === 0) {
        const first = discovered.stdout.split(/\r?\n/).map(line => line.trim()).find(Boolean);
        if (first) return first;
    }

    if (process.platform === 'win32') {
        const candidates = [
            path.join(process.env.ProgramFiles || '', 'cloudflared', 'cloudflared.exe'),
            path.join(process.env['ProgramFiles(x86)'] || '', 'cloudflared', 'cloudflared.exe'),
            path.join(process.env.LOCALAPPDATA || '', 'Cloudflare', 'cloudflared', 'cloudflared.exe')
        ].filter(Boolean);

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }
    }

    return null;
}

function waitForHttpReady(timeoutMs = 15000) {
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
        const probe = () => {
            const req = http.get(`${tunnelOrigin}/index.html`, (res) => {
                res.resume();
                if (res.statusCode && res.statusCode < 500) {
                    resolve();
                    return;
                }
                retry(new Error(`HTTP ${res.statusCode}`));
            });

            req.on('error', retry);
            req.setTimeout(2500, () => req.destroy(new Error('timeout')));
        };

        const retry = (err) => {
            if (Date.now() - startedAt >= timeoutMs) {
                reject(new Error(`Le serveur local ne repond pas sur ${tunnelOrigin} (${err.message}).`));
                return;
            }
            setTimeout(probe, 350);
        };

        probe();
    });
}

function prefixStream(stream, prefix) {
    stream.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
            if (!line) continue;
            console.log(`${prefix}${line}`);
        }
    });
}

function attachTunnelUrlReporter(stream) {
    stream.on('data', (chunk) => {
        const text = chunk.toString();
        let match;
        while ((match = publicUrlRegex.exec(text)) !== null) {
            if (publicUrlFound) continue;
            publicUrlFound = true;
            console.log('');
            console.log('================================================');
            console.log('PARTIE PUBLIQUE PRETE');
            console.log('================================================');
            console.log(`URL a partager : ${match[0]}`);
            console.log(`WebSocket       : ${match[0].replace(/^https/, 'wss')}${wsPath}`);
            console.log('');
            console.log('Tes amis doivent ouvrir l URL dans leur navigateur.');
            console.log('Dans le lobby, laisse le champ "Serveur" sur sa valeur par defaut.');
            console.log('Ferme cette fenetre pour couper le serveur et le tunnel.');
            console.log('================================================');
            console.log('');
        }
        publicUrlRegex.lastIndex = 0;
    });
}

async function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;

    for (const child of [tunnelProcess, serverProcess]) {
        if (child && !child.killed) {
            child.kill('SIGTERM');
        }
    }

    setTimeout(() => {
        for (const child of [tunnelProcess, serverProcess]) {
            if (child && !child.killed) {
                child.kill('SIGKILL');
            }
        }
        process.exit(code);
    }, 1500).unref();
}

async function main() {
    const cloudflaredBin = findCloudflared();
    if (!cloudflaredBin) {
        console.error('cloudflared est introuvable.');
        console.error('Installe-le puis relance ce script.');
        console.error('Documentation officielle : https://developers.cloudflare.com/tunnel/');
        process.exit(1);
    }

    console.log('================================================');
    console.log('CRYSTAL GUARDIAN - HOST PUBLIC TEMPORAIRE');
    console.log('================================================');
    console.log(`Serveur local : ${tunnelOrigin}`);
    console.log(`WebSocket     : ws://127.0.0.1:${port}${wsPath}`);
    console.log(`Tunnel        : ${cloudflaredBin}`);
    console.log('');

    serverProcess = spawn(process.execPath, [path.join(rootDir, 'server.js')], {
        cwd: rootDir,
        env: { ...process.env, PORT: String(port), WS_PATH: wsPath },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    prefixStream(serverProcess.stdout, '[server] ');
    prefixStream(serverProcess.stderr, '[server] ');

    serverProcess.on('exit', (code) => {
        if (!shuttingDown) {
            console.error(`Le serveur local s'est arrete (code ${code ?? 'null'}).`);
            shutdown(1);
        }
    });

    await waitForHttpReady();

    console.log('Tunnel Cloudflare en cours de creation...');
    tunnelProcess = spawn(cloudflaredBin, ['tunnel', '--url', tunnelOrigin], {
        cwd: rootDir,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    prefixStream(tunnelProcess.stdout, '[cloudflared] ');
    prefixStream(tunnelProcess.stderr, '[cloudflared] ');
    attachTunnelUrlReporter(tunnelProcess.stdout);
    attachTunnelUrlReporter(tunnelProcess.stderr);

    tunnelProcess.on('exit', (code) => {
        if (!shuttingDown) {
            console.error(`cloudflared s'est arrete (code ${code ?? 'null'}).`);
            shutdown(1);
        }
    });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
    shuttingDown = true;
});

main().catch((err) => {
    console.error(err.message || err);
    shutdown(1);
});
