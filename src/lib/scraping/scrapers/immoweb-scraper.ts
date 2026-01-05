import * as cheerio from 'cheerio';
import type { Scraper, ScraperResult, ScrapedPropertyData } from '../types';

/**
 * Scraper for Immoweb.be
 */
export class ImmowebScraper implements Scraper {
  getName(): string {
    return 'Immoweb';
  }

  canHandle(url: string): boolean {
    return url.includes('immoweb.be');
  }

  async scrape(url: string): Promise<ScraperResult> {
    try {
      console.log('Scraping Immoweb URL:', url);

      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract data from the page
      const data: ScrapedPropertyData = {
        photos: this.extractPhotos($),
        title: this.extractTitle($),
        description: this.extractDescription($),
        price: this.extractPrice($),
        location: this.extractLocation($),
        address: this.extractAddress($),

        // Surfaces
        surface: this.extractSurface($),
        landSurface: this.extractLandSurface($),
        livingRoomSurface: this.extractLivingRoomSurface($),

        // Rooms
        bedrooms: this.extractBedrooms($),
        bathrooms: this.extractBathrooms($),
        toilets: this.extractToilets($),
        floors: this.extractFloors($),

        // Energy & construction
        energyClass: this.extractEnergyClass($),
        yearBuilt: this.extractYearBuilt($),
        buildingCondition: this.extractBuildingCondition($),

        // Property details
        propertyType: this.extractPropertyType($),
        propertySubtype: this.extractPropertySubtype($),
        furnished: this.extractFurnished($),

        // Features
        hasGarden: this.extractHasGarden($),
        gardenSurface: this.extractGardenSurface($),
        hasTerrace: this.extractHasTerrace($),
        terraceSurface: this.extractTerraceSurface($),
        hasParking: this.extractHasParking($),
        parkingSpaces: this.extractParkingSpaces($),
        hasSwimmingPool: this.extractHasSwimmingPool($),
        hasLift: this.extractHasLift($),

        // Legal & availability
        availabilityDate: this.extractAvailabilityDate($),
        cadastralIncome: this.extractCadastralIncome($),
        planningPermission: this.extractPlanningPermission($),
        floodZone: this.extractFloodZone($),

        // Heating & utilities
        heatingType: this.extractHeatingType($),
        doubleGlazing: this.extractDoubleGlazing($),

        // External links
        virtualTour: this.extractVirtualTour($),
      };

      console.log('Scraped data:', data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Scraping error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private extractPhotos($: cheerio.CheerioAPI): readonly string[] {
    const photos: string[] = [];

    // Try multiple selectors for photos
    $('img[src*="pictures.funda.io"], img[src*="cloudfront"], picture img, .gallery img').each(
      (_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && src.startsWith('http')) {
          photos.push(src);
        }
      }
    );

    // Also check for JSON-LD data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json.image) {
          if (Array.isArray(json.image)) {
            photos.push(...json.image);
          } else if (typeof json.image === 'string') {
            photos.push(json.image);
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    });

    return [...new Set(photos)]; // Remove duplicates
  }

  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    return (
      $('h1').first().text().trim() ||
      $('[class*="title"]').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')
    );
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    return (
      $('[class*="description"]').first().text().trim() ||
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content')
    );
  }

  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    // Look for price in various places
    const priceText =
      $('[class*="price"]').first().text() ||
      $('meta[property="og:price:amount"]').attr('content') ||
      '';

    // Extract numbers from text (remove €, spaces, dots used as thousands separator)
    // Use word boundary to get the first complete number only
    const cleaned = priceText.replace(/[€\s.]/g, '');
    const match = cleaned.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractLocation($: cheerio.CheerioAPI): string | undefined {
    return (
      $('[class*="location"]').first().text().trim() ||
      $('[class*="address"]').first().text().trim()
    );
  }

  private extractAddress($: cheerio.CheerioAPI): string | undefined {
    return $('[class*="address"]').first().text().trim();
  }

