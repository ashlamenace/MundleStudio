# Crystal Guardian — Sprite Sheets : Guide de génération IA

## Style global (à inclure dans TOUS les prompts)

**Identité visuelle :**
- Vue légèrement isométrique du dessus (angle ~70°), on voit la face avant + le dessus du bâtiment
- Style cartoon arcade — contours noirs épais (2-3px), couleurs saturées et vives
- Inspiré de Kingdom Rush / Clash Royale — buildings avec personnalité, silhouettes lisibles
- Ombres plates sous les constructions (pas de raycast)
- Fond transparent (PNG)

**Suffixe standard à ajouter à tous les prompts :**
```
game tower defense building sprite, cartoon 2D illustration, bold black outlines, vibrant colors,
slight isometric top-down perspective, transparent background, clean edges, no shadow on background,
Kingdom Rush art style, arcade game asset, single object centered on canvas
```

**Palette par ère (utiliser comme référence couleur dans chaque prompt) :**
| Ère | Dominante | Accents | Ambiance |
|-----|-----------|---------|----------|
| Médiéval | Pierre beige/gris, bois brun | Or, vert herbe | Chaleureux, robuste |
| Renaissance | Brun foncé, gris acier | Cuivre/bronze, crème | Sérieux, industrieux |
| Industriel | Acier gris, rouille orange | Vapeur blanc, charbon | Lourd, mécanique |
| Moderne | Kaki militaire, béton | Jaune warning, rouge | Fonctionnel, brut |
| Cyberpunk | Chrome sombre, violet nuit | Néon cyan/rose, hologramme | Futuriste, electrisant |

---

## Spécifications techniques

| Type de sprite | Dimensions canvas | Frames | Layout | Notes |
|---------------|-------------------|--------|--------|-------|
| Bâtiment statique (base) | 128 × 192 px | 1 | Unique | Portrait — on voit façade + toit |
| Tête de tourelle (rotation) | 64 × 64 px × 8 | 8 | Strip horizontal (512 × 64) | Rotation de 0° à 315°, pas de 45° |
| FX explosion / impact | 192 × 192 px × 8 | 8 | Strip horizontal (1536 × 192) | Séquence complète d'explosion |
| FX projectile | 32 × 32 px | 1 | Unique | Boulet, flèche, rayon, etc. |
| Mine / trap (idle + trigger) | 64 × 64 px × 4 | 4 | Strip horizontal (256 × 64) | idle(2 frames) + trigger + explosion |

---

## Dossier cible

```
assets/turrets/
├── medieval/
│   ├── arrow_tower.png          (128×192)
│   ├── catapult.png             (128×192)
│   ├── magic_tower.png          (128×192)
│   └── fx_boulder.png           (32×32)
├── renaissance/
│   ├── powder_cannon.png        (128×192)
│   ├── cannon_barrel.png        (512×64 — 8 frames rotation)
│   └── musket_barricade.png     (128×192)
├── industrial/
│   ├── steam_gatling.png        (128×192)
│   ├── gatling_barrel.png       (512×64 — 8 frames rotation)
│   ├── flamethrower.png         (128×192)
│   ├── land_mine.png            (256×64 — 4 frames)
│   └── fx_fire_stream.png       (1536×192 — 8 frames)
├── modern/
│   ├── laser_turret.png         (128×192)
│   ├── laser_head.png           (512×64 — 8 frames rotation)
│   ├── sam_turret.png           (128×192)
│   └── emp_turret.png           (128×192)
└── cyberpunk/
    ├── defense_drone.png        (128×128 — vue de dessus)
    ├── singularity_cannon.png   (128×192)
    ├── nano_repairer.png        (128×192)
    └── ai_turret.png            (128×192)
```

---

## ÈRE MÉDIÉVALE

### 🏹 Tour à flèches — `arrow_tower.png`
**Gameplay :** Cadence élevée, dégâts modérés, portée moyenne

**Prompt :**
```
Medieval stone arrow tower, top-down slight isometric game sprite, 128x192 pixels canvas,
circular crenellated stone parapet at top, narrow archer slit windows on the side,
beige-grey stone blocks texture, warm brown wooden door at base,
small blue pennant flag waving from top, ivy vines climbing lower half,
cartoon arcade style, bold black outlines, Kingdom Rush art style,
transparent background, single tower centered
```

---

### 💥 Catapulte — `catapult.png`
**Gameplay :** AOE lourd, longue portée, rechargement lent (3s)

