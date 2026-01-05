# Guide de Contribution - Immo-Score

Merci de vouloir contribuer à Immo-Score ! Ce document explique comment contribuer efficacement au projet.

## 📋 Table des Matières

1. [Code de Conduite](#code-de-conduite)
2. [Comment Contribuer](#comment-contribuer)
3. [Standards de Code](#standards-de-code)
4. [Workflow Git](#workflow-git)
5. [Pull Requests](#pull-requests)
6. [Rapporter des Bugs](#rapporter-des-bugs)
7. [Proposer des Features](#proposer-des-features)

## Code de Conduite

- Soyez respectueux et professionnel
- Acceptez les critiques constructives
- Concentrez-vous sur ce qui est le mieux pour la communauté
- Faites preuve d'empathie envers les autres membres

## Comment Contribuer

### 1. Setup de Développement

```bash
# Fork le repo sur GitHub
# Cloner votre fork
git clone https://github.com/VOTRE-USERNAME/TLM.git
cd TLM

# Ajouter le repo principal comme upstream
git remote add upstream https://github.com/ORIGINAL-OWNER/TLM.git

# Installer les dépendances
npm install

# Configurer l'environnement (voir INSTALLATION.md)
cp .env.example .env.local
# Remplir .env.local avec vos clés
```

### 2. Créer une Branche

```bash
# Mettre à jour votre main
git checkout main
git pull upstream main

# Créer une branche feature
git checkout -b feature/ma-super-feature

# OU pour un bug fix
git checkout -b fix/correction-bug
```

### 3. Développer

- Respecter les standards (voir [claude.md](claude.md))
- Écrire des tests pour la nouvelle logique
- Commiter régulièrement avec des messages clairs

### 4. Tester

```bash
# Vérifier les types
npm run type-check

# Linter le code
npm run lint

# Lancer les tests
npm run test

# Construire l'application
npm run build
```

### 5. Soumettre

```bash
# Push vers votre fork
git push origin feature/ma-super-feature

# Ouvrir une Pull Request sur GitHub
```

## Standards de Code

### TypeScript

- ✅ **Mode strict activé** - Pas de `any`
- ✅ **Types explicites** - Tous les retours de fonction typés
- ✅ **Readonly quand possible** - Immutabilité par défaut
- ✅ **Interfaces > Types** - Pour les objets

```typescript
// ❌ BAD
function calculate(data: any) {
  return data.price * 1.2;
}

// ✅ GOOD
interface PropertyData {
  readonly price: number;
  readonly surface: number;
}

function calculateWithTax(data: PropertyData): number {
  const TAX_RATE = 1.2;
  return data.price * TAX_RATE;
}
```

### Naming Conventions

- **Files**: kebab-case (`property-card.tsx`)
- **Components**: PascalCase (`PropertyCard`)
- **Functions**: camelCase (`calculateRentability`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PROPERTIES`)
- **Interfaces**: PascalCase (`PropertyData`)

### Structure des Fichiers

```typescript
// Imports (groupés et triés)
import { type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';

// Types/Interfaces
interface PropertyCardProps {
  readonly property: Property;
  readonly onSelect?: (id: string) => void;
}

// Constantes
const DEFAULT_IMAGE = '/placeholder.jpg';

// Composant
export const PropertyCard: FC<PropertyCardProps> = ({ property, onSelect }) => {
  // Hooks
  const { data } = useQuery(...);

  // Event handlers
  const handleClick = () => {
    onSelect?.(property.id);
  };

  // Render
  return (
    <div onClick={handleClick}>
      {/* JSX */}
    </div>
  );
};
```

### Error Handling

Toujours gérer les erreurs explicitement:

```typescript
import { PropertyScrapingError } from '@/lib/errors';
import { logError } from '@/lib/logger';

async function scrapeProperty(url: string): Promise<PropertyData> {
  try {
    const data = await fetchPropertyData(url);
    return parsePropertyData(data);
  } catch (error) {
    logError('Property scraping failed', error as Error, { url });

    throw new PropertyScrapingError(
      `Failed to scrape property from ${url}`,
      { cause: error }
    );
  }
}
```

### Testing

Écrire des tests pour:
- ✅ Business logic (functions pures)
- ✅ Calculs (rentabilité, scoring)
- ✅ Utilities
- ✅ API routes
- ✅ Composants critiques

```typescript
// example.test.ts
import { describe, it, expect } from 'vitest';
import { calculateRentability } from './calculate';

describe('calculateRentability', () => {
  it('should calculate correct net yield', () => {
    const result = calculateRentability({
      property: { price: 200000, surface: 100 },
      params: mockParams,
      aiAnalysis: mockAnalysis,
    });

    expect(result.netYield).toBeCloseTo(5.2, 1);
  });
});
```

## Workflow Git

### Branches

- `main` - Production (protégée)
- `develop` - Integration (protégée)
- `feature/*` - Nouvelles fonctionnalités
- `fix/*` - Corrections de bugs
- `refactor/*` - Refactoring
- `docs/*` - Documentation

### Commits

Utiliser les [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `refactor`: Refactoring
- `perf`: Amélioration de performance
- `test`: Ajout de tests
- `docs`: Documentation
- `chore`: Maintenance
- `style`: Formatage (pas de changement de logique)

**Exemples**:

```bash
git commit -m "feat(scraping): add support for Logic-Immo website"
git commit -m "fix(rentability): correct cash flow calculation"
git commit -m "docs(api): update endpoint documentation"
git commit -m "refactor(ai): simplify vision analysis logic"
```

### Pre-commit Hooks

Les hooks exécutent automatiquement:
1. Nettoyage des fichiers temporaires
2. Linting (ESLint)
3. Formatage (Prettier)
4. Type checking (TypeScript)

Si un hook échoue, le commit est bloqué. Corriger les erreurs et recommiter.

## Pull Requests

### Avant de Soumettre

- [ ] Code fonctionne localement
- [ ] Tests passent (`npm run test`)
- [ ] Types sont corrects (`npm run type-check`)
- [ ] Code est linté (`npm run lint`)
- [ ] Build réussit (`npm run build`)
- [ ] Documentation à jour si nécessaire

### Template de PR

```markdown
## Description
[Décrire les changements]

## Type de changement
- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Tests
- [ ] Tests unitaires ajoutés
- [ ] Tests E2E ajoutés (si applicable)
- [ ] Tous les tests passent

## Checklist
- [ ] Code respecte les standards (claude.md)
- [ ] Documentation mise à jour
- [ ] Pas de console.log ou debug code
- [ ] Pas de fichiers temporaires
- [ ] Types TypeScript corrects
- [ ] Accessible (WCAG 2.1 AA)

## Screenshots (si UI)
[Ajouter des captures d'écran]

## Notes Additionnelles
[Informations supplémentaires]
```

### Review Process

1. Au moins 1 approbation requise
2. Tous les checks CI doivent passer
3. Pas de merge conflicts
4. Branch à jour avec `develop`

## Rapporter des Bugs

### Template d'Issue

```markdown
**Description**
[Description claire du bug]

**Steps to Reproduce**
1. Aller sur '...'
2. Cliquer sur '...'
3. Voir l'erreur

**Expected Behavior**
[Ce qui devrait se passer]

**Actual Behavior**
[Ce qui se passe]

**Screenshots**
[Si applicable]

**Environment**
- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 120]
- Node version: [e.g. 20.10.0]
- Version: [e.g. 1.0.0]

**Additional Context**
[Toute autre information]
```

## Proposer des Features

### Template de Feature Request

```markdown
**Feature Description**
[Décrire la fonctionnalité]

**Problem to Solve**
[Quel problème cela résout-il ?]

**Proposed Solution**
[Comment l'implémenter ?]

**Alternatives Considered**
[Autres solutions envisagées]

**Additional Context**
[Mockups, exemples, etc.]

**Priority**
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low
```

## Guidelines Spécifiques

### UI/UX

- Utiliser shadcn/ui pour les composants
- Respecter le design system (Tailwind config)
- Mobile-first responsive design
- Accessibilité WCAG 2.1 AA minimum
- Dark mode support (si implémenté)

### Performance

- Lazy load images (`next/image`)
- Code splitting pour les modals
- Memoize expensive calculations
- Utiliser React Query pour le caching
- Éviter les re-renders inutiles

### Sécurité

- Valider toutes les entrées utilisateur (Zod)
- Sanitize HTML (DOMPurify)
- Rate limiting sur les API routes
- Pas de secrets en dur dans le code
- HTTPS uniquement en production

### Documentation

- JSDoc pour toutes les fonctions publiques
- README à jour
- Exemples de code quand pertinent
- Types TypeScript bien documentés

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Prisma Docs](https://www.prisma.io/docs)

## Questions ?

- Ouvrir une Discussion sur GitHub
- Consulter [claude.md](claude.md) pour les standards
- Lire [ARCHITECTURE.md](ARCHITECTURE.md) pour comprendre l'archi

## License

En contribuant, vous acceptez que vos contributions soient sous la même license MIT que le projet.

---

**Merci pour votre contribution ! 🙏**
