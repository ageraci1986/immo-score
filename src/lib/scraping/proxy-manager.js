/**
 * Proxy Manager for rotating IPs and avoiding detection
 * Supports both free and premium proxies
 */
class ProxyManager {
  constructor() {
    // Premium proxy services configuration
    // Multiple premium proxy options supported
    this.premiumProxies = this.loadPremiumProxies();

    // List of free public proxies (rotate these)
    // Note: Free proxies are unreliable, use for testing only
    this.freeProxies = [
      // European proxies (closer to Belgium = faster)
      'http://51.158.68.68:8811',
      'http://51.178.49.77:3128',
      'http://51.210.216.88:3128',
      'http://195.154.84.106:5566',
      'http://188.165.59.127:3128',
    ];

    this.currentProxyIndex = 0;
    this.useProxy = true; // ENABLED by default for IP rotation
    this.proxyStats = new Map();

    if (this.premiumProxies.length > 0) {
      console.log(`🔒 ${this.premiumProxies.length} premium proxy service(s) configured`);
    } else {
      console.log('⚠️  No premium proxies configured - using free proxies (unreliable)');
      console.log('💡 Add premium proxy credentials in .env file');
    }
  }

  /**
   * Load premium proxy configurations from environment variables
   * Supports multiple premium proxy services
   */
  loadPremiumProxies() {
    const proxies = [];

    // Option 1: Bright Data (formerly Luminati) - Residential proxies
    // https://brightdata.com/
    if (process.env.BRIGHTDATA_USERNAME && process.env.BRIGHTDATA_PASSWORD) {
      // Support custom host/port or use default
      const host = process.env.BRIGHTDATA_HOST || 'brd.superproxy.io';
      const port = process.env.BRIGHTDATA_PORT || '22225';
      const brightDataProxy = `http://${process.env.BRIGHTDATA_USERNAME}:${process.env.BRIGHTDATA_PASSWORD}@${host}:${port}`;
      proxies.push({
        name: 'Bright Data',
        url: brightDataProxy,
        type: 'residential',
      });
      console.log(`✅ Bright Data proxy configured (${host}:${port})`);
    }

    // Option 2: Oxylabs - Residential proxies
    // https://oxylabs.io/
    if (process.env.OXYLABS_USERNAME && process.env.OXYLABS_PASSWORD) {
      const oxylabsProxy = `http://${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}@pr.oxylabs.io:7777`;
      proxies.push({
        name: 'Oxylabs',
        url: oxylabsProxy,
        type: 'residential',
      });
      console.log('✅ Oxylabs proxy configured');
    }

    // Option 3: Smartproxy - Residential/Datacenter proxies
    // https://smartproxy.com/
    if (process.env.SMARTPROXY_USERNAME && process.env.SMARTPROXY_PASSWORD) {
      const smartproxyUrl = `http://${process.env.SMARTPROXY_USERNAME}:${process.env.SMARTPROXY_PASSWORD}@gate.smartproxy.com:7000`;
      proxies.push({
        name: 'Smartproxy',
        url: smartproxyUrl,
        type: 'residential',
      });
      console.log('✅ Smartproxy proxy configured');
    }

    // Option 4: IPRoyal - Residential proxies
    // https://iproyal.com/
    if (process.env.IPROYAL_USERNAME && process.env.IPROYAL_PASSWORD) {
      const iproyalProxy = `http://${process.env.IPROYAL_USERNAME}:${process.env.IPROYAL_PASSWORD}@geo.iproyal.com:12321`;
      proxies.push({
        name: 'IPRoyal',
        url: iproyalProxy,
        type: 'residential',
      });
      console.log('✅ IPRoyal proxy configured');
    }

    // Option 5: Proxy-Seller - Budget-friendly datacenter proxies
    // https://proxy-seller.com/
    if (process.env.PROXYSELLER_HOST && process.env.PROXYSELLER_PORT && process.env.PROXYSELLER_USERNAME && process.env.PROXYSELLER_PASSWORD) {
      const proxySellerUrl = `http://${process.env.PROXYSELLER_USERNAME}:${process.env.PROXYSELLER_PASSWORD}@${process.env.PROXYSELLER_HOST}:${process.env.PROXYSELLER_PORT}`;
      proxies.push({
        name: 'Proxy-Seller',
        url: proxySellerUrl,
        type: 'datacenter',
      });
      console.log('✅ Proxy-Seller proxy configured');
    }

    // Option 6: WebShare - Budget datacenter proxies
    // https://www.webshare.io/
    if (process.env.WEBSHARE_PROXY_LIST) {
      // Format: user:pass@host:port,user:pass@host:port,...
      const webshareProxies = process.env.WEBSHARE_PROXY_LIST.split(',').map(proxy => ({
        name: 'WebShare',
        url: `http://${proxy.trim()}`,
        type: 'datacenter',
      }));
      proxies.push(...webshareProxies);
      console.log(`✅ ${webshareProxies.length} WebShare proxies configured`);
    }

    // Option 7: ScraperAPI proxy mode (converts to API calls)
    // https://www.scraperapi.com/
    if (process.env.SCRAPERAPI_KEY) {
      const scraperApiProxy = `http://scraperapi:${process.env.SCRAPERAPI_KEY}@proxy-server.scraperapi.com:8001`;
      proxies.push({
        name: 'ScraperAPI',
        url: scraperApiProxy,
        type: 'api',
      });
      console.log('✅ ScraperAPI proxy configured');
    }

    // Option 8: Simple custom proxy URL
    if (process.env.CUSTOM_PROXY_URL) {
      proxies.push({
        name: 'Custom Proxy',
        url: process.env.CUSTOM_PROXY_URL,
        type: 'custom',
      });
      console.log('✅ Custom proxy configured');
    }

    return proxies;
  }

