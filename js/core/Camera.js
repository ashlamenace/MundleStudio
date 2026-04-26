/**
 * Camera system with smooth follow and zoom
 */

import { Utils } from './Utils.js';

export class Camera {
    constructor(canvas) {
        this.canvas = canvas;

        // Position (center of view in world coordinates)
        this.x = 0;
        this.y = 0;

        // Target position for smooth follow
        this.targetX = 0;
        this.targetY = 0;

        // Zoom level
        this.zoom = 1.5;
        this.targetZoom = 1.5;
        this.minZoom = 0.5;
        this.maxZoom = 2;

        // Smoothing factor (0-1, higher = snappier)
        this.smoothing = 0.08;
        this.zoomSmoothing = 0.1;

        // World bounds (for camera clamping)
        this.worldBounds = null;

        // Shake effect
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeDecay = true;
        this.shakeStartDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this._shakeTime = 0;
        this._shakeCooldown = 0;
    }

    /**
     * Set world bounds for camera clamping
     */
    setWorldBounds(width, height) {
        this.worldBounds = { width, height };
    }

    /**
     * Set the target to follow
     */
    follow(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Immediately set camera position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Adjust zoom level
     */
    setZoom(zoom) {
        this.targetZoom = Utils.clamp(zoom, this.minZoom, this.maxZoom);
    }

    /**
     * Zoom in/out by delta
     */
    adjustZoom(delta) {
        this.setZoom(this.targetZoom - delta * 0.1);
    }

    /**
     * Start camera shake effect
     */
    shake(intensity, duration, decay = true) {
        const nextIntensity = Math.min(16, Math.max(0, intensity * 0.55));
        const nextDuration = Math.min(0.8, Math.max(0, duration * 0.75));
        if (nextIntensity < 4) return;
        if (this._shakeCooldown > 0 && nextIntensity <= this.shakeIntensity * 1.25) return;

        this.shakeIntensity = nextIntensity;
        this.shakeDuration = nextDuration;
        this.shakeDecay = decay;
        this.shakeStartDuration = nextDuration; // Track original duration for decay calculation
        this._shakeCooldown = 0.45;
    }

    /**
     * Update camera position and effects
     */
    update(deltaTime) {
        // Smooth follow
        this.x = Utils.lerp(this.x, this.targetX, this.smoothing);
        this.y = Utils.lerp(this.y, this.targetY, this.smoothing);

        // Smooth zoom
        this.zoom = Utils.lerp(this.zoom, this.targetZoom, this.zoomSmoothing);

        if (this._shakeCooldown > 0) {
            this._shakeCooldown = Math.max(0, this._shakeCooldown - deltaTime);
        }

        // Clamp to world bounds if set
        if (this.worldBounds) {
            const halfViewWidth = (this.canvas.width / this.zoom) / 2;
            const halfViewHeight = (this.canvas.height / this.zoom) / 2;

            this.x = Utils.clamp(this.x, halfViewWidth, this.worldBounds.width - halfViewWidth);
            this.y = Utils.clamp(this.y, halfViewHeight, this.worldBounds.height - halfViewHeight);
        }

        // Update shake — use incommensurable sine waves instead of Math.random()
        // to get smooth, GPU-friendly motion without per-frame RNG allocation.
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            this._shakeTime += deltaTime;

            const currentIntensity = this.shakeDecay
                ? this.shakeIntensity * (this.shakeDuration / this.shakeStartDuration)
                : this.shakeIntensity;

            this.shakeOffsetX = Math.sin(this._shakeTime * 53) * currentIntensity;
            this.shakeOffsetY = Math.cos(this._shakeTime * 41) * currentIntensity;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
            this._shakeTime = 0;
        }
    }

    /**
     * Apply camera transform to context.
     * Uses setTransform (single matrix op) instead of translate+scale+translate.
     */
    applyTransform(ctx) {
        ctx.save();
        ctx.setTransform(
            this.zoom, 0,
            0, this.zoom,
            this.canvas.width  / 2 + this.zoom * (-this.x + this.shakeOffsetX),
            this.canvas.height / 2 + this.zoom * (-this.y + this.shakeOffsetY)
        );
    }

    /**
     * Restore context after camera transform
     */
    resetTransform(ctx) {
        ctx.restore();
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.canvas.width / 2) / this.zoom + this.x,
            y: (screenY - this.canvas.height / 2) / this.zoom + this.y
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom + this.canvas.width / 2,
            y: (worldY - this.y) * this.zoom + this.canvas.height / 2
        };
    }

    /**
     * Get visible bounds in world coordinates.
     * Reuses a single object to avoid per-frame heap allocation.
     */
    getVisibleBounds() {
        const halfWidth  = (this.canvas.width  / this.zoom) / 2;
        const halfHeight = (this.canvas.height / this.zoom) / 2;

        if (!this._bounds) {
            this._bounds = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
        }
        this._bounds.left   = this.x - halfWidth;
        this._bounds.right  = this.x + halfWidth;
        this._bounds.top    = this.y - halfHeight;
        this._bounds.bottom = this.y + halfHeight;
        this._bounds.width  = halfWidth  * 2;
        this._bounds.height = halfHeight * 2;
        return this._bounds;
    }

    /**
     * Check if a rectangle is visible on screen
     */
    isVisible(x, y, width, height) {
        const bounds = this.getVisibleBounds();
        return x + width > bounds.left &&
            x < bounds.right &&
            y + height > bounds.top &&
            y < bounds.bottom;
    }
}

export default Camera;
