# Architecture Immo-Score

## Vue d'Ensemble

Immo-Score est une application Next.js 14 full-stack utilisant l'App Router, TypeScript strict, et une architecture modulaire orientée qualité.

## Stack Technique

### Frontend
- **Framework**: Next.js 14 (App Router, React Server Components)
- **Langage**: TypeScript 5.6 (strict mode)
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **State Management**: Zustand + TanStack Query
- **Formulaires**: React Hook Form + Zod
- **Styling**: Tailwind CSS 3.4 avec design system custom

### Backend
- **Runtime**: Next.js API Routes (serverless)
- **ORM**: Prisma 5.20
- **Validation**: Zod
- **Authentication**: Clerk
- **Rate Limiting**: Upstash Redis

### Base de Données
- **Provider**: Supabase (PostgreSQL 15)
- **Storage**: Supabase Storage (S3-compatible)
- **Migrations**: Prisma Migrate

### Services Externes
- **AI**: Anthropic Claude Sonnet 4
- **Scraping**: Puppeteer
- **Geocoding**: Nominatim (OpenStreetMap)
- **Services Proximity**: Overpass API (OpenStreetMap)
- **Monitoring**: Sentry
- **Logging**: Pino

### Infrastructure
- **Hosting**: Vercel (Edge Network)
- **CDN**: Vercel Edge Network
- **Cache**: Upstash Redis

## Architecture des Dossiers

```
TLM/
├── prisma/
│   └── schema.prisma          # Schéma de base de données
│
├── scripts/
│   └── cleanup-temp-files.sh  # Nettoyage automatique
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # Routes protégées
│   │   │   ├── dashboard/
│   │   │   └── property/
│   │   ├── (public)/         # Routes publiques
│   │   │   ├── page.tsx     # Landing page
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── api/              # API Routes
│   │   │   ├── properties/
│   │   │   ├── scraping/
│   │   │   ├── analysis/
│   │   │   └── webhooks/
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── features/         # Feature components
│   │   │   ├── property-card.tsx
│   │   │   ├── add-properties-modal.tsx
│   │   │   ├── rentability-view.tsx
│   │   │   └── ...
│   │   └── layouts/          # Layout components
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── sidebar.tsx
│   │
│   ├── lib/                  # Business logic
│   │   ├── ai/               # AI services
│   │   │   ├── claude-client.ts
│   │   │   └── vision-analysis.ts
│   │   ├── scraping/         # Web scraping
│   │   │   ├── scraper-registry.ts
│   │   │   ├── immoweb-scraper.ts
│   │   │   ├── generic-scraper.ts
│   │   │   └── photo-storage.ts
│   │   ├── rentability/      # Calculs
│   │   │   ├── calculate.ts
│   │   │   └── work-estimation.ts
│   │   ├── scoring/          # Scoring
│   │   │   ├── score-calculator.ts
│   │   │   └── weights.ts
│   │   ├── geo/              # Géolocalisation
│   │   │   ├── geocoding.ts
│   │   │   └── nearby-services.ts
│   │   ├── db/               # Database
│   │   │   └── client.ts
│   │   ├── redis/            # Cache & Rate limiting
│   │   │   └── client.ts
│   │   ├── validation/       # Validation
│   │   │   └── schemas.ts
│   │   ├── errors.ts         # Error classes
│   │   ├── logger.ts         # Logging
│   │   ├── monitoring.ts     # Sentry
│   │   └── utils.ts          # Utilities
│   │
│   ├── hooks/                # React hooks
│   │   ├── use-properties.ts
│   │   ├── use-property.ts
│   │   ├── use-auth.ts
│   │   └── use-rentability.ts
│   │
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   │
│   └── config/               # Configuration
│       └── env.ts            # Environment validation
│
├── .husky/                   # Git hooks
│   └── pre-commit
│
├── claude.md                 # Code quality standards
├── README.md                 # Documentation
├── QUICKSTART.md            # Quick start guide
├── INSTALLATION.md          # Installation guide
├── ARCHITECTURE.md          # This file
├── PRD_Immo-Score.md       # Product Requirements
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
└── .env.example
```

## Flux de Données

### 1. Ajout d'une Propriété

```
User Input (URL)
    ↓
API Route (/api/properties/add)
    ↓
[Validation (Zod)]
    ↓
[Authentication Check (Clerk)]
    ↓
[Rate Limiting (Redis)]
    ↓
Create Property + Scraping Job (Prisma)
    ↓
Queue Scraping Job
    ↓
Background: Scraper
    ↓
Download Photos → Supabase Storage
    ↓
AI Vision Analysis (Claude)
    ↓
Work Estimation
    ↓
Rentability Calculation
    ↓
Scoring
    ↓
Narrative Generation (Claude)
    ↓
Update Property (Prisma)
    ↓
User receives notification
```

### 2. Affichage du Dashboard

```
User navigates to /dashboard
    ↓
Server Component fetches data
    ↓
[Authentication (Clerk)]
    ↓
Prisma query with filters
    ↓
[Cache check (Redis)]
    ↓
Render PropertyCard components
    ↓
Client-side filtering/sorting (Zustand)
```

### 3. Analyse IA d'une Propriété

```
Property photos in Supabase Storage
    ↓
Download images as buffers
    ↓
Claude Vision API call
    ↓
{
  roofEstimate: {...},
  facadeEstimate: {...},
  interiorCondition: {...}
}
    ↓
Work cost estimation
    ↓
Store in Property.aiAnalysis (JSON)
```

## Patterns Architecturaux

### 1. Error Handling

