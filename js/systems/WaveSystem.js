/**
 * Wave System - manages enemy waves with biome-based spawning
 */

import { Enemy } from '../entities/Enemy.js';
import { Utils } from '../core/Utils.js';

// Biome enemy mappings
const BiomeEnemies = {
    plains: ['grunt', 'speeder'],
    forest: ['grunt', 'speeder', 'tank'],
    desert: ['scorpion', 'mummy'],
    tundra: ['frostElemental', 'iceWolf'],
    swamp: ['swampThing', 'poisonFrog'],
    volcanic: ['fireImp', 'lavaGolem']
};

export class WaveSystem {
    constructor(game) {
        this.game = game;

        // Current wave
        this.currentWave = 0;
        this.isWaveActive = false;

        // Wave configuration
        this.waveConfigs = this.generateWaveConfigs();

        // Spawning
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.spawnInterval = 0.5;
        this.currentWaveType = 'mixed';
        this.spawnCadenceVariance = 0.1;

        // Boss tracking
        this.bossWave = false;
        this.bossSpawned = false;

        // Current spawn biome (changes every 10 waves)
        this.spawnBiome = 'plains';
        this.biomeRotation = ['plains', 'forest', 'desert', 'swamp', 'tundra', 'volcanic'];
        this.currentPlayerScaling = {
            players: 1,
            countMultiplier: 1,
            statMultiplier: 1,
            cadenceMultiplier: 1,
            eliteBonus: 0
        };

        // Balance target:
        // Wave rewards + one collector should fund a basic turret every 1-2 waves
        // while enemy effective HP grows roughly 35-45% faster than the old curve.
        this.balanceNotes = {
            earlyTurretCost: { wood: 20, stone: 15 },
            collectorIncomePerCycle: { wood: 60, stone: 48, metal: 30 }
        };
    }

    /**
     * Generate wave configurations with varied wave types
     */
    generateWaveConfigs() {
        const configs = [];

        for (let i = 1; i <= 100; i++) {
            const config = {
                wave: i,
                enemies: [],
                isBossWave: i % 5 === 0,
                waveType: 'mixed'  // mixed, swarm, elite, ranged, siege
            };

            config.waveType = this.getWaveType(i);
            const baseCount = this.getBaseEnemyCount(i);

            // Generate enemies based on wave type
            switch (config.waveType) {
                case 'swarm':
                    // Many weak enemies; pressure comes from target switching and leaks.
                    config.enemies = this.fillEnemies(['grunt', 'grunt', 'speeder', 'speeder'], Math.floor(baseCount * 1.45));
                    break;

                case 'elite':
                    // Fewer enemies, but they demand focused DPS.
                    config.enemies = this.fillEnemies(['tank', 'tank', 'bomber', 'wanderer'], Math.floor(baseCount * 0.45) + 3);
                    break;

                case 'ranged':
                    // Ranged attackers arrive earlier, but still mixed with low HP units.
                    config.enemies = this.fillEnemies(['speeder', 'poisonFrog', 'fireImp', 'grunt'], Math.floor(baseCount * 0.95));
                    break;

                case 'siege':
                    // Building destroyers. Lava golems are held back until wave 12+.
                    {
                        const siegePool = i >= 12
                            ? ['tank', 'tank', 'mummy', 'swampThing', 'lavaGolem']
                            : ['tank', 'tank', 'bomber', 'mummy'];
                        config.enemies = this.fillEnemies(siegePool, Math.floor(baseCount * 0.65) + 4);
                    }
                    break;

                case 'boss':
                    // Boss wave with minions
                    const bossTypes = ['berserkTitan', 'frostLord', 'infernoDrake', 'stormWraith'];
                    if (i >= 25) bossTypes.push('voidBehemoth');
                    config.enemies.push(bossTypes[Utils.seededInt(0, bossTypes.length - 1)]);
                    
                    // Add minions
                    const minionCount = Math.floor(8 + i * 0.8 + Math.max(0, i - 20) * 0.1);
                    const minionPool = i < 10
                        ? ['grunt', 'speeder', 'tank', 'bomber']
                        : ['tank', 'bomber', 'speeder', 'mummy', 'poisonFrog'];
                    config.enemies.push(...this.fillEnemies(minionPool, minionCount));
                    break;

                default:  // mixed
                    const baseEnemies = ['grunt', 'grunt', 'speeder'];
                    if (i >= 3) baseEnemies.push('tank');
                    if (i >= 4) baseEnemies.push('bomber');
                    if (i >= 7) baseEnemies.push('scorpion', 'poisonFrog');
                    config.enemies = this.fillEnemies(baseEnemies, Math.floor(baseCount));

                    // Rare biome mobs appear earlier, but remain a minority before wave 8.
                    const biomeMobs = ['scorpion', 'mummy', 'frostElemental', 'iceWolf', 'swampThing', 'poisonFrog', 'fireImp'];
                    const rareChance = i < 8 ? 0.06 : 0.1;
                    for (let j = 0; j < config.enemies.length; j++) {
                        if (Utils.seededRandom() < rareChance) {
                            config.enemies[j] = biomeMobs[Utils.seededInt(0, biomeMobs.length - 1)];
                        }
                    }
                    break;
            }

            configs.push(config);
        }

        return configs;
    }

