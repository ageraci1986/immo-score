import { scraperManager } from '../src/lib/scraping/scraper-manager';

async function testScraper(url: string): Promise<void> {
  console.log('Testing scraper with URL:', url);
  console.log('='.repeat(60));

  try {
    const result = await scraperManager.scrapeUrl(url);

    if (result.success && result.data) {
      console.log('\n✅ Scraping successful!\n');

      console.log('📋 BASIC INFO:');
      console.log('  Title:', result.data.title || 'N/A');
      console.log('  Price:', result.data.price ? `${result.data.price} €` : 'N/A');
      console.log('  Location:', result.data.location || 'N/A');
      console.log('  Address:', result.data.address || 'N/A');

      console.log('\n📐 SURFACES:');
      console.log('  Living surface:', result.data.surface ? `${result.data.surface} m²` : 'N/A');
      console.log('  Land surface:', result.data.landSurface ? `${result.data.landSurface} m²` : 'N/A');
      console.log('  Living room:', result.data.livingRoomSurface ? `${result.data.livingRoomSurface} m²` : 'N/A');

      console.log('\n🏠 ROOMS:');
      console.log('  Bedrooms:', result.data.bedrooms || 'N/A');
      console.log('  Bathrooms:', result.data.bathrooms || 'N/A');
      console.log('  Toilets:', result.data.toilets || 'N/A');
      console.log('  Floors:', result.data.floors || 'N/A');

      console.log('\n⚡ ENERGY & CONSTRUCTION:');
      console.log('  Energy class:', result.data.energyClass || 'N/A');
      console.log('  Year built:', result.data.yearBuilt || 'N/A');
      console.log('  Building condition:', result.data.buildingCondition || 'N/A');

      console.log('\n🏡 PROPERTY DETAILS:');
      console.log('  Property type:', result.data.propertyType || 'N/A');
      console.log('  Property subtype:', result.data.propertySubtype || 'N/A');
      console.log('  Furnished:', result.data.furnished ?? 'N/A');

      console.log('\n🌳 FEATURES:');
      console.log('  Garden:', result.data.hasGarden ? `Yes (${result.data.gardenSurface || '?'} m²)` : 'No');
      console.log('  Terrace:', result.data.hasTerrace ? `Yes (${result.data.terraceSurface || '?'} m²)` : 'No');
      console.log('  Parking:', result.data.hasParking ? `Yes (${result.data.parkingSpaces || '?'} spaces)` : 'No');
      console.log('  Swimming pool:', result.data.hasSwimmingPool ? 'Yes' : 'No');
      console.log('  Lift:', result.data.hasLift ? 'Yes' : 'No');

      console.log('\n📅 LEGAL & AVAILABILITY:');
      console.log('  Availability:', result.data.availabilityDate || 'N/A');
      console.log('  Cadastral income:', result.data.cadastralIncome ? `${result.data.cadastralIncome} €` : 'N/A');
      console.log('  Planning permission:', result.data.planningPermission || 'N/A');
      console.log('  Flood zone:', result.data.floodZone ? 'Yes' : 'No');

      console.log('\n🔥 HEATING & UTILITIES:');
      console.log('  Heating type:', result.data.heatingType || 'N/A');
      console.log('  Double glazing:', result.data.doubleGlazing ? 'Yes' : 'No');

      console.log('\n📸 PHOTOS:');
      console.log(`  Total photos: ${result.data.photos?.length || 0}`);
      if (result.data.photos && result.data.photos.length > 0) {
        console.log('  First 3 photos:');
        result.data.photos.slice(0, 3).forEach((photo, i) => {
          console.log(`    ${i + 1}. ${photo.substring(0, 80)}...`);
        });
      }

      console.log('\n📝 DESCRIPTION:');
      const desc = result.data.description || '';
      console.log('  ', desc.substring(0, 200) + (desc.length > 200 ? '...' : ''));

      console.log('\n' + '='.repeat(60));
      console.log('✅ Test completed successfully!');

    } else {
      console.log('\n❌ Scraping failed!');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('\n❌ Test error:', error);
  }
}

// Get URL from command line or use default
const url = process.argv[2] || 'https://www.immoweb.be/fr/annonce/maison/a-vendre/liege/4020/21234071';
testScraper(url);
