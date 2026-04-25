/**
 * CrystalUpgradeSystem — progressive crystal levelling
 *
 * Players deposit resources at the crystal (press E) to unlock
 * new buildings and strengthen the crystal.  In co-op the host
 * is authoritative: clients send CRYSTAL_DEPOSIT, the host
 * accumulates and broadcasts CRYSTAL_UPGRADED when the threshold
 * is met.
 */

export const CRYSTAL_LEVELS = [
    {
        level: 0,
        name: 'Fragment de Cristal',
        color: '#9966ff',
        glowAlpha: 0.4,
        maxHealth: 800,
        regenRate: 1.0,
        unlocksBuildings: ['woodWall', 'door'],
        unlockLabel: null,
        upgradeCost: { wood: 40, stone: 25 }
    },
    {
        level: 1,
        name: 'Éclat de Cristal',
        color: '#aa77ff',
        glowAlpha: 0.48,
        maxHealth: 950,
        regenRate: 1.5,
        unlocksBuildings: ['stoneWall', 'barricade', 'spikeTrap', 'basicTurret', 'woodMiner', 'stoneMiner', 'workbench'],
        unlockLabel: 'Mur pierre · Tourelle · Collecteurs bois & pierre · Établi',
        upgradeCost: { wood: 45, stone: 60, metal: 20 }
    },
    {
        level: 2,
        name: 'Cristal Éveillé',
        color: '#bb88ff',
        glowAlpha: 0.52,
        maxHealth: 1150,
        regenRate: 2.0,
        unlocksBuildings: ['metalWall', 'laserTurret', 'metalMiner', 'oilBarrel'],
        unlockLabel: 'Mur métal · Tourelle laser · Extracteur métal',
        upgradeCost: { stone: 35, metal: 55, amethyst: 15 }
    },
    {
        level: 3,
        name: 'Cristal Résonnant',
        color: '#cc99ff',
        glowAlpha: 0.56,
        maxHealth: 1400,
        regenRate: 3.0,
        unlocksBuildings: ['slowTurret', 'amethystWall', 'watchtower', 'healingShrine', 'rallyBanner'],
        unlockLabel: 'Tourelle givre · Mur améthyste · Tour de guet · Sanctuaire',
        upgradeCost: { stone: 30, metal: 70, amethyst: 40 }
    },
    {
        level: 4,
        name: 'Cristal Radieux',
        color: '#ddaaff',
        glowAlpha: 0.62,
        maxHealth: 1700,
        regenRate: 4.0,
        unlocksBuildings: ['flameTurret', 'sniperTurret', 'ballista', 'forge'],
        unlockLabel: 'Tourelle flamme · Sniper · Baliste · Forge',
        upgradeCost: { stone: 50, metal: 90, amethyst: 90 }
    },
    {
        level: 5,
        name: 'Cristal Transcendant',
        color: '#eeddff',
        glowAlpha: 0.70,
        maxHealth: 2000,
        regenRate: 6.0,
        unlocksBuildings: [],
        unlockLabel: 'Niveau maximum — Aura de dégâts activée',
        upgradeCost: null,
        aura: { damage: 10, radius: 200 }
    }
];

// building key → minimum crystal level required
export const BUILDING_CRYSTAL_REQ = {};
for (const lvl of CRYSTAL_LEVELS) {
    for (const key of lvl.unlocksBuildings) {
        BUILDING_CRYSTAL_REQ[key] = lvl.level;
    }
}

