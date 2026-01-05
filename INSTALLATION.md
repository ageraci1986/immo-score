# Guide d'Installation Complète - Immo-Score

Ce guide vous accompagne pas à pas pour installer et configurer Immo-Score de A à Z.

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Installation Locale](#installation-locale)
3. [Configuration des Services](#configuration-des-services)
4. [Initialisation de la Base de Données](#initialisation-de-la-base-de-données)
5. [Premier Lancement](#premier-lancement)
6. [Vérification de l'Installation](#vérification-de-linstallation)
7. [Déploiement en Production](#déploiement-en-production)
8. [Troubleshooting](#troubleshooting)

## Prérequis

### Logiciels Requis

- **Node.js** ≥ 20.0.0 ([télécharger](https://nodejs.org/))
- **npm** ≥ 10.0.0 (inclus avec Node.js)
- **Git** ([télécharger](https://git-scm.com/))
- **Éditeur de code** (VS Code recommandé)

### Vérification

```bash
node --version  # Doit afficher v20.x.x ou supérieur
npm --version   # Doit afficher 10.x.x ou supérieur
git --version   # Doit afficher git version 2.x.x
```

### Comptes à Créer

Vous aurez besoin de comptes (gratuits) sur:

1. **Supabase** - Base de données PostgreSQL + Storage
2. **Clerk** - Authentification
3. **Anthropic** - API Claude pour l'IA
4. **Upstash** - Redis pour rate limiting
5. **Sentry** (optionnel) - Monitoring des erreurs

## Installation Locale

### 1. Cloner le Repository

```bash
# Si vous utilisez Git
git clone <repository-url>
cd TLM

# OU si vous avez téléchargé le ZIP
cd /Users/angelogeraci/Documents/Applications/TLM
```

### 2. Installer les Dépendances

```bash
npm install
```

Cette commande va:
- Installer toutes les dépendances (~500MB)
- Générer le client Prisma
- Installer Husky pour les git hooks

**Durée**: 2-5 minutes selon votre connexion

## Configuration des Services

### 1. Supabase (Base de Données + Storage)

#### A. Créer un Projet

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un compte (gratuit)
3. Cliquer sur "New Project"
4. Remplir:
   - **Name**: `immo-score`
   - **Database Password**: Générer un mot de passe fort (noter quelque part!)
   - **Region**: Europe West (Ireland) `eu-west-1`
5. Cliquer sur "Create new project" (⏱️ 2-3 minutes)

#### B. Récupérer les Clés

1. Une fois le projet créé, aller dans **Project Settings** (icône engrenage)
2. Aller dans **API**:
   - **URL**: Copier → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: Copier → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: Copier (⚠️ secret!) → `SUPABASE_SERVICE_ROLE_KEY`

3. Aller dans **Database**:
   - Cliquer sur "Connection string" → "Nodejs"
   - Copier l'URL complète → `DATABASE_URL`
   - Remplacer `[YOUR-PASSWORD]` par votre mot de passe DB

#### C. Configurer Storage

1. Aller dans **Storage**
2. Créer un bucket:
   - **Name**: `property-photos`
   - **Public**: ✅ Coché
3. Cliquer sur "Create bucket"

### 2. Clerk (Authentification)

#### A. Créer une Application

1. Aller sur [clerk.com](https://clerk.com)
2. Créer un compte (gratuit jusqu'à 10k utilisateurs)
3. Cliquer sur "Create application"
4. Remplir:
   - **Application name**: `Immo-Score`
   - **Sign-in options**: Email + Magic Links uniquement
5. Cliquer sur "Create application"

#### B. Récupérer les Clés

1. Dans le dashboard Clerk, aller dans **API Keys**
2. Copier:
   - **Publishable key**: → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key**: → `CLERK_SECRET_KEY` (cliquer sur "Show")

#### C. Configurer les URLs de Redirection

1. Aller dans **Paths**
2. Configurer:
   - **Sign-in page**: `/sign-in`
   - **Sign-up page**: `/sign-up`
   - **After sign-in**: `/dashboard`
   - **After sign-up**: `/dashboard`
   - **Home URL**: `/`

### 3. Anthropic Claude (Intelligence Artificielle)

#### A. Créer un Compte

1. Aller sur [console.anthropic.com](https://console.anthropic.com)
2. Créer un compte
3. Vérifier votre email

#### B. Obtenir une Clé API

1. Dans la console, aller dans **API Keys**
2. Cliquer sur "Create Key"
3. Nommer la clé: `immo-score-dev`
4. Copier la clé (commence par `sk-ant-`) → `ANTHROPIC_API_KEY`

⚠️ **Important**: Vous devrez ajouter des crédits (5$ minimum). L'utilisation typique coûte ~0.50€ par analyse de bien.

### 4. Upstash Redis (Rate Limiting)

#### A. Créer une Base Redis

1. Aller sur [upstash.com](https://upstash.com)
2. Créer un compte (gratuit jusqu'à 10k requêtes/jour)
3. Cliquer sur "Create database"
4. Configurer:
   - **Name**: `immo-score-redis`
   - **Type**: Regional
   - **Region**: Europe (Ireland) `eu-west-1`
5. Cliquer sur "Create"

#### B. Récupérer les Identifiants

1. Dans le dashboard de la DB:
   - **REST API** → **UPSTASH_REDIS_REST_URL**: Copier
   - **REST API** → **UPSTASH_REDIS_REST_TOKEN**: Copier

### 5. Sentry (Optionnel - Monitoring)

Si vous voulez le monitoring des erreurs:

1. Aller sur [sentry.io](https://sentry.io)
2. Créer un compte
3. Créer un nouveau projet (Next.js)
4. Copier le **DSN** → `NEXT_PUBLIC_SENTRY_DSN`

## Initialisation de la Base de Données

### 1. Créer le Fichier .env.local

Dans le répertoire racine, créer `.env.local`:

```bash
# Créer le fichier
touch .env.local

# Ouvrir avec votre éditeur
code .env.local  # VS Code
# OU
nano .env.local  # Terminal
```

### 2. Remplir les Variables

Copier ce template et remplacer toutes les valeurs `xxx`:

```env
# ===== SUPABASE =====
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx

# ===== DATABASE =====
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres

# ===== CLERK =====
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ===== ANTHROPIC =====
ANTHROPIC_API_KEY=sk-ant-xxx

# ===== UPSTASH =====
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx

# ===== SENTRY (Optionnel) =====
# NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# ===== APPLICATION =====
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=info
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### 3. Appliquer le Schéma de Base de Données

```bash
# Générer le client Prisma
npm run db:generate

# Créer les tables dans Supabase
npm run db:push
```

Vous devriez voir:
```
✔ Generated Prisma Client
✔ Database synced successfully
```

### 4. Vérifier avec Prisma Studio

```bash
npm run db:studio
```

Une page web s'ouvre sur [http://localhost:5555](http://localhost:5555)

Vous devriez voir les tables:
- `User`
- `Property`
- `CalculationParams`
- `ScrapingJob`
- `ApiUsage`
- `AuditLog`

## Premier Lancement

### 1. Démarrer le Serveur de Développement

```bash
npm run dev
```

Vous devriez voir:
```
▲ Next.js 14.2.13
- Local:        http://localhost:3000
- Environment:  development

✓ Ready in 3.2s
```

### 2. Ouvrir l'Application

Aller sur [http://localhost:3000](http://localhost:3000)

### 3. Tester l'Authentification

1. Cliquer sur "Se connecter"
2. Modal Clerk s'ouvre
3. Entrer votre email
4. Vérifier vos emails pour le magic link
5. Cliquer sur le lien
6. Vous êtes redirigé vers `/dashboard`

✅ **Félicitations! Immo-Score est installé!**

## Vérification de l'Installation

### Checklist Complète

- [ ] Page d'accueil charge sans erreur
- [ ] Aucune erreur dans la console du navigateur (F12)
- [ ] Authentification fonctionne
- [ ] Dashboard s'affiche après connexion
- [ ] Prisma Studio montre toutes les tables
- [ ] User créé visible dans Prisma Studio
- [ ] Aucune erreur dans le terminal où `npm run dev` tourne

### Tests Supplémentaires

```bash
# Vérifier le linting
npm run lint

# Vérifier les types TypeScript
npm run type-check

# Lancer les tests
npm run test
```

Tout doit passer ✅

## Déploiement en Production

### Option 1: Vercel (Recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel
```

Suivre les instructions, puis:
1. Dans Vercel Dashboard → Settings → Environment Variables
2. Ajouter TOUTES les variables de `.env.local`
3. ⚠️ Changer `NEXT_PUBLIC_APP_URL` avec votre domaine Vercel

### Option 2: Railway

1. Connecter votre repo GitHub
2. Créer un nouveau projet sur [railway.app](https://railway.app)
3. Ajouter les variables d'environnement
4. Déployer

## Troubleshooting

### Erreur: "Cannot find module '@/...'"

```bash
# Nettoyer et réinstaller
npm run clean
rm -rf node_modules package-lock.json
npm install
```

### Erreur: "Prisma Client not generated"

```bash
npm run db:generate
```

### Erreur: "Database connection failed"

1. Vérifier que `DATABASE_URL` est correct
2. Vérifier que le mot de passe est bien remplacé
3. Vérifier que le projet Supabase est actif
4. Essayer de copier à nouveau l'URL depuis Supabase

### Erreur Clerk: "Invalid publishable key"

1. Vérifier que la clé commence par `pk_test_` ou `pk_live_`
2. Vérifier qu'il n'y a pas d'espaces avant/après
3. Redémarrer `npm run dev` après modification du `.env.local`

### Port 3000 déjà utilisé

```bash
# Utiliser un autre port
PORT=3001 npm run dev

# OU tuer le processus sur le port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### L'application est lente en dev

C'est normal lors du premier chargement (compilation). Les rechargements suivants seront rapides grâce au HMR (Hot Module Replacement).

Pour accélérer:
```bash
# Utiliser le mode Turbo
npm run dev -- --turbo
```

## Support

- **Documentation**: [README.md](README.md)
- **Démarrage rapide**: [QUICKSTART.md](QUICKSTART.md)
- **Standards de code**: [claude.md](claude.md)
- **Spécifications**: [PRD_Immo-Score.md](PRD_Immo-Score.md)

---

**🎉 Vous êtes prêt à développer Immo-Score!**
