/**
 * Building System - manages construction and building logic
 */

import { Utils } from '../core/Utils.js';
import { Projectile } from '../entities/Projectile.js';

// Max turrets allowed per crystal level (index = crystal level 0-5)
// Calculation basis: BasicTurret 10 DPS, LaserTurret 12.5 DPS, Flame ~13 DPS,
// Sniper ~15 DPS, Ballista ~23 DPS. A wave lasts ~60s.
// Cap forces strategic specialisation without making turrets trivial.
export const TURRET_CAPS = [0, 3, 5, 6, 8, 10];

// Production rates in resources/second per level.
// Lower values prevent miners from trivialising the resource economy —
// players must still rely on wave rewards and cave exploration.
export const AUTO_MINER_PRODUCTION_RATES = {
    woodMiner:  [0.10, 0.18, 0.28],   // was [0.25, 0.5,  0.8 ] — 6/9/17 per min
    stoneMiner: [0.08, 0.14, 0.22],   // was [0.2,  0.4,  0.65] — 5/8/13 per min
    metalMiner: [0.05, 0.10, 0.16]    // was [0.12, 0.25, 0.4 ] — 3/6/10 per min
};

const AUTO_MINER_AUTO_DELIVER_INTERVAL = 60;  // was 40 s — less frequent auto-delivery
const AUTO_MINER_MAX_STORAGE = 45;             // was 70 — smaller buffer per miner

// Building configurations
export const BuildingConfigs = {
    // WALLS
    woodWall: {
        name: 'Wood Wall',
        type: 'wall',
        tier: 1,
        crystalLevel: 0,
        icon: '🪵',
        health: 200,
        cost: { wood: 10 },
        color: '#5c3a21',
        size: 32
    },
    stoneWall: {
        name: 'Stone Wall',
        type: 'wall',
        tier: 2,
        crystalLevel: 1,
        icon: '🪨',
        health: 500,
        cost: { stone: 15 },
        color: '#6b6b6b',
        size: 32
    },
    metalWall: {
        name: 'Metal Wall',
        type: 'wall',
        tier: 3,
        crystalLevel: 2,
        icon: '⚙️',
        health: 1000,
        cost: { metal: 12 },
        color: '#8a8a9a',
        size: 32
    },
    amethystWall: {
        name: 'Amethyst Wall',
        type: 'wall',
        tier: 4,
        crystalLevel: 3,
        icon: '💜',
        health: 2000,
        cost: { amethyst: 8 },
        color: '#9966cc',
        size: 32
    },

    // DOOR
    door: {
        name: 'Door',
        type: 'door',
        tier: 1,
        crystalLevel: 0,
        icon: '🚪',
        health: 150,
        cost: { wood: 12 },
        color: '#8b4513',
        size: 32
    },

    // TURRETS
    basicTurret: {
        name: 'Turret',
        type: 'turret',
        subType: 'basic',
        tier: 1,
        crystalLevel: 1,
        icon: '🔫',
        health: 200,
        cost: { stone: 15, wood: 20 },
        color: '#666666',
        size: 32,
        range: 200,
        damage: 10,
        fireRate: 1.0,
        projectileType: 'bullet',
        maxLevel: 5,
        upgradeCosts: {
            2: { stone: 20, metal: 10 },
            3: { metal: 25, amethyst: 15 },
            4: { metal: 35, amethyst: 25 },
            5: { metal: 50, amethyst: 40 }
        },
        tierStats: {
            1: { damage: 10, range: 200, fireRate: 1.0 },
            2: { damage: 14, range: 220, fireRate: 0.92 },
            3: { damage: 19, range: 240, fireRate: 0.85, doubleShot: 0.1 },
            4: { damage: 25, range: 260, fireRate: 0.78, doubleShot: 0.2 },
            5: { damage: 32, range: 280, fireRate: 0.72, tripleShot: 0.15 }
        }
    },
    laserTurret: {
        name: 'Laser Turret',
        type: 'turret',
        subType: 'laser',
        tier: 2,
        crystalLevel: 2,
        icon: '⚡',
        health: 250,
        cost: { metal: 25, stone: 15 },
        color: '#66e9ff',
        size: 32,
        range: 250,
        damage: 25,
        fireRate: 2.0,
        projectileType: 'laser',
        maxLevel: 5,
        upgradeCosts: {
            2: { metal: 30, amethyst: 20 },
            3: { metal: 40, amethyst: 30 },
            4: { metal: 55, amethyst: 45 },
            5: { metal: 75, amethyst: 65 }
        },
        tierStats: {
            1: { damage: 25, range: 250, fireRate: 2.0, armorPierce: 0 },
            2: { damage: 35, range: 270, fireRate: 1.85, armorPierce: 0.15 },
            3: { damage: 48, range: 290, fireRate: 1.7, armorPierce: 0.25 },
            4: { damage: 64, range: 310, fireRate: 1.55, armorPierce: 0.35 },
            5: { damage: 84, range: 330, fireRate: 1.4, armorPierce: 0.5, chainTargets: 1 }
        }
    },
    slowTurret: {
        name: 'Frost Turret',
        type: 'turret',
        subType: 'frost',
        tier: 2,
        crystalLevel: 3,
        icon: '❄️',
        health: 200,
        cost: { stone: 20, wood: 15 },
        color: '#66ccff',
        size: 32,
        range: 180,
        damage: 6,
        fireRate: 1.2,
        slowEffect: 0.3,
        projectileType: 'ice',
        maxLevel: 5,
        upgradeCosts: {
            2: { stone: 25, metal: 20 },
            3: { metal: 35, amethyst: 25 },
            4: { metal: 50, amethyst: 40 },
            5: { metal: 70, amethyst: 60 }
        },
        tierStats: {
            1: { damage: 6, range: 180, fireRate: 1.2, slowEffect: 0.3, slowDuration: 2.0, aoeRadius: 40 },
            2: { damage: 9, range: 200, fireRate: 1.1, slowEffect: 0.4, slowDuration: 2.5, aoeRadius: 50 },
            3: { damage: 13, range: 220, fireRate: 1.0, slowEffect: 0.5, slowDuration: 3.0, aoeRadius: 60 },
            4: { damage: 18, range: 240, fireRate: 0.9, slowEffect: 0.6, slowDuration: 3.5, aoeRadius: 70 },
            5: { damage: 24, range: 260, fireRate: 0.8, slowEffect: 0.7, slowDuration: 4.0, aoeRadius: 80, freezeChance: 0.05 }
        }
    },

    // AUTO-MINERS (passive income)
    woodMiner: {
        name: 'Wood Collector',
        type: 'autoMiner',
        tier: 1,
        crystalLevel: 1,
        icon: '🪓',
        health: 100,
        cost: { wood: 25, stone: 8 },
        color: '#2d5a27',
        size: 32,
        targetResource: 'wood',
        productionRate: AUTO_MINER_PRODUCTION_RATES.woodMiner[0],  // 0.25 wood/sec (15/min) at level 1
        maxLevel: 3,
        upgradeCosts: {
            2: { wood: 40, stone: 20 },
            3: { wood: 60, stone: 40, metal: 15 }
        }
    },
    stoneMiner: {
        name: 'Stone Drill',
        type: 'autoMiner',
        tier: 1,
        crystalLevel: 1,
        icon: '⛏️',
        health: 100,
        cost: { stone: 25, wood: 15 },
        color: '#6b6b6b',
        size: 32,
        targetResource: 'stone',
        productionRate: AUTO_MINER_PRODUCTION_RATES.stoneMiner[0],  // 0.20 stone/sec (12/min) at level 1
        maxLevel: 3,
        upgradeCosts: {
            2: { stone: 40, wood: 25 },
            3: { stone: 60, wood: 40, metal: 15 }
        }
    },
    metalMiner: {
        name: 'Metal Extractor',
        type: 'autoMiner',
        tier: 2,
        crystalLevel: 2,
        icon: '🔧',
        health: 150,
        cost: { metal: 30, stone: 20 },
        color: '#8a8a9a',
        size: 32,
        targetResource: 'metal',
        productionRate: AUTO_MINER_PRODUCTION_RATES.metalMiner[0],  // 0.12 metal/sec (7.2/min) at level 1
        maxLevel: 3,
        upgradeCosts: {
            2: { metal: 50, stone: 30 },
            3: { metal: 70, stone: 50, amethyst: 20 }
        }
    },

    // UTILITY
    workbench: {
        name: 'Établi',
        type: 'workbench',
        tier: 1,
        crystalLevel: 1,
        icon: '🔨',
        health: 300,
        cost: { wood: 40, stone: 25 },
        color: '#8b6914',
        size: 48
    },
    watchtower: {
        name: 'Tour de Guet',
        type: 'watchtower',
        tier: 1,
        crystalLevel: 3,
        icon: '🗼',
        health: 200,
        cost: { wood: 30, stone: 15, metal: 10 },
        color: '#7a6030',
        size: 32,
        revealRange: 500
    },
    forge: {
        name: 'Forge',
        type: 'forge',
        tier: 2,
        crystalLevel: 4,
        icon: '🔥',
        health: 350,
        cost: { metal: 40, stone: 20 },
        color: '#882200',
        size: 48
    },
    oilBarrel: {
        name: 'Baril d\'Huile',
        type: 'oilBarrel',
        tier: 1,
        crystalLevel: 2,
        icon: '🛢️',
        health: 30,
        cost: { wood: 15, stone: 5 },
        color: '#332200',
        size: 24,
        explosionDamage: 60,
        explosionRadius: 80
    },
    ballista: {
        name: 'Baliste',
        type: 'turret',
        subType: 'ballista',
        tier: 3,
        crystalLevel: 4,
        icon: '🏹',
        health: 200,
        cost: { metal: 35, stone: 20, amethyst: 15 },
        color: '#4a3a2a',
        size: 32,
        range: 600,
        damage: 80,
        fireRate: 3.5,
        projectileType: 'ballista',
        maxLevel: 3,
        upgradeCosts: {
            2: { metal: 50, amethyst: 25 },
            3: { metal: 80, amethyst: 50 }
        },
        tierStats: {
            1: { damage: 80, range: 600, fireRate: 3.5, piercing: true },
            2: { damage: 115, range: 650, fireRate: 3.0, piercing: true },
            3: { damage: 160, range: 700, fireRate: 2.5, piercing: true }
        }
    },
    rallyBanner: {
        name: 'Bannière de Ralliement',
        type: 'rallyBanner',
        tier: 2,
        crystalLevel: 3,
        icon: '🚩',
        health: 150,
        cost: { wood: 20, stone: 10, metal: 10 },
        color: '#cc2222',
        size: 24,
        rallyRange: 200,
        rallyBonus: 0.15
    },

    // NEW DEFENSES
    spikeTrap: {
        name: 'Spike Trap',
        type: 'spikeTrap',
        tier: 1,
        crystalLevel: 1,
        icon: '🔺',
        health: 50,
        cost: { wood: 8, stone: 5 },
        color: '#8b4513',
        size: 32,
        damage: 20 // damage per second
    },
    barricade: {
        name: 'Barricade',
        type: 'barricade',
        tier: 1,
        crystalLevel: 1,
        icon: '🛡️',
        health: 1500,
        cost: { stone: 20, wood: 15 },
        color: '#4a4a5a',
        size: 64, // 2x2 tiles (32x32 grid)
        regen: 5, // HP per second
        maxLevel: 3,
        upgradeCosts: {
            2: { stone: 30, wood: 20 },
            3: { stone: 40, wood: 30 }
        }
    },
    flameTurret: {
        name: 'Flame Turret',
        type: 'turret',
        subType: 'flame',
        tier: 2,
        crystalLevel: 4,
        icon: '🔥',
        health: 220,
        cost: { wood: 20, stone: 15 },
        color: '#ff6600',
        size: 32,
        range: 150,
        damage: 8,
        fireRate: 0.8,
        projectileType: 'flame',
        maxLevel: 5,
        upgradeCosts: {
            2: { stone: 25, metal: 20 },
            3: { metal: 35, amethyst: 25 },
            4: { metal: 50, amethyst: 40 },
            5: { metal: 70, amethyst: 60 }
        },
        tierStats: {
            1: { damage: 8, range: 150, fireRate: 0.8, burnDamage: 3, burnDuration: 3.0 },
            2: { damage: 12, range: 165, fireRate: 0.75, burnDamage: 5, burnDuration: 3.5 },
            3: { damage: 17, range: 180, fireRate: 0.7, burnDamage: 7, burnDuration: 4.0 },
            4: { damage: 23, range: 195, fireRate: 0.65, burnDamage: 10, burnDuration: 4.5 },
            5: { damage: 30, range: 210, fireRate: 0.6, burnDamage: 14, burnDuration: 5.0, aoeBurn: true, burnRadius: 50 }
        }
    },
    sniperTurret: {
        name: 'Sniper Turret',
        type: 'turret',
        subType: 'sniper',
        tier: 3,
        crystalLevel: 4,
        icon: '🎯',
        health: 180,
        cost: { metal: 30, stone: 20 },
        color: '#4a4a4a',
        size: 32,
        range: 400,
        damage: 40,
        fireRate: 3.0,
        projectileType: 'sniper',
        maxLevel: 5,
        upgradeCosts: {
            2: { metal: 40, amethyst: 30 },
            3: { metal: 55, amethyst: 45 },
            4: { metal: 75, amethyst: 65 },
            5: { metal: 100, amethyst: 90 }
        },
        tierStats: {
            1: { damage: 40, range: 400, fireRate: 3.0, critChance: 0.1, critMultiplier: 2.0 },
            2: { damage: 58, range: 440, fireRate: 2.8, critChance: 0.15, critMultiplier: 2.2 },
            3: { damage: 80, range: 480, fireRate: 2.6, critChance: 0.2, critMultiplier: 2.5 },
            4: { damage: 108, range: 520, fireRate: 2.4, critChance: 0.25, critMultiplier: 2.8 },
            5: { damage: 144, range: 560, fireRate: 2.2, critChance: 0.3, critMultiplier: 3.0, executeThreshold: 0.15 }
        }
    },
    healingShrine: {
        name: 'Healing Shrine',
        type: 'healingShrine',
        tier: 2,
        crystalLevel: 3,
        icon: '💚',
        health: 250,
        cost: { wood: 35, stone: 20, amethyst: 15 },
        color: '#32cd32',
        size: 48,
        healRate: 5, // HP per second
        healRange: 100,
        maxLevel: 3,
        upgradeCosts: {
            2: { wood: 30, amethyst: 25 },
            3: { wood: 40, amethyst: 30 }
        }
    }
};