export class CrystalUpgradeSystem {
    constructor(game) {
        this.game = game;

        this.level    = 0;
        this.deposits = { wood: 0, stone: 0, metal: 0, amethyst: 0 };

        // Aura tick timer
        this._auraTick = 0;
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    get currentData() { return CRYSTAL_LEVELS[this.level]; }
    get nextData()    { return CRYSTAL_LEVELS[this.level + 1] ?? null; }
    get isMaxLevel()  { return this.level >= CRYSTAL_LEVELS.length - 1; }

    isBuildingUnlocked(key) {
        return this.level >= (BUILDING_CRYSTAL_REQ[key] ?? 0);
    }

    getRequiredLevel(key) {
        return BUILDING_CRYSTAL_REQ[key] ?? 0;
    }

    getCurrentUpgradeCost() {
        return this.game.scaleCost(this.currentData.upgradeCost, 'crystalUpgrade');
    }

    /** Progress 0-1 toward next upgrade */
    getProgress() {
        if (this.isMaxLevel) return 1;
        const cost = this.getCurrentUpgradeCost();
        if (!cost) return 1;
        let needed = 0, done = 0;
        for (const [r, n] of Object.entries(cost)) {
            needed += n;
            done   += Math.min(this.deposits[r] ?? 0, n);
        }
        return needed > 0 ? done / needed : 0;
    }

    // ── Player interaction ────────────────────────────────────────────────────

    /**
     * Called when the local player presses E near the crystal.
     * Dumps as many resources as needed into the deposit pool.
     */
    depositResources() {
        if (this.isMaxLevel) {
            this.game.showNotification('Cristal Transcendant', 'Niveau maximum atteint !', '#ddaaff', 2);
            return;
        }

        const cost = this.getCurrentUpgradeCost();
        if (!cost) return;
        const deposited = {};
        let total = 0;

        for (const [res, needed] of Object.entries(cost)) {
            const stillNeeded = Math.max(0, needed - (this.deposits[res] ?? 0));
            if (stillNeeded <= 0) continue;
            const available = this.game.resourceSystem.getResource(res);
            const amount    = Math.min(stillNeeded, available);
            if (amount > 0) {
                this.game.resourceSystem.removeResource(res, amount);
                this.deposits[res] = (this.deposits[res] ?? 0) + amount;
                deposited[res] = amount;
                total += amount;
            }
        }

        if (total === 0) {
            if (!this._isComplete()) {
                this.game.showNotification(
                    'Ressources insuffisantes',
                    this._missingText(),
                    '#ff9966', 2
                );
            }
            return;
        }

        // Floating deposit text above crystal
        this._spawnDepositText(deposited);

        // Multiplayer client → send to host, host decides when to upgrade
        const nm = this.game.networkManager;
        if (nm?.inRoom && !nm.isHost) {
            nm.sendCrystalDeposit(deposited);
            return; // host will call _doUpgrade via broadcastCrystalUpgrade
        }

        if (this._isComplete()) this._doUpgrade();
    }

    // ── Network (received by host) ────────────────────────────────────────────

    receiveDeposit(amounts) {
        for (const [r, a] of Object.entries(amounts)) {
            this.deposits[r] = (this.deposits[r] ?? 0) + a;
        }
        if (this._isComplete()) this._doUpgrade();
    }

    /** Applied on all clients when host broadcasts CRYSTAL_UPGRADED */
    receiveUpgrade(newLevel) {
        this.level    = newLevel;
        this.deposits = { wood: 0, stone: 0, metal: 0, amethyst: 0 };
        this._applyStats();
        const data = this.currentData;
        this.game.showNotification(`✨ ${data.name}`, data.unlockLabel ?? '', '#cc99ff', 4);
        this._spawnUpgradeBurst();
        this.game.buildMenu?.renderItems();
    }

    /** Full state sync when a player joins mid-game */
    receiveSync(level, deposits) {
        this.level    = level;
        this.deposits = { ...deposits };
        this._applyStats();
        this.game.buildMenu?.renderItems();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update(deltaTime) {
        // Level 5 aura: deal damage to nearby enemies
        if (this.level < 5) return;
        const crystal = this.game.crystal;
        if (!crystal) return;

        this._auraTick += deltaTime;
        if (this._auraTick < 0.25) return; // tick every 0.25 s for perf
        const dmg = this.currentData.aura.damage * this._auraTick;
        const r2  = this.currentData.aura.radius ** 2;
        this._auraTick = 0;

        for (const e of this.game.entities) {
            if (e.type !== 'enemy' || e.destroyed) continue;
            const dx = e.x - crystal.x, dy = e.y - crystal.y;
            if (dx * dx + dy * dy <= r2) {
                e.health -= dmg;
                if (e.health <= 0) e.die?.();
            }
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    _isComplete() {
        if (this.isMaxLevel) return false;
        const cost = this.getCurrentUpgradeCost();
        if (!cost) return false;
        for (const [r, n] of Object.entries(cost)) {
            if ((this.deposits[r] ?? 0) < n) return false;
        }
        return true;
    }

    _doUpgrade() {
        this.level++;
        this.deposits = { wood: 0, stone: 0, metal: 0, amethyst: 0 };
        this._applyStats();

        const data = this.currentData;
        this.game.showNotification(`✨ ${data.name}`, data.unlockLabel ?? '', '#cc99ff', 4);
        this._spawnUpgradeBurst();
        this.game.buildMenu?.renderItems();

        const nm = this.game.networkManager;
        if (nm?.isHost && nm.inRoom) {
            nm.broadcastCrystalUpgrade(this.level);
        }
    }

    _applyStats() {
        const crystal = this.game.crystal;
        if (!crystal) return;
        const d = this.currentData;
        crystal.maxHealth = d.maxHealth;
        crystal.health    = Math.min(crystal.health + 200, crystal.maxHealth);
        crystal.regenRate = d.regenRate;
    }

    _missingText() {
        const cost = this.getCurrentUpgradeCost() ?? {};
        const icons = { wood: '🪵', stone: '🪨', metal: '⚙️', amethyst: '💜' };
        const parts = [];
        for (const [r, n] of Object.entries(cost)) {
            const have    = this.game.resourceSystem.getResource(r);
            const deposited = this.deposits[r] ?? 0;
            const rem     = n - deposited;
            if (rem > 0) parts.push(`${icons[r]}${rem - Math.min(rem, have)} manquant`);
        }
        return parts.join('  ') || 'Ressources insuffisantes';
    }

    _spawnDepositText(deposited) {
        const crystal = this.game.crystal;
        if (!crystal) return;
        const icons = { wood: '🪵', stone: '🪨', metal: '⚙️', amethyst: '💜' };
        const text  = Object.entries(deposited)
            .map(([r, a]) => `+${a}${icons[r]}`)
            .join(' ');

        this.game.addParticle({
            x: crystal.x,
            y: crystal.y - 50,
            vy: -25,
            lifetime: 2.0,
            age: 0,
            text,
            destroyed: false,
            update(dt) { this.y += this.vy * dt; this.age += dt; if (this.age >= this.lifetime) this.destroyed = true; },
            render(ctx) {
                const alpha = Math.min(1, (this.lifetime - this.age) / 0.4);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ccffcc';
                ctx.font = 'bold 13px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1;
            }
        });
    }

    _spawnUpgradeBurst() {
        const crystal = this.game.crystal;
        if (!crystal) return;
        this.game.camera.shake(15, 0.8);

        for (let i = 0; i < 36; i++) {
            const angle = (Math.PI * 2 / 36) * i;
            const speed = 100 + Math.random() * 150;
            const lvl   = this.level;
            this.game.addParticle({
                x: crystal.x, y: crystal.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                lifetime: 1.0 + Math.random() * 0.8,
                age: 0, destroyed: false, lvl,
                update(dt) {
                    this.x  += this.vx * dt;
                    this.y  += this.vy * dt;
                    this.vx *= 0.94;
                    this.vy *= 0.94;
                    this.age += dt;
                    if (this.age >= this.lifetime) this.destroyed = true;
                },
                render(ctx) {
                    const alpha = 1 - this.age / this.lifetime;
                    const hue   = 270 + this.lvl * 12;
                    const size  = 5 * (1 - this.age / this.lifetime);
                    ctx.fillStyle = `hsla(${hue},100%,80%,${alpha})`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }
}