**Prompt :**
```
Medieval siege catapult tower, top-down slight isometric game sprite, 128x192 pixels canvas,
large wooden trebuchet arm with rope and counterweight visible,
heavy oak-brown wooden frame with iron bolts and reinforcements,
pile of grey stone boulders stacked at base ready to load,
two armored medieval soldiers visible operating the machine,
cartoon arcade style, bold black outlines, warm brown and iron grey palette,
transparent background, single catapult centered on canvas
```

**FX projectile :** `fx_boulder.png` (32×32)
```
A single round grey stone cannonball, cartoon style, bold black outline, slight motion blur,
top-down view, 32x32 pixels, transparent background
```

---

### 🔮 Tour à sorts — `magic_tower.png`
**Gameplay :** Dégâts magiques, ignore l'armure physique, coût élevé

**Prompt :**
```
Medieval wizard magic tower, top-down slight isometric game sprite, 128x192 pixels canvas,
tall dark purple stone spire with glowing arcane runes etched on the walls,
rotating magical crystal orb hovering at the top emitting cyan and violet sparks,
pointed gothic roof with golden star ornaments, mysterious arcane smoke rising,
cartoon arcade style, bold black outlines, deep purple and cyan glow palette,
transparent background, single tower centered
```

---

## ÈRE RENAISSANCE

### 💣 Canon à poudre — `powder_cannon.png` + `cannon_barrel.png`
**Gameplay :** Gros dégâts + knockback, rechargement modéré

**Prompt (base) :**
```
Renaissance bronze powder cannon tower, top-down slight isometric game sprite, 128x192 pixels canvas,
circular stone fortification base with embrasure opening at front,
bronze cannon barrel protruding forward from stone opening,
gunpowder kegs and cannonballs stacked at sides,
dark navy stone with copper and bronze metallic accents,
cannon smoke wisps rising from the barrel tip,
cartoon arcade style, bold black outlines, transparent background, single object centered
```

**Prompt (tête rotative) — `cannon_barrel.png` — 512×64, 8 frames :**
```
Sprite sheet of a bronze cannon barrel rotating 360 degrees in 8 frames,
horizontal strip layout 512x64 pixels total (each frame 64x64),
frame 1: pointing right, each frame rotates 45 degrees clockwise,
viewed from above top-down, cartoon style, bold black outlines,
shiny bronze metal texture with dark shadow on underside,
transparent background, clean pixel art style
```

---

### 🔫 Barricade mousquets — `musket_barricade.png`
**Gameplay :** Salve en éventail, efficace contre les swarms, portée courte-moyenne

**Prompt :**
```
Renaissance musketeer barricade fortification, top-down slight isometric game sprite, 128x192 pixels canvas,
wooden barricade wall with sandbags at base, 3 musketeers crouching behind it aiming forward,
wide-brimmed feathered hats visible above the barrier, long musket rifles protruding,
dark brown oak wood planks, beige sandbags, grey gunpowder smoke puffs at rifle tips,
cartoon arcade style, bold black outlines, cream and dark brown palette,
transparent background, single barricade centered
```

---

## ÈRE INDUSTRIELLE

### ⚙️ Gatling à vapeur — `steam_gatling.png` + `gatling_barrel.png`
**Gameplay :** Cadence très élevée, surchauffe après 8s → pause forcée de 3s

**Prompt (base) :**
```
Steampunk steam-powered gatling gun tower, top-down slight isometric game sprite, 128x192 pixels canvas,
industrial iron and brass tower with multiple rotating barrels pointing outward,
large steam boiler on side with pressure gauge and pipes,
steam jets venting from release valves, coal-black iron housing with rust spots,
rivets and bolts visible on all panels, warning yellow hazard stripes on base,
cartoon arcade style, bold black outlines, steel grey and rust orange palette,
transparent background, single tower centered
```

**Prompt (barrels rotatifs) — `gatling_barrel.png` — 512×64, 8 frames :**
```
Sprite sheet of a steampunk 6-barrel gatling gun rotating 360 degrees in 8 frames,
horizontal strip layout 512x64 pixels total (each frame 64x64),
viewed from above top-down, dark steel grey metal with brass highlights,
frame 1: one barrel pointing right, rotating clockwise every 45 degrees,
cartoon style, bold black outlines, steam puffs visible on spinning barrels,
transparent background
```

---

### 🔥 Lance-flammes — `flamethrower.png` + `fx_fire_stream.png`
**Gameplay :** Cône de feu continu, très efficace contre groupes denses, courte portée