    getWaveType(wave) {
        if (wave % 5 === 0) return 'boss';

        const earlyPattern = {
            1: 'mixed',
            2: 'swarm',
            3: 'mixed',
            4: 'ranged',
            6: 'siege',
            7: 'mixed',
            8: 'elite',
            9: 'swarm'
        };
        if (earlyPattern[wave]) return earlyPattern[wave];

        const pattern = ['mixed', 'swarm', 'ranged', 'elite', 'mixed', 'siege'];
        return pattern[(wave - 11) % pattern.length];
    }

    getBaseEnemyCount(wave) {
        if (wave <= 5) {
            return 7 + wave * 2;          // W1 9, W4 15 before type modifiers
        }
        if (wave <= 15) {
            return 17 + (wave - 5) * 3.1;
        }
        if (wave <= 30) {
            return 48 + (wave - 15) * 4.0;
        }
        return 106 + (wave - 30) * 5.3;
    }

    /**
     * Fill enemy array with types
     */
    fillEnemies(types, count) {
        const enemies = [];
        for (let i = 0; i < count; i++) {
            enemies.push(types[Utils.seededInt(0, types.length - 1)]);
        }
        return enemies;
    }

    /**
     * Update spawn biome based on wave
     */
    updateSpawnBiome() {
        const biomeIndex = Math.floor((this.currentWave - 1) / 6) % this.biomeRotation.length;
        this.spawnBiome = this.biomeRotation[biomeIndex];
    }

    /**
     * Start a new wave
     */
    startWave() {
        this.currentWave++;
        this.isWaveActive = true;
        this.bossSpawned = false;

        // Update spawn biome
        this.updateSpawnBiome();

        const config = this.waveConfigs[this.currentWave - 1] || this.generateScaledWave();
        this.bossWave = config.isBossWave;
        this.currentWaveType = config.waveType || 'mixed';
        const enemies = [...config.enemies];
        this.currentPlayerScaling = this.getPlayerScaling(this.currentWaveType);

        // Add biome-specific enemies based on current biome
        const biomeEnemies = BiomeEnemies[this.spawnBiome] || [];
        const biomeAdds = Math.min(5, 1 + Math.floor(this.currentWave / 4));
        for (let i = 0; i < biomeAdds; i++) {
            if (biomeEnemies.length > 0 && Utils.seededRandom() < 0.45) {
                enemies.push(biomeEnemies[Utils.seededInt(0, biomeEnemies.length - 1)]);
            }
        }

        // Multiplayer scaling: increase wave volume with player count while
        // preserving the current wave composition (boss stays unique).
        this.applyPlayerScalingToWave(enemies);

        this.spawnQueue = enemies;
        this.spawnTimer = 0;
        this.spawnCadenceVariance = Math.min(0.32, 0.08 + this.currentWave * 0.008);
        this.spawnInterval = this.getDynamicSpawnInterval();
        this.updateWaveUI();
    }

    getSpawnInterval() {
        if (this.currentWave <= 3) return 0.65;
        if (this.currentWave <= 8) return 0.55;
        if (this.currentWave <= 15) return 0.46;
        if (this.currentWave <= 25) return 0.38;
        if (this.currentWave <= 35) return 0.34;
        return 0.30;
    }

