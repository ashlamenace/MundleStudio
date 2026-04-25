/**
 * Player entity
 */

import { Entity } from './Entity.js';
import { Utils } from '../core/Utils.js';
import { Projectile } from './Projectile.js';
import { spriteManager } from '../core/SpriteManager.js';

export class Player extends Entity {
    constructor(game, x, y) {
        super(game, x, y);
        this.type = 'player';
        this.width = 38;
        this.height = 38;
        this.collisionRadius = 16;

        // Health
        this.maxHealth = 120;  // Increased from 100 for better early game
        this.health = this.maxHealth;
        this.baseSpeed = 150;
        this.speed = this.baseSpeed;

        // Combat
        this.attackCooldown = 0;
        this.attackSpeed = 0.3; // seconds between attacks
        this.attackDamage = 15;  // Buffed to stay competitive with bow
        this.attackRange = 40;

        // Current tool/weapon
        this.selectedSlot = 1;

        // Animation
        this.facingAngle = 0;
        this.spriteFacingAngle = Math.PI / 2;
        this.isAttacking = false;
        this.attackAnimation = 0;

        // Invincibility frames
        this.invincibleTime = 0;

        // XP and Leveling System
        this.xp = 0;
        this.level = 1;
        this.skillPoints = 0;
        this.pendingLevelUp = false; // Flag for showing level up UI

        // Skills (unlockable abilities)
        this.skills = {
            dash: { unlocked: false, cooldown: 0, maxCooldown: 3 },
            aoeAttack: { unlocked: false, cooldown: 0, maxCooldown: 10 },
            heal: { unlocked: false, cooldown: 0, maxCooldown: 30 }
        };

        // Stats from leveling (multipliers)
        this.damageMultiplier = 1;
        this.speedMultiplier = 1;
        this.farmingSpeedMultiplier = 1;
        this.xpGainMultiplier = 1;
        this.healthRegen = 1; // 1 HP/sec passive base regen

        // Tool tiers (affects harvesting speed and resource access)
        this.toolTiers = {
            axe: 1,      // 1=wood, 2=faster, 3=even faster
            pickaxe: 1   // 1=stone, 2=metal, 3=amethyst
        };

        // Weapon upgrade systems
        this.bowTier = 1;  // 1-5
        this.bowEffect = null;  // 'fire', 'lightning', 'ice'

        this.swordTier = 1;  // 1-5
        this.swordEffect = null;  // 'fire', 'lightning', 'ice'

        // Sprite animation state
        this._animState  = 'idle'; // 'idle' | 'run' | 'attack'
        this._animFrame  = 0;
        this._animTimer  = 0;
        this._facingLeft = false;

        // Bow sprites
        this.bowSprites = {};
        this.bowIdleSprite = new Image();
        this.bowIdleSprite.src = 'assets/sprites/weapons/bow_idle.png';
        this.loadBowSprites();

        // Sword sprite
        this.swordSprite = new Image();
        this.swordSprite.src = 'assets/sprites/weapons/sword_idle.png';

        this.hammerSprite = new Image();
        this.hammerSprite.src = 'assets/Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Tools/Tool_01.png';

        // Tool sprites (axe and pickaxe)
        this.toolSprites = {};
        this.loadToolSprites();

        // Initialize tools
        this.updateTools();
    }

    loadToolSprites() {
        const basePath = 'assets/sprites';

        // Load axe tiers
        for (let tier = 1; tier <= 3; tier++) {
            const img = new Image();
            const filename = tier === 1 ? 'axe.png' : `axe_tier${tier}.png`;
            img.src = `${basePath}/${filename}`;
            this.toolSprites[`axe_${tier}`] = img;
        }

        // Load pickaxe tiers
        for (let tier = 1; tier <= 3; tier++) {
            const img = new Image();
            const filename = tier === 1 ? 'pickaxe.png' : `pickaxe_tier${tier}.png`;
            img.src = `${basePath}/${filename}`;
            this.toolSprites[`pickaxe_${tier}`] = img;
        }
    }

    getToolSprite(toolType, tier) {
        return this.toolSprites[`${toolType}_${tier}`];
    }

    updateTools() {
        // Base damage and speed increase with tier
        const axeTier = this.toolTiers.axe;
        const pickaxeTier = this.toolTiers.pickaxe;

        // Tier bonuses: +40% damage and -20% cooldown per tier
        const axeDamage = 8 * Math.pow(1.4, axeTier - 1);
        const axeSpeed = 0.5 * Math.pow(0.8, axeTier - 1);
        const pickaxeDamage = 8 * Math.pow(1.4, pickaxeTier - 1);
        const pickaxeSpeed = 0.5 * Math.pow(0.8, pickaxeTier - 1);

        // Bow stats based on tier
        const bowTier = this.bowTier;
        const bowStats = this.getBowStats(bowTier);

        // Sword stats based on tier
        const swordTier = this.swordTier;
        const swordStats = this.getSwordStats(swordTier);

        this.tools = {
            1: {
                name: swordStats.name,
                type: 'melee',
                damage: swordStats.damage,
                range: swordStats.range,
                speed: swordStats.speed,
                tier: swordTier,
                specialEffect: this.swordEffect
            },
            2: { name: 'Axe', type: 'tool', damage: axeDamage, range: 45, speed: axeSpeed, resource: 'wood', tier: axeTier, toolType: 'axe' },
            3: { name: 'Pickaxe', type: 'tool', damage: pickaxeDamage, range: 45, speed: pickaxeSpeed, resource: 'stone', tier: pickaxeTier, toolType: 'pickaxe' },
            4: {
                name: bowStats.name,
                type: 'ranged',
                damage: bowStats.damage,
                range: bowStats.range,
                speed: bowStats.speed,
                tier: bowTier,
                specialEffect: this.bowEffect
            },
            5: { name: 'Build', type: 'build' }
        };
    }

