/**
 * Resource System - manages player resources and production
 */

export class ResourceSystem {
    constructor(game) {
        this.game = game;

        // Current resources
        this.resources = {
            wood: 0,
            stone: 0,
            metal: 0,
            amethyst: 0
        };

        // Production rates (per second, from auto-miners)
        this.production = {
            wood: 0,
            stone: 0,
            metal: 0,
            amethyst: 0
        };

        // Update interval tracking
        this.productionTimer = 0;

        // UI elements
        this.woodElement = document.getElementById('wood-count');
        this.stoneElement = document.getElementById('stone-count');
        this.metalElement = document.getElementById('metal-count');
        this.amethystElement = document.getElementById('amethyst-count');
    }

    /**
     * Add resource
     */
    addResource(type, amount) {
        if (this.resources[type] !== undefined) {
            this.resources[type] += amount;
            this.updateUI();
        }
    }

    /**
     * Remove resource (returns true if successful)
     */
    removeResource(type, amount) {
        if (this.resources[type] >= amount) {
            this.resources[type] -= amount;
            this.updateUI();
            return true;
        }
        return false;
    }

    /**
     * Check if player has enough resources
     */
    hasResources(costs) {
        for (const [type, amount] of Object.entries(costs)) {
            if ((this.resources[type] || 0) < amount) {
                return false;
            }
        }
        return true;
    }

    /**
     * Spend resources (returns true if successful)
     */
    spendResources(costs) {
        if (!this.hasResources(costs)) {
            return false;
        }

        for (const [type, amount] of Object.entries(costs)) {
            this.resources[type] -= amount;
        }

        this.updateUI();
        return true;
    }

    /**
     * Get current resource count
     */
    getResource(type) {
        return this.resources[type] || 0;
    }

    /**
     * Update resource production from buildings
     */
    updateProduction() {
        // Production is handled per-building in BuildingSystem (autoMiner.updateAutoMiner)
        // This method is kept for potential future non-building production sources
        this.production = { wood: 0, stone: 0, metal: 0, amethyst: 0 };
    }

    /**
     * Process production tick
     */
    update(deltaTime) {
        // Production ticks are handled per-building in BuildingSystem
    }

    /**
     * Update UI display
     */
    updateUI() {
        if (this.woodElement) this.woodElement.textContent = Math.floor(this.resources.wood);
        if (this.stoneElement) this.stoneElement.textContent = Math.floor(this.resources.stone);
        if (this.metalElement) this.metalElement.textContent = Math.floor(this.resources.metal);
        if (this.amethystElement) this.amethystElement.textContent = Math.floor(this.resources.amethyst);
    }
}

export default ResourceSystem;
