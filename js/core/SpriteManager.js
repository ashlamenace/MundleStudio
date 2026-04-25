/**
 * Sprite Manager - loads and caches all game sprites
 */

class SpriteManager {
    constructor() {
        this.sprites = {};
        this.loaded = false;
        this.loadPromise = null;

        // Tiny Swords unit frame width (all units share 192px)
        this.UNIT_FRAME = 192;

        // Kenney tiny-dungeon packed tilemap: 12 cols × 11 rows of 16×16
        this.DUNGEON_TILE = 16;

        this.directionalPlayer = {
            key: 'player_phantom',
            columns: 4,
            rows: 4,
            southRow: 0,
            northRow: 1,
            eastRow: 2,
            backgroundThreshold: 245,
            analysis: null
        };

        this.staticPlayer = {
            key: 'phantom_idle'
        };

        this.playerSpriteKeys = [
            'adventure_player',
            'adventure_boy_a',
            'adventure_boy_b',
            'adventure_boy_c',
            'adventure_boy_d',
            'adventure_knight_a',
            'adventure_knight_b',
            'adventure_knight_c',
            'adventure_knight_d',
            'adventure_knight_e',
            'adventure_knight_f',
            'adventure_knight_g',
            'adventure_knight_h',
            'adventure_special_knight_1',
            'adventure_special_knight_2',
            'adventure_special_knight_3',
            'adventure_special_knight_4',
            'adventure_worker_a',
            'adventure_worker_b',
            'adventure_worker_c',
            'adventure_worker_d'
        ];

        // Animation frame counts for player
        this.playerAnims = {
            adventure_idle:        { key: 'adventure_player', row: 0, frames: 6 },
            adventure_walk:        { key: 'adventure_player', row: 1, frames: 6 },
            adventure_jump:        { key: 'adventure_player', row: 2, frames: 6 },
            adventure_sword_back:  { key: 'adventure_player', row: 5, frames: 5 },
            adventure_sword:       { key: 'adventure_player', row: 6, frames: 5 },
            adventure_power:       { key: 'adventure_player', row: 8, frames: 5 },
            adventure_thrust:      { key: 'adventure_player', row: 9, frames: 7 },
            adventure_farm:        { key: 'adventure_player', row: 7, frames: 8 },
            adventure_flame_punch: { key: 'adventure_player', row: 10, frames: 4 },
            adventure_bow:         { key: 'adventure_player', row: 12, frames: 4 },
            adventure_hurt:        { key: 'adventure_player', row: 10, frames: 4 },
            warrior_idle:   { key: 'warrior_idle',    frames: 8 },
            warrior_run:    { key: 'warrior_run',     frames: 6 },
            warrior_attack: { key: 'warrior_attack1', frames: 4 },
            archer_idle:    { key: 'archer_idle',     frames: 6 },
            archer_run:     { key: 'archer_run',      frames: 4 },
            archer_shoot:   { key: 'archer_shoot',    frames: 8, reversed: true },
            pawn_axe_idle:      { key: 'pawn_axe_idle',      frames: 6 },
            pawn_axe_run:       { key: 'pawn_axe_run',       frames: 6 },
            pawn_axe_interact:  { key: 'pawn_axe_interact',  frames: 6 },
            pawn_pick_idle:     { key: 'pawn_pick_idle',     frames: 6 },
            pawn_pick_run:      { key: 'pawn_pick_run',      frames: 6 },
            pawn_pick_interact: { key: 'pawn_pick_interact', frames: 6 },
            pawn_hammer_idle:   { key: 'pawn_hammer_idle',   frames: 6 },
            pawn_hammer_run:    { key: 'pawn_hammer_run',    frames: 6 },
            pawn_hammer_work:   { key: 'pawn_hammer_work',   frames: 6 },
        };

        // Enemy type → animated sprite definition
        // idleF / runF = frame counts (Tiny Swords: warriors 8i/6r, others 6i/6r, archers 6i/4r)
        this.enemyAnims = {
            grunt:          { idle: 'bm_red_cap',           run: 'bm_red_cap',           idleF: 4, runF: 4, frameSize: 16, basic: true },
            speeder:        { idle: 'bm_bloodshot_eye',     run: 'bm_bloodshot_eye',     idleF: 4, runF: 4, frameSize: 16, basic: true },
            tank:           { idle: 'bm_stone_troll',       run: 'bm_stone_troll',       idleF: 4, runF: 4, frameSize: 16, basic: true },
            bomber:         { idle: 'bm_death_slime',       run: 'bm_death_slime',       idleF: 4, runF: 4, frameSize: 16, basic: true },
            scorpion:       { idle: 'bm_crimson_slaad',     run: 'bm_crimson_slaad',     idleF: 4, runF: 4, frameSize: 16, basic: true },
            mummy:          { idle: 'bm_blinded_grimlock',  run: 'bm_blinded_grimlock',  idleF: 4, runF: 4, frameSize: 16, basic: true },
            frostElemental: { idle: 'bm_ocular_watcher',    run: 'bm_ocular_watcher',    idleF: 4, runF: 4, frameSize: 16, basic: true },
            iceWolf:        { idle: 'bm_murky_slaad',       run: 'bm_murky_slaad',       idleF: 4, runF: 4, frameSize: 16, basic: true },
            swampThing:     { idle: 'bm_fungal_myconid',    run: 'bm_fungal_myconid',    idleF: 4, runF: 4, frameSize: 16, basic: true },
            poisonFrog:     { idle: 'bm_ochre_jelly',       run: 'bm_ochre_jelly',       idleF: 4, runF: 4, frameSize: 16, basic: true },
            fireImp:        { idle: 'bm_crimson_slaad',     run: 'bm_crimson_slaad',     idleF: 4, runF: 4, frameSize: 16, basic: true },
            lavaGolem:      { idle: 'bm_brawny_ogre',       run: 'bm_brawny_ogre',       idleF: 4, runF: 4, frameSize: 16, basic: true },
            wanderer:       { idle: 'bm_blinded_grimlock',  run: 'bm_blinded_grimlock',  idleF: 4, runF: 4, frameSize: 16, basic: true },
            mimic:          { idle: 'bm_shrieker_mushroom', run: 'bm_shrieker_mushroom', idleF: 4, runF: 4, frameSize: 16, basic: true },
            shadow:         { idle: 'bm_death_slime',       run: 'bm_death_slime',       idleF: 4, runF: 4, frameSize: 16, basic: true },
            // Bosses
            berserkTitan:   { idle: 'bm_humongous_ettin',  run: 'bm_humongous_ettin',  idleF: 4, runF: 4, frameSize: 16, basic: true },
            frostLord:      { idle: 'bm_crushing_cyclops', run: 'bm_crushing_cyclops', idleF: 4, runF: 4, frameSize: 16, basic: true },
            infernoDrake:   { idle: 'bm_brawny_ogre',      run: 'bm_brawny_ogre',      idleF: 4, runF: 4, frameSize: 16, basic: true },
            stormWraith:    { idle: 'bm_ocular_watcher',   run: 'bm_ocular_watcher',   idleF: 4, runF: 4, frameSize: 16, basic: true },
            voidBehemoth:   { idle: 'bm_humongous_ettin',  run: 'bm_humongous_ettin',  idleF: 4, runF: 4, frameSize: 16, basic: true },
            bat:            { idle: 'bm_bloodshot_eye',    run: 'bm_bloodshot_eye',    idleF: 4, runF: 4, frameSize: 16, basic: true },
            spider:         { idle: 'bm_crimson_slaad',    run: 'bm_crimson_slaad',    idleF: 4, runF: 4, frameSize: 16, basic: true },
            golem:          { idle: 'bm_stone_troll',      run: 'bm_stone_troll',      idleF: 4, runF: 4, frameSize: 16, basic: true },
            crystalGuardian:{ idle: 'bm_crushing_cyclops', run: 'bm_crushing_cyclops', idleF: 4, runF: 4, frameSize: 16, basic: true },
        };
    }

