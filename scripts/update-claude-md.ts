/**
 * Auto-update CLAUDE.md Script
 *
 * This script automatically updates CLAUDE.md with current project state:
 * - Latitude prompts
 * - Database schema
 * - Environment variables
 * - Key dependencies
 *
 * Run: npm run docs:update
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: '.env.local' });

import { Latitude } from '@latitude-data/sdk';

const PROJECT_ROOT = process.cwd();
const CLAUDE_MD_PATH = path.join(PROJECT_ROOT, 'CLAUDE.md');

interface PromptInfo {
  path: string;
  description?: string;
}

interface EnvVarInfo {
  name: string;
  description: string;
  required: boolean;
}

interface ProjectState {
  latitudePrompts: PromptInfo[];
  envVars: EnvVarInfo[];
  keyDependencies: { name: string; version: string; purpose: string }[];
  dbModels: string[];
  apiRoutes: string[];
}

/**
 * Fetch current Latitude prompts
 */
async function fetchLatitudePrompts(): Promise<PromptInfo[]> {
  const apiKey = process.env.LATITUDE_API_KEY;
  const projectId = process.env.LATITUDE_PROJECT_ID
    ? parseInt(process.env.LATITUDE_PROJECT_ID, 10)
    : undefined;

  if (!apiKey || !projectId) {
    console.log('⚠️  Latitude credentials not found, skipping prompt fetch');
    return [];
  }

  try {
    const latitude = new Latitude(apiKey, { projectId });
    const prompts = await latitude.prompts.getAll();

    return prompts.map((p) => ({
      path: (p as { path?: string }).path || 'unknown',
      description: inferPromptDescription((p as { path?: string }).path || ''),
    }));
  } catch (error) {
    console.log('⚠️  Could not fetch Latitude prompts:', (error as Error).message);
    return [];
  }
}

/**
 * Infer prompt description from path
 */
function inferPromptDescription(path: string): string {
  const descriptions: Record<string, string> = {
    'immo-score/vision-analysis': 'Analyzes property photos (roof, facade, interior condition)',
    'immo-score/narrative-generation': 'Generates investment analysis narrative with pros/cons',
  };
  return descriptions[path] || 'No description';
}

/**
 * Parse environment variables from env.ts
 */
function parseEnvVars(): EnvVarInfo[] {
  const envTsPath = path.join(PROJECT_ROOT, 'src/config/env.ts');

  if (!fs.existsSync(envTsPath)) {
    return [];
  }

  const content = fs.readFileSync(envTsPath, 'utf-8');

  // Extract env var definitions
  const envVars: EnvVarInfo[] = [];
  const regex = /\/\/\s*(.+?)\n\s*(\w+):\s*z\./g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const comment = match[1].trim();
    const name = match[2];

    // Skip if it's a section comment
    if (!name.includes('NEXT_PUBLIC') && !name.includes('_')) continue;

    envVars.push({
      name,
      description: comment,
      required: !content.includes(`${name}: z.string().optional()`),
    });
  }

  // Manually define the important ones for clarity
  return [
    { name: 'DATABASE_URL', description: 'PostgreSQL connection string (Supabase)', required: true },
    { name: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Claude', required: true },
    { name: 'LATITUDE_API_KEY', description: 'Latitude.so API key for prompt management', required: true },
    { name: 'LATITUDE_PROJECT_ID', description: 'Latitude project ID (28927)', required: true },
    { name: 'CLERK_SECRET_KEY', description: 'Clerk authentication secret', required: true },
    { name: 'UPSTASH_REDIS_REST_URL', description: 'Upstash Redis URL for rate limiting', required: true },
    { name: 'UPSTASH_REDIS_REST_TOKEN', description: 'Upstash Redis token', required: true },
    { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase project URL', required: true },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anonymous key', required: true },
  ];
}

/**
 * Parse key dependencies from package.json
 */
function parseKeyDependencies(): { name: string; version: string; purpose: string }[] {
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const keyDeps: Record<string, string> = {
    '@latitude-data/sdk': 'AI prompt management via Latitude.so',
    '@anthropic-ai/sdk': 'Claude AI API client',
    '@clerk/nextjs': 'User authentication',
    '@prisma/client': 'Database ORM',
    '@upstash/ratelimit': 'API rate limiting',
    'playwright': 'Web scraping engine',
    'next': 'React framework',
    'zod': 'Schema validation',
  };

  return Object.entries(keyDeps)
    .filter(([name]) => packageJson.dependencies[name])
    .map(([name, purpose]) => ({
      name,
      version: packageJson.dependencies[name],
      purpose,
    }));
}

