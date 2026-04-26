/**
 * Crystal - The central entity to protect
 */

import { Entity } from './Entity.js';
import { Utils } from '../core/Utils.js';
import { spriteManager } from '../core/SpriteManager.js';

export class Crystal extends Entity {
    constructor(game, x, y, options = {}) {
        super(game, x, y);

        this.type = 'crystal';
        this.width = 48;
        this.height = 64;
        this.collisionRadius = 24;

        // High health
        this.maxHealth = 800;
        this.health = this.maxHealth;

        // Passive regen
        this.regenRate = 1; // 1 HP/sec
        this.regenTimer = 0;

        // Animation
        this.pulsePhase = 0;
        this.glowIntensity = 1;
        this.rotationAngle = 0;

        // Particles
        this.particleTimer = 0;

        // Cannot move
        this.solid = true;
        this.ownerSlot = options.ownerSlot ?? null;
        this.isLocalCrystal = options.isLocalCrystal ?? true;
        this.crystalStyleColor = options.color ?? null;
        this._destructionTriggered = false;
    }

    update(deltaTime) {
        // Pulsing animation
        this.pulsePhase += deltaTime * 2;
        this.glowIntensity = 0.8 + Math.sin(this.pulsePhase) * 0.2;

        // Slow rotation
        this.rotationAngle += deltaTime * 0.3;

        // Passive regen
        if (this.health < this.maxHealth) {
            this.regenTimer += deltaTime;
            if (this.regenTimer >= 1) {
                this.regenTimer = 0;
                this.health = Math.min(this.maxHealth, this.health + this.regenRate);
            }
        }

        // Spawn ambient particles
        this.particleTimer += deltaTime;
        if (this.particleTimer > 0.2) {
            this.particleTimer = 0;
            this.spawnAmbientParticle();
        }

        // Flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }
    }

    /**
     * Spawn floating particle
     */
    spawnAmbientParticle() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 20;

