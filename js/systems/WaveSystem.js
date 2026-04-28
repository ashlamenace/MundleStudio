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
        this.bonusSpawnQueue = [];
        this.bonusSpawnTimer = 0;
        this.bonusSpawnInterval = 0.42;
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
                    {
                        const swarmMultiplier = i <= 3 ? 1.15 : i <= 9 ? 1.25 : 1.45;
                        config.enemies = this.fillEnemies(['grunt', 'grunt', 'speeder', 'speeder'], Math.floor(baseCount * swarmMultiplier));
                    }
                    break;

                case 'elite':
                    // Fewer enemies, but they demand focused DPS.
                    config.enemies = this.fillEnemies(['tank', 'tank', 'bomber', 'wanderer'], Math.floor(baseCount * 0.45) + 3);
                    break;

                case 'ranged':
                    // Ranged attackers arrive earlier, but still mixed with low HP units.
                    {
                        const rangedPool = i < 7
                            ? ['speeder', 'speeder', 'poisonFrog', 'grunt', 'grunt']
                            : ['speeder', 'poisonFrog', 'fireImp', 'grunt'];
                        config.enemies = this.fillEnemies(rangedPool, Math.floor(baseCount * 0.9));
                    }
                    break;

                case 'siege':
                    // Building destroyers. Lava golems are held back until wave 12+.
                    {
                        const siegePool = i >= 12
                            ? ['tank', 'tank', 'mummy', 'swampThing', 'lavaGolem']
                            : i < 10
                                ? ['tank', 'tank', 'bomber']
                                : ['tank', 'tank', 'bomber', 'mummy'];
                        const siegeBonus = i < 10 ? 2 : 4;
                        config.enemies = this.fillEnemies(siegePool, Math.floor(baseCount * 0.6) + siegeBonus);
                    }
                    break;

                case 'boss':
                    // Boss wave with minions
                    const bossTypes = ['berserkTitan', 'frostLord', 'infernoDrake', 'stormWraith'];
                    if (i >= 25) bossTypes.push('voidBehemoth');
                    config.enemies.push(bossTypes[Utils.seededInt(0, bossTypes.length - 1)]);

                    // Minions: few at early boss waves, escalates after wave 10
                    const minionCount = i < 10
                        ? Math.floor(2 + i * 0.45)                          // W5->4, W9->6
                        : Math.floor(4 + i * 0.9 + Math.max(0, i - 20) * 0.1); // W10→13, W20→22
                    const minionPool = i < 10
                        ? ['grunt', 'speeder', 'tank', 'bomber']
                        : ['tank', 'bomber', 'speeder', 'mummy', 'poisonFrog'];
                    config.enemies.push(...this.fillEnemies(minionPool, minionCount));
                    break;

                default:  // mixed
                    const baseEnemies = ['grunt', 'grunt', 'speeder'];
                    if (i >= 4) baseEnemies.push('tank');
                    if (i >= 6) baseEnemies.push('bomber');
                    if (i >= 9) baseEnemies.push('scorpion', 'poisonFrog');
                    config.enemies = this.fillEnemies(baseEnemies, Math.floor(baseCount));

                    // Rare biome mobs appear earlier, but remain a minority before wave 8.
                    const biomeMobs = ['scorpion', 'mummy', 'frostElemental', 'iceWolf', 'swampThing', 'poisonFrog', 'fireImp'];
                    const rareChance = i < 6 ? 0 : i < 8 ? 0.04 : 0.1;
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
            4: 'mixed',
            6: 'ranged',
            7: 'mixed',
            8: 'siege',
            9: 'swarm'
        };
        if (earlyPattern[wave]) return earlyPattern[wave];

        const pattern = ['mixed', 'swarm', 'ranged', 'elite', 'mixed', 'siege'];
        return pattern[(wave - 11) % pattern.length];
    }

    getBaseEnemyCount(wave) {
        if (wave <= 5) {
            // Gentler start: W1->4, W2->6, W3->8, W4->10, W5->12 (before type modifiers)
            return 2 + wave * 2;
        }
        if (wave <= 15) {
            return 12 + (wave - 5) * 3.1;
        }
        if (wave <= 30) {
            return 46 + (wave - 15) * 4.0;
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
        const versusMode = this.game.gameMode === 'versus_ffa';
        this.currentPlayerScaling = versusMode
            ? {
                players: 1,
                countMultiplier: 1,
                statMultiplier: 1,
                cadenceMultiplier: 1,
                eliteBonus: 0
            }
            : this.getPlayerScaling(this.currentWaveType);

        // Add biome-specific enemies based on current biome
        const biomeEnemies = BiomeEnemies[this.spawnBiome] || [];
        const biomeAdds = Math.min(5, 1 + Math.floor(this.currentWave / 4));
        for (let i = 0; i < biomeAdds; i++) {
            if (biomeEnemies.length > 0 && Utils.seededRandom() < 0.45) {
                enemies.push(biomeEnemies[Utils.seededInt(0, biomeEnemies.length - 1)]);
            }
        }

        if (versusMode) {
            this.spawnQueue = this.buildVersusSpawnQueue(enemies);
        } else {
            // Multiplayer scaling: increase wave volume with player count while
            // preserving the current wave composition (boss stays unique).
            this.applyPlayerScalingToWave(enemies);
            this.spawnQueue = enemies;
        }
        this.spawnTimer = 0;
        this.spawnCadenceVariance = Math.min(0.32, 0.08 + this.currentWave * 0.008);
        this.spawnInterval = this.getDynamicSpawnInterval();
        this.updateWaveUI();
    }

    buildVersusSpawnQueue(baseEnemies) {
        const activeSlots = this.game.getAliveCrystalSlots?.() ?? [];
        if (activeSlots.length === 0) return [];

        const queue = [];
        for (let i = 0; i < baseEnemies.length; i++) {
            for (const slot of activeSlots) {
                queue.push({ type: baseEnemies[i], slot });
            }
        }
        return queue;
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
            return 0.95 + (wave - 1) * 0.045;
        }
        if (wave <= 15) {
            const baseScale = 0.95 + 5 * 0.045;
            return baseScale + (wave - 6) * 0.074;
        }
        if (wave <= 30) {
            const baseScale = 0.95 + 5 * 0.045 + 9 * 0.074;
            return baseScale + (wave - 15) * 0.11;
        }

        const baseScale = 0.95 + 5 * 0.045 + 9 * 0.074 + 15 * 0.11;
        return baseScale + (wave - 30) * 0.22;
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
                damageMultiplier: 1.90,
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
        const hasBonusSpawns = this.bonusSpawnQueue.length > 0;
        if (!this.isWaveActive && !hasBonusSpawns) return;

        if (this.spawnQueue.length > 0) {
            this.spawnTimer += deltaTime;

            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.spawnEnemy(this.spawnQueue.shift());
                this.spawnInterval = this.getDynamicSpawnInterval();
            }
        }

        if (this.bonusSpawnQueue.length > 0) {
            this.bonusSpawnTimer += deltaTime;

            if (this.bonusSpawnTimer >= this.bonusSpawnInterval) {
                this.bonusSpawnTimer = 0;
                this.spawnEnemy(this.bonusSpawnQueue.shift());
                this.bonusSpawnInterval = Utils.randomFloat(0.34, 0.55);
            }
        }

        if (this.isWaveActive && this.spawnQueue.length === 0 && this.bonusSpawnQueue.length === 0) {
            const enemies = this.getWaveBlockingEnemies();
            if (enemies.length === 0) {
                this.endWave();
            }
        }
    }

    /**
     * Spawn an enemy
     */
    spawnEnemy(type) {
        const waveEntry = typeof type === 'object' && type !== null
            ? type
            : { type, slot: null };
        const pos = this.getSpawnPosition(waveEntry.slot);

        let enemy;
        // Check if it's a boss type from EnemyTypes
        const bossTypes = ['berserkTitan', 'frostLord', 'infernoDrake', 'stormWraith', 'voidBehemoth'];
        if (bossTypes.includes(waveEntry.type)) {
            enemy = new Enemy(this.game, pos.x, pos.y, waveEntry.type);
            this.bossSpawned = true;
            this.game._triggerBossEntrance(enemy);
        } else if (waveEntry.type === 'boss') {
            // Legacy boss support
            enemy = new Enemy(this.game, pos.x, pos.y, 'berserkTitan');
            this.bossSpawned = true;
            this.game._triggerBossEntrance(enemy);
        } else {
            enemy = new Enemy(this.game, pos.x, pos.y, waveEntry.type);
        }

        enemy.aiDirective = this.getEnemyDirective(waveEntry.type);
        enemy.targetCrystalSlot = waveEntry.slot ?? this.game.playerSlot ?? null;
        enemy._laneSlot = enemy.targetCrystalSlot;

        // Early waves stay readable; 30+ minutes and 60+ minutes ramp harder.
        const effectiveWave = Math.max(1, Math.floor(waveEntry.wave ?? this.currentWave ?? 1));
        let scaleFactor = this.getEnemyStatScaleFactor(effectiveWave);
        scaleFactor *= this.currentPlayerScaling?.statMultiplier ?? 1;

        enemy.maxHealth = Math.floor(enemy.maxHealth * scaleFactor);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.floor(enemy.damage * scaleFactor);

        if (this.currentWaveType === 'boss') {
            const bossWaveMultiplier = this.getBossWaveMultiplier(effectiveWave);
            enemy.maxHealth = Math.floor(enemy.maxHealth * bossWaveMultiplier);
            enemy.health = enemy.maxHealth;
            enemy.damage = Math.floor(enemy.damage * bossWaveMultiplier);
        }

        // Elite pressure now ramps again after 30 and 60 minutes.
        const eliteBonus = this.currentPlayerScaling?.eliteBonus ?? 0;
        const eliteStats = this.getEliteStats(effectiveWave);
        const eliteChance = Math.min(0.5, eliteStats.chance + eliteBonus);
        if (effectiveWave >= 4 && Utils.seededRandom() < eliteChance && !enemy.isBoss) {
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

    enqueueBonusVersusRaid(options = {}) {
        if (this.game.gameMode !== 'versus_ffa') return 0;

        const targetSlots = (options.targetSlots ?? [])
            .filter(slot => slot && !this.game.isSlotEliminated?.(slot));
        if (targetSlots.length === 0) return 0;

        const wave = Math.max(1, Math.floor(options.wave ?? this.currentWave + 1));
        const raidType = options.raidType ?? 'mixed';
        const countScale = Math.max(0.5, Math.min(1.6, Number(options.countScale ?? 1)));
        const count = Math.max(4, Math.floor((5 + wave * 1.35) * countScale));
        const pool = this.getBonusRaidEnemyPool(raidType, wave);
        let added = 0;

        for (const slot of targetSlots) {
            for (let i = 0; i < count; i++) {
                this.bonusSpawnQueue.push({
                    type: pool[Utils.seededInt(0, pool.length - 1)],
                    slot,
                    wave,
                    bonusRaid: true,
                    attackerSlot: options.attackerSlot ?? null
                });
                added++;
            }
        }

        this.updateWaveUI();
        return added;
    }

    getBonusRaidEnemyPool(raidType, wave) {
        if (raidType === 'swarm') {
            const pool = ['grunt', 'grunt', 'speeder', 'speeder'];
            if (wave >= 6) pool.push('iceWolf', 'scorpion');
            return pool;
        }

        if (raidType === 'siege') {
            const pool = ['tank', 'tank', 'bomber'];
            if (wave >= 5) pool.push('mummy', 'swampThing');
            if (wave >= 12) pool.push('lavaGolem');
            return pool;
        }

        const pool = ['grunt', 'speeder', 'tank', 'bomber'];
        if (wave >= 5) pool.push('scorpion', 'poisonFrog');
        if (wave >= 10) pool.push('fireImp', 'frostElemental');
        return pool;
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
    getSpawnPosition(slot = null) {
        const player = this.game.player;
        const world = this.game.world;
        const margin = 100;

        if (this.game.gameMode === 'versus_ffa') {
            const island = world.getIslandForSlot?.(slot ?? this.game.playerSlot);
            if (island) {
                return this.getVersusSpawnPosition(island);
            }
        }

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

    getVersusSpawnPosition(island) {
        const shape = island.shape;
        if (!shape || shape.type !== 'ellipse') {
            const inset = 48;
            const positions = [
                {
                    x: Utils.randomFloat(island.bounds.left + inset, island.bounds.right - inset),
                    y: island.bounds.top + inset
                },
                {
                    x: island.bounds.right - inset,
                    y: Utils.randomFloat(island.bounds.top + inset, island.bounds.bottom - inset)
                },
                {
                    x: Utils.randomFloat(island.bounds.left + inset, island.bounds.right - inset),
                    y: island.bounds.bottom - inset
                },
                {
                    x: island.bounds.left + inset,
                    y: Utils.randomFloat(island.bounds.top + inset, island.bounds.bottom - inset)
                }
            ];
            return positions[Utils.randomInt(0, positions.length - 1)];
        }

        const edgeInset = 56;
        const radiusX = Math.max(96, shape.radiusX - edgeInset);
        const radiusY = Math.max(96, shape.radiusY - edgeInset);
        const sideOptions = this.getVersusSpawnSides(island);
        const side = sideOptions[Utils.randomInt(0, sideOptions.length - 1)];
        const offset = Utils.randomFloat(-0.6, 0.6);

        if (side === 0 || side === 2) {
            const xNorm = offset;
            const yNorm = Math.sqrt(Math.max(0, 1 - xNorm * xNorm));
            return {
                x: shape.centerX + xNorm * radiusX,
                y: shape.centerY + (side === 0 ? -yNorm : yNorm) * radiusY
            };
        }

        const yNorm = offset;
        const xNorm = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        return {
            x: shape.centerX + (side === 1 ? xNorm : -xNorm) * radiusX,
            y: shape.centerY + yNorm * radiusY
        };
    }

    getVersusSpawnSides(island) {
        const allSides = [0, 1, 2, 3];
        const blockedBySlot = {
            north: [1, 3],
            south: [1, 3],
            east: [0, 2],
            west: [0, 2]
        };

        const blocked = blockedBySlot[island?.slot] ?? [];
        const allowed = allSides.filter(side => !blocked.includes(side));
        return allowed.length > 0 ? allowed : allSides;
    }

    /**
     * Get number of remaining enemies
     */
    getRemainingEnemies() {
        const enemies = this.getWaveBlockingEnemies();
        return this.spawnQueue.length + this.bonusSpawnQueue.length + enemies.length;
    }

    getWaveBlockingEnemies() {
        return (this.game.getEnemies?.() ?? []).filter(enemy => !enemy._ignoreWaveCompletion);
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
            const allEnemies = this.game.getEnemies();
            // In versus mode, count only enemies targeting the local player's island
            const localSlot = this.game.playerSlot ?? null;
            const enemies = (this.game.gameMode === 'versus_ffa' && localSlot)
                ? allEnemies.filter(e => !e.targetCrystalSlot || e.targetCrystalSlot === localSlot)
                : allEnemies;

            const spawnLeft  = typeof this._netSpawnLeft === 'number'
                ? this._netSpawnLeft          // client: use host-authoritative value
                : this.spawnQueue.length + this.bonusSpawnQueue.length;     // host / solo: use local queue
            const remaining  = enemies.length + spawnLeft;
            // Track the maximum remaining seen since wave start to compute progress
            this._netWaveStartTotal = Math.max(this._netWaveStartTotal || 0, remaining);
            const progress = this._netWaveStartTotal > 0
                ? (1 - remaining / this._netWaveStartTotal) * 100
                : 100;
            waveProgress.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }
    }

    /**
     * Client receives wave state from host — update local UI without spawning enemies.
     */
    receiveNetworkUpdate(msg) {
        const wasActive   = this.isWaveActive;
        const prevWave    = this.currentWave;
        this.currentWave  = msg.wave  ?? this.currentWave;
        this.isWaveActive = msg.active ?? this.isWaveActive;

        if (typeof msg.spawnLeft === 'number') {
            this._netSpawnLeft = msg.spawnLeft;
        }
        // Reset progress tracking when a new wave begins
        if (!wasActive && this.isWaveActive) {
            this._netWaveStartTotal = 0;
        }
        if (!this.isWaveActive) {
            this._netSpawnLeft      = 0;
            this._netWaveStartTotal = 0;
        }

        // Notify clients when a new wave starts
        if (!wasActive && this.isWaveActive) {
            const waveType = msg.waveType ?? 'mixed';
            const typeColors = { swarm: '#44ee44', elite: '#ff4444', ranged: '#4488ff', siege: '#ff8844', boss: '#ff0000', mixed: '#ffffff' };
            const color = typeColors[waveType] || '#ffffff';
            const typeLabels = { swarm: 'ESSAIM', elite: 'ÉLITE', ranged: 'DISTANCE', siege: 'SIÈGE', boss: '⚠ BOSS ⚠', mixed: 'MIXTE' };
            const label = typeLabels[waveType] || waveType.toUpperCase();
            this.game.showNotification(`Vague ${this.currentWave} — ${label}`, 'Préparez-vous !', color, 3);
        }

        this.updateWaveUI();
    }
}

export default WaveSystem;
