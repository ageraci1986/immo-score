import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db/client';
import { logDebug, logError, logInfo } from '@/lib/logger';
import { AIAnalysisError } from '@/lib/errors';

/**
 * Known prompt slugs used by the application
 */
export const PROMPT_SLUGS = {
  VISION_ANALYSIS: 'vision-analysis',
  NARRATIVE_GENERATION: 'narrative-generation',
  COST_ESTIMATION: 'cost-estimation',
  EMAIL_SUMMARY: 'email-summary',
  COLOC_PRE_FILTER: 'coloc-pre-filter',
} as const;

export type PromptSlug = (typeof PROMPT_SLUGS)[keyof typeof PROMPT_SLUGS];

/**
 * Interpolates {{variable}} placeholders in a prompt template
 */
function interpolatePrompt(template: string, parameters: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = parameters[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

/**
 * Gets the API key for a given provider, first from DB then from env fallback
 */
async function getApiKey(provider: string): Promise<string> {
  // Try DB first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbProvider = await (prisma as any).aiProvider.findUnique({
    where: { provider },
    select: { apiKey: true, isActive: true },
  });

  if (dbProvider?.isActive && dbProvider.apiKey) {
    return dbProvider.apiKey;
  }

  // Fallback to environment variable
  const envKeys: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
  };

  const envKey = envKeys[provider];
  if (envKey && process.env[envKey]) {
    return process.env[envKey] as string;
  }

  throw new AIAnalysisError(`No API key found for provider: ${provider}`, { provider });
}

/**
 * Fetches a prompt from the database by slug
 */
export async function getPromptBySlug(slug: string): Promise<{
  content: string;
  model: string;
  provider: string;
  maxTokens: number;
  temperature: number;
} | null> {
  const prompt = await prisma.aiPrompt.findUnique({
    where: { slug },
    select: {
      content: true,
      model: true,
      provider: true,
      maxTokens: true,
      temperature: true,
      isActive: true,
    },
  });

  if (!prompt || !prompt.isActive) return null;

  return {
    content: prompt.content,
    model: prompt.model,
    provider: prompt.provider,
    maxTokens: prompt.maxTokens,
    temperature: prompt.temperature,
  };
}

/**
 * Executes a prompt via Anthropic (Claude)
 */
async function executeAnthropicPrompt(
  apiKey: string,
  model: string,
  content: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new AIAnalysisError('Empty response from Anthropic');
  }

  logInfo('Anthropic prompt executed', {
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  return textBlock.text;
}

/**
 * Executes a prompt via OpenAI (GPT)
 */
async function executeOpenAIPrompt(
  apiKey: string,
  model: string,
  content: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AIAnalysisError(`OpenAI API error: ${response.status}`, { error });
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new AIAnalysisError('Empty response from OpenAI');
  }

  logInfo('OpenAI prompt executed', {
    model,
    usage: data.usage,
  });

  return text;
}

/**
 * Executes a prompt via Google (Gemini)
 */
