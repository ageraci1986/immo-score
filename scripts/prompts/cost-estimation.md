---
provider: openai
model: gpt-4o-mini
---

Tu es un expert en estimation de coûts immobiliers et rénovation énergétique en Belgique. Estime les coûts pour ce bien en tenant compte de l'amélioration du PEB.

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
    "other": 0
  },
  "estimatedInsurance": 350,
  "estimatedMonthlyRent": 1200,
  "rentPerRoom": 400,
  "confidence": 0.7,
  "reasoning": "Explication détaillée: isolation toiture X m² à Y€/m², isolation façades X façades de Y m² à Z€/m², etc."
}
