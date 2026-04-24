# Crystal Guardian — Prompts complets de tous les assets

## CONVENTIONS GLOBALES

### Style unique à respecter partout
```
2D flat cartoon illustration, pixel art style, bold black outlines (2px), vibrant saturated colors,
arcade game sprite, Kingdom Rush / Clash Royale visual style
NOT 3D render — NOT photorealistic — NOT CGI — 2D only
```

### Système de tailles — RÈGLE D'OR
| Catégorie | Frame (px) | Frames | Canvas total | FPS |
|-----------|-----------|--------|-------------|-----|
| Joueur | 96 × 96 | voir anim | frames × 96, h=96 | 8-12 |
| Ennemi petit (≤ 18px) | 64 × 64 | voir anim | frames × 64, h=64 | 8 |
| Ennemi moyen (20-30px) | 96 × 96 | voir anim | frames × 96, h=96 | 8 |
| Ennemi grand (≥ 32px) | 128 × 128 | voir anim | frames × 128, h=128 | 8 |
| Boss | 192 × 192 | voir anim | frames × 192, h=192 | 8 |
| Tuile terrain | 64 × 64 | 1 (ou 4) | 64 ou 256 × 64 | 4 |
| Bâtiment petit | 64 × 64 | 1 | 64 × 64 | — |
| Bâtiment grand | 96 × 128 | 1 | 96 × 128 | — |
| Mur (segment) | 32 × 48 | 1 | 32 × 48 | — |
| Crystal | 96 × 128 | 6 | 576 × 128 | 6 |
| Ressource (arbre) | 64 × 80 | 4 | 256 × 80 | 6 |
| Ressource (roche) | 64 × 64 | 2 | 128 × 64 | 4 |
| Projectile | 32 × 32 | 1 | 32 × 32 | — |
| FX grand | 128 × 128 | 8 | 1024 × 128 | 12 |
| FX petit | 64 × 64 | 6 | 384 × 64 | 12 |
| Icône UI | 32 × 32 | 1 | 32 × 32 | — |

---

### ⚠️ BLOC TECHNIQUE OBLIGATOIRE — À coller à la fin de CHAQUE prompt

Ce suffixe doit être ajouté sans exception à tous les prompts ci-dessous :

```
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet strip: [N] frames side by side, each frame exactly [W]x[H] pixels,
total image [W*N]x[H] pixels. Frames evenly spaced touching with no gap between them.
Each frame uses the exact same canvas size, character centered within frame.
Pure transparent PNG background — zero fill, no solid color background, no drop shadows on canvas.
No frame borders, no numbers, no labels, no watermarks.
Game engine ready sprite sheet, directly importable, pixel art cartoon style.
```

**Remplacer [N], [W], [H] par les valeurs du sprite concerné.**

---

### Exemple de prompt complet bien formé

```
2D game sprite sheet — warrior idle animation.
8 frames horizontal strip, each frame 96x96px, total canvas 768x96px.
Medieval blue knight warrior, cartoon top-down slight isometric view.
Subtle idle breathing: chest rises and falls, shield arm sways gently.
Blue and gold armor with white cross emblem, blue plumed helmet, silver sword, round shield.
Soft glowing light on sword blade oscillates between frames.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet strip: 8 frames side by side, each frame exactly 96x96 pixels,
total image 768x96 pixels. Frames evenly spaced touching with no gap.
Pure transparent PNG background, no drop shadow on canvas.
No frame borders, no numbers, no labels. Game engine ready, pixel art style.
```

---

## DOSSIER STRUCTURE

```
assets/sprites/
├── player/
│   ├── warrior_idle.png          (768×96 — 8f)
│   ├── warrior_run.png           (576×96 — 6f)
│   ├── warrior_attack.png        (384×96 — 4f)
│   ├── warrior_death.png         (576×96 — 6f)
│   ├── archer_idle.png           (576×96 — 6f)
│   ├── archer_run.png            (384×96 — 4f)
│   ├── archer_shoot.png          (576×96 — 6f)
│   └── archer_death.png          (576×96 — 6f)
├── enemies/
│   ├── plains/
│   │   ├── grunt.png             (576×96 — idle4 + walk4 + atk2 + death2)
│   │   ├── speeder.png           (384×64 — idle2 + run4 + death2)
│   │   ├── tank.png              (640×128 — idle4 + walk2 + atk2 + death2)
│   │   └── bomber.png            (384×96 — idle4 + walk4 + explode4)
│   ├── desert/
│   │   ├── scorpion.png          (512×64 — idle4 + walk4 + atk2 + death2)
│   │   └── mummy.png             (640×96 — idle4 + walk4 + atk2 + death2 + resurrect2)
│   ├── tundra/
│   │   ├── frost_elemental.png   (576×96 — idle4 + walk4 + atk2 + death4)
│   │   └── ice_wolf.png          (576×64 — idle2 + run4 + atk2 + death2)
│   ├── swamp/
│   │   ├── swamp_thing.png       (640×128 — idle4 + walk2 + atk4 + death2)
│   │   └── poison_frog.png       (384×64 — idle4 + jump2 + spit2 + death2)
│   ├── volcanic/
│   │   ├── fire_imp.png          (384×64 — idle2 + fly4 + throw2 + death2)
│   │   └── lava_golem.png        (640×128 — idle4 + walk2 + smash4 + death4)
│   └── universal/
│       ├── mimic.png             (640×96 — idle4 + open2 + walk4 + death2)
│       ├── shadow.png            (512×96 — idle4 + dash4 + atk2 + death2)
│       └── wanderer.png          (640×96 — idle4 + walk4 + atk4 + death2)
├── bosses/
│   ├── berserk_titan.png         (1152×192 — idle4 + walk2 + slam4 + enrage2 + death4)
│   ├── frost_lord.png            (960×192 — idle4 + walk2 + aura2 + freeze2 + death4)
│   ├── inferno_drake.png         (1152×192 — idle4 + fly4 + breath4 + death4)
│   ├── storm_wraith.png          (960×192 — idle4 + float4 + lightning4 + death4)
│   └── void_behemoth.png         (1152×192 — idle4 + walk2 + pulse4 + death4)
├── terrain/
│   ├── tile_grass.png            (64×64)
│   ├── tile_grass_anim.png       (256×64 — 4f sway)
│   ├── tile_dirt.png             (64×64)
│   ├── tile_stone.png            (64×64)
│   ├── tile_sand.png             (64×64)
│   ├── tile_water_anim.png       (256×64 — 4f ripples)
│   ├── tile_snow.png             (64×64)
│   ├── tile_ice_anim.png         (128×64 — 2f shimmer)
│   ├── tile_mud.png              (64×64)
│   ├── tile_lava_anim.png        (256×64 — 4f flow)
│   ├── tile_obsidian.png         (64×64)
│   ├── tile_sandstone.png        (64×64)
│   ├── tile_cave_floor.png       (64×64)
│   └── tile_cave_wall.png        (64×64)
├── buildings/
│   ├── walls/
│   │   ├── wall_wood.png         (32×48)
│   │   ├── wall_stone.png        (32×48)
│   │   ├── wall_metal.png        (32×48)
│   │   └── wall_amethyst.png     (32×48)
│   ├── door_closed.png           (32×48)
│   ├── door_open.png             (32×48)
│   ├── workbench.png             (96×128)
│   ├── watchtower.png            (96×128) ← remplacé par Tiny Swords Tower.png
│   ├── forge_idle.png            (288×128 — 3f glow anim)
│   ├── oil_barrel.png            (64×64)
│   ├── rally_banner.png          (256×96 — 4f wave anim)
│   ├── healing_shrine.png        (192×128 — 2f pulse)
│   ├── spike_trap.png            (128×64 — 2f idle+up)
│   ├── barricade.png             (96×64)
│   └── miners/
│       ├── miner_wood.png        (192×96 — 2f anim)
│       ├── miner_stone.png       (192×96 — 2f anim)
│       └── miner_metal.png       (192×96 — 2f anim)
├── crystal/
│   └── crystal_idle.png          (576×128 — 6f pulse)
├── resources/
│   ├── tree_pine.png             (256×80 — 4f sway)
│   ├── tree_oak.png              (256×80 — 4f sway)
│   ├── rock_grey.png             (128×64 — 2f)
│   ├── ore_metal.png             (128×64 — 2f sparkle)
│   └── crystal_amethyst.png      (256×64 — 4f glow)
├── projectiles/
│   ├── arrow_normal.png          (32×32)
│   ├── arrow_fire.png            (32×32)
│   ├── arrow_ice.png             (32×32)
│   ├── arrow_lightning.png       (32×32)
│   ├── cannonball.png            (32×32)
│   ├── laser_bolt.png            (48×16)
│   ├── fireball.png              (48×48)
│   ├── frost_bolt.png            (32×32)
│   └── sniper_bullet.png         (48×12)
├── fx/
│   ├── explosion_big.png         (1024×128 — 8f)
│   ├── explosion_small.png       (384×64 — 6f)
│   ├── fire_burn.png             (384×64 — 6f loop)
│   ├── ice_freeze.png            (384×64 — 6f)
│   ├── lightning_strike.png      (384×96 — 4f)
│   ├── death_smoke.png           (384×64 — 6f)
│   ├── level_up_burst.png        (1024×128 — 8f)
│   ├── heal_pulse.png            (384×128 — 4f)
│   ├── hit_sparks.png            (192×64 — 3f)
│   └── poison_cloud.png          (384×64 — 6f loop)
└── ui/
    ├── icon_wood.png             (32×32)
    ├── icon_stone.png            (32×32)
    ├── icon_metal.png            (32×32)
    ├── icon_amethyst.png         (32×32)
    ├── icon_gold.png             (32×32)
    ├── icon_diamond.png          (32×32)
    ├── icon_xp.png               (32×32)
    ├── icon_heart.png            (32×32)
    └── icon_shield.png           (32×32)
```

