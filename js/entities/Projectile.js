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

        // Check collisions with enemies
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

        // Projectile body
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'arrow') {
            // Arrow shape (compact tail, same silhouette)
            const arrowSize = this.size * 0.5;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(arrowSize, 0);
            ctx.lineTo(-arrowSize * 0.34, -arrowSize / 3);
            ctx.lineTo(-arrowSize * 0.18, 0);
            ctx.lineTo(-arrowSize * 0.34, arrowSize / 3);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'bullet') {
            // Bullet shape
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'laser') {
            // Laser beam (no shadowBlur — use double-line for glow effect)
            const tail = this.size * 1.1;
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255,100,0,0.3)';
            ctx.beginPath();
            ctx.moveTo(-tail, 0);
            ctx.lineTo(this.size, 0);
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(-tail, 0);
            ctx.lineTo(this.size, 0);
            ctx.stroke();
        } else if (this.type === 'ice') {
            this.renderIceShard(ctx);
        } else if (this.type === 'flame') {
            this.renderFlameShot(ctx);
        } else if (this.type === 'sniper') {
            this.renderSniperRound(ctx);
        } else if (this.type === 'ballista') {
            this.renderBallistaBolt(ctx);
        } else if (this.type === 'fireball') {
            this.renderFlameShot(ctx);
        }

        ctx.restore();
    }

    renderTrail(ctx) {
        if (this.trail.length <= 1) return;

        const trailStyles = {
            laser: { width: 4, color: 'rgba(255, 110, 60, 0.55)' },
            ice: { width: 3, color: 'rgba(130, 225, 255, 0.55)' },
            flame: { width: 5, color: 'rgba(255, 120, 35, 0.45)' },
            sniper: { width: 1, color: 'rgba(255, 235, 160, 0.75)' },
            ballista: { width: 2, color: 'rgba(210, 160, 90, 0.45)' },
            arrow: { width: 2, color: this.color }
        };
        const style = trailStyles[this.type] || { width: 2, color: this.color };

        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.stroke();
    }

    renderIceShard(ctx) {
        ctx.fillStyle = '#b9f3ff';
        ctx.strokeStyle = '#4fb6d8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.size * 1.6, 0);
        ctx.lineTo(-this.size * 0.55, -this.size * 0.65);
        ctx.lineTo(-this.size * 0.18, 0);
        ctx.lineTo(-this.size * 0.55, this.size * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderFlameShot(ctx) {
        const flicker = 1 + Math.sin(this.spin * 2) * 0.12;
        ctx.fillStyle = 'rgba(255, 90, 25, 0.95)';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.35 * flicker, this.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 220, 90, 0.9)';
        ctx.beginPath();
        ctx.ellipse(this.size * 0.2, 0, this.size * 0.65, this.size * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    renderSniperRound(ctx) {
        ctx.fillStyle = this.isCrit ? '#fff36b' : '#f0e0a0';
        ctx.strokeStyle = '#5a4a2a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.size * 1.8, 0);
        ctx.lineTo(-this.size * 0.55, -this.size * 0.35);
        ctx.lineTo(-this.size * 0.55, this.size * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderBallistaBolt(ctx) {
        ctx.strokeStyle = '#7a4f2a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.8, 0);
        ctx.lineTo(this.size * 1.8, 0);
        ctx.stroke();
        ctx.fillStyle = '#d7b071';
        ctx.beginPath();
        ctx.moveTo(this.size * 2.0, 0);
        ctx.lineTo(this.size * 0.9, -this.size * 0.55);
        ctx.lineTo(this.size * 0.9, this.size * 0.55);
        ctx.closePath();
        ctx.fill();
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
                            ctx.shadowColor = '#ffff00';
                            ctx.shadowBlur = 10;
                            ctx.beginPath();
                            ctx.moveTo(this.x, this.y);
                            ctx.lineTo(this.targetX, this.targetY);
                            ctx.stroke();
                            ctx.shadowBlur = 0;
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

            // Freeze visual
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

        // Slow effect (Frost)
        if (this.slowEffect > 0) {
            const config = enemy.config || {};
            const originalSpeed = config.speed || 60;
            enemy.speed = originalSpeed * (1 - this.slowEffect);

            setTimeout(() => {
                if (!enemy.destroyed && !enemy.frozen) {
                    enemy.speed = originalSpeed;
                }
            }, this.slowDuration * 1000);
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

        this.game.camera.shake(5, 0.2);
    }
}

export default Projectile;
