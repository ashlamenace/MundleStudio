/**
 * Artifact System - Passive bonus items dropped by bosses
 * Player can equip up to 3 artifacts simultaneously
 */

export const ARTIFACT_DEFS = {
    titanHeart: {
        id: 'titanHeart',
        name: 'Cœur de Titan',
        icon: '❤️',
        rarity: 'rare',
        description: '+30 PV maximum',
        color: '#ff4444',
        onEquip(player) { player.maxHealth += 30; player.health += 30; },
        onUnequip(player) { player.maxHealth -= 30; player.health = Math.min(player.health, player.maxHealth); }
    },
    frostCrystal: {
        id: 'frostCrystal',
        name: 'Cristal de Givre',
        icon: '❄️',
        rarity: 'rare',
        description: 'Les ennemis proches subissent 1 DPS froid',
        color: '#66ccff',
        onEquip(player) { player._frostAuraActive = true; },
        onUnequip(player) { player._frostAuraActive = false; }
    },
    lightningRune: {
        id: 'lightningRune',
        name: 'Rune de Foudre',
        icon: '⚡',
        rarity: 'epic',
        description: '15% chance de chaîner chaque attaque sur un ennemi adjacent',
        color: '#ffff44',
        onEquip(player) { player._lightningChanceBonus = 0.15; },
        onUnequip(player) { player._lightningChanceBonus = 0; }
    },
    hasteStone: {
        id: 'hasteStone',
        name: 'Pierre de Hâte',
        icon: '💨',
        rarity: 'epic',
        description: '-0.05s de cooldown sur toutes les armes',
        color: '#44ffaa',
        onEquip(player) { player._hasteBonus = 0.05; },
        onUnequip(player) { player._hasteBonus = 0; }
    },
    harvesterAmulet: {
        id: 'harvesterAmulet',
        name: 'Amulette du Récolteur',
        icon: '⛏️',
        rarity: 'rare',
        description: '+30% production des miners automatiques',
        color: '#ffaa44',
        onEquip(player) {
            player._minerBonus = 0.3;
            player.game?.buildingSystem?.buildings
                ?.filter(b => b.type === 'autoMiner')
                .forEach(b => b.updateAutoMinerStats());
        },
        onUnequip(player) {
            player._minerBonus = 0;
            player.game?.buildingSystem?.buildings
                ?.filter(b => b.type === 'autoMiner')
                .forEach(b => b.updateAutoMinerStats());
        }
    },
    shadowCloak: {
        id: 'shadowCloak',
        name: 'Manteau d\'Ombre',
        icon: '🌑',
        rarity: 'legendary',
        description: '+20% esquive (invincibilité 0.1s supplémentaire)',
        color: '#8844ff',
        onEquip(player) { player.invincibleTime += 0.1; player._shadowCloakActive = true; },
        onUnequip(player) { player._shadowCloakActive = false; }
    },
    voidEssence: {
        id: 'voidEssence',
        name: 'Essence du Vide',
        icon: '🌀',
        rarity: 'legendary',
        description: '+25% dégâts, -15% PV max',
        color: '#9944cc',
        onEquip(player) { player.damageMultiplier += 0.25; player.maxHealth = Math.max(50, player.maxHealth - Math.floor(player.maxHealth * 0.15)); player.health = Math.min(player.health, player.maxHealth); },
        onUnequip(player) { player.damageMultiplier -= 0.25; player.maxHealth = Math.floor(player.maxHealth / 0.85); }
    },
    crystalShard: {
        id: 'crystalShard',
        name: 'Éclat de Cristal',
        icon: '💜',
        rarity: 'epic',
        description: 'Regen +3 PV/sec supplémentaires',
        color: '#cc88ff',
        onEquip(player) { player.healthRegen += 3; },
        onUnequip(player) { player.healthRegen -= 3; }
    }
};

