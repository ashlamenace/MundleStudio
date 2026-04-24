# 📝 CHANGELOG - Équilibrage & Fonctionnalités

## ⚖️ RÉÉQUILIBRAGE DES BOOSTS DE LEVEL-UP

### ❌ AVANT (Trop Puissants)
- **Mobilité** : +10% vitesse → **+100% au niveau 10** (trop rapide)
- **Dégâts** : +15% dégâts → **+150% au niveau 10** (one-shot tout)
- **Farming** : +20% vitesse → **+200% au niveau 10** (instant)
- **XP Gain** : +25% gain XP → **Effet boule de neige exponentiel**

### ✅ APRÈS (Équilibré)
- **Mobilité** : +5% vitesse → **+50% au niveau 10** (mobile mais pas éclair)
- **Dégâts** : +8% dégâts → **+80% au niveau 10** (puissant mais équilibré)
- **Farming** : +12% vitesse → **+120% au niveau 10** (efficace sans être instant)
- **XP Gain** : +15% gain XP → **Progression stable et contrôlée**

### 🎯 Objectif de l'équilibrage
Les boosts s'accumulent sur ~15-20 niveaux en moyenne, donc :
- Niveau 5 : ~25-40% bonus
- Niveau 10 : ~40-80% bonus
- Niveau 15 : ~60-120% bonus

Cela permet une progression satisfaisante sans devenir OP trop rapidement.

---

## 🏭 AUTO-MINERS (Production Passive)

### 📊 Statistiques de Production

#### 🪵 Wood Collector
- **Coût** : 25 bois + 8 pierre
- **Production** : 1.0 bois/seconde
  - 💰 **60 bois/minute**
  - 💰 **3600 bois/heure**
- **Rentabilité** : Rentable en 25 secondes

#### 🪨 Stone Drill
- **Coût** : 25 pierre + 15 bois
- **Production** : 0.8 pierre/seconde
  - 💰 **48 pierre/minute**
  - 💰 **2880 pierre/heure**
- **Rentabilité** : Rentable en 31 secondes

#### ⚙️ Metal Extractor
- **Coût** : 30 métal + 20 pierre
- **Production** : 0.5 métal/seconde
  - 💰 **30 métal/minute**
  - 💰 **1800 métal/heure**
- **Rentabilité** : Rentable en 60 secondes

### ✨ Améliorations Apportées
1. **Production augmentée** : Taux doublés pour rendre les machines plus attractives
2. **Rayon d'action élargi** : 150 unités au lieu de 80
3. **Toujours actifs** : Fonctionnent même sans nœud de ressource proche (production passive)
4. **Système vérifié** : Le ResourceSystem.js met à jour correctement chaque seconde

### 💡 Conseils d'Utilisation
- Placez plusieurs miners du même type pour multiplier la production
- Les miners sont particulièrement utiles la nuit pendant les vagues
- Priorité : Wood Collector > Stone Drill > Metal Extractor
- 3 Wood Collectors = 180 bois/minute = Plus besoin de farmer !

---

## 🎮 NOUVELLES FONCTIONNALITÉS UX

### 🖱️ Barre d'Outils Cliquable
- **Avant** : Uniquement accessible par touches 1-5
- **Après** : Clic sur les slots pour sélectionner l'outil
- **Effets visuels** :
  - Hover : Glow cyan + élévation
  - Active : Press animation
  - Selected : Border cyan brillant

### 🏗️ Menu Construction Auto-Fermeture
- **Avant** : Menu reste ouvert après sélection
- **Après** : Menu se ferme automatiquement après avoir choisi un bâtiment
- **Workflow amélioré** : Sélection → Fermeture → Placement immédiat

---

## 📈 IMPACT SUR LE GAMEPLAY

### Progression du Joueur (avec tous les boosts au max)
**Niveau 1 (Base)**
- Vitesse : 150
- Dégâts épée : 15
- Dégâts arc T5 : 24

**Niveau 10 (Mobilité x10)**
- Vitesse : 225 (+50%) ✅ Rapide mais gérable
- Dégâts épée : 15
- Dégâts arc T5 : 24

**Niveau 10 (Dégâts x10)**
- Vitesse : 150
- Dégâts épée : 27 (+80%) ✅ Puissant mais pas OP
- Dégâts arc T5 : 43 (+80%)

**Niveau 10 (Farming x10)**
- Vitesse farming : 2.2x (+120%) ✅ Efficace sans être instantané

### Économie des Ressources
**Sans Auto-Miners (farming manuel)**
- Bois : ~10-15/minute
- Pierre : ~8-12/minute
- Métal : ~5-8/minute

**Avec 3 Auto-Miners de chaque**
- Bois : 180/minute (x12-18 fois plus)
- Pierre : 144/minute (x12-18 fois plus)
- Métal : 90/minute (x11-18 fois plus)

**Coût Total des Miners**
- 3 Wood Collectors : 75 bois + 24 pierre
- 3 Stone Drills : 75 pierre + 45 bois
- 3 Metal Extractors : 90 métal + 60 pierre

**Temps de Retour sur Investissement**
- Wood : ~25 secondes par unité
- Stone : ~31 secondes par unité
- Metal : ~60 secondes par unité

---

## 🎯 STRATÉGIE RECOMMANDÉE

### Phase 1 : Début (Vagues 1-5)
- Farmer manuellement
- Level-ups : Prioriser **Dégâts** pour survivre
- Économiser pour premiers Wood Collectors

### Phase 2 : Économie (Vagues 6-10)
- Construire 2-3 Wood Collectors
- Construire 2 Stone Drills
- Level-ups : **Farming** puis **Mobilité**

### Phase 3 : Automation (Vagues 11-15)
- Compléter réseau de miners (3 de chaque)
- Level-ups : **XP Gain** pour accélérer
- Concentrer farming sur Améthyste uniquement

### Phase 4 : Late Game (Vagues 16+)
- Production passive couvre les besoins
- Level-ups : Mix **Dégâts** + **Mobilité**
- Focus sur upgrades tourelles et arc T5

---

## 🔧 NOTES TECHNIQUES

### Modifications Fichiers
1. **Game.js** : Réduction des multiplicateurs de boosts
2. **BuildingSystem.js** : 
   - Augmentation taux production miners
   - Rayon détection élargi (150 unités)
   - Miners toujours actifs
3. **index.html** : Mise à jour descriptions boosts
4. **HUD.js** : Event listeners pour clics sur slots
5. **style.css** : Amélioration effets visuels slots

### Système Auto-Miners
- Vérification ressources proches chaque update
- Production appliquée chaque seconde via ResourceSystem
- Indépendant des nœuds de ressources pour production passive
- Affichage UI mis à jour automatiquement

---

**Version** : 1.2.0  
**Date** : 19 Décembre 2025  
**Statut** : ✅ Testé et Équilibré
