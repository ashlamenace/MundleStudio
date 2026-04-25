/**
 * VersusStatus - HUD panel for versus crystal status
 */

import { GameMode } from '../core/GameModeConfig.js';
import { VERSUS_SLOT_COLORS, VERSUS_SLOT_LABELS, VERSUS_SLOT_ORDER } from '../world/VersusArena.js';

export class VersusStatus {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('versus-status');
        this.list = document.getElementById('versus-status-list');
        this.aliveCount = document.getElementById('versus-alive-count');
        this.slotRows = new Map();
        this._lastSlotsKey = '';
    }

    update() {
        if (!this.container || !this.list) return;

        const isVersus = this.game.gameMode === GameMode.VERSUS_FFA;
        const isPlaying = this.game.state === 'playing';
        const activeSlots = isVersus ? (this.game.getActiveVersusSlots?.() ?? []) : [];

        if (!isVersus || !isPlaying || activeSlots.length === 0) {
            this.container.classList.add('hidden');
            return;
        }

        this.container.classList.remove('hidden');
        this._syncSlots(activeSlots);
        this._updateRows(activeSlots);
    }

    _syncSlots(activeSlots) {
        const slotsKey = activeSlots.join('|');
        if (slotsKey === this._lastSlotsKey) return;
        this._lastSlotsKey = slotsKey;

        for (const [slot, row] of this.slotRows) {
            if (!activeSlots.includes(slot)) {
                row.remove();
                this.slotRows.delete(slot);
            }
        }

        for (const slot of activeSlots) {
            if (!this.slotRows.has(slot)) {
                this._createRow(slot);
            }
        }

        const ordered = activeSlots.slice().sort((a, b) => {
            return VERSUS_SLOT_ORDER.indexOf(a) - VERSUS_SLOT_ORDER.indexOf(b);
        });
        for (const slot of ordered) {
            const row = this.slotRows.get(slot);
            if (row) this.list.appendChild(row);
        }
    }

    _createRow(slot) {
        const row = document.createElement('div');
        row.className = 'versus-slot';
        row.dataset.slot = slot;

        const dot = document.createElement('span');
        dot.className = 'versus-slot-dot';
        dot.style.background = VERSUS_SLOT_COLORS[slot] ?? '#ffffff';

        const name = document.createElement('span');
        name.className = 'versus-slot-name';
        name.textContent = VERSUS_SLOT_LABELS[slot] ?? slot.toUpperCase();

        const bar = document.createElement('div');
        bar.className = 'versus-slot-bar';

        const fill = document.createElement('div');
        fill.className = 'versus-slot-fill';
        fill.style.background = VERSUS_SLOT_COLORS[slot] ?? '#ffffff';
        bar.appendChild(fill);

        const hp = document.createElement('span');
        hp.className = 'versus-slot-hp';
        hp.textContent = '--/--';

        row.appendChild(dot);
        row.appendChild(name);
        row.appendChild(bar);
        row.appendChild(hp);

        this.list.appendChild(row);
        this.slotRows.set(slot, row);
    }

    _updateRows(activeSlots) {
        const aliveSlots = activeSlots.filter(slot => !this.game.isSlotEliminated(slot));
        if (this.aliveCount) {
            this.aliveCount.textContent = `${aliveSlots.length}/${activeSlots.length}`;
        }

        for (const slot of activeSlots) {
            const row = this.slotRows.get(slot);
            if (!row) continue;

            const crystal = this.game.getCrystalForSlot?.(slot);
            const isEliminated = this.game.isSlotEliminated(slot) || !crystal || crystal.destroyed || crystal.health <= 0;
            row.classList.toggle('eliminated', isEliminated);

            const fill = row.querySelector('.versus-slot-fill');
            const hp = row.querySelector('.versus-slot-hp');

            if (crystal && !isEliminated) {
                const pct = Math.max(0, Math.min(100, (crystal.health / crystal.maxHealth) * 100));
                if (fill) fill.style.width = `${pct}%`;
                if (hp) hp.textContent = `${Math.floor(crystal.health)}/${crystal.maxHealth}`;
            } else {
                if (fill) fill.style.width = '0%';
                if (hp) hp.textContent = '0/0';
            }
        }
    }
}

export default VersusStatus;