    getBowStats(tier) {
        // Bow keeps safer uptime and much longer range than sword.
        const stats = {
            1: { name: 'Basic Bow',       damage: 18, range: 300, speed: 0.65 },
            2: { name: 'Reinforced Bow',  damage: 26, range: 350, speed: 0.58 },
            3: { name: 'Composite Bow',   damage: 36, range: 400, speed: 0.50 },
            4: { name: 'Enchanted Bow',   damage: 46, range: 450, speed: 0.44 },
            5: { name: 'Legendary Bow',   damage: 60, range: 500, speed: 0.38 }
        };
        return stats[tier] || stats[1];
    }

    getSwordStats(tier) {
        const stats = {
            // Rebalanced: still strong in melee, but less dominant than before
            // versus bow DPS and large enemy packs.
            1: { name: 'Iron Sword',      damage: 15, range: 46, speed: 0.34 },
            2: { name: 'Steel Blade',     damage: 20, range: 50, speed: 0.32 },
            3: { name: 'Knight Sword',    damage: 25, range: 54, speed: 0.30 },
            4: { name: 'Enchanted Blade', damage: 31, range: 58, speed: 0.28 },
            5: { name: 'Legendary Sword', damage: 37, range: 62, speed: 0.26 }
        };
        return stats[tier] || stats[1];
    }

    loadBowSprites() {
        const basePath = 'assets/sprites/weapons';

        // Load tier 1-3 sprites
        for (let tier = 1; tier <= 3; tier++) {
            const img = new Image();
            img.src = `${basePath}/bow_tier${tier}.png`;
            this.bowSprites[`tier${tier}`] = img;
        }

        // Load tier 4 with effects
        const effects = ['flame', 'ice', 'thunder'];
        effects.forEach(effect => {
            const img = new Image();
            img.src = `${basePath}/bow_tier4_${effect}.png`;
            this.bowSprites[`tier4_${effect}`] = img;
        });

        // Tier 5 uses same sprites as tier 4
    }

    getBowSprite() {
        if (this.bowIdleSprite?.complete && this.bowIdleSprite.naturalWidth > 0) {
            return this.bowIdleSprite;
        }

        const tier = this.bowTier;

        if (tier <= 3) {
            return this.bowSprites[`tier${tier}`];
        } else {
            // Tier 4 and 5 use effect-based sprites
            const effect = this.bowEffect || 'fire'; // Default to fire if no effect chosen
            const effectMap = {
                'fire': 'flame',
                'lightning': 'thunder',
                'ice': 'ice'
            };
            return this.bowSprites[`tier4_${effectMap[effect]}`];
        }
    }

    getEquippedToolSprite(tool) {
        if (!tool) return null;
        if (tool.type === 'melee') return this.swordSprite;
        if (tool.type === 'ranged') return this.getBowSprite();
        if (tool.toolType) return this.getToolSprite(tool.toolType, tool.tier);
        if (tool.type === 'build') return this.hammerSprite;
        return null;
    }

    update(deltaTime) {
        const input = this.game.input;

        // Get movement from input
        const movement = input.getMovementVector();

        // Apply movement
        const rallySpeedBonus = this._rallySpeedBonus || 0;
        const enemySlowActive = (this._enemySlowUntil || 0) > Date.now();
        const enemySlowMul = enemySlowActive
            ? (1 - Utils.clamp(this._enemySlowFactor || 0, 0, 0.65))
            : 1;
        if (!enemySlowActive) this._enemySlowFactor = 0;

        this.speed = this.baseSpeed * this.speedMultiplier * enemySlowMul * (1 + rallySpeedBonus);
        this.vx = movement.x * this.speed;
        this.vy = movement.y * this.speed;

        if (movement.x !== 0 || movement.y !== 0) {
            this.spriteFacingAngle = Math.atan2(movement.y, movement.x);
        }

        // Store old position for collision
        const oldX = this.x;
        const oldY = this.y;

        // Update position
        super.update(deltaTime);

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
            // Overworld bounds
            this.x = Utils.clamp(this.x, this.width / 2, this.game.world.width - this.width / 2);
            this.y = Utils.clamp(this.y, this.height / 2, this.game.world.height - this.height / 2);

            // Barrier collision/passability
            if (this.game.world && !this.game.world.isPassable(this.x, this.y)) {
                this.x = oldX;
                this.y = oldY;
            }

            // Building collision
            if (this.game.buildingSystem) {
                for (const building of this.game.buildingSystem.buildings) {
                    if (!building.solid) continue;

                    const dist = Utils.distance(this.x, this.y, building.x, building.y);
                    const minDist = this.collisionRadius + building.collisionRadius;

                    if (dist < minDist) {
                        // Push player away from building
                        const angle = Utils.angle(building.x, building.y, this.x, this.y);
                        const overlap = minDist - dist;
                        this.x += Math.cos(angle) * overlap;
                        this.y += Math.sin(angle) * overlap;
                    }
                }
            }
        }

