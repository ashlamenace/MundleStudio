/**
 * NetworkManager — client-side multiplayer layer
 *
 * Architecture:
 *   HOST  : runs WaveSystem, authoritative for enemies/crystal health. Relays
 *           enemy spawns + position batches + crystal health to clients.
 *   CLIENT: receives enemies from host (puppet mode), runs full local combat.
 *           When a client kills an enemy it broadcasts ENEMY_DEATH so everyone
 *           removes it. Position corrections arrive at 15 Hz from host.
 *
 * Buildings are shared: any player's placement is relayed to all others.
 * Auto-miner income stays per-player via building ownership.
 */

// Auto-detect: same host as the page, WebSocket served on /ws.
const _loc = window.location;
export const DEFAULT_URL = (!_loc.host || _loc.protocol === 'file:')
    ? 'ws://localhost:3000/ws'
    : `${_loc.protocol === 'https:' ? 'wss' : 'ws'}://${_loc.host}/ws`;

// Pre-import Enemy and Projectile so spawns never wait on a dynamic import
let _EnemyClass      = null;
let _ProjectileClass = null;
import('../entities/Enemy.js').then(m => { _EnemyClass = m.Enemy; }).catch(() => {});
import('../entities/Projectile.js').then(m => { _ProjectileClass = m.Projectile; }).catch(() => {});

export class NetworkManager {
    constructor(game) {
        this.game = game;

        this.ws         = null;
        this.ready      = false;   // WebSocket open
        this.inRoom     = false;   // Successfully joined/created a room
        this.isHost     = false;
        this.playerId   = null;
        this.roomCode   = null;

        // Periodic send timers (seconds)
        this._tPlayer   = 0;
        this._tEnemy    = 0;
        this._tCrystal  = 0;
        this._tDayNight = 0;
        this._tResync   = 0;
        this._tWave     = 0;

        // Send rates (seconds between sends)
        this.HZ_PLAYER   = 1 / 20;  // 20 Hz — smooth player movement
        this.HZ_ENEMY    = 1 / 20;  // 20 Hz — enemy batch positions (was 15, raised for smoother interp)
        this.HZ_CRYSTAL  = 1 / 2;   // 2  Hz — crystal health sync
        this.HZ_DAYNIGHT = 1 / 5;   // 5  Hz — smoother day/night sync
        this.HZ_RESYNC   = 2;        // 2 s  — full enemy list resync (was 5 s, faster recovery)
        this.HZ_WAVE     = 1;        // 1 s  — wave progress sync during active wave

        // Pending promise callbacks
        this._cb = {};

        // Enemy registry: netId → Enemy entity (both host and client)
        this._netEnemies = new Map();
        this._nextNetId  = 1;
    }

    // ── Connection ────────────────────────────────────────────────────────────

