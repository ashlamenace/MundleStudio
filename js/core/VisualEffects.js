/**
 * Visual Effects Manager
 * Handles advanced visual effects like damage flash, slow-motion, particles
 */

export class VisualEffects {
    constructor(game) {
        this.game = game;

        // Time scale for slow-motion effects
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.timeScaleDuration = 0;

        // Damage flash
        this.damageFlashIntensity = 0;
        this.damageFlashDuration = 0;

        // Weakness indicator tracking
        this.weaknessIndicators = [];

        // Performance settings
        this.performanceMode = 'high'; // high, medium, low, critical
        this.maxParticles = 200;
        this.particleQuality = 1.0; // 0.0-1.0 multiplier
        this.lastFPS = 60;
    }

    /**
     * Update visual effects
     */
    update(deltaTime) {
        // Update time scale (slow-motion)
        if (this.timeScaleDuration > 0) {
            this.timeScaleDuration -= deltaTime;
            this.timeScale = this.targetTimeScale;

            if (this.timeScaleDuration <= 0) {
                this.timeScale = 1.0;
                this.targetTimeScale = 1.0;
            }
        }

        // Update damage flash
        if (this.damageFlashDuration > 0) {
            this.damageFlashDuration -= deltaTime;
            this.damageFlashIntensity *= 0.9; // Fade out
        }

        // Update weakness indicators
        for (let i = this.weaknessIndicators.length - 1; i >= 0; i--) {
            const indicator = this.weaknessIndicators[i];
            indicator.age += deltaTime;
            indicator.y -= 30 * deltaTime; // Float upward

            if (indicator.age >= indicator.lifetime) {
                this.weaknessIndicators[i] = this.weaknessIndicators[this.weaknessIndicators.length - 1];
                this.weaknessIndicators.pop();
            }
        }
    }

    /**
     * Update performance mode based on FPS
     */
    updatePerformanceMode(fps) {
        this.lastFPS = fps;

        // Adaptive quality based on FPS
        if (fps >= 55) {
            this.performanceMode = 'high';
            this.particleQuality = 1.0;
        } else if (fps >= 45) {
            this.performanceMode = 'medium';
            this.particleQuality = 0.5;
        } else if (fps >= 30) {
            this.performanceMode = 'low';
            this.particleQuality = 0.3;
        } else {
            this.performanceMode = 'critical';
            this.particleQuality = 0.15;
        }
    }

