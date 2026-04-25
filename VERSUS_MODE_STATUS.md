# Mode Versus FFA - Etat d'avancement

## Objectif

Ajouter un second mode multijoueur `1v1v1v1` en gardant le mode coop intact et retro-compatible.

Le principe cible est :
- une arene en grille `3x3`
- une ile de base par joueur
- des iles neutres contestees
- un cristal a defendre par joueur present
- des vagues de nuit sur chaque base vivante
- deplacement entre iles par ponts
- PvP et destruction de batiments ennemis

## Ce qui est deja implemente

### Architecture de mode de jeu

- ajout d'une config de mode de jeu centralisee
- support de `coop` et `versus_ffa`
- transmission du mode dans le demarrage reseau
- conservation du comportement historique du coop

### Initialisation et carte versus

- generation d'une arene dediee au versus
- monde versus plus grand que la map coop
- grille `3x3` avec :
  - iles joueurs `north/east/south/west`
  - iles neutres dans les coins
  - ile centrale verrouillee
- iles plus grandes, avec forme elliptique et bords arrondis
- ponts de liaison entre iles adjacentes
- desactivation des caves sur cette map

### Spawn, cristaux et presentation

- assignation d'un slot joueur via `player_1..player_4`
- spawn du joueur sur son ile
- cristal place au centre de l'ile
- creation des cristaux seulement pour les slots reellement occupes au lancement
- affichage de plusieurs cristaux sur la minimap
- shake camera uniquement pour le cristal local

### Gameplay de base versus

- restriction de construction a l'ile du joueur uniquement
- la validation est faite cote local et cote reseau
- support de plusieurs cristaux dans `Game`
- etat de destruction d'un cristal deja gere
- lanes de vagues par slot deja en place
- spawn des ennemis sur le contour de l'ile cible en versus
- elimination d'un joueur quand son cristal est detruit
- victoire quand un seul cristal reste vivant
- mode test solo versus : une partie avec un seul joueur actif ne declenche plus de victoire automatique
- respawn sur le cristal avec perte de ressources
- PvP fonctionnel et degats sur les batiments ennemis
- defense autoritative cote proprietaire pour garder la synchro reseau
- metadata de projectile propagee pour resoudre les hits cote reseau
- retargeting des ennemis vers un cristal vivant quand une base tombe
- spawn des ennemis evite les bords relies aux ponts

### Economie / ressources

- ressources de depart sur les iles joueurs
- ressources neutres massivement augmentees sur les iles intermediaires
- generation aleatoire massive des ressources en versus (objectif ~10x vs version precedente)
- generation uniforme des ressources sur la surface des iles (suppression du placement en anneaux)
- repartition orientee edge islands : densite forte sur iles neutres de bord, plus faible sur iles principales joueurs
- profil d'economie specifique au versus pour garder une progression de type solo / FFA :
  - cristal moins cher
  - constructions moins cheres
  - upgrades de batiments moins chers
  - upgrades joueur moins chers
- correction de progression : le palier cristal 2 (niveau joueur) debloque bien l'etabli

### Reseau / etat de partie

- synchronisation des slots actifs et elimines
- resync des cristaux actifs dans les paquets de match
- skip de journee / nuit gere par vote reseau : l'hote ne lance la nuit que lorsque tous les joueurs eligibles ont vote

### Interface

- panneau HUD pour l'etat des cristaux (slots restants)
- recapitulatif de fin de match cote versus
- bouton de skip affiche l'avancement du vote en multijoueur

## Ce qui reste a faire

### Vagues et IA

- verifier qu'une vague complete existe bien par ile encore vivante sur host et clients
- verifier le tempo des vagues lors des matchs a plusieurs fronts

### Reseau / etat de partie

- gerer proprement les cas de reconnexion ou resync tardif
- verifier en vraie session que le vote de nuit reste correct apres depart/reconnexion d'un joueur

### Interface

- ajuster la presentation finale (titres, textes, couleurs) apres playtests

### Equilibrage

- ajuster la quantite exacte de ressources sur iles joueurs et neutres
- verifier en partie reelle qu'il n'existe aucun blocage mathematique sur le metal / amethyste
- regler la distance cristal-pont et la pression des vagues
- tester les formats `1v1`, `1v1v1` et `1v1v1v1`

## Limites connues

- la boucle de partie principale est en place, mais la synchronisation en vraie session multi doit encore etre testee en conditions reelles
- les cristaux actifs sont calcules a partir des joueurs presents au lancement ; la gestion complete d'un depart en cours de partie reste a finaliser
- le mode versus solo sert de sandbox de test et ne donne pas de victoire automatique tant qu'un seul joueur est actif
- l'equilibrage fin de la perte de ressources, des turrets et du tempo de victoire reste a ajuster apres playtests

## Prochaine etape recommandee

1. faire un vrai pass de tests reseau a `2/3/4` joueurs
2. ajuster le penalty de mort et le tempo des vagues
3. documenter les derniers points de limite pour le versus