---

## 1. JOUEUR

### 🗡️ Guerrier (Warrior) — palette : bleu roi + or + blanc

**warrior_idle.png** — `768×96` — 8 frames @6fps
```
2D game sprite sheet — warrior idle animation.
8 frames horizontal strip, each frame 96x96px, total canvas 768x96px.
Medieval blue knight warrior, cartoon top-down slight isometric view.
Subtle idle breathing: chest rises and falls, shield arm sways gently.
Blue and gold armor with white cross emblem on chest plate.
Blue plumed helmet, silver sword held at side, round shield.
Soft glowing light on sword blade oscillates between frames.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 8 frames side by side, each exactly 96x96px, total 768x96px.
Frames touching with no gap. Pure transparent PNG background, no drop shadow on canvas.
No borders, no labels, no watermarks. Game engine ready, pixel art style, bold black 2px outlines.
```

**warrior_run.png** — `576×96` — 6 frames @10fps
```
2D game sprite sheet — warrior run animation.
6 frames horizontal strip, each frame 96x96px, total canvas 576x96px.
Medieval blue knight warrior running, cartoon top-down slight isometric.
Legs pumping in stride cycle, cape trailing behind, sword raised.
Armor pieces bounce with each step, slight forward lean.
Blue gold armor, white cross on chest, blue plumed helmet.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 96x96px, total 576x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**warrior_attack.png** — `384×96` — 4 frames @14fps
```
2D game sprite sheet — warrior attack animation.
4 frames horizontal strip, each frame 96x96px, total canvas 384x96px.
Medieval blue knight warrior sword slash, cartoon top-down slight isometric.
Frame1: windup sword raised high. Frame2: full mid-swing arc.
Frame3: impact — sword lowest point, white flash impact burst.
Frame4: follow-through recoil, golden motion trail arc from sword.
Blue gold armor, white cross chest, blue helmet.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 4 frames side by side, each exactly 96x96px, total 384x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**warrior_death.png** — `576×96` — 6 frames @10fps
```
2D game sprite sheet — warrior death animation.
6 frames horizontal strip, each frame 96x96px, total canvas 576x96px.
Medieval blue knight warrior death, cartoon top-down slight isometric.
Frame1: hit stagger. Frame2: falling backward. Frame3: half fallen.
Frame4: lying on ground. Frame5: dissolve sparkle. Frame6: empty with small golden star.
Small golden star particles floating upward at end.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 96x96px, total 576x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

**archer_idle.png** — `576×96` — 6 frames @6fps
```
2D game sprite sheet — archer idle animation.
6 frames horizontal strip, each frame 96x96px, total canvas 576x96px.
Medieval green archer, cartoon top-down slight isometric view, bow held at rest.
Subtle idle: weight shifts left and right, bow tip rises and falls.
Quiver of arrows on back, green hood and leather armor, brown boots.
Soft golden shimmer on arrow tips.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 96x96px, total 576x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**archer_run.png** — `384×96` — 4 frames @10fps
```
2D game sprite sheet — archer run animation.
4 frames horizontal strip, each frame 96x96px, total canvas 384x96px.
Medieval green archer running, cartoon top-down slight isometric.
Bow held in running hand, quiver bouncing on back, hood flowing.
Green leather armor, quick light steps, slight forward lean.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 4 frames side by side, each exactly 96x96px, total 384x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**archer_shoot.png** — `576×96` — 6 frames @12fps
```
2D game sprite sheet — archer shoot animation.
6 frames horizontal strip, each frame 96x96px, total canvas 576x96px.
Medieval green archer shooting bow, cartoon top-down slight isometric.
Frame1: draw bow back fully, string taut, arrow nocked and glowing.
Frame2: aim — eye squinted, full tension.
Frame3: release — arrow leaving bow with motion blur.
Frame4-5: bow vibration recoil oscillation.
Frame6: return to ready stance.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 96x96px, total 576x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 2. ENNEMIS — PLAINES / FORÊT

### 🟢 Grunt — `1152×96` — (idle×4, walk×4, atk×2, death×2) = 12 frames

