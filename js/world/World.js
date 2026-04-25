/**
 * World class - manages the game world, tiles, and resource nodes
 * Enhanced with biomes, landmarks, and structures
 */

import { Utils } from '../core/Utils.js';
import { ResourceNode } from '../entities/ResourceNode.js';
import { buildVersusArena } from './VersusArena.js';

// Tile types
export const TileType = {
    GRASS: 0,
    DIRT: 1,
    STONE: 2,
    SAND: 3,
    WATER: 4,
    CAVE_FLOOR: 5,
    CAVE_WALL: 6,
    SNOW: 7,
    ICE: 8,
    MUD: 9,
    LAVA: 10,
    OBSIDIAN: 11,
    SANDSTONE: 12
};

// Biome types
export const BiomeType = {
    PLAINS: 'plains',
    FOREST: 'forest',
    ROCKY: 'rocky',
    CAVE: 'cave',
    DESERT: 'desert',
    TUNDRA: 'tundra',
    SWAMP: 'swamp',
    VOLCANIC: 'volcanic'
};

// Biome configuration
const BiomeConfig = {
    plains: {
        tiles: [TileType.GRASS, TileType.DIRT],
        resources: ['wood', 'stone'],
        color: '#2d5a27'
    },
    forest: {
        tiles: [TileType.GRASS],
        resources: ['wood', 'wood', 'stone'],
        color: '#1a4a1a'
    },
    rocky: {
        tiles: [TileType.STONE, TileType.DIRT],
        resources: ['stone', 'metal'],
        color: '#5a5a5a'
    },
    desert: {
        tiles: [TileType.SAND, TileType.SANDSTONE],
        resources: ['stone', 'metal', 'gold'],
        color: '#c2a060'
    },
    tundra: {
        tiles: [TileType.SNOW, TileType.ICE],
        resources: ['metal', 'amethyst'],
        color: '#e0e8f0'
    },
    swamp: {
        tiles: [TileType.MUD, TileType.WATER],
        resources: ['wood', 'stone'],
        color: '#3a4a30'
    },
    volcanic: {
        tiles: [TileType.OBSIDIAN, TileType.STONE],
        resources: ['metal', 'amethyst', 'diamond'],
        color: '#2a1a1a'
    }
};

export class World {
    constructor(game, width, height, options = {}) {
        this.game = game;
        this.width = width;
        this.height = height;
        this.mode = options.mode ?? 'coop';
        this.tileSize = 32;
        this.tilesX = Math.ceil(width / this.tileSize);
        this.tilesY = Math.ceil(height / this.tileSize);

        // Tile data
        this.tiles = [];
        this.biomes = [];

        // Legacy generated barriers. Kept empty; player-built walls live in BuildingSystem.
        this.barriers = [];

        // Resource nodes
        this.resourceNodes = [];

        // Structured map points
        this.landmarks = [];
        this.pathSegments = [];
        this.arenaData = null;
        this.supportsCaves = true;

        // OPTIMIZATION: Pre-computed tile colors (cache)
        this.tileColors = [];

        // Base colors for tiles (no per-frame calculation)
        this.baseTileColors = {
            0: '#3f7d45',  // GRASS
            1: '#775438',  // DIRT
            2: '#777f82',  // STONE
            3: '#d7bc74',  // SAND
            4: '#27637a',  // WATER
            5: '#2b2f45',  // CAVE_FLOOR
            6: '#171a2b',  // CAVE_WALL
            7: '#dce7eb',  // SNOW
            8: '#9bd2de',  // ICE
            9: '#536040',  // MUD
            10: '#d85a2a', // LAVA
            11: '#32243c', // OBSIDIAN
            12: '#b99f5f'  // SANDSTONE
        };

        // Offscreen chunk cache
        this.chunkPixels = 512; // pixels per chunk side
        this.chunkTiles  = this.chunkPixels / this.tileSize; // 16 tiles per chunk
        this.chunksX = Math.ceil(this.width  / this.chunkPixels);
        this.chunksY = Math.ceil(this.height / this.chunkPixels);
        this.offscreenChunks = null; // built after generate()

        // Generate the world
        this.generate();

        // Pre-render tiles into offscreen canvases (one-time cost)
        this._buildChunks();
    }

    /**
     * Generate the world procedurally with radial biomes
     */
    generate() {
        if (this.mode === 'versus_ffa') {
            buildVersusArena(this, { BiomeType, TileType });
            return;
        }

        const centerX = this.tilesX / 2;
        const centerY = this.tilesY / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        // Initialize tiles
        for (let y = 0; y < this.tilesY; y++) {
            this.tiles[y] = [];
            this.biomes[y] = [];
            for (let x = 0; x < this.tilesX; x++) {
                // Calculate distance from center (normalized 0-1)
                const dx = x - centerX;
                const dy = y - centerY;
                const distFromCenter = Math.sqrt(dx * dx + dy * dy) / maxDist;

                // Use noise for terrain variation
                const noiseValue = Utils.noise2D(x * 0.05, y * 0.05);
                const biomeNoise = Utils.noise2D(x * 0.03 + 100, y * 0.03 + 100);

                // Determine biome based on distance (radial rings)
                let biome = this.getBiomeByDistance(distFromCenter, biomeNoise, x, y);
                let tileType = this.getTileForBiome(biome, noiseValue);

                // Water patches in swamp
                if (biome === BiomeType.SWAMP && noiseValue > 0.4) {
                    tileType = TileType.WATER;
                }

                // Lava patches in volcanic
                if (biome === BiomeType.VOLCANIC && noiseValue > 0.6) {
                    tileType = TileType.LAVA;
                }

                // Ice patches in tundra
                if (biome === BiomeType.TUNDRA && noiseValue > 0.5) {
                    tileType = TileType.ICE;
                }

                this.tiles[y][x] = tileType;
                this.biomes[y][x] = biome;
            }
        }

        // Clear spawn area
        this.clearSpawnArea();

        // Give the world readable routes and destination zones before spawning loot.
        this.createLandmarks();
        this.carvePaths();
        this.carveLandmarks();
        this.clearSpawnArea();

        // Generate resource nodes
        this.generateResources();

        // Generated tier gates were removed: progression is handled by exploration and tools.
    }

