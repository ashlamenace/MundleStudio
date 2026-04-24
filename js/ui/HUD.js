/**
 * HUD - Heads Up Display management
 */

import { Utils } from '../core/Utils.js';

export class HUD {
    constructor(game) {
        this.game = game;

        // Element references
        this.elements = {
            playerHealthFill: document.getElementById('player-health-fill'),
            playerHealthText: document.getElementById('player-health-text'),
            crystalHealthFill: document.getElementById('crystal-health-fill'),
            crystalHealthText: document.getElementById('crystal-health-text'),
            waveIcon: document.getElementById('wave-icon'),
            waveText: document.getElementById('wave-text'),
            waveTimer: document.getElementById('wave-timer'),
            waveIndicator: document.getElementById('wave-indicator'),
            waveWarning: document.getElementById('wave-warning'),
            skipToNightBtn: document.getElementById('skip-to-night-btn'),
            turretCounter: document.getElementById('turret-counter')
        };

        // Warning threshold
        this.warningThreshold = 30; // seconds
        
        // Setup action bar click handlers
        this.setupActionBar();
        this.setupWaveControls();
    }
    
    /**
     * Setup action bar click handlers
     */
    setupActionBar() {
        const actionSlots = document.querySelectorAll('.action-slot');
        
        actionSlots.forEach((slot, index) => {
            slot.addEventListener('click', () => {
                const slotNumber = index + 1;
                if (this.game.player) {
                    this.game.player.selectSlot(slotNumber);
                }
            });
            
            // Add hover effect
            slot.style.cursor = 'pointer';
        });
    }

    setupWaveControls() {
        const skipBtn = this.elements.skipToNightBtn;
        if (!skipBtn) return;
        skipBtn.addEventListener('click', () => {
            this.game.requestSkipToNight();
        });
    }

    /**
     * Update HUD elements
     */
    update(deltaTime) {
        this.updateHealthBars();
        this.updateWaveInfo();
        this.updateTurretCounter();
    }

    /**
     * Update health bar displays
     */
    updateHealthBars() {
        const player = this.game.player;
        const crystal = this.game.crystal;

        // Player health
        if (this.elements.playerHealthFill) {
            const playerPercent = (player.health / player.maxHealth) * 100;
            this.elements.playerHealthFill.style.width = `${playerPercent}%`;
        }
        if (this.elements.playerHealthText) {
            this.elements.playerHealthText.textContent = `${Math.floor(player.health)}/${player.maxHealth}`;
        }

        // Crystal health
        if (this.elements.crystalHealthFill) {
            const crystalPercent = (crystal.health / crystal.maxHealth) * 100;
            this.elements.crystalHealthFill.style.width = `${crystalPercent}%`;
        }
        if (this.elements.crystalHealthText) {
            this.elements.crystalHealthText.textContent = `${Math.floor(crystal.health)}/${crystal.maxHealth}`;
        }
    }

    /**
     * Update wave and time display
     */
    updateWaveInfo() {
        const dayNight = this.game.dayNight;
        const waveSystem = this.game.waveSystem;
        const timeRemaining = dayNight.getTimeRemaining();
        const skipBtn = this.elements.skipToNightBtn;

        // Update timer
        if (this.elements.waveTimer) {
            this.elements.waveTimer.textContent = Utils.formatTime(timeRemaining);
        }

        // Update icon and text based on day/night
        if (dayNight.isNight) {
            if (this.elements.waveIcon) {
                this.elements.waveIcon.textContent = '🌙';
            }
            if (this.elements.waveText) {
                const remaining = waveSystem.getRemainingEnemies();
                this.elements.waveText.textContent = `NIGHT ${waveSystem.currentWave} - ${remaining} enemies`;
            }
            if (this.elements.waveIndicator) {
                this.elements.waveIndicator.classList.remove('day');
                this.elements.waveIndicator.classList.add('night');
            }
        } else {
            if (this.elements.waveIcon) {
                this.elements.waveIcon.textContent = '☀️';
            }
            if (this.elements.waveText) {
                this.elements.waveText.textContent = `DAY ${this.game.survivalDays + 1}`;
            }
            if (this.elements.waveIndicator) {
                this.elements.waveIndicator.classList.remove('night');
                this.elements.waveIndicator.classList.add('day');
            }
        }

        // Warning before night
        if (!dayNight.isNight && timeRemaining <= this.warningThreshold) {
            if (this.elements.waveWarning) {
                this.elements.waveWarning.classList.remove('hidden');
                this.elements.waveWarning.textContent = `⚠️ NIGHT IN ${Math.ceil(timeRemaining)}s`;
            }
        } else {
            if (this.elements.waveWarning) {
                this.elements.waveWarning.classList.add('hidden');
            }
        }

        if (skipBtn) {
            const inRoom = !!this.game.networkManager?.inRoom;
            const isHost = !!this.game.networkManager?.isHost;
            const canSkipNow = !dayNight.isNight && this.game.state === 'playing' && !this.game.inCave;

            skipBtn.classList.toggle('hidden', !canSkipNow);
            skipBtn.disabled = !canSkipNow;
            skipBtn.textContent = inRoom && !isHost
                ? '⏭️ Demander la nuit'
                : '⏭️ Passer à la nuit';
        }
    }

    updateTurretCounter() {
        const el = this.elements.turretCounter;
        if (!el || !this.game.buildingSystem) return;

        const bs    = this.game.buildingSystem;
        const count = bs.getTurretCount();
        const cap   = bs.getTurretCap();

        el.textContent = `🏰 ${count}/${cap}`;

        // Rouge quand plein, orange à 1 slot restant, blanc sinon
        if (count >= cap) {
            el.style.color = '#ff4444';
        } else if (count >= cap - 1) {
            el.style.color = '#ff9944';
        } else {
            el.style.color = '#ffffff';
        }
    }
}

export default HUD;
