# Guide de Configuration des Proxies Premium

## 🚨 Problème Actuel

Votre IP `xxx.xxx.xxx.xxx` est bloquée par Immoweb.be avec le message:
```
Vous avez été bloqué(e)
```

**Solution:** Utiliser des proxies premium pour changer votre adresse IP et continuer le scraping.

---

## 📋 Solutions Recommandées

### Option 1: IPRoyal (RECOMMANDÉ - Meilleur rapport qualité/prix)

**Pourquoi IPRoyal?**
- ✅ Proxies résidentiels (vraies IPs de particuliers)
- ✅ Prix abordable: ~$2/GB (~1000 requêtes pour $7)
- ✅ Très fiable pour éviter les blocages
- ✅ Support 24/7

**Étapes d'installation:**

1. **S'inscrire sur IPRoyal**
   - Visitez: https://iproyal.com/
   - Cliquez sur "Get Started" ou "Sign Up"
   - Créez un compte gratuit

2. **Acheter des proxies résidentiels**
   - Allez dans "Residential Proxies" dans le dashboard
   - Achetez minimum $7 (suffisant pour commencer)
   - Sélectionnez "Pay-as-you-go" (vous payez ce que vous utilisez)

3. **Obtenir les credentials**
   - Dans le dashboard IPRoyal, allez dans "Residential Proxies"
   - Notez votre **Username** et **Password**
   - Format: `username:password@geo.iproyal.com:12321`

4. **Configurer dans votre .env**
   ```env
   IPROYAL_USERNAME=votre_username_ici
   IPROYAL_PASSWORD=votre_password_ici
   ```

5. **Tester**
   ```bash
   npm run dev
   # Puis testez une URL Immoweb dans l'interface
   ```

**Coût estimé:**
- ~1000 requêtes ≈ $7
- Pour votre usage (quelques dizaines de propriétés/jour), $7-15/mois suffisent

---

### Option 2: WebShare (MEILLEURE VALEUR - Datacenter)

**Pourquoi WebShare?**
- ✅ Prix imbattable: $2.99/mois pour 10 proxies
- ✅ Facile à configurer
- ✅ Suffisant pour usage léger
- ⚠️ Proxies datacenter (moins "humains" que résidentiels, mais fonctionnent souvent)

**Étapes d'installation:**

1. **S'inscrire sur WebShare**
   - Visitez: https://www.webshare.io/
   - Créez un compte gratuit (10 proxies gratuits!)
   - Ou payez $2.99/mois pour plus de stabilité

2. **Télécharger la liste de proxies**
   - Dans le dashboard, allez dans "Proxy" → "List"
   - Cliquez sur "Download" → Format: "Username:Password:Endpoint:Port"
   - Vous obtiendrez un fichier avec des lignes comme:
     ```
     user123:pass456:proxy1.webshare.io:80
     user789:pass012:proxy2.webshare.io:80
     ```

3. **Configurer dans votre .env**
   ```env
   # Copiez toutes vos lignes de proxies séparées par des virgules
   WEBSHARE_PROXY_LIST=user123:pass456@proxy1.webshare.io:80,user789:pass012@proxy2.webshare.io:80
   ```

4. **Tester**
   ```bash
   npm run dev
   ```

**Coût estimé:**
- Version gratuite: 0€ (10 proxies, bande passante limitée)
- Version payante: $2.99/mois

---

### Option 3: Bright Data (MEILLEURE QUALITÉ - Essai gratuit)

**Pourquoi Bright Data?**
- ✅ Leader du marché en qualité
- ✅ Essai gratuit de 7 jours (carte bancaire requise)
- ✅ Très rarement bloqué
- ❌ Plus cher après l'essai (~$500/mois minimum)

**Étapes d'installation:**

