/**
 * Objective System - Daily objectives generated each in-game day
 * Completing objectives gives bonus resources/XP
 */

import { Utils } from '../core/Utils.js';

const OBJECTIVE_TEMPLATES = [
    {
        id: 'kill_grunts',
        label: count => `Tuer ${count} Grunts`,
        target: () => Utils.randomInt(10, 20),
        track: 'kill',
        filter: type => type === 'grunt',
        reward: count => ({ wood: count * 3 })
    },
    {
        id: 'kill_enemies',
        label: count => `Éliminer ${count} ennemis`,
        target: () => Utils.randomInt(15, 30),
        track: 'kill',
        filter: () => true,
        reward: count => ({ stone: count * 2, wood: count })
    },
    {
        id: 'kill_boss',
        label: () => `Vaincre 1 boss`,
        target: () => 1,
        track: 'kill',
        filter: type => ['berserkTitan','frostLord','infernoDrake','stormWraith','voidBehemoth'].includes(type),
        reward: () => ({ metal: 20, amethyst: 5 })
    },
    {
        id: 'build_buildings',
        label: count => `Construire ${count} bâtiments`,
        target: () => Utils.randomInt(2, 4),
        track: 'build',
        filter: () => true,
        reward: count => ({ stone: count * 10 })
    },
    {
        id: 'collect_metal',
        label: count => `Collecter ${count} Métal`,
        target: () => Utils.randomInt(15, 30),
        track: 'collect',
        filter: type => type === 'metal',
        reward: count => ({ amethyst: Math.floor(count / 5) })
    },
    {
        id: 'survive_wave',
        label: () => `Survivre à une vague sans perdre de mur`,
        target: () => 1,
        track: 'wave_survived',
        filter: () => true,
        reward: () => ({ metal: 15, wood: 20 })
    },
    {
        id: 'heal_player',
        label: amount => `Régénérer ${amount} PV`,
        target: () => Utils.randomInt(50, 150),
        track: 'heal',
        filter: () => true,
        reward: amount => ({ wood: Math.floor(amount / 5) })
    }
];

export class ObjectiveSystem {
    constructor(game) {
        this.game = game;
        this.objectives = [];
        this.completedToday = [];
        this._wallLostThisWave = false;

        this.generateObjectives();
    }

    generateObjectives(count = 3) {
        this.objectives = [];
        this.completedToday = [];

        // Pick 3 random unique templates
        const templates = [...OBJECTIVE_TEMPLATES];
        for (let i = templates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [templates[i], templates[j]] = [templates[j], templates[i]];
        }

        for (let i = 0; i < Math.min(count, templates.length); i++) {
            const tmpl = templates[i];
            const targetVal = tmpl.target();
            this.objectives.push({
                id: tmpl.id + '_' + i,
                label: tmpl.label(targetVal),
                target: targetVal,
                progress: 0,
                completed: false,
                track: tmpl.track,
                filter: tmpl.filter,
                reward: tmpl.reward(targetVal)
            });
        }

        this.updateUI();
    }

    /** Called when a new day starts */
    onNewDay() {
        this._wallLostThisWave = false;
        this.generateObjectives();
    }

    onWaveEnd(wallWasLost) {
        if (!wallWasLost) {
            this._trackProgress('wave_survived', 'any', 1);
        }
    }

    onKill(enemyType) {
        this._trackProgress('kill', enemyType, 1);
    }

    onBuild() {
        this._trackProgress('build', 'any', 1);
    }

    onCollect(resourceType, amount) {
        this._trackProgress('collect', resourceType, amount);
    }

    onHeal(amount) {
        this._trackProgress('heal', 'any', amount);
    }

    onWallLost() {
        this._wallLostThisWave = true;
    }

    _trackProgress(track, type, amount) {
        for (const obj of this.objectives) {
            if (obj.completed) continue;
            if (obj.track !== track) continue;
            if (!obj.filter(type)) continue;

            obj.progress = Math.min(obj.target, obj.progress + amount);

            if (obj.progress >= obj.target) {
                this._complete(obj);
            }
        }
        this.updateUI();
    }

    _complete(obj) {
        if (obj.completed) return;
        obj.completed = true;
        this.completedToday.push(obj.id);

        // Give reward
        const rs = this.game.resourceSystem;
        for (const [type, amount] of Object.entries(obj.reward)) {
            rs.addResource(type, amount);
        }

        // Format reward string
        const rewardStr = Object.entries(obj.reward).map(([t, a]) => {
            const icons = { wood: '🪵', stone: '🪨', metal: '⚙️', amethyst: '💜' };
            return `+${a}${icons[t] || ''}`;
        }).join(' ');

        this.game.showNotification(
            '✅ OBJECTIF COMPLÉTÉ',
            `${obj.label} — Récompense: ${rewardStr}`,
            '#44ff88',
            4
        );

        this.game.audioSystem?.playObjectiveComplete();
        this.updateUI();
    }

    updateUI() {
        const list = document.getElementById('objectives-list');
        if (!list) return;

        list.innerHTML = '';
        for (const obj of this.objectives) {
            const item = document.createElement('div');
            item.className = 'objective-item' + (obj.completed ? ' completed' : '');

            const progress = obj.target > 1
                ? ` (${obj.progress}/${obj.target})`
                : '';

            const rewardStr = Object.entries(obj.reward).map(([t, a]) => {
                const icons = { wood: '🪵', stone: '🪨', metal: '⚙️', amethyst: '💜' };
                return `${a}${icons[t] || ''}`;
            }).join(' ');

            item.innerHTML = `
                <span class="obj-status">${obj.completed ? '✅' : '⬜'}</span>
                <span class="obj-label">${obj.label}${progress}</span>
                <span class="obj-reward">${rewardStr}</span>
            `;

            list.appendChild(item);
        }
    }
}

export default ObjectiveSystem;
