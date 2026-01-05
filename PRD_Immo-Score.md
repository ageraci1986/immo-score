# PRD: Immo-Score - Plateforme d'Analyse Immobilière Intelligente

## 1. Vue d'ensemble

### 1.1 Résumé exécutif
Immo-Score est une application web qui automatise l'évaluation de biens immobiliers en combinant web scraping intelligent, analyse d'images par IA et calculs de rentabilité personnalisables. L'objectif est de transformer une analyse manuelle de 2-3 heures par bien en un processus automatisé de quelques minutes, permettant aux investisseurs de prendre des décisions éclairées rapidement.

### 1.2 Objectifs
- **Automatisation**: Réduire de 90% le temps d'analyse par bien immobilier
- **Précision**: Fournir des estimations de travaux et scores comparatifs fiables
- **Scalabilité**: Permettre l'analyse simultanée de dizaines de biens
- **Accessibilité**: Interface mobile-first pour consultation terrain

### 1.3 Utilisateurs cibles
- Investisseurs immobiliers cherchant des opportunités de rénovation
- Agents immobiliers évaluant rapidement des portefeuilles
- Particuliers recherchant leur première acquisition

## 2. Architecture technique

### 2.1 Stack technologique

**Frontend**
- **Framework**: React 18+ avec TypeScript
- **UI Library**: shadcn/ui (composants Radix UI + Tailwind CSS)
- **State Management**: Zustand (léger et performant)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: TanStack Query (React Query) pour le caching

**Backend**
- **Runtime**: Node.js avec Express.js OU Next.js API routes (recommandé pour simplicité déploiement)
- **ORM**: Prisma (excellent avec Supabase PostgreSQL)
- **Validation**: Zod (cohérence frontend/backend)

**Base de données**
- **Provider**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage pour images scrappées et documents

