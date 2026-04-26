# Hosting local et Internet

## Local uniquement

Lance le serveur local :

```powershell
npm run host:local
```

Puis ouvre :

```text
http://localhost:3000
```

Sur le meme reseau local, tes amis peuvent utiliser :

```text
http://<ton-ip-locale>:3000
```

## Partage temporaire sur Internet

Lance simplement :

```powershell
npm start
```

ou double-clique `start.bat`.

Le script :

- demarre `server.js` en local sur `http://localhost:3000`
- installe une copie locale de `cloudflared` dans `.codex-hosting` sur Windows
- ouvre un tunnel Cloudflare temporaire en HTTP/2 IPv4 vers cette adresse
- verifie que l'URL publique repond vraiment avant d'afficher `HOST_URL=https://...trycloudflare.com`
- ouvre automatiquement le jeu dans le navigateur

Si tu veux garder le navigateur ferme au lancement :

```powershell
$env:OPEN_BROWSER="0"; npm start
```

Pour forcer la reinstallation de `cloudflared` :

```powershell
$env:CLOUDFLARED_FORCE_DOWNLOAD="1"; npm start
```

L'ancien alias reste disponible :

```powershell
npm run host:public
```

Partage uniquement cette URL publique. Les joueurs n'ont rien d'autre a configurer : le jeu utilise automatiquement le WebSocket de la meme origine sur `/ws`.

## Notes

- Cette methode est pratique pour tester et jouer entre amis sans VPS.
- L'URL publique change a chaque relance.
- Pour un hebergement stable plus tard, garde la meme app et place-la derriere un vrai domaine ou un VPS.
