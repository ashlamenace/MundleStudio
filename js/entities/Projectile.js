/**
 * Projectile entity for ranged attacks
 */

import { Utils } from '../core/Utils.js';

export class Projectile {
    constructor(game, x, y, angle, options = {}) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.angle = angle;

        this.speed = options.speed || 300;
        this.damage = options.damage || 10;
        this.range = options.range || 300;
        this.owner = options.owner || null;
        this.piercing = options.piercing || false;

        // Movement
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;

        // Tracking
        this.distanceTraveled = 0;
        this.destroyed = false;

        // Visuals
        this.size = options.size || 6;
        this.color = options.color || '#ffff00';

        // Type-specific
        this.type = options.type || 'arrow';
        const defaultTrailLengths = {
            laser: 3,
            flame: 3,
            sniper: 3,
            ballista: 3,
            ice: 4,
            arrow: 4,
            bullet: 4
        };
        this.trailLength = options.trailLength || defaultTrailLengths[this.type] || 4;
        this.trail = [];

        // Bow special effects
        this.specialEffect = options.specialEffect || null;
        this.bowTier = options.bowTier || 1;
        this.ownerId = options.ownerId || null;

        // Turret special abilities
        this.armorPierce = options.armorPierce || 0;
        this.chainTargets = options.chainTargets || 0;
        this.freezeChance = options.freezeChance || 0;
        this.slowEffect = options.slowEffect || 0;
        this.slowDuration = options.slowDuration || 2.0;
        this.burnDamage = options.burnDamage || 0;
        this.burnDuration = options.burnDuration || 0;
        this.aoeBurn = options.aoeBurn || false;
        this.burnRadius = options.burnRadius || 0;
        this.isCrit = options.isCrit || false;
        this.spin = 0;