**Authentication**
- **Provider**: Clerk (gratuit jusqu'à 10k MAU, excellent DX)
- **Méthode**: Email + Magic Links (passwordless)

**IA & Scraping**
- **LLM**: Claude API (Anthropic) via Sonnet 4.5
- **Web Scraping**: Puppeteer OU Playwright (headless browser)
- **Vision API**: Claude Vision pour analyse photos
- **Rate Limiting**: Upstash Redis pour gestion des quotas

**Infrastructure**
- **Hosting Frontend**: Vercel (optimisé pour Next.js)
- **Hosting Backend**: Vercel Serverless Functions OU Railway
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry pour error tracking

### 2.2 Schema de base de données

```prisma
// schema.prisma

model User {
  id                String     @id @default(cuid())
  clerkId           String     @unique
  email             String     @unique
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  
  properties        Property[]
  calculationParams CalculationParams?
}

model Property {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  
  // Données de base
  sourceUrl         String
  scrapedAt         DateTime @default(now())
  title             String?
  description       String?  @db.Text
  
  // Prix et localisation
  price             Float?
  location          String?
  address           String?
  coordinates       Json?    // { lat, lng }
  
  // Caractéristiques
  surface           Float?
  bedrooms          Int?
  bathrooms         Int?
  peb               String?  // A+, A, B, C, D, E, F, G
  constructionYear  Int?
  
  // Photos et analyse visuelle
  photos            Json[]   // Array of { url, analysis, storageKey }
  
  // Analyse IA
  roofEstimate      Json?    // { surface, condition, material }
  facadeEstimate    Json?    // { count, totalSurface, condition }
  workEstimate      Json?    // { total, breakdown: {...} }
  aiScore           Float?   // Score 0-100
  aiAnalysis        String?  @db.Text
  
  // Rentabilité
  rentabilityData   Json?    // Résultats des calculs
  rentabilityRate   Float?   // Pourcentage
  
  // Proximité services
  nearbyServices    Json?    // { type, distance, name }[]
  
  // Métadonnées
  status            PropertyStatus @default(ANALYZING)
  customParams      Json?    // Params utilisateur spécifiques
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([userId, createdAt])
}

enum PropertyStatus {
  PENDING      // URL ajoutée, pas encore scrappée
  SCRAPING     // En cours de scraping
  ANALYZING    // Scraping terminé, analyse IA en cours
  COMPLETED    // Tout terminé
  ERROR        // Erreur lors du processus
}

model CalculationParams {
  id                     String   @id @default(cuid())
  userId                 String   @unique
  user                   User     @relation(fields: [userId], references: [id])
  
  // Paramètres personnalisables pour calcul rentabilité
  defaultRentPerSqm      Float?   // Loyer/m²
  renovationCostPerSqm   Float?
  notaryFeesPercent      Float?
  agencyFeesPercent      Float?
  taxRate                Float?
  maintenancePercent     Float?
  insuranceYearly        Float?
  
  // Poids pour le scoring IA
  scoreWeights           Json?    // { location, condition, potential, ... }
  
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}

model ScrapingJob {
  id           String   @id @default(cuid())
  propertyId   String
  url          String
  status       String   // pending, running, completed, failed
  attempts     Int      @default(0)
  error        String?  @db.Text
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime @default(now())
  
  @@index([status, createdAt])
}
```

## 3. Fonctionnalités détaillées

### 3.1 Authentification (Sprint 0)

**User Stories**
- En tant qu'utilisateur, je veux créer un compte avec mon email
- En tant qu'utilisateur, je veux recevoir un magic link pour me connecter
- En tant qu'utilisateur, je veux voir mon profil et mes paramètres

**Spécifications techniques**
- Intégration Clerk avec webhook Supabase pour sync users
- Middleware de protection des routes API
- Session management avec cookies httpOnly
- Logout avec invalidation token

**UI Components**
- Page de landing avec CTA "Commencer"
- Modal/Page de sign-in avec input email
- Écran de confirmation "Vérifiez vos emails"
- Layout protégé avec header (avatar, logout)

### 3.2 Ajout de biens (Sprint 1)

**User Stories**
- En tant qu'utilisateur, je veux coller une ou plusieurs URLs de biens
- En tant qu'utilisateur, je veux voir le statut du scraping en temps réel
- En tant qu'utilisateur, je veux être notifié quand l'analyse est terminée

**Spécifications techniques**

**Input Handler**
```typescript
interface PropertyInput {
  urls: string[];
  customParams?: {
    targetRent?: number;
    maxWorkBudget?: number;
    [key: string]: any;
  };
}

// Validation
const urlSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
  customParams: z.record(z.any()).optional()
});
```

**Workflow**
1. User colle URL(s) dans textarea
2. Frontend valide et envoie à `/api/properties/add`
3. Backend crée Property records avec status PENDING
4. Backend déclenche scraping jobs (queue système)
5. Frontend poll status OU utilise WebSocket pour updates temps réel

**UI Components**
- Carte "Ajouter des biens" avec textarea multi-lignes
- Bouton "Analyser" avec loading state
- Liste des biens en cours avec progress bars
- Toast notifications pour succès/erreurs

### 3.3 Scraping intelligent (Sprint 1-2)

**Objectifs**
- Extraire données structurées des annonces immobilières
- Télécharger et stocker les photos
- Gérer différents formats de sites (Immoweb, Logic-Immo, etc.)

**Architecture Scraping**

```typescript
// Scraper Factory Pattern
interface PropertyScraper {
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapedData>;
}

interface ScrapedData {
  title: string;
  price: number;
  location: string;
  surface?: number;
  bedrooms?: number;
  peb?: string;
  description: string;
  photos: string[];
  rawData: Record<string, any>;
}

class ImmowebScraper implements PropertyScraper {
  canHandle(url: string): boolean {
    return url.includes('immoweb.be');
  }
  
  async scrape(url: string): Promise<ScrapedData> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Extraction sélecteurs spécifiques Immoweb
      const data = await page.evaluate(() => {
        // DOM scraping logic
        return {
          title: document.querySelector('.title')?.textContent,
          price: parseFloat(document.querySelector('.price')?.textContent),
          // ...
        };
      });
      
      // Photos
      const photos = await page.$$eval('img.property-photo', imgs => 
        imgs.map(img => img.src)
      );
      
      return { ...data, photos };
    } finally {
      await browser.close();
    }
  }
}

// Registry avec fallback generic scraper
class ScraperRegistry {
  private scrapers: PropertyScraper[] = [
    new ImmowebScraper(),
    new LogicImmoScraper(),
    new GenericScraper() // Utilise Claude pour extraction
  ];
  
  getScraper(url: string): PropertyScraper {
    return this.scrapers.find(s => s.canHandle(url)) 
      || this.scrapers[this.scrapers.length - 1];
  }
}
```

**Generic Scraper avec Claude**
```typescript
class GenericScraper implements PropertyScraper {
  async scrape(url: string): Promise<ScrapedData> {
    // 1. Puppeteer récupère HTML complet
    const html = await this.fetchHTML(url);
    
    // 2. Claude extrait données structurées
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Analyse cette page immobilière et extrais les données au format JSON:
        
${html}

Format attendu:
{
  "title": "...",
  "price": 250000,
  "location": "Bruxelles",
  "surface": 85,
  "bedrooms": 2,
  "peb": "C",
  "description": "...",
  "features": ["..."],
  "photos": ["url1", "url2"]
}

Retourne UNIQUEMENT le JSON, rien d'autre.`
      }]
    });
    
    return JSON.parse(response.content[0].text);
  }
}
```

**Photo Storage**
```typescript
async function storePhotos(photos: string[], propertyId: string) {
  const stored = [];
  
  for (const [index, photoUrl] of photos.entries()) {
    // Download
    const response = await fetch(photoUrl);
    const buffer = await response.arrayBuffer();
    
    // Upload to Supabase Storage
    const fileName = `${propertyId}/photo-${index}.jpg`;
    const { data, error } = await supabase.storage
      .from('property-photos')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });
    
    if (!error) {
      stored.push({
        url: photoUrl,
        storageKey: fileName,
        publicUrl: supabase.storage.from('property-photos').getPublicUrl(fileName).data.publicUrl
      });
    }
  }
  
  return stored;
}
```

### 3.4 Analyse IA des photos (Sprint 2)

**Objectifs**
- Estimer surface et état de la toiture
- Compter et mesurer les façades
- Évaluer l'état général du bien
- Identifier les travaux nécessaires

**Vision Analysis avec Claude**

```typescript
interface VisionAnalysis {
  roofEstimate: {
    estimatedSurface: number; // m²
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    material: string; // tuiles, ardoises, zinc...
    estimatedAge: number; // années
    workNeeded: string[];
    confidence: number; // 0-1
  };
  facadeEstimate: {
    count: number;
    totalSurface: number; // m²
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    materials: string[];
    workNeeded: string[];
    confidence: number;
  };
  interiorCondition?: {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    flooring: string;
    walls: string;
    ceilings: string;
    kitchen: string;
    bathrooms: string;
    workEstimate: string;
  };
}