async function executeGooglePrompt(
  apiKey: string,
  model: string,
  content: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const modelId = model.startsWith('models/') ? model : `models/${model}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: content }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AIAnalysisError(`Google API error: ${response.status}`, { error });
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AIAnalysisError('Empty response from Google');
  }

  logInfo('Google prompt executed', { model });

  return text;
}

/**
 * Runs a prompt from the database using the configured AI provider
 *
 * @param slug - The prompt slug identifier
 * @param parameters - Template variables to interpolate
 * @returns The AI response text
 * @throws {AIAnalysisError} When the prompt is not found or execution fails
 */
export async function runPrompt(
  slug: string,
  parameters: Record<string, unknown>
): Promise<string> {
  logDebug('Running prompt from DB', { slug, parameterKeys: Object.keys(parameters) });

  const promptConfig = await getPromptBySlug(slug);
  if (!promptConfig) {
    throw new AIAnalysisError(`Prompt not found or inactive: ${slug}`, { slug });
  }

  const interpolatedContent = interpolatePrompt(promptConfig.content, parameters);
  const apiKey = await getApiKey(promptConfig.provider);

  logDebug('Prompt interpolated', {
    slug,
    provider: promptConfig.provider,
    model: promptConfig.model,
    contentLength: interpolatedContent.length,
  });

  try {
    switch (promptConfig.provider) {
      case 'anthropic':
        return await executeAnthropicPrompt(
          apiKey,
          promptConfig.model,
          interpolatedContent,
          promptConfig.maxTokens,
          promptConfig.temperature,
        );

      case 'openai':
        return await executeOpenAIPrompt(
          apiKey,
          promptConfig.model,
          interpolatedContent,
          promptConfig.maxTokens,
          promptConfig.temperature,
        );

      case 'google':
        return await executeGooglePrompt(
          apiKey,
          promptConfig.model,
          interpolatedContent,
          promptConfig.maxTokens,
          promptConfig.temperature,
        );

      default:
        throw new AIAnalysisError(`Unsupported provider: ${promptConfig.provider}`, {
          provider: promptConfig.provider,
        });
    }
  } catch (error) {
    if (error instanceof AIAnalysisError) throw error;

    logError('AI prompt execution failed', error as Error, { slug, provider: promptConfig.provider });
    throw new AIAnalysisError(`Failed to execute prompt: ${slug}`, {
      cause: error,
      slug,
      provider: promptConfig.provider,
    });
  }
}

/**
 * Seeds the default prompts into the database if they don't exist
 */
export async function seedDefaultPrompts(): Promise<void> {
  const defaults = [
    {
      slug: PROMPT_SLUGS.VISION_ANALYSIS,
      name: 'Analyse Visuelle',
      description: 'Analyse les photos de propriétés pour estimer l\'état de la toiture, façades et intérieur',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.2,
      content: VISION_ANALYSIS_PROMPT,
    },
    {
      slug: PROMPT_SLUGS.NARRATIVE_GENERATION,
      name: 'Génération Narrative',
      description: 'Génère une analyse narrative d\'investissement avec pros/cons et insights',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.5,
      content: NARRATIVE_GENERATION_PROMPT,
    },
    {
      slug: PROMPT_SLUGS.COST_ESTIMATION,
      name: 'Estimation des Coûts',
      description: 'Estime les coûts de rénovation, assurance et potentiel locatif',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.3,
      content: COST_ESTIMATION_PROMPT,
    },
    {
      slug: PROMPT_SLUGS.EMAIL_SUMMARY,
      name: 'Résumé Email',
      description: 'Génère un résumé court et percutant d\'un bien pour les alertes email',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 1024,
      temperature: 0.4,
      content: EMAIL_SUMMARY_PROMPT,
    },
  ];

  for (const prompt of defaults) {
    await prisma.aiPrompt.upsert({
      where: { slug: prompt.slug },
      update: {},
      create: {
        slug: prompt.slug,
        name: prompt.name,
        description: prompt.description,
        content: prompt.content,
        model: prompt.model,
        provider: 'anthropic',
        maxTokens: prompt.maxTokens,
        temperature: prompt.temperature,
      },
    });
  }

  logInfo('Default prompts seeded successfully');
}

// ─── Default prompt templates ────────────────────────────────────────────────

const VISION_ANALYSIS_PROMPT = `Tu es un expert en immobilier belge spécialisé dans l'analyse de photos de propriétés et l'estimation des surfaces pour travaux de rénovation.

Contexte du bien:
- Surface HABITABLE: {{surface}} m² (attention: ce n'est PAS la surface des façades ou de la toiture!)
- Localisation: {{location}}
- Prix: {{price}}€
- Description: {{description}}

Nombre d'images à analyser: {{imageCount}}

URLs des images:
{{imageUrls}}

INSTRUCTIONS D'ANALYSE:

1. TOITURE - Estimation de la surface:
   - Observe le type de toiture sur les images (pente, plate, mansardée)
   - Pour une maison mitoyenne (2 façades): surface toiture ≈ surface habitable × 0.4 à 0.6
   - Pour une maison 3 façades: surface toiture ≈ surface habitable × 0.5 à 0.7
   - Pour une maison 4 façades: surface toiture ≈ surface habitable × 0.6 à 0.8
   - Toit plat: surface ≈ surface habitable ÷ nombre d'étages
   - Toit en pente: ajouter 20-40% pour la surface réelle (selon inclinaison)
   - Si visible dans la description, utilise ces informations en priorité

2. FAÇADES - Estimation des surfaces:
   - Compte le nombre de façades visibles + déduites (mitoyenne = généralement 2 façades)
   - Estime la HAUTEUR du bâtiment (RDC ≈ 3m, par étage ≈ 2.8m)
   - Estime la LARGEUR de façade (souvent 5-8m pour maison mitoyenne belge)
   - Surface façade = hauteur × largeur × nombre de façades
   - Déduis les surfaces des fenêtres/portes (environ 15-25% de la surface)
   - Exemple: Maison 2 façades, 2 étages, 6m de large = 2 × (6m × 6m) × 0.8 = ~58 m²

3. ÉTAT DU BIEN - Évalue visuellement:
   - Toiture: traces d'humidité, mousse, tuiles cassées/manquantes, état des gouttières
   - Façades: fissures, joints dégradés, peinture écaillée, traces d'humidité
   - Intérieur: état des sols, murs, plafonds, cuisine, salle de bain

4. POTENTIEL DE CRÉATION DE CHAMBRES (important pour investissement en colocation):
   - Combles: sont-ils aménageables? (hauteur sous faîte, présence de velux/fenêtres, accès)
   - Grandes pièces: y a-t-il des pièces assez grandes pour être divisées en 2 chambres?
   - Garage/annexe: convertible en chambre?
   - Sous-sol: est-il semi-enterré avec lumière naturelle?
   - Indique le nombre de chambres supplémentaires réalistes à créer
   - Si aucune opportunité, indique 0

Retourne UNIQUEMENT un JSON valide:
{
  "roofEstimate": {
    "condition": "excellent" | "good" | "fair" | "poor",
    "material": "tuiles" | "ardoises" | "zinc" | "toit plat" | "autre" | "unknown",
    "estimatedSurface": <surface en m² calculée selon les règles ci-dessus>,
    "estimatedAge": <âge estimé en années>,
    "workNeeded": ["travail1", "travail2"],
    "confidence": <0.0 à 1.0>,
    "calculationNote": "<explication courte du calcul de surface>"
  },
  "facadeEstimate": {
    "condition": "excellent" | "good" | "fair" | "poor",
    "materials": ["brique", "crépi", "etc"],
    "count": <nombre de façades>,
    "totalSurface": <surface TOTALE des façades en m² calculée selon les règles>,
    "facadeHeight": <hauteur estimée en mètres>,
    "facadeWidth": <largeur moyenne estimée en mètres>,
    "workNeeded": ["travail1"],
    "confidence": <0.0 à 1.0>,
    "calculationNote": "<explication courte du calcul de surface>"
  },
  "interiorCondition": {
    "overall": "excellent" | "good" | "fair" | "poor",
    "flooring": "bon état" | "à rafraîchir" | "à remplacer" | "unknown",
    "walls": "bon état" | "à rafraîchir" | "à remplacer" | "unknown",
    "ceilings": "bon état" | "à rafraîchir" | "à remplacer" | "unknown",
    "kitchen": "moderne" | "fonctionnelle" | "à rénover" | "unknown",
    "bathrooms": "moderne" | "fonctionnelle" | "à rénover" | "unknown",
    "workEstimate": "minimal" | "moderate" | "significant" | "major"
  },
  "roomCreationPotential": {
    "possibleExtraRooms": <nombre de chambres supplémentaires créables (0 si aucune)>,
    "opportunities": ["combles aménageables", "grande pièce divisible", "garage convertible", etc.],
    "reasoning": "<explication courte: pourquoi ces chambres sont créables ou non>"
  }
}

IMPORTANT:
- Retourne UNIQUEMENT le JSON, sans texte avant ou après
- Les surfaces de toiture et façades doivent être RÉALISTES pour une estimation de travaux d'isolation
- Ne confonds pas surface habitable avec surface de toiture ou façades!`;

const NARRATIVE_GENERATION_PROMPT = `Tu es un expert en investissement immobilier belge. Analyse les données de ce bien et génère une analyse narrative.

Données du bien:
- Localisation: {{location}}
- Prix: {{price}}€
- Surface: {{surface}} m²
- PEB: {{peb}}
- Description: {{description}}

État du bien (issu de l'analyse visuelle):
- Toiture: {{roofCondition}} ({{roofMaterial}}, {{roofSurface}} m²)
  Travaux nécessaires: {{roofWorkNeeded}}
- Façades: {{facadeCondition}} ({{facadeCount}} façades, {{facadeSurface}} m²)
  Matériaux: {{facadeMaterials}}
- Intérieur: {{interiorCondition}} (travaux: {{interiorWorkEstimate}})

Données de rentabilité:
- Investissement total: {{totalInvestment}}€
- Coût des travaux: {{workCost}}€
- Rendement brut: {{grossYield}}%
- Rendement net: {{netYield}}%
- Cash flow mensuel: {{cashFlow}}€

Scores:
- Score total: {{totalScore}}/100
- Localisation: {{locationScore}}/30
- État du bien: {{conditionScore}}/30
- Rentabilité: {{rentabilityScore}}/40

Génère une analyse narrative complète avec:
1. Un résumé narratif de 2-3 phrases
2. Les points forts (3-5 éléments)
3. Les points faibles (3-5 éléments)
4. Les insights clés pour l'investisseur (3-5 éléments)

Retourne UNIQUEMENT un JSON valide:
{
  "narrative": "Résumé narratif du bien...",
  "pros": ["point fort 1", "point fort 2", "point fort 3"],
  "cons": ["point faible 1", "point faible 2", "point faible 3"],
  "keyInsights": ["insight 1", "insight 2", "insight 3"]
}`;

const COST_ESTIMATION_PROMPT = `Tu es un expert en estimation de coûts immobiliers et rénovation énergétique en Belgique. Estime les coûts pour ce bien en tenant compte de l'amélioration du PEB.

Données du bien:
- Localisation: {{location}}
- Type: {{propertyType}}
- Surface habitable: {{surface}} m²
- Chambres: {{bedrooms}}
- Année de construction: {{constructionYear}}
- PEB actuel: {{peb}}
- Prix: {{price}}€

État du bien (issu de l'analyse visuelle):
- Toiture: {{roofCondition}} ({{roofMaterial}}, {{roofSurface}} m²)
  Travaux nécessaires: {{roofWorkNeeded}}
- Façades: {{facadeCondition}} ({{facadeCount}} façades, {{facadeSurface}} m², matériaux: {{facadeMaterials}})
  Travaux nécessaires: {{facadeWorkNeeded}}
- Intérieur: {{interiorCondition}} (estimation des travaux: {{interiorWorkEstimate}})

IMPORTANT - Règles d'estimation:
1. Pour améliorer le PEB, l'ISOLATION est obligatoire:
   - Isolation toiture: calcule en fonction de {{roofSurface}} m² (environ 40-60€/m²)
   - Isolation façades: calcule en fonction de {{facadeCount}} façades et {{facadeSurface}} m² (environ 100-150€/m² pour isolation par l'extérieur)
2. Châssis/fenêtres: si PEB mauvais (D, E, F, G), prévoir remplacement
3. Chauffage: si ancien système, prévoir mise à jour (pompe à chaleur, chaudière condensation)

Contexte d'investissement:
- Type d'investissement: {{investmentType}}
- Loyer par unité configuré: {{rentPerUnit}}€
- Chambres supplémentaires potentielles (d'après analyse visuelle): {{potentialExtraRooms}}

Si l'investisseur prévoit de créer des chambres supplémentaires (combles, division de pièces), inclus le coût des travaux d'aménagement dans le breakdown (poste "roomCreation").

Estime:
1. Le coût total des travaux avec détail par poste
2. L'assurance annuelle (habitation + incendie)
3. Le loyer mensuel potentiel (marché locatif belge)
4. Le loyer par chambre

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "estimatedWorkCost": 45000,
  "workBreakdown": {
    "roofInsulation": 4800,
    "facadeInsulation": 15000,
    "windowsReplacement": 8000,
    "heatingSystem": 6000,
    "kitchen": 5000,
    "bathroom": 4000,
    "flooring": 3000,
    "painting": 2000,
    "electrical": 2000,
    "plumbing": 1500,
    "roomCreation": 0,
    "other": 0
  },
  "estimatedInsurance": 350,
  "estimatedMonthlyRent": 1200,
  "rentPerRoom": 400,
  "confidence": 0.7,
  "reasoning": "Explication détaillée: isolation toiture X m² à Y€/m², isolation façades X façades de Y m² à Z€/m², etc."
}`;

const EMAIL_SUMMARY_PROMPT = `Tu es un expert en investissement immobilier belge. Rédige un résumé concis pour une alerte email destinée à un investisseur.

IMPORTANT: Les chiffres clés (rendement, cash flow, coût travaux) sont déjà affichés séparément dans l'email. Ne les répète PAS. Concentre-toi sur l'analyse QUALITATIVE.

Données du bien:
- Titre: {{title}}
- Localisation: {{location}}
- Prix: {{price}}€
- Surface: {{surface}} m²
- Chambres: {{bedrooms}}
- Score Immo-Score: {{score}}/100
- PEB: {{peb}}

Analyse AI:
- Points forts: {{pros}}
- Points faibles: {{cons}}
- Rendement net: {{netYield}}%
- Cash flow mensuel: {{cashFlow}}€
- Coût travaux estimé: {{workCost}}€

Rédige 2-3 phrases qui:
1. Donnent un verdict clair (opportunité intéressante, à surveiller, risquée...)
2. Expliquent POURQUOI (localisation, état, potentiel de plus-value...)
3. Signalent LE point d'attention le plus important

Ton: direct, expert, comme un conseil entre investisseurs. Pas de formules de politesse.

Retourne UNIQUEMENT le texte du résumé, sans guillemets, sans JSON, sans markdown.`;
