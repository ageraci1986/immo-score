# Guide de Démarrage Rapide - Immo-Score

## Installation en 5 minutes ⚡

### 1. Cloner et Installer

```bash
cd /Users/angelogeraci/Documents/Applications/TLM
npm install
```

### 2. Configuration des Services

#### A. Supabase (Base de données + Storage)

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **Project Settings** → **API**
3. Copier:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
4. Aller dans **Project Settings** → **Database**
5. Copier la connection string → `DATABASE_URL`

#### B. Clerk (Authentication)

1. Créer un projet sur [clerk.com](https://clerk.com)
2. Aller dans **API Keys**
3. Copier:
   - `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`

#### C. Anthropic Claude (AI)

1. Créer un compte sur [console.anthropic.com](https://console.anthropic.com)
2. Aller dans **API Keys**
3. Créer une clé → `ANTHROPIC_API_KEY`

#### D. Upstash Redis (Rate Limiting)

1. Créer un compte sur [upstash.com](https://upstash.com)
2. Créer une base Redis
3. Copier:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 3. Fichier .env.local

Créer le fichier `.env.local` à la racine:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Upstash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=info
```

### 4. Initialiser la Base de Données

```bash
# Générer le client Prisma
npm run db:generate

# Créer les tables
npm run db:push
```

### 5. Lancer l'Application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Vérification de l'Installation ✅

### 1. Page d'Accueil

- [ ] La page d'accueil charge sans erreur
- [ ] Le bouton "Se connecter" est visible

### 2. Authentification

- [ ] Cliquer sur "Se connecter"
- [ ] Modal Clerk s'affiche
- [ ] Peut créer un compte avec email

### 3. Dashboard

- [ ] Après connexion, redirection vers `/dashboard`
- [ ] Page vide s'affiche (normal, pas de propriétés)
- [ ] Bouton "Ajouter des biens" visible

### 4. Base de Données

```bash
npm run db:studio
```

- [ ] Prisma Studio s'ouvre
- [ ] Tables `User`, `Property`, `CalculationParams` visibles

## Problèmes Courants 🔧

### Erreur de connexion base de données

```
Error: P1001: Can't reach database server
```

**Solution**: Vérifier que `DATABASE_URL` est correct et que le projet Supabase est actif

### Erreur Clerk

```
Error: Clerk publishable key not found
```

**Solution**: Vérifier que `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` est dans `.env.local`

### Erreur TypeScript

```
Error: Cannot find module '@/...'
```

**Solution**:
```bash
npm run clean
rm -rf node_modules
npm install
```

### Port déjà utilisé

```
Error: Port 3000 is already in use
```

**Solution**:
```bash
# Utiliser un autre port
PORT=3001 npm run dev
```

## Prochaines Étapes 🚀

1. **Tester l'ajout d'une propriété**:
   - Copier une URL Immoweb
   - Cliquer sur "Ajouter des biens"
   - Coller l'URL
   - Observer le scraping (fonctionnalité à implémenter)

2. **Configurer les paramètres de calcul**:
   - Aller dans Paramètres
   - Ajuster les pourcentages de frais
   - Définir le loyer par m² par défaut

3. **Explorer le code**:
   - Lire [claude.md](claude.md) pour les standards
   - Consulter [PRD_Immo-Score.md](PRD_Immo-Score.md) pour les spécifications
   - Voir la structure dans [README.md](README.md)

## Scripts Utiles 📝

```bash
# Développement
npm run dev                    # Lancer le serveur
npm run dev -- --turbo         # Mode turbo (plus rapide)

# Base de données
npm run db:studio              # Interface graphique
npm run db:generate            # Générer le client Prisma
npm run db:push                # Appliquer le schéma
npm run db:migrate             # Créer une migration

# Qualité du code
npm run lint                   # Vérifier le code
npm run type-check             # Vérifier les types
npm run format                 # Formater le code
npm run clean:temp             # Nettoyer les fichiers temporaires

# Tests
npm run test                   # Lancer les tests
npm run test:watch             # Mode watch

# Build
npm run build                  # Compiler pour production
npm start                      # Lancer en production
```

## Support 💬

- **Documentation**: [README.md](README.md)
- **Standards**: [claude.md](claude.md)
- **Spécifications**: [PRD_Immo-Score.md](PRD_Immo-Score.md)
- **Issues**: GitHub Issues

---

**Prêt à développer ! 🎉**