async function analyzePropertyPhotos(
  photos: Array<{ url: string; storageKey: string }>,
  propertyData: { surface?: number; description?: string }
): Promise<VisionAnalysis> {
  
  // Préparer images en base64
  const imageContents = await Promise.all(
    photos.map(async photo => {
      const { data } = await supabase.storage
        .from('property-photos')
        .download(photo.storageKey);
      
      const base64 = await data.arrayBuffer()
        .then(buf => Buffer.from(buf).toString('base64'));
      
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/jpeg' as const,
          data: base64
        }
      };
    })
  );
  
  const prompt = `Tu es un expert en évaluation immobilière. Analyse ces photos d'une propriété et fournis une estimation détaillée.

Contexte:
${propertyData.surface ? `- Surface habitable: ${propertyData.surface}m²` : ''}
${propertyData.description ? `- Description: ${propertyData.description}` : ''}

Analyse requise:

1. TOITURE (si visible)
   - Estime la surface totale en m² (utilise la surface habitable comme référence si disponible)
   - Évalue l'état: excellent/good/fair/poor
   - Identifie le matériau
   - Estime l'âge approximatif
   - Liste les travaux nécessaires
   - Indique ton niveau de confiance (0-1)

2. FAÇADES
   - Compte le nombre de façades visibles
   - Estime la surface totale des façades en m²
   - Évalue l'état général
   - Identifie les matériaux
   - Liste les travaux d'isolation/rénovation nécessaires
   - Indique ton niveau de confiance

3. INTÉRIEUR (si photos disponibles)
   - Évalue l'état général
   - Décris l'état des sols, murs, plafonds
   - Évalue cuisine et salles de bain
   - Estime les travaux de rénovation nécessaires

Retourne UNIQUEMENT un JSON valide suivant cette structure:
{
  "roofEstimate": {
    "estimatedSurface": 85,
    "condition": "good",
    "material": "tuiles en terre cuite",
    "estimatedAge": 25,
    "workNeeded": ["Remplacement tuiles cassées", "Nettoyage gouttières"],
    "confidence": 0.75
  },
  "facadeEstimate": {
    "count": 2,
    "totalSurface": 120,
    "condition": "fair",
    "materials": ["briques", "crépi"],
    "workNeeded": ["Isolation façade arrière", "Réfection crépi"],
    "confidence": 0.8
  },
  "interiorCondition": {
    "overall": "fair",
    "flooring": "Carrelage salon, parquet chambres usé",
    "walls": "Bon état général, peinture nécessaire",
    "ceilings": "Quelques fissures mineures",
    "kitchen": "Cuisine ancienne à rénover complètement",
    "bathrooms": "Salle de bain principale correcte, WC séparé vétuste",
    "workEstimate": "Rénovation cuisine (15-20k€), rafraîchissement général (5-8k€), remplacement parquet chambres (3-5k€)"
  }
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...imageContents
      ]
    }]
  });
  
  // Parse et valide la réponse
  const jsonText = response.content[0].text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
    
  return JSON.parse(jsonText);
}
```

### 3.5 Calcul de rentabilité (Sprint 2-3)

**Input: Paramètres personnalisables**

