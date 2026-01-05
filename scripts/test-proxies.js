const { proxyManager } = require('../src/lib/scraping/proxy-manager.js');

async function testAllProxies() {
  console.log('🧪 Testing all proxies...');
  console.log('='.repeat(60));

  const workingCount = await proxyManager.testAllProxies();

  console.log('\n='.repeat(60));
  console.log(`✅ Results: ${workingCount} working proxies found`);
  console.log('\n📊 Final Stats:');
  console.log(proxyManager.getStats());
}

testAllProxies();