  /**
   * Enable or disable proxy usage
   */
  setUseProxy(enabled) {
    this.useProxy = enabled;
    console.log(`🔄 Proxy usage: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get next proxy in rotation (round-robin)
   */
  getNextProxy() {
    if (!this.useProxy) {
      return null;
    }

    // Use premium proxies if available (rotate through them)
    if (this.premiumProxies.length > 0) {
      const proxyConfig = this.premiumProxies[this.currentProxyIndex % this.premiumProxies.length];
      this.currentProxyIndex = (this.currentProxyIndex + 1) % this.premiumProxies.length;
      console.log(`🔒 Using premium proxy: ${proxyConfig.name} (${proxyConfig.type})`);
      return proxyConfig.url;
    }

    // Rotate through free proxies
    if (this.freeProxies.length === 0) {
      console.log('⚠️  No proxies available');
      return null;
    }

    const proxy = this.freeProxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.freeProxies.length;

    console.log(`🔄 Using free proxy ${this.currentProxyIndex}/${this.freeProxies.length}: ${proxy}`);
    return proxy;
  }

  /**
   * Test if a proxy is working
   */
  async testProxy(proxyUrl) {
    const fetch = require('node-fetch');
    const { ProxyAgent } = require('proxy-agent');

    try {
      const agent = new ProxyAgent(proxyUrl);
      const response = await fetch('https://api.ipify.org?format=json', {
        agent,
        timeout: 10000,
      });

      const data = await response.json();
      console.log(`✅ Proxy ${proxyUrl} is working. IP: ${data.ip}`);
      return true;
    } catch (error) {
      console.log(`❌ Proxy ${proxyUrl} failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test all proxies and remove dead ones
   */
  async testAllProxies() {
    console.log('🧪 Testing all proxies...');
    const workingProxies = [];

    for (const proxy of this.freeProxies) {
      const works = await this.testProxy(proxy);
      if (works) {
        workingProxies.push(proxy);
      }
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.freeProxies = workingProxies;
    console.log(`✅ ${workingProxies.length}/${this.freeProxies.length} proxies are working`);
    return workingProxies.length;
  }

  /**
   * Parse proxy URL and extract credentials
   */
  parseProxyUrl(proxyUrl) {
    if (!proxyUrl) return null;

    // Format: http://username:password@host:port
    const match = proxyUrl.match(/^https?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/);

    if (match) {
      return {
        host: match[3],
        port: match[4],
        username: match[1],
        password: match[2],
      };
    }

    // Format without auth: http://host:port
    const simpleMatch = proxyUrl.match(/^https?:\/\/([^:]+):(\d+)$/);
    if (simpleMatch) {
      return {
        host: simpleMatch[1],
        port: simpleMatch[2],
        username: null,
        password: null,
      };
    }

    return null;
  }

  /**
   * Get Puppeteer launch args with proxy
   */
  getPuppeteerArgs(proxyUrl) {
    if (!proxyUrl) {
      return {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
        proxyAuth: null,
      };
    }

    const proxyInfo = this.parseProxyUrl(proxyUrl);

    if (!proxyInfo) {
      console.error('❌ Invalid proxy URL format:', proxyUrl);
      return {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
        proxyAuth: null,
      };
    }

    // Puppeteer proxy format: host:port (without auth in URL)
    const proxyServer = `${proxyInfo.host}:${proxyInfo.port}`;

    return {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        `--proxy-server=${proxyServer}`,
      ],
      proxyAuth: proxyInfo.username && proxyInfo.password ? {
        username: proxyInfo.username,
        password: proxyInfo.password,
      } : null,
    };
  }

  /**
   * Get current IP address (for verification)
   */
  async getCurrentIP(page) {
    try {
      await page.goto('https://api.ipify.org?format=json', {
        waitUntil: 'networkidle2',
        timeout: 10000,
      });

      const content = await page.evaluate(() => document.body.textContent);
      const data = JSON.parse(content);
      return data.ip;
    } catch (error) {
      console.error('Failed to get current IP:', error.message);
      return null;
    }
  }

  /**
   * Add custom proxy to the pool
   */
  addProxy(proxyUrl) {
    if (!this.freeProxies.includes(proxyUrl)) {
      this.freeProxies.push(proxyUrl);
      console.log(`➕ Added proxy: ${proxyUrl}`);
    }
  }

  /**
   * Remove proxy from pool
   */
  removeProxy(proxyUrl) {
    const index = this.freeProxies.indexOf(proxyUrl);
    if (index > -1) {
      this.freeProxies.splice(index, 1);
      console.log(`➖ Removed proxy: ${proxyUrl}`);
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalFreeProxies: this.freeProxies.length,
      totalPremiumProxies: this.premiumProxies.length,
      currentIndex: this.currentProxyIndex,
      premiumProxiesConfigured: this.premiumProxies.length > 0,
      proxyEnabled: this.useProxy,
      premiumProxyTypes: this.premiumProxies.map(p => `${p.name} (${p.type})`),
    };
  }
}

// Export singleton instance
const proxyManager = new ProxyManager();

module.exports = { proxyManager, ProxyManager };