    getDynamicSpawnInterval() {
        const base = this.getSpawnInterval();
        const wavePressure = {
            swarm: 0.9,
            ranged: 0.95,
            siege: 1.05,
            elite: 1.1,
            boss: 0.98,
            mixed: 1
        }[this.currentWaveType] || 1;
        const queuePressure = this.spawnQueue.length > 18 ? 0.92 : 1;
        const variance = 1 + Utils.randomFloat(-this.spawnCadenceVariance, this.spawnCadenceVariance);
        const playerCadence = this.currentPlayerScaling?.cadenceMultiplier ?? 1;
        return Math.max(0.2, base * wavePressure * queuePressure * variance * playerCadence);
    }

    /**
     * Generate scaled wave for waves beyond config
     */
    generateScaledWave() {
        const scale = this.currentWave / 10;
        const count = Math.floor(35 + scale * 12);

        const allTypes = ['grunt', 'speeder', 'tank', 'bomber', 'scorpion', 'mummy', 'frostElemental', 'iceWolf', 'swampThing', 'poisonFrog', 'fireImp'];

        return {
            wave: this.currentWave,
            enemies: this.fillEnemies(allTypes, count),
            isBossWave: this.currentWave % 5 === 0,
            waveType: this.currentWave % 5 === 0 ? 'boss' : 'mixed'
        };
    }

    getEnemyStatScaleFactor(wave = this.currentWave) {
        if (wave <= 6) {
            return 1 + (wave - 1) * 0.07;
        }
        if (wave <= 15) {
            const baseScale = 1 + 5 * 0.07;
            return baseScale + (wave - 6) * 0.074;
        }
        if (wave <= 30) {
            const baseScale = 1 + 5 * 0.07 + 9 * 0.074;
            return baseScale + (wave - 15) * 0.11;
        }

        const baseScale = 1 + 5 * 0.07 + 9 * 0.074 + 15 * 0.11;
        return baseScale + (wave - 30) * 0.16;
    }

    getEliteStats(wave = this.currentWave) {
        const chance = Math.min(
            0.46,
            0.06 + wave * 0.012 + Math.max(0, wave - 15) * 0.005 + Math.max(0, wave - 30) * 0.006
        );

        if (wave >= 30) {
            return {
                chance,
                healthMultiplier: 2.45,
                damageMultiplier: 1.75,
                speedMultiplier: 1.26
            };
        }

        if (wave >= 20) {
            return {
                chance,
                healthMultiplier: 2.2,
                damageMultiplier: 1.6,
                speedMultiplier: 1.22
            };
        }

        return {
            chance,
            healthMultiplier: 2.0,
            damageMultiplier: 1.5,
            speedMultiplier: 1.2
        };
    }

    getBossWaveMultiplier(wave = this.currentWave) {
        return 1 + Math.max(0, wave - 10) * 0.025 + Math.max(0, wave - 30) * 0.03;
    }

    /**
     * Update wave system
     */
    update(deltaTime) {
        if (!this.isWaveActive) return;

        if (this.spawnQueue.length > 0) {
            this.spawnTimer += deltaTime;

            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.spawnEnemy(this.spawnQueue.shift());
                this.spawnInterval = this.getDynamicSpawnInterval();
            }
        }

