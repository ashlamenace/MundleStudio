/**
 * Event System - Random world events during the day phase
 * Events trigger every 3-4 in-game days to add variety
 */

import { Enemy } from '../entities/Enemy.js';
import { TreasureChest } from '../entities/TreasureChest.js';
import { Utils } from '../core/Utils.js';

// Event definitions
const EVENT_TYPES = {
    meteorite: {
        name: 'Météorite',
        icon: '☄️',
        color: '#ff8844',
        description: 'Une météorite s\'est écrasée ! Récoltez les minerais avant que les ennemis arrivent.',
        minDay: 2
    },
    caravan: {
        name: 'Caravane Marchande',
        icon: '🛒',
        color: '#44ff88',
        description: 'Une caravane passe ! Approchez-vous pour échanger des ressources.',
        minDay: 1
    },
    raidsurprise: {
        name: 'Raid Surprise',
        icon: '⚠️',
        color: '#ff4444',
        description: 'Des ennemis attaquent en plein jour !',
        minDay: 3
    },
    earthquake: {
        name: 'Tremblement de Terre',
        icon: '🌍',
        color: '#aa8844',
        description: 'Le sol tremble ! De nouveaux passages se sont ouverts.',
        minDay: 4
    }
};

export class EventSystem {
    constructor(game) {
        this.game = game;

        this.activeEvent = null;
        this.eventTimer = 0;
        this.eventDuration = 60; // seconds
        this.nextEventDay = 3 + Math.floor(Math.random() * 2); // Day 3 or 4

        // Track spawned entities for cleanup
        this.eventEntities = [];

        // Caravan trade state
        this.caravanNPC = null;
        this.caravanTradeAvailable = true;
    }

    /**
     * Called each fixed update during day phase
     */
    update(dt, currentDay) {
        // Try to trigger an event
        if (!this.activeEvent && currentDay >= this.nextEventDay) {
            this.triggerRandomEvent(currentDay);
        }

        // Update active event
        if (this.activeEvent) {
            this.eventTimer += dt;

            this._updateEvent(dt);

            // End event after duration
            if (this.eventTimer >= this.eventDuration) {
                this._endEvent();
            }
        }
    }

    triggerRandomEvent(currentDay) {
        const available = Object.keys(EVENT_TYPES).filter(
            type => currentDay >= EVENT_TYPES[type].minDay
        );
        const type = Utils.randomElement(available);
        this._startEvent(type);
    }

    _startEvent(type) {
        this.activeEvent = type;
        this.eventTimer = 0;

        const def = EVENT_TYPES[type];
        this.game.showNotification(def.icon + ' ' + def.name.toUpperCase(), def.description, def.color, 4);

        switch (type) {
            case 'meteorite':   this._spawnMeteoriteEvent(); break;
            case 'caravan':     this._spawnCaravanEvent(); break;
            case 'raidsurprise':this._spawnRaidEvent(); break;
            case 'earthquake':  this._spawnEarthquakeEvent(); break;
        }
    }

    _updateEvent(dt) {
        if (this.activeEvent === 'caravan' && this.caravanNPC) {
            // Caravan moves slowly across the map
            this.caravanNPC.x += dt * 30;
            this.caravanNPC.y += dt * 5;

            // Check player proximity for trade
            const player = this.game.player;
            const dist = Utils.distance(this.caravanNPC.x, this.caravanNPC.y, player.x, player.y);
            if (dist < 60 &&
                this.caravanTradeAvailable &&
                this.game.canProcessWorldInteractionInput?.() &&
                this.game.input.isActionJustPressed('interact')) {
                this._doCaravanTrade();
            }
        }
    }

    _endEvent() {
        // Clean up event entities
        for (const entity of this.eventEntities) {
            if (!entity.destroyed) entity.destroyed = true;
        }
        this.eventEntities = [];
        this.caravanNPC = null;
        this.caravanTradeAvailable = true;
        this.activeEvent = null;

        // Schedule next event
        this.nextEventDay = this.game.survivalDays + 3 + Math.floor(Math.random() * 2);
    }

    // --- Meteorite Event ---
    _spawnMeteoriteEvent() {
        const player = this.game.player;
        // Land 400-700px from player in a random direction
        const angle = Math.random() * Math.PI * 2;
        const dist = 400 + Math.random() * 300;
        const x = Utils.clamp(player.x + Math.cos(angle) * dist, 200, this.game.world.width - 200);
        const y = Utils.clamp(player.y + Math.sin(angle) * dist, 200, this.game.world.height - 200);

        // Rare impact accent.
        this.game.camera.shake(10, 0.45);

        // Spawn a chest (meteorite loot) at crash site
        const chest = new TreasureChest(this.game, x, y, 'rare');
        this.game.addEntity(chest);
        this.eventEntities.push(chest);

        // Spawn a few metal resource drops
        for (let i = 0; i < 3; i++) {
            this.game.resourceSystem.addResource('metal', Utils.randomInt(5, 12));
        }

        // Spawn enemies attracted to the crash site
        for (let i = 0; i < 6; i++) {
            const spawnAngle = (Math.PI * 2 / 6) * i;
            const spawnDist = 200;
            const enemy = new Enemy(
                this.game,
                x + Math.cos(spawnAngle) * spawnDist,
                y + Math.sin(spawnAngle) * spawnDist,
                Utils.randomElement(['grunt', 'speeder', 'tank'])
            );
            this.game.addEntity(enemy);
            this.eventEntities.push(enemy);
        }

        // Visual: impact particles
        for (let i = 0; i < 30; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 120;
            this.game.addParticle({
                x, y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd - 80,
                color: i % 3 === 0 ? '#ff6600' : '#ffaa44',
                lifetime: 1 + Math.random(),
                age: 0, size: 4 + Math.random() * 6, destroyed: false,
                update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vy += 150 * dt; this.vx *= 0.98; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
                render(ctx) {
                    ctx.globalAlpha = 1 - this.age / this.lifetime;
                    ctx.fillStyle = this.color;
                    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;
                }
            });
        }

        this.game.showFloatingText(x, y - 30, '☄️ IMPACT !', '#ff8844');
    }