        // Damage type for resistance/weakness system
        this.damageType = options.damageType || this.getDamageTypeFromProjectile();
    }

    /**
     * Determine damage type based on projectile type
     */
    getDamageTypeFromProjectile() {
        switch (this.type) {
            case 'laser': return 'fire';
            case 'flame': return 'fire';
            case 'fireball': return 'fire';
            case 'frost': return 'frost';
            case 'lightning': return 'lightning';
            default: return 'physical';
        }
    }

    update(deltaTime) {
        this.spin += deltaTime * 14;

        // Store trail position
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }

        // Move
        const moveX = this.vx * deltaTime;
        const moveY = this.vy * deltaTime;

        this.x += moveX;
        this.y += moveY;
        this.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);

        // Check range
        if (this.distanceTraveled >= this.range) {
            this.destroyed = true;
            return;
        }

        // Check collisions with enemies (skip for visual-only remote projectiles)
        if (!this._visualOnly) {
            // In versus mode, check hostile remote players BEFORE enemies so that
            // turret shots aimed at a player are not consumed by an enemy standing
            // in the path. (Enemy-targeted projectiles will still hit enemies first
            // because the remote player won't be at the same position.)
            if (this.game.gameMode === 'versus_ffa' && this.game.networkManager?.inRoom) {
                const ownerSlot = this.game.resolvePlayerSlot(this.ownerId ?? this.game.networkManager?.playerId ?? null);
                const remotePlayers = this.game.getHostileRemotePlayersFor(this.ownerId ?? this.game.networkManager?.playerId ?? null);

                for (const remotePlayer of remotePlayers) {
                    if (!remotePlayer || remotePlayer.destroyed) continue;
                    if (!Utils.circleCollision(this.x, this.y, this.size, remotePlayer.x, remotePlayer.y, remotePlayer.collisionRadius || 16)) continue;

                    let slowFactor = this.slowEffect || 0;
                    let slowDuration = this.slowDuration || 0;
                    if (this.specialEffect === 'ice' && slowFactor === 0) {
                        slowFactor = this.bowTier >= 5 ? 0.6 : 0.5;
                        slowDuration = this.bowTier >= 5 ? 3.0 : 2.5;
                    }

                    this.game.networkManager?.sendVersusPlayerHit?.(remotePlayer.playerId, {
                        damage: this.damage,
                        damageType: this.damageType,
                        slowFactor,
                        slowDuration,
                        specialEffect: this.specialEffect || null,
                        bowTier: this.bowTier || 1,
                        targetSlot: this.game.resolvePlayerSlot(remotePlayer.playerId),
                        targetId: remotePlayer.playerId,
                        ownerSlot
                    });

                    if (!this.piercing) {
                        this.destroyed = true;
                        this.spawnHitEffect();
                        return;
                    }
                }
            }

            const enemies = this.game.getEnemies();
            for (const enemy of enemies) {
                if (Utils.circleCollision(this.x, this.y, this.size, enemy.x, enemy.y, enemy.collisionRadius)) {
                    // Use damage type system
                    enemy.takeDamage(this.damage, this.owner, this.damageType);

                    // Apply bow special effects
                    if (this.specialEffect) {
                        this.applySpecialEffect(enemy);
                    }

                    // Apply turret special abilities
                    this.applyTurretAbilities(enemy);

                    if (!this.piercing) {
                        this.destroyed = true;
                        this.spawnHitEffect();
                        return;
                    }
                }
            }
        }

        // Projectiles can now pass through walls (removed collision check)

        // Check world bounds
        if (this.x < 0 || this.x > this.game.world.width ||
            this.y < 0 || this.y > this.game.world.height) {
            this.destroyed = true;
        }
    }

    spawnHitEffect() {
        for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.game.addParticle({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 50,
                vy: Math.sin(angle) * 50,
                lifetime: 0.2,
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
                    ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }

    /**
     * Apply special effect to enemy
     */
    applySpecialEffect(enemy) {
        if (!this.specialEffect) return;

        switch (this.specialEffect) {
            case 'fire':
                // FIRE: Sustained damage over time (DPS focus)
                // Tier 4: 4 DPS for 4s = 16 total damage
                // Tier 5: 6 DPS for 5s = 30 total damage
                enemy.burnDamage = this.bowTier >= 5 ? 6 : 4;
                enemy.burnDuration = this.bowTier >= 5 ? 5 : 4;
                enemy.burnTimer = 0;

                // Fire particles
                for (let i = 0; i < 3; i++) {
                    this.game.addParticle({
                        x: enemy.x,
                        y: enemy.y,
                        vx: Utils.randomFloat(-20, 20),
                        vy: Utils.randomFloat(-40, -20),
                        color: '#ff6600',
                        lifetime: 0.6,
                        age: 0,
                        size: 5,
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
                break;

            case 'lightning':
                // LIGHTNING: AOE burst damage (multi-target focus)
                // Tier 4: 2 chains at 40% damage each
                // Tier 5: 3 chains at 50% damage each
                const chainCount = this.bowTier >= 5 ? 3 : 2;
                const chainDamage = this.damage * (this.bowTier >= 5 ? 0.5 : 0.4);
                const chainRange = this.bowTier >= 5 ? 150 : 120;
                const nearbyEnemies = this.game.getEntitiesInRange(enemy.x, enemy.y, chainRange, 'enemy');
                let chained = 0;

                for (const target of nearbyEnemies) {
                    if (target !== enemy && chained < chainCount) {
                        target.takeDamage(chainDamage, this.owner, 'lightning');
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
                                ctx.lineWidth = 3;
                                ctx.strokeStyle = `rgba(255, 255, 0, ${alpha * 0.4})`;
                                ctx.beginPath();
                                ctx.moveTo(this.x, this.y);
                                ctx.lineTo(this.targetX, this.targetY);
                                ctx.stroke();
                                ctx.lineWidth = 1.5;
                                ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
                                ctx.beginPath();
                                ctx.moveTo(this.x, this.y);
                                ctx.lineTo(this.targetX, this.targetY);
                                ctx.stroke();
                            }
                        });
                    }
                }
                break;

            case 'ice':
                // ICE: Crowd control (slow/freeze focus)
                // Tier 4: 50% slow for 2.5s
                // Tier 5: 60% slow for 3s + freeze on 3 hits (2s stun)
                const slowFactor = this.bowTier >= 5 ? 0.6 : 0.5;
                const slowDuration = this.bowTier >= 5 ? 3000 : 2500;
                const config = enemy.config || {};
                const originalSpeed = config.speed || 60;
                enemy.speed = originalSpeed * (1 - slowFactor);

                // Track hits for freeze (Tier 5 only)
                if (this.bowTier >= 5) {
                    enemy.iceHitCount = (enemy.iceHitCount || 0) + 1;

                    // Freeze on 3rd hit
                    if (enemy.iceHitCount >= 3) {
                        enemy.frozen = true;
                        enemy.frozenTimer = 2.0; // 2 second freeze
                        enemy.speed = 0;
                        enemy.iceHitCount = 0;

                        // Freeze visual (ice block)
                        this.game.addParticle({
                            x: enemy.x,
                            y: enemy.y,
                            lifetime: 2.0,
                            age: 0,
                            destroyed: false,
                            update(dt) {
                                this.age += dt;
                                if (this.age >= this.lifetime) this.destroyed = true;
                            },
                            render(ctx) {
                                const alpha = 0.6 * (1 - this.age / this.lifetime);
                                ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
                                ctx.fillRect(enemy.x - 20, enemy.y - 20, 40, 40);
                            }
                        });
                    }
                }

                // Reset speed after duration
                setTimeout(() => {
                    if (!enemy.destroyed && !enemy.frozen) {
                        enemy.speed = originalSpeed;
                    }
                }, slowDuration);

                // Ice particles
                for (let i = 0; i < 4; i++) {
                    this.game.addParticle({
                        x: enemy.x + Utils.randomFloat(-10, 10),
                        y: enemy.y + Utils.randomFloat(-10, 10),
                        vy: -20,
                        color: '#66ccff',
                        lifetime: 0.8,
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
                break;
        }
    }

    render(ctx) {
        this.renderTrail(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        switch (this.type) {
            case 'bullet':               this.renderBullet(ctx);       break;
            case 'laser':                this.renderLaserBolt(ctx);    break;
            case 'ice':                  this.renderIceShard(ctx);     break;
            case 'flame': case 'fireball': this.renderFlameShot(ctx);  break;
            case 'sniper':               this.renderSniperRound(ctx);  break;
            case 'ballista':             this.renderBallistaBolt(ctx); break;
            case 'arrow':                this.renderArrow(ctx);        break;
        }

        ctx.restore();
    }

    renderTrail(ctx) {
        if (this.trail.length <= 1) return;

        const trailStyles = {
            bullet:   { width: 1, color: 'rgba(140, 148, 168, 0.5)' },
            laser:    { width: 2, color: 'rgba(0, 180, 220, 0.5)'   },
            ice:      { width: 2, color: 'rgba(100, 200, 240, 0.5)' },
            flame:    { width: 3, color: 'rgba(220, 80, 0, 0.4)'    },
            fireball: { width: 3, color: 'rgba(220, 80, 0, 0.4)'    },
            sniper:   { width: 1, color: 'rgba(200, 170, 50, 0.6)'  },
            ballista: { width: 2, color: 'rgba(160, 120, 60, 0.4)'  },
            arrow:    { width: 1, color: 'rgba(180, 140, 80, 0.5)'  },
        };
        const style = trailStyles[this.type] || { width: 1, color: 'rgba(200,200,200,0.4)' };

        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.stroke();
    }

    // --- Pixel-art projectile renders (16×16 DA, x+ = forward) ---

    renderBullet(ctx) {
        // Metal slug — gunmetal shaft, bright top face, dark front tip
        ctx.fillStyle = '#5c6474';
        ctx.fillRect(-4, -1, 8, 2);
        ctx.fillStyle = '#8c94a8';
        ctx.fillRect(-3, -1, 6, 1);  // highlight top face
        ctx.fillStyle = '#1e202a';
        ctx.fillRect(3, -1, 2, 2);   // dark front tip
    }

    renderLaserBolt(ctx) {
        // Cyan energy bolt — dim outer casing, 1px bright core, glowing tip
        ctx.fillStyle = '#00384c';
        ctx.fillRect(-5, -1, 10, 2);
        ctx.fillStyle = '#00c0e0';
        ctx.fillRect(-4, 0, 8, 1);   // 1px bright core line
        ctx.fillStyle = '#80f0ff';
        ctx.fillRect(3, -1, 3, 2);   // bright front cap
    }

    renderIceShard(ctx) {
        // Ice crystal shard — dark base, bright top face, sharp forward tip
        ctx.fillStyle = '#3080a8';
        ctx.fillRect(-3, -1, 6, 2);
        ctx.fillStyle = '#90d8f0';
        ctx.fillRect(-2, -1, 5, 1);  // light top face
        ctx.fillStyle = '#daf6ff';
        ctx.fillRect(3, 0, 2, 1);    // sharp pointing tip (center axis)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -1, 1, 1);  // specular highlight
    }

    renderFlameShot(ctx) {
        // Fireball — dark red outer, orange body, yellow hot core
        ctx.fillStyle = '#bb1800';
        ctx.fillRect(-3, -2, 6, 4);  // outer dark red (defines silhouette)
        ctx.fillStyle = '#ff4800';
        ctx.fillRect(-2, -2, 6, 4);  // orange body (1px dark back edge remains)
        ctx.fillStyle = '#ff9020';
        ctx.fillRect(-1, -1, 4, 2);  // bright orange inner
        ctx.fillStyle = '#ffe040';
        ctx.fillRect(0, 0, 2, 1);    // yellow hot core (front-biased)
    }

    renderSniperRound(ctx) {
        // Long AP needle — very thin, metallic, dark front tip
        ctx.fillStyle = this.isCrit ? '#c8a800' : '#604818';
        ctx.fillRect(-7, -1, 10, 2);
        ctx.fillStyle = this.isCrit ? '#ffec40' : '#b08828';
        ctx.fillRect(-6, -1, 9, 1);  // bright top edge
        ctx.fillStyle = '#100c00';
        ctx.fillRect(2, -1, 2, 2);   // dark front tip
    }

    renderBallistaBolt(ctx) {
        // Large bolt — dark wood shaft, lighter grain, metal broadhead
        ctx.fillStyle = '#5a3c1c';
        ctx.fillRect(-5, -1, 8, 2);
        ctx.fillStyle = '#8c6030';
        ctx.fillRect(-4, -1, 6, 1);  // wood grain highlight
        ctx.fillStyle = '#b08830';
        ctx.fillRect(2, -2, 4, 4);   // broadhead base
        ctx.fillStyle = '#d4b050';
        ctx.fillRect(4, -1, 3, 2);   // bright metal tip
        ctx.fillStyle = '#3a2808';
        ctx.fillRect(2, -2, 1, 4);   // shadow edge on head
    }

    renderArrow(ctx) {
        // Player arrow — wood shaft, dark metal tip, feathered back
        const s = this.size * 0.5;
        ctx.fillStyle = '#9a7040';
        ctx.fillRect(-Math.round(s * 1.2), -1, Math.round(s * 2.2), 2);
        ctx.fillStyle = '#282010';
        ctx.fillRect(Math.round(s * 0.8), -1, Math.round(s * 0.6), 2);
        ctx.fillStyle = this.color;
        ctx.fillRect(-Math.round(s * 1.4), -2, Math.round(s * 0.6), 1);
        ctx.fillRect(-Math.round(s * 1.4), 1, Math.round(s * 0.6), 1);
    }


    /**
     * Apply turret special abilities
     */
    applyTurretAbilities(enemy) {
        // Chain lightning (Laser T5)
        if (this.chainTargets > 0) {
            const nearbyEnemies = this.game.getEntitiesInRange(enemy.x, enemy.y, 100, 'enemy');
            let chained = 0;

            for (const target of nearbyEnemies) {
                if (target !== enemy && chained < this.chainTargets) {
                    target.takeDamage(this.damage * 0.5, this.owner, 'lightning');
                    chained++;

                    // Chain visual
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
                            ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.moveTo(this.x, this.y);
                            ctx.lineTo(this.targetX, this.targetY);
                            ctx.stroke();
                        }
                    });
                }
            }
        }

        // Freeze chance (Frost T5)
        if (this.freezeChance > 0 && Math.random() < this.freezeChance) {
            enemy.frozen = true;
            enemy.frozenTimer = 2.0;
            enemy.speed = 0;

            // Freeze visual — snapshot coordinates to avoid capturing live enemy reference
            this.game.addParticle({
                x: enemy.x,
                y: enemy.y,
                lifetime: 2.0,
                age: 0,
                destroyed: false,
                update(dt) {
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 0.6 * (1 - this.age / this.lifetime);
                    ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
                    ctx.fillRect(this.x - 20, this.y - 20, 40, 40);
                }
            });
        }

        // Slow effect (Frost) — use a timer instead of setTimeout to avoid callback accumulation
        if (this.slowEffect > 0) {
            const config = enemy.config || {};
            const originalSpeed = config.speed || 60;
            const newSpeed = originalSpeed * (1 - this.slowEffect);
            // Only refresh the slow if the new speed is slower (don't stack weaker slows)
            if (!enemy.slowTimer || newSpeed <= enemy.speed) {
                enemy.speed = newSpeed;
            }
            enemy.slowOriginalSpeed = originalSpeed;
            // Refresh the timer (re-applying replaces the existing one)
            enemy.slowTimer = this.slowDuration;
        }

        // Burn damage (Flame)
        if (this.burnDamage > 0) {
            enemy.burnDamage = this.burnDamage;
            enemy.burnDuration = this.burnDuration;
            enemy.burnTimer = 0;

            // AOE burn spread (Flame T5)
            if (this.aoeBurn) {
                const nearbyEnemies = this.game.getEntitiesInRange(enemy.x, enemy.y, this.burnRadius, 'enemy');
                for (const target of nearbyEnemies) {
                    if (target !== enemy) {
                        target.burnDamage = this.burnDamage;
                        target.burnDuration = this.burnDuration;
                        target.burnTimer = 0;
                    }
                }

                // AOE burn visual
                this.game.addParticle({
                    x: enemy.x,
                    y: enemy.y,
                    radius: this.burnRadius,
                    lifetime: 0.5,
                    age: 0,
                    destroyed: false,
                    update(dt) {
                        this.age += dt;
                        if (this.age >= this.lifetime) this.destroyed = true;
                    },
                    render(ctx) {
                        const alpha = 0.4 * (1 - this.age / this.lifetime);
                        ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            }
        }
    }

    explode() {
        // Explosion visual
        this.game.addParticle({
            x: this.x,
            y: this.y,
            radius: 50,
            lifetime: 0.3,
            age: 0,
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            },
            update(dt) { this.age += dt; }
        });

        // Damage nearby enemies
        const targets = this.game.getEntitiesInRange(this.x, this.y, 50, 'enemy');
        for (const target of targets) {
            target.takeDamage(this.damage * 0.8, this.owner);
        }

    }
}

export default Projectile;