```
2D game sprite sheet — grunt enemy full animation.
12 frames horizontal strip, each frame 96x96px, total canvas 1152x96px.
Small goblin warrior cartoon game enemy, slightly top-down isometric view.
Squat green body, big round yellow eyes, crooked toothy grin.
Rusty dagger in right hand, cracked wooden shield in left.
Torn brown loincloth and leather straps.
Animation layout — frame1-4: idle breathing head bobbing,
frame5-8: walking shuffle, feet dragging, head bobbing low,
frame9-10: melee swipe attack with dagger, arm extending forward,
frame11-12: death — hit stagger white flash, fall flat,
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 12 frames side by side, each exactly 96x96px, total 1152x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 🔵 Speeder — `512×64` — (idle×2, run×4, death×2) = 8 frames

```
2D game sprite sheet — speeder enemy full animation.
8 frames horizontal strip, each frame 64x64px, total canvas 512x64px.
Small fast blue imp creature cartoon game enemy, top-down isometric view.
Tiny lean body with oversized legs, big round cyan eyes, manic grin.
Striped orange scarf trailing behind when running.
Frame1-2: idle side-to-side hop. Frame3-6: rapid running legs blur, scarf streams.
Frame7-8: death — zap hit flash, crumple with star.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 8 frames side by side, each exactly 64x64px, total 512x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 🔴 Tank — `1280×128` — (idle×4, walk×2, atk×2, death×2) = 10 frames

```
2D game sprite sheet — tank enemy full animation.
10 frames horizontal strip, each frame 128x128px, total canvas 1280x128px.
Massive armored ogre warrior cartoon game enemy, slightly top-down isometric view.
Enormous bulk, thick riveted plate armor dark red and charcoal.
Huge spiked club resting on shoulder, tiny beady eyes in giant helmet.
Horns on helmet, heavy footfall dust puffs on walk frames.
Frame1-4: idle breathing heavily, armor plates rattle, smoke puffs from nose.
Frame5-6: slow stomp walk, ground shakes.
Frame7-8: wide swinging club overhead smash, ground crack impact burst.
Frame9-10: death — stagger, crumple into pile of armor.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 10 frames side by side, each exactly 128x128px, total 1280x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 💣 Bomber — `960×96` — (idle×4, walk×2, explode×4) = 10 frames

```
2D game sprite sheet — bomber enemy full animation.
10 frames horizontal strip, each frame 96x96px, total canvas 960x96px.
Cartoon bomb-carrying enemy creature, top-down isometric view.
Pudgy round brown body with wick on head, X eyes, manic grin.
Carries oversized black cartoon bomb with lit fuse trailing sparks.
Frame1-4: idle fuse sparking and shortening, body wobbling nervously.
Frame5-6: walking shuffle, bomb swings in hand.
Frame7-8: winding up, arms spread wide panic.
Frame9-10: explosion burst — body replaced by orange star burst and debris.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 10 frames side by side, each exactly 96x96px, total 960x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 3. ENNEMIS — DÉSERT

### 🦂 Scorpion — `768×64` — (idle×4, walk×4, atk×2, death×2) = 12 frames

```
2D game sprite sheet — scorpion enemy full animation.
12 frames horizontal strip, each frame 64x64px, total canvas 768x64px.
Cartoon giant scorpion enemy, top-down strict overhead view (ideal for arachnid).
Sandy tan carapace with darker brown markings, 8 legs, oversized claws.
Curved stinger tail prominently raised, glowing green poison tip.
Frame1-4: idle tail sways menacingly, claws click open and close.
Frame5-8: scuttle walk, legs ripple in alternating wave pattern.
Frame9-10: claw pinch attack — claws snap forward.
Frame11-12: death — stagger, curl into ball.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 12 frames side by side, each exactly 64x64px, total 768x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 💀 Mummy — `1056×96` — (idle×4, walk×2, atk×2, death×2, resurrect×2) = 11 frames

```
2D game sprite sheet — mummy enemy full animation.
11 frames horizontal strip, each frame 96x96px, total canvas 1056x96px.
Cartoon undead mummy enemy, top-down slight isometric view.
Tattered cream white bandages wrapping entire body, some trailing loose.
Glowing turquoise eyes in dark hollow sockets, cracked sarcophagus mask on face.
Scarab beetle amulet glowing on chest.
Frame1-4: idle — bandage strips flutter, eyes pulse dim-bright.
Frame5-6: shambling walk, arms stretched zombie style.
Frame7-8: clawing slam attack, bandages flailing.
Frame9-10: death — crumbles to bandage pile.
Frame11: resurrect — bandage pile reassembles and rises.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 11 frames side by side, each exactly 96x96px, total 1056x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 4. ENNEMIS — TOUNDRA

### ❄️ Frost Elemental — `1152×96` — (idle×4, walk×2, atk×2, death×4) = 12 frames

```
2D game sprite sheet — frost elemental enemy full animation.
12 frames horizontal strip, each frame 96x96px, total canvas 1152x96px.
Cartoon ice spirit elemental enemy, top-down slight isometric view.
Translucent icy blue crystalline body, ice crystal spikes on shoulders.
Inner cold white glow pulsing, snowflake patterns on body surface.
Floating above ground (wispy bottom, no visible feet).
Frame1-4: idle — ethereal float bob, ice crystals orbit slowly, glow brightens/dims.
Frame5-6: glide forward, cold mist trail.
Frame7-8: ice shard throw — arm extends, crystal projectile launches.
Frame9-12: death — body shatters into ice shards, fragments scatter.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 12 frames side by side, each exactly 96x96px, total 1152x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 🐺 Ice Wolf — `640×64` — (idle×2, run×4, atk×2, death×2) = 10 frames

```
2D game sprite sheet — ice wolf enemy full animation.
10 frames horizontal strip, each frame 64x64px, total canvas 640x64px.
Cartoon arctic wolf enemy, top-down slight isometric view.
Sleek white and pale blue fur, icy crystal formations on back.
Glowing ice blue eyes, paws leave frost prints, breath visible as mist.
Frame1-2: idle — alert, ears perked, tail swaying low.
Frame3-6: sprinting gallop 4-leg cycle, ice crystals scatter from paws.
Frame7-8: lunge bite attack — jaws snap forward.
Frame9-10: death — collapse, frost dissolve sparkle.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 10 frames side by side, each exactly 64x64px, total 640x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 5. ENNEMIS — MARÉCAGE

### 🌿 Swamp Thing — `1536×128` — (idle×4, walk×2, atk×4, death×2) = 12 frames

```
2D game sprite sheet — swamp thing enemy full animation.
12 frames horizontal strip, each frame 128x128px, total canvas 1536x128px.
Cartoon swamp creature plant monster, top-down slight isometric view.
Enormous mossy green blob body with vine tendrils for arms.
Bark-like skin texture, glowing yellow eyes deep in mass.
Lily pads and mushrooms growing from back, mud dripping constantly.
Frame1-4: idle — mass undulates breathing, tendrils writhe slowly, eyes pulse.
Frame5-6: lumbering stomp walk, mud splash under foot.
Frame7-10: tendril attack sequence — vine winds up, lashes forward, suction tip hits, recoils.
Frame11-12: death — body deflates, sinks into mud pool.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 12 frames side by side, each exactly 128x128px, total 1536x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 🐸 Poison Frog — `640×64` — (idle×4, jump×2, spit×2, death×2) = 10 frames

```
2D game sprite sheet — poison frog enemy full animation.
10 frames horizontal strip, each frame 64x64px, total canvas 640x64px.
Cartoon toxic poison frog enemy, top-down slight isometric view.
Small round bright green body with neon purple poison spots.
Enormous black eyes, bulging throat sac pulsing. Tongue slightly extended, webbed feet.
Frame1-4: idle — throat sac inflates and deflates, spots pulse neon.
Frame5-6: jump arc — launch crouch, then airborne leap.
Frame7-8: poison spit — mouth opens wide, toxic green glob launches.
Frame9-10: death — flips over, limbs up, tongue flopping out.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 10 frames side by side, each exactly 64x64px, total 640x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 6. ENNEMIS — VOLCANIQUE

