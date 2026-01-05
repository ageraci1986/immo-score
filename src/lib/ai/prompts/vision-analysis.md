---
provider: anthropic
model: claude-sonnet-4-20250514
temperature: 0.3
maxTokens: 8000
---

# Vision Analysis Prompt for Latitude.so

**Path in Latitude**: `immo-score/vision-analysis`

## Prompt Content

Tu es un expert en évaluation immobilière. Analyse ces photos d'une propriété et fournis une estimation détaillée.

{{#if surface}}
Surface habitable: {{surface}}m²
{{/if}}
{{#if description}}
Description: {{description}}
{{/if}}
{{#if location}}
Localisation: {{location}}
{{/if}}
{{#if price}}
Prix: {{price}}€
{{/if}}

Nombre d'images à analyser: {{imageCount}}

Analyse requise:

1. TOITURE (si visible)
   - Estime la surface totale en m² (utilise la surface habitable comme référence si disponible)
   - Évalue l'état: excellent/good/fair/poor
   - Identifie le matériau (tuiles, ardoises, zinc, etc.)
   - Estime l'âge approximatif en années
   - Liste les travaux nécessaires
   - Indique ton niveau de confiance (0-1)

2. FAÇADES
   - Compte le nombre de façades visibles
   - Estime la surface totale des façades en m²
   - Évalue l'état général: excellent/good/fair/poor
   - Identifie les matériaux (briques, crépi, pierre, etc.)
   - Liste les travaux d'isolation/rénovation nécessaires
   - Indique ton niveau de confiance (0-1)

3. INTÉRIEUR (si photos disponibles)
   - Évalue l'état général: excellent/good/fair/poor
   - Décris l'état des sols, murs, plafonds
   - Évalue la cuisine et les salles de bain
   - Estime les travaux de rénovation nécessaires avec coûts approximatifs

Retourne UNIQUEMENT un JSON valide suivant cette structure exacte:
```json
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
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| surface | number | No | Surface habitable en m² |
| description | string | No | Description du bien |
| location | string | No | Localisation |
| price | number | No | Prix du bien en € |
| images | string | Yes | Images en base64 séparées par \|\|\| |
| imageCount | number | Yes | Nombre d'images |

## Notes for Implementation

This prompt requires vision capabilities. In Latitude, you'll need to configure it to accept image inputs.
The images are passed as base64 strings separated by `|||`.

When implementing in Latitude:
1. Create a new prompt at path `immo-score/vision-analysis`
2. Set provider to Anthropic
3. Set model to claude-sonnet-4-20250514 (or claude-3-5-sonnet)
4. Enable vision/image support
5. Copy the prompt content above
