export const VERSUS_SLOT_ORDER = Object.freeze(['north', 'east', 'south', 'west']);

export const VERSUS_SLOT_COLORS = Object.freeze({
    north: '#7dd3fc',
    east: '#fca5a5',
    south: '#86efac',
    west: '#fcd34d'
});

export const VERSUS_SLOT_LABELS = Object.freeze({
    north: 'NORD',
    east: 'EST',
    south: 'SUD',
    west: 'OUEST'
});

const PLAYER_ISLANDS = Object.freeze({
    north: { id: 'north', gridX: 1, gridY: 0, biome: 'forest', tile: 0, radiusXTiles: 22, radiusYTiles: 22 },
    east:  { id: 'east',  gridX: 2, gridY: 1, biome: 'rocky',  tile: 2, radiusXTiles: 22, radiusYTiles: 22 },
    south: { id: 'south', gridX: 1, gridY: 2, biome: 'plains', tile: 0, radiusXTiles: 22, radiusYTiles: 22 },
    west:  { id: 'west',  gridX: 0, gridY: 1, biome: 'forest', tile: 0, radiusXTiles: 22, radiusYTiles: 22 }
});

const NEUTRAL_ISLANDS = Object.freeze([
    {
        id: 'northwest', gridX: 0, gridY: 0, type: 'neutral', biome: 'forest', tile: 0, radiusXTiles: 20, radiusYTiles: 20,
        resources: ['wood', 'wood', 'wood', 'wood', 'wood', 'wood', 'stone', 'stone', 'stone', 'stone', 'stone', 'metal', 'metal', 'metal', 'amethyst', 'amethyst']
    },
    {
        id: 'northeast', gridX: 2, gridY: 0, type: 'neutral', biome: 'rocky', tile: 2, radiusXTiles: 20, radiusYTiles: 20,
        resources: ['stone', 'stone', 'stone', 'stone', 'metal', 'metal', 'metal', 'metal', 'metal', 'amethyst', 'amethyst', 'amethyst', 'wood', 'wood', 'wood', 'wood']
    },
    {
        id: 'southwest', gridX: 0, gridY: 2, type: 'neutral', biome: 'forest', tile: 0, radiusXTiles: 20, radiusYTiles: 20,
        resources: ['wood', 'wood', 'wood', 'wood', 'wood', 'stone', 'stone', 'stone', 'stone', 'metal', 'metal', 'metal', 'metal', 'amethyst', 'amethyst', 'amethyst']
    },
    {
        id: 'southeast', gridX: 2, gridY: 2, type: 'neutral', biome: 'tundra', tile: 7, radiusXTiles: 20, radiusYTiles: 20,
        resources: ['metal', 'metal', 'metal', 'metal', 'metal', 'amethyst', 'amethyst', 'amethyst', 'amethyst', 'stone', 'stone', 'stone', 'stone', 'wood', 'wood', 'wood']
    }
]);

const LOCKED_ISLAND = Object.freeze({
    id: 'center',
    gridX: 1,
    gridY: 1,
    type: 'locked',
    biome: 'plains',
    tile: 1,
    radiusXTiles: 18,
    radiusYTiles: 18
});

const BRIDGE_LINKS = Object.freeze([
    ['northwest', 'north'],
    ['north', 'northeast'],
    ['northwest', 'west'],
    ['northeast', 'east'],
    ['west', 'southwest'],
    ['east', 'southeast'],
    ['southwest', 'south'],
    ['south', 'southeast']
]);

const SLOT_SPAWN_OFFSETS = Object.freeze({
    north: { x: 0, y: 320 },
    east:  { x: -320, y: 0 },
    south: { x: 0, y: -320 },
    west:  { x: 320, y: 0 }
});

const RESOURCE_DENSITY = Object.freeze({
    playerExtraNodes: 90,
    neutralExtraNodes: 500
});

export function resolveVersusSlot(playerId = null) {
    const match = String(playerId ?? '').match(/player_(\d+)/i);
    const index = match ? Math.max(0, Number(match[1]) - 1) : 0;
    return VERSUS_SLOT_ORDER[index % VERSUS_SLOT_ORDER.length];
}

