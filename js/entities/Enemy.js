/**
 * Enemy entity
 */

import { Entity } from './Entity.js';
import { Utils } from '../core/Utils.js';
import { spriteManager } from '../core/SpriteManager.js';

// Pre-defined frozen directive tables — avoids creating a new object every call
const DIRECTIVE_TABLES = Object.freeze({
    swarm:   Object.freeze({ player: 1.12, crystal: 1.08, economy: 1.18, wall: 0.9,  turret: 1,    support: 1,   utility: 1 }),
    elite:   Object.freeze({ player: 1.06, crystal: 1,    economy: 1,    wall: 1.18, turret: 1.25, support: 1,   utility: 1 }),
    ranged:  Object.freeze({ player: 1.08, crystal: 1,    economy: 1,    wall: 1,    turret: 1.4,  support: 1.2, utility: 1 }),
    siege:   Object.freeze({ player: 1,    crystal: 1.1,  economy: 1,    wall: 1.45, turret: 1.22, support: 1,   utility: 1 }),
    boss:    Object.freeze({ player: 1.18, crystal: 1.3,  economy: 1,    wall: 1.15, turret: 1.2,  support: 1,   utility: 1 }),
    default: Object.freeze({ player: 1,    crystal: 1,    economy: 1,    wall: 1,    turret: 1,    support: 1,   utility: 1 }),
});

// Enemy types configuration
export const EnemyTypes = {
    grunt: {
        name: 'Grunt',
        health: 30,
        speed: 60,
        damage: 8,
        attackSpeed: 1,
        color: '#44aa44',
        size: 20,
        xp: 5,
        visionRange: 250,
        buildingDamageMultiplier: 2.5,
        resistances: { physical: 0, fire: 0, frost: 0, lightning: 0 },  // Normal damage
        weaknesses: { fire: 1.5 }  // 50% more damage from fire
    },
    speeder: {
        name: 'Speeder',
        health: 20,
        speed: 120,
        damage: 5,
        attackSpeed: 0.5,
        color: '#44aaaa',
        size: 16,
        xp: 8,
        visionRange: 300,
        buildingDamageMultiplier: 2.0,
        resistances: { physical: 0, fire: 0, frost: 0.5, lightning: 0 },  // 50% less frost damage
        weaknesses: { lightning: 1.5 }  // Fast = weak to lightning
    },
    tank: {
        name: 'Tank',
        health: 100,
        speed: 30,
        damage: 18,
        attackSpeed: 2,
        color: '#aa4444',
        size: 32,
        xp: 15,
        visionRange: 350,
        buildingDamageMultiplier: 3.0,
        resistances: { physical: 0.3, fire: 0.5, frost: 0, lightning: 0 },  // 30% less physical, 50% less fire
        weaknesses: { lightning: 1.3 }  // Heavy armor = weak to lightning
    },
    bomber: {
        name: 'Bomber',
        health: 40,
        speed: 50,
        damage: 10,
        attackSpeed: 1.5,
        color: '#aa8844',
        size: 24,
        explosionDamage: 25,
        explosionRadius: 60,
        xp: 12,
        visionRange: 280,
        buildingDamageMultiplier: 2.0,
        resistances: { physical: 0, fire: 0.7, frost: 0, lightning: 0 },  // 70% less fire (explosive resistant)
        weaknesses: { frost: 1.8 }  // Freeze explosives = very effective
    },
    // DESERT ENEMIES
    scorpion: {
        name: 'Scorpion',
        health: 25,
        speed: 90,
        damage: 7,
        attackSpeed: 0.6,
        color: '#c4a050',
        size: 18,
        xp: 10,
        biome: 'desert',
        poison: { damage: 3, duration: 4 },
        visionRange: 220,
        buildingDamageMultiplier: 2.0,
        resistances: { physical: 0.2, fire: 0.4, frost: 0, lightning: 0 },  // Desert adapted
        weaknesses: { frost: 2.0 }  // Desert creatures hate cold
    },
    mummy: {
        name: 'Mummy',
        health: 80,
        speed: 35,
        damage: 15,
        attackSpeed: 1.8,
        color: '#8b7355',
        size: 28,
        xp: 18,
        biome: 'desert',
        resurrect: true,
        visionRange: 200,
        buildingDamageMultiplier: 3.5,
        resistances: { physical: 0.4, fire: 0.8, frost: 0, lightning: 0.3 },  // Undead, fire immune
        weaknesses: { frost: 1.5, lightning: 1.4 }  // Weak to frost and lightning
    },
    // TUNDRA ENEMIES
    frostElemental: {
        name: 'Frost Elemental',
        health: 50,
        speed: 45,
        damage: 12,
        attackSpeed: 1.2,
        color: '#88ccff',
        size: 26,
        xp: 15,
        biome: 'tundra',
        slow: { factor: 0.5, duration: 2 },
        visionRange: 320,
        buildingDamageMultiplier: 2.5,
        resistances: { physical: 0.3, fire: 0, frost: 0.9, lightning: 0.5 },  // 90% frost resist
        weaknesses: { fire: 2.5 }  // VERY weak to fire (ice melts)
    },
    iceWolf: {
        name: 'Ice Wolf',
        health: 35,
        speed: 110,
        damage: 9,
        attackSpeed: 0.7,
        color: '#aaddff',
        size: 22,
        xp: 12,
        biome: 'tundra',
        packSize: 3,
        visionRange: 400,
        buildingDamageMultiplier: 1.8,
        resistances: { physical: 0, fire: 0, frost: 0.7, lightning: 0 },  // Cold resistant
        weaknesses: { fire: 1.8 }  // Weak to fire
    },
    // SWAMP ENEMIES
    swampThing: {
        name: 'Swamp Thing',
        health: 120,
        speed: 25,
        damage: 14,
        attackSpeed: 2,
        color: '#3a6030',
        size: 34,
        xp: 20,
        biome: 'swamp',
        grab: { duration: 1.5 },
        visionRange: 180,
        buildingDamageMultiplier: 4.0,
        resistances: { physical: 0.5, fire: 0, frost: 0.6, lightning: 0 },  // Tanky, frost resistant
        weaknesses: { fire: 1.6, lightning: 1.4 }  // Plant-based = weak to fire and lightning
    },
    poisonFrog: {
        name: 'Poison Frog',
        health: 20,
        speed: 70,
        damage: 6,
        attackSpeed: 1,
        color: '#44cc44',
        size: 14,
        xp: 8,
        biome: 'swamp',
        ranged: true,
        poison: { damage: 4, duration: 5 },
        visionRange: 250,
        buildingDamageMultiplier: 1.5,
        resistances: { physical: 0, fire: 0, frost: 0.3, lightning: 0 },
        weaknesses: { fire: 1.5, lightning: 1.3 }  // Small and flammable
    },
    // VOLCANIC ENEMIES
    fireImp: {
        name: 'Fire Imp',
        health: 25,
        speed: 80,
        damage: 14,
        attackSpeed: 0.8,
        color: '#ff6622',
        size: 16,
        xp: 14,
        biome: 'volcanic',
        ranged: true,
        fireball: true,
        visionRange: 350,
        buildingDamageMultiplier: 2.5,
        resistances: { physical: 0, fire: 0.9, frost: 0, lightning: 0.3 },  // Fire immune
        weaknesses: { frost: 2.2 }  // Fire creatures hate ice
    },
    lavaGolem: {
        name: 'Lava Golem',
        health: 200,
        speed: 20,
        damage: 30,
        attackSpeed: 2.5,
        color: '#aa2200',
        size: 40,
        xp: 40,
        biome: 'volcanic',
        lavaTrail: true,
        visionRange: 500,
        buildingDamageMultiplier: 4.5,
        resistances: { physical: 0.6, fire: 0.95, frost: 0, lightning: 0.4 },  // Almost fire immune, tanky
        weaknesses: { frost: 2.0 }  // Weak to frost
    },
    // UNIVERSAL ENEMIES
    mimic: {
        name: 'Mimic',
        health: 60,
        speed: 75,
        damage: 16,
        attackSpeed: 0.8,
        color: '#8b6914',
        size: 28,
        xp: 25,
        visionRange: 150,
        buildingDamageMultiplier: 2.0,
        resistances: { physical: 0.3, fire: 0.2, frost: 0.2, lightning: 0.2 },  // Balanced resistances
        weaknesses: {}  // No specific weakness
    },
    shadow: {
        name: 'Shadow',
        health: 30,
        speed: 100,
        damage: 22,
        attackSpeed: 0.6,
        color: '#222233',
        size: 22,
        xp: 20,
        invisible: true,
        visionRange: 280,
        buildingDamageMultiplier: 1.5,
        resistances: { physical: 0.7, fire: 0.3, frost: 0.3, lightning: 0 },  // Physical resistant (shadow)
        weaknesses: { lightning: 1.6 }  // Weak to lightning
    },
    wanderer: {
        name: 'Wanderer',
        health: 150,
        speed: 55,
        damage: 20,
        attackSpeed: 1.3,
        color: '#666688',
        size: 30,
        xp: 35,
        elite: true,
        visionRange: 600,
        buildingDamageMultiplier: 3.0,
        resistances: { physical: 0.4, fire: 0.3, frost: 0.3, lightning: 0.3 },  // Well rounded
        weaknesses: {}  // Elite = no weakness
    },
    // BOSS ENEMIES
    berserkTitan: {
        name: 'Berserk Titan',
        health: 800,
        speed: 40,
        damage: 35,
        attackSpeed: 1.5,
        color: '#cc2222',
        size: 50,
        xp: 150,
        visionRange: 600,
        buildingDamageMultiplier: 5.0,
        isBoss: true,
        bossAbility: 'enrage',  // Gains speed and damage when low HP
        resistances: { physical: 0.4, fire: 0.5, frost: 0.3, lightning: 0.2 },
        weaknesses: { frost: 1.4 }  // Slow him down
    },
    frostLord: {
        name: 'Frost Lord',
        health: 600,
        speed: 35,
        damage: 28,
        attackSpeed: 2.0,
        color: '#2288ff',
        size: 48,
        xp: 150,
        visionRange: 600,
        buildingDamageMultiplier: 4.0,
        isBoss: true,
        bossAbility: 'frostAura',  // Slows nearby enemies and turrets
        resistances: { physical: 0.3, fire: 0, frost: 0.95, lightning: 0.4 },
        weaknesses: { fire: 3.0 }  // VERY weak to fire
    },
    infernoDrake: {
        name: 'Inferno Drake',
        health: 700,
        speed: 50,
        damage: 32,
        attackSpeed: 1.2,
        color: '#ff4400',
        size: 52,
        xp: 150,
        visionRange: 600,
        buildingDamageMultiplier: 6.0,
        isBoss: true,
        bossAbility: 'fireBreath',  // Ranged fire attack
        ranged: true,
        resistances: { physical: 0.3, fire: 0.9, frost: 0, lightning: 0.3 },
        weaknesses: { frost: 2.5 }
    },
    stormWraith: {
        name: 'Storm Wraith',
        health: 500,
        speed: 65,
        damage: 30,
        attackSpeed: 0.8,
        color: '#ffcc00',
        size: 46,
        xp: 150,
        visionRange: 600,
        buildingDamageMultiplier: 3.5,
        isBoss: true,
        bossAbility: 'chainLightning',  // Attacks chain to nearby targets
        resistances: { physical: 0.5, fire: 0.3, frost: 0.3, lightning: 0.95 },
        weaknesses: { frost: 1.5 }
    },
    voidBehemoth: {
        name: 'Void Behemoth',
        health: 1000,
        speed: 25,
        damage: 40,
        attackSpeed: 2.5,
        color: '#440088',
        size: 55,
        xp: 200,
        visionRange: 600,
        buildingDamageMultiplier: 7.0,
        isBoss: true,
        bossAbility: 'voidPulse',  // Periodically damages all nearby entities
        resistances: { physical: 0.6, fire: 0.5, frost: 0.5, lightning: 0.5 },
        weaknesses: {}  // Ultimate boss = no weakness
    }
};