### 🔥 Fire Imp — `640×64` — (idle×2, fly×4, throw×2, death×2) = 10 frames

```
2D game sprite sheet — fire imp enemy full animation.
10 frames horizontal strip, each frame 64x64px, total canvas 640x64px.
Cartoon fire imp demon enemy, top-down slight isometric view.
Small fiery red-orange body, tiny bat wings flapping, thin pointed tail.
Glowing ember eyes, huge mischievous grin showing sharp teeth.
Small fireball held in hand, flame wisps trailing from wings and body.
Frame1-2: idle hovering, wings flutter slowly, flames flicker.
Frame3-6: flying dart movement, wings pumping fast, trail of embers behind.
Frame7-8: wind up and throw fireball — arm coils back, releases fireball.
Frame9-10: death — burns up in flash, leaves small smoke puff.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 10 frames side by side, each exactly 64x64px, total 640x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 🌋 Lava Golem — `1280×128` — (idle×4, walk×2, smash×4, death×4) = 14 frames

```
2D game sprite sheet — lava golem enemy full animation.
14 frames horizontal strip, each frame 128x128px, total canvas 1792x128px.
Cartoon lava golem boss-tier enemy, top-down slight isometric view.
Enormous rocky obsidian body cracked through with glowing lava veins.
Magma visibly churning inside cracks, fist-sized boulders as hands.
Glowing red magma eyes, small volcano cone on back erupting sparks.
Lava drips from each step, pooling on ground.
Frame1-4: idle — lava veins pulse bright-dim, boulder fists clench.
Frame5-6: slow stomp walk, shockwave ripple on ground.
Frame7-10: both fists smash down sequence — windup, slam, impact burst, lava chunks fly.
Frame11-14: death — body cracks apart, lava spills out, solidifies to black rock.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 14 frames side by side, each exactly 128x128px, total 1792x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 7. ENNEMIS UNIVERSELS

### 📦 Mimic — `1152×96` — (idle×4, open×2, walk×4, death×2) = 12 frames

```
2D game sprite sheet — mimic enemy full animation.
12 frames horizontal strip, each frame 96x96px, total canvas 1152x96px.
Cartoon treasure chest mimic enemy, top-down slight isometric view.
Ornate wooden chest with gold trim, innocent closed look when idle.
Huge row of sharp teeth inside lid, single creepy eyeball visible through keyhole.
Tiny stubby legs on bottom.
Frame1-4: idle — looks like normal chest, keyhole eye darts side to side.
Frame5-6: creaking open slowly revealing teeth, eye widening.
Frame7-10: fully open, walking on tiny legs aggressively, shrieking.
Frame11-12: chomp bite attack, lid snaps shut with crunch.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 12 frames side by side, each exactly 96x96px, total 1152x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 👤 Shadow — `1152×96` — (idle×4, dash×4, atk×2, death×2) = 12 frames

```
2D game sprite sheet — shadow enemy full animation.
12 frames horizontal strip, each frame 96x96px, total canvas 1152x96px.
Cartoon shadow assassin ghost enemy, top-down slight isometric view.
Pitch black silhouette humanoid form with only two glowing white eyes visible.
Wispy dark smoke trails from edges, partial transparency at extremities.
Frame1-4: idle — flickers in and out of visibility, smoke swirls, eyes glow.
Frame5-8: blink-dash movement, leaves dark afterimage smear trail.
Frame9-10: void energy slash attack, dark energy wave extends from hand.
Frame11-12: death — rapidly flickers and dissolves into smoke.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 12 frames side by side, each exactly 96x96px, total 1152x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### ⚔️ Wanderer — `1344×96` — (idle×4, walk×4, atk×4, death×2) = 14 frames

```
2D game sprite sheet — wanderer enemy full animation.
14 frames horizontal strip, each frame 96x96px, total canvas 1344x96px.
Cartoon elite wandering knight enemy, top-down slight isometric view.
Battle-worn patchwork armor mix of different materials.
Grey-blue cape tattered at edges, cracked helmet with glowing slit visor.
Oversized zweihander sword with rune etchings, collected skulls on belt.
Frame1-4: idle — cape sways, visor glow pulses, sword planted in ground.
Frame5-8: purposeful walking stride, cloak billowing.
Frame9-12: sword attack combo — windup high, diagonal slash, spin cut, plant.
Frame13-14: death — stagger backward, collapse with cloak settling.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 14 frames side by side, each exactly 96x96px, total 1344x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 8. BOSS

### 💪 Berserk Titan — `3072×192` — (idle×4, walk×2, slam×4, enrage×2, death×4) = 16 frames

```
2D game sprite sheet — berserk titan boss full animation.
16 frames horizontal strip, each frame 192x192px, total canvas 3072x192px.
Enormous cartoon berserk titan boss, top-down slight isometric view.
Gigantic muscular humanoid, crude iron chains wrapped around fists as weapons.
Scarred red body, tiny head with huge jaw, war paint tribal markings.
Rage veins visible on forehead, red glowing eyes.
Frame1-4: idle — breathing rage, chains clanking, ground vibrating under weight.
Frame5-6: thunderous charge stomp walk, dust cloud footsteps.
Frame7-10: ground pound slam — windup both fists raise, slam down, massive crater burst, shockwave.
Frame11-12: enrage — body flares red, speed lines, veins glow brighter.
Frame13-16: death — staggered hit, falls to knees, collapses forward, dust cloud settles.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 16 frames side by side, each exactly 192x192px, total 3072x192px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 🧊 Frost Lord — `2688×192` — (idle×4, walk×2, aura×2, freeze×2, death×4) = 14 frames

