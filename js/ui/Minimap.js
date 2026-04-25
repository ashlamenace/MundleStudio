/**
 * Minimap component
 */

export class Minimap {
    constructor(game) {
        this.game = game;

        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        this.width = 150;
        this.height = 150;

        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.canvas.style.cursor = 'crosshair';
            this.canvas.title = 'Clic & glisser pour explorer — relâcher pour revenir au joueur';
        }

        this.scale = 0;
        this.offsetX = 0;
        this.offsetY = 0;

        // Offscreen caches
        this._staticCanvas  = null; // terrain + landmarks — built once
        this._buildCanvas   = null; // buildings — rebuilt when count changes
        this._lastBuildLen  = -1;

        // Pan state
        this._panning   = false;
        this.panWorldX  = 0;
        this.panWorldY  = 0;

        this._setupPanListeners();
    }

    get isPanning() { return this._panning; }

    /** Convert minimap canvas coords → world coords */
    _minimapToWorld(mx, my) {
        return {
            x: (mx - this.offsetX) / this.scale,
            y: (my - this.offsetY) / this.scale
        };
    }

    _setupPanListeners() {
        if (!this.canvas) return;

        const getMinimapXY = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                mx: (e.clientX - rect.left) * (this.width  / rect.width),
                my: (e.clientY - rect.top)  * (this.height / rect.height)
            };
        };

        const onDown = (e) => {
            if (e.button !== 0) return;
            this._panning = true;
            const { mx, my } = getMinimapXY(e);
            const w = this._minimapToWorld(mx, my);
            this.panWorldX = w.x;
            this.panWorldY = w.y;
            e.preventDefault();
            e.stopPropagation();
        };

        const onMove = (e) => {
            if (!this._panning) return;
            const { mx, my } = getMinimapXY(e);
            const w = this._minimapToWorld(mx, my);
            this.panWorldX = w.x;
            this.panWorldY = w.y;
        };

        const onUp = () => {
            this._panning = false;
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    /** Recompute scale/offset from world dimensions. */
    _updateTransform() {
        const world = this.game.world;
        this.scale   = Math.min(this.width / world.width, this.height / world.height);
        this.offsetX = (this.width  - world.width  * this.scale) / 2;
        this.offsetY = (this.height - world.height * this.scale) / 2;
    }

    /** Convert world coords to minimap coords (inline math, no object alloc). */
    _wx(worldX) { return this.offsetX + worldX * this.scale; }
    _wy(worldY) { return this.offsetY + worldY * this.scale; }

    /**
     * Build (or rebuild) the static offscreen canvas for terrain + landmarks.
     * Called only once after world generation.
     */
    _buildStaticCache() {
        this._staticCanvas = document.createElement('canvas');
        this._staticCanvas.width  = this.width;
        this._staticCanvas.height = this.height;
        const ctx = this._staticCanvas.getContext('2d');

        // Background
        ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
        ctx.fillRect(0, 0, this.width, this.height);

        this._renderTerrainTo(ctx);
        this._renderLandmarksTo(ctx);
    }

    /** Rebuild the buildings offscreen canvas when the building list changes. */
    _buildBuildingCache() {
        if (!this._buildCanvas) {
            this._buildCanvas = document.createElement('canvas');
            this._buildCanvas.width  = this.width;
            this._buildCanvas.height = this.height;
        }
        const ctx = this._buildCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.width, this.height);
        this._renderBuildingsTo(ctx);
        this._lastBuildLen = this.game.buildingSystem.buildings.length;
    }

    render() {
        if (!this.ctx) return;

        this._updateTransform();

        // Build static cache on first render
        if (!this._staticCanvas) this._buildStaticCache();

        // Rebuild building cache only when building count changes
        const buildLen = this.game.buildingSystem.buildings.length;
        if (buildLen !== this._lastBuildLen) this._buildBuildingCache();

        const ctx = this.ctx;
        ctx.drawImage(this._staticCanvas, 0, 0);
        if (this._buildCanvas) ctx.drawImage(this._buildCanvas, 0, 0);

        // Dynamic elements redrawn every frame
        this._renderEnemiesTo(ctx);
        this._renderCrystalsTo(ctx);
        this._renderPlayerTo(ctx);
        this._renderCameraBoundsTo(ctx);

        if (this._panning) this._renderPanCrosshairTo(ctx);
    }

    _renderTerrainTo(ctx) {
        const world = this.game.world;
        const sampleStep = 4;
        const sc  = this.scale;
        const ox  = this.offsetX;
        const oy  = this.offsetY;
        const ts  = world.tileSize;
        const sz  = sampleStep * ts * sc + 1;

        for (let y = 0; y < world.tilesY; y += sampleStep) {
            const py = oy + y * ts * sc;
            const row = world.tiles[y];
            for (let x = 0; x < world.tilesX; x += sampleStep) {
                switch (row[x]) {
                    case 0:  ctx.fillStyle = '#2d5a27'; break;
                    case 1:  ctx.fillStyle = '#5c4033'; break;
                    case 2:  ctx.fillStyle = '#6b6b6b'; break;
                    case 3:  ctx.fillStyle = '#e8d090'; break;
                    case 4:  ctx.fillStyle = '#1e4d6b'; break;
                    case 5:  ctx.fillStyle = '#2a2a3a'; break;
                    case 6:  ctx.fillStyle = '#1a1a2a'; break;
                    case 7:  ctx.fillStyle = '#e8f0f8'; break;
                    case 8:  ctx.fillStyle = '#a0d8f0'; break;
                    case 9:  ctx.fillStyle = '#4a3a28'; break;
                    case 10: ctx.fillStyle = '#ff4400'; break;
                    case 11: ctx.fillStyle = '#2a1a2a'; break;
                    case 12: ctx.fillStyle = '#b8a060'; break;
                    default: ctx.fillStyle = '#1a1a2e';
                }
                ctx.fillRect(ox + x * ts * sc, py, sz, sz);
            }
        }
    }

    _renderLandmarksTo(ctx) {
        const landmarks = this.game.world.landmarks || [];
        ctx.lineWidth = 1;
        for (const lm of landmarks) {
            const px = this._wx(lm.x);
            const py = this._wy(lm.y);
            ctx.fillStyle   = lm.cave ? '#d9b76e' : '#9fbf8f';
            ctx.strokeStyle = 'rgba(20, 20, 25, 0.7)';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    _renderBuildingsTo(ctx) {
        const buildings = this.game.buildingSystem.buildings;
        for (const b of buildings) {
            ctx.fillStyle = b.type === 'turret' ? '#ffff00' : b.type === 'wall' ? '#888888' : '#666666';
            ctx.fillRect(this._wx(b.x) - 1, this._wy(b.y) - 1, 3, 3);
        }
    }

    _renderEnemiesTo(ctx) {
        const enemies = this.game.getEnemies();
        ctx.fillStyle = '#ff4444';
        for (const e of enemies) {
            ctx.fillRect(this._wx(e.x) - 1, this._wy(e.y) - 1, 2, 2);
        }
    }

    _renderCrystalsTo(ctx) {
        const crystals = this.game.getAllCrystals?.() ?? (this.game.crystal ? [this.game.crystal] : []);
        ctx.lineWidth = 1;
        for (const cr of crystals) {
            if (!cr || cr.destroyed) continue;
            const px    = this._wx(cr.x);
            const py    = this._wy(cr.y);
            const color = cr._getLevelColor?.() ?? '#9966ff';
            const r     = cr.isLocalCrystal ? 4 : 3;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = cr.isLocalCrystal ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)';
            ctx.beginPath();
            ctx.arc(px, py, r + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _renderPlayerTo(ctx) {
        const player = this.game.player;
        const px = this._wx(player.x);
        const py = this._wy(player.y);

        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(
            px + Math.cos(player.facingAngle) * 6,
            py + Math.sin(player.facingAngle) * 6
        );
        ctx.stroke();
    }

    _renderCameraBoundsTo(ctx) {
        const bounds = this.game.camera.getVisibleBounds();
        ctx.strokeStyle = this._panning
            ? 'rgba(255, 220, 100, 0.55)'
            : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            this._wx(bounds.left),
            this._wy(bounds.top),
            bounds.width  * this.scale,
            bounds.height * this.scale
        );
    }

    _renderPanCrosshairTo(ctx) {
        const px = this._wx(this.panWorldX);
        const py = this._wy(this.panWorldY);
        const size = 5;
        ctx.strokeStyle = 'rgba(255, 220, 100, 0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - size, py); ctx.lineTo(px + size, py);
        ctx.moveTo(px, py - size); ctx.lineTo(px, py + size);
        ctx.stroke();
    }

    // Legacy names kept for any external callers
    worldToMinimap(worldX, worldY) { return { x: this._wx(worldX), y: this._wy(worldY) }; }
    renderTerrain(ctx)       { this._renderTerrainTo(ctx); }
    renderLandmarks(ctx)     { this._renderLandmarksTo(ctx); }
    renderBuildings(ctx)     { this._renderBuildingsTo(ctx); }
    renderEnemies(ctx)       { this._renderEnemiesTo(ctx); }
    renderCrystals(ctx)      { this._renderCrystalsTo(ctx); }
    renderPlayer(ctx)        { this._renderPlayerTo(ctx); }
    renderCameraBounds(ctx)  { this._renderCameraBoundsTo(ctx); }
}

export default Minimap;
