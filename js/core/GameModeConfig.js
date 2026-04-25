/**
 * Game mode configuration
 * Centralises mode-specific rules for retro-compatible expansion.
 */

export const GameMode = Object.freeze({
    COOP: 'coop',
    VERSUS_FFA: 'versus_ffa'
});

const GAME_MODE_CONFIGS = Object.freeze({
    [GameMode.COOP]: Object.freeze({
        id: GameMode.COOP,
        label: 'Coop',
        usesSharedCrystal: true,
        defeatOnPlayerDeath: true,
        defeatOnCrystalDestroyed: true,
        respawnOnPlayerDeath: false,
        supportsElimination: false,
        usesPrestige: true,
        economy: Object.freeze({
            crystalUpgradeCostMultiplier: 1,
            buildingCostMultiplier: 1,
            buildingUpgradeCostMultiplier: 1,
            playerUpgradeCostMultiplier: 1
        })
    }),
    [GameMode.VERSUS_FFA]: Object.freeze({
        id: GameMode.VERSUS_FFA,
        label: '1v1v1v1',
        usesSharedCrystal: false,
        defeatOnPlayerDeath: false,
        defeatOnCrystalDestroyed: true,
        respawnOnPlayerDeath: true,
        supportsElimination: true,
        usesPrestige: false,
        economy: Object.freeze({
            crystalUpgradeCostMultiplier: 0.7,
            buildingCostMultiplier: 0.82,
            buildingUpgradeCostMultiplier: 0.78,
            playerUpgradeCostMultiplier: 0.8
        })
    })
});

export function normalizeGameMode(mode) {
    return GAME_MODE_CONFIGS[mode] ? mode : GameMode.COOP;
}

export function getGameModeConfig(mode) {
    return GAME_MODE_CONFIGS[normalizeGameMode(mode)];
}

export function createMatchState(mode) {
    const config = getGameModeConfig(mode);
    return {
        mode: config.id,
        localPlayerEliminated: false,
        localCrystalDestroyed: false,
        defeatReason: null,
        eliminatedSlots: new Set(),
        activeSlots: [],
        matchEnded: false,
        winnerSlot: null
    };
}
