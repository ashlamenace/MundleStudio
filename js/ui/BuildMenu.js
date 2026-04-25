/**
 * Build Menu UI component
 */

import { BuildingConfigs, BuildingCategories } from '../systems/BuildingSystem.js';
import { CRYSTAL_LEVELS } from '../systems/CrystalUpgradeSystem.js';

export class BuildMenu {
    constructor(game) {
        this.game = game;

        // Elements
        this.menuElement = document.getElementById('build-menu');
        this.itemsContainer = document.getElementById('build-items');
        this.closeButton = document.getElementById('close-build-menu');
        this.categoryButtons = document.querySelectorAll('.build-category');

        // State
        this.isOpen = false;
        this.currentCategory = 'defense';
        this.selectedBuilding = null; // Track selected building

        // Setup events
        this.setupEvents();

        // Initial render
        this.renderItems();
    }

    /**
     * Setup event listeners
     */
    setupEvents() {
        // Close button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }

        // Category buttons
        this.categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.category;
                this.selectCategory(category);
            });
        });

        // Close on escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Open the build menu
     */
    open() {
        this.isOpen = true;
        if (this.menuElement) {
            this.menuElement.classList.remove('hidden');
        }
        this.renderItems();
    }

    /**
     * Close the build menu
     */
    close() {
        this.isOpen = false;
        if (this.menuElement) {
            this.menuElement.classList.add('hidden');
        }
    }

    /**
     * Toggle menu
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Select category
     */
    selectCategory(category) {
        this.currentCategory = category;

        // Update button states
        this.categoryButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.category === category);
        });

        this.renderItems();
    }

    /**
     * Render building items for current category
     */
    renderItems() {
        if (!this.itemsContainer) return;

        this.itemsContainer.innerHTML = '';

        const items = BuildingCategories[this.currentCategory] || [];

        for (const key of items) {
            const config = BuildingConfigs[key];
            if (!config) continue;

            const itemElement = this.createItemElement(key, config);
            this.itemsContainer.appendChild(itemElement);
        }

        // Show message if empty
        if (items.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'build-empty';
            emptyMsg.textContent = 'Nothing available yet';
            emptyMsg.style.gridColumn = '1 / -1';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = 'rgba(255,255,255,0.5)';
            emptyMsg.style.padding = '20px';
            this.itemsContainer.appendChild(emptyMsg);
        }
    }

    /**
     * Create item element
     */
    createItemElement(key, config) {
        const element = document.createElement('div');
        element.className = 'build-item';
        element.dataset.building = key;

        // Crystal level gate
        const crystalSys = this.game.crystalUpgradeSystem;
        const requiredLevel = config.crystalLevel ?? 0;
        const isCrystalLocked = crystalSys ? !crystalSys.isBuildingUnlocked(key) : false;
        const scaledCost = this.game.scaleCost(config.cost, 'building');

        // Resource affordability (only matters if crystal-unlocked)
        const canAfford = !isCrystalLocked && this.game.resourceSystem.hasResources(scaledCost);

        if (isCrystalLocked) {
            element.classList.add('crystal-locked');
        } else if (!canAfford) {
            element.classList.add('locked');
        }

        // Icon
        const icon = document.createElement('div');
        icon.className = 'build-item-icon';
        icon.textContent = isCrystalLocked ? '🔒' : config.icon;
        element.appendChild(icon);

        // Name
        const name = document.createElement('div');
        name.className = 'build-item-name';
        name.textContent = config.name;
        element.appendChild(name);

        // Cost or crystal requirement
        const costEl = document.createElement('div');
        costEl.className = 'build-item-cost';
        if (isCrystalLocked) {
            const levelName = CRYSTAL_LEVELS[requiredLevel]?.name ?? `Niveau ${requiredLevel + 1}`;
            costEl.innerHTML = `<span style="color:#bb88ff;font-size:10px">✨ ${levelName}</span>`;
        } else {
            costEl.innerHTML = this.formatCost(scaledCost);
        }
        element.appendChild(costEl);

        // Click handler
        element.addEventListener('click', () => {
            if (isCrystalLocked) return;
            const canAffordNow = this.game.resourceSystem.hasResources(scaledCost);
            if (canAffordNow) {
                document.querySelectorAll('.build-item').forEach(item => {
                    item.classList.remove('selected');
                });
                element.classList.add('selected');
                this.selectBuilding(key);
            }
        });

        return element;
    }

    /**
     * Format cost as HTML
     */
    formatCost(cost) {
        const parts = [];
        const icons = {
            wood: '🪵',
            stone: '🪨',
            metal: '⚙️',
            amethyst: '💜'
        };

        for (const [type, amount] of Object.entries(cost)) {
            const hasEnough = this.game.resourceSystem.getResource(type) >= amount;
            const color = hasEnough ? '#aaffaa' : '#ffaaaa';
            parts.push(`<span style="color:${color}">${icons[type]}${amount}</span>`);
        }

        return parts.join(' ');
    }

    /**
     * Select a building to place
     */
    selectBuilding(key) {
        this.selectedBuilding = key;

        // Start placement
        this.game.buildingSystem.startPlacement(key);

        // Switch to build slot
        this.game.player.selectSlot(5);

        // Close menu automatically after selection
        this.close();
    }
}

export default BuildMenu;
