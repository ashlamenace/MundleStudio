/**
 * Cave - A procedurally generated dungeon
 */

import { Utils } from '../core/Utils.js';
import { Enemy, EnemyTypes } from '../entities/Enemy.js';
import { TreasureChest } from '../entities/TreasureChest.js';
import { ResourceNode } from '../entities/ResourceNode.js';

// Cave-specific enemy types
export const CaveEnemyTypes = {
    bat: {
        name: 'Bat',
        health: 15,
        speed: 100,
        damage: 3,
        attackSpeed: 0.8,
        color: '#553366',
        size: 16,
        xp: 5
    },
    spider: {
        name: 'Spider',
        health: 35,
        speed: 70,
        damage: 8,
        attackSpeed: 1.2,
        color: '#333333',
        size: 24,
        xp: 10
    },
    golem: {
        name: 'Golem',
        health: 150,
        speed: 25,
        damage: 25,
        attackSpeed: 2.5,
        color: '#666688',
        size: 40,
        xp: 30
    },
    crystalGuardian: {
        name: 'Crystal Guardian',
        health: 300,
        speed: 40,
        damage: 35,
        attackSpeed: 2,
        color: '#9966ff',
        size: 48,
        xp: 100,
        isBoss: true
    }
};

export class Cave {
    constructor(game, difficulty = 1, seed = null) {
        this.game = game;
        this.difficulty = difficulty;

        // Deterministic RNG — mulberry32. When seed is provided (multiplayer),
        // all clients with the same seed produce an identical cave layout.
        {
            let s = (seed ?? Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
            this._rng = () => {
                s = Math.imul(s ^ (s >>> 15), s | 1) ^ (s + Math.imul(s ^ (s >>> 7), s | 61));
                return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
            };
        }

        // Cave dimensions (smaller than overworld)
        this.width = 800 + difficulty * 200;
        this.height = 800 + difficulty * 200;
        this.tileSize = 32;
        this.tilesX = Math.ceil(this.width / this.tileSize);
        this.tilesY = Math.ceil(this.height / this.tileSize);

        // Tile data
        this.tiles = [];

        // Entities in the cave
        this.entities = [];
        this.enemies = [];
        this.chests = [];

        // Exit position
        this.exitX = 0;
        this.exitY = 0;

        // Player spawn position
        this.spawnX = 0;
        this.spawnY = 0;

        // Boss killed flag
        this.bossKilled = false;

        // Generate the cave
        this.generate();
    }

    /**
     * Generate cave layout procedurally
     */
    generate() {
        // Initialize with walls
        for (let y = 0; y < this.tilesY; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.tilesX; x++) {
                this.tiles[y][x] = 1; // Wall
            }
        }

        // Carve rooms using cellular automata
        this.carveRooms();

        // Find spawn position (near entrance)
        this.findSpawnPosition();

        // Place exit
        this.placeExit();

        // Place resources
        this.placeResources();

        // Place enemies
        this.placeEnemies();

        // Place chests
        this.placeChests();

        // Place boss if high difficulty
        if (this.difficulty >= 3) {
            this.placeBoss();
        }
    }

    /**
     * Carve rooms using random walk + cellular automata
     */
    carveRooms() {
        // Random walk to create initial paths
        let x = Math.floor(this.tilesX / 2);
        let y = 2; // Start near top

        const visited = new Set();
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

        for (let i = 0; i < this.tilesX * this.tilesY * 0.4; i++) {
            // Carve current position
            if (x > 1 && x < this.tilesX - 2 && y > 1 && y < this.tilesY - 2) {
                this.tiles[y][x] = 0; // Floor
                this.tiles[y + 1][x] = 0;
                this.tiles[y][x + 1] = 0;
            }

            // Random direction with bias towards unexplored
            const dir = directions[Math.floor(this._rng() * directions.length)];
            x = Math.max(2, Math.min(this.tilesX - 3, x + dir[0]));
            y = Math.max(2, Math.min(this.tilesY - 3, y + dir[1]));
        }

        // Cellular automata smoothing
        for (let iteration = 0; iteration < 3; iteration++) {
            const newTiles = [];
            for (let y = 0; y < this.tilesY; y++) {
                newTiles[y] = [];
                for (let x = 0; x < this.tilesX; x++) {
                    const neighbors = this.countNeighborWalls(x, y);
                    if (neighbors > 4) {
                        newTiles[y][x] = 1; // Become wall
                    } else if (neighbors < 4) {
                        newTiles[y][x] = 0; // Become floor
                    } else {
                        newTiles[y][x] = this.tiles[y][x];
                    }
                }
            }
            this.tiles = newTiles;
        }

        // Ensure border walls
        for (let y = 0; y < this.tilesY; y++) {
            this.tiles[y][0] = 1;
            this.tiles[y][this.tilesX - 1] = 1;
        }
        for (let x = 0; x < this.tilesX; x++) {
            this.tiles[0][x] = 1;
            this.tiles[this.tilesY - 1][x] = 1;
        }
    }

