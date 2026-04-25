/**
 * Crystal Guardian — Main Entry Point
 * Handles the lobby UI and wires the NetworkManager to the Game.
 */

import { Game }           from './core/Game.js';
import { DEFAULT_URL, NetworkManager } from './network/NetworkManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) { console.error('[MAIN] Canvas not found'); return; }

    const game = new Game(canvas);
    const net  = new NetworkManager(game);
    game.networkManager = net;

    window.game = game; // debug

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const lobbyScreen    = document.getElementById('lobby-screen');
    const serverUrlInput = document.getElementById('lobby-server-url');
    const createBtn      = document.getElementById('lobby-create-btn');
    const hostArea       = document.getElementById('lobby-host-area');
    const codeValue      = document.getElementById('lobby-code-value');
    const copyBtn        = document.getElementById('lobby-copy-btn');
    const modeSelect     = document.getElementById('lobby-mode-select');
    const playerCount    = document.getElementById('lobby-player-count');
    const playersList    = document.getElementById('lobby-players-list');
    const startBtn       = document.getElementById('lobby-start-btn');
    const joinInput      = document.getElementById('lobby-join-input');
    const joinBtn        = document.getElementById('lobby-join-btn');
    const statusEl       = document.getElementById('lobby-status');
    const clientArea     = document.getElementById('lobby-client-area');
    const soloBtn        = document.getElementById('lobby-solo-btn');

    if (serverUrlInput && !serverUrlInput.value.trim()) {
        serverUrlInput.value = DEFAULT_URL;
    }
    if (modeSelect?.value) {
        game.setGameMode(modeSelect.value);
    }

    let remoteCount = 0; // tracks remote players for host UI

    // ── Helper ────────────────────────────────────────────────────────────────
    function setStatus(msg, type = '') {
        statusEl.textContent = msg;
        statusEl.className   = type; // '' | 'ok' | 'err'
    }

    function addPlayerToList(id, isYou = false) {
        const li = document.createElement('li');
        if (isYou) {
            li.className    = 'local';
            li.textContent  = '▶ Vous (Hôte)';
        } else {
            li.id          = `lobby-player-${id}`;
            li.textContent = `● ${id}`;
        }
        playersList.appendChild(li);
        remoteCount++;
        playerCount.textContent = String(1 + remoteCount); // +1 for host
    }

    function removePlayerFromList(id) {
        document.getElementById(`lobby-player-${id}`)?.remove();
        remoteCount = Math.max(0, remoteCount - 1);
        playerCount.textContent = String(1 + remoteCount);
    }

    function hideLobby() {
        lobbyScreen.classList.add('hidden');
    }

    function getSelectedMode() {
        return modeSelect?.value || game.gameMode;
    }

    async function connectToLobbyServer() {
        const url = serverUrlInput?.value.trim();
        await net.connect(url || undefined);
    }

    // ── Network event hooks for lobby UI ──────────────────────────────────────
    // These run BEFORE the game starts (while still in lobby)
    game._onLobbyPlayerJoined = (id) => {
        addPlayerToList(id, false);
    };
    game._onLobbyPlayerLeft = (id) => {
        removePlayerFromList(id);
    };

    // ── CREATE ────────────────────────────────────────────────────────────────
    createBtn.addEventListener('click', async () => {
        createBtn.disabled = true;
        setStatus('Connexion au serveur…');

        try {
            await connectToLobbyServer();
            const data = await net.createRoom();

            codeValue.textContent = data.code;
            hostArea.classList.remove('hidden');
            createBtn.style.display = 'none';
            setStatus('');

            // Wire lobby-level PLAYER_JOINED before game starts
            net._cb.lobbyJoined = (id) => {
                addPlayerToList(id);
                game.addRemotePlayer(id); // create entity so it's ready when game starts
            };
            net._cb.lobbyLeft = (id) => {
                removePlayerFromList(id);
                game.removeRemotePlayer(id);
            };

        } catch (err) {
            createBtn.disabled = false;
            setStatus(`Erreur : ${err.message}`, 'err');
        }
    });

    // ── COPY CODE ─────────────────────────────────────────────────────────────
    copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(codeValue.textContent).catch(() => {});
        copyBtn.textContent = '✔ Copié';
        setTimeout(() => { copyBtn.textContent = '📋 Copier'; }, 1500);
    });

    modeSelect?.addEventListener('change', () => {
        game.setGameMode(getSelectedMode());
    });

    // ── HOST: START GAME ──────────────────────────────────────────────────────
    startBtn.addEventListener('click', () => {
        if (!net.isHost) return;
        hideLobby();
        // Broadcast start to all connected clients
        // startGame() generates _worldSeed; broadcastStart() includes it in GAME_START
        game.startGame({ gameMode: getSelectedMode() });
        net.broadcastStart();
    });

    // ── JOIN ──────────────────────────────────────────────────────────────────
    joinBtn.addEventListener('click', async () => {
        const code = joinInput.value.trim().toUpperCase();
        if (code.length < 4) { setStatus('Code invalide', 'err'); return; }

        joinBtn.disabled  = true;
        joinInput.disabled = true;
        setStatus('Connexion…');

        try {
            await connectToLobbyServer();
            const data = await net.joinRoom(code);

            setStatus(`Connecté ! (${data.playerId})`, 'ok');
            clientArea.classList.remove('hidden');

            // Waiting for host to start — game.startNetworkGame() handles it
        } catch (err) {
            joinBtn.disabled   = false;
            joinInput.disabled = false;
            setStatus(`Erreur : ${err.message}`, 'err');
        }
    });

    // Auto-uppercase join input
    joinInput.addEventListener('input', () => {
        const uppercasedValue = joinInput.value.toUpperCase();
        if (joinInput.value === uppercasedValue) return;

        const { selectionStart, selectionEnd } = joinInput;
        joinInput.value = uppercasedValue;

        if (selectionStart !== null && selectionEnd !== null) {
            joinInput.setSelectionRange(selectionStart, selectionEnd);
        }
    });

    // ── SOLO ─────────────────────────────────────────────────────────────────
    soloBtn.addEventListener('click', () => {
        net.disconnect();
        game.networkManager = null;
        game.setGameMode(getSelectedMode());
        hideLobby();
        game.gameOverScreen?.classList.add('hidden');
        game.startScreen?.classList.remove('hidden');
    });

    // ── HOST_DISCONNECTED hook ─────────────────────────────────────────────────
    // This runs after game starts if the host leaves
    game.onHostDisconnected = () => {
        alert("L'hôte s'est déconnecté. La partie est terminée.");
        window.location.reload();
    };

    console.log('[MAIN] Crystal Guardian — lobby ready.');
});
