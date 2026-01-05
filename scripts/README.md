# Scripts de Scraping et Configuration

Collection de scripts utilitaires pour configurer, tester et débugger le système de scraping Immoweb.

## 🔧 Configuration

### `setup-proxy.sh`
**Script interactif pour configurer rapidement un proxy premium**

```bash
./scripts/setup-proxy.sh
```

**Ce que fait ce script:**
- Menu interactif pour choisir un service de proxy
- Demande vos credentials
- Ajoute automatiquement la configuration au fichier `.env`
- Supporte 8 services de proxies différents

**Utilisation recommandée:** Première configuration d'un proxy

---

## 🧪 Tests

### `test-proxy-config.js`
**Vérifie que les proxies sont correctement configurés**

```bash
node scripts/test-proxy-config.js
```

**Sortie si configuré:**
```
✅ PREMIUM PROXIES CONFIGURED:
   1. WebShare (datacenter)
   2. IPRoyal (residential)

🎉 You are ready to scrape Immoweb!
```

**Sortie si NON configuré:**
```
⚠️  NO PREMIUM PROXIES CONFIGURED

Your IP (xxx.xxx.xxx.xxx) is blocked by Immoweb.
```

**Utilisation recommandée:** Après avoir configuré un proxy, avant de lancer le scraping

---

### `test-persistent-profile.js`
**Teste le scraping complet avec profil persistant et proxies**

```bash
node scripts/test-persistent-profile.js
```

**Ce que fait ce script:**
- Lance Puppeteer avec le profil persistant
- Utilise les proxies configurés (ou pas si désactivés)
- Tente de scraper une URL Immoweb de test
- Affiche les résultats détaillés

**Sortie exemple:**
```
🧪 Testing Immoweb scraping with:
   ✅ Persistent Chrome profile
   ✅ Proxy rotation
   ✅ Stealth mode
   ✅ Human behavior simulation

🚀 Starting scraping...
🔒 Using premium proxy: WebShare (datacenter)
✅ SUCCESS! Property data scraped successfully

📋 Property Details:
   Title: Maison à vendre à Liège
   Price: €245,000
   Surface: 120m²
   Bedrooms: 3
```

**Utilisation recommandée:** Test complet du système avant utilisation en production

---

### `enable-proxy-and-test.js`
**Active les proxies et teste le scraping**

```bash
node scripts/enable-proxy-and-test.js
```

**Ce que fait ce script:**
- Force l'activation des proxies (`setUseProxy(true)`)
- Lance un test de scraping sur une URL Immoweb
- Affiche les stats des proxies

**Utilisation recommandée:** Quand vous voulez forcer l'utilisation des proxies pour un test

---

## 🌡️ Maintenance

### `warmup-chrome-profile.js`
**Ouvre un navigateur pour "réchauffer" le profil manuellement**

```bash
node scripts/warmup-chrome-profile.js
```

**Ce que fait ce script:**
- Lance Chrome avec le profil persistant utilisé par le scraper
- Ouvre Immoweb.be
- Vous laisse naviguer manuellement
- Sauvegarde cookies et session quand vous fermez le navigateur

**Pourquoi c'est utile?**
- "Humanise" le profil en naviguant normalement
- Accepte les cookies manuellement
- Crée un historique de navigation légitime
- Réduit les chances de détection

**Instructions d'utilisation:**
1. Lancez le script
2. Naviguez sur Immoweb comme un utilisateur normal
3. Acceptez les cookies
4. Visitez quelques propriétés
5. Fermez le navigateur
6. Votre profil est maintenant "warmed-up"!

**Utilisation recommandée:**
- Après avoir été bloqué
- Avant de commencer un gros batch de scraping
- Une fois par semaine si vous scrapez régulièrement

---

## 📊 Workflow Recommandé

### Première Installation

```bash
# 1. Configurer un proxy
./scripts/setup-proxy.sh

# 2. Vérifier la configuration
node scripts/test-proxy-config.js

# 3. Warm-up du profil (optionnel mais recommandé)
node scripts/warmup-chrome-profile.js

# 4. Test complet
node scripts/test-persistent-profile.js

# 5. Si tout fonctionne, lancer l'app
npm run dev
```

### Debugging

Si le scraping ne fonctionne pas:

```bash
# 1. Vérifier les proxies
node scripts/test-proxy-config.js

# 2. Test direct avec debug
node scripts/test-persistent-profile.js

# 3. Si toujours bloqué, warm-up manuel
node scripts/warmup-chrome-profile.js

# 4. Re-test
node scripts/test-persistent-profile.js
```

### Maintenance Régulière

```bash
# Une fois par semaine si usage régulier
node scripts/warmup-chrome-profile.js
```

---

## 🔍 Variables d'Environnement Utilisées

Ces scripts lisent les variables suivantes du fichier `.env`:

### Proxies Premium
```env
# WebShare
WEBSHARE_PROXY_LIST=user:pass@host:port,user:pass@host:port,...

# IPRoyal
IPROYAL_USERNAME=your_username
IPROYAL_PASSWORD=your_password

# Bright Data
BRIGHTDATA_USERNAME=your_username
BRIGHTDATA_PASSWORD=your_password

# Smartproxy
SMARTPROXY_USERNAME=your_username
SMARTPROXY_PASSWORD=your_password

# Oxylabs
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password

# Proxy-Seller
PROXYSELLER_HOST=123.45.67.89
PROXYSELLER_PORT=8080
PROXYSELLER_USERNAME=your_username
PROXYSELLER_PASSWORD=your_password

# ScraperAPI
SCRAPERAPI_KEY=your_api_key

# Custom
CUSTOM_PROXY_URL=http://username:password@proxy.example.com:8080
```

---

## 🆘 Troubleshooting

### "Module not found"
```bash
# Installez les dépendances
npm install
```

### "Permission denied" sur setup-proxy.sh
```bash
chmod +x scripts/setup-proxy.sh
```

### "No premium proxies configured"
```bash
# Vérifiez votre .env
cat .env | grep PROXY

# Si vide, configurez:
./scripts/setup-proxy.sh
```

### Le navigateur ne s'ouvre pas
```bash
# Vérifiez que Puppeteer est installé
npm list puppeteer puppeteer-extra

# Réinstallez si nécessaire
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

---

## 📖 Documentation Associée

- **Guide complet des proxies:** [../PROXY_SETUP_GUIDE.md](../PROXY_SETUP_GUIDE.md)
- **État du système:** [../SCRAPING_STATUS.md](../SCRAPING_STATUS.md)
- **Solution rapide:** [../SOLUTION_IMMEDIATE.md](../SOLUTION_IMMEDIATE.md)

---

**Dernière mise à jour:** 17 Décembre 2024