        // Apply tool/weapon switching
        if (input.isActionJustPressed('slot1')) this.selectSlot(1);
        if (input.isActionJustPressed('slot2')) this.selectSlot(2);
        if (input.isActionJustPressed('slot3')) this.selectSlot(3);
        if (input.isActionJustPressed('slot4')) this.selectSlot(4);
        if (input.isActionJustPressed('slot5')) this.selectSlot(5);

        // Face mouse direction
        const mouse = input.getMousePosition();
        this.facingAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

        // Attack/Use Tool
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        if (input.isActionPressed('attack') && this.attackCooldown <= 0) {
            this.performAction();
        }

        // Skill cooldowns
        for (const key in this.skills) {
            if (this.skills[key].cooldown > 0) {
                this.skills[key].cooldown -= deltaTime;
            }
        }

        // Dash skill
        if (this.skills.dash.unlocked && input.isActionJustPressed('dash') && this.skills.dash.cooldown <= 0) {
            this.performDash();
        }

        // Heal skill
        if (this.skills.heal.unlocked && input.isActionJustPressed('heal') && this.skills.heal.cooldown <= 0) {
            this.performHeal();
        }

        // AoE skill
        if (this.skills.aoeAttack.unlocked && input.isActionJustPressed('aoe') && this.skills.aoeAttack.cooldown <= 0) {
            this.performAoeAttack();
        }