1. **S'inscrire sur Bright Data**
   - Visitez: https://brightdata.com/
   - Cliquez sur "Start free trial"
   - Créez un compte (carte bancaire requise mais non facturée pendant l'essai)

2. **Créer une zone proxy**
   - Dans le dashboard, allez dans "Proxies & Scraping Infrastructure"
   - Créez une "Residential Zone"
   - Sélectionnez pays: **Belgium** (pour Immoweb.be)

3. **Obtenir les credentials**
   - Dans votre zone, notez:
     - Username (format: `brd-customer-XXXXX-zone-XXXXX`)
     - Password (généré automatiquement)

4. **Configurer dans votre .env**
   ```env
   BRIGHTDATA_USERNAME=brd-customer-c_XXXXX-zone-residential
   BRIGHTDATA_PASSWORD=votre_password_ici
   ```

5. **Tester pendant l'essai gratuit**
   ```bash
   npm run dev
   ```

**Important:** Annulez avant la fin de l'essai si vous ne voulez pas payer $500/mois!

---

## 🧪 Tester la Configuration

### Test 1: Vérifier les proxies configurés

```bash
node scripts/test-persistent-profile.js
```

Vous devriez voir:
```
🔒 1 premium proxy service(s) configured
✅ IPRoyal proxy configured
```

### Test 2: Tester le scraping avec proxy

1. Démarrez l'app: `npm run dev`
2. Ajoutez une URL Immoweb dans l'interface
3. Surveillez les logs:
   - Vous devriez voir: `🔒 Using premium proxy: IPRoyal (residential)`
   - Le navigateur devrait se lancer
   - La page devrait charger SANS message "Vous avez été bloqué(e)"

---

## 🔧 Configuration Avancée

### Combiner profil persistant + proxy

Le système utilise maintenant:
1. ✅ **Profil Chrome persistant** - Maintient cookies et session
2. ✅ **Rotation de proxies** - Change l'IP à chaque requête
3. ✅ **Stealth mode** - Masque l'automation
4. ✅ **Comportement humain** - Délais aléatoires, mouvements de souris

### Désactiver les proxies temporairement

Si vous voulez tester sans proxy:

```javascript
// Dans scripts/test-persistent-profile.js
proxyManager.setUseProxy(false);
```

### Ajouter un proxy custom

Si vous avez déjà un proxy:

```env
CUSTOM_PROXY_URL=http://username:password@your-proxy.com:8080
```

---

## 💡 Conseils d'Utilisation

### Réduire les coûts

1. **Utilisez le rate limiting** (déjà configuré)
   - Maximum 20 requêtes/heure
   - Délais de 5-15 secondes entre requêtes

2. **Scrapez intelligemment**
   - Ne re-scrapez pas les mêmes propriétés
   - Utilisez le cache de la DB

3. **Combinez les approches**
   - Utilisez le profil persistant pour réduire la détection
   - Activez les proxies seulement si bloqué

### Si vous êtes toujours bloqué

1. **Augmentez les délais**
   - Modifiez `rate-limiter.js`: `minDelay: 10000` (10 sec)

2. **Utilisez le warm-up**
   ```bash
   node scripts/warmup-chrome-profile.js
   ```
   - Naviguez manuellement sur Immoweb avec le profil
   - Acceptez les cookies
   - Visitez quelques pages normalement

3. **Changez de proxy service**
   - Essayez IPRoyal si WebShare ne marche pas
   - Les proxies résidentiels sont plus fiables

---

## 📞 Support

### IPRoyal
- Dashboard: https://iproyal.com/dashboard
- Support: support@iproyal.com
- Docs: https://iproyal.com/documentation

### WebShare
- Dashboard: https://proxy2.webshare.io/
- Support: https://www.webshare.io/support
- Docs: https://docs.webshare.io/

### Bright Data
- Dashboard: https://brightdata.com/cp
- Support: Chat dans le dashboard
- Docs: https://docs.brightdata.com/

---

## 🎯 Résumé - Action Immédiate

Pour débloquer le scraping MAINTENANT:

1. **Choisir un service** (recommandé: IPRoyal ou WebShare gratuit)
2. **S'inscrire** (5 minutes)
3. **Ajouter credentials dans `.env`**
4. **Tester**: `npm run dev`
5. **Vérifier**: Le scraping devrait fonctionner!

**Budget minimal:**
- Gratuit: WebShare (10 proxies gratuits)
- $7-15/mois: IPRoyal (usage léger)
- $2.99/mois: WebShare Premium

Le système est maintenant 100% prêt - il vous suffit d'ajouter vos credentials de proxy dans le fichier `.env`!
