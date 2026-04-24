/**
 * Inventory UI component
 */

export class Inventory {
    constructor(game) {
        this.game = game;

        // Inventory is simple - just tracks tool upgrades
        this.toolLevels = {
            sword: 1,
            axe: 1,
            pickaxe: 1,
            bow: 1
        };

        this.isOpen = false;
    }

    /**
     * Get tool damage multiplier
     */
    getToolMultiplier(tool) {
        const level = this.toolLevels[tool] || 1;
        return 1 + (level - 1) * 0.25; // 25% per level
    }

    /**
     * Upgrade a tool
     */
    upgradeTool(tool) {
        const currentLevel = this.toolLevels[tool] || 1;
        const cost = this.getUpgradeCost(tool, currentLevel + 1);

        if (this.game.resourceSystem.spendResources(cost)) {
            this.toolLevels[tool] = currentLevel + 1;
            return true;
        }
        return false;
    }

    /**
     * Get upgrade cost for tool level
     */
    getUpgradeCost(tool, level) {
        return {
            metal: level * 5,
            amethyst: Math.floor(level / 2)
        };
    }

    /**
     * Toggle inventory
     */
    toggle() {
        this.isOpen = !this.isOpen;
        // TODO: Add inventory UI panel
    }
}

export default Inventory;
