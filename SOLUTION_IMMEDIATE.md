# 🚀 Solution Immédiate - Débloquer le Scraping Immoweb

## ⚡ Quick Start (5 minutes)

Votre IP est bloquée. Voici comment débloquer **EN 5 MINUTES**:

### Option A: Script Interactif (Le plus facile)

```bash
./scripts/setup-proxy.sh
```

Suivez les instructions à l'écran.

---

### Option B: Configuration Manuelle WebShare (Gratuit)

#### 1. S'inscrire (2 minutes)
- Allez sur: https://www.webshare.io/
- Créez un compte gratuit
- **Pas de carte bancaire requise**
- Obtenez 10 proxies datacenter gratuits

#### 2. Télécharger les proxies (1 minute)
- Dashboard → Proxy → List
- Cliquez sur **Download**
- Format: **Username:Password:Endpoint:Port**

Vous obtiendrez un fichier avec des lignes comme:
```
qmkioewo-rotate:x93h5bhskncu@p.webshare.io:80
qmkioewo-rotate:x93h5bhskncu@p.webshare.io:80
```

#### 3. Configurer (1 minute)
Ouvrez le fichier `.env` et ajoutez:

```env
# WebShare Proxies
WEBSHARE_PROXY_LIST=user1:pass1@proxy1.webshare.io:80,user2:pass2@proxy2.webshare.io:80,user3:pass3@proxy3.webshare.io:80
```

**Important:** Séparez chaque proxy par une **virgule** (pas de retour à la ligne)

#### 4. Tester (30 secondes)
```bash
node scripts/test-proxy-config.js
```

Vous devriez voir:
```
✅ 10 WebShare proxies configured
🎉 You are ready to scrape Immoweb!
```

#### 5. Lancer (30 secondes)
```bash
npm run dev
```

Allez sur http://localhost:3000 et ajoutez une URL Immoweb!

---

## 🎯 Vérification Rapide

### ✅ Le proxy fonctionne si vous voyez:
```
🔒 Using premium proxy: WebShare (datacenter)
```

### ❌ Problème si vous voyez:
```
⚠️  No premium proxies configured
```
→ Vérifiez votre `.env`, relancez `npm run dev`

---

## 💰 Coûts

| Service | Prix | Pour 100 propriétés/mois |
|---------|------|--------------------------|
| **WebShare Gratuit** | **$0** | ✅ Suffisant |
| WebShare Premium | $2.99/mois | ✅ Plus stable |
| IPRoyal | $7-15/mois | ✅ Meilleure qualité |

**Recommandation:** Commencez avec WebShare gratuit → Upgradez si besoin

---

## 🆘 Ça ne marche pas?

### Erreur: "No premium proxies configured"
→ Vérifiez que la ligne `WEBSHARE_PROXY_LIST=...` est bien dans `.env`
→ Relancez: `npm run dev`

### Erreur: "ERR_TIMED_OUT"
→ Le proxy est mort, essayez un autre proxy de la liste
→ Ou upgradez à WebShare Premium ($2.99/mois)

### Toujours bloqué par Immoweb
→ Utilisez IPRoyal (proxies résidentiels) au lieu de WebShare (datacenter)
→ Les proxies résidentiels sont plus difficiles à détecter

---

## 📖 Documentation Complète

- **Guide détaillé:** [PROXY_SETUP_GUIDE.md](./PROXY_SETUP_GUIDE.md)
- **État du système:** [SCRAPING_STATUS.md](./SCRAPING_STATUS.md)
- **Tests disponibles:**
  ```bash
  node scripts/test-proxy-config.js      # Vérifier config
  node scripts/test-persistent-profile.js # Test complet
  node scripts/warmup-chrome-profile.js   # Warm-up manuel
  ```

---

## 🎉 C'est tout!

Une fois le proxy configuré:
1. ✅ Profil Chrome persistant → Simule utilisateur réel
2. ✅ Proxy premium → Change votre IP
3. ✅ Stealth mode → Masque l'automation
4. ✅ Rate limiting → Évite le flood

**Le système est production-ready!**

Besoin d'aide? Consultez [PROXY_SETUP_GUIDE.md](./PROXY_SETUP_GUIDE.md) pour plus de détails.

---

**Dernière mise à jour:** 17 Décembre 2024
