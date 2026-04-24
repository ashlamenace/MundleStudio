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
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeDecay = decay;
        this.shakeStartDuration = duration; // Track original duration for decay calculation
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

        // Clamp to world bounds if set
        if (this.worldBounds) {
            const halfViewWidth = (this.canvas.width / this.zoom) / 2;
            const halfViewHeight = (this.canvas.height / this.zoom) / 2;

            this.x = Utils.clamp(this.x, halfViewWidth, this.worldBounds.width - halfViewWidth);
            this.y = Utils.clamp(this.y, halfViewHeight, this.worldBounds.height - halfViewHeight);
        }

        // Update shake
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;

            // Calculate current intensity with optional decay
            const currentIntensity = this.shakeDecay
                ? this.shakeIntensity * (this.shakeDuration / this.shakeStartDuration)
                : this.shakeIntensity;

            this.shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }
    }

    /**
     * Apply camera transform to context
     */
    applyTransform(ctx) {
        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(
            -this.x + this.shakeOffsetX,
            -this.y + this.shakeOffsetY
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
     * Get visible bounds in world coordinates
     */
    getVisibleBounds() {
        const halfWidth = (this.canvas.width / this.zoom) / 2;
        const halfHeight = (this.canvas.height / this.zoom) / 2;

        return {
            left: this.x - halfWidth,
            right: this.x + halfWidth,
            top: this.y - halfHeight,
            bottom: this.y + halfHeight,
            width: halfWidth * 2,
            height: halfHeight * 2
        };
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
