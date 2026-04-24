/**
 * Cave Entrance - Portal to cave dungeons
 */

import { Entity } from './Entity.js';
import { Utils } from '../core/Utils.js';

export class CaveEntrance extends Entity {
    constructor(game, x, y, difficulty = 1) {
        super(game, x, y);

        this.type = 'caveEntrance';
        this.width = 64;
        this.height = 64;
        this.collisionRadius = 32;
        this.solid = false; // Can walk through

        this.difficulty = difficulty; // 1-5, affects loot and enemies
        this.interactionRange = 50;

        // Stable ID used to match the same cave across all clients
        this._id = `cave_${Math.round(x)}_${Math.round(y)}_d${difficulty}`;

        // Visual animation
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.particleTimer = 0;

        // Cooldown after exiting
        this.enterCooldown = 0;
    }

    update(deltaTime) {
        if (this.game._backgroundOverworldSimulation) {
            if (this.enterCooldown > 0) {
                this.enterCooldown -= deltaTime;
            }
            return;
        }

        // Animation
        this.pulsePhase += deltaTime * 2;

        // Particle effects
        this.particleTimer += deltaTime;
        if (this.particleTimer > 0.3) {
            this.particleTimer = 0;
            this.spawnAmbientParticle();
        }

        // Cooldown
        if (this.enterCooldown > 0) {
            this.enterCooldown -= deltaTime;
        }

        // Check for player interaction
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);

        if (dist < this.interactionRange &&
            this.game.canProcessWorldInteractionInput?.() &&
            this.game.input.isActionJustPressed('interact')) {
            if (this.enterCooldown <= 0) {
                this.enterCave();
            }
        }
    }

    /**
     * Enter the cave dungeon
     */
    enterCave() {
        if (!this.game.canProcessWorldInteractionInput?.() || this.game.inCave) return;
        this.game.showLoadingScreen('Entering Cave...', () => {
            this.game.enterCave(this.difficulty, this);
        });
    }

    /**
     * Spawn floating crystal particle
     */
    spawnAmbientParticle() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 15;

        this.game.addParticle({
            x: this.x + Math.cos(angle) * dist,
            y: this.y + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 20,
            vy: -30 - Math.random() * 20,
            lifetime: 1.5,
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
                const size = 3 * (1 - this.age / this.lifetime);
                ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const pulse = Math.sin(this.pulsePhase) * 0.2;

        // Outer glow
        const glowRadius = 50 + pulse * 20;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        gradient.addColorStop(0, 'rgba(0, 100, 150, 0.6)');
        gradient.addColorStop(0.5, 'rgba(0, 50, 100, 0.3)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Cave entrance (dark hole)
        ctx.fillStyle = '#0a0a1a';
        ctx.strokeStyle = '#333344';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 5, 28, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rock frame around entrance
        ctx.fillStyle = '#4a4a5a';
        ctx.strokeStyle = '#3a3a4a';
        ctx.lineWidth = 2;

        // Top rocks
        const rocks = [
            { x: -25, y: -18, w: 15, h: 12 },
            { x: -12, y: -22, w: 18, h: 10 },
            { x: 5, y: -20, w: 14, h: 12 },
            { x: 18, y: -16, w: 12, h: 10 },
            { x: -30, y: -5, w: 10, h: 15 },
            { x: 24, y: -8, w: 12, h: 18 }
        ];

        for (const rock of rocks) {
            ctx.beginPath();
            ctx.moveTo(rock.x, rock.y);
            ctx.lineTo(rock.x + rock.w, rock.y + 2);
            ctx.lineTo(rock.x + rock.w - 2, rock.y + rock.h);
            ctx.lineTo(rock.x + 2, rock.y + rock.h - 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Crystal decorations
        const crystalColor = this.getDifficultyColor();
        ctx.fillStyle = crystalColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        // Left crystal
        ctx.beginPath();
        ctx.moveTo(-32, 0);
        ctx.lineTo(-28, -18);
        ctx.lineTo(-24, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right crystal
        ctx.beginPath();
        ctx.moveTo(32, 2);
        ctx.lineTo(30, -15);
        ctx.lineTo(26, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Difficulty indicator (stars)
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        const stars = '★'.repeat(this.difficulty);
        ctx.fillText(stars, 0, -32);

        // Interaction hint
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);
        if (dist < this.interactionRange * 1.5) {
            const alpha = 1 - (dist / (this.interactionRange * 1.5));
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.font = 'bold 12px Rajdhani';
            ctx.fillText('[E] Enter Cave', 0, 40);
        }

        ctx.restore();
    }

    /**
     * Get color based on difficulty
     */
    getDifficultyColor() {
        const colors = [
            '#66ff66', // Easy - green
            '#66ffff', // Normal - cyan
            '#ffff66', // Medium - yellow
            '#ff9966', // Hard - orange
            '#ff66ff'  // Very Hard - magenta
        ];
        return colors[Math.min(this.difficulty - 1, colors.length - 1)];
    }
}

export default CaveEntrance;