```
2D game sprite sheet — frost lord boss full animation.
14 frames horizontal strip, each frame 192x192px, total canvas 2688x192px.
Majestic cartoon frost lord boss, top-down slight isometric view.
Tall regal ice elemental in flowing crystal robes, ice crown with icicle spikes.
Body made of translucent deep blue ice with white core glow.
Ice scepter staff with giant snowflake head, floating ice shards orbit body.
Frame1-4: idle — ethereal float, robes ripple, orbiting ice shards shift pattern.
Frame5-6: slow glide forward, trailing ice mist.
Frame7-8: aura — radial frost rings expand from body, blue energy flare.
Frame9-10: freeze beam — scepter aims, ray fires forward, ground cracks ice.
Frame11-14: death — body fractures, ice chips fly, shatters completely.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 14 frames side by side, each exactly 192x192px, total 2688x192px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 🐉 Inferno Drake — `3072×192` — (idle×4, fly×4, breath×4, death×4) = 16 frames

```
2D game sprite sheet — inferno drake boss full animation.
16 frames horizontal strip, each frame 192x192px, total canvas 3072x192px.
Fearsome cartoon dragon boss, top-down strict overhead view, wings fully visible from above.
Massive red-black scaled drake, wingspan huge with detailed membrane wing pattern.
Bright magma orange chest glow, horn crown, slit fire eyes, barbed tail spike.
Frame1-4: idle hovering flap — wings beat slowly, chest glow pulses warmly.
Frame5-8: fast dive swoop movement — wings tuck then extend at speed.
Frame9-12: fire breath — jaw opens wide, tongue out, river of orange flame cone sprays forward, dissipates.
Frame13-16: death — mid-flight hit, wings crumple, spiraling fall, crash impact.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 16 frames side by side, each exactly 192x192px, total 3072x192px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### ⚡ Storm Wraith — `3072×192` — (idle×4, float×4, lightning×4, death×4) = 16 frames

```
2D game sprite sheet — storm wraith boss full animation.
16 frames horizontal strip, each frame 192x192px, total canvas 3072x192px.
Terrifying cartoon storm wraith spectral boss, top-down slight isometric view.
Massive ethereal specter, pale yellow-white translucent body crackling with electricity.
Storm cloud grey billowing cloak with embedded lightning bolts.
Four arms extended, lightning arcing between all fingertips. Rotating storm halo above.
Frame1-4: idle — electric arcs dance between hands, body flickers like static.
Frame5-8: rapid glide float, lightning bolt afterimage trail left behind.
Frame9-12: chain lightning attack — full charge, arcs blast outward in all directions, fade.
Frame13-16: death — electric overload, brilliant flash, body dissolves into sparks.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 16 frames side by side, each exactly 192x192px, total 3072x192px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

### 🌑 Void Behemoth — `3072×192` — (idle×4, walk×2, pulse×4, death×4) = 14 frames (+ padding)

```
2D game sprite sheet — void behemoth boss full animation.
14 frames horizontal strip, each frame 192x192px, total canvas 2688x192px.
Colossal cartoon void behemoth final boss, top-down slight isometric view.
Incomprehensible dark mass, vaguely humanoid but edges undefined and fuzzy.
Endless shifting dark purple-black void texture with stars visible inside body.
Four glowing purple void eyes, reality distortion rings warping around body.
Smaller void entities orbiting as satellites.
Frame1-4: idle — reality warps and shimmers, stars inside pulse, distortion rings ripple.
Frame5-6: slow gravimetric movement, ground cracks with void energy underfoot.
Frame7-10: void pulse — charges up, concentric reality shatter rings blast outward, fade.
Frame11-14: death — reality collapses inward, implosion, black hole shrinks, gone.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 14 frames side by side, each exactly 192x192px, total 2688x192px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 9. TERRAIN — TUILES

> Toutes les tuiles : **top-down strict**, **seamless tiling** (les bords se raccordent),
> style cartoon mais lisible pour une vue de jeu.

**tile_grass.png** — `64×64` — statique
```
2D game floor tile 64x64px, seamless tileable top-down grass ground texture.
Cartoon style, lush bright green, subtle grass blade texture, small wildflower dots.
Slight shade variation for visual interest. No objects, no outline on edges.
Flat and seamlessly tileable. 2D flat illustration, NOT 3D render.
Single image 64x64px, transparent-compatible or opaque fill, no borders, no labels.
```

**tile_grass_anim.png** — `256×64` — 4 frames (gentle sway)
```
2D animated game floor tile sprite sheet — grass sway.
4 frames horizontal strip, each frame 64x64px, total canvas 256x64px.
Top-down grass ground, subtle wind sway animation.
Frame1-4: grass blades lean slightly left, center, right, center loop.
Bright green cartoon grass, seamless tiling edges.
2D flat illustration, NOT 3D render. Horizontal sprite sheet: 4 frames side by side,
each exactly 64x64px, total 256x64px. Frames touching no gap. No labels. Pixel art style.
```

**tile_dirt.png** — `64×64`
```
2D game floor tile 64x64px, seamless tileable top-down dirt ground texture.
Cartoon style, warm brown earth, small pebbles and soil clumps, subtle cracked earth pattern.
Flat and seamlessly tileable. 2D flat illustration, NOT 3D render.
Single image 64x64px, no borders, no labels.
```

**tile_stone.png** — `64×64`
```
2D game floor tile 64x64px, seamless tileable top-down stone cobblestone ground.
Cartoon style, dark grey stone blocks, subtle mortar lines, slight wear and moss.
Flat and seamlessly tileable. 2D flat illustration, NOT 3D render.
Single image 64x64px, no borders, no labels.
```

**tile_sand.png** — `64×64`
```
2D game floor tile 64x64px, seamless tileable top-down sand ground texture, desert setting.
Cartoon style, warm golden tan sand, subtle ripple marks, tiny sparkle specks.
Flat and seamlessly tileable. 2D flat illustration, NOT 3D render.
Single image 64x64px, no borders, no labels.
```

**tile_water_anim.png** — `256×64` — 4 frames (ripples)
```
2D animated game floor tile sprite sheet — water ripple.
4 frames horizontal strip, each frame 64x64px, total canvas 256x64px.
Top-down water surface animation, cartoon style.
Frame1-4: gentle ripple rings expanding and fading, highlight sparkle shifting.
Deep blue with white highlight ripples, seamless tiling.
2D flat illustration, NOT 3D render. Horizontal sprite sheet: 4 frames side by side,
each exactly 64x64px, total 256x64px. Frames touching no gap. No labels. Pixel art style.
```

**tile_snow.png** — `64×64`
```
2D game floor tile 64x64px, seamless tileable top-down snow ground texture.
Cartoon style, pure white with soft blue shadow in depressions.
Subtle snow crystal sparkle dots, slightly uneven snow surface.
Flat and seamlessly tileable. 2D flat illustration, NOT 3D render.
Single image 64x64px, no borders, no labels.
```

**tile_ice_anim.png** — `128×64` — 2 frames (shimmer)
```
2D animated game floor tile sprite sheet — ice shimmer.
2 frames horizontal strip, each frame 64x64px, total canvas 128x64px.
Top-down slick ice surface, cartoon style.
Frame1-2: glossy ice reflection shimmer shifts position between frames.
Pale blue-white with bright highlight gleam, seamless tiling.
2D flat illustration, NOT 3D render. Horizontal sprite sheet: 2 frames side by side,
each exactly 64x64px, total 128x64px. Frames touching no gap. No labels. Pixel art style.
```

**tile_mud.png** — `64×64`
```
2D game floor tile 64x64px, seamless tileable top-down mud ground texture, swamp setting.
Cartoon style, dark green-brown muddy surface, bubble pits, wet sheen.
Flat and seamlessly tileable. 2D flat illustration, NOT 3D render.
Single image 64x64px, no borders, no labels.
```