    /**
     * Count wall neighbors for cellular automata
     */
    countNeighborWalls(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= this.tilesX || ny < 0 || ny >= this.tilesY) {
                    count++;
                } else if (this.tiles[ny][nx] === 1) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Find valid spawn position
     */
    findSpawnPosition() {
        for (let y = 2; y < this.tilesY - 2; y++) {
            for (let x = 2; x < this.tilesX - 2; x++) {
                if (this.tiles[y][x] === 0) {
                    this.spawnX = x * this.tileSize + this.tileSize / 2;
                    this.spawnY = y * this.tileSize + this.tileSize / 2;
                    return;
                }
            }
        }
    }

    /**
     * Place exit portal
     */
    placeExit() {
        // Find position far from spawn
        let maxDist = 0;

        for (let y = 2; y < this.tilesY - 2; y++) {
            for (let x = 2; x < this.tilesX - 2; x++) {
                if (this.tiles[y][x] === 0) {
                    const worldX = x * this.tileSize + this.tileSize / 2;
                    const worldY = y * this.tileSize + this.tileSize / 2;
                    const dist = Utils.distance(worldX, worldY, this.spawnX, this.spawnY);
                    if (dist > maxDist) {
                        maxDist = dist;
                        this.exitX = worldX;
                        this.exitY = worldY;
                    }
                }
            }
        }
    }

    /**
     * Place resource nodes
     */
    placeResources() {
        const resourceCount = 10 + this.difficulty * 5;

        for (let i = 0; i < resourceCount; i++) {
            const pos = this.getRandomFloorPosition();
            if (!pos) continue;

            // Caves have better resources
            const rand = this._rng();
            let type;
            if (rand < 0.3) {
                type = 'stone';
            } else if (rand < 0.7) {
                type = 'metal';
            } else {
                type = 'amethyst';
            }

            const node = new ResourceNode(this.game, pos.x, pos.y, type);
            this.entities.push(node);
        }
    }

    /**
     * Place enemies
     */
    placeEnemies() {
        const enemyCount = 5 + this.difficulty * 3;

        for (let i = 0; i < enemyCount; i++) {
            const pos = this.getRandomFloorPosition();
            if (!pos) continue;

            // Don't spawn near entrance
            if (Utils.distance(pos.x, pos.y, this.spawnX, this.spawnY) < 150) continue;

            // Random enemy type based on difficulty
            const types = ['bat', 'bat', 'spider'];
            if (this.difficulty >= 2) types.push('spider', 'golem');
            if (this.difficulty >= 4) types.push('golem', 'golem');

            const type = types[Math.floor(this._rng() * types.length)];
            const config = CaveEnemyTypes[type];

            const enemy = new Enemy(this.game, pos.x, pos.y, 'grunt');
            // Override with cave enemy config
            Object.assign(enemy, {
                enemyType: type,
                maxHealth: config.health * (1 + this.difficulty * 0.2),
                speed: config.speed,
                damage: config.damage * (1 + this.difficulty * 0.1),
                attackSpeed: config.attackSpeed,
                color: config.color,
                width: config.size,
                height: config.size,
                collisionRadius: config.size / 2,
                xp: config.xp
            });
            enemy.health = enemy.maxHealth;

            this.enemies.push(enemy);
            this.entities.push(enemy);
        }
    }

    /**
     * Place treasure chests
     */
    placeChests() {
        const chestCount = 2 + Math.floor(this.difficulty / 2);
        const tiers = ['common', 'common', 'uncommon'];
        if (this.difficulty >= 2) tiers.push('uncommon', 'rare');
        if (this.difficulty >= 4) tiers.push('rare', 'legendary');

        for (let i = 0; i < chestCount; i++) {
            const pos = this.getRandomFloorPosition();
            if (!pos) continue;

            const tier = tiers[Math.floor(this._rng() * tiers.length)];
            const chest = new TreasureChest(this.game, pos.x, pos.y, tier);
            this.chests.push(chest);
            this.entities.push(chest);
        }
    }

    /**
     * Place boss enemy
     */
    placeBoss() {
        // Boss near exit
        const pos = { x: this.exitX + 100, y: this.exitY };
        const config = CaveEnemyTypes.crystalGuardian;

        const boss = new Enemy(this.game, pos.x, pos.y, 'tank');
        Object.assign(boss, {
            enemyType: 'crystalGuardian',
            maxHealth: config.health * (1 + this.difficulty * 0.3),
            speed: config.speed,
            damage: config.damage,
            attackSpeed: config.attackSpeed,
            color: config.color,
            width: config.size,
            height: config.size,
            collisionRadius: config.size / 2,
            xp: config.xp,
            isBoss: true
        });
        boss.health = boss.maxHealth;

        this.enemies.push(boss);
        this.entities.push(boss);
    }

