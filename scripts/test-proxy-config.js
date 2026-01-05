// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { proxyManager } = require('../src/lib/scraping/proxy-manager.js');

async function testProxyConfiguration() {
  console.log('🔍 Testing Proxy Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Get proxy stats
  const stats = proxyManager.getStats();

  console.log('📊 Proxy Configuration Status:');
  console.log('');
  console.log('   Proxy Enabled:', stats.proxyEnabled ? '✅ YES' : '❌ NO');
  console.log('   Premium Proxies:', stats.totalPremiumProxies);
  console.log('   Free Proxies:', stats.totalFreeProxies);
  console.log('');

  if (stats.totalPremiumProxies > 0) {
    console.log('✅ PREMIUM PROXIES CONFIGURED:');
    stats.premiumProxyTypes.forEach((proxy, index) => {
      console.log(`   ${index + 1}. ${proxy}`);
    });
    console.log('');
    console.log('🎉 You are ready to scrape Immoweb!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Add an Immoweb URL in the interface');
    console.log('   3. The scraper will use your premium proxy automatically');
  } else {
    console.log('⚠️  NO PREMIUM PROXIES CONFIGURED');
    console.log('');
    console.log('Your IP (xxx.xxx.xxx.xxx) is blocked by Immoweb.');
    console.log('You need to configure a premium proxy to continue.');
    console.log('');
    console.log('📖 Read the guide: PROXY_SETUP_GUIDE.md');
    console.log('');
    console.log('Quick setup (recommended):');
    console.log('');
    console.log('Option 1: IPRoyal (Best quality) - ~$7 for 1000 requests');
    console.log('   1. Sign up: https://iproyal.com/');
    console.log('   2. Buy residential proxies');
    console.log('   3. Add to .env:');
    console.log('      IPROYAL_USERNAME=your_username');
    console.log('      IPROYAL_PASSWORD=your_password');
    console.log('');
    console.log('Option 2: WebShare (Best value) - FREE or $2.99/month');
    console.log('   1. Sign up: https://www.webshare.io/');
    console.log('   2. Download proxy list');
    console.log('   3. Add to .env:');
    console.log('      WEBSHARE_PROXY_LIST=user:pass@host:port,...');
    console.log('');
    console.log('Option 3: Bright Data (Free trial) - 7 days free');
    console.log('   1. Sign up: https://brightdata.com/');
    console.log('   2. Create residential zone');
    console.log('   3. Add to .env:');
    console.log('      BRIGHTDATA_USERNAME=your_username');
    console.log('      BRIGHTDATA_PASSWORD=your_password');
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test proxy if configured
  if (stats.totalPremiumProxies > 0) {
    console.log('');
    console.log('🧪 Testing proxy connection...');

    const proxy = proxyManager.getNextProxy();
    if (proxy) {
      console.log('✅ Proxy selected:', proxy.substring(0, 30) + '...');
      console.log('');
      console.log('💡 Tip: Run node scripts/test-persistent-profile.js to test full scraping');
    }
  }
}

testProxyConfiguration().catch(console.error);
