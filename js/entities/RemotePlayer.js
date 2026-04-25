/**
 * RemotePlayer — renders another player received over the network.
 * Position is interpolated smoothly toward the last received target.
 */

import { Entity } from './Entity.js';
import { spriteManager } from '../core/SpriteManager.js';

// Distinct tint colors, chosen deterministically from playerId
const PLAYER_TINTS = [
    '#ff8a3d',
    '#30d1ff',
    '#f15bff',
    '#8dff5a',
    '#ffd447',
    '#7a9bff'
];

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export class RemotePlayer extends Entity {
    constructor(game, playerId) {
        // world may not exist yet when created from init() pending flush
        const cx = game.world != null ? game.world.width  / 2 : 1600;
        const cy = game.world != null ? game.world.height / 2 : 1600;
        super(game, cx, cy);

        this.type     = 'remotePlayer';
        this.playerId = playerId;

        // Interpolation targets
        this._targetX = cx;
        this._targetY = cy;

        // Rendered state
        this.facingAngle  = 0;
        this.spriteFacingAngle = Math.PI / 2;
        this._animState   = 'idle';
        this._facingLeft  = false;
        this._animFrame   = 0;
        this._currentAnimKey = 'adventure_idle';
        this.playerSpriteKey = 'adventure_player';
        this.level        = 1;
        this.maxHealth    = 120;
        this.health       = 120;

        // Physics: don't block local player movement
        this.solid           = false;
        this.collisionRadius = 0;
        this.width           = 38;
        this.height          = 38;

        // Cave tracking — updated via PLAYER_UPDATE
        this._inCave = false;
        this._caveId = null;

        // Pick a consistent tint from full player ID (stable across clients)
        const h = hashString(String(playerId || 'remote'));
        this._tint = PLAYER_TINTS[h % PLAYER_TINTS.length] ?? '#ff8a3d';
        this.color = this._tint;

        // Name to show above player
        const shortId = String(playerId || '?').slice(-4).toUpperCase();
        this._displayName = `J-${shortId}`;
    }

    applyState(data) {
        this._targetX    = data.x;
        this._targetY    = data.y;
        this.health      = data.hp    ?? this.health;
        this.maxHealth   = data.maxHp ?? this.maxHealth;
        this.facingAngle = data.angle ?? 0;
        this.spriteFacingAngle = data.dirAngle ?? data.angle ?? this.spriteFacingAngle;
        this._animState  = data.anim  ?? 'idle';
        this._facingLeft = data.flip  ?? false;
        this._animFrame  = data.frame ?? 0;
        this.level       = data.lvl   ?? 1;
        this._slot       = data.slot  ?? this._slot ?? 1;
        this._currentAnimKey = data.animKey ?? this._getAdventureAnimKey(this._slot, this._animState);
        this.playerSpriteKey = spriteManager.normalizePlayerSpriteKey(data.spriteKey ?? this.playerSpriteKey);
        this._caveId     = data.cave  ?? null;
        this._inCave     = !!data.cave;
    }

    update(dt) {
        // Smooth interpolation toward last received position (lerp at ~15 Hz input)
        const t = Math.min(1, 15 * dt);
        this.x += (this._targetX - this.x) * t;
        this.y += (this._targetY - this.y) * t;
        super.update(dt);
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const DRAW = 64;
        // Map animation state to sprite key
        const animKey = this._getAnimKey(this._slot, this._animState);
        const bodyFlip = Math.cos(this.spriteFacingAngle || 0) < 0;
        const adventureAnimKey = this._currentAnimKey || this._getAdventureAnimKey(this._slot, this._animState);

        const drawn = spriteManager.drawAdventurePlayerFrame(
            ctx,
            adventureAnimKey,
            this._animFrame || 0,
            72,
            bodyFlip,
            this.playerSpriteKey
        ) || spriteManager.drawDirectionalPlayerFrame(
            ctx,
            this._animState || 'idle',
            this._animFrame || 0,
            this.spriteFacingAngle || 0,
            DRAW
        ) || spriteManager.drawUnitFrame(ctx, animKey, this._animFrame, DRAW, DRAW, bodyFlip);

        if (!drawn) {
            // Fallback to player sprite sheet (never a plain circle)
            const fallbackDrawn = spriteManager.drawPlayerFallbackFrame(
                ctx, this._animFrame || 0, 64, 64, bodyFlip
            );
            if (!fallbackDrawn) {
                ctx.fillStyle = this._tint;
                ctx.fillRect(-12, -16, 24, 32);
            }
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = this._tint + '66';
            ctx.fillRect(-28, -28, 56, 56);
            ctx.globalCompositeOperation = 'source-over';
        } else {
            // Subtle tint overlay to distinguish from local player
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = this._tint + '55'; // ~33% opacity
            ctx.fillRect(-DRAW / 2, -DRAW / 2, DRAW, DRAW);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();

        // Player label + health bar (in world space, outside save/restore)
        this._renderLabel(ctx);
        if (this.health < this.maxHealth) this._renderHealthBar(ctx);
    }

    _renderLabel(ctx) {
        ctx.save();
        ctx.font = 'bold 12px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(this._displayName, this.x + 1, this.y - 43);
        // Text
        ctx.fillStyle = this._tint;
        ctx.fillText(this._displayName, this.x, this.y - 44);
        ctx.restore();
    }

    _renderHealthBar(ctx) {
        const bw = 40, bh = 4;
        const bx = this.x - bw / 2;
        const by = this.y - 52;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#44ff44';
        ctx.fillRect(bx, by, bw * Math.max(0, this.health / this.maxHealth), bh);
    }

    _getAnimKey(slot, state) {
        const s = Math.max(1, Math.min(5, Number(slot) || 1));

        if (s === 4) {
            if (state === 'run') return 'archer_run';
            if (state === 'attack') return 'archer_shoot';
            return 'archer_idle';
        }
        if (s === 2) {
            if (state === 'run') return 'pawn_axe_run';
            if (state === 'attack') return 'pawn_axe_interact';
            return 'pawn_axe_idle';
        }
        if (s === 3) {
            if (state === 'run') return 'pawn_pick_run';
            if (state === 'attack') return 'pawn_pick_interact';
            return 'pawn_pick_idle';
        }
        if (s === 5) {
            if (state === 'run') return 'pawn_hammer_run';
            if (state === 'attack') return 'pawn_hammer_work';
            return 'pawn_hammer_idle';
        }

        if (state === 'run') return 'warrior_run';
        if (state === 'attack') return 'warrior_attack';
        return 'warrior_idle';
    }

    _getAdventureAnimKey(slot, state) {
        if (state === 'hurt') return 'adventure_hurt';
        if (state === 'dash') return 'adventure_jump';
        if (state === 'run') return 'adventure_walk';
        if (state !== 'attack') return 'adventure_idle';

        const s = Math.max(1, Math.min(5, Number(slot) || 1));
        if (s === 4) return 'adventure_bow';
        if (s === 2 || s === 3) return 'adventure_farm';
        return 'adventure_sword';
    }
}
