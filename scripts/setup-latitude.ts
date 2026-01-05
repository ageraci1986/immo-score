/**
 * Setup Latitude Prompts Script
 *
 * Run this script to initialize the Latitude prompts:
 * npm run latitude:setup
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

import { Latitude } from '@latitude-data/sdk';

const LATITUDE_API_KEY = process.env['LATITUDE_API_KEY'];
const LATITUDE_PROJECT_ID = process.env['LATITUDE_PROJECT_ID']
  ? parseInt(process.env['LATITUDE_PROJECT_ID'], 10)
  : undefined;

if (!LATITUDE_API_KEY) {
  console.error('❌ LATITUDE_API_KEY is not set in .env.local');
  process.exit(1);
}

if (!LATITUDE_PROJECT_ID) {
  console.error('❌ LATITUDE_PROJECT_ID is not set in .env.local');
  process.exit(1);
}

const PROMPT_PATHS = {
  VISION_ANALYSIS: 'immo-score/vision-analysis',
  NARRATIVE_GENERATION: 'immo-score/narrative-generation',
  COST_ESTIMATION: 'immo-score/cost-estimation',
} as const;

// Read prompts from files
const PROMPTS_DIR = join(__dirname, 'prompts');

function readPromptFile(filename: string): string {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf-8');
}

const VISION_ANALYSIS_PROMPT = readPromptFile('vision-analysis.md');
const NARRATIVE_GENERATION_PROMPT = readPromptFile('narrative-generation.md');
const COST_ESTIMATION_PROMPT = readPromptFile('cost-estimation.md');

interface Version {
  uuid: string;
  title?: string;
  mergedAt?: string | null;
}

async function main(): Promise<void> {
  console.log('🚀 Setting up Latitude prompts...\n');
  console.log(`   Project ID: ${LATITUDE_PROJECT_ID}`);

  const latitude = new Latitude(LATITUDE_API_KEY!, {
    projectId: LATITUDE_PROJECT_ID,
  });

  try {
    // Step 1: Get existing versions to find the head commit
    console.log('\n📋 Getting project versions...');
    const versions = await latitude.versions.getAll(LATITUDE_PROJECT_ID);
    console.log(`   Found ${versions.length} version(s)`);

    // Find the latest merged version or draft
    let baseCommitUuid: string | null = null;
    let hasDraft = false;

    for (const version of versions as Version[]) {
      console.log(`   - ${version.uuid} (${version.title || 'untitled'}) ${version.mergedAt ? '[merged]' : '[draft]'}`);
      if (!version.mergedAt) {
        hasDraft = true;
        baseCommitUuid = version.uuid;
      } else if (!baseCommitUuid) {
        baseCommitUuid = version.uuid;
      }
    }

    if (!baseCommitUuid) {
      console.log('\n⚠️  No versions found. Creating initial version...');
      const newVersion = await latitude.versions.create('Initial Setup', {
        projectId: LATITUDE_PROJECT_ID,
      });
      baseCommitUuid = newVersion.uuid;
      console.log(`   ✅ Created version: ${baseCommitUuid}`);
    }

    // Step 2: Create a new draft version if we don't have one
    if (!hasDraft) {
      console.log('\n📝 Creating new draft version...');
      const draftVersion = await latitude.versions.create('Add Immo-Score prompts', {
        projectId: LATITUDE_PROJECT_ID,
      });
      baseCommitUuid = draftVersion.uuid;
      console.log(`   ✅ Created draft: ${baseCommitUuid}`);
    }

    // Step 3: Push the prompts to the draft version
    console.log('\n📤 Pushing prompts to version...');

    const changes = [
      {
        path: PROMPT_PATHS.VISION_ANALYSIS,
        content: VISION_ANALYSIS_PROMPT,
        status: 'modified' as const,
      },
      {
        path: PROMPT_PATHS.NARRATIVE_GENERATION,
        content: NARRATIVE_GENERATION_PROMPT,
        status: 'modified' as const,
      },
      {
        path: PROMPT_PATHS.COST_ESTIMATION,
        content: COST_ESTIMATION_PROMPT,
        status: 'modified' as const,
      },
    ];

    console.log(`   Base commit: ${baseCommitUuid}`);
    console.log(`   Changes: ${changes.length} files`);

    const result = await latitude.versions.push(
      LATITUDE_PROJECT_ID!,
      baseCommitUuid!,
      changes
    );

    console.log(`   ✅ Pushed! New commit: ${result.commitUuid}`);

    // Step 4: Verify prompts
    console.log('\n📋 Verifying prompts...');
    const finalPrompts = await latitude.prompts.getAll({
      versionUuid: result.commitUuid,
    });

    console.log(`   Found ${finalPrompts.length} prompt(s):`);
    for (const prompt of finalPrompts) {
      const p = prompt as { path?: string };
      console.log(`   - ${p.path || 'unknown'}`);
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📌 Important: You need to PUBLISH/MERGE this draft in the Latitude dashboard');
    console.log('   to make it the live version.');
    console.log('\nPrompt paths:');
    console.log(`   - ${PROMPT_PATHS.VISION_ANALYSIS}`);
    console.log(`   - ${PROMPT_PATHS.NARRATIVE_GENERATION}`);
    console.log(`   - ${PROMPT_PATHS.COST_ESTIMATION}`);

  } catch (error) {
    console.error('\n❌ Failed to setup Latitude prompts:', error);
    process.exit(1);
  }
}

main();
