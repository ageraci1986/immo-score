# Claude Code Configuration - Immo-Score

## Project Overview
Immo-Score is an intelligent real estate analysis platform that automates property evaluation through AI-powered image analysis, web scraping, and profitability calculations.

## MCP Context7 Integration

### CRITICAL: Always Use Context7 MCP for Package Management

**MANDATORY RULE**: Before installing, updating, or managing ANY npm package, library, framework, or dependency, you MUST use the Context7 MCP server to search for up-to-date documentation and best practices.

#### Configuration
The Context7 MCP server is configured in `~/.config/claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "CONTEXT7_API_KEY": "ctx7sk-4aca26e8-51b1-4b5b-9b24-51f9ddadab7c"
      }
    }
  }
}
```

#### Usage Protocol

**BEFORE** any of the following actions, use Context7 MCP to search for current documentation:

1. **Installing a new package**:
   ```
   Context7: Search for "[package-name] installation guide latest"
   Context7: Search for "[package-name] typescript setup"
   ```

2. **Updating existing packages**:
   ```
   Context7: Search for "[package-name] migration guide [old-version] to [new-version]"
   Context7: Search for "[package-name] breaking changes"
   ```

3. **Integrating a framework/library**:
   ```
   Context7: Search for "[framework-name] best practices 2025"
   Context7: Search for "[framework-name] with Next.js 14"
   Context7: Search for "[framework-name] TypeScript configuration"
   ```

4. **Troubleshooting**:
   ```
   Context7: Search for "[error-message]"
   Context7: Search for "[package-name] common issues"
   ```

#### Example Workflow

```typescript
// ❌ BAD: Installing without checking Context7
npm install some-new-library

// ✅ GOOD: Check Context7 first
// 1. Use Context7 MCP: "some-new-library installation guide"
// 2. Use Context7 MCP: "some-new-library typescript setup"
// 3. Read documentation and understand breaking changes
// 4. Install with proper version: npm install some-new-library@^2.0.0
// 5. Configure according to latest best practices
```

#### Required Checks via Context7

- [ ] Latest stable version number
- [ ] TypeScript support and configuration
- [ ] Peer dependencies requirements
- [ ] Breaking changes from previous versions
- [ ] Security advisories
- [ ] Official examples and starter templates
- [ ] Integration patterns with existing stack (Next.js, Prisma, etc.)

#### Restart Claude Desktop After Config Changes

After modifying the MCP configuration in `~/.config/claude/claude_desktop_config.json`, you MUST restart Claude Desktop for changes to take effect.

## Latitude.so Prompt Management

### Overview