        // Handle invincibility
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime;
        }

        // Regen
        if (this.health < this.maxHealth) {
            const before = this.health;
            this.health += this.healthRegen * deltaTime;
            if (this.health > this.maxHealth) this.health = this.maxHealth;
            const healed = this.health - before;
            if (healed > 0) this.game.objectiveSystem?.onHeal(healed);
        }

        // Sprite animation update
        this._updateSpriteAnim(deltaTime);
    }

    _updateSpriteAnim(dt) {
        const isMoving = Math.abs(this.vx) > 5 || Math.abs(this.vy) > 5;
        const isAttacking = this.attackCooldown > 0 && this.tools[this.selectedSlot]?.type !== 'ranged';
        const tool = this.tools[this.selectedSlot];
        const isRanged = tool?.type === 'ranged';
        const isShooting = this.attackCooldown > 0 && isRanged;

        let newState;
        if (isAttacking || isShooting) newState = 'attack';
        else if (isMoving) newState = 'run';
        else newState = 'idle';

        if (newState !== this._animState) {
            this._animState = newState;
            this._animFrame = 0;
            this._animTimer = 0;
        }

        const fps = newState === 'attack' ? 14 : 8;
        this._animTimer += dt;
        if (this._animTimer >= 1 / fps) {
            this._animTimer = 0;
            this._animFrame++;
            const animKey = this._getAnimKey(tool, newState);
            const anim = spriteManager.playerAnims[animKey];
            if (anim && this._animFrame >= anim.frames) {
                // Always loop back to frame 0 so held-attack animations restart
                this._animFrame = 0;
            }
        }

        this._facingLeft = Math.cos(this.facingAngle) < 0;
    }

    _getAnimKey(tool, state) {
        if (tool?.type === 'ranged') {
            if (state === 'run')    return 'archer_run';
            if (state === 'attack') return 'archer_shoot';
            return 'archer_idle';
        }
        if (tool?.toolType === 'axe') {
            if (state === 'run')    return 'pawn_axe_run';
            if (state === 'attack') return 'pawn_axe_interact';
            return 'pawn_axe_idle';
        }
        if (tool?.toolType === 'pickaxe') {
            if (state === 'run')    return 'pawn_pick_run';
            if (state === 'attack') return 'pawn_pick_interact';
            return 'pawn_pick_idle';
        }
        if (tool?.type === 'build') {
            if (state === 'run')    return 'pawn_hammer_run';
            if (state === 'attack') return 'pawn_hammer_work';
            return 'pawn_hammer_idle';
        }
        if (state === 'run')    return 'warrior_run';
        if (state === 'attack') return 'warrior_attack';
        return 'warrior_idle';
    }

    /**
     * Select tool slot
     */
    selectSlot(slot) {
        this.selectedSlot = slot;

        // Update UI
        document.querySelectorAll('.action-slot').forEach((el, i) => {
            el.classList.toggle('selected', i + 1 === slot);
        });

        // If build mode, open build menu
        if (this.tools[slot].type === 'build') {
            this.game.buildMenu.open();
        } else {
            this.game.buildMenu.close();
            this.game.buildingSystem.cancelPlacement();
        }
    }

    /**
     * Perform current tool action
     */
    performAction() {
        const tool = this.tools[this.selectedSlot];

        if (tool.type === 'melee') {
            this.game.audioSystem?.playSwing?.();
            this.meleeAttack(tool);
        } else if (tool.type === 'ranged') {
            this.game.audioSystem?.playSwing?.();
            this.rangedAttack(tool);
        } else if (tool.type === 'tool') {
            this.game.audioSystem?.playSwing?.();
            this.useTool(tool);
        } else if (tool.type === 'build') {
            // Building placement is handled by BuildingSystem directly
            this.game.buildingSystem.tryPlace();
        }

        // Only set cooldown for non-build actions
        if (tool.type !== 'build') {
            const hasteBonus = this._hasteBonus || 0;
            this.attackCooldown = Math.max(0.08, (tool.speed || 0.3) - hasteBonus);
            this.isAttacking = true;
            this.attackAnimation = 1;
        }
    }

    /**
     * Melee attack - damages enemies and can destroy own buildings
     */
    meleeAttack(tool) {
        // Get all enemies in range
        const swingOriginX = this.x + Math.cos(this.facingAngle) * 14;
        const swingOriginY = this.y + Math.sin(this.facingAngle) * 14;
        const enemies = this.game.getEntitiesInRange(
            swingOriginX,
            swingOriginY,
            tool.range,
            'enemy'
        ).sort((a, b) => {
            const da = (a.x - this.x) * (a.x - this.x) + (a.y - this.y) * (a.y - this.y);
            const db = (b.x - this.x) * (b.x - this.x) + (b.y - this.y) * (b.y - this.y);
            return da - db;
        });

        const hitEnemies = [];
        const baseDamage = tool.damage * this.damageMultiplier * (1 + (this._rallyDamageBonus || 0));
        // Cleave rebalance:
        // - fewer full-damage targets
        // - stronger falloff after primaries
        // - hard cap to prevent extreme pack shredding
        const primaryTargetCap = tool.tier >= 5 ? 2 : 1;
        const cleaveFalloff = tool.tier >= 5 ? 0.5 : 0.45;
        const maxHitTargets = tool.tier >= 5 ? 5 : 4;

        // Damage enemies in arc
        for (const enemy of enemies) {
            if (hitEnemies.length >= maxHitTargets) break;
            const angleToEnemy = this.angleTo(enemy);
            const angleDiff = Math.abs(Utils.normalizeAngle(angleToEnemy) - Utils.normalizeAngle(this.facingAngle));

            // Attack arc of 80 degrees
            if (angleDiff < Math.PI / 4.5 || angleDiff > Math.PI * (8 / 4.5)) {
                const hitIndex = hitEnemies.length;
                const damageScale = hitIndex < primaryTargetCap ? 1 : cleaveFalloff;
                const finalDamage = baseDamage * damageScale;
                enemy.takeDamage(finalDamage, this, tool.specialEffect || 'physical');

                hitEnemies.push(enemy);

                // Knockback: full on primary targets, reduced on cleave targets.
                const knockbackForce = hitIndex < primaryTargetCap ? 60 : 35;
                enemy.vx += Math.cos(angleToEnemy) * knockbackForce;
                enemy.vy += Math.sin(angleToEnemy) * knockbackForce;
            }
        }

        // Apply sword special effects (Tier 4+)
        if (tool.specialEffect && tool.tier >= 4 && hitEnemies.length > 0) {
            this.applySwordEffect(tool, hitEnemies);
        }

        if (hitEnemies.length > 0) {
            this.game.audioSystem?.playHit?.(tool.specialEffect || 'physical');
        }

        // versus: hit hostile players and enemy-owned structures through the shared network damage flow
        if (!this.game.inCave && this.game.gameMode === 'versus_ffa' && this.game.networkManager?.inRoom) {
            const ownerId = this.game.networkManager.playerId ?? null;
            const ownerSlot = this.game.resolvePlayerSlot(ownerId);
            const structureDamage = tool.damage * 2 * this.damageMultiplier * (1 + (this._rallyDamageBonus || 0));

            let bestRemotePlayer = null;
            let bestRemotePlayerDist = Infinity;
            for (const remotePlayer of this.game.getHostileRemotePlayersFor(ownerId)) {
                const dist = Utils.distance(this.x, this.y, remotePlayer.x, remotePlayer.y);
                if (dist >= tool.range + (remotePlayer.collisionRadius || 16)) continue;
                const angleToRemote = Utils.angle(this.x, this.y, remotePlayer.x, remotePlayer.y);
                const angleDiff = Math.abs(Utils.normalizeAngle(angleToRemote) - Utils.normalizeAngle(this.facingAngle));
                if (angleDiff >= Math.PI / 4 && angleDiff <= Math.PI * 7 / 4) continue;
                if (dist < bestRemotePlayerDist) {
                    bestRemotePlayer = remotePlayer;
                    bestRemotePlayerDist = dist;
                }
            }

            if (bestRemotePlayer) {
                this.game.networkManager?.sendVersusPlayerHit(bestRemotePlayer.playerId, {
                    damage: baseDamage,
                    damageType: tool.specialEffect || 'physical',
                    slowFactor: tool.specialEffect === 'ice' ? (tool.tier >= 5 ? 0.5 : 0.4) : 0,
                    slowDuration: tool.specialEffect === 'ice' ? (tool.tier >= 5 ? 2500 : 2000) : 0,
                    targetSlot: this.game.resolvePlayerSlot(bestRemotePlayer.playerId)
                });
            }

            const crystals = this.game.getAllCrystals?.() ?? [];
            for (const crystal of crystals) {
                if (!crystal || crystal.destroyed || crystal.ownerSlot === ownerSlot) continue;
                const dist = Utils.distance(this.x, this.y, crystal.x, crystal.y);
                if (dist >= tool.range + crystal.collisionRadius) continue;
                const angleToCrystal = Utils.angle(this.x, this.y, crystal.x, crystal.y);
                const angleDiff = Math.abs(Utils.normalizeAngle(angleToCrystal) - Utils.normalizeAngle(this.facingAngle));
                if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 7 / 4) {
                    this.game.networkManager?.sendVersusStructureHit({
                        targetType: 'crystal',
                        slot: crystal.ownerSlot,
                        damage: structureDamage
                    });
                    break;
                }
            }

            const buildings = this.game.buildingSystem.buildings;
            for (const building of buildings) {
                if (!building?.solid || building.destroyed) continue;
                const buildingOwnerSlot = this.game.resolvePlayerSlot(building.ownerId);
                if (!buildingOwnerSlot || buildingOwnerSlot === ownerSlot) continue;

                const dist = Utils.distance(this.x, this.y, building.x, building.y);
                if (dist < tool.range + building.collisionRadius) {
                    const angleToBuilding = Utils.angle(this.x, this.y, building.x, building.y);
                    const angleDiff = Math.abs(Utils.normalizeAngle(angleToBuilding) - Utils.normalizeAngle(this.facingAngle));

                    if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 7 / 4) {
                        this.game.networkManager?.sendVersusStructureHit({
                            targetType: 'building',
                            bId: building._netId,
                            damage: structureDamage
                        });
                        break;
                    }
                }
            }
        } else if (!this.game.inCave && this.game.buildingSystem) {
            const buildings = this.game.buildingSystem.buildings;
            for (const building of buildings) {
                const dist = Utils.distance(this.x, this.y, building.x, building.y);
                if (dist < tool.range + building.collisionRadius) {
                    const angleToBuilding = Utils.angle(this.x, this.y, building.x, building.y);
                    const angleDiff = Math.abs(Utils.normalizeAngle(angleToBuilding) - Utils.normalizeAngle(this.facingAngle));

                    if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 7 / 4) {
                        // Damage building
                        building.health -= tool.damage * 2;

                        // Spawn hit particles
                        for (let i = 0; i < 3; i++) {
                            this.game.addParticle({
                                x: building.x + Utils.randomFloat(-10, 10),
                                y: building.y + Utils.randomFloat(-10, 10),
                                vx: Utils.randomFloat(-30, 30),
                                vy: Utils.randomFloat(-40, -10),
                                color: building.color || '#666666',
                                lifetime: 0.4,
                                age: 0,
                                size: 4,
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
                                    ctx.globalAlpha = alpha;
                                    ctx.fillStyle = this.color;
                                    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                                    ctx.globalAlpha = 1;
                                }
                            });
                        }

                        if (building.health <= 0) {
                            building.destroy();
                        }
                    }
                }
            }
        }
    }

    /**
     * Apply sword special effects
     */
    applySwordEffect(tool, hitEnemies) {
        const tier = tool.tier;
        const effect = tool.specialEffect;

        switch (effect) {
            case 'fire':
                // FIRE: Burn AOE around hit enemies
                // Tier 4: 2 DPS for 2s in 70px radius
                // Tier 5: 4 DPS for 3s in 90px radius
                const affectedByBurn = new Set();
                for (const enemy of hitEnemies) {
                    const burnRadius = tier >= 5 ? 90 : 70;
                    const burnDamage = tier >= 5 ? 4 : 2;
                    const burnDuration = tier >= 5 ? 3 : 2;

                    const nearbyEnemies = this.game.getEntitiesInRange(enemy.x, enemy.y, burnRadius, 'enemy');
                    for (const target of nearbyEnemies) {
                        if (affectedByBurn.has(target)) continue;
                        target.burnDamage = burnDamage;
                        target.burnDuration = burnDuration;
                        target.burnTimer = 0;
                        affectedByBurn.add(target);
                    }

                    // Fire explosion visual
                    for (let i = 0; i < 12; i++) {
                        const angle = (Math.PI * 2 / 12) * i;
                        this.game.addParticle({
                            x: enemy.x,
                            y: enemy.y,
                            vx: Math.cos(angle) * 60,
                            vy: Math.sin(angle) * 60,
                            color: i % 2 === 0 ? '#ff6600' : '#ffaa00',
                            lifetime: 0.5,
                            age: 0,
                            size: 6,
                            destroyed: false,
                            update(dt) {
                                this.x += this.vx * dt;
                                this.y += this.vy * dt;
                                this.vx *= 0.9;
                                this.vy *= 0.9;
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
                break;

            case 'lightning':
                // LIGHTNING: Chain damage to nearby enemies
                // Tier 4: 1 chain at 30% damage
                // Tier 5: 2 chains at 35% damage
                for (const enemy of hitEnemies) {
                    const chainCount = tier >= 5 ? 2 : 1;
                    const chainDamage = tool.damage * (tier >= 5 ? 0.35 : 0.30);
                    const chainRange = tier >= 5 ? 105 : 90;

                    const nearbyEnemies = this.game.getEntitiesInRange(enemy.x, enemy.y, chainRange, 'enemy');
                    let chained = 0;

                    for (const target of nearbyEnemies) {
                        if (target !== enemy && !hitEnemies.includes(target) && chained < chainCount) {
                            target.takeDamage(chainDamage, this, 'lightning');
                            chained++;

                            // Lightning arc visual
                            this.game.addParticle({
                                x: enemy.x,
                                y: enemy.y,
                                targetX: target.x,
                                targetY: target.y,
                                lifetime: 0.2,
                                age: 0,
                                destroyed: false,
                                update(dt) {
                                    this.age += dt;
                                    if (this.age >= this.lifetime) this.destroyed = true;
                                },
                                render(ctx) {
                                    const alpha = 1 - this.age / this.lifetime;
                                    ctx.lineWidth = 5;
                                    ctx.strokeStyle = `rgba(255, 255, 0, ${alpha * 0.35})`;
                                    ctx.beginPath();
                                    ctx.moveTo(this.x, this.y);
                                    ctx.lineTo(this.targetX, this.targetY);
                                    ctx.stroke();
                                    ctx.lineWidth = 2;
                                    ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
                                    ctx.beginPath();
                                    ctx.moveTo(this.x, this.y);
                                    ctx.lineTo(this.targetX, this.targetY);
                                    ctx.stroke();
                                }
                            });
                        }
                    }
                }
                break;

            case 'ice':
                // ICE: Freeze enemies on 3rd hit
                // Tier 4: 40% slow for 2s, freeze 1.5s on 3rd hit
                // Tier 5: 50% slow for 2.5s, freeze 2s on 3rd hit
                for (const enemy of hitEnemies) {
                    const slowFactor = tier >= 5 ? 0.5 : 0.4;
                    const slowDuration = tier >= 5 ? 2500 : 2000;
                    const freezeDuration = tier >= 5 ? 2.0 : 1.5;

                    const config = enemy.config || {};
                    const originalSpeed = config.speed || 60;
                    enemy.speed = originalSpeed * (1 - slowFactor);

                    // Track hits for freeze
                    enemy.swordIceHitCount = (enemy.swordIceHitCount || 0) + 1;

                    // Freeze on 3rd hit
                    if (enemy.swordIceHitCount >= 3) {
                        enemy.frozen = true;
                        enemy.frozenTimer = freezeDuration;
                        enemy.speed = 0;
                        enemy.swordIceHitCount = 0;

                        // Freeze visual
                        this.game.addParticle({
                            x: enemy.x,
                            y: enemy.y,
                            lifetime: freezeDuration,
                            age: 0,
                            destroyed: false,
                            update(dt) {
                                this.age += dt;
                                if (this.age >= this.lifetime) this.destroyed = true;
                            },
                            render(ctx) {
                                const alpha = 0.7 * (1 - this.age / this.lifetime);
                                ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
                                ctx.fillRect(enemy.x - 25, enemy.y - 25, 50, 50);
                            }
                        });
                    }

                    // Reset speed after duration
                    setTimeout(() => {
                        if (!enemy.destroyed && !enemy.frozen) {
                            enemy.speed = originalSpeed;
                        }
                    }, slowDuration);

                    // Ice particles
                    for (let i = 0; i < 6; i++) {
                        this.game.addParticle({
                            x: enemy.x + Utils.randomFloat(-15, 15),
                            y: enemy.y + Utils.randomFloat(-15, 15),
                            vy: -30,
                            color: '#66ccff',
                            lifetime: 0.6,
                            age: 0,
                            size: 5,
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
                break;
        }
    }

    /**
     * Ranged attack - shoots arrow
     */
    rangedAttack(tool) {
        // Arrow properties
        const speed = tool.projectileSpeed || 300;
        const damage = tool.damage;

        // Arrow color based on bow effect
        const arrowColors = {
            'fire': '#ff6600',
            'lightning': '#ffff00',  // Bright yellow for lightning
            'ice': '#88ddff'
        };
        const arrowColor = tool.specialEffect ? arrowColors[tool.specialEffect] : '#cccccc';

        // Determine damage type based on special effect
        let damageType = 'physical';
        if (tool.specialEffect === 'fire') damageType = 'fire';
        else if (tool.specialEffect === 'lightning') damageType = 'lightning';
        else if (tool.specialEffect === 'ice') damageType = 'frost';

        const options = {
            speed: speed,
            damage: damage * this.damageMultiplier * (1 + (this._rallyDamageBonus || 0)),
            range: tool.range,
            owner: this,
            ownerId: this.game.networkManager?.playerId ?? null,
            specialEffect: tool.specialEffect,
            bowTier: tool.tier || 1,
            color: arrowColor,
            size: 4,
            damageType: damageType
        };

        const projectile = new Projectile(
            this.game,
            this.x,
            this.y,
            this.facingAngle,
            options
        );

        this.game.addProjectile(projectile);
    }

    /**
     * Use tool on resource
     */
    useTool(tool) {
        // Find nearby resource nodes
        const resourceNodes = this.game.getEntitiesInRange(
            this.x + Math.cos(this.facingAngle) * 25,
            this.y + Math.sin(this.facingAngle) * 25,
            tool.range,
            'resource'
        );

        // Interact with the closest one in arc
        for (const node of resourceNodes) {
            const angleToNode = this.angleTo(node);
            const angleDiff = Math.abs(Utils.normalizeAngle(angleToNode) - Utils.normalizeAngle(this.facingAngle));

            // Interaction arc
            if (angleDiff < Math.PI / 3 || angleDiff > Math.PI * 5 / 3) {
                // Check if tool type matches resource type
                if (node.config && node.config.toolType) {
                    if (!tool.toolType || tool.toolType !== node.config.toolType) {
                        this.game.showFloatingText(node.x, node.y - 10, `Need ${node.config.toolType}!`, '#ffaa00');
                        return;
                    }
                }

                // Check if tool tier is sufficient
                if (node.config && node.config.requiredTier && tool.tier < node.config.requiredTier) {
                    this.game.showFloatingText(node.x, node.y - 10, 'Need better tool!', '#ff0000');
                    return;
                }

                // Apply farming speed multiplier to harvesting damage
                const harvestDamage = tool.damage * this.farmingSpeedMultiplier;
                node.harvest(harvestDamage);
                this.game.audioSystem?.playCollect?.();
                break; // Only hit one at a time
            }
        }

        // Also hit barriers
        const barriers = this.game.world.barriers; // Need access to barriers
        // Since barriers are not entities, we might need a World method or similar.
        // But World.js has getBarrierAt.

        const checkX = this.x + Math.cos(this.facingAngle) * 30;
        const checkY = this.y + Math.sin(this.facingAngle) * 30;
        const barrier = this.game.world.getBarrierAt(checkX, checkY);

        if (barrier) {
            // Check tier requirement for barrier (e.g. need tier 2+)
            if (tool.tier < barrier.tier) {
                this.game.showFloatingText(checkX, checkY - 10, 'Too strong!', '#ff0000');
                // Spark effect
                return;
            }

            this.game.world.damageBarrier(barrier, tool.damage);
            this.game.audioSystem?.playHit?.('physical');
        }
    }

    performDash() {
        this.skills.dash.cooldown = this.skills.dash.maxCooldown;
        const move = this.game.input.getMovementVector();

        // If not moving, dash forward
        let dx = move.x;
        let dy = move.y;
        if (dx === 0 && dy === 0) {
            dx = Math.cos(this.facingAngle);
            dy = Math.sin(this.facingAngle);
        }

        const dashDist = 100;
        this.x += dx * dashDist;
        this.y += dy * dashDist;

        // Dash particles
        for (let i = 0; i < 10; i++) {
            this.game.addParticle({
                x: this.x - dx * i * 10,
                y: this.y - dy * i * 10,
                vx: 0, vy: 0,
                lifetime: 0.3,
                age: 0,
                render(ctx) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${1 - this.age / this.lifetime})`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }

    performHeal() {
        this.skills.heal.cooldown = this.skills.heal.maxCooldown;
        const before = this.health;
        this.health = Math.min(this.health + 30, this.maxHealth);
        const healed = this.health - before;
        if (healed > 0) this.game.objectiveSystem?.onHeal(healed);
        this.game.addParticle({
            x: this.x, y: this.y,
            text: "+30 HP",
            vy: -20,
            lifetime: 1,
            render(ctx) {
                ctx.fillStyle = '#00ff00';
                ctx.font = '16px Arial';
                ctx.fillText(this.text, this.x, this.y - this.age * 20);
            }
        });
    }

    performAoeAttack() {
        this.skills.aoeAttack.cooldown = this.skills.aoeAttack.maxCooldown;
        const radius = 100;
        const enemies = this.game.getEntitiesInRange(this.x, this.y, radius, 'enemy');
        for (const enemy of enemies) {
            enemy.takeDamage(40, this);
        }

        // Visual
        this.game.addParticle({
            x: this.x, y: this.y,
            radius: 0,
            lifetime: 0.5,
            age: 0,
            render(ctx) {
                this.radius = 100 * (this.age / this.lifetime);
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
    }

    takeDamage(amount, source) {
        if (this.invincibleTime > 0) return;

        this.health -= amount;
        this.invincibleTime = 0.5;

        // Flash screen red
        const flashIntensity = Math.min(amount / this.maxHealth, 0.5);
        this.game.visualEffects.flashDamage(flashIntensity);

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.game.handleLocalPlayerDeath(this);
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Flash if invincible
        if (this.invincibleTime > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 18, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sprite animation
        const tool = this.tools[this.selectedSlot];
        const animKey = this._getAnimKey(tool, this._animState || 'idle');
        const DRAW = 64;
        const STATIC_DRAW = 38;
        const bodyFlip = Math.cos(this.spriteFacingAngle || 0) < 0;
        const drawnSprite = spriteManager.drawStaticPlayerFrame(ctx, STATIC_DRAW, bodyFlip) || spriteManager.drawDirectionalPlayerFrame(
            ctx,
            this._animState || 'idle',
            this._animFrame || 0,
            this.spriteFacingAngle || 0,
            DRAW
        ) || spriteManager.drawUnitFrame(
            ctx, animKey, this._animFrame || 0, DRAW, DRAW, bodyFlip
        );

        if (!drawnSprite) {
            spriteManager.drawPlayerFallbackFrame(
                ctx, this._animFrame || 0, 64, 64, bodyFlip
            );
        }

        this.renderEquippedTool(ctx, tool);

        // Level display below player
        const levelText = `Lv.${this.level}`;
        ctx.font = 'bold 10px Rajdhani';
        ctx.textAlign = 'center';

        // Black outline for visibility
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(levelText, 0, 25);

        // White text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(levelText, 0, 25);

        // XP Bar below level text
        const barWidth = 40;
        const barHeight = 4;
        const barX = -barWidth / 2;
        const barY = 28;

        // Calculate XP progress
        const xpNeeded = this.level * 100;
        const xpProgress = Math.min(1, this.xp / xpNeeded);

        // Bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Bar fill (gradient)
        if (xpProgress > 0) {
            const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            gradient.addColorStop(0, '#00d4ff');
            gradient.addColorStop(1, '#9966ff');
            ctx.fillStyle = gradient;
            ctx.fillRect(barX, barY, barWidth * xpProgress, barHeight);
        }

        // Bar border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.restore();
    }

    renderEquippedTool(ctx, tool) {
        const sprite = this.getEquippedToolSprite(tool);
        if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

        const isLeft = this._facingLeft;
        const handX = isLeft ? -10 : 10;
        const handY = this._animState === 'attack' ? 2 : 5;
        const attackSwing = this._animState === 'attack'
            ? Math.sin(Math.min(1, this.attackCooldown / Math.max(0.1, tool?.speed || 0.3)) * Math.PI) * 0.8
            : 0;

        let drawW = 16;
        let drawH = 16;
        let offsetX = 4;
        let offsetY = -3;
        let rotation = this.facingAngle + attackSwing;

        if (tool?.type === 'melee') {
            drawW = 23;
            drawH = 27;
            offsetX = 5;
            offsetY = -5;
        } else if (tool?.type === 'ranged') {
            drawW = 30;
            drawH = 30;
            offsetX = 5;
            offsetY = 1;
        } else if (tool?.toolType === 'axe' || tool?.toolType === 'pickaxe') {
            drawW = 18;
            drawH = 18;
            offsetX = 4;
            offsetY = -4;
            rotation += tool.toolType === 'pickaxe' ? 0.3 : -0.2;
        } else if (tool?.type === 'build') {
            drawW = 16;
            drawH = 16;
            offsetX = 4;
            offsetY = -4;
            rotation += 0.15;
        }

        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(rotation);
        if (isLeft) ctx.scale(1, -1);
        ctx.globalAlpha = 0.98;
        ctx.drawImage(sprite, offsetX - drawW / 2, offsetY - drawH / 2, drawW, drawH);
        ctx.restore();
    }

    gainXp(amount) {
        this.xp += amount * this.xpGainMultiplier;

        // Check level up
        const xpNeeded = this.level * 100;
        if (this.xp >= xpNeeded) {
            this.xp -= xpNeeded;
            this.level++;
            this.skillPoints++;
            this.pendingLevelUp = true;

            this.unlockSkillsForLevel();

            // Visual
            this.game.spawnLevelUpEffect();
        }
    }

    unlockSkillsForLevel() {
        const unlocks = [
            { level: 3, key: 'dash', label: 'Dash' },
            { level: 6, key: 'aoeAttack', label: 'Onde de choc' },
            { level: 9, key: 'heal', label: 'Soin actif' }
        ];

        for (const unlock of unlocks) {
            const skill = this.skills[unlock.key];
            if (this.level >= unlock.level && skill && !skill.unlocked) {
                skill.unlocked = true;
                this.game.showNotification?.('COMPETENCE DEBLOQUEE', unlock.label, '#66ccff', 3);
            }
        }
    }
}
