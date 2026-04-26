#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const dns = require('dns');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const hostingDir = path.join(rootDir, '.codex-hosting');
const port = Number(process.env.PORT || 3000);
const wsPath = process.env.WS_PATH || '/ws';
const tunnelOrigin = `http://127.0.0.1:${port}`;
const publicUrlRegex = /https:\/\/[-a-z0-9]+\.trycloudflare\.com/ig;
const shouldOpenBrowser = process.env.OPEN_BROWSER !== '0';
const publicReadyTimeoutMs = Number(process.env.PUBLIC_READY_TIMEOUT_MS || 120000);
const forceCloudflaredDownload = process.env.CLOUDFLARED_FORCE_DOWNLOAD === '1';
const bundledCloudflared = process.platform === 'win32'
    ? path.join(hostingDir, 'cloudflared.exe')
    : path.join(hostingDir, 'cloudflared');
const bundledCloudflaredMarker = path.join(hostingDir, 'cloudflared-source.txt');
const windowsCloudflaredUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';

let shuttingDown = false;
let serverProcess = null;
let tunnelProcess = null;
let publicUrlFound = false;

function findCloudflared() {
    const envPath = process.env.CLOUDFLARED_BIN;
    if (envPath && fs.existsSync(envPath)) return envPath;

    if (fs.existsSync(bundledCloudflared)) return bundledCloudflared;

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

function findSystemCloudflared() {
    const envPath = process.env.CLOUDFLARED_BIN;
    if (envPath && fs.existsSync(envPath)) return envPath;

    const lookup = process.platform === 'win32' ? 'where' : 'which';
    const discovered = spawnSync(lookup, ['cloudflared'], { encoding: 'utf8' });
    if (discovered.status === 0) {
        return discovered.stdout.split(/\r?\n/).map(line => line.trim()).find(Boolean) || null;
    }

    return null;
}

function downloadFile(url, destination, redirectsLeft = 5) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                res.resume();
                if (redirectsLeft <= 0) {
                    reject(new Error('Trop de redirections pendant le telechargement de cloudflared.'));
                    return;
                }
                resolve(downloadFile(new URL(res.headers.location, url).toString(), destination, redirectsLeft - 1));
                return;
            }

            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`Telechargement cloudflared impossible (HTTP ${res.statusCode}).`));
                return;
            }

            fs.mkdirSync(path.dirname(destination), { recursive: true });
            const file = fs.createWriteStream(destination);
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
            file.on('error', reject);
        });

        req.on('error', reject);
        req.setTimeout(30000, () => req.destroy(new Error('Timeout pendant le telechargement de cloudflared.')));
    });
}

