# Immo-Score 🏠

> Plateforme d'analyse immobilière intelligente propulsée par l'IA

Immo-Score automatise l'évaluation de biens immobiliers en combinant web scraping intelligent, analyse d'images par IA (Claude Vision), et calculs de rentabilité personnalisables. Transformez une analyse manuelle de 2-3 heures en un processus automatisé de quelques minutes.

## ✨ Fonctionnalités

- 🤖 **Analyse IA Automatique**: Estimation de l'état de la toiture, des façades et de l'intérieur via Claude Vision
- 📊 **Calculs de Rentabilité**: Rendement brut/net, cash-flow, ROI avec paramètres personnalisables
- 🎯 **Scoring Intelligent**: Score 0-100 basé sur localisation, état, rentabilité et potentiel
- 🌍 **Enrichissement Géographique**: Proximité des services (écoles, transports, commerces)
- 🔄 **Web Scraping Multi-Sites**: Support Immoweb, Logic-Immo et scraper générique
- 📱 **Interface Mobile-First**: Design responsive avec shadcn/ui
- 🔒 **Authentification Sécurisée**: Clerk avec magic links passwordless

## 🚀 Démarrage Rapide

### Prérequis

- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- Compte Supabase (PostgreSQL + Storage)
- Clé API Anthropic Claude
- Compte Clerk (auth)
- Compte Upstash (Redis pour rate limiting)

### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd TLM

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés API

# Initialiser la base de données
npm run db:push

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Routes protégées (dashboard, properties)
│   ├── (public)/          # Routes publiques (landing, sign-in)
│   └── api/               # API routes
│       ├── properties/    # CRUD properties
│       ├── scraping/      # Scraping jobs
│       └── analysis/      # AI analysis endpoints
├── components/            # Composants React
│   ├── ui/               # shadcn/ui base components
│   ├── features/         # Feature-specific components
│   │   ├── property-card.tsx
│   │   ├── add-properties-modal.tsx
│   │   └── rentability-view.tsx
│   └── layouts/          # Layout components
├── lib/                  # Business logic
│   ├── ai/              # AI analysis (Claude)
│   │   ├── claude-client.ts
│   │   └── vision-analysis.ts
│   ├── scraping/        # Web scraping
│   │   ├── scraper-registry.ts
│   │   ├── immoweb-scraper.ts
│   │   └── generic-scraper.ts
│   ├── rentability/     # Profitability calculations
│   │   ├── calculate.ts
│   │   └── work-estimation.ts
│   ├── scoring/         # Property scoring
│   ├── geo/             # Geolocation services
│   ├── db/              # Database client
│   ├── errors.ts        # Custom error classes
│   ├── logger.ts        # Structured logging
│   └── monitoring.ts    # Sentry integration
├── hooks/               # Custom React hooks
│   ├── use-properties.ts
│   ├── use-property.ts
│   └── use-auth.ts
├── types/               # TypeScript definitions
│   └── index.ts
├── config/              # Configuration
│   └── env.ts           # Environment validation
└── prisma/              # Database schema
    └── schema.prisma
```

## 🔧 Configuration

### Variables d'Environnement

Voir [.env.example](.env.example) pour la liste complète. Variables essentielles:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key

# Database
DATABASE_URL=postgresql://...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxx

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

### Base de Données

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Ouvrir Prisma Studio
npm run db:studio
```

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests avec coverage
npm run test:coverage

# Tests E2E
npm run test:e2e

# Mode watch
npm run test:watch
```

## 📝 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Compile l'application pour production |
| `npm start` | Lance l'application compilée |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run lint:fix` | Corrige automatiquement les erreurs |
| `npm run type-check` | Vérifie les types TypeScript |
| `npm run format` | Formate le code avec Prettier |
| `npm run clean` | Nettoie les fichiers de build |
| `npm run clean:temp` | Supprime les fichiers temporaires |

## 🏗️ Workflow de Développement

### Standards de Code

- **TypeScript Strict**: Tous les types doivent être explicites, pas de `any`
- **ESLint**: Pas de warnings tolérés (`--max-warnings 0`)
- **Prettier**: Formatage automatique à chaque commit
- **Commits Conventionnels**: `feat:`, `fix:`, `refactor:`, etc.

### Hooks Git

Pre-commit automatique:
1. Nettoyage des fichiers temporaires
2. Linting et formatage (lint-staged)
3. Type checking TypeScript

### Qualité du Code

Consultez [claude.md](claude.md) pour les standards complets:
- Naming conventions
- Architecture des composants
- Gestion des erreurs
- Performance optimization
- Security best practices

## 🔐 Sécurité

- ✅ Variables d'environnement validées au démarrage (Zod)
- ✅ Input validation sur toutes les API routes
- ✅ Rate limiting avec Upstash Redis
- ✅ Authentication avec Clerk (session-based)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (React auto-escaping)
- ✅ Security headers (CSP, X-Frame-Options, etc.)

## 📊 Monitoring

- **Sentry**: Error tracking et performance monitoring
- **Pino**: Structured logging
- **Vercel Analytics**: Performance metrics (production)

## 🚀 Déploiement

### Vercel (Recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

### Variables d'Environnement Production

Configurer dans Vercel Dashboard:
- Toutes les variables de `.env.example`
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL` avec votre domaine

### Build

```bash
npm run build
```

Le build:
1. Génère le client Prisma
2. Applique les migrations DB
3. Compile Next.js
4. Optimise les images et assets

## 📈 Roadmap

### Sprint 0 - Fondations ✅
- [x] Setup projet Next.js + TypeScript
- [x] Configuration Supabase + Prisma
- [x] Intégration Clerk
- [x] Design system (Tailwind + shadcn/ui)

### Sprint 1 - Scraping & Storage (En cours)
- [ ] Modal d'ajout d'URLs
- [ ] API endpoints properties
- [ ] Scrapers (Immoweb, Generic)
- [ ] Job queue system
- [ ] Storage photos Supabase

### Sprint 2 - Analyse IA
- [ ] Intégration Claude Vision
- [ ] Analyse toiture/façades/intérieur
- [ ] Calcul automatique travaux
- [ ] UI affichage analyse

### Sprint 3 - Rentabilité & Scoring
- [ ] Moteur calcul rentabilité
- [ ] Interface paramètres utilisateur
- [ ] Système de scoring
- [ ] Génération narrative
- [ ] Export PDF

### Sprint 4 - Géolocalisation
- [ ] Géocodage (Nominatim)
- [ ] Proximité services (Overpass API)
- [ ] Carte interactive (Leaflet)

### Sprint 5 - Polish
- [ ] Mode édition manuelle
- [ ] Comparateur de biens
- [ ] Optimisation performance
- [ ] Documentation complète

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'feat: add amazing feature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

Voir [claude.md](claude.md) pour les standards de code.

## 📄 License

MIT © Angelo - Immo-Score Team

## 🆘 Support

- **Documentation**: Voir [PRD](PRD_Immo-Score.md) et [claude.md](claude.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@immo-score.com

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework React
- [Anthropic Claude](https://anthropic.com/) - AI Vision & Analysis
- [Supabase](https://supabase.com/) - Backend as a Service
- [Clerk](https://clerk.com/) - Authentication
- [shadcn/ui](https://ui.shadcn.com/) - UI Components
- [Vercel](https://vercel.com/) - Hosting & Deployment

---

**Built with ❤️ by the Immo-Score Team**