**Prompt (base) :**
```
Industrial steampunk flamethrower tower, top-down slight isometric game sprite, 128x192 pixels canvas,
heavy industrial iron bunker shape, fuel tank cylinder on top colored red with flammable warning symbols,
wide-nozzle flamethrower barrel at front with ember glow at tip,
heat shimmer distortion around nozzle, iron chain securing the fuel tank,
charred scorch marks on the front face, coal black with orange-red heat glow,
cartoon arcade style, bold black outlines, transparent background, single tower centered
```

**Prompt FX feu — `fx_fire_stream.png` — 1536×192, 8 frames :**
```
Fire stream animation sprite sheet, 8 frames horizontal strip, total size 1536x192 pixels (each frame 192x192),
animated flamethrower fire cone blast sequence from ignition to full flame,
frame 1: small orange spark, frame 4: full wide fire cone, frame 8: dissipating embers,
cartoon arcade style, vivid orange yellow red flames, bold outlines, transparent background
```

---

### 💣 Mine terrestre — `land_mine.png`
**Gameplay :** Usage unique, déclenche au passage ennemi, dégâts massifs en zone

**Prompt (4 frames — 256×64) :**
```
Land mine sprite sheet animation, 4 frames horizontal strip, total 256x64 pixels (each frame 64x64),
top-down view, frame 1: metal mine buried flush in ground with green warning light,
frame 2: mine detecting (orange blinking light), frame 3: mine triggering (cover flipping open),
frame 4: explosion flash white-orange burst,
industrial military style, dark steel grey with warning colors, cartoon bold outlines,
transparent background
```

---

## ÈRE MODERNE

### ⚡ Tourelle laser — `laser_turret.png` + `laser_head.png`
**Gameplay :** Dégâts constants en rayon, rotation très rapide, ignore les obstacles

**Prompt (base) :**
```
Modern military laser defense turret tower, top-down slight isometric game sprite, 128x192 pixels canvas,
concrete grey bunker base with electronic panel on side showing green LED indicators,
sleek metallic laser emitter assembly mounted on rotating pivot on top,
thin focused red laser beam emanating from emitter tip,
military grey and matte black with bright red energy glow,
antenna and radar dish on side, warning yellow stripe on base,
cartoon arcade style, bold black outlines, transparent background, single tower centered
```

**Prompt (tête rotative) — `laser_head.png` — 512×64, 8 frames :**
```
Sprite sheet of a military laser turret head rotating 360 degrees in 8 frames,
horizontal strip 512x64 pixels total (each frame 64x64), viewed from above top-down,
sleek dark metallic barrel with red glowing tip and energy capacitor rings,
frame 1: barrel pointing right, rotating clockwise 45 degrees each frame,
cartoon style, bold outlines, bright red energy glow on barrel tip, transparent background
```

---

### 🚀 SAM (sol-air) — `sam_turret.png`
**Gameplay :** Cible uniquement les unités aériennes, missiles téléguidés

**Prompt :**
```
Modern surface-to-air missile SAM launcher turret, top-down slight isometric game sprite, 128x192 pixels canvas,
military green armored vehicle base with twin missile launch tubes pointing upward-angled,
two white rockets with red fins visible in launch tubes ready to fire,
radar dish spinning on side, military stencil text "SAM" on base,
olive drab green and dark grey military palette with white missile bodies and red fins,
cartoon arcade style, bold black outlines, transparent background, single launcher centered
```

---

### ⚡ EMP — `emp_turret.png`
**Gameplay :** Paralyse les ennemis mécaniques dans un rayon pendant 5s, recharge lente

**Prompt :**
```
Military EMP electromagnetic pulse emitter tower, top-down slight isometric game sprite, 128x192 pixels canvas,
boxy concrete grey military bunker base, large circular electromagnetic pulse dish antenna on top,
crackling blue-white electric arc rings radiating from the dish center,
thick copper wire coils around the base, warning lightning bolt symbols on all sides,
electric blue and military grey palette with bright white electrical discharge,
cartoon arcade style, bold black outlines, transparent background, single tower centered
```

---

## ÈRE CYBERPUNK

### 🤖 Drone de défense autonome — `defense_drone.png`
**Note :** Vue de dessus (pas isométrique) car le drone vole — 128×128

**Prompt :**
```
Autonomous cyberpunk defense drone, strict top-down aerial view game sprite, 128x128 pixels canvas,
quadcopter drone body with chrome-dark hexagonal chassis, 4 spinning rotor blades at corners,
dual weapon pods under the body with glowing cyan barrels,
pulsing neon blue LED strip around fuselage edge, targeting laser dot visible below,
chrome dark metal with neon cyan and pink accent lights,
cartoon arcade style, bold black outlines, transparent background, single drone centered, viewed from directly above
```

---

