/**
 * Main Game class
 * Orchestrates all game systems
 */

import { Camera } from './Camera.js';
import { Input } from './Input.js';
import { GameMode, createMatchState, getGameModeConfig, normalizeGameMode } from './GameModeConfig.js';
import { Utils } from './Utils.js';
import { spriteManager } from './SpriteManager.js';
import { VisualEffects } from './VisualEffects.js';
import { World } from '../world/World.js';
import { VERSUS_SLOT_ORDER, resolveVersusSlot } from '../world/VersusArena.js';
import { Cave } from '../world/Cave.js';
import { DayNightCycle } from '../world/DayNightCycle.js';
import { Player } from '../entities/Player.js';
import { Crystal } from '../entities/Crystal.js';
import { CaveEntrance } from '../entities/CaveEntrance.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { BuildingSystem, AUTO_MINER_PRODUCTION_RATES } from '../systems/BuildingSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { HUD } from '../ui/HUD.js';
import { Minimap } from '../ui/Minimap.js';
import { BuildMenu } from '../ui/BuildMenu.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { EventSystem } from '../systems/EventSystem.js';
import { ArtifactSystem } from '../systems/ArtifactSystem.js';
import { ObjectiveSystem } from '../systems/ObjectiveSystem.js';
import { ChallengeSystem } from '../systems/ChallengeSystem.js';
import { CrystalUpgradeSystem } from '../systems/CrystalUpgradeSystem.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';