/**
 * Parse database models from Prisma schema
 */
function parseDbModels(): string[] {
  const schemaPath = path.join(PROJECT_ROOT, 'prisma/schema.prisma');

  if (!fs.existsSync(schemaPath)) {
    return [];
  }

  const content = fs.readFileSync(schemaPath, 'utf-8');
  const models: string[] = [];
  const regex = /model\s+(\w+)\s*\{/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    models.push(match[1]);
  }

  return models;
}

/**
 * Parse API routes
 */
function parseApiRoutes(): string[] {
  const apiDir = path.join(PROJECT_ROOT, 'src/app/api');
  const routes: string[] = [];

  function scanDir(dir: string, prefix: string = '/api'): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const routePath = entry.name.startsWith('[')
          ? `${prefix}/${entry.name}`
          : `${prefix}/${entry.name}`;
        scanDir(path.join(dir, entry.name), routePath);
      } else if (entry.name === 'route.ts') {
        routes.push(prefix);
      }
    }
  }

  scanDir(apiDir);
  return routes.sort();
}

/**
 * Generate the auto-updated section
 */
function generateAutoSection(state: ProjectState): string {
  const timestamp = new Date().toISOString().split('T')[0];

  let section = `## Project State (Auto-Updated: ${timestamp})

> This section is automatically generated by \`npm run docs:update\`

### Latitude Prompts

| Prompt Path | Description |
|-------------|-------------|
`;

  for (const prompt of state.latitudePrompts) {
    section += `| \`${prompt.path}\` | ${prompt.description} |\n`;
  }

  if (state.latitudePrompts.length === 0) {
    section += `| _No prompts found_ | Run \`npm run latitude:setup\` |\n`;
  }

  section += `
### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
`;

  for (const envVar of state.envVars) {
    section += `| \`${envVar.name}\` | ${envVar.description} | ${envVar.required ? '✅' : '❌'} |\n`;
  }

  section += `
### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
`;

  for (const dep of state.keyDependencies) {
    section += `| \`${dep.name}\` | ${dep.version} | ${dep.purpose} |\n`;
  }

  section += `
### Database Models

`;

  for (const model of state.dbModels) {
    section += `- \`${model}\`\n`;
  }

  section += `
### API Routes

`;

  for (const route of state.apiRoutes) {
    section += `- \`${route}\`\n`;
  }

  return section;
}

/**
 * Update CLAUDE.md with auto-generated section
 */
async function updateClaudeMd(): Promise<void> {
  console.log('🔄 Updating CLAUDE.md...\n');

  // Gather project state
  const state: ProjectState = {
    latitudePrompts: await fetchLatitudePrompts(),
    envVars: parseEnvVars(),
    keyDependencies: parseKeyDependencies(),
    dbModels: parseDbModels(),
    apiRoutes: parseApiRoutes(),
  };

  console.log(`   📝 Found ${state.latitudePrompts.length} Latitude prompts`);
  console.log(`   🔑 Found ${state.envVars.length} environment variables`);
  console.log(`   📦 Found ${state.keyDependencies.length} key dependencies`);
  console.log(`   🗄️  Found ${state.dbModels.length} database models`);
  console.log(`   🛣️  Found ${state.apiRoutes.length} API routes`);

  // Read current CLAUDE.md
  let content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');

  // Generate auto section
  const autoSection = generateAutoSection(state);

  // Check if auto section already exists
  const autoSectionStart = '## Project State (Auto-Updated:';
  const autoSectionEnd = '## Code Quality Standards';

  const startIndex = content.indexOf(autoSectionStart);
  const endIndex = content.indexOf(autoSectionEnd);

  if (startIndex !== -1 && endIndex !== -1) {
    // Replace existing auto section
    content = content.substring(0, startIndex) + autoSection + '\n' + content.substring(endIndex);
  } else {
    // Insert before Code Quality Standards
    const insertIndex = content.indexOf('## Code Quality Standards');
    if (insertIndex !== -1) {
      content = content.substring(0, insertIndex) + autoSection + '\n' + content.substring(insertIndex);
    } else {
      // Append at the end
      content += '\n\n' + autoSection;
    }
  }

  // Write updated content
  fs.writeFileSync(CLAUDE_MD_PATH, content);

  console.log('\n✅ CLAUDE.md updated successfully!');
}

// Run the update
updateClaudeMd().catch(console.error);