```typescript
interface RentabilityParams {
  // Prix et coûts d'acquisition
  purchasePrice: number;
  notaryFeesPercent: number;      // Default: 12.5%
  agencyFeesPercent: number;       // Default: 3%
  
  // Travaux
  estimatedWorkCost: number;       // De l'analyse IA + user override
  contingencyPercent: number;      // Default: 10%
  
  // Revenus locatifs
  monthlyRent: number;             // User input OU estimation
  rentPerSqm?: number;             // Pour estimation automatique
  vacancyRate: number;             // Default: 5%
  
  // Charges et taxes
  propertyTaxYearly: number;
  insuranceYearly: number;
  maintenancePercent: number;      // % du loyer, Default: 10%
  managementFeesPercent: number;   // Default: 7%
  
  // Financement (optionnel)
  loanAmount?: number;
  interestRate?: number;
  loanDurationYears?: number;
  
  // Fiscalité
  taxRegime: 'normal' | 'reel';
  marginalTaxRate?: number;
}

interface RentabilityResults {
  // Investissement total
  totalInvestment: number;
  breakdown: {
    purchasePrice: number;
    notaryFees: number;
    agencyFees: number;
    workCost: number;
    contingency: number;
  };
  
  // Revenus
  annualGrossRent: number;
  annualNetRent: number;
  
  // Charges
  annualCharges: {
    propertyTax: number;
    insurance: number;
    maintenance: number;
    managementFees: number;
    loanPayment?: number;
    total: number;
  };
  
  // Ratios clés
  grossYield: number;              // %
  netYield: number;                // %
  cashFlow: number;                // Mensuel
  roi: number;                     // Return on Investment %
  
  // Si financement
  loanDetails?: {
    monthlyPayment: number;
    totalInterest: number;
    ltv: number;                   // Loan to Value
  };
}

function calculateRentability(
  property: Property,
  params: RentabilityParams,
  aiAnalysis: VisionAnalysis
): RentabilityResults {
  
  // 1. Investissement total
  const notaryFees = property.price * (params.notaryFeesPercent / 100);
  const agencyFees = property.price * (params.agencyFeesPercent / 100);
  const workCost = params.estimatedWorkCost || estimateWorkFromAI(aiAnalysis);
  const contingency = workCost * (params.contingencyPercent / 100);
  
  const totalInvestment = 
    property.price + notaryFees + agencyFees + workCost + contingency;
  
  // 2. Revenus locatifs
  const monthlyRent = params.monthlyRent || 
    (property.surface * params.rentPerSqm);
  const annualGrossRent = monthlyRent * 12;
  const annualNetRent = annualGrossRent * (1 - params.vacancyRate / 100);
  
  // 3. Charges annuelles
  const maintenance = annualNetRent * (params.maintenancePercent / 100);
  const managementFees = annualNetRent * (params.managementFeesPercent / 100);
  const totalCharges = 
    params.propertyTaxYearly + 
    params.insuranceYearly + 
    maintenance + 
    managementFees;
  
  // 4. Ratios
  const grossYield = (annualGrossRent / property.price) * 100;
  const netYield = ((annualNetRent - totalCharges) / totalInvestment) * 100;
  const monthlyCashFlow = (annualNetRent - totalCharges) / 12;
  
  // 5. Financement (si applicable)
  let loanDetails;
  if (params.loanAmount && params.interestRate && params.loanDurationYears) {
    const monthlyRate = params.interestRate / 100 / 12;
    const numPayments = params.loanDurationYears * 12;
    const monthlyPayment = 
      params.loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    loanDetails = {
      monthlyPayment,
      totalInterest: (monthlyPayment * numPayments) - params.loanAmount,
      ltv: (params.loanAmount / property.price) * 100
    };
  }
  
  return {
    totalInvestment,
    breakdown: {
      purchasePrice: property.price,
      notaryFees,
      agencyFees,
      workCost,
      contingency
    },
    annualGrossRent,
    annualNetRent,
    annualCharges: {
      propertyTax: params.propertyTaxYearly,
      insurance: params.insuranceYearly,
      maintenance,
      managementFees,
      total: totalCharges
    },
    grossYield,
    netYield,
    cashFlow: monthlyCashFlow,
    roi: netYield
  };
}

// Estimation automatique des travaux depuis l'IA
function estimateWorkFromAI(analysis: VisionAnalysis): number {
  let total = 0;
  
  // Toiture
  if (analysis.roofEstimate.condition === 'poor') {
    total += analysis.roofEstimate.estimatedSurface * 150; // 150€/m²
  } else if (analysis.roofEstimate.condition === 'fair') {
    total += analysis.roofEstimate.estimatedSurface * 50; // Réparations
  }
  
  // Façades
  if (analysis.facadeEstimate.condition === 'poor') {
    total += analysis.facadeEstimate.totalSurface * 100; // Isolation + crépi
  } else if (analysis.facadeEstimate.condition === 'fair') {
    total += analysis.facadeEstimate.totalSurface * 40;
  }
  
  // Intérieur (parsing du workEstimate textuel)
  if (analysis.interiorCondition?.workEstimate) {
    const estimates = analysis.interiorCondition.workEstimate
      .match(/(\d+)(?:-(\d+))?k€/g);
    if (estimates) {
      estimates.forEach(est => {
        const match = est.match(/(\d+)(?:-(\d+))?/);
        const min = parseInt(match[1]) * 1000;
        const max = match[2] ? parseInt(match[2]) * 1000 : min;
        total += (min + max) / 2;
      });
    }
  }
  
  return Math.round(total);
}
```

### 3.6 Scoring et recommandations IA (Sprint 3)

**Objectif**: Générer un score 0-100 et une analyse narrative

```typescript
interface ScoringWeights {
  location: number;      // 0-1, default 0.25
  condition: number;     // 0-1, default 0.20
  rentability: number;   // 0-1, default 0.30
  potential: number;     // 0-1, default 0.15
  workComplexity: number; // 0-1, default 0.10
}

interface PropertyScore {
  totalScore: number;            // 0-100
  breakdown: {
    location: number;            // 0-100
    condition: number;
    rentability: number;
    potential: number;
    workComplexity: number;
  };
  recommendation: 'excellent' | 'good' | 'average' | 'poor';
  narrative: string;             // Analyse textuelle complète
  pros: string[];
  cons: string[];
  keyInsights: string[];
}

async function generatePropertyScore(
  property: Property,
  rentability: RentabilityResults,
  aiAnalysis: VisionAnalysis,
  weights: ScoringWeights
): Promise<PropertyScore> {
  
  // 1. Calcul des scores individuels (0-100)
  
  // Score localisation (basé sur proximité services)
  const locationScore = calculateLocationScore(property.nearbyServices);
  
  // Score état (moyenne toiture + façades + intérieur)
  const conditionScore = calculateConditionScore(aiAnalysis);
  
  // Score rentabilité (netYield normalisé)
  const rentabilityScore = Math.min(100, (rentability.netYield / 8) * 100);
  
  // Score potentiel (ratio valeur après travaux / investissement)
  const potentialScore = calculatePotentialScore(property, rentability);
  
  // Score complexité travaux (inverse: moins de travaux = meilleur score)
  const workScore = 100 - Math.min(100, (rentability.breakdown.workCost / property.price) * 200);
  
  // 2. Score total pondéré
  const totalScore = Math.round(
    locationScore * weights.location +
    conditionScore * weights.condition +
    rentabilityScore * weights.rentability +
    potentialScore * weights.potential +
    workScore * weights.workComplexity
  );
  
  // 3. Génération narrative avec Claude
  const narrative = await generateNarrative(
    property,
    rentability,
    aiAnalysis,
    {
      totalScore,
      locationScore,
      conditionScore,
      rentabilityScore,
      potentialScore,
      workScore
    }
  );
  
  return {
    totalScore,
    breakdown: {
      location: locationScore,
      condition: conditionScore,
      rentability: rentabilityScore,
      potential: potentialScore,
      workComplexity: workScore
    },
    recommendation: 
      totalScore >= 80 ? 'excellent' :
      totalScore >= 65 ? 'good' :
      totalScore >= 50 ? 'average' : 'poor',
    ...narrative
  };
}

async function generateNarrative(
  property: Property,
  rentability: RentabilityResults,
  aiAnalysis: VisionAnalysis,
  scores: Record<string, number>
): Promise<{ narrative: string; pros: string[]; cons: string[]; keyInsights: string[] }> {
  
  const prompt = `Tu es un expert en investissement immobilier. Rédige une analyse détaillée de ce bien.

