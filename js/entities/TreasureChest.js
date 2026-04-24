/**
 * Treasure Chest - Contains random loot
 */

import { Entity } from './Entity.js';
import { Utils } from '../core/Utils.js';

// Loot tables based on chest tier
const LootTables = {
    common: [
        { type: 'resource', resource: 'wood', min: 10, max: 25, weight: 30 },
        { type: 'resource', resource: 'stone', min: 8, max: 20, weight: 30 },
        { type: 'resource', resource: 'metal', min: 3, max: 8, weight: 20 },
        { type: 'heal', amount: 30, weight: 20 }
    ],
    uncommon: [
        { type: 'resource', resource: 'wood', min: 20, max: 40, weight: 20 },
        { type: 'resource', resource: 'stone', min: 15, max: 35, weight: 20 },
        { type: 'resource', resource: 'metal', min: 8, max: 18, weight: 25 },
        { type: 'resource', resource: 'amethyst', min: 2, max: 6, weight: 15 },
        { type: 'heal', amount: 50, weight: 10 },
        { type: 'xp', amount: 50, weight: 10 }
    ],
    rare: [
        { type: 'resource', resource: 'metal', min: 15, max: 30, weight: 25 },
        { type: 'resource', resource: 'amethyst', min: 5, max: 12, weight: 30 },
        { type: 'heal', amount: 100, weight: 10 },
        { type: 'xp', amount: 150, weight: 15 },
        { type: 'skillPoint', amount: 1, weight: 10 },
        { type: 'damageBoost', amount: 0.1, duration: 120, weight: 10 }
    ],
    legendary: [
        { type: 'resource', resource: 'amethyst', min: 15, max: 30, weight: 25 },
        { type: 'xp', amount: 300, weight: 20 },
        { type: 'skillPoint', amount: 2, weight: 15 },
        { type: 'maxHealthBoost', amount: 20, weight: 15 },
        { type: 'permanentDamage', amount: 0.05, weight: 15 },
        { type: 'fullHeal', weight: 10 }
    ]
};

export class TreasureChest extends Entity {
    constructor(game, x, y, tier = 'common') {
        super(game, x, y);

        this.type = 'chest';
        this.width = 32;
        this.height = 28;
        this.collisionRadius = 16;
        this.solid = false;

        this.tier = tier;
        this.isOpen = false;
        this.interactionRange = 40;

        // Animation
        this.shimmerPhase = Math.random() * Math.PI * 2;
        this.openAnimation = 0;
    }

    update(deltaTime) {
        if (this.isOpen) {
            // Open animation
            if (this.openAnimation < 1) {
                this.openAnimation += deltaTime * 3;
            }
            return;
        }

        // Shimmer effect
        this.shimmerPhase += deltaTime * 3;

        // Check for player interaction
        const player = this.game.player;
        const dist = Utils.distance(this.x, this.y, player.x, player.y);

        if (dist < this.interactionRange &&
            this.game.canProcessWorldInteractionInput?.() &&
            this.game.input.isActionJustPressed('interact')) {
            this.open();
        }
    }

    /**
     * Open the chest and give loot
     */
    open() {
        if (this.isOpen) return;

        this.isOpen = true;

        // Get loot from table
        const loot = this.rollLoot();

        // Apply loot
        this.applyLoot(loot);

        // Spawn loot particles
        this.spawnLootParticles(loot);
    }

    /**
     * Roll for loot based on tier
     */
    rollLoot() {
        const table = LootTables[this.tier] || LootTables.common;
        const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);

        let roll = Math.random() * totalWeight;
        for (const item of table) {
            roll -= item.weight;
            if (roll <= 0) {
                // Create loot object
                const loot = { ...item };
                if (loot.min !== undefined && loot.max !== undefined) {
                    loot.amount = Utils.randomInt(loot.min, loot.max);
                }
                return loot;
            }
        }