export function buildVersusArena(world, constants) {
    const { BiomeType, TileType } = constants;
    const cellTilesX = Math.floor(world.tilesX / 3);
    const cellTilesY = Math.floor(world.tilesY / 3);

    world.supportsCaves = false;
    world.landmarks = [];
    world.pathSegments = [];

    for (let y = 0; y < world.tilesY; y++) {
        world.tiles[y] = [];
        world.biomes[y] = [];
        for (let x = 0; x < world.tilesX; x++) {
            world.tiles[y][x] = TileType.WATER;
            world.biomes[y][x] = BiomeType.PLAINS;
        }
    }

    const islands = [];
    const islandById = new Map();
    const slots = {};

    for (const [slot, def] of Object.entries(PLAYER_ISLANDS)) {
        const island = createIsland(world, {
            ...def,
            type: 'player',
            slot,
            cellTilesX,
            cellTilesY
        });
        islands.push(island);
        islandById.set(island.id, island);
        slots[slot] = {
            islandId: island.id,
            spawn: island.spawn,
            crystal: island.crystal,
            buildZone: island.buildZone
        };
    }

    for (const def of NEUTRAL_ISLANDS) {
        const island = createIsland(world, {
            ...def,
            cellTilesX,
            cellTilesY
        });
        islands.push(island);
        islandById.set(island.id, island);
    }

    const lockedIsland = createIsland(world, {
        ...LOCKED_ISLAND,
        cellTilesX,
        cellTilesY
    });
    islands.push(lockedIsland);
    islandById.set(lockedIsland.id, lockedIsland);

    for (const [fromId, toId] of BRIDGE_LINKS) {
        const from = islandById.get(fromId);
        const to = islandById.get(toId);
        if (from && to) {
            paintBridge(world, from, to, { BiomeType, TileType });
        }
    }

    for (const slot of VERSUS_SLOT_ORDER) {
        seedPlayerIslandResources(world, islandById.get(slot));
    }

    for (const island of islands) {
        if (island.type === 'neutral') {
            seedNeutralIslandResources(world, island);
        }
    }

    world.arenaData = {
        type: 'versus_ffa',
        islands,
        slots,
        lockedIslandId: lockedIsland.id
    };
}

function createIsland(world, def) {
    const ts = world.tileSize;
    const centerTX = def.gridX * def.cellTilesX + Math.floor(def.cellTilesX / 2);
    const centerTY = def.gridY * def.cellTilesY + Math.floor(def.cellTilesY / 2);
    const centerX = centerTX * ts + ts / 2;
    const centerY = centerTY * ts + ts / 2;
    const radiusXTiles = def.radiusXTiles ?? 18;
    const radiusYTiles = def.radiusYTiles ?? 18;

    paintIsland(world, centerTX, centerTY, radiusXTiles, radiusYTiles, def.tile, def.biome);

    const radiusX = radiusXTiles * ts;
    const radiusY = radiusYTiles * ts;
    const bounds = {
        left: centerX - radiusX,
        right: centerX + radiusX + ts,
        top: centerY - radiusY,
        bottom: centerY + radiusY + ts
    };

    const buildPadding = def.type === 'player' ? 192 : 128;
    const island = {
        id: def.id,
        type: def.type,
        slot: def.slot ?? null,
        biome: def.biome,
        resources: def.resources ?? [],
        center: { x: centerX, y: centerY },
        radiusXTiles,
        radiusYTiles,
        bounds,
        shape: {
            type: 'ellipse',
            centerX,
            centerY,
            radiusX,
            radiusY
        },
        buildZone: {
            type: 'ellipse',
            centerX,
            centerY,
            radiusX: Math.max(160, radiusX - buildPadding),
            radiusY: Math.max(160, radiusY - buildPadding)
        }
    };

    if (def.slot) {
        const spawnOffset = SLOT_SPAWN_OFFSETS[def.slot];
        island.crystal = { x: centerX, y: centerY };
        island.spawn = {
            x: centerX + spawnOffset.x,
            y: centerY + spawnOffset.y
        };
    }

    return island;
}