    async loadAll() {
        if (this.loadPromise) return this.loadPromise;
        this.loadPromise = this._loadSprites();
        await this.loadPromise;
        this.loaded = true;
        return this.sprites;
    }

    async _loadSprites() {
        const ts  = 'assets/Tiny Swords (Free Pack)/Tiny Swords (Free Pack)';
        const ken = 'assets/kenney_tiny-dungeon';
        const cute = 'assets/Cute_Fantasy_Free';
        const bm = 'assets/Basic_Monster_Animations';

        const entries = [
            // ── Player (Blue) ──────────────────────────────────────────────────
            ['warrior_idle',    `${ts}/Units/Blue Units/Warrior/Warrior_Idle.png`],
            ['warrior_run',     `${ts}/Units/Blue Units/Warrior/Warrior_Run.png`],
            ['warrior_attack1', `${ts}/Units/Blue Units/Warrior/Warrior_Attack1.png`],
            ['warrior_attack2', `${ts}/Units/Blue Units/Warrior/Warrior_Attack2.png`],
            ['archer_idle',     `${ts}/Units/Blue Units/Archer/Archer_Idle.png`],
            ['archer_run',      `${ts}/Units/Blue Units/Archer/Archer_Run.png`],
            ['archer_shoot',    `${ts}/Units/Blue Units/Archer/Archer_Shoot.png`],
            ['pawn_axe_idle',      `${ts}/Units/Blue Units/Pawn/Pawn_Idle Axe.png`],
            ['pawn_axe_run',       `${ts}/Units/Blue Units/Pawn/Pawn_Run Axe.png`],
            ['pawn_axe_interact',  `${ts}/Units/Blue Units/Pawn/Pawn_Interact Axe.png`],
            ['pawn_pick_idle',     `${ts}/Units/Blue Units/Pawn/Pawn_Idle Pickaxe.png`],
            ['pawn_pick_run',      `${ts}/Units/Blue Units/Pawn/Pawn_Run Pickaxe.png`],
            ['pawn_pick_interact', `${ts}/Units/Blue Units/Pawn/Pawn_Interact Pickaxe.png`],
            ['pawn_hammer_idle',   `${ts}/Units/Blue Units/Pawn/Pawn_Idle Hammer.png`],
            ['pawn_hammer_run',    `${ts}/Units/Blue Units/Pawn/Pawn_Run Hammer.png`],
            ['pawn_hammer_work',   `${ts}/Units/Blue Units/Pawn/Pawn_Interact Hammer.png`],
            ['player_guardian_sheet', 'assets/sprites/player/player_guardian_sheet.png'],
            ['player_phantom', 'assets/sprites/player/player_phantom.png'],
            ['phantom_idle', 'assets/sprites/player/phantom_idle.png'],
            ['adventure_player', 'assets/sprites/player/Adventure_Character_Simple.png'],
            ['adventure_boy_a', 'assets/sprites/player/Boy_Adventure_A.png'],
            ['adventure_boy_b', 'assets/sprites/player/Boy_Adventure_B.png'],
            ['adventure_boy_c', 'assets/sprites/player/Boy_Adventure_C.png'],
            ['adventure_boy_d', 'assets/sprites/player/Boy_Adventure_D.png'],
            ['adventure_knight_a', 'assets/sprites/player/Knight_A.png'],
            ['adventure_knight_b', 'assets/sprites/player/Knight_B.png'],
            ['adventure_knight_c', 'assets/sprites/player/Knight_C.png'],
            ['adventure_knight_d', 'assets/sprites/player/Knight_D.png'],
            ['adventure_knight_e', 'assets/sprites/player/Knight_E.png'],
            ['adventure_knight_f', 'assets/sprites/player/Knight_F.png'],
            ['adventure_knight_g', 'assets/sprites/player/Knight_G.png'],
            ['adventure_knight_h', 'assets/sprites/player/Knight_H.png'],
            ['adventure_special_knight_1', 'assets/sprites/player/Special_Knight_1.png'],
            ['adventure_special_knight_2', 'assets/sprites/player/Special_Knight_2.png'],
            ['adventure_special_knight_3', 'assets/sprites/player/Special_Knight_3.png'],
            ['adventure_special_knight_4', 'assets/sprites/player/Special_Knight_4.png'],
            ['adventure_worker_a', 'assets/sprites/player/Worker_A.png'],
            ['adventure_worker_b', 'assets/sprites/player/Worker_B.png'],
            ['adventure_worker_c', 'assets/sprites/player/Worker_C.png'],
            ['adventure_worker_d', 'assets/sprites/player/Worker_D.png'],

            // ── Enemy sprites ──────────────────────────────────────────────────
            // Red Pawn  → grunt, poisonFrog
            ['e_red_pawn_idle',    `${ts}/Units/Red Units/Pawn/Pawn_Idle.png`],
            ['e_red_pawn_run',     `${ts}/Units/Red Units/Pawn/Pawn_Run.png`],
            // Yellow Archer → speeder
            ['e_yel_archer_idle',  `${ts}/Units/Yellow Units/Archer/Archer_Idle.png`],
            ['e_yel_archer_run',   `${ts}/Units/Yellow Units/Archer/Archer_Run.png`],
            // Black Warrior → tank, lavaGolem, berserkTitan, voidBehemoth
            ['e_blk_warrior_idle', `${ts}/Units/Black Units/Warrior/Warrior_Idle.png`],
            ['e_blk_warrior_run',  `${ts}/Units/Black Units/Warrior/Warrior_Run.png`],
            // Black Lancer → cave spider fallback
            ['e_blk_lancer_idle',  `${ts}/Units/Black Units/Lancer/Lancer_Idle.png`],
            ['e_blk_lancer_run',   `${ts}/Units/Black Units/Lancer/Lancer_Run.png`],
            // Black Pawn → bomber, swampThing
            ['e_blk_pawn_idle',    `${ts}/Units/Black Units/Pawn/Pawn_Idle.png`],
            ['e_blk_pawn_run',     `${ts}/Units/Black Units/Pawn/Pawn_Run.png`],
            // Red Lancer → scorpion
            ['e_red_lancer_idle',  `${ts}/Units/Red Units/Lancer/Lancer_Idle.png`],
            ['e_red_lancer_run',   `${ts}/Units/Red Units/Lancer/Lancer_Run.png`],
            // Black Monk → mummy, shadow
            ['e_blk_monk_idle',    `${ts}/Units/Black Units/Monk/Idle.png`],
            ['e_blk_monk_run',     `${ts}/Units/Black Units/Monk/Run.png`],
            // Blue Lancer → frostElemental, frostLord
            ['e_blu_lancer_idle',  `${ts}/Units/Blue Units/Lancer/Lancer_Idle.png`],
            ['e_blu_lancer_run',   `${ts}/Units/Blue Units/Lancer/Lancer_Run.png`],
            // Blue Pawn → iceWolf
            ['e_blu_pawn_idle',    `${ts}/Units/Blue Units/Pawn/Pawn_Idle.png`],
            ['e_blu_pawn_run',     `${ts}/Units/Blue Units/Pawn/Pawn_Run.png`],
            // Red Archer → fireImp
            ['e_red_archer_idle',  `${ts}/Units/Red Units/Archer/Archer_Idle.png`],
            ['e_red_archer_run',   `${ts}/Units/Red Units/Archer/Archer_Run.png`],
            // Purple Warrior → wanderer, stormWraith
            ['e_pur_warrior_idle', `${ts}/Units/Purple Units/Warrior/Warrior_Idle.png`],
            ['e_pur_warrior_run',  `${ts}/Units/Purple Units/Warrior/Warrior_Run.png`],
            // Red Warrior → infernoDrake
            ['e_red_warrior_idle', `${ts}/Units/Red Units/Warrior/Warrior_Idle.png`],
            ['e_red_warrior_run',  `${ts}/Units/Red Units/Warrior/Warrior_Run.png`],
            // Yellow Pawn → mimic
            ['e_yel_pawn_idle',    `${ts}/Units/Yellow Units/Pawn/Pawn_Idle.png`],
            ['e_yel_pawn_run',     `${ts}/Units/Yellow Units/Pawn/Pawn_Run.png`],

            // ── Fallback enemy tilemap (kept for backwards compat) ─────────────
            ['bm_blinded_grimlock', `${bm}/BlindedGrimlock.png`],
            ['bm_bloodshot_eye', `${bm}/BloodshotEye.png`],
            ['bm_brawny_ogre', `${bm}/BrawnyOgre.png`],
            ['bm_crimson_slaad', `${bm}/CrimsonSlaad.png`],
            ['bm_crushing_cyclops', `${bm}/CrushingCyclops.png`],
            ['bm_death_slime', `${bm}/DeathSlime.png`],
            ['bm_fungal_myconid', `${bm}/FungalMyconid.png`],
            ['bm_humongous_ettin', `${bm}/HumongousEttin.png`],
            ['bm_murky_slaad', `${bm}/MurkySlaad.png`],
            ['bm_ochre_jelly', `${bm}/OchreJelly.png`],
            ['bm_ocular_watcher', `${bm}/OcularWatcher.png`],
            ['bm_red_cap', `${bm}/RedCap.png`],
            ['bm_shrieker_mushroom', `${bm}/ShriekerMushroom.png`],
            ['bm_stone_troll', `${bm}/StoneTroll.png`],
            ['bm_swamp_troll', `${bm}/SwampTroll.png`],

            ['dungeon_chars',   `${ken}/Tilemap/tilemap_packed.png`],

            // ── Buildings ─────────────────────────────────────────────────────
            ['bld_tower',       `${ts}/Buildings/Blue Buildings/Tower.png`],
            ['bld_barracks',    `${ts}/Buildings/Blue Buildings/Barracks.png`],
            ['bld_archery',     `${ts}/Buildings/Blue Buildings/Archery.png`],
            ['bld_monastery',   `${ts}/Buildings/Blue Buildings/Monastery.png`],
            ['bld_castle',      `${ts}/Buildings/Blue Buildings/Castle.png`],
            ['bld_house1',      `${ts}/Buildings/Blue Buildings/House1.png`],
            ['bld_house2',      `${ts}/Buildings/Blue Buildings/House2.png`],
            ['bld_house3',      `${ts}/Buildings/Blue Buildings/House3.png`],

            // ── FX spritesheets ───────────────────────────────────────────────
            ['fx_explosion1',   `${ts}/Particle FX/Explosion_01.png`],
            ['fx_explosion2',   `${ts}/Particle FX/Explosion_02.png`],
            ['fx_fire1',        `${ts}/Particle FX/Fire_01.png`],
            ['fx_fire2',        `${ts}/Particle FX/Fire_02.png`],
            ['fx_fire3',        `${ts}/Particle FX/Fire_03.png`],
            ['fx_dust1',        `${ts}/Particle FX/Dust_01.png`],
            ['fx_dust2',        `${ts}/Particle FX/Dust_02.png`],
            ['fx_water_splash', `${ts}/Particle FX/Water Splash.png`],

            // ── Decorations ───────────────────────────────────────────────────
            ['deco_tree1',      `${ts}/Terrain/Resources/Wood/Trees/Tree1.png`],
            ['deco_tree2',      `${ts}/Terrain/Resources/Wood/Trees/Tree2.png`],
            ['deco_tree3',      `${ts}/Terrain/Resources/Wood/Trees/Tree3.png`],
            ['deco_tree4',      `${ts}/Terrain/Resources/Wood/Trees/Tree4.png`],
            ['deco_rock1',      `${ts}/Terrain/Decorations/Rocks/Rock1.png`],
            ['deco_rock2',      `${ts}/Terrain/Decorations/Rocks/Rock2.png`],
            ['deco_rock3',      `${ts}/Terrain/Decorations/Rocks/Rock3.png`],
            ['deco_rock4',      `${ts}/Terrain/Decorations/Rocks/Rock4.png`],
            ['deco_bush1',      `${ts}/Terrain/Decorations/Bushes/Bushe1.png`],
            ['deco_bush2',      `${ts}/Terrain/Decorations/Bushes/Bushe2.png`],
            ['deco_bush3',      `${ts}/Terrain/Decorations/Bushes/Bushe3.png`],
            ['deco_bush4',      `${ts}/Terrain/Decorations/Bushes/Bushe4.png`],
            ['gold_stone3',     `${ts}/Terrain/Resources/Gold/Gold Stones/Gold Stone 3.png`],
            ['gold_stone5',     `${ts}/Terrain/Resources/Gold/Gold Stones/Gold Stone 5.png`],
            ['gold_resource',   `${ts}/Terrain/Resources/Gold/Gold Resource/Gold_Resource.png`],
            ['tool_hammer',     `${ts}/Terrain/Resources/Tools/Tool_01.png`],
            ['tool_wrench',     `${ts}/Terrain/Resources/Tools/Tool_02.png`],
            ['tool_crystal',    `${ts}/Terrain/Resources/Tools/Tool_03.png`],
            ['tool_pickaxe',    `${ts}/Terrain/Resources/Tools/Tool_04.png`],
            ['deco_stump1',     `${ts}/Terrain/Resources/Wood/Trees/Stump 1.png`],
            ['deco_stump2',     `${ts}/Terrain/Resources/Wood/Trees/Stump 2.png`],

            // Cute Fantasy free pack
            ['cute_grass_middle', `${cute}/Tiles/Grass_Middle.png`],
            ['cute_water_middle', `${cute}/Tiles/Water_Middle.png`],
            ['cute_path_middle',  `${cute}/Tiles/Path_Middle.png`],
            ['cute_oak_tree',     `${cute}/Oak_Tree_Small.png`],
            ['cute_outdoor_decor', `${cute}/Outdoor_Decor_Free.png`],
        ];

        await Promise.all(entries.map(([key, path]) => this._loadImage(key, path)));
    }