        this.game.addParticle({
            x: this.x + Math.cos(angle) * dist,
            y: this.y + Math.sin(angle) * dist,
            vy: -20 - Math.random() * 20,
            lifetime: 1 + Math.random(),
            age: 0,
            size: 2 + Math.random() * 3,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                const hue = 280 + Math.sin(this.age * 5) * 20;
                ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha * 0.7})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * (1 - this.age / this.lifetime), 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    takeDamage(amount, source) {
        super.takeDamage(amount, source);

        // Spawn damage burst
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.game.addParticle({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 100,
                vy: Math.sin(angle) * 100 - 50,
                lifetime: 0.5,
                age: 0,
                destroyed: false,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vy += 200 * dt;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - this.age / this.lifetime;
                    ctx.fillStyle = `rgba(200, 100, 255, ${alpha})`;
                    Utils.drawDiamond(ctx, this.x, this.y, 8, 12);
                    ctx.fill();
                }
            });
        }
    }

    triggerDestruction() {
        if (this._destructionTriggered) return;
        this._destructionTriggered = true;

        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 110 + Math.random() * 120;
            this.game.addParticle({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                lifetime: 0.7 + Math.random() * 0.4,
                age: 0,
                destroyed: false,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vy += 180 * dt;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - this.age / this.lifetime;
                    ctx.fillStyle = `rgba(220, 180, 255, ${alpha})`;
                    Utils.drawDiamond(ctx, this.x, this.y, 7, 10);
                    ctx.fill();
                }
            });
        }

        if (this.isLocalCrystal) {
            this.game.camera.shake(10, 0.3);
        }
    }

    render(ctx) {
        const upSys  = this.isLocalCrystal ? this.game.crystalUpgradeSystem : null;
        const lvl    = upSys ? upSys.level : 0;
        // Scale: 1.0 at lvl0 → 1.5 at lvl5
        const scale  = 1.0 + lvl * 0.1;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Glow grows with level
        const glowRadius = (60 + lvl * 15) * this.glowIntensity;
        const baseColor  = this._getLevelColor();
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        gradient.addColorStop(0, `rgba(180, 100, 255, ${(0.3 + lvl * 0.06) * this.glowIntensity})`);
        gradient.addColorStop(0.5, `rgba(100, 50, 200, ${0.15 * this.glowIntensity})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting satellite crystals (appears at lvl 2+)
        if (lvl >= 2) {
            const orbitCount = lvl - 1;   // 1 at lvl2, 2 at lvl3, 3 at lvl4, 4 at lvl5
            const orbitR = 38 + lvl * 4;
            for (let i = 0; i < orbitCount; i++) {
                const angle = this.rotationAngle * 1.4 + (Math.PI * 2 / orbitCount) * i;
                const sx = Math.cos(angle) * orbitR;
                const sy = Math.sin(angle) * orbitR;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(angle + Math.PI / 4);
                ctx.fillStyle = baseColor;
                ctx.globalAlpha = 0.75;
                ctx.beginPath();
                ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0);
                ctx.closePath(); ctx.fill();
                ctx.globalAlpha = 1;
                ctx.restore();
            }
        }

        // Energy rays at lvl 4+
        if (lvl >= 4) {
            const rayCount = lvl === 5 ? 8 : 6;
            ctx.save();
            ctx.rotate(this.rotationAngle * 0.5);
            for (let i = 0; i < rayCount; i++) {
                const a = (Math.PI * 2 / rayCount) * i;
                const len = 45 + Math.sin(this.pulsePhase + i) * 10;
                const alpha = (0.25 + Math.sin(this.pulsePhase * 1.3 + i) * 0.15) * this.glowIntensity;
                ctx.strokeStyle = baseColor;
                ctx.lineWidth = 2;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
                ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Castle sprite as base/throne
        const castleSpr = spriteManager.get('bld_castle');
        if (castleSpr) {
            ctx.globalAlpha = 0.8;
            ctx.drawImage(castleSpr, -40, -20, 80, 64);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = '#2a2a4a';
            ctx.strokeStyle = '#4a4a6a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 20, 30, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Main crystal body — scaled by level
        ctx.save();
        ctx.scale(scale, scale);
        ctx.rotate(this.rotationAngle);

        const crystalColor     = this.flashTimer > 0 ? '#ffffff' : baseColor;
        const crystalHighlight = '#cc99ff';
        const crystalShadow    = '#6633cc';

        // Back facet
        ctx.fillStyle = crystalShadow;
        ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(-18, 0); ctx.lineTo(0, 25);
        ctx.closePath(); ctx.fill();

        // Front facet
        ctx.fillStyle = crystalColor;
        ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(18, 0); ctx.lineTo(0, 25);
        ctx.closePath(); ctx.fill();

        // Center highlight
        ctx.fillStyle = crystalHighlight;
        ctx.beginPath();
        ctx.moveTo(0, -30); ctx.lineTo(8, -5); ctx.lineTo(0, 15); ctx.lineTo(-8, -5);
        ctx.closePath(); ctx.fill();

        // Extra facets at lvl 3+
        if (lvl >= 3) {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = crystalColor;
            ctx.beginPath();
            ctx.moveTo(0, -35); ctx.lineTo(-26, -12); ctx.lineTo(-18, 0);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, -35); ctx.lineTo(26, -12); ctx.lineTo(18, 0);
            ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Inner glow
        const innerGlow = ctx.createRadialGradient(0, -5, 0, 0, -5, 25);
        innerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * this.glowIntensity})`);
        innerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(0, -5, 20, 0, Math.PI * 2);
        ctx.fill();

        // Edge highlights
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * this.glowIntensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(18, 0);
        ctx.moveTo(0, -35); ctx.lineTo(-18, 0);
        ctx.moveTo(0, 25);  ctx.lineTo(18, 0);
        ctx.moveTo(0, 25);  ctx.lineTo(-18, 0);
        ctx.stroke();

        ctx.restore();
        ctx.restore();

        // Health bar
        this.renderHealthBar(ctx);
    }

    renderHealthBar(ctx) {
        const barWidth = 60;
        const barHeight = 8;
        const x = this.x - barWidth / 2;
        const y = this.y + 35;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

        // Health background
        ctx.fillStyle = 'rgba(100, 50, 150, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Health fill
        const healthPercent = this.health / this.maxHealth;
        const gradient = ctx.createLinearGradient(x, y, x + barWidth * healthPercent, y);
        gradient.addColorStop(0, '#9966ff');
        gradient.addColorStop(1, '#cc99ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        // Border
        ctx.strokeStyle = '#cc99ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Health text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${Math.floor(this.health)}/${this.maxHealth}`,
            this.x,
            y + barHeight + 12
        );

        if (!this.isLocalCrystal) return;

        // Crystal upgrade progress (if upgrade system present)
        const upSys = this.game.crystalUpgradeSystem;
        if (!upSys || upSys.isMaxLevel) return;

        // Upgrade progress bar
        const progBarW = 80;
        const progBarH = 5;
        const progX = this.x - progBarW / 2;
        const progY = y + barHeight + 18;
        const progress = upSys.getProgress();

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(progX - 1, progY - 1, progBarW + 2, progBarH + 2);

        ctx.fillStyle = 'rgba(80,40,120,0.6)';
        ctx.fillRect(progX, progY, progBarW, progBarH);

        if (progress > 0) {
            const pg = ctx.createLinearGradient(progX, progY, progX + Math.max(1, progBarW * progress), progY);
            pg.addColorStop(0, '#aa55ff');
            pg.addColorStop(1, '#ffaaff');
            ctx.fillStyle = pg;
            ctx.fillRect(progX, progY, progBarW * progress, progBarH);
        }

        ctx.strokeStyle = '#cc99ff';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(progX, progY, progBarW, progBarH);

        // "E" hint when player is nearby
        const player = this.game.player;
        if (player) {
            const dx = player.x - this.x, dy = player.y - this.y;
            if (dx * dx + dy * dy < 80 * 80) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.beginPath();
                ctx.roundRect(this.x - 42, progY + 9, 84, 14, 4);
                ctx.fill();
                ctx.fillStyle = '#ffdd88';
                ctx.font = 'bold 9px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('[E] Déposer ressources', this.x, progY + 19);
            }
        }
    }

    /** Tinted crystal color based on upgrade level */
    _getLevelColor() {
        if (this.crystalStyleColor) return this.crystalStyleColor;
        const upSys = this.game.crystalUpgradeSystem;
        return upSys ? (upSys.currentData.color ?? '#9966ff') : '#9966ff';
    }
}

export default Crystal;
