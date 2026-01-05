# Guide du Scraping Immoweb

## 🎯 Vue d'ensemble

Le scraper Immoweb a été optimisé pour simuler un comportement humain et éviter la détection automatique. Il intègre :

- ✅ **Stealth mode** avec puppeteer-extra-plugin-stealth
- ✅ **Délais aléatoires** entre les actions (1-7 secondes)
- ✅ **Mouvements de souris** et scroll aléatoires
- ✅ **User agents variés** (Mac, Windows, Safari, Chrome)
- ✅ **Headers HTTP réalistes** (Accept-Language, etc.)
- ✅ **Rate limiting** intelligent (max 20 requêtes/heure)
- ✅ **Détection automatique** des CAPTCHAs

## 📊 Données extraites

Le scraper récupère automatiquement :

### Informations de base
- Titre de l'annonce
- Prix
- Localisation et adresse
- Description complète

### Surfaces
- Surface habitable
- Surface du terrain
- Surface du séjour/salon
- Surface du jardin
- Surface de la terrasse

### Pièces
- Nombre de chambres
- Nombre de salles de bain
- Nombre de toilettes
- Nombre d'étages

### Caractéristiques énergétiques
- Classe énergétique (PEB)
- Année de construction
- État du bâtiment
- Type de chauffage
- Double vitrage

### Équipements
- Jardin (oui/non + surface)
- Terrasse (oui/non + surface)
- Parking (oui/non + nombre de places)
- Piscine
- Ascenseur
- Meublé

### Informations légales
- Date de disponibilité
- Revenu cadastral
- Permis de construire
- Zone inondable
- Visite virtuelle (lien)

### Médias
- Photos (URL de toutes les images)

## 🚀 Utilisation

### Test direct (script JavaScript)

```bash
node scripts/test-scraper-js.js "https://www.immoweb.be/fr/annonce/..."
```

### Intégration dans l'application

```typescript
import { scraperManager } from '@/lib/scraping/scraper-manager';

// Scraper une URL
const result = await scraperManager.scrapeUrl(url);

if (result.success && result.data) {
  console.log('Données récupérées:', result.data);
} else {
  console.error('Erreur:', result.error);
}
```

## ⚙️ Configuration du Rate Limiting

Le rate limiter peut être personnalisé dans `src/lib/scraping/rate-limiter.js` :

```javascript
constructor() {
  this.minDelay = 5000;              // Min 5 secondes entre requêtes
  this.maxDelay = 15000;             // Max 15 secondes
  this.maxRequestsPerHour = 20;      // Max 20 requêtes/heure
}
```

## 🔄 Configuration des Proxies (Rotation d'IP)

Le système de rotation d'IP utilise des proxies pour éviter la détection. Configuration dans `src/lib/scraping/proxy-manager.js` :

### Activer/Désactiver les proxies

```javascript
const { proxyManager } = require('@/lib/scraping/proxy-manager');

// Activer la rotation d'IP
proxyManager.setUseProxy(true);

// Désactiver (utiliser votre IP normale)
proxyManager.setUseProxy(false);
```

### Ajouter un proxy premium

Créez un fichier `.env.local` à la racine du projet :

```bash
PREMIUM_PROXY_URL=http://username:password@proxy.example.com:8080
```

Le proxy premium sera toujours utilisé en priorité si disponible.

### Tester les proxies gratuits

```javascript
// Tester tous les proxies de la liste
await proxyManager.testAllProxies();

// Tester un proxy spécifique
const works = await proxyManager.testProxy('http://51.158.68.68:8811');
```

### Ajouter des proxies personnalisés

```javascript
// Ajouter un proxy à la rotation
proxyManager.addProxy('http://your-proxy.com:3128');

// Retirer un proxy qui ne fonctionne plus
proxyManager.removeProxy('http://dead-proxy.com:3128');
```

### Obtenir des statistiques

```javascript
const stats = proxyManager.getStats();
console.log(stats);
// {
//   totalProxies: 5,
//   currentIndex: 2,
//   premiumProxyConfigured: true,
//   proxyEnabled: true
// }
```

### Recommandations pour éviter la détection

1. **Ne jamais dépasser 20-30 requêtes/heure**
2. **Espacer les requêtes d'au moins 5-10 secondes**
3. **Varier les heures de scraping** (éviter les patterns réguliers)
4. **Ne pas scraper en boucle** la nuit ou aux heures creuses
5. **Respecter robots.txt** et les CGU du site

## 🔍 Gestion des erreurs

### CAPTCHA détecté

```
Error: CAPTCHA detected - please try again later
```

**Solutions :**
- Attendre plusieurs minutes avant de réessayer
- Réduire la fréquence des requêtes
- Vérifier que le rate limiting est actif

### Timeout

```
⚠ Timeout waiting for content
```

Le scraper continue quand même et tente d'extraire les données. Si aucune donnée n'est récupérée, la page est probablement bloquée.

### Aucune donnée récupérée

**Causes possibles :**
1. Structure HTML d'Immoweb a changé → mettre à jour les sélecteurs
2. Page protégée par CAPTCHA
3. JavaScript pas complètement chargé

**Solutions :**
1. Augmenter les délais d'attente
2. Vérifier manuellement la page dans un navigateur
3. Consulter les logs pour voir le contenu récupéré

## 📈 Statistiques

Le rate limiter fournit des statistiques en temps réel :

```javascript
const stats = rateLimiter.getStats();
console.log(stats);
// {
//   totalRequests: 5,
//   requestsInLastHour: 5,
//   remainingThisHour: 15
// }
```

## 🛠️ Débogage

### Mode verbose

Le scraper affiche automatiquement :
- ✅ Nombre de requêtes effectuées
- ✅ Temps d'attente appliqués
- ✅ Détection des éléments de contenu
- ✅ Longueur du HTML récupéré
- ✅ Présence de CAPTCHA

### Screenshot de débogage

Un screenshot est sauvegardé à `/tmp/immoweb-debug.png` pour vérifier visuellement ce qui est affiché.

### Logs détaillés

```javascript
console.log('Page status:', {
  hasH1: ...,
  hasTable: ...,
  bodyLength: ...,
  hasCaptcha: ...
});
```

## ⚡ Performance

- **Temps moyen par scraping :** 15-25 secondes
- **Taux de succès estimé :** 90%+ (hors CAPTCHA)
- **Débit max recommandé :** 20 propriétés/heure

## 🔒 Considérations légales

⚠️ **Important :**
- Ce scraper est destiné à un **usage personnel non-commercial**
- Respecter les **conditions d'utilisation** d'Immoweb
- Ne pas surcharger les serveurs
- Respecter la **vie privée** des utilisateurs
- Consulter un avocat pour tout usage commercial

## 🐛 Troubleshooting

### Le scraper ne trouve pas puppeteer

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

### Erreur "Browser not found"

```bash
npx puppeteer browsers install chrome
```

### Headers CORS ou CSP

Ces erreurs n'affectent pas le scraping car Puppeteer contrôle le navigateur.

## 📚 Ressources

- [Documentation Puppeteer](https://pptr.dev/)
- [Puppeteer Extra Stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [Best practices web scraping](https://www.scrapehero.com/web-scraping-best-practices/)

## 🎓 Améliorations futures

- [ ] Support de plusieurs sites immobiliers (Logic-Immo, Zimmo, etc.)
- [ ] Proxy rotation automatique
- [ ] Cache des résultats pour éviter re-scraping
- [ ] API REST pour le scraping en background
- [ ] Dashboard de monitoring des statistiques
- [ ] Notifications en cas de blocage