async function ensureCloudflared() {
    const envPath = process.env.CLOUDFLARED_BIN;
    if (envPath && fs.existsSync(envPath)) return envPath;

    if (process.platform === 'win32') {
        if (!fs.existsSync(bundledCloudflared) || !fs.existsSync(bundledCloudflaredMarker) || forceCloudflaredDownload) {
            console.log('Installation locale de cloudflared...');
            await downloadFile(windowsCloudflaredUrl, bundledCloudflared);
            fs.writeFileSync(bundledCloudflaredMarker, `${windowsCloudflaredUrl}\n${new Date().toISOString()}\n`);
        }
        return bundledCloudflared;
    }

    return findCloudflared();
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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveHostname(hostname) {
    return new Promise((resolve, reject) => {
        // Try system DNS first; fall back to 8.8.8.8 if it fails.
        dns.lookup(hostname, (err, address) => {
            if (!err) { resolve(address); return; }
            const resolver = new dns.Resolver();
            resolver.setServers(['8.8.8.8', '1.1.1.1']);
            resolver.resolve4(hostname, (err2, addrs) => {
                if (err2) reject(err2);
                else resolve(addrs[0]);
            });
        });
    });
}

function probePublicUrl(url) {
    return new Promise((resolve, reject) => {
        const target = new URL('/index.html', url);
        const options = {
            hostname: target.hostname,
            path: target.pathname,
            port: 443,
            // Override DNS lookup so HTTPS + TLS still use the correct hostname for SNI/cert check.
            lookup: (hostname, _opts, cb) => {
                resolveHostname(hostname)
                    .then((ip) => cb(null, ip, 4))
                    .catch(cb);
            }
        };
        const req = https.get(options, (res) => {
            res.resume();
            if (res.statusCode && res.statusCode < 500) {
                resolve();
                return;
            }
            reject(new Error(`HTTP ${res.statusCode}`));
        });

        req.on('error', reject);
        req.setTimeout(8000, () => req.destroy(new Error('timeout')));
    });
}

function resolveWithNslookup(hostname) {
    if (process.platform !== 'win32') return null;

    const result = spawnSync('nslookup', [hostname], { encoding: 'utf8', timeout: 5000 });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;

    if (result.status !== 0 || /NXDOMAIN|Non-existent domain|can't find|n'existe pas/i.test(output)) {
        throw new Error(output.trim().split(/\r?\n/).filter(Boolean).slice(-3).join(' | ') || 'nslookup a echoue');
    }

    return output;
}

async function waitForPublicReady(url, timeoutMs = publicReadyTimeoutMs) {
    const startedAt = Date.now();
    let lastMessage = '';

    while (Date.now() - startedAt < timeoutMs) {
        try {
            await probePublicUrl(url);
            return;
        } catch (err) {
            lastMessage = err.message || String(err);
            await sleep(500);
        }
    }

    throw new Error(`L URL publique ne repond pas encore (${lastMessage}).`);
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

function attachTunnelUrlReporter(stream, localReadyPromise) {
    stream.on('data', (chunk) => {
        const text = chunk.toString();
        let match;
        while ((match = publicUrlRegex.exec(text)) !== null) {
            if (publicUrlFound) continue;
            publicUrlFound = true;
            const publicUrl = match[0];
            reportPublicUrlWhenReady(publicUrl, localReadyPromise).catch((err) => {
                console.error('');
                console.error('================================================');
                console.error('URL PUBLIQUE DETECTEE MAIS PAS ENCORE ACCESSIBLE');
                console.error('================================================');
                console.error(`URL candidate : ${publicUrl}`);
                console.error(err.message || err);
                console.error('Relance le script si Cloudflare ne termine pas la propagation.');
                console.error('================================================');
                console.error('');
            });
        }
        publicUrlRegex.lastIndex = 0;
    });
}

async function reportPublicUrlWhenReady(publicUrl, localReadyPromise) {
    await localReadyPromise;

    console.log('');
    console.log('================================================');
    console.log('TUNNEL CLOUDFLARE ACTIF');
    console.log('================================================');
    console.log(`HOST_URL=${publicUrl}`);
    console.log('');
    console.log(`URL a partager : ${publicUrl}`);
    console.log(`WebSocket       : ${publicUrl.replace(/^https/, 'wss')}${wsPath}`);
    console.log('');
    console.log('Tes amis ouvrent l URL ci-dessus dans leur navigateur.');
    console.log('Si Cloudflare affiche un avertissement, il faut cliquer "I understand"');
    console.log('pour continuer — c est normal pour un tunnel temporaire.');
    console.log('Dans le lobby, laisser le champ Serveur sur sa valeur par defaut.');
    console.log('Ferme cette fenetre pour couper le serveur et le tunnel.');
    console.log('================================================');
    console.log('');

    if (shouldOpenBrowser) {
        openBrowser(publicUrl);
    }

    // Validation en arriere-plan — affiche un message de confirmation ou d'alerte.
    waitForPublicReady(publicUrl).then(() => {
        console.log('[OK] URL publique confirmee accessible depuis l exterieur.');
    }).catch((err) => {
        console.warn('');
        console.warn('[AVERT] La verification automatique d acces a echoue :');
        console.warn(`        ${err.message}`);
        console.warn('        Le lien fonctionne peut-etre quand meme — teste-le manuellement.');
        console.warn('');
    });
}

function openBrowser(url) {
    const command = process.platform === 'win32'
        ? 'cmd'
        : process.platform === 'darwin'
            ? 'open'
            : 'xdg-open';
    const args = process.platform === 'win32'
        ? ['/c', 'start', '""', url]
        : [url];

    const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    child.unref();
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
    const cloudflaredBin = await ensureCloudflared();
    if (!cloudflaredBin) {
        console.error('cloudflared est introuvable.');
        console.error('Installe-le puis relance ce script, ou lance ce projet sur Windows pour le telechargement automatique.');
        console.error('Documentation officielle : https://developers.cloudflare.com/tunnel/');
        process.exit(1);
    }

    console.log('================================================');
    console.log('CRYSTAL GUARDIAN - HOST PUBLIC TEMPORAIRE');
    console.log('================================================');
    console.log(`Serveur local : ${tunnelOrigin}`);
    console.log(`Tunnel        : ${cloudflaredBin}`);
    console.log('');
    console.log('Attente du serveur local et du tunnel Cloudflare...');
    console.log('L URL publique apparaitra des que le tunnel est actif.')
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

    const readyPromise = waitForHttpReady();

    tunnelProcess = spawn(cloudflaredBin, [
        'tunnel',
        '--no-autoupdate',
        '--url',
        tunnelOrigin
    ], {
        cwd: rootDir,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    prefixStream(tunnelProcess.stdout, '[cloudflared] ');
    prefixStream(tunnelProcess.stderr, '[cloudflared] ');
    attachTunnelUrlReporter(tunnelProcess.stdout, readyPromise);
    attachTunnelUrlReporter(tunnelProcess.stderr, readyPromise);

    tunnelProcess.on('exit', (code) => {
        if (!shuttingDown) {
            console.error(`cloudflared s'est arrete (code ${code ?? 'null'}).`);
            shutdown(1);
        }
    });

    await readyPromise;
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