// Building categories for menu
export const BuildingCategories = {
    defense: ['woodWall', 'stoneWall', 'metalWall', 'amethystWall', 'door', 'barricade', 'spikeTrap', 'basicTurret', 'laserTurret', 'slowTurret', 'flameTurret', 'sniperTurret', 'ballista', 'oilBarrel', 'rallyBanner'],
    production: ['woodMiner', 'stoneMiner', 'metalMiner'],
    utility: ['workbench', 'healingShrine', 'watchtower', 'forge']
};

/**
 * Building entity class
 */
export class Building {
    constructor(game, x, y, configKey) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.configKey = configKey;

        const config = BuildingConfigs[configKey];
        this.config = config;
        this.name = config.name;
        this.type = config.type;
        this.tier = config.tier;

        this.maxHealth = config.health;
        this.health = this.maxHealth;
        this.color = config.color;
        this.size = config.size;
        this.collisionRadius = config.size / 2;
        this.solid = true;

        this.destroyed = false;
        this.flashTimer = 0;

        // Construction animation (0 = just placed, 1 = fully built)
        this.buildProgress = 0;
        this.buildDuration = 1.2;

        // Upgrade system
        this.level = 1;
        this.maxLevel = config.maxLevel || 1;
        this.upgradeCosts = config.upgradeCosts || {};
        this.canUpgrade = this.maxLevel > 1;
        this.ownerId = null;

        // Type-specific properties
        if (this.type === 'turret') {
            this.baseDamage = config.damage;
            this.baseFireRate = config.fireRate;
            this.baseRange = config.range;
            this.subType = config.subType || 'basic';

            this.damage = this.baseDamage;
            this.fireRate = this.baseFireRate;
            this.range = this.baseRange;
            this.fireCooldown = 0;
            this.targetAngle = 0;
            this.currentTarget = null;
            this.projectileType = config.projectileType || 'bullet';
            this.slowEffect = config.slowEffect || 0;

            // Special ability properties (initialized from tierStats)
            this.doubleShot = 0;
            this.tripleShot = 0;
            this.armorPierce = 0;
            this.chainTargets = 0;
            this.freezeChance = 0;
            this.slowDuration = 2.0;
            this.aoeRadius = 0;
            this.burnDamage = 0;
            this.burnDuration = 0;
            this.aoeBurn = false;
            this.burnRadius = 0;
            this.critChance = 0;
            this.critMultiplier = 1.0;
            this.executeThreshold = 0;

            // Apply tier 1 stats if available
            if (config.tierStats && config.tierStats[1]) {
                this.applyTierStats(config.tierStats[1]);
            }
        }

        if (this.type === 'autoMiner') {
            this.targetResource = config.targetResource;
            this.productionRate = config.productionRate;
            this.baseProductionRate = config.productionRate;
            this.active = true; // Always active for passive production
            this.productionTimer = 0;
            this.storedResources = 0;
            this.maxStorage = config.maxStorage || AUTO_MINER_MAX_STORAGE;
            this.buildingKey = configKey; // Store for upgrade logic
            this.checkNearbyResource();
        }

        if (this.type === 'door') {
            this.isOpen = false;
            this.solid = true;
        }

        if (this.type === 'spikeTrap') {
            this.trapDamage = config.damage;
            this.damageTimer = 0;
        }

        if (this.type === 'barricade') {
            this.baseRegen = config.regen;
            this.regen = this.baseRegen;
            this.regenTimer = 0;
        }

        if (this.type === 'healingShrine') {
            this.baseHealRate = config.healRate;
            this.baseHealRange = config.healRange;
            this.healRate = this.baseHealRate;
            this.healRange = this.baseHealRange;
            this.healTimer = 0;
        }

        if (this.type === 'watchtower') {
            this.revealRange = config.revealRange;
        }

        if (this.type === 'oilBarrel') {
            this.explosionDamage = config.explosionDamage;
            this.explosionRadius = config.explosionRadius;
            this.triggered = false;
        }

        if (this.type === 'rallyBanner') {
            this.rallyRange = config.rallyRange;
            this.rallyBonus = config.rallyBonus;
        }