DONNÉES DU BIEN:
- Localisation: ${property.location}
- Prix: ${property.price.toLocaleString()}€
- Surface: ${property.surface}m²
- PEB: ${property.peb}
- Description: ${property.description}

ANALYSE VISUELLE:
- Toiture: ${aiAnalysis.roofEstimate.condition}, ${aiAnalysis.roofEstimate.estimatedSurface}m², travaux: ${aiAnalysis.roofEstimate.workNeeded.join(', ')}
- Façades: ${aiAnalysis.facadeEstimate.condition}, ${aiAnalysis.facadeEstimate.count} façade(s), ${aiAnalysis.facadeEstimate.totalSurface}m²
- Intérieur: ${aiAnalysis.interiorCondition?.overall || 'non évalué'}

RENTABILITÉ:
- Investissement total: ${rentability.totalInvestment.toLocaleString()}€
- Travaux estimés: ${rentability.breakdown.workCost.toLocaleString()}€
- Rendement brut: ${rentability.grossYield.toFixed(2)}%
- Rendement net: ${rentability.netYield.toFixed(2)}%
- Cash-flow mensuel: ${rentability.cashFlow.toFixed(0)}€

SCORES:
- Score total: ${scores.totalScore}/100
- Localisation: ${scores.locationScore}/100
- État: ${scores.conditionScore}/100
- Rentabilité: ${scores.rentabilityScore}/100

Rédige une analyse structurée en 3-4 paragraphes (300-400 mots):
1. Vue d'ensemble et première impression
2. Points forts détaillés
3. Points d'attention et risques
4. Conclusion et recommandation

Puis extrais:
- 4-5 points forts (phrases courtes)
- 4-5 points faibles (phrases courtes)
- 3 insights clés (observations importantes)

Format JSON:
{
  "narrative": "...",
  "pros": ["...", "..."],
  "cons": ["...", "..."],
  "keyInsights": ["...", "..."]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  const jsonText = response.content[0].text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
    
  return JSON.parse(jsonText);
}
```

### 3.7 Calcul proximité services (Sprint 3)

**Objectif**: Enrichir l'analyse avec données géographiques

```typescript
interface NearbyService {
  type: 'supermarket' | 'school' | 'transport' | 'hospital' | 'pharmacy' | 'park';
  name: string;
  distance: number;      // mètres
  walkTime: number;      // minutes
  coordinates: { lat: number; lng: number };
}

