/**
 * Collision System - handles all collision detection
 */

import { Utils } from '../core/Utils.js';

export class CollisionSystem {
    constructor(game) {
        this.game = game;

        // Spatial hash for optimization
        this.cellSize = 64;
        this.grid = new Map();
    }

    /**
     * Update collision checks
     */
    update() {
        // Rebuild spatial hash
        this.rebuildGrid();

        // Check entity collisions
        this.checkEntityCollisions();
    }

    /**
     * Rebuild spatial hash grid
     */
    rebuildGrid() {
        this.grid.clear();

        for (const entity of this.game.entities) {
            if (!entity.solid) continue;

            const cellKey = this.getCellKey(entity.x, entity.y);

            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            this.grid.get(cellKey).push(entity);
        }

        // Add buildings
        for (const building of this.game.buildingSystem.buildings) {
            if (!building.solid) continue;

            const cellKey = this.getCellKey(building.x, building.y);

            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            this.grid.get(cellKey).push(building);
        }
    }

    /**
     * Get cell key for position (numeric — avoids string alloc in hot loop)
     */
    getCellKey(x, y) {
        return (Math.floor(x / this.cellSize) & 0xFFFF) << 16 |
               (Math.floor(y / this.cellSize) & 0xFFFF);
    }

    /**
     * Get nearby entities from spatial hash
     */
    getNearby(x, y, radius) {
        const nearby = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${centerCellX + dx},${centerCellY + dy}`;
                if (this.grid.has(key)) {
                    nearby.push(...this.grid.get(key));
                }
            }
        }

        return nearby;
    }

    /**
     * Check collisions between entities (uses spatial hash — O(n) not O(n²))
     */
    checkEntityCollisions() {
        const enemies = this.game.getEnemies();
        const checked = new Set();

        for (const a of enemies) {
            // Only query nearby cells (max separation ≤ cellSize for touching enemies)
            const nearby = this.getNearby(a.x, a.y, this.cellSize);

            for (const b of nearby) {
                if (b === a || b.type !== 'enemy') continue;
                if (checked.has(b)) continue; // already processed this pair from b's side

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distSq = dx * dx + dy * dy;
                const minDist = a.collisionRadius + b.collisionRadius;

                if (distSq < minDist * minDist && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const push = overlap * 0.5;

                    a.x -= nx * push;
                    a.y -= ny * push;
                    b.x += nx * push;
                    b.y += ny * push;
                }
            }
            checked.add(a);
        }
    }

    /**
     * Check if a position is blocked
     */
    isBlocked(x, y, radius, ignoreEntity = null) {
        // Check world
        if (!this.game.world.isPassable(x, y)) {
            return true;
        }

        // Check nearby entities
        const nearby = this.getNearby(x, y, radius + 32);

        for (const entity of nearby) {
            if (entity === ignoreEntity) continue;
            if (!entity.solid) continue;

            const dist = Utils.distance(x, y, entity.x, entity.y);
            if (dist < radius + entity.collisionRadius) {
                return true;
            }
        }

        return false;
    }

    /**
     * Ray cast for line of sight
     */
    raycast(startX, startY, endX, endY, ignoreEntity = null) {
        const dist = Utils.distance(startX, startY, endX, endY);
        const steps = Math.ceil(dist / 10);

        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = Utils.lerp(startX, endX, t);
            const y = Utils.lerp(startY, endY, t);

            // Check world
            if (!this.game.world.isPassable(x, y)) {
                return { hit: true, x, y, entity: null };
            }

            // Check buildings
            for (const building of this.game.buildingSystem.buildings) {
                if (!building.solid || building === ignoreEntity) continue;

                const bdist = Utils.distance(x, y, building.x, building.y);
                if (bdist < building.collisionRadius) {
                    return { hit: true, x, y, entity: building };
                }
            }
        }

        return { hit: false, x: endX, y: endY, entity: null };
    }
}

export default CollisionSystem;
