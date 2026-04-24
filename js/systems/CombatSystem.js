/**
 * Combat System - handles damage calculations and combat mechanics
 */

export class CombatSystem {
    constructor(game) {
        this.game = game;
    }

    /**
     * Calculate damage with modifiers
     */
    calculateDamage(baseDamage, source, target) {
        let damage = baseDamage;

        // Weather effects on combat
        const weather = this.game.dayNight.weather;
        if (weather === 'storm' && source.type === 'enemy') {
            damage *= 1.2; // Enemies stronger in storms
        }

        // Night bonus for enemies
        if (this.game.dayNight.isNight && source.type === 'enemy') {
            damage *= 1.1;
        }

        return Math.floor(damage);
    }

    /**
     * Apply damage to target
     */
    applyDamage(source, target, baseDamage) {
        const damage = this.calculateDamage(baseDamage, source, target);
        target.takeDamage(damage, source);

        return damage;
    }

    /**
     * Get entities in attack cone
     */
    getEntitiesInCone(x, y, angle, range, coneAngle, type = null) {
        const entities = type ?
            this.game.entities.filter(e => e.type === type) :
            this.game.entities;

        const inCone = [];

        for (const entity of entities) {
            const dist = Math.sqrt((entity.x - x) ** 2 + (entity.y - y) ** 2);
            if (dist > range) continue;

            const entityAngle = Math.atan2(entity.y - y, entity.x - x);
            let angleDiff = Math.abs(entityAngle - angle);

            // Normalize angle difference
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            if (angleDiff <= coneAngle / 2) {
                inCone.push(entity);
            }
        }

        return inCone;
    }
}

export default CombatSystem;