export class Enemy extends Entity {
    constructor(game, x, y, enemyType = 'grunt') {
        super(game, x, y);

        this.type = 'enemy';
        this.enemyType = enemyType;

        // Apply type config
        const config = EnemyTypes[enemyType] || EnemyTypes.grunt;
        this.config = config;
        this.maxHealth = config.health;
        this.health = this.maxHealth;
        this.speed = config.speed;
        this.damage = config.damage;
        this.attackSpeed = config.attackSpeed;
        this.color = config.color;
        this.width = config.size;
        this.height = config.size;
        this.collisionRadius = config.size / 2;
        this.xp = config.xp;
        this.visionRange = config.visionRange || 250;
        this.buildingDamageMultiplier = config.buildingDamageMultiplier || 2.0;

        // Resistance/Weakness system
        this.resistances = config.resistances || { physical: 0, fire: 0, frost: 0, lightning: 0 };
        this.weaknesses = config.weaknesses || {};

        // Boss properties
        this.isBoss = config.isBoss || false;
        this.bossAbility = config.bossAbility || null;
        this.bossAbilityTimer = 0;
        this.bossAbilityCooldown = 5.0;  // Boss abilities every 5s

        // Boss phase 2
        this.bossPhase = 1;
        this.phaseTransitioned = false;
        this.vulnerabilityTimer = 0;

        // Wall-piercer: speeders bypass walls and never target buildings
        this.wallPiercer = (enemyType === 'speeder');

        if (enemyType === 'bomber') {
            this.explosionDamage = config.explosionDamage;
            this.explosionRadius = config.explosionRadius;
        }

        // AI state
        this.target = null;
        this.isAggro = false;  // Only aggro when player in vision range
        this.attackCooldown = 0;
        this.path = [];
        this.pathUpdateTimer = 0;
        this.aiProfile = this.createAIProfile(enemyType);
        this.aiDirective = 'mixed';
        this.retargetLockTimer = Utils.randomFloat(0.35, 0.9);
        this.lastThreatSource = null;
        this.lastThreatTimer = 0;
        this.targetCrystalSlot = null;
        this.feintTimer = Utils.randomFloat(0.8, 1.8);
        this.feintDirection = Math.random() < 0.5 ? -1 : 1;
        this.strafeIntensity = Utils.randomFloat(0.15, 0.45);

        // Animation
        this.animPhase = Math.random() * Math.PI * 2;
        this.wobble = 0;

        // Sprite animation state
        this._animState  = 'idle';  // 'idle' | 'run'
        this._animFrame  = 0;
        this._animTimer  = 0;
        this._animFPS    = 4;       // frames per second
        this._facingLeft = false;

        // Bow special effect tracking
        this.burnDamage = 0;
        this.burnDuration = 0;
        this.burnTimer = 0;
        this.iceHitCount = 0;
        this.frozen = false;
        this.frozenTimer = 0;
        this.slowTimer = 0;
        this.slowOriginalSpeed = 0;

        // Network sync (set by NetworkManager on client-side puppet enemies)
        this._networkControlled = false;
        this._netTargetX        = undefined;
        this._netTargetY        = undefined;
        this._netId             = undefined;
        this._dyingFromNetwork  = false;

        // Lightweight enemy skills (dash / ranged pokes)
        this.skillCooldown = Utils.randomFloat(0.35, 1.2);
        this._burstTime = 0;
        this._burstSpeedMul = 1;
        this._burstBonusDamage = 0;
        this._burstTrailColor = null;
        this._burstTrailTimer = 0;
    }

    update(deltaTime) {
        // Animation phase (shared by all paths)
        this.animPhase += deltaTime * 5;
        this.wobble = Math.sin(this.animPhase) * 2;
        this.updateSkillState(deltaTime);

        // ── Network-controlled puppet (client-side) ───────────────────────────
        // Skip AI movement entirely — position comes exclusively from host via
        // interpolation. Running the AI on top of the lerp causes both systems
        // to fight each other, drifting enemies into walls and making them
        // invisible after a few waves.
        if (this._networkControlled) {
            // Advance sprite frame
            this._animTimer += deltaTime;
            if (this._animTimer >= 1 / this._animFPS) {
                this._animTimer = 0;
                this._animFrame++;
            }

            // Visual timers
            if (this.flashTimer > 0) this.flashTimer -= deltaTime;
            if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;

            // Interpolate toward host-authoritative position.
            // Snap immediately when too far behind to avoid slow crawl across the
            // map (happens after lag spikes or when first entering a room).
            if (this._netTargetX !== undefined) {
                const dx = this._netTargetX - this.x;
                const dy = this._netTargetY - this.y;
                const dist2 = dx * dx + dy * dy;

                if (dist2 > 300 * 300) {
                    // Teleport — enemy is way off, snap instantly
                    this.x = this._netTargetX;
                    this.y = this._netTargetY;
                } else {
                    // Smooth lerp at ~20 Hz input
                    const t = Math.min(1, 10 * deltaTime);
                    this.x += dx * t;
                    this.y += dy * t;
                }

                // Derive animation state from remaining distance to target
                const dist = Math.sqrt(dist2);
                if (dist > 4) {
                    this._animState = 'run';
                    if (Math.abs(dx) > 1) this._facingLeft = dx < 0;
                } else {
                    this._animState = 'idle';
                }
            }

            // Run attack targeting so the enemy faces/attacks the right entity
            // locally (gives visual feedback without diverging positions).
            this.pathUpdateTimer += deltaTime;
            if (this.pathUpdateTimer > 0.5) {
                this.pathUpdateTimer = 0;
                this.updateTarget();
            }
            this.tryAttack();
            this.tryUseCombatSkill();

            // Burn: visual particles only — DO NOT apply damage or broadcast
            // ENEMY_HIT. Burn ticks independently on each client causing health
            // desync; the host's authoritative health arrives via ENEMY_BATCH.
            if (this.burnDuration > 0) {
                this.burnTimer += deltaTime;
                if (this.burnTimer >= 1) {
                    this.burnTimer = 0;
                    this.burnDuration -= 1;
                    if (this.burnDuration % 2 === 0) {
                        this.game.addParticle({
                            x: this.x + Utils.randomFloat(-10, 10),
                            y: this.y + Utils.randomFloat(-10, 10),
                            vy: -30, color: '#ff6600',
                            lifetime: 0.5, age: 0, size: 4, destroyed: false,
                            update(dt) { this.y += this.vy * dt; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
                            render(ctx) {
                                const alpha = 1 - this.age / this.lifetime;
                                ctx.fillStyle = this.color; ctx.globalAlpha = alpha;
                                ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                                ctx.globalAlpha = 1;
                            }
                        });
                    }
                }
            }

            // Frozen visual
            if (this.frozen) {
                this.frozenTimer -= deltaTime;
                if (this.frozenTimer <= 0) this.frozen = false;
            }

            return; // Skip AI movement — no vx/vy, no pathfinding, no bounds check
        }

        // ── Full AI (host / solo) ─────────────────────────────────────────────

        // Sprite animation state & frame advance
        const moving = Math.abs(this.vx) + Math.abs(this.vy) > 1;
        this._animState = moving ? 'run' : 'idle';
        if (moving && this.vx !== 0) this._facingLeft = this.vx < 0;
        this._animTimer += deltaTime;
        if (this._animTimer >= 1 / this._animFPS) {
            this._animTimer = 0;
            this._animFrame++;
        }

        // Cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        if (this.retargetLockTimer > 0) {
            this.retargetLockTimer -= deltaTime;
        }
        if (this.lastThreatTimer > 0) {
            this.lastThreatTimer -= deltaTime;
            if (this.lastThreatTimer <= 0) this.lastThreatSource = null;
        }
        this.feintTimer -= deltaTime;
        if (this.feintTimer <= 0) {
            this.feintTimer = Utils.randomFloat(0.8, 1.8);
            this.feintDirection *= -1;
        }

        // Boss ability timer
        if (this.isBoss && this.bossAbility) {
            this.bossAbilityTimer += deltaTime;
            if (this.bossAbilityTimer >= this.bossAbilityCooldown) {
                this.bossAbilityTimer = 0;
                this.activateBossAbility();
            }
        }

        // Boss phase 2 transition at 50% HP
        if (this.isBoss && !this.phaseTransitioned && this.health <= this.maxHealth * 0.5) {
            this.phaseTransitioned = true;
            this.bossPhase = 2;
            this.vulnerabilityTimer = 2.5; // 2.5s vulnerability window on transition
            this._triggerPhase2Visuals();
            if (!this._networkControlled) this._applyPhase2Stats();
        }
        if (this.vulnerabilityTimer > 0) this.vulnerabilityTimer -= deltaTime;

        // Path update (faster for faster enemies)
        const updateFrequency = this.speed > 80 ? 0.3 : 0.5;
        this.pathUpdateTimer += deltaTime;
        if (this.pathUpdateTimer > updateFrequency) {
            this.pathUpdateTimer = 0;
            this.updateTarget();
        }

        // Movement AI
        this.moveTowardsTarget(deltaTime);

        // Attack logic
        this.tryAttack();
        this.tryUseCombatSkill();

        // Apply friction
        this.vx *= 0.9;
        this.vy *= 0.9;

        // Flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }

        // Burn damage over time — suppress floating numbers (text rendering is costly at scale)
        if (this.burnDuration > 0) {
            this.burnTimer += deltaTime;
            if (this.burnTimer >= 1) {
                this.burnTimer = 0;
                this.takeDamage(this.burnDamage, null, 'fire', true);
                this.burnDuration -= 1;

                // Visual particle every other tick only
                if (this.burnDuration % 2 === 0) {
                    this.game.addParticle({
                        x: this.x + Utils.randomFloat(-10, 10),
                        y: this.y + Utils.randomFloat(-10, 10),
                        vy: -30,
                        color: '#ff6600',
                        lifetime: 0.5,
                        age: 0,
                        size: 4,
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
                            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                            ctx.globalAlpha = 1;
                        }
                    });
                }
            }
        }