**tile_lava_anim.png** — `256×64` — 4 frames (slow flow)
```
2D animated game floor tile sprite sheet — lava flow.
4 frames horizontal strip, each frame 64x64px, total canvas 256x64px.
Top-down glowing lava surface, cartoon style.
Frame1-4: slow churning lava flow, bright orange cracks shift position each frame.
Dark crust surface, glowing orange-red cracks, light pulse. Seamless tiling.
2D flat illustration, NOT 3D render. Horizontal sprite sheet: 4 frames side by side,
each exactly 64x64px, total 256x64px. Frames touching no gap. No labels. Pixel art style.
```

**tile_obsidian.png** — `64×64`
```
2D game floor tile 64x64px, seamless tileable top-down obsidian volcanic rock ground.
Cartoon style, very dark near-black purple with glassy sheen, purple crystal vein reflections.
Flat and seamlessly tileable. 2D flat illustration, NOT 3D render.
Single image 64x64px, no borders, no labels.
```

**tile_cave_floor.png** + **tile_cave_wall.png** — `64×64` each
```
[tile_cave_floor] 2D game floor tile 64x64px, seamless top-down stone dungeon floor.
Dark grey with chisel marks, faint moss patches. 2D flat cartoon, NOT 3D render. No borders.

[tile_cave_wall] 2D game tile 64x64px, top-down dungeon wall face.
Rough dark stone, carved bricks, completely solid look. 2D flat cartoon, NOT 3D render. No borders.
```

---

## 10. STRUCTURES & BÂTIMENTS

### Murs (wall segments) — `32×48`

**wall_wood.png**
```
2D game wall segment sprite, single image 32x48px.
Top-down isometric view, wooden log wall section.
Brown oak planks with iron nail heads, slight top surface visible.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. No labels. Bold black outlines.
```

**wall_stone.png**
```
2D game wall segment sprite, single image 32x48px.
Top-down isometric view, stone brick wall section.
Grey stone blocks with mortar lines, slight top face visible, sturdy fortress look.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. No labels. Bold black outlines.
```

**wall_metal.png**
```
2D game wall segment sprite, single image 32x48px.
Top-down isometric view, steel riveted metal wall panel.
Riveted steel plates, bolts at corners, metallic sheen, industrial look.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. No labels. Bold black outlines.
```

**wall_amethyst.png**
```
2D game wall segment sprite, single image 32x48px.
Top-down isometric view, magical amethyst crystal wall segment.
Deep purple crystalline formation, glowing inner light, faceted gem surface.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. No labels. Bold black outlines.
```

---

### Porte — `32×48` × 2 states

**door_closed.png** + **door_open.png**
```
[door_closed] 2D game door sprite, single image 32x48px.
Top-down isometric view, thick wooden gate closed.
Dark oak planks with iron bands, handle visible, arched top.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. No labels. Bold black outlines.

[door_open] Same door sprite 32x48px, open/swung to one side, gap visible in middle.
Hinge visible, open passage clear. 2D flat cartoon, NOT 3D render. Transparent PNG. No labels.
```

---

### Établi (Workbench) — `96×128`

```
2D game building sprite, single image 96x128px.
Top-down slight isometric view, wooden workbench.
Chunky carpenter's table, tools hanging on wall behind (hammer, saw, wrench).
Lumber scraps and nails scattered on top, lantern hanging illuminating workspace.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. No labels. Bold black outlines.
```

---

### Forge — `288×128` — 3 frames @4fps (glow animation)

```
2D animated game building sprite sheet — forge fire pulse.
3 frames horizontal strip, each frame 96x128px, total canvas 288x128px.
Top-down slight isometric, medieval blacksmith forge.
Stone furnace with bellows, anvil in front, iron tool rack on side.
Frame1: forge fire low orange glow. Frame2: fire medium brighter.
Frame3: fire peak bright white-orange, ember sparks flying.
Loop creates pulsing fire glow effect.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 3 frames side by side, each exactly 96x128px, total 288x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

### Baril d'Huile — `64×64`

```
2D game item sprite, single image 64x64px.
Top-down slight isometric view, wooden oil barrel.
Dark wood stave barrel with iron banding rings, black oil stain at base.
Red danger label with flame symbol on side, cork stopper on top.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. No labels. Bold black outlines.
```

---

### Bannière de Ralliement — `256×96` — 4 frames @6fps (waving flag)

```
2D animated game building sprite sheet — rally banner wave.
4 frames horizontal strip, each frame 64x96px, total canvas 256x96px.
Top-down slight isometric, wooden flagpole with large banner.
Banner displays crossed swords emblem on royal blue field with gold trim.
Frame1-4: banner fabric waves in breeze, cloth fold ripple left to right, golden fringe swaying.
Wooden pole base with sandbag anchor.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 4 frames side by side, each exactly 64x96px, total 256x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

### Sanctuaire de Soin — `192×128` — 2 frames @3fps (glow pulse)

```
2D animated game building sprite sheet — healing shrine pulse.
2 frames horizontal strip, each frame 96x128px, total canvas 192x128px.
Top-down slight isometric, ancient stone shrine altar with glowing crystal orb on top.
Carved stone base with rune inscriptions, offerings of flowers at base.
Frame1: orb glows soft green, calm state.
Frame2: orb pulses bright white-green, healing energy rings expand outward.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 2 frames side by side, each exactly 96x128px, total 192x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

### Piège à Pointes — `128×64` — 2 frames @4fps

```
2D animated game building sprite sheet — spike trap.
2 frames horizontal strip, each frame 64x64px, total canvas 128x64px.
Top-down strict overhead view, metal plate spike mechanism.
Frame1: flat plate flush with ground, nearly hidden, warning stripe barely visible.
Frame2: spikes fully extended upward, gleaming metal points, subtle blood hint on tips.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 2 frames side by side, each exactly 64x64px, total 128x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

### Collecteurs de ressources — `192×96` — 2 frames @4fps

**miner_wood.png**
```
2D animated game building sprite sheet — lumber collector.
2 frames horizontal strip, each frame 96x96px, total canvas 192x96px.
Top-down isometric view, small sawmill machine with rotating blade.
Frame1: blade at rest, log waiting on platform.
Frame2: blade spinning fast (motion blur lines), wood chips flying off.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 2 frames side by side, each exactly 96x96px, total 192x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**miner_stone.png**
```
2D animated game building sprite sheet — stone drill collector.
2 frames horizontal strip, each frame 96x96px, total canvas 192x96px.
Top-down isometric view, compact drill machine with rotating auger bit.
Frame1: drill bit still, stone block waiting.
Frame2: drill bit spinning (motion blur), stone dust particles flying.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 2 frames side by side, each exactly 96x96px, total 192x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**miner_metal.png**
```
2D animated game building sprite sheet — metal extractor.
2 frames horizontal strip, each frame 96x96px, total canvas 192x96px.
Top-down isometric view, steampunk extractor with piston and collection funnel.
Frame1: piston at top, idle state, steam vent closed.
Frame2: piston slammed down, steam jets out, metal pellets ejecting from funnel.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 2 frames side by side, each exactly 96x96px, total 192x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 11. CRYSTAL — L'OBJET CENTRAL

**crystal_idle.png** — `576×128` — 6 frames @6fps

```
2D animated game sprite sheet — central crystal artifact idle pulse.
6 frames horizontal strip, each frame 96x128px, total canvas 576x128px.
Magnificent magical crystal artifact, top-down slight isometric game view.
Tall pointed crystal shard, deep purple amethyst color with inner light.
Floating slightly above ornate stone pedestal with carved runes.
Orbiting small crystal shards rotate around it slowly.
Frame1-6: inner glow cycles from dim to full bright — dim, low, medium, bright, peak, return.
Rotating crystal shards complete half orbit across 6 frames.
Subtle purple-white light rays extend and retract. Dramatic and beautiful.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 96x128px, total 576x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 12. RESSOURCES À RÉCOLTER