export const DEFAULT_DAY_DURATION = 90;
export const DEFAULT_NIGHT_DURATION = 90;

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Game state
        this.state = 'menu'; // menu, playing, paused, gameover
        this.running = false;

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fixedDeltaTime = 1000 / 60; // 60 FPS target
        this.accumulator = 0;

        // FPS tracking
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;

        // Prestige system
        this.prestige = {
            level: 0,
            resourceBonus: 0,
            savedResources: { wood: 0, stone: 0, metal: 0, amethyst: 0 }
        };

        // Survival stats
        this.survivalDays = 0;

        // Dev mode
        this.devMode = false;
        this.godMode = false;

        // Multiplayer
        this.networkManager = null;       // set by main.js before any game start
        this._remotePlayers = new Map();  // playerId → RemotePlayer entity
        this._pendingRemotePlayers = [];
        this._pendingRemotePlayerStates = new Map();
        this._backgroundOverworldSimulation = false;
        this.gameMode = GameMode.COOP;
        this.gameModeConfig = getGameModeConfig(this.gameMode);
        this.matchState = createMatchState(this.gameMode);
        this.playerSlot = null;

        // Initialize core systems
        this.input = new Input(canvas);
        this.camera = new Camera(canvas);

        // Resize handling
        this._setupResize();
        this._resize();

        // UI references
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.startButton = document.getElementById('start-button');
        this.restartButton = document.getElementById('restart-button');
        this.levelUpModal = document.getElementById('level-up-modal');
        this.buildingUpgradeModal = null;
        this.selectedUpgradeBuilding = null;
        this.gameOverTitle = document.querySelector('#game-over-screen h1');
        this.survivalTimeEl = document.getElementById('survival-time');
        this.prestigeBonusEl = document.getElementById('prestige-bonus');
        this.prestigeInfoEl = document.getElementById('prestige-info');
        this.crystals = new Map();

        // Dev mode UI
        this.testModeButton = document.getElementById('test-mode-button');
        this.devPanel = document.getElementById('dev-panel');
        this.devToggle = document.getElementById('dev-toggle');

        this._setupUIListeners();
    }

    setGameMode(mode) {
        this.gameMode = normalizeGameMode(mode);
        this.gameModeConfig = getGameModeConfig(this.gameMode);
        this.matchState = createMatchState(this.gameMode);
    }

    getModeRules() {
        return this.gameModeConfig;
    }

    getLocalCrystal() {
        return this.crystal ?? null;
    }

    getCrystalForSlot(slot) {
        return this.crystals.get(slot) ?? null;
    }

    getAllCrystals() {
        if (this.crystals?.size) return [...this.crystals.values()];
        return this.crystal ? [this.crystal] : [];
    }

    getAliveCrystalSlots() {
        return this.getAllCrystals()
            .filter(crystal => crystal.ownerSlot && !crystal.destroyed && crystal.health > 0)
            .map(crystal => crystal.ownerSlot);
    }

    getActiveVersusSlots() {
        if (this.gameMode !== GameMode.VERSUS_FFA) return [];

        const participantIds = new Set();
        const localId = this.networkManager?.playerId ?? null;
        if (localId) {
            participantIds.add(localId);
        } else {
            participantIds.add('player_1');
        }

        for (const id of this._remotePlayers?.keys?.() ?? []) {
            participantIds.add(id);
        }

        for (const id of this._pendingRemotePlayers ?? []) {
            participantIds.add(id);
        }

        return [...participantIds]
            .map(id => this.resolvePlayerSlot(id))
            .filter(slot => VERSUS_SLOT_ORDER.includes(slot))
            .sort((a, b) => VERSUS_SLOT_ORDER.indexOf(a) - VERSUS_SLOT_ORDER.indexOf(b));
    }

    resolvePlayerSlot(playerId = null) {
        if (this.gameMode !== GameMode.VERSUS_FFA) return null;
        return resolveVersusSlot(playerId ?? this.networkManager?.playerId ?? null);
    }

    canPlayerBuildAt(worldX, worldY, playerId = null) {
        if (this.gameMode !== GameMode.VERSUS_FFA) return true;
        const slot = this.resolvePlayerSlot(playerId);
        return this.world?.canBuildAtForSlot(slot, worldX, worldY) ?? false;
    }

    getPlayerIdForSlot(slot) {
        const index = VERSUS_SLOT_ORDER.indexOf(slot);
        if (index < 0) return null;
        return `player_${index + 1}`;
    }

    getRemotePlayers() {
        return [...(this._remotePlayers?.values?.() ?? [])];
    }

    getRemotePlayerById(playerId) {
        return this._remotePlayers?.get?.(playerId) ?? null;
    }

    getRemotePlayerForSlot(slot) {
        const playerId = this.getPlayerIdForSlot(slot);
        return playerId ? this.getRemotePlayerById(playerId) : null;
    }

    isSlotEliminated(slot) {
        if (!slot) return false;
        return this.matchState?.eliminatedSlots?.has(slot) ?? false;
    }

    getHostileRemotePlayersFor(ownerId = null) {
        if (this.gameMode !== GameMode.VERSUS_FFA) return [];

        const ownerSlot = this.resolvePlayerSlot(ownerId ?? this.networkManager?.playerId ?? null);
        return this.getRemotePlayers().filter((remotePlayer) => {
            if (!remotePlayer || remotePlayer.destroyed) return false;
            if (!this._isRemotePlayerVisible(remotePlayer)) return false;

            const targetSlot = this.resolvePlayerSlot(remotePlayer.playerId);
            if (!targetSlot || this.isSlotEliminated(targetSlot)) return false;
            return targetSlot !== ownerSlot;
        });
    }

    applyVersusStructureHit(data) {
        if (this.gameMode !== GameMode.VERSUS_FFA || this.state !== 'playing') return;

        const damage = Math.max(0, Number(data?.damage ?? 0));
        if (damage <= 0) return;

        const attackerId = data?.attackerId ?? data?._from ?? null;
        const attackerSlot = this.resolvePlayerSlot(attackerId);

        if (data?.targetType === 'building') {
            const building = this.buildingSystem?.buildings?.find((b) => b._netId === data?.bId);
            if (!building || building.destroyed) return;

            const ownerSlot = this.resolvePlayerSlot(building.ownerId);
            if (!ownerSlot || !attackerSlot || ownerSlot === attackerSlot) return;
            if (this.isSlotEliminated(ownerSlot) || this.isSlotEliminated(attackerSlot)) return;

            building.takeDamage(damage);
            return;
        }

        if (data?.targetType === 'crystal') {
            const crystal = this.getCrystalForSlot(data?.slot);
            if (!crystal || crystal.destroyed) return;

            const targetSlot = crystal.ownerSlot ?? data?.slot ?? null;
            if (!targetSlot || !attackerSlot || targetSlot === attackerSlot) return;
            if (this.isSlotEliminated(targetSlot) || this.isSlotEliminated(attackerSlot)) return;

            crystal.takeDamage(damage, { type: 'player', playerId: attackerId });
            if (crystal.health <= 0) {
                this.handleCrystalDestroyed(crystal);
            }
        }
    }

    applyVersusPlayerHit(data) {
        if (this.gameMode !== GameMode.VERSUS_FFA || this.state !== 'playing') return;
        if (this.matchState?.localPlayerEliminated) return;

        const attackerId = data?.attackerId ?? data?._from ?? null;
        const attackerSlot = this.resolvePlayerSlot(attackerId);
        if (!attackerSlot || this.isSlotEliminated(attackerSlot)) return;

        const targetSlot = data?.targetSlot ?? this.resolvePlayerSlot(data?.targetId ?? null);
        const localSlot = this.playerSlot ?? this.resolvePlayerSlot();
        if (!targetSlot || this.isSlotEliminated(targetSlot) || targetSlot === attackerSlot) return;

        const damage = Math.max(0, Number(data?.damage ?? 0));
        if (damage <= 0) return;

        if (targetSlot === localSlot) {
            this.player.takeDamage(damage, { type: 'remotePlayer', playerId: attackerId });

            const slowFactor = Math.max(0, Math.min(0.6, Number(data?.slowFactor ?? 0)));
            const slowDuration = Math.max(0, Number(data?.slowDuration ?? 0));
            if (slowFactor > 0 && slowDuration > 0) {
                this.player._enemySlowFactor = Math.max(this.player._enemySlowFactor || 0, slowFactor);
                this.player._enemySlowUntil = Date.now() + (slowDuration * 1000);
            }
            return;
        }

        const remotePlayer = this.getRemotePlayerForSlot(targetSlot);
        if (!remotePlayer) return;

        remotePlayer.health = Math.max(0, remotePlayer.health - damage);
        remotePlayer.flashTimer = 0.12;
    }

    getEconomyCostMultiplier(category = 'general') {
        const economy = this.gameModeConfig?.economy ?? {};
        switch (category) {
            case 'crystalUpgrade':
                return economy.crystalUpgradeCostMultiplier ?? 1;
            case 'building':
                return economy.buildingCostMultiplier ?? 1;
            case 'buildingUpgrade':
                return economy.buildingUpgradeCostMultiplier ?? 1;
            case 'playerUpgrade':
                return economy.playerUpgradeCostMultiplier ?? 1;
            default:
                return 1;
        }
    }

    scaleCost(cost, category = 'general') {
        if (!cost) return null;

        const multiplier = this.getEconomyCostMultiplier(category);
        const scaled = {};

        for (const [resource, amount] of Object.entries(cost)) {
            if (amount <= 0) continue;
            scaled[resource] = multiplier === 1
                ? amount
                : Math.max(1, Math.ceil(amount * multiplier));
        }

        return scaled;
    }

    _getWorldDimensions() {
        if (this.gameMode === GameMode.VERSUS_FFA) {
            return { width: 5376, height: 5376 };
        }
        return { width: 3200, height: 3200 };
    }

    _normalizeStartOptions(devModeOrOptions = false, maybeOptions = null) {
        if (typeof devModeOrOptions === 'object' && devModeOrOptions !== null) {
            return {
                devMode: !!devModeOrOptions.devMode,
                gameMode: normalizeGameMode(devModeOrOptions.gameMode ?? this.gameMode)
            };
        }

        return {
            devMode: !!devModeOrOptions,
            gameMode: normalizeGameMode(maybeOptions?.gameMode ?? this.gameMode)
        };
    }

    _setupResize() {
        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _setupUIListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => this.restartGame());

        // Test mode button
        if (this.testModeButton) {
            this.testModeButton.addEventListener('click', () => this.startGame(true));
        }

        // Dev toggle button
        if (this.devToggle) {
            this.devToggle.addEventListener('click', () => {
                this.devPanel.classList.toggle('hidden');
            });
        }

        // Close dev panel
        const closeDevPanel = document.getElementById('close-dev-panel');
        if (closeDevPanel) {
            closeDevPanel.addEventListener('click', () => {
                this.devPanel.classList.add('hidden');
            });
        }

        // Dev panel action buttons
        const devButtons = document.querySelectorAll('.dev-btn[data-action]');
        devButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleDevAction(btn.dataset.action));
        });

        // Dev panel spawn buttons
        const spawnButtons = document.querySelectorAll('.dev-btn[data-spawn]');
        spawnButtons.forEach(btn => {
            btn.addEventListener('click', () => this.devSpawnEnemy(btn.dataset.spawn));
        });

        // Level up stat choices
        const statChoices = document.querySelectorAll('.stat-choice');
        statChoices.forEach(btn => {
            btn.addEventListener('click', () => {
                const stat = btn.dataset.stat;
                this.applyStatUpgrade(stat);
            });
        });

        // Workbench modal
        this.workbenchModal = document.getElementById('workbench-modal');
        const closeWorkbench = document.getElementById('close-workbench');
        if (closeWorkbench) {
            closeWorkbench.addEventListener('click', () => this.closeWorkbench());
        }

        // Building upgrade modal
        this.buildingUpgradeModal = document.getElementById('building-upgrade-modal');
        this.buildingUpgradeTitleEl = document.getElementById('building-upgrade-title');
        this.buildingUpgradeLevelEl = document.getElementById('building-upgrade-level');
        this.buildingUpgradeEffectsEl = document.getElementById('building-upgrade-effects');
        this.buildingUpgradeCostEl = document.getElementById('building-upgrade-cost');
        this.confirmBuildingUpgradeBtn = document.getElementById('confirm-building-upgrade');
        const closeBuildingUpgrade = document.getElementById('close-building-upgrade');
        const cancelBuildingUpgrade = document.getElementById('cancel-building-upgrade');

        if (closeBuildingUpgrade) {
            closeBuildingUpgrade.addEventListener('click', () => this.closeBuildingUpgradeModal());
        }
        if (cancelBuildingUpgrade) {
            cancelBuildingUpgrade.addEventListener('click', () => this.closeBuildingUpgradeModal());
        }
        if (this.confirmBuildingUpgradeBtn) {
            this.confirmBuildingUpgradeBtn.addEventListener('click', () => this.confirmBuildingUpgrade());
        }
        if (this.buildingUpgradeModal) {
            this.buildingUpgradeModal.addEventListener('click', (e) => {
                if (e.target === this.buildingUpgradeModal) this.closeBuildingUpgradeModal();
            });
        }

        // Tool upgrade buttons
        const upgradeAxe = document.getElementById('upgrade-axe');
        const upgradePickaxe = document.getElementById('upgrade-pickaxe');
        if (upgradeAxe) {
            upgradeAxe.addEventListener('click', () => this.upgradeTool('axe'));
        }
        if (upgradePickaxe) {
            upgradePickaxe.addEventListener('click', () => this.upgradeTool('pickaxe'));
        }
        const upgradeSword = document.getElementById('upgrade-sword');
        if (upgradeSword) {
            upgradeSword.addEventListener('click', () => this.upgradeSword());
        }
        const upgradeBow = document.getElementById('upgrade-bow');
        if (upgradeBow) {
            upgradeBow.addEventListener('click', () => this.upgradeBow());
        }

        // Bow effect choice buttons
        const effectButtons = document.querySelectorAll('.effect-btn');
        effectButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const effect = btn.getAttribute('data-effect');
                this.chooseBowEffect(effect);
            });
        });

        // Time speed buttons
        const timeSpeedButtons = document.querySelectorAll('.time-speed-btn');
        timeSpeedButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);
                this.setTimeSpeed(speed);

                // Update button states
                timeSpeedButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.buildingUpgradeModal && !this.buildingUpgradeModal.classList.contains('hidden')) {
                this.closeBuildingUpgradeModal();
            }
        });
    }

    /**
     * Handle dev panel actions
     */
    handleDevAction(action) {
        switch (action) {
            case 'add-wood':
                this.resourceSystem.addResource('wood', 100);
                break;
            case 'add-stone':
                this.resourceSystem.addResource('stone', 100);
                break;
            case 'add-metal':
                this.resourceSystem.addResource('metal', 100);
                break;
            case 'add-amethyst':
                this.resourceSystem.addResource('amethyst', 100);
                break;
            case 'add-all':
                this.resourceSystem.addResource('wood', 1000);
                this.resourceSystem.addResource('stone', 1000);
                this.resourceSystem.addResource('metal', 1000);
                this.resourceSystem.addResource('amethyst', 1000);
                break;
            case 'upgrade-crystal':
                if (this.crystalUpgradeSystem && !this.crystalUpgradeSystem.isMaxLevel) {
                    this.crystalUpgradeSystem._doUpgrade();
                }
                break;
            case 'add-xp-100':
                this.givePlayerXP(100);
                break;
            case 'add-xp-1000':
                this.givePlayerXP(1000);
                break;
            case 'level-up':
                this.player.pendingLevelUp = true;
                break;
            case 'upgrade-axe':
                if (this.player.toolTiers.axe < 3) this.player.toolTiers.axe++;
                break;
            case 'upgrade-pickaxe':
                if (this.player.toolTiers.pickaxe < 3) this.player.toolTiers.pickaxe++;
                break;
            case 'upgrade-bow':
                if (this.player.bowTier < 5) {
                    this.player.bowTier++;
                    if (this.player.bowTier === 4 && !this.player.bowEffect) {
                        this.player.bowEffect = 'fire'; // Default for dev mode
                    }
                }
                break;
            case 'max-tools':
                this.player.toolTiers.axe = 3;
                this.player.toolTiers.pickaxe = 3;
                this.player.bowTier = 5;
                if (!this.player.bowEffect) this.player.bowEffect = 'fire';
                break;
            case 'heal':
                this.player.health = this.player.maxHealth;
                break;
            case 'kill-all':
                this.entities.filter(e => e.type === 'enemy').forEach(e => e.die());
                break;
            case 'skip-wave':
                this.skipCurrentDayNightPhase();
                break;
            case 'god-mode':
                this.godMode = !this.godMode;
                const godBtn = document.getElementById('god-mode-btn');
                if (godBtn) godBtn.classList.toggle('active', this.godMode);
                break;
        }
    }

    /**
     * Dev shortcut: advance the current day/night phase.
     */
    skipCurrentDayNightPhase() {
        if (!this.dayNight || !this.waveSystem) return;

        const isNetClient = this.networkManager?.inRoom && !this.networkManager.isHost;
        if (isNetClient) return;

        if (this.dayNight.isNight) {
            this.entities.filter(e => e.type === 'enemy').forEach(e => e.die());
            if (this.waveSystem.isWaveActive) {
                this.waveSystem.endWave();
            }

            this.dayNight.currentTime = 0;
            this.dayNight.isNight = false;
            this.dayNight.justBecameNight = false;
            this.dayNight.justBecameDay = true;
            this.dayNight.dayNumber++;
            this.dayNight.updateOverlay();

            this._handleDayStart();
        } else {
            this.dayNight.currentTime = this.dayNight.dayDuration;
            this.dayNight.isNight = true;
            this.dayNight.justBecameNight = true;
            this.dayNight.justBecameDay = false;
            this.dayNight.updateOverlay();

            this._startNightWave();
        }

        this.networkManager?.broadcastFullState?.();
    }

    requestSkipToNight(requestedBy = null) {
        if (!this.dayNight || !this.waveSystem) return false;
        if (this.inCave) {
            if (requestedBy === null) {
                this.showNotification('Indisponible en grotte', 'Revenez en surface pour avancer la journée.', '#ffcc66', 1.8);
            }
            return false;
        }

        const inRoom = !!this.networkManager?.inRoom;
        const isHost = !!this.networkManager?.isHost;
        const requesterId = requestedBy ?? this.networkManager?.playerId ?? 'local';

        if (this.dayNight.isNight) {
            if (requestedBy === null) {
                this.showNotification('Déjà la nuit', 'Le skip de journée est indisponible.', '#ffcc66', 1.5);
            }
            return false;
        }

        if (inRoom && !isHost && requestedBy === null) {
            const now = performance.now();
            if (this._lastSkipToNightRequestAt && now - this._lastSkipToNightRequestAt < 1500) {
                return false;
            }
            this._lastSkipToNightRequestAt = now;
            this.networkManager?.requestSkipToNight();
            this.showNotification('Demande envoyée', 'L’hôte peut lancer la nuit.', '#66d9ff', 1.8);
            return true;
        }

        this.dayNight.currentTime = this.dayNight.dayDuration;
        this.dayNight.isNight = true;
        this.dayNight.justBecameNight = true;
        this.dayNight.justBecameDay = false;
        this.dayNight.updateOverlay();

        this._startNightWave();

        if (inRoom) {
            this.networkManager?.broadcastFullState?.();
        }

        if (requestedBy === null) {
            this.showNotification('Nuit avancée', 'La vague commence immédiatement.', '#ff9966', 1.6);
        } else if (isHost && requesterId !== (this.networkManager?.playerId ?? requesterId)) {
            this.showNotification('Nuit demandée', `${requesterId} a lancé la nuit.`, '#66d9ff', 1.6);
        }

        return true;
    }

    _startNightWave() {
        if (!this.waveSystem || !this.dayNight?.isNight) return;

        if (!this.waveSystem.isWaveActive) {
            this.waveSystem.startWave();
            this.survivalDays++;
        }

        this.networkManager?.broadcastWaveUpdate(this.waveSystem.currentWave, true);
    }

    _handleDayStart() {
        this.objectiveSystem?.onNewDay(this.survivalDays);
        this.networkManager?.broadcastWaveUpdate(this.waveSystem?.currentWave ?? 0, false);
    }

    /**
     * Spawn enemy for dev testing
     */
    devSpawnEnemy(type) {
        const Enemy = this.entities.find(e => e.type === 'enemy')?.constructor ||
            (async () => (await import('../entities/Enemy.js')).Enemy)();

        // Spawn near player
        const angle = Math.random() * Math.PI * 2;
        const dist = 150;
        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;

        import('../entities/Enemy.js').then(module => {
            const enemy = new module.Enemy(this, x, y, type);
            this.addEntity(enemy);
        });
    }

    /**
     * Set time speed multiplier (for dev mode)
     */
    setTimeSpeed(speed) {
        if (this.dayNight) {
            this.dayNight.timeSpeed = speed;
            console.log(`[DEV] Time speed set to ${speed}x`);
        }
    }

    /**
     * Initialize all game systems for a new game
     */
    init() {
        console.log('[GAME] Starting initialization...');
        // Load sprites (async but non-blocking)
        spriteManager.loadAll().then(() => {
            console.log('[GAME] Sprites loaded successfully');
        }).catch(err => {
            console.error('[GAME] Error loading sprites:', err);
        });

        // Entities MUST be initialized BEFORE World, as World.generateResources() pushes to entities
        console.log('[GAME] Initializing entities arrays...');
        this.entities    = [];
        this.projectiles = [];
        this.particles   = [];
        this.groundMarks = [];  // persistent decals (blood, scorch, frost)
        this.crystals    = new Map();

        // Night lighting offscreen canvas (recreated on resize)
        this._lightCanvas = document.createElement('canvas');
        this._lightCtx    = this._lightCanvas.getContext('2d');

        // Flush remote players that joined while in the lobby (before game start)
        this._remotePlayers = new Map();
        if (this._pendingRemotePlayers?.length) {
            for (const id of this._pendingRemotePlayers) this.addRemotePlayer(id);
            this._pendingRemotePlayers = [];
        }

        this.playerSlot = this.resolvePlayerSlot();

        // World generation (optimized size for performance)
        console.log('[GAME] Generating world...');
        const worldDimensions = this._getWorldDimensions();
        this.world = new World(this, worldDimensions.width, worldDimensions.height, {
            mode: this.gameMode
        });
        console.log('[GAME] World generated successfully');

        // Day/Night cycle (3 minutes total: 90s day, 90s night)
        this.dayNight = new DayNightCycle(DEFAULT_DAY_DURATION, DEFAULT_NIGHT_DURATION);

        // Visual effects system
        this.visualEffects = new VisualEffects(this);

        // Systems
        this.resourceSystem = new ResourceSystem(this);
        this.collisionSystem = new CollisionSystem(this);
        this.buildingSystem = new BuildingSystem(this);
        this.combatSystem = new CombatSystem(this);
        this.waveSystem = new WaveSystem(this);

        // Extended systems
        this.audioSystem = new AudioSystem(this);
        this.eventSystem = new EventSystem(this);
        this.artifactSystem = new ArtifactSystem(this);
        this.objectiveSystem = new ObjectiveSystem(this);
        this.challengeSystem = new ChallengeSystem(this);
        this.crystalUpgradeSystem = new CrystalUpgradeSystem(this);

        // Cave system
        this.currentCave    = null;
        this.inCave         = false;
        this._currentCaveId = null; // Shared deterministic ID, synced via PLAYER_UPDATE
        this.overworldEntities = null;
        this.overworldProjectiles = null;
        this.overworldPlayerPos = null; // Save position when entering cave
        this.loadingScreen = false;
        this.loadingText = '';

        // Player spawns at center
        const centerX = this.world.width / 2;
        const centerY = this.world.height / 2;
        const spawnPoint = this.world.getSpawnPointForSlot(this.playerSlot) ?? { x: centerX, y: centerY };

        this.player = new Player(this, spawnPoint.x, spawnPoint.y);
        this.entities.push(this.player);

        // Crystals
        this._spawnCrystals();

        // Spawn cave entrances around the map
        this.spawnCaveEntrances();

        // Apply prestige bonuses
        if (this.prestige.level > 0) {
            this.resourceSystem.addResource('wood', this.prestige.savedResources.wood);
            this.resourceSystem.addResource('stone', this.prestige.savedResources.stone);
            this.resourceSystem.addResource('metal', this.prestige.savedResources.metal);
            this.resourceSystem.addResource('amethyst', this.prestige.savedResources.amethyst);
        }

        // Camera setup
        this.camera.setWorldBounds(this.world.width, this.world.height);
        this.camera.setPosition(spawnPoint.x, spawnPoint.y);

        // UI
        console.log('[GAME] Initializing UI...');
        this.hud = new HUD(this);
        this.minimap = new Minimap(this);
        this.buildMenu = new BuildMenu(this);

        // Reset survival days
        this.survivalDays = 0;
        console.log('[GAME] Initialization complete!');
    }

    _spawnCrystals() {
        if (this.gameMode === GameMode.VERSUS_FFA && this.world?.arenaData?.slots) {
            const crystalColors = {
                north: '#7dd3fc',
                east: '#fca5a5',
                south: '#86efac',
                west: '#fcd34d'
            };

            const activeSlots = this.getActiveVersusSlots();
            for (const slot of activeSlots) {
                const point = this.world.getCrystalPointForSlot(slot);
                if (!point) continue;

                const crystal = new Crystal(this, point.x, point.y, {
                    ownerSlot: slot,
                    isLocalCrystal: slot === this.playerSlot,
                    color: crystalColors[slot] ?? null
                });
                this.crystals.set(slot, crystal);
                this.entities.push(crystal);

                if (slot === this.playerSlot) {
                    this.crystal = crystal;
                }
            }

            if (!this.crystal) {
                this.crystal = this.crystals.get(this.playerSlot) ?? this.crystals.get(activeSlots[0]) ?? null;
            }
            return;
        }

        const centerX = this.world.width / 2;
        const centerY = this.world.height / 2;
        this.crystal = new Crystal(this, centerX, centerY - 64, {
            isLocalCrystal: true
        });
        this.crystals.set('local', this.crystal);
        this.entities.push(this.crystal);
    }

    /**
     * Spawn cave entrances around the map
     */
    spawnCaveEntrances() {
        if (this.world?.supportsCaves === false) return;

        const centerX = this.world.width / 2;
        const centerY = this.world.height / 2;
        const cavePoints = this.world.getCaveSpawnPoints?.();

        if (cavePoints && cavePoints.length > 0) {
            for (const point of cavePoints) {
                const entrance = new CaveEntrance(this, point.x, point.y, point.difficulty);
                this.entities.push(entrance);
            }
            return;
        }

        const numCaves = 5;

        for (let i = 0; i < numCaves; i++) {
            // Spawn in a ring around the center
            const angle = (Math.PI * 2 / numCaves) * i + Math.random() * 0.5;
            const dist = 600 + Math.random() * 800;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            // Difficulty increases with distance
            const difficulty = Math.min(5, 1 + Math.floor(dist / 400));

            const entrance = new CaveEntrance(this, x, y, difficulty);
            this.entities.push(entrance);
        }
    }

    /**
     * Start a new game (with optional dev mode)
     */
    startGame(devModeOrOptions = false, maybeOptions = null) {
        const options = this._normalizeStartOptions(devModeOrOptions, maybeOptions);
        this.devMode = options.devMode;
        this.setGameMode(options.gameMode);
        this.startScreen?.classList.add('hidden');
        this.gameOverScreen?.classList.add('hidden');
        document.getElementById('lobby-screen')?.classList.add('hidden');
        // Generate world seed; broadcast to clients if in multiplayer
        this._worldSeed = Math.floor(Math.random() * 1e9);
        Utils.seed(this._worldSeed);
        this.networkManager?.broadcastWorldSeed(this._worldSeed);
        this.init();

        // Dev mode setup
        if (this.devMode) {
            this.devToggle.classList.remove('hidden');
            // Give starter resources in test mode
            this.resourceSystem.addResource('wood', 500);
            this.resourceSystem.addResource('stone', 500);
            this.resourceSystem.addResource('metal', 200);
            this.resourceSystem.addResource('amethyst', 100);
        } else {
            this.devToggle.classList.add('hidden');
            this.devPanel.classList.add('hidden');
        }

        this.state = 'playing';
        console.log('[GAME] Starting game loop...');
        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));
            console.log('[GAME] Game loop started!');
        }
    }

    /**
     * Restart after game over
     */
    restartGame() {
        // Calculate prestige
        if (this.gameModeConfig.usesPrestige) {
            this.calculatePrestige();
        }
        this.startGame({ gameMode: this.gameMode });
    }

    // ── Multiplayer: called by NetworkManager / main.js ───────────────────────

    /**
     * Client receives GAME_START from host — start as non-host.
     */
    startNetworkGame(seed, options = null) {
        document.getElementById('lobby-screen')?.classList.add('hidden');
        this.startScreen?.classList.add('hidden');
        this.setGameMode(options?.gameMode ?? this.gameMode);
        Utils.seed(seed ?? Date.now());
        this.init();

        // Clients don't drive the wave system — disable spawning
        if (this.waveSystem) this.waveSystem._networkClient = true;

        this.state = 'playing';
        if (!this.running) {
            this.running  = true;
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    /**
     * Add a remote player entity.
     * Safe to call before or after game starts (entity is queued until init).
     */
    addRemotePlayer(id) {
        if (this._remotePlayers.has(id)) return;

        // If game hasn't started yet, defer entity creation
        if (!this.entities) {
            this._pendingRemotePlayers = this._pendingRemotePlayers ?? [];
            if (!this._pendingRemotePlayers.includes(id)) {
                this._pendingRemotePlayers.push(id);
            }
            this._onLobbyPlayerJoined?.(id);
            return;
        }

        // RemotePlayer is statically imported — creation is synchronous.
        // Previously used a dynamic import() which left _remotePlayers empty for
        // several frames (until the microtask resolved), making remote players invisible.
        const rp = new RemotePlayer(this, id);
        const pendingState = this._pendingRemotePlayerStates.get(id);
        if (pendingState) {
            rp.applyState(pendingState);
            this._pendingRemotePlayerStates.delete(id);
        }
        this._remotePlayers.set(id, rp);

        this._onLobbyPlayerJoined?.(id);
    }

    removeRemotePlayer(id) {
        this._remotePlayers.delete(id);
        this._pendingRemotePlayerStates.delete(id);
        if (this._pendingRemotePlayers?.length) {
            this._pendingRemotePlayers = this._pendingRemotePlayers.filter(pid => pid !== id);
        }
        this._onLobbyPlayerLeft?.(id);
    }

    updateRemotePlayer(id, data) {
        const rp = this._remotePlayers.get(id);
        if (rp) {
            rp.applyState(data);
            return;
        }

        this._pendingRemotePlayerStates.set(id, data);
        this.addRemotePlayer(id);
    }

    /**
     * Returns active players in current session (solo = 1, multiplayer max = 4).
     */
    getActivePlayerCount() {
        if (!this.networkManager?.inRoom) return 1;
        const remoteCount = this._remotePlayers?.size ?? 0;
        return Math.max(1, Math.min(4, 1 + remoteCount));
    }

    /**
     * Calculate prestige bonuses based on survival time
     */
    calculatePrestige() {
        const bonus = Math.min(50, this.survivalDays * 2); // Max 50% bonus
        this.prestige.level++;
        this.prestige.resourceBonus = bonus;

        // Save percentage of resources
        const savePercent = bonus / 100;
        this.prestige.savedResources = {
            wood: Math.floor(this.resourceSystem.resources.wood * savePercent),
            stone: Math.floor(this.resourceSystem.resources.stone * savePercent),
            metal: Math.floor(this.resourceSystem.resources.metal * savePercent),
            amethyst: Math.floor(this.resourceSystem.resources.amethyst * savePercent)
        };
    }

    /**
     * End the game (crystal destroyed)
     */
    gameOver(details = null) {
        const reason = details?.reason ?? this.matchState?.defeatReason ?? 'unknown';
        this.state = 'gameover';

        if (this.gameOverTitle) {
            if (reason === 'victory') {
                this.gameOverTitle.textContent = 'VICTOIRE';
            } else if (reason === 'crystal_destroyed' && this.gameModeConfig.supportsElimination) {
                this.gameOverTitle.textContent = 'ÉLIMINÉ';
            } else {
                this.gameOverTitle.textContent = 'GAME OVER';
            }
        }

        if (this.survivalTimeEl) {
            this.survivalTimeEl.textContent = this._getGameOverMessage(reason);
        }

        if (this.prestigeInfoEl) {
            this.prestigeInfoEl.classList.toggle('hidden', !this.gameModeConfig.usesPrestige);
        }
        if (this.prestigeBonusEl && this.gameModeConfig.usesPrestige) {
            this.prestigeBonusEl.textContent = `${Math.min(50, this.survivalDays * 2)}%`;
        }

        this.gameOverScreen.classList.remove('hidden');
    }

    _getGameOverMessage(reason) {
        if (reason === 'victory') {
            return 'Dernier cristal en vie. Victoire !';
        }
        if (reason === 'last_player_standing') {
            return 'Un autre joueur est le dernier survivant.';
        }
        if (reason === 'crystal_destroyed' && this.gameModeConfig.supportsElimination) {
            return 'Votre cristal a explosé. Vous êtes éliminé.';
        }
        if (reason === 'crystal_destroyed') {
            return `Votre cristal a été détruit après ${this.survivalDays} jours`;
        }
        return `Vous avez survécu ${this.survivalDays} jours`;
    }

    evaluateVersusVictoryState() {
        if (this.gameMode !== GameMode.VERSUS_FFA || this.state !== 'playing') return;
        if (this.matchState.matchEnded) return;

        const activeSlots = this.getActiveVersusSlots();
        if (activeSlots.length === 0) return;

        const aliveSlots = activeSlots.filter((slot) => !this.isSlotEliminated(slot));
        if (aliveSlots.length > 1) return;

        const winnerSlot = aliveSlots[0] ?? null;
        this.matchState.matchEnded = true;
        this.matchState.winnerSlot = winnerSlot;

        if (winnerSlot && winnerSlot === this.playerSlot && !this.matchState.localPlayerEliminated) {
            this.matchState.defeatReason = 'victory';
            this.gameOver({ reason: 'victory' });
            return;
        }

        if (!this.matchState.localPlayerEliminated) {
            this.matchState.defeatReason = 'last_player_standing';
            this.gameOver({ reason: 'last_player_standing' });
        }
    }

    applyRespawnPenalty() {
        if (!this.resourceSystem?.resources) return null;

        const penalties = {
            wood: 0.2,
            stone: 0.2,
            metal: 0.15,
            amethyst: 0.1
        };

        const lost = {};
        for (const [type, ratio] of Object.entries(penalties)) {
            const current = Math.max(0, Math.floor(this.resourceSystem.resources[type] ?? 0));
            if (current <= 0) continue;

            const amount = Math.floor(current * ratio);
            if (amount <= 0) continue;

            this.resourceSystem.resources[type] = Math.max(0, current - amount);
            lost[type] = amount;
        }

        this.resourceSystem.updateUI?.();
        return Object.keys(lost).length > 0 ? lost : null;
    }

    getRespawnPointNearCrystal(crystal) {
        const fallback = { x: crystal.x, y: crystal.y + 96 };
        if (!this.world) return fallback;

        const radii = [96, 128, 160, 192];
        for (const radius of radii) {
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                const x = crystal.x + Math.cos(angle) * radius;
                const y = crystal.y + Math.sin(angle) * radius;
                if (!this.world.isPassable(x, y)) continue;

                const blockedByBuilding = this.buildingSystem?.buildings?.some((building) => {
                    if (!building?.solid || building.destroyed) return false;
                    const minDist = (building.collisionRadius || 0) + (this.player?.collisionRadius || 16) + 8;
                    return Utils.distance(x, y, building.x, building.y) < minDist;
                });

                if (!blockedByBuilding) return { x, y };
            }
        }

        return fallback;
    }

    handleLocalPlayerDeath(player = this.player) {
        if (this.state !== 'playing' || !player) return;

        if (this.gameMode === GameMode.VERSUS_FFA && this.matchState.localCrystalDestroyed) {
            this.matchState.localPlayerEliminated = true;
            this.matchState.defeatReason = 'crystal_destroyed';
            this.gameOver({ reason: 'crystal_destroyed' });
            return;
        }

        if (this.gameModeConfig.respawnOnPlayerDeath && !this.matchState.localPlayerEliminated) {
            const lost = this.applyRespawnPenalty();
            this.respawnLocalPlayer(player);

            if (lost) {
                const lossText = Object.entries(lost)
                    .map(([type, amount]) => `${amount} ${type}`)
                    .join(' · ');
                this.showNotification('Respawn', `Pénalité ressources: ${lossText}`, '#ffbb66', 2.2);
            }
            return;
        }

        this.matchState.defeatReason = 'player_death';
        this.gameOver({ reason: 'player_death' });
    }

    handleCrystalDestroyed(crystal = this.getLocalCrystal()) {
        if (this.state !== 'playing' || !crystal) return;

        const slot = crystal.ownerSlot ?? 'local';
        if (this.matchState.eliminatedSlots.has(slot)) return;

        this.matchState.eliminatedSlots.add(slot);
        crystal.triggerDestruction?.();
        crystal.destroyed = true;

        if (slot && slot !== this.playerSlot && slot !== 'local') {
            this.showNotification('Cristal détruit', `${slot.toUpperCase()} est éliminé.`, '#ff8899', 1.8);
        }

        if (crystal === this.getLocalCrystal() || slot === this.playerSlot || slot === 'local') {
            this.matchState.localCrystalDestroyed = true;
            this.matchState.localPlayerEliminated = true;
            this.matchState.defeatReason = 'crystal_destroyed';
            this.gameOver({ reason: 'crystal_destroyed' });
            return;
        }

        this.evaluateVersusVictoryState();
    }

    respawnLocalPlayer(player = this.player) {
        const crystal = this.getLocalCrystal();
        if (!player || !crystal) {
            this.matchState.defeatReason = 'player_death';
            this.gameOver({ reason: 'player_death' });
            return;
        }

        player.health = player.maxHealth;
        player.vx = 0;
        player.vy = 0;
        player.invincibleTime = 2;

        const respawnPoint = this.getRespawnPointNearCrystal(crystal);
        player.x = respawnPoint.x;
        player.y = respawnPoint.y;
    }

    /**
     * Main game loop
     */
    gameLoop(currentTime) {
        if (!this.running) {
            console.log('[GAME] Game loop stopped - running is false');
            return;
        }

        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Cap delta time to prevent spiral of death
        if (this.deltaTime > 100) this.deltaTime = 100;

        // FPS calculation
        this.frameCount++;
        this.fpsTimer += this.deltaTime;
        if (this.fpsTimer >= 1000) {
            this.fps = this.frameCount;

            // Update performance mode based on FPS
            if (this.visualEffects) {
                this.visualEffects.updatePerformanceMode(this.fps);
            }

            // FPS logged only in dev mode
            if (this.devMode) console.log(`[GAME] FPS: ${this.fps} | Entities: ${this.entities.length}`);
            this.frameCount = 0;
            this.fpsTimer = 0;
        }

        // Fixed timestep for physics
        this.accumulator += this.deltaTime;
        while (this.accumulator >= this.fixedDeltaTime) {
            this.fixedUpdate(this.fixedDeltaTime / 1000);
            this.accumulator -= this.fixedDeltaTime;
        }

        // Variable timestep for rendering
        this.update(this.deltaTime / 1000);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Fixed timestep update (physics, collisions)
     */
    fixedUpdate(dt) {
        if (this.state !== 'playing') return;

        // Apply time scale from visual effects (slow-motion)
        const effectiveDt = dt * this.visualEffects.timeScale;

        // Update input world position
        this.input.updateWorldPosition(this.camera);

        // Handle zoom
        if (this.input.mouse.wheel !== 0) {
            this.camera.adjustZoom(this.input.mouse.wheel);
        }

        // Check for build menu toggle
        if (this.input.isActionJustPressed('buildMenu')) {
            this.buildMenu.toggle();
        }

        // Building upgrade click flow (modal)
        if (!this.inCave && this.handleBuildingUpgradeClick()) {
            this.input.endFrame();
            return;
        }

        // Day/night always advances — even when the host is in a cave.
        // Previously, entering a cave froze the cycle for all clients.
        const isNetClient = this.networkManager?.inRoom && !this.networkManager.isHost;
        if (!isNetClient) {
            this.dayNight.update(dt);
            if (this.dayNight.justBecameNight) {
                this._startNightWave();
            }
            if (this.dayNight.justBecameDay) {
                this._handleDayStart();
            }
        }

        // Overworld simulation stays authoritative even while the local player
        // is inside a cave, so waves never wait for a return to the surface.
        if (!isNetClient) {
            if (this.inCave) {
                this._runOverworldSimulation(dt, effectiveDt);
            } else {
                this.waveSystem.update(dt);
                this.eventSystem.update(dt, this.survivalDays);
            }
        }

        // Update visual effects
        this.visualEffects.update(dt);

        // Artifact passive effects
        this.artifactSystem?.update(dt);

        // Update entities (with time scale applied)
        for (const entity of this.entities) {
            entity.update(effectiveDt);
        }

        // Remote players are managed outside the entity array so they update
        // regardless of overworld/cave swaps.
        for (const rp of this._remotePlayers.values()) {
            rp.update(effectiveDt);
        }

        // Update projectiles (with time scale applied)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(effectiveDt);
            if (this.projectiles[i].destroyed) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update particles (with time scale applied)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(effectiveDt);
            if (this.particles[i].destroyed) {
                this.particles.splice(i, 1);
            }
        }

        // Collision detection and building logic only apply to the active
        // surface simulation. When in a cave, the surface already ran above.
        if (!this.inCave) {
            this.collisionSystem.update();
            this.buildingSystem.update(effectiveDt);
        }

        // Crystal upgrade system (aura at level 5, etc.)
        this.crystalUpgradeSystem?.update(effectiveDt);

        // Boss entrance flash timer (use real dt so it isn't frozen by timeScale)
        if (this._bossFlashTimer > 0) this._bossFlashTimer -= dt;

        // Ground marks (persistent decals)
        if (this.groundMarks) {
            for (let i = this.groundMarks.length - 1; i >= 0; i--) {
                this.groundMarks[i].update(effectiveDt);
                if (this.groundMarks[i].destroyed) this.groundMarks.splice(i, 1);
            }
        }

        // Clean up dead entities
        this.entities = this.entities.filter(e => !e.destroyed);
        // Purge destroyed enemies from the network registry so stale entries
        // never block resync re-spawns on client, or leak memory on host.
        this.networkManager?.cleanNetEnemies?.();

        // Cave update (check exit interaction, etc.)
        if (this.inCave && this.currentCave) {
            this.currentCave.update(dt);
        }

        // Crystal destruction and player death can happen while the player is
        // underground; the cave must not pause overworld danger.
        const shouldEvaluateCrystalHealth = !this.networkManager?.inRoom || !!this.networkManager?.isHost;
        for (const crystal of this.getAllCrystals()) {
            if (!shouldEvaluateCrystalHealth) continue;

            const slot = crystal.ownerSlot ?? 'local';
            if (!this.matchState.eliminatedSlots.has(slot) && crystal.health <= 0) {
                this.handleCrystalDestroyed(crystal);
            }
        }

        this.evaluateVersusVictoryState();

        if (this.state === 'playing' && this.player?.health <= 0) {
            this.handleLocalPlayerDeath(this.player);
        }

        // Check for pending level up
        if (this.player.pendingLevelUp && this.levelUpModal) {
            this.showLevelUpModal();
        }

        // Check for workbench and crystal interactions (only in overworld)
        if (!this.inCave) {
            const crystalConsumed = this.checkCrystalInteraction();
            if (!crystalConsumed) this.checkWorkbenchInteraction();
        }

        // End input frame
        this.input.endFrame();

        // Network tick (send player state, enemy batches, crystal health)
        if (this.networkManager?.ready) {
            this.networkManager.tick(dt);
        }
    }

    /**
     * Variable timestep update (animations, camera)
     */
    update(dt) {
        if (this.state !== 'playing') return;

        // Camera follows player
        this.camera.follow(this.player.x, this.player.y);
        this.camera.update(dt);

        // Update HUD
        this.hud.update(dt);
    }

    /**
     * Render all game elements
     */
    render() {
        const ctx = this.ctx;

        // Clear canvas
        ctx.fillStyle = this.inCave ? '#0a0a15' : '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'menu') return;

        // Loading screen
        if (this.loadingScreen) {
            this.renderLoadingScreen(ctx);
            return;
        }

        // Apply camera transform
        this.camera.applyTransform(ctx);

        // Render world or cave
        if (this.inCave && this.currentCave) {
            this.currentCave.render(ctx, this.camera);
        } else {
            this.world.render(ctx, this.camera);
            // Ground decals above terrain, below buildings
            if (this.groundMarks) {
                for (const mark of this.groundMarks) mark.render(ctx);
            }
            // Render buildings (only in overworld)
            this.buildingSystem.render(ctx);
        }

        // Render entities sorted by Y for depth (sort in-place on a reused array).
        // Include visible remote players in the depth sort for correct layering.
        if (!this._renderSorted) this._renderSorted = [];
        const rs = this._renderSorted;
        rs.length = 0;
        for (const e of this.entities) rs.push(e);
        for (const rp of this._remotePlayers.values()) {
            if (this._isRemotePlayerVisible(rp)) rs.push(rp);
        }
        rs.sort((a, b) => a.y - b.y);
        for (const entity of rs) {
            entity.render(ctx);
        }

        // Render projectiles
        for (const projectile of this.projectiles) {
            projectile.render(ctx);
        }

        // Render particles
        for (const particle of this.particles) {
            particle.render(ctx);
        }

        // Render visual effects (world-space: weakness indicators)
        this.visualEffects.renderWorld(ctx);

        // Render building preview (only in overworld)
        if (!this.inCave && this.buildingSystem.isPlacing) {
            this.buildingSystem.renderPreview(ctx);
        }

        // Reset camera transform
        this.camera.resetTransform(ctx);

        // Render visual effects (screen-space: damage flash)
        this.visualEffects.render(ctx);

        // Boss entrance red flash
        if (this._bossFlashTimer > 0) {
            const alpha = Math.min(0.45, this._bossFlashTimer * 0.45);
            ctx.fillStyle = `rgba(200, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Apply day/night overlay (only in overworld)
        if (!this.inCave) {
            this.dayNight.render(ctx, this.canvas.width, this.canvas.height);
        } else {
            // Cave darkness overlay
            ctx.fillStyle = 'rgba(0, 0, 20, 0.3)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Render minimap (only in overworld)
        if (!this.inCave) {
            this.minimap.render();
        }

        // Event system world-space render (caravan NPC, etc.)
        if (!this.inCave && this.eventSystem) {
            this.camera.applyTransform(ctx);
            this.eventSystem.render(ctx);
            this.camera.resetTransform(ctx);
        }

        // HUD render (objectives, artifacts)
        if (this.objectiveSystem) this.objectiveSystem.render?.(ctx);
        if (this.artifactSystem) this.artifactSystem.renderHUD?.(ctx);

        // Cave indicator
        if (this.inCave) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(10, 10, 120, 30);
            ctx.fillStyle = '#66ccff';
            ctx.font = 'bold 14px Rajdhani';
            ctx.textAlign = 'left';
            ctx.fillText(`🕳️ CAVE Lv.${this.currentCave.difficulty}`, 20, 30);
        }

        // Debug: FPS counter and level
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${this.fps} | Lv.${this.player.level}`, 10, this.canvas.height - 10);
    }

    /**
     * Dynamic night lighting with offscreen light mask.
     * During day (overlayAlpha ≤ 0.01) falls back to the original flat overlay.
     * At night, renders darkness with radial light cones punched out via destination-out.
     */
    _renderNightLighting(ctx) {
        const dn = this.dayNight;
        const alpha = dn.overlayAlpha;

        if (alpha <= 0.01) return;

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Night: use light mask
        if (dn.isNight && alpha > 0.15) {
            const lc = this._lightCanvas;
            const lx = this._lightCtx;

            if (lc.width !== W || lc.height !== H) {
                lc.width  = W;
                lc.height = H;
            }

            // Fill with darkness
            lx.globalCompositeOperation = 'source-over';
            lx.globalAlpha = 1;
            lx.fillStyle = `rgba(${dn.nightColor.r}, ${dn.nightColor.g}, ${dn.nightColor.b}, ${alpha})`;
            lx.fillRect(0, 0, W, H);

            // Punch light holes
            lx.globalCompositeOperation = 'destination-out';

            const addLight = (worldX, worldY, radius, softEdge = 0.5) => {
                const s = this.camera.worldToScreen(worldX, worldY);
                const grad = lx.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius);
                grad.addColorStop(0,          `rgba(0,0,0,${alpha})`);
                grad.addColorStop(softEdge,   `rgba(0,0,0,${alpha * 0.7})`);
                grad.addColorStop(1,          'rgba(0,0,0,0)');
                lx.fillStyle = grad;
                lx.beginPath();
                lx.arc(s.x, s.y, radius, 0, Math.PI * 2);
                lx.fill();
            };

            // Player light
            if (this.player && !this.player.destroyed) {
                addLight(this.player.x, this.player.y, 140, 0.45);
            }

            // Crystal light (larger)
            for (const crystal of this.getAllCrystals()) {
                if (crystal.destroyed) continue;
                const localCrystal = crystal === this.crystal;
                const r = localCrystal
                    ? 110 + (this.crystalUpgradeSystem?.level ?? 0) * 15
                    : 90;
                addLight(crystal.x, crystal.y, r, 0.5);
            }

            // Turrets & torches emit small light cones
            for (const b of this.buildingSystem.buildings) {
                if (b.destroyed) continue;
                if (b.type === 'turret') {
                    addLight(b.x, b.y, 70 + (b.range || 0) * 0.08, 0.6);
                } else if (b.type === 'healingShrine' || b.type === 'watchtower') {
                    addLight(b.x, b.y, 55, 0.6);
                }
            }

            // Remote players
            for (const rp of this._remotePlayers.values()) {
                if (!rp.destroyed) addLight(rp.x, rp.y, 110, 0.5);
            }

            lx.globalCompositeOperation = 'source-over';

            ctx.drawImage(lc, 0, 0);
        } else {
            // Dawn/dusk: plain tinted overlay (no harsh darkness yet)
            dn.render(ctx, W, H);
        }
    }

    /**
     * Dramatic boss entrance: freeze, zoom-out, red flash, notification.
     * Visual-only — no game-state changes, runs on all clients independently.
     */
    _triggerBossEntrance(boss) {
        if (!boss) return;
        this.audioSystem?.playBossAlert?.();

        // Freeze all AI for 1.5s (visual freeze: slow time)
        this.visualEffects?.setTimeScale?.(0.05, 1.5);

        // Camera shake + zoom-out
        this.camera.shake(25, 1.2, true);
        if (this.camera.zoom !== undefined) {
            const origZoom = this.camera.zoom;
            this.camera.zoom = Math.max(0.4, origZoom * 0.55);
            setTimeout(() => { if (this.camera) this.camera.zoom = origZoom; }, 1800);
        }

        // Red screen flash
        this._bossFlashTimer = 1.0;

        // Boss name notification
        const bossName = boss.config?.name ?? 'BOSS';
        this.showNotification(`☠ ${bossName}`, 'Un boss approche !', '#ff2222', 4);

        // Broadcast to multiplayer clients if host
        const nm = this.networkManager;
        if (nm?.isHost && nm.inRoom && boss._netId) {
            nm._relay({ type: 'BOSS_ENTRANCE', netId: boss._netId, bossType: boss.enemyType });
        }
    }

    /**
     * Render loading screen
     */
    renderLoadingScreen(ctx) {
        // Background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Loading text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(this.loadingText, this.canvas.width / 2, this.canvas.height / 2 - 30);

        // Progress bar
        const barWidth = 300;
        const barHeight = 20;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = this.canvas.height / 2;

        // Bar background
        ctx.fillStyle = '#333344';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Bar fill
        const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        gradient.addColorStop(0, '#00d4ff');
        gradient.addColorStop(1, '#9966ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * this.loadingProgress, barHeight);

        // Bar border
        ctx.strokeStyle = '#666688';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Progress percentage
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Rajdhani';
        ctx.fillText(`${Math.floor(this.loadingProgress * 100)}%`, this.canvas.width / 2, barY + barHeight + 25);
    }

    _withOverworldContext(callback) {
        if (!this.inCave || !this.overworldEntities || !this.overworldPlayerPos) {
            return callback();
        }

        const snapshot = {
            entities: this.entities,
            projectiles: this.projectiles,
            inCave: this.inCave,
            playerX: this.player.x,
            playerY: this.player.y
        };

        this.entities = this.overworldEntities;
        this.projectiles = this.overworldProjectiles ?? [];
        this.inCave = false;
        this._backgroundOverworldSimulation = true;
        this.player.x = this.overworldPlayerPos.x;
        this.player.y = this.overworldPlayerPos.y;

        try {
            callback();
            this.overworldEntities = this.entities.filter(entity => entity !== this.player);
            this.overworldProjectiles = this.projectiles;
            this.overworldPlayerPos = { x: this.player.x, y: this.player.y };
        } finally {
            this.entities = snapshot.entities;
            this.projectiles = snapshot.projectiles;
            this.inCave = snapshot.inCave;
            this._backgroundOverworldSimulation = false;
            this.player.x = snapshot.playerX;
            this.player.y = snapshot.playerY;
        }
    }

    canProcessWorldInteractionInput() {
        return !this.loadingScreen && !this._backgroundOverworldSimulation;
    }

    _runOverworldSimulation(dt, effectiveDt) {
        this._withOverworldContext(() => {
            this.waveSystem.update(dt);
            this.eventSystem.update(dt, this.survivalDays);

            for (const entity of this.entities) {
                entity.update(effectiveDt);
            }

            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                this.projectiles[i].update(effectiveDt);
                if (this.projectiles[i].destroyed) {
                    this.projectiles.splice(i, 1);
                }
            }

            this.collisionSystem.update();
            this.buildingSystem.update(effectiveDt);
            this.entities = this.entities.filter(entity => !entity.destroyed);
            this.networkManager?.cleanNetEnemies?.();
        });
    }

    getNetworkEnemyEntities() {
        if (this.inCave && Array.isArray(this.overworldEntities)) {
            return this.overworldEntities.filter(entity => entity.type === 'enemy');
        }
        return this.getEnemies();
    }

    /**
     * Add an entity to the game
     */
    addEntity(entity) {
        if (this.inCave && entity?._scene === 'overworld') {
            if (!Array.isArray(this.overworldEntities)) {
                this.overworldEntities = this.entities.filter(current => current !== this.player);
            }
            this.overworldEntities.push(entity);
            return;
        }
        this.entities.push(entity);
    }

    /**
     * Add a projectile
     */
    addProjectile(projectile) {
        this.projectiles.push(projectile);
        // Broadcast authoritative local projectiles so other clients see the visual.
        // In versus we also relay owner-side turret shots.
        const shouldBroadcast = !projectile._visualOnly && this.networkManager?.inRoom && (
            projectile.owner === this.player ||
            projectile.owner?.type === 'turret' ||
            projectile.owner?.ownerId ||
            projectile.ownerId
        );
        if (shouldBroadcast) {
            this.networkManager?.onProjectileSpawned(projectile);
        }
    }

    /**
     * Add a particle effect
     */
    addParticle(particle) {
        this.particles.push(particle);
    }

    /**
     * Add a persistent ground decal (blood, scorch, frost, explosion, boss)
     */
    addGroundMark(x, y, type, size = 32, lifetime = 45) {
        if (!this.groundMarks) return;
        if (this.groundMarks.length > 150) this.groundMarks.shift(); // cap
        const configs = {
            blood:     { color: 'rgba(120,0,0,',    shape: 'splat' },
            scorch:    { color: 'rgba(30,20,10,',   shape: 'circle' },
            frost:     { color: 'rgba(100,180,255,', shape: 'star' },
            explosion: { color: 'rgba(10,10,10,',   shape: 'circle' },
            boss:      { color: 'rgba(80,0,80,',    shape: 'circle' }
        };
        const cfg = configs[type] ?? configs.blood;
        this.groundMarks.push({
            x, y, size, type,
            color: cfg.color,
            shape: cfg.shape,
            age: 0, lifetime,
            destroyed: false,
            // Randomise appearance slightly per mark
            r1: Math.random() * Math.PI * 2,
            r2: 0.6 + Math.random() * 0.8,
            update(dt) { this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
            render(ctx) {
                const alpha = Math.max(0, 1 - this.age / this.lifetime) * 0.55;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.r1);
                ctx.globalAlpha = alpha;
                if (this.shape === 'splat') {
                    // Irregular blood splat: main circle + offset blobs
                    ctx.fillStyle = `${this.color}1)`;
                    ctx.beginPath(); ctx.ellipse(0, 0, this.size * 0.55, this.size * 0.4 * this.r2, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(this.size * 0.3, -this.size * 0.2, this.size * 0.22, this.size * 0.18, 1, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(-this.size * 0.28, this.size * 0.22, this.size * 0.18, this.size * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
                } else if (this.shape === 'star') {
                    // Frost: 6-point star
                    ctx.fillStyle = `${this.color}1)`;
                    ctx.strokeStyle = `${this.color}0.7)`;
                    ctx.lineWidth = 1.5;
                    for (let i = 0; i < 6; i++) {
                        const a = (Math.PI / 3) * i;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * this.size * 0.55, Math.sin(a) * this.size * 0.55);
                        ctx.stroke();
                    }
                    ctx.beginPath(); ctx.arc(0, 0, this.size * 0.22, 0, Math.PI * 2); ctx.fill();
                } else {
                    // Scorch / explosion: dark ellipse
                    ctx.fillStyle = `${this.color}1)`;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, this.size * 0.5, this.size * 0.38 * this.r2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        });
    }

    /**
     * Show floating text at a position
     */
    showFloatingText(x, y, text, color = '#ffffff') {
        this.addParticle({
            x: x,
            y: y,
            vx: 0,
            vy: -30,
            text: text,
            color: color,
            lifetime: 1.5,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - (this.age / this.lifetime);
                ctx.save();
                ctx.fillStyle = this.color;
                ctx.globalAlpha = alpha;
                ctx.font = 'bold 14px Rajdhani';
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 3;
                ctx.strokeText(this.text, this.x, this.y);
                ctx.fillText(this.text, this.x, this.y);
                ctx.restore();
            }
        });
    }

    /**
     * Show a HUD notification banner
     * showNotification(title, subtitle, color, durationSeconds)
     */
    showNotification(title, subtitle = '', color = '#ffffff', durationSeconds = 3) {
        const el = document.getElementById('notification-banner');
        if (!el) {
            if (this.player) {
                this.showFloatingText(this.player.x, this.player.y - 60, title, color);
            }
            return;
        }
        el.innerHTML = subtitle
            ? `<div>${title}</div><div style="font-size:12px;opacity:0.8">${subtitle}</div>`
            : title;
        el.style.color = color;
        el.classList.remove('hidden');
        clearTimeout(this._notifTimeout);
        this._notifTimeout = setTimeout(() => el.classList.add('hidden'), durationSeconds * 1000);
    }

    /**
     * Get all enemies in the game
     */
    getEnemies() {
        return this.entities.filter(e => e.type === 'enemy');
    }

    /**
     * Get entities in range
     */
    getEntitiesInRange(x, y, range, type = null) {
        return this.entities.filter(e => {
            if (type && e.type !== type) return false;
            return Utils.distance(x, y, e.x, e.y) <= range;
        });
    }

    /**
     * Show loading screen with text
     */
    showLoadingScreen(text, callback) {
        this.loadingScreen = true;
        this.loadingText = text;
        this.loadingProgress = 0;

        // Animate loading
        const loadingDuration = 1500; // 1.5 seconds
        const startTime = Date.now();

        const animateLoading = () => {
            const elapsed = Date.now() - startTime;
            this.loadingProgress = Math.min(1, elapsed / loadingDuration);

            if (this.loadingProgress < 1) {
                requestAnimationFrame(animateLoading);
            } else {
                this.loadingScreen = false;
                if (callback) callback();
            }
        };

        animateLoading();
    }

    /**
     * Enter a cave dungeon.
     *
     * In multiplayer the cave is seeded deterministically so every client that
     * enters the same entrance on the same wave generates an identical layout —
     * players see each other at the correct positions.
     *
     * The host is no longer blocked from caves; the day/night cycle now advances
     * independently of who is in a cave.
     *
     * @param {number}      difficulty  1–5
     * @param {CaveEntrance|null} entrance  The entrance entity (provides stable ID)
     */
    enterCave(difficulty, entrance = null) {
        if (this.inCave || this.loadingScreen) return;

        // Save player’s overworld position
        this.overworldPlayerPos = { x: this.player.x, y: this.player.y };
        this.overworldEntities    = this.entities.filter(entity => entity !== this.player);
        this.overworldProjectiles = this.projectiles;

        // Compute a stable, deterministic seed.
        // Same world + same entrance + same wave → identical cave on every client.
        const entranceId  = entrance?._id ?? `cave_${Math.round(this.player.x)}_${Math.round(this.player.y)}_d${difficulty}`;
        const worldSeed   = this._worldSeed ?? 0;
        // Mix with a simple string hash so position bits don’t cancel worldSeed
        let   posHash     = 2166136261;
        for (let i = 0; i < entranceId.length; i++) {
            posHash = Math.imul(posHash ^ entranceId.charCodeAt(i), 16777619) >>> 0;
        }
        const waveComponent = (this.waveSystem?.currentWave ?? 0) * 0x9e3779b9;
        const caveSeed = (worldSeed ^ posHash ^ waveComponent) >>> 0;

        // Cave ID shared with remote players via PLAYER_UPDATE
        this._currentCaveId = `${entranceId}_w${this.waveSystem?.currentWave ?? 0}`;

        // Create the cave with deterministic seed
        this.currentCave = new Cave(this, difficulty, caveSeed);
        this.inCave = true;

        // Reset entity arrays for cave
        this.entities    = [this.player, ...this.currentCave.entities];
        this.projectiles = [];
        this.particles   = [];

        // Host registers cave enemies so clients receive ENEMY_SPAWN
        if (this.networkManager?.isHost && this.networkManager?.inRoom) {
            for (const enemy of this.currentCave.enemies) {
                enemy._scene = 'cave';
                this.networkManager.registerEnemy(enemy);
            }
        }

        // Move player to cave spawn
        this.player.x = this.currentCave.spawnX;
        this.player.y = this.currentCave.spawnY;

        // Update camera bounds
        this.camera.setWorldBounds(this.currentCave.width, this.currentCave.height);
        this.camera.setPosition(this.player.x, this.player.y);
    }

    /**
     * Exit the current cave and return to the overworld.
     */
    exitCave() {
        if (!this.inCave) return;

        this.showLoadingScreen('Returning to Surface...', () => {
            // Restore player position
            this.player.x = this.overworldPlayerPos.x;
            this.player.y = this.overworldPlayerPos.y;

            // Restore overworld entities
            this.entities = [this.player, ...(this.overworldEntities ?? [])];
            this.projectiles = this.overworldProjectiles ?? [];
            this.particles   = [];

            // Clear cave state — unregister cave enemies from network before clearing
            this.networkManager?.cleanupCaveEnemies?.();
            this.currentCave    = null;
            this.inCave         = false;
            this._currentCaveId = null;

            // Restore camera bounds
            this.camera.setWorldBounds(this.world.width, this.world.height);
            this.camera.setPosition(this.player.x, this.player.y);

            // Prevent immediate re-entry (player spawns on top of entrance)
            for (const entity of this.entities) {
                if (entity.type === 'caveEntrance') {
                    entity.enterCooldown = Math.max(entity.enterCooldown ?? 0, 2.5);
                }
            }
        });
    }

    /**
     * True when every participant (local + all remote) is inside a cave.
     * Used to decide whether to pause wave spawning.
     */
    _allPlayersInCave() {
        if (!this.inCave) return false;
        for (const rp of this._remotePlayers.values()) {
            if (!rp._inCave) return false;
        }
        return true;
    }

    /**
     * True when a remote player should be rendered on the local screen.
     * Shows the player only when both parties are in the same location
     * (same cave ID, or both in the overworld).
     */
    _isRemotePlayerVisible(rp) {
        if (this.inCave) {
            return rp._caveId === this._currentCaveId;
        }
        return !rp._inCave;
    }

    /**
     * Give XP to player and handle level ups
     */
    givePlayerXP(amount) {
        const player = this.player;

        // Apply XP gain multiplier
        const actualXP = Math.floor(amount * player.xpGainMultiplier);
        player.xp += actualXP;

        // XP notification
        this.addParticle({
            x: player.x,
            y: player.y - 25,
            vy: -30,
            text: `+${actualXP} XP`,
            lifetime: 1,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
                ctx.font = 'bold 12px Rajdhani';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
            }
        });

        // Check for level up
        const xpNeeded = player.level * 100;
        if (player.xp >= xpNeeded) {
            player.xp -= xpNeeded;
            player.level++;

            // Heal to full on level up
            player.maxHealth += 10;
            player.health = player.maxHealth;

            // Set pending level up to show stat selection modal
            player.pendingLevelUp = true;

            // Level up effect
            this.spawnLevelUpEffect();
        }
    }

    /**
     * Show level up modal for stat selection
     */
    showLevelUpModal() {
        if (!this.levelUpModal) return;

        this.pauseForModalIfNeeded();

        // Update level display
        const levelDisplay = document.getElementById('new-level');
        if (levelDisplay) {
            levelDisplay.textContent = this.player.level;
        }

        this.levelUpModal.classList.remove('hidden');
    }

    /**
     * Apply selected stat upgrade
     */
    applyStatUpgrade(stat) {
        const player = this.player;

        switch (stat) {
            case 'mobility':
                player.speedMultiplier += 0.05; // +5% speed (max +50% at level 10)
                player.speed = player.baseSpeed * player.speedMultiplier;
                break;
            case 'damage':
                player.damageMultiplier += 0.08; // +8% damage (max +80% at level 10)
                break;
            case 'farming':
                player.farmingSpeedMultiplier += 0.12; // +12% farming speed (max +120% at level 10)
                break;
            case 'xpGain':
                player.xpGainMultiplier += 0.15; // +15% XP gain (balanced for progression)
                break;
            case 'regen':
                player.healthRegen += 2; // +2 HP/sec passive regen
                break;
        }

        // Clear pending level up
        player.pendingLevelUp = false;

        // Hide modal and resume game
        if (this.levelUpModal) {
            this.levelUpModal.classList.add('hidden');
        }
        this.resumeGameplayIfNoModalOpen();

        // Spawn upgrade particle
        this.addParticle({
            x: player.x,
            y: player.y - 40,
            vy: -25,
            text: `${stat.toUpperCase()} UP!`,
            lifetime: 1.5,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = `rgba(0, 255, 200, ${alpha})`;
                ctx.font = 'bold 16px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
            }
        });
    }

    /**
     * Spawn level up visual effect
     */
    spawnLevelUpEffect() {
        const player = this.player;
        this.audioSystem?.playLevelUp?.();

        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            this.addParticle({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * 80,
                vy: Math.sin(angle) * 80 - 50,
                lifetime: 1,
                age: 0,
                destroyed: false,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - this.age / this.lifetime;
                    ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Level up text
        this.addParticle({
            x: player.x,
            y: player.y - 40,
            vy: -20,
            lifetime: 2,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                const scale = 1 + this.age * 0.3;
                ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
                ctx.font = `bold ${18 * scale}px Orbitron`;
                ctx.textAlign = 'center';
                ctx.fillText(`LEVEL ${this.game?.player?.level || '?'}!`, this.x, this.y);
            }
        });
    }

    /**
     * Check for crystal upgrade interaction (press E near crystal).
     * Returns true if the interaction was consumed (blocks workbench check).
     */
    checkCrystalInteraction() {
        if (!this.input.isActionJustPressed('interact')) return false;
        if (!this.crystal || !this.crystalUpgradeSystem) return false;

        const dist = Utils.distance(this.player.x, this.player.y, this.crystal.x, this.crystal.y);
        if (dist < 80) {
            this.crystalUpgradeSystem.depositResources();
            return true;
        }
        return false;
    }

    /**
     * Check for workbench interaction (called in fixedUpdate)
     */
    checkWorkbenchInteraction() {
        if (!this.input.isActionJustPressed('interact')) return;

        const workbenches = this.buildingSystem.buildings.filter(b => b.type === 'workbench');
        for (const wb of workbenches) {
            const dist = Utils.distance(this.player.x, this.player.y, wb.x, wb.y);
            if (dist < 60) {
                this.openWorkbench();
                return;
            }
        }
    }

    /**
     * Check for a click on an upgradable building and open modal
     */
    handleBuildingUpgradeClick() {
        if (!this.input.mouse.leftJustPressed) return false;
        if (!this.buildingSystem || this.buildingSystem.isPlacing) return false;
        if (this.buildMenu?.isOpen) return false;

        const building = this.buildingSystem.getBuildingAt(this.input.mouse.worldX, this.input.mouse.worldY);
        if (!building || !building.canUpgrade || building.level >= building.maxLevel) {
            return false;
        }

        this.openBuildingUpgradeModal(building);

        // Prevent this click from triggering a weapon/tool action.
        this.input.mouse.leftDown = false;
        this.input.mouse.leftJustPressed = false;
        return true;
    }

    openBuildingUpgradeModal(building) {
        if (!this.buildingUpgradeModal || !building) return;

        this.selectedUpgradeBuilding = building;
        this.pauseForModalIfNeeded();
        this.refreshBuildingUpgradeModal();
        this.buildingUpgradeModal.classList.remove('hidden');
    }

    closeBuildingUpgradeModal() {
        if (!this.buildingUpgradeModal) return;

        this.buildingUpgradeModal.classList.add('hidden');
        this.selectedUpgradeBuilding = null;
        this.resumeGameplayIfNoModalOpen();
    }

    resumeGameplayIfNoModalOpen() {
        const blockers = [
            this.levelUpModal,
            this.workbenchModal,
            this.buildingUpgradeModal,
            document.getElementById('bow-effect-modal')
        ];
        const hasOpenModal = blockers.some(modal => modal && !modal.classList.contains('hidden'));
        if (!hasOpenModal) {
            this.state = 'playing';
        }
    }

    shouldPauseForModal() {
        return !(this.networkManager?.inRoom);
    }

    pauseForModalIfNeeded() {
        if (this.shouldPauseForModal()) {
            this.state = 'paused';
        }
    }

    confirmBuildingUpgrade() {
        const building = this.selectedUpgradeBuilding;
        if (!building || building.destroyed) {
            this.closeBuildingUpgradeModal();
            return;
        }

        const nextLevel = building.level + 1;
        const cost = building.getUpgradeCost?.(nextLevel) ?? null;
        if (!cost) {
            this.refreshBuildingUpgradeModal();
            return;
        }

        if (!this.resourceSystem.hasResources(cost)) {
            this.showNotification('Ressources insuffisantes', this.formatCost(cost), '#ff6666', 1.8);
            this.refreshBuildingUpgradeModal();
            return;
        }

        if (building.upgrade()) {
            this.showFloatingText(building.x, building.y - 30, `Niveau ${building.level}!`, '#ffcc00');
            this.showNotification(
                `${building.name} amélioré`,
                `Niveau ${building.level}`,
                '#66d9ff',
                1.4
            );
        }

        this.refreshBuildingUpgradeModal();
    }

    refreshBuildingUpgradeModal() {
        const building = this.selectedUpgradeBuilding;
        if (!building || building.destroyed) {
            this.closeBuildingUpgradeModal();
            return;
        }

        if (this.buildingUpgradeTitleEl) {
            this.buildingUpgradeTitleEl.textContent = `⬆️ ${building.name}`;
        }

        if (building.level >= building.maxLevel) {
            if (this.buildingUpgradeLevelEl) {
                this.buildingUpgradeLevelEl.textContent = `Niveau ${building.level} (MAX)`;
            }
            if (this.buildingUpgradeEffectsEl) {
                this.buildingUpgradeEffectsEl.innerHTML = '<li>Ce bâtiment est déjà au niveau maximum.</li>';
            }
            if (this.buildingUpgradeCostEl) {
                this.buildingUpgradeCostEl.innerHTML = '<span class="upgrade-cost-chip ok">Aucun coût</span>';
            }
            if (this.confirmBuildingUpgradeBtn) {
                this.confirmBuildingUpgradeBtn.disabled = true;
                this.confirmBuildingUpgradeBtn.textContent = 'Niveau Max';
            }
            return;
        }

        const nextLevel = building.level + 1;
        const cost = building.getUpgradeCost?.(nextLevel) || {};

        if (this.buildingUpgradeLevelEl) {
            this.buildingUpgradeLevelEl.textContent = `Niveau ${building.level} → ${nextLevel}`;
        }

        if (this.buildingUpgradeEffectsEl) {
            const effects = this.getBuildingUpgradeEffects(building, nextLevel);
            this.buildingUpgradeEffectsEl.innerHTML = effects.map(line => `<li>${line}</li>`).join('');
        }

        if (this.buildingUpgradeCostEl) {
            const resourceNames = {
                wood: 'Bois',
                stone: 'Pierre',
                metal: 'Métal',
                amethyst: 'Améthyste'
            };
            this.buildingUpgradeCostEl.innerHTML = Object.entries(cost).map(([type, amount]) => {
                const current = this.resourceSystem.getResource(type);
                const ok = current >= amount;
                return `<span class="upgrade-cost-chip ${ok ? 'ok' : 'no'}">${amount} ${resourceNames[type] || type} (${current})</span>`;
            }).join('');
        }

        if (this.confirmBuildingUpgradeBtn) {
            const canAfford = this.resourceSystem.hasResources(cost);
            this.confirmBuildingUpgradeBtn.disabled = !canAfford;
            this.confirmBuildingUpgradeBtn.textContent = canAfford ? 'Confirmer' : 'Ressources insuffisantes';
        }
    }

    getBuildingUpgradeEffects(building, nextLevel) {
        const lines = [];

        const addLine = (label, fromValue, toValue, suffix = '') => {
            lines.push(`${label}: ${fromValue}${suffix} → ${toValue}${suffix}`);
        };

        const currentHealth = Math.round(building.maxHealth || 0);
        let nextHealth = currentHealth;

        if (building.type === 'turret') {
            let nextDamage = building.damage;
            let nextRange = building.range;
            let nextFireRate = building.fireRate;

            const tierStats = building.config?.tierStats?.[nextLevel];
            if (tierStats) {
                nextDamage = tierStats.damage ?? nextDamage;
                nextRange = tierStats.range ?? nextRange;
                nextFireRate = tierStats.fireRate ?? nextFireRate;
            } else {
                nextDamage = (building.baseDamage || building.damage) * (1 + 0.2 * (nextLevel - 1));
                nextRange = (building.baseRange || building.range) * (1 + 0.1 * (nextLevel - 1));
                nextFireRate = (building.baseFireRate || building.fireRate) * (1 - 0.08 * (nextLevel - 1));
            }

            nextHealth = Math.round(building.config.health * (1 + 0.25 * (nextLevel - 1)));
            addLine('Dégâts', Math.round(building.damage), Math.round(nextDamage));
            addLine('Portée', Math.round(building.range), Math.round(nextRange));
            addLine('Cadence', (building.fireRate || 0).toFixed(2), (nextFireRate || 0).toFixed(2), 's');

            if (tierStats) {
                const currentDouble = building.doubleShot || 0;
                const nextDouble = tierStats.doubleShot || 0;
                if (nextDouble > currentDouble) {
                    addLine('Chance double tir', Math.round(currentDouble * 100), Math.round(nextDouble * 100), '%');
                }
                const currentTriple = building.tripleShot || 0;
                const nextTriple = tierStats.tripleShot || 0;
                if (nextTriple > currentTriple) {
                    addLine('Chance triple tir', Math.round(currentTriple * 100), Math.round(nextTriple * 100), '%');
                }
            }
        } else if (building.type === 'autoMiner') {
            const bonusFactor = 1 + (this.player?._minerBonus || 0);
            const currentRate = building.productionRate || 0;
            const nextBaseRate = AUTO_MINER_PRODUCTION_RATES[building.buildingKey]?.[nextLevel - 1] ?? currentRate;
            const nextRate = nextBaseRate * bonusFactor;
            nextHealth = Math.round(building.config.health * (1 + 0.5 * (nextLevel - 1)));
            addLine('Production', currentRate.toFixed(2), nextRate.toFixed(2), '/s');
        } else if (building.type === 'barricade') {
            const currentRegen = building.regen || building.baseRegen || 0;
            const nextRegen = (building.baseRegen || currentRegen) * (1 + 0.6 * (nextLevel - 1));
            nextHealth = Math.round(building.config.health * (1 + 0.33 * (nextLevel - 1)));
            addLine('Régénération', currentRegen.toFixed(1), nextRegen.toFixed(1), '/s');
        } else if (building.type === 'healingShrine') {
            const currentHealRate = building.healRate || building.baseHealRate || 0;
            const currentHealRange = building.healRange || building.baseHealRange || 0;
            const nextHealRate = (building.baseHealRate || currentHealRate) * (1 + 0.6 * (nextLevel - 1));
            const nextHealRange = (building.baseHealRange || currentHealRange) * (1 + 0.3 * (nextLevel - 1));
            addLine('Soin', currentHealRate.toFixed(1), nextHealRate.toFixed(1), '/s');
            addLine('Portée de soin', Math.round(currentHealRange), Math.round(nextHealRange));
        } else {
            lines.push('Améliore les statistiques globales du bâtiment.');
        }

        if (nextHealth !== currentHealth) {
            addLine('PV max', currentHealth, nextHealth);
        }

        return lines;
    }

    /**
     * Open workbench modal
     */
    openWorkbench() {
        if (!this.workbenchModal) return;

        this.pauseForModalIfNeeded();
        this.updateWorkbenchUI();
        this.workbenchModal.classList.remove('hidden');
    }

    /**
     * Close workbench modal
     */
    closeWorkbench() {
        if (!this.workbenchModal) return;

        this.workbenchModal.classList.add('hidden');
        this.resumeGameplayIfNoModalOpen();
    }

    /**
     * Update workbench UI with current tool tiers and costs
     */
    updateWorkbenchUI() {
        const player = this.player;

        // Axe tier display
        const axeTier = document.getElementById('axe-tier');
        const axeCost = document.getElementById('axe-cost');
        const upgradeAxe = document.getElementById('upgrade-axe');

        if (axeTier) axeTier.textContent = `Niveau ${player.toolTiers.axe}`;
        if (player.toolTiers.axe >= 3) {
            if (axeCost) axeCost.textContent = 'MAX';
            if (upgradeAxe) upgradeAxe.disabled = true;
        } else {
            const cost = this.getToolUpgradeCost('axe', player.toolTiers.axe);
            if (axeCost) axeCost.textContent = cost.text;
            if (upgradeAxe) upgradeAxe.disabled = !this.resourceSystem.hasResources(cost.resources);
        }

        // Pickaxe tier display
        const pickaxeTier = document.getElementById('pickaxe-tier');
        const pickaxeCost = document.getElementById('pickaxe-cost');
        const upgradePickaxe = document.getElementById('upgrade-pickaxe');

        if (pickaxeTier) pickaxeTier.textContent = `Niveau ${player.toolTiers.pickaxe}`;
        if (player.toolTiers.pickaxe >= 3) {
            if (pickaxeCost) pickaxeCost.textContent = 'MAX';
            if (upgradePickaxe) upgradePickaxe.disabled = true;
        } else {
            const cost = this.getToolUpgradeCost('pickaxe', player.toolTiers.pickaxe);
            if (pickaxeCost) pickaxeCost.textContent = cost.text;
            if (upgradePickaxe) upgradePickaxe.disabled = !this.resourceSystem.hasResources(cost.resources);
        }

        // Sword tier display
        const swordTier = document.getElementById('sword-tier');
        const swordStats = document.getElementById('sword-stats');
        const swordCost = document.getElementById('sword-cost');
        const upgradeSword = document.getElementById('upgrade-sword');

        const swordStatsData = player.getSwordStats(player.swordTier);
        if (swordTier) swordTier.textContent = `Tier ${player.swordTier}`;
        if (swordStats) swordStats.textContent = `Dmg: ${swordStatsData.damage} | Portée: ${swordStatsData.range} | Vitesse: ${swordStatsData.speed}s`;

        if (player.swordTier >= 5) {
            if (swordCost) swordCost.textContent = 'MAX';
            if (upgradeSword) upgradeSword.disabled = true;
        } else {
            const cost = this.getSwordUpgradeCost(player.swordTier);
            if (swordCost) swordCost.textContent = this.formatCost(cost.resources);
            if (upgradeSword) upgradeSword.disabled = !this.resourceSystem.hasResources(cost.resources);
        }

        // Bow tier display
        const bowTier = document.getElementById('bow-tier');
        const bowStats = document.getElementById('bow-stats');
        const bowCost = document.getElementById('bow-cost');
        const upgradeBow = document.getElementById('upgrade-bow');

        const bowStatsData = player.getBowStats(player.bowTier);
        if (bowTier) bowTier.textContent = `Tier ${player.bowTier}`;
        if (bowStats) bowStats.textContent = `Dmg: ${bowStatsData.damage} | Portée: ${bowStatsData.range} | Vitesse: ${bowStatsData.speed}s`;

        if (player.bowTier >= 5) {
            if (bowCost) bowCost.textContent = 'MAX';
            if (upgradeBow) upgradeBow.disabled = true;
        } else {
            const cost = this.getBowUpgradeCost(player.bowTier);
            if (bowCost) bowCost.textContent = this.formatCost(cost.resources);
            if (upgradeBow) upgradeBow.disabled = !this.resourceSystem.hasResources(cost.resources);
        }
    }

    /**
     * Format cost object to readable text
     */
    formatCost(resources) {
        const icons = {
            wood: 'Bois',
            stone: 'Pierre',
            metal: 'Métal',
            amethyst: 'Améthyste'
        };

        const parts = [];
        for (const [type, amount] of Object.entries(resources)) {
            parts.push(`${amount} ${icons[type] || type}`);
        }

        return parts.join(' + ');
    }

    /**
     * Get cost for upgrading a tool
     */
    getToolUpgradeCost(tool, currentTier) {
        const costs = {
            axe: {
                1: { wood: 20, stone: 10 },
                2: { stone: 30, metal: 15 }
            },
            pickaxe: {
                1: { stone: 25, wood: 15 },
                2: { metal: 50, stone: 30 }
            }
        };

        const resources = this.scaleCost(costs[tool]?.[currentTier], 'playerUpgrade') ?? {};
        return {
            resources,
            text: Object.keys(resources).length > 0 ? this.formatCost(resources) : 'MAX'
        };
    }

    /**
     * Get cost for upgrading bow
     */
    getBowUpgradeCost(currentTier) {
        const costs = {
            1: { wood: 25, stone: 15 },
            2: { stone: 35, metal: 25 },
            3: { metal: 45, amethyst: 35 },
            4: { metal: 70, amethyst: 50 }
        };
        const resources = this.scaleCost(costs[currentTier], 'playerUpgrade') ?? {};
        return {
            resources,
            text: Object.keys(resources).length > 0 ? this.formatCost(resources) : 'MAX'
        };
    }

    /**
     * Upgrade a tool tier
     */
    upgradeTool(tool) {
        const player = this.player;
        const currentTier = player.toolTiers[tool];

        if (currentTier >= 3) return;

        const cost = this.getToolUpgradeCost(tool, currentTier);

        if (!this.resourceSystem.spendResources(cost.resources)) {
            return;
        }

        // Upgrade tier
        player.toolTiers[tool]++;

        // Update tools to reflect new tier
        player.updateTools();

        // Update UI
        this.updateWorkbenchUI();

        // Check for dev/testing: if god mode, auto-heal
        if (this.devMode) this.player.health = this.player.maxHealth;

        // Upgrade effect
        this.addParticle({
            x: player.x,
            y: player.y - 30,
            vy: -25,
            text: `${tool.toUpperCase()} Nv.${player.toolTiers[tool]}!`,
            lifetime: 1.5,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = `rgba(255, 180, 50, ${alpha})`;
                ctx.font = 'bold 14px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
            }
        });
    }

    /**
     * Get sword upgrade cost
     */
    getSwordUpgradeCost(currentTier) {
        const costs = {
            1: { stone: 25, metal: 15 },
            2: { stone: 40, metal: 30 },
            3: { metal: 50, amethyst: 20 },
            4: { metal: 75, amethyst: 40 }
        };
        const baseCost = costs[currentTier] || costs[1];
        return {
            resources: this.scaleCost(baseCost, 'playerUpgrade')
        };
    }

    /**
     * Upgrade sword tier
     */
    upgradeSword() {
        const player = this.player;
        const currentTier = player.swordTier;

        if (currentTier >= 5) return;

        const cost = this.getSwordUpgradeCost(currentTier);

        if (!this.resourceSystem.spendResources(cost.resources)) {
            return;
        }

        // Upgrade tier
        player.swordTier++;

        // Show effect choice modal at tier 4
        if (player.swordTier === 4) {
            this.showSwordEffectChoice();
        }

        // Update tools to reflect new tier
        player.updateTools();

        // Update UI
        this.updateWorkbenchUI();

        // Upgrade effect
        const tierNames = ['', 'Iron', 'Steel', 'Knight', 'Enchanted', 'Legendary'];
        this.addParticle({
            x: player.x,
            y: player.y - 30,
            vy: -25,
            text: `${tierNames[player.swordTier]} Sword!`,
            lifetime: 1.5,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = `rgba(200, 50, 255, ${alpha})`;
                ctx.font = 'bold 14px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
            }
        });
    }

    /**
     * Upgrade bow tier
     */
    upgradeBow() {
        const player = this.player;
        const currentTier = player.bowTier;

        if (currentTier >= 5) return;

        const cost = this.getBowUpgradeCost(currentTier);

        if (!this.resourceSystem.spendResources(cost.resources)) {
            return;
        }

        // Upgrade tier
        player.bowTier++;

        // Show effect choice modal at tier 4
        if (player.bowTier === 4) {
            this.showBowEffectChoice();
        }

        // Update tools to reflect new tier
        player.updateTools();

        // Update UI
        this.updateWorkbenchUI();

        // Upgrade effect
        const tierNames = ['', 'Basic', 'Reinforced', 'Composite', 'Enchanted', 'Legendary'];
        this.addParticle({
            x: player.x,
            y: player.y - 30,
            vy: -25,
            text: `${tierNames[player.bowTier]} Bow!`,
            lifetime: 1.5,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = `rgba(138, 43, 226, ${alpha})`;
                ctx.font = 'bold 14px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
            }
        });
    }

    /**
     * Show bow effect choice modal
     */
    showBowEffectChoice() {
        // Close workbench first
        this.closeWorkbench();

        const modal = document.getElementById('bow-effect-modal');
        if (!modal) {
            console.error('Bow effect modal not found!');
            return;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Ensure it's visible
        this.pauseForModalIfNeeded();
    }

    /**
     * Show sword effect choice modal
     */
    showSwordEffectChoice() {
        // Close workbench first
        this.closeWorkbench();

        const modal = document.getElementById('bow-effect-modal'); // Reuse bow modal
        if (!modal) {
            console.error('Effect modal not found!');
            return;
        }

        // Update modal title for sword
        const title = modal.querySelector('h2');
        if (title) title.textContent = '⚔️ Choisissez un Effet Spécial';

        const desc = modal.querySelector('p');
        if (desc) desc.textContent = 'Votre épée est maintenant enchantée ! Choisissez un effet élémentaire :';

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        this.pauseForModalIfNeeded();

        // Store that we're choosing for sword
        this._choosingForSword = true;
    }

    /**
     * Choose bow/sword special effect
     */
    chooseBowEffect(effect) {
        // Check if choosing for sword or bow
        if (this._choosingForSword) {
            this.player.swordEffect = effect;
            this._choosingForSword = false;

            const effectNames = {
                fire: '🔥 Lame de Feu',
                lightning: '⚡ Lame de Foudre',
                ice: '❄️ Lame de Glace'
            };

            this.player.updateTools();

            const modal = document.getElementById('bow-effect-modal');
            if (modal) modal.classList.add('hidden');

            this.resumeGameplayIfNoModalOpen();

            this.showFloatingText(
                this.player.x,
                this.player.y - 40,
                effectNames[effect] || 'Effet Spécial',
                '#ff00ff'
            );
        } else {
            this.player.bowEffect = effect;
            this.player.updateTools();

            const modal = document.getElementById('bow-effect-modal');
            if (modal) modal.classList.add('hidden');

            this.resumeGameplayIfNoModalOpen();

            // Effect notification
            const effectNames = {
                fire: '🔥 Flèches de Feu',
                lightning: '⚡ Flèches de Foudre',
                ice: '❄️ Flèches de Glace'
            };

            this.showFloatingText(
                this.player.x,
                this.player.y - 40,
                effectNames[effect] || 'Effet Spécial',
                '#ffcc00'
            );
        }
    }


}

export default Game;