  private extractSurface($: cheerio.CheerioAPI): number | undefined {
    const surfaceText =
      $('td:contains("Surface habitable"), td:contains("Superficie")')
        .next()
        .text() || '';
    const match = surfaceText.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractBedrooms($: cheerio.CheerioAPI): number | undefined {
    const bedroomsText =
      $('td:contains("Chambres"), td:contains("Bedroom")')
        .next()
        .text() || '';
    const match = bedroomsText.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractBathrooms($: cheerio.CheerioAPI): number | undefined {
    const bathroomsText =
      $('td:contains("Salles de bain"), td:contains("Bathroom")')
        .next()
        .text() || '';
    const match = bathroomsText.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractEnergyClass($: cheerio.CheerioAPI): string | undefined {
    return $('[class*="energy"]').first().text().trim() || undefined;
  }

  private extractPropertyType($: cheerio.CheerioAPI): string | undefined {
    return (
      $('td:contains("Type de bien"), td:contains("Property type")')
        .next()
        .text()
        .trim() || undefined
    );
  }

  private extractYearBuilt($: cheerio.CheerioAPI): number | undefined {
    const yearText =
      $('td:contains("Année de construction"), td:contains("Construction year")')
        .next()
        .text() || '';
    const match = yearText.match(/(\d{4})/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractHasGarden($: cheerio.CheerioAPI): boolean {
    const text = $.html().toLowerCase();
    return text.includes('jardin') || text.includes('garden');
  }

  private extractHasTerrace($: cheerio.CheerioAPI): boolean {
    const text = $.html().toLowerCase();
    return text.includes('terrasse') || text.includes('terrace');
  }

  private extractHasParking($: cheerio.CheerioAPI): boolean {
    const text = $.html().toLowerCase();
    return (
      text.includes('parking') ||
      text.includes('garage') ||
      text.includes('stationnement')
    );
  }

  // Additional extraction methods

  private extractLandSurface($: cheerio.CheerioAPI): number | undefined {
    const text = $('td:contains("Surface du terrain"), td:contains("de terrain")').next().text() || '';
    const match = text.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractLivingRoomSurface($: cheerio.CheerioAPI): number | undefined {
    const text = $('td:contains("Surface du séjour"), td:contains("Living room")').next().text() || '';
    const match = text.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractToilets($: cheerio.CheerioAPI): number | undefined {
    const text = $('td:contains("Toilettes"), td:contains("Toilet")').next().text() || '';
    const match = text.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractFloors($: cheerio.CheerioAPI): number | undefined {
    const text = $('td:contains("Nombre d\'étages"), td:contains("Number of floors")').next().text() || '';
    const match = text.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractBuildingCondition($: cheerio.CheerioAPI): string | undefined {
    const condition = $('td:contains("État du bâtiment"), td:contains("Building condition")').next().text().trim();
    return condition || undefined;
  }

  private extractPropertySubtype($: cheerio.CheerioAPI): string | undefined {
    const subtype = $('td:contains("Sous-type"), td:contains("Subtype")').next().text().trim();
    return subtype || undefined;
  }

  private extractFurnished($: cheerio.CheerioAPI): boolean | undefined {
    const text = $('td:contains("Meublé"), td:contains("Furnished")').next().text().toLowerCase();
    if (text.includes('oui') || text.includes('yes')) return true;
    if (text.includes('non') || text.includes('no')) return false;
    return undefined;
  }

  private extractGardenSurface($: cheerio.CheerioAPI): number | undefined {
    const text = $('td:contains("Surface du jardin"), td:contains("Garden surface")').next().text() || '';
    const match = text.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractTerraceSurface($: cheerio.CheerioAPI): number | undefined {
    const text = $('td:contains("Surface de la terrasse"), td:contains("Terrace surface")').next().text() || '';
    const match = text.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractParkingSpaces($: cheerio.CheerioAPI): number | undefined {
    const text = $('td:contains("Nombre de parkings"), td:contains("Parking spaces")').next().text() || '';
    const match = text.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractHasSwimmingPool($: cheerio.CheerioAPI): boolean {
    const text = $.html().toLowerCase();
    return text.includes('piscine') || text.includes('swimming pool');
  }

  private extractHasLift($: cheerio.CheerioAPI): boolean {
    const text = $.html().toLowerCase();
    return text.includes('ascenseur') || text.includes('lift') || text.includes('elevator');
  }

  private extractAvailabilityDate($: cheerio.CheerioAPI): string | undefined {
    const date = $('td:contains("Disponible le"), td:contains("Available")').next().text().trim();
    return date || undefined;
  }

  private extractCadastralIncome($: cheerio.CheerioAPI): number | undefined {
    const text = $('td:contains("Revenu cadastral"), td:contains("Cadastral income")').next().text() || '';
    const match = text.match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractPlanningPermission($: cheerio.CheerioAPI): string | undefined {
    const permission = $('td:contains("Permis d\'urbanisme"), td:contains("Planning permission")').next().text().trim();
    return permission || undefined;
  }

  private extractFloodZone($: cheerio.CheerioAPI): boolean {
    const text = $.html().toLowerCase();
    return text.includes('zone inondable') || text.includes('flood zone') || text.includes('zone d\'aléa d\'inondation');
  }

  private extractHeatingType($: cheerio.CheerioAPI): string | undefined {
    const heating = $('td:contains("Type de chauffage"), td:contains("Heating type")').next().text().trim();
    return heating || undefined;
  }

  private extractDoubleGlazing($: cheerio.CheerioAPI): boolean {
    const text = $.html().toLowerCase();
    return text.includes('double vitrage') || text.includes('double glazing');
  }

  private extractVirtualTour($: cheerio.CheerioAPI): string | undefined {
    const link = $('a[href*="visite"], a[href*="virtual"], a[href*="360"]').attr('href');
    return link || undefined;
  }
}