        return table[0];
    }

    /**
     * Apply loot to player
     */
    applyLoot(loot) {
        const player = this.game.player;

        switch (loot.type) {
            case 'resource':
                this.game.resourceSystem.addResource(loot.resource, loot.amount);
                break;
            case 'heal':
                player.heal(loot.amount);
                break;
            case 'fullHeal':
                player.health = player.maxHealth;
                break;
            case 'xp':
                this.giveXP(loot.amount);
                break;
            case 'skillPoint':
                player.skillPoints += loot.amount;
                break;
            case 'maxHealthBoost':
                player.maxHealth += loot.amount;
                player.health += loot.amount;
                break;
            case 'permanentDamage':
                player.damageMultiplier += loot.amount;
                break;
            case 'damageBoost':
                player.damageMultiplier += loot.amount;
                setTimeout(() => {
                    player.damageMultiplier -= loot.amount;
                }, loot.duration * 1000);
                break;
        }
    }

    /**
     * Give XP and handle level up
     */
    giveXP(amount) {
        const player = this.game.player;
        player.xp += amount;

        // Check for level up
        const xpNeeded = player.level * 100;
        while (player.xp >= xpNeeded) {
            player.xp -= xpNeeded;
            player.level++;
            player.skillPoints++;

            // Level up bonuses
            player.maxHealth += 10;
            player.health = player.maxHealth;
            player.damageMultiplier += 0.05;

            // Level up effect
            this.spawnLevelUpEffect();
        }
    }

    /**
     * Spawn level up visual effect
     */
    spawnLevelUpEffect() {
        const player = this.game.player;

        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            this.game.addParticle({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * 80,
                vy: Math.sin(angle) * 80 - 50,
                color: '#ffcc00',
                lifetime: 1,
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
                    ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Text particle
        this.game.addParticle({
            x: player.x,
            y: player.y - 30,
            vy: -30,
            text: 'LEVEL UP!',
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
                const scale = 1 + this.age * 0.5;
                ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
                ctx.font = `bold ${16 * scale}px Orbitron`;
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
            }
        });
    }

    /**
     * Spawn particles showing what was looted
     */
    spawnLootParticles(loot) {
        let text = '';
        let color = '#ffffff';

        switch (loot.type) {
            case 'resource':
                const icons = { wood: '🪵', stone: '🪨', metal: '⚙️', amethyst: '💜' };
                text = `+${loot.amount} ${icons[loot.resource] || ''}`;
                color = '#88ff88';
                break;
            case 'heal':
            case 'fullHeal':
                text = loot.type === 'fullHeal' ? '❤️ Full Heal!' : `+${loot.amount} HP`;
                color = '#ff8888';
                break;
            case 'xp':
                text = `+${loot.amount} XP`;
                color = '#ffcc00';
                break;
            case 'skillPoint':
                text = `+${loot.amount} Skill Point!`;
                color = '#ff88ff';
                break;
            case 'maxHealthBoost':
                text = `+${loot.amount} Max HP!`;
                color = '#ff4444';
                break;
            case 'permanentDamage':
                text = `+${Math.round(loot.amount * 100)}% Damage!`;
                color = '#ff8800';
                break;
        }

        this.game.addParticle({
            x: this.x,
            y: this.y - 20,
            vy: -40,
            text: text,
            color: color,
            lifetime: 2,
            age: 0,
            destroyed: false,
            update(dt) {
                this.y += this.vy * dt;
                this.vy *= 0.95;
                this.age += dt;
                if (this.age >= this.lifetime) this.destroyed = true;
            },
            render(ctx) {
                const alpha = 1 - this.age / this.lifetime;
                ctx.fillStyle = this.color;
                ctx.globalAlpha = alpha;
                ctx.font = 'bold 14px Rajdhani';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1;
            }
        });
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const tierColors = {
            common: { main: '#8b4513', trim: '#5c3a21', glow: 'rgba(200, 150, 50, 0.3)' },
            uncommon: { main: '#228b22', trim: '#165016', glow: 'rgba(50, 200, 50, 0.3)' },
            rare: { main: '#4169e1', trim: '#2a4a9a', glow: 'rgba(50, 100, 255, 0.5)' },
            legendary: { main: '#ffd700', trim: '#cc9900', glow: 'rgba(255, 200, 0, 0.6)' }
        };

        const colors = tierColors[this.tier] || tierColors.common;

        // Glow effect
        if (!this.isOpen) {
            const shimmer = Math.sin(this.shimmerPhase) * 0.3 + 0.7;
            const glowSize = 30 + Math.sin(this.shimmerPhase) * 5;
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            gradient.addColorStop(0, colors.glow);
            gradient.addColorStop(1, 'transparent');
            ctx.globalAlpha = shimmer;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Chest body
        ctx.fillStyle = colors.main;
        ctx.strokeStyle = colors.trim;
        ctx.lineWidth = 2;
        ctx.fillRect(-16, -6, 32, 18);
        ctx.strokeRect(-16, -6, 32, 18);

        // Chest lid
        const lidAngle = this.isOpen ? -Math.PI / 3 * Math.min(1, this.openAnimation) : 0;
        ctx.save();
        ctx.translate(0, -6);
        ctx.rotate(lidAngle);

        ctx.fillStyle = colors.main;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-14, -10);
        ctx.lineTo(14, -10);
        ctx.lineTo(16, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Lock/clasp
        if (!this.isOpen) {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-4, -2, 8, 6);
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(0, 1, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shine effect on closed chest
        if (!this.isOpen) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.sin(this.shimmerPhase) * 0.1})`;
            ctx.beginPath();
            ctx.moveTo(-12, -4);
            ctx.lineTo(-8, -4);
            ctx.lineTo(-10, 2);
            ctx.lineTo(-14, 2);
            ctx.closePath();
            ctx.fill();
        }

        // Interaction hint
        if (!this.isOpen) {
            const player = this.game.player;
            const dist = Utils.distance(this.x, this.y, player.x, player.y);
            if (dist < this.interactionRange * 1.5) {
                const alpha = 1 - (dist / (this.interactionRange * 1.5));
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.font = 'bold 10px Rajdhani';
                ctx.textAlign = 'center';
                ctx.fillText('[E] Open', 0, 25);
            }
        }

        ctx.restore();
    }
}

export default TreasureChest;
