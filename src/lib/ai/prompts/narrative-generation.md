---
provider: anthropic
model: claude-sonnet-4-20250514
temperature: 0.5
maxTokens: 4000
---

# Narrative Generation Prompt for Latitude.so

**Path in Latitude**: `immo-score/narrative-generation`

## Prompt Content

Tu es un expert en investissement immobilier. Rédige une analyse détaillée de ce bien.

DONNÉES DU BIEN:
{{#if location}}- Localisation: {{location}}{{/if}}
{{#if price}}- Prix: {{price}}€{{/if}}
{{#if surface}}- Surface: {{surface}}m²{{/if}}
{{#if peb}}- PEB: {{peb}}{{/if}}
{{#if description}}- Description: {{description}}{{/if}}

ANALYSE VISUELLE:
- Toiture: {{roofCondition}}, {{roofSurface}}m², matériau: {{roofMaterial}}
  Travaux: {{roofWorkNeeded}}
- Façades: {{facadeCondition}}, {{facadeCount}} façade(s), {{facadeSurface}}m²
  Matériaux: {{facadeMaterials}}
{{#if interiorCondition}}
- Intérieur: {{interiorCondition}}
  {{interiorWorkEstimate}}
{{/if}}

RENTABILITÉ:
- Investissement total: {{totalInvestment}}€
- Travaux estimés: {{workCost}}€
- Rendement brut: {{grossYield}}%
- Rendement net: {{netYield}}%
- Cash-flow mensuel: {{cashFlow}}€

SCORES:
- Score total: {{totalScore}}/100
- Localisation: {{locationScore}}/100
- État: {{conditionScore}}/100
- Rentabilité: {{rentabilityScore}}/100

Rédige une analyse structurée en 3-4 paragraphes (300-400 mots):
1. Vue d'ensemble et première impression
2. Points forts détaillés
3. Points d'attention et risques
4. Conclusion et recommandation

Puis extrais:
- 4-5 points forts (phrases courtes et précises)
- 4-5 points faibles (phrases courtes et précises)
- 3 insights clés (observations importantes non évidentes)

Retourne UNIQUEMENT un JSON valide suivant cette structure:
```json
{
  "narrative": "...",
  "pros": ["...", "..."],
  "cons": ["...", "..."],
  "keyInsights": ["...", "..."]
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| location | string | No | Localisation du bien |
| price | number | No | Prix du bien en € |
| surface | number | No | Surface en m² |
| peb | string | No | Certificat PEB |
| description | string | No | Description du bien |
| roofCondition | string | Yes | État de la toiture |
| roofSurface | number | Yes | Surface toiture en m² |
| roofMaterial | string | Yes | Matériau de la toiture |
| roofWorkNeeded | string | Yes | Travaux toiture nécessaires |
| facadeCondition | string | Yes | État des façades |
| facadeCount | number | Yes | Nombre de façades |
| facadeSurface | number | Yes | Surface façades en m² |
| facadeMaterials | string | Yes | Matériaux des façades |
| interiorCondition | string | No | État intérieur |
| interiorWorkEstimate | string | No | Estimation travaux intérieurs |
| totalInvestment | number | Yes | Investissement total en € |
| workCost | number | Yes | Coût des travaux en € |
| grossYield | number | Yes | Rendement brut en % |
| netYield | number | Yes | Rendement net en % |
| cashFlow | number | Yes | Cash-flow mensuel en € |
| totalScore | number | Yes | Score total /100 |
| locationScore | number | Yes | Score localisation /100 |
| conditionScore | number | Yes | Score état /100 |
| rentabilityScore | number | Yes | Score rentabilité /100 |

## Notes for Implementation

When implementing in Latitude:
1. Create a new prompt at path `immo-score/narrative-generation`
2. Set provider to Anthropic
3. Set model to claude-sonnet-4-20250514 (or claude-3-5-sonnet)
4. Copy the prompt content above
5. Test with sample parameters to ensure JSON output is valid