    /**
     * Get biome based on distance from center (radial distribution)
     */
    getBiomeByDistance(distNorm, noise, x, y) {
        // Add angle for variety
        const centerX = this.tilesX / 2;
        const centerY = this.tilesY / 2;
        const angle = Math.atan2(y - centerY, x - centerX);
        const sector = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 4); // 4 sectors

        if (distNorm < 0.15) {
            return BiomeType.PLAINS;
        } else if (distNorm < 0.35) {
            return BiomeType.FOREST;
        } else if (distNorm < 0.55) {
            // Middle ring - alternating biomes by sector
            if (sector === 0 || sector === 2) {
                return noise > 0 ? BiomeType.DESERT : BiomeType.ROCKY;
            } else {
                return noise > 0 ? BiomeType.SWAMP : BiomeType.FOREST;
            }
        } else {
            // Outer ring - hardest biomes
            if (sector === 0 || sector === 2) {
                return BiomeType.VOLCANIC;
            } else {
                return BiomeType.TUNDRA;
            }
        }
    }

    /**
     * Get tile type for a biome
     */
    getTileForBiome(biome, noiseValue) {
        switch (biome) {
            case BiomeType.PLAINS:
                return noiseValue > 0.3 ? TileType.DIRT : TileType.GRASS;
            case BiomeType.FOREST:
                return TileType.GRASS;
            case BiomeType.ROCKY:
                return noiseValue > 0 ? TileType.STONE : TileType.DIRT;
            case BiomeType.DESERT:
                return noiseValue > 0.2 ? TileType.SANDSTONE : TileType.SAND;
            case BiomeType.TUNDRA:
                return TileType.SNOW;
            case BiomeType.SWAMP:
                return noiseValue > 0.2 ? TileType.MUD : TileType.GRASS;
            case BiomeType.VOLCANIC:
                return noiseValue > 0.3 ? TileType.OBSIDIAN : TileType.STONE;
            default:
                return TileType.GRASS;
        }
    }

    /**
     * Clear area around spawn point
     */
    clearSpawnArea() {
        const centerX = Math.floor(this.tilesX / 2);
        const centerY = Math.floor(this.tilesY / 2);
        const clearRadius = 6;

        for (let y = centerY - clearRadius; y <= centerY + clearRadius; y++) {
            for (let x = centerX - clearRadius; x <= centerX + clearRadius; x++) {
                if (y >= 0 && y < this.tilesY && x >= 0 && x < this.tilesX) {
                    this.tiles[y][x] = TileType.GRASS;
                    this.biomes[y][x] = BiomeType.PLAINS;
                }
            }
        }
    }

    /**
     * Create fixed points of interest around the crystal.
     */
    createLandmarks() {
        const cx = this.width / 2;
        const cy = this.height / 2;

        this.landmarks = [
            {
                id: 'stoneworks',
                kind: 'quarry',
                x: cx - 260,
                y: cy - 520,
                radius: 150,
                biome: BiomeType.ROCKY,
                tile: TileType.STONE,
                resources: ['stone', 'stone', 'stone', 'metal'],
                resourceCount: 42,
                cave: true,
                difficulty: 2
            },
            {
                id: 'greenwood',
                kind: 'grove',
                x: cx + 540,
                y: cy - 110,
                radius: 165,
                biome: BiomeType.FOREST,
                tile: TileType.GRASS,
                resources: ['wood', 'wood', 'wood', 'stone'],
                resourceCount: 54,
                cave: false,
                difficulty: 1
            },
            {
                id: 'reedmarsh',
                kind: 'marsh',
                x: cx + 150,
                y: cy + 610,
                radius: 155,
                biome: BiomeType.SWAMP,
                tile: TileType.MUD,
                resources: ['wood', 'wood', 'stone'],
                resourceCount: 38,
                cave: true,
                difficulty: 2
            },
            {
                id: 'fallen-keep',
                kind: 'ruins',
                x: cx - 650,
                y: cy + 40,
                radius: 145,
                biome: BiomeType.ROCKY,
                tile: TileType.DIRT,
                resources: ['stone', 'stone', 'metal'],
                resourceCount: 36,
                cave: true,
                difficulty: 3
            },
            {
                id: 'sun-forge',
                kind: 'desert',
                x: cx + 1010,
                y: cy + 560,
                radius: 170,
                biome: BiomeType.DESERT,
                tile: TileType.SANDSTONE,
                resources: ['stone', 'metal', 'metal', 'amethyst'],
                resourceCount: 38,
                cave: true,
                difficulty: 4
            },
            {
                id: 'frost-shrine',
                kind: 'shrine',
                x: cx - 820,
                y: cy - 880,
                radius: 165,
                biome: BiomeType.TUNDRA,
                tile: TileType.SNOW,
                resources: ['metal', 'metal', 'amethyst'],
                resourceCount: 36,
                cave: true,
                difficulty: 4
            },
            {
                id: 'ember-vein',
                kind: 'volcanic',
                x: cx + 1120,
                y: cy - 800,
                radius: 175,
                biome: BiomeType.VOLCANIC,
                tile: TileType.OBSIDIAN,
                resources: ['metal', 'metal', 'amethyst', 'amethyst'],
                resourceCount: 40,
                cave: false,
                difficulty: 5
            },
            {
                id: 'ironfield',
                kind: 'battlefield',
                x: cx - 1040,
                y: cy + 760,
                radius: 165,
                biome: BiomeType.ROCKY,
                tile: TileType.STONE,
                resources: ['stone', 'metal', 'metal'],
                resourceCount: 36,
                cave: false,
                difficulty: 3
            }
        ];
    }

    /**
     * Carve readable roads from the crystal to the main destinations.
     */
    carvePaths() {
        const hub = { x: this.width / 2, y: this.height / 2 };
        this.pathSegments = [];

        for (const landmark of this.landmarks) {
            this.carvePathBetween(hub, landmark, 2);
        }

        const linkedRoutes = [
            ['greenwood', 'sun-forge'],
            ['stoneworks', 'frost-shrine'],
            ['fallen-keep', 'ironfield'],
            ['reedmarsh', 'sun-forge'],
            ['greenwood', 'ember-vein']
        ];

        for (const [fromId, toId] of linkedRoutes) {
            const from = this.landmarks.find(l => l.id === fromId);
            const to = this.landmarks.find(l => l.id === toId);
            if (from && to) this.carvePathBetween(from, to, 1);
        }
    }

    carvePathBetween(from, to, widthTiles) {
        const distance = Utils.distance(from.x, from.y, to.x, to.y);
        const steps = Math.max(1, Math.ceil(distance / (this.tileSize * 0.5)));
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const invLen = 1 / Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const normalX = -dy * invLen;
        const normalY = dx * invLen;
        const wobbleAmp = Math.min(42, distance * 0.03);

        this.pathSegments.push({ fromX: from.x, fromY: from.y, toX: to.x, toY: to.y });

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const wobble = Math.sin(t * Math.PI * 2.5 + from.x * 0.01) * wobbleAmp * Math.sin(t * Math.PI);
            const worldX = Utils.lerp(from.x, to.x, t) + normalX * wobble;
            const worldY = Utils.lerp(from.y, to.y, t) + normalY * wobble;
            const tileX = Math.floor(worldX / this.tileSize);
            const tileY = Math.floor(worldY / this.tileSize);
            const biome = this.getBiomeAt(worldX, worldY);
            const tile = this.getPathTileForBiome(biome);
            const extra = i % 9 === 0 ? 1 : 0;
            this.paintTileDisc(tileX, tileY, widthTiles + extra, tile, biome);
        }
    }

    getPathTileForBiome(biome) {
        switch (biome) {
            case BiomeType.DESERT:
                return TileType.SANDSTONE;
            case BiomeType.TUNDRA:
                return TileType.SNOW;
            case BiomeType.SWAMP:
                return TileType.MUD;
            case BiomeType.ROCKY:
            case BiomeType.VOLCANIC:
                return TileType.STONE;
            default:
                return TileType.DIRT;
        }
    }

    /**
     * Clear and style each point of interest.
     */
    carveLandmarks() {
        for (const landmark of this.landmarks) {
            const centerTX = Math.floor(landmark.x / this.tileSize);
            const centerTY = Math.floor(landmark.y / this.tileSize);
            const radiusTiles = Math.ceil(landmark.radius / this.tileSize);

            for (let ty = centerTY - radiusTiles; ty <= centerTY + radiusTiles; ty++) {
                for (let tx = centerTX - radiusTiles; tx <= centerTX + radiusTiles; tx++) {
                    if (tx < 0 || tx >= this.tilesX || ty < 0 || ty >= this.tilesY) continue;

                    const wx = tx * this.tileSize + this.tileSize / 2;
                    const wy = ty * this.tileSize + this.tileSize / 2;
                    const dist = Utils.distance(wx, wy, landmark.x, landmark.y);
                    const edgeNoise = Utils.noise2D(tx * 0.18 + 17, ty * 0.18 - 33) * 18;
                    if (dist > landmark.radius + edgeNoise) continue;

                    const core = dist < landmark.radius * 0.7;
                    const tile = core ? landmark.tile : this.getTransitionTileForLandmark(landmark, tx, ty);
                    this.tiles[ty][tx] = tile;
                    this.biomes[ty][tx] = landmark.biome;
                }
            }

            this.paintTileDisc(centerTX, centerTY, 2, this.getPathTileForBiome(landmark.biome), landmark.biome);
        }
    }

    getTransitionTileForLandmark(landmark, tx, ty) {
        const noise = Utils.noise2D(tx * 0.13, ty * 0.13);
        switch (landmark.kind) {
            case 'grove':
                return noise > 0.35 ? TileType.DIRT : TileType.GRASS;
            case 'marsh':
                return noise > 0.45 ? TileType.GRASS : TileType.MUD;
            case 'desert':
                return noise > 0 ? TileType.SANDSTONE : TileType.SAND;
            case 'shrine':
                return TileType.SNOW;
            case 'volcanic':
                return noise > 0.45 ? TileType.STONE : TileType.OBSIDIAN;
            case 'quarry':
            case 'battlefield':
                return noise > 0 ? TileType.STONE : TileType.DIRT;
            default:
                return landmark.tile;
        }
    }

    paintTileDisc(centerTX, centerTY, radiusTiles, tile, biome) {
        for (let ty = centerTY - radiusTiles; ty <= centerTY + radiusTiles; ty++) {
            for (let tx = centerTX - radiusTiles; tx <= centerTX + radiusTiles; tx++) {
                if (tx < 0 || tx >= this.tilesX || ty < 0 || ty >= this.tilesY) continue;
                const dx = tx - centerTX;
                const dy = ty - centerTY;
                if (dx * dx + dy * dy > radiusTiles * radiusTiles) continue;
                this.tiles[ty][tx] = tile;
                this.biomes[ty][tx] = biome;
            }
        }
    }

    /**
     * Generate barriers as zone entrance gates (not random rings)
     * Creates gates at specific cardinal/diagonal directions
     */
    generateBarriers() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Zone entrance definitions - create gates at specific locations
        const zoneGates = [
            // Inner to middle zone gates (4 cardinal directions)
            { dist: 620, angle: 0, tier: 1, type: 'wood', name: 'East Gate' },
            { dist: 620, angle: Math.PI, tier: 1, type: 'wood', name: 'West Gate' },
            { dist: 620, angle: Math.PI / 2, tier: 1, type: 'wood', name: 'South Gate' },
            { dist: 620, angle: -Math.PI / 2, tier: 1, type: 'wood', name: 'North Gate' },

            // Middle to outer zone gates (4 diagonal + 4 cardinal)
            { dist: 1120, angle: Math.PI / 4, tier: 2, type: 'stone', name: 'SE Desert Gate' },
            { dist: 1120, angle: -Math.PI / 4, tier: 2, type: 'stone', name: 'NE Ember Gate' },
            { dist: 1120, angle: 3 * Math.PI / 4, tier: 2, type: 'stone', name: 'SW Iron Gate' },
            { dist: 1120, angle: -3 * Math.PI / 4, tier: 2, type: 'stone', name: 'NW Frost Gate' },

            // Outer zone gates (to volcanic/tundra)
            { dist: 1460, angle: 0, tier: 3, type: 'metal', name: 'Far East Gate' },
            { dist: 1460, angle: Math.PI, tier: 3, type: 'metal', name: 'Far West Gate' },
            { dist: 1460, angle: Math.PI / 2, tier: 3, type: 'metal', name: 'Far South Gate' },
            { dist: 1460, angle: -Math.PI / 2, tier: 3, type: 'metal', name: 'Far North Gate' }
        ];

        for (const gate of zoneGates) {
            const x = centerX + Math.cos(gate.angle) * gate.dist;
            const y = centerY + Math.sin(gate.angle) * gate.dist;

            // Check bounds
            if (x > 100 && x < this.width - 100 && y > 100 && y < this.height - 100) {
                // Main gate barrier (wider)
                this.barriers.push({
                    x: x,
                    y: y,
                    type: gate.type,
                    tier: gate.tier,
                    health: gate.tier * 150,
                    maxHealth: gate.tier * 150,
                    width: 80,
                    height: 60,
                    name: gate.name
                });

                // Side barriers to create a proper gate (wall segments)
                const perpAngle = gate.angle + Math.PI / 2;
                for (let side = -1; side <= 1; side += 2) {
                    for (let i = 1; i <= 2; i++) {
                        const offsetX = Math.cos(perpAngle) * (50 + i * 40) * side;
                        const offsetY = Math.sin(perpAngle) * (50 + i * 40) * side;

                        this.barriers.push({
                            x: x + offsetX,
                            y: y + offsetY,
                            type: gate.type,
                            tier: gate.tier,
                            health: gate.tier * 100,
                            maxHealth: gate.tier * 100,
                            width: 48,
                            height: 48,
                            isWall: true
                        });
                    }
                }
            }
        }
    }

    /**
     * Generate resource nodes throughout the world
     */
    generateResources() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        for (const landmark of this.landmarks) {
            this.spawnResourceCluster(landmark);
        }

        // Ambient resources are now secondary: enough for travel, not the main identity of the map.
        const resourceCount = Math.min(380, Math.floor((this.width * this.height) / 28000));

        for (let i = 0; i < resourceCount; i++) {
            const x = Utils.seededFloat(100, this.width - 100);
            const y = Utils.seededFloat(100, this.height - 100);

            // Don't spawn too close to center
            if (Utils.distance(x, y, centerX, centerY) < 150) continue;

            const tileX = Math.floor(x / this.tileSize);
            const tileY = Math.floor(y / this.tileSize);

            if (tileX < 0 || tileX >= this.tilesX || tileY < 0 || tileY >= this.tilesY) continue;

            const biome = this.biomes[tileY][tileX];
            const tile = this.tiles[tileY][tileX];

            // Skip impassable tiles
            if (!this.isTilePassable(tile)) continue;

            // Determine resource type based on biome
            let resourceType = this.getResourceForBiome(biome, x, y, centerX, centerY);

            this.addResourceNode(x, y, resourceType);
        }
    }

    spawnResourceCluster(landmark) {
        let placed = 0;
        let attempts = 0;

        while (placed < landmark.resourceCount && attempts < landmark.resourceCount * 12) {
            attempts++;
            const angle = Utils.seededFloat(0, Math.PI * 2);
            const radius = Math.sqrt(Utils.seededRandom()) * landmark.radius * 1.05;
            const x = landmark.x + Math.cos(angle) * radius;
            const y = landmark.y + Math.sin(angle) * radius;
            const resourceType = landmark.resources[Utils.seededInt(0, landmark.resources.length - 1)];

            if (this.addResourceNode(x, y, resourceType, 34)) {
                placed++;
            }
        }
    }

    addResourceNode(x, y, resourceType, spacing = 38) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        if (Utils.distance(x, y, centerX, centerY) < 150) return false;

        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        if (tileX < 0 || tileX >= this.tilesX || tileY < 0 || tileY >= this.tilesY) return false;

        const tile = this.tiles[tileY][tileX];
        if (!this.isTilePassable(tile)) return false;

        for (const node of this.resourceNodes) {
            if (Utils.distance(x, y, node.x, node.y) < spacing) return false;
        }

        const node = new ResourceNode(this.game, x, y, resourceType);
        node._netId = `r${this.resourceNodes.length}`;
        this.resourceNodes.push(node);
        this.game.entities.push(node);
        return true;
    }

    /**
     * Get resource type for a biome
     */
    getResourceForBiome(biome, x, y, centerX, centerY) {
        const distFromCenter = Utils.distance(x, y, centerX, centerY);

        switch (biome) {
            case BiomeType.FOREST:
                return 'wood';
            case BiomeType.ROCKY:
                return distFromCenter > 800 ? (Utils.seededRandom() < 0.3 ? 'metal' : 'stone') : 'stone';
            case BiomeType.DESERT:
                return Utils.seededRandom() < 0.4 ? 'metal' : 'stone';
            case BiomeType.TUNDRA:
                return Utils.seededRandom() < 0.5 ? 'amethyst' : 'metal';
            case BiomeType.SWAMP:
                return Utils.seededRandom() < 0.7 ? 'wood' : 'stone';
            case BiomeType.VOLCANIC:
                return Utils.seededRandom() < 0.4 ? 'amethyst' : 'metal';
            default:
                return Utils.seededRandom() < 0.7 ? 'wood' : 'stone';
        }
    }

    /**
     * Check if tile type is passable
     */
    isTilePassable(tileType) {
        return tileType !== TileType.WATER &&
            tileType !== TileType.CAVE_WALL &&
            tileType !== TileType.LAVA &&
            tileType !== TileType.ICE;
    }

    /**
     * Get tile at world position
     */
    getTileAt(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);

        if (tileX < 0 || tileX >= this.tilesX || tileY < 0 || tileY >= this.tilesY) {
            return TileType.CAVE_WALL;
        }

        return this.tiles[tileY][tileX];
    }

    /**
     * Get biome at world position
     */
    getBiomeAt(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);

        if (tileX < 0 || tileX >= this.tilesX || tileY < 0 || tileY >= this.tilesY) {
            return BiomeType.PLAINS;
        }

        return this.biomes[tileY][tileX];
    }

    /**
     * Check if position is passable (tiles + barriers)
     */
    isPassable(worldX, worldY) {
        const tile = this.getTileAt(worldX, worldY);
        if (!this.isTilePassable(tile)) return false;

        // Check if blocked by a barrier
        const barrier = this.getBarrierAt(worldX, worldY);
        if (barrier) return false;

        return true;
    }

    getSpawnPointForSlot(slot) {
        return this.arenaData?.slots?.[slot]?.spawn ?? null;
    }

    getCrystalPointForSlot(slot) {
        return this.arenaData?.slots?.[slot]?.crystal ?? null;
    }

    getIslandById(id) {
        if (!id) return null;
        return this.arenaData?.islands?.find(island => island.id === id) ?? null;
    }

    getIslandForSlot(slot) {
        const islandId = this.arenaData?.slots?.[slot]?.islandId;
        return this.getIslandById(islandId);
    }

    getIslandAt(worldX, worldY) {
        if (!this.arenaData?.islands?.length) return null;

        return this.arenaData.islands.find(island => this.isPointInsideIslandZone(island?.shape ?? island, worldX, worldY)) ?? null;
    }

    canBuildAtForSlot(slot, worldX, worldY) {
        if (!this.arenaData || !slot) return true;

        const island = this.getIslandAt(worldX, worldY);
        if (!island || island.type !== 'player' || island.slot !== slot) {
            return false;
        }

        return this.isPointInsideIslandZone(island.buildZone, worldX, worldY);
    }

    isPointInsideIslandZone(zone, worldX, worldY) {
        if (!zone) return false;

        if (zone.type === 'ellipse') {
            const radiusX = Math.max(1, zone.radiusX ?? 1);
            const radiusY = Math.max(1, zone.radiusY ?? 1);
            const dx = (worldX - zone.centerX) / radiusX;
            const dy = (worldY - zone.centerY) / radiusY;
            return (dx * dx) + (dy * dy) <= 1;
        }

        return worldX >= zone.left &&
            worldX < zone.right &&
            worldY >= zone.top &&
            worldY < zone.bottom;
    }

    /**
     * Get tile color based on type
     */
    getTileColor(type, x, y) {
        const variation = ((x * 7 + y * 13) % 10) / 100;

        switch (type) {
            case TileType.GRASS:
                return this._adjustColor(this.baseTileColors[TileType.GRASS], variation);
            case TileType.DIRT:
                return this._adjustColor(this.baseTileColors[TileType.DIRT], variation);
            case TileType.STONE:
                return this._adjustColor(this.baseTileColors[TileType.STONE], variation);
            case TileType.SAND:
                return this._adjustColor(this.baseTileColors[TileType.SAND], variation);
            case TileType.WATER:
                return this._adjustColor(this.baseTileColors[TileType.WATER], variation);
            case TileType.CAVE_FLOOR:
                return this._adjustColor(this.baseTileColors[TileType.CAVE_FLOOR], variation);
            case TileType.CAVE_WALL:
                return this._adjustColor(this.baseTileColors[TileType.CAVE_WALL], variation);
            case TileType.SNOW:
                return this._adjustColor(this.baseTileColors[TileType.SNOW], variation);
            case TileType.ICE:
                return this._adjustColor(this.baseTileColors[TileType.ICE], variation);
            case TileType.MUD:
                return this._adjustColor(this.baseTileColors[TileType.MUD], variation);
            case TileType.LAVA:
                return this._adjustColor(this.baseTileColors[TileType.LAVA], variation + Math.sin(Date.now() / 200) * 0.1);
            case TileType.OBSIDIAN:
                return this._adjustColor(this.baseTileColors[TileType.OBSIDIAN], variation);
            case TileType.SANDSTONE:
                return this._adjustColor(this.baseTileColors[TileType.SANDSTONE], variation);
            default:
                return '#ff00ff';
        }
    }

    _adjustColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount * 25));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount * 25));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount * 25));
        return `rgb(${r},${g},${b})`;
    }

    /**
     * Pre-render every tile into chunked offscreen canvases (runs once at init).
     */
    _buildChunks() {
        this.offscreenChunks = [];
        const ts = this.tileSize;
        const cp = this.chunkPixels;
        const ct = this.chunkTiles;

        for (let cy = 0; cy < this.chunksY; cy++) {
            this.offscreenChunks[cy] = [];
            for (let cx = 0; cx < this.chunksX; cx++) {
                const canvas = document.createElement('canvas');
                canvas.width  = cp;
                canvas.height = cp;
                const octx = canvas.getContext('2d');

                const startTX = cx * ct;
                const startTY = cy * ct;
                const endTX = Math.min(this.tilesX, startTX + ct);
                const endTY = Math.min(this.tilesY, startTY + ct);

                for (let ty = startTY; ty < endTY; ty++) {
                    for (let tx = startTX; tx < endTX; tx++) {
                        const type = this.tiles[ty][tx];
                        const lx = (tx - startTX) * ts;
                        const ly = (ty - startTY) * ts;

                        octx.fillStyle = this.getTileColor(type, tx, ty);
                        octx.fillRect(lx, ly, ts, ts);

                        this._renderTileDetailsStatic(octx, tx, ty, lx, ly, type);
                    }
                }

                this.offscreenChunks[cy][cx] = canvas;
            }
        }
    }

    /**
     * Static (no Date.now) version of renderTileDetails for pre-rendering.
     */
    _renderTileDetailsStatic(ctx, tileX, tileY, wx, wy, type) {
        const seed = tileX * 137 + tileY * 251;

        if (type === TileType.GRASS && seed % 7 === 0) {
            ctx.fillStyle = 'rgba(60,120,50,0.5)';
            const ox = seed % 20, oy = (seed * 3) % 20;
            ctx.beginPath();
            ctx.moveTo(wx + ox,     wy + oy + 8);
            ctx.lineTo(wx + ox + 3, wy + oy);
            ctx.lineTo(wx + ox + 6, wy + oy + 8);
            ctx.fill();
        }
        if (type === TileType.STONE && seed % 5 === 0) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wx + (seed % 20) + 5,  wy + ((seed * 2) % 20) + 5);
            ctx.lineTo(wx + (seed % 20) + 15, wy + ((seed * 2) % 20) + 13);
            ctx.stroke();
        }
        if (type === TileType.SNOW && seed % 6 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.arc(wx + (seed % 24) + 8, wy + ((seed * 2) % 24) + 8, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        if (type === TileType.SAND && seed % 8 === 0) {
            ctx.fillStyle = 'rgba(200,180,140,0.4)';
            ctx.beginPath();
            ctx.arc(wx + (seed % 20) + 10, wy + ((seed * 3) % 20) + 10, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        if (type === TileType.LAVA && seed % 4 === 0) {
            ctx.fillStyle = 'rgba(255,200,50,0.35)';
            ctx.beginPath();
            ctx.arc(wx + (seed % 24) + 8, wy + ((seed * 2) % 24) + 8, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        if (type === TileType.OBSIDIAN && seed % 6 === 0) {
            ctx.fillStyle = 'rgba(100,50,150,0.2)';
            const ccx = wx + (seed % 24) + 4;
            const ccy = wy + ((seed * 2) % 24) + 4;
            Utils.drawDiamond(ctx, ccx, ccy, 6, 10);
            ctx.fill();
        }
    }

    /**
     * Render visible tiles
     */
    render(ctx, camera) {
        const bounds = camera.getVisibleBounds();
        const cp = this.chunkPixels;

        // Draw pre-rendered chunks (1 drawImage per chunk instead of ~256 fillRect + color calc)
        const startCX = Math.max(0, Math.floor(bounds.left  / cp));
        const startCY = Math.max(0, Math.floor(bounds.top   / cp));
        const endCX   = Math.min(this.chunksX, Math.ceil(bounds.right  / cp));
        const endCY   = Math.min(this.chunksY, Math.ceil(bounds.bottom / cp));

        for (let cy = startCY; cy < endCY; cy++) {
            for (let cx = startCX; cx < endCX; cx++) {
                ctx.drawImage(this.offscreenChunks[cy][cx], cx * cp, cy * cp);
            }
        }

        this.renderLandmarks(ctx, bounds);
    }

    /**
     * Render visual identity for points of interest.
     */
    renderLandmarks(ctx, bounds) {
        for (const landmark of this.landmarks) {
            if (landmark.x < bounds.left - landmark.radius || landmark.x > bounds.right + landmark.radius ||
                landmark.y < bounds.top - landmark.radius || landmark.y > bounds.bottom + landmark.radius) {
                continue;
            }

            ctx.save();
            ctx.translate(landmark.x, landmark.y);
            ctx.globalAlpha = 0.85;

            switch (landmark.kind) {
                case 'grove':
                    this.renderGroveMarker(ctx, landmark);
                    break;
                case 'quarry':
                    this.renderQuarryMarker(ctx, landmark);
                    break;
                case 'marsh':
                    this.renderMarshMarker(ctx, landmark);
                    break;
                case 'ruins':
                    this.renderRuinsMarker(ctx, landmark);
                    break;
                case 'desert':
                    this.renderDesertMarker(ctx, landmark);
                    break;
                case 'shrine':
                    this.renderShrineMarker(ctx, landmark);
                    break;
                case 'volcanic':
                    this.renderVolcanicMarker(ctx, landmark);
                    break;
                case 'battlefield':
                    this.renderBattlefieldMarker(ctx, landmark);
                    break;
                default:
                    this.renderLandmarkRing(ctx, landmark.radius, '#ffffff');
            }

            ctx.restore();
        }
    }

    renderLandmarkRing(ctx, radius, color) {
        ctx.strokeStyle = color;
        ctx.globalAlpha *= 0.2;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha /= 0.2;
    }

    renderGroveMarker(ctx, landmark) {
        this.renderLandmarkRing(ctx, landmark.radius, '#9bd36b');
        for (let i = 0; i < 7; i++) {
            const angle = i * Math.PI * 2 / 7;
            const x = Math.cos(angle) * (32 + (i % 2) * 20);
            const y = Math.sin(angle) * (30 + (i % 3) * 16);
            ctx.fillStyle = '#4f7d42';
            ctx.beginPath();
            ctx.arc(x, y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#71523a';
            ctx.fillRect(x - 3, y + 8, 6, 16);
        }
    }

    renderQuarryMarker(ctx, landmark) {
        this.renderLandmarkRing(ctx, landmark.radius, '#c8c8bd');
        for (let i = 0; i < 6; i++) {
            const x = -54 + i * 20;
            const y = i % 2 === 0 ? -18 : 12;
            ctx.fillStyle = i % 3 === 0 ? '#8b9291' : '#676f70';
            ctx.beginPath();
            ctx.moveTo(x - 16, y + 16);
            ctx.lineTo(x - 4, y - 18);
            ctx.lineTo(x + 18, y - 8);
            ctx.lineTo(x + 14, y + 18);
            ctx.closePath();
            ctx.fill();
        }
    }

    renderMarshMarker(ctx, landmark) {
        this.renderLandmarkRing(ctx, landmark.radius, '#8aa96f');
        ctx.fillStyle = 'rgba(48, 92, 78, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 66, 34, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#667047';
        ctx.lineWidth = 4;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 22, 30);
            ctx.lineTo(i * 16 + 8, -20);
            ctx.stroke();
        }
    }

    renderRuinsMarker(ctx, landmark) {
        this.renderLandmarkRing(ctx, landmark.radius, '#b8b0a0');
        ctx.fillStyle = '#80786a';
        ctx.fillRect(-44, -34, 22, 68);
        ctx.fillRect(22, -34, 22, 68);
        ctx.fillRect(-40, -38, 80, 18);
        ctx.fillStyle = '#4a433a';
        ctx.fillRect(-9, -8, 18, 42);
    }

    renderDesertMarker(ctx, landmark) {
        this.renderLandmarkRing(ctx, landmark.radius, '#f0c76f');
        ctx.fillStyle = '#aa8450';
        ctx.beginPath();
        ctx.moveTo(0, -46);
        ctx.lineTo(48, 36);
        ctx.lineTo(-48, 36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d6b067';
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(25, 24);
        ctx.lineTo(-25, 24);
        ctx.closePath();
        ctx.fill();
    }

    renderShrineMarker(ctx, landmark) {
        this.renderLandmarkRing(ctx, landmark.radius, '#bfe8ff');
        ctx.fillStyle = 'rgba(125, 205, 235, 0.45)';
        Utils.drawDiamond(ctx, 0, 0, 48, 92);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        Utils.drawDiamond(ctx, 0, 0, 30, 68);
        ctx.stroke();
    }

    renderVolcanicMarker(ctx, landmark) {
        this.renderLandmarkRing(ctx, landmark.radius, '#f07a48');
        ctx.fillStyle = '#33253a';
        ctx.beginPath();
        ctx.moveTo(-58, 36);
        ctx.lineTo(-20, -46);
        ctx.lineTo(10, 4);
        ctx.lineTo(38, -38);
        ctx.lineTo(62, 36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff7a33';
        ctx.beginPath();
        ctx.moveTo(-6, 22);
        ctx.lineTo(8, -10);
        ctx.lineTo(20, 24);
        ctx.closePath();
        ctx.fill();
    }

    renderBattlefieldMarker(ctx, landmark) {
        this.renderLandmarkRing(ctx, landmark.radius, '#a5a296');
        ctx.strokeStyle = '#6f6659';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-46, 38);
        ctx.lineTo(36, -36);
        ctx.moveTo(-36, -34);
        ctx.lineTo(44, 36);
        ctx.stroke();
        ctx.fillStyle = '#786b5b';
        ctx.fillRect(-56, -8, 112, 16);
    }

    /**
     * Preferred cave positions for Game.spawnCaveEntrances().
     */
    getCaveSpawnPoints() {
        return this.landmarks
            .filter(landmark => landmark.cave)
            .map(landmark => ({
                x: landmark.x + landmark.radius * 0.45,
                y: landmark.y - landmark.radius * 0.2,
                difficulty: landmark.difficulty
            }));
    }

    /**
     * Render barriers
     */
    renderBarriers(ctx, bounds) {
        for (const barrier of this.barriers) {
            if (barrier.health <= 0) continue;

            // Check if in view
            if (barrier.x < bounds.left - 50 || barrier.x > bounds.right + 50 ||
                barrier.y < bounds.top - 50 || barrier.y > bounds.bottom + 50) continue;

            ctx.save();
            ctx.translate(barrier.x, barrier.y);

            // Barrier base color by type
            let color;
            switch (barrier.type) {
                case 'wood': color = '#6b4423'; break;
                case 'stone': color = '#5a5a5a'; break;
                case 'metal': color = '#7a7a8a'; break;
                default: color = '#6b4423';
            }

            // Draw barrier
            ctx.fillStyle = color;
            ctx.fillRect(-barrier.width / 2, -barrier.height / 2, barrier.width, barrier.height);

            // Planks/bricks pattern
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            for (let i = -barrier.width / 2 + 16; i < barrier.width / 2; i += 16) {
                ctx.beginPath();
                ctx.moveTo(i, -barrier.height / 2);
                ctx.lineTo(i, barrier.height / 2);
                ctx.stroke();
            }

            // Health bar
            if (barrier.health < barrier.maxHealth) {
                const barWidth = barrier.width;
                const barHeight = 4;
                const healthPct = barrier.health / barrier.maxHealth;

                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(-barWidth / 2, -barrier.height / 2 - 10, barWidth, barHeight);
                ctx.fillStyle = healthPct > 0.3 ? '#00ff88' : '#ff3366';
                ctx.fillRect(-barWidth / 2, -barrier.height / 2 - 10, barWidth * healthPct, barHeight);
            }

            // Tier indicator
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 10px Rajdhani';
            ctx.textAlign = 'center';
            ctx.fillText(`Tier ${barrier.tier}`, 0, barrier.height / 2 + 12);

            ctx.restore();
        }
    }

    /**
     * Add geometric details to tiles
     */
    renderTileDetails(ctx, tileX, tileY, worldX, worldY, type) {
        const seed = tileX * 137 + tileY * 251;

        if (type === TileType.GRASS && seed % 7 === 0) {
            ctx.fillStyle = 'rgba(60, 120, 50, 0.5)';
            const offsetX = (seed % 20);
            const offsetY = ((seed * 3) % 20);
            ctx.beginPath();
            ctx.moveTo(worldX + offsetX, worldY + offsetY + 8);
            ctx.lineTo(worldX + offsetX + 3, worldY + offsetY);
            ctx.lineTo(worldX + offsetX + 6, worldY + offsetY + 8);
            ctx.fill();
        }

        if (type === TileType.STONE && seed % 5 === 0) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(worldX + (seed % 20) + 5, worldY + ((seed * 2) % 20) + 5);
            ctx.lineTo(worldX + (seed % 20) + 15, worldY + ((seed * 2) % 20) + 13);
            ctx.stroke();
        }

        if (type === TileType.SNOW && seed % 6 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(worldX + (seed % 24) + 8, worldY + ((seed * 2) % 24) + 8, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === TileType.SAND && seed % 8 === 0) {
            ctx.fillStyle = 'rgba(200, 180, 140, 0.4)';
            ctx.beginPath();
            ctx.arc(worldX + (seed % 20) + 10, worldY + ((seed * 3) % 20) + 10, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === TileType.LAVA && seed % 4 === 0) {
            // Lava bubbles
            const time = Date.now() / 500 + seed;
            ctx.fillStyle = `rgba(255, 200, 50, ${0.3 + Math.sin(time) * 0.2})`;
            ctx.beginPath();
            ctx.arc(worldX + (seed % 24) + 8, worldY + ((seed * 2) % 24) + 8, 2 + Math.sin(time) * 1, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === TileType.OBSIDIAN && seed % 6 === 0) {
            ctx.fillStyle = 'rgba(100, 50, 150, 0.2)';
            const cx = worldX + (seed % 24) + 4;
            const cy = worldY + ((seed * 2) % 24) + 4;
            Utils.drawDiamond(ctx, cx, cy, 6, 10);
            ctx.fill();
        }
    }

    /**
     * Get barrier at position
     */
    getBarrierAt(x, y) {
        for (const barrier of this.barriers) {
            if (barrier.health <= 0) continue;

            const dx = Math.abs(x - barrier.x);
            const dy = Math.abs(y - barrier.y);
            if (dx < barrier.width / 2 && dy < barrier.height / 2) {
                return barrier;
            }
        }
        return null;
    }

    /**
     * Damage a barrier
     */
    damageBarrier(barrier, damage) {
        barrier.health -= damage;

        if (barrier.health <= 0) {
            // Spawn destruction particles
            for (let i = 0; i < 10; i++) {
                this.game.addParticle({
                    x: barrier.x + Utils.randomFloat(-20, 20),
                    y: barrier.y + Utils.randomFloat(-15, 15),
                    vx: Utils.randomFloat(-50, 50),
                    vy: Utils.randomFloat(-80, -20),
                    color: barrier.type === 'wood' ? '#6b4423' : '#5a5a5a',
                    lifetime: 0.8,
                    age: 0,
                    size: 5,
                    destroyed: false,
                    update(dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        this.vy += 150 * dt;
                        this.age += dt;
                        if (this.age >= this.lifetime) this.destroyed = true;
                    },
                    render(ctx) {
                        const alpha = 1 - this.age / this.lifetime;
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = this.color;
                        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                        ctx.globalAlpha = 1;
                    }
                });
            }
        }
    }
}

export default World;
