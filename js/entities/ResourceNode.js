/**
 * Resource nodes that can be harvested
 */

import { Entity } from './Entity.js';
import { Utils } from '../core/Utils.js';
import { spriteManager } from '../core/SpriteManager.js';

const ResourceConfig = {
    wood: {
        name: 'Wood',
        color: '#2d5a27',
        accentColor: '#1a3a17',
        health: 50,
        amount: { min: 3, max: 8 },
        icon: '🪵',
        requiredTier: 1,  // Axe tier 1+
        toolType: 'axe'
    },
    stone: {
        name: 'Stone',
        color: '#6b6b6b',
        accentColor: '#4a4a4a',
        health: 80,
        amount: { min: 2, max: 6 },
        icon: '🪨',
        requiredTier: 1,  // Pickaxe tier 1+
        toolType: 'pickaxe'
    },
    metal: {
        name: 'Metal',
        color: '#8a8a9a',
        accentColor: '#5a5a6a',
        health: 120,
        amount: { min: 1, max: 4 },
        icon: '⚙️',
        requiredTier: 2,  // Pickaxe tier 2+ required
        toolType: 'pickaxe'
    },
    amethyst: {
        name: 'Amethyst',
        color: '#9966cc',
        accentColor: '#6633aa',
        health: 150,
        amount: { min: 1, max: 3 },
        icon: '💜',
        requiredTier: 3,  // Pickaxe tier 3 required
        toolType: 'pickaxe'
    }
};

function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function makeNodeSeed(x, y, resourceType) {
    const px = Math.floor(x * 10);
    const py = Math.floor(y * 10);
    return (Math.imul(px, 73856093) ^ Math.imul(py, 19349663) ^ hashString(resourceType)) >>> 0;
}

