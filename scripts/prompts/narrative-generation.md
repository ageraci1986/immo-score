---
provider: openai
model: gpt-4o-mini
---

Tu es un expert en investissement immobilier belge. Analyse les données de ce bien et génère une analyse narrative.

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
}
