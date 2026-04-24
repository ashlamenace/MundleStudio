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

Installe `cloudflared`, puis lance :

```powershell
npm run host:public
```

Le script :

- demarre `server.js` en local sur `http://localhost:3000`
- ouvre un tunnel Cloudflare temporaire vers cette adresse
- affiche une URL publique `https://...trycloudflare.com`

Partage uniquement cette URL publique. Les joueurs n'ont rien d'autre a configurer : le jeu utilise automatiquement le WebSocket de la meme origine sur `/ws`.

## Notes

- Cette methode est pratique pour tester et jouer entre amis sans VPS.
- L'URL publique change a chaque relance.
- Pour un hebergement stable plus tard, garde la meme app et place-la derriere un vrai domaine ou un VPS.