All AI prompts are centralized in [Latitude.so](https://latitude.so) for version control and easy iteration. **Never hardcode prompts in the codebase** - always use Latitude.

### Configuration

```env
LATITUDE_API_KEY=your_api_key
LATITUDE_PROJECT_ID=28927
```

### Current Prompts

| Prompt Path | Description |
|-------------|-------------|
| `immo-score/vision-analysis` | Analyzes property photos (roof, facade, interior condition) |
| `immo-score/narrative-generation` | Generates investment analysis narrative with pros/cons |

### Adding or Updating Prompts

Use the setup script to create/update prompts programmatically:

```bash
npm run latitude:setup
```

The script (`scripts/setup-latitude.ts`) uses the Latitude SDK to:
1. Get existing versions
2. Create a new draft version
3. Push prompt changes using `latitude.versions.push()`
4. **Important**: After running, you must PUBLISH the draft in Latitude dashboard

### SDK Methods Reference

```typescript
import { Latitude } from '@latitude-data/sdk';

const latitude = new Latitude(LATITUDE_API_KEY, {
  projectId: LATITUDE_PROJECT_ID,
});

// Get all versions
const versions = await latitude.versions.getAll(projectId);

// Create a new draft version
const draft = await latitude.versions.create('Version name', {
  projectId: projectId,
});

// Push changes to a version (add/modify/delete prompts)
const result = await latitude.versions.push(
  projectId,
  baseCommitUuid,
  [
    {
      path: 'folder/prompt-name',
      content: '---\nprovider: anthropic\nmodel: claude-sonnet-4-20250514\n---\n\nYour prompt here with {{parameters}}',
      status: 'added' | 'modified' | 'deleted' | 'unchanged',
    },
  ]
);

// Run a prompt
const result = await latitude.prompts.run('prompt-path', {
  parameters: { param1: 'value1' },
  stream: false,
});
```

### Prompt Template Format

Prompts use YAML frontmatter for configuration:

```markdown
---
provider: anthropic
model: claude-sonnet-4-20250514
---

Your prompt content here.

Use {{variableName}} for parameters.
Use {{#if condition}}...{{/if}} for conditionals.
```

### Workflow for Prompt Changes

1. **Modify** the prompt content in `scripts/setup-latitude.ts`
2. **Run** `npm run latitude:setup`
3. **Review** the draft in Latitude dashboard
4. **Publish** the draft to make it live
5. **Test** the integration in the app

### Key Files

- `src/lib/ai/latitude-client.ts` - Latitude SDK wrapper
- `src/lib/ai/claude-client.ts` - AI functions using Latitude
- `scripts/setup-latitude.ts` - Script to create/update prompts

## Project State (Auto-Updated: 2025-12-18)

> This section is automatically generated by `npm run docs:update`

### Latitude Prompts

| Prompt Path | Description |
|-------------|-------------|
| `immo-score/vision-analysis` | Analyzes property photos (roof, facade, interior condition) |
| `immo-score/narrative-generation` | Generates investment analysis narrative with pros/cons |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | ✅ |
| `LATITUDE_API_KEY` | Latitude.so API key for prompt management | ✅ |
| `LATITUDE_PROJECT_ID` | Latitude project ID (28927) | ✅ |
| `CLERK_SECRET_KEY` | Clerk authentication secret | ✅ |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for rate limiting | ✅ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@latitude-data/sdk` | ^5.2.2 | AI prompt management via Latitude.so |
| `@anthropic-ai/sdk` | ^0.27.0 | Claude AI API client |
| `@clerk/nextjs` | ^5.5.0 | User authentication |
| `@prisma/client` | ^5.20.0 | Database ORM |
| `@upstash/ratelimit` | ^2.0.0 | API rate limiting |
| `playwright` | ^1.57.0 | Web scraping engine |
| `next` | 14.2.13 | React framework |
| `zod` | ^3.23.8 | Schema validation |

### Database Models

- `User`
- `Property`
- `CalculationParams`
- `ScrapingJob`
- `ApiUsage`
- `AuditLog`

### API Routes

- `/api/latitude/setup`
- `/api/properties`
- `/api/properties/[id]`
- `/api/scraping/process`

## Code Quality Standards

### Core Principles
1. **Type Safety First**: Every function, variable, and component must be fully typed
2. **Zero Technical Debt**: Never leave TODOs, temporary fixes, or debug code
3. **DRY (Don't Repeat Yourself)**: Abstract common patterns into reusable utilities
4. **Single Responsibility**: Each module/function does one thing well
5. **Explicit Over Implicit**: No magic values, always use named constants

### TypeScript Rules
- **Strict Mode**: Always enable strict mode in tsconfig.json
- **No `any` types**: Use `unknown` and type guards instead
- **Explicit return types**: All functions must declare return types
- **Interface over Type**: Prefer interfaces for object shapes
- **Const assertions**: Use `as const` for literal types
- **Generic constraints**: Always constrain generics appropriately

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

### File Organization
```
src/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Auth-protected routes group
│   ├── (public)/          # Public routes group
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── lib/                  # Core business logic
│   ├── scraping/        # Web scraping modules
│   ├── ai/              # AI analysis modules
│   ├── rentability/     # Calculation engines
│   ├── validation/      # Zod schemas
│   └── utils/           # Shared utilities
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── config/              # Configuration files
└── prisma/              # Database schema and migrations
```

### Naming Conventions
- **Files**: kebab-case (`property-card.tsx`, `calculate-rentability.ts`)
- **Components**: PascalCase (`PropertyCard`, `AddPropertiesModal`)
- **Functions**: camelCase (`calculateRentability`, `scrapeProperty`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TAX_RATE`, `MAX_UPLOAD_SIZE`)
- **Types/Interfaces**: PascalCase with descriptive suffixes (`PropertyData`, `RentabilityParams`)
- **Hooks**: camelCase with `use` prefix (`useProperty`, `useAuth`)

### Component Standards

