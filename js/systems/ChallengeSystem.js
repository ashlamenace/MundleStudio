/**
 * Challenge System - Optional difficulty modifiers unlocked after wave 25
 * Player opts in for harder gameplay in exchange for bonuses
 */

import { DEFAULT_DAY_DURATION } from '../core/Game.js';

export const CHALLENGE_DEFS = {
    horde: {
        id: 'horde',
        name: 'Horde',
        icon: '👹',
        description: '2× spawns ennemis, +50% ressources droppées',
        unlockWave: 25,
        active: false,
        apply(game) {
            game.waveSystem.spawnInterval *= 0.5; // Twice as fast
            game._resourceDropMultiplier = (game._resourceDropMultiplier || 1) * 1.5;
        },
        remove(game) {
            game.waveSystem.spawnInterval *= 2;
            game._resourceDropMultiplier = (game._resourceDropMultiplier || 1.5) / 1.5;
        }
    },
    armored: {
        id: 'armored',
        name: 'Blindés',
        icon: '🛡️',
        description: 'Tous les ennemis +30% armure physique',
        unlockWave: 25,
        active: false,
        apply(game) { game._globalArmorBonus = 0.3; },
        remove(game) { game._globalArmorBonus = 0; }
    },
    eternalNight: {
        id: 'eternalNight',
        name: 'Nuit Éternelle',
        icon: '🌑',
        description: 'Pas de jour, ennemis +10% dégâts permanent',
        unlockWave: 30,
        active: false,
        apply(game) {
            game.dayNight.dayDuration = 5; // Almost no day
            game._nightDamageBonus = 1.1;
        },
        remove(game) {
            game.dayNight.dayDuration = DEFAULT_DAY_DURATION;
            game._nightDamageBonus = 1.0;
        }
    },
    giants: {
        id: 'giants',
        name: 'Géants',
        icon: '🔺',
        description: 'Ennemis 1.5× plus grands, 2× HP, 1.5× XP',
        unlockWave: 35,
        active: false,
        apply(game) { game._giantModifier = true; },
        remove(game) { game._giantModifier = false; }
    }
};

export class ChallengeSystem {
    constructor(game) {
        this.game = game;
        this.active = new Set();
    }

    /** Returns challenges available at current wave */
    getUnlocked() {
        const wave = this.game.waveSystem?.currentWave || 0;
        return Object.values(CHALLENGE_DEFS).filter(c => wave >= c.unlockWave);
    }

    toggle(id) {
        const def = CHALLENGE_DEFS[id];
        if (!def) return;

        const wave = this.game.waveSystem?.currentWave || 0;
        if (wave < def.unlockWave) {
            this.game.showFloatingText(
                this.game.player.x, this.game.player.y - 40,
                `Débloqué à la vague ${def.unlockWave}`, '#ff8844'
            );
            return;
        }

        if (this.active.has(id)) {
            this.active.delete(id);
            def.active = false;
            def.remove(this.game);
            this.game.showNotification('🔓 Défi désactivé', def.name, '#888888', 2);
        } else {
            this.active.add(id);
            def.active = true;
            def.apply(this.game);
            this.game.showNotification(
                def.icon + ' DÉFI ACTIVÉ: ' + def.name,
                def.description,
                '#ff8844',
                3
            );
        }

        this.updateUI();
    }

    updateUI() {
        const container = document.getElementById('challenge-list');
        if (!container) return;

        container.innerHTML = '';
        const wave = this.game.waveSystem?.currentWave || 0;

        for (const def of Object.values(CHALLENGE_DEFS)) {
            const item = document.createElement('div');
            const locked = wave < def.unlockWave;
            item.className = `challenge-item${def.active ? ' active' : ''}${locked ? ' locked' : ''}`;
            item.title = locked ? `Débloqué à la vague ${def.unlockWave}` : def.description;

            item.innerHTML = `
                <span>${def.icon} ${def.name}</span>
                <small>${locked ? `🔒 Vague ${def.unlockWave}` : def.description}</small>
            `;

            if (!locked) {
                item.addEventListener('click', () => this.toggle(def.id));
                item.style.cursor = 'pointer';
            }

            container.appendChild(item);
        }
    }
}

export default ChallengeSystem;