### 🌀 Canon à singularité — `singularity_cannon.png`
**Gameplay :** Crée un mini trou noir qui aspire et retient les ennemis (zone)

**Prompt :**
```
Cyberpunk singularity cannon tower, top-down slight isometric game sprite, 128x192 pixels canvas,
futuristic dark chrome monolithic tower with gravitational singularity emitter barrel,
swirling black hole vortex visual at barrel tip with matter being pulled in spiraling strands,
deep space purple and void black chassis with neon violet energy conduits along sides,
warning holographic display panel on side showing gravitational readings,
dark matter crystals powering the base, small objects visually bending towards the emitter,
cartoon arcade style, bold black outlines, transparent background, single cannon centered
```

---

### 🔧 Nano-réparateur — `nano_repairer.png`
**Gameplay :** Répare passivement les structures alentour, zone de soin continue

**Prompt :**
```
Cyberpunk nano-repair station tower, top-down slight isometric game sprite, 128x192 pixels canvas,
sleek white and chrome cylindrical nanofabrication pod, rotating arm extending from top with nanite emitter nozzle,
swarm of tiny glowing golden nanobots particles floating upward from the nozzle tip,
holographic repair wave rings expanding from the base in soft green-gold,
white and chrome body with golden nanite particle accents and green LED repair indicators,
cartoon arcade style, bold black outlines, transparent background, single station centered
```

---

### 🧠 Tourelle IA adaptative — `ai_turret.png`
**Gameplay :** Apprend l'ennemi dominant de la vague et adapte son type de dégâts

**Prompt :**
```
Cyberpunk AI adaptive defense turret, top-down slight isometric game sprite, 128x192 pixels canvas,
modular tower body that visually morphs between weapon types — central neural core AI brain visible through glass dome on top,
surrounding weapon array with 4 different weapon tips (arrow, fire, electricity, plasma) rotating like a scanner,
data streams and neural network patterns displayed on body surface in glowing holographic light,
pulsing multicolor LED array cycling through colors representing different damage types,
chrome-dark body with dynamic multicolor holographic displays,
cartoon arcade style, bold black outlines, transparent background, single tower centered
```

---

## EXTRAS — Effets visuels communs

### FX Explosion commune — `fx_explosion_generic.png` — 1536×192, 8 frames
```
Generic explosion animation sprite sheet, 8 frames horizontal strip, total 1536x192 pixels (each frame 192x192),
classic cartoon videogame explosion sequence: frame 1 spark, frame 2-3 expanding fireball,
frame 4-5 full orange-yellow detonation peak, frame 6-7 black smoke rising,
frame 8 grey dissipating smoke cloud, bright orange red yellow palette,
Kingdom Rush cartoon style, bold outlines, transparent background
```

### FX Impact critique — `fx_crit_hit.png` — 192×192, 1 frame
```
Critical hit impact starburst effect, single frame 192x192 pixels,
jagged yellow-white starburst explosion with impact lines radiating outward,
cartoon arcade style, bright yellow center with orange tips, bold outlines,
transparent background, centered on canvas
```

### Projectile flèche — `proj_arrow.png` — 32×32, 1 frame
```
Game arrow projectile, single sprite 32x32 pixels, pointing right (0°),
wooden shaft with grey metal tip and grey fletching at tail,
cartoon style, bold black outlines, transparent background, centered
```

### Projectile boulet de canon — `proj_cannonball.png` — 32×32, 1 frame
```
Iron cannonball game projectile, single sprite 32x32 pixels,
dark grey iron sphere with motion blur trail, cartoon style, bold black outlines,
slight metallic sheen on top, transparent background
```

---

## Recommandations d'outils IA

| Outil | Points forts | URL |
|-------|--------------|-----|
| **Midjourney v6** | Qualité artistique, style cartoon | midjourney.com |
| **DALL-E 3** (ChatGPT) | Suit bien les specs techniques | chat.openai.com |
| **Adobe Firefly** | Sortie transparente directe | firefly.adobe.com |
| **Stable Diffusion** (SDXL) | Gratuit, contrôle total | civitai.com — modèle "Game Assets" |
| **Bing Image Creator** | Gratuit, basé DALL-E | bing.com/images/create |

**Conseil workflow :**
1. Générer 4 variantes avec chaque prompt → garder la meilleure
2. Utiliser **remove.bg** ou **Adobe Express** pour background transparent si besoin
3. Pour les sprite sheets d'animation → générer chaque frame séparément puis les assembler avec **GIMP** ou **Aseprite**
4. Vérifier la cohérence visuelle entre toutes les tourelles d'un même ère avant de valider