    async _loadImage(key, path) {
        try {
            const img = new Image();
            await new Promise((resolve) => {
                img.onload  = resolve;
                img.onerror = () => { console.warn(`Sprite missing: ${path}`); resolve(); };
                img.src = path;
            });
            if (img.complete && img.naturalWidth > 0) this.sprites[key] = img;
        } catch (e) {
            console.warn(`Error loading ${key}:`, e);
        }
    }

    get(key) {
        return this.sprites[key] || null;
    }

    /**
     * Draw an animated Tiny Swords unit frame (player or enemy).
     * ctx must already be translated to center.
     */
    drawUnitFrame(ctx, animKey, frame, drawW, drawH, flipX = false) {
        const anim = this.playerAnims[animKey];
        if (!anim) return false;
        const img = this.sprites[anim.key];
        if (!img) return false;

        const fw = this.UNIT_FRAME;
        const fh = this.UNIT_FRAME;
        const actualFrame = anim.reversed
            ? (anim.frames - 1 - (frame % anim.frames))
            : (frame % anim.frames);
        const sx = actualFrame * fw;

        ctx.save();
        if (flipX) { ctx.scale(-1, 1); }
        ctx.drawImage(img, sx, 0, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        return true;
    }

    getRandomPlayerSpriteKey() {
        const available = this.playerSpriteKeys.filter(key => this.sprites[key]);
        const keys = available.length ? available : this.playerSpriteKeys;
        return keys[Math.floor(Math.random() * keys.length)] || 'adventure_player';
    }

    normalizePlayerSpriteKey(spriteKey) {
        return this.playerSpriteKeys.includes(spriteKey) ? spriteKey : 'adventure_player';
    }

    drawAdventurePlayerFrame(ctx, animKey, frame, drawSize, flipX = false, spriteKey = null) {
        const anim = this.playerAnims[animKey];
        if (!anim) return false;
        const requestedKey = this.normalizePlayerSpriteKey(spriteKey || anim.key);
        const img = this.sprites[requestedKey] || this.sprites[anim.key];
        if (!img) return false;

        const fw = 48;
        const fh = 48;
        const actualFrame = frame % anim.frames;
        const sx = actualFrame * fw;
        const sheetH = img.naturalHeight || img.height || 0;
        const requestedY = anim.row * fh;
        const sy = requestedY + fh <= sheetH ? requestedY : 0;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (flipX) ctx.scale(-1, 1);
        ctx.drawImage(
            img,
            sx,
            sy,
            fw,
            fh,
            -drawSize / 2,
            -drawSize / 2,
            drawSize,
            drawSize
        );
        ctx.restore();
        return true;
    }

    drawPlayerFallbackFrame(ctx, frame, drawW, drawH, flipX = false) {
        const img = this.sprites.player_guardian_sheet;
        if (!img) return false;

        const fw = 64;
        const fh = 64;
        const sx = (frame % 4) * fw;

        ctx.save();
        if (flipX) ctx.scale(-1, 1);
        ctx.drawImage(img, sx, 0, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        return true;
    }

    drawStaticPlayerFrame(ctx, drawSize, flipX = false) {
        const img = this.sprites[this.staticPlayer.key];
        if (!img) return false;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (flipX) ctx.scale(-1, 1);
        ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
        return true;
    }

    _analyzeDirectionalPlayerSheet() {
        const def = this.directionalPlayer;
        if (def.analysis) return def.analysis;

        const img = this.sprites[def.key];
        if (!img) return null;

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const cctx = canvas.getContext('2d', { willReadFrequently: true });
        cctx.drawImage(img, 0, 0);

        const imageData = cctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const bg = def.backgroundThreshold ?? 245;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i] >= bg && data[i + 1] >= bg && data[i + 2] >= bg) {
                data[i + 3] = 0;
            }
        }
        cctx.putImageData(imageData, 0, 0);