function paintIsland(world, centerTX, centerTY, radiusXTiles, radiusYTiles, tile, biome) {
    for (let ty = centerTY - radiusYTiles - 1; ty <= centerTY + radiusYTiles + 1; ty++) {
        for (let tx = centerTX - radiusXTiles - 1; tx <= centerTX + radiusXTiles + 1; tx++) {
            if (tx < 0 || tx >= world.tilesX || ty < 0 || ty >= world.tilesY) continue;

            const nx = (tx - centerTX) / Math.max(1, radiusXTiles);
            const ny = (ty - centerTY) / Math.max(1, radiusYTiles);
            const dist = Math.sqrt(nx * nx + ny * ny);
            const edgeNoise = getEdgeNoise(tx, ty);
            const shoreline = 0.97 + edgeNoise * 0.08;

            if (dist <= shoreline) {
                world.tiles[ty][tx] = tile;
                world.biomes[ty][tx] = biome;
            }
        }
    }
}

function paintBridge(world, from, to, constants) {
    const { BiomeType, TileType } = constants;
    const ts = world.tileSize;
    const bridgeHalfWidthTiles = 2;
    const horizontal = Math.abs(from.center.y - to.center.y) < ts;

    if (horizontal) {
        const rowTY = Math.round(from.center.y / ts - 0.5);
        const leftIsland = from.center.x <= to.center.x ? from : to;
        const rightIsland = leftIsland === from ? to : from;
        const startTX = Math.round(leftIsland.center.x / ts - 0.5) + leftIsland.radiusXTiles - 1;
        const endTX = Math.round(rightIsland.center.x / ts - 0.5) - rightIsland.radiusXTiles + 1;

        for (let tx = startTX; tx <= endTX; tx++) {
            for (let ty = rowTY - bridgeHalfWidthTiles; ty <= rowTY + bridgeHalfWidthTiles; ty++) {
                if (tx < 0 || tx >= world.tilesX || ty < 0 || ty >= world.tilesY) continue;
                world.tiles[ty][tx] = TileType.DIRT;
                world.biomes[ty][tx] = BiomeType.PLAINS;
            }
        }
        return;
    }

    const colTX = Math.round(from.center.x / ts - 0.5);
    const topIsland = from.center.y <= to.center.y ? from : to;
    const bottomIsland = topIsland === from ? to : from;
    const startTY = Math.round(topIsland.center.y / ts - 0.5) + topIsland.radiusYTiles - 1;
    const endTY = Math.round(bottomIsland.center.y / ts - 0.5) - bottomIsland.radiusYTiles + 1;

    for (let ty = startTY; ty <= endTY; ty++) {
        for (let tx = colTX - bridgeHalfWidthTiles; tx <= colTX + bridgeHalfWidthTiles; tx++) {
            if (tx < 0 || tx >= world.tilesX || ty < 0 || ty >= world.tilesY) continue;
            world.tiles[ty][tx] = TileType.DIRT;
            world.biomes[ty][tx] = BiomeType.PLAINS;
        }
    }
}

function seedPlayerIslandResources(world, island) {
    if (!island) return;

    placeNodes(world, island, [
        { dx: -280, dy: -140, type: 'wood' },
        { dx: 260, dy: -160, type: 'wood' },
        { dx: -340, dy: 80, type: 'wood' },
        { dx: 320, dy: 110, type: 'wood' },
        { dx: -220, dy: 260, type: 'stone' },
        { dx: 220, dy: 280, type: 'stone' },
        { dx: -40, dy: 340, type: 'stone' },
        { dx: 60, dy: -320, type: 'stone' },
        { dx: -120, dy: 60, type: 'metal' },
        { dx: 160, dy: 30, type: 'metal' },
        { dx: 0, dy: 220, type: 'metal' },
        { dx: 0, dy: -220, type: 'amethyst' }
    ]);

    seedRandomIslandResources(world, island, {
        targetCount: RESOURCE_DENSITY.playerExtraNodes,
        spacing: 24,
        minRadiusFactor: 0,
        maxRadiusFactor: 1,
        avoidCrystalRadius: 220,
        avoidSpawnRadius: 180,
        resourcePool: [
            'wood', 'wood', 'wood', 'wood', 'wood', 'wood', 'wood',
            'stone', 'stone', 'stone', 'stone', 'stone',
            'metal', 'metal', 'metal',
            'amethyst'
        ]
    });
}