Toutes les erreurs passent par des classes custom:
- `AppError` (base)
- `ValidationError`
- `UnauthorizedError`
- `AIAnalysisError`
- `PropertyScrapingError`
- `RateLimitError`

Les erreurs sont:
1. Loggées (Pino)
2. Monitorées (Sentry)
3. Retournées au client avec messages appropriés

### 2. Type Safety

- **Strict TypeScript**: Pas de `any`, tous les types explicites
- **Zod Schemas**: Validation runtime + types inférés
- **Prisma Types**: Types générés automatiquement
- **API Contracts**: Input/Output typés pour chaque endpoint

### 3. Performance

#### Caching Strategy
```
Level 1: React Query (client, 5 min)
Level 2: Redis (server, 24h for properties)
Level 3: Prisma (connection pooling)
Level 4: Supabase (PostgreSQL indexes)
```

#### Code Splitting
- Route-based (automatique avec App Router)
- Dynamic imports pour modals/drawers
- Lazy loading des images (Next.js Image)

#### Database Optimization
- Index sur tous les filtres fréquents
- Select specific fields (pas de SELECT *)
- Pagination côté serveur
- Soft deletes

### 4. Security

#### Layers de Sécurité
1. **Input Validation**: Zod sur toutes les entrées
2. **Authentication**: Clerk middleware
3. **Authorization**: Ownership checks
4. **Rate Limiting**: Redis + Upstash
5. **SQL Injection**: Prisma ORM (prepared statements)
6. **XSS**: React auto-escaping
7. **CSRF**: Next.js protection intégrée
8. **Headers**: Security headers dans next.config.mjs

## Scalabilité

### Vertical Scaling
- Next.js serverless functions (auto-scaling Vercel)
- Supabase PostgreSQL (scalable jusqu'à TB)
- Redis in-memory (Upstash scalable)

### Horizontal Scaling
- CDN Edge (Vercel global network)
- Image optimization (Next.js Image + CDN)
- Static generation quand possible

### Performance Targets
- **Lighthouse Score**: >90 sur tous critères
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **API Response**: <500ms (p95)
- **Database Query**: <100ms (p95)

## Monitoring & Observability

### Metrics Collectées
1. **Application Metrics** (Sentry):
   - Error rate
   - Performance (transactions)
   - User feedback

2. **Infrastructure Metrics** (Vercel):
   - Function execution time
   - Memory usage
   - Cold starts

3. **Business Metrics** (Custom):
   - Properties analyzed per day
   - AI analysis success rate
   - Average scraping time
   - User retention

### Logging Strategy
```typescript
{
  level: 'info' | 'warn' | 'error',
  timestamp: ISO8601,
  context: {
    userId?: string,
    propertyId?: string,
    operation: string,
    duration?: number
  },
  message: string,
  error?: {
    message: string,
    stack: string
  }
}
```

## CI/CD Pipeline

### Git Flow
```
main (production)
  ↑
develop (staging)
  ↑
feature/* branches
```

### Automated Checks (GitHub Actions)
1. **Linting**: ESLint
2. **Type Check**: TypeScript
3. **Tests**: Vitest + Playwright
4. **Build**: Next.js build
5. **Cleanup**: Remove temp files

### Pre-commit Hooks
1. Clean temp files
2. Lint staged files (lint-staged)
3. Type check

### Deployment
- **Push to main** → Auto-deploy to Vercel production
- **Push to develop** → Auto-deploy to Vercel preview
- **Pull Request** → Preview deployment

## Data Flow Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│   Next.js Server    │
│  (Vercel Serverless)│
├─────────────────────┤
│ • API Routes        │
│ • Server Components │
│ • Middleware        │
└──────┬──────────────┘
       │
       ├─────────────────────┐
       │                     │
       ↓                     ↓
┌─────────────┐      ┌──────────────┐
│   Prisma    │      │    Redis     │
│    (ORM)    │      │ (Upstash)    │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ↓                    ↓
┌─────────────┐      ┌──────────────┐
│  Supabase   │      │ Rate Limits  │
│ PostgreSQL  │      │    Cache     │
└─────────────┘      └──────────────┘
       │
       ↓
┌──────────────────────┐
│  Supabase Storage    │
│  (Property Photos)   │
└──────────────────────┘

External Services:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Clerk     │  │  Anthropic  │  │   Sentry    │
│    Auth     │  │   Claude    │  │  Monitoring │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Code Quality Metrics

### Mesures Automatiques
- **ESLint**: 0 warnings tolérés
- **TypeScript**: Strict mode, 0 `any`
- **Test Coverage**: Target 80%
- **Bundle Size**: <500KB initial JS

### Standards (voir claude.md)
- Naming conventions strictes
- Max 200 lignes par composant
- Max 50 lignes par fonction
- Documentation JSDoc sur exports publics
- Pas de code mort

## Évolution Prévue

### Phase 1 - MVP (Actuel)
- Scraping Immoweb
- Analyse IA basique
- Calculs rentabilité
- Dashboard simple

### Phase 2 - Enrichissement
- Support multi-sites (Logic-Immo, etc.)
- Carte interactive
- Comparateur de biens
- Export PDF

### Phase 3 - Intelligence
- Prédiction prix marché
- Suggestions d'amélioration
- Scoring dynamique
- Alertes personnalisées

### Phase 4 - Social
- Partage d'analyses
- Communauté d'investisseurs
- Marketplace travaux
- API publique

---

**Document maintenu par**: Angelo - Immo-Score Team
**Dernière mise à jour**: Décembre 2024
**Version**: 1.0