async function calculateNearbyServices(
  property: Property
): Promise<NearbyService[]> {
  
  if (!property.coordinates) {
    // Essayer de géocoder l'adresse
    const coords = await geocodeAddress(property.address || property.location);
    if (!coords) return [];
    
    // Update property
    await prisma.property.update({
      where: { id: property.id },
      data: { coordinates: coords }
    });
    
    property.coordinates = coords;
  }
  
  const { lat, lng } = property.coordinates as { lat: number; lng: number };
  
  // Utiliser Overpass API (OpenStreetMap) - gratuit
  const services: NearbyService[] = [];
  
  const queries = [
    { type: 'supermarket', overpassTag: 'shop=supermarket', radius: 1000 },
    { type: 'school', overpassTag: 'amenity=school', radius: 1000 },
    { type: 'transport', overpassTag: 'railway=station', radius: 1500 },
    { type: 'hospital', overpassTag: 'amenity=hospital', radius: 3000 },
    { type: 'pharmacy', overpassTag: 'amenity=pharmacy', radius: 500 },
    { type: 'park', overpassTag: 'leisure=park', radius: 1000 }
  ];
  
  for (const { type, overpassTag, radius } of queries) {
    const query = `
      [out:json];
      node["${overpassTag}"](around:${radius},${lat},${lng});
      out body 1;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    
    const data = await response.json();
    
    if (data.elements?.[0]) {
      const element = data.elements[0];
      const distance = haversineDistance(
        lat, lng,
        element.lat, element.lon
      );
      
      services.push({
        type: type as NearbyService['type'],
        name: element.tags?.name || `${type} proche`,
        distance: Math.round(distance),
        walkTime: Math.round(distance / 80), // 80m/min vitesse marche
        coordinates: { lat: element.lat, lng: element.lon }
      });
    }
  }
  
  return services;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // Utiliser Nominatim (OpenStreetMap) - gratuit avec rate limiting
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(address)}&format=json&limit=1`,
    {
      headers: {
        'User-Agent': 'ImmoScore/1.0' // Required by Nominatim
      }
    }
  );
  
  const data = await response.json();
  
  if (data[0]) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }
  
  return null;
}
```

## 4. Interface utilisateur

### 4.1 Design System

**Palette de couleurs**
```typescript
// Mint green principal (référence Izybizi)
const colors = {
  primary: {
    50: '#f0fdf9',
    100: '#ccfbef',
    200: '#99f6e0',
    300: '#5feace',
    400: '#2dd4b8', // Main mint
    500: '#14b8a5',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a'
  },
  neutral: {
    // Tailwind default grays
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
};
```

**Typography**
- Font principale: Inter (modern, excellent lisibilité)
- Font titres: Inter Bold
- Font mono: Fira Code (pour données numériques)

**Spacing & Layout**
- Mobile-first avec breakpoints: sm (640), md (768), lg (1024), xl (1280)
- Padding standard: 1rem (16px)
- Gap entre cards: 1.5rem (24px)
- Max-width container: 1280px

### 4.2 Pages et composants

#### **Page: Dashboard (Home)**

```typescript
// /app/dashboard/page.tsx

export default function DashboardPage() {
  const { properties, isLoading } = useProperties();
  const [showAddModal, setShowAddModal] = useState(false);
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mes biens</h1>
          <p className="text-gray-600 mt-1">
            {properties.length} bien{properties.length !== 1 ? 's' : ''} analysé{properties.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter des biens
        </Button>
      </div>
      
      {/* Filters & Sort */}
      <div className="flex gap-4 mb-6">
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Trier par..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Score (décroissant)</SelectItem>
            <SelectItem value="rentability">Rentabilité</SelectItem>
            <SelectItem value="price">Prix</SelectItem>
            <SelectItem value="date">Date d'ajout</SelectItem>
          </SelectContent>
        </Select>
        
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="completed">Complétés</SelectItem>
            <SelectItem value="analyzing">En analyse</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Properties Grid */}
      {isLoading ? (
        <PropertyGridSkeleton />
      ) : properties.length === 0 ? (
        <EmptyState onAddClick={() => setShowAddModal(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
      
      {/* Add Properties Modal */}
      <AddPropertiesModal 
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
```

#### **Composant: PropertyCard**

```typescript
// /components/PropertyCard.tsx

interface PropertyCardProps {
  property: Property & {
    rentabilityData?: RentabilityResults;
    aiScore?: number;
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const navigate = useNavigate();
  const mainPhoto = property.photos?.[0]?.publicUrl;
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/property/${property.id}`)}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        {mainPhoto ? (
          <img 
            src={mainPhoto} 
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Status Badge */}
        <Badge 
          className="absolute top-2 right-2"
          variant={
            property.status === 'COMPLETED' ? 'success' :
            property.status === 'ANALYZING' ? 'warning' :
            property.status === 'ERROR' ? 'destructive' : 'secondary'
          }
        >
          {property.status === 'COMPLETED' && 'Analysé'}
          {property.status === 'ANALYZING' && 'En cours...'}
          {property.status === 'ERROR' && 'Erreur'}
          {property.status === 'PENDING' && 'En attente'}
        </Badge>
        
        {/* Score Badge (si disponible) */}
        {property.aiScore && (
          <div className="absolute top-2 left-2 bg-white rounded-full px-3 py-1 shadow-md">
            <span className="font-bold text-lg">{property.aiScore}</span>
            <span className="text-sm text-gray-600">/100</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-1">
          {property.title || property.location}
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Prix</span>
            <span className="font-semibold">
              {property.price?.toLocaleString()}€
            </span>
          </div>
          
          {property.surface && (
            <div className="flex justify-between">
              <span className="text-gray-600">Surface</span>
              <span className="font-semibold">{property.surface}m²</span>
            </div>
          )}
          
          {property.rentabilityData && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-600">Rendement net</span>
                <span className="font-semibold text-primary-500">
                  {property.rentabilityData.netYield.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Cash-flow</span>
                <span className={cn(
                  "font-semibold",
                  property.rentabilityData.cashFlow > 0 
                    ? "text-success" 
                    : "text-error"
                )}>
                  {property.rentabilityData.cashFlow > 0 ? '+' : ''}
                  {property.rentabilityData.cashFlow.toFixed(0)}€/mois
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            window.open(property.sourceUrl, '_blank');
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Voir l'annonce
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### **Page: Property Detail**

```typescript
// /app/property/[id]/page.tsx

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { property, isLoading } = useProperty(id);
  
  if (isLoading) return <PropertyDetailSkeleton />;
  if (!property) return <NotFound />;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>
      
      {/* Header with Score */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{property.title}</h1>
          <p className="text-gray-600 text-lg">{property.location}</p>
        </div>
        
        {property.aiScore && (
          <ScoreDisplay 
            score={property.aiScore}
            recommendation={property.aiAnalysis?.recommendation}
          />
        )}
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="financials">Rentabilité</TabsTrigger>
          <TabsTrigger value="photos">Photos & Analyse</TabsTrigger>
          <TabsTrigger value="location">Localisation</TabsTrigger>
          <TabsTrigger value="edit">Modifier</TabsTrigger>
        </TabsList>
        
        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              icon={<EuroIcon />}
              label="Prix d'achat"
              value={`${property.price?.toLocaleString()}€`}
            />
            <MetricCard 
              icon={<HomeIcon />}
              label="Surface"
              value={`${property.surface}m²`}
            />
            <MetricCard 
              icon={<TrendingUpIcon />}
              label="Rendement net"
              value={`${property.rentabilityData?.netYield.toFixed(2)}%`}
              valueColor="text-primary-500"
            />
            <MetricCard 
              icon={<WrenchIcon />}
              label="Travaux estimés"
              value={`${property.rentabilityData?.breakdown.workCost.toLocaleString()}€`}
            />
          </div>
          
          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Analyse IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {property.aiAnalysis?.narrative}
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h4 className="font-semibold text-success mb-3">Points forts</h4>
                  <ul className="space-y-2">
                    {property.aiAnalysis?.pros.map((pro, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-success mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-error mb-3">Points d'attention</h4>
                  <ul className="space-y-2">
                    {property.aiAnalysis?.cons.map((con, i) => (
                      <li key={i} className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-error mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {property.aiAnalysis?.keyInsights && (
                <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                  <h4 className="font-semibold mb-2">💡 Insights clés</h4>
                  <ul className="space-y-1">
                    {property.aiAnalysis.keyInsights.map((insight, i) => (
                      <li key={i} className="text-sm">• {insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Détails du bien</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="PEB" value={property.peb} />
                <DetailItem label="Chambres" value={property.bedrooms} />
                <DetailItem label="Salles de bain" value={property.bathrooms} />
                <DetailItem label="Année construction" value={property.constructionYear} />
                {/* ... autres détails */}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Financials */}
        <TabsContent value="financials" className="mt-6">
          <RentabilityDetailView rentability={property.rentabilityData} />
        </TabsContent>
        
        {/* Tab: Photos */}
        <TabsContent value="photos" className="mt-6">
          <PhotosAnalysisView 
            photos={property.photos}
            analysis={property.aiAnalysis}
          />
        </TabsContent>
        
        {/* Tab: Location */}
        <TabsContent value="location" className="mt-6">
          <LocationView 
            coordinates={property.coordinates}
            nearbyServices={property.nearbyServices}
          />
        </TabsContent>
        
        {/* Tab: Edit */}
        <TabsContent value="edit" className="mt-6">
          <PropertyEditForm property={property} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### **Modal: Add Properties**

```typescript
// /components/AddPropertiesModal.tsx

export function AddPropertiesModal({ open, onClose }: Props) {
  const [urls, setUrls] = useState('');
  const [customParams, setCustomParams] = useState<Partial<RentabilityParams>>({});
  const { mutate: addProperties, isLoading } = useAddProperties();
  
  const handleSubmit = () => {
    const urlList = urls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);
    
    if (urlList.length === 0) {
      toast.error('Veuillez entrer au moins une URL');
      return;
    }
    
    addProperties(
      { urls: urlList, customParams },
      {
        onSuccess: () => {
          toast.success(`${urlList.length} bien(s) ajouté(s) - Analyse en cours`);
          setUrls('');
          onClose();
        },
        onError: (error) => {
          toast.error(`Erreur: ${error.message}`);
        }
      }
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter des biens immobiliers</DialogTitle>
          <DialogDescription>
            Collez les URLs des annonces (une par ligne). L'analyse démarrera automatiquement.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* URL Input */}
          <div>
            <Label htmlFor="urls">URLs des annonces</Label>
            <Textarea
              id="urls"
              placeholder={`https://www.immoweb.be/fr/annonce/...
https://www.logic-immo.be/fr/...`}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-1">
              {urls.split('\n').filter(u => u.trim().length > 0).length} URL(s)
            </p>
          </div>
          
          {/* Optional: Custom Parameters Accordion */}
          <Accordion type="single" collapsible>
            <AccordionItem value="params">
              <AccordionTrigger>
                Paramètres personnalisés (optionnel)
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label>Loyer mensuel estimé</Label>
                    <Input
                      type="number"
                      placeholder="1200"
                      onChange={(e) => setCustomParams(prev => ({
                        ...prev,
                        monthlyRent: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Budget travaux max</Label>
                    <Input
                      type="number"
                      placeholder="30000"
                      onChange={(e) => setCustomParams(prev => ({
                        ...prev,
                        maxWorkBudget: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter et analyser
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4.3 Composants réutilisables avec shadcn/ui

```bash
# Installation shadcn/ui
npx shadcn-ui@latest init

# Composants à installer
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add accordion
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add progress
```

## 5. Plan de développement

### Sprint 0: Fondations (Semaine 1)
- ✅ Setup projet (Next.js + TypeScript)
- ✅ Configuration Supabase + Prisma
- ✅ Intégration Clerk pour auth
- ✅ Design system de base (Tailwind + shadcn/ui)
- ✅ Layout principal avec navigation
- ✅ Page dashboard vide

### Sprint 1: Scraping & Storage (Semaine 2-3)
- ✅ Modal d'ajout d'URLs
- ✅ API endpoint `/api/properties/add`
- ✅ Scraper Immoweb + Generic scraper
- ✅ Job queue avec Upstash QStash
- ✅ Storage photos Supabase
- ✅ PropertyCard avec status
- ✅ Page détail basic

### Sprint 2: Analyse IA (Semaine 4-5)
- ✅ Intégration Claude Vision API
- ✅ Analyse photos (toiture, façades, intérieur)
- ✅ Calcul automatique des travaux
- ✅ UI pour affichage analyse visuelle
- ✅ Tests sur 10+ biens réels

### Sprint 3: Rentabilité & Scoring (Semaine 6-7)
- ✅ Moteur de calcul rentabilité
- ✅ Interface paramètres utilisateur
- ✅ Système de scoring pondéré
- ✅ Génération narrative avec Claude
- ✅ Dashboard avec tri par score/rentabilité
- ✅ Export PDF des analyses

### Sprint 4: Géolocalisation (Semaine 8)
- ✅ Intégration Nominatim pour géocodage
- ✅ Calcul proximité services (Overpass API)
- ✅ Carte interactive (Leaflet ou Mapbox)
- ✅ UI location tab

### Sprint 5: Polish & Optimisation (Semaine 9-10)
- ✅ Mode édition manuelle des données
- ✅ Système de favoris/notes
- ✅ Comparateur de biens
- ✅ Mobile responsive final
- ✅ Performance optimization
- ✅ Error handling complet
- ✅ Tests utilisateurs
- ✅ Documentation

## 6. Considérations techniques supplémentaires

### 6.1 Performance & Scalabilité

**Caching Strategy**
```typescript
// TanStack Query config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 10 * 60 * 1000,     // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Cache côté serveur avec Redis
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

async function getCachedPropertyData(url: string) {
  const cached = await redis.get(`property:${url}`);
  if (cached) return JSON.parse(cached as string);
  
  const data = await scrapeProperty(url);
  await redis.set(`property:${url}`, JSON.stringify(data), {
    ex: 60 * 60 * 24 * 7 // 7 days
  });
  
  return data;
}
```

**Rate Limiting**
```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min
  analytics: true
});

// Middleware API
export async function rateLimitMiddleware(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  return null;
}
```

**Image Optimization**
```typescript
// Compression avant upload
import sharp from 'sharp';

async function optimizeAndUploadImage(buffer: Buffer, path: string) {
  const optimized = await sharp(buffer)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
  
  return supabase.storage
    .from('property-photos')
    .upload(path, optimized, { contentType: 'image/jpeg' });
}
```

### 6.2 Error Handling & Monitoring

**Sentry Integration**
```typescript
// sentry.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  }
});

// Usage dans les APIs
try {
  await scrapeProperty(url);
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'scraper', url },
    extra: { propertyId }
  });
  
  throw new Error('Scraping failed - team notified');
}
```

**Graceful Degradation**
```typescript
// Si analyse IA échoue, continuer avec données de base
async function analyzeProperty(property: Property) {
  let aiAnalysis = null;
  
  try {
    aiAnalysis = await analyzeWithClaude(property);
  } catch (error) {
    console.error('AI analysis failed, using fallback', error);
    
    aiAnalysis = {
      workEstimate: { total: 0, breakdown: {} },
      aiScore: 50, // Score neutre
      narrative: 'Analyse IA indisponible. Données de base disponibles.'
    };
  }
  
  return {
    ...property,
    aiAnalysis
  };
}
```

### 6.3 Testing Strategy

**Unit Tests (Jest + React Testing Library)**
```typescript
// __tests__/calculateRentability.test.ts
import { calculateRentability } from '@/lib/rentability';

describe('calculateRentability', () => {
  it('calculates correct net yield', () => {
    const result = calculateRentability(
      { price: 200000, surface: 100 },
      {
        monthlyRent: 1200,
        notaryFeesPercent: 12.5,
        // ... autres params
      },
      mockAiAnalysis
    );
    
    expect(result.netYield).toBeCloseTo(5.2, 1);
  });
});
```

**E2E Tests (Playwright)**
```typescript
// e2e/add-property.spec.ts
import { test, expect } from '@playwright/test';

test('user can add and analyze property', async ({ page }) => {
  await page.goto('/dashboard');
  
  await page.click('text=Ajouter des biens');
  await page.fill('textarea', 'https://www.immoweb.be/fr/annonce/...');
  await page.click('text=Ajouter et analyser');
  
  await expect(page.locator('text=En cours...')).toBeVisible();
  
  // Wait for analysis (avec timeout)
  await page.waitForSelector('text=Analysé', { timeout: 60000 });
});
```

## 7. Déploiement & Infrastructure

### 7.1 Variables d'environnement

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7.2 Déploiement Vercel

```json
// vercel.json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["ams1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "DATABASE_URL": "@database-url"
  }
}
```

## 8. Métriques de succès

### KPIs Techniques
- **Temps d'analyse**: < 3 minutes par bien
- **Taux de succès scraping**: > 90%
- **Précision estimation travaux**: ±15% (validé manuellement)
- **Uptime**: > 99.5%
- **Performance Lighthouse**: > 90 sur tous les critères

### KPIs Produit
- **Temps d'évaluation utilisateur**: < 10 minutes pour 5 biens
- **Taux de conversion URL → Analyse complétée**: > 85%
- **NPS**: > 50
- **Rétention J7**: > 60%

---

**Version**: 1.0  
**Date**: Décembre 2024  
**Author**: Angelo - Immo-Score Product Team