    /**
     * Get random floor position
     */
    getRandomFloorPosition() {
        for (let attempts = 0; attempts < 50; attempts++) {
            const x = 2 + Math.floor(this._rng() * (this.tilesX - 5));
            const y = 2 + Math.floor(this._rng() * (this.tilesY - 5));

            if (this.tiles[y][x] === 0) {
                return {
                    x: x * this.tileSize + this.tileSize / 2,
                    y: y * this.tileSize + this.tileSize / 2
                };
            }
        }
        return null;
    }

    /**
     * Check if position is passable
     */
    isPassable(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);

        if (tileX < 0 || tileX >= this.tilesX || tileY < 0 || tileY >= this.tilesY) {
            return false;
        }

        return this.tiles[tileY][tileX] === 0;
    }

    /**
     * Update cave entities
     */
    update(deltaTime) {
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].destroyed) {
                // Give XP when enemy dies
                this.game.givePlayerXP(this.enemies[i].xp || 10);
                this.enemies.splice(i, 1);
            }
        }

        // Check for boss killed
        if (!this.bossKilled) {
            const boss = this.enemies.find(e => e.isBoss);
            if (boss && boss.destroyed) {
                this.bossKilled = true;
                // Spawn legendary chest
                const chest = new TreasureChest(this.game, boss.x, boss.y, 'legendary');
                this.chests.push(chest);
                this.entities.push(chest);
                this.game.addEntity(chest);
            }
        }

        // Check for exit interaction
        const player = this.game.player;
        const distToExit = Utils.distance(player.x, player.y, this.exitX, this.exitY);
        if (distToExit < 50 &&
            this.game.canProcessWorldInteractionInput?.() &&
            this.game.input.isActionJustPressed('interact')) {
            this.game.exitCave();
        }
    }

    /**
     * Render cave
     */
    render(ctx, camera) {
        const bounds = camera.getVisibleBounds();

        const startX = Math.max(0, Math.floor(bounds.left / this.tileSize));
        const startY = Math.max(0, Math.floor(bounds.top / this.tileSize));
        const endX = Math.min(this.tilesX, Math.ceil(bounds.right / this.tileSize));
        const endY = Math.min(this.tilesY, Math.ceil(bounds.bottom / this.tileSize));

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.tiles[y][x];
                const worldX = x * this.tileSize;
                const worldY = y * this.tileSize;

                if (tile === 0) {
                    // Floor
                    ctx.fillStyle = '#1a1a2a';
                    ctx.fillRect(worldX, worldY, this.tileSize, this.tileSize);

                    // Random floor details
                    const seed = x * 137 + y * 251;
                    if (seed % 7 === 0) {
                        ctx.fillStyle = 'rgba(100, 80, 150, 0.2)';
                        ctx.beginPath();
                        ctx.arc(
                            worldX + (seed % 20) + 6,
                            worldY + ((seed * 3) % 20) + 6,
                            3,
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                } else {
                    // Wall
                    ctx.fillStyle = '#0a0a15';
                    ctx.fillRect(worldX, worldY, this.tileSize, this.tileSize);

                    // Wall texture
                    ctx.fillStyle = '#151525';
                    ctx.fillRect(worldX + 2, worldY + 2, this.tileSize - 4, this.tileSize - 4);
                }
            }
        }

        // Render exit portal
        this.renderExitPortal(ctx);
    }

    /**
     * Render exit portal
     */
    renderExitPortal(ctx) {
        ctx.save();
        ctx.translate(this.exitX, this.exitY);

        // Portal glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        gradient.addColorStop(0, 'rgba(100, 200, 100, 0.6)');
        gradient.addColorStop(0.5, 'rgba(50, 150, 50, 0.3)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();

        // Portal ring
        ctx.strokeStyle = '#66ff66';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();

        // Inner swirl
        const time = Date.now() / 1000;
        ctx.strokeStyle = '#aaffaa';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const angle = time * 2 + (Math.PI * 2 / 3) * i;
            ctx.beginPath();
            ctx.arc(0, 0, 15, angle, angle + Math.PI / 2);
            ctx.stroke();
        }

        // Exit text
        const player = this.game.player;
        const dist = Utils.distance(this.exitX, this.exitY, player.x, player.y);
        if (dist < 80) {
            const alpha = 1 - (dist / 80);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.font = 'bold 12px Rajdhani';
            ctx.textAlign = 'center';
            ctx.fillText('[E] Exit Cave', 0, 45);
        }

        ctx.restore();
    }
}

export default Cave;