function seedNeutralIslandResources(world, island) {
    const baselinePool = [
        ...island.resources,
        ...island.resources,
        ...island.resources.slice(0, Math.ceil(island.resources.length * 0.75))
    ];

    seedRandomIslandResources(world, island, {
        targetCount: 52,
        spacing: 22,
        minRadiusFactor: 0,
        maxRadiusFactor: 1,
        resourcePool: baselinePool
    });

    const boostedPool = [
        ...island.resources,
        ...island.resources,
        ...island.resources,
        ...island.resources,
        ...island.resources.filter(type => type === 'metal' || type === 'amethyst')
    ];

    seedRandomIslandResources(world, island, {
        targetCount: RESOURCE_DENSITY.neutralExtraNodes,
        spacing: 20,
        minRadiusFactor: 0,
        maxRadiusFactor: 1,
        resourcePool: boostedPool
    });
}

function seedRandomIslandResources(world, island, options = {}) {
    const targetCount = Math.max(0, options.targetCount ?? 0);
    if (!island || targetCount <= 0) return;

    const minRadiusFactor = clamp(options.minRadiusFactor ?? 0.25, 0.05, 0.98);
    const maxRadiusFactor = clamp(options.maxRadiusFactor ?? 0.95, minRadiusFactor + 0.01, 1.0);
    const baseSpacing = Math.max(10, options.spacing ?? 24);
    const spacingPhases = [baseSpacing, Math.max(12, baseSpacing - 4), Math.max(10, baseSpacing - 8)];
    const resourcePool = options.resourcePool?.length
        ? options.resourcePool
        : (island.resources?.length ? island.resources : ['wood', 'stone']);
    const avoidCrystalRadius = Math.max(0, options.avoidCrystalRadius ?? 0);
    const avoidSpawnRadius = Math.max(0, options.avoidSpawnRadius ?? 0);

    const worldSeed = Number(world?.game?._worldSeed ?? 0);
    const baseSeed = stringSeed(`${worldSeed}:${island.id}:${island.type}`);
    let placed = 0;

    for (let phase = 0; phase < spacingPhases.length && placed < targetCount; phase++) {
        const spacing = spacingPhases[phase];
        const attempts = Math.max(300, (targetCount - placed) * 28);

        for (let i = 0; i < attempts && placed < targetCount; i++) {
            const step = (phase * 100000) + i;
            const nx = randomFromSeed(baseSeed, step * 11 + 17) * 2 - 1;
            const ny = randomFromSeed(baseSeed, step * 13 + 29) * 2 - 1;

            const x = island.center.x + nx * island.shape.radiusX;
            const y = island.center.y + ny * island.shape.radiusY;

            if (!world.isPointInsideIslandZone(island.shape, x, y)) continue;

            const dxNorm = (x - island.center.x) / Math.max(1, island.shape.radiusX);
            const dyNorm = (y - island.center.y) / Math.max(1, island.shape.radiusY);
            const radialFactor = Math.sqrt((dxNorm * dxNorm) + (dyNorm * dyNorm));
            if (radialFactor < minRadiusFactor || radialFactor > maxRadiusFactor) continue;

            if (avoidCrystalRadius > 0 && island.crystal) {
                const dxCrystal = x - island.crystal.x;
                const dyCrystal = y - island.crystal.y;
                if ((dxCrystal * dxCrystal) + (dyCrystal * dyCrystal) < avoidCrystalRadius * avoidCrystalRadius) continue;
            }

            if (avoidSpawnRadius > 0 && island.spawn) {
                const dxSpawn = x - island.spawn.x;
                const dySpawn = y - island.spawn.y;
                if ((dxSpawn * dxSpawn) + (dySpawn * dySpawn) < avoidSpawnRadius * avoidSpawnRadius) continue;
            }

            const typeIndex = Math.floor(randomFromSeed(baseSeed, step * 23 + 71) * resourcePool.length);
            const resourceType = resourcePool[typeIndex] ?? 'wood';
            if (world.addResourceNode(x, y, resourceType, spacing)) {
                placed++;
            }
        }
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function stringSeed(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function randomFromSeed(seed, salt = 0) {
    const value = Math.sin((seed + salt + 1) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

function placeNodes(world, island, placements) {
    for (const placement of placements) {
        world.addResourceNode(
            island.center.x + placement.dx,
            island.center.y + placement.dy,
            placement.type,
            24
        );
    }
}

function getEdgeNoise(tx, ty) {
    const value = Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453;
    return value - Math.floor(value) - 0.5;
}
