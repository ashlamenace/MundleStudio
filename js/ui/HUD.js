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
            turretCounter: document.getElementById('turret-counter'),
            bonusRaidOffer: document.getElementById('bonus-raid-offer'),
            bonusRaidTitle: document.getElementById('bonus-raid-title'),
            bonusRaidCost: document.getElementById('bonus-raid-cost'),
            bonusRaidAccept: document.getElementById('bonus-raid-accept'),
            bonusRaidDecline: document.getElementById('bonus-raid-decline'),
            bonusRaidTimerFill: document.getElementById('bonus-raid-timer-fill')
        };

        // DOM change-detection cache — avoids touching the DOM when values haven't changed
        this._c = {
            playerHealth: -1,
            crystalHealth: -1,
            crystalMaxHealth: -1,
            isNight: null,
            waveNum: -1,
            remaining: -1,
            survivalDays: -1,
            timerText: '',
            warningVisible: null,
            warningText: '',
            skipVisible: null,
            skipDisabled: null,
            skipText: '',
            turretCount: -1,
            turretCap: -1,
            offerActive: false,
            offerId: null,
        };

        // Warning threshold
        this.warningThreshold = 30; // seconds

        // Setup action bar click handlers
        this.setupActionBar();
        this.setupWaveControls();
        this.setupBonusRaidControls();
    }

    setupActionBar() {
        const actionSlots = document.querySelectorAll('.action-slot');
        actionSlots.forEach((slot, index) => {
            slot.addEventListener('click', () => {
                const slotNumber = index + 1;
                if (this.game.player) {
                    this.game.player.selectSlot(slotNumber);
                }
            });
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

    setupBonusRaidControls() {
        this.elements.bonusRaidAccept?.addEventListener('click', () => {
            this.game.acceptBonusRaidOffer?.();
        });
        this.elements.bonusRaidDecline?.addEventListener('click', () => {
            this.game.declineBonusRaidOffer?.();
        });
    }

    update(deltaTime) {
        this.updateHealthBars();
        this.updateWaveInfo();
        this.updateTurretCounter();
        this.updateBonusRaidOffer();
    }

    updateHealthBars() {
        const player = this.game.player;
        const crystal = this.game.crystal;
        const c = this._c;

        const ph = Math.floor(player.health);
        if (ph !== c.playerHealth) {
            c.playerHealth = ph;
            const pct = (player.health / player.maxHealth) * 100;
            if (this.elements.playerHealthFill) this.elements.playerHealthFill.style.width = `${pct}%`;
            if (this.elements.playerHealthText) this.elements.playerHealthText.textContent = `${ph}/${player.maxHealth}`;
        }

        const ch = crystal ? Math.floor(crystal.health) : 0;
        const cmx = crystal ? crystal.maxHealth : 0;
        if (ch !== c.crystalHealth || cmx !== c.crystalMaxHealth) {
            c.crystalHealth = ch;
            c.crystalMaxHealth = cmx;
            const cpct = crystal ? (crystal.health / crystal.maxHealth) * 100 : 0;
            if (this.elements.crystalHealthFill) this.elements.crystalHealthFill.style.width = `${cpct}%`;
            if (this.elements.crystalHealthText) this.elements.crystalHealthText.textContent = crystal
                ? `${ch}/${cmx}` : '0/0';
        }
    }

    updateWaveInfo() {
        const dayNight = this.game.dayNight;
        const waveSystem = this.game.waveSystem;
        const c = this._c;

        // Timer: only update when the formatted string changes (i.e. each whole second)
        const timeRemaining = dayNight.getTimeRemaining();
        const timerText = Utils.formatTime(timeRemaining);
        if (timerText !== c.timerText) {
            c.timerText = timerText;
            if (this.elements.waveTimer) this.elements.waveTimer.textContent = timerText;
        }

        // Day/night switch
        if (dayNight.isNight !== c.isNight) {
            c.isNight = dayNight.isNight;
            if (this.elements.waveIcon) this.elements.waveIcon.textContent = dayNight.isNight ? '🌙' : '☀️';
            if (this.elements.waveIndicator) {
                this.elements.waveIndicator.classList.toggle('night', dayNight.isNight);
                this.elements.waveIndicator.classList.toggle('day', !dayNight.isNight);
            }
            // Reset dependent caches so they update on first frame of new phase
            c.remaining = -1;
            c.survivalDays = -1;
        }

        // Wave text (only changes when enemy count or wave # changes)
        if (dayNight.isNight) {
            const remaining = waveSystem.getRemainingEnemies();
            const wave = waveSystem.currentWave;
            if (remaining !== c.remaining || wave !== c.waveNum) {
                c.remaining = remaining;
                c.waveNum = wave;
                if (this.elements.waveText) this.elements.waveText.textContent = `NIGHT ${wave} - ${remaining} enemies`;
            }
        } else {
            const days = this.game.survivalDays;
            if (days !== c.survivalDays) {
                c.survivalDays = days;
                if (this.elements.waveText) this.elements.waveText.textContent = `DAY ${days + 1}`;
            }
        }

        // Night warning
        const showWarning = !dayNight.isNight && timeRemaining <= this.warningThreshold;
        const warningText = showWarning ? `⚠️ NIGHT IN ${Math.ceil(timeRemaining)}s` : '';
        if (showWarning !== c.warningVisible || warningText !== c.warningText) {
            c.warningVisible = showWarning;
            c.warningText = warningText;
            if (this.elements.waveWarning) {
                this.elements.waveWarning.classList.toggle('hidden', !showWarning);
                if (showWarning) this.elements.waveWarning.textContent = warningText;
            }
        }

        // Skip button
        const skipBtn = this.elements.skipToNightBtn;
        if (skipBtn) {
            const inRoom = !!this.game.networkManager?.inRoom;
            const canSkipNow = !dayNight.isNight && this.game.state === 'playing' && !this.game.inCave;
            const voteStatus = this.game.getSkipToNightVoteStatus?.();
            const hasLocalVote = inRoom && !!voteStatus?.hasLocalVote;
            const votes = voteStatus?.votes ?? 0;
            const required = voteStatus?.required ?? 1;
            const skipText = inRoom ? `Vote nuit (${votes}/${required})` : '⏭️ Passer à la nuit';
            const skipDisabled = !canSkipNow || hasLocalVote;

            if (canSkipNow !== c.skipVisible) {
                c.skipVisible = canSkipNow;
                skipBtn.classList.toggle('hidden', !canSkipNow);
            }
            if (skipDisabled !== c.skipDisabled) {
                c.skipDisabled = skipDisabled;
                skipBtn.disabled = skipDisabled;
            }
            if (skipText !== c.skipText) {
                c.skipText = skipText;
                skipBtn.textContent = skipText;
            }
        }
    }

    updateTurretCounter() {
        const el = this.elements.turretCounter;
        if (!el || !this.game.buildingSystem) return;
        const c = this._c;

        const count = this.game.buildingSystem.getTurretCount();
        const cap   = this.game.buildingSystem.getTurretCap();
        if (count === c.turretCount && cap === c.turretCap) return;
        c.turretCount = count;
        c.turretCap   = cap;

        el.textContent = `🏰 ${count}/${cap}`;
        el.style.color = count >= cap ? '#ff4444' : count >= cap - 1 ? '#ff9944' : '#ffffff';
    }

    updateBonusRaidOffer() {
        const offer = this.game.bonusRaidOffer;
        const box = this.elements.bonusRaidOffer;
        if (!box) return;
        const c = this._c;

        if (!offer) {
            if (c.offerActive) {
                c.offerActive = false;
                c.offerId = null;
                box.classList.add('hidden');
            }
            return;
        }

        if (!c.offerActive) {
            c.offerActive = true;
            box.classList.remove('hidden');
        }

        // Only rewrite title/cost when the offer identity changes
        if (offer.id !== c.offerId) {
            c.offerId = offer.id;
            if (this.elements.bonusRaidTitle) {
                const plural = offer.targetCount > 1 ? 's' : '';
                this.elements.bonusRaidTitle.textContent = `${offer.label} vers ${offer.targetCount} adversaire${plural}`;
            }
            if (this.elements.bonusRaidCost) {
                this.elements.bonusRaidCost.textContent = this.game.formatCost?.(offer.cost) ?? '';
            }
            if (this.elements.bonusRaidAccept) {
                this.elements.bonusRaidAccept.disabled = !this.game.canAffordBonusRaidOffer?.();
            }
        }

        // Timer bar changes every frame — unavoidable but cheap
        if (this.elements.bonusRaidTimerFill) {
            const remaining = Math.max(0, offer.expiresAt - performance.now());
            const pct = offer.durationMs > 0 ? (remaining / offer.durationMs) * 100 : 0;
            this.elements.bonusRaidTimerFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        }
    }
}

export default HUD;
