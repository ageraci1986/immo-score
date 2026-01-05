/**
 * Test Latitude Integration Script
 *
 * Run: npx tsx scripts/test-latitude.ts
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

import { Latitude } from '@latitude-data/sdk';

const LATITUDE_API_KEY = process.env.LATITUDE_API_KEY;
const LATITUDE_PROJECT_ID = process.env.LATITUDE_PROJECT_ID
  ? parseInt(process.env.LATITUDE_PROJECT_ID, 10)
  : undefined;

if (!LATITUDE_API_KEY || !LATITUDE_PROJECT_ID) {
  console.error('❌ Missing LATITUDE_API_KEY or LATITUDE_PROJECT_ID');
  process.exit(1);
}

async function testNarrativePrompt(): Promise<void> {
  console.log('\n🧪 Testing Narrative Generation Prompt...\n');

  const latitude = new Latitude(LATITUDE_API_KEY!, {
    projectId: LATITUDE_PROJECT_ID,
  });

  const testDescription = `
    Belle maison de caractère de 150m² située dans un quartier calme.
    4 chambres, 2 salles de bain, grand jardin de 500m².
    Cuisine équipée récente, double vitrage.
    Toiture à rénover, façade en bon état.
    Proche des écoles et commerces.
    Garage double.
  `;

  try {
    const result = await latitude.prompts.run('immo-score/narrative-generation', {
      parameters: {
        description: testDescription.trim(),
      },
      stream: false,
    });

    console.log('✅ Response received!\n');
    console.log('Raw response:');
    console.log(result.response.text);

    // Try to parse JSON
    try {
      const parsed = JSON.parse(result.response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      console.log('\n📊 Parsed result:');
      console.log('Strengths:', parsed.strengths);
      console.log('Weaknesses:', parsed.weaknesses);
    } catch {
      console.log('\n⚠️  Could not parse as JSON');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Testing Latitude Integration\n');
  console.log(`   Project ID: ${LATITUDE_PROJECT_ID}`);

  await testNarrativePrompt();

  console.log('\n✅ Test complete!');
}

main().catch(console.error);