function seededRandom(seed, salt = 0) {
    const value = Math.sin((seed + salt + 1) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

export class ResourceNode extends Entity {
    constructor(game, x, y, resourceType = 'wood') {
        super(game, x, y);

        this.type = 'resource';
        this.resourceType = resourceType;

        // Get config
        const config = ResourceConfig[resourceType] || ResourceConfig.wood;
        this.config = config;
        const nodeSeed = makeNodeSeed(x, y, resourceType);

        // Health
        this.maxHealth = config.health;
        this.health = this.maxHealth;

        // Size varies
        this.scale = 0.8 + seededRandom(nodeSeed, 11) * 0.4;
        this.width = 32 * this.scale;
        this.height = 32 * this.scale;
        this.collisionRadius = 16 * this.scale;

        // Resource amount
        const amountRange = Math.max(0, config.amount.max - config.amount.min);
        this.resourceAmount = config.amount.min + Math.floor(seededRandom(nodeSeed, 23) * (amountRange + 1));

        // Visual variation
        this.rotation = seededRandom(nodeSeed, 31) * 0.2 - 0.1;
        this.variation = seededRandom(nodeSeed, 37);

        // Animation
        this.shakeAmount = 0;
        this.glowPhase = seededRandom(nodeSeed, 41) * Math.PI * 2;

        // Cannot be pushed
        this.solid = true;
    }

    update(deltaTime) {
        // Reduce shake
        if (this.shakeAmount > 0) {
            this.shakeAmount *= 0.85;
            if (this.shakeAmount < 0.1) this.shakeAmount = 0;
        }

        // Glow animation for rare resources
        if (this.resourceType === 'metal' || this.resourceType === 'amethyst') {
            this.glowPhase += deltaTime * 2;
        }

        super.update(deltaTime);
    }

    /**
     * Harvest this resource node
     */
    harvest(damage) {
        if (this._takingNetworkDamage) return;
        this.takeDamage(damage);
        this.shakeAmount = 5;
        // Sync HP to other clients (they apply same damage visually)
        if (this._netId) {
            this.game.networkManager?.onResourceHit(this._netId, this.health);
        }

        // Spawn hit particles
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.game.addParticle({
                x: this.x + Utils.randomFloat(-10, 10),
                y: this.y + Utils.randomFloat(-10, 10),
                vx: Math.cos(angle) * 30,
                vy: Math.sin(angle) * 30 - 20,
                color: this.config.color,
                lifetime: 0.4,
                age: 0,
                size: 3,
                destroyed: false,
                update(dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vy += 60 * dt;
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
     * Override die to give resources
     */
    die() {
        // Add resources to player
        const weatherEffects = this.game.dayNight.getWeatherEffects();
        const amount = Math.floor(this.resourceAmount * weatherEffects.resourceBonus);
        this.game.resourceSystem.addResource(this.resourceType, amount);
        this.game.objectiveSystem?.onCollect(this.resourceType, amount);
        this.game.audioSystem?.playCollect?.();

        // Spawn collection particles
        for (let i = 0; i < amount; i++) {
            const delay = i * 0.1;
            setTimeout(() => {
                this.spawnCollectionParticle();
            }, delay * 1000);
        }

        super.die();
    }

    /**
     * Spawn a particle that flies to UI
     */
    spawnCollectionParticle() {
        this.game.addParticle({
            x: this.x,
            y: this.y,
            targetX: 50, // Screen position (resources UI)
            targetY: 50,
            color: this.config.color,
            lifetime: 0.6,
            age: 0,
            destroyed: false,
            update(dt) {
                // Move towards target
                this.x += (this.targetX - this.x) * 0.1;
                this.y += (this.targetY - this.y) * 0.1;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1;
                const size = 8 * (1 - this.age / this.lifetime * 0.5);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        });
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Shake offset
        const shakeX = (Math.random() - 0.5) * this.shakeAmount;
        const shakeY = (Math.random() - 0.5) * this.shakeAmount;
        ctx.translate(shakeX, shakeY);

        // Glow for rare resources
        if (this.resourceType === 'amethyst') {
            const glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.2;
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width);
            gradient.addColorStop(0, `rgba(150, 100, 200, ${glowIntensity})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.width, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.resourceType === 'metal') {
            const glowIntensity = 0.2 + Math.sin(this.glowPhase) * 0.1;
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width * 0.8);
            gradient.addColorStop(0, `rgba(180, 180, 200, ${glowIntensity})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.width * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Render based on type
        switch (this.resourceType) {
            case 'wood':
                this.renderTree(ctx);
                break;
            case 'stone':
                this.renderRock(ctx);
                break;
            case 'metal':
                this.renderOre(ctx, '#8a8a9a', '#aaaacc');
                break;
            case 'amethyst':
                this.renderCrystal(ctx);
                break;
        }

        ctx.restore();

        // Health bar when damaged
        if (this.health < this.maxHealth) {
            this.renderHealthBar(ctx);
        }
    }

    renderTree(ctx) {
        const s = this.scale;

        // Pick a tree sprite variant based on position hash (1-4)
        const variant = ((Math.floor(this.x / 32) * 7 + Math.floor(this.y / 32) * 13) & 3) + 1;
        const treeKey = `deco_tree${variant}`;
        const treeSpr = spriteManager.get(treeKey);

        if (treeSpr) {
            // Tree1/Tree2: 1536×256 → 6 frames of 256×256
            // Tree3/Tree4: 1536×192 → 8 frames of 192×192
            const frameW = (variant <= 2) ? 256 : 192;
            const frameH = (variant <= 2) ? 256 : 192;
            // Display: scale frame to 64×64, centered with feet near y=0
            const dw = 64 * s;
            const dh = 64 * s;
            ctx.drawImage(treeSpr, 0, 0, frameW, frameH, -dw / 2, -dh * 0.85, dw, dh);
            return;
        }

        // Fallback: procedural tree
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(-4 * s, 0, 8 * s, 20 * s);
        ctx.fillStyle = this.config.color;
        ctx.strokeStyle = this.config.accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -25 * s);
        ctx.lineTo(18 * s, 5 * s);
        ctx.lineTo(-18 * s, 5 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -35 * s);
        ctx.lineTo(12 * s, -10 * s);
        ctx.lineTo(-12 * s, -10 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderRock(ctx) {
        const s = this.scale;

        // Pick rock variant
        const variant = ((Math.floor(this.x / 32) * 11 + Math.floor(this.y / 32) * 7) & 3) + 1;
        const rockSpr = spriteManager.get(`deco_rock${variant}`);
        if (rockSpr) {
            // Rock1-4.png are 64×64 single images
            const dw = 48 * s;
            const dh = 48 * s;
            ctx.drawImage(rockSpr, -dw / 2, -dh / 2, dw, dh);
            return;
        }

        ctx.fillStyle = this.config.color;
        ctx.strokeStyle = this.config.accentColor;
        ctx.lineWidth = 2;

        // Irregular polygon
        ctx.beginPath();
        ctx.moveTo(-12 * s, 8 * s);
        ctx.lineTo(-14 * s, -2 * s);
        ctx.lineTo(-6 * s, -12 * s);
        ctx.lineTo(8 * s, -10 * s);
        ctx.lineTo(14 * s, 0);
        ctx.lineTo(10 * s, 10 * s);
        ctx.lineTo(0, 12 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(-8 * s, -4 * s);
        ctx.lineTo(-4 * s, -10 * s);
        ctx.lineTo(2 * s, -8 * s);
        ctx.lineTo(0, -2 * s);
        ctx.closePath();
        ctx.fill();
    }

    renderOre(ctx, color, highlight) {
        const s = this.scale;

        // Try to use gold stone sprite for ore
        const oreSpr = spriteManager.get('gold_stone3');
        if (oreSpr) {
            // Gold Stone 3 is 128×128 — render at 48×48
            const dw = 48 * s;
            const dh = 48 * s;
            ctx.drawImage(oreSpr, -dw / 2, -dh / 2, dw, dh);
            return;
        }

        // Fallback: Base rock
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(-14 * s, 6 * s);
        ctx.lineTo(-10 * s, -8 * s);
        ctx.lineTo(6 * s, -10 * s);
        ctx.lineTo(14 * s, 2 * s);
        ctx.lineTo(8 * s, 10 * s);
        ctx.closePath();
        ctx.fill();

        // Metal veins
        ctx.fillStyle = color;
        ctx.strokeStyle = highlight;
        ctx.lineWidth = 1;

        // Multiple ore chunks
        ctx.beginPath();
        ctx.arc(-4 * s, -4 * s, 5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(4 * s, 2 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-2 * s, 4 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    renderCrystal(ctx) {
        const s = this.scale;

        // Try to use gold stone sprite with purple tint for amethyst
        const crystalSpr = spriteManager.get('gold_stone5');
        if (crystalSpr) {
            const dw = 52 * s;
            const dh = 52 * s;
            // Draw base sprite
            ctx.drawImage(crystalSpr, -dw / 2, -dh / 2, dw, dh);
            // Purple tint overlay
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgba(160, 100, 220, 0.6)';
            ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
            ctx.globalCompositeOperation = 'source-over';
            return;
        }

        // Fallback: procedural crystals
        // Base
        ctx.fillStyle = '#3a2a4a';
        ctx.beginPath();
        ctx.ellipse(0, 8 * s, 12 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crystal spikes
        const crystals = [
            { x: -6, y: 0, h: 20, w: 6 },
            { x: 0, y: -2, h: 28, w: 8 },
            { x: 5, y: 2, h: 18, w: 5 },
            { x: -2, y: 4, h: 14, w: 4 }
        ];

        for (const c of crystals) {
            // Back face
            ctx.fillStyle = this.config.accentColor;
            ctx.beginPath();
            ctx.moveTo(c.x * s, c.y * s + 5);
            ctx.lineTo((c.x - c.w / 2) * s, (c.y - c.h / 3) * s);
            ctx.lineTo(c.x * s, (c.y - c.h) * s);
            ctx.closePath();
            ctx.fill();

            // Front face
            ctx.fillStyle = this.config.color;
            ctx.beginPath();
            ctx.moveTo(c.x * s, c.y * s + 5);
            ctx.lineTo((c.x + c.w / 2) * s, (c.y - c.h / 3) * s);
            ctx.lineTo(c.x * s, (c.y - c.h) * s);
            ctx.closePath();
            ctx.fill();

            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.moveTo(c.x * s, (c.y - c.h + 5) * s);
            ctx.lineTo((c.x + c.w / 4) * s, (c.y - c.h / 2) * s);
            ctx.lineTo(c.x * s, (c.y - c.h / 3) * s);
            ctx.closePath();
            ctx.fill();
        }
    }

    renderHealthBar(ctx) {
        const barWidth = 30;
        const barHeight = 4;
        const x = this.x - barWidth / 2;
        const y = this.y - this.height - 5;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = this.config.color;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    }
}

export default ResourceNode;
