/**
 * Minimap component
 */

export class Minimap {
    constructor(game) {
        this.game = game;

        // Canvas
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        // Size
        this.width = 150;
        this.height = 150;

        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }

        // Scale
        this.scale = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    /**
     * Render minimap
     */
    render() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const world = this.game.world;

        // Calculate scale to fit world
        this.scale = Math.min(
            this.width / world.width,
            this.height / world.height
        );

        this.offsetX = (this.width - world.width * this.scale) / 2;
        this.offsetY = (this.height - world.height * this.scale) / 2;

        // Clear
        ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw terrain (simplified)
        this.renderTerrain(ctx);

        // Draw map points of interest
        this.renderLandmarks(ctx);

        // Draw buildings
        this.renderBuildings(ctx);

        // Draw enemies
        this.renderEnemies(ctx);

        // Draw crystal
        this.renderCrystal(ctx);

        // Draw player
        this.renderPlayer(ctx);

        // Draw camera bounds
        this.renderCameraBounds(ctx);
    }

    /**
     * Convert world to minimap position
     */
    worldToMinimap(worldX, worldY) {
        return {
            x: this.offsetX + worldX * this.scale,
            y: this.offsetY + worldY * this.scale
        };
    }

    /**
     * Render simplified terrain
     */
    renderTerrain(ctx) {
        const world = this.game.world;
        const sampleStep = 4; // Sample every N tiles

        for (let y = 0; y < world.tilesY; y += sampleStep) {
            for (let x = 0; x < world.tilesX; x += sampleStep) {
                const tile = world.tiles[y][x];
                const pos = this.worldToMinimap(
                    x * world.tileSize,
                    y * world.tileSize
                );

                const size = sampleStep * world.tileSize * this.scale;

                // Color based on tile type
                switch (tile) {
                    case 0: ctx.fillStyle = '#2d5a27'; break; // Grass
                    case 1: ctx.fillStyle = '#5c4033'; break; // Dirt
                    case 2: ctx.fillStyle = '#6b6b6b'; break; // Stone
                    case 3: ctx.fillStyle = '#e8d090'; break; // Sand
                    case 4: ctx.fillStyle = '#1e4d6b'; break; // Water
                    case 5: ctx.fillStyle = '#2a2a3a'; break; // Cave floor
                    case 6: ctx.fillStyle = '#1a1a2a'; break; // Cave wall
                    case 7: ctx.fillStyle = '#e8f0f8'; break; // Snow (white)
                    case 8: ctx.fillStyle = '#a0d8f0'; break; // Ice (light blue)
                    case 9: ctx.fillStyle = '#4a3a28'; break; // Mud
                    case 10: ctx.fillStyle = '#ff4400'; break; // Lava
                    case 11: ctx.fillStyle = '#2a1a2a'; break; // Obsidian
                    case 12: ctx.fillStyle = '#b8a060'; break; // Sandstone
                    default: ctx.fillStyle = '#1a1a2e';
                }

                ctx.fillRect(pos.x, pos.y, size + 1, size + 1);
            }
        }
    }

    /**
     * Render points of interest on minimap
     */
    renderLandmarks(ctx) {
        const landmarks = this.game.world.landmarks || [];

        for (const landmark of landmarks) {
            const pos = this.worldToMinimap(landmark.x, landmark.y);
            ctx.fillStyle = landmark.cave ? '#d9b76e' : '#9fbf8f';
            ctx.strokeStyle = 'rgba(20, 20, 25, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    /**
     * Render buildings on minimap
     */
    renderBuildings(ctx) {
        const buildings = this.game.buildingSystem.buildings;

        for (const building of buildings) {
            const pos = this.worldToMinimap(building.x, building.y);

            // Color based on type
            if (building.type === 'turret') {
                ctx.fillStyle = '#ffff00';
            } else if (building.type === 'wall') {
                ctx.fillStyle = '#888888';
            } else {
                ctx.fillStyle = '#666666';
            }

            ctx.fillRect(pos.x - 1, pos.y - 1, 3, 3);
        }
    }

    /**
     * Render enemies on minimap
     */
    renderEnemies(ctx) {
        const enemies = this.game.getEnemies();

        ctx.fillStyle = '#ff4444';

        for (const enemy of enemies) {
            const pos = this.worldToMinimap(enemy.x, enemy.y);
            ctx.fillRect(pos.x - 1, pos.y - 1, 2, 2);
        }
    }

    /**
     * Render crystal on minimap
     */
    renderCrystal(ctx) {
        const crystal = this.game.crystal;
        const pos = this.worldToMinimap(crystal.x, crystal.y);

        ctx.fillStyle = '#9966ff';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.strokeStyle = 'rgba(150, 100, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Render player on minimap
     */
    renderPlayer(ctx) {
        const player = this.game.player;
        const pos = this.worldToMinimap(player.x, player.y);

        // Player dot
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(
            pos.x + Math.cos(player.facingAngle) * 6,
            pos.y + Math.sin(player.facingAngle) * 6
        );
        ctx.stroke();
    }

    /**
     * Render camera view bounds
     */
    renderCameraBounds(ctx) {
        const camera = this.game.camera;
        const bounds = camera.getVisibleBounds();

        const topLeft = this.worldToMinimap(bounds.left, bounds.top);
        const size = {
            width: bounds.width * this.scale,
            height: bounds.height * this.scale
        };

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(topLeft.x, topLeft.y, size.width, size.height);
    }
}

export default Minimap;