#### React Components
```typescript
// ✅ Proper component structure
interface PropertyCardProps {
  readonly property: Property;
  readonly onSelect?: (id: string) => void;
}

export function PropertyCard({ property, onSelect }: PropertyCardProps): JSX.Element {
  const handleClick = useCallback(() => {
    onSelect?.(property.id);
  }, [onSelect, property.id]);

  return (
    <Card onClick={handleClick}>
      {/* Component content */}
    </Card>
  );
}
```

#### Server Components vs Client Components
- **Default to Server Components**: Only use 'use client' when necessary
- **Client Components**: Interactive elements, hooks, browser APIs
- **Server Components**: Data fetching, static content, SEO-critical content

#### Component Composition
- **Max 200 lines**: Split larger components into smaller ones
- **Extract logic**: Use custom hooks for complex state logic
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations
- **Props drilling**: Max 2 levels, then use context or state management

### Error Handling

#### Never Silent Failures
```typescript
// ❌ BAD
try {
  await scrapeProperty(url);
} catch (error) {
  console.log(error);
}

// ✅ GOOD
import { captureException } from '@/lib/monitoring';

try {
  return await scrapeProperty(url);
} catch (error) {
  captureException(error, {
    context: 'property-scraping',
    propertyUrl: url,
  });

  throw new PropertyScrapingError(
    `Failed to scrape property from ${url}`,
    { cause: error }
  );
}
```

#### Custom Error Classes
```typescript
export class PropertyScrapingError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PropertyScrapingError';
  }
}
```

### Database & API

#### Prisma Best Practices
- **Transactions**: Use for multi-step operations
- **Select specific fields**: Never `SELECT *` implicitly
- **Indexes**: Add indexes for all query filters
- **Soft deletes**: Never hard delete user data

```typescript
// ✅ Proper Prisma usage
async function createPropertyWithAnalysis(
  data: CreatePropertyInput
): Promise<Property> {
  return await prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        ...data,
        status: PropertyStatus.PENDING,
      },
      select: {
        id: true,
        sourceUrl: true,
        status: true,
        createdAt: true,
      },
    });

    await tx.scrapingJob.create({
      data: {
        propertyId: property.id,
        url: data.sourceUrl,
        status: 'pending',
      },
    });

    return property;
  });
}
```

#### API Route Standards
```typescript
// app/api/properties/route.ts
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createPropertySchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
  customParams: z.record(z.unknown()).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 1. Authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Validation
    const body = await request.json();
    const validatedData = createPropertySchema.parse(body);

    // 3. Rate limiting
    const { success } = await ratelimit.limit(userId);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // 4. Business logic
    const properties = await createProperties(userId, validatedData);

    // 5. Success response
    return NextResponse.json({ properties }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    captureException(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Performance Optimization

#### React Query Configuration
```typescript
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: Error) => {
        if (error instanceof ApiError && error.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
} as const;
```

#### Image Optimization
- Always use Next.js `<Image>` component
- Provide width/height or fill
- Use appropriate loading strategy (lazy/eager)
- Compress images before upload (sharp)

#### Code Splitting
- Dynamic imports for heavy components
- Route-based splitting (automatic with App Router)
- Lazy load modals and drawers

```typescript
import dynamic from 'next/dynamic';

const AddPropertiesModal = dynamic(
  () => import('@/components/features/add-properties-modal').then(m => m.AddPropertiesModal),
  { ssr: false, loading: () => <ModalSkeleton /> }
);
```

### Security

#### Input Validation
- **Always validate**: Use Zod for all external inputs
- **Sanitize HTML**: Use DOMPurify for user-generated content
- **SQL Injection**: Prisma prevents this, but never use raw queries
- **XSS Prevention**: React escapes by default, never use `dangerouslySetInnerHTML` without sanitization

#### Authentication & Authorization
```typescript
// Middleware for protected routes
export async function requireAuth(request: Request): Promise<string> {
  const { userId } = auth();

  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }

  return userId;
}

// Check resource ownership
export async function requireOwnership(
  userId: string,
  propertyId: string
): Promise<void> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { userId: true },
  });

  if (!property || property.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }
}
```

#### Environment Variables
- Never commit `.env` files
- Validate env vars at startup
- Use type-safe env config

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
```

### Testing Requirements

