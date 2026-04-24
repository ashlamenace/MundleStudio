/**
 * Base Entity class
 */

import { Utils } from '../core/Utils.js';

export class Entity {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;

        // Movement
        this.vx = 0;
        this.vy = 0;
        this.speed = 100;

        // Health
        this.maxHealth = 100;
        this.health = this.maxHealth;

        // State
        this.destroyed = false;
        this.type = 'entity';

        // Collision
        this.solid = true;
        this.collisionRadius = 16;

        // Visuals
        this.color = '#ffffff';
        this.flashTimer = 0;
    }

    /**
     * Update entity (override in subclasses)
     */
    update(deltaTime) {
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Update flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }
    }

    /**
     * Render entity (override in subclasses)
     */
    render(ctx) {
        // Default rendering - simple rectangle
        ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
    }

    /**
     * Take damage
     */
    takeDamage(amount, source = null) {
        this.health -= amount;
        this.flashTimer = 0.1;

        // Spawn damage particles
        this.spawnDamageParticles(amount);

        if (this.health <= 0) {
            this.die();
        }
    }

    /**
     * Spawn damage number particles
     */
    spawnDamageParticles(amount) {
        this.game.addParticle({
            x: this.x,
            y: this.y - this.height / 2,
            vx: Utils.randomFloat(-20, 20),
            vy: -50,
            text: `-${Math.floor(amount)}`,
            color: '#ff4444',
            lifetime: 1,
            age: 0,
            destroyed: false,
            update(dt) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.vy += 50 * dt; // Gravity
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = `rgba(255, 68, 68, ${alpha})`;
                ctx.font = 'bold 14px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
            }
        });
    }

    /**
     * Called when health reaches 0
     */
    die() {
        this.destroyed = true;
    }

    /**
     * Heal entity
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Get collision bounds
     */
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check collision with another entity
     */
    collidesWith(other) {
        return Utils.circleCollision(
            this.x, this.y, this.collisionRadius,
            other.x, other.y, other.collisionRadius
        );
    }

    /**
     * Get distance to another entity
     */
    distanceTo(other) {
        return Utils.distance(this.x, this.y, other.x, other.y);
    }

    /**
     * Get angle to another entity
     */
    angleTo(other) {
        return Utils.angle(this.x, this.y, other.x, other.y);
    }
}

export default Entity;
