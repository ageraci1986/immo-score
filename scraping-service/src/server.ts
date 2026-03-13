import express from 'express';
import { scrapeListing } from './scrapers/listing-scraper';
import { scrapeSearchPage } from './scrapers/search-scraper';

const app = express();
app.use(express.json());

const API_SECRET = process.env['SCRAPING_API_SECRET'] || '';

// Auth middleware
function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (API_SECRET && req.headers['x-api-secret'] !== API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

app.use(authMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'immoweb-scraping' });
});

/**
 * POST /scrape/listing
 * Body: { url: string }
 * Returns: scraped property data
 */
app.post('/scrape/listing', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid url' });
    return;
  }

  console.log(`[API] Scrape listing: ${url}`);
  const start = Date.now();

  try {
    const result = await scrapeListing(url);
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[API] Listing scraped in ${duration}s — success=${result.success}`);
    res.json(result);
  } catch (error) {
    console.error('[API] Listing scrape failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /scrape/search
 * Body: { url: string }
 * Returns: array of search results
 */
app.post('/scrape/search', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid url' });
    return;
  }

  console.log(`[API] Scrape search: ${url}`);
  const start = Date.now();

  try {
    const results = await scrapeSearchPage(url);
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[API] Search scraped in ${duration}s — ${results.length} results`);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[API] Search scrape failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const PORT = parseInt(process.env['PORT'] || '3001', 10);
app.listen(PORT, () => {
  console.log(`Scraping service running on port ${PORT}`);
});