#### Unit Tests (Required Coverage: 80%)
```typescript
// lib/rentability/calculate.test.ts
import { describe, it, expect } from 'vitest';
import { calculateRentability } from './calculate';

describe('calculateRentability', () => {
  it('should calculate correct net yield with default parameters', () => {
    const result = calculateRentability({
      property: {
        price: 200000,
        surface: 100,
      },
      params: {
        monthlyRent: 1200,
        notaryFeesPercent: 12.5,
        agencyFeesPercent: 3,
        contingencyPercent: 10,
        vacancyRate: 5,
        propertyTaxYearly: 800,
        insuranceYearly: 400,
        maintenancePercent: 10,
        managementFeesPercent: 7,
        taxRegime: 'normal',
      },
      aiAnalysis: mockAiAnalysis,
    });

    expect(result.netYield).toBeCloseTo(5.2, 1);
    expect(result.totalInvestment).toBeGreaterThan(200000);
  });

  it('should throw error for invalid input', () => {
    expect(() => {
      calculateRentability({
        property: { price: -100, surface: 100 },
        params: mockParams,
        aiAnalysis: mockAiAnalysis,
      });
    }).toThrow('Invalid property price');
  });
});
```

#### Integration Tests
- Test API endpoints with mock database
- Test authentication flows
- Test scraping with mock HTML

#### E2E Tests (Critical User Flows)
- User signup and login
- Add property URL and wait for analysis
- View property details
- Compare properties

### Code Review Checklist

Before committing, verify:
- [ ] All TypeScript errors resolved
- [ ] No `any` types used
- [ ] All functions have explicit return types
- [ ] No console.log statements (use proper logging)
- [ ] Error handling implemented
- [ ] Input validation with Zod
- [ ] Tests written and passing
- [ ] No hardcoded values (use constants)
- [ ] Comments for complex logic only
- [ ] No unused imports or variables
- [ ] Responsive design tested
- [ ] Accessibility attributes added (ARIA)
- [ ] Loading and error states implemented

### Automatic Cleanup Rules

#### Prevent Temporary Files
Never create files that are not part of the application:
- No `.log` files
- No `.tmp` files
- No `debug-*.json` files
- No `test-output.*` files
- No `console-*.txt` files

#### Git Ignore Configuration
```gitignore
# Dependencies
node_modules/
.pnp/

# Testing
coverage/
.nyc_output/

# Build outputs
.next/
out/
dist/
build/

# Environment
.env
.env*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Temporary files
*.tmp
temp/
.temp/

# Debug files
debug-*.json
console-*.txt
```

#### Pre-commit Hook Script
```bash
#!/bin/bash
# .husky/pre-commit

# Remove any temporary or debug files
find . -type f \( -name "*.log" -o -name "*.tmp" -o -name "debug-*.json" -o -name "console-*.txt" \) -delete

# Remove empty directories
find . -type d -empty -delete

# Run linter
npm run lint

# Run type check
npm run type-check

# Run tests
npm run test
```

### Logging Standards

#### Use Structured Logging
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Usage
logger.info({ propertyId, url }, 'Starting property scraping');
logger.error({ error, propertyId }, 'Property scraping failed');
```

### Monitoring & Observability

#### Sentry Integration
```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.captureMessage(message, level);
}
```

#### Performance Monitoring
```typescript
import { trace } from '@opentelemetry/api';

export async function withTracing<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('immo-score');
  const span = tracer.startSpan(operation);

  try {
    return await fn();
  } finally {
    span.end();
  }
}
```

### Documentation Requirements

#### Function Documentation
```typescript
/**
 * Calculates the profitability metrics for a real estate property.
 *
 * @param property - The property basic information including price and surface
 * @param params - User-defined calculation parameters (tax rates, fees, etc.)
 * @param aiAnalysis - AI-generated analysis of the property condition
 * @returns Comprehensive profitability results including yields, cash flow, and breakdown
 * @throws {ValidationError} When property price is negative or surface is zero
 *
 * @example
 * ```typescript
 * const results = calculateRentability({
 *   property: { price: 200000, surface: 100 },
 *   params: defaultRentabilityParams,
 *   aiAnalysis: analysisResults
 * });
 * console.log(results.netYield); // 5.2
 * ```
 */