    /**
     * Render visual effects (overlays)
     */
    render(ctx) {
        // Damage flash (full screen red overlay)
        if (this.damageFlashIntensity > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlashIntensity})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
    }

    /**
     * Render world-space effects (weakness indicators)
     */
    renderWorld(ctx) {
        // Render weakness indicators
        for (const indicator of this.weaknessIndicators) {
            const alpha = 1 - (indicator.age / indicator.lifetime);
            const bounce = Math.sin(indicator.age * 10) * 3;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Shadow for visibility
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(indicator.icon, indicator.x, indicator.y + bounce);

            ctx.restore();
        }
    }

    /**
     * Set time scale for slow-motion effect
     */
    setTimeScale(scale, duration) {
        this.targetTimeScale = scale;
        this.timeScale = scale;
        this.timeScaleDuration = duration;
    }

    /**
     * Flash screen red when taking damage
     */
    flashDamage(intensity) {
        this.damageFlashIntensity = Math.min(intensity, 0.5);
        this.damageFlashDuration = 0.3;
    }

    /**
     * Show weakness indicator above enemy
     */
    showWeaknessIndicator(enemy, damageType) {
        // Cooldown check: only show once per 0.5s per enemy
        const now = Date.now();
        if (!enemy._lastWeaknessIndicator) enemy._lastWeaknessIndicator = {};

        if (enemy._lastWeaknessIndicator[damageType] &&
            now - enemy._lastWeaknessIndicator[damageType] < 500) {
            return; // Skip if shown recently
        }

        enemy._lastWeaknessIndicator[damageType] = now;

        // Visual culling: only show if on-screen
        if (!this.game.camera.isVisible(enemy.x - 25, enemy.y - 50, 50, 50)) {
            return;
        }

        const icons = {
            'fire': '🔥',
            'frost': '❄️',
            'lightning': '⚡',
            'physical': '💥'
        };

        const icon = icons[damageType] || '💥';

        this.weaknessIndicators.push({
            x: enemy.x,
            y: enemy.y - 30,
            icon: icon,
            age: 0,
            lifetime: 1.0
        });
    }

    /**
     * Create enhanced blood/debris particles
     */
    createBloodParticles(x, y, color, count = 20) {
        // Visual culling: skip if off-screen
        if (!this.game.camera.isVisible(x - 50, y - 50, 100, 100)) {
            return;
        }

        // Apply quality reduction based on performance
        count = Math.floor(count * this.particleQuality);
        count = Math.max(3, count); // Minimum 3 for visual feedback

        // Check particle limit and make room if needed
        const currentParticles = this.game.particles.length;
        if (currentParticles >= this.maxParticles) {
            // Remove oldest particles to make room
            const toRemove = Math.min(count, currentParticles - this.maxParticles + count);
            this.game.particles.splice(0, toRemove);
        }

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const speed = 80 + Math.random() * 60;
            const size = 3 + Math.random() * 5;

            this.game.addParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20, // Upward bias
                color: this.darkenColor(color, Math.random() * 0.3),
                lifetime: 0.5 + Math.random() * 0.5,
                age: 0,
                size: size,
                destroyed: false,
                gravity: 200, // Gravity effect
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vy += this.gravity * dt; // Apply gravity
                    this.vx *= 0.95; // Air resistance
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - (this.age / this.lifetime);
                    const currentSize = this.size * (1 - this.age / this.lifetime * 0.5);

                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            });
        }
    }

    /**
     * Create explosion particles with shockwave
     */
    createExplosionEffect(x, y, radius, color = '#ff6600') {
        // Shockwave ring
        this.game.addParticle({
            x: x,
            y: y,
            radius: 0,
            maxRadius: radius * 1.5,
            lifetime: 0.4,
            age: 0,
            color: color,
            destroyed: false,
            update(dt) {
                this.age += dt;
                this.radius = this.maxRadius * (this.age / this.lifetime);
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - (this.age / this.lifetime);
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = alpha * 0.8;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });

        // Fire particles
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;

            this.game.addParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: i % 2 === 0 ? '#ff6600' : '#ffaa00',
                lifetime: 0.3 + Math.random() * 0.4,
                age: 0,
                size: 6 + Math.random() * 6,
                destroyed: false,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vx *= 0.92;
                    this.vy *= 0.92;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - (this.age / this.lifetime);
                    const size = this.size * (1 - this.age / this.lifetime * 0.7);

                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            });
        }
    }

    /**
     * Hitstop: freeze game for a few frames on impactful hits
     */
    triggerHitstop(duration = 0.05) {
        if (this.timeScaleDuration <= 0) { // Only if no existing slow-mo
            this.setTimeScale(0.05, duration);
        }
    }

    /**
     * Aura ring effect (used by boss frost aura, etc.)
     */
    showAuraEffect(x, y, radius, color, alpha) {
        this.game.addParticle({
            x, y, radius: 0, maxRadius: radius,
            color, alpha,
            lifetime: 0.5, age: 0, destroyed: false,
            update(dt) { this.age += dt; this.radius = this.maxRadius * (this.age / this.lifetime); if (this.age >= this.lifetime) this.destroyed = true; },
            render(ctx) {
                const a = this.alpha * (1 - this.age / this.lifetime);
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = a;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });
    }

    /**
     * Speeder/Shadow motion trail
     */
    spawnTrail(x, y, color, size) {
        this.game.addParticle({
            x, y,
            color, size,
            lifetime: 0.25, age: 0, destroyed: false,
            update(dt) { this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
            render(ctx) {
                const alpha = 0.45 * (1 - this.age / this.lifetime);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
        });
    }

    /**
     * Colored floating damage number
     */
    showDamageNumber(x, y, amount, damageType = 'physical') {
        const colors = {
            physical: '#ffffff',
            fire:     '#ff6600',
            frost:    '#66ccff',
            lightning:'#ffff44'
        };
        const color = colors[damageType] || colors.physical;
        this.game.addParticle({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 15,
            vy: -30 - Math.random() * 20,
            text: `-${Math.floor(amount)}`,
            color,
            lifetime: 0.9, age: 0, destroyed: false,
            update(dt) { this.y += this.vy * dt; this.vy *= 0.94; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.globalAlpha = alpha;
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
     * Darken a hex color
     */
    darkenColor(hex, amount) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse RGB
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        // Darken
        r = Math.floor(r * (1 - amount));
        g = Math.floor(g * (1 - amount));
        b = Math.floor(b * (1 - amount));

        // Convert back to hex
        return '#' +
            r.toString(16).padStart(2, '0') +
            g.toString(16).padStart(2, '0') +
            b.toString(16).padStart(2, '0');
    }
}

export default VisualEffects;