        const alpha = imageData.data;
        const colCounts = new Array(canvas.width).fill(0);
        const rowCounts = new Array(canvas.height).fill(0);

        for (let y = 0; y < canvas.height; y++) {
            const rowOffset = y * canvas.width * 4;
            for (let x = 0; x < canvas.width; x++) {
                if (alpha[rowOffset + x * 4 + 3] > 0) {
                    colCounts[x]++;
                    rowCounts[y]++;
                }
            }
        }

        const colBands = this._detectAxisBands(colCounts, def.columns);
        const rowBands = this._detectAxisBands(rowCounts, def.rows);
        const colCells = this._bandsToCellBounds(colBands, canvas.width);
        const rowCells = this._bandsToCellBounds(rowBands, canvas.height);

        let maxW = 1;
        let maxH = 1;
        const boxes = [];

        for (let row = 0; row < def.rows; row++) {
            boxes[row] = [];
            const cellY = rowCells[row] || { start: Math.floor((row * canvas.height) / def.rows), end: Math.floor(((row + 1) * canvas.height) / def.rows) - 1 };
            for (let col = 0; col < def.columns; col++) {
                const cellX = colCells[col] || { start: Math.floor((col * canvas.width) / def.columns), end: Math.floor(((col + 1) * canvas.width) / def.columns) - 1 };
                const bbox = this._findOpaqueBounds(alpha, canvas.width, canvas.height, cellX.start, cellY.start, cellX.end, cellY.end)
                    || { left: cellX.start, top: cellY.start, right: cellX.end, bottom: cellY.end };
                const width = Math.max(1, bbox.right - bbox.left + 1);
                const height = Math.max(1, bbox.bottom - bbox.top + 1);
                maxW = Math.max(maxW, width);
                maxH = Math.max(maxH, height);
                boxes[row][col] = { ...bbox, width, height };
            }
        }