**tree_pine.png** — `256×80` — 4 frames @5fps (sway)

```
2D animated game sprite sheet — pine tree resource node sway.
4 frames horizontal strip, each frame 64x80px, total canvas 256x80px.
Top-down slight isometric view, cartoon pine tree with visible trunk base.
Rich green conical shape with snow cap peaks, brown trunk.
Frame1-4: gentle wind sway — tree leans 3° left, center, right, center loop.
Leaves ripple slightly with each sway.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 4 frames side by side, each exactly 64x80px, total 256x80px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**tree_oak.png** — `256×80` — 4 frames @5fps

```
2D animated game sprite sheet — oak tree resource node sway.
4 frames horizontal strip, each frame 64x80px, total canvas 256x80px.
Top-down slight isometric, round leafy oak tree canopy, thick trunk base.
Deep green rounded crown with individual leaf clusters visible, pale bark.
Frame1-4: wind sway, leaves flutter, acorns visible in branches.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 4 frames side by side, each exactly 64x80px, total 256x80px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**rock_grey.png** — `128×64` — 2 frames @3fps

```
2D animated game sprite sheet — grey rock resource node.
2 frames horizontal strip, each frame 64x64px, total canvas 128x64px.
Top-down slight isometric view, cluster of grey boulders and stone deposits.
Irregular rounded rocky shapes with mineral veins.
Frame1: normal state. Frame2: slight shimmer/highlight bounce (alive visual feel).
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 2 frames side by side, each exactly 64x64px, total 128x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**ore_metal.png** — `128×64` — 2 frames @3fps (metallic sparkle)

```
2D animated game sprite sheet — metal ore resource node.
2 frames horizontal strip, each frame 64x64px, total canvas 128x64px.
Top-down slight isometric, rough rock cluster with exposed metallic ore veins.
Shiny silver-grey metal deposits embedded in dark rocky matrix.
Frame1: standard lit state. Frame2: metallic sheen sparkle shifts position across surface.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 2 frames side by side, each exactly 64x64px, total 128x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**crystal_amethyst.png** — `256×64` — 4 frames @5fps (glow cycle)

```
2D animated game sprite sheet — amethyst crystal resource node glow.
4 frames horizontal strip, each frame 64x64px, total canvas 256x64px.
Top-down slight isometric, cluster of faceted amethyst crystal spires.
Deep purple violet semi-transparent crystals with inner glow.
Frame1-4: inner glow cycles dim → medium → bright → medium loop.
Tiny sparkle motes float upward around crystal tips in bright frames.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 4 frames side by side, each exactly 64x64px, total 256x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 13. PROJECTILES — `32×32` sauf mentions

**arrow_normal.png**
```
2D game projectile sprite, single image 32x32px.
Pointing right (east-facing), cartoon wood shaft arrow.
Grey metal arrowhead, grey fletching at tail, 3px motion blur trail behind.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. Bold black outline. No labels.
```

**arrow_fire.png**
```
2D game projectile sprite, single image 32x32px.
Pointing right, flaming arrow. Shaft wrapped in orange flame, glowing red tip, fire trail behind.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. Bold black outline. No labels.
```

**arrow_ice.png**
```
2D game projectile sprite, single image 32x32px.
Pointing right, ice crystal arrow. Frost crystal tip, icy sparkle trail.
Pale blue-white with ice crystal decoration.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. Bold black outline. No labels.
```

**arrow_lightning.png**
```
2D game projectile sprite, single image 32x32px.
Pointing right, electric arrow crackling with static arcs.
Lightning bolt energy trail behind, spark particles, bright yellow-white electric.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. Bold black outline. No labels.
```

**cannonball.png**
```
2D game projectile sprite, single image 32x32px.
Dark iron grey sphere, highlight glint on top-left, faint motion blur trail.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. Bold black outline. No labels.
```

**laser_bolt.png** — `48×16`
```
2D game projectile sprite, single image 48x16px. Horizontal laser beam shape.
Bright red-orange core, soft glow halo, tapered at both ends, energy pulse effect.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. No labels.
```

**fireball.png** — `48×48`
```
2D game projectile sprite, single image 48x48px.
Swirling orange-red fireball, flame tendrils trailing behind.
Bright yellow core, dark orange outer shell, ember sparks scattered around.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. Bold black outline. No labels.
```

**frost_bolt.png**
```
2D game projectile sprite, single image 32x32px.
Pointing right, spinning ice crystal snowflake projectile. Pale blue-white.
Cold mist trail, sharp crystal edges.
2D flat cartoon illustration, NOT 3D render. Transparent PNG background. Bold black outline. No labels.
```

---

## 14. EFFETS VISUELS (FX)

**explosion_big.png** — `1024×128` — 8 frames @15fps

```
2D game FX sprite sheet — large explosion animation.
8 frames horizontal strip, each frame 128x128px, total canvas 1024x128px.
Cartoon arcade explosion sequence — Kingdom Rush style.
Frame1: small orange flash. Frame2: expanding fireball.
Frame3-4: full orange-yellow detonation peak, thick black smoke outline ring.
Frame5: smoke ring expands outward. Frame6-7: dissipating grey smoke cloud.
Frame8: final embers and dust settles.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 8 frames side by side, each exactly 128x128px, total 1024x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**explosion_small.png** — `384×64` — 6 frames @15fps

```
2D game FX sprite sheet — small explosion animation.
6 frames horizontal strip, each frame 64x64px, total canvas 384x64px.
Compact cartoon puff explosion. Orange-yellow burst → smoke → dissipate.
Frame1: flash. Frame2-3: burst peak. Frame4-5: smoke. Frame6: last embers.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 64x64px, total 384x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**fire_burn.png** — `384×64` — 6 frames @10fps (loop)

```
2D game FX sprite sheet — fire burn status effect loop.
6 frames horizontal strip, each frame 64x64px, total canvas 384x64px.
Looping flame animation overlay for burning entities.
Frame1-6: flame cycle — base flicker, lean left, peak height, lean right, base, repeat.
Orange red yellow flame shapes. Must loop seamlessly (frame6 connects to frame1).
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 64x64px, total 384x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**ice_freeze.png** — `384×64` — 6 frames @12fps

