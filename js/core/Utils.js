/**
 * Utility functions for the game
 */

export const Utils = {
    /**
     * Clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Calculate distance between two points
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Calculate angle between two points (in radians)
     */
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    /**
     * Normalize an angle to 0-2PI range
     */
    normalizeAngle(angle) {
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        return angle;
    },

    /**
     * Random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Random float between min and max
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Random element from array
     */
    randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    // ── Seeded RNG (mulberry32) ───────────────────────────────────────────────
    // Used for deterministic world generation across all clients.
    // Call Utils.seed(n) before world gen; use Utils.seededRandom() inside it.
    _rng: null,

    seed(n) {
        let s = n >>> 0;
        this._rng = () => {
            s = Math.imul(s ^ (s >>> 15), s | 1) ^ (s + Math.imul(s ^ (s >>> 7), s | 61));
            return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
        };
        // Rebuild noise2D permutation with this seed
        this._buildNoise(this._rng);
    },

    seededRandom() {
        return this._rng ? this._rng() : Math.random();
    },

    seededFloat(min, max) {
        return this.seededRandom() * (max - min) + min;
    },

    seededInt(min, max) {
        return Math.floor(this.seededRandom() * (max - min + 1)) + min;
    },

    // ── Perlin-like noise ─────────────────────────────────────────────────────
    _noiseP: null,

    _buildNoise(rng) {
        const perm = [];
        for (let i = 0; i < 256; i++) perm[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        this._noiseP = [...perm, ...perm];
    },

    noise2D(x, y) {
        if (!this._noiseP) {
            // Fallback: initialize once with Math.random (solo / pre-seed calls)
            this._buildNoise(Math.random.bind(Math));
        }
        const p = this._noiseP;
        function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
        function grad(hash, nx, ny) {
            const h = hash & 3;
            const u = h < 2 ? nx : ny;
            const v = h < 2 ? ny : nx;
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        }
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = fade(x);
        const v = fade(y);
        const A = p[X] + Y;
        const B = p[X + 1] + Y;
        return Utils.lerp(
            Utils.lerp(grad(p[A],     x,     y    ), grad(p[B],     x - 1, y    ), u),
            Utils.lerp(grad(p[A + 1], x,     y - 1), grad(p[B + 1], x - 1, y - 1), u),
            v
        );
    },

    /**
     * Check AABB collision
     */
    aabbCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    },

    /**
     * Check circle collision
     */
    circleCollision(x1, y1, r1, x2, y2, r2) {
        return this.distance(x1, y1, x2, y2) < r1 + r2;
    },

    /**
     * Check if point is inside rectangle
     */
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    /**
     * Format time as MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Create a simple UUID
     */
    uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Draw a low-poly hexagon shape
     */
    drawHexagon(ctx, x, y, size, rotation = 0) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + rotation;
            const px = x + size * Math.cos(angle);
            const py = y + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    },

    /**
     * Draw a low-poly diamond shape
     */
    drawDiamond(ctx, x, y, width, height) {
        ctx.beginPath();
        ctx.moveTo(x, y - height / 2);
        ctx.lineTo(x + width / 2, y);
        ctx.lineTo(x, y + height / 2);
        ctx.lineTo(x - width / 2, y);
        ctx.closePath();
    },

    /**
     * Create gradient with neon glow effect
     */
    createNeonGradient(ctx, x, y, radius, color) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color + '80');
        gradient.addColorStop(1, 'transparent');
        return gradient;
    }
};

export default Utils;