        def.analysis = { canvas, boxes, maxW, maxH };
        return def.analysis;
    }

    _detectAxisBands(counts, expected) {
        const max = counts.reduce((best, value) => Math.max(best, value), 0);
        if (max <= 0) return this._fallbackAxisBands(counts.length, expected);

        const thresholds = [0.12, 0.08, 0.05, 0.03, 0.015];
        for (const ratio of thresholds) {
            const threshold = Math.max(1, Math.floor(max * ratio));
            let bands = this._segmentsAboveThreshold(counts, threshold).filter(b => (b.end - b.start + 1) >= 4);
            if (bands.length === 0) continue;
            if (bands.length > expected) bands = this._mergeBandsToExpected(bands, expected);
            if (bands.length === expected) return bands;
        }

        return this._fallbackAxisBands(counts.length, expected);
    }

    _segmentsAboveThreshold(counts, threshold) {
        const segments = [];
        let start = -1;

        for (let i = 0; i < counts.length; i++) {
            if (counts[i] >= threshold) {
                if (start < 0) start = i;
            } else if (start >= 0) {
                segments.push({ start, end: i - 1 });
                start = -1;
            }
        }
        if (start >= 0) segments.push({ start, end: counts.length - 1 });

        return segments;
    }

    _mergeBandsToExpected(bands, expected) {
        const merged = [...bands];
        while (merged.length > expected) {
            let bestIdx = 0;
            let bestGap = Infinity;
            for (let i = 0; i < merged.length - 1; i++) {
                const gap = merged[i + 1].start - merged[i].end;
                if (gap < bestGap) {
                    bestGap = gap;
                    bestIdx = i;
                }
            }
            merged.splice(bestIdx, 2, {
                start: merged[bestIdx].start,
                end: merged[bestIdx + 1].end
            });
        }
        return merged;
    }

    _fallbackAxisBands(total, expected) {
        const bands = [];
        for (let i = 0; i < expected; i++) {
            const start = Math.floor((i * total) / expected);
            const end = Math.max(start, Math.floor(((i + 1) * total) / expected) - 1);
            bands.push({ start, end });
        }
        return bands;
    }

    _bandsToCellBounds(bands, total) {
        if (!bands.length) return [];

        const centers = bands.map(b => (b.start + b.end) / 2);
        const cuts = [0];

        for (let i = 0; i < centers.length - 1; i++) {
            cuts.push(Math.round((centers[i] + centers[i + 1]) / 2));
        }
        cuts.push(total);

        const cells = [];
        for (let i = 0; i < bands.length; i++) {
            cells.push({
                start: Math.max(0, cuts[i]),
                end: Math.min(total - 1, Math.max(cuts[i], cuts[i + 1] - 1))
            });
        }
        return cells;
    }

    _findOpaqueBounds(alpha, width, height, left, top, right, bottom) {
        let minX = right + 1;
        let minY = bottom + 1;
        let maxX = left - 1;
        let maxY = top - 1;

        for (let y = Math.max(0, top); y <= Math.min(height - 1, bottom); y++) {
            const rowOffset = y * width * 4;
            for (let x = Math.max(0, left); x <= Math.min(width - 1, right); x++) {
                if (alpha[rowOffset + x * 4 + 3] > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < minX || maxY < minY) return null;
        return { left: minX, top: minY, right: maxX, bottom: maxY };
    }

    drawDirectionalPlayerFrame(ctx, state, frame, facingAngle, drawSize) {
        const def = this.directionalPlayer;
        const analysis = this._analyzeDirectionalPlayerSheet();
        if (!analysis) return false;

        const cols = Math.max(1, def.columns || 4);
        const rows = Math.max(1, def.rows || 4);

        const normalized = Math.atan2(Math.sin(facingAngle || 0), Math.cos(facingAngle || 0));

        let row = def.southRow;
        let flipX = false;

        if (normalized > Math.PI / 4 && normalized < (3 * Math.PI) / 4) {
            row = def.southRow;
        } else if (normalized < -Math.PI / 4 && normalized > (-3 * Math.PI) / 4) {
            row = def.northRow;
        } else if (Math.abs(normalized) <= Math.PI / 4) {
            row = def.eastRow;
        } else {
            row = def.eastRow;
            flipX = true;
        }

        const actualRow = Math.max(0, Math.min(rows - 1, row));
        const actualFrame = state === 'run' ? (frame % cols) : 0;
        const box = analysis.boxes?.[actualRow]?.[actualFrame];
        if (!box) return false;

        const scale = Math.min(drawSize / analysis.maxW, drawSize / analysis.maxH);
        const drawW = Math.max(1, Math.round(box.width * scale));
        const drawH = Math.max(1, Math.round(box.height * scale));
        const dx = -Math.round(drawW / 2);
        const dy = Math.round(drawSize / 2 - drawH);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (flipX) ctx.scale(-1, 1);
        ctx.drawImage(
            analysis.canvas,
            box.left,
            box.top,
            box.width,
            box.height,
            dx,
            dy,
            drawW,
            drawH
        );
        ctx.restore();
        return true;
    }

    /**
     * Draw an animated enemy frame.
     * @param {string} enemyType  - e.g. 'grunt'
     * @param {'idle'|'run'} state
     * @param {number} frame      - current frame index (wraps automatically)
     * @param {number} drawSize   - display size (square, centered)
     * @param {boolean} flipX
     */
    drawEnemyFrame(ctx, enemyType, state, frame, drawSize, flipX = false) {
        const def = this.enemyAnims[enemyType];
        if (!def) return false;

        const key    = state === 'run' ? def.run  : def.idle;
        const frames = state === 'run' ? def.runF : def.idleF;
        const img    = this.sprites[key];
        if (!img) return false;

        const fw = def.frameSize || this.UNIT_FRAME;
        const sx = (frame % frames) * fw;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (flipX) { ctx.scale(-1, 1); }
        ctx.drawImage(img, sx, 0, fw, fw, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
        return true;
    }

    isBasicMonsterEnemy(enemyType) {
        return !!this.enemyAnims[enemyType]?.basic;
    }

    /**
     * Draw an FX animation frame (horizontal strip of square frames).
     */
    drawFXFrame(ctx, key, frame, totalFrames, frameSize, x, y, drawSize) {
        const img = this.sprites[key];
        if (!img) return false;
        const sx = (frame % totalFrames) * frameSize;
        ctx.drawImage(img, sx, 0, frameSize, frameSize, x, y, drawSize, drawSize);
        return true;
    }

    /** Kept for backwards compat */
    getEnemySprite(enemyType) { return this.sprites['dungeon_chars'] || null; }

    /** Fallback: draw from dungeon tilemap (used if animated sprite missing) */
    drawEnemySprite(ctx, enemyType, drawSize) {
        const img = this.sprites['dungeon_chars'];
        if (!img) return false;
        const TILE_POS = {
            grunt:[0,6],speeder:[1,6],tank:[2,6],bomber:[3,6],scorpion:[4,6],
            mummy:[5,6],frostElemental:[6,6],iceWolf:[7,6],swampThing:[8,6],
            poisonFrog:[9,6],fireImp:[10,6],lavaGolem:[11,6],
            mimic:[0,8],shadow:[1,8],wanderer:[2,8],
        };
        const [col, row] = TILE_POS[enemyType] || [0, 6];
        const t = this.DUNGEON_TILE;
        ctx.drawImage(img, col * t, row * t, t, t, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        return true;
    }

    getToolSprite() { return null; }
}

export const spriteManager = new SpriteManager();
