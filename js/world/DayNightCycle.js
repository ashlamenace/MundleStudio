/**
 * Day/Night cycle system
 */

export class DayNightCycle {
    constructor(dayDuration = 90, nightDuration = 90) {
        this.dayDuration = dayDuration; // seconds
        this.nightDuration = nightDuration; // seconds
        this.totalCycleDuration = dayDuration + nightDuration;

        // Current time in cycle (0 = start of day)
        this.currentTime = 0;

        // State
        this.isNight = false;
        this.justBecameNight = false;
        this.justBecameDay = false;

        // Current day number
        this.dayNumber = 1;

        // Visual settings
        this.overlayAlpha = 0;
        this.targetOverlayAlpha = 0;

        // Colors for different times
        this.dayColor = { r: 255, g: 255, b: 240, a: 0 };
        this.duskColor = { r: 255, g: 150, b: 100, a: 0.2 };
        this.nightColor = { r: 20, g: 20, b: 60, a: 0.6 };
        this.dawnColor = { r: 255, g: 200, b: 150, a: 0.15 };

        // Weather system
        this.weather = 'clear'; // clear, rain, storm, sunny
        this.weatherTimer = 0;
        this.weatherDuration = 60; // seconds per weather period

        // Time speed multiplier (for dev mode)
        this.timeSpeed = 1;
    }

    /**
     * Update the cycle
     */
    update(deltaTime) {
        this.justBecameNight = false;
        this.justBecameDay = false;

        const wasNight = this.isNight;

        // Update time (apply time speed multiplier)
        this.currentTime += deltaTime * this.timeSpeed;

        // Check for cycle completion
        if (this.currentTime >= this.totalCycleDuration) {
            this.currentTime -= this.totalCycleDuration;
            this.dayNumber++;
        }

        // Determine if it's night
        this.isNight = this.currentTime >= this.dayDuration;

        // Check transitions
        if (this.isNight && !wasNight) {
            this.justBecameNight = true;
        } else if (!this.isNight && wasNight) {
            this.justBecameDay = true;
        }

        // Update weather
        this.updateWeather(deltaTime);

        // Calculate overlay
        this.updateOverlay();
    }

    /**
     * Update weather system
     */
    updateWeather(deltaTime) {
        this.weatherTimer += deltaTime;

        if (this.weatherTimer >= this.weatherDuration) {
            this.weatherTimer = 0;

            // Random weather change
            const rand = Math.random();
            if (rand < 0.5) {
                this.weather = 'clear';
            } else if (rand < 0.7) {
                this.weather = 'sunny';
            } else if (rand < 0.9) {
                this.weather = 'rain';
            } else {
                this.weather = 'storm';
            }

            this.weatherDuration = 30 + Math.random() * 60;
        }
    }

    /**
     * Calculate current overlay color and alpha
     */
    updateOverlay() {
        const dayProgress = this.currentTime / this.dayDuration;
        const nightProgress = (this.currentTime - this.dayDuration) / this.nightDuration;

        if (!this.isNight) {
            // Day time
            if (dayProgress < 0.1) {
                // Dawn
                this.targetOverlayAlpha = this.dawnColor.a * (1 - dayProgress / 0.1);
            } else if (dayProgress > 0.8) {
                // Dusk approaching
                const duskProgress = (dayProgress - 0.8) / 0.2;
                this.targetOverlayAlpha = this.duskColor.a * duskProgress;
            } else {
                // Full day
                this.targetOverlayAlpha = 0;
            }
        } else {
            // Night time
            if (nightProgress < 0.1) {
                // Night beginning
                const nightStart = nightProgress / 0.1;
                this.targetOverlayAlpha = 0.2 + (this.nightColor.a - 0.2) * nightStart;
            } else if (nightProgress > 0.9) {
                // Night ending (dawn)
                const dawnStart = (nightProgress - 0.9) / 0.1;
                this.targetOverlayAlpha = this.nightColor.a * (1 - dawnStart * 0.5);
            } else {
                // Full night
                this.targetOverlayAlpha = this.nightColor.a;
            }
        }

        // Weather effects
        if (this.weather === 'storm') {
            this.targetOverlayAlpha = Math.min(0.7, this.targetOverlayAlpha + 0.15);
        } else if (this.weather === 'rain') {
            this.targetOverlayAlpha = Math.min(0.5, this.targetOverlayAlpha + 0.1);
        }

        // Smooth transition
        this.overlayAlpha += (this.targetOverlayAlpha - this.overlayAlpha) * 0.02;
    }

    /**
     * Get remaining time until next phase
     */
    getTimeRemaining() {
        if (!this.isNight) {
            return this.dayDuration - this.currentTime;
        } else {
            return this.totalCycleDuration - this.currentTime;
        }
    }

    /**
     * Get progress through current phase (0-1)
     */
    getPhaseProgress() {
        if (!this.isNight) {
            return this.currentTime / this.dayDuration;
        } else {
            return (this.currentTime - this.dayDuration) / this.nightDuration;
        }
    }

    /**
     * Get weather bonuses
     */
    getWeatherEffects() {
        switch (this.weather) {
            case 'sunny':
                return { resourceBonus: 1.2, enemyBonus: 1, visibility: 1 };
            case 'rain':
                return { resourceBonus: 1, enemyBonus: 1, visibility: 0.7 };
            case 'storm':
                return { resourceBonus: 0.8, enemyBonus: 1.3, visibility: 0.5 };
            default:
                return { resourceBonus: 1, enemyBonus: 1, visibility: 1 };
        }
    }

    /**
     * Render the overlay
     */
    render(ctx, width, height) {
        if (this.overlayAlpha <= 0.01) return;

        // Get current color
        let r, g, b;

        if (!this.isNight) {
            const dayProgress = this.currentTime / this.dayDuration;
            if (dayProgress < 0.1) {
                // Dawn
                r = this.dawnColor.r;
                g = this.dawnColor.g;
                b = this.dawnColor.b;
            } else if (dayProgress > 0.8) {
                // Dusk
                r = this.duskColor.r;
                g = this.duskColor.g;
                b = this.duskColor.b;
            } else {
                r = this.dayColor.r;
                g = this.dayColor.g;
                b = this.dayColor.b;
            }
        } else {
            r = this.nightColor.r;
            g = this.nightColor.g;
            b = this.nightColor.b;
        }

        // Storm flashes
        if (this.weather === 'storm' && Math.random() < 0.01) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(0, 0, width, height);
        }

        // Main overlay
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.overlayAlpha})`;
        ctx.fillRect(0, 0, width, height);

        // Rain effect
        if (this.weather === 'rain' || this.weather === 'storm') {
            this.renderRain(ctx, width, height);
        }
    }

    /**
     * Render rain effect
     */
    renderRain(ctx, width, height) {
        const intensity = this.weather === 'storm' ? 100 : 50;
        ctx.strokeStyle = 'rgba(150, 180, 255, 0.3)';
        ctx.lineWidth = 1;

        for (let i = 0; i < intensity; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const length = this.weather === 'storm' ? 20 : 10;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 2, y + length);
            ctx.stroke();
        }
    }
}

export default DayNightCycle;