        if (this.spawnQueue.length === 0) {
            const enemies = this.game.getEnemies();
            if (enemies.length === 0) {
                this.endWave();
            }
        }
    }

    /**
     * Spawn an enemy
     */
    spawnEnemy(type) {
        const pos = this.getSpawnPosition();

        let enemy;
        // Check if it's a boss type from EnemyTypes
        const bossTypes = ['berserkTitan', 'frostLord', 'infernoDrake', 'stormWraith', 'voidBehemoth'];
        if (bossTypes.includes(type)) {
            enemy = new Enemy(this.game, pos.x, pos.y, type);
            this.bossSpawned = true;
            this.game._triggerBossEntrance(enemy);
        } else if (type === 'boss') {
            // Legacy boss support
            enemy = new Enemy(this.game, pos.x, pos.y, 'berserkTitan');
            this.bossSpawned = true;
            this.game._triggerBossEntrance(enemy);
        } else {
            enemy = new Enemy(this.game, pos.x, pos.y, type);
        }

        enemy.aiDirective = this.getEnemyDirective(type);

        // Early waves stay readable; 30+ minutes and 60+ minutes ramp harder.
        let scaleFactor = this.getEnemyStatScaleFactor(this.currentWave);
        scaleFactor *= this.currentPlayerScaling?.statMultiplier ?? 1;

        enemy.maxHealth = Math.floor(enemy.maxHealth * scaleFactor);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.floor(enemy.damage * scaleFactor);

        if (this.currentWaveType === 'boss') {
            const bossWaveMultiplier = this.getBossWaveMultiplier(this.currentWave);
            enemy.maxHealth = Math.floor(enemy.maxHealth * bossWaveMultiplier);
            enemy.health = enemy.maxHealth;
            enemy.damage = Math.floor(enemy.damage * bossWaveMultiplier);
        }

        // Elite pressure now ramps again after 30 and 60 minutes.
        const eliteBonus = this.currentPlayerScaling?.eliteBonus ?? 0;
        const eliteStats = this.getEliteStats(this.currentWave);
        const eliteChance = Math.min(0.5, eliteStats.chance + eliteBonus);
        if (this.currentWave >= 4 && Utils.seededRandom() < eliteChance && !enemy.isBoss) {
            enemy.isElite = true;
            enemy.maxHealth = Math.floor(enemy.maxHealth * eliteStats.healthMultiplier);
            enemy.health = enemy.maxHealth;
            enemy.damage = Math.floor(enemy.damage * eliteStats.damageMultiplier);
            enemy.xp *= 3;
            enemy.speed *= eliteStats.speedMultiplier;
            enemy.eliteGlow = true;
        }

        // Optional challenge modifier: giant enemies trade speed for much higher pressure.
        if (this.game._giantModifier && !enemy.isBoss) {
            enemy.isGiant = true;
            enemy.maxHealth = Math.floor(enemy.maxHealth * 2);
            enemy.health = enemy.maxHealth;
            enemy.damage = Math.floor(enemy.damage * 1.25);
            enemy.xp = Math.floor(enemy.xp * 1.5);
            enemy.width = Math.floor(enemy.width * 1.5);
            enemy.height = Math.floor(enemy.height * 1.5);
            enemy.collisionRadius *= 1.5;
            enemy.speed *= 0.85;
        }

        // XP on death (and network broadcast for host)
        const originalDie = enemy.die.bind(enemy);
        enemy.die = () => {
            if (this.game.givePlayerXP) {
                this.game.givePlayerXP(enemy.xp || 10);
            }
            originalDie();
        };

        this.game.addEntity(enemy);

        // Register this enemy with the network (host assigns _netId and broadcasts ENEMY_SPAWN)
        this.game.networkManager?.registerEnemy(enemy);
    }

    getPlayerScaling(waveType = 'mixed') {
        const playersRaw = this.game.getActivePlayerCount?.() ?? 1;
        const players = Math.max(1, Math.min(4, playersRaw));
        const extra = players - 1;

        if (extra <= 0) {
            return {
                players: 1,
                countMultiplier: 1,
                statMultiplier: 1,
                cadenceMultiplier: 1,
                eliteBonus: 0
            };
        }

        const isBossWave = waveType === 'boss';
        const countMultiplier = 1 + extra * (isBossWave ? 0.28 : 0.4);
        const statMultiplier = 1 + extra * (isBossWave ? 0.08 : 0.09);
        const cadenceMultiplier = Math.max(0.72, 1 - extra * 0.08);

        return {
            players,
            countMultiplier,
            statMultiplier,
            cadenceMultiplier,
            eliteBonus: extra * 0.012
        };
    }

    applyPlayerScalingToWave(enemies) {
        const countMultiplier = this.currentPlayerScaling?.countMultiplier ?? 1;
        if (countMultiplier <= 1 || !Array.isArray(enemies) || enemies.length === 0) return;

        const targetCount = Math.max(enemies.length, Math.ceil(enemies.length * countMultiplier));
        const bossTypes = new Set(['berserkTitan', 'frostLord', 'infernoDrake', 'stormWraith', 'voidBehemoth', 'boss']);
        const pool = enemies.filter(type => !bossTypes.has(type));
        const fallbackPool = ['grunt', 'speeder', 'tank', 'bomber'];
        const source = pool.length > 0 ? pool : fallbackPool;

        while (enemies.length < targetCount) {
            enemies.push(source[Utils.seededInt(0, source.length - 1)]);
        }
    }

    getEnemyDirective(type) {
        if (this.currentWaveType === 'boss' || this.bossWave) return 'boss';

        const siegeUnits = new Set(['tank', 'bomber', 'mummy', 'swampThing', 'lavaGolem', 'voidBehemoth', 'berserkTitan']);
        const swarmUnits = new Set(['speeder', 'iceWolf', 'shadow', 'scorpion']);
        const rangedUnits = new Set(['poisonFrog', 'fireImp', 'frostElemental', 'infernoDrake', 'stormWraith']);

        if (siegeUnits.has(type)) return 'siege';
        if (swarmUnits.has(type)) return 'swarm';
        if (rangedUnits.has(type)) return 'ranged';
        if (this.currentWaveType === 'elite') return 'elite';

        return this.currentWaveType || 'mixed';
    }

    /**
     * Get spawn position
     */
    getSpawnPosition() {
        const player = this.game.player;
        const world = this.game.world;
        const margin = 100;

        let x, y;
        let attempts = 0;

        do {
            const edge = Utils.randomInt(0, 3);

            switch (edge) {
                case 0: x = Utils.randomFloat(margin, world.width - margin); y = margin; break;
                case 1: x = world.width - margin; y = Utils.randomFloat(margin, world.height - margin); break;
                case 2: x = Utils.randomFloat(margin, world.width - margin); y = world.height - margin; break;
                case 3: x = margin; y = Utils.randomFloat(margin, world.height - margin); break;
            }
            attempts++;
        } while (Utils.distance(x, y, player.x, player.y) < 300 && attempts < 10);

        return { x, y };
    }

    /**
     * Get number of remaining enemies
     */
    getRemainingEnemies() {
        const enemies = this.game.getEnemies();
        return this.spawnQueue.length + enemies.length;
    }

    /**
     * End wave
     */
    endWave() {
        this.isWaveActive = false;

        const reward = this.getWaveReward();
        for (const [type, amount] of Object.entries(reward)) {
            if (amount > 0) this.game.resourceSystem.addResource(type, amount);
        }

        this.updateWaveUI();

        // Notify objective system
        this.game.objectiveSystem?.onWaveEnd(this.game.objectiveSystem?._wallLostThisWave);
    }

    getWaveReward() {
        const wave = this.currentWave;
        return {
            wood: 14 + wave * 3,
            stone: 10 + Math.floor(wave * 2.2),
            metal: wave >= 3 ? Math.floor((wave - 1) / 2) : 0,
            amethyst: wave >= 8 ? Math.floor((wave - 6) / 3) : 0
        };
    }

    /**
     * Update wave UI
     */
    updateWaveUI() {
        const waveText = document.getElementById('wave-text');
        const waveProgress = document.getElementById('wave-progress');

        if (waveText) {
            const config = this.waveConfigs[this.currentWave - 1];
            const waveType = config ? config.waveType.toUpperCase() : '';
            const typeColor = {
                'SWARM': '#44aa44',
                'ELITE': '#ff4444',
                'RANGED': '#4444ff',
                'SIEGE': '#ff8844',
                'BOSS': '#ff0000',
                'MIXED': '#ffffff'
            }[waveType] || '#ffffff';
            
            waveText.textContent = this.isWaveActive ?
                `Wave ${this.currentWave} - ${waveType} [${this.spawnBiome.toUpperCase()}]` :
                `Wave ${this.currentWave} Complete`;
            waveText.style.color = this.isWaveActive ? typeColor : '#00ff00';
        }

        if (waveProgress) {
            const enemies = this.game.getEnemies();
            const total = this.spawnQueue.length + enemies.length;
            const remaining = enemies.length;
            const progress = total > 0 ? (1 - remaining / Math.max(total, 1)) * 100 : 100;
            waveProgress.style.width = `${progress}%`;
        }
    }

    /**
     * Client receives wave state from host — update local UI without spawning enemies.
     */
    receiveNetworkUpdate(msg) {
        this.currentWave  = msg.wave ?? this.currentWave;
        this.isWaveActive = msg.active ?? this.isWaveActive;
        this.updateWaveUI();
    }
}

export default WaveSystem;
