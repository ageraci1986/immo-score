/**
 * Types for web scraping functionality
 */

export interface ScrapedPropertyData {
  readonly title?: string;
  readonly description?: string;
  readonly price?: number;
  readonly location?: string;
  readonly address?: string;

  // Surface details
  readonly surface?: number; // Surface habitable
  readonly landSurface?: number; // Surface du terrain
  readonly livingRoomSurface?: number;

  // Rooms
  readonly bedrooms?: number;
  readonly bathrooms?: number;
  readonly toilets?: number;
  readonly floors?: number;

  // Energy & construction
  readonly energyClass?: string;
  readonly pebCertificate?: string;
  readonly yearBuilt?: number;
  readonly buildingCondition?: string; // État du bâtiment

  // Property details
  readonly propertyType?: string;
  readonly propertySubtype?: string;
  readonly furnished?: boolean;

  // Features
  readonly hasGarden?: boolean;
  readonly gardenSurface?: number;
  readonly hasTerrace?: boolean;
  readonly terraceSurface?: number;
  readonly hasParking?: boolean;
  readonly parkingSpaces?: number;
  readonly hasSwimmingPool?: boolean;
  readonly hasLift?: boolean;
  readonly facadeCount?: number; // Nombre de façades
  readonly facadeWidth?: number; // Largeur de la façade à rue

  // Legal & availability
  readonly availabilityDate?: string;
  readonly cadastralIncome?: number;
  readonly planningPermission?: string;
  readonly floodZone?: boolean;

  // Heating & utilities
  readonly heatingType?: string;
  readonly doubleGlazing?: boolean;

  // External links
  readonly virtualTour?: string;

  readonly photos: readonly string[];
  readonly coordinates?: {
    readonly lat: number;
    readonly lng: number;
  };
}

export interface ScraperResult {
  readonly success: boolean;
  readonly data?: ScrapedPropertyData;
  readonly error?: string;
}

export interface Scraper {
  /**
   * Check if this scraper can handle the given URL
   */
  canHandle(url: string): boolean;

  /**
   * Scrape property data from the URL
   */
  scrape(url: string): Promise<ScraperResult>;

  /**
   * Get the name of this scraper
   */
  getName(): string;
}