// Which artifacts drop from which boss types
export const BOSS_DROPS = {
    berserkTitan:  ['titanHeart', 'voidEssence'],
    frostLord:     ['frostCrystal', 'crystalShard'],
    infernoDrake:  ['lightningRune', 'hasteStone'],
    stormWraith:   ['lightningRune', 'shadowCloak'],
    voidBehemoth:  ['voidEssence', 'crystalShard', 'harvesterAmulet']
};

export class ArtifactSystem {
    constructor(game) {
        this.game = game;
        this.maxSlots = 3;
        this.equipped = []; // Array of artifact ids (max 3)
        this.inventory = []; // All owned artifact ids
    }

    /**
     * Called when a boss dies — roll a drop
     */
    rollBossDrop(bossType) {
        const pool = BOSS_DROPS[bossType];
        if (!pool) return null;

        const artifactId = pool[Math.floor(Math.random() * pool.length)];

        // Don't give duplicates already in inventory
        if (this.inventory.includes(artifactId)) {
            // Give a random other artifact instead
            const others = Object.keys(ARTIFACT_DEFS).filter(id => !this.inventory.includes(id));
            if (others.length === 0) {
                // Give resources as consolation
                this.game.resourceSystem.addResource('amethyst', 10);
                return null;
            }
            return this._giveArtifact(others[Math.floor(Math.random() * others.length)]);
        }

        return this._giveArtifact(artifactId);
    }

    _giveArtifact(id) {
        const def = ARTIFACT_DEFS[id];
        if (!def) return null;

        this.inventory.push(id);

        // Auto-equip if slot available
        if (this.equipped.length < this.maxSlots) {
            this.equip(id);
        }

        // Notification
        this.game.showNotification(
            def.icon + ' ARTIFACT: ' + def.name,
            def.description,
            def.color,
            5
        );

        this.game.audioSystem?.playArtifact();

        this.updateUI();
        return def;
    }

    equip(id) {
        if (this.equipped.includes(id)) return;
        if (this.equipped.length >= this.maxSlots) {
            this.game.showFloatingText(
                this.game.player.x, this.game.player.y - 40,
                'Tous les slots d\'artifact sont occupés !', '#ff4444'
            );
            return;
        }
        const def = ARTIFACT_DEFS[id];
        if (!def) return;
        this.equipped.push(id);
        def.onEquip(this.game.player);
        this.updateUI();
    }

    unequip(id) {
        const idx = this.equipped.indexOf(id);
        if (idx === -1) return;
        const def = ARTIFACT_DEFS[id];
        if (def) def.onUnequip(this.game.player);
        this.equipped.splice(idx, 1);
        this.updateUI();
    }

    /**
     * Passive effects tick (frost aura, etc.)
     */
    update(dt) {
        const player = this.game.player;

        // Frost aura from frostCrystal
        if (player._frostAuraActive) {
            const enemies = this.game.getEnemies();
            for (const enemy of enemies) {
                const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                if (dist < 80) {
                    enemy.takeDamage(1 * dt, player, 'frost');
                }
            }
        }

        // Haste: apply attack speed reduction
        if (player._hasteBonus) {
            // Applied directly in Player.performAction via attackCooldown adjustment
        }

        // Miner bonus: applied in Building.updateAutoMinerStats via player._minerBonus
    }

    updateUI() {
        const container = document.getElementById('artifact-slots');
        if (!container) return;

        container.innerHTML = '';
        for (let i = 0; i < this.maxSlots; i++) {
            const slotEl = document.createElement('div');
            slotEl.className = 'artifact-slot';

            const id = this.equipped[i];
            if (id) {
                const def = ARTIFACT_DEFS[id];
                slotEl.title = `${def.name}: ${def.description}`;
                slotEl.style.borderColor = def.color;
                slotEl.textContent = def.icon;
                slotEl.addEventListener('click', () => {
                    this.unequip(id);
                    this.updateUI();
                });
            } else {
                slotEl.classList.add('empty');
                slotEl.textContent = '—';
            }

            container.appendChild(slotEl);
        }
    }
}

export default ArtifactSystem;