    // --- Caravan Event ---
    _spawnCaravanEvent() {
        const world = this.game.world;
        // Start at map edge, move across
        const startX = 100;
        const startY = world.height / 2 + Utils.randomFloat(-200, 200);

        this.caravanNPC = { x: startX, y: startY, destroyed: false };
        this.caravanTradeAvailable = true;
        this.eventDuration = 45; // Caravan stays for 45s
    }

    _doCaravanTrade() {
        const rs = this.game.resourceSystem;
        // Trade: 20 wood → 5 metal
        if (rs.hasResources({ wood: 20 })) {
            rs.spendResources({ wood: 20 });
            rs.addResource('metal', 5);
            this.game.showFloatingText(
                this.caravanNPC.x, this.caravanNPC.y - 30,
                '20 Bois → 5 Métal', '#44ff88'
            );
            this.game.audioSystem?.playCollect();
        } else {
            this.game.showFloatingText(
                this.caravanNPC.x, this.caravanNPC.y - 30,
                'Pas assez de bois !', '#ff4444'
            );
        }
        this.caravanTradeAvailable = false;
        // Re-enable trade after 10s
        setTimeout(() => { this.caravanTradeAvailable = true; }, 10000);
    }

    // --- Surprise Raid Event ---
    _spawnRaidEvent() {
        const player = this.game.player;
        const waveNum = Math.max(1, this.game.waveSystem.currentWave);
        const count = 6 + Math.floor(waveNum * 0.5);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 350 + Math.random() * 150;
            const x = Utils.clamp(player.x + Math.cos(angle) * dist, 100, this.game.world.width - 100);
            const y = Utils.clamp(player.y + Math.sin(angle) * dist, 100, this.game.world.height - 100);
            const type = Utils.randomElement(['grunt', 'speeder', 'bomber', 'scorpion']);
            const enemy = new Enemy(this.game, x, y, type);
            this.game.addEntity(enemy);
            this.eventEntities.push(enemy);
        }

        this.eventDuration = 30; // Raid ends after 30s or all enemies dead
    }

    // --- Earthquake Event ---
    _spawnEarthquakeEvent() {
        this.game.camera.shake(12, 0.8);

        // Reveal some bonus resources (add metal/amethyst drops)
        const player = this.game.player;
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i;
            const dist = 200 + Math.random() * 400;
            const x = Utils.clamp(player.x + Math.cos(angle) * dist, 100, this.game.world.width - 100);
            const y = Utils.clamp(player.y + Math.sin(angle) * dist, 100, this.game.world.height - 100);

            const chest = new TreasureChest(this.game, x, y, 'uncommon');
            this.game.addEntity(chest);
            this.eventEntities.push(chest);
        }

        // Visual: screen rumble particles
        for (let i = 0; i < 20; i++) {
            const x = player.x + Utils.randomFloat(-400, 400);
            const y = player.y + Utils.randomFloat(-400, 400);
            this.game.addParticle({
                x, y, vx: 0, vy: -60,
                color: '#8b6914',
                lifetime: 0.8, age: 0, size: 8 + Math.random() * 8, destroyed: false,
                update(dt) { this.y += this.vy * dt; this.vy += 200 * dt; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
                render(ctx) {
                    ctx.globalAlpha = 1 - this.age / this.lifetime;
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                    ctx.globalAlpha = 1;
                }
            });
        }

        this.eventDuration = 10;
    }

    /**
     * Render caravan NPC if active
     */
    render(ctx) {
        if (this.activeEvent === 'caravan' && this.caravanNPC) {
            const npc = this.caravanNPC;
            ctx.save();
            ctx.translate(npc.x, npc.y);

            // Cart body
            ctx.fillStyle = '#8b6914';
            ctx.strokeStyle = '#5c4010';
            ctx.lineWidth = 2;
            ctx.fillRect(-24, -12, 48, 24);
            ctx.strokeRect(-24, -12, 48, 24);

            // Wheels
            ctx.fillStyle = '#444';
            [-16, 16].forEach(wx => {
                ctx.beginPath(); ctx.arc(wx, 12, 8, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.stroke();
            });

            // Goods
            ctx.fillStyle = '#228b22';
            ctx.fillRect(-18, -20, 36, 10);

            // Icon
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🛒', 0, -16);

            // Interaction hint
            const player = this.game.player;
            const dist = Utils.distance(npc.x, npc.y, player.x, player.y);
            if (dist < 100) {
                const alpha = 1 - dist / 100;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#44ff88';
                ctx.font = 'bold 11px Rajdhani';
                ctx.fillText('[E] Échanger (20 Bois → 5 Métal)', 0, -35);
                ctx.globalAlpha = 1;
            }

            ctx.restore();
        }
    }
}

export default EventSystem;