    connect(url = DEFAULT_URL) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);
                const timeout = setTimeout(() => reject(new Error('Timeout — serveur injoignable')), 6000);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.ready = true;
                    resolve();
                };
                this.ws.onclose = () => {
                    this.ready = false;
                    this.inRoom = false;
                };
                this.ws.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Connexion échouée — le serveur est-il lancé ?'));
                };
                this.ws.onmessage = (e) => {
                    try { this._handle(JSON.parse(e.data)); } catch { /* ignore bad frames */ }
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    disconnect() {
        this.ws?.close();
        this.ready  = false;
        this.inRoom = false;
    }

    // ── Room management ───────────────────────────────────────────────────────

    createRoom() {
        return new Promise((resolve, reject) => {
            this._cb.created = resolve;
            this._cb.error   = reject;
            this._send({ type: 'CREATE_ROOM' });
        });
    }

    joinRoom(code) {
        return new Promise((resolve, reject) => {
            this._cb.joined = resolve;
            this._cb.error  = reject;
            this._send({ type: 'JOIN_ROOM', code: code.toUpperCase().trim() });
        });
    }

    // ── Low-level sends ───────────────────────────────────────────────────────

    _send(msg) {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    }

    // Relay to all others in room (server excludes sender)
    _relay(data) { this._send({ type: 'RELAY', data }); }

    // Relay to everyone including self (for confirmed events)
    _relayAll(data) { this._send({ type: 'RELAY_ALL', data }); }

    // Send only to host
    _relayHost(data) { this._send({ type: 'RELAY_TO_HOST', data }); }

    // Send to one specific player
    _relayTo(targetId, data) {
        this._send({ type: 'RELAY_TO', target: targetId, data });
    }

    // ── Incoming message router ───────────────────────────────────────────────

    _handle(msg) {
        const game = this.game;

        switch (msg.type) {

            // ── Room handshake ──
            case 'ROOM_CREATED':
                this.roomCode = msg.code;
                this.playerId = msg.playerId;
                this.isHost   = true;
                this.inRoom   = true;
                this._cb.created?.(msg);
                break;

            case 'ROOM_JOINED':
                this.roomCode = msg.code;
                this.playerId = msg.playerId;
                this.isHost   = false;
                this.inRoom   = true;
                // Spawn remote-player entities for players already in room
                for (const id of (msg.players ?? [])) game.addRemotePlayer(id);
                this._cb.joined?.(msg);
                break;

            case 'ERROR':
                this._cb.error?.(new Error(msg.message ?? 'Erreur réseau'));
                break;

            case 'PLAYER_JOINED':
                game.addRemotePlayer(msg.playerId);
                if (this.isHost && game.state === 'playing') {
                    this.broadcastFullState();
                }
                break;

            case 'PLAYER_LEFT':
                game.removeRemotePlayer(msg.playerId);
                break;

            case 'HOST_DISCONNECTED':
                game.onHostDisconnected?.();
                break;

            // ── Game state ──
            case 'PLAYER_UPDATE':
                game.updateRemotePlayer(msg._from, msg);
                break;

            case 'ENEMY_SPAWN':
                if (!this.isHost) this._receiveEnemySpawn(msg);
                break;

            case 'ENEMY_BATCH':
                if (!this.isHost) this._receiveEnemyBatch(msg.batch);
                break;

            case 'ENEMY_DEATH':
                this._receiveEnemyDeath(msg.id);
                break;

            case 'ENEMY_RESYNC':
                if (!this.isHost) this._receiveEnemyResync(msg.list);
                break;

            case 'BUILDING_PLACED':
                // Only apply buildings placed by others (we already have our own)
                if (msg._from !== this.playerId) {
                    game.buildingSystem?.receiveNetworkBuilding(msg);
                }
                break;

            case 'BUILDING_DESTROYED':
                if (msg._from !== this.playerId) {
                    game.buildingSystem?.destroyNetworkBuilding(msg.bId);
                }
                break;

            case 'BUILDING_UPGRADED':
                if (msg._from !== this.playerId) {
                    game.buildingSystem?.receiveNetworkBuildingUpgrade(msg.bId, msg.level);
                }
                break;

            case 'BUILDING_RESYNC':
                if (msg._from !== this.playerId) {
                    game.buildingSystem?.receiveNetworkBuildingResync(msg.buildings);
                }
                break;

            case 'VERSUS_STRUCTURE_HIT':
                game.applyVersusStructureHit?.(msg);
                break;

            case 'VERSUS_PLAYER_HIT':
                game.applyVersusPlayerHit?.(msg);
                break;

            case 'CRYSTAL_HP':
                if (Array.isArray(msg.crystals)) {
                    for (const crystalData of msg.crystals) {
                        const crystal = crystalData.slot
                            ? game.getCrystalForSlot?.(crystalData.slot)
                            : game.crystal;
                        if (!crystal) continue;
                        crystal.health = crystalData.hp;
                        crystal.maxHealth = crystalData.maxHp ?? crystal.maxHealth;
                        if (crystalData.destroyed || crystal.health <= 0) {
                            game.handleCrystalDestroyed?.(crystal);
                        }
                    }
                } else if (game.crystal) {
                    game.crystal.health = msg.hp;
                }
                break;

            case 'DAY_NIGHT_UPDATE':
                if (!this.isHost && game.dayNight) {
                    const dn = game.dayNight;
                    const cycle = dn.totalCycleDuration || (dn.dayDuration + dn.nightDuration);

                    if (typeof msg.time === 'number') {
                        let targetTime = msg.time % cycle;
                        if (targetTime < 0) targetTime += cycle;

                        const drift = Math.abs((dn.currentTime ?? 0) - targetTime);
                        const phaseChanged = (typeof msg.isNight === 'boolean') && (msg.isNight !== dn.isNight);
                        const dayChanged = (typeof msg.day === 'number') && (msg.day !== dn.dayNumber);

                        if (drift > 1.5 || phaseChanged || dayChanged) {
                            dn.currentTime = targetTime;
                        } else {
                            dn.currentTime += (targetTime - dn.currentTime) * 0.35;
                        }
                    }

                    if (typeof msg.isNight === 'boolean') {
                        dn.isNight = msg.isNight;
                    }
                    if (typeof msg.day === 'number') {
                        dn.dayNumber = msg.day;
                    }

                    dn.updateOverlay?.();
                    if (msg.survivalDays !== undefined) game.survivalDays = msg.survivalDays;
                }
                break;

            case 'ENEMY_HIT':
                if (msg._from !== this.playerId) this._receiveEnemyHit(msg.id, msg.hp);
                break;

            case 'PROJECTILE_SPAWN':
                if (msg._from !== this.playerId) this._receiveProjectileSpawn(msg);
                break;

            case 'RESOURCE_HIT':
                if (msg._from !== this.playerId) this._receiveResourceHit(msg.id, msg.hp);
                break;

            case 'WAVE_UPDATE':
                if (!this.isHost) game.waveSystem?.receiveNetworkUpdate(msg);
                break;

            case 'REQUEST_SKIP_TO_NIGHT':
                if (this.isHost) game.requestSkipToNight(msg._from ?? null);
                break;

            case 'SKIP_TO_NIGHT_VOTE_STATE':
                game.applySkipToNightVoteState?.(msg);
                break;

            case 'GAME_START':
                if (!this.isHost && game.state !== 'playing') {
                    const versusState = msg.versusState ?? null;
                    game.startNetworkGame(msg.seed, { gameMode: msg.gameMode, ...(versusState || {}) });
                }
                break;

            case 'VERSUS_MATCH_STATE':
                if (!this.isHost) {
                    game.applyVersusMatchState?.(msg);
                }
                break;

            // ── Crystal upgrade ──
            case 'CRYSTAL_DEPOSIT':
                // Host accumulates deposits from clients
                if (this.isHost && game.crystalUpgradeSystem) {
                    game.crystalUpgradeSystem.receiveDeposit(msg.amounts ?? {});
                }
                break;

            case 'CRYSTAL_UPGRADED':
                // All players (including host re-receive for consistency)
                if (game.crystalUpgradeSystem) {
                    if (!this.isHost) {
                        game.crystalUpgradeSystem.receiveUpgrade(msg.level);
                    }
                }
                break;

            case 'CRYSTAL_SYNC':
                // State sync when joining mid-game
                if (!this.isHost && game.crystalUpgradeSystem) {
                    game.crystalUpgradeSystem.receiveSync(msg.level, msg.deposits ?? {});
                }
                break;

            case 'BOSS_ENTRANCE':
                if (!this.isHost) {
                    const bossEnemy = this._netEnemies.get(msg.netId);
                    game._triggerBossEntrance(bossEnemy ?? { config: { name: msg.bossType }, enemyType: msg.bossType, _netId: null });
                }
                break;
        }
    }

    // ── Game loop tick ────────────────────────────────────────────────────────

    tick(dt) {
        if (!this.ready || !this.inRoom || this.game.state !== 'playing') return;

        this._tPlayer += dt;
        if (this._tPlayer >= this.HZ_PLAYER) {
            this._tPlayer = 0;
            this._sendPlayerState();
        }

        if (this.isHost) {
            this._tEnemy += dt;
            if (this._tEnemy >= this.HZ_ENEMY) {
                this._tEnemy = 0;
                this._sendEnemyBatch();
            }

            this._tCrystal += dt;
            if (this._tCrystal >= this.HZ_CRYSTAL) {
                this._tCrystal = 0;
                this._sendCrystalHP();
            }

            this._tDayNight += dt;
            if (this._tDayNight >= this.HZ_DAYNIGHT) {
                this._tDayNight = 0;
                this._sendDayNight();
            }

            this._tResync += dt;
            if (this._tResync >= this.HZ_RESYNC) {
                this._tResync = 0;
                this._sendEnemyResync();
            }

            if (this.game.waveSystem?.isWaveActive) {
                this._tWave += dt;
                if (this._tWave >= this.HZ_WAVE) {
                    this._tWave = 0;
                    const ws = this.game.waveSystem;
                    this.broadcastWaveUpdate(ws.currentWave, true);
                }
            }
        }
    }

    _sendPlayerState() {
        const p = this.game.player;
        if (!p) return;
        this._relay({
            type   : 'PLAYER_UPDATE',
            x      : Math.round(p.x),
            y      : Math.round(p.y),
            hp     : Math.round(p.health),
            maxHp  : p.maxHealth,
            angle  : p.facingAngle,
            dirAngle: p.spriteFacingAngle ?? p.facingAngle,
            anim   : p._animState  ?? 'idle',
            flip   : p._facingLeft ?? false,
            frame  : p._animFrame  ?? 0,
            slot   : p.currentSlot ?? 1,
            lvl    : p.level       ?? 1,
            // Null when in overworld; cave ID string when in a cave
            cave   : this.game.inCave ? (this.game._currentCaveId ?? null) : null
        });
    }

    _sendEnemyBatch() {
        const batch = [];
        for (const [id, e] of this._netEnemies) {
            if (!e.destroyed) {
                batch.push({ id, x: Math.round(e.x), y: Math.round(e.y), hp: Math.round(e.health) });
            }
        }
        if (batch.length > 0) this._relayAll({ type: 'ENEMY_BATCH', batch });
    }

    _sendEnemyResync() {
        const list = [];
        for (const [id, e] of this._netEnemies) {
            if (!e.destroyed) {
                list.push({
                    id,
                    kind: e.enemyType,
                    x: Math.round(e.x),
                    y: Math.round(e.y),
                    hp: Math.round(e.health),
                    maxHp: Math.round(e.maxHealth),
                    scene: e._scene ?? 'overworld',
                    targetSlot: e.targetCrystalSlot ?? null
                });
            }
        }
        this._relayAll({ type: 'ENEMY_RESYNC', list });
    }

    _sendCrystalHP() {
        const crystals = this.game.getAllCrystals?.() ?? (this.game.crystal ? [this.game.crystal] : []);
        if (crystals.length === 0) return;

        this._relayAll({
            type: 'CRYSTAL_HP',
            crystals: crystals.map(crystal => ({
                slot: crystal.ownerSlot ?? null,
                hp: Math.round(crystal.health),
                maxHp: Math.round(crystal.maxHealth),
                destroyed: !!crystal.destroyed
            }))
        });
    }

    _sendDayNight() {
        const dn = this.game.dayNight;
        if (!dn) return;
        this._relay({ type: 'DAY_NIGHT_UPDATE', time: dn.currentTime, isNight: dn.isNight, day: dn.dayNumber, survivalDays: this.game.survivalDays });
    }

    // ── Enemy hit events ──────────────────────────────────────────────────────

    onEnemyHit(netId, hp) {
        if (!this.ready || !this.inRoom) return;
        // _relay excludes sender — sender already applied damage locally
        this._relay({ type: 'ENEMY_HIT', id: netId, hp });
    }

    _receiveEnemyHit(netId, hp) {
        const e = this._netEnemies.get(netId);
        if (!e || e.destroyed) return;
        e._takingNetworkDamage = true;
        e.health = hp;
        if (e.health <= 0) {
            e._dyingFromNetwork = true;
            e.die();
            this._netEnemies.delete(netId);
        }
        e._takingNetworkDamage = false;
    }

    // ── Resource hit events ───────────────────────────────────────────────────

    onResourceHit(netId, hp) {
        if (!this.ready || !this.inRoom) return;
        this._relay({ type: 'RESOURCE_HIT', id: netId, hp });
    }

    _receiveResourceHit(netId, hp) {
        const node = this.game.entities.find(e => e.type === 'resource' && e._netId === netId);
        if (!node || node.destroyed) return;
        node._takingNetworkDamage = true;
        node.health = hp;
        // Set destroyed directly — do NOT call die() to avoid giving resources to this client
        if (node.health <= 0) node.destroyed = true;
        node._takingNetworkDamage = false;
        node.shakeAmount = 5;
    }

    // ── Enemy registration (called by WaveSystem on host) ────────────────────

    registerEnemy(enemy) {
        if (!this.isHost || !this.ready || !this.inRoom) return;
        const id = `e${this._nextNetId++}`;
        enemy._netId = id;
        this._netEnemies.set(id, enemy);
        this._relayAll({
            type  : 'ENEMY_SPAWN',
            id,
            kind  : enemy.enemyType,
            x     : Math.round(enemy.x),
            y     : Math.round(enemy.y),
            hp    : enemy.health,
            maxHp : enemy.maxHealth,
            scene : enemy._scene ?? 'overworld',
            targetSlot: enemy.targetCrystalSlot ?? null,
        });
    }

    // Called when an enemy dies locally (host or client)
    onEnemyDied(enemy) {
        if (!this.ready || !this.inRoom || !enemy._netId) return;
        this._netEnemies.delete(enemy._netId);
        this._relayAll({ type: 'ENEMY_DEATH', id: enemy._netId });
    }

    // ── Enemy receiving (client side) ─────────────────────────────────────────

    _spawnNetEnemy(data) {
        const EnemyCls = _EnemyClass;
        if (!EnemyCls) { console.warn('[NET] Enemy class not loaded yet'); return; }
        if (this._netEnemies.has(data.id)) return;
        const enemy = new EnemyCls(this.game, data.x, data.y, data.kind ?? 'grunt');
        enemy._netId             = data.id;
        enemy._networkControlled = true;
        enemy._scene             = data.scene ?? 'overworld';
        enemy.targetCrystalSlot  = data.targetSlot ?? null;
        enemy._laneSlot          = enemy.targetCrystalSlot;
        enemy._netTargetX        = data.x;
        enemy._netTargetY        = data.y;
        enemy.health             = data.hp;
        enemy.maxHealth          = data.maxHp ?? data.hp;
        this._netEnemies.set(data.id, enemy);
        this.game.addEntity(enemy);
    }

    _receiveEnemySpawn(data) {
        if (this._netEnemies.has(data.id)) return;
        if (_EnemyClass) {
            this._spawnNetEnemy(data);
        } else {
            // Enemy module not ready yet — wait for it then spawn
            import('../entities/Enemy.js').then(m => { _EnemyClass = m.Enemy; this._spawnNetEnemy(data); }).catch(e => console.warn('[NET] Failed to spawn network enemy:', e));
        }
    }

    _receiveEnemyResync(list) {
        if (!Array.isArray(list)) return;
        const seenIds = new Set(list.map(e => e.id));

        // Remove or clean up enemies the host no longer has.
        // Always delete from the map — even if already destroyed — so stale
        // entries never block future spawns with the same ID.
        for (const [id, e] of this._netEnemies) {
            if (!seenIds.has(id)) {
                if (!e.destroyed) {
                    e._dyingFromNetwork = true;
                    e.die();
                }
                this._netEnemies.delete(id);
            }
        }

        // Spawn missing enemies; update health + position of existing ones.
        // A full resync is a hard correction — apply positions and health
        // regardless of the normal ENEMY_BATCH threshold.
        for (const item of list) {
            const existing = this._netEnemies.get(item.id);
            if (!existing || existing.destroyed) {
                // Clean any stale destroyed entry before spawning fresh
                this._netEnemies.delete(item.id);
                this._receiveEnemySpawn(item);
            } else {
                // Hard-correct everything — this is a periodic authoritative snapshot
                existing._netTargetX = item.x;
                existing._netTargetY = item.y;
                existing.health      = item.hp;
                existing.maxHealth   = item.maxHp ?? existing.maxHealth;
                if (item.scene) existing._scene = item.scene;
                if (item.targetSlot !== undefined) existing.targetCrystalSlot = item.targetSlot;
            }
        }
    }

    _receiveEnemyBatch(batch) {
        for (const item of (batch ?? [])) {
            const e = this._netEnemies.get(item.id);
            if (!e || e.destroyed) continue;

            e._netTargetX = item.x;
            e._netTargetY = item.y;

            // Always sync health from the authoritative host batch.
            // Individual ENEMY_HIT messages keep fine-grained accuracy; the batch
            // is a safety net. Using a 15% threshold avoids jarring HP-bar jumps
            // on minor floating-point drift while still catching real desyncs.
            if (Math.abs(e.health - item.hp) > e.maxHealth * 0.15) {
                e.health = item.hp;
            }
        }
    }

    _receiveEnemyDeath(netId) {
        const e = this._netEnemies.get(netId);
        if (e && !e.destroyed) {
            // On host: handle special on-death spawns for enemies killed by clients.
            // The client's puppet skips these (it sets _networkControlled=true), so
            // the host must take responsibility when it processes the ENEMY_DEATH.
            if (this.isHost && e.enemyType === 'iceWolf' && !e._packSpawned && !e.isElite) {
                e._packSpawned = true;
                const wave = this.game.waveSystem?.currentWave ?? 0;
                if (wave >= 3 && _EnemyClass) {
                    for (let i = 0; i < 2; i++) {
                        const angle = (Math.PI * 2 / 3) * (i + 1);
                        const wolf = new _EnemyClass(
                            this.game,
                            e.x + Math.cos(angle) * 60,
                            e.y + Math.sin(angle) * 60,
                            'iceWolf'
                        );
                        wolf._packSpawned = true;
                        this.game.addEntity(wolf);
                        this.registerEnemy(wolf);
                    }
                }
            }

            e._dyingFromNetwork = true; // prevents re-broadcast
            e.die();
        }
        this._netEnemies.delete(netId);
    }

    // Remove destroyed enemies that weren't cleaned by normal death paths.
    // Called by the game loop after entity cleanup to prevent stale map entries
    // from blocking resync re-spawns or leaking memory over long sessions.
    cleanNetEnemies() {
        for (const [id, e] of this._netEnemies) {
            if (e.destroyed) this._netEnemies.delete(id);
        }
    }

    // Called when exiting a cave: broadcast death for all cave-scene enemies and
    // remove them from the registry so overworld resync starts clean.
    cleanupCaveEnemies() {
        for (const [id, e] of this._netEnemies) {
            if (e._scene === 'cave') {
                if (!e.destroyed) {
                    this._relayAll({ type: 'ENEMY_DEATH', id });
                }
                this._netEnemies.delete(id);
            }
        }
    }

    // ── Projectile sync ───────────────────────────────────────────────────────

    // Called by Game.addProjectile for local-player projectiles
    onProjectileSpawned(projectile) {
        if (!this.ready || !this.inRoom) return;
        this._relay({
            type      : 'PROJECTILE_SPAWN',
            x         : projectile.x,
            y         : projectile.y,
            angle     : projectile.angle,
            speed     : projectile.speed,
            range     : projectile.range,
            size      : projectile.size,
            color     : projectile.color,
            projType  : projectile.type,
            trailLen  : projectile.trailLength,
            ownerId   : projectile.ownerId ?? null,
        });
    }

    _receiveProjectileSpawn(data) {
        if (!_ProjectileClass) return; // module not ready yet — skip; no visual is better than a crash
        const proj = new _ProjectileClass(this.game, data.x, data.y, data.angle, {
            speed      : data.speed,
            range      : data.range,
            size       : data.size,
            color      : data.color,
            type       : data.projType,
            trailLength: data.trailLen,
            ownerId    : data.ownerId ?? null,
        });
        proj._visualOnly = true; // no collision checks, no damage
        this.game.addProjectile(proj);
    }

    // ── Building events ───────────────────────────────────────────────────────

    onBuildingPlaced(building) {
        if (!this.ready || !this.inRoom) return;
        this._relayAll({
            type  : 'BUILDING_PLACED',
            bId   : building._netId,
            bType : building.configKey,   // e.g. 'woodWall', 'stoneTurret'
            x     : Math.round(building.x),
            y     : Math.round(building.y),
            ownerId: building.ownerId ?? this.playerId ?? null
        });
    }

    onBuildingDestroyed(netId) {
        if (!this.ready || !this.inRoom) return;
        this._relayAll({ type: 'BUILDING_DESTROYED', bId: netId });
    }

    onBuildingUpgraded(netId, level) {
        if (!this.ready || !this.inRoom) return;
        this._relay({ type: 'BUILDING_UPGRADED', bId: netId, level });
    }

    requestSkipToNight() {
        if (!this.ready || !this.inRoom) return;
        if (this.isHost) {
            this.game.requestSkipToNight(this.playerId ?? null);
            return;
        }
        this._relayHost({ type: 'REQUEST_SKIP_TO_NIGHT' });
    }

    broadcastBuildingResync() {
        if (!this.isHost || !this.ready || !this.inRoom) return;
        const buildings = this.game.buildingSystem?.getNetworkSnapshot?.() ?? [];
        this._relayAll({ type: 'BUILDING_RESYNC', buildings });
    }

    sendVersusStructureHit(payload) {
        if (!this.ready || !this.inRoom) return;

        const data = {
            type: 'VERSUS_STRUCTURE_HIT',
            attackerId: this.playerId,
            targetType: payload?.targetType,
            bId: payload?.bId ?? null,
            slot: payload?.slot ?? null,
            damage: Math.max(0, Number(payload?.damage ?? 0))
        };

        if (data.damage <= 0) return;

        this._relayAll(data);
    }

    sendVersusPlayerHit(targetPlayerId, payload = {}) {
        if (!this.ready || !this.inRoom) return;
        if (!targetPlayerId || targetPlayerId === this.playerId) return;

        const damage = Math.max(0, Number(payload?.damage ?? 0));
        if (damage <= 0) return;

        this._relayAll({
            type: 'VERSUS_PLAYER_HIT',
            attackerId: this.playerId,
            targetId: targetPlayerId,
            targetSlot: payload?.targetSlot ?? null,
            damage,
            damageType: payload?.damageType ?? 'melee',
            slowFactor: payload?.slowFactor ?? 0,
            slowDuration: payload?.slowDuration ?? 0
        });
    }

    _buildVersusMatchStatePayload() {
        return this.game.getVersusMatchSnapshot?.() ?? null;
    }

    // ── Host broadcasts start ─────────────────────────────────────────────────

    broadcastStart() {
        if (!this.isHost) return;
        const versusState = this._buildVersusMatchStatePayload();
        this._relayAll({
            type: 'GAME_START',
            seed: this.game._worldSeed,
            gameMode: this.game.gameMode,
            versusState
        });
    }

    broadcastFullState() {
        if (!this.isHost || !this.ready || !this.inRoom || this.game.state !== 'playing') return;
        const versusState = this._buildVersusMatchStatePayload();
        this._relayAll({
            type: 'GAME_START',
            seed: this.game._worldSeed,
            gameMode: this.game.gameMode,
            versusState
        });
        this._sendEnemyResync();
        this._sendCrystalHP();
        this._sendDayNight();
        this.broadcastWaveUpdate(this.game.waveSystem?.currentWave ?? 0, this.game.waveSystem?.isWaveActive ?? false);
        this.broadcastBuildingResync();
        this.broadcastVersusMatchState();
        this.broadcastSkipToNightVoteState();
        // Sync crystal upgrade state to all clients
        const upSys = this.game.crystalUpgradeSystem;
        if (upSys) {
            this._relayAll({ type: 'CRYSTAL_SYNC', level: upSys.level, deposits: { ...upSys.deposits } });
        }
    }

    broadcastWorldSeed(seed) {
        // Seed is already included in broadcastStart — this is a no-op kept for API compat.
    }

    broadcastVersusMatchState() {
        if (!this.isHost || !this.ready || !this.inRoom) return;
        const payload = this._buildVersusMatchStatePayload();
        if (!payload) return;
        this._relayAll({ type: 'VERSUS_MATCH_STATE', ...payload });
    }

    broadcastSkipToNightVoteState() {
        if (!this.isHost || !this.ready || !this.inRoom) return;
        const status = this.game.getSkipToNightVoteStatus?.();
        if (!status) return;
        this._relayAll({
            type: 'SKIP_TO_NIGHT_VOTE_STATE',
            voterIds: status.voterIds,
            requiredIds: status.requiredIds
        });
    }

    // ── Wave sync (host → client) ─────────────────────────────────────────────

    broadcastWaveUpdate(waveNum, isActive) {
        if (!this.isHost) return;
        const ws = this.game.waveSystem;
        this._relayAll({
            type      : 'WAVE_UPDATE',
            wave      : waveNum,
            active    : isActive,
            spawnLeft : ws?.spawnQueue?.length ?? 0,
        });
    }

    // ── Crystal upgrade sync ──────────────────────────────────────────────────

    /** Client → host: deposit some resources toward the upgrade */
    sendCrystalDeposit(amounts) {
        if (!this.ready || !this.inRoom) return;
        if (this.isHost) {
            // Host applies directly
            this.game.crystalUpgradeSystem?.receiveDeposit(amounts);
        } else {
            this._relayHost({ type: 'CRYSTAL_DEPOSIT', amounts });
        }
    }

    /** Host → all: crystal just levelled up */
    broadcastCrystalUpgrade(newLevel) {
        if (!this.isHost) return;
        this._relayAll({ type: 'CRYSTAL_UPGRADED', level: newLevel });
    }

    /** Host → specific joiner: full crystal state */
    sendCrystalSync(targetId) {
        if (!this.isHost) return;
        const upSys = this.game.crystalUpgradeSystem;
        if (!upSys) return;
        this._send({
            type  : 'RELAY_TO',
            target: targetId,
            data  : { type: 'CRYSTAL_SYNC', level: upSys.level, deposits: { ...upSys.deposits } }
        });
    }
}
