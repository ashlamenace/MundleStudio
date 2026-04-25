/**
 * Crystal Guardian — static file server + WebSocket relay on the same origin
 * Run: node server.js
 * Clients open: http://<HOST_IP>:3000
 * WebSocket at:  ws://<HOST_IP>:3000/ws
 */

const WebSocket = require('ws');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');
const os        = require('os');

const PORT    = Number(process.env.PORT || 3000);
const WS_PATH = process.env.WS_PATH || '/ws';

// ── Static file server ────────────────────────────────────────────────────────

const MIME = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.json': 'application/json',
    '.wav':  'audio/wav',
    '.mp3':  'audio/mpeg',
    '.ogg':  'audio/ogg',
};

const ROOT = __dirname;

const httpServer = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0]; // strip query string
    if (urlPath === '/') urlPath = '/index.html';
    try {
        urlPath = decodeURIComponent(urlPath);
    } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad request');
        return;
    }

    const filePath = path.join(ROOT, urlPath);

    // Security: ensure the resolved path is within ROOT
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found: ' + urlPath);
            return;
        }
        const ext  = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
});

httpServer.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
    if (pathname !== WS_PATH) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

httpServer.listen(PORT, () => {
    console.log(`\n=== Crystal Guardian — Game Server ===`);
    for (const [, addrs] of Object.entries(os.networkInterfaces())) {
        for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
                console.log(`  Jeu   : http://${addr.address}:${PORT}`);
                console.log(`  WS    : ws://${addr.address}:${PORT}${WS_PATH}`);
            }
        }
    }
    console.log(`  Local : http://localhost:${PORT}`);
    console.log(`  WS    : ws://localhost:${PORT}${WS_PATH}`);
    console.log(`\nPartagez l'adresse "Jeu" avec vos coéquipiers.`);
    console.log(`======================================\n`);
});


const rooms = new Map(); // code → Room

// ── Room ─────────────────────────────────────────────────────────────────────

class Room {
    constructor(code, hostWs) {
        this.code = code;
        this.host = hostWs;
        this.members = new Map(); // ws → { id }
        this._nextId = 2;
        this.members.set(hostWs, { id: 'player_1' });
    }

    addMember(ws) {
        const id = `player_${this._nextId++}`;
        this.members.set(ws, { id });
        return id;
    }

    removeMember(ws) { this.members.delete(ws); }
    getId(ws)        { return this.members.get(ws)?.id ?? null; }
    isHost(ws)       { return ws === this.host; }
    get size()       { return this.members.size; }
    get empty()      { return this.members.size === 0; }

    playerList() {
        return [...this.members.values()].map(m => m.id);
    }

    send(ws, msg) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    }

    broadcast(msg, exclude = null) {
        const data = JSON.stringify(msg);
        for (const [ws] of this.members) {
            if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(data);
        }
    }
}

// ── Server ───────────────────────────────────────────────────────────────────

const wss = new WebSocket.Server({ noServer: true });

// Heartbeat: terminate zombie connections after two missed pings (60 s)
const heartbeatInterval = setInterval(() => {
    for (const ws of wss.clients) {
        if (!ws._alive) { ws.terminate(); continue; }
        ws._alive = false;
        ws.ping();
    }
}, 30_000);
wss.on('close', () => clearInterval(heartbeatInterval));

wss.on('connection', (ws) => {
    ws._room  = null;
    ws._id    = null;
    ws._alive = true;
    ws.on('pong', () => { ws._alive = true; });

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        switch (msg.type) {

            case 'CREATE_ROOM': {
                if (ws._room) return;
                const code = generateCode();
                const room = new Room(code, ws);
                rooms.set(code, room);
                ws._room = room;
                ws._id   = 'player_1';
                room.send(ws, { type: 'ROOM_CREATED', code, playerId: 'player_1' });
                console.log(`[+] Room ${code} created`);
                break;
            }

            case 'JOIN_ROOM': {
                if (ws._room) return;
                const code = String(msg.code ?? '').toUpperCase().trim();
                const room = rooms.get(code);

                if (!room) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Room introuvable' }));
                    return;
                }
                if (room.size >= 4) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Room pleine (max 4 joueurs)' }));
                    return;
                }

                const playerId = room.addMember(ws);
                ws._room = room;
                ws._id   = playerId;

                // Tell joiner: your ID + who's already there
                room.send(ws, {
                    type: 'ROOM_JOINED',
                    code,
                    playerId,
                    players: room.playerList().filter(id => id !== playerId)
                });

                // Tell everyone else (including host) someone joined
                room.broadcast({ type: 'PLAYER_JOINED', playerId }, ws);

                console.log(`[+] ${playerId} joined ${code} (${room.size}/4)`);
                break;
            }

            // Forward to all others in room
            case 'RELAY': {
                if (!ws._room) return;
                ws._room.broadcast({ ...msg.data, _from: ws._id }, ws);
                break;
            }

            // Forward to all (including sender — useful for confirmed state)
            case 'RELAY_ALL': {
                if (!ws._room) return;
                ws._room.broadcast({ ...msg.data, _from: ws._id });
                break;
            }

            // Forward to host only (client → host requests)
            case 'RELAY_TO_HOST': {
                if (!ws._room) return;
                ws._room.send(ws._room.host, { ...msg.data, _from: ws._id });
                break;
            }

            // Forward to a specific player by ID (e.g. late-join state sync)
            case 'RELAY_TO': {
                if (!ws._room) return;
                const targetId = String(msg.target ?? '');
                for (const [memberWs, info] of ws._room.members) {
                    if (info.id === targetId) {
                        ws._room.send(memberWs, { ...msg.data, _from: ws._id });
                        break;
                    }
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        const room = ws._room;
        if (!room) return;

        const wasHost = room.isHost(ws);
        room.removeMember(ws);

        if (wasHost || room.empty) {
            room.broadcast({ type: 'HOST_DISCONNECTED' });
            rooms.delete(room.code);
            console.log(`[-] Room ${room.code} closed`);
        } else {
            room.broadcast({ type: 'PLAYER_LEFT', playerId: ws._id });
            console.log(`[-] ${ws._id} left ${room.code} (${room.size} remaining)`);
        }
        ws._room = null;
    });

    ws.on('error', (err) => console.error('[ERR]', err.message));
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateCode() {
    // No confusable chars (0/O, 1/I/l removed)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (rooms.has(code));
    return code;
}

console.log(`[BOOT] WebSocket path configured on ${WS_PATH}`);