export function calculateRentability(
  data: RentabilityInput
): RentabilityResults {
  // Implementation
}
```

### AI/LLM Integration Standards

#### Claude API Usage
```typescript
// lib/ai/claude-client.ts
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/config/env';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export async function analyzePropertyPhotos(
  images: Buffer[],
  context: PropertyContext
): Promise<VisionAnalysis> {
  const imageContents = images.map(buffer => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: buffer.toString('base64'),
    },
  }));

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: buildAnalysisPrompt(context) },
          ...imageContents,
        ],
      }],
    });

    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return parseVisionAnalysis(textContent.text);

  } catch (error) {
    throw new AIAnalysisError('Failed to analyze property photos', {
      cause: error,
      context,
    });
  }
}
```

#### Rate Limiting for AI Calls
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
});

export async function rateLimitedAICall<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  const { success, remaining } = await aiRatelimit.limit(userId);

  if (!success) {
    throw new RateLimitError(
      `AI rate limit exceeded. Try again in ${remaining}ms`
    );
  }

  return await fn();
}
```

### Deployment Standards

#### Build Process
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start",
    "lint": "next lint --max-warnings 0",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "clean": "rm -rf .next out node_modules/.cache",
    "clean:temp": "find . -type f \\( -name '*.log' -o -name '*.tmp' -o -name 'debug-*' \\) -delete"
  }
}
```

#### CI/CD Pipeline (GitHub Actions)
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Clean temporary files
        run: npm run clean:temp

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Unit tests
        run: npm run test

      - name: Build
        run: npm run build

      - name: E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `refactor/*`: Code improvements

### Commit Message Convention
```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `docs`: Documentation
- `chore`: Maintenance

Example:
```
feat(scraping): add support for Logic-Immo website

- Implemented LogicImmoScraper class
- Added specific selectors for property data extraction
- Integrated with existing scraper registry

Closes #123
```

### Code Review Requirements
- At least one approval required
- All CI checks must pass
- No merge conflicts
- Branch up to date with target

## Accessibility Standards

### WCAG 2.1 Level AA Compliance
- Semantic HTML elements
- ARIA labels where necessary
- Keyboard navigation support
- Focus indicators visible
- Color contrast ratio ≥ 4.5:1
- Alt text for all images
- Form labels and error messages

```typescript
// ✅ Accessible component
export function PropertyCard({ property }: PropertyCardProps): JSX.Element {
  return (
    <Card
      role="article"
      aria-labelledby={`property-title-${property.id}`}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <h3 id={`property-title-${property.id}`}>
        {property.title}
      </h3>
      <img
        src={property.image}
        alt={`Photo of ${property.title} located in ${property.location}`}
      />
    </Card>
  );
}
```

## State Management

### Zustand Store Pattern
```typescript
// stores/property-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface PropertyState {
  selectedProperties: string[];
  sortBy: SortOption;
  filters: PropertyFilters;

  // Actions
  toggleSelection: (id: string) => void;
  setSortBy: (option: SortOption) => void;
  setFilters: (filters: Partial<PropertyFilters>) => void;
  clearSelection: () => void;
}

export const usePropertyStore = create<PropertyState>()(
  devtools(
    persist(
      (set) => ({
        selectedProperties: [],
        sortBy: 'score',
        filters: {},

        toggleSelection: (id) =>
          set((state) => ({
            selectedProperties: state.selectedProperties.includes(id)
              ? state.selectedProperties.filter((p) => p !== id)
              : [...state.selectedProperties, id],
          })),

        setSortBy: (option) => set({ sortBy: option }),

        setFilters: (filters) =>
          set((state) => ({ filters: { ...state.filters, ...filters } })),

        clearSelection: () => set({ selectedProperties: [] }),
      }),
      { name: 'property-store' }
    )
  )
);
```

## Final Checklist for Every PR

- [ ] Code compiles without TypeScript errors
- [ ] All tests pass (unit, integration, e2e)
- [ ] No console.log or debug statements
- [ ] No temporary files created
- [ ] Error handling implemented
- [ ] Input validation with Zod
- [ ] Proper loading states
- [ ] Proper error states
- [ ] Responsive design
- [ ] Accessibility tested
- [ ] Performance optimized
- [ ] Security reviewed
- [ ] Documentation updated
- [ ] Clean git history
- [ ] No merge conflicts

---

**Remember**: Quality over speed. A well-architected, maintainable codebase is worth the extra effort.