        // Slow effect countdown (replaces setTimeout-based restoration)
        if (this.slowTimer > 0) {
            this.slowTimer -= deltaTime;
            if (this.slowTimer <= 0) {
                this.slowTimer = 0;
                if (!this.frozen) {
                    this.speed = this.slowOriginalSpeed || (this.config?.speed ?? 60);
                }
            }
        }

        // Frozen effect
        if (this.frozen) {
            this.frozenTimer -= deltaTime;
            if (this.frozenTimer <= 0) {
                this.frozen = false;
                // Restore speed if not still slowed
                if (this.slowTimer <= 0) {
                    this.speed = this.slowOriginalSpeed || (this.config?.speed ?? 60);
                }
            }
        }

        // Update position
        const oldX = this.x;
        const oldY = this.y;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // World/Cave bounds and passability
        if (this.game.inCave && this.game.currentCave) {
            const cave = this.game.currentCave;
            this.x = Utils.clamp(this.x, this.width / 2, cave.width - this.width / 2);
            this.y = Utils.clamp(this.y, this.height / 2, cave.height - this.height / 2);

            if (!cave.isPassable(this.x, this.y)) {
                this.x = oldX;
                this.y = oldY;
            }
        } else {
            this.x = Utils.clamp(this.x, this.width / 2, this.game.world.width - this.width / 2);
            this.y = Utils.clamp(this.y, this.height / 2, this.game.world.height - this.height / 2);

            if (!this.game.world.isPassable(this.x, this.y)) {
                this.x = oldX;
                this.y = oldY;
            }

            // Check collision with buildings (prevents knockback through walls)
            const buildings = this.game.buildingSystem.buildings;
            for (const building of buildings) {
                if (!building.solid) continue;

                const dist = Utils.distance(this.x, this.y, building.x, building.y);
                const minDist = this.collisionRadius + building.collisionRadius;

                if (dist < minDist) {
                    // Push enemy away from building
                    const angle = Utils.angle(building.x, building.y, this.x, this.y);
                    const overlap = minDist - dist;
                    this.x += Math.cos(angle) * overlap;
                    this.y += Math.sin(angle) * overlap;

                    // Stop velocity in that direction
                    this.vx *= 0.5;
                    this.vy *= 0.5;
                }
            }
        }
    }

    /**
     * Update target (crystal or player) - with vision range check
     */
    updateTarget() {
        const player = this.game.player;
        const distToPlayer = this.distanceTo(player);

        // In cave, only target player if within vision range
        if (this.game.inCave) {
            if (distToPlayer <= this.visionRange) {
                this.target = player;
                this.isAggro = true;
            } else if (!this.isAggro) {
                // Wander randomly if not aggro
                this.target = null;
            }
            // Once aggro, stay aggro (but still need to be in range to attack)
            return;
        }

        const crystal = this.getAssignedCrystal();
        const directive = this.getDirectiveMultipliers();
        const candidates = [];
        const playerValid = this.isTargetValid(player);
        const playerAggroRange = Math.max(170, Math.min(this.visionRange, 320));
        const playerIsImmediateThreat = playerValid && (
            distToPlayer <= playerAggroRange ||
            this.lastThreatSource === player ||
            (this.target === player && distToPlayer <= this.visionRange * 1.4)
        );

        if (playerIsImmediateThreat) {
            this.isAggro = true;
        }

        if (crystal && !crystal.destroyed && crystal.health > 0) {
            const crystalCategory = this.classifyTarget(crystal);
            candidates.push({
                target: crystal,
                score: this.scoreTarget(crystal, crystalCategory, directive)
            });
        }

        const playerInRange = playerValid && distToPlayer <= this.visionRange * 1.2;
        if (playerInRange || this.aiProfile.weights.player >= 1.15 || this.lastThreatSource === player) {
            const playerCategory = this.classifyTarget(player);
            candidates.push({
                target: player,
                score: this.scoreTarget(player, playerCategory, directive)
            });
        }

        if (playerIsImmediateThreat && this.target !== player) {
            this.target = player;
            this.retargetLockTimer = Utils.randomFloat(0.25, 0.55);
            return;
        }

        // Buildings are no longer selected as primary targets. Enemies can still
        // attack true blockers (walls/doors/barricades) in moveTowardsTarget().

        if (candidates.length === 0) {
            this.target = crystal ?? null;
            return;
        }

        let best = candidates[0];
        for (let i = 1; i < candidates.length; i++) {
            if (candidates[i].score > best.score) {
                best = candidates[i];
            }
        }

        if (!this.isTargetValid(this.target)) {
            this.target = best.target;
            this.retargetLockTimer = Utils.randomFloat(0.45, 1.0);
            return;
        }

        // Do not keep legacy/old building locks now that crystal is the
        // strategic objective.
        if (this.isBuildingTarget(this.target)) {
            this.target = best.target;
            this.retargetLockTimer = Utils.randomFloat(0.3, 0.8);
            return;
        }

        const currentCategory = this.classifyTarget(this.target);
        const currentScore = this.scoreTarget(this.target, currentCategory, directive, true);
        const neededGain = 8 + (1 - this.aiProfile.unpredictability) * 9;
        if (this.retargetLockTimer <= 0 || best.score > currentScore + neededGain) {
            this.target = best.target;
            this.retargetLockTimer = Utils.randomFloat(0.45, 1.2);
        }
    }

    /**
     * Move towards current target
     */
    moveTowardsTarget(deltaTime) {
        if (!this.target) return;

        const targetRadius = this.target.collisionRadius || 16;
        const angle = this.angleTo(this.target);
        const dist = this.distanceTo(this.target);

        // Stop when in attack range
        if (dist < this.collisionRadius + targetRadius + 10) {
            return;
        }

        // Simple steering with collision avoidance
        const steeringAngle = this.getSmartApproachAngle(angle, dist, deltaTime);
        let moveX = Math.cos(steeringAngle);
        let moveY = Math.sin(steeringAngle);

        if (!this.game.inCave) {
            const danger = this.getTurretDangerAt(this.x, this.y);
            if (danger > 1.1) {
                const strafe = this.feintDirection * this.strafeIntensity;
                moveX += Math.cos(steeringAngle + Math.PI / 2) * strafe;
                moveY += Math.sin(steeringAngle + Math.PI / 2) * strafe;
            }
        }

        // Avoid other enemies — use spatial hash instead of scanning all enemies
        const sepRadius = this.collisionRadius * 3 + 20;
        const nearby = this.game.collisionSystem?.getNearby(this.x, this.y, sepRadius) ?? [];
        for (const other of nearby) {
            if (other === this || other.type !== 'enemy') continue;
            const d = this.distanceTo(other);
            if (d < this.collisionRadius + other.collisionRadius + 5) {
                const pushAngle = this.angleTo(other);
                moveX -= Math.cos(pushAngle) * 0.5;
                moveY -= Math.sin(pushAngle) * 0.5;
            }
        }

        // Avoid buildings (wall-piercers slip past — they target players/crystal only)
        const buildings = this.game.buildingSystem.buildings;
        for (const building of buildings) {
            if (!building.solid) continue;
            if (this.wallPiercer && this.isWallLike(building.type)) continue;
            const d = Utils.distance(this.x, this.y, building.x, building.y);
            if (d < this.collisionRadius + building.collisionRadius + 20) {
                if (building === this.target) continue;
                const pushAngle = Utils.angle(building.x, building.y, this.x, this.y);

                // Chip strategic blockers while pushing through.
                if (d < this.collisionRadius + building.collisionRadius + 10) {
                    if (this.shouldAttackBlockingBuilding(building)) {
                        this.attackBuilding(building);
                        return;
                    }
                }

                moveX += Math.cos(pushAngle) * 0.8;
                moveY += Math.sin(pushAngle) * 0.8;
            }
        }

        // Normalize and apply speed
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        if (length > 0) {
            const moveSpeed = this.speed * (this._burstTime > 0 ? this._burstSpeedMul : 1);
            this.x += (moveX / length) * moveSpeed * deltaTime;
            this.y += (moveY / length) * moveSpeed * deltaTime;
        }
    }

    getSmartApproachAngle(baseAngle, dist, deltaTime) {
        if (this.game.inCave || this.isWallLike(this.target?.type)) {
            return baseAngle;
        }

        const flankAmount = 0.35 + this.aiProfile.unpredictability * 0.45;
        const candidates = [baseAngle, baseAngle + flankAmount, baseAngle - flankAmount];
        let bestAngle = baseAngle;
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            const testDist = Math.min(110, this.speed * deltaTime * 3);
            const testX = this.x + Math.cos(candidate) * testDist;
            const testY = this.y + Math.sin(candidate) * testDist;
            if (!this.game.world.isPassable(testX, testY)) continue;

            const progress = Math.cos(candidate - baseAngle) * 12;
            const danger = this.getTurretDangerAt(testX, testY) * (9 - this.aiProfile.weights.turret * 2);
            const noise = Utils.randomFloat(-3, 3) * this.aiProfile.unpredictability;
            const distanceUrgency = dist < 240 ? 4 : 0;
            const score = progress - danger + noise + distanceUrgency;

            if (score > bestScore) {
                bestScore = score;
                bestAngle = candidate;
            }
        }

        return bestAngle;
    }

    getTurretDangerAt(x, y) {
        // Use per-frame cached turret list from Game to avoid re-filtering all buildings each call
        const turrets = this.game.getActiveTurrets();
        let danger = 0;
        for (let i = 0; i < turrets.length; i++) {
            const t = turrets[i];
            const dist = Utils.distance(x, y, t.x, t.y);
            if (dist >= t.range) continue;
            const levelBonus = 1 + ((t.level || 1) - 1) * 0.2;
            danger += (1 - dist / Math.max(1, t.range)) * levelBonus;
        }
        return danger;
    }

    getAssignedCrystal() {
        if (this.targetCrystalSlot) {
            const crystal = this.game.getCrystalForSlot?.(this.targetCrystalSlot) ?? null;
            if (crystal && !crystal.destroyed && crystal.health > 0) return crystal;
            // Target crystal is gone — this enemy should already be destroyed by handleCrystalDestroyed.
            // Return null so it doesn't wander across islands to attack someone else's crystal.
            return null;
        }
        return this.game.crystal;
    }

    scoreTarget(target, category, directive, keepCurrent = false) {
        const dist = this.distanceTo(target);
        const healthRatio = (target.maxHealth > 0) ? (target.health / target.maxHealth) : 1;
        const baseWeight = this.aiProfile.weights[category] || 0.8;
        const directiveWeight = directive[category] || 1;

        let score = baseWeight * directiveWeight * 70;
        score += Math.max(0, 420 - dist) * this.aiProfile.distanceBias;
        score += (1 - healthRatio) * 26;
        score += Utils.randomFloat(-6, 6) * this.aiProfile.unpredictability;

        if (keepCurrent) score += 6;

        if (target === this.lastThreatSource && this.lastThreatTimer > 0) {
            score += 70 * this.aiProfile.vengeance * Math.min(1, this.lastThreatTimer / 3);
        }

        if (category === 'player') {
            const hpRatio = this.game.player.health / Math.max(1, this.game.player.maxHealth);
            score += (1 - hpRatio) * 20;
            if (dist < 320) score += (320 - dist) * 0.55;
            if (dist < 170) score += 52;
        } else if (category === 'crystal') {
            // Crystal is always the primary objective — large flat bonus that
            // cannot be overcome by the proximity bonus of nearby buildings.
            score += 70;
        } else if (category === 'turret') {
            score += (target.level || 1) * 6;
            score += (target.damage || 10) * 0.35;
            score += this.getTurretDangerAt(target.x, target.y) * 10;
        } else if (category === 'wall') {
            const assignedCrystal = this.getAssignedCrystal();
            const crystalDist = assignedCrystal
                ? Utils.distance(target.x, target.y, assignedCrystal.x, assignedCrystal.y)
                : Infinity;
            if (crystalDist < 180) score += 26;
            if (this.aiProfile.breachFocus > 0.6) score += 14;
        } else if (category === 'economy') {
            score += this.game.waveSystem?.currentWave >= 5 ? 20 : 6;
        } else if (category === 'support') {
            score += 10;
        }

        return score;
    }

    classifyTarget(target) {
        if (!target) return 'utility';
        if (target === this.getAssignedCrystal()) return 'crystal';
        if (target === this.game.player) return 'player';

        const type = target.type;
        if (type === 'turret') return 'turret';
        if (this.isWallLike(type)) return 'wall';
        if (type === 'autoMiner' || type === 'forge' || type === 'workbench') return 'economy';
        if (type === 'healingShrine' || type === 'watchtower' || type === 'rallyBanner') return 'support';
        return 'utility';
    }

    isWallLike(type) {
        return type === 'wall' || type === 'door' || type === 'barricade';
    }

    isBuildingTarget(target) {
        if (!target) return false;
        if (target === this.game.player || target === this.getAssignedCrystal()) return false;
        return typeof target.takeDamage === 'function' && typeof target.type === 'string';
    }

    isTargetValid(target) {
        if (!target || target.destroyed) return false;
        if (target.health !== undefined && target.health <= 0) return false;
        return true;
    }

    getDirectiveMultipliers() {
        return DIRECTIVE_TABLES[this.aiDirective] ?? DIRECTIVE_TABLES.default;
    }

    createAIProfile(enemyType) {
        const profile = {
            weights: {
                player: 0.85,
                crystal: 1.0,
                turret: 1.0,
                wall: 0.9,
                economy: 0.85,
                support: 0.8,
                utility: 0.7
            },
            distanceBias: 0.14,
            unpredictability: 0.7,
            vengeance: 0.8,
            breachFocus: 0.4
        };

        const rushers = ['speeder', 'iceWolf', 'shadow', 'scorpion'];
        const siegeUnits = ['tank', 'bomber', 'mummy', 'swampThing', 'lavaGolem', 'voidBehemoth', 'berserkTitan'];
        const harassers = ['poisonFrog', 'fireImp', 'frostElemental', 'stormWraith', 'infernoDrake'];

        if (rushers.includes(enemyType)) {
            profile.weights.player = 1.1;
            profile.weights.economy = 1.15;
            profile.weights.crystal = 0.95;
            profile.distanceBias = 0.18;
            profile.unpredictability = 1.0;
            profile.breachFocus = 0.3;
        } else if (siegeUnits.includes(enemyType)) {
            profile.weights.wall = 1.35;
            profile.weights.turret = 1.2;
            profile.weights.crystal = 1.1;
            profile.weights.player = 0.7;
            profile.distanceBias = 0.11;
            profile.unpredictability = 0.45;
            profile.breachFocus = 0.95;
        } else if (harassers.includes(enemyType)) {
            profile.weights.turret = 1.35;
            profile.weights.support = 1.15;
            profile.weights.player = 0.95;
            profile.weights.crystal = 0.9;
            profile.distanceBias = 0.16;
            profile.unpredictability = 0.9;
            profile.breachFocus = 0.35;
        } else if (this.isBoss) {
            profile.weights.player = 1.1;
            profile.weights.crystal = 1.3;
            profile.weights.turret = 1.15;
            profile.weights.wall = 1.1;
            profile.distanceBias = 0.15;
            profile.unpredictability = 0.65;
            profile.vengeance = 1.0;
            profile.breachFocus = 0.8;
        }

        return profile;
    }

    shouldAttackBlockingBuilding(building) {
        if (!building || building.destroyed) return false;
        // Attack wall-like obstacles in path regardless of current target —
        // walls are only useful as barriers if enemies actually have to break them.
        return this.classifyTarget(building) === 'wall';
    }

    /**
     * Try to attack target
     */
    tryAttack() {
        if (!this.target || this.attackCooldown > 0) return;

        const dist = this.distanceTo(this.target);
        const targetRadius = this.target.collisionRadius || 16;
        const attackRange = this.collisionRadius + targetRadius + 15;

        if (dist < attackRange) {
            if (this.isBuildingTarget(this.target)) {
                this.attackBuilding(this.target);
                this.wobble = 5;
                return;
            }

            const nightBonus = (this.game.dayNight?.isNight ? (this.game._nightDamageBonus || 1) : 1);
            let hitDamage = this.damage * nightBonus;

            if (this.target === this.game.player && this._burstTime > 0 && this._burstBonusDamage > 0) {
                hitDamage += this._burstBonusDamage;
                this._burstBonusDamage = Math.max(0, this._burstBonusDamage * 0.35);
            }

            this.target.takeDamage(hitDamage, this);
            this.attackCooldown = this.attackSpeed;

            // Attack animation
            this.wobble = 5;
        }
    }

    /**
     * Take damage with resistance/weakness system
     */
    takeDamage(damage, source, damageType = 'physical', suppressParticles = false) {
        if (this._takingNetworkDamage) return;

        if (source && source !== this && typeof source.x === 'number' && typeof source.y === 'number') {
            this.lastThreatSource = source;
            this.lastThreatTimer = source.type === 'turret' ? 4.0 : 2.5;
            this.retargetLockTimer = Math.min(this.retargetLockTimer, 0.2);
        }

        // Apply resistance/weakness
        let finalDamage = damage;

        // Boss phase transition vulnerability window: +50% incoming damage
        if (this.vulnerabilityTimer > 0) finalDamage *= 1.5;

        // Global modifiers from optional challenges
        if (damageType === 'physical' && this.game._globalArmorBonus) {
            finalDamage *= Math.max(0.05, 1 - this.game._globalArmorBonus);
        }

        // Check resistance
        if (this.resistances[damageType] !== undefined) {
            finalDamage *= (1 - this.resistances[damageType]);
        }

        // Check weakness
        if (this.weaknesses[damageType] !== undefined) {
            finalDamage *= this.weaknesses[damageType];
        }

        // Call parent takeDamage
        super.takeDamage(Math.floor(finalDamage), source, suppressParticles);

        // Broadcast hit to other clients (sender already applied damage locally).
        // Skip when already destroyed — die() already sent ENEMY_DEATH so an
        // extra ENEMY_HIT{hp:0} is redundant and races with the death message.
        if (this._netId && this.game.networkManager?.inRoom && !this.destroyed) {
            this.game.networkManager.onEnemyHit(this._netId, this.health);
        }

        // Visual feedback for weakness (emoji indicator only)
        if (this.weaknesses[damageType] && this.weaknesses[damageType] > 1) {
            // Show weakness indicator icon
            this.game.visualEffects.showWeaknessIndicator(this, damageType);
        }
    }

    /**
     * Attack a building
     */
    attackBuilding(building) {
        if (this.attackCooldown > 0) return;

        const category = this.classifyTarget(building);
        let tacticalMultiplier = 1;

        if (category === 'turret') tacticalMultiplier += this.aiProfile.weights.turret * 0.18;
        if (category === 'economy') tacticalMultiplier += this.aiProfile.weights.economy * 0.12;
        if (category === 'wall') tacticalMultiplier += this.aiProfile.breachFocus * 0.2;
        if (building.health < building.maxHealth * 0.35) tacticalMultiplier += 0.15;
        tacticalMultiplier = Math.min(1.85, tacticalMultiplier);

        // Night waves are extra lethal against structures
        const nightBonus = this.game.dayNight?.isNight ? (this.game._nightDamageBonus || 1) : 1;
        const buildingDamage = Math.floor(this.damage * this.buildingDamageMultiplier * tacticalMultiplier * nightBonus);
        building.takeDamage(buildingDamage);
        this.attackCooldown = this.attackSpeed;
    }

    updateSkillState(deltaTime) {
        if (this.skillCooldown > 0) {
            this.skillCooldown -= deltaTime;
        }

        if (this._burstTime > 0) {
            this._burstTime -= deltaTime;
            this._burstTrailTimer += deltaTime;

            if (this._burstTrailTimer >= 0.035) {
                this._burstTrailTimer = 0;
                const color = this._burstTrailColor || 'rgba(220, 240, 255, 0.35)';
                this.game.addParticle({
                    x: this.x + Utils.randomFloat(-3, 3),
                    y: this.y + Utils.randomFloat(-3, 3),
                    size: Utils.randomFloat(2.2, 3.4),
                    color,
                    lifetime: 0.18,
                    age: 0,
                    destroyed: false,
                    update(dt) {
                        this.age += dt;
                        if (this.age >= this.lifetime) this.destroyed = true;
                    },
                    render(ctx) {
                        const alpha = 1 - this.age / this.lifetime;
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = this.color;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                });
            }

            if (this._burstTime <= 0) {
                this._burstTime = 0;
                this._burstSpeedMul = 1;
                this._burstBonusDamage = 0;
                this._burstTrailColor = null;
            }
        }
    }

    tryUseCombatSkill() {
        if (!this.target || this.skillCooldown > 0) return;

        const targetIsPlayer = this.target === this.game.player;
        const dist = this.distanceTo(this.target);

        switch (this.enemyType) {
            case 'speeder':
                if (targetIsPlayer && dist > 70 && dist < 235) {
                    this.startBurstDash(3.15, 0.24, 4, 'rgba(125, 240, 255, 0.55)');
                    this.skillCooldown = Utils.randomFloat(3.0, 4.4);
                }
                break;

            case 'iceWolf':
                if (targetIsPlayer && dist > 85 && dist < 245) {
                    this.startBurstDash(2.7, 0.2, 5, 'rgba(185, 235, 255, 0.6)');
                    this.skillCooldown = Utils.randomFloat(3.6, 4.8);
                }
                break;

            case 'shadow':
                if (targetIsPlayer && dist > 145 && dist < 380) {
                    this.phaseStepTowardsTarget(118);
                    this.skillCooldown = Utils.randomFloat(4.2, 5.6);
                }
                break;

            case 'scorpion':
                if (targetIsPlayer && dist > 70 && dist < 260) {
                    const fired = this.fireSkillShot({
                        speed: 205,
                        range: 280,
                        damage: 4,
                        size: 4.5,
                        spread: 0.06,
                        color: '#f2bf5d',
                        coreColor: '#ffe3a6',
                        onHitPlayer: () => this.applyPoisonToPlayer(1.1, 2)
                    });
                    if (fired) this.skillCooldown = Utils.randomFloat(2.4, 3.2);
                }
                break;

            case 'poisonFrog':
                if (targetIsPlayer && dist > 80 && dist < 300) {
                    const fired = this.fireSkillShot({
                        speed: 180,
                        range: 300,
                        damage: 3,
                        size: 5,
                        spread: 0.08,
                        color: '#54d36f',
                        coreColor: '#d6ffaf',
                        onHitPlayer: () => this.applyPoisonToPlayer(1.4, 3)
                    });
                    if (fired) this.skillCooldown = Utils.randomFloat(2.0, 2.8);
                }
                break;

            case 'fireImp':
                if (targetIsPlayer && dist > 90 && dist < 330) {
                    const fired = this.fireSkillShot({
                        speed: 235,
                        range: 330,
                        damage: 5,
                        size: 5.5,
                        spread: 0.07,
                        color: '#ff7a3d',
                        coreColor: '#ffe08a'
                    });
                    if (fired) this.skillCooldown = Utils.randomFloat(2.0, 2.9);
                }
                break;

            case 'frostElemental':
                if (targetIsPlayer && dist > 100 && dist < 300) {
                    const fired = this.fireSkillShot({
                        speed: 210,
                        range: 300,
                        damage: 4,
                        size: 5,
                        spread: 0.05,
                        color: '#7bcfff',
                        coreColor: '#e9fbff',
                        onHitPlayer: () => this.applyFrostToPlayer(0.2, 1.0)
                    });
                    if (fired) this.skillCooldown = Utils.randomFloat(2.6, 3.6);
                }
                break;
        }
    }

    startBurstDash(speedMultiplier, duration, bonusDamage, trailColor) {
        this._burstTime = duration;
        this._burstSpeedMul = speedMultiplier;
        this._burstBonusDamage = bonusDamage;
        this._burstTrailColor = trailColor;
        this._burstTrailTimer = 0;

        this.game.addParticle({
            x: this.x,
            y: this.y,
            radius: this.collisionRadius + 4,
            lifetime: 0.2,
            age: 0,
            color: trailColor || 'rgba(255,255,255,0.45)',
            destroyed: false,
            update(dt) {
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * (1 + this.age * 1.8), 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });
    }

    phaseStepTowardsTarget(stepDistance) {
        if (!this.target) return;

        const originX = this.x;
        const originY = this.y;
        const angle = this.angleTo(this.target) + Utils.randomFloat(-0.25, 0.25);
        const nx = this.x + Math.cos(angle) * stepDistance;
        const ny = this.y + Math.sin(angle) * stepDistance;

        let canMove = false;
        if (this.game.inCave && this.game.currentCave) {
            canMove = this.game.currentCave.isPassable(nx, ny);
        } else {
            canMove = this.game.world.isPassable(nx, ny);
        }
        if (!canMove) return;

        this.x = nx;
        this.y = ny;
        this.spawnSkillImpact(originX, originY, 'rgba(140, 110, 220, 0.55)');
        this.spawnSkillImpact(this.x, this.y, 'rgba(140, 110, 220, 0.4)');
    }

    fireSkillShot(options = {}) {
        if (!this.target) return false;

        const speed = options.speed ?? 200;
        const range = options.range ?? 280;
        const damage = options.damage ?? 4;
        const spread = options.spread ?? 0;
        const angleOffset = options.angleOffset ?? 0;
        const radius = options.size ?? 5;
        const color = options.color ?? '#ffffff';
        const coreColor = options.coreColor ?? '#ffffff';
        const lead = Math.min(0.28, range / Math.max(120, speed) * 0.28);

        const tx = this.target.x + (this.target.vx || 0) * lead;
        const ty = this.target.y + (this.target.vy || 0) * lead;
        const angle = Utils.angle(this.x, this.y, tx, ty) + angleOffset + Utils.randomFloat(-spread, spread);

        const owner = this;
        const game = this.game;
        const startX = this.x + Math.cos(angle) * (this.collisionRadius + radius + 3);
        const startY = this.y + Math.sin(angle) * (this.collisionRadius + radius + 3);
        const life = range / speed;
        const trail = [];

        game.addParticle({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius,
            damage,
            life,
            age: 0,
            color,
            coreColor,
            trail,
            onHitPlayer: options.onHitPlayer || null,
            destroyed: false,
            update(dt) {
                this.age += dt;
                if (this.age >= this.life) { this.destroyed = true; return; }

                this.x += this.vx * dt;
                this.y += this.vy * dt;

                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 6) this.trail.shift();

                // Wall collision — projectile is blocked by solid wall-like buildings.
                // Checked before player so walls actually shield the player.
                const buildings = game.buildingSystem?.buildings;
                if (buildings) {
                    for (const b of buildings) {
                        if (b.destroyed || !b.solid || !owner.isWallLike?.(b.type)) continue;
                        const bHalf = (b.size || 32) / 2;
                        // AABB pre-reject (fast path for distant buildings)
                        if (Math.abs(this.x - b.x) > bHalf + this.radius + 2 ||
                            Math.abs(this.y - b.y) > bHalf + this.radius + 2) continue;
                        // Proper AABB-circle collision
                        const cx = Math.max(b.x - bHalf, Math.min(this.x, b.x + bHalf));
                        const cy = Math.max(b.y - bHalf, Math.min(this.y, b.y + bHalf));
                        const dx = cx - this.x, dy = cy - this.y;
                        if (dx * dx + dy * dy < this.radius * this.radius) {
                            b.takeDamage(Math.floor(this.damage * (owner.buildingDamageMultiplier || 2)));
                            owner.spawnSkillImpact(this.x, this.y, '#ff8800');
                            this.destroyed = true;
                            break;
                        }
                    }
                    if (this.destroyed) return;
                }

                // Player collision
                const player = game.player;
                if (!player || player.destroyed || player.health <= 0) return;

                const pr = player.collisionRadius || (player.width ? player.width / 2 : 16);
                if (Utils.circleCollision(this.x, this.y, this.radius, player.x, player.y, pr)) {
                    player.takeDamage(this.damage, owner);
                    if (typeof this.onHitPlayer === 'function') this.onHitPlayer(player, owner);
                    owner.spawnSkillImpact(this.x, this.y, this.color);
                    this.destroyed = true;
                }
            },
            render(ctx) {
                if (this.trail.length > 1) {
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 2.2;
                    ctx.globalAlpha = 0.55;
                    ctx.beginPath();
                    ctx.moveTo(this.trail[0].x, this.trail[0].y);
                    for (let i = 1; i < this.trail.length; i++) {
                        ctx.lineTo(this.trail[i].x, this.trail[i].y);
                    }
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }

                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = this.coreColor;
                ctx.beginPath();
                ctx.arc(this.x, this.y, Math.max(1.5, this.radius * 0.45), 0, Math.PI * 2);
                ctx.fill();
            }
        });

        this.attackCooldown = Math.max(this.attackCooldown, 0.35);
        return true;
    }

    applyPoisonToPlayer(damagePerTick = 1, ticks = 2) {
        const player = this.game.player;
        if (!player || player.destroyed) return;

        player._enemyPoisonDamage = Math.max(player._enemyPoisonDamage || 0, damagePerTick);
        player._enemyPoisonTicks = (player._enemyPoisonTicks || 0) + ticks;

        if (player._enemyPoisonRunning) return;
        player._enemyPoisonRunning = true;

        const tick = () => {
            if (!player || player.destroyed) {
                player._enemyPoisonRunning = false;
                return;
            }
            if ((player._enemyPoisonTicks || 0) <= 0) {
                player._enemyPoisonRunning = false;
                player._enemyPoisonDamage = 0;
                return;
            }

            player._enemyPoisonTicks--;
            const poisonDamage = player._enemyPoisonDamage || 1;
            player.takeDamage(poisonDamage, this);

            this.game.addParticle({
                x: player.x + Utils.randomFloat(-10, 10),
                y: player.y - 12 + Utils.randomFloat(-4, 4),
                vy: -18,
                color: '#8bff73',
                lifetime: 0.4,
                age: 0,
                size: 3,
                destroyed: false,
                update(dt) {
                    this.y += this.vy * dt;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - this.age / this.lifetime;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                    ctx.globalAlpha = 1;
                }
            });

            setTimeout(tick, 900);
        };

        setTimeout(tick, 900);
    }

    applyFrostToPlayer(slowFactor = 0.2, duration = 1.0) {
        const player = this.game.player;
        if (!player || player.destroyed) return;

        const until = Date.now() + duration * 1000;
        player._enemySlowUntil = Math.max(player._enemySlowUntil || 0, until);
        player._enemySlowFactor = Math.max(player._enemySlowFactor || 0, slowFactor);
    }

    spawnSkillImpact(x, y, color) {
        this.game.addParticle({
            x,
            y,
            radius: 3,
            lifetime: 0.22,
            age: 0,
            color,
            destroyed: false,
            update(dt) {
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const t = this.age / this.lifetime;
                ctx.globalAlpha = 1 - t;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + t * 12, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });
    }

    /**
     * Activate boss special ability
     */
    activateBossAbility() {
        if (!this.bossAbility) return;

        switch (this.bossAbility) {
            case 'enrage':
                // Gains speed and damage when low HP
                if (this.health < this.maxHealth * 0.4) {
                    this.speed *= 1.3;
                    this.damage *= 1.2;
                    this.color = '#ff0000';
                }
                break;

            case 'frostAura': {
                // Apply a real movement slow through player's temporary slow fields.
                const player = this.game.player;
                const distToPlayer = Utils.distance(this.x, this.y, player.x, player.y);
                if (distToPlayer < 150) {
                    this.applyFrostToPlayer(0.4, 3.0);
                }
                // Visual
                this.game.visualEffects.showAuraEffect(this.x, this.y, 150, '#88ccff', 0.3);
                break;
            }

            case 'fireBreath': {
                // Cone of controlled fire shots, tuned to stay threatening but fair.
                if (this.target) {
                    for (let i = -2; i <= 2; i++) {
                        this.fireSkillShot({
                            speed: 245,
                            range: 330,
                            damage: Math.max(8, Math.round(this.damage * 0.4)),
                            size: 6.4,
                            angleOffset: i * 0.17,
                            spread: 0.03,
                            color: '#ff4400',
                            coreColor: '#ffd36b'
                        });
                    }
                }
                break;
            }

            case 'chainLightning': {
                // Chain damage with visual arcs
                const chainTargets = [this.game.player, ...this.game.buildingSystem.buildings]
                    .filter(e => Utils.distance(this.x, this.y, e.x, e.y) < 200);
                chainTargets.forEach(entity => {
                    entity.takeDamage(15, this, 'lightning');
                    // Lightning arc particle
                    this.game.addParticle({
                        x: this.x, y: this.y,
                        targetX: entity.x, targetY: entity.y,
                        lifetime: 0.25, age: 0, destroyed: false,
                        update(dt) { this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
                        render(ctx) {
                            const alpha = 1 - this.age / this.lifetime;
                            ctx.strokeStyle = `rgba(255,255,100,${alpha})`;
                            ctx.lineWidth = 3;
                            ctx.beginPath(); ctx.moveTo(this.x, this.y);
                            ctx.lineTo(this.targetX, this.targetY); ctx.stroke();
                        }
                    });
                });
                break;
            }

            case 'voidPulse':
                // AOE damage
                const crystal = this.getAssignedCrystal();
                const targets = [this.game.player, crystal, ...this.game.buildingSystem.buildings].filter(Boolean);
                targets.forEach(target => {
                    const dist = Utils.distance(this.x, this.y, target.x, target.y);
                    if (dist < 250) {
                        target.takeDamage(Math.floor(25 * (1 - dist / 250)), this);
                    }
                });
                break;
        }
    }

    _triggerPhase2Visuals() {
        this.game.camera.shake(12, 0.45);
        this.game.showNotification(`⚡ ${this.config.name} — Phase 2`, 'Vulnerable !', '#ff4444', 3);

        // Aura burst ring
        for (let i = 0; i < 24; i++) {
            const angle = (Math.PI * 2 / 24) * i;
            const speed = 80 + Math.random() * 120;
            const col = this.color;
            this.game.addParticle({
                x: this.x, y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                lifetime: 0.9 + Math.random() * 0.5,
                age: 0, destroyed: false, col,
                update(dt) {
                    this.x += this.vx * dt; this.y += this.vy * dt;
                    this.vx *= 0.92; this.vy *= 0.92;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - this.age / this.lifetime;
                    const size = 6 * (1 - this.age / this.lifetime);
                    ctx.fillStyle = this.col;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            });
        }

        // Expanding shockwave ring
        const col = this.color;
        this.game.addParticle({
            x: this.x, y: this.y,
            radius: this.collisionRadius,
            lifetime: 0.5, age: 0, destroyed: false, col,
            update(dt) { this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
            render(ctx) {
                const t = this.age / this.lifetime;
                ctx.strokeStyle = this.col;
                ctx.lineWidth = 3 * (1 - t);
                ctx.globalAlpha = 1 - t;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + t * 80, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });
    }

    _applyPhase2Stats() {
        switch (this.enemyType) {
            case 'berserkTitan':
                this.speed  = Math.min(this.speed  * 1.8, 200);
                this.damage = Math.floor(this.damage * 1.4);
                this.color  = '#ff0000';
                break;
            case 'frostLord':
                this._frostAuraActive = true;
                this.speed  = Math.max(10, this.speed * 0.8);
                this.bossAbilityCooldown = 3.0;
                break;
            case 'infernoDrake':
                this._lavaTrailActive = true;
                this.speed  = Math.min(this.speed * 1.3, 150);
                this.bossAbilityCooldown = 2.5;
                break;
            case 'stormWraith':
                this._teleportActive = true;
                this.bossAbilityCooldown = 3.5;
                break;
            case 'voidBehemoth':
                this._minionSpawnActive = true;
                this.bossAbilityCooldown = 4.0;
                break;
        }
    }

    _spawnDeathEffect() {
        const x = this.x, y = this.y, size = Math.max(this.width, this.height);
        const fireTypes  = ['fireImp', 'infernoDrake', 'lavaGolem'];
        const iceTypes   = ['frostElemental', 'frostLord', 'iceWolf'];
        const heavyTypes = ['tank', 'lavaGolem', 'voidBehemoth'];

        if (this.isBoss) {
            // Boss: big blood burst + shockwave + ground mark
            this.game.visualEffects.createBloodParticles(x, y, this.color, 40);
            this.game.addGroundMark?.(x, y, 'boss', size * 4, 90);

            // Shockwave ring
            const col = this.color;
            this.game.addParticle({
                x, y, radius: size * 0.5,
                lifetime: 0.7, age: 0, destroyed: false, col,
                update(dt) { this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
                render(ctx) {
                    const t = this.age / this.lifetime;
                    ctx.strokeStyle = this.col;
                    ctx.lineWidth = 4 * (1 - t);
                    ctx.globalAlpha = 1 - t;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius + t * 120, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            });

        } else if (fireTypes.includes(this.enemyType)) {
            // Fire: orange burst upward + scorch mark
            for (let i = 0; i < 18; i++) {
                const angle = -Math.PI / 2 + Utils.randomFloat(-1.2, 1.2);
                const speed = 60 + Math.random() * 140;
                this.game.addParticle({
                    x: x + Utils.randomFloat(-8, 8),
                    y: y + Utils.randomFloat(-8, 8),
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    lifetime: 0.5 + Math.random() * 0.4,
                    age: 0, destroyed: false,
                    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vy += 60 * dt; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
                    render(ctx) {
                        const t = this.age / this.lifetime;
                        const hue = 20 + t * 20;
                        ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${1 - t})`;
                        const r = (6 - 4 * t);
                        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
                    }
                });
            }
            this.game.addGroundMark?.(x, y, 'scorch', size * 2);

        } else if (iceTypes.includes(this.enemyType)) {
            // Ice: shard burst outward + frost mark
            for (let i = 0; i < 14; i++) {
                const angle = (Math.PI * 2 / 14) * i;
                const speed = 80 + Math.random() * 80;
                this.game.addParticle({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    lifetime: 0.45 + Math.random() * 0.3,
                    age: 0, destroyed: false,
                    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.88; this.vy *= 0.88; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
                    render(ctx) {
                        const t = this.age / this.lifetime;
                        ctx.fillStyle = `rgba(140, 220, 255, ${1 - t})`;
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        ctx.rotate(Math.atan2(this.vy, this.vx));
                        ctx.fillRect(-5, -2, 10, 4);
                        ctx.restore();
                    }
                });
            }
            this.game.addGroundMark?.(x, y, 'frost', size * 2);

        } else if (heavyTypes.includes(this.enemyType)) {
            // Heavy: explosion effect + big mark
            this.game.visualEffects?.createExplosionEffect?.(x, y);
            this.game.addGroundMark?.(x, y, 'explosion', size * 3);
            this.game.visualEffects.createBloodParticles(x, y, this.color, 15);

        } else {
            // Default: blood particles + blood mark
            this.game.visualEffects.createBloodParticles(x, y, this.color, 20);
            this.game.addGroundMark?.(x, y, 'blood', size * 1.5);
        }
    }

    /**
     * Override die for special effects
     */
    die() {
        const isNetworkReplicaDeath = this._dyingFromNetwork || this._takingNetworkDamage;

        // Broadcast death to all other players if we killed this enemy locally.
        // This used to live in a duplicate die() method; keeping it here preserves
        // boss drops, resource drops and special death effects in one path.
        if (this._netId && !isNetworkReplicaDeath) {
            this.game.networkManager?.onEnemyDied(this);
            if (this.game.networkManager && !this.game.networkManager.isHost) {
                this.game.givePlayerXP?.(this.xp || 10);
            }
        }

        if (!isNetworkReplicaDeath) {
            // Boss death: slow-motion + intense screenshake
            if (this.isBoss) {
                this.game.visualEffects.setTimeScale(0.3, 1.5);
                this.game.camera.shake(16, 0.65, true);
                this.game.audioSystem?.playExplosion();
                // Artifact drop
                if (this.game.artifactSystem) {
                    this.game.artifactSystem.rollBossDrop(this.enemyType);
                }
                if (this._versusCenterBoss) {
                    this.game.handleVersusCenterBossDefeated?.(this, { giveReward: true });
                }
            }

            // Bomber explosion
            if (this.enemyType === 'bomber') {
                this.explode();
                this.game.audioSystem?.playExplosion();
            }

            // Resource drops
            this._dropResources();

            // Notify objectives
            if (this.game.objectiveSystem) {
                this.game.objectiveSystem.onKill(this.enemyType);
            }

            // Ice wolf pack: spawn 2 wolves on first wolf death.
            // Only on the authoritative instance (host / solo). Network-controlled
            // puppets skip this — the host handles pack spawning when it receives
            // ENEMY_DEATH from the client that killed the wolf.
            if (this.enemyType === 'iceWolf' && !this._packSpawned && !this.isElite && !this._networkControlled) {
                this._packSpawned = true;
                if (this.game.waveSystem.currentWave >= 3) {
                    for (let i = 0; i < 2; i++) {
                        const angle = (Math.PI * 2 / 3) * (i + 1);
                        const wolf = new (this.constructor)(
                            this.game,
                            this.x + Math.cos(angle) * 60,
                            this.y + Math.sin(angle) * 60,
                            'iceWolf'
                        );
                        wolf._packSpawned = true; // Prevent chain spawning
                        // Wire XP like WaveSystem does
                        const originalDie = wolf.die.bind(wolf);
                        wolf.die = () => {
                            if (this.game.givePlayerXP) this.game.givePlayerXP(wolf.xp || 10);
                            originalDie();
                        };
                        this.game.addEntity(wolf);
                        // Register with network so all clients receive ENEMY_SPAWN
                        this.game.networkManager?.registerEnemy?.(wolf);
                    }
                }
            }
        }

        this._spawnDeathEffect();

        super.die();
    }

    /**
     * Drop resources on death
     */
    _dropResources() {
        const wave = this.game.waveSystem?.currentWave || 1;
        const multiplier = this.game._resourceDropMultiplier || 1;

        // Drop rates by enemy type
        const dropTable = {
            grunt:         { chance: 0.20, options: [{ wood: 2 }, { stone: 1 }] },
            speeder:       { chance: 0.18, options: [{ wood: 1 }, { stone: 1 }] },
            tank:          { chance: 0.45, options: [{ stone: 3 }, { stone: 2, wood: 1 }] },
            bomber:        { chance: 0.30, options: [{ wood: 2, stone: 1 }] },
            scorpion:      { chance: 0.25, options: [{ stone: 2 }] },
            mummy:         { chance: 0.40, options: [{ stone: 3, wood: 2 }] },
            frostElemental:{ chance: 0.35, options: [{ stone: 2 }, { metal: 1 }] },
            iceWolf:       { chance: 0.22, options: [{ wood: 2 }] },
            swampThing:    { chance: 0.45, options: [{ wood: 3, stone: 2 }] },
            poisonFrog:    { chance: 0.20, options: [{ wood: 1 }] },
            fireImp:       { chance: 0.30, options: [{ metal: 1 }, { stone: 2 }] },
            lavaGolem:     { chance: 0.60, options: [{ metal: 3 }, { metal: 2, stone: 2 }] },
            mimic:         { chance: 0.50, options: [{ metal: 2 }, { stone: 3 }] },
            shadow:        { chance: 0.35, options: [{ metal: 1 }, { amethyst: 1 }] },
            wanderer:      { chance: 0.55, options: [{ metal: 3, stone: 2 }] }
        };

        // Boss guaranteed drops
        if (this.isBoss) {
            const bossBonus = Math.floor(wave / 5);
            this.game.resourceSystem.addResource('metal', 8 + bossBonus * 2);
            this.game.resourceSystem.addResource('amethyst', 3 + bossBonus);
            this._spawnDropParticle('Boss Loot !', '#ffcc00');
            return;
        }

        const entry = dropTable[this.enemyType];
        if (!entry) return;

        // Wave bonus: +1% drop chance per wave, capped at 70%
        const finalChance = Math.min(0.70, entry.chance + wave * 0.01);

        if (Math.random() > finalChance) return;

        const drop = entry.options[Math.floor(Math.random() * entry.options.length)];
        const rs = this.game.resourceSystem;

        for (const [type, base] of Object.entries(drop)) {
            const amount = Math.max(1, Math.floor(base * multiplier));
            rs.addResource(type, amount);
        }

        // Elite bonus
        if (this.isElite) {
            rs.addResource('metal', Math.floor(Math.random() * 3) + 1);
        }
    }

    _spawnDropParticle(text, color) {
        this.game.addParticle({
            x: this.x, y: this.y - 20, vy: -35,
            text, color,
            lifetime: 1.5, age: 0, destroyed: false,
            update(dt) { this.y += this.vy * dt; this.vy *= 0.95; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
            render(ctx) {
                ctx.globalAlpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = this.color;
                ctx.font = 'bold 13px Rajdhani';
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
                ctx.strokeText(this.text, this.x, this.y);
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1;
            }
        });
    }

    /**
     * Bomber explosion
     */
    explode() {
        // Building explosion damage multiplier (makes bombers dangerous to defenses)
        const buildingExplosionMultiplier = 3.0;

        // Damage player and crystal with normal explosion damage
        const playerAndCrystal = [this.game.player, this.getAssignedCrystal()].filter(Boolean);
        for (const target of playerAndCrystal) {
            const dist = Utils.distance(this.x, this.y, target.x, target.y);
            if (dist < this.explosionRadius) {
                const damage = this.explosionDamage * (1 - dist / this.explosionRadius);
                target.takeDamage(damage, this);
            }
        }

        // Damage buildings with increased multiplier
        const buildings = this.game.buildingSystem.buildings;
        for (const building of buildings) {
            const dist = Utils.distance(this.x, this.y, building.x, building.y);
            if (dist < this.explosionRadius) {
                // Apply distance falloff and building multiplier
                const baseDamage = this.explosionDamage * (1 - dist / this.explosionRadius);
                const buildingDamage = Math.floor(baseDamage * buildingExplosionMultiplier);

                building.takeDamage(buildingDamage, this);

                // Visual feedback for building hit
                this.game.addParticle({
                    x: building.x,
                    y: building.y - 20,
                    vy: -30,
                    color: '#ff4444',
                    lifetime: 0.8,
                    age: 0,
                    size: 6,
                    text: `-${buildingDamage}`,
                    destroyed: false,
                    update(dt) {
                        this.y += this.vy * dt;
                        this.age += dt;
                        if (this.age >= this.lifetime) this.destroyed = true;
                    },
                    render(ctx) {
                        const alpha = 1 - this.age / this.lifetime;
                        ctx.font = 'bold 16px Arial';
                        ctx.fillStyle = this.color;
                        ctx.globalAlpha = alpha;
                        ctx.fillText(this.text, this.x - 15, this.y);
                        ctx.globalAlpha = 1;
                    }
                });
            }
        }

        // Explosion visual
        this.game.addParticle({
            x: this.x,
            y: this.y,
            radius: this.explosionRadius,
            lifetime: 0.3,
            age: 0,
            destroyed: false,
            update(dt) {
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const progress = this.age / this.lifetime;
                const alpha = 1 - progress;

                ctx.fillStyle = `rgba(255, 150, 50, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * (0.5 + progress * 0.5), 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        });
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + this.wobble);


        // Keep 16x16 enemy assets close to the world's pixel scale.
        const baseSize = Math.max(this.width, this.height);
        const spriteSize = this.isBoss
            ? Math.max(44, baseSize * 1.45)
            : Math.max(22, baseSize);

        // Try animated Tiny Swords sprite first
        const drawn = spriteManager.drawEnemyFrame(
            ctx, this.enemyType, this._animState, this._animFrame, spriteSize, this._facingLeft
        );

        if (drawn) {
            // White flash on hit
            if (this.flashTimer > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.globalAlpha = 0.55;
                spriteManager.drawEnemyFrame(
                    ctx, this.enemyType, this._animState, this._animFrame, spriteSize, this._facingLeft
                );
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1;
            }

            if (!spriteManager.isBasicMonsterEnemy?.(this.enemyType)) {
                // Subtle per-type signature overlay so shared fallback sprite sheets remain readable.
                ctx.save();
                ctx.globalAlpha = 0.78;
                this.renderEnemyTypeSignature(
                    ctx,
                    this.enemyType,
                    this.getEnemyAccentColor(this.enemyType),
                    this.darkenColor(this.color),
                    Math.max(0.6, spriteSize / 84)
                );
                ctx.restore();
            }
        } else {
            // Fallback to coherent top-down monster silhouettes. Never use pure
            // prototype triangles: they break the production feel immediately.
            const bodyColor = this.flashTimer > 0 ? '#ffffff' : this.color;
            this.renderStylizedEnemy(ctx, bodyColor);
        }

        ctx.restore();

        // Status effect overlays (drawn after enemy body)

        // Burn effect overlay
        if (this.burnDuration > 0) {
            ctx.save();
            const burnAlpha = 0.4 + Math.sin(Date.now() / 200) * 0.2;
            ctx.globalAlpha = burnAlpha;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2 + 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Frozen effect overlay
        if (this.frozen) {
            ctx.save();
            ctx.strokeStyle = '#66ccff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2 + 4, 0, Math.PI * 2);
            ctx.stroke();

            // Ice crystals around frozen enemy
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI * 2 / 4) * i + Date.now() / 1000;
                const x = this.x + Math.cos(angle) * (this.width / 2 + 8);
                const y = this.y + Math.sin(angle) * (this.width / 2 + 8);
                ctx.fillStyle = '#66ccff';
                ctx.beginPath();
                ctx.moveTo(x, y - 4);
                ctx.lineTo(x + 2, y);
                ctx.lineTo(x, y + 4);
                ctx.lineTo(x - 2, y);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // Slow effect overlay (if slowed but not frozen)
        if (!this.frozen && this.speed < (this.config?.speed || 60) * 0.9) {
            ctx.save();
            const slowAlpha = 0.3;
            ctx.globalAlpha = slowAlpha;
            ctx.strokeStyle = '#88ddff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2 + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Elite glow effect
        if (this.isElite || this.eliteGlow) {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(this.animPhase * 2) * 0.3;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Elite crown
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⭐', this.x, this.y - this.height / 2 - 8);
        }

        // Health bar
        if (this.health < this.maxHealth) {
            this.renderHealthBar(ctx);
        }
    }

    renderStylizedEnemy(ctx, color) {
        const kind = this.enemyType;
        const size = Math.max(this.width, this.height);
        const scale = size / 28;
        const dark = this.darkenColor(color);
        const accent = this.getEnemyAccentColor(kind);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.42, size * 0.38, size * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();

        if (['bat', 'infernoDrake'].includes(kind)) {
            this.renderWingedEnemy(ctx, color, dark, accent, scale);
        } else if (['spider', 'scorpion'].includes(kind)) {
            this.renderCrawlingEnemy(ctx, color, dark, accent, scale);
        } else if (kind === 'mimic') {
            this.renderMimicEnemy(ctx, color, dark, accent, scale);
        } else if (kind === 'poisonFrog') {
            this.renderFrogEnemy(ctx, color, dark, accent, scale);
        } else if (['fireImp', 'bomber'].includes(kind)) {
            this.renderImpEnemy(ctx, color, dark, accent, scale);
        } else if (['tank', 'lavaGolem', 'swampThing', 'golem', 'berserkTitan', 'voidBehemoth'].includes(kind)) {
            this.renderHeavyEnemy(ctx, color, dark, accent, scale);
        } else if (['speeder', 'iceWolf', 'shadow'].includes(kind)) {
            this.renderScoutEnemy(ctx, color, dark, accent, scale);
        } else if (['frostElemental', 'stormWraith', 'frostLord'].includes(kind)) {
            this.renderCasterEnemy(ctx, color, dark, accent, scale);
        } else {
            this.renderHumanoidEnemy(ctx, color, dark, accent, scale);
        }

        this.renderEnemyTypeSignature(ctx, kind, accent, dark, scale);
    }

    renderHumanoidEnemy(ctx, color, dark, accent, s) {
        const bob = Math.sin(this.animPhase) * 1.5 * s;

        // Legs
        ctx.fillStyle = dark;
        ctx.fillRect(-7 * s, 8 * s + bob, 5 * s, 10 * s);
        ctx.fillRect(2 * s, 8 * s - bob, 5 * s, 10 * s);

        // Arms
        ctx.strokeStyle = dark;
        ctx.lineWidth = 5 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10 * s, -2 * s);
        ctx.lineTo(-15 * s, 8 * s + bob);
        ctx.moveTo(10 * s, -2 * s);
        ctx.lineTo(15 * s, 8 * s - bob);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 11 * s, 15 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -13 * s, 10 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        this.renderEnemyFace(ctx, accent, s);
    }

    renderHeavyEnemy(ctx, color, dark, accent, s) {
        ctx.fillStyle = dark;
        ctx.fillRect(-13 * s, 8 * s, 9 * s, 13 * s);
        ctx.fillRect(4 * s, 8 * s, 9 * s, 13 * s);

        ctx.strokeStyle = dark;
        ctx.lineWidth = 7 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14 * s, -3 * s);
        ctx.lineTo(-22 * s, 8 * s);
        ctx.moveTo(14 * s, -3 * s);
        ctx.lineTo(22 * s, 8 * s);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.roundRect(-17 * s, -12 * s, 34 * s, 34 * s, 10 * s);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(-12 * s, -5 * s, 24 * s, 8 * s);
        ctx.globalAlpha = 1;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -20 * s, 13 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        this.renderEnemyFace(ctx, accent, s);
    }

    renderImpEnemy(ctx, color, dark, accent, s) {
        const pulse = 1 + Math.sin(this.animPhase * 2) * 0.06;

        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 14 * s * pulse, 15 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Horns/ears
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(-8 * s, -10 * s);
        ctx.lineTo(-17 * s, -20 * s);
        ctx.lineTo(-4 * s, -16 * s);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8 * s, -10 * s);
        ctx.lineTo(17 * s, -20 * s);
        ctx.lineTo(4 * s, -16 * s);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -11 * s, 10 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (this.enemyType === 'bomber') {
            ctx.strokeStyle = '#ffb347';
            ctx.lineWidth = 2 * s;
            ctx.beginPath();
            ctx.arc(0, 2 * s, 18 * s, 0, Math.PI * 2);
            ctx.stroke();
        }

        this.renderEnemyFace(ctx, accent, s);
    }

    renderWingedEnemy(ctx, color, dark, accent, s) {
        const flap = Math.sin(this.animPhase * 2) * 5 * s;
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(-5 * s, -2 * s);
        ctx.quadraticCurveTo(-28 * s, -14 * s - flap, -22 * s, 12 * s);
        ctx.quadraticCurveTo(-13 * s, 5 * s, -5 * s, 5 * s);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5 * s, -2 * s);
        ctx.quadraticCurveTo(28 * s, -14 * s - flap, 22 * s, 12 * s);
        ctx.quadraticCurveTo(13 * s, 5 * s, 5 * s, 5 * s);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10 * s, 13 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        this.renderEnemyFace(ctx, accent, s);
    }

    renderScoutEnemy(ctx, color, dark, accent, s) {
        const dash = Math.sin(this.animPhase * 2.3) * 1.2 * s;

        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.roundRect(-13 * s, 6 * s, 26 * s, 10 * s, 5 * s);
        ctx.fill();

        // Rear fins (speed silhouette)
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(-11 * s, -4 * s);
        ctx.lineTo(-20 * s, -12 * s - dash);
        ctx.lineTo(-8 * s, -10 * s);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(11 * s, -4 * s);
        ctx.lineTo(20 * s, -12 * s - dash);
        ctx.lineTo(8 * s, -10 * s);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.roundRect(-12 * s, -5 * s, 24 * s, 18 * s, 7 * s);
        ctx.fill();
        ctx.stroke();

        // Sleek head + visor
        ctx.beginPath();
        ctx.ellipse(0, -12 * s, 11 * s, 8.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -12 * s);
        ctx.lineTo(6 * s, -12 * s);
        ctx.stroke();
        ctx.globalAlpha = 1;

        this.renderEnemyFace(ctx, accent, s);
    }

    renderCasterEnemy(ctx, color, dark, accent, s) {
        const pulse = 0.85 + Math.sin(this.animPhase * 2) * 0.12;

        // Floating robe tail
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(-11 * s, 8 * s);
        ctx.quadraticCurveTo(-8 * s, 22 * s, -2 * s, 18 * s);
        ctx.quadraticCurveTo(0, 24 * s, 2 * s, 18 * s);
        ctx.quadraticCurveTo(8 * s, 22 * s, 11 * s, 8 * s);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.roundRect(-11 * s, -8 * s, 22 * s, 23 * s, 8 * s);
        ctx.fill();
        ctx.stroke();

        // Hood / mask
        ctx.beginPath();
        ctx.arc(0, -14 * s, 10 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Floating focus orb
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.35 + pulse * 0.25;
        ctx.beginPath();
        ctx.arc(0, 2 * s, 4.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 2 * s, 6.5 * s, 0, Math.PI * 2);
        ctx.stroke();

        this.renderEnemyFace(ctx, accent, s);
    }

    renderMimicEnemy(ctx, color, dark, accent, s) {
        const bite = Math.sin(this.animPhase * 2.1) * 1.5 * s;

        // Legs
        ctx.fillStyle = dark;
        ctx.fillRect(-10 * s, 8 * s, 6 * s, 8 * s);
        ctx.fillRect(4 * s, 8 * s, 6 * s, 8 * s);

        // Chest body
        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2.2 * s;
        ctx.beginPath();
        ctx.roundRect(-14 * s, -1 * s, 28 * s, 16 * s, 5 * s);
        ctx.fill();
        ctx.stroke();

        // Lid / jaw
        ctx.beginPath();
        ctx.roundRect(-13 * s, -14 * s - bite, 26 * s, 11 * s, 4 * s);
        ctx.fill();
        ctx.stroke();

        // Teeth
        ctx.fillStyle = '#f9f2d8';
        for (let i = 0; i < 4; i++) {
            const x = (-8 + i * 5) * s;
            ctx.beginPath();
            ctx.moveTo(x, -2 * s);
            ctx.lineTo((x + 2.2 * s), 3 * s);
            ctx.lineTo((x + 4.4 * s), -2 * s);
            ctx.closePath();
            ctx.fill();
        }

        // Lock glyph
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 7 * s, 3 * s, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.fillRect(-2 * s, 7 * s, 4 * s, 4 * s);
    }

    renderFrogEnemy(ctx, color, dark, accent, s) {
        const hop = Math.sin(this.animPhase * 2.4) * 1.2 * s;

        // Back legs
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(-10 * s, 8 * s + hop, 6 * s, 4 * s, -0.3, 0, Math.PI * 2);
        ctx.ellipse(10 * s, 8 * s + hop, 6 * s, 4 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.ellipse(0, 5 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head dome
        ctx.beginPath();
        ctx.ellipse(0, -3 * s, 12 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Poison sacs
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(-12 * s, 2 * s, 3 * s, 0, Math.PI * 2);
        ctx.arc(12 * s, 2 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(-5 * s, -7 * s, 2 * s, 0, Math.PI * 2);
        ctx.arc(5 * s, -7 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    renderCrawlingEnemy(ctx, color, dark, accent, s) {
        ctx.strokeStyle = dark;
        ctx.lineWidth = 3 * s;
        ctx.lineCap = 'round';
        for (let side of [-1, 1]) {
            for (let i = 0; i < 4; i++) {
                const y = (-8 + i * 5) * s;
                ctx.beginPath();
                ctx.moveTo(side * 7 * s, y);
                ctx.lineTo(side * (18 + i * 2) * s, y + (i % 2 ? 5 : -5) * s);
                ctx.stroke();
            }
        }

        ctx.fillStyle = color;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 13 * s, 17 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -13 * s, 9 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (this.enemyType === 'scorpion') {
            ctx.strokeStyle = accent;
            ctx.lineWidth = 4 * s;
            ctx.beginPath();
            ctx.moveTo(0, 17 * s);
            ctx.quadraticCurveTo(13 * s, 26 * s, 4 * s, 34 * s);
            ctx.stroke();
        }

        this.renderEnemyFace(ctx, accent, s);
    }

    renderEnemyTypeSignature(ctx, kind, accent, dark, s) {
        switch (kind) {
            case 'grunt':
                ctx.strokeStyle = accent;
                ctx.lineWidth = 1.6 * s;
                ctx.beginPath();
                ctx.moveTo(-5 * s, -1 * s);
                ctx.lineTo(0, 3 * s);
                ctx.lineTo(5 * s, -1 * s);
                ctx.stroke();
                break;
            case 'mummy':
                ctx.strokeStyle = 'rgba(240, 225, 185, 0.65)';
                ctx.lineWidth = 2 * s;
                for (let i = 0; i < 3; i++) {
                    const y = (-2 + i * 4) * s;
                    ctx.beginPath();
                    ctx.moveTo(-9 * s, y);
                    ctx.lineTo(9 * s, y);
                    ctx.stroke();
                }
                break;
            case 'tank':
            case 'berserkTitan':
                ctx.fillStyle = dark;
                for (let i = 0; i < 3; i++) {
                    const x = (-6 + i * 6) * s;
                    ctx.beginPath();
                    ctx.arc(x, -4 * s, 1.6 * s, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'frostElemental':
            case 'frostLord':
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.moveTo(0, -24 * s);
                ctx.lineTo(3.5 * s, -18 * s);
                ctx.lineTo(0, -15.5 * s);
                ctx.lineTo(-3.5 * s, -18 * s);
                ctx.closePath();
                ctx.fill();
                break;
            case 'stormWraith':
                ctx.strokeStyle = accent;
                ctx.lineWidth = 1.8 * s;
                ctx.beginPath();
                ctx.moveTo(2 * s, -16 * s);
                ctx.lineTo(-2 * s, -9 * s);
                ctx.lineTo(3 * s, -9 * s);
                ctx.lineTo(-2 * s, -2 * s);
                ctx.stroke();
                break;
            case 'swampThing':
                ctx.strokeStyle = 'rgba(183,255,138,0.55)';
                ctx.lineWidth = 1.5 * s;
                ctx.beginPath();
                ctx.moveTo(-6 * s, 10 * s);
                ctx.quadraticCurveTo(-2 * s, 4 * s, 2 * s, 10 * s);
                ctx.quadraticCurveTo(6 * s, 16 * s, 9 * s, 10 * s);
                ctx.stroke();
                break;
            case 'lavaGolem':
                ctx.strokeStyle = '#ffab6a';
                ctx.globalAlpha = 0.65;
                ctx.lineWidth = 1.4 * s;
                ctx.beginPath();
                ctx.moveTo(-8 * s, 2 * s);
                ctx.lineTo(-2 * s, 6 * s);
                ctx.lineTo(3 * s, 1 * s);
                ctx.lineTo(8 * s, 5 * s);
                ctx.stroke();
                ctx.globalAlpha = 1;
                break;
            case 'voidBehemoth':
                ctx.strokeStyle = accent;
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 1.8 * s;
                ctx.beginPath();
                ctx.arc(0, 1 * s, 7 * s, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
                break;
            case 'wanderer':
                ctx.fillStyle = accent;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.roundRect(-2 * s, -18 * s, 4 * s, 9 * s, 1.5 * s);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            case 'shadow':
                ctx.strokeStyle = accent;
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = 1.3 * s;
                ctx.beginPath();
                ctx.arc(0, -10 * s, 11 * s, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
                break;
            case 'infernoDrake':
                ctx.fillStyle = '#ffd36b';
                for (let i = 0; i < 3; i++) {
                    const x = (-6 + i * 6) * s;
                    ctx.beginPath();
                    ctx.moveTo(x, -10 * s);
                    ctx.lineTo(x + 2 * s, -15 * s);
                    ctx.lineTo(x + 4 * s, -10 * s);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
        }
    }

    renderEnemyFace(ctx, accent, s) {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(-4 * s, -13 * s, 2 * s, 0, Math.PI * 2);
        ctx.arc(4 * s, -13 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(-4 * s, -6 * s);
        ctx.lineTo(4 * s, -6 * s);
        ctx.stroke();
    }

    getEnemyAccentColor(kind) {
        if (['frostElemental', 'iceWolf', 'frostLord'].includes(kind)) return '#d8f8ff';
        if (['fireImp', 'lavaGolem', 'infernoDrake', 'bomber'].includes(kind)) return '#ffd36b';
        if (['stormWraith', 'shadow', 'voidBehemoth'].includes(kind)) return '#f4e8ff';
        if (['swampThing', 'poisonFrog'].includes(kind)) return '#b7ff8a';
        if (['tank', 'berserkTitan'].includes(kind)) return '#ffd8b0';
        if (['mummy', 'mimic', 'scorpion'].includes(kind)) return '#f1e0b5';
        if (['speeder', 'grunt', 'wanderer'].includes(kind)) return '#d4f1ff';
        return '#fff2a8';
    }

    darkenColor(hex) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - 40);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - 40);
        const b = Math.max(0, (num & 0x0000FF) - 40);
        return `rgb(${r},${g},${b})`;
    }

    renderHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 4;
        const x = this.x - barWidth / 2;
        const y = this.y - this.height / 2 - 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#ff3366';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    }
}

export default Enemy;