```
2D game FX sprite sheet — ice freeze effect.
6 frames horizontal strip, each frame 64x64px, total canvas 384x64px.
Enemy freezing animation overlay.
Frame1: mist cloud appears. Frame2-3: ice crystals form and spread outward.
Frame4-5: full ice encasement solid block. Frame6: cracking ice shards burst.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 64x64px, total 384x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**lightning_strike.png** — `384×96` — 4 frames @18fps

```
2D game FX sprite sheet — lightning strike hit effect.
4 frames horizontal strip, each frame 96x96px, total canvas 384x96px.
Electric lightning bolt hit flash.
Frame1: full frame white flash. Frame2: jagged yellow lightning bolt center.
Frame3: electric arc remnants fading. Frame4: scattered spark dots dissipate.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 4 frames side by side, each exactly 96x96px, total 384x96px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**death_smoke.png** — `384×64` — 6 frames @10fps

```
2D game FX sprite sheet — enemy death dissolve smoke.
6 frames horizontal strip, each frame 64x64px, total canvas 384x64px.
Cartoon death dissipation cloud animation.
Frame1-3: grey smoke cloud materializes and expands. Frame4-6: fades and shrinks.
Soft grey cloud with small skull hint visible in frame3.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 64x64px, total 384x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**level_up_burst.png** — `1024×128` — 8 frames @12fps

```
2D game FX sprite sheet — level up celebration burst.
8 frames horizontal strip, each frame 128x128px, total canvas 1024x128px.
Spectacular level up animation sequence.
Frame1: golden ring flash. Frame2-3: radiating gold star burst expanding outward.
Frame4-5: orbiting golden stars and sparkles at peak intensity.
Frame6: large "+LEVEL!" text pop with glow. Frame7-8: stars dissolve upward and fade.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 8 frames side by side, each exactly 128x128px, total 1024x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**heal_pulse.png** — `384×128` — 4 frames @8fps

```
2D game FX sprite sheet — healing aura pulse.
4 frames horizontal strip, each frame 96x128px, total canvas 384x128px.
Gentle healing ring animation overlay.
Frame1: small green cross spark center. Frame2-3: expanding soft green ring pulse outward.
Frame4: ring fades, green sparkle motes float upward.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 4 frames side by side, each exactly 96x128px, total 384x128px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**hit_sparks.png** — `192×64` — 3 frames @20fps

```
2D game FX sprite sheet — hit impact sparks.
3 frames horizontal strip, each frame 64x64px, total canvas 192x64px.
Quick cartoon impact flash.
Frame1: white flash star burst. Frame2: colored yellow-orange impact star burst.
Frame3: sparks scatter outward in multiple directions.
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 3 frames side by side, each exactly 64x64px, total 192x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

**poison_cloud.png** — `384×64` — 6 frames @8fps (loop)

```
2D game FX sprite sheet — poison cloud status effect loop.
6 frames horizontal strip, each frame 64x64px, total canvas 384x64px.
Looping toxic gas cloud overlay animation.
Frame1-6: swirling purple-green gas cloud rotates slowly, bubbles rise through.
Toxic neon green-purple mist with faint skull shape hint in wisps.
Must loop seamlessly (frame6 connects to frame1).
2D flat cartoon illustration, NOT 3D render, NOT photorealistic, NOT CGI.
Horizontal sprite sheet: 6 frames side by side, each exactly 64x64px, total 384x64px.
Frames touching no gap. Pure transparent PNG background. No labels. Game engine ready, pixel art.
```

---

## 15. ICÔNES UI — `32×32`

Chaque icône : **image unique 32x32px**, 2D cartoon illustration, fond transparent PNG, contours noirs gras.
Ne PAS faire un sprite sheet — une seule icône par fichier.

```
[icon_wood]      2D game UI icon, single image 32x32px. Cartoon log bundle, brown wood.
                 2-3 logs tied together, bark texture visible. Transparent PNG, bold outline. NOT 3D render.

[icon_stone]     2D game UI icon, single image 32x32px. Cartoon grey rock pile.
                 3 rounded grey stones stacked. Transparent PNG, bold outline. NOT 3D render.

[icon_metal]     2D game UI icon, single image 32x32px. Cartoon metal ingot bar.
                 Shiny silver-grey bar with highlight glint, industrial shape. Transparent PNG, bold outline. NOT 3D.

[icon_amethyst]  2D game UI icon, single image 32x32px. Cartoon faceted amethyst gem crystal.
                 Deep purple gem, inner glow, sparkle on one corner. Transparent PNG, bold outline. NOT 3D.

[icon_gold]      2D game UI icon, single image 32x32px. Cartoon gold coin stack.
                 3 gold coins stacked, shine glint on top coin. Transparent PNG, bold outline. NOT 3D render.

[icon_diamond]   2D game UI icon, single image 32x32px. Cartoon blue diamond gem.
                 Brilliant cut facets, ice blue, inner glow. Transparent PNG, bold outline. NOT 3D render.

[icon_xp]        2D game UI icon, single image 32x32px. Cartoon XP experience orb.
                 Glowing yellow-green sphere, XP letters embossed, sparkle accents.
                 Transparent PNG, bold outline. NOT 3D render.

[icon_heart]     2D game UI icon, single image 32x32px. Cartoon red heart health icon.
                 Classic heart shape, bright red with white highlight glint.
                 Transparent PNG, bold outline. NOT 3D render.

[icon_shield]    2D game UI icon, single image 32x32px. Cartoon shield defense icon.
                 Rounded kite shield shape, blue field with silver cross emblem.
                 Transparent PNG, bold outline. NOT 3D render.
```

---

## RÉCAPITULATIF — Priorités de génération

| Priorité | Asset | Impact visuel | Difficulté |
|----------|-------|--------------|------------|
| 🔴 URGENT | warrior_idle + warrior_run + archer_idle | Joueur visible H24 | Facile |
| 🔴 URGENT | grunt + speeder + tank | Ennemis les plus fréquents | Facile |
| 🟠 HIGH | tile_grass + tile_dirt + tile_stone + tile_water | Fond du monde entier | Moyen |
| 🟠 HIGH | explosion_big + hit_sparks + fire_burn | Feedback combat | Facile |
| 🟡 MEDIUM | tree_pine + tree_oak + rock_grey | Ressources partout | Facile |
| 🟡 MEDIUM | wall_wood/stone + door | Défense principale | Facile |
| 🟡 MEDIUM | crystal_idle | Objet central du jeu | Moyen |
| 🟢 LATER | mummy + scorpion + frostElemental + lavaGolem | Ennemis biome | Moyen |
| 🟢 LATER | Tous les BOSS | Fin de vague spectaculaire | Difficile |
| 🔵 NICE | forge + miners + shrine | Bâtiments utilitaires | Facile |
| 🔵 NICE | Icônes UI | Interface propre | Très facile |

---

## NOTES D'INTÉGRATION CODE

Quand les sprites sont prêts, les clés à ajouter dans `SpriteManager._loadSprites()` suivent le pattern :
```js
['enemy_grunt',      'assets/sprites/enemies/plains/grunt.png'],
['enemy_tank',       'assets/sprites/enemies/plains/tank.png'],
['tile_grass',       'assets/sprites/terrain/tile_grass.png'],
['fx_explosion_big', 'assets/sprites/fx/explosion_big.png'],
// etc.
```

Les animations d'ennemis utiliseront un système similaire au joueur :
- `_animFrame`, `_animTimer`, `_animState` déjà en place sur Player
- À dupliquer sur Enemy avec les mêmes helpers `drawUnitFrame()`