        if (this.type === 'forge') {
            this.forgeTimer = 0;
        }
    }

    /**
     * Check if auto-miner is near a resource
     */
    checkNearbyResource() {
        if (this.type !== 'autoMiner') return;

        const nodes = this.game.entities.filter(e =>
            e.type === 'resource' && e.resourceType === this.targetResource
        );

        // Auto-miners work in a larger radius (150 units)
        for (const node of nodes) {
            const dist = Utils.distance(this.x, this.y, node.x, node.y);
            if (dist < 150) {
                this.active = true;
                return;
            }
        }

        // If no nearby resource, still produce but at reduced rate
        // This allows miners to work even if resource nodes are depleted
        this.active = true;  // Always active for passive production
    }

    /**
     * Upgrade building to next level
     */
    upgrade() {
        if (this.level >= this.maxLevel) return false;

        const nextLevel = this.level + 1;
        const cost = this.getUpgradeCost(nextLevel);

        if (!cost || !this.game.resourceSystem.spendResources(cost)) {
            return false;
        }

        this.level = nextLevel;
        this.updateStats();

        // Restore HP to max after upgrade
        this.health = this.maxHealth;

        // Sync upgrade to other players
        if (this._netId) this.game.networkManager?.onBuildingUpgraded(this._netId, this.level);

        // Upgrade effect
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            this.game.addParticle({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 60,
                vy: Math.sin(angle) * 60,
                color: '#ffcc00',
                lifetime: 0.8,
                age: 0,
                size: 4,
                destroyed: false,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - this.age / this.lifetime;
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = alpha;
                    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                    ctx.globalAlpha = 1;
                }
            });
        }

        return true;
    }

    /**
     * Update stats based on current level
     */
    updateStats() {
        const level = this.level;

        if (this.type === 'turret') {
            // Use tierStats if available, otherwise fallback to formula
            const tierStats = this.config.tierStats?.[level];
            if (tierStats) {
                this.applyTierStats(tierStats);
            } else {
                // Fallback to old formula-based scaling
                this.damage = this.baseDamage * (1 + 0.2 * (level - 1));
                this.fireRate = this.baseFireRate * (1 - 0.08 * (level - 1));
                this.range = this.baseRange * (1 + 0.1 * (level - 1));
            }
            this.maxHealth = this.config.health * (1 + 0.25 * (level - 1));
        }

        if (this.type === 'autoMiner') {
            this.updateAutoMinerStats();
        }

        if (this.type === 'barricade') {
            // +33% health, +60% regen per level
            this.maxHealth = this.config.health * (1 + 0.33 * (level - 1));
            this.regen = this.baseRegen * (1 + 0.6 * (level - 1));
            if (this.health > this.maxHealth) this.health = this.maxHealth;
        }

        if (this.type === 'healingShrine') {
            // +60% heal rate, +30% range per level
            this.healRate = this.baseHealRate * (1 + 0.6 * (level - 1));
            this.healRange = this.baseHealRange * (1 + 0.3 * (level - 1));
        }
    }

    getUpgradeCost(level = this.level + 1) {
        const baseCost = this.upgradeCosts[level];
        return this.game.scaleCost(baseCost, 'buildingUpgrade');
    }

    /**
     * Apply tier-specific stats to turret
     */
    applyTierStats(tierStats) {
        // Core stats
        if (tierStats.damage !== undefined) this.damage = tierStats.damage;
        if (tierStats.range !== undefined) this.range = tierStats.range;
        if (tierStats.fireRate !== undefined) this.fireRate = tierStats.fireRate;

        // Special abilities
        this.doubleShot = tierStats.doubleShot || 0;
        this.tripleShot = tierStats.tripleShot || 0;
        this.armorPierce = tierStats.armorPierce || 0;
        this.chainTargets = tierStats.chainTargets || 0;
        this.freezeChance = tierStats.freezeChance || 0;
        this.slowEffect = tierStats.slowEffect || this.slowEffect || 0;
        this.slowDuration = tierStats.slowDuration || 2.0;
        this.aoeRadius = tierStats.aoeRadius || 0;
        this.burnDamage = tierStats.burnDamage || 0;
        this.burnDuration = tierStats.burnDuration || 0;
        this.aoeBurn = tierStats.aoeBurn || false;
        this.burnRadius = tierStats.burnRadius || 0;
        this.critChance = tierStats.critChance || 0;
        this.critMultiplier = tierStats.critMultiplier || 1.0;
        this.executeThreshold = tierStats.executeThreshold || 0;
    }

    /**
     * Update building logic
     */
    update(deltaTime) {
        // Construction animation
        if (this.buildProgress < 1) {
            this.buildProgress = Math.min(1, this.buildProgress + deltaTime / this.buildDuration);
        }

        // Flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }

        // Turret logic
        if (this.type === 'turret') {
            this.updateTurret(deltaTime);
        }

        // Auto-miner logic
        if (this.type === 'autoMiner') {
            this.updateAutoMiner(deltaTime);
        }

        // Door logic
        if (this.type === 'door') {
            this.updateDoor();
        }

        // Spike trap logic
        if (this.type === 'spikeTrap') {
            this.updateSpikeTrap(deltaTime);
        }

        // Barricade regeneration
        if (this.type === 'barricade') {
            this.updateBarricade(deltaTime);
        }

        // Healing shrine logic
        if (this.type === 'healingShrine') {
            this.updateHealingShrine(deltaTime);
        }

        // Watchtower spotting logic
        if (this.type === 'watchtower') {
            this.updateWatchtower(deltaTime);
        }

        // Oil barrel proximity trigger
        if (this.type === 'oilBarrel') {
            this.updateOilBarrel(deltaTime);
        }

        // Rally banner buff logic
        if (this.type === 'rallyBanner') {
            this.updateRallyBanner(deltaTime);
        }

        // Forge conversion logic
        if (this.type === 'forge') {
            this.updateForge(deltaTime);
        }
    }

    /**
     * Spike trap damages enemies standing on it
     */
    updateSpikeTrap(deltaTime) {
        this.damageTimer += deltaTime;

        if (this.damageTimer >= 0.5) { // Damage every 0.5 seconds
            this.damageTimer = 0;

            const enemies = this.game.getEnemies();
            for (const enemy of enemies) {
                const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
                if (dist < this.size / 2 + enemy.collisionRadius) {
                    enemy.takeDamage(this.trapDamage / 2, this); // Half damage per tick
                }
            }
        }
    }

    /**
     * Barricade regenerates health over time
     */
    updateBarricade(deltaTime) {
        if (this.health < this.maxHealth) {
            this.regenTimer += deltaTime;

            if (this.regenTimer >= 1) { // Regen every second
                this.regenTimer = 0;
                this.health = Math.min(this.health + this.regen, this.maxHealth);
            }
        }
    }

    /**
     * Healing shrine heals player in range
     */
    updateHealingShrine(deltaTime) {
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);

        if (dist < this.healRange && player.health < player.maxHealth) {
            this.healTimer += deltaTime;

            if (this.healTimer >= 1) { // Heal every second
                this.healTimer = 0;
                const before = player.health;
                player.health = Math.min(player.health + this.healRate, player.maxHealth);
                const healed = player.health - before;
                if (healed > 0) this.game.objectiveSystem?.onHeal(healed);

                // Healing particle
                this.game.addParticle({
                    x: player.x,
                    y: player.y - 20,
                    vy: -20,
                    text: `+${Math.floor(this.healRate)}`,
                    color: '#00ff00',
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
                        ctx.fillStyle = this.color;
                        ctx.globalAlpha = alpha;
                        ctx.font = 'bold 12px Rajdhani';
                        ctx.textAlign = 'center';
                        ctx.fillText(this.text, this.x, this.y);
                        ctx.globalAlpha = 1;
                    }
                });
            }
        }
    }

    /**
     * Watchtower: spot enemies in reveal range for minimap
     */
    updateWatchtower(deltaTime) {
        if (!this._spotTimer) this._spotTimer = 0;
        this._spotTimer += deltaTime;

        const enemies = this.game.getEnemies();
        for (const enemy of enemies) {
            if (enemy._spottedTimer > 0) {
                enemy._spottedTimer -= deltaTime;
                if (enemy._spottedTimer <= 0) enemy._spotted = false;
            }
        }

        if (this._spotTimer >= 1.0) {
            this._spotTimer = 0;
            for (const enemy of enemies) {
                const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
                if (dist < this.revealRange) {
                    enemy._spotted = true;
                    enemy._spottedTimer = 2.5;
                }
            }
        }
    }

    /**
     * Oil barrel: explode when enemy enters radius
     */
    updateOilBarrel(deltaTime) {
        if (this.triggered) return;
        const enemies = this.game.getEnemies();
        for (const enemy of enemies) {
            const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
            if (dist < this.explosionRadius * 0.6) {
                this._triggerExplosion();
                return;
            }
        }
    }

    _triggerExplosion() {
        if (this.triggered) return;
        this.triggered = true;

        const enemies = this.game.getEnemies();
        for (const enemy of enemies) {
            const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
            if (dist < this.explosionRadius) {
                const falloff = 1 - dist / this.explosionRadius;
                enemy.takeDamage(this.explosionDamage * falloff, this);
            }
        }

        this.game.visualEffects?.createExplosionEffect(this.x, this.y, this.explosionRadius);
        this.game.camera.shake(10, 0.3);
        this.game.audioSystem?.playExplosion?.();
        this.destroy();
    }

    /**
     * Rally banner: boost player damage/speed while in range
     */
    updateRallyBanner(deltaTime) {
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);
        const inRange = dist < this.rallyRange;

        if (inRange && !this._rallyActive) {
            this._rallyActive = true;
            player._rallyDamageBonus = (player._rallyDamageBonus || 0) + this.rallyBonus;
            player._rallySpeedBonus = (player._rallySpeedBonus || 0) + this.rallyBonus * 0.5;
        } else if (!inRange && this._rallyActive) {
            this._rallyActive = false;
            player._rallyDamageBonus = Math.max(0, (player._rallyDamageBonus || 0) - this.rallyBonus);
            player._rallySpeedBonus = Math.max(0, (player._rallySpeedBonus || 0) - this.rallyBonus * 0.5);
        }
    }

    /**
     * Forge: convert stone to metal over time
     */
    updateForge(deltaTime) {
        this.forgeTimer += deltaTime;
        const forgeInterval = 60;

        if (this.forgeTimer >= forgeInterval) {
            this.forgeTimer = 0;
            const resources = this.game.resourceSystem.resources;
            if (resources.stone >= 2) {
                this.game.resourceSystem.spendResources({ stone: 2 });
                this.game.resourceSystem.addResource('metal', 1);

                this.game.addParticle({
                    x: this.x,
                    y: this.y - 20,
                    vy: -30,
                    text: '+1 ⚙️',
                    color: '#cccccc',
                    lifetime: 1.5,
                    age: 0,
                    destroyed: false,
                    update(dt) { this.y += this.vy * dt; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
                    render(ctx) {
                        const alpha = 1 - this.age / this.lifetime;
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = this.color;
                        ctx.font = 'bold 14px Rajdhani';
                        ctx.textAlign = 'center';
                        ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
                        ctx.strokeText(this.text, this.x, this.y);
                        ctx.fillText(this.text, this.x, this.y);
                        ctx.globalAlpha = 1;
                    }
                });
            }
        }
    }

    /**
     * Auto-miner production logic
     */
    updateAutoMiner(deltaTime) {
        if (!this.isAutoMinerAuthority()) return;
        if (!this.active) return;

        // Accumulate fractional production — correct for any rate < 1
        this.productionTimer += deltaTime * this.productionRate;

        if (this.productionTimer >= 1.0) {
            const produced = Math.floor(this.productionTimer);
            this.productionTimer -= produced; // keep remainder, don't waste it

            if (this.storedResources < this.maxStorage) {
                this.storedResources = Math.min(
                    this.storedResources + produced,
                    this.maxStorage
                );
                this.showProductionParticle();
            }
        }

        // Auto-deliver when full or every 40 seconds
        if (!this.autoDeliverTimer) this.autoDeliverTimer = 0;
        this.autoDeliverTimer += deltaTime;

        const isFull = this.storedResources >= this.maxStorage;
        const autoDeliverInterval = AUTO_MINER_AUTO_DELIVER_INTERVAL;

        if (this.storedResources > 0 && (isFull || this.autoDeliverTimer >= autoDeliverInterval)) {
            this.collectResources();
            this.autoDeliverTimer = 0;
        }

        // Also collect instantly when player nearby
        const dist = Utils.distance(this.x, this.y, this.game.player.x, this.game.player.y);
        if (dist < 80 && this.storedResources > 0) {
            this.collectResources();
            this.autoDeliverTimer = 0;
        }
    }

    /**
     * Collect stored resources
     */
    collectResources() {
        if (!this.isAutoMinerAuthority()) return;
        if (this.storedResources <= 0) return;

        // Add resources to player
        this.game.resourceSystem.addResource(this.targetResource, this.storedResources);

        // Collection particle
        const icons = {
            wood: '🪵',
            stone: '🪨',
            metal: '⚙️'
        };

        this.game.addParticle({
            x: this.x,
            y: this.y - 20,
            vy: -40,
            text: `+${this.storedResources} ${icons[this.targetResource]}`,
            color: '#ffcc00',
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
                ctx.fillStyle = this.color;
                ctx.globalAlpha = alpha;
                ctx.font = 'bold 14px Rajdhani';
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 3;
                ctx.strokeText(this.text, this.x, this.y);
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1;
            }
        });

        this.storedResources = 0;
    }

    /**
     * Multiplayer authority for auto-miners.
     * In multiplayer, only the owner simulates production and payout.
     * For legacy miners without owner, host remains authoritative.
     */
    isAutoMinerAuthority() {
        const network = this.game.networkManager;
        if (!network?.inRoom) return true;

        if (this.ownerId) return this.ownerId === network.playerId;
        return network.isHost === true;
    }

    /**
     * Multiplayer authority for turrets.
     * In versus, only the owner simulates targeting/firing for that building.
     */
    isTurretAuthority() {
        const network = this.game.networkManager;
        if (!network?.inRoom) return true;

        if (this.ownerId) return this.ownerId === network.playerId;
        return network.isHost === true;
    }

    /**
     * Show production particle
     */
    showProductionParticle() {
        const icons = {
            wood: '🪵',
            stone: '🪨',
            metal: '⚙️'
        };

        this.game.addParticle({
            x: this.x + Utils.randomFloat(-10, 10),
            y: this.y - 15,
            vy: -10,
            text: icons[this.targetResource],
            lifetime: 0.8,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.globalAlpha = alpha;
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1;
            }
        });
    }

    /**
     * Update auto-miner stats based on level
     */
    updateAutoMinerStats() {
        this.productionRate = AUTO_MINER_PRODUCTION_RATES[this.buildingKey][this.level - 1];
        if (this.game.player?._minerBonus) {
            this.productionRate *= 1 + this.game.player._minerBonus;
        }
        this.maxHealth = this.config.health * (1 + 0.5 * (this.level - 1));
    }

    /**
     * Turret AI
     */
    updateTurret(deltaTime) {
        if (!this.isTurretAuthority()) return;

        // Cooldown
        if (this.fireCooldown > 0) {
            this.fireCooldown -= deltaTime;
        }

        // Find target
        this.currentTarget = this.findTarget();

        if (this.currentTarget) {
            // Rotate towards target
            const targetAngle = Utils.angle(this.x, this.y, this.currentTarget.x, this.currentTarget.y);

            // Smooth rotation
            let angleDiff = targetAngle - this.targetAngle;
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.targetAngle += angleDiff * 0.2;

            // Fire if ready
            if (this.fireCooldown <= 0 && Math.abs(angleDiff) < 0.3) {
                this.fire();
            }
        }
    }

    /**
     * Find nearest enemy in range
     */
    findTarget() {
        const candidates = [];
        const ownerId = this.ownerId ?? this.game.networkManager?.playerId ?? null;

        for (const enemy of this.game.getEnemies()) {
            const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
            if (dist <= this.range) {
                candidates.push({ target: enemy, dist, priority: 1 });
            }
        }

        if (this.game.gameMode === 'versus_ffa' && this.game.networkManager?.inRoom) {
            for (const remotePlayer of this.game.getHostileRemotePlayersFor(ownerId)) {
                const dist = Utils.distance(this.x, this.y, remotePlayer.x, remotePlayer.y);
                if (dist <= this.range) {
                    candidates.push({ target: remotePlayer, dist, priority: 0 });
                }
            }
        }

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => a.priority - b.priority || a.dist - b.dist);
        return candidates[0].target;
    }

    /**
     * Fire at target
     */
    fire() {
        if (!this.currentTarget) return;

        this.fireCooldown = this.fireRate;

        // Determine damage type based on turret subtype
        let damageType = 'physical';
        let projectileColor = '#ffff00';

        switch (this.subType) {
            case 'flame':
                damageType = 'fire';
                projectileColor = '#ff4400';
                break;
            case 'sniper':
                damageType = 'physical';
                projectileColor = '#aaaaaa';
                break;
            default:
                if (this.projectileType === 'laser') {
                    damageType = 'fire';
                    projectileColor = '#7ff6ff';
                } else if (this.slowEffect) {
                    damageType = 'frost';
                    projectileColor = '#66ccff';
                }
                break;
        }

        // Calculate final damage (with crit for sniper)
        let finalDamage = this.damage;
        let isCrit = false;
        if (this.critChance > 0 && Math.random() < this.critChance) {
            finalDamage *= this.critMultiplier;
            isCrit = true;
        }

        // Execute ability (Sniper T5)
        if (this.executeThreshold > 0 && this.currentTarget) {
            const healthPercent = this.currentTarget.health / this.currentTarget.maxHealth;
            if (healthPercent < this.executeThreshold) {
                this.currentTarget.health = 0;
                this.currentTarget.die();

                // Execute visual effect
                this.game.addParticle({
                    x: this.currentTarget.x,
                    y: this.currentTarget.y - 30,
                    vy: -50,
                    text: '💀 EXECUTE',
                    color: '#ff0000',
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
                        ctx.fillStyle = this.color;
                        ctx.globalAlpha = alpha;
                        ctx.font = 'bold 16px Rajdhani';
                        ctx.textAlign = 'center';
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                        ctx.lineWidth = 3;
                        ctx.strokeText(this.text, this.x, this.y);
                        ctx.fillText(this.text, this.x, this.y);
                        ctx.globalAlpha = 1;
                    }
                });
                return; // Don't fire projectile if executed
            }
        }

        // Helper function to create projectile
        const createProjectile = (angleOffset = 0) => {
            const projectile = new Projectile(
                this.game,
                this.x,
                this.y,
                this.targetAngle + angleOffset,
                {
                    speed: 350,
                    damage: finalDamage,
                    range: this.range + 50,
                    owner: this,
                    ownerId: this.ownerId ?? this.game.networkManager?.playerId ?? null,
                    type: this.projectileType,
                    color: isCrit ? '#ffff00' : projectileColor,
                    damageType: damageType,
                    armorPierce: this.armorPierce,
                    chainTargets: this.chainTargets,
                    freezeChance: this.freezeChance,
                    slowEffect: this.slowEffect,
                    slowDuration: this.slowDuration,
                    burnDamage: this.burnDamage,
                    burnDuration: this.burnDuration,
                    aoeBurn: this.aoeBurn,
                    burnRadius: this.burnRadius,
                    isCrit: isCrit
                }
            );
            this.game.addProjectile(projectile);
        };

        // Main projectile
        createProjectile();

        // Multi-shot abilities (Basic Turret)
        if (this.tripleShot > 0 && Math.random() < this.tripleShot) {
            createProjectile(-0.15); // Left
            createProjectile(0.15);  // Right
        } else if (this.doubleShot > 0 && Math.random() < this.doubleShot) {
            createProjectile(0.1);
        }

        // Apply slow effect if applicable (Frost turret)
        if (this.slowEffect > 0 && this.currentTarget) {
            const target = this.currentTarget;
            const config = target.config || {};
            const originalSpeed = config.speed || 60;
            target.speed = originalSpeed * (1 - this.slowEffect);

            // Reset speed after duration
            setTimeout(() => {
                if (!target.destroyed && !target.frozen) {
                    target.speed = originalSpeed;
                }
            }, this.slowDuration * 1000);
        }
    }

    /**
     * Door auto-open logic
     */
    updateDoor() {
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);

        // Open when player is close
        this.isOpen = dist < 60;
        this.solid = !this.isOpen;
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        this.health -= amount;
        this.flashTimer = 0.1;

        // Spawn damage particle
        this.game.addParticle({
            x: this.x,
            y: this.y - 20,
            vx: Utils.randomFloat(-20, 20),
            vy: -50,
            text: `-${Math.floor(amount)}`,
            color: '#ff4444',
            lifetime: 0.8,
            age: 0,
            destroyed: false,
            update(dt) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.vy += 50 * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = `rgba(255, 68, 68, ${alpha})`;
                ctx.font = 'bold 12px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
            }
        });

        if (this.health <= 0) {
            this.destroy();
        }
    }

    /**
     * Destroy building
     */
    destroy() {
        this.destroyed = true;
        if (this.type === 'wall' || this.type === 'door' || this.type === 'barricade') {
            this.game.objectiveSystem?.onWallLost();
        }
        // Notify other players that this building is gone
        if (this._netId && !this._destroyedFromNetwork) {
            this.game.networkManager?.onBuildingDestroyed(this._netId);
        }

        // Spawn debris
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            this.game.addParticle({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 60,
                vy: Math.sin(angle) * 60 - 30,
                color: this.color,
                lifetime: 0.6,
                age: 0,
                size: 6,
                destroyed: false,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vy += 100 * dt;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - this.age / this.lifetime;
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = alpha;
                    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                    ctx.globalAlpha = 1;
                }
            });
        }
    }

    /**
     * Render building
     */
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Construction scale: grow from 30% to 100%
        if (this.buildProgress < 1) {
            const s = 0.3 + this.buildProgress * 0.7;
            ctx.scale(s, s);
        }

        const color = this.flashTimer > 0 ? '#ffffff' : this.color;

        switch (this.type) {
            case 'wall':
                this.renderWall(ctx, color);
                break;
            case 'door':
                this.renderDoor(ctx, color);
                break;
            case 'turret':
                this.renderTurret(ctx, color);
                break;
            case 'autoMiner':
                this.renderAutoMiner(ctx, color);
                break;
            case 'workbench':
                this.renderWorkbench(ctx, color);
                break;
            case 'spikeTrap':
                this.renderSpikeTrap(ctx, color);
                break;
            case 'barricade':
                this.renderBarricade(ctx, color);
                break;
            case 'healingShrine':
                this.renderHealingShrine(ctx, color);
                break;
            case 'watchtower':
                this.renderWatchtower(ctx, color);
                break;
            case 'oilBarrel':
                this.renderOilBarrel(ctx, color);
                break;
            case 'rallyBanner':
                this.renderRallyBanner(ctx, color);
                break;
            case 'forge':
                this.renderForge(ctx, color);
                break;
        }

        ctx.restore();

        // Construction scaffold overlay
        if (this.buildProgress < 1) {
            const r = this.size / 2;
            const alpha = (1 - this.buildProgress) * 0.7;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffdd88';
            ctx.lineWidth = 2;
            // Diagonal cross-beams
            ctx.beginPath();
            ctx.moveTo(this.x - r, this.y - r); ctx.lineTo(this.x + r, this.y + r);
            ctx.moveTo(this.x + r, this.y - r); ctx.lineTo(this.x - r, this.y + r);
            // Border
            ctx.rect(this.x - r, this.y - r, r * 2, r * 2);
            ctx.stroke();
            // Progress bar at bottom
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - r, this.y + r + 2, r * 2, 4);
            ctx.fillStyle = '#88ffaa';
            ctx.fillRect(this.x - r, this.y + r + 2, r * 2 * this.buildProgress, 4);
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Health bar if damaged
        if (this.health < this.maxHealth) {
            this.renderHealthBar(ctx);
        }

        // Level indicator for upgradeable buildings (enhanced)
        // Turrets use integrated visual tier markers instead of floating text.
        if (this.canUpgrade && this.level > 1 && this.type !== 'turret') {
            // Tier-based color
            const tierColors = {
                2: '#ffcc00', // Gold
                3: '#ffaa00', // Orange-gold
                4: '#ff8800', // Orange
                5: '#ff4400'  // Red-orange
            };
            const levelColor = tierColors[this.level] || '#ffcc00';

            // Background badge for turrets
            if (this.type === 'turret') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.roundRect(this.x - 18, this.y - this.size / 2 - 25, 36, 16, 8);
                ctx.fill();
            }

            ctx.fillStyle = levelColor;
            ctx.font = 'bold 14px Rajdhani';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.lineWidth = 4;
            ctx.strokeText(`Lv.${this.level}`, this.x, this.y - this.size / 2 - 13);
            ctx.fillText(`Lv.${this.level}`, this.x, this.y - this.size / 2 - 13);
        }

        // Upgrade hint for upgradeable buildings
        if (this.canUpgrade && this.level < this.maxLevel) {
            const player = this.game.player;
            const dist = Utils.distance(this.x, this.y, player.x, player.y);
            if (dist < 120) {
                const nextLevel = this.level + 1;
                const cost = this.getUpgradeCost(nextLevel);
                if (cost) {
                    const canAfford = this.game.resourceSystem.hasResources(cost);
                    const pulse = 0.55 + Math.sin(Date.now() / 220) * 0.25;
                    const glow = canAfford ? '255, 204, 0' : '255, 130, 130';
                    const badgeX = this.x + this.size * 0.30;
                    const badgeY = this.y - this.size * 0.30;

                    // Compact clickable marker (indirect visual hint)
                    ctx.fillStyle = `rgba(${glow}, ${0.28 + pulse * 0.38})`;
                    ctx.beginPath();
                    ctx.arc(badgeX, badgeY, 4, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(20, 20, 20, 0.75)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(badgeX, badgeY, 4, 0, Math.PI * 2);
                    ctx.stroke();

                    const mouse = this.game.input?.mouse;
                    const hover = !!mouse && Utils.distance(mouse.worldX, mouse.worldY, this.x, this.y) < this.collisionRadius + 8;
                    if (hover) {
                        // Stronger feedback only on hover, to keep the screen clean
                        ctx.strokeStyle = `rgba(${glow}, ${0.35 + pulse * 0.3})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.collisionRadius + 6, 0, Math.PI * 2);
                        ctx.stroke();

                        // Tiny chevron above the building
                        const chevronY = this.y - this.size / 2 - 6;
                        ctx.strokeStyle = `rgba(${glow}, 0.95)`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(this.x - 5, chevronY + 2);
                        ctx.lineTo(this.x, chevronY - 3);
                        ctx.lineTo(this.x + 5, chevronY + 2);
                        ctx.stroke();
                    }
                }
            }
        }

        // Workbench interaction hint
        if (this.type === 'workbench') {
            const player = this.game.player;
            const dist = Utils.distance(this.x, this.y, player.x, player.y);
            if (dist < 60) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = 'bold 12px Rajdhani';
                ctx.textAlign = 'center';
                ctx.fillText('[E] Améliorer Outils', this.x, this.y + this.size / 2 + 20);
            }
        }
    }

    drawBuildingShadow(ctx, width = 22, height = 7, offsetY = 14) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
        ctx.beginPath();
        ctx.ellipse(0, offsetY, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    getResourcePalette(resource) {
        switch (resource) {
            case 'wood':
                return { base: '#5e7f44', accent: '#93c06a', detail: '#2f4a25', glow: '#9ce572' };
            case 'stone':
                return { base: '#707983', accent: '#a7b0ba', detail: '#404950', glow: '#c8d0d8' };
            case 'metal':
                return { base: '#7d7b72', accent: '#c7c2ab', detail: '#4e4b43', glow: '#f1e6a6' };
            default:
                return { base: '#666666', accent: '#9a9a9a', detail: '#3f3f3f', glow: '#dddddd' };
        }
    }

    getUtilityPalette(kind) {
        const palettes = {
            workbench: { base: '#6d4c2f', accent: '#b78952', detail: '#3f2a18' },
            shrine: { base: '#5f6f6e', accent: '#8be0b5', detail: '#344444' },
            tower: { base: '#6a573d', accent: '#d9bf7d', detail: '#3f2f1f' },
            forge: { base: '#58524a', accent: '#cf6b2a', detail: '#2c2723' }
        };
        return palettes[kind] || palettes.workbench;
    }

    renderWorkbench(ctx, color) {
        const half = this.size / 2;
        const p = this.getUtilityPalette('workbench');
        this.drawBuildingShadow(ctx, 26, 8, half - 4);

        // Stone plinth
        ctx.fillStyle = '#4c4740';
        ctx.strokeStyle = '#2d2a26';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-half + 6, half - 16, this.size - 12, 12, 3);
        ctx.fill();
        ctx.stroke();

        // Work table
        ctx.fillStyle = p.base;
        ctx.strokeStyle = p.detail;
        ctx.beginPath();
        ctx.roundRect(-half + 3, -half + 8, this.size - 6, 14, 4);
        ctx.fill();
        ctx.stroke();

        // Front cabinet
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.roundRect(-half + 7, -half + 20, this.size - 14, half - 6, 3);
        ctx.fill();
        ctx.stroke();

        // Handles
        ctx.fillStyle = '#d2c59c';
        ctx.fillRect(-7, 8, 5, 2);
        ctx.fillRect(2, 8, 5, 2);

        // Tool silhouettes
        ctx.strokeStyle = '#d9d9d9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-11, -half + 13);
        ctx.lineTo(-4, -half + 18);
        ctx.stroke();
        ctx.strokeStyle = '#939393';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(3, -half + 18);
        ctx.lineTo(11, -half + 11);
        ctx.stroke();
        ctx.fillStyle = '#b7b7b7';
        ctx.fillRect(8, -half + 9, 5, 4);

        // Center cog mark
        ctx.strokeStyle = '#3b3b3b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 5, 5, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 / 6) * i;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 3, 5 + Math.sin(a) * 3);
            ctx.lineTo(Math.cos(a) * 6, 5 + Math.sin(a) * 6);
            ctx.stroke();
        }

        // Interaction glow
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);
        if (dist < 80) {
            const alpha = 0.22 * (1 - dist / 80);
            ctx.fillStyle = `rgba(255, 210, 110, ${alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2 + 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderWall(ctx, color) {
        const half = this.size / 2;

        // Base block
        ctx.fillStyle = color;
        ctx.strokeStyle = this.darkenColor(color);
        ctx.lineWidth = 2;
        ctx.fillRect(-half, -half, this.size, this.size);
        ctx.strokeRect(-half, -half, this.size, this.size);

        // Tier indicator
        if (this.tier > 1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let i = 0; i < this.tier - 1; i++) {
                const y = -half + 4 + i * 6;
                ctx.fillRect(-half + 4, y, 8, 4);
            }
        }

        // Bevel effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(-half, -half);
        ctx.lineTo(half, -half);
        ctx.lineTo(half - 4, -half + 4);
        ctx.lineTo(-half + 4, -half + 4);
        ctx.closePath();
        ctx.fill();
    }

    renderDoor(ctx, color) {
        const half = this.size / 2;

        if (this.isOpen) {
            // Open door (two halves)
            ctx.fillStyle = color;
            ctx.strokeStyle = this.darkenColor(color);
            ctx.lineWidth = 1;

            // Left half
            ctx.fillRect(-half, -half, 6, this.size);
            ctx.strokeRect(-half, -half, 6, this.size);

            // Right half
            ctx.fillRect(half - 6, -half, 6, this.size);
            ctx.strokeRect(half - 6, -half, 6, this.size);
        } else {
            // Closed door
            ctx.fillStyle = color;
            ctx.strokeStyle = this.darkenColor(color);
            ctx.lineWidth = 2;
            ctx.fillRect(-half, -half, this.size, this.size);
            ctx.strokeRect(-half, -half, this.size, this.size);

            // Handle
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(4, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderTurret(ctx, color) {
        this.renderDistinctTurret(ctx, color);
        return;

        // Tier-based visual enhancements
        const tier = this.level;
        const tierIntensity = tier / 5; // 0.2 to 1.0

        // Material progression by tier
        const tierMaterials = {
            1: { barrel: '#8B4513', base: '#654321', name: 'Wood' },      // Wood (brown)
            2: { barrel: '#808080', base: '#606060', name: 'Stone' },     // Stone (gray)
            3: { barrel: '#C0C0C0', base: '#A0A0A0', name: 'Metal' },     // Metal (silver)
            4: { barrel: '#9966CC', base: '#7744AA', name: 'Amethyst' },  // Amethyst (purple)
            5: { barrel: '#FFD700', base: '#FFA500', name: 'Legendary' }  // Legendary (gold)
        };

        const material = tierMaterials[tier] || tierMaterials[1];

        // Colored aura based on turret type
        const auraColors = {
            'basic': '#888888',
            'laser': '#66e9ff',
            'frost': '#00ccff',
            'flame': '#ff6600',
            'sniper': '#ffcc00'
        };

        const baseAuraColor = auraColors[this.subType || 'basic'] || '#888888';
        const pulseIntensity = this.fireCooldown > (this.fireRate * 0.7) ? 1.5 : 1.0;

        // Tier 4-5: Add pulsing outer ring (no blur for performance)
        if (tier >= 4) {
            const time = Date.now() / 1000;
            const pulse = Math.sin(time * 2) * 0.3 + 0.7; // 0.4 to 1.0
            ctx.globalAlpha = 0.4 * pulse;
            ctx.strokeStyle = baseAuraColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 20 + tier * 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Colored outline (replaces glow for performance)
        const outlineWidth = 2 + Math.floor(tier / 2); // 2-3px based on tier
        ctx.strokeStyle = baseAuraColor;
        ctx.lineWidth = outlineWidth;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Base with material color
        ctx.fillStyle = material.base;
        ctx.strokeStyle = this.darkenColor(material.base);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Material texture/detail
        if (tier === 1) {
            // Wood grain lines
            ctx.strokeStyle = 'rgba(101, 67, 33, 0.5)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-10 + i * 7, -10);
                ctx.lineTo(-8 + i * 7, 10);
                ctx.stroke();
            }
        } else if (tier === 2) {
            // Stone texture (dots)
            ctx.fillStyle = 'rgba(96, 96, 96, 0.6)';
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i;
                const x = Math.cos(angle) * 8;
                const y = Math.sin(angle) * 8;
                ctx.fillRect(x - 1, y - 1, 2, 2);
            }
        } else if (tier === 4) {
            // Amethyst crystals
            ctx.fillStyle = 'rgba(204, 153, 255, 0.6)';
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI * 2 / 4) * i;
                const x = Math.cos(angle) * 10;
                const y = Math.sin(angle) * 10;
                ctx.beginPath();
                ctx.moveTo(x, y - 3);
                ctx.lineTo(x + 2, y);
                ctx.lineTo(x, y + 3);
                ctx.lineTo(x - 2, y);
                ctx.closePath();
                ctx.fill();
            }
        } else if (tier === 5) {
            // Legendary glow rings
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Reset shadow for other elements
        ctx.shadowBlur = 0;

        // Gun rotation
        ctx.save();
        ctx.rotate(this.targetAngle);

        // Gun barrel with material color
        ctx.fillStyle = material.barrel;
        ctx.strokeStyle = this.darkenColor(material.barrel);
        ctx.lineWidth = 2;
        ctx.fillRect(0, -4, 20, 8);
        ctx.strokeRect(0, -4, 20, 8);

        // Material accent on barrel
        if (tier >= 3) {
            ctx.fillStyle = this.getTierColor(material.barrel, 0.5);
            ctx.fillRect(2, -3, 4, 6);
        }

        // Muzzle
        ctx.fillStyle = '#222222';
        ctx.fillRect(18, -3, 4, 6);

        // Tier 5: Special muzzle glow
        if (tier === 5) {
            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
            ctx.fillRect(19, -2, 2, 4);
            ctx.shadowBlur = 0;
        }

        ctx.restore();

        // Center dome with material-based gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
        gradient.addColorStop(0, this.getTierColor(material.barrel, 0.8));
        gradient.addColorStop(1, material.base);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Range indicator - only show when contextually relevant
        const playerDist = Utils.distance(this.x, this.y, this.game.player.x, this.game.player.y);
        const showRange = this.currentTarget && (
            this.game.buildingSystem.isPlacing ||  // Placing buildings
            playerDist < 120 ||                     // Player nearby
            this.fireCooldown > (this.fireRate * 0.7) // Just fired
        );

        if (showRange) {
            ctx.strokeStyle = `${color}33`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.range, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderDistinctTurret(ctx, color) {
        const tier = Math.max(1, Math.min(5, this.level || 1));
        const palette = {
            basic:    { base: '#3f4c5c', top: '#8aa0b8', accent: '#cbe0f7' },
            laser:    { base: '#34475f', top: '#68a7d3', accent: '#9ff9ff' },
            frost:    { base: '#355d6e', top: '#62c8de', accent: '#d8fbff' },
            flame:    { base: '#5b3f4b', top: '#ff8c52', accent: '#ffd36a' },
            sniper:   { base: '#3f5468', top: '#98b6cf', accent: '#f6f8ff' },
            ballista: { base: '#3f4a63', top: '#7fa4c9', accent: '#a7dbff' }
        }[this.subType] || { base: '#3f4c5c', top: '#8aa0b8', accent: '#cbe0f7' };

        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 22, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        this.renderTurretBase(ctx, palette);
        this.renderTurretTierMarkers(ctx, palette, tier);

        switch (this.subType) {
            case 'laser':
                this.renderLaserTurretHead(ctx, palette);
                break;
            case 'frost':
                this.renderFrostTurretHead(ctx, palette);
                break;
            case 'flame':
                this.renderFlameTurretHead(ctx, palette);
                break;
            case 'sniper':
                this.renderSniperTurretHead(ctx, palette);
                break;
            case 'ballista':
                this.renderBallistaTurretHead(ctx, palette);
                break;
            default:
                this.renderBasicTurretHead(ctx, palette);
                break;
        }

        const mouse = this.game.input?.mouse;
        const hover = !!mouse && Utils.distance(mouse.worldX, mouse.worldY, this.x, this.y) < this.collisionRadius + 8;
        if (hover) {
            this.renderTurretSubtypeBadge(ctx, palette.accent);
        }

        if (this.fireCooldown > this.fireRate * 0.65) {
            ctx.strokeStyle = palette.accent;
            ctx.globalAlpha = 0.22 + tier * 0.05;
            ctx.lineWidth = 1.5 + tier * 0.15;
            ctx.beginPath();
            ctx.arc(0, -4, 17 + tier, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    renderTurretBase(ctx, p) {
        // Low-profile sci-fi platform
        ctx.fillStyle = p.base;
        ctx.strokeStyle = this.darkenColor(p.base);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-18, 5, 36, 13, 5);
        ctx.fill();
        ctx.stroke();

        // Pedestal
        ctx.fillStyle = this.darkenColor(p.base);
        ctx.beginPath();
        ctx.roundRect(-8, -2, 16, 13, 3);
        ctx.fill();

        // Rotating top disk
        ctx.fillStyle = p.top;
        ctx.strokeStyle = this.darkenColor(p.top);
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Accent ring
        ctx.strokeStyle = p.accent;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    renderTurretTierMarkers(ctx, p, tier) {
        if (tier <= 1) return;

        const pipCount = tier - 1; // L2..L5 => 1..4 pips
        const arcStart = -Math.PI * 0.92;
        const arcEnd = -Math.PI * 0.08;
        const step = pipCount > 1 ? (arcEnd - arcStart) / (pipCount - 1) : 0;
        const radius = 16.2;

        ctx.fillStyle = p.accent;
        ctx.strokeStyle = this.darkenColor(p.accent);
        ctx.lineWidth = 1.2;

        for (let i = 0; i < pipCount; i++) {
            const a = arcStart + step * i;
            const x = Math.cos(a) * radius;
            const y = Math.sin(a) * radius - 1;
            ctx.beginPath();
            ctx.roundRect(x - 2.6, y - 1.6, 5.2, 3.2, 1.4);
            ctx.fill();
            ctx.stroke();
        }

        if (tier >= 3) {
            ctx.strokeStyle = p.accent;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 11.2, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (tier >= 4) {
            ctx.strokeStyle = p.accent;
            ctx.globalAlpha = 0.22;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 15.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (tier >= 5) {
            const pulse = 0.45 + Math.sin(Date.now() / 170) * 0.25;
            ctx.fillStyle = '#f4fcff';
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    renderBasicTurretHead(ctx, p) {
        const tier = Math.max(1, Math.min(5, this.level || 1));
        this.renderRotatedTurretPart(ctx, () => {
            const bodyLen = 15 + tier;
            ctx.fillStyle = p.top;
            ctx.strokeStyle = '#2e3946';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(0, -5, bodyLen, 10, 4);
            ctx.fill();
            ctx.stroke();

            if (tier >= 2) {
                ctx.fillStyle = this.darkenColor(p.top);
                ctx.fillRect(2, -7, bodyLen - 6, 2);
                ctx.fillRect(2, 5, bodyLen - 6, 2);
            }

            ctx.fillStyle = p.accent;
            ctx.fillRect(5, -2, 8 + tier, 4);

            if (tier >= 3) {
                ctx.fillStyle = '#e9f4ff';
                ctx.globalAlpha = 0.35;
                ctx.fillRect(7, -1, 7 + tier, 2);
                ctx.globalAlpha = 1;
            }

            const muzzleX = bodyLen + 2;
            ctx.fillStyle = '#17202b';
            ctx.beginPath();
            ctx.arc(muzzleX, 0, 3.2 + tier * 0.22, 0, Math.PI * 2);
            ctx.fill();

            if (tier >= 4) {
                ctx.strokeStyle = p.accent;
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.arc(muzzleX, 0, 5.3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            if (tier >= 5) {
                ctx.fillStyle = p.accent;
                ctx.beginPath();
                ctx.moveTo(bodyLen - 2, -5.5);
                ctx.lineTo(bodyLen + 3, -10);
                ctx.lineTo(bodyLen + 5, -5.5);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(bodyLen - 2, 5.5);
                ctx.lineTo(bodyLen + 3, 10);
                ctx.lineTo(bodyLen + 5, 5.5);
                ctx.closePath();
                ctx.fill();
            }
        });
    }

    renderLaserTurretHead(ctx, p) {
        const tier = Math.max(1, Math.min(5, this.level || 1));
        this.renderRotatedTurretPart(ctx, () => {
            const pulse = 0.55 + Math.sin(Date.now() / 170) * 0.2;
            const emitterLen = 16 + tier * 0.65;
            const lensX = 10 + emitterLen;

            // Stabilizer spine
            ctx.fillStyle = '#2a3c52';
            ctx.strokeStyle = '#1b2a39';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-3, -4, 15 + tier, 8, 3);
            ctx.fill();
            ctx.stroke();

            // Emitter chassis
            ctx.fillStyle = p.top;
            ctx.strokeStyle = '#29445a';
            ctx.beginPath();
            ctx.roundRect(8, -8, emitterLen, 16, 5);
            ctx.fill();
            ctx.stroke();

            // Side heat sinks for "laser device" readability
            ctx.fillStyle = this.darkenColor(p.top);
            const sinkCount = 3 + tier;
            const sinkStep = emitterLen / (sinkCount + 1);
            for (let i = 0; i < sinkCount; i++) {
                const x = 9 + sinkStep * (i + 1);
                ctx.fillRect(x, -9, 2, 3);
                ctx.fillRect(x, 6, 2, 3);
            }

            // Focusing ring + glowing core lens
            ctx.fillStyle = '#152635';
            ctx.beginPath();
            ctx.arc(lensX, 0, 6.2 + tier * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = p.accent;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(lensX, 0, 4.5 + tier * 0.16, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = 0.55 + pulse * 0.35;
            ctx.fillStyle = '#d4fcff';
            ctx.beginPath();
            ctx.arc(lensX, 0, 2.3 + tier * 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Short beam guide from lens
            ctx.strokeStyle = `rgba(150, 250, 255, ${0.45 + pulse * 0.2})`;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(lensX + 4.5, 0);
            ctx.lineTo(lensX + 8.5 + tier * 0.4, 0);
            ctx.stroke();

            if (tier >= 4) {
                ctx.strokeStyle = p.accent;
                ctx.globalAlpha = 0.38;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(lensX, 0, 8.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            if (tier >= 5) {
                ctx.fillStyle = p.accent;
                ctx.beginPath();
                ctx.moveTo(lensX - 2, -8.5);
                ctx.lineTo(lensX + 3.5, -11.5);
                ctx.lineTo(lensX + 2.5, -6.5);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(lensX - 2, 8.5);
                ctx.lineTo(lensX + 3.5, 11.5);
                ctx.lineTo(lensX + 2.5, 6.5);
                ctx.closePath();
                ctx.fill();
            }
        });

        // Energy crystal mounted on turret center
        const crystalPulse = 0.6 + Math.sin(Date.now() / 210) * 0.2;
        const crystalRadius = 8 + tier * 0.3;
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(0, -11 - tier * 0.4);
        ctx.lineTo(crystalRadius, 0);
        ctx.lineTo(0, 11 + tier * 0.4);
        ctx.lineTo(-crystalRadius, 0);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.25 + crystalPulse * 0.35;
        ctx.fillStyle = '#e6fbff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.6 + tier * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (tier >= 3) {
            ctx.strokeStyle = p.accent;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.arc(0, 0, 10 + tier * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    renderFrostTurretHead(ctx, p) {
        const tier = Math.max(1, Math.min(5, this.level || 1));
        this.renderRotatedTurretPart(ctx, () => {
            const bodyLen = 16 + tier * 1.2;
            ctx.fillStyle = p.top;
            ctx.strokeStyle = '#2f5a68';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-1, -4, bodyLen, 8, 3);
            ctx.fill();
            ctx.stroke();

            // Crystal barrel
            ctx.fillStyle = p.accent;
            const crystalMid = bodyLen + 1;
            const crystalTip = bodyLen + 8 + tier * 0.6;
            ctx.beginPath();
            ctx.moveTo(crystalMid, 0);
            ctx.lineTo(crystalMid + 7, -5.2);
            ctx.lineTo(crystalTip, 0);
            ctx.lineTo(crystalMid + 7, 5.2);
            ctx.closePath();
            ctx.fill();

            // Side icy fins
            ctx.fillStyle = '#a8e9f4';
            ctx.beginPath();
            ctx.moveTo(8, -6);
            ctx.lineTo(14 + tier, -10 - tier * 0.6);
            ctx.lineTo(16 + tier * 0.7, -5);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(8, 6);
            ctx.lineTo(14 + tier, 10 + tier * 0.6);
            ctx.lineTo(16 + tier * 0.7, 5);
            ctx.closePath();
            ctx.fill();

            if (tier >= 4) {
                ctx.strokeStyle = '#d8fbff';
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(bodyLen - 2, -8);
                ctx.lineTo(bodyLen + 3, -12);
                ctx.moveTo(bodyLen - 2, 8);
                ctx.lineTo(bodyLen + 3, 12);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });

        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 1.8 + tier * 0.2;
        const spokeCount = 4 + (tier >= 3 ? 2 : 0);
        const spokeRadius = 9 + tier;
        for (let i = 0; i < spokeCount; i++) {
            const a = (Math.PI * 2 / spokeCount) * i + Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(Math.cos(a) * spokeRadius, -4 + Math.sin(a) * spokeRadius);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, -4, 3 + tier * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#dffbff';
        ctx.fill();

        if (tier >= 5) {
            ctx.strokeStyle = '#e8feff';
            ctx.globalAlpha = 0.32;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, -4, 13.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    renderFlameTurretHead(ctx, p) {
        const tier = Math.max(1, Math.min(5, this.level || 1));
        this.renderRotatedTurretPart(ctx, () => {
            const flicker = Math.sin(Date.now() / 110 + this.x * 0.03) * 0.16;
            const nozzleLen = 7 + tier * 0.45;

            // Rear fuel chamber
            ctx.fillStyle = '#54364a';
            ctx.strokeStyle = '#392539';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-4, -7, 13 + tier * 0.9, 14, 4);
            ctx.fill();
            ctx.stroke();

            // Main combustion body
            ctx.fillStyle = p.top;
            ctx.strokeStyle = '#6f3c43';
            ctx.beginPath();
            ctx.roundRect(7, -9, 16 + tier, 18, 7);
            ctx.fill();
            ctx.stroke();

            // Coupling ring
            ctx.fillStyle = '#2a2230';
            ctx.beginPath();
            ctx.roundRect(13, -10, 4, 20, 2);
            ctx.fill();

            // Nozzle (short + wide -> clearly a flamethrower)
            ctx.fillStyle = '#3b2b34';
            ctx.strokeStyle = '#231820';
            const nozzleX = 21 + tier * 0.4;
            ctx.beginPath();
            ctx.roundRect(nozzleX, -5.5, nozzleLen, 11, 3);
            ctx.fill();
            ctx.stroke();

            // Hot inner tube
            ctx.fillStyle = '#ffb268';
            ctx.globalAlpha = 0.55 + flicker * 0.6;
            ctx.beginPath();
            ctx.roundRect(nozzleX + 2, -2.2, nozzleLen - 2, 4.4, 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Pilot flame on muzzle
            ctx.fillStyle = '#ffcc70';
            ctx.beginPath();
            ctx.moveTo(nozzleX + nozzleLen + 1, 0);
            ctx.bezierCurveTo(
                nozzleX + nozzleLen + 5 + flicker * 5 + tier * 0.5, -4,
                nozzleX + nozzleLen + 5 + flicker * 6 + tier * 0.5, 4,
                nozzleX + nozzleLen + 1, 0
            );
            ctx.fill();
            ctx.fillStyle = '#ff7a3d';
            ctx.beginPath();
            ctx.moveTo(nozzleX + nozzleLen + 2, 0);
            ctx.bezierCurveTo(
                nozzleX + nozzleLen + 4 + flicker * 3, -2.2,
                nozzleX + nozzleLen + 4 + flicker * 4, 2.2,
                nozzleX + nozzleLen + 2, 0
            );
            ctx.fill();

            if (tier >= 3) {
                ctx.fillStyle = '#733a46';
                ctx.beginPath();
                ctx.roundRect(-1, -9.5, 6, 4, 2);
                ctx.fill();
                ctx.beginPath();
                ctx.roundRect(-1, 5.5, 6, 4, 2);
                ctx.fill();
            }

            if (tier >= 5) {
                ctx.strokeStyle = '#ffcf7d';
                ctx.globalAlpha = 0.35;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(nozzleX + nozzleLen * 0.6, 0, 9, -Math.PI * 0.55, Math.PI * 0.55);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });

        const coreFlicker = Math.sin(Date.now() / 120 + this.y * 0.02) * 0.18;
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.bezierCurveTo(10, -5 + coreFlicker * 6, 7, 8, 0, 10);
        ctx.bezierCurveTo(-8, 4, -5, -5 + coreFlicker * 5, 0, -14);
        ctx.fill();

        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#ffe2a0';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.bezierCurveTo(5 + tier * 0.35, -3, 3 + tier * 0.2, 4 + tier * 0.3, 0, 6 + tier * 0.2);
        ctx.bezierCurveTo(-4 - tier * 0.2, 3, -2 - tier * 0.2, -3, 0, -8);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (tier >= 4) {
            ctx.strokeStyle = '#ffd48d';
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.arc(0, -2, 10 + tier, -Math.PI * 0.6, Math.PI * 0.6);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    renderSniperTurretHead(ctx, p) {
        const tier = Math.max(1, Math.min(5, this.level || 1));
        this.renderRotatedTurretPart(ctx, () => {
            const barrelLen = 27 + tier * 0.9;
            ctx.fillStyle = p.top;
            ctx.strokeStyle = '#2c3b49';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-2, -2.5, barrelLen, 5, 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = p.accent;
            ctx.beginPath();
            ctx.roundRect(9, -7, 9 + tier, 4, 2);
            ctx.fill();
            ctx.stroke();

            if (tier >= 3) {
                ctx.fillStyle = this.darkenColor(p.top);
                ctx.beginPath();
                ctx.roundRect(18, -8, 7 + tier, 3, 1.5);
                ctx.fill();
            }

            if (tier >= 4) {
                const brakeX = barrelLen - 2;
                ctx.strokeStyle = p.accent;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(brakeX, -3.5);
                ctx.lineTo(brakeX + 3.5, -3.5);
                ctx.moveTo(brakeX, 3.5);
                ctx.lineTo(brakeX + 3.5, 3.5);
                ctx.stroke();
            }

            // Precision muzzle
            ctx.fillStyle = '#18212b';
            ctx.beginPath();
            ctx.arc(barrelLen + 1, 0, 2.2 + tier * 0.1, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 1.9 + tier * 0.1;
        ctx.beginPath();
        ctx.arc(0, -4, 8 + tier * 0.6, 0, Math.PI * 2);
        ctx.moveTo(-10 - tier * 0.6, -4);
        ctx.lineTo(10 + tier * 0.6, -4);
        ctx.moveTo(0, -14 - tier * 0.5);
        ctx.lineTo(0, 6 + tier * 0.4);
        ctx.stroke();

        if (tier >= 5) {
            const ping = 0.3 + (Math.sin(Date.now() / 140) + 1) * 0.2;
            ctx.strokeStyle = '#f6f8ff';
            ctx.globalAlpha = ping;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.arc(0, -4, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    renderBallistaTurretHead(ctx, p) {
        const tier = Math.max(1, Math.min(5, this.level || 1));
        this.renderRotatedTurretPart(ctx, () => {
            const railEnd = 23 + tier;
            const tipX = railEnd + 9;

            // Sci-fi bolt launcher (fork + central rail)
            ctx.strokeStyle = p.top;
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(2, -6.5);
            ctx.lineTo(railEnd, -2);
            ctx.moveTo(2, 6.5);
            ctx.lineTo(railEnd, 2);
            ctx.stroke();

            ctx.strokeStyle = p.accent;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-2, 0);
            ctx.lineTo(railEnd + 3, 0);
            ctx.stroke();

            if (tier >= 3) {
                ctx.strokeStyle = this.darkenColor(p.accent);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(8, -4);
                ctx.lineTo(railEnd - 2, -1.2);
                ctx.moveTo(8, 4);
                ctx.lineTo(railEnd - 2, 1.2);
                ctx.stroke();
            }

            if (tier >= 4) {
                ctx.strokeStyle = p.accent;
                ctx.globalAlpha = 0.35;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(railEnd - 7, 0, 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Spike bolt tip
            ctx.fillStyle = '#d9f0ff';
            ctx.beginPath();
            ctx.moveTo(tipX, 0);
            ctx.lineTo(railEnd + 2, -4.3);
            ctx.lineTo(railEnd + 2, 4.3);
            ctx.closePath();
            ctx.fill();

            if (tier >= 5) {
                ctx.fillStyle = '#eef9ff';
                ctx.globalAlpha = 0.65;
                ctx.beginPath();
                ctx.moveTo(tipX + 4, 0);
                ctx.lineTo(tipX - 1, -2.5);
                ctx.lineTo(tipX - 1, 2.5);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        });
    }

    renderRotatedTurretPart(ctx, drawFn) {
        ctx.save();
        ctx.rotate(this.targetAngle || 0);
        drawFn();
        ctx.restore();
    }

    getTurretBarrelWidth() {
        return {
            basic: 3,
            laser: 4,
            frost: 4,
            flame: 6,
            sniper: 3,
            ballista: 4
        }[this.subType] || 3;
    }

    getTurretBarrelShape() {
        return {
            basic: { startX: 2, endX: 24, y: -10 },
            laser: { startX: 2, endX: 30, y: -10 },
            frost: { startX: 2, endX: 24, y: -10 },
            flame: { startX: 2, endX: 22, y: -10 },
            sniper: { startX: 0, endX: 38, y: -12 },
            ballista: { startX: 0, endX: 36, y: -12 }
        }[this.subType] || { startX: 2, endX: 24, y: -10 };
    }

    renderTurretSubtypeBadge(ctx, color) {
        ctx.save();
        ctx.translate(0, -12);
        ctx.fillStyle = 'rgba(18, 24, 34, 0.78)';
        ctx.strokeStyle = 'rgba(190, 220, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-12, -12, 24, 24, 8);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(20, 24, 30, 0.85)';
        ctx.lineWidth = 1.8;

        switch (this.subType) {
            case 'laser':
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(8, 0);
                ctx.lineTo(0, 10);
                ctx.lineTo(-8, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#e8fbff';
                ctx.fillRect(-2, -6, 4, 12);
                break;
            case 'frost':
                ctx.fillStyle = color;
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI * 2 / 6) * i;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'flame':
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, -11);
                ctx.bezierCurveTo(10, -3, 6, 9, 0, 10);
                ctx.bezierCurveTo(-8, 5, -4, -4, 0, -11);
                ctx.fill();
                ctx.stroke();
                break;
            case 'sniper':
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = 'rgba(25, 20, 18, 0.9)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-12, 0);
                ctx.lineTo(12, 0);
                ctx.moveTo(0, -12);
                ctx.lineTo(0, 12);
                ctx.stroke();
                break;
            case 'ballista':
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(-12, 4);
                ctx.lineTo(0, -8);
                ctx.lineTo(12, 4);
                ctx.lineTo(6, 8);
                ctx.lineTo(0, 2);
                ctx.lineTo(-6, 8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            default:
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
        }

        ctx.restore();
    }

    /**
     * Get tier-enhanced color (brighter for higher tiers)
     */
    getTierColor(baseColor, intensity) {
        // Parse hex color
        const hex = baseColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Brighten based on tier (up to 40% brighter at tier 5)
        const boost = 1 + (intensity * 0.4);
        const newR = Math.min(255, Math.floor(r * boost));
        const newG = Math.min(255, Math.floor(g * boost));
        const newB = Math.min(255, Math.floor(b * boost));

        return `rgb(${newR}, ${newG}, ${newB})`;
    }

    renderAutoMiner(ctx, color) {
        const half = this.size / 2;
        const p = this.getResourcePalette(this.targetResource);
        const t = Date.now() / 220;

        this.drawBuildingShadow(ctx, 22, 7, half - 2);

        // Foundation
        ctx.fillStyle = '#3f3e3b';
        ctx.strokeStyle = '#272624';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-half + 2, half - 9, this.size - 4, 8, 2);
        ctx.fill();
        ctx.stroke();

        // Main module
        ctx.fillStyle = p.base;
        ctx.strokeStyle = p.detail;
        ctx.beginPath();
        ctx.roundRect(-half + 3, -half + 6, this.size - 6, this.size - 11, 4);
        ctx.fill();
        ctx.stroke();

        // Top hatch
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.roundRect(-8, -half + 9, 16, 7, 3);
        ctx.fill();
        ctx.stroke();

        // Drill mast
        ctx.fillStyle = '#6a6a6a';
        ctx.strokeStyle = '#3b3b3b';
        ctx.fillRect(-3, -half + 1, 6, 13);
        ctx.strokeRect(-3, -half + 1, 6, 13);

        // Drill head + simple rotation illusion
        const bladeOffset = this.active ? Math.sin(t) * 2 : 0;
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(-7 - bladeOffset, -half + 2);
        ctx.lineTo(0, -half - 7);
        ctx.lineTo(7 + bladeOffset, -half + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Side canister (resource identity)
        ctx.fillStyle = '#4b4b4b';
        ctx.strokeStyle = '#2f2f2f';
        ctx.beginPath();
        ctx.roundRect(half - 12, -half + 9, 7, 15, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = p.glow;
        ctx.globalAlpha = this.active ? 0.6 + Math.sin(t * 2) * 0.18 : 0.18;
        ctx.fillRect(half - 10, -half + 12, 3, 9);
        ctx.globalAlpha = 1;

        // Front status light
        ctx.fillStyle = this.active ? '#89ff75' : '#7b2d2d';
        ctx.beginPath();
        ctx.arc(0, half - 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(20, 20, 20, 0.75)';
        ctx.stroke();

        // Storage bar
        if (this.storedResources > 0) {
            const fillPercent = this.storedResources / this.maxStorage;
            const barWidth = this.size - 6;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
            ctx.fillRect(-barWidth / 2, half + 4, barWidth, 4);
            ctx.fillStyle = p.glow;
            ctx.fillRect(-barWidth / 2, half + 4, barWidth * fillPercent, 4);
        }
    }

    renderSpikeTrap(ctx, color) {
        const half = this.size / 2;

        // Base plate
        ctx.fillStyle = this.darkenColor(color);
        ctx.fillRect(-half, -half, this.size, this.size);

        // Spikes
        ctx.fillStyle = color;
        const spikeCount = 4;
        for (let i = 0; i < spikeCount; i++) {
            for (let j = 0; j < spikeCount; j++) {
                const x = -half + (this.size / spikeCount) * (i + 0.5);
                const y = -half + (this.size / spikeCount) * (j + 0.5);
                const spikeSize = 6;

                ctx.beginPath();
                ctx.moveTo(x - spikeSize / 2, y);
                ctx.lineTo(x, y - spikeSize);
                ctx.lineTo(x + spikeSize / 2, y);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-half, -half, this.size, this.size);
    }

    renderBarricade(ctx, color) {
        const half = this.size / 2;

        // Main structure - wider and taller
        ctx.fillStyle = color;
        ctx.fillRect(-half, -half, this.size, this.size);

        // Reinforcement bars
        ctx.fillStyle = this.darkenColor(color);
        const barCount = 3;
        for (let i = 0; i < barCount; i++) {
            const y = -half + (this.size / barCount) * i;
            ctx.fillRect(-half, y, this.size, 4);
        }

        // Metal rivets
        ctx.fillStyle = '#888888';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const x = -half + 8 + i * 12;
                const y = -half + 8 + j * 12;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(-half, -half, this.size, this.size);

        // Regen glow if regenerating
        if (this.health < this.maxHealth && this.regenTimer > 0.5) {
            const alpha = 0.3 * (this.regenTimer % 1);
            ctx.fillStyle = `rgba(0, 255, 100, ${alpha})`;
            ctx.fillRect(-half - 2, -half - 2, this.size + 4, this.size + 4);
        }
    }

    renderHealingShrine(ctx, color) {
        const half = this.size / 2;
        const p = this.getUtilityPalette('shrine');
        const time = Date.now() / 800;

        this.drawBuildingShadow(ctx, 30, 9, half - 2);

        // Pedestal
        ctx.fillStyle = p.base;
        ctx.strokeStyle = p.detail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-half + 6, half - 14, this.size - 12, 10, 3);
        ctx.fill();
        ctx.stroke();

        // Shrine body
        ctx.fillStyle = '#6e837f';
        ctx.beginPath();
        ctx.roundRect(-half + 8, -half + 4, this.size - 16, this.size - 12, 4);
        ctx.fill();
        ctx.stroke();

        // Crystal core
        const pulse = 0.7 + Math.sin(time * 2) * 0.2;
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(0, -half - 5);
        ctx.lineTo(8, -half + 6);
        ctx.lineTo(0, -half + 16);
        ctx.lineTo(-8, -half + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cross rune
        ctx.strokeStyle = '#e8ffe8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(0, 9);
        ctx.moveTo(-5, 3);
        ctx.lineTo(5, 3);
        ctx.stroke();

        // Aura
        const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, half + 12);
        gradient.addColorStop(0, `rgba(120, 240, 170, ${0.28 * pulse})`);
        gradient.addColorStop(1, 'rgba(120, 240, 170, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, half + 12, 0, Math.PI * 2);
        ctx.fill();

        // Healing range indicator when player nearby
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);
        if (dist < this.healRange + 80) {
            ctx.strokeStyle = `rgba(120, 240, 170, ${dist < this.healRange ? 0.24 : 0.12})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.healRange, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderWatchtower(ctx, color) {
        const half = this.size / 2;
        const p = this.getUtilityPalette('tower');
        const pulse = 0.08 + Math.sin(Date.now() / 700) * 0.03;
        this.drawBuildingShadow(ctx, 20, 6, half - 1);

        // Wooden legs
        ctx.strokeStyle = p.detail;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-9, half - 2);
        ctx.lineTo(-6, -half + 8);
        ctx.moveTo(9, half - 2);
        ctx.lineTo(6, -half + 8);
        ctx.stroke();

        // Braces
        ctx.strokeStyle = '#7f6846';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(6, 4);
        ctx.moveTo(6, -2);
        ctx.lineTo(-6, 4);
        ctx.stroke();

        // Platform
        ctx.fillStyle = p.base;
        ctx.strokeStyle = p.detail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-half, -half + 2, this.size, 12, 3);
        ctx.fill();
        ctx.stroke();

        // Beacon lens
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.arc(0, -half + 8, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Scanning beam cue
        ctx.strokeStyle = `rgba(255, 230, 150, ${0.35 + pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -half + 8, 9, -0.5, 0.5);
        ctx.stroke();

        // Soft reveal range ring
        const revealAlpha = 0.06 + Math.sin(Date.now() / 800) * 0.025;
        ctx.strokeStyle = `rgba(255, 255, 100, ${revealAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.revealRange, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderOilBarrel(ctx, color) {
        const half = this.size / 2;

        // Barrel body
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 2, half - 1, half, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Metal bands
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        for (const oy of [-4, 4]) {
            ctx.beginPath();
            ctx.ellipse(0, oy, half - 1, 3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Danger icon
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', 0, 4);
    }

    renderRallyBanner(ctx, color) {
        const half = this.size / 2;

        // Pole
        ctx.fillStyle = '#8b6914';
        ctx.strokeStyle = '#5a3a00';
        ctx.lineWidth = 1;
        ctx.fillRect(-2, -half - 6, 4, this.size + 6);
        ctx.strokeRect(-2, -half - 6, 4, this.size + 6);

        // Animated flag
        const time = Date.now() / 500;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(2, -half - 6);
        for (let i = 0; i <= 8; i++) {
            const t = i / 8;
            const wave = Math.sin(time + t * Math.PI * 1.5) * 2;
            ctx.lineTo(2 + 18 * t, -half - 6 + wave + 14 * t);
        }
        ctx.lineTo(2, -half - 6 + 14);
        ctx.closePath();
        ctx.fill();

        // Rally range ring
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);
        if (dist < this.rallyRange + 60) {
            ctx.strokeStyle = this._rallyActive
                ? 'rgba(255, 100, 100, 0.4)'
                : 'rgba(255, 100, 100, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.rallyRange, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderForge(ctx, color) {
        const half = this.size / 2;
        const p = this.getUtilityPalette('forge');
        const fireAlpha = 0.4 + Math.sin(Date.now() / 170) * 0.17;

        this.drawBuildingShadow(ctx, 30, 9, half - 2);

        // Stone plinth
        ctx.fillStyle = '#3f3a35';
        ctx.strokeStyle = '#272421';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-half + 6, half - 14, this.size - 12, 10, 3);
        ctx.fill();
        ctx.stroke();

        // Furnace body
        ctx.fillStyle = p.base;
        ctx.strokeStyle = p.detail;
        ctx.beginPath();
        ctx.roundRect(-half + 6, -half + 4, this.size - 12, this.size - 10, 4);
        ctx.fill();
        ctx.stroke();

        // Forge mouth
        ctx.fillStyle = '#22150f';
        ctx.beginPath();
        ctx.roundRect(-10, -2, 20, 10, 3);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 130, 40, ${fireAlpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 3, 8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chimney
        ctx.fillStyle = '#4e4943';
        ctx.fillRect(8, -half - 9, 10, 16);
        ctx.strokeRect(8, -half - 9, 10, 16);

        // Decorative hot stripe
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-half + 9, -half + 11);
        ctx.lineTo(half - 9, -half + 11);
        ctx.stroke();

        // Smoke puff
        const smokeT = (Date.now() / 650) % 1;
        const smokeAlpha = 0.35 * (1 - smokeT);
        ctx.fillStyle = `rgba(155, 155, 155, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(13 + Math.sin(smokeT * Math.PI * 2) * 2, -half - 10 - smokeT * 14, 4 - smokeT * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Progress bar for conversion timer
        if (this.forgeTimer > 0) {
            const progress = this.forgeTimer / 60;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-half + 2, half - 8, this.size - 4, 4);
            ctx.fillStyle = '#ff9b52';
            ctx.fillRect(-half + 2, half - 8, (this.size - 4) * progress, 4);
        }
    }

    darkenColor(hex) {
        if (hex.startsWith('rgb')) return hex;
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - 30);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - 30);
        const b = Math.max(0, (num & 0x0000FF) - 30);
        return `rgb(${r},${g},${b})`;
    }

    renderHealthBar(ctx) {
        const barWidth = this.size;
        const barHeight = 4;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size / 2 - 8;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.3 ? '#00ff88' : '#ff3366';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    }
}

/**
 * Building System - manages all buildings
 */
export class BuildingSystem {
    constructor(game) {
        this.game = game;

        // All placed buildings
        this.buildings = [];

        // Placement mode
        this.isPlacing = false;
        this.selectedBuilding = null;
        this.previewX = 0;
        this.previewY = 0;
        this.canPlace = false;

        // Grid size for snapping
        this.gridSize = 32;
    }

    /** Number of placed (non-destroyed) turrets */
    getTurretCount() {
        return this.buildings.filter(b => b.type === 'turret' && !b.destroyed).length;
    }

    /** Maximum turrets allowed at current crystal level */
    getTurretCap() {
        const lvl = this.game.crystalUpgradeSystem?.level ?? 0;
        return TURRET_CAPS[Math.min(lvl, TURRET_CAPS.length - 1)];
    }

    /**
     * Start placing a building
     */
    startPlacement(buildingKey) {
        // Crystal level gate — refuse if not yet unlocked
        const upSys = this.game.crystalUpgradeSystem;
        if (upSys && !upSys.isBuildingUnlocked(buildingKey)) {
            const req = upSys.getRequiredLevel(buildingKey);
            this.game.showNotification(
                'Bâtiment verrouillé',
                `Améliore le cristal au niveau ${req + 1} pour débloquer ce bâtiment.`,
                '#bb88ff', 2
            );
            return;
        }

        // Turret cap gate
        const config = BuildingConfigs[buildingKey];
        if (config?.type === 'turret') {
            const cap   = this.getTurretCap();
            const count = this.getTurretCount();
            if (count >= cap) {
                this.game.showNotification(
                    `Tourelles : ${count}/${cap}`,
                    'Limite atteinte — améliore le cristal pour en poser davantage.',
                    '#ff9944', 2
                );
                return;
            }
        }

        this.isPlacing = true;
        this.selectedBuilding = buildingKey;
    }

    /**
     * Cancel placement
     */
    cancelPlacement() {
        this.isPlacing = false;
        this.selectedBuilding = null;
    }

    /**
     * Update building system
     */
    update(deltaTime) {
        // Update all buildings
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const building = this.buildings[i];
            building.update(deltaTime);

            if (building.destroyed) {
                this.buildings.splice(i, 1);
            }
        }

        // Update placement preview
        if (this.isPlacing) {
            this.updatePreview();
        }
    }

    /**
     * Update placement preview position
     */
    updatePreview() {
        const mouse = this.game.input.mouse;
        const config = BuildingConfigs[this.selectedBuilding];

        // Snap to grid - adjust for building size
        if (config && config.size > this.gridSize) {
            // For 2x2 buildings (64x64), snap to even grid positions
            const gridMultiple = config.size / this.gridSize; // 2 for 64x64
            this.previewX = Math.floor(mouse.worldX / config.size) * config.size + config.size / 2;
            this.previewY = Math.floor(mouse.worldY / config.size) * config.size + config.size / 2;
        } else {
            // Normal 1x1 buildings
            this.previewX = Math.floor(mouse.worldX / this.gridSize) * this.gridSize + this.gridSize / 2;
            this.previewY = Math.floor(mouse.worldY / this.gridSize) * this.gridSize + this.gridSize / 2;
        }

        // Check if can place
        this.canPlace = this.canPlaceAt(this.previewX, this.previewY);
    }

    /**
     * Check if building can be placed at position
     */
    canPlaceAt(x, y) {
        if (!this.selectedBuilding) return false;

        const config = BuildingConfigs[this.selectedBuilding];
        const cost = this.game.scaleCost(config?.cost, 'building');
        if (!config) return false;

        // Check resources
        if (!this.game.resourceSystem.hasResources(cost)) {
            return false;
        }

        // Check distance from player
        const player = this.game.player;
        if (Utils.distance(x, y, player.x, player.y) > 200) {
            return false;
        }

        if (!this.game.canPlayerBuildAt(x, y)) {
            return false;
        }

        // Check collision with existing buildings (rectangular bounds)
        const halfSize = config.size / 2;
        for (const building of this.buildings) {
            const buildingHalfSize = building.size / 2;
            // Rectangular collision detection
            if (Math.abs(x - building.x) < halfSize + buildingHalfSize &&
                Math.abs(y - building.y) < halfSize + buildingHalfSize) {
                return false;
            }
        }

        // Check collision with crystal
        if (Utils.distance(x, y, this.game.crystal.x, this.game.crystal.y) < 60) {
            return false;
        }

        // Check world passability
        if (!this.game.world.isPassable(x, y)) {
            return false;
        }

        return true;
    }

    /**
     * Try to place building at current preview position
     */
    tryPlace() {
        if (!this.isPlacing || !this.canPlace) {
            return false;
        }

        const config = BuildingConfigs[this.selectedBuilding];
        const cost = this.game.scaleCost(config?.cost, 'building');

        // Spend resources
        if (!this.game.resourceSystem.spendResources(cost)) {
            return false;
        }

        // Create building
        const building = new Building(this.game, this.previewX, this.previewY, this.selectedBuilding);
        building.ownerId = this.game.networkManager?.playerId || null;
        // Assign a network ID for multiplayer synchronisation
        building._netId = `b${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        this.buildings.push(building);

        // Notify network (other players will call receiveNetworkBuilding)
        this.game.networkManager?.onBuildingPlaced(building);
        this.game.objectiveSystem?.onBuild();

        // Spawn placement effect
        this.spawnPlacementEffect(this.previewX, this.previewY);
        this.game.audioSystem?.playBuild?.();

        return true;
    }

    /**
     * Create a building placed by another player over the network.
     * Skips resource check — the remote player already paid.
     */
    receiveNetworkBuilding(data) {
        // Prevent duplicate (rare race condition)
        if (this.buildings.some(b => b._netId === data.bId)) return;
        const ownerId = data.ownerId ?? data._from ?? null;
        if (!this.game.canPlayerBuildAt(data.x, data.y, ownerId)) return;
        const building = new Building(this.game, data.x, data.y, data.bType);
        building._netId = data.bId;
        building.ownerId = ownerId;
        this.buildings.push(building);
        this.spawnPlacementEffect(data.x, data.y);
    }

    receiveNetworkBuildingUpgrade(netId, level) {
        const b = this.buildings.find(b => b._netId === netId);
        if (!b || b.level >= level) return;
        b.level = level;
        b.updateStats();
        b.health = b.maxHealth;
    }

    getNetworkSnapshot() {
        return this.buildings
            .filter(building => building._netId && !building.destroyed)
            .map(building => ({
                bId: building._netId,
                bType: building.configKey,
                x: Math.round(building.x),
                y: Math.round(building.y),
                level: building.level,
                health: Math.round(building.health),
                ownerId: building.ownerId ?? null
            }));
    }

    receiveNetworkBuildingResync(buildings) {
        if (!Array.isArray(buildings)) return;

        const seen = new Set();
        for (const data of buildings) {
            if (!data?.bId || !data.bType) continue;
            seen.add(data.bId);

            let building = this.buildings.find(b => b._netId === data.bId);
            if (!building) {
                building = new Building(this.game, data.x, data.y, data.bType);
                building._netId = data.bId;
                this.buildings.push(building);
            }

            building.x = data.x;
            building.y = data.y;
            building.ownerId = data.ownerId ?? building.ownerId ?? null;
            building.level = data.level ?? building.level;
            building.updateStats();
            building.health = Math.min(building.maxHealth, data.health ?? building.health);
            building.destroyed = false;
        }

        for (const building of this.buildings) {
            if (building._netId && !seen.has(building._netId)) {
                building._destroyedFromNetwork = true;
                building.destroyed = true;
            }
        }
    }

    /**
     * Destroy a building by its network ID (received from another player).
     */
    destroyNetworkBuilding(netId) {
        const b = this.buildings.find(b => b._netId === netId);
        if (b) {
            b._destroyedFromNetwork = true;
            b.destroyed = true;
        }
    }

    /**
     * Spawn placement particle effect
     */
    spawnPlacementEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            this.game.addParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * 40,
                vy: Math.sin(angle) * 40,
                color: '#00ff88',
                lifetime: 0.3,
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
                    ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }

    /**
     * Render all buildings
     */
    render(ctx) {
        for (const building of this.buildings) {
            building.render(ctx);
        }
    }

    /**
     * Render placement preview
     */
    renderPreview(ctx) {
        if (!this.isPlacing || !this.selectedBuilding) return;

        const config = BuildingConfigs[this.selectedBuilding];
        const half = config.size / 2;

        ctx.save();
        ctx.translate(this.previewX, this.previewY);

        // Preview color
        if (this.canPlace) {
            ctx.fillStyle = 'rgba(0, 255, 136, 0.5)';
            ctx.strokeStyle = '#00ff88';
        } else {
            ctx.fillStyle = 'rgba(255, 68, 102, 0.5)';
            ctx.strokeStyle = '#ff4466';
        }

        ctx.lineWidth = 2;
        ctx.fillRect(-half, -half, config.size, config.size);
        ctx.strokeRect(-half, -half, config.size, config.size);

        // Range indicator for turrets
        if (config.type === 'turret' && config.range) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, config.range, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Get building at position
     */
    getBuildingAt(x, y) {
        for (const building of this.buildings) {
            if (Utils.distance(x, y, building.x, building.y) < building.collisionRadius) {
                return building;
            }
        }
        return null;
    }
}

export default BuildingSystem;
